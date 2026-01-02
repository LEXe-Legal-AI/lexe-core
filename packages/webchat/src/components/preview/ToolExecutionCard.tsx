import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench,
  Globe,
  Code,
  FileText,
  Search,
  Terminal,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  Check,
  Play,
  Pause,
} from 'lucide-react';

// Re-export for external usage if needed
export { ChevronUp };
import { cn } from '@/lib/utils';
import { type ToolExecution } from '@/types';

export interface ToolExecutionCardProps {
  /** Tool execution data */
  tool: ToolExecution;
  /** Show full output */
  expanded?: boolean;
  /** Callback when expand is toggled */
  onToggleExpand?: () => void;
  /** Callback when retry is clicked */
  onRetry?: () => void;
  /** Callback when cancel is clicked */
  onCancel?: () => void;
  /** Show timestamps */
  showTimestamps?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

const toolIcons: Record<ToolExecution['type'], React.ReactNode> = {
  browser: <Globe className="w-4 h-4" />,
  search: <Search className="w-4 h-4" />,
  code: <Code className="w-4 h-4" />,
  file: <FileText className="w-4 h-4" />,
  custom: <Terminal className="w-4 h-4" />,
};

const statusConfig = {
  pending: {
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    icon: <Clock className="w-4 h-4" />,
    label: 'Pending',
  },
  executing: {
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    label: 'Executing',
  },
  completed: {
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    icon: <CheckCircle className="w-4 h-4" />,
    label: 'Completed',
  },
  failed: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    icon: <XCircle className="w-4 h-4" />,
    label: 'Failed',
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    transition: { duration: 0.15 },
  },
};

/**
 * ToolExecutionCard - Displays tool execution status and output
 *
 * Features:
 * - Status indicator (pending, executing, completed, failed)
 * - Tool type icon
 * - Input/Output display
 * - Duration calculation
 * - Expandable details
 * - Copy output
 * - Retry/Cancel actions
 *
 * @example
 * ```tsx
 * <ToolExecutionCard
 *   tool={{
 *     id: '1',
 *     name: 'web_search',
 *     type: 'search',
 *     status: 'completed',
 *     input: { query: 'React best practices' },
 *     output: { results: [...] },
 *     startedAt: new Date(),
 *     completedAt: new Date(),
 *   }}
 *   expanded
 *   showTimestamps
 * />
 * ```
 */
