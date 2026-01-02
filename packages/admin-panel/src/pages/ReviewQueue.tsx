/**
 * LEO Platform - Review Queue Page
 * Human-in-the-loop review interface for AI-generated responses
 *
 * Features:
 * - Two-panel layout (queue list + detail panel)
 * - Real-time WebSocket updates for new items
 * - Color-coded confidence scores
 * - Priority badges
 * - Approval/Rejection/Escalation workflow
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { create } from 'zustand';
import {
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  MessageSquare,
  Bot,
  User,
  Loader2,
  RefreshCw,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Send,
  Gauge,
  Calendar,
  Hash,
  TrendingUp,
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
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataTable, type Column } from '@/components/ui/data-table';
import { useToast } from '@/hooks/use-toast';
import { wsClient } from '@/api/websocket';
import { useRealtimeStore } from '@/stores/realtimeStore';

// ============================================================================
// Type Definitions
// ============================================================================

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'escalated';
export type ReviewPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface ReviewItem {
  id: string;
  conversationId: string;
  conversationSubject?: string;
  originalMessage: string;
  aiResponse: string;
  confidence: number;
  priority: ReviewPriority;
  status: ReviewStatus;
  aiModel: string;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  feedback?: string;
  contactName: string;
  channel: 'whatsapp' | 'email' | 'web' | 'sms';
}

export interface ReviewFilters {
  search: string;
  status: ReviewStatus | 'all';
  priority: ReviewPriority | 'all';
  dateRange: 'today' | 'week' | 'month' | 'all';
}

export interface ReviewMetrics {
  totalPending: number;
  approvedToday: number;
  rejectedToday: number;
  escalatedToday: number;
  avgConfidence: number;
  avgReviewTime: number;
}

export interface ReviewAction {
  itemId: string;
  action: 'approve' | 'reject' | 'escalate';
  feedback?: string;
}

// ============================================================================
// Zustand Store for Review Queue State
// ============================================================================

interface ReviewQueueState {
  selectedItemId: string | null;
  filters: ReviewFilters;
  isProcessing: boolean;
}

interface ReviewQueueActions {
  setSelectedItem: (id: string | null) => void;
  setFilters: (filters: Partial<ReviewFilters>) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  resetFilters: () => void;
}

type ReviewQueueStore = ReviewQueueState & ReviewQueueActions;

const initialFilters: ReviewFilters = {
  search: '',
  status: 'pending',
  priority: 'all',
  dateRange: 'all',
};

const useReviewQueueStore = create<ReviewQueueStore>()((set) => ({
  selectedItemId: null,
  filters: initialFilters,
  isProcessing: false,

  setSelectedItem: (id) => set({ selectedItemId: id }),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  setIsProcessing: (isProcessing) => set({ isProcessing }),
  resetFilters: () => set({ filters: initialFilters }),
}));

// ============================================================================
// Mock Data & API Functions
// ============================================================================

const mockReviewItems: ReviewItem[] = [
  {
    id: 'rev-001',
    conversationId: 'conv-123',
    conversationSubject: 'Problema con ordine #45678',
    originalMessage: 'Buongiorno, ho ordinato un prodotto la settimana scorsa ma non e ancora arrivato. Potete verificare lo stato della spedizione?',
    aiResponse: 'Buongiorno! Ho verificato il tuo ordine #45678. La spedizione risulta in transito e dovrebbe arrivare entro domani. Ti invio il link per il tracking: [LINK_TRACKING]. Se hai bisogno di ulteriore assistenza, sono qui per aiutarti.',
    confidence: 0.92,
    priority: 'medium',
    status: 'pending',
    aiModel: 'claude-3-opus',
    createdAt: new Date(Date.now() - 300000).toISOString(),
    updatedAt: new Date(Date.now() - 300000).toISOString(),
    contactName: 'Marco Rossi',
    channel: 'whatsapp',
  },
  {
    id: 'rev-002',
    conversationId: 'conv-124',
    conversationSubject: 'Richiesta rimborso urgente',
    originalMessage: 'URGENTE: Ho ricevuto un prodotto danneggiato e voglio il rimborso immediato! Sono molto deluso dal servizio.',
    aiResponse: 'Mi scuso sinceramente per l\'inconveniente. Capisco la tua frustrazione per aver ricevuto un prodotto danneggiato. Ho avviato immediatamente la procedura di rimborso che sara accreditato entro 3-5 giorni lavorativi. Ti inviero un\'email di conferma a breve.',
    confidence: 0.65,
    priority: 'urgent',
    status: 'pending',
    aiModel: 'claude-3-opus',
    createdAt: new Date(Date.now() - 180000).toISOString(),
    updatedAt: new Date(Date.now() - 180000).toISOString(),
    contactName: 'Laura Bianchi',
    channel: 'email',
  },
  {
    id: 'rev-003',
    conversationId: 'conv-125',
    conversationSubject: 'Informazioni prodotto',
    originalMessage: 'Salve, vorrei sapere se il prodotto XYZ e compatibile con il mio dispositivo ABC.',
    aiResponse: 'Salve! Si, il prodotto XYZ e pienamente compatibile con il dispositivo ABC. La compatibilita e stata testata e verificata. Se hai altre domande sulle specifiche tecniche, sono a disposizione.',
    confidence: 0.88,
    priority: 'low',
    status: 'pending',
    aiModel: 'claude-3-opus',
    createdAt: new Date(Date.now() - 600000).toISOString(),
    updatedAt: new Date(Date.now() - 600000).toISOString(),
    contactName: 'Giuseppe Verdi',
    channel: 'web',
  },
  {
    id: 'rev-004',
    conversationId: 'conv-126',
    conversationSubject: 'Problema tecnico complesso',
    originalMessage: 'Il sistema mostra un errore 5xx quando provo ad accedere. Ho provato a svuotare la cache ma non funziona.',
    aiResponse: 'Grazie per la segnalazione. L\'errore 5xx indica un problema lato server che il nostro team tecnico sta gia investigando. Nel frattempo, ti consiglio di riprovare tra 10-15 minuti. Se il problema persiste, contattaci nuovamente.',
    confidence: 0.72,
    priority: 'high',
    status: 'pending',
    aiModel: 'claude-3-opus',
    createdAt: new Date(Date.now() - 120000).toISOString(),
    updatedAt: new Date(Date.now() - 120000).toISOString(),
    contactName: 'Anna Ferrari',
    channel: 'whatsapp',
  },
  {
    id: 'rev-005',
    conversationId: 'conv-127',
    conversationSubject: 'Appuntamento assistenza',
    originalMessage: 'Vorrei prenotare un appuntamento per assistenza tecnica on-site.',
    aiResponse: 'Perfetto! Per prenotare un appuntamento di assistenza tecnica on-site, ho bisogno di alcune informazioni: 1) Indirizzo completo 2) Data e orario preferiti 3) Descrizione del problema. Una volta ricevute queste informazioni, procedo con la prenotazione.',
    confidence: 0.95,
    priority: 'medium',
    status: 'approved',
    aiModel: 'claude-3-opus',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3500000).toISOString(),
    reviewedBy: 'operator@leo.it',
    reviewedAt: new Date(Date.now() - 3500000).toISOString(),
    contactName: 'Paolo Conti',
    channel: 'email',
  },
  {
    id: 'rev-006',
    conversationId: 'conv-128',
    conversationSubject: 'Reclamo formale',
    originalMessage: 'Voglio fare un reclamo formale. Il vostro servizio clienti e pessimo e nessuno risponde alle mie email da una settimana.',
    aiResponse: 'Mi scuso profondamente per il disservizio subito. La tua segnalazione e stata escalata al nostro team di gestione reclami che ti contattara entro 24 ore. Nel frattempo, ho creato un ticket prioritario con codice #RCL-789.',
    confidence: 0.58,
    priority: 'urgent',
    status: 'escalated',
    aiModel: 'claude-3-opus',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 7000000).toISOString(),
    reviewedBy: 'supervisor@leo.it',
    reviewedAt: new Date(Date.now() - 7000000).toISOString(),
    feedback: 'Escalato al team supervisori per gestione reclamo formale.',
    contactName: 'Francesca Neri',
    channel: 'email',
  },
];

const mockMetrics: ReviewMetrics = {
  totalPending: 4,
  approvedToday: 12,
  rejectedToday: 3,
  escalatedToday: 2,
  avgConfidence: 78.5,
  avgReviewTime: 45,
};

// API Functions (using mock data for now)
const fetchReviewItems = async (filters: ReviewFilters): Promise<ReviewItem[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  return mockReviewItems.filter((item) => {
    const matchesSearch =
      filters.search === '' ||
      item.contactName.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.originalMessage.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.conversationId.toLowerCase().includes(filters.search.toLowerCase());

    const matchesStatus =
      filters.status === 'all' || item.status === filters.status;

    const matchesPriority =
      filters.priority === 'all' || item.priority === filters.priority;

    // Date filtering would go here
    const matchesDate = true;

    return matchesSearch && matchesStatus && matchesPriority && matchesDate;
  });
};

const fetchReviewMetrics = async (): Promise<ReviewMetrics> => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return mockMetrics;
};

const submitReviewAction = async (action: ReviewAction): Promise<ReviewItem> => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const item = mockReviewItems.find((i) => i.id === action.itemId);
  if (!item) {
    throw new Error('Item not found');
  }

  // Update mock data
  const newStatus: ReviewStatus =
    action.action === 'approve'
      ? 'approved'
      : action.action === 'reject'
      ? 'rejected'
      : 'escalated';

  const updatedItem: ReviewItem = {
    ...item,
    status: newStatus,
    reviewedAt: new Date().toISOString(),
    reviewedBy: 'current-user@leo.it',
    feedback: action.feedback,
    updatedAt: new Date().toISOString(),
  };

  // Update in mock array
  const index = mockReviewItems.findIndex((i) => i.id === action.itemId);
  if (index !== -1) {
    mockReviewItems[index] = updatedItem;
  }

  return updatedItem;
};

// ============================================================================
// Helper Functions
// ============================================================================

const statusConfig: Record<ReviewStatus, { label: string; color: string; bgColor: string; icon: typeof CheckCircle2 }> = {
  pending: {
    label: 'In attesa',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    icon: Clock,
  },
  approved: {
    label: 'Approvato',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rifiutato',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: XCircle,
  },
  escalated: {
    label: 'Escalato',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    icon: ArrowUpRight,
  },
};

const priorityConfig: Record<ReviewPriority, { label: string; color: string; bgColor: string }> = {
  urgent: {
    label: 'Urgente',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  high: {
    label: 'Alta',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
  },
  medium: {
    label: 'Media',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  low: {
    label: 'Bassa',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
  },
};

const channelConfig = {
  whatsapp: { label: 'WhatsApp', color: 'text-green-600' },
  email: { label: 'Email', color: 'text-blue-600' },
  web: { label: 'Web', color: 'text-purple-600' },
  sms: { label: 'SMS', color: 'text-orange-600' },
};

const getConfidenceColor = (confidence: number): string => {
  if (confidence < 0.7) return 'text-red-600';
  if (confidence < 0.85) return 'text-yellow-600';
  return 'text-green-600';
};

const getConfidenceBgColor = (confidence: number): string => {
  if (confidence < 0.7) return 'bg-red-100';
  if (confidence < 0.85) return 'bg-yellow-100';
  return 'bg-green-100';
};

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));

  if (minutes < 1) return 'Adesso';
  if (minutes < 60) return `${minutes} min fa`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ore fa`;

  return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
};

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Metrics Cards Row
 */
