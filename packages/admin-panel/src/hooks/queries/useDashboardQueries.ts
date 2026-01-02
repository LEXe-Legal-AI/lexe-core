/**
 * LEO Frontend - Dashboard Query Hooks
 * TanStack Query hooks for dashboard data fetching
 *
 * Features:
 * - Real-time auto-refresh (30 seconds)
 * - Error handling with toast notifications
 * - Optimistic updates support
 * - Stale-while-revalidate caching
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { agentsApi, type AgentMetrics } from '@/api/agents';
import { pipelineApi, type PipelineMetrics } from '@/api/pipeline';
import { memoryApi, type MemoryStats } from '@/api/memory';
import { toast } from '@/hooks/use-toast';

// ============================================================================
// Query Keys
// ============================================================================

export const dashboardKeys = {
  all: ['dashboard'] as const,
  agents: () => [...dashboardKeys.all, 'agents'] as const,
  pipeline: () => [...dashboardKeys.all, 'pipeline'] as const,
  memory: () => [...dashboardKeys.all, 'memory'] as const,
};

// ============================================================================
// Configuration
// ============================================================================

/** Auto-refresh interval in milliseconds (30 seconds) */
const REFRESH_INTERVAL = 30 * 1000;

/** Stale time before refetching (20 seconds) */
const STALE_TIME = 20 * 1000;

// ============================================================================
// Individual Query Hooks
// ============================================================================

/**
 * Hook for fetching agent metrics
 */
export function useAgentMetricsQuery(options?: { enabled?: boolean }) {
  return useQuery<AgentMetrics, Error>({
    queryKey: dashboardKeys.agents(),
    queryFn: agentsApi.getMetrics,
    staleTime: STALE_TIME,
    refetchInterval: REFRESH_INTERVAL,
    enabled: options?.enabled ?? true,
    meta: {
      errorMessage: 'Impossibile caricare le metriche degli agenti',
    },
  });
}

/**
 * Hook for fetching pipeline metrics
 */
export function usePipelineMetricsQuery(options?: { enabled?: boolean }) {
  return useQuery<PipelineMetrics, Error>({
    queryKey: dashboardKeys.pipeline(),
    queryFn: pipelineApi.getMetrics,
    staleTime: STALE_TIME,
    refetchInterval: REFRESH_INTERVAL,
    enabled: options?.enabled ?? true,
    meta: {
      errorMessage: 'Impossibile caricare le metriche della pipeline',
    },
  });
}

/**
 * Hook for fetching memory stats
 */
export function useMemoryStatsQuery(options?: { enabled?: boolean }) {
  return useQuery<MemoryStats, Error>({
    queryKey: dashboardKeys.memory(),
    queryFn: memoryApi.getStats,
    staleTime: STALE_TIME,
    refetchInterval: REFRESH_INTERVAL,
    enabled: options?.enabled ?? true,
    meta: {
      errorMessage: 'Impossibile caricare le statistiche della memoria',
    },
  });
}

// ============================================================================
// Combined Dashboard Hook
// ============================================================================

export interface DashboardData {
  agents: AgentMetrics | undefined;
  pipeline: PipelineMetrics | undefined;
  memory: MemoryStats | undefined;
}

export interface DashboardQueryState {
  data: DashboardData;
  isLoading: boolean;
  isError: boolean;
  errors: Error[];
  refetch: () => void;
  lastUpdated: Date | null;
}

/**
 * Combined hook for all dashboard data
 * Fetches agent, pipeline, and memory metrics in parallel
 */
export function useDashboardData(): DashboardQueryState {
  const queryClient = useQueryClient();

  const agentsQuery = useAgentMetricsQuery();
  const pipelineQuery = usePipelineMetricsQuery();
  const memoryQuery = useMemoryStatsQuery();

  // Collect errors from all queries
  const errors = [
    agentsQuery.error,
    pipelineQuery.error,
    memoryQuery.error,
  ].filter((e): e is Error => e !== null);

  // Show toast notifications for errors
  useEffect(() => {
    if (agentsQuery.error) {
      toast({
        variant: 'destructive',
        title: 'Errore Agenti',
        description: 'Impossibile caricare le metriche degli agenti. Riprova tra poco.',
      });
    }
  }, [agentsQuery.error]);

  useEffect(() => {
    if (pipelineQuery.error) {
      toast({
        variant: 'destructive',
        title: 'Errore Pipeline',
        description: 'Impossibile caricare le metriche della pipeline. Riprova tra poco.',
      });
    }
  }, [pipelineQuery.error]);

  useEffect(() => {
    if (memoryQuery.error) {
      toast({
        variant: 'destructive',
        title: 'Errore Memory',
        description: 'Impossibile caricare le statistiche della memoria. Riprova tra poco.',
      });
    }
  }, [memoryQuery.error]);

  // Combined refetch function
  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  }, [queryClient]);

  // Calculate last updated time from the most recent successful fetch
  const lastUpdated = [
    agentsQuery.dataUpdatedAt,
    pipelineQuery.dataUpdatedAt,
    memoryQuery.dataUpdatedAt,
  ]
    .filter((t) => t > 0)
    .sort((a, b) => b - a)[0];

  return {
    data: {
      agents: agentsQuery.data,
      pipeline: pipelineQuery.data,
      memory: memoryQuery.data,
    },
    isLoading:
      agentsQuery.isLoading ||
      pipelineQuery.isLoading ||
      memoryQuery.isLoading,
    isError: errors.length > 0,
    errors,
    refetch,
    lastUpdated: lastUpdated ? new Date(lastUpdated) : null,
  };
}

// ============================================================================
// Prefetch Utility
// ============================================================================

/**
 * Prefetch all dashboard data
 * Useful for preloading on route hover
 */
export function usePrefetchDashboard() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: dashboardKeys.agents(),
      queryFn: agentsApi.getMetrics,
      staleTime: STALE_TIME,
    });
    queryClient.prefetchQuery({
      queryKey: dashboardKeys.pipeline(),
      queryFn: pipelineApi.getMetrics,
      staleTime: STALE_TIME,
    });
    queryClient.prefetchQuery({
      queryKey: dashboardKeys.memory(),
      queryFn: memoryApi.getStats,
      staleTime: STALE_TIME,
    });
  }, [queryClient]);
}
