/**
 * ConnectedMemoryViewer - Memory viewer with API integration
 *
 * Wraps MemoryViewer with useMemory hook for real data fetching.
 * Supports demo mode fallback when API is unavailable.
 */

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemory } from '@/hooks';
import { MemoryViewer, type MemoryViewerProps, type MemoryData } from './MemoryViewer';
import type { MemoryFact } from '@/types';

export interface ConnectedMemoryViewerProps
  extends Omit<MemoryViewerProps, 'memory'> {
  /** Contact ID to fetch memory for */
  contactId?: string;
  /** Use demo data when API unavailable */
  demoMode?: boolean;
  /** Enable auto-refresh */
  autoRefresh?: boolean;
  /** Refresh interval in ms (default: 30000) */
  refreshInterval?: number;
  /** Show refresh button */
  showRefresh?: boolean;
  /** Callback when fact is clicked */
  onFactClick?: (fact: MemoryFact) => void;
  /** Additional class names */
  className?: string;
}

/**
 * Empty memory data structure
 */
const emptyMemory: MemoryData = {
  layers: {},
  stats: { totalFacts: 0 },
};

/**
 * ConnectedMemoryViewer
 *
 * @example
 * ```tsx
 * <ConnectedMemoryViewer
 *   contactId="user-123"
 *   demoMode={false}
 *   showRefresh
 *   onFactClick={(fact) => console.log('Clicked:', fact)}
 * />
 * ```
 */
export function ConnectedMemoryViewer({
  contactId,
  demoMode = import.meta.env.VITE_DEMO_MODE === 'true',
  autoRefresh = false,
  refreshInterval = 30000,
  showRefresh = true,
  onFactClick,
  className,
  ...viewerProps
}: ConnectedMemoryViewerProps) {
  const {
    memoryData,
    isLoadingContext,
    error,
    fetchContext,
  } = useMemory({
    contactId,
    autoFetch: !!contactId,
    pollInterval: autoRefresh ? refreshInterval : 0,
    demoMode,
  });

  // Fetch on contactId change
  useEffect(() => {
    if (contactId) {
      fetchContext(contactId);
    }
  }, [contactId, fetchContext]);

  // Loading state
  if (isLoadingContext && !memoryData) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full p-8', className)}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-8 h-8 text-leo-secondary" />
        </motion.div>
        <p className="mt-3 text-sm text-white/60 font-body">Loading memory context...</p>
      </div>
    );
  }

  // Error state (with retry option)
  if (error && !memoryData) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full p-8', className)}>
        <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
        <p className="text-sm text-white/60 font-body text-center mb-4">
          {error.message}
        </p>
        <button
          onClick={() => fetchContext()}
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
        <p className="text-sm text-white/40 font-body text-center">
          Select a conversation to view memory context
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
            {memoryData?.stats?.lastUpdated
              ? `Updated: ${new Date(memoryData.stats.lastUpdated).toLocaleTimeString()}`
              : 'Memory Context'}
          </span>
          <button
            onClick={() => fetchContext()}
            disabled={isLoadingContext}
            className={cn(
              'p-1 rounded transition-colors',
              'text-white/40 hover:text-white hover:bg-white/5',
              isLoadingContext && 'opacity-50 cursor-not-allowed'
            )}
            title="Refresh memory"
          >
            <RefreshCw
              className={cn('w-3.5 h-3.5', isLoadingContext && 'animate-spin')}
            />
          </button>
        </div>
      )}

      {/* Memory Viewer */}
      <div className="flex-1 overflow-hidden">
        <MemoryViewer
          memory={memoryData || emptyMemory}
          onFactClick={onFactClick}
          {...viewerProps}
        />
      </div>
    </div>
  );
}

export default ConnectedMemoryViewer;