function MetricsCards({ metrics, isLoading }: { metrics: ReviewMetrics | undefined; isLoading: boolean }) {
  if (isLoading || !metrics) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-20" />
                <div className="h-8 bg-muted rounded w-12" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-500" />
            <span className="text-sm text-muted-foreground">In Attesa</span>
          </div>
          <p className="text-2xl font-bold mt-1">{metrics.totalPending}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Approvati Oggi</span>
          </div>
          <p className="text-2xl font-bold mt-1 text-green-600">{metrics.approvedToday}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-muted-foreground">Rifiutati Oggi</span>
          </div>
          <p className="text-2xl font-bold mt-1 text-red-600">{metrics.rejectedToday}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-orange-500" />
            <span className="text-sm text-muted-foreground">Escalati Oggi</span>
          </div>
          <p className="text-2xl font-bold mt-1 text-orange-600">{metrics.escalatedToday}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-blue-500" />
            <span className="text-sm text-muted-foreground">Confidence Media</span>
          </div>
          <p className="text-2xl font-bold mt-1">{metrics.avgConfidence}%</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            <span className="text-sm text-muted-foreground">Tempo Medio Review</span>
          </div>
          <p className="text-2xl font-bold mt-1">{metrics.avgReviewTime}s</p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Confidence Score Badge with visual indicator
 */
function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  const colorClass = getConfidenceColor(confidence);
  const bgColorClass = getConfidenceBgColor(confidence);

  return (
    <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium', bgColorClass, colorClass)}>
      <Gauge className="h-3 w-3" />
      {percentage}%
    </div>
  );
}