export function ToolExecutionCard({
  tool,
  expanded: controlledExpanded,
  onToggleExpand,
  onRetry,
  onCancel,
  showTimestamps = true,
  compact = false,
  className,
}: ToolExecutionCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);

  const isExpanded = controlledExpanded ?? internalExpanded;
  const toggleExpand = onToggleExpand ?? (() => setInternalExpanded(!internalExpanded));

  const status = statusConfig[tool.status];
  const toolIcon = toolIcons[tool.type] || toolIcons.custom;

  // Calculate duration
  const duration = useMemo(() => {
    if (!tool.startedAt) return null;
    const end = tool.completedAt || new Date();
    const start = new Date(tool.startedAt);
    const ms = end.getTime() - start.getTime();

    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }, [tool.startedAt, tool.completedAt]);

  const handleCopy = async (content: unknown, type: 'input' | 'output') => {
    try {
      await navigator.clipboard.writeText(
        typeof content === 'string' ? content : JSON.stringify(content, null, 2)
      );
      if (type === 'input') {
        setCopiedInput(true);
        setTimeout(() => setCopiedInput(false), 2000);
      } else {
        setCopiedOutput(true);
        setTimeout(() => setCopiedOutput(false), 2000);
      }
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(
        'rounded-xl overflow-hidden',
        'backdrop-blur-xl border transition-all duration-200',
        status.bg,
        status.border,
        'hover:border-white/20',
        className
      )}
    >
      {/* Header */}
      <button
        onClick={toggleExpand}
        className={cn(
          'w-full flex items-center gap-3 px-4',
          compact ? 'py-2' : 'py-3',
          'text-left transition-colors',
          'hover:bg-white/5'
        )}
      >
        {/* Tool Icon */}
        <div
          className={cn(
            'flex-shrink-0 p-2 rounded-lg',
            'bg-white/5 border border-white/10',
            status.color
          )}
        >
          {toolIcon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">
              {tool.name}
            </span>
            <span
              className={cn(
                'flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded',
                'bg-white/5',
                status.color
              )}
            >
              {tool.type}
            </span>
          </div>
          {!compact && tool.input && (
            <p className="text-xs text-white/50 mt-0.5 truncate">
              {typeof tool.input === 'string'
                ? tool.input
                : JSON.stringify(tool.input).slice(0, 60) + '...'}
            </p>
          )}
        </div>

        {/* Status & Duration */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {duration && (
            <span className="text-[10px] text-white/40 font-mono">{duration}</span>
          )}
          <span className={cn('flex items-center gap-1', status.color)}>
            {status.icon}
            {!compact && (
              <span className="text-xs font-medium">{status.label}</span>
            )}
          </span>
          <motion.span
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-white/40"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.span>
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Timestamps */}
              {showTimestamps && tool.startedAt && (
                <div className="flex items-center gap-4 text-[10px] text-white/40 py-2 border-t border-white/5">
                  <span>
                    Started:{' '}
                    <span className="font-mono text-white/60">
                      {new Date(tool.startedAt).toLocaleTimeString()}
                    </span>
                  </span>
                  {tool.completedAt && (
                    <span>
                      Completed:{' '}
                      <span className="font-mono text-white/60">
                        {new Date(tool.completedAt).toLocaleTimeString()}
                      </span>
                    </span>
                  )}
                </div>
              )}

              {/* Input */}
              {tool.input && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">
                      Input
                    </span>
                    <button
                      onClick={() => handleCopy(tool.input, 'input')}
                      className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      {copiedInput ? (
                        <Check className="w-3 h-3 text-leo-accent" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                  <pre
                    className={cn(
                      'text-[11px] font-mono text-white/70',
                      'bg-black/20 rounded-lg p-3',
                      'overflow-auto max-h-[150px]',
                      'whitespace-pre-wrap break-all'
                    )}
                  >
                    {typeof tool.input === 'string'
                      ? tool.input
                      : JSON.stringify(tool.input, null, 2)}
                  </pre>
                </div>
              )}

              {/* Output */}
              {tool.output && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">
                      Output
                    </span>
                    <button
                      onClick={() => handleCopy(tool.output, 'output')}
                      className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      {copiedOutput ? (
                        <Check className="w-3 h-3 text-leo-accent" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                  <pre
                    className={cn(
                      'text-[11px] font-mono text-white/70',
                      'bg-black/20 rounded-lg p-3',
                      'overflow-auto max-h-[200px]',
                      'whitespace-pre-wrap break-all'
                    )}
                  >
                    {typeof tool.output === 'string'
                      ? tool.output
                      : JSON.stringify(tool.output, null, 2)}
                  </pre>
                </div>
              )}

              {/* Error */}
              {tool.error && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">
                    Error
                  </span>
                  <div className="text-xs text-red-400 bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                    {tool.error}
                  </div>
                </div>
              )}

              {/* Actions */}
              {(onRetry || onCancel) && (
                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  {onRetry && tool.status === 'failed' && (
                    <button
                      onClick={onRetry}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                        'text-xs font-medium',
                        'bg-leo-secondary/20 text-leo-secondary',
                        'hover:bg-leo-secondary/30 transition-colors'
                      )}
                    >
                      <Play className="w-3 h-3" />
                      Retry
                    </button>
                  )}
                  {onCancel && tool.status === 'executing' && (
                    <button
                      onClick={onCancel}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                        'text-xs font-medium',
                        'bg-red-500/20 text-red-400',
                        'hover:bg-red-500/30 transition-colors'
                      )}
                    >
                      <Pause className="w-3 h-3" />
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * ToolExecutionList - List of tool executions
 */
export interface ToolExecutionListProps {
  /** List of tool executions */
  tools: ToolExecution[];
  /** Callback when tool is clicked */
  onToolClick?: (tool: ToolExecution) => void;
  /** Show all expanded */
  expandAll?: boolean;
  /** Additional class names */
  className?: string;
}

export function ToolExecutionList({
  tools,
  onToolClick,
  expandAll = false,
  className,
}: ToolExecutionListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (tools.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full p-8', className)}>
        <div className="text-center">
          <Wrench className="w-8 h-8 text-white/20 mx-auto mb-2" />
          <p className="text-sm text-white/40 font-body">No tool executions</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2 p-2', className)}>
      <AnimatePresence>
        {tools.map((tool) => (
          <ToolExecutionCard
            key={tool.id}
            tool={tool}
            expanded={expandAll || expandedIds.has(tool.id)}
            onToggleExpand={() => {
              toggleExpand(tool.id);
              onToolClick?.(tool);
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default ToolExecutionCard;
