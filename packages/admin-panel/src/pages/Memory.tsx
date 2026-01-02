/**
 * LEO Frontend - Memory System Page
 * Comprehensive visualization of the L0-L4 memory hierarchy
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Brain,
  Database,
  Search,
  Layers,
  Clock,
  HardDrive,
  Network,
  Archive,
  Zap,
  TrendingUp,
  Activity,
  RefreshCw,
  Eye,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Download,
  Trash2,
  GitMerge,
  Scissors,
  Filter,
  Calendar,
  Tag,
  Link2,
  BarChart3,
  Loader2,
  X,
  ExternalLink,
  AlertTriangle,
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
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import type {
  MemoryLevel,
  MemoryEntry,
  MemoryStats,
  MemoryLevelStats,
  MemoryStatus,
  MemoryEntryType,
  KnowledgeGraphData,
} from '@/api/memory';

// ============================================================================
// Configuration
// ============================================================================

interface MemoryLevelConfig {
  level: MemoryLevel;
  name: string;
  nameEn: string;
  description: string;
  retention: string;
  icon: typeof Zap;
  color: string;
  bgLight: string;
  borderColor: string;
  textColor: string;
}

const memoryLevelsConfig: MemoryLevelConfig[] = [
  {
    level: 'L0',
    name: 'Memoria di Lavoro',
    nameEn: 'Working Memory',
    description: 'Contesto conversazione attuale (volatile)',
    retention: 'Sessione',
    icon: Zap,
    color: 'bg-blue-500',
    bgLight: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-500',
  },
  {
    level: 'L1',
    name: 'Memoria a Breve Termine',
    nameEn: 'Short-term Memory',
    description: 'Ultime 24 ore (session-based)',
    retention: '24 ore',
    icon: Clock,
    color: 'bg-green-500',
    bgLight: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    textColor: 'text-green-500',
  },
  {
    level: 'L2',
    name: 'Memoria Episodica',
    nameEn: 'Episodic Memory',
    description: 'Eventi significativi (giorni-settimane)',
    retention: '30 giorni',
    icon: Layers,
    color: 'bg-yellow-500',
    bgLight: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    textColor: 'text-yellow-500',
  },
  {
    level: 'L3',
    name: 'Memoria Semantica',
    nameEn: 'Semantic Memory',
    description: 'Knowledge Graph (concetti permanenti)',
    retention: 'Permanente',
    icon: Network,
    color: 'bg-purple-500',
    bgLight: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-500',
  },
  {
    level: 'L4',
    name: 'Memoria a Lungo Termine',
    nameEn: 'Long-term Memory',
    description: 'Fatti persistenti (archivio)',
    retention: 'Archivio',
    icon: Archive,
    color: 'bg-red-500',
    bgLight: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    textColor: 'text-red-500',
  },
];

// ============================================================================
// Mock Data
// ============================================================================

const mockStats: MemoryStats = {
  totalEntries: 45678,
  totalSizeBytes: 1024 * 1024 * 256,
  recentQueries: 234,
  cacheHitRate: 94.5,
  vectorDbStatus: 'healthy',
  lastConsolidation: '2025-12-28T14:30:00Z',
  lastPrune: '2025-12-27T02:00:00Z',
  levels: [
    {
      level: 'L0',
      name: 'Memoria di Lavoro',
      nameEn: 'Working Memory',
      description: 'Contesto conversazione attuale',
      totalEntries: 128,
      sizeBytes: 1024 * 512,
      avgAccessTime: 0.5,
      hitRate: 99.2,
      status: 'healthy',
      retention: 'Sessione',
      usageHistory: [
        { timestamp: '2025-12-29T00:00:00Z', entries: 98, size: 400000 },
        { timestamp: '2025-12-29T04:00:00Z', entries: 112, size: 450000 },
        { timestamp: '2025-12-29T08:00:00Z', entries: 105, size: 420000 },
        { timestamp: '2025-12-29T12:00:00Z', entries: 128, size: 512000 },
      ],
    },
    {
      level: 'L1',
      name: 'Memoria a Breve Termine',
      nameEn: 'Short-term Memory',
      description: 'Conversazioni recenti (ultime 24h)',
      totalEntries: 2456,
      sizeBytes: 1024 * 1024 * 8,
      avgAccessTime: 2.3,
      hitRate: 94.5,
      status: 'healthy',
      retention: '24 ore',
      usageHistory: [
        { timestamp: '2025-12-29T00:00:00Z', entries: 2100, size: 7000000 },
        { timestamp: '2025-12-29T04:00:00Z', entries: 2200, size: 7300000 },
        { timestamp: '2025-12-29T08:00:00Z', entries: 2350, size: 7800000 },
        { timestamp: '2025-12-29T12:00:00Z', entries: 2456, size: 8388608 },
      ],
    },
    {
      level: 'L2',
      name: 'Memoria Episodica',
      nameEn: 'Episodic Memory',
      description: 'Eventi e interazioni significative',
      totalEntries: 8934,
      sizeBytes: 1024 * 1024 * 32,
      avgAccessTime: 5.1,
      hitRate: 87.3,
      status: 'healthy',
      retention: '30 giorni',
      usageHistory: [
        { timestamp: '2025-12-29T00:00:00Z', entries: 8500, size: 30000000 },
        { timestamp: '2025-12-29T04:00:00Z', entries: 8650, size: 31000000 },
        { timestamp: '2025-12-29T08:00:00Z', entries: 8800, size: 32000000 },
        { timestamp: '2025-12-29T12:00:00Z', entries: 8934, size: 33554432 },
      ],
    },
    {
      level: 'L3',
      name: 'Memoria Semantica',
      nameEn: 'Semantic Memory',
      description: 'Knowledge Graph e relazioni',
      totalEntries: 15678,
      sizeBytes: 1024 * 1024 * 64,
      avgAccessTime: 12.4,
      hitRate: 82.1,
      status: 'warning',
      retention: 'Permanente',
      usageHistory: [
        { timestamp: '2025-12-29T00:00:00Z', entries: 15200, size: 62000000 },
        { timestamp: '2025-12-29T04:00:00Z', entries: 15350, size: 63000000 },
        { timestamp: '2025-12-29T08:00:00Z', entries: 15500, size: 65000000 },
        { timestamp: '2025-12-29T12:00:00Z', entries: 15678, size: 67108864 },
      ],
    },
    {
      level: 'L4',
      name: 'Memoria a Lungo Termine',
      nameEn: 'Long-term Memory',
      description: 'Fatti persistenti e conoscenza consolidata',
      totalEntries: 18482,
      sizeBytes: 1024 * 1024 * 152,
      avgAccessTime: 25.8,
      hitRate: 78.6,
      status: 'healthy',
      retention: 'Archivio',
      usageHistory: [
        { timestamp: '2025-12-29T00:00:00Z', entries: 18200, size: 150000000 },
        { timestamp: '2025-12-29T04:00:00Z', entries: 18300, size: 152000000 },
        { timestamp: '2025-12-29T08:00:00Z', entries: 18400, size: 155000000 },
        { timestamp: '2025-12-29T12:00:00Z', entries: 18482, size: 159383552 },
      ],
    },
  ],
};

const mockEntries: MemoryEntry[] = [
  {
    id: '1',
    level: 'L0',
    type: 'context',
    content: 'Conversazione attiva con Marco Rossi su supporto tecnico per prodotto XYZ-500. Cliente sta riscontrando problemi con la configurazione iniziale.',
    source: 'WhatsApp',
    accessCount: 15,
    tags: ['supporto', 'configurazione', 'urgente'],
    createdAt: '2025-12-29T14:45:00Z',
    updatedAt: '2025-12-29T14:47:00Z',
  },
  {
    id: '2',
    level: 'L1',
    type: 'message',
    content: 'Richiesta informazioni prodotto ABC-123 da Laura Bianchi. Interessata a bulk pricing per ordini superiori a 100 unita.',
    source: 'Email',
    accessCount: 8,
    tags: ['vendite', 'pricing', 'bulk'],
    createdAt: '2025-12-29T14:30:00Z',
    updatedAt: '2025-12-29T14:32:00Z',
  },
  {
    id: '3',
    level: 'L2',
    type: 'event',
    content: 'Risoluzione problema fatturazione per Cliente Premium "Acme Corp". Emesso rimborso di 450 EUR e applicato sconto 15% su prossimo ordine.',
    source: 'Zammad',
    accessCount: 5,
    tags: ['fatturazione', 'rimborso', 'premium'],
    createdAt: '2025-12-29T12:00:00Z',
    updatedAt: '2025-12-29T12:15:00Z',
  },
  {
    id: '4',
    level: 'L3',
    type: 'relation',
    content: 'Relazione: Cliente "TechStart SRL" -> Prodotto "Enterprise Suite" -> Pattern: Acquisto frequente ogni Q1, upgrade annuale, contratto enterprise.',
    source: 'Knowledge Graph',
    accessCount: 23,
    tags: ['pattern', 'enterprise', 'upsell'],
    relatedEntries: ['kg-node-42', 'kg-node-87', 'kg-node-103'],
    createdAt: '2025-12-28T10:00:00Z',
    updatedAt: '2025-12-29T08:00:00Z',
  },
  {
    id: '5',
    level: 'L4',
    type: 'fact',
    content: 'Policy aziendale: Rimborso entro 30 giorni per tutti i prodotti. Rimborso esteso a 60 giorni per clienti Premium. Nessun rimborso per software personalizzato.',
    source: 'Documenti',
    accessCount: 156,
    tags: ['policy', 'rimborso', 'regolamento'],
    createdAt: '2025-06-15T09:00:00Z',
    updatedAt: '2025-12-01T11:00:00Z',
  },
  {
    id: '6',
    level: 'L0',
    type: 'context',
    content: 'Sessione demo in corso con prospect "Global Industries". Mostrando funzionalita di integrazione API e dashboard analytics.',
    source: 'Web',
    accessCount: 3,
    tags: ['demo', 'prospect', 'api'],
    createdAt: '2025-12-29T14:50:00Z',
    updatedAt: '2025-12-29T14:50:00Z',
  },
  {
    id: '7',
    level: 'L1',
    type: 'message',
    content: 'Feedback positivo da cliente "DataFlow Inc" sulla nuova interfaccia utente. Richiesta feature per export CSV personalizzato.',
    source: 'Email',
    accessCount: 4,
    tags: ['feedback', 'feature-request', 'ui'],
    createdAt: '2025-12-29T13:15:00Z',
    updatedAt: '2025-12-29T13:20:00Z',
  },
  {
    id: '8',
    level: 'L2',
    type: 'event',
    content: 'Onboarding completato per nuovo cliente enterprise "MegaCorp SpA". Setup ambiente production, training team (12 utenti), integrazione SSO completata.',
    source: 'CRM',
    accessCount: 12,
    tags: ['onboarding', 'enterprise', 'sso'],
    createdAt: '2025-12-28T16:00:00Z',
    updatedAt: '2025-12-28T18:30:00Z',
  },
];

const mockKnowledgeGraph: KnowledgeGraphData = {
  nodes: [
    { id: 'n1', label: 'TechStart SRL', type: 'entity' },
    { id: 'n2', label: 'Enterprise Suite', type: 'concept' },
    { id: 'n3', label: 'Acquisto Q1', type: 'relation' },
    { id: 'n4', label: 'Acme Corp', type: 'entity' },
    { id: 'n5', label: 'Premium Support', type: 'concept' },
    { id: 'n6', label: 'DataFlow Inc', type: 'entity' },
    { id: 'n7', label: 'API Integration', type: 'concept' },
    { id: 'n8', label: 'MegaCorp SpA', type: 'entity' },
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2', label: 'utilizza' },
    { id: 'e2', source: 'n1', target: 'n3', label: 'pattern' },
    { id: 'e3', source: 'n4', target: 'n5', label: 'sottoscrive' },
    { id: 'e4', source: 'n6', target: 'n7', label: 'richiede' },
    { id: 'e5', source: 'n8', target: 'n2', label: 'utilizza' },
    { id: 'e6', source: 'n8', target: 'n5', label: 'sottoscrive' },
  ],
  stats: {
    totalNodes: 156,
    totalEdges: 423,
    topEntities: [
      { name: 'Enterprise Suite', connections: 45 },
      { name: 'Premium Support', connections: 38 },
      { name: 'API Integration', connections: 32 },
      { name: 'TechStart SRL', connections: 28 },
      { name: 'Analytics Dashboard', connections: 25 },
    ],
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatNumber(num: number): string {
  return num.toLocaleString('it-IT');
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Adesso';
  if (diffMins < 60) return `${diffMins} min fa`;
  if (diffHours < 24) return `${diffHours} ore fa`;
  if (diffDays < 7) return `${diffDays} giorni fa`;
  return formatDate(dateStr);
}

function getStatusIcon(status: MemoryStatus) {
  switch (status) {
    case 'healthy':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case 'degraded':
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />;
  }
}

function getStatusBadgeVariant(status: MemoryStatus) {
  switch (status) {
    case 'healthy':
      return 'bg-green-500';
    case 'warning':
      return 'bg-yellow-500';
    case 'degraded':
      return 'bg-orange-500';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-muted';
  }
}

// ============================================================================
// Components
// ============================================================================

/**
 * Mini sparkline chart for usage history
 */
