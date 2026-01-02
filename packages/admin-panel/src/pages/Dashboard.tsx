/**
 * LEO Frontend - Dashboard Page
 * Main dashboard with real-time metrics and system status
 *
 * Features:
 * - Real API integration via TanStack Query
 * - Auto-refresh every 30 seconds
 * - Loading states with skeleton placeholders
 * - Error handling with toast notifications
 * - Responsive layout (mobile-first)
 */

import { useCallback } from 'react';
import {
  MessageSquare,
  Clock,
  Plus,
  Send,
  FileText,
  Bot,
  GitBranch,
  Brain,
  RefreshCw,
  Wifi,
  WifiOff,
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  StatCard,
  SystemStatusCard,
  AgentStatusDetails,
  PipelineStatusDetails,
  MemoryStatusDetails,
} from '@/components/dashboard';
import { useDashboardData } from '@/hooks/queries';
import { useWebSocketStatus } from '@/hooks/useWebSocket';

// ============================================================================
// Types
// ============================================================================

interface ConversationStatus {
  active: 'Attiva';
  pending: 'In attesa';
  resolved: 'Risolta';
}

// ============================================================================
// Mock Data (to be replaced with real API calls in future)
// ============================================================================

// Mock data for recent conversations (will be API-driven later)
const recentConversations = [
  {
    id: '1',
    contact: {
      name: 'Marco Rossi',
      avatar: '',
      initials: 'MR',
    },
    lastMessage: "Grazie per l'assistenza, funziona perfettamente ora!",
    timestamp: '2 min fa',
    status: 'resolved' as const,
  },
  {
    id: '2',
    contact: {
      name: 'Laura Bianchi',
      avatar: '',
      initials: 'LB',
    },
    lastMessage: 'Vorrei informazioni sui vostri servizi...',
    timestamp: '15 min fa',
    status: 'active' as const,
  },
  {
    id: '3',
    contact: {
      name: 'Giuseppe Verdi',
      avatar: '',
      initials: 'GV',
    },
    lastMessage: 'Quando sara disponibile la nuova funzionalita?',
    timestamp: '1 ora fa',
    status: 'pending' as const,
  },
  {
    id: '4',
    contact: {
      name: 'Anna Ferrari',
      avatar: '',
      initials: 'AF',
    },
    lastMessage: 'Ho bisogno di supporto urgente per...',
    timestamp: '2 ore fa',
    status: 'active' as const,
  },
  {
    id: '5',
    contact: {
      name: 'Paolo Conti',
      avatar: '',
      initials: 'PC',
    },
    lastMessage: 'Perfetto, grazie mille!',
    timestamp: '3 ore fa',
    status: 'resolved' as const,
  },
];

// Quick actions configuration
const quickActions = [
  {
    title: 'Nuova Conversazione',
    description: 'Avvia una chat con un contatto',
    icon: Plus,
    variant: 'default' as const,
  },
  {
    title: 'Invia Broadcast',
    description: 'Invia messaggio a piu contatti',
    icon: Send,
    variant: 'secondary' as const,
  },
  {
    title: 'Genera Report',
    description: 'Esporta statistiche e analisi',
    icon: FileText,
    variant: 'outline' as const,
  },
];

const statusColors = {
  active: 'bg-green-500',
  pending: 'bg-yellow-500',
  resolved: 'bg-blue-500',
};

const statusLabels: ConversationStatus = {
  active: 'Attiva',
  pending: 'In attesa',
  resolved: 'Risolta',
};

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Last updated timestamp display
 */
function LastUpdated({ date }: { date: Date | null }) {
  if (!date) return null;

  const timeString = date.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <span className="text-xs text-muted-foreground">
      Ultimo aggiornamento: {timeString}
    </span>
  );
}

/**
 * WebSocket connection status indicator
 */
function ConnectionStatus() {
  const { connectionState } = useWebSocketStatus();

  const statusConfig = {
    connected: {
      icon: Wifi,
      color: 'text-green-500',
      label: 'Connesso',
      description: 'Connessione real-time attiva',
    },
    connecting: {
      icon: Wifi,
      color: 'text-yellow-500 animate-pulse',
      label: 'Connessione...',
      description: 'Connessione in corso',
    },
    reconnecting: {
      icon: Wifi,
      color: 'text-yellow-500 animate-pulse',
      label: 'Riconnessione...',
      description: 'Tentativo di riconnessione in corso',
    },
    disconnected: {
      icon: WifiOff,
      color: 'text-red-500',
      label: 'Disconnesso',
      description: 'Connessione real-time non attiva',
    },
  };

  const config = statusConfig[connectionState] || statusConfig.disconnected;
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5">
            <Icon className={cn('h-4 w-4', config.color)} />
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {config.label}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Skeleton for stats section
 */
function StatsSkeletonRow() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCard
          key={i}
          title=""
          value=""
          icon={MessageSquare}
          isLoading
        />
      ))}
    </div>
  );
}

/**
 * Skeleton for system status section
 */
function SystemStatusSkeletonRow() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <SystemStatusCard
          key={i}
          title=""
          to="#"
          icon={Bot}
          value=""
          isLoading
        />
      ))}
    </div>
  );
}

