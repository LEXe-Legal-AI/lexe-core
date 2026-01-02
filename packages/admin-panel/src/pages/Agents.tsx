import { useState, useMemo } from 'react';
import {
  Bot,
  Play,
  Square,
  RefreshCw,
  Activity,
  Search,
  Filter,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  MoreVertical,
  TrendingUp,
  Cpu,
  Brain,
  Network,
  Settings,
  Eye,
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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

// Types
interface AgentTask {
  id: string;
  name: string;
  progress: number;
  startedAt: string;
}

interface AgentMetrics {
  tasksCompleted: number;
  avgResponseTime: number;
  successRate: number;
  uptime: number;
}

interface Agent {
  id: string;
  name: string;
  type: 'orchestrator' | 'router' | 'memory' | 'llm' | 'channel' | 'worker';
  status: 'active' | 'idle' | 'error' | 'stopped';
  capabilities: string[];
  currentTask: AgentTask | null;
  metrics: AgentMetrics;
  lastActiveAt: string;
  createdAt: string;
  description: string;
}

// Mock data
const mockAgents: Agent[] = [
  {
    id: 'agent-001',
    name: 'ORCHIDEA Pipeline',
    type: 'orchestrator',
    status: 'active',
    capabilities: ['routing', 'memory', 'llm', 'context-management'],
    currentTask: {
      id: 't1',
      name: 'Processing conversation #1234',
      progress: 65,
      startedAt: new Date(Date.now() - 30000).toISOString(),
    },
    metrics: {
      tasksCompleted: 12847,
      avgResponseTime: 0.82,
      successRate: 99.2,
      uptime: 99.9,
    },
    lastActiveAt: new Date().toISOString(),
    createdAt: '2024-01-01T00:00:00Z',
    description: 'Main orchestration pipeline for conversation flow management',
  },
  {
    id: 'agent-002',
    name: 'L0-L4 Router',
    type: 'router',
    status: 'active',
    capabilities: ['routing', 'classification', 'priority-detection'],
    currentTask: {
      id: 't2',
      name: 'Routing message batch #892',
      progress: 40,
      startedAt: new Date(Date.now() - 15000).toISOString(),
    },
    metrics: {
      tasksCompleted: 45231,
      avgResponseTime: 0.12,
      successRate: 99.8,
      uptime: 99.95,
    },
    lastActiveAt: new Date().toISOString(),
    createdAt: '2024-01-01T00:00:00Z',
    description: 'Intelligent message routing across memory levels L0-L4',
  },
  {
    id: 'agent-003',
    name: 'Memory Manager',
    type: 'memory',
    status: 'idle',
    capabilities: ['vector-search', 'knowledge-graph', 'context-retrieval'],
    currentTask: null,
    metrics: {
      tasksCompleted: 8934,
      avgResponseTime: 0.45,
      successRate: 99.5,
      uptime: 99.8,
    },
    lastActiveAt: new Date(Date.now() - 60000).toISOString(),
    createdAt: '2024-01-01T00:00:00Z',
    description: 'Manages persistent memory and vector store operations',
  },
  {
    id: 'agent-004',
    name: 'LLM Gateway',
    type: 'llm',
    status: 'active',
    capabilities: ['text-generation', 'embeddings', 'classification'],
    currentTask: {
      id: 't3',
      name: 'Generating response for user query',
      progress: 78,
      startedAt: new Date(Date.now() - 5000).toISOString(),
    },
    metrics: {
      tasksCompleted: 23456,
      avgResponseTime: 1.2,
      successRate: 98.9,
      uptime: 99.7,
    },
    lastActiveAt: new Date().toISOString(),
    createdAt: '2024-01-01T00:00:00Z',
    description: 'LiteLLM gateway for multi-provider LLM access',
  },
  {
    id: 'agent-005',
    name: 'WhatsApp Adapter',
    type: 'channel',
    status: 'active',
    capabilities: ['whatsapp', 'media-handling', 'webhook-processing'],
    currentTask: {
      id: 't4',
      name: 'Processing incoming messages',
      progress: 25,
      startedAt: new Date(Date.now() - 2000).toISOString(),
    },
    metrics: {
      tasksCompleted: 34521,
      avgResponseTime: 0.3,
      successRate: 99.6,
      uptime: 99.85,
    },
    lastActiveAt: new Date().toISOString(),
    createdAt: '2024-01-15T00:00:00Z',
    description: 'WhatsApp Business API integration adapter',
  },
  {
    id: 'agent-006',
    name: 'Email Handler',
    type: 'channel',
    status: 'error',
    capabilities: ['email', 'imap', 'smtp', 'attachment-processing'],
    currentTask: null,
    metrics: {
      tasksCompleted: 5678,
      avgResponseTime: 2.1,
      successRate: 97.2,
      uptime: 98.5,
    },
    lastActiveAt: new Date(Date.now() - 300000).toISOString(),
    createdAt: '2024-01-15T00:00:00Z',
    description: 'Email channel adapter with IMAP/SMTP support',
  },
  {
    id: 'agent-007',
    name: 'Zammad Connector',
    type: 'channel',
    status: 'stopped',
    capabilities: ['ticketing', 'zammad-api', 'ticket-sync'],
    currentTask: null,
    metrics: {
      tasksCompleted: 1234,
      avgResponseTime: 0.9,
      successRate: 99.1,
      uptime: 95.0,
    },
    lastActiveAt: new Date(Date.now() - 86400000).toISOString(),
    createdAt: '2024-02-01T00:00:00Z',
    description: 'Zammad helpdesk integration connector',
  },
  {
    id: 'agent-008',
    name: 'Background Worker #1',
    type: 'worker',
    status: 'idle',
    capabilities: ['batch-processing', 'data-sync', 'cleanup'],
    currentTask: null,
    metrics: {
      tasksCompleted: 789,
      avgResponseTime: 5.4,
      successRate: 99.9,
      uptime: 99.5,
    },
    lastActiveAt: new Date(Date.now() - 120000).toISOString(),
    createdAt: '2024-02-15T00:00:00Z',
    description: 'Background task processor for async operations',
  },
];

// Status configuration
const statusConfig = {
  active: {
    label: 'Attivo',
    color: 'bg-green-500',
    textColor: 'text-green-500',
    bgColor: 'bg-green-500/10',
    icon: Activity,
  },
  idle: {
    label: 'Inattivo',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    icon: Clock,
  },
  error: {
    label: 'Errore',
    color: 'bg-red-500',
    textColor: 'text-red-500',
    bgColor: 'bg-red-500/10',
    icon: AlertCircle,
  },
  stopped: {
    label: 'Fermato',
    color: 'bg-gray-500',
    textColor: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    icon: Square,
  },
};

// Type configuration
const typeConfig = {
  orchestrator: { label: 'Orchestrator', icon: Network, color: 'bg-purple-500' },
  router: { label: 'Router', icon: Zap, color: 'bg-blue-500' },
  memory: { label: 'Memory', icon: Brain, color: 'bg-emerald-500' },
  llm: { label: 'LLM', icon: Cpu, color: 'bg-orange-500' },
  channel: { label: 'Channel', icon: Activity, color: 'bg-cyan-500' },
  worker: { label: 'Worker', icon: Settings, color: 'bg-gray-500' },
};

// Progress Bar Component
function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-secondary', className)}>
      <div
        className="h-full bg-primary transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// Agent Card Component
function AgentCard({
  agent,
  onViewDetails,
  onStart,
  onStop,
  onRestart,
}: {
  agent: Agent;
  onViewDetails: () => void;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
}) {
  const status = statusConfig[agent.status];
  const type = typeConfig[agent.type];
  const StatusIcon = status.icon;
  const TypeIcon = type.icon;

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('rounded-lg p-2', type.color, 'text-white')}>
              <TypeIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">{agent.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {type.label}
                </Badge>
                <div className="flex items-center gap-1">
                  <span className={cn('h-2 w-2 rounded-full', status.color)} />
                  <span className={cn('text-xs', status.textColor)}>
                    {status.label}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Task */}
        {agent.currentTask ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate max-w-[200px]">
                {agent.currentTask.name}
              </span>
              <span className="font-medium">{agent.currentTask.progress}%</span>
            </div>
            <ProgressBar value={agent.currentTask.progress} />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Nessun task in esecuzione</span>
          </div>
        )}

        {/* Metrics Summary */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">Tasks:</span>
            <span className="font-medium">{agent.metrics.tasksCompleted.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span className="text-muted-foreground">Success:</span>
            <span className="font-medium">{agent.metrics.successRate}%</span>
          </div>
        </div>

        {/* Capabilities */}
        <div className="flex flex-wrap gap-1">
          {agent.capabilities.slice(0, 3).map((cap) => (
            <Badge key={cap} variant="outline" className="text-xs">
              {cap}
            </Badge>
          ))}
          {agent.capabilities.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{agent.capabilities.length - 3}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          {agent.status === 'stopped' || agent.status === 'error' ? (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onStart}
            >
              <Play className="h-4 w-4 mr-1" />
              Avvia
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onStop}
            >
              <Square className="h-4 w-4 mr-1" />
              Ferma
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onRestart}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="default" size="sm" onClick={onViewDetails}>
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Agent Detail Panel Component
function AgentDetailPanel({
  agent,
  onClose,
}: {
  agent: Agent;
  onClose: () => void;
}) {
  const status = statusConfig[agent.status];
  const type = typeConfig[agent.type];
  const TypeIcon = type.icon;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-background border-l shadow-xl z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('rounded-lg p-2', type.color, 'text-white')}>
            <TypeIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">{agent.name}</h2>
            <p className="text-sm text-muted-foreground">{type.label}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Status Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Stato</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn('flex items-center gap-2 p-3 rounded-lg', status.bgColor)}>
              <span className={cn('h-3 w-3 rounded-full', status.color)} />
              <span className={cn('font-medium', status.textColor)}>
                {status.label}
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {agent.description}
            </p>
          </CardContent>
        </Card>

        {/* Current Task */}
        {agent.currentTask && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Task Corrente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm font-medium">{agent.currentTask.name}</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className="font-medium">{agent.currentTask.progress}%</span>
                </div>
                <ProgressBar value={agent.currentTask.progress} />
              </div>
              <p className="text-xs text-muted-foreground">
                Iniziato: {new Date(agent.currentTask.startedAt).toLocaleTimeString('it-IT')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Metrics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Metriche</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-2xl font-bold">
                  {agent.metrics.tasksCompleted.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Tasks Completati</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">
                  {agent.metrics.avgResponseTime}s
                </p>
                <p className="text-xs text-muted-foreground">Tempo Medio Risposta</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-green-500">
                  {agent.metrics.successRate}%
                </p>
                <p className="text-xs text-muted-foreground">Success Rate</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-blue-500">
                  {agent.metrics.uptime}%
                </p>
                <p className="text-xs text-muted-foreground">Uptime</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Capabilities */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Capabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {agent.capabilities.map((cap) => (
                <Badge key={cap} variant="secondary">
                  {cap}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Informazioni</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID</span>
              <span className="font-mono text-xs">{agent.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Creato</span>
              <span>{new Date(agent.createdAt).toLocaleDateString('it-IT')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ultima Attivita</span>
              <span>{new Date(agent.lastActiveAt).toLocaleString('it-IT')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            Riavvia
          </Button>
          <Button variant="outline" className="flex-1">
            <Settings className="h-4 w-4 mr-2" />
            Configura
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Agents() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agents, setAgents] = useState<Agent[]>(mockAgents);

  // Compute metrics
  const metrics = useMemo(() => {
    return {
      total: agents.length,
      active: agents.filter((a) => a.status === 'active').length,
      idle: agents.filter((a) => a.status === 'idle').length,
      error: agents.filter((a) => a.status === 'error').length,
    };
  }, [agents]);

  // Filter agents
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesSearch =
        searchQuery === '' ||
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.capabilities.some((c) =>
          c.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesStatus =
        statusFilter === 'all' || agent.status === statusFilter;

      const matchesType = typeFilter === 'all' || agent.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [agents, searchQuery, statusFilter, typeFilter]);

  // Action handlers
  const handleStart = (agentId: string) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === agentId ? { ...a, status: 'active' as const } : a
      )
    );
  };

  const handleStop = (agentId: string) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === agentId
          ? { ...a, status: 'stopped' as const, currentTask: null }
          : a
      )
    );
  };

  const handleRestart = (agentId: string) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === agentId ? { ...a, status: 'idle' as const, currentTask: null } : a
      )
    );
    // Simulate restart - set to active after delay
    setTimeout(() => {
      setAgents((prev) =>
        prev.map((a) =>
          a.id === agentId ? { ...a, status: 'active' as const } : a
        )
      );
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agent Management</h1>
        <p className="text-muted-foreground">
          Gestione e monitoraggio degli agenti LEO in tempo reale
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agenti Totali</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.active} attivi in questo momento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attivi</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{metrics.active}</div>
            <p className="text-xs text-muted-foreground">
              {((metrics.active / metrics.total) * 100).toFixed(0)}% del totale
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inattivi</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{metrics.idle}</div>
            <p className="text-xs text-muted-foreground">
              In attesa di task
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errori</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{metrics.error}</div>
            <p className="text-xs text-muted-foreground">
              Richiedono attenzione
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca agenti per nome, tipo o capability..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="active">Attivi</SelectItem>
                  <SelectItem value="idle">Inattivi</SelectItem>
                  <SelectItem value="error">Errore</SelectItem>
                  <SelectItem value="stopped">Fermati</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <Bot className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  <SelectItem value="orchestrator">Orchestrator</SelectItem>
                  <SelectItem value="router">Router</SelectItem>
                  <SelectItem value="memory">Memory</SelectItem>
                  <SelectItem value="llm">LLM</SelectItem>
                  <SelectItem value="channel">Channel</SelectItem>
                  <SelectItem value="worker">Worker</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agents Tabs View */}
      <Tabs defaultValue="grid" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="grid">Griglia</TabsTrigger>
            <TabsTrigger value="list">Lista</TabsTrigger>
          </TabsList>
          <p className="text-sm text-muted-foreground">
            {filteredAgents.length} agenti trovati
          </p>
        </div>

        {/* Grid View */}
        <TabsContent value="grid" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onViewDetails={() => setSelectedAgent(agent)}
                onStart={() => handleStart(agent.id)}
                onStop={() => handleStop(agent.id)}
                onRestart={() => handleRestart(agent.id)}
              />
            ))}
          </div>
          {filteredAgents.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Nessun agente trovato</h3>
                <p className="text-muted-foreground">
                  Prova a modificare i filtri di ricerca
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* List View */}
        <TabsContent value="list" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredAgents.map((agent) => {
                  const status = statusConfig[agent.status];
                  const type = typeConfig[agent.type];
                  const TypeIcon = type.icon;

                  return (
                    <div
                      key={agent.id}
                      className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <div className={cn('rounded-lg p-2', type.color, 'text-white')}>
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{agent.name}</p>
                          <Badge variant="secondary" className="text-xs">
                            {type.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {agent.currentTask?.name || 'Nessun task in esecuzione'}
                        </p>
                      </div>
                      {agent.currentTask && (
                        <div className="w-24 hidden sm:block">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Progresso</span>
                            <span>{agent.currentTask.progress}%</span>
                          </div>
                          <ProgressBar value={agent.currentTask.progress} />
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 rounded-full', status.color)} />
                        <span className={cn('text-sm', status.textColor)}>
                          {status.label}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {agent.status === 'stopped' || agent.status === 'error' ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStart(agent.id);
                            }}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStop(agent.id);
                            }}
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestart(agent.id);
                          }}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {filteredAgents.length === 0 && (
                  <div className="p-12 text-center">
                    <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">Nessun agente trovato</h3>
                    <p className="text-muted-foreground">
                      Prova a modificare i filtri di ricerca
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Panel */}
      {selectedAgent && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelectedAgent(null)}
          />
          {/* Panel */}
          <AgentDetailPanel
            agent={selectedAgent}
            onClose={() => setSelectedAgent(null)}
          />
        </>
      )}
    </div>
  );
}

export default Agents;
