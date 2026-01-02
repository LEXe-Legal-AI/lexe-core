import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Search,
  Layers,
  Clock,
  Tag,
  Filter,
} from 'lucide-react';

// Re-export for external usage if needed
export { ChevronDown };
import { cn } from '@/lib/utils';
import { MemoryLayer, type MemoryFact } from '@/types';

/**
 * Memory data structure for viewer
 */
export interface MemoryData {
  layers: {
    [K in MemoryLayer]?: MemoryFact[];
  };
  stats?: {
    totalFacts: number;
    lastUpdated?: Date;
  };
}

export interface MemoryViewerProps {
  /** Memory data to display */
  memory: MemoryData;
  /** Display mode */
  mode?: 'tree' | 'json' | 'list';
  /** Show layer statistics */
  showStats?: boolean;
  /** Expandable layers */
  expandable?: boolean;
  /** Callback when fact is clicked */
  onFactClick?: (fact: MemoryFact) => void;
  /** Additional class names */
  className?: string;
}

const layerConfig: Record<MemoryLayer, { label: string; color: string; icon: React.ReactNode }> = {
  [MemoryLayer.L0_SESSION]: {
    label: 'L0 - Session',
    color: 'text-blue-400',
    icon: <Clock className="w-4 h-4" />,
  },
  [MemoryLayer.L1_CONVERSATION]: {
    label: 'L1 - Conversation',
    color: 'text-green-400',
    icon: <Layers className="w-4 h-4" />,
  },
  [MemoryLayer.L2_USER]: {
    label: 'L2 - User',
    color: 'text-yellow-400',
    icon: <Tag className="w-4 h-4" />,
  },
  [MemoryLayer.L3_SEMANTIC]: {
    label: 'L3 - Semantic',
    color: 'text-purple-400',
    icon: <Brain className="w-4 h-4" />,
  },
  [MemoryLayer.L4_GRAPH]: {
    label: 'L4 - Graph',
    color: 'text-leo-accent',
    icon: <Layers className="w-4 h-4" />,
  },
};

/**
 * MemoryViewer - Displays LEO Memory L0-L4 in tree/JSON format
 *
 * Features:
 * - Tree view with expandable layers
 * - JSON raw view
 * - List view for quick scanning
 * - Search/filter functionality
 * - Copy to clipboard
 * - Confidence indicators
 *
 * @example
 * ```tsx
 * <MemoryViewer
 *   memory={{
 *     layers: {
 *       [MemoryLayer.L0_SESSION]: [
 *         { id: '1', content: 'User prefers dark mode', layer: 0, confidence: 0.95 }
 *       ],
 *     },
 *   }}
 *   mode="tree"
 *   showStats
 * />
 * ```
 */
