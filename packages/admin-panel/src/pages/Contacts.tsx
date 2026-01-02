/**
 * LEO Frontend - Contacts Management Page
 *
 * Complete contacts management with:
 * - DataTable with sorting and pagination
 * - Search and filter functionality
 * - Add/Edit contact modal
 * - Contact detail drawer
 * - Delete confirmation
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Plus,
  Mail,
  Phone,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  X,
  MessageSquare,
  Calendar,
  Clock,
  User,
  Building2,
  Tag,
  ExternalLink,
  Loader2,
  AlertCircle,
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
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { DataTable, type Column } from '@/components/ui/data-table';
import { apiClient } from '@/api/client';
import type { Contact as ApiContact, PaginatedResponse } from '@/api/types';

// ============================================================================
// Types
// ============================================================================

/** Extended contact type for UI display */
interface Contact extends ApiContact {
  /** Display name (computed from firstName + lastName) */
  displayName: string;
  /** Avatar initials */
  initials: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Status (computed or from API) */
  status: 'active' | 'inactive';
  /** Notes field for the contact */
  notes?: string;
  /** Company/organization name */
  company?: string;
}

/** Form data for creating/editing contacts */
interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  channel: 'whatsapp' | 'email' | 'web' | 'sms';
  notes: string;
  company: string;
  tags: string[];
}

/** Activity item for timeline */
interface ActivityItem {
  id: string;
  type: 'message' | 'call' | 'email' | 'note' | 'status_change';
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Constants
// ============================================================================

const CHANNEL_CONFIG = {
  whatsapp: {
    label: 'WhatsApp',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    icon: MessageSquare,
  },
  email: {
    label: 'Email',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: Mail,
  },
  web: {
    label: 'Web',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    icon: ExternalLink,
  },
  sms: {
    label: 'SMS',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    icon: Phone,
  },
} as const;

const STATUS_CONFIG = {
  active: {
    label: 'Attivo',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  },
  inactive: {
    label: 'Inattivo',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  },
} as const;

const INITIAL_FORM_DATA: ContactFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  channel: 'whatsapp',
  notes: '',
  company: '',
  tags: [],
};

// ============================================================================
// Mock Data (for development)
// ============================================================================

const mockContacts: Contact[] = [
  {
    id: '1',
    firstName: 'Marco',
    lastName: 'Rossi',
    displayName: 'Marco Rossi',
    email: 'marco.rossi@email.it',
    phone: '+39 333 1234567',
    company: 'Rossi Srl',
    channel: 'whatsapp',
    initials: 'MR',
    status: 'active',
    tags: ['cliente', 'premium'],
    notes: 'Cliente storico, molto affidabile',
    lastContactAt: '2024-12-28T14:30:00Z',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-12-28T14:30:00Z',
  },
  {
    id: '2',
    firstName: 'Laura',
    lastName: 'Bianchi',
    displayName: 'Laura Bianchi',
    email: 'laura.bianchi@email.it',
    phone: '+39 338 7654321',
    company: 'Bianchi & Co',
    channel: 'email',
    initials: 'LB',
    status: 'active',
    tags: ['lead'],
    lastContactAt: '2024-12-27T09:15:00Z',
    createdAt: '2024-02-20T11:00:00Z',
    updatedAt: '2024-12-27T09:15:00Z',
  },
  {
    id: '3',
    firstName: 'Giuseppe',
    lastName: 'Verdi',
    displayName: 'Giuseppe Verdi',
    email: 'giuseppe.verdi@email.it',
    phone: '+39 347 9876543',
    channel: 'web',
    initials: 'GV',
    status: 'active',
    tags: ['cliente'],
    lastContactAt: '2024-12-20T16:45:00Z',
    createdAt: '2024-03-10T14:00:00Z',
    updatedAt: '2024-12-20T16:45:00Z',
  },
  {
    id: '4',
    firstName: 'Anna',
    lastName: 'Ferrari',
    displayName: 'Anna Ferrari',
    email: 'anna.ferrari@company.it',
    phone: '+39 340 5556677',
    company: 'Ferrari SpA',
    channel: 'whatsapp',
    initials: 'AF',
    status: 'active',
    tags: ['cliente', 'enterprise'],
    notes: 'Referente principale per progetti enterprise',
    lastContactAt: '2024-12-25T11:00:00Z',
    createdAt: '2024-04-05T09:00:00Z',
    updatedAt: '2024-12-25T11:00:00Z',
  },
  {
    id: '5',
    firstName: 'Paolo',
    lastName: 'Conti',
    displayName: 'Paolo Conti',
    email: 'paolo.conti@email.it',
    phone: '+39 340 1112233',
    channel: 'sms',
    initials: 'PC',
    status: 'inactive',
    tags: ['lead'],
    lastContactAt: '2024-11-15T10:30:00Z',
    createdAt: '2024-05-12T16:00:00Z',
    updatedAt: '2024-11-15T10:30:00Z',
  },
  {
    id: '6',
    firstName: 'Sofia',
    lastName: 'Romano',
    displayName: 'Sofia Romano',
    email: 'sofia.romano@tech.it',
    phone: '+39 339 4445566',
    company: 'TechRomano',
    channel: 'email',
    initials: 'SR',
    status: 'active',
    tags: ['cliente', 'premium'],
    lastContactAt: '2024-12-26T13:20:00Z',
    createdAt: '2024-06-18T12:00:00Z',
    updatedAt: '2024-12-26T13:20:00Z',
  },
  {
    id: '7',
    firstName: 'Luca',
    lastName: 'Marino',
    displayName: 'Luca Marino',
    email: 'luca.marino@email.it',
    phone: '+39 345 7778899',
    channel: 'whatsapp',
    initials: 'LM',
    status: 'inactive',
    tags: ['prospect'],
    lastContactAt: '2024-10-01T08:45:00Z',
    createdAt: '2024-07-22T15:00:00Z',
    updatedAt: '2024-10-01T08:45:00Z',
  },
  {
    id: '8',
    firstName: 'Elena',
    lastName: 'Greco',
    displayName: 'Elena Greco',
    email: 'elena.greco@greco.it',
    phone: '+39 342 2223344',
    company: 'Greco Design',
    channel: 'web',
    initials: 'EG',
    status: 'active',
    tags: ['cliente'],
    lastContactAt: '2024-12-22T17:30:00Z',
    createdAt: '2024-08-30T10:00:00Z',
    updatedAt: '2024-12-22T17:30:00Z',
  },
];

