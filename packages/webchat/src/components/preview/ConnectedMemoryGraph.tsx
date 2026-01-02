/**
 * ConnectedMemoryGraph - Memory graph with API integration
 *
 * Wraps MemoryGraph with useMemory hook for real data fetching.
 * Supports demo mode fallback when API is unavailable.
 */

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, RefreshCw, AlertCircle, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemory } from '@/hooks';
import { MemoryGraph, type MemoryGraphProps, type MemoryNodeData, type MemoryEdgeData } from './MemoryGraph';

export interface ConnectedMemoryGraphProps
  extends Omit<MemoryGraphProps, 'nodes' | 'edges'> {
  /** Contact ID to fetch graph for */
  contactId?: string;
  /** Use demo data when API unavailable */
  demoMode?: boolean;
  /** Enable auto-refresh */
  autoRefresh?: boolean;
  /** Refresh interval in ms (default: 30000) */
  refreshInterval?: number;
  /** Show refresh button */
  showRefresh?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * ConnectedMemoryGraph
 *
 * @example
 * ```tsx
 * <ConnectedMemoryGraph
 *   contactId="user-123"
 *   demoMode={false}
 *   showMinimap
 *   showControls
 *   onNodeClick={(node) => console.log('Node clicked:', node)}
 * />
 * ```
 */
export function ConnectedMemoryGraph({
  contactId,
  demoMode = import.meta.env.VITE_DEMO_MODE === 'true',
  autoRefresh = false,
  refreshInterval = 30000,
  showRefresh = true,
  className,
  ...graphProps
}: ConnectedMemoryGraphProps) {
  const {
    graphNodes,
    graphEdges,
    isLoadingGraph,
    error,
    fetchGraph,
  } = useMemory({
    contactId,
    autoFetch: !!contactId,
    pollInterval: autoRefresh ? refreshInterval : 0,
    demoMode,
  });

  // Fetch on contactId change
  useEffect(() => {
    if (contactId) {
      fetchGraph(contactId);
    }
  }, [contactId, fetchGraph]);

  // Loading state
  if (isLoadingGraph && graphNodes.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full p-8', className)}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-8 h-8 text-leo-secondary" />
        </motion.div>
        <p className="mt-3 text-sm text-white/60 font-body">Loading memory graph...</p>
      </div>
    );
  }

  // Error state (with retry option)
  if (error && graphNodes.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full p-8', className)}>
        <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
        <p className="text-sm text-white/60 font-body text-center mb-4">
          {error.message}
        </p>
        <button
          onClick={() => fetchGraph()}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg',
            'bg-leo-secondary/20 text-leo-secondary',
            'hover:bg-leo-secondary/30 transition-colors',
            'text-sm font-medium'
          )}
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  // No contact ID state
  if (!contactId) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full p-8', className)}>
        <Share2 className="w-8 h-8 text-white/20 mb-3" />
        <p className="text-sm text-white/40 font-body text-center">
          Select a conversation to view memory graph
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Refresh Header */}
      {showRefresh && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
          <span className="text-[10px] text-white/40">
            {graphNodes.length} nodes, {graphEdges.length} edges
          </span>
          <button
            onClick={() => fetchGraph()}
            disabled={isLoadingGraph}
            className={cn(
              'p-1 rounded transition-colors',
              'text-white/40 hover:text-white hover:bg-white/5',
              isLoadingGraph && 'opacity-50 cursor-not-allowed'
            )}
            title="Refresh graph"
          >
            <RefreshCw
              className={cn('w-3.5 h-3.5', isLoadingGraph && 'animate-spin')}
            />
          </button>
        </div>
      )}

      {/* Memory Graph */}
      <div className="flex-1 overflow-hidden">
        <MemoryGraph
          nodes={graphNodes}
          edges={graphEdges}
          {...graphProps}
        />
      </div>
    </div>
  );
}

export default ConnectedMemoryGraph;