export function MemoryViewer({
  memory,
  mode = 'tree',
  showStats = true,
  expandable = true,
  onFactClick,
  className,
}: MemoryViewerProps) {
  const [viewMode, setViewMode] = useState<'tree' | 'json' | 'list'>(mode);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLayers, setExpandedLayers] = useState<Set<MemoryLayer>>(
    new Set([MemoryLayer.L0_SESSION, MemoryLayer.L1_CONVERSATION])
  );
  const [selectedLayer, setSelectedLayer] = useState<MemoryLayer | null>(null);
  const [copied, setCopied] = useState(false);

  // Filter facts by search
  const filteredMemory = useMemo(() => {
    if (!searchQuery.trim()) return memory;

    const query = searchQuery.toLowerCase();
    const filteredLayers: MemoryData['layers'] = {};

    for (const [layer, facts] of Object.entries(memory.layers)) {
      const filtered = facts?.filter(
        (fact) =>
          fact.content.toLowerCase().includes(query) ||
          fact.source?.toLowerCase().includes(query)
      );
      if (filtered && filtered.length > 0) {
        filteredLayers[Number(layer) as MemoryLayer] = filtered;
      }
    }

    return { ...memory, layers: filteredLayers };
  }, [memory, searchQuery]);

  // Stats calculation
  const stats = useMemo(() => {
    let totalFacts = 0;
    const layerCounts: Record<MemoryLayer, number> = {
      [MemoryLayer.L0_SESSION]: 0,
      [MemoryLayer.L1_CONVERSATION]: 0,
      [MemoryLayer.L2_USER]: 0,
      [MemoryLayer.L3_SEMANTIC]: 0,
      [MemoryLayer.L4_GRAPH]: 0,
    };

    for (const [layer, facts] of Object.entries(memory.layers)) {
      const count = facts?.length || 0;
      totalFacts += count;
      layerCounts[Number(layer) as MemoryLayer] = count;
    }

    return { totalFacts, layerCounts };
  }, [memory]);

  const toggleLayer = useCallback((layer: MemoryLayer) => {
    setExpandedLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) {
        next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  }, []);

  const handleCopyJSON = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(memory, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  }, [memory]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header Controls */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memory..."
            className={cn(
              'w-full pl-7 pr-3 py-1.5 rounded-lg',
              'bg-white/5 border border-white/10',
              'text-xs text-white placeholder:text-white/30',
              'focus:outline-none focus:ring-1 focus:ring-leo-secondary/50'
            )}
          />
        </div>

        {/* View Mode Toggles */}
        <div className="flex items-center bg-white/5 rounded-lg p-0.5">
          {(['tree', 'json', 'list'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={cn(
                'px-2 py-1 text-[10px] font-medium rounded transition-colors',
                viewMode === m
                  ? 'bg-leo-secondary text-white'
                  : 'text-white/50 hover:text-white'
              )}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopyJSON}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            'text-white/40 hover:text-white hover:bg-white/5'
          )}
          title="Copy as JSON"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-leo-accent" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Stats Bar */}
      {showStats && (
        <div className="flex items-center gap-3 px-3 py-1.5 border-b border-white/5 overflow-x-auto">
          <span className="text-[10px] text-white/40">
            Total: <span className="text-white/60 font-mono">{stats.totalFacts}</span>
          </span>
          {Object.entries(stats.layerCounts).map(([layer, count]) => (
            <button
              key={layer}
              onClick={() =>
                setSelectedLayer(
                  selectedLayer === Number(layer)
                    ? null
                    : (Number(layer) as MemoryLayer)
                )
              }
              className={cn(
                'flex items-center gap-1 text-[10px] transition-colors',
                selectedLayer === Number(layer)
                  ? layerConfig[Number(layer) as MemoryLayer].color
                  : 'text-white/40 hover:text-white/60'
              )}
            >
              <span>L{layer}:</span>
              <span className="font-mono">{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {viewMode === 'tree' && (
            <TreeView
              key="tree"
              memory={filteredMemory}
              expandedLayers={expandedLayers}
              selectedLayer={selectedLayer}
              expandable={expandable}
              onToggleLayer={toggleLayer}
              onFactClick={onFactClick}
            />
          )}
          {viewMode === 'json' && (
            <JsonView key="json" memory={filteredMemory} />
          )}
          {viewMode === 'list' && (
            <ListView
              key="list"
              memory={filteredMemory}
              selectedLayer={selectedLayer}
              onFactClick={onFactClick}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * Tree view component
 */
interface TreeViewProps {
  memory: MemoryData;
  expandedLayers: Set<MemoryLayer>;
  selectedLayer: MemoryLayer | null;
  expandable: boolean;
  onToggleLayer: (layer: MemoryLayer) => void;
  onFactClick?: (fact: MemoryFact) => void;
}

function TreeView({
  memory,
  expandedLayers,
  selectedLayer,
  expandable,
  onToggleLayer,
  onFactClick,
}: TreeViewProps) {
  const layers = Object.entries(memory.layers)
    .filter(
      ([layer]) => selectedLayer === null || Number(layer) === selectedLayer
    )
    .sort(([a], [b]) => Number(a) - Number(b));

  if (layers.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center h-full p-8 text-center"
      >
        <Brain className="w-8 h-8 text-white/20 mb-2" />
        <p className="text-sm text-white/40 font-body">No memory data available</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-2 space-y-1"
    >
      {layers.map(([layer, facts]) => {
        const layerNum = Number(layer) as MemoryLayer;
        const config = layerConfig[layerNum];
        const isExpanded = expandedLayers.has(layerNum);

        return (
          <div key={layer} className="rounded-lg overflow-hidden">
            {/* Layer Header */}
            <button
              onClick={() => expandable && onToggleLayer(layerNum)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2',
                'bg-white/[0.03] hover:bg-white/[0.06]',
                'transition-colors',
                expandable && 'cursor-pointer'
              )}
            >
              {expandable && (
                <motion.span
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-white/40"
                >
                  <ChevronRight className="w-4 h-4" />
                </motion.span>
              )}
              <span className={config.color}>{config.icon}</span>
              <span className="text-xs font-medium text-white">{config.label}</span>
              <span className="ml-auto text-[10px] text-white/40 font-mono">
                {facts?.length || 0} facts
              </span>
            </button>

            {/* Layer Content */}
            <AnimatePresence>
              {isExpanded && facts && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pl-8 pr-2 py-1 space-y-1">
                    {facts.map((fact) => (
                      <FactCard
                        key={fact.id}
                        fact={fact}
                        onClick={() => onFactClick?.(fact)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </motion.div>
  );
}

/**
 * JSON view component
 */
function JsonView({ memory }: { memory: MemoryData }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-3"
    >
      <pre
        className={cn(
          'text-[11px] font-mono text-white/70',
          'bg-black/20 rounded-lg p-3',
          'overflow-auto max-h-full',
          'whitespace-pre-wrap break-all'
        )}
      >
        {JSON.stringify(memory, null, 2)}
      </pre>
    </motion.div>
  );
}

/**
 * List view component
 */
interface ListViewProps {
  memory: MemoryData;
  selectedLayer: MemoryLayer | null;
  onFactClick?: (fact: MemoryFact) => void;
}

function ListView({ memory, selectedLayer, onFactClick }: ListViewProps) {
  const allFacts = useMemo(() => {
    const facts: MemoryFact[] = [];
    for (const [layer, layerFacts] of Object.entries(memory.layers)) {
      if (selectedLayer === null || Number(layer) === selectedLayer) {
        facts.push(...(layerFacts || []));
      }
    }
    return facts.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [memory, selectedLayer]);

  if (allFacts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center h-full p-8 text-center"
      >
        <Filter className="w-8 h-8 text-white/20 mb-2" />
        <p className="text-sm text-white/40 font-body">No facts match the filter</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-2 space-y-1"
    >
      {allFacts.map((fact) => (
        <FactCard
          key={fact.id}
          fact={fact}
          showLayer
          onClick={() => onFactClick?.(fact)}
        />
      ))}
    </motion.div>
  );
}

/**
 * Fact card component
 */
interface FactCardProps {
  fact: MemoryFact;
  showLayer?: boolean;
  onClick?: () => void;
}

function FactCard({ fact, showLayer = false, onClick }: FactCardProps) {
  const config = layerConfig[fact.layer];
  const confidenceColor =
    fact.confidence >= 0.8
      ? 'bg-green-500'
      : fact.confidence >= 0.5
        ? 'bg-yellow-500'
        : 'bg-red-500';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className={cn(
        'px-3 py-2 rounded-lg cursor-pointer',
        'bg-white/[0.02] hover:bg-white/[0.05]',
        'border border-transparent hover:border-white/5',
        'transition-all duration-150'
      )}
    >
      <div className="flex items-start gap-2">
        {/* Confidence Indicator */}
        <div
          className={cn(
            'w-1 h-full min-h-[24px] rounded-full',
            confidenceColor
          )}
          title={`Confidence: ${Math.round(fact.confidence * 100)}%`}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/80 leading-relaxed">{fact.content}</p>
          <div className="flex items-center gap-2 mt-1">
            {showLayer && (
              <span
                className={cn(
                  'text-[9px] font-medium px-1.5 py-0.5 rounded',
                  'bg-white/5',
                  config.color
                )}
              >
                {config.label}
              </span>
            )}
            {fact.source && (
              <span className="text-[10px] text-white/30">{fact.source}</span>
            )}
            <span className="text-[10px] text-white/30 ml-auto font-mono">
              {Math.round(fact.confidence * 100)}%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default MemoryViewer;
