/**
 * LEO Frontend - ORCHIDEA Pipeline Visualization
 *
 * Complete pipeline monitoring page with:
 * - Pipeline status header (health, active runs, latency, error rate)
 * - Visual 7-phase flow diagram with animated connections
 * - Recent pipeline runs table with phase breakdown
 * - Metrics cards and routing level distribution
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  Inbox,
  GitBranch,
  Cpu,
  Database,
  Sparkles,
  ShieldCheck,
  Send,
  Clock,
  Zap,
  AlertTriangle,
  PlayCircle,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Eye,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  MessageSquare,
  Mail,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DataTable, type Column } from '@/components/ui/data-table';
import type {
  PipelinePhase,
  PipelineStatus,
  PipelineRun,
  PipelineMetrics,
  PipelinePhaseMetrics,
} from '@/api/pipeline';

// ============================================================================
// Constants and Configuration
// ============================================================================

// Phase configuration with Italian labels and icons
const PHASE_CONFIG: Record<PipelinePhase, { label: string; icon: typeof Inbox; description: string }> = {
  intake: { label: 'Ricezione', icon: Inbox, description: 'Ricezione e validazione messaggio' },
  routing: { label: 'Instradamento', icon: GitBranch, description: 'Classificazione e routing L0-L4' },
  processing: { label: 'Elaborazione', icon: Cpu, description: 'Elaborazione logica di business' },
  memory: { label: 'Memoria', icon: Database, description: 'Recupero contesto e memoria' },
  generation: { label: 'Generazione', icon: Sparkles, description: 'Generazione risposta AI' },
  validation: { label: 'Validazione', icon: ShieldCheck, description: 'Controllo qualita e compliance' },
  delivery: { label: 'Consegna', icon: Send, description: 'Invio risposta al canale' },
};

const PHASES_ORDER: PipelinePhase[] = [
  'intake',
  'routing',
  'processing',
  'memory',
  'generation',
  'validation',
  'delivery',
];

// Status configuration
const STATUS_CONFIG = {
  healthy: {
    color: 'bg-green-500',
    textColor: 'text-green-500',
    bgLight: 'bg-green-500/10',
    borderColor: 'border-green-500',
    label: 'Operativo',
    icon: CheckCircle2,
  },
  degraded: {
    color: 'bg-yellow-500',
    textColor: 'text-yellow-500',
    bgLight: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500',
    label: 'Degradato',
    icon: AlertTriangle,
  },
  error: {
    color: 'bg-red-500',
    textColor: 'text-red-500',
    bgLight: 'bg-red-500/10',
    borderColor: 'border-red-500',
    label: 'Errore',
    icon: XCircle,
  },
  maintenance: {
    color: 'bg-blue-500',
    textColor: 'text-blue-500',
    bgLight: 'bg-blue-500/10',
    borderColor: 'border-blue-500',
    label: 'Manutenzione',
    icon: RefreshCw,
  },
};

const PHASE_STATUS_CONFIG = {
  active: {
    color: 'bg-green-500',
    borderColor: 'border-green-500',
    textColor: 'text-green-500',
    bgLight: 'bg-green-500/10',
    label: 'Attivo',
    glow: 'shadow-green-500/30',
  },
  idle: {
    color: 'bg-slate-400',
    borderColor: 'border-slate-400',
    textColor: 'text-slate-400',
    bgLight: 'bg-slate-500/10',
    label: 'Inattivo',
    glow: '',
  },
  error: {
    color: 'bg-red-500',
    borderColor: 'border-red-500',
    textColor: 'text-red-500',
    bgLight: 'bg-red-500/10',
    label: 'Errore',
    glow: 'shadow-red-500/30',
  },
};

const RUN_STATUS_CONFIG = {
  running: {
    color: 'bg-blue-500',
    textColor: 'text-blue-500',
    bgLight: 'bg-blue-500/10',
    label: 'In esecuzione',
  },
  completed: {
    color: 'bg-green-500',
    textColor: 'text-green-500',
    bgLight: 'bg-green-500/10',
    label: 'Completato',
  },
  failed: {
    color: 'bg-red-500',
    textColor: 'text-red-500',
    bgLight: 'bg-red-500/10',
    label: 'Fallito',
  },
};

const CHANNEL_CONFIG = {
  whatsapp: { icon: MessageSquare, color: 'text-green-500', label: 'WhatsApp' },
  email: { icon: Mail, color: 'text-blue-500', label: 'Email' },
  web: { icon: Globe, color: 'text-purple-500', label: 'Web' },
};

const ROUTING_LEVEL_CONFIG: Record<string, { color: string; bgColor: string; description: string }> = {
  L0: { color: 'text-green-500', bgColor: 'bg-green-500/10', description: 'Auto-risposta immediata' },
  L1: { color: 'text-blue-500', bgColor: 'bg-blue-500/10', description: 'RAG semplice' },
  L2: { color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', description: 'RAG avanzato + contesto' },
  L3: { color: 'text-orange-500', bgColor: 'bg-orange-500/10', description: 'Agenti specializzati' },
  L4: { color: 'text-red-500', bgColor: 'bg-red-500/10', description: 'Escalation umana' },
};

// ============================================================================
// Mock Data (will be replaced with API calls)
// ============================================================================

const generateMockMetrics = (): PipelineMetrics => ({
  status: 'healthy' as PipelineStatus,
  activeRuns: 5,
  completedToday: 1247,
  failedToday: 23,
  avgLatencyMs: 342,
  throughput: 52,
  phases: PHASES_ORDER.map((phase, i) => ({
    phase,
    status: (i === 2 || i === 4 ? 'active' : i === 5 && Math.random() > 0.7 ? 'error' : 'idle') as 'active' | 'idle' | 'error',
    avgLatencyMs: Math.round(30 + Math.random() * 80),
    throughput: Math.round(40 + Math.random() * 30),
    errorRate: Math.round(Math.random() * 300) / 100,
    lastProcessedAt: new Date(Date.now() - Math.random() * 60000).toISOString(),
  })),
  routingDistribution: {
    L0: 312,
    L1: 456,
    L2: 287,
    L3: 142,
    L4: 50,
  },
});

const generateMockRuns = (): PipelineRun[] => {
  const channels: ('whatsapp' | 'email' | 'web')[] = ['whatsapp', 'email', 'web'];
  const routingLevels: ('L0' | 'L1' | 'L2' | 'L3' | 'L4')[] = ['L0', 'L1', 'L2', 'L3', 'L4'];
  const statuses: ('running' | 'completed' | 'failed')[] = ['running', 'completed', 'completed', 'completed', 'failed'];

  return Array.from({ length: 20 }, (_, i) => {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const startedAt = new Date(Date.now() - Math.random() * 3600000);
    const completedAt = status !== 'running' ? new Date(startedAt.getTime() + Math.random() * 5000 + 200) : undefined;
    const currentPhaseIndex = status === 'running' ? Math.floor(Math.random() * 7) : 6;

    return {
      id: `run-${String(i + 1).padStart(4, '0')}`,
      conversationId: `conv-${Math.floor(10000 + Math.random() * 90000)}`,
      channel: channels[Math.floor(Math.random() * channels.length)],
      status,
      currentPhase: PHASES_ORDER[currentPhaseIndex],
      phases: PHASES_ORDER.map((phase, idx) => {
        let phaseStatus: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
        if (idx < currentPhaseIndex) {
          phaseStatus = 'completed';
        } else if (idx === currentPhaseIndex) {
          phaseStatus = status === 'running' ? 'running' : status === 'failed' ? 'failed' : 'completed';
        } else {
          phaseStatus = status === 'running' ? 'pending' : 'skipped';
        }

        const phaseStarted = idx <= currentPhaseIndex ? new Date(startedAt.getTime() + idx * 50) : undefined;
        const phaseCompleted = idx < currentPhaseIndex || (idx === currentPhaseIndex && status !== 'running')
          ? new Date(startedAt.getTime() + (idx + 1) * 50 + Math.random() * 100)
          : undefined;

        return {
          phase,
          status: phaseStatus,
          startedAt: phaseStarted?.toISOString(),
          completedAt: phaseCompleted?.toISOString(),
          latencyMs: phaseCompleted && phaseStarted ? phaseCompleted.getTime() - phaseStarted.getTime() : undefined,
          error: phaseStatus === 'failed' ? 'Timeout durante la validazione' : undefined,
        };
      }),
      routingLevel: routingLevels[Math.floor(Math.random() * routingLevels.length)],
      startedAt: startedAt.toISOString(),
      completedAt: completedAt?.toISOString(),
      totalLatencyMs: completedAt ? completedAt.getTime() - startedAt.getTime() : undefined,
    };
  });
};

// ============================================================================
// CSS Styles for animations
// ============================================================================

const animationStyles = `
  @keyframes flowParticle {
    0% {
      transform: translateX(-100%);
      opacity: 0;
    }
    10% {
      opacity: 1;
    }
    90% {
      opacity: 1;
    }
    100% {
      transform: translateX(100%);
      opacity: 0;
    }
  }

  @keyframes pulseGlow {
    0%, 100% {
      box-shadow: 0 0 5px currentColor, 0 0 10px currentColor;
    }
    50% {
      box-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor;
    }
  }

  @keyframes dataFlow {
    0% {
      stroke-dashoffset: 20;
    }
    100% {
      stroke-dashoffset: 0;
    }
  }

  .animate-flow-particle {
    animation: flowParticle 2s ease-in-out infinite;
  }

  .animate-pulse-glow {
    animation: pulseGlow 2s ease-in-out infinite;
  }

  .animate-data-flow {
    stroke-dasharray: 5 5;
    animation: dataFlow 1s linear infinite;
  }
`;

// ============================================================================
// Sub-Components
// ============================================================================

interface FlowConnectionProps {
  isActive: boolean;
  hasError: boolean;
}

function FlowConnection({ isActive, hasError }: FlowConnectionProps) {
  return (
    <div className="relative flex items-center justify-center w-12 h-8 flex-shrink-0">
      {/* Base line */}
      <div
        className={cn(
          'absolute w-full h-0.5 rounded-full transition-colors duration-300',
          hasError ? 'bg-red-500/50' : isActive ? 'bg-green-500/50' : 'bg-slate-500/30'
        )}
      />

      {/* Animated particle */}
      {isActive && !hasError && (
        <div className="absolute w-full h-full overflow-hidden">
          <div className="animate-flow-particle w-3 h-3">
            <div className="w-2 h-2 rounded-full bg-green-400 shadow-lg shadow-green-400/50" />
          </div>
        </div>
      )}

      {/* Arrow head */}
      <div
        className={cn(
          'absolute right-0 w-0 h-0 border-t-4 border-b-4 border-l-6 border-t-transparent border-b-transparent transition-colors duration-300',
          hasError ? 'border-l-red-500' : isActive ? 'border-l-green-500' : 'border-l-slate-400'
        )}
        style={{ borderLeftWidth: '6px' }}
      />
    </div>
  );
}

