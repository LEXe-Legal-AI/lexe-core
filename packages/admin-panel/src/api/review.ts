/**
 * LEO Frontend - Review Queue API Service
 * API integration with leo-orchestrator for AI response review management
 */

import { apiClient, getResponseData } from './client';
import type { PaginatedRequest, PaginatedResponse } from './types';

// ============================================================================
// Review Types
// ============================================================================

/**
 * Status values for a review item
 */
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'escalated';

/**
 * Priority levels for review items
 */
export type ReviewPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Represents a single review item in the queue
 */
export interface ReviewItem {
  id: string;
  conversationId: string;
  messageId: string;
  aiResponse: string;
  confidenceScore: number;
  status: ReviewStatus;
  priority: ReviewPriority;
  createdAt: string;
  assignee?: string;
}

/**
 * Filter options for the review queue
 */
export interface ReviewFilters extends PaginatedRequest {
  status?: ReviewStatus;
  priority?: ReviewPriority;
  assignee?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

/**
 * Response type for the review queue
 */
export type ReviewQueueResponse = PaginatedResponse<ReviewItem>;

/**
 * Aggregated metrics for the review queue
 */
export interface ReviewMetrics {
  pending: number;
  approved: number;
  rejected: number;
  escalated: number;
  avgProcessingTime: number;
}

/**
 * Request body for approving a review
 */
export interface ApproveReviewRequest {
  feedback?: string;
}

/**
 * Request body for rejecting a review
 */
export interface RejectReviewRequest {
  reason: string;
}

/**
 * Request body for escalating a review
 */
export interface EscalateReviewRequest {
  note: string;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Review Queue API service for managing AI response reviews
 */
export const reviewApi = {
  /**
   * Get the pending reviews queue with optional filtering and pagination
   * @param filters - Optional filters for status, priority, assignee, date range, and pagination
   * @returns Paginated list of review items
   */
  getQueue: async (filters?: ReviewFilters): Promise<ReviewQueueResponse> => {
    const params: Record<string, unknown> = { ...filters };

    // Flatten dateRange for query params if present
    if (filters?.dateRange) {
      params.dateRangeStart = filters.dateRange.start;
      params.dateRangeEnd = filters.dateRange.end;
      delete params.dateRange;
    }

    const response = await apiClient.get('/orchestrator/reviews', { params });
    return getResponseData(response);
  },

  /**
   * Get a single review item by ID
   * @param id - The review item's unique identifier
   * @returns The review item details
   */
  getReview: async (id: string): Promise<ReviewItem> => {
    const response = await apiClient.get(`/orchestrator/reviews/${id}`);
    return getResponseData(response);
  },

  /**
   * Approve a review item, optionally with feedback
   * @param id - The review item's unique identifier
   * @param feedback - Optional feedback for the approval
   * @returns Promise that resolves when the approval is complete
   */
  approveReview: async (id: string, feedback?: string): Promise<void> => {
    const body: ApproveReviewRequest = {};
    if (feedback) {
      body.feedback = feedback;
    }
    await apiClient.post(`/orchestrator/reviews/${id}/approve`, body);
  },

  /**
   * Reject a review item with a reason
   * @param id - The review item's unique identifier
   * @param reason - The reason for rejection (required)
   * @returns Promise that resolves when the rejection is complete
   */
  rejectReview: async (id: string, reason: string): Promise<void> => {
    const body: RejectReviewRequest = { reason };
    await apiClient.post(`/orchestrator/reviews/${id}/reject`, body);
  },

  /**
   * Escalate a review item to a human operator
   * @param id - The review item's unique identifier
   * @param note - A note explaining the escalation (required)
   * @returns Promise that resolves when the escalation is complete
   */
  escalateReview: async (id: string, note: string): Promise<void> => {
    const body: EscalateReviewRequest = { note };
    await apiClient.post(`/orchestrator/reviews/${id}/escalate`, body);
  },

  /**
   * Get aggregated metrics for the review queue
   * @returns Review metrics including counts and average processing time
   */
  getMetrics: async (): Promise<ReviewMetrics> => {
    const response = await apiClient.get('/orchestrator/reviews/metrics');
    return getResponseData(response);
  },
};

export default reviewApi;
