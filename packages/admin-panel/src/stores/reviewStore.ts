/**
 * LEO Frontend - Review Queue Store
 * Zustand store for review queue state management
 *
 * Manages:
 * - Review queue items and their statuses
 * - Selected review for detail view
 * - Queue metrics and statistics
 * - Real-time WebSocket updates
 * - Filtering and search
 * - Optimistic updates for review actions
 */

import { create } from 'zustand';
import type {
  ReviewItem,
  ReviewMetrics,
  ReviewFilters,
  ReviewStatus,
  ReviewPriority,
} from '@/api/review';

// ============================================================================
// Types
// ============================================================================

/**
 * WebSocket update payload for review queue
 */
export interface ReviewQueueUpdate {
  type: 'added' | 'updated' | 'removed';
  item: ReviewItem;
  previousStatus?: ReviewStatus;
}

/**
 * Review store state
 */
interface ReviewState {
  /** List of review items in the queue */
  queue: ReviewItem[];
  /** Currently selected review for detail view */
  selectedReview: ReviewItem | null;
  /** Aggregated metrics for the review queue */
  metrics: ReviewMetrics | null;
  /** Current filter settings */
  filters: ReviewFilters;
  /** Whether a review action is being processed */
  isProcessing: boolean;
  /** Loading state for async operations */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Timestamp of last data refresh */
  lastRefreshedAt: string | null;
}

/**
 * Review store actions
 */
interface ReviewActions {
  // Queue management
  setQueue: (queue: ReviewItem[]) => void;
  addToQueue: (item: ReviewItem) => void;
  removeFromQueue: (id: string) => void;

  // Selection management
  selectReview: (review: ReviewItem | null) => void;
  clearSelection: () => void;

  // Filter management
  updateFilters: (filters: Partial<ReviewFilters>) => void;
  clearFilters: () => void;

  // Status updates (optimistic)
  updateReviewStatus: (id: string, status: ReviewStatus, optimistic?: boolean) => void;
  updateReview: (id: string, updates: Partial<ReviewItem>) => void;

  // Metrics
  setMetrics: (metrics: ReviewMetrics) => void;

  // Real-time updates
  handleWebSocketUpdate: (update: ReviewQueueUpdate) => void;

  // Utility actions
  setLoading: (isLoading: boolean) => void;
  setProcessing: (isProcessing: boolean) => void;
  setError: (error: string | null) => void;
  resetStore: () => void;
  markRefreshed: () => void;

  // Computed getters
  getFilteredQueue: () => ReviewItem[];
  getQueueByPriority: () => Record<ReviewPriority, ReviewItem[]>;
  getPendingCount: () => number;
  getReviewById: (id: string) => ReviewItem | undefined;
}

type ReviewStore = ReviewState & ReviewActions;

// ============================================================================
// Initial State
// ============================================================================

const initialFilters: ReviewFilters = {};