function MiniChart({ data }: { data: { entries: number }[] }) {
  const max = Math.max(...data.map((d) => d.entries));
  const min = Math.min(...data.map((d) => d.entries));
  const range = max - min || 1;

  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((point, i) => {
        const height = ((point.entries - min) / range) * 100;
        return (
          <div
            key={i}
            className="flex-1 bg-primary/60 rounded-t-sm transition-all hover:bg-primary"
            style={{ height: `${Math.max(height, 10)}%` }}
            title={`${formatNumber(point.entries)} entries`}
          />
        );
      })}
    </div>
  );
}

/**
 * Overview statistics cards
 */
function OverviewStats({ stats }: { stats: MemoryStats }) {
  const overviewItems = [
    {
      title: 'Entries Totali',
      value: formatNumber(stats.totalEntries),
      icon: Database,
      description: 'In tutti i livelli',
    },
    {
      title: 'Dimensione Totale',
      value: formatBytes(stats.totalSizeBytes),
      icon: HardDrive,
      description: 'Storage utilizzato',
    },
    {
      title: 'Cache Hit Rate',
      value: `${stats.cacheHitRate.toFixed(1)}%`,
      icon: TrendingUp,
      description: 'Performance cache',
    },
    {
      title: 'Vector DB',
      value: stats.vectorDbStatus === 'healthy' ? 'Online' : 'Warning',
      icon: Database,
      description: 'Stato database vettoriale',
      status: stats.vectorDbStatus,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {overviewItems.map((item) => (
        <Card key={item.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            <item.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{item.value}</span>
              {item.status && getStatusIcon(item.status)}
            </div>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Memory level card with mini chart
 */
function MemoryLevelCard({
  config,
  stats,
  isSelected,
  onClick,
}: {
  config: MemoryLevelConfig;
  stats?: MemoryLevelStats;
  isSelected: boolean;
  onClick: () => void;
}) {
  const Icon = config.icon;

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg',
                config.color
              )}
            >
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <span className={config.textColor}>{config.level}</span>
                {config.name}
              </CardTitle>
              <CardDescription className="text-xs">
                {config.retention}
              </CardDescription>
            </div>
          </div>
          {stats && getStatusIcon(stats.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Entries</span>
            <span className="font-medium">
              {stats ? formatNumber(stats.totalEntries) : '-'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Dimensione</span>
            <span className="font-medium">
              {stats ? formatBytes(stats.sizeBytes) : '-'}
            </span>
          </div>
          {stats && stats.usageHistory.length > 0 && (
            <div className="pt-2">
              <MiniChart data={stats.usageHistory} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Knowledge Graph mini visualization
 */
function KnowledgeGraphMini({ data }: { data: KnowledgeGraphData }) {
  const nodeColors: Record<string, string> = {
    entity: 'bg-purple-500',
    concept: 'bg-blue-500',
    relation: 'bg-green-500',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5" />
          Knowledge Graph (L3)
        </CardTitle>
        <CardDescription>
          Top entita e relazioni semantiche
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nodi totali</span>
              <span className="font-medium">{formatNumber(data.stats.totalNodes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Relazioni</span>
              <span className="font-medium">{formatNumber(data.stats.totalEdges)}</span>
            </div>
          </div>

          {/* Mini graph visualization */}
          <div className="relative h-32 bg-muted/30 rounded-lg overflow-hidden">
            {/* Simplified node visualization */}
            <div className="absolute inset-0 flex items-center justify-center gap-2 flex-wrap p-2">
              {data.nodes.slice(0, 6).map((node, i) => (
                <div
                  key={node.id}
                  className={cn(
                    'px-2 py-1 rounded-full text-xs text-white font-medium',
                    nodeColors[node.type]
                  )}
                  style={{
                    transform: `translate(${Math.sin(i * 1.2) * 20}px, ${Math.cos(i * 1.2) * 15}px)`,
                  }}
                >
                  {node.label.length > 12 ? node.label.slice(0, 12) + '...' : node.label}
                </div>
              ))}
            </div>
            {/* Connection lines (simplified) */}
            <svg className="absolute inset-0 pointer-events-none opacity-30">
              {data.edges.slice(0, 4).map((edge, i) => (
                <line
                  key={edge.id}
                  x1={`${20 + i * 15}%`}
                  y1="30%"
                  x2={`${60 + i * 10}%`}
                  y2="70%"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              ))}
            </svg>
          </div>

          {/* Top entities */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Top Entita</h4>
            {data.stats.topEntities.slice(0, 4).map((entity) => (
              <div key={entity.name} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate">{entity.name}</span>
                    <span className="text-muted-foreground">{entity.connections}</span>
                  </div>
                  <Progress
                    value={(entity.connections / data.stats.topEntities[0].connections) * 100}
                    className="h-1"
                  />
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full gap-2">
            <ExternalLink className="h-4 w-4" />
            Esplora Knowledge Graph
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Memory operations panel
 */
function MemoryOperationsPanel({
  stats,
  onConsolidate,
  onPrune,
  onExport,
  onClearLevel,
  isLoading,
}: {
  stats: MemoryStats;
  onConsolidate: () => void;
  onPrune: () => void;
  onExport: () => void;
  onClearLevel: (level: MemoryLevel) => void;
  isLoading: boolean;
}) {
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [levelToClear, setLevelToClear] = useState<MemoryLevel | null>(null);

  const handleClearClick = (level: MemoryLevel) => {
    setLevelToClear(level);
    setClearDialogOpen(true);
  };

  const handleConfirmClear = () => {
    if (levelToClear) {
      onClearLevel(levelToClear);
    }
    setClearDialogOpen(false);
    setLevelToClear(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Operazioni Memoria
          </CardTitle>
          <CardDescription>
            Gestione e manutenzione del sistema memoria
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Consolidate */}
          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <GitMerge className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">Consolida Memoria</h4>
                <p className="text-sm text-muted-foreground">
                  Sposta entries L1 -&gt; L2 -&gt; L3 basandosi su rilevanza
                </p>
                {stats.lastConsolidation && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Ultima: {formatRelativeTime(stats.lastConsolidation)}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onConsolidate}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Esegui'
                )}
              </Button>
            </div>
          </div>

          {/* Prune */}
          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                <Scissors className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">Elimina Vecchi</h4>
                <p className="text-sm text-muted-foreground">
                  Rimuovi entries scaduti o non utilizzati
                </p>
                {stats.lastPrune && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Ultima: {formatRelativeTime(stats.lastPrune)}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onPrune}
                disabled={isLoading}
              >
                Esegui
              </Button>
            </div>
          </div>

          {/* Export */}
          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <Download className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">Esporta Backup</h4>
                <p className="text-sm text-muted-foreground">
                  Scarica backup completo memoria
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={onExport}>
                Esporta
              </Button>
            </div>
          </div>

          {/* Clear Level */}
          <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-destructive">Svuota Livello</h4>
                <p className="text-sm text-muted-foreground">
                  Elimina tutti gli entries di un livello
                </p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {memoryLevelsConfig.map((config) => (
                    <Button
                      key={config.level}
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => handleClearClick(config.level)}
                    >
                      {config.level}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clear confirmation dialog */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Conferma Eliminazione
            </DialogTitle>
            <DialogDescription>
              Stai per eliminare tutti gli entries del livello{' '}
              <strong>{levelToClear}</strong>. Questa azione e irreversibile.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Entries che saranno eliminati:{' '}
              <strong>
                {formatNumber(
                  stats.levels.find((l) => l.level === levelToClear)?.totalEntries ?? 0
                )}
              </strong>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearDialogOpen(false)}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={handleConfirmClear}>
              Elimina Tutto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Entry detail modal
 */
function EntryDetailModal({
  entry,
  open,
  onClose,
}: {
  entry: MemoryEntry | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!entry) return null;

  const config = memoryLevelsConfig.find((c) => c.level === entry.level);
  const Icon = config?.icon ?? Database;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn('p-2 rounded-lg', config?.color)}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            Dettaglio Entry
          </DialogTitle>
          <DialogDescription>
            ID: {entry.id} | Livello: {entry.level}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Content */}
          <div>
            <h4 className="text-sm font-medium mb-2">Contenuto</h4>
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              {entry.content}
            </div>
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Tipo</h4>
              <Badge variant="secondary">{entry.type}</Badge>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Fonte</h4>
              <span className="text-sm">{entry.source ?? '-'}</span>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Creato</h4>
              <span className="text-sm">{formatDate(entry.createdAt)}</span>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Ultimo Accesso</h4>
              <span className="text-sm">
                {entry.lastAccessedAt ? formatDate(entry.lastAccessedAt) : formatDate(entry.updatedAt)}
              </span>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Accessi</h4>
              <span className="text-sm">{entry.accessCount}</span>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Rilevanza</h4>
              <span className="text-sm">
                {entry.relevanceScore ? `${(entry.relevanceScore * 100).toFixed(0)}%` : '-'}
              </span>
            </div>
          </div>

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </h4>
              <div className="flex gap-2 flex-wrap">
                {entry.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Related entries (for L3) */}
          {entry.relatedEntries && entry.relatedEntries.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Entries Correlati
              </h4>
              <div className="flex gap-2 flex-wrap">
                {entry.relatedEntries.map((relId) => (
                  <Badge key={relId} variant="secondary" className="gap-1">
                    <Network className="h-3 w-3" />
                    {relId}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Memory() {
  // State
  const [stats, setStats] = useState<MemoryStats>(mockStats);
  const [entries, setEntries] = useState<MemoryEntry[]>(mockEntries);
  const [knowledgeGraph, setKnowledgeGraph] = useState<KnowledgeGraphData>(mockKnowledgeGraph);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<MemoryLevel | null>(null);
  const [selectedType, setSelectedType] = useState<MemoryEntryType | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Detail modal
  const [selectedEntry, setSelectedEntry] = useState<MemoryEntry | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState('overview');

  // Computed values
  const getLevelConfig = useCallback((level: MemoryLevel) => {
    return memoryLevelsConfig.find((l) => l.level === level);
  }, []);

  const getLevelStats = useCallback(
    (level: MemoryLevel) => {
      return stats.levels.find((l) => l.level === level);
    },
    [stats]
  );

  // Filtered entries
  const filteredEntries = useMemo(() => {
    let result = [...entries];

    // Filter by level
    if (selectedLevel) {
      result = result.filter((e) => e.level === selectedLevel);
    }

    // Filter by type
    if (selectedType !== 'all') {
      result = result.filter((e) => e.type === selectedType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.content.toLowerCase().includes(query) ||
          e.tags?.some((t) => t.toLowerCase().includes(query)) ||
          e.source?.toLowerCase().includes(query)
      );
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date();
      let cutoff: Date;
      switch (dateFilter) {
        case 'today':
          cutoff = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          cutoff = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          cutoff = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          cutoff = new Date(0);
      }
      result = result.filter((e) => new Date(e.createdAt) >= cutoff);
    }

    return result;
  }, [entries, selectedLevel, selectedType, searchQuery, dateFilter]);

  // Table columns
  const tableColumns: Column<MemoryEntry>[] = useMemo(
    () => [
      {
        id: 'level',
        header: 'Livello',
        accessor: (row) => {
          const config = getLevelConfig(row.level);
          return (
            <Badge variant="outline" className={config?.textColor}>
              {row.level}
            </Badge>
          );
        },
      },
      {
        id: 'type',
        header: 'Tipo',
        accessor: (row) => (
          <Badge variant="secondary">{row.type}</Badge>
        ),
      },
      {
        id: 'content',
        header: 'Contenuto',
        accessor: (row) => (
          <span className="line-clamp-2 max-w-md">{row.content}</span>
        ),
        className: 'max-w-md',
      },
      {
        id: 'source',
        header: 'Fonte',
        accessor: 'source',
      },
      {
        id: 'createdAt',
        header: 'Data',
        accessor: (row) => formatRelativeTime(row.createdAt),
        sortable: true,
      },
      {
        id: 'actions',
        header: '',
        accessor: (row) => (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEntry(row);
              setDetailModalOpen(true);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        ),
        align: 'right',
      },
    ],
    [getLevelConfig]
  );

  // Handlers
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  }, []);

  const handleSearch = useCallback(() => {
    // Search is handled by the filtered entries computed value
    console.log('Searching for:', searchQuery);
  }, [searchQuery]);

  const handleConsolidate = useCallback(async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(false);
    // Update last consolidation time
    setStats((prev) => ({
      ...prev,
      lastConsolidation: new Date().toISOString(),
    }));
  }, []);

  const handlePrune = useCallback(async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    // Update last prune time
    setStats((prev) => ({
      ...prev,
      lastPrune: new Date().toISOString(),
    }));
  }, []);

  const handleExport = useCallback(() => {
    // Simulate download
    console.log('Exporting memory backup...');
    const blob = new Blob([JSON.stringify(entries, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leo-memory-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [entries]);

  const handleClearLevel = useCallback(async (level: MemoryLevel) => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // Remove entries for this level
    setEntries((prev) => prev.filter((e) => e.level !== level));
    // Update stats
    setStats((prev) => ({
      ...prev,
      levels: prev.levels.map((l) =>
        l.level === level ? { ...l, totalEntries: 0, sizeBytes: 0 } : l
      ),
    }));
    setIsLoading(false);
  }, []);

  const handleRowClick = useCallback((entry: MemoryEntry) => {
    setSelectedEntry(entry);
    setDetailModalOpen(true);
  }, []);

  // Effect for initial data load
  useEffect(() => {
    // In production, fetch data from API
    // memoryApi.getStats().then(setStats);
    // memoryApi.getEntries().then((res) => setEntries(res.data));
    // memoryApi.getKnowledgeGraph().then(setKnowledgeGraph);
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            Sistema Memoria
          </h1>
          <p className="text-muted-foreground">
            Gestione e visualizzazione della memoria gerarchica L0-L4 di LEO
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          Aggiorna
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Panoramica
          </TabsTrigger>
          <TabsTrigger value="browser" className="gap-2">
            <Search className="h-4 w-4" />
            Browser
          </TabsTrigger>
          <TabsTrigger value="operations" className="gap-2">
            <Activity className="h-4 w-4" />
            Operazioni
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Overview Stats */}
          <OverviewStats stats={stats} />

          {/* Memory Level Cards */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Livelli di Memoria
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {memoryLevelsConfig.map((config) => (
                <MemoryLevelCard
                  key={config.level}
                  config={config}
                  stats={getLevelStats(config.level)}
                  isSelected={selectedLevel === config.level}
                  onClick={() =>
                    setSelectedLevel(
                      selectedLevel === config.level ? null : config.level
                    )
                  }
                />
              ))}
            </div>
          </div>

          {/* Level Detail + Knowledge Graph */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Selected Level Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Dettagli Livello
                </CardTitle>
                <CardDescription>
                  {selectedLevel
                    ? `Metriche per ${getLevelConfig(selectedLevel)?.name}`
                    : 'Seleziona un livello per vedere i dettagli'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedLevel ? (
                  <div className="space-y-4">
                    {(() => {
                      const config = getLevelConfig(selectedLevel);
                      const levelStats = getLevelStats(selectedLevel);
                      if (!config || !levelStats) return null;
                      const Icon = config.icon;

                      return (
                        <>
                          <div
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-lg',
                              config.bgLight
                            )}
                          >
                            <div
                              className={cn(
                                'flex h-10 w-10 items-center justify-center rounded-lg',
                                config.color
                              )}
                            >
                              <Icon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <div className="font-semibold">
                                {config.level} - {config.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {config.nameEn}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
                                Entries
                              </span>
                              <span className="font-medium">
                                {formatNumber(levelStats.totalEntries)}
                              </span>
                            </div>

                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
                                Dimensione
                              </span>
                              <span className="font-medium">
                                {formatBytes(levelStats.sizeBytes)}
                              </span>
                            </div>

                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
                                Tempo Accesso Medio
                              </span>
                              <span className="font-medium">
                                {levelStats.avgAccessTime.toFixed(1)} ms
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">
                                  Hit Rate
                                </span>
                                <span className="font-medium">
                                  {levelStats.hitRate.toFixed(1)}%
                                </span>
                              </div>
                              <Progress value={levelStats.hitRate} className="h-2" />
                            </div>

                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
                                Retention
                              </span>
                              <span className="font-medium">{levelStats.retention}</span>
                            </div>

                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
                                Stato
                              </span>
                              <Badge
                                className={getStatusBadgeVariant(levelStats.status)}
                              >
                                {levelStats.status === 'healthy'
                                  ? 'Healthy'
                                  : levelStats.status.charAt(0).toUpperCase() +
                                    levelStats.status.slice(1)}
                              </Badge>
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            className="w-full gap-2 mt-2"
                            onClick={() => {
                              setActiveTab('browser');
                            }}
                          >
                            <Eye className="h-4 w-4" />
                            Esplora Entries
                          </Button>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
                    <Layers className="h-12 w-12 mb-3 opacity-50" />
                    <p>
                      Clicca su un livello di memoria per vedere le metriche
                      dettagliate
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Knowledge Graph */}
            <KnowledgeGraphMini data={knowledgeGraph} />
          </div>

          {/* Recent Entries Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Entries Recenti
              </CardTitle>
              <CardDescription>
                Ultimi accessi e modifiche alla memoria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {entries.slice(0, 5).map((entry) => {
                  const config = getLevelConfig(entry.level);
                  if (!config) return null;
                  const Icon = config.icon;

                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleRowClick(entry)}
                    >
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg',
                          config.color
                        )}
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={config.textColor}>
                            {entry.level}
                          </Badge>
                          <Badge variant="secondary">{entry.type}</Badge>
                        </div>
                        <p className="text-sm mt-1 truncate">{entry.content}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">
                          {formatRelativeTime(entry.createdAt)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {entry.source}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  );
                })}
              </div>
              <Button
                variant="ghost"
                className="w-full mt-4"
                onClick={() => setActiveTab('browser')}
              >
                Vedi tutti gli entries
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Browser Tab */}
        <TabsContent value="browser" className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-5 w-5" />
                Ricerca nella Memoria
              </CardTitle>
              <CardDescription>
                Cerca informazioni in tutti i livelli di memoria
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search bar */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Cerca contatti, conversazioni, fatti..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-9"
                  />
                </div>
                <Button onClick={handleSearch} className="gap-2">
                  <Search className="h-4 w-4" />
                  Cerca
                </Button>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-4">
                {/* Level filter */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Livello:</span>
                  <div className="flex gap-1">
                    {memoryLevelsConfig.map((config) => (
                      <Badge
                        key={config.level}
                        variant={selectedLevel === config.level ? 'default' : 'outline'}
                        className={cn(
                          'cursor-pointer',
                          selectedLevel === config.level
                            ? config.color
                            : config.textColor
                        )}
                        onClick={() =>
                          setSelectedLevel(
                            selectedLevel === config.level ? null : config.level
                          )
                        }
                      >
                        {config.level}
                      </Badge>
                    ))}
                    {selectedLevel && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setSelectedLevel(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Type filter */}
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={selectedType}
                    onValueChange={(v) => setSelectedType(v as MemoryEntryType | 'all')}
                  >
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti i tipi</SelectItem>
                      <SelectItem value="context">Context</SelectItem>
                      <SelectItem value="message">Message</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="fact">Fact</SelectItem>
                      <SelectItem value="relation">Relation</SelectItem>
                      <SelectItem value="knowledge">Knowledge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date filter */}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={dateFilter}
                    onValueChange={(v) =>
                      setDateFilter(v as 'all' | 'today' | 'week' | 'month')
                    }
                  >
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder="Data" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte le date</SelectItem>
                      <SelectItem value="today">Oggi</SelectItem>
                      <SelectItem value="week">Ultima settimana</SelectItem>
                      <SelectItem value="month">Ultimo mese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Risultati
                </span>
                <Badge variant="secondary">
                  {formatNumber(filteredEntries.length)} entries
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={filteredEntries}
                columns={tableColumns}
                onRowClick={handleRowClick}
                getRowId={(row) => row.id}
                emptyMessage="Nessun entry trovato con i filtri selezionati"
                pageSize={10}
                showPagination={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <MemoryOperationsPanel
              stats={stats}
              onConsolidate={handleConsolidate}
              onPrune={handlePrune}
              onExport={handleExport}
              onClearLevel={handleClearLevel}
              isLoading={isLoading}
            />

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Stato Sistema
                </CardTitle>
                <CardDescription>
                  Metriche di performance del sistema memoria
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Performance metrics */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Cache Hit Rate</span>
                      <span className="font-medium">{stats.cacheHitRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={stats.cacheHitRate} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Storage Utilizzato</span>
                      <span className="font-medium">
                        {formatBytes(stats.totalSizeBytes)} / 1 GB
                      </span>
                    </div>
                    <Progress
                      value={(stats.totalSizeBytes / (1024 * 1024 * 1024)) * 100}
                      className="h-2"
                    />
                  </div>
                </div>

                {/* Component status */}
                <div className="space-y-2 pt-4 border-t">
                  <h4 className="text-sm font-medium">Componenti</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                      <span className="text-sm">Vector DB</span>
                      {getStatusIcon(stats.vectorDbStatus)}
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                      <span className="text-sm">Cache Layer</span>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                      <span className="text-sm">Knowledge Graph</span>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-muted/30">
                      <span className="text-sm">Embedding Service</span>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                </div>

                {/* Recent operations */}
                <div className="space-y-2 pt-4 border-t">
                  <h4 className="text-sm font-medium">Operazioni Recenti</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Ultima consolidazione</span>
                      <span>
                        {stats.lastConsolidation
                          ? formatRelativeTime(stats.lastConsolidation)
                          : 'Mai'}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Ultima pulizia</span>
                      <span>
                        {stats.lastPrune
                          ? formatRelativeTime(stats.lastPrune)
                          : 'Mai'}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Query ultime 24h</span>
                      <span>{formatNumber(stats.recentQueries)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Entry Detail Modal */}
      <EntryDetailModal
        entry={selectedEntry}
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedEntry(null);
        }}
      />
    </div>
  );
}

export default Memory;
