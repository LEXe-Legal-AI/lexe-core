import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { MemoryLayer, type MemoryFact } from '../types';

/**
 * Memory layer type aliases for convenience
 */
export type MemoryLayerKey = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';

/**
 * Map layer keys to enum values
 */
const layerKeyToEnum: Record<MemoryLayerKey, MemoryLayer> = {
  L0: MemoryLayer.L0_SESSION,
  L1: MemoryLayer.L1_CONVERSATION,
  L2: MemoryLayer.L2_USER,
  L3: MemoryLayer.L3_SEMANTIC,
  L4: MemoryLayer.L4_GRAPH,
};

/**
 * Memory entry with layer metadata
 */
export interface MemoryEntry extends MemoryFact {
  // Additional UI fields
  isNew?: boolean;
  isHighlighted?: boolean;
}

/**
 * Memory state interface
 */
interface MemoryState {
  // Data
  memories: MemoryEntry[];
  selectedLayer: MemoryLayerKey;
  searchQuery: string;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Pagination
  page: number;
  pageSize: number;
  totalCount: number;

  // Actions
  setMemories: (memories: MemoryEntry[]) => void;
  addMemory: (memory: MemoryEntry) => void;
  removeMemory: (id: string) => void;
  updateMemory: (id: string, updates: Partial<MemoryEntry>) => void;
  selectLayer: (layer: MemoryLayerKey) => void;
  setSearchQuery: (query: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPage: (page: number) => void;
  fetchMemories: (layer?: MemoryLayerKey) => Promise<void>;
  clearMemories: () => void;
  highlightMemory: (id: string, highlight: boolean) => void;
}

/**
 * Default state values
 */
const defaultState = {
  memories: [],
  selectedLayer: 'L0' as MemoryLayerKey,
  searchQuery: '',
  isLoading: false,
  error: null,
  page: 1,
  pageSize: 20,
  totalCount: 0,
};

/**
 * Memory store for LEO Memory System
 */
export const useMemoryStore = create<MemoryState>()(
  devtools(
    (set, get) => ({
      // Initial state
      ...defaultState,

      // Set memories
      setMemories: (memories) => {
        set({ memories, isLoading: false, error: null }, false, 'setMemories');
      },

      // Add single memory
      addMemory: (memory) => {
        set(
          (state) => ({
            memories: [{ ...memory, isNew: true }, ...state.memories],
            totalCount: state.totalCount + 1,
          }),
          false,
          'addMemory'
        );

        // Remove "new" flag after animation
        setTimeout(() => {
          set(
            (state) => ({
              memories: state.memories.map((m) =>
                m.id === memory.id ? { ...m, isNew: false } : m
              ),
            }),
            false,
            'removeNewFlag'
          );
        }, 2000);
      },

      // Remove memory
      removeMemory: (id) => {
        set(
          (state) => ({
            memories: state.memories.filter((m) => m.id !== id),
            totalCount: Math.max(0, state.totalCount - 1),
          }),
          false,
          'removeMemory'
        );
      },

      // Update memory
      updateMemory: (id, updates) => {
        set(
          (state) => ({
            memories: state.memories.map((m) => (m.id === id ? { ...m, ...updates } : m)),
          }),
          false,
          'updateMemory'
        );
      },

      // Select layer
      selectLayer: (layer) => {
        set({ selectedLayer: layer, page: 1 }, false, 'selectLayer');
        // Trigger fetch for new layer
        get().fetchMemories(layer);
      },

      // Set search query
      setSearchQuery: (query) => {
        set({ searchQuery: query, page: 1 }, false, 'setSearchQuery');
      },

      // Set loading state
      setLoading: (isLoading) => {
        set({ isLoading }, false, 'setLoading');
      },

      // Set error state
      setError: (error) => {
        set({ error, isLoading: false }, false, 'setError');
      },

      // Set page
      setPage: (page) => {
        set({ page }, false, 'setPage');
        get().fetchMemories();
      },

      // Fetch memories from API
      fetchMemories: async (layer) => {
        const state = get();
        const targetLayer = layer || state.selectedLayer;

        set({ isLoading: true, error: null }, false, 'fetchMemories/start');

        try {
          // Get API URL from config store
          const apiUrl =
            (await import('./configStore').then((m) => m.useConfigStore.getState().apiUrl)) ||
            '/api/v1';

          const params = new URLSearchParams({
            layer: String(layerKeyToEnum[targetLayer]),
            page: String(state.page),
            limit: String(state.pageSize),
          });

          if (state.searchQuery) {
            params.set('q', state.searchQuery);
          }

          const response = await fetch(`${apiUrl}/memory/facts?${params}`, {
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch memories: ${response.statusText}`);
          }

          const data = await response.json();

          set(
            {
              memories: data.data || [],
              totalCount: data.meta?.total || 0,
              isLoading: false,
              error: null,
            },
            false,
            'fetchMemories/success'
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          set({ error: message, isLoading: false }, false, 'fetchMemories/error');
        }
      },

      // Clear all memories
      clearMemories: () => {
        set(defaultState, false, 'clearMemories');
      },

      // Highlight memory
      highlightMemory: (id, highlight) => {
        set(
          (state) => ({
            memories: state.memories.map((m) =>
              m.id === id ? { ...m, isHighlighted: highlight } : m
            ),
          }),
          false,
          'highlightMemory'
        );
      },
    }),
    { name: 'MemoryStore', enabled: import.meta.env.DEV }
  )
);

// Selectors for optimized re-renders
export const selectMemories = (state: MemoryState) => state.memories;
export const selectSelectedLayer = (state: MemoryState) => state.selectedLayer;
export const selectIsLoading = (state: MemoryState) => state.isLoading;
export const selectError = (state: MemoryState) => state.error;
export const selectSearchQuery = (state: MemoryState) => state.searchQuery;
export const selectPagination = (state: MemoryState) => ({
  page: state.page,
  pageSize: state.pageSize,
  totalCount: state.totalCount,
});

// Derived selector: memories filtered by layer
export const selectMemoriesByLayer = (layer: MemoryLayerKey) => (state: MemoryState) =>
  state.memories.filter((m) => m.layer === layerKeyToEnum[layer]);

export default useMemoryStore;