const initialState: ReviewState = {
  queue: [],
  selectedReview: null,
  metrics: null,
  filters: initialFilters,
  isProcessing: false,
  isLoading: false,
  error: null,
  lastRefreshedAt: null,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sort reviews by priority (critical > high > medium > low)
 */
const priorityOrder: Record<ReviewPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function sortByPriority(a: ReviewItem, b: ReviewItem): number {
  const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
  if (priorityDiff !== 0) return priorityDiff;
  // Secondary sort by creation date (oldest first)
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

/**
 * Apply filters to a queue item
 */
function matchesFilters(item: ReviewItem, filters: ReviewFilters): boolean {
  // Filter by status
  if (filters.status && item.status !== filters.status) {
    return false;
  }

  // Filter by priority
  if (filters.priority && item.priority !== filters.priority) {
    return false;
  }

  // Filter by assignee
  if (filters.assignee && item.assignee !== filters.assignee) {
    return false;
  }

  // Filter by date range
  if (filters.dateRange) {
    const itemDate = new Date(item.createdAt);
    const startDate = new Date(filters.dateRange.start);
    const endDate = new Date(filters.dateRange.end);
    if (itemDate < startDate || itemDate > endDate) {
      return false;
    }
  }

  return true;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useReviewStore = create<ReviewStore>()((set, get) => ({
  ...initialState,

  // --------------------------------------------------------------------------
  // Queue Management
  // --------------------------------------------------------------------------

  /**
   * Set the entire review queue
   */
  setQueue: (queue) =>
    set({
      queue: [...queue].sort(sortByPriority),
      lastRefreshedAt: new Date().toISOString(),
    }),

  /**
   * Add a new item to the queue
   * Inserts at the correct position based on priority
   */
  addToQueue: (item) =>
    set((state) => {
      // Check for duplicates
      if (state.queue.some((r) => r.id === item.id)) {
        return state;
      }
      return {
        queue: [...state.queue, item].sort(sortByPriority),
      };
    }),

  /**
   * Remove an item from the queue by ID
   */
  removeFromQueue: (id) =>
    set((state) => ({
      queue: state.queue.filter((item) => item.id !== id),
      // Clear selection if removed item was selected
      selectedReview: state.selectedReview?.id === id ? null : state.selectedReview,
    })),

  // --------------------------------------------------------------------------
  // Selection Management
  // --------------------------------------------------------------------------

  /**
   * Select a review for detail view
   */
  selectReview: (review) => set({ selectedReview: review }),

  /**
   * Clear the current selection
   */
  clearSelection: () => set({ selectedReview: null }),

  // --------------------------------------------------------------------------
  // Filter Management
  // --------------------------------------------------------------------------

  /**
   * Update filter settings (merges with existing)
   */
  updateFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  /**
   * Reset all filters to initial state
   */
  clearFilters: () => set({ filters: initialFilters }),

  // --------------------------------------------------------------------------
  // Status Updates
  // --------------------------------------------------------------------------

  /**
   * Update the status of a review item
   * Supports optimistic updates for immediate UI feedback
   */
  updateReviewStatus: (id, status, optimistic = false) =>
    set((state) => {
      const updatedQueue = state.queue.map((item) =>
        item.id === id ? { ...item, status } : item
      );

      const updatedSelection =
        state.selectedReview?.id === id
          ? { ...state.selectedReview, status }
          : state.selectedReview;

      return {
        queue: optimistic ? updatedQueue.sort(sortByPriority) : updatedQueue,
        selectedReview: updatedSelection,
        isProcessing: optimistic ? true : state.isProcessing,
      };
    }),

  /**
   * Update multiple fields for a specific review item
   */
  updateReview: (id, updates) =>
    set((state) => ({
      queue: state.queue
        .map((item) => (item.id === id ? { ...item, ...updates } : item))
        .sort(sortByPriority),
      selectedReview:
        state.selectedReview?.id === id
          ? { ...state.selectedReview, ...updates }
          : state.selectedReview,
    })),

  // --------------------------------------------------------------------------
  // Metrics
  // --------------------------------------------------------------------------

  /**
   * Set the review queue metrics
   */
  setMetrics: (metrics) => set({ metrics }),

  // --------------------------------------------------------------------------
  // Real-time WebSocket Updates
  // --------------------------------------------------------------------------

  /**
   * Handle WebSocket updates for the review queue
   * Supports add, update, and remove operations
   */
  handleWebSocketUpdate: (update) => {
    const { type, item } = update;

    switch (type) {
      case 'added':
        get().addToQueue(item);
        break;

      case 'updated':
        get().updateReview(item.id, item);
        break;

      case 'removed':
        get().removeFromQueue(item.id);
        break;

      default:
        console.warn(`Unknown WebSocket update type: ${type}`);
    }
  },

  // --------------------------------------------------------------------------
  // Utility Actions
  // --------------------------------------------------------------------------

  setLoading: (isLoading) => set({ isLoading }),

  setProcessing: (isProcessing) => set({ isProcessing }),

  setError: (error) => set({ error }),

  resetStore: () => set(initialState),

  markRefreshed: () => set({ lastRefreshedAt: new Date().toISOString() }),

  // --------------------------------------------------------------------------
  // Computed Getters
  // --------------------------------------------------------------------------

  /**
   * Get reviews filtered by current filter settings
   */
  getFilteredQueue: () => {
    const { queue, filters } = get();
    return queue.filter((item) => matchesFilters(item, filters));
  },

  /**
   * Get reviews grouped by priority level
   */
  getQueueByPriority: () => {
    const { queue } = get();

    const grouped: Record<ReviewPriority, ReviewItem[]> = {
      critical: [],
      high: [],
      medium: [],
      low: [],
    };

    queue.forEach((item) => {
      grouped[item.priority].push(item);
    });

    return grouped;
  },

  /**
   * Get count of pending reviews
   */
  getPendingCount: () => {
    const { queue } = get();
    return queue.filter((item) => item.status === 'pending').length;
  },

  /**
   * Get a specific review by ID
   */
  getReviewById: (id) => {
    const { queue } = get();
    return queue.find((item) => item.id === id);
  },
}));

// ============================================================================
// Selector Hooks (for optimized re-renders)
// ============================================================================

/**
 * Select only the review queue
 */
export const useReviewQueue = () => useReviewStore((state) => state.queue);

/**
 * Select only the selected review
 */
export const useSelectedReview = () =>
  useReviewStore((state) => state.selectedReview);

/**
 * Select only the metrics
 */
export const useReviewMetrics = () => useReviewStore((state) => state.metrics);

/**
 * Select only the filters
 */
export const useReviewFilters = () => useReviewStore((state) => state.filters);

/**
 * Select only the loading state
 */
export const useReviewLoading = () => useReviewStore((state) => state.isLoading);

/**
 * Select only the processing state
 */
export const useReviewProcessing = () =>
  useReviewStore((state) => state.isProcessing);

/**
 * Select only the error state
 */
export const useReviewError = () => useReviewStore((state) => state.error);

/**
 * Select pending review count
 */
export const usePendingReviewCount = () =>
  useReviewStore((state) => state.queue.filter((r) => r.status === 'pending').length);

/**
 * Select critical reviews (high/critical priority + pending)
 */
export const useCriticalReviews = () =>
  useReviewStore((state) =>
    state.queue.filter(
      (r) =>
        r.status === 'pending' &&
        (r.priority === 'critical' || r.priority === 'high')
    )
  );

/**
 * Select reviews by status
 */
export const useReviewsByStatus = (status: ReviewStatus) =>
  useReviewStore((state) => state.queue.filter((r) => r.status === status));

export default useReviewStore;
