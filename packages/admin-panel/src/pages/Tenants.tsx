/**
 * LEO Frontend - Tenants Management Page
 *
 * Complete tenant management with:
 * - DataTable with sorting and pagination
 * - Search and filter functionality
 * - Add/Edit tenant modal
 * - Tenant detail drawer with usage stats
 * - Feature toggles and limit configuration
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
  Building2,
  Users,
  MessageSquare,
  HardDrive,
  Bot,
  Globe,
  Crown,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Settings,
  Copy,
  ExternalLink,
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
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
import type {
  Tenant,
  TenantStatus,
  TenantPlan,
  TenantLimits,
  TenantFeatures,
  PaginatedResponse,
} from '@/api/types';

// ============================================================================
// Types
// ============================================================================

interface TenantFormData {
  name: string;
  slug: string;
  domain: string;
  plan: TenantPlan;
  contactEmail: string;
  contactPhone: string;
  address: string;
  vatNumber: string;
  timezone: string;
  language: string;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_CONFIG: Record<TenantStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  active: {
    label: 'Attivo',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
    icon: CheckCircle,
  },
  trial: {
    label: 'Trial',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: Clock,
  },
  suspended: {
    label: 'Sospeso',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    icon: AlertCircle,
  },
  cancelled: {
    label: 'Cancellato',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: XCircle,
  },
};

const PLAN_CONFIG: Record<TenantPlan, { label: string; color: string; icon: typeof Crown }> = {
  free: {
    label: 'Free',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    icon: Zap,
  },
  starter: {
    label: 'Starter',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: Zap,
  },
  professional: {
    label: 'Professional',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    icon: Crown,
  },
  enterprise: {
    label: 'Enterprise',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    icon: Crown,
  },
};

const DEFAULT_LIMITS: Record<TenantPlan, TenantLimits> = {
  free: {
    maxUsers: 2,
    maxContacts: 100,
    maxConversationsPerMonth: 500,
    maxAgents: 1,
    maxStorageGb: 1,
  },
  starter: {
    maxUsers: 5,
    maxContacts: 1000,
    maxConversationsPerMonth: 5000,
    maxAgents: 2,
    maxStorageGb: 5,
  },
  professional: {
    maxUsers: 20,
    maxContacts: 10000,
    maxConversationsPerMonth: 50000,
    maxAgents: 5,
    maxStorageGb: 25,
  },
  enterprise: {
    maxUsers: 100,
    maxContacts: 100000,
    maxConversationsPerMonth: 500000,
    maxAgents: 20,
    maxStorageGb: 100,
  },
};

const DEFAULT_FEATURES: Record<TenantPlan, TenantFeatures> = {
  free: {
    whatsapp: false,
    email: true,
    sms: false,
    webWidget: true,
    aiAssistant: false,
    customPrompts: false,
    analytics: false,
    apiAccess: false,
    webhooks: false,
    multiLanguage: false,
  },
  starter: {
    whatsapp: true,
    email: true,
    sms: false,
    webWidget: true,
    aiAssistant: true,
    customPrompts: false,
    analytics: true,
    apiAccess: false,
    webhooks: false,
    multiLanguage: false,
  },
  professional: {
    whatsapp: true,
    email: true,
    sms: true,
    webWidget: true,
    aiAssistant: true,
    customPrompts: true,
    analytics: true,
    apiAccess: true,
    webhooks: true,
    multiLanguage: true,
  },
  enterprise: {
    whatsapp: true,
    email: true,
    sms: true,
    webWidget: true,
    aiAssistant: true,
    customPrompts: true,
    analytics: true,
    apiAccess: true,
    webhooks: true,
    multiLanguage: true,
  },
};

const INITIAL_FORM_DATA: TenantFormData = {
  name: '',
  slug: '',
  domain: '',
  plan: 'starter',
  contactEmail: '',
  contactPhone: '',
  address: '',
  vatNumber: '',
  timezone: 'Europe/Rome',
  language: 'it',
};

// ============================================================================
// Mock Data
// ============================================================================

const mockTenants: Tenant[] = [
  {
    id: '1',
    name: 'Acme Corporation',
    slug: 'acme-corp',
    domain: 'acme.example.com',
    status: 'active',
    plan: 'enterprise',
    limits: DEFAULT_LIMITS.enterprise,
    features: DEFAULT_FEATURES.enterprise,
    usage: {
      currentUsers: 45,
      currentContacts: 25000,
      conversationsThisMonth: 12500,
      activeAgents: 8,
      storageUsedGb: 35.5,
    },
    ownerId: 'user-1',
    contactEmail: 'admin@acme.com',
    contactPhone: '+39 02 1234567',
    address: 'Via Roma 1, Milano',
    vatNumber: 'IT12345678901',
    timezone: 'Europe/Rome',
    language: 'it',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-12-28T14:30:00Z',
  },
  {
    id: '2',
    name: 'TechStart Srl',
    slug: 'techstart',
    status: 'active',
    plan: 'professional',
    limits: DEFAULT_LIMITS.professional,
    features: DEFAULT_FEATURES.professional,
    usage: {
      currentUsers: 12,
      currentContacts: 5500,
      conversationsThisMonth: 8200,
      activeAgents: 3,
      storageUsedGb: 12.3,
    },
    ownerId: 'user-2',
    contactEmail: 'info@techstart.it',
    contactPhone: '+39 06 9876543',
    timezone: 'Europe/Rome',
    language: 'it',
    createdAt: '2024-03-20T09:00:00Z',
    updatedAt: '2024-12-27T11:15:00Z',
  },
  {
    id: '3',
    name: 'Green Solutions',
    slug: 'green-solutions',
    status: 'trial',
    plan: 'starter',
    limits: DEFAULT_LIMITS.starter,
    features: DEFAULT_FEATURES.starter,
    usage: {
      currentUsers: 3,
      currentContacts: 250,
      conversationsThisMonth: 180,
      activeAgents: 1,
      storageUsedGb: 0.8,
    },
    ownerId: 'user-3',
    contactEmail: 'hello@greensolutions.eu',
    timezone: 'Europe/Rome',
    language: 'it',
    createdAt: '2024-12-01T14:00:00Z',
    updatedAt: '2024-12-26T16:45:00Z',
    trialEndsAt: '2025-01-01T00:00:00Z',
  },
  {
    id: '4',
    name: 'Local Shop',
    slug: 'local-shop',
    status: 'active',
    plan: 'free',
    limits: DEFAULT_LIMITS.free,
    features: DEFAULT_FEATURES.free,
    usage: {
      currentUsers: 1,
      currentContacts: 45,
      conversationsThisMonth: 120,
      activeAgents: 0,
      storageUsedGb: 0.2,
    },
    ownerId: 'user-4',
    contactEmail: 'owner@localshop.it',
    timezone: 'Europe/Rome',
    language: 'it',
    createdAt: '2024-06-10T08:00:00Z',
    updatedAt: '2024-12-20T10:30:00Z',
  },
  {
    id: '5',
    name: 'Suspended Co',
    slug: 'suspended-co',
    status: 'suspended',
    plan: 'starter',
    limits: DEFAULT_LIMITS.starter,
    features: DEFAULT_FEATURES.starter,
    ownerId: 'user-5',
    contactEmail: 'billing@suspended.co',
    timezone: 'Europe/Rome',
    language: 'it',
    createdAt: '2024-02-28T12:00:00Z',
    updatedAt: '2024-11-15T09:00:00Z',
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatNumber = (num: number | undefined): string => {
  if (num === undefined) return '-';
  return new Intl.NumberFormat('it-IT').format(num);
};

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const calculateUsagePercent = (used: number, max: number): number => {
  if (max === 0) return 0;
  return Math.min(100, Math.round((used / max) * 100));
};

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: TenantStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn('gap-1', config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function PlanBadge({ plan }: { plan: TenantPlan }) {
  const config = PLAN_CONFIG[plan];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn('gap-1', config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function UsageBar({
  label,
  used,
  max,
  icon: Icon,
  unit,
}: {
  label: string;
  used: number;
  max: number;
  icon: typeof Users;
  unit?: string;
}) {
  const percent = calculateUsagePercent(used, max);
  const isWarning = percent >= 80;
  const isCritical = percent >= 95;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          {label}
        </span>
        <span className={cn(isCritical && 'text-destructive', isWarning && !isCritical && 'text-amber-600')}>
          {formatNumber(used)}{unit} / {formatNumber(max)}{unit}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isCritical ? 'bg-destructive' : isWarning ? 'bg-amber-500' : 'bg-primary'
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function TenantForm({
  data,
  onChange,
  errors,
  isEditing,
}: {
  data: TenantFormData;
  onChange: (data: TenantFormData) => void;
  errors?: Record<string, string>;
  isEditing?: boolean;
}) {
  const handleChange = (field: keyof TenantFormData, value: string) => {
    const updates: Partial<TenantFormData> = { [field]: value };

    // Auto-generate slug from name
    if (field === 'name' && !isEditing) {
      updates.slug = generateSlug(value);
    }

    onChange({ ...data, ...updates });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome Tenant *</Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Acme Corporation"
            className={errors?.name ? 'border-destructive' : ''}
          />
          {errors?.name && <p className="text-sm text-destructive">{errors.name}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            value={data.slug}
            onChange={(e) => handleChange('slug', e.target.value)}
            placeholder="acme-corp"
            className={errors?.slug ? 'border-destructive' : ''}
            disabled={isEditing}
          />
          {errors?.slug && <p className="text-sm text-destructive">{errors.slug}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contactEmail">Email Contatto *</Label>
          <Input
            id="contactEmail"
            type="email"
            value={data.contactEmail}
            onChange={(e) => handleChange('contactEmail', e.target.value)}
            placeholder="admin@acme.com"
            className={errors?.contactEmail ? 'border-destructive' : ''}
          />
          {errors?.contactEmail && <p className="text-sm text-destructive">{errors.contactEmail}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="contactPhone">Telefono</Label>
          <Input
            id="contactPhone"
            value={data.contactPhone}
            onChange={(e) => handleChange('contactPhone', e.target.value)}
            placeholder="+39 02 1234567"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="domain">Dominio Personalizzato</Label>
          <Input
            id="domain"
            value={data.domain}
            onChange={(e) => handleChange('domain', e.target.value)}
            placeholder="support.acme.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plan">Piano</Label>
          <Select value={data.plan} onValueChange={(v) => handleChange('plan', v)}>
            <SelectTrigger id="plan">
              <SelectValue placeholder="Seleziona piano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Indirizzo</Label>
        <Input
          id="address"
          value={data.address}
          onChange={(e) => handleChange('address', e.target.value)}
          placeholder="Via Roma 1, 20100 Milano"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="vatNumber">Partita IVA</Label>
          <Input
            id="vatNumber"
            value={data.vatNumber}
            onChange={(e) => handleChange('vatNumber', e.target.value)}
            placeholder="IT12345678901"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Fuso Orario</Label>
          <Select value={data.timezone} onValueChange={(v) => handleChange('timezone', v)}>
            <SelectTrigger id="timezone">
              <SelectValue placeholder="Seleziona fuso orario" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Europe/Rome">Europe/Rome (CET)</SelectItem>
              <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
              <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
              <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
      <div className={cn(
        'relative z-50 w-full max-h-[90vh] overflow-auto rounded-lg border bg-background shadow-lg m-4',
        sizeClasses[size]
      )}>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-6 py-4">{children}</div>
        {footer && <div className="border-t px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

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
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-background shadow-lg overflow-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function FeatureToggle({
  label,
  enabled,
  onChange,
  disabled,
}: {
  label: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm">{label}</span>
      <Switch checked={enabled} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  tenantName,
  isDeleting,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tenantName: string;
  isDeleting: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Elimina Tenant"
      description="Questa azione non puo essere annullata."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Annulla
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
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
            Sei sicuro di voler eliminare il tenant <span className="font-semibold">{tenantName}</span>?
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Tutti i dati, utenti e conversazioni associati verranno eliminati permanentemente.
          </p>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Tenants() {
  // State
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isFeaturesModalOpen, setIsFeaturesModalOpen] = useState(false);

  // Selected tenant
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  // Form data and validation
  const [formData, setFormData] = useState<TenantFormData>(INITIAL_FORM_DATA);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Feature editing
  const [editingFeatures, setEditingFeatures] = useState<TenantFeatures | null>(null);

  // Data Fetching
  const fetchTenants = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<PaginatedResponse<Tenant>>('/tenants');
      setTenants(response.data.data);
    } catch {
      console.warn('API not available, using mock data');
      setTenants(mockTenants);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // Filtered Data
  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        tenant.name.toLowerCase().includes(searchLower) ||
        tenant.slug.toLowerCase().includes(searchLower) ||
        tenant.contactEmail.toLowerCase().includes(searchLower);

      const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
      const matchesPlan = planFilter === 'all' || tenant.plan === planFilter;

      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [tenants, searchQuery, statusFilter, planFilter]);

  // Form Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Il nome e obbligatorio';
    }

    if (!formData.slug.trim()) {
      errors.slug = 'Lo slug e obbligatorio';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      errors.slug = 'Lo slug puo contenere solo lettere minuscole, numeri e trattini';
    }

    if (!formData.contactEmail.trim()) {
      errors.contactEmail = 'L\'email e obbligatoria';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      errors.contactEmail = 'Inserisci un indirizzo email valido';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handlers
  const handleAddTenant = () => {
    setFormData(INITIAL_FORM_DATA);
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const handleEditTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setFormData({
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain || '',
      plan: tenant.plan,
      contactEmail: tenant.contactEmail,
      contactPhone: tenant.contactPhone || '',
      address: tenant.address || '',
      vatNumber: tenant.vatNumber || '',
      timezone: tenant.timezone,
      language: tenant.language,
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const handleViewTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsDetailDrawerOpen(true);
  };

  const handleDeleteTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsDeleteDialogOpen(true);
  };

  const handleEditFeatures = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setEditingFeatures({ ...tenant.features });
    setIsFeaturesModalOpen(true);
  };

  const handleSaveTenant = async () => {
    if (!validateForm()) return;

    setIsSaving(true);

    try {
      const payload = {
        ...formData,
        limits: DEFAULT_LIMITS[formData.plan],
        features: DEFAULT_FEATURES[formData.plan],
      };

      if (isEditModalOpen && selectedTenant) {
        await apiClient.put(`/tenants/${selectedTenant.id}`, payload);
      } else {
        await apiClient.post('/tenants', payload);
      }

      await fetchTenants();
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedTenant(null);
    } catch (err) {
      console.error('Error saving tenant:', err);
      // For demo, update local state
      const newTenant: Tenant = {
        id: `temp-${Date.now()}`,
        name: formData.name,
        slug: formData.slug,
        domain: formData.domain || undefined,
        status: 'active',
        plan: formData.plan,
        limits: DEFAULT_LIMITS[formData.plan],
        features: DEFAULT_FEATURES[formData.plan],
        ownerId: 'current-user',
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone || undefined,
        address: formData.address || undefined,
        vatNumber: formData.vatNumber || undefined,
        timezone: formData.timezone,
        language: formData.language,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (isEditModalOpen && selectedTenant) {
        setTenants((prev) =>
          prev.map((t) => (t.id === selectedTenant.id ? { ...t, ...newTenant, id: t.id } : t))
        );
      } else {
        setTenants((prev) => [newTenant, ...prev]);
      }

      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedTenant(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveFeatures = async () => {
    if (!selectedTenant || !editingFeatures) return;

    setIsSaving(true);
    try {
      await apiClient.put(`/tenants/${selectedTenant.id}`, { features: editingFeatures });
      await fetchTenants();
    } catch {
      // Update local state for demo
      setTenants((prev) =>
        prev.map((t) =>
          t.id === selectedTenant.id ? { ...t, features: editingFeatures } : t
        )
      );
    } finally {
      setIsSaving(false);
      setIsFeaturesModalOpen(false);
      setEditingFeatures(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedTenant) return;

    setIsDeleting(true);
    try {
      await apiClient.delete(`/tenants/${selectedTenant.id}`);
      await fetchTenants();
    } catch {
      setTenants((prev) => prev.filter((t) => t.id !== selectedTenant.id));
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setSelectedTenant(null);
    }
  };

  const handleCopySlug = (slug: string) => {
    navigator.clipboard.writeText(slug);
  };

  // Table Columns
  const columns: Column<Tenant>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Tenant',
        accessor: (row) => (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold">
              {row.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{row.name}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                {row.slug}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopySlug(row.slug);
                  }}
                  className="hover:text-primary"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </p>
            </div>
          </div>
        ),
        sortable: true,
        minWidth: '200px',
      },
      {
        id: 'plan',
        header: 'Piano',
        accessor: (row) => <PlanBadge plan={row.plan} />,
        sortable: true,
        minWidth: '120px',
      },
      {
        id: 'status',
        header: 'Stato',
        accessor: (row) => <StatusBadge status={row.status} />,
        sortable: true,
        minWidth: '120px',
      },
      {
        id: 'users',
        header: 'Utenti',
        accessor: (row) => (
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>
              {row.usage?.currentUsers ?? 0} / {row.limits.maxUsers}
            </span>
          </div>
        ),
        sortable: true,
        minWidth: '100px',
      },
      {
        id: 'contacts',
        header: 'Contatti',
        accessor: (row) => (
          <span className="text-sm">
            {formatNumber(row.usage?.currentContacts ?? 0)}
          </span>
        ),
        sortable: true,
        minWidth: '100px',
      },
      {
        id: 'createdAt',
        header: 'Creato',
        accessor: (row) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.createdAt)}
          </span>
        ),
        sortable: true,
        minWidth: '120px',
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
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewTenant(row); }}>
                <Eye className="mr-2 h-4 w-4" />
                Visualizza
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditTenant(row); }}>
                <Pencil className="mr-2 h-4 w-4" />
                Modifica
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditFeatures(row); }}>
                <Settings className="mr-2 h-4 w-4" />
                Features
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); handleDeleteTenant(row); }}
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

  // Render
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground">
            Gestisci i tenant e le relative configurazioni
          </p>
        </div>
        <Button onClick={handleAddTenant}>
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Tenant
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tenants.length}</p>
                <p className="text-sm text-muted-foreground">Totale Tenant</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {tenants.filter((t) => t.status === 'active').length}
                </p>
                <p className="text-sm text-muted-foreground">Attivi</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {tenants.filter((t) => t.status === 'trial').length}
                </p>
                <p className="text-sm text-muted-foreground">In Trial</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                <Crown className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {tenants.filter((t) => t.plan === 'enterprise').length}
                </p>
                <p className="text-sm text-muted-foreground">Enterprise</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome, slug o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="active">Attivi</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="suspended">Sospesi</SelectItem>
                <SelectItem value="cancelled">Cancellati</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Piano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i piani</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
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
            <Button variant="outline" size="sm" onClick={fetchTenants} className="ml-auto">
              Riprova
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tenants Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista Tenant</CardTitle>
          <CardDescription>{filteredTenants.length} tenant trovati</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={filteredTenants}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="Nessun tenant trovato"
            onRowClick={handleViewTenant}
            getRowId={(row) => row.id}
            showPagination
            pageSize={10}
            pageSizeOptions={[5, 10, 25, 50]}
          />
        </CardContent>
      </Card>

      {/* Add Tenant Modal */}
      <Modal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Nuovo Tenant"
        description="Crea un nuovo tenant nella piattaforma"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isSaving}>
              Annulla
            </Button>
            <Button onClick={handleSaveTenant} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creazione...
                </>
              ) : (
                'Crea Tenant'
              )}
            </Button>
          </div>
        }
      >
        <TenantForm data={formData} onChange={setFormData} errors={formErrors} />
      </Modal>

      {/* Edit Tenant Modal */}
      <Modal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modifica Tenant"
        description="Modifica i dati del tenant"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isSaving}>
              Annulla
            </Button>
            <Button onClick={handleSaveTenant} disabled={isSaving}>
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
        <TenantForm data={formData} onChange={setFormData} errors={formErrors} isEditing />
      </Modal>

      {/* Features Modal */}
      <Modal
        open={isFeaturesModalOpen}
        onClose={() => setIsFeaturesModalOpen(false)}
        title="Configura Features"
        description={`Abilita/disabilita le funzionalita per ${selectedTenant?.name}`}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsFeaturesModalOpen(false)} disabled={isSaving}>
              Annulla
            </Button>
            <Button onClick={handleSaveFeatures} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                'Salva Features'
              )}
            </Button>
          </div>
        }
      >
        {editingFeatures && (
          <div className="space-y-1">
            <h4 className="font-medium mb-3">Canali</h4>
            <FeatureToggle
              label="WhatsApp Business"
              enabled={editingFeatures.whatsapp}
              onChange={(v) => setEditingFeatures({ ...editingFeatures, whatsapp: v })}
            />
            <FeatureToggle
              label="Email"
              enabled={editingFeatures.email}
              onChange={(v) => setEditingFeatures({ ...editingFeatures, email: v })}
            />
            <FeatureToggle
              label="SMS"
              enabled={editingFeatures.sms}
              onChange={(v) => setEditingFeatures({ ...editingFeatures, sms: v })}
            />
            <FeatureToggle
              label="Web Widget"
              enabled={editingFeatures.webWidget}
              onChange={(v) => setEditingFeatures({ ...editingFeatures, webWidget: v })}
            />
            <Separator className="my-4" />
            <h4 className="font-medium mb-3">Funzionalita AI</h4>
            <FeatureToggle
              label="Assistente AI"
              enabled={editingFeatures.aiAssistant}
              onChange={(v) => setEditingFeatures({ ...editingFeatures, aiAssistant: v })}
            />
            <FeatureToggle
              label="Prompt Personalizzati"
              enabled={editingFeatures.customPrompts}
              onChange={(v) => setEditingFeatures({ ...editingFeatures, customPrompts: v })}
            />
            <Separator className="my-4" />
            <h4 className="font-medium mb-3">Integrazioni</h4>
            <FeatureToggle
              label="Analytics"
              enabled={editingFeatures.analytics}
              onChange={(v) => setEditingFeatures({ ...editingFeatures, analytics: v })}
            />
            <FeatureToggle
              label="Accesso API"
              enabled={editingFeatures.apiAccess}
              onChange={(v) => setEditingFeatures({ ...editingFeatures, apiAccess: v })}
            />
            <FeatureToggle
              label="Webhooks"
              enabled={editingFeatures.webhooks}
              onChange={(v) => setEditingFeatures({ ...editingFeatures, webhooks: v })}
            />
            <FeatureToggle
              label="Multi-lingua"
              enabled={editingFeatures.multiLanguage}
              onChange={(v) => setEditingFeatures({ ...editingFeatures, multiLanguage: v })}
            />
          </div>
        )}
      </Modal>

      {/* Tenant Detail Drawer */}
      <Drawer
        open={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        title="Dettagli Tenant"
      >
        {selectedTenant && (
          <div className="space-y-6">
            {/* Tenant Header */}
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary text-2xl font-bold">
                {selectedTenant.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{selectedTenant.name}</h3>
                <p className="text-muted-foreground flex items-center gap-1">
                  {selectedTenant.slug}
                  {selectedTenant.domain && (
                    <>
                      <span className="mx-1">|</span>
                      <a href={`https://${selectedTenant.domain}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
                        <Globe className="h-3 w-3" />
                        {selectedTenant.domain}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </>
                  )}
                </p>
                <div className="flex gap-2 mt-2">
                  <PlanBadge plan={selectedTenant.plan} />
                  <StatusBadge status={selectedTenant.status} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Usage Stats */}
            {selectedTenant.usage && (
              <>
                <div className="space-y-4">
                  <h4 className="font-medium">Utilizzo Risorse</h4>
                  <UsageBar
                    label="Utenti"
                    used={selectedTenant.usage.currentUsers}
                    max={selectedTenant.limits.maxUsers}
                    icon={Users}
                  />
                  <UsageBar
                    label="Contatti"
                    used={selectedTenant.usage.currentContacts}
                    max={selectedTenant.limits.maxContacts}
                    icon={MessageSquare}
                  />
                  <UsageBar
                    label="Conversazioni/mese"
                    used={selectedTenant.usage.conversationsThisMonth}
                    max={selectedTenant.limits.maxConversationsPerMonth}
                    icon={MessageSquare}
                  />
                  <UsageBar
                    label="Agenti AI"
                    used={selectedTenant.usage.activeAgents}
                    max={selectedTenant.limits.maxAgents}
                    icon={Bot}
                  />
                  <UsageBar
                    label="Storage"
                    used={selectedTenant.usage.storageUsedGb}
                    max={selectedTenant.limits.maxStorageGb}
                    icon={HardDrive}
                    unit=" GB"
                  />
                </div>
                <Separator />
              </>
            )}

            {/* Contact Info */}
            <div className="space-y-4">
              <h4 className="font-medium">Informazioni Contatto</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <a href={`mailto:${selectedTenant.contactEmail}`} className="text-sm hover:text-primary">
                      {selectedTenant.contactEmail}
                    </a>
                  </div>
                </div>
                {selectedTenant.contactPhone && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Telefono</p>
                      <a href={`tel:${selectedTenant.contactPhone}`} className="text-sm hover:text-primary">
                        {selectedTenant.contactPhone}
                      </a>
                    </div>
                  </div>
                )}
                {selectedTenant.address && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Indirizzo</p>
                      <p className="text-sm">{selectedTenant.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Features */}
            <div className="space-y-3">
              <h4 className="font-medium">Features Attive</h4>
              <div className="flex flex-wrap gap-2">
                {selectedTenant.features.whatsapp && <Badge variant="outline">WhatsApp</Badge>}
                {selectedTenant.features.email && <Badge variant="outline">Email</Badge>}
                {selectedTenant.features.sms && <Badge variant="outline">SMS</Badge>}
                {selectedTenant.features.webWidget && <Badge variant="outline">Web Widget</Badge>}
                {selectedTenant.features.aiAssistant && <Badge variant="outline">AI Assistant</Badge>}
                {selectedTenant.features.customPrompts && <Badge variant="outline">Custom Prompts</Badge>}
                {selectedTenant.features.analytics && <Badge variant="outline">Analytics</Badge>}
                {selectedTenant.features.apiAccess && <Badge variant="outline">API Access</Badge>}
                {selectedTenant.features.webhooks && <Badge variant="outline">Webhooks</Badge>}
                {selectedTenant.features.multiLanguage && <Badge variant="outline">Multi-lingua</Badge>}
              </div>
            </div>

            <Separator />

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Creato il</p>
                <p>{formatDate(selectedTenant.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ultimo aggiornamento</p>
                <p>{formatDate(selectedTenant.updatedAt)}</p>
              </div>
              {selectedTenant.trialEndsAt && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Fine Trial</p>
                  <p className="text-amber-600">{formatDate(selectedTenant.trialEndsAt)}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsDetailDrawerOpen(false);
                  handleEditTenant(selectedTenant);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Modifica
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDetailDrawerOpen(false);
                  handleEditFeatures(selectedTenant);
                }}
              >
                <Settings className="mr-2 h-4 w-4" />
                Features
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setIsDetailDrawerOpen(false);
                  handleDeleteTenant(selectedTenant);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        tenantName={selectedTenant?.name || ''}
        isDeleting={isDeleting}
      />
    </div>
  );
}

export default Tenants;