interface PhaseNodeProps {
  phase: PipelinePhase;
  metrics: PipelinePhaseMetrics | undefined;
  isFirst: boolean;
  isLast: boolean;
}

function PhaseNode({ phase, metrics, isFirst, isLast }: PhaseNodeProps) {
  const config = PHASE_CONFIG[phase];
  const status = metrics?.status || 'idle';
  const statusConfig = PHASE_STATUS_CONFIG[status];
  const PhaseIcon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex flex-col items-center p-4 rounded-xl border-2 min-w-[130px] transition-all duration-300 cursor-pointer',
              'hover:scale-105 hover:shadow-lg',
              statusConfig.borderColor,
              statusConfig.bgLight,
              status === 'active' && 'shadow-lg',
              status === 'active' && statusConfig.glow,
              status === 'error' && 'shadow-lg shadow-red-500/20'
            )}
          >
            {/* Icon with status indicator */}
            <div className="relative">
              <div
                className={cn(
                  'p-3 rounded-full mb-2 transition-all duration-300',
                  statusConfig.bgLight,
                  status === 'active' && 'animate-pulse'
                )}
              >
                <PhaseIcon className={cn('h-6 w-6', statusConfig.textColor)} />
              </div>

              {/* Status dot */}
              <div
                className={cn(
                  'absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background',
                  statusConfig.color
                )}
              />
            </div>

            {/* Phase label */}
            <span className="font-medium text-sm text-center">{config.label}</span>

            {/* Status badge */}
            <Badge
              variant="outline"
              className={cn('mt-2 text-xs', statusConfig.textColor)}
            >
              {statusConfig.label}
            </Badge>

            {/* Metrics */}
            <div className="mt-3 text-center space-y-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{metrics?.avgLatencyMs?.toFixed(0) || '--'}ms</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Zap className="h-3 w-3" />
                <span>{metrics?.throughput?.toFixed(0) || '--'}/m</span>
              </div>
              {metrics?.errorRate !== undefined && metrics.errorRate > 0 && (
                <div className={cn(
                  'flex items-center gap-1 text-xs',
                  metrics.errorRate > 1 ? 'text-red-500' : 'text-yellow-500'
                )}>
                  <AlertTriangle className="h-3 w-3" />
                  <span>{metrics.errorRate.toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">{config.label}</p>
            <p className="text-sm text-muted-foreground">{config.description}</p>
            {metrics?.lastProcessedAt && (
              <p className="text-xs text-muted-foreground">
                Ultimo: {new Date(metrics.lastProcessedAt).toLocaleTimeString('it-IT')}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof Activity;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  valueColor?: string;
}

function MetricCard({ title, value, subtitle, icon: Icon, trend, trendValue, valueColor }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn('text-3xl font-bold', valueColor)}>{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            {trend && trendValue && (
              <div className={cn(
                'flex items-center gap-1 text-xs font-medium',
                trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
              )}>
                {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : trend === 'down' ? <TrendingUp className="h-3 w-3 rotate-180" /> : null}
                {trendValue}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface RoutingDistributionProps {
  distribution: Record<string, number>;
}

function RoutingDistribution({ distribution }: RoutingDistributionProps) {
  const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Distribuzione Routing
        </CardTitle>
        <CardDescription>Livelli di routing L0-L4</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(distribution).map(([level, count]) => {
            const config = ROUTING_LEVEL_CONFIG[level];
            const percentage = total > 0 ? (count / total) * 100 : 0;

            return (
              <TooltipProvider key={level}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn('font-mono', config.color, config.bgColor)}>
                            {level}
                          </Badge>
                          <span className="text-muted-foreground">{config.description}</span>
                        </div>
                        <span className="font-medium">{count}</span>
                      </div>
                      <div className="relative h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500', config.bgColor.replace('/10', ''))}
                          style={{ width: `${percentage}%`, backgroundColor: config.color.replace('text-', '').replace('-500', '') }}
                        />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{percentage.toFixed(1)}% del totale</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Totale messaggi</span>
            <span className="font-bold">{total}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface PhaseBreakdownProps {
  phases: PipelineRun['phases'];
}

function PhaseBreakdown({ phases }: PhaseBreakdownProps) {
  return (
    <div className="grid grid-cols-7 gap-2 py-2">
      {phases.map((phase) => {
        const config = PHASE_CONFIG[phase.phase];
        const PhaseIcon = config.icon;

        const statusColors = {
          pending: 'bg-slate-200 text-slate-500',
          running: 'bg-blue-500 text-white animate-pulse',
          completed: 'bg-green-500 text-white',
          failed: 'bg-red-500 text-white',
          skipped: 'bg-slate-100 text-slate-400',
        };

        return (
          <TooltipProvider key={phase.phase}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  'flex flex-col items-center p-2 rounded-lg transition-all',
                  statusColors[phase.status]
                )}>
                  <PhaseIcon className="h-4 w-4" />
                  {phase.latencyMs !== undefined && (
                    <span className="text-[10px] mt-1">{phase.latencyMs}ms</span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-semibold">{config.label}</p>
                  <p className="text-xs capitalize">{phase.status}</p>
                  {phase.latencyMs !== undefined && (
                    <p className="text-xs">Latenza: {phase.latencyMs}ms</p>
                  )}
                  {phase.error && (
                    <p className="text-xs text-red-400">{phase.error}</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Pipeline() {
  const [metrics, setMetrics] = useState<PipelineMetrics>(generateMockMetrics);
  const [runs, setRuns] = useState<PipelineRun[]>(generateMockRuns);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [retryingRunId, setRetryingRunId] = useState<string | null>(null);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        activeRuns: Math.max(0, prev.activeRuns + Math.floor(Math.random() * 3) - 1),
        phases: prev.phases.map((phase) => ({
          ...phase,
          throughput: Math.max(0, phase.throughput + Math.floor(Math.random() * 5) - 2),
          avgLatencyMs: Math.max(10, phase.avgLatencyMs + Math.floor(Math.random() * 10) - 5),
        })),
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setMetrics(generateMockMetrics());
      setRuns(generateMockRuns());
      setIsRefreshing(false);
    }, 1000);
  }, []);

  const handleRetry = useCallback((runId: string) => {
    setRetryingRunId(runId);
    setTimeout(() => {
      setRuns((prev) =>
        prev.map((run) =>
          run.id === runId
            ? { ...run, status: 'running' as const, completedAt: undefined }
            : run
        )
      );
      setRetryingRunId(null);
    }, 1500);
  }, []);

  const toggleRunExpanded = useCallback((runId: string) => {
    setExpandedRunId((prev) => (prev === runId ? null : runId));
  }, []);

  const StatusIcon = STATUS_CONFIG[metrics.status].icon;
  const errorRate = metrics.failedToday > 0 && metrics.completedToday > 0
    ? ((metrics.failedToday / (metrics.completedToday + metrics.failedToday)) * 100).toFixed(2)
    : '0.00';

  // Table columns for recent runs
  const runColumns: Column<PipelineRun>[] = [
    {
      id: 'expand',
      header: '',
      accessor: (row) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            toggleRunExpanded(row.id);
          }}
        >
          {expandedRunId === row.id ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      ),
      className: 'w-10',
    },
    {
      id: 'id',
      header: 'Run ID',
      accessor: 'id',
      sortable: true,
    },
    {
      id: 'channel',
      header: 'Canale',
      accessor: (row) => {
        const channelConfig = CHANNEL_CONFIG[row.channel];
        const ChannelIcon = channelConfig.icon;
        return (
          <div className="flex items-center gap-2">
            <ChannelIcon className={cn('h-4 w-4', channelConfig.color)} />
            <span>{channelConfig.label}</span>
          </div>
        );
      },
    },
    {
      id: 'status',
      header: 'Stato',
      accessor: (row) => {
        const config = RUN_STATUS_CONFIG[row.status];
        return (
          <Badge variant="outline" className={cn(config.textColor, config.bgLight)}>
            {row.status === 'running' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            {config.label}
          </Badge>
        );
      },
      sortable: true,
    },
    {
      id: 'routingLevel',
      header: 'Livello',
      accessor: (row) => {
        const config = ROUTING_LEVEL_CONFIG[row.routingLevel];
        return (
          <Badge variant="outline" className={cn('font-mono', config.color, config.bgColor)}>
            {row.routingLevel}
          </Badge>
        );
      },
      sortable: true,
    },
    {
      id: 'startedAt',
      header: 'Inizio',
      accessor: (row) => new Date(row.startedAt).toLocaleTimeString('it-IT'),
      sortable: true,
    },
    {
      id: 'duration',
      header: 'Durata',
      accessor: (row) => {
        if (row.totalLatencyMs) {
          return `${row.totalLatencyMs}ms`;
        }
        if (row.status === 'running') {
          return (
            <span className="text-blue-500 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              In corso
            </span>
          );
        }
        return '--';
      },
      align: 'right',
    },
    {
      id: 'actions',
      header: '',
      accessor: (row) => (
        row.status === 'failed' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              handleRetry(row.id);
            }}
            disabled={retryingRunId === row.id}
          >
            {retryingRunId === row.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
          </Button>
        )
      ),
      className: 'w-10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Inject animation styles */}
      <style>{animationStyles}</style>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ORCHIDEA Pipeline</h1>
          <p className="text-muted-foreground">
            Visualizzazione e monitoraggio del pipeline di elaborazione a 7 fasi
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isRefreshing}>
          <RefreshCw
            className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')}
          />
          Aggiorna
        </Button>
      </div>

      {/* Pipeline Status Header */}
      <Card className={cn('border-l-4', STATUS_CONFIG[metrics.status].borderColor)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'p-2 rounded-lg',
                  STATUS_CONFIG[metrics.status].bgLight
                )}
              >
                <StatusIcon
                  className={cn('h-6 w-6', STATUS_CONFIG[metrics.status].textColor)}
                />
              </div>
              <div>
                <CardTitle>Stato Pipeline</CardTitle>
                <CardDescription>
                  Sistema{' '}
                  <span
                    className={cn(
                      'font-medium',
                      STATUS_CONFIG[metrics.status].textColor
                    )}
                  >
                    {STATUS_CONFIG[metrics.status].label}
                  </span>
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-2xl font-bold">{metrics.activeRuns}</div>
                <div className="text-xs text-muted-foreground">Esecuzioni attive</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {metrics.completedToday.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Completate oggi</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">
                  {metrics.failedToday}
                </div>
                <div className="text-xs text-muted-foreground">Fallite oggi</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{metrics.avgLatencyMs}ms</div>
                <div className="text-xs text-muted-foreground">Latenza media</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{metrics.throughput}/m</div>
                <div className="text-xs text-muted-foreground">Throughput</div>
              </div>
              <div className="text-center">
                <div className={cn(
                  'text-2xl font-bold',
                  parseFloat(errorRate) > 2 ? 'text-red-500' : parseFloat(errorRate) > 1 ? 'text-yellow-500' : 'text-green-500'
                )}>
                  {errorRate}%
                </div>
                <div className="text-xs text-muted-foreground">Tasso errore</div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Visual Pipeline Flow Diagram */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Flusso Pipeline
          </CardTitle>
          <CardDescription>
            Le 7 fasi del pipeline ORCHIDEA con stato in tempo reale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-4 px-2">
            {PHASES_ORDER.map((phase, index) => {
              const phaseMetrics = metrics.phases.find((m) => m.phase === phase);
              const nextPhaseMetrics = index < PHASES_ORDER.length - 1
                ? metrics.phases.find((m) => m.phase === PHASES_ORDER[index + 1])
                : undefined;
              const isConnectionActive = phaseMetrics?.status === 'active' || nextPhaseMetrics?.status === 'active';
              const hasError = phaseMetrics?.status === 'error';

              return (
                <div key={phase} className="flex items-center">
                  <PhaseNode
                    phase={phase}
                    metrics={phaseMetrics}
                    isFirst={index === 0}
                    isLast={index === PHASES_ORDER.length - 1}
                  />
                  {index < PHASES_ORDER.length - 1 && (
                    <FlowConnection isActive={isConnectionActive} hasError={hasError} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Messaggi Elaborati Oggi"
          value={metrics.completedToday.toLocaleString()}
          subtitle="Completati con successo"
          icon={CheckCircle2}
          trend="up"
          trendValue="+12.5%"
          valueColor="text-green-500"
        />
        <MetricCard
          title="Latenza Media"
          value={`${metrics.avgLatencyMs}ms`}
          subtitle="Tempo medio end-to-end"
          icon={Clock}
          trend="down"
          trendValue="-8%"
        />
        <MetricCard
          title="Throughput"
          value={`${metrics.throughput}/m`}
          subtitle="Messaggi al minuto"
          icon={Zap}
          trend="up"
          trendValue="+5%"
        />
        <MetricCard
          title="Esecuzioni Fallite"
          value={metrics.failedToday}
          subtitle="Da investigare"
          icon={XCircle}
          trend="down"
          trendValue="-15%"
          valueColor={metrics.failedToday > 50 ? 'text-red-500' : 'text-yellow-500'}
        />
      </div>

      {/* Two Column Layout: Recent Runs and Routing Distribution */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Pipeline Runs */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <PlayCircle className="h-5 w-5" />
                    Esecuzioni Recenti
                  </CardTitle>
                  <CardDescription>
                    Ultime esecuzioni del pipeline con dettaglio fasi
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Vedi tutte
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {runs.slice(0, 10).map((run) => {
                  const statusConfig = RUN_STATUS_CONFIG[run.status];
                  const channelConfig = CHANNEL_CONFIG[run.channel];
                  const ChannelIcon = channelConfig.icon;
                  const routingConfig = ROUTING_LEVEL_CONFIG[run.routingLevel];
                  const isExpanded = expandedRunId === run.id;

                  return (
                    <div
                      key={run.id}
                      className={cn(
                        'rounded-lg border transition-all duration-200',
                        isExpanded && 'ring-2 ring-primary/20'
                      )}
                    >
                      <div
                        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleRunExpanded(run.id)}
                      >
                        {/* Expand button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>

                        {/* Run info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-medium">{run.id}</span>
                            <span className="text-muted-foreground">-</span>
                            <span className="text-sm text-muted-foreground">{run.conversationId}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <ChannelIcon className={cn('h-3 w-3', channelConfig.color)} />
                              <span>{channelConfig.label}</span>
                            </div>
                            <span>|</span>
                            <span>{new Date(run.startedAt).toLocaleTimeString('it-IT')}</span>
                          </div>
                        </div>

                        {/* Status and routing */}
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={cn('font-mono text-xs', routingConfig.color, routingConfig.bgColor)}>
                            {run.routingLevel}
                          </Badge>
                          <Badge variant="outline" className={cn(statusConfig.textColor, statusConfig.bgLight)}>
                            {run.status === 'running' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                            {statusConfig.label}
                          </Badge>
                          {run.totalLatencyMs && (
                            <span className="text-sm font-medium">{run.totalLatencyMs}ms</span>
                          )}
                        </div>

                        {/* Retry button for failed runs */}
                        {run.status === 'failed' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRetry(run.id);
                            }}
                            disabled={retryingRunId === run.id}
                          >
                            {retryingRunId === run.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Expanded phase breakdown */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-border bg-muted/30">
                          <div className="pt-3">
                            <p className="text-sm font-medium mb-2">Dettaglio Fasi</p>
                            <PhaseBreakdown phases={run.phases} />
                            {run.phases.some((p) => p.error) && (
                              <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                <p className="text-sm text-red-500 font-medium">Errore:</p>
                                <p className="text-sm text-red-400">
                                  {run.phases.find((p) => p.error)?.error}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Routing Distribution and Phase Metrics */}
        <div className="space-y-6">
          <RoutingDistribution distribution={metrics.routingDistribution} />

          {/* Phase latency summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Latenza per Fase
              </CardTitle>
              <CardDescription>Tempo medio di elaborazione</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.phases.map((phase) => {
                  const config = PHASE_CONFIG[phase.phase];
                  const statusConfig = PHASE_STATUS_CONFIG[phase.status];
                  const maxLatency = Math.max(...metrics.phases.map((p) => p.avgLatencyMs));
                  const percentage = (phase.avgLatencyMs / maxLatency) * 100;

                  return (
                    <div key={phase.phase} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2 h-2 rounded-full', statusConfig.color)} />
                          <span>{config.label}</span>
                        </div>
                        <span className="font-mono font-medium">{phase.avgLatencyMs}ms</span>
                      </div>
                      <div className="relative h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500', statusConfig.color)}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Pipeline;
