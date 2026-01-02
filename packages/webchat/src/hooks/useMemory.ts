/**
 * useMemory Hook
 *
 * React hook for fetching and managing memory data from the LEO Memory System.
 * Provides loading states, error handling, and demo mode fallback.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  memoryApi,
  type MemoryContextResponse,
  type MemoryGraphResponse,
  type MemorySearchRequest,
  type MemorySearchResponse,
} from '@/services/api/memory';
import type { MemoryFact } from '@/types';
import { MemoryLayer } from '@/types';
import type { MemoryData } from '@/components/preview/MemoryViewer';
import type { MemoryNodeData, MemoryEdgeData } from '@/components/preview/MemoryGraph';

/**
 * Hook options
 */
export interface UseMemoryOptions {
  /** Contact ID to fetch memory for */
  contactId?: string;
  /** Enable auto-fetch on mount */
  autoFetch?: boolean;
  /** Polling interval in ms (0 to disable) */
  pollInterval?: number;
  /** Use demo data when API unavailable */
  demoMode?: boolean;
  /** Callback when context is fetched */
  onContextFetched?: (context: MemoryContextResponse) => void;
  /** Callback when graph is fetched */
  onGraphFetched?: (graph: MemoryGraphResponse) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Hook return type
 */
export interface UseMemoryReturn {
  /** Memory context data formatted for MemoryViewer */
  memoryData: MemoryData | null;
  /** Graph data formatted for MemoryGraph */
  graphNodes: MemoryNodeData[];
  /** Graph edges formatted for MemoryGraph */
  graphEdges: MemoryEdgeData[];
  /** Raw context response */
  context: MemoryContextResponse | null;
  /** Raw graph response */
  graph: MemoryGraphResponse | null;
  /** Loading state for context */
  isLoadingContext: boolean;
  /** Loading state for graph */
  isLoadingGraph: boolean;
  /** Loading state for search */
  isSearching: boolean;
  /** Error state */
  error: Error | null;
  /** Fetch context for a contact */
  fetchContext: (contactId?: string) => Promise<void>;
  /** Fetch graph for a contact */
  fetchGraph: (contactId?: string) => Promise<void>;
  /** Search memories */
  searchMemories: (query: string, options?: Partial<MemorySearchRequest>) => Promise<MemorySearchResponse | null>;
  /** Refresh all data */
  refresh: () => Promise<void>;
  /** Clear all data */
  clear: () => void;
}

/**
 * Demo data for fallback when API unavailable
 */
const createDemoContext = (contactId: string): MemoryContextResponse => ({
  contact_id: contactId,
  L0: {
    session_history: [
      {
        id: 'demo-s1',
        role: 'user',
        content: 'Come posso configurare il sistema?',
        timestamp: new Date(Date.now() - 60000).toISOString(),
        tokens: 12,
      },
      {
        id: 'demo-s2',
        role: 'assistant',
        content: 'Posso aiutarti con la configurazione. Quali aspetti specifici vuoi configurare?',
        timestamp: new Date(Date.now() - 30000).toISOString(),
        tokens: 25,
      },
    ],
  },
  L1: {
    short_term: [
      {
        id: 'demo-l1-1',
        content: 'Utente interessato alla configurazione del sistema',
        type: 'intent',
        confidence: 0.92,
        created_at: new Date().toISOString(),
        source: 'conversation',
      },
      {
        id: 'demo-l1-2',
        content: 'Preferisce risposte in italiano',
        type: 'preference',
        confidence: 0.88,
        created_at: new Date().toISOString(),
        source: 'analysis',
      },
    ],
  },
  L2: {
    long_term: [
      {
        id: 'demo-l2-1',
        content: 'Account aziendale: Tech Solutions Srl',
        category: 'account',
        confidence: 1.0,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        access_count: 5,
        source: 'profile',
      },
      {
        id: 'demo-l2-2',
        content: 'Ruolo: System Administrator',
        category: 'role',
        confidence: 0.95,
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
        updated_at: new Date().toISOString(),
        access_count: 12,
        source: 'profile',
      },
    ],
  },
  L3: {
    semantic: [
      {
        id: 'demo-l3-1',
        content: 'Configurazione API gateway e autenticazione',
        confidence: 0.85,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        source: 'knowledge_base',
      },
      {
        id: 'demo-l3-2',
        content: 'Best practices per deployment in produzione',
        confidence: 0.78,
        created_at: new Date(Date.now() - 7200000).toISOString(),
        source: 'documentation',
      },
    ],
  },
  L4: {
    graph: [
      {
        id: 'demo-n1',
        label: 'User',
        type: 'user',
        confidence: 1.0,
        properties: { name: 'Demo User' },
      },
      {
        id: 'demo-n2',
        label: 'Tech Solutions',
        type: 'organization',
        confidence: 0.95,
      },
      {
        id: 'demo-n3',
        label: 'Configuration',
        type: 'topic',
        confidence: 0.88,
      },
    ],
  },
  metadata: {
    last_updated: new Date().toISOString(),
    total_memories: 10,
  },
});

const createDemoGraph = (contactId: string): MemoryGraphResponse => ({
  contact_id: contactId,
  nodes: [
    { id: 'demo-n1', label: 'User', type: 'user', confidence: 1.0 },
    { id: 'demo-n2', label: 'Tech Solutions', type: 'organization', confidence: 0.95 },
    { id: 'demo-n3', label: 'Configuration', type: 'topic', confidence: 0.88 },
    { id: 'demo-n4', label: 'API Gateway', type: 'concept', confidence: 0.82 },
    { id: 'demo-n5', label: 'Authentication', type: 'concept', confidence: 0.79 },
  ],
  edges: [
    { id: 'demo-e1', source: 'demo-n1', target: 'demo-n2', relation: 'works_at', weight: 0.95 },
    { id: 'demo-e2', source: 'demo-n1', target: 'demo-n3', relation: 'interested_in', weight: 0.88 },
    { id: 'demo-e3', source: 'demo-n3', target: 'demo-n4', relation: 'includes', weight: 0.75 },
    { id: 'demo-e4', source: 'demo-n4', target: 'demo-n5', relation: 'requires', weight: 0.82 },
  ],
  metadata: {
    node_count: 5,
    edge_count: 4,
    last_updated: new Date().toISOString(),
  },
});

/**
 * useMemory - Hook for LEO Memory System integration
 *
 * @example
 * ```tsx
 * const {
 *   memoryData,
 *   graphNodes,
 *   graphEdges,
 *   isLoadingContext,
 *   fetchContext,
 *   searchMemories,
 * } = useMemory({
 *   contactId: 'user-123',
 *   autoFetch: true,
 *   demoMode: import.meta.env.VITE_DEMO_MODE === 'true',
 * });
 *
 * // Use in MemoryViewer
 * <MemoryViewer memory={memoryData} />
 *
 * // Use in MemoryGraph
 * <MemoryGraph nodes={graphNodes} edges={graphEdges} />
 * ```
 */
export function useMemory(options: UseMemoryOptions = {}): UseMemoryReturn {
  const {
    contactId: initialContactId,
    autoFetch = false,
    pollInterval = 0,
    demoMode = import.meta.env.VITE_DEMO_MODE === 'true',
    onContextFetched,
    onGraphFetched,
    onError,
  } = options;

  // State
  const [context, setContext] = useState<MemoryContextResponse | null>(null);
  const [graph, setGraph] = useState<MemoryGraphResponse | null>(null);
  const [memoryData, setMemoryData] = useState<MemoryData | null>(null);
  const [graphNodes, setGraphNodes] = useState<MemoryNodeData[]>([]);
  const [graphEdges, setGraphEdges] = useState<MemoryEdgeData[]>([]);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs
  const contactIdRef = useRef(initialContactId);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update contactId ref when prop changes
  useEffect(() => {
    contactIdRef.current = initialContactId;
  }, [initialContactId]);

  /**
   * Fetch memory context
   */
  const fetchContext = useCallback(
    async (contactId?: string) => {
      const targetId = contactId || contactIdRef.current;
      if (!targetId) {
        setError(new Error('Contact ID is required'));
        return;
      }

      setIsLoadingContext(true);
      setError(null);

      try {
        let contextData: MemoryContextResponse;

        if (demoMode) {
          // Use demo data
          await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate latency
          contextData = createDemoContext(targetId);
        } else {
          // Fetch from API
          contextData = await memoryApi.getContext(targetId);
        }

        setContext(contextData);

        // Convert to MemoryViewer format
        const viewerData = memoryApi.contextToViewerData(contextData);
        setMemoryData(viewerData);

        onContextFetched?.(contextData);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch memory context');
        setError(error);
        onError?.(error);

        // Fallback to demo data on error if enabled
        if (demoMode) {
          const demoContext = createDemoContext(targetId);
          setContext(demoContext);
          setMemoryData(memoryApi.contextToViewerData(demoContext));
        }
      } finally {
        setIsLoadingContext(false);
      }
    },
    [demoMode, onContextFetched, onError]
  );

  /**
   * Fetch memory graph
   */
  const fetchGraph = useCallback(
    async (contactId?: string) => {
      const targetId = contactId || contactIdRef.current;
      if (!targetId) {
        setError(new Error('Contact ID is required'));
        return;
      }

      setIsLoadingGraph(true);
      setError(null);

      try {
        let graphData: MemoryGraphResponse;

        if (demoMode) {
          // Use demo data
          await new Promise((resolve) => setTimeout(resolve, 200)); // Simulate latency
          graphData = createDemoGraph(targetId);
        } else {
          // Fetch from API
          graphData = await memoryApi.getGraph(targetId);
        }

        setGraph(graphData);

        // Convert to MemoryGraph format
        const componentData = memoryApi.graphToComponentData(graphData);
        setGraphNodes(componentData.nodes);
        setGraphEdges(componentData.edges);

        onGraphFetched?.(graphData);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch memory graph');
        setError(error);
        onError?.(error);

        // Fallback to demo data on error if enabled
        if (demoMode) {
          const demoGraph = createDemoGraph(targetId);
          setGraph(demoGraph);
          const componentData = memoryApi.graphToComponentData(demoGraph);
          setGraphNodes(componentData.nodes);
          setGraphEdges(componentData.edges);
        }
      } finally {
        setIsLoadingGraph(false);
      }
    },
    [demoMode, onGraphFetched, onError]
  );

  /**
   * Search memories
   */
  const searchMemories = useCallback(
    async (
      query: string,
      searchOptions?: Partial<MemorySearchRequest>
    ): Promise<MemorySearchResponse | null> => {
      if (!query.trim()) {
        return null;
      }

      setIsSearching(true);
      setError(null);

      try {
        if (demoMode) {
          // Return demo search results
          await new Promise((resolve) => setTimeout(resolve, 200));
          return {
            results: [
              {
                id: 'search-1',
                content: `Demo result for "${query}"`,
                layer: MemoryLayer.L3_SEMANTIC,
                confidence: 0.95,
                similarity_score: 0.92,
                created_at: new Date().toISOString(),
                source: 'demo',
              },
            ],
            total: 1,
            query,
            search_time_ms: 45,
          };
        }

        const response = await memoryApi.search({
          query,
          ...searchOptions,
        });

        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Memory search failed');
        setError(error);
        onError?.(error);
        return null;
      } finally {
        setIsSearching(false);
      }
    },
    [demoMode, onError]
  );

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    await Promise.all([fetchContext(), fetchGraph()]);
  }, [fetchContext, fetchGraph]);

  /**
   * Clear all data
   */
  const clear = useCallback(() => {
    setContext(null);
    setGraph(null);
    setMemoryData(null);
    setGraphNodes([]);
    setGraphEdges([]);
    setError(null);
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && initialContactId) {
      fetchContext();
      fetchGraph();
    }
  }, [autoFetch, initialContactId, fetchContext, fetchGraph]);

  // Setup polling
  useEffect(() => {
    if (pollInterval > 0 && initialContactId) {
      pollTimerRef.current = setInterval(() => {
        fetchContext();
        fetchGraph();
      }, pollInterval);

      return () => {
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
        }
      };
    }
  }, [pollInterval, initialContactId, fetchContext, fetchGraph]);

  return {
    memoryData,
    graphNodes,
    graphEdges,
    context,
    graph,
    isLoadingContext,
    isLoadingGraph,
    isSearching,
    error,
    fetchContext,
    fetchGraph,
    searchMemories,
    refresh,
    clear,
  };
}

export default useMemory;