const mockActivities: ActivityItem[] = [
  {
    id: 'a1',
    type: 'message',
    description: 'Inviato messaggio WhatsApp',
    timestamp: '2024-12-28T14:30:00Z',
  },
  {
    id: 'a2',
    type: 'email',
    description: 'Ricevuta email di conferma ordine',
    timestamp: '2024-12-27T10:15:00Z',
  },
  {
    id: 'a3',
    type: 'call',
    description: 'Chiamata di follow-up completata',
    timestamp: '2024-12-25T11:00:00Z',
  },
  {
    id: 'a4',
    type: 'note',
    description: 'Aggiunta nota: Cliente interessato al nuovo prodotto',
    timestamp: '2024-12-20T09:30:00Z',
  },
  {
    id: 'a5',
    type: 'status_change',
    description: 'Status aggiornato a "Attivo"',
    timestamp: '2024-12-15T14:00:00Z',
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

/** Format date to Italian locale */
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/** Format date with time */
const formatDateTime = (dateString: string | undefined): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Get relative time (e.g., "2 ore fa") */
const getRelativeTime = (dateString: string | undefined): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Adesso';
  if (diffMins < 60) return `${diffMins} min fa`;
  if (diffHours < 24) return `${diffHours} ore fa`;
  if (diffDays < 7) return `${diffDays} giorni fa`;
  return formatDate(dateString);
};

/** Get initials from name */
const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

/** Transform API contact to UI contact */
const transformContact = (contact: ApiContact): Contact => {
  const displayName = `${contact.firstName} ${contact.lastName}`.trim();
  const initials = getInitials(contact.firstName, contact.lastName);
  const daysSinceContact = contact.lastContactAt
    ? Math.floor(
        (new Date().getTime() - new Date(contact.lastContactAt).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 999;
  const status: 'active' | 'inactive' = daysSinceContact < 30 ? 'active' : 'inactive';

  return {
    ...contact,
    displayName,
    initials,
    status,
  };
};

// ============================================================================
// Sub-Components
// ============================================================================

/** Channel badge component */
function ChannelBadge({ channel }: { channel: keyof typeof CHANNEL_CONFIG }) {
  const config = CHANNEL_CONFIG[channel];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn('gap-1', config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

/** Status badge component */
function StatusBadge({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge variant="outline" className={config.color}>
      {config.label}
    </Badge>
  );
}

/** Contact form for Add/Edit modal */
function ContactForm({
  data,
  onChange,
  errors,
}: {
  data: ContactFormData;
  onChange: (data: ContactFormData) => void;
  errors?: Record<string, string>;
}) {
  const handleChange = (field: keyof ContactFormData, value: string | string[]) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      {/* Name fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Nome *</Label>
          <Input
            id="firstName"
            value={data.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            placeholder="Mario"
            className={errors?.firstName ? 'border-destructive' : ''}
          />
          {errors?.firstName && (
            <p className="text-sm text-destructive">{errors.firstName}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Cognome *</Label>
          <Input
            id="lastName"
            value={data.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            placeholder="Rossi"
            className={errors?.lastName ? 'border-destructive' : ''}
          />
          {errors?.lastName && (
            <p className="text-sm text-destructive">{errors.lastName}</p>
          )}
        </div>
      </div>

      {/* Email field */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={data.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="mario.rossi@email.it"
          className={errors?.email ? 'border-destructive' : ''}
        />
        {errors?.email && <p className="text-sm text-destructive">{errors.email}</p>}
      </div>

      {/* Phone field */}
      <div className="space-y-2">
        <Label htmlFor="phone">Telefono</Label>
        <Input
          id="phone"
          type="tel"
          value={data.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          placeholder="+39 333 1234567"
          className={errors?.phone ? 'border-destructive' : ''}
        />
        {errors?.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
      </div>

      {/* Company field */}
      <div className="space-y-2">
        <Label htmlFor="company">Azienda</Label>
        <Input
          id="company"
          value={data.company}
          onChange={(e) => handleChange('company', e.target.value)}
          placeholder="Azienda Srl"
        />
      </div>

      {/* Channel selection */}
      <div className="space-y-2">
        <Label htmlFor="channel">Canale preferito</Label>
        <Select
          value={data.channel}
          onValueChange={(value) =>
            handleChange('channel', value as ContactFormData['channel'])
          }
        >
          <SelectTrigger id="channel">
            <SelectValue placeholder="Seleziona canale" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="web">Web</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notes field */}
      <div className="space-y-2">
        <Label htmlFor="notes">Note</Label>
        <textarea
          id="notes"
          value={data.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Aggiungi note sul contatto..."
          className={cn(
            'flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
            'ring-offset-background placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
        />
      </div>
    </div>
  );
}

/** Modal/Dialog component */
function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative z-50 w-full max-w-lg max-h-[90vh] overflow-auto rounded-lg border bg-background shadow-lg m-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">{children}</div>

        {/* Footer */}
        {footer && <div className="border-t px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

/** Side drawer/panel component */
function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer content */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-background shadow-lg overflow-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/** Activity timeline item */
function ActivityTimelineItem({ activity }: { activity: ActivityItem }) {
  const iconMap: Record<ActivityItem['type'], typeof MessageSquare> = {
    message: MessageSquare,
    call: Phone,
    email: Mail,
    note: Tag,
    status_change: Clock,
  };

  const Icon = iconMap[activity.type];

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 w-px bg-border" />
      </div>
      <div className="flex-1 pb-4">
        <p className="text-sm">{activity.description}</p>
        <p className="text-xs text-muted-foreground">
          {getRelativeTime(activity.timestamp)}
        </p>
      </div>
    </div>
  );
}

/** Delete confirmation dialog */
function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  contactName,
  isDeleting,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  contactName: string;
  isDeleting: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Elimina Contatto"
      description="Questa azione non puo essere annullata."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Annulla
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminazione...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Elimina
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <p className="text-sm">
            Sei sicuro di voler eliminare il contatto{' '}
            <span className="font-semibold">{contactName}</span>?
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Tutti i dati associati a questo contatto verranno eliminati
            permanentemente.
          </p>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Contacts() {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Selected contact
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Form data and validation
  const [formData, setFormData] = useState<ContactFormData>(INITIAL_FORM_DATA);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------
  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try to fetch from API first
      const response = await apiClient.get<PaginatedResponse<ApiContact>>(
        '/contacts'
      );
      const transformedContacts = response.data.data.map(transformContact);
      setContacts(transformedContacts);
    } catch {
      // Fallback to mock data in development
      console.warn('API not available, using mock data');
      setContacts(mockContacts);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // ---------------------------------------------------------------------------
  // Filtered Data
  // ---------------------------------------------------------------------------
  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        contact.displayName.toLowerCase().includes(searchLower) ||
        contact.email?.toLowerCase().includes(searchLower) ||
        contact.phone?.includes(searchQuery);

      // Channel filter
      const matchesChannel =
        channelFilter === 'all' || contact.channel === channelFilter;

      // Status filter
      const matchesStatus =
        statusFilter === 'all' || contact.status === statusFilter;

      return matchesSearch && matchesChannel && matchesStatus;
    });
  }, [contacts, searchQuery, channelFilter, statusFilter]);

  // ---------------------------------------------------------------------------
  // Form Validation
  // ---------------------------------------------------------------------------
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'Il nome e obbligatorio';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Il cognome e obbligatorio';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Inserisci un indirizzo email valido';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleAddContact = () => {
    setFormData(INITIAL_FORM_DATA);
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setFormData({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email || '',
      phone: contact.phone || '',
      channel: contact.channel,
      notes: contact.notes || '',
      company: contact.company || '',
      tags: contact.tags || [],
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleViewContact = (contact: Contact) => {
    setSelectedContact(contact);
    setIsDetailDrawerOpen(true);
  };

  const handleDeleteContact = (contact: Contact) => {
    setSelectedContact(contact);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveContact = async () => {
    if (!validateForm()) return;

    setIsSaving(true);

    try {
      if (isEditModalOpen && selectedContact) {
        // Update existing contact
        await apiClient.put(`/contacts/${selectedContact.id}`, formData);
      } else {
        // Create new contact
        await apiClient.post('/contacts', formData);
      }

      // Refresh the contacts list
      await fetchContacts();

      // Close modals
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedContact(null);
    } catch (err) {
      console.error('Error saving contact:', err);
      // For demo purposes, just close the modal and update local state
      const newContact: Contact = {
        id: `temp-${Date.now()}`,
        firstName: formData.firstName,
        lastName: formData.lastName,
        displayName: `${formData.firstName} ${formData.lastName}`,
        initials: getInitials(formData.firstName, formData.lastName),
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        channel: formData.channel,
        status: 'active',
        notes: formData.notes || undefined,
        company: formData.company || undefined,
        tags: formData.tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (isEditModalOpen && selectedContact) {
        setContacts((prev) =>
          prev.map((c) =>
            c.id === selectedContact.id ? { ...c, ...newContact, id: c.id } : c
          )
        );
      } else {
        setContacts((prev) => [newContact, ...prev]);
      }

      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedContact(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedContact) return;

    setIsDeleting(true);

    try {
      await apiClient.delete(`/contacts/${selectedContact.id}`);
      await fetchContacts();
    } catch {
      // For demo purposes, just remove from local state
      setContacts((prev) => prev.filter((c) => c.id !== selectedContact.id));
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setSelectedContact(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Table Columns
  // ---------------------------------------------------------------------------
  const columns: Column<Contact>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Contatto',
        accessor: (row) => (
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={row.avatarUrl} />
              <AvatarFallback>{row.initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{row.displayName}</p>
              {row.company && (
                <p className="text-sm text-muted-foreground">{row.company}</p>
              )}
            </div>
          </div>
        ),
        sortable: true,
        minWidth: '200px',
      },
      {
        id: 'email',
        header: 'Email',
        accessor: (row) =>
          row.email ? (
            <a
              href={`mailto:${row.email}`}
              className="flex items-center gap-2 text-sm hover:text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="h-4 w-4 text-muted-foreground" />
              {row.email}
            </a>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
        sortable: true,
        minWidth: '180px',
      },
      {
        id: 'phone',
        header: 'Telefono',
        accessor: (row) =>
          row.phone ? (
            <a
              href={`tel:${row.phone}`}
              className="flex items-center gap-2 text-sm hover:text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="h-4 w-4 text-muted-foreground" />
              {row.phone}
            </a>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
        sortable: true,
        minWidth: '150px',
      },
      {
        id: 'channel',
        header: 'Canale',
        accessor: (row) => <ChannelBadge channel={row.channel} />,
        sortable: true,
        minWidth: '120px',
      },
      {
        id: 'status',
        header: 'Stato',
        accessor: (row) => <StatusBadge status={row.status} />,
        sortable: true,
        minWidth: '100px',
      },
      {
        id: 'lastContact',
        header: 'Ultimo Contatto',
        accessor: (row) => (
          <span className="text-sm text-muted-foreground">
            {getRelativeTime(row.lastContactAt)}
          </span>
        ),
        sortable: true,
        minWidth: '130px',
      },
      {
        id: 'actions',
        header: '',
        accessor: (row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewContact(row);
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                Visualizza
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditContact(row);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Modifica
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteContact(row);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Elimina
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        align: 'right',
        minWidth: '60px',
      },
    ],
    []
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">
            Gestisci i tuoi contatti e le relative informazioni
          </p>
        </div>
        <Button onClick={handleAddContact}>
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi Contatto
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome, email o telefono..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Channel filter */}
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[150px]">
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

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="active">Attivi</SelectItem>
                <SelectItem value="inactive">Inattivi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-4 p-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchContacts}
              className="ml-auto"
            >
              Riprova
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista Contatti</CardTitle>
          <CardDescription>
            {filteredContacts.length} contatti trovati
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={filteredContacts}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="Nessun contatto trovato"
            onRowClick={handleViewContact}
            getRowId={(row) => row.id}
            showPagination
            pageSize={10}
            pageSizeOptions={[5, 10, 25, 50]}
          />
        </CardContent>
      </Card>

      {/* Add Contact Modal */}
      <Modal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Aggiungi Contatto"
        description="Inserisci i dati del nuovo contatto"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSaving}
            >
              Annulla
            </Button>
            <Button onClick={handleSaveContact} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                'Salva Contatto'
              )}
            </Button>
          </div>
        }
      >
        <ContactForm
          data={formData}
          onChange={setFormData}
          errors={formErrors}
        />
      </Modal>

      {/* Edit Contact Modal */}
      <Modal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modifica Contatto"
        description="Modifica i dati del contatto"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSaving}
            >
              Annulla
            </Button>
            <Button onClick={handleSaveContact} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                'Salva Modifiche'
              )}
            </Button>
          </div>
        }
      >
        <ContactForm
          data={formData}
          onChange={setFormData}
          errors={formErrors}
        />
      </Modal>

      {/* Contact Detail Drawer */}
      <Drawer
        open={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        title="Dettagli Contatto"
      >
        {selectedContact && (
          <div className="space-y-6">
            {/* Contact Header */}
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={selectedContact.avatarUrl} />
                <AvatarFallback className="text-xl">
                  {selectedContact.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">
                  {selectedContact.displayName}
                </h3>
                {selectedContact.company && (
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {selectedContact.company}
                  </p>
                )}
                <div className="flex gap-2 mt-2">
                  <ChannelBadge channel={selectedContact.channel} />
                  <StatusBadge status={selectedContact.status} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Contact Info */}
            <div className="space-y-4">
              <h4 className="font-medium">Informazioni di Contatto</h4>

              {selectedContact.email && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <a
                      href={`mailto:${selectedContact.email}`}
                      className="text-sm hover:text-primary"
                    >
                      {selectedContact.email}
                    </a>
                  </div>
                </div>
              )}

              {selectedContact.phone && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefono</p>
                    <a
                      href={`tel:${selectedContact.phone}`}
                      className="text-sm hover:text-primary"
                    >
                      {selectedContact.phone}
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Ultimo contatto
                  </p>
                  <p className="text-sm">
                    {formatDateTime(selectedContact.lastContactAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Creato il</p>
                  <p className="text-sm">
                    {formatDate(selectedContact.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Tags */}
            {selectedContact.tags && selectedContact.tags.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">Tag</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedContact.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            {selectedContact.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">Note</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedContact.notes}
                  </p>
                </div>
              </>
            )}

            <Separator />

            {/* Conversation History Link */}
            <div className="space-y-2">
              <h4 className="font-medium">Conversazioni</h4>
              <Button variant="outline" className="w-full" asChild>
                <a href={`/conversations?contactId=${selectedContact.id}`}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Visualizza Conversazioni
                </a>
              </Button>
            </div>

            <Separator />

            {/* Activity Timeline */}
            <div className="space-y-4">
              <h4 className="font-medium">Attivita Recenti</h4>
              <div className="space-y-0">
                {mockActivities.map((activity) => (
                  <ActivityTimelineItem key={activity.id} activity={activity} />
                ))}
              </div>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsDetailDrawerOpen(false);
                  handleEditContact(selectedContact);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Modifica
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setIsDetailDrawerOpen(false);
                  handleDeleteContact(selectedContact);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Elimina
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        contactName={selectedContact?.displayName || ''}
        isDeleting={isDeleting}
      />
    </div>
  );
}

export default Contacts;