/**
 * Priority Badge
 */
function PriorityBadge({ priority }: { priority: ReviewPriority }) {
  const config = priorityConfig[priority];
  return (
    <Badge className={cn(config.bgColor, config.color, 'border-0')}>
      {config.label}
    </Badge>
  );
}

/**
 * Status Badge
 */
function StatusBadge({ status }: { status: ReviewStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <div className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium', config.bgColor, config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </div>
  );
}

/**
 * Filter Bar Component
 */
interface FilterBarProps {
  filters: ReviewFilters;
  onFiltersChange: (filters: Partial<ReviewFilters>) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

function FilterBar({ filters, onFiltersChange, onRefresh, isRefreshing }: FilterBarProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca per contatto, messaggio o ID..."
              className="pl-9"
              value={filters.search}
              onChange={(e) => onFiltersChange({ search: e.target.value })}
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Select
              value={filters.status}
              onValueChange={(value: ReviewStatus | 'all') => onFiltersChange({ status: value })}
            >
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="pending">In attesa</SelectItem>
                <SelectItem value="approved">Approvati</SelectItem>
                <SelectItem value="rejected">Rifiutati</SelectItem>
                <SelectItem value="escalated">Escalati</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.priority}
              onValueChange={(value: ReviewPriority | 'all') => onFiltersChange({ priority: value })}
            >
              <SelectTrigger className="w-[140px]">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Priorita" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le priorita</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="low">Bassa</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.dateRange}
              onValueChange={(value: ReviewFilters['dateRange']) => onFiltersChange({ dateRange: value })}
            >
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Data" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le date</SelectItem>
                <SelectItem value="today">Oggi</SelectItem>
                <SelectItem value="week">Ultima settimana</SelectItem>
                <SelectItem value="month">Ultimo mese</SelectItem>
              </SelectContent>
            </Select>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={onRefresh} disabled={isRefreshing}>
                    <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Aggiorna</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Review Detail Panel
 */
interface DetailPanelProps {
  item: ReviewItem | null;
  onApprove: () => void;
  onReject: (feedback: string) => void;
  onEscalate: (feedback: string) => void;
  isProcessing: boolean;
}

function DetailPanel({ item, onApprove, onReject, onEscalate, isProcessing }: DetailPanelProps) {
  const [feedbackText, setFeedbackText] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);

