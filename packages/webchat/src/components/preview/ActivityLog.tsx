import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  MessageSquare,
  Wrench,
  Brain,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  Search,
  ChevronDown,
  Circle,
  Pause,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';

/**
 * Activity event types
 */
export type ActivityEventType =
  | 'phase_start'
  | 'token'
  | 'tool_call'
  | 'tool_result'
  | 'memory_update'
  | 'error'
  | 'done'
  | 'system';

/**
 * Activity event data structure
 */
export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  timestamp: Date;
  title: string;
  description?: string;
  metadata?: {
    phase?: number;
    phaseName?: string;
    toolName?: string;
    status?: 'pending' | 'executing' | 'completed' | 'failed';
    duration?: number;
    tokens?: number;
    error?: string;
  };
}

export interface ActivityLogProps {
  /** List of activity events */
  events: ActivityEvent[];
  /** Auto-scroll to new events */
  autoScroll?: boolean;
  /** Show filter controls */
  showFilters?: boolean;
  /** Maximum events to display */
  maxEvents?: number;
  /** Callback when event is clicked */
  onEventClick?: (event: ActivityEvent) => void;
  /** Additional class names */
  className?: string;
}

const eventIcons: Record<ActivityEventType, React.ReactNode> = {
  phase_start: <Activity className="w-3.5 h-3.5" />,
  token: <MessageSquare className="w-3.5 h-3.5" />,
  tool_call: <Wrench className="w-3.5 h-3.5" />,
  tool_result: <CheckCircle className="w-3.5 h-3.5" />,
  memory_update: <Brain className="w-3.5 h-3.5" />,
  error: <AlertCircle className="w-3.5 h-3.5" />,
  done: <CheckCircle className="w-3.5 h-3.5" />,
  system: <Circle className="w-3.5 h-3.5" />,
};

const eventColors: Record<ActivityEventType, string> = {
  phase_start: 'text-leo-secondary',
  token: 'text-white/60',
  tool_call: 'text-leo-accent',
  tool_result: 'text-green-400',
  memory_update: 'text-purple-400',
  error: 'text-red-400',
  done: 'text-green-400',
  system: 'text-white/40',
};

