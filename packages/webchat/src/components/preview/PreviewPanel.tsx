import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image,
  Activity,
  Brain,
  GitBranch,
  Wrench,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/effects';

/**
 * Tab configuration for PreviewPanel
 */
export interface PreviewTab {
  id: string;
  label: string;
  icon: ReactNode;
  content: ReactNode;
  badge?: number;
}

export interface PreviewPanelProps {
  /** Custom tabs (overrides default) */
  tabs?: PreviewTab[];
  /** Default active tab ID */
  defaultTab?: string;
  /** Callback when panel is closed */
  onClose?: () => void;
  /** Whether panel is expanded */
  isExpanded?: boolean;
  /** Callback when expand/collapse is toggled */
  onToggleExpand?: () => void;
  /** Additional class names */
  className?: string;
  /** Children components for tabs */
  screenshotViewer?: ReactNode;
  activityLog?: ReactNode;
  memoryViewer?: ReactNode;
  memoryGraph?: ReactNode;
  toolExecution?: ReactNode;
  /** Number of tool executions for badge */
  toolCount?: number;
  /** Whether tools are currently loading */
  isLoading?: boolean;
}

const tabVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const panelVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: 0.2 },
  },
};

/**
 * PreviewPanel - Container principale con tabs per viewer
 *
 * Features:
 * - Tabs per Screenshot, Activity, Memory, Graph, Tools
 * - Glassmorphism design
 * - Framer Motion animations
 * - Expand/collapse functionality
 *
 * @example
 * ```tsx
 * <PreviewPanel
 *   screenshotViewer={<ScreenshotViewer images={images} />}
 *   activityLog={<ActivityLog events={events} />}
 *   memoryViewer={<MemoryViewer memory={memory} />}
 *   memoryGraph={<MemoryGraph nodes={nodes} edges={edges} />}
 *   toolExecution={<ToolExecutionCard tool={currentTool} />}
 * />
 * ```
 */
export function PreviewPanel({
  tabs: customTabs,
  defaultTab = 'tools',
  onClose,
  isExpanded = false,
  onToggleExpand,
  className,
  screenshotViewer,
  activityLog,
  memoryViewer,
  memoryGraph,
  toolExecution,
  toolCount = 0,
  isLoading = false,
}: PreviewPanelProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const defaultTabs: PreviewTab[] = [
    {
      id: 'tools',
      label: 'Tools',
      icon: <Wrench className="w-4 h-4" />,
      badge: toolCount,
      content: isLoading ? (
        <ToolsLoadingSkeleton />
      ) : toolExecution ? (
        toolExecution
      ) : (
        <EmptyToolsContent />
      ),
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: <Activity className="w-4 h-4" />,
      content: activityLog || (
        <EmptyTabContent message="No activity to display" icon={<Activity className="w-8 h-8" />} />
      ),
    },
    {
      id: 'memory',
      label: 'Memory',
      icon: <Brain className="w-4 h-4" />,
      content: memoryViewer || (
        <EmptyTabContent message="Memory viewer not loaded" icon={<Brain className="w-8 h-8" />} />
      ),
    },
    {
      id: 'graph',
      label: 'Graph',
      icon: <GitBranch className="w-4 h-4" />,
      content: memoryGraph || (
        <EmptyTabContent message="Memory graph not available" icon={<GitBranch className="w-8 h-8" />} />
      ),
    },
    {
      id: 'screenshot',
      label: 'Screenshot',
      icon: <Image className="w-4 h-4" />,
      content: screenshotViewer || (
        <EmptyTabContent message="No screenshots available" icon={<Image className="w-8 h-8" />} />
      ),
    },
  ];

  const tabs = customTabs || defaultTabs;
  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <motion.div
      variants={panelVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(
        'flex flex-col h-full',
        isExpanded ? 'w-full' : 'w-[400px]',
        className
      )}
    >
      <GlassCard
        variant="frosted"
        padding="none"
        rounded="xl"
        className="flex flex-col h-full overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-heading text-sm font-semibold text-foreground">
            Preview Panel
          </h2>
          <div className="flex items-center gap-1">
            {onToggleExpand && (
              <button
                onClick={onToggleExpand}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  'hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  'hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
                title="Close panel"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-2 py-2 border-b border-border/50 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg',
                'text-xs font-medium transition-all duration-200',
                'whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-leo-secondary/20 text-leo-secondary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                    activeTab === tab.id
                      ? 'bg-leo-secondary text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={tabVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="h-full overflow-auto"
            >
              {currentTab.content}
            </motion.div>
          </AnimatePresence>
        </div>
      </GlassCard>
    </motion.div>
  );
}

/**
 * Empty state component for tabs without content
 */
function EmptyTabContent({ message, icon }: { message: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center text-muted-foreground/40">
        {icon || <Activity className="w-8 h-8" />}
      </div>
      <p className="text-sm text-muted-foreground font-body">{message}</p>
    </div>
  );
}

/**
 * Empty state for Tools tab with helpful messaging
 */
function EmptyToolsContent() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-20 h-20 mb-4 rounded-2xl bg-gradient-to-br from-leo-accent/20 to-leo-secondary/20 flex items-center justify-center"
      >
        <Wrench className="w-10 h-10 text-leo-accent/60" />
      </motion.div>
      <h3 className="text-sm font-heading font-semibold text-foreground mb-1">
        No Tool Executions
      </h3>
      <p className="text-xs text-muted-foreground font-body max-w-[200px]">
        Tool calls will appear here when LEO uses external tools to help answer your questions.
      </p>
    </div>
  );
}

/**
 * Skeleton loader for Tools tab
 */
function ToolsLoadingSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="rounded-xl bg-muted/50 border border-border/50 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
              <div className="h-3 bg-muted/70 rounded w-2/3 animate-pulse" />
            </div>
            <div className="w-16 h-5 bg-muted rounded-full animate-pulse" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default PreviewPanel;