  // Reset feedback when item changes
  useEffect(() => {
    setFeedbackText('');
  }, [item?.id]);

  if (!item) {
    return (
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Eye className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Seleziona un elemento</p>
            <p className="text-sm mt-1">
              Scegli un elemento dalla coda per visualizzare i dettagli
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPending = item.status === 'pending';

  return (
    <>
      <Card className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                {item.contactName}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Hash className="h-3 w-3" />
                <span className="font-mono text-xs">{item.id}</span>
                <span className="text-muted-foreground/50">|</span>
                <span className={channelConfig[item.channel].color}>
                  {channelConfig[item.channel].label}
                </span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <PriorityBadge priority={item.priority} />
              <StatusBadge status={item.status} />
            </div>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="flex-1 overflow-auto p-4 space-y-6">
          {/* Original Message */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Messaggio Originale
            </h4>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{item.originalMessage}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Ricevuto: {new Date(item.createdAt).toLocaleString('it-IT')}
            </p>
          </div>

          <Separator />

          {/* AI Response */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Risposta AI
              </h4>
              <ConfidenceBadge confidence={item.confidence} />
            </div>
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{item.aiResponse}</p>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Modello: {item.aiModel}</span>
              <span>Generato: {formatTime(item.createdAt)}</span>
            </div>
          </div>

          {/* Confidence Visual Indicator */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Livello di Confidenza</h4>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className={getConfidenceColor(item.confidence)}>
                  {item.confidence < 0.7 ? 'Bassa' : item.confidence < 0.85 ? 'Media' : 'Alta'}
                </span>
                <span className="font-medium">{Math.round(item.confidence * 100)}%</span>
              </div>
              <Progress value={item.confidence * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {item.confidence < 0.7
                  ? 'Richiede revisione attenta - bassa confidenza'
                  : item.confidence < 0.85
                  ? 'Confidenza moderata - verificare i dettagli'
                  : 'Alta confidenza - probabile risposta corretta'}
              </p>
            </div>
          </div>

          {/* Review History (if reviewed) */}
          {item.reviewedAt && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Storico Revisione</h4>
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <p>
                    <strong>Revisionato da:</strong> {item.reviewedBy}
                  </p>
                  <p>
                    <strong>Data:</strong> {new Date(item.reviewedAt).toLocaleString('it-IT')}
                  </p>
                  {item.feedback && (
                    <p className="mt-2">
                      <strong>Feedback:</strong> {item.feedback}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>

        {/* Action Buttons */}
        {isPending && (
          <div className="flex-shrink-0 border-t p-4">
            <div className="flex items-center gap-3">
              <Button
                variant="default"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={onApprove}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ThumbsUp className="h-4 w-4 mr-2" />
                )}
                Approva
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => setShowRejectDialog(true)}
                disabled={isProcessing}
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                Rifiuta
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-orange-500 text-orange-600 hover:bg-orange-50"
                onClick={() => setShowEscalateDialog(true)}
                disabled={isProcessing}
              >
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Escalate
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rifiuta Risposta AI</DialogTitle>
            <DialogDescription>
              Fornisci un feedback per spiegare perche la risposta viene rifiutata.
              Questo feedback sara usato per migliorare il modello.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <textarea
              className="w-full min-h-[100px] p-3 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Inserisci il motivo del rifiuto (obbligatorio)..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onReject(feedbackText);
                setShowRejectDialog(false);
                setFeedbackText('');
              }}
              disabled={!feedbackText.trim() || isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Conferma Rifiuto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Escalate Dialog */}
      <Dialog open={showEscalateDialog} onOpenChange={setShowEscalateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escalate al Supervisore</DialogTitle>
            <DialogDescription>
              Questa richiesta verra inoltrata a un supervisore per una revisione manuale.
              Aggiungi note per il supervisore.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <textarea
              className="w-full min-h-[100px] p-3 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Aggiungi note per il supervisore (opzionale)..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEscalateDialog(false)}>
              Annulla
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => {
                onEscalate(feedbackText);
                setShowEscalateDialog(false);
                setFeedbackText('');
              }}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowUpRight className="h-4 w-4 mr-2" />
              )}
              Conferma Escalation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================================
// Main ReviewQueue Page Component
// ============================================================================

export function ReviewQueue() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { addNotification } = useRealtimeStore();

  // Zustand store
  const {
    selectedItemId,
    filters,
    isProcessing,
    setSelectedItem,
    setFilters,
    setIsProcessing,
  } = useReviewQueueStore();

  // Fetch review items
  const {
    data: reviewItems = [],
    isLoading: isLoadingItems,
    refetch: refetchItems,
    isRefetching,
  } = useQuery({
    queryKey: ['reviewItems', filters],
    queryFn: () => fetchReviewItems(filters),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Fetch metrics
  const { data: metrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['reviewMetrics'],
    queryFn: fetchReviewMetrics,
    refetchInterval: 60000, // Refresh metrics every minute
  });

  // Get selected item
  const selectedItem = reviewItems.find((item) => item.id === selectedItemId) || null;

  // Submit review action mutation
  const reviewMutation = useMutation({
    mutationFn: submitReviewAction,
    onMutate: () => {
      setIsProcessing(true);
    },
    onSuccess: (updatedItem, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reviewItems'] });
      queryClient.invalidateQueries({ queryKey: ['reviewMetrics'] });

      const actionLabels = {
        approve: 'approvata',
        reject: 'rifiutata',
        escalate: 'escalata',
      };

      toast({
        title: 'Azione completata',
        description: `La risposta e stata ${actionLabels[variables.action]} con successo.`,
      });

      // Move to next pending item or clear selection
      const nextPending = reviewItems.find(
        (item) => item.id !== updatedItem.id && item.status === 'pending'
      );
      setSelectedItem(nextPending?.id || null);
    },
    onError: (error) => {
      toast({
        title: 'Errore',
        description: 'Si e verificato un errore durante l\'elaborazione.',
        variant: 'destructive',
      });
      console.error('Review action failed:', error);
    },
    onSettled: () => {
      setIsProcessing(false);
    },
  });

  // Action handlers
  const handleApprove = useCallback(() => {
    if (!selectedItemId) return;
    reviewMutation.mutate({ itemId: selectedItemId, action: 'approve' });
  }, [selectedItemId, reviewMutation]);

  const handleReject = useCallback(
    (feedback: string) => {
      if (!selectedItemId) return;
      reviewMutation.mutate({ itemId: selectedItemId, action: 'reject', feedback });
    },
    [selectedItemId, reviewMutation]
  );

  const handleEscalate = useCallback(
    (feedback: string) => {
      if (!selectedItemId) return;
      reviewMutation.mutate({ itemId: selectedItemId, action: 'escalate', feedback });
    },
    [selectedItemId, reviewMutation]
  );

  // WebSocket subscription for real-time updates
  useEffect(() => {
    // Subscribe to review queue updates
    const unsubscribe = wsClient.subscribe('system');

    // Listen for new review items
    const handleNewItem = wsClient.on('system:alert', (payload: { level: string; title: string; message: string }) => {
      if (payload.title?.includes('Review')) {
        toast({
          title: 'Nuovo elemento in coda',
          description: payload.message,
        });

        addNotification({
          level: 'info',
          title: 'Nuovo elemento da revisionare',
          message: payload.message,
        });

        // Refresh the list
        queryClient.invalidateQueries({ queryKey: ['reviewItems'] });
        queryClient.invalidateQueries({ queryKey: ['reviewMetrics'] });
      }
    });

    return () => {
      unsubscribe();
      handleNewItem();
    };
  }, [queryClient, toast, addNotification]);

  // DataTable columns configuration
  const columns: Column<ReviewItem>[] = useMemo(
    () => [
      {
        id: 'id',
        header: 'ID',
        accessor: (row) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.id.slice(-6)}
          </span>
        ),
        minWidth: '80px',
      },
      {
        id: 'contact',
        header: 'Conversazione',
        accessor: (row) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.contactName}</span>
            <span className="text-xs text-muted-foreground">
              {row.conversationSubject || row.conversationId}
            </span>
          </div>
        ),
        sortable: true,
      },
      {
        id: 'response',
        header: 'Risposta AI',
        accessor: (row) => (
          <span className="text-sm text-muted-foreground">
            {truncateText(row.aiResponse, 60)}
          </span>
        ),
      },
      {
        id: 'confidence',
        header: 'Confidence',
        accessor: (row) => <ConfidenceBadge confidence={row.confidence} />,
        sortable: true,
        align: 'center',
        minWidth: '100px',
      },
      {
        id: 'priority',
        header: 'Priorita',
        accessor: (row) => <PriorityBadge priority={row.priority} />,
        sortable: true,
        align: 'center',
        minWidth: '100px',
      },
      {
        id: 'status',
        header: 'Stato',
        accessor: (row) => <StatusBadge status={row.status} />,
        sortable: true,
        align: 'center',
        minWidth: '100px',
      },
      {
        id: 'time',
        header: 'Tempo',
        accessor: (row) => (
          <span className="text-xs text-muted-foreground">
            {formatTime(row.createdAt)}
          </span>
        ),
        sortable: true,
        align: 'right',
        minWidth: '90px',
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Coda di Revisione</h1>
        <p className="text-muted-foreground">
          Revisiona e approva le risposte generate dall'AI prima dell'invio
        </p>
      </div>

      {/* Metrics Cards */}
      <MetricsCards metrics={metrics} isLoading={isLoadingMetrics} />

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        onRefresh={() => refetchItems()}
        isRefreshing={isRefetching}
      />

      {/* Main Content - Two Panel Layout */}
      <div className="flex gap-6 h-[calc(100vh-24rem)]">
        {/* Left Panel - Queue List */}
        <div className="w-2/5 min-w-[400px]">
          <Card className="h-full overflow-hidden">
            <CardHeader className="pb-3 border-b flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Elementi in Coda
                </CardTitle>
                <Badge variant="secondary">
                  {reviewItems.length} elementi
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto">
              <DataTable
                data={reviewItems}
                columns={columns}
                isLoading={isLoadingItems}
                emptyMessage="Nessun elemento nella coda di revisione"
                pageSize={10}
                onRowClick={(row) => setSelectedItem(row.id)}
                getRowId={(row) => row.id}
                selectedRowId={selectedItemId || undefined}
                showPagination={true}
                compact={true}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Detail View */}
        <div className="flex-1 min-w-[500px]">
          <DetailPanel
            item={selectedItem}
            onApprove={handleApprove}
            onReject={handleReject}
            onEscalate={handleEscalate}
            isProcessing={isProcessing}
          />
        </div>
      </div>
    </div>
  );
}

export default ReviewQueue;