const eventVariants = {
  hidden: { opacity: 0, x: -10, height: 0 },
  visible: {
    opacity: 1,
    x: 0,
    height: 'auto',
    transition: {
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    opacity: 0,
    x: 10,
    height: 0,
    transition: { duration: 0.15 },
  },
};

/**
 * ActivityLog - Real-time activity log viewer
 *
 * Features:
 * - Real-time streaming events
 * - Filter by event type
 * - Search functionality
 * - Auto-scroll toggle
 * - Expandable event details
 * - Timestamp display
 *
 * @example
 * ```tsx
 * <ActivityLog
 *   events={streamingEvents}
 *   autoScroll
 *   showFilters
 *   onEventClick={(event) => console.log(event)}
 * />
 * ```
 */
export function ActivityLog({
  events,
  autoScroll = true,
  showFilters = true,
  maxEvents = 200,
  onEventClick,
  className,
}: ActivityLogProps) {
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(autoScroll);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<ActivityEventType>>(
    new Set(['phase_start', 'tool_call', 'tool_result', 'memory_update', 'error', 'done'])
  );
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastEventRef = useRef<HTMLDivElement>(null);

  // Filter events
  const filteredEvents = useMemo(() => {
    let filtered = events.filter((event) => selectedTypes.has(event.type));

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.metadata?.toolName?.toLowerCase().includes(query)
      );
    }

    // Limit events
    if (filtered.length > maxEvents) {
      filtered = filtered.slice(-maxEvents);
    }

    return filtered;
  }, [events, selectedTypes, searchQuery, maxEvents]);

  // Auto-scroll effect
  useEffect(() => {
    if (isAutoScrollEnabled && lastEventRef.current) {
      lastEventRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [filteredEvents.length, isAutoScrollEnabled]);

  const toggleEventType = (type: ActivityEventType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const toggleEventExpand = (eventId: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header Controls */}
      {showFilters && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events..."
              className={cn(
                'w-full pl-7 pr-3 py-1.5 rounded-lg',
                'bg-white/5 border border-white/10',
                'text-xs text-white placeholder:text-white/30',
                'focus:outline-none focus:ring-1 focus:ring-leo-secondary/50'
              )}
            />
          </div>

          {/* Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={cn(
                'flex items-center gap-1 px-2 py-1.5 rounded-lg',
                'bg-white/5 border border-white/10',
                'text-xs text-white/60 hover:text-white',
                'transition-colors'
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              <ChevronDown
                className={cn(
                  'w-3 h-3 transition-transform',
                  showFilterDropdown && 'rotate-180'
                )}
              />
            </button>

            <AnimatePresence>
              {showFilterDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className={cn(
                    'absolute right-0 top-full mt-1 z-10',
                    'w-40 p-2 rounded-lg',
                    'bg-leo-dark/95 backdrop-blur-xl',
                    'border border-white/10 shadow-xl'
                  )}
                >
                  {(Object.keys(eventIcons) as ActivityEventType[]).map((type) => (
                    <label
                      key={type}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded',
                        'text-xs cursor-pointer',
                        'hover:bg-white/5 transition-colors',
                        selectedTypes.has(type) ? 'text-white' : 'text-white/40'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTypes.has(type)}
                        onChange={() => toggleEventType(type)}
                        className="w-3 h-3 rounded accent-leo-secondary"
                      />
                      <span className={eventColors[type]}>{eventIcons[type]}</span>
                      <span className="capitalize">{type.replace('_', ' ')}</span>
                    </label>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Auto-scroll Toggle */}
          <button
            onClick={() => setIsAutoScrollEnabled(!isAutoScrollEnabled)}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              isAutoScrollEnabled
                ? 'bg-leo-secondary/20 text-leo-secondary'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            )}
            title={isAutoScrollEnabled ? 'Pause auto-scroll' : 'Enable auto-scroll'}
          >
            {isAutoScrollEnabled ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      )}

      {/* Events List */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
      >
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Activity className="w-8 h-8 text-white/20 mb-2" />
            <p className="text-sm text-white/40 font-body">
              {events.length === 0 ? 'No activity yet' : 'No matching events'}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            <AnimatePresence initial={false}>
              {filteredEvents.map((event, index) => {
                const isLast = index === filteredEvents.length - 1;
                const isExpanded = expandedEvents.has(event.id);

                return (
                  <motion.div
                    key={event.id}
                    ref={isLast ? lastEventRef : undefined}
                    variants={eventVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                    onClick={() => {
                      toggleEventExpand(event.id);
                      onEventClick?.(event);
                    }}
                    className={cn(
                      'px-3 py-2 rounded-lg cursor-pointer',
                      'bg-white/[0.02] hover:bg-white/[0.05]',
                      'border border-transparent hover:border-white/5',
                      'transition-all duration-150'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {/* Icon */}
                      <span className={cn('flex-shrink-0 mt-0.5', eventColors[event.type])}>
                        {eventIcons[event.type]}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-white truncate">
                            {event.title}
                          </span>
                          <span className="flex-shrink-0 text-[10px] text-white/30 font-mono">
                            {formatRelativeTime(event.timestamp)}
                          </span>
                        </div>

                        {event.description && (
                          <p className="text-[11px] text-white/50 mt-0.5 line-clamp-1">
                            {event.description}
                          </p>
                        )}

                        {/* Expanded Details */}
                        <AnimatePresence>
                          {isExpanded && event.metadata && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-2 pt-2 border-t border-white/5"
                            >
                              <div className="space-y-1 text-[10px]">
                                {event.metadata.toolName && (
                                  <MetadataRow label="Tool" value={event.metadata.toolName} />
                                )}
                                {event.metadata.phase !== undefined && (
                                  <MetadataRow
                                    label="Phase"
                                    value={`${event.metadata.phase} - ${event.metadata.phaseName || 'Unknown'}`}
                                  />
                                )}
                                {event.metadata.duration !== undefined && (
                                  <MetadataRow
                                    label="Duration"
                                    value={`${event.metadata.duration}ms`}
                                    icon={<Clock className="w-3 h-3" />}
                                  />
                                )}
                                {event.metadata.tokens !== undefined && (
                                  <MetadataRow label="Tokens" value={event.metadata.tokens.toString()} />
                                )}
                                {event.metadata.error && (
                                  <div className="mt-1 p-1.5 rounded bg-red-500/10 text-red-400">
                                    {event.metadata.error}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Status Indicator */}
                      {event.metadata?.status && (
                        <StatusBadge status={event.metadata.status} />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-white/5 text-[10px] text-white/30">
        <span>
          {filteredEvents.length} of {events.length} events
        </span>
        <span className="flex items-center gap-1">
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              isAutoScrollEnabled ? 'bg-leo-accent animate-pulse' : 'bg-white/20'
            )}
          />
          {isAutoScrollEnabled ? 'Live' : 'Paused'}
        </span>
      </div>
    </div>
  );
}

/**
 * Metadata row component
 */
interface MetadataRowProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

function MetadataRow({ label, value, icon }: MetadataRowProps) {
  return (
    <div className="flex items-center gap-2 text-white/40">
      {icon}
      <span>{label}:</span>
      <span className="text-white/60 font-mono">{value}</span>
    </div>
  );
}

/**
 * Status badge component
 */
interface StatusBadgeProps {
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig = {
    pending: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Pending' },
    executing: { color: 'bg-blue-500/20 text-blue-400', label: 'Running' },
    completed: { color: 'bg-green-500/20 text-green-400', label: 'Done' },
    failed: { color: 'bg-red-500/20 text-red-400', label: 'Failed' },
  };

  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium',
        config.color
      )}
    >
      {config.label}
    </span>
  );
}

export default ActivityLog;