// ============================================================================
// Main Dashboard Component
// ============================================================================

export function Dashboard() {
  const { data, isLoading, isError, refetch, lastUpdated } = useDashboardData();

  // Manual refresh handler
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Derive stats from API data with fallback to zeros
  const agentMetrics = data.agents;
  const pipelineMetrics = data.pipeline;
  const memoryMetrics = data.memory;

  // Stats cards configuration using real data
  const stats = [
    {
      title: 'Agenti Attivi',
      value: agentMetrics?.activeAgents ?? 0,
      total: agentMetrics?.totalAgents ?? 0,
      change: agentMetrics ? `${agentMetrics.activeAgents}/${agentMetrics.totalAgents}` : undefined,
      trend: 'neutral' as const,
      icon: Bot,
    },
    {
      title: 'Task Completati Oggi',
      value: agentMetrics?.totalTasksToday ?? 0,
      change: agentMetrics?.successRate
        ? `${agentMetrics.successRate.toFixed(1)}% successo`
        : undefined,
      trend: (agentMetrics?.successRate ?? 0) >= 90 ? ('up' as const) : ('down' as const),
      icon: MessageSquare,
    },
    {
      title: 'Tempo Risposta Medio',
      value: agentMetrics?.avgResponseTime
        ? `${agentMetrics.avgResponseTime.toFixed(0)}ms`
        : '---',
      change: undefined,
      trend: 'neutral' as const,
      icon: Clock,
    },
    {
      title: 'Throughput Pipeline',
      value: pipelineMetrics?.throughput
        ? `${pipelineMetrics.throughput}/min`
        : '---',
      change: pipelineMetrics?.avgLatencyMs
        ? `${pipelineMetrics.avgLatencyMs}ms latenza`
        : undefined,
      trend: 'neutral' as const,
      icon: GitBranch,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Panoramica delle attivita e statistiche in tempo reale
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ConnectionStatus />
          <LastUpdated date={lastUpdated} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            <span className="hidden sm:inline">Aggiorna</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {isLoading && !data.agents ? (
        <StatsSkeletonRow />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              change={stat.change}
              trend={stat.trend}
              changeDescription=""
            />
          ))}
        </div>
      )}

      {/* System Status Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Stato Sistema</h2>
        {isLoading && !data.agents && !data.pipeline && !data.memory ? (
          <SystemStatusSkeletonRow />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {/* Agents Status Card */}
            <SystemStatusCard
              title="Agenti"
              to="/agents"
              icon={Bot}
              value={`${agentMetrics?.activeAgents ?? 0}/${agentMetrics?.totalAgents ?? 0}`}
              isLoading={!data.agents && isLoading}
              details={
                agentMetrics && (
                  <AgentStatusDetails
                    active={agentMetrics.activeAgents}
                    idle={agentMetrics.idleAgents}
                    error={agentMetrics.errorAgents}
                  />
                )
              }
            />

            {/* Pipeline Status Card */}
            <SystemStatusCard
              title="Pipeline ORCHIDEA"
              to="/pipeline"
              icon={GitBranch}
              value={pipelineMetrics?.status ?? 'offline'}
              status={pipelineMetrics?.status ?? 'offline'}
              isLoading={!data.pipeline && isLoading}
              details={
                pipelineMetrics && (
                  <PipelineStatusDetails
                    activeRuns={pipelineMetrics.activeRuns}
                    avgLatency={pipelineMetrics.avgLatencyMs}
                  />
                )
              }
            />

            {/* Memory Status Card */}
            <SystemStatusCard
              title="Memory System"
              to="/memory"
              icon={Brain}
              value={memoryMetrics?.totalEntries?.toLocaleString() ?? '---'}
              isLoading={!data.memory && isLoading}
              details={
                memoryMetrics && (
                  <MemoryStatusDetails
                    totalEntries={memoryMetrics.totalEntries}
                    cacheHitRate={memoryMetrics.cacheHitRate}
                  />
                )
              }
            />
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Conversations */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Conversazioni Recenti</CardTitle>
            <CardDescription>
              Le ultime conversazioni gestite da LEO
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50 cursor-pointer"
                >
                  <Avatar>
                    <AvatarImage src={conversation.contact.avatar} />
                    <AvatarFallback>
                      {conversation.contact.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">
                        {conversation.contact.name}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {conversation.timestamp}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.lastMessage}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        statusColors[conversation.status]
                      )}
                    />
                    <span className="text-xs text-muted-foreground">
                      {statusLabels[conversation.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4">
              Vedi tutte le conversazioni
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Azioni Rapide</CardTitle>
            <CardDescription>
              Operazioni comuni a portata di click
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => (
              <Button
                key={action.title}
                variant={action.variant}
                className="w-full justify-start gap-3 h-auto py-3"
              >
                <action.icon className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">{action.title}</div>
                  <div className="text-xs opacity-70">{action.description}</div>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Error State Banner (shown when all queries fail) */}
      {isError && !data.agents && !data.pipeline && !data.memory && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-medium text-destructive">
                Errore di connessione ai servizi. I dati potrebbero non essere aggiornati.
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Riprova
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default Dashboard;
