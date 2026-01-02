/**
 * LEO Platform - Conversations Page
 * Full-featured conversation management with three-panel layout
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { create } from 'zustand';
import {
  Search,
  MessageSquare,
  Phone,
  Mail,
  Globe,
  MoreVertical,
  Send,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  Tag,
  Clock,
  User,
  Calendar,
  Hash,
  ArrowUpRight,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
// Note: apiClient will be used when connecting to real backend
// import { apiClient } from '@/api/client';
import type {
  Conversation,
  Message,
  Contact,
  ConversationStatus,
  ConversationPriority,
} from '@/api/types';

// ============================================================================
// Type Definitions
// ============================================================================

type ChannelType = 'all' | 'whatsapp' | 'email' | 'web' | 'sms';

interface ConversationWithContact extends Conversation {
  contact: Contact;
  unreadCount?: number;
  lastMessagePreview?: string;
}

interface ConversationFilters {
  search: string;
  channel: ChannelType;
  status: ConversationStatus | 'all';
}

interface SendMessagePayload {
  conversationId: string;
  content: string;
  type?: 'text';
}

// ============================================================================
// Zustand Store for Conversation State
// ============================================================================

interface ConversationState {
  selectedConversationId: string | null;
  filters: ConversationFilters;
  isTyping: boolean;
  rightSidebarOpen: boolean;
}

interface ConversationActions {
  setSelectedConversation: (id: string | null) => void;
  setFilters: (filters: Partial<ConversationFilters>) => void;
  setIsTyping: (isTyping: boolean) => void;
  toggleRightSidebar: () => void;
  setRightSidebarOpen: (open: boolean) => void;
  resetFilters: () => void;
}

type ConversationStore = ConversationState & ConversationActions;

const initialFilters: ConversationFilters = {
  search: '',
  channel: 'all',
  status: 'all',
};

const useConversationStore = create<ConversationStore>()((set) => ({
  selectedConversationId: null,
  filters: initialFilters,
  isTyping: false,
  rightSidebarOpen: true,

  setSelectedConversation: (id) => set({ selectedConversationId: id }),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
  setIsTyping: (isTyping) => set({ isTyping }),
  toggleRightSidebar: () =>
    set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen })),
  setRightSidebarOpen: (open) => set({ rightSidebarOpen: open }),
  resetFilters: () => set({ filters: initialFilters }),
}));

// ============================================================================
// Mock Data & API Functions
// ============================================================================

const mockContacts: Contact[] = [
  {
    id: 'c1',
    firstName: 'Marco',
    lastName: 'Rossi',
    phone: '+39 333 1234567',
    email: 'marco.rossi@email.it',
    channel: 'whatsapp',
    tags: ['vip', 'frequent'],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-12-28T14:32:00Z',
    lastContactAt: '2024-12-28T14:32:00Z',
  },
  {
    id: 'c2',
    firstName: 'Laura',
    lastName: 'Bianchi',
    phone: '+39 338 7654321',
    email: 'laura.bianchi@email.it',
    channel: 'email',
    tags: ['new'],
    createdAt: '2024-12-20T09:00:00Z',
    updatedAt: '2024-12-28T14:15:00Z',
    lastContactAt: '2024-12-28T14:15:00Z',
  },
  {
    id: 'c3',
    firstName: 'Giuseppe',
    lastName: 'Verdi',
    phone: '+39 347 9876543',
    channel: 'whatsapp',
    tags: ['support'],
    createdAt: '2024-11-10T08:00:00Z',
    updatedAt: '2024-12-28T13:45:00Z',
    lastContactAt: '2024-12-28T13:45:00Z',
  },
  {
    id: 'c4',
    firstName: 'Anna',
    lastName: 'Ferrari',
    email: 'anna.ferrari@company.it',
    channel: 'web',
    tags: ['business'],
    createdAt: '2024-10-05T14:00:00Z',
    updatedAt: '2024-12-28T12:30:00Z',
    lastContactAt: '2024-12-28T12:30:00Z',
  },
  {
    id: 'c5',
    firstName: 'Paolo',
    lastName: 'Conti',
    phone: '+39 340 1112233',
    channel: 'whatsapp',
    createdAt: '2024-09-01T11:00:00Z',
    updatedAt: '2024-12-28T11:20:00Z',
    lastContactAt: '2024-12-28T11:20:00Z',
  },
];

const mockConversations: ConversationWithContact[] = [
  {
    id: '1',
    contactId: 'c1',
    contact: mockContacts[0],
    channel: 'whatsapp',
    status: 'active',
    priority: 'medium',
    subject: 'Ordine #12345 in ritardo',
    messageCount: 5,
    lastMessageAt: '2024-12-28T14:32:00Z',
    createdAt: '2024-12-28T14:20:00Z',
    updatedAt: '2024-12-28T14:32:00Z',
    unreadCount: 2,
    lastMessagePreview: "Grazie per l'assistenza, funziona perfettamente ora!",
    tags: ['ordini', 'urgente'],
  },
  {
    id: '2',
    contactId: 'c2',
    contact: mockContacts[1],
    channel: 'email',
    status: 'pending',
    priority: 'low',
    subject: 'Richiesta informazioni servizi',
    messageCount: 1,
    lastMessageAt: '2024-12-28T14:15:00Z',
    createdAt: '2024-12-28T14:15:00Z',
    updatedAt: '2024-12-28T14:15:00Z',
    unreadCount: 1,
    lastMessagePreview: 'Vorrei informazioni sui vostri servizi...',
    tags: ['info'],
  },
  {
    id: '3',
    contactId: 'c3',
    contact: mockContacts[2],
    channel: 'whatsapp',
    status: 'pending',
    priority: 'medium',
    subject: 'Nuova funzionalita',
    messageCount: 1,
    lastMessageAt: '2024-12-28T13:45:00Z',
    createdAt: '2024-12-28T13:45:00Z',
    updatedAt: '2024-12-28T13:45:00Z',
    unreadCount: 0,
    lastMessagePreview: 'Quando sara disponibile la nuova funzionalita?',
    tags: ['feature-request'],
  },
  {
    id: '4',
    contactId: 'c4',
    contact: mockContacts[3],
    channel: 'web',
    status: 'resolved',
    priority: 'low',
    subject: 'Supporto configurazione',
    messageCount: 3,
    lastMessageAt: '2024-12-28T12:30:00Z',
    createdAt: '2024-12-28T12:00:00Z',
    updatedAt: '2024-12-28T12:30:00Z',
    resolvedAt: '2024-12-28T12:30:00Z',
    unreadCount: 0,
    lastMessagePreview: 'Problema risolto, grazie!',
    tags: ['supporto'],
  },
  {
    id: '5',
    contactId: 'c5',
    contact: mockContacts[4],
    channel: 'whatsapp',
    status: 'resolved',
    priority: 'low',
    messageCount: 1,
    lastMessageAt: '2024-12-28T11:20:00Z',
    createdAt: '2024-12-28T11:20:00Z',
    updatedAt: '2024-12-28T11:20:00Z',
    resolvedAt: '2024-12-28T11:20:00Z',
    unreadCount: 0,
    lastMessagePreview: 'Perfetto, a domani!',
  },
];

const mockMessages: Record<string, Message[]> = {
  '1': [
    {
      id: 'm1',
      conversationId: '1',
      contactId: 'c1',
      direction: 'inbound',
      type: 'text',
      content: 'Buongiorno, ho un problema con il mio ordine',
      status: 'read',
      sentAt: '2024-12-28T14:20:00Z',
      createdAt: '2024-12-28T14:20:00Z',
      updatedAt: '2024-12-28T14:20:00Z',
    },
    {
      id: 'm2',
      conversationId: '1',
      contactId: 'c1',
      direction: 'outbound',
      type: 'text',
      content:
        'Buongiorno Marco! Sono LEO, il tuo assistente virtuale. Come posso aiutarti con il tuo ordine?',
      status: 'delivered',
      sentAt: '2024-12-28T14:21:00Z',
      createdAt: '2024-12-28T14:21:00Z',
      updatedAt: '2024-12-28T14:21:00Z',
      isAiGenerated: true,
      aiConfidence: 0.95,
      aiModel: 'claude-3-opus',
    },
    {
      id: 'm3',
      conversationId: '1',
      contactId: 'c1',
      direction: 'inbound',
      type: 'text',
      content: "L'ordine #12345 risulta in ritardo",
      status: 'read',
      sentAt: '2024-12-28T14:25:00Z',
      createdAt: '2024-12-28T14:25:00Z',
      updatedAt: '2024-12-28T14:25:00Z',
    },
    {
      id: 'm4',
      conversationId: '1',
      contactId: 'c1',
      direction: 'outbound',
      type: 'text',
      content:
        'Ho verificato il tuo ordine #12345. Risulta in consegna oggi, dovrebbe arrivare entro le 18:00.',
      status: 'delivered',
      sentAt: '2024-12-28T14:28:00Z',
      createdAt: '2024-12-28T14:28:00Z',
      updatedAt: '2024-12-28T14:28:00Z',
      isAiGenerated: true,
      aiConfidence: 0.92,
      aiModel: 'claude-3-opus',
    },
    {
      id: 'm5',
      conversationId: '1',
      contactId: 'c1',
      direction: 'inbound',
      type: 'text',
      content: "Grazie per l'assistenza, funziona perfettamente ora!",
      status: 'read',
      sentAt: '2024-12-28T14:32:00Z',
      createdAt: '2024-12-28T14:32:00Z',
      updatedAt: '2024-12-28T14:32:00Z',
    },
  ],
  '2': [
    {
      id: 'm1',
      conversationId: '2',
      contactId: 'c2',
      direction: 'inbound',
      type: 'text',
      content:
        'Vorrei informazioni sui vostri servizi di assistenza clienti. Potete inviarmi una brochure o una presentazione?',
      status: 'read',
      sentAt: '2024-12-28T14:15:00Z',
      createdAt: '2024-12-28T14:15:00Z',
      updatedAt: '2024-12-28T14:15:00Z',
    },
  ],
  '3': [
    {
      id: 'm1',
      conversationId: '3',
      contactId: 'c3',
      direction: 'inbound',
      type: 'text',
      content: 'Quando sara disponibile la nuova funzionalita di automazione?',
      status: 'read',
      sentAt: '2024-12-28T13:45:00Z',
      createdAt: '2024-12-28T13:45:00Z',
      updatedAt: '2024-12-28T13:45:00Z',
    },
  ],
  '4': [
    {
      id: 'm1',
      conversationId: '4',
      contactId: 'c4',
      direction: 'inbound',
      type: 'text',
      content: 'Ho bisogno di supporto per la configurazione del sistema',
      status: 'read',
      sentAt: '2024-12-28T12:00:00Z',
      createdAt: '2024-12-28T12:00:00Z',
      updatedAt: '2024-12-28T12:00:00Z',
    },
    {
      id: 'm2',
      conversationId: '4',
      contactId: 'c4',
      direction: 'outbound',
      type: 'text',
      content:
        'Certo! Ti guido passo passo nella configurazione. Quale sezione stai configurando?',
      status: 'delivered',
      sentAt: '2024-12-28T12:05:00Z',
      createdAt: '2024-12-28T12:05:00Z',
      updatedAt: '2024-12-28T12:05:00Z',
      isAiGenerated: true,
      aiConfidence: 0.88,
      aiModel: 'claude-3-opus',
    },
    {
      id: 'm3',
      conversationId: '4',
      contactId: 'c4',
      direction: 'inbound',
      type: 'text',
      content: 'Problema risolto, grazie!',
      status: 'read',
      sentAt: '2024-12-28T12:30:00Z',
      createdAt: '2024-12-28T12:30:00Z',
      updatedAt: '2024-12-28T12:30:00Z',
    },
  ],
  '5': [
    {
      id: 'm1',
      conversationId: '5',
      contactId: 'c5',
      direction: 'inbound',
      type: 'text',
      content: 'Perfetto, a domani!',
      status: 'read',
      sentAt: '2024-12-28T11:20:00Z',
      createdAt: '2024-12-28T11:20:00Z',
      updatedAt: '2024-12-28T11:20:00Z',
    },
  ],
};

// API Functions (using mock data for now)
const fetchConversations = async (
  filters: ConversationFilters
): Promise<ConversationWithContact[]> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // TODO: Replace with real API call
  // const response = await apiClient.get<PaginatedResponse<ConversationWithContact>>('/conversations', { params: filters });
  // return response.data.data;

  return mockConversations.filter((conv) => {
    const matchesSearch =
      filters.search === '' ||
      `${conv.contact.firstName} ${conv.contact.lastName}`
        .toLowerCase()
        .includes(filters.search.toLowerCase()) ||
      conv.lastMessagePreview?.toLowerCase().includes(filters.search.toLowerCase());

    const matchesChannel =
      filters.channel === 'all' || conv.channel === filters.channel;

    const matchesStatus =
      filters.status === 'all' || conv.status === filters.status;

    return matchesSearch && matchesChannel && matchesStatus;
  });
};

const fetchMessages = async (conversationId: string): Promise<Message[]> => {
  await new Promise((resolve) => setTimeout(resolve, 200));

  // TODO: Replace with real API call
  // const response = await apiClient.get<Message[]>(`/conversations/${conversationId}/messages`);
  // return response.data;

  return mockMessages[conversationId] || [];
};

const sendMessage = async (payload: SendMessagePayload): Promise<Message> => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  // TODO: Replace with real API call
  // const response = await apiClient.post<Message>(`/conversations/${payload.conversationId}/messages`, payload);
  // return response.data;

  const newMessage: Message = {
    id: `m${Date.now()}`,
    conversationId: payload.conversationId,
    contactId: 'agent',
    direction: 'outbound',
    type: 'text',
    content: payload.content,
    status: 'sent',
    sentAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Add to mock data
  if (!mockMessages[payload.conversationId]) {
    mockMessages[payload.conversationId] = [];
  }
  mockMessages[payload.conversationId].push(newMessage);

  return newMessage;
};

const updateConversationStatus = async (
  _conversationId: string,
  _status: ConversationStatus
): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  // TODO: Replace with real API call
  // await apiClient.patch(`/conversations/${_conversationId}`, { status: _status });
};

// ============================================================================
// Helper Components & Functions
// ============================================================================

const statusColors: Record<ConversationStatus, string> = {
  active: 'bg-green-500',
  pending: 'bg-yellow-500',
  resolved: 'bg-blue-500',
  escalated: 'bg-red-500',
  closed: 'bg-gray-500',
};

const statusLabels: Record<ConversationStatus, string> = {
  active: 'Attiva',
  pending: 'In attesa',
  resolved: 'Risolta',
  escalated: 'Escalata',
  closed: 'Chiusa',
};

const priorityColors: Record<ConversationPriority, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const priorityLabels: Record<ConversationPriority, string> = {
  low: 'Bassa',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

const channelConfig = {
  whatsapp: { icon: MessageSquare, label: 'WhatsApp', color: 'text-green-600' },
  email: { icon: Mail, label: 'Email', color: 'text-blue-600' },
  web: { icon: Globe, label: 'Web', color: 'text-purple-600' },
  sms: { icon: Phone, label: 'SMS', color: 'text-orange-600' },
};

const getContactInitials = (contact: Contact): string => {
  return `${contact.firstName.charAt(0)}${contact.lastName.charAt(0)}`.toUpperCase();
};

const getContactFullName = (contact: Contact): string => {
  return `${contact.firstName} ${contact.lastName}`;
};

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = diff / (1000 * 60 * 60);

  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60));
    return minutes <= 1 ? 'Adesso' : `${minutes} min fa`;
  } else if (hours < 24) {
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  } else if (hours < 48) {
    return 'Ieri';
  } else {
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
  }
};

const formatMessageTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

// ============================================================================
// Sub-Components
// ============================================================================

interface ConversationListItemProps {
  conversation: ConversationWithContact;
  isSelected: boolean;
  onClick: () => void;
}

function ConversationListItem({
  conversation,
  isSelected,
  onClick,
}: ConversationListItemProps) {
  const ChannelIcon = channelConfig[conversation.channel].icon;
  const channelColor = channelConfig[conversation.channel].color;

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-muted/50 border-b',
        isSelected && 'bg-muted'
      )}
    >
      <div className="relative">
        <Avatar>
          <AvatarImage src={undefined} />
          <AvatarFallback>{getContactInitials(conversation.contact)}</AvatarFallback>
        </Avatar>
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
            statusColors[conversation.status]
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-medium truncate">
            {getContactFullName(conversation.contact)}
          </p>
          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
            {formatTime(conversation.lastMessageAt || conversation.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <ChannelIcon className={cn('h-3 w-3 flex-shrink-0', channelColor)} />
          <p className="text-sm text-muted-foreground truncate">
            {conversation.lastMessagePreview}
          </p>
        </div>
      </div>
      {(conversation.unreadCount ?? 0) > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
          {conversation.unreadCount}
        </span>
      )}
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  contact: Contact;
}

function MessageBubble({ message, contact }: MessageBubbleProps) {
  const isOutbound = message.direction === 'outbound';

  return (
    <div className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}>
      <div className="flex gap-2 max-w-[75%]">
        {!isOutbound && (
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="text-xs">
              {getContactInitials(contact)}
            </AvatarFallback>
          </Avatar>
        )}
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5',
            isOutbound
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted rounded-bl-md'
          )}
        >
          {isOutbound && message.isAiGenerated && (
            <div className="flex items-center gap-1 mb-1">
              <Badge
                variant="secondary"
                className="h-4 px-1.5 text-[10px] bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"
              >
                LEO
              </Badge>
              {message.aiConfidence && (
                <span className="text-[10px] opacity-70">
                  {Math.round(message.aiConfidence * 100)}%
                </span>
              )}
            </div>
          )}
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          <div
            className={cn(
              'flex items-center gap-1 mt-1',
              isOutbound ? 'justify-end' : 'justify-start'
            )}
          >
            <span
              className={cn(
                'text-xs',
                isOutbound ? 'opacity-70' : 'text-muted-foreground'
              )}
            >
              {formatMessageTime(message.sentAt)}
            </span>
            {isOutbound && message.status === 'delivered' && (
              <CheckCircle2 className="h-3 w-3 opacity-70" />
            )}
          </div>
        </div>
        {isOutbound && (
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              OP
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}

interface TypingIndicatorProps {
  contactName: string;
}

function TypingIndicator({ contactName }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
        <span
          className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
          style={{ animationDelay: '0.1s' }}
        />
        <span
          className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"
          style={{ animationDelay: '0.2s' }}
        />
      </div>
      <span className="text-xs text-muted-foreground">
        {contactName} sta scrivendo...
      </span>
    </div>
  );
}

// ============================================================================
// Left Sidebar - Conversation List
// ============================================================================

interface LeftSidebarProps {
  conversations: ConversationWithContact[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  filters: ConversationFilters;
  onFiltersChange: (filters: Partial<ConversationFilters>) => void;
}

function LeftSidebar({
  conversations,
  isLoading,
  selectedId,
  onSelect,
  filters,
  onFiltersChange,
}: LeftSidebarProps) {
  const totalUnread = conversations.reduce(
    (sum, c) => sum + (c.unreadCount ?? 0),
    0
  );

  return (
    <Card className="w-[360px] flex flex-col h-full border-r rounded-none">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Conversazioni</CardTitle>
          {totalUnread > 0 && (
            <Badge variant="default" className="h-6">
              {totalUnread} non lette
            </Badge>
          )}
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca conversazioni..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            className="pl-9"
          />
        </div>

        {/* Channel Filter */}
        <div className="flex gap-2 mt-3">
          <Select
            value={filters.channel}
            onValueChange={(value: ChannelType) =>
              onFiltersChange({ channel: value })
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Canale" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i canali</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="web">Web</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.status}
            onValueChange={(value: ConversationStatus | 'all') =>
              onFiltersChange({ status: value })
            }
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="active">Attive</SelectItem>
              <SelectItem value="pending">In attesa</SelectItem>
              <SelectItem value="escalated">Escalate</SelectItem>
              <SelectItem value="resolved">Risolte</SelectItem>
              <SelectItem value="closed">Chiuse</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Nessuna conversazione trovata</p>
          </div>
        ) : (
          <div className="divide-y">
            {conversations.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedId === conversation.id}
                onClick={() => onSelect(conversation.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Chat Area
// ============================================================================

interface ChatAreaProps {
  conversation: ConversationWithContact | null;
  messages: Message[];
  isLoadingMessages: boolean;
  isTyping: boolean;
  onSendMessage: (content: string) => void;
  isSending: boolean;
}

function ChatArea({
  conversation,
  messages,
  isLoadingMessages,
  isTyping,
  onSendMessage,
  isSending,
}: ChatAreaProps) {
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (conversation) {
      inputRef.current?.focus();
    }
  }, [conversation]);

  const handleSend = () => {
    if (!messageInput.trim() || isSending) return;
    onSendMessage(messageInput.trim());
    setMessageInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conversation) {
    return (
      <Card className="flex-1 flex flex-col rounded-none border-0">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Seleziona una conversazione</p>
            <p className="text-sm mt-1">
              Scegli una conversazione dalla lista per visualizzarla
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const ChannelIcon = channelConfig[conversation.channel].icon;
  const channelLabel = channelConfig[conversation.channel].label;

  return (
    <Card className="flex-1 flex flex-col rounded-none border-0">
      {/* Chat Header */}
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3 border-b flex-shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              {getContactInitials(conversation.contact)}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-base">
              {getContactFullName(conversation.contact)}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ChannelIcon className="h-3 w-3" />
              <span>{channelLabel}</span>
              <span className="text-muted-foreground/50">|</span>
              <span
                className={cn(
                  'inline-flex items-center gap-1',
                  statusColors[conversation.status].replace('bg-', 'text-').replace('500', '600')
                )}
              >
                <span
                  className={cn('h-1.5 w-1.5 rounded-full', statusColors[conversation.status])}
                />
                {statusLabels[conversation.status]}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Phone className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Chiama</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Segna come risolto
              </DropdownMenuItem>
              <DropdownMenuItem>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Escala
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Tag className="h-4 w-4 mr-2" />
                Aggiungi tag
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="h-4 w-4 mr-2" />
                Assegna a...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 overflow-auto p-4 space-y-4">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Nessun messaggio in questa conversazione</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                contact={conversation.contact}
              />
            ))}
            {isTyping && (
              <TypingIndicator
                contactName={getContactFullName(conversation.contact)}
              />
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </CardContent>

      {/* Message Input */}
      <div className="border-t p-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Paperclip className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Allega file</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Input
            ref={inputRef}
            placeholder="Scrivi un messaggio..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!messageInput.trim() || isSending}>
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Invia
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// Right Sidebar - Contact Info & Actions
// ============================================================================

interface RightSidebarProps {
  conversation: ConversationWithContact | null;
  onClose: () => void;
  onStatusChange: (status: ConversationStatus) => void;
}

function RightSidebar({
  conversation,
  onClose,
  onStatusChange,
}: RightSidebarProps) {
  if (!conversation) {
    return null;
  }

  const contact = conversation.contact;

  return (
    <Card className="w-[320px] flex flex-col h-full border-l rounded-none">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3 border-b flex-shrink-0">
        <CardTitle className="text-base">Dettagli</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-4 space-y-6">
        {/* Contact Card */}
        <div className="text-center">
          <Avatar className="h-20 w-20 mx-auto mb-3">
            <AvatarFallback className="text-xl">
              {getContactInitials(contact)}
            </AvatarFallback>
          </Avatar>
          <h3 className="font-semibold text-lg">{getContactFullName(contact)}</h3>
          {contact.tags && contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center mt-2">
              {contact.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Contact Info */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            Informazioni contatto
          </h4>
          {contact.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{contact.phone}</span>
            </div>
          )}
          {contact.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{contact.email}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Cliente dal {formatDate(contact.createdAt)}
            </span>
          </div>
        </div>

        <Separator />

        {/* Conversation Metadata */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            Dettagli conversazione
          </h4>
          <div className="flex items-center gap-3">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-mono">{conversation.id}</span>
          </div>
          <div className="flex items-center gap-3">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{conversation.messageCount} messaggi</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              Creata il {formatDate(conversation.createdAt)}
            </span>
          </div>
          {conversation.subject && (
            <div className="mt-2 p-2 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground mb-1">Oggetto</p>
              <p className="text-sm">{conversation.subject}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Priorita:</span>
            <Badge className={priorityColors[conversation.priority]}>
              {priorityLabels[conversation.priority]}
            </Badge>
          </div>
          {conversation.tags && conversation.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {conversation.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Quick Actions */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Azioni rapide
          </h4>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => onStatusChange('resolved')}
            disabled={conversation.status === 'resolved'}
          >
            <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
            Segna come risolto
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => onStatusChange('escalated')}
            disabled={conversation.status === 'escalated'}
          >
            <ArrowUpRight className="h-4 w-4 mr-2 text-orange-600" />
            Escala
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <Tag className="h-4 w-4 mr-2 text-blue-600" />
            Aggiungi tag
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <User className="h-4 w-4 mr-2 text-purple-600" />
            Assegna a operatore
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Conversations Page Component
// ============================================================================

export function Conversations() {
  const queryClient = useQueryClient();

  // Zustand store
  const {
    selectedConversationId,
    filters,
    isTyping,
    rightSidebarOpen,
    setSelectedConversation,
    setFilters,
    setIsTyping,
    setRightSidebarOpen,
  } = useConversationStore();

  // Fetch conversations
  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
  } = useQuery({
    queryKey: ['conversations', filters],
    queryFn: () => fetchConversations(filters),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get selected conversation
  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId
  ) || null;

  // Fetch messages for selected conversation
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
  } = useQuery({
    queryKey: ['messages', selectedConversationId],
    queryFn: () => fetchMessages(selectedConversationId!),
    enabled: !!selectedConversationId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: sendMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['messages', selectedConversationId],
      });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ conversationId, status }: { conversationId: string; status: ConversationStatus }) =>
      updateConversationStatus(conversationId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const handleSendMessage = useCallback(
    (content: string) => {
      if (!selectedConversationId) return;
      sendMessageMutation.mutate({
        conversationId: selectedConversationId,
        content,
      });
    },
    [selectedConversationId, sendMessageMutation]
  );

  const handleStatusChange = useCallback(
    (status: ConversationStatus) => {
      if (!selectedConversationId) return;
      updateStatusMutation.mutate({
        conversationId: selectedConversationId,
        status,
      });
    },
    [selectedConversationId, updateStatusMutation]
  );

  // Simulate typing indicator occasionally
  useEffect(() => {
    if (selectedConversation && selectedConversation.status === 'active') {
      const interval = setInterval(() => {
        const shouldType = Math.random() > 0.8;
        if (shouldType) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 2000 + Math.random() * 2000);
        }
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation, setIsTyping]);

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="flex h-full border rounded-lg overflow-hidden bg-background">
        {/* Left Sidebar - Conversation List */}
        <LeftSidebar
          conversations={conversations}
          isLoading={isLoadingConversations}
          selectedId={selectedConversationId}
          onSelect={setSelectedConversation}
          filters={filters}
          onFiltersChange={setFilters}
        />

        {/* Main Chat Area */}
        <ChatArea
          conversation={selectedConversation}
          messages={messages}
          isLoadingMessages={isLoadingMessages}
          isTyping={isTyping}
          onSendMessage={handleSendMessage}
          isSending={sendMessageMutation.isPending}
        />

        {/* Right Sidebar - Contact Info */}
        {rightSidebarOpen && selectedConversation && (
          <RightSidebar
            conversation={selectedConversation}
            onClose={() => setRightSidebarOpen(false)}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>
    </div>
  );
}

export default Conversations;
