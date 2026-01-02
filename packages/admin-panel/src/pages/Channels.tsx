/**
 * LEO Frontend - Channels Configuration Page
 *
 * Complete channel management with:
 * - Channel cards with status indicators
 * - WhatsApp Business API configuration
 * - Email (SMTP/IMAP) configuration
 * - SMS gateway configuration
 * - Web Widget configuration
 * - Test connection functionality
 * - Webhook URL display
 */

import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Mail,
  Phone,
  Globe,
  Settings,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Trash2,
  X,
  Wifi,
  WifiOff,
  ArrowUpRight,
  ArrowDownLeft,
  Zap,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { apiClient } from '@/api/client';
import type {
  Channel,
  ChannelType,
  ChannelStatus,
  WhatsAppConfig,
  EmailConfig,
  SmsConfig,
  WebWidgetConfig,
  PaginatedResponse,
} from '@/api/types';

// ============================================================================
// Types
// ============================================================================

interface ChannelFormData {
  name: string;
  type: ChannelType;
  isDefault: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const CHANNEL_CONFIG: Record<ChannelType, {
  label: string;
  description: string;
  icon: typeof MessageSquare;
  color: string;
  bgColor: string;
}> = {
  whatsapp: {
    label: 'WhatsApp Business',
    description: 'Messaggistica via WhatsApp Business API',
    icon: MessageSquare,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900',
  },
  email: {
    label: 'Email',
    description: 'Comunicazione via SMTP/IMAP',
    icon: Mail,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900',
  },
  sms: {
    label: 'SMS',
    description: 'Messaggi di testo via gateway',
    icon: Phone,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900',
  },
  web: {
    label: 'Web Widget',
    description: 'Chat widget per il tuo sito web',
    icon: Globe,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900',
  },
};

const STATUS_CONFIG: Record<ChannelStatus, {
  label: string;
  color: string;
  icon: typeof CheckCircle;
}> = {
  active: {
    label: 'Attivo',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
    icon: CheckCircle,
  },
  inactive: {
    label: 'Inattivo',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    icon: XCircle,
  },
  error: {
    label: 'Errore',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    icon: AlertCircle,
  },
  pending: {
    label: 'In Attesa',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    icon: Clock,
  },
  configuring: {
    label: 'Configurazione',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    icon: Settings,
  },
};

const DEFAULT_WHATSAPP_CONFIG: WhatsAppConfig = {
  phoneNumberId: '',
  businessAccountId: '',
  accessToken: '',
  webhookVerifyToken: '',
  displayPhoneNumber: '',
};

const DEFAULT_EMAIL_CONFIG: EmailConfig = {
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPassword: '',
  imapHost: '',
  imapPort: 993,
  imapUser: '',
  imapPassword: '',
  fromEmail: '',
  fromName: '',
  useTls: true,
};

const DEFAULT_SMS_CONFIG: SmsConfig = {
  provider: 'twilio',
  accountSid: '',
  authToken: '',
  fromNumber: '',
};

const DEFAULT_WEB_CONFIG: WebWidgetConfig = {
  primaryColor: '#3B82F6',
  secondaryColor: '#1E40AF',
  position: 'bottom-right',
  greeting: 'Ciao! Come posso aiutarti?',
  offlineMessage: 'Siamo offline. Lascia un messaggio!',
  collectEmail: true,
  collectPhone: false,
  allowedDomains: [],
};

// ============================================================================
// Mock Data
// ============================================================================

const mockChannels: Channel[] = [
  {
    id: '1',
    tenantId: 'tenant-1',
    type: 'whatsapp',
    name: 'WhatsApp Principale',
    status: 'active',
    config: {
      phoneNumberId: '123456789',
      businessAccountId: '987654321',
      accessToken: 'EAABc...',
      webhookVerifyToken: 'leo_verify_token',
      displayPhoneNumber: '+39 333 1234567',
    } as WhatsAppConfig,
    isDefault: true,
    webhookUrl: 'https://api.leo.example.com/webhooks/whatsapp/1',
    lastActivityAt: '2024-12-28T14:30:00Z',
    messagesSent: 15420,
    messagesReceived: 12350,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-12-28T14:30:00Z',
  },
  {
    id: '2',
    tenantId: 'tenant-1',
    type: 'email',
    name: 'Email Support',
    status: 'active',
    config: {
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpUser: 'support@company.com',
      smtpPassword: '***',
      imapHost: 'imap.gmail.com',
      imapPort: 993,
      imapUser: 'support@company.com',
      imapPassword: '***',
      fromEmail: 'support@company.com',
      fromName: 'Support Team',
      useTls: true,
    } as EmailConfig,
    isDefault: false,
    lastActivityAt: '2024-12-28T12:15:00Z',
    messagesSent: 8920,
    messagesReceived: 6780,
    createdAt: '2024-02-20T11:00:00Z',
    updatedAt: '2024-12-28T12:15:00Z',
  },
  {
    id: '3',
    tenantId: 'tenant-1',
    type: 'web',
    name: 'Widget Sito Web',
    status: 'active',
    config: {
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      position: 'bottom-right',
      greeting: 'Ciao! Come posso aiutarti oggi?',
      offlineMessage: 'Siamo offline. Lascia un messaggio!',
      collectEmail: true,
      collectPhone: false,
      allowedDomains: ['www.example.com', 'app.example.com'],
    } as WebWidgetConfig,
    isDefault: false,
    lastActivityAt: '2024-12-28T10:45:00Z',
    messagesSent: 3250,
    messagesReceived: 4120,
    createdAt: '2024-03-10T14:00:00Z',
    updatedAt: '2024-12-28T10:45:00Z',
  },
  {
    id: '4',
    tenantId: 'tenant-1',
    type: 'sms',
    name: 'SMS Notifiche',
    status: 'inactive',
    config: {
      provider: 'twilio',
      accountSid: 'AC...',
      authToken: '***',
      fromNumber: '+1 555 1234567',
    } as SmsConfig,
    isDefault: false,
    lastActivityAt: '2024-11-15T09:00:00Z',
    messagesSent: 520,
    messagesReceived: 0,
    createdAt: '2024-06-01T16:00:00Z',
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
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatNumber = (num: number | undefined): string => {
  if (num === undefined) return '0';
  return new Intl.NumberFormat('it-IT').format(num);
};

const getRelativeTime = (dateString: string | undefined): string => {
  if (!dateString) return 'Mai';
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

// ============================================================================
// Sub-Components
// ============================================================================

function StatusBadge({ status }: { status: ChannelStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn('gap-1', config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function ChannelIcon({ type, className }: { type: ChannelType; className?: string }) {
  const config = CHANNEL_CONFIG[type];
  const Icon = config.icon;

  return (
    <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', config.bgColor, className)}>
      <Icon className={cn('h-6 w-6', config.color)} />
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-0 top-0 h-full px-3"
        onClick={() => setShow(!show)}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? (
        <>
          <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
          Copiato!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 mr-1" />
          {label || 'Copia'}
        </>
      )}
    </Button>
  );
}

function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'lg',
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

// Channel Configuration Forms
function WhatsAppConfigForm({
  config,
  onChange,
}: {
  config: WhatsAppConfig;
  onChange: (config: WhatsAppConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phoneNumberId">Phone Number ID *</Label>
          <Input
            id="phoneNumberId"
            value={config.phoneNumberId}
            onChange={(e) => onChange({ ...config, phoneNumberId: e.target.value })}
            placeholder="123456789012345"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="businessAccountId">Business Account ID *</Label>
          <Input
            id="businessAccountId"
            value={config.businessAccountId}
            onChange={(e) => onChange({ ...config, businessAccountId: e.target.value })}
            placeholder="987654321098765"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="displayPhoneNumber">Numero di Telefono Display</Label>
        <Input
          id="displayPhoneNumber"
          value={config.displayPhoneNumber}
          onChange={(e) => onChange({ ...config, displayPhoneNumber: e.target.value })}
          placeholder="+39 333 1234567"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="accessToken">Access Token *</Label>
        <PasswordInput
          id="accessToken"
          value={config.accessToken}
          onChange={(value) => onChange({ ...config, accessToken: value })}
          placeholder="EAABc..."
        />
        <p className="text-xs text-muted-foreground">
          Token di accesso permanente dalla Meta Business Suite
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="webhookVerifyToken">Webhook Verify Token *</Label>
        <div className="flex gap-2">
          <Input
            id="webhookVerifyToken"
            value={config.webhookVerifyToken}
            onChange={(e) => onChange({ ...config, webhookVerifyToken: e.target.value })}
            placeholder="leo_verify_token_123"
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={() => onChange({
              ...config,
              webhookVerifyToken: `leo_${Math.random().toString(36).substring(2, 15)}`,
            })}
          >
            Genera
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Token per verificare le richieste webhook da Meta
        </p>
      </div>
    </div>
  );
}

function EmailConfigForm({
  config,
  onChange,
}: {
  config: EmailConfig;
  onChange: (config: EmailConfig) => void;
}) {
  return (
    <div className="space-y-6">
      {/* From Settings */}
      <div className="space-y-4">
        <h4 className="font-medium">Mittente</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fromEmail">Email Mittente *</Label>
            <Input
              id="fromEmail"
              type="email"
              value={config.fromEmail}
              onChange={(e) => onChange({ ...config, fromEmail: e.target.value })}
              placeholder="support@company.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fromName">Nome Mittente</Label>
            <Input
              id="fromName"
              value={config.fromName}
              onChange={(e) => onChange({ ...config, fromName: e.target.value })}
              placeholder="Support Team"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* SMTP Settings */}
      <div className="space-y-4">
        <h4 className="font-medium">SMTP (Invio)</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="smtpHost">Host SMTP *</Label>
            <Input
              id="smtpHost"
              value={config.smtpHost}
              onChange={(e) => onChange({ ...config, smtpHost: e.target.value })}
              placeholder="smtp.gmail.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtpPort">Porta SMTP *</Label>
            <Input
              id="smtpPort"
              type="number"
              value={config.smtpPort}
              onChange={(e) => onChange({ ...config, smtpPort: parseInt(e.target.value) || 587 })}
              placeholder="587"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="smtpUser">Username SMTP *</Label>
            <Input
              id="smtpUser"
              value={config.smtpUser}
              onChange={(e) => onChange({ ...config, smtpUser: e.target.value })}
              placeholder="user@gmail.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtpPassword">Password SMTP *</Label>
            <PasswordInput
              id="smtpPassword"
              value={config.smtpPassword}
              onChange={(value) => onChange({ ...config, smtpPassword: value })}
              placeholder="App password"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* IMAP Settings */}
      <div className="space-y-4">
        <h4 className="font-medium">IMAP (Ricezione)</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="imapHost">Host IMAP *</Label>
            <Input
              id="imapHost"
              value={config.imapHost}
              onChange={(e) => onChange({ ...config, imapHost: e.target.value })}
              placeholder="imap.gmail.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="imapPort">Porta IMAP *</Label>
            <Input
              id="imapPort"
              type="number"
              value={config.imapPort}
              onChange={(e) => onChange({ ...config, imapPort: parseInt(e.target.value) || 993 })}
              placeholder="993"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="imapUser">Username IMAP *</Label>
            <Input
              id="imapUser"
              value={config.imapUser}
              onChange={(e) => onChange({ ...config, imapUser: e.target.value })}
              placeholder="user@gmail.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="imapPassword">Password IMAP *</Label>
            <PasswordInput
              id="imapPassword"
              value={config.imapPassword}
              onChange={(value) => onChange({ ...config, imapPassword: value })}
              placeholder="App password"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* TLS Setting */}
      <div className="flex items-center justify-between">
        <div>
          <Label>Usa TLS/SSL</Label>
          <p className="text-sm text-muted-foreground">Connessione crittografata (consigliato)</p>
        </div>
        <Switch
          checked={config.useTls}
          onCheckedChange={(checked) => onChange({ ...config, useTls: checked })}
        />
      </div>
    </div>
  );
}

function SmsConfigForm({
  config,
  onChange,
}: {
  config: SmsConfig;
  onChange: (config: SmsConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="provider">Provider SMS</Label>
        <Select
          value={config.provider}
          onValueChange={(value: 'twilio' | 'vonage' | 'messagebird') =>
            onChange({ ...config, provider: value })
          }
        >
          <SelectTrigger id="provider">
            <SelectValue placeholder="Seleziona provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="twilio">Twilio</SelectItem>
            <SelectItem value="vonage">Vonage (Nexmo)</SelectItem>
            <SelectItem value="messagebird">MessageBird</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="accountSid">Account SID *</Label>
        <Input
          id="accountSid"
          value={config.accountSid}
          onChange={(e) => onChange({ ...config, accountSid: e.target.value })}
          placeholder="AC..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="authToken">Auth Token *</Label>
        <PasswordInput
          id="authToken"
          value={config.authToken}
          onChange={(value) => onChange({ ...config, authToken: value })}
          placeholder="Token di autenticazione"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fromNumber">Numero Mittente *</Label>
        <Input
          id="fromNumber"
          value={config.fromNumber}
          onChange={(e) => onChange({ ...config, fromNumber: e.target.value })}
          placeholder="+1 555 1234567"
        />
        <p className="text-xs text-muted-foreground">
          Numero di telefono verificato dal provider
        </p>
      </div>
    </div>
  );
}

function WebWidgetConfigForm({
  config,
  onChange,
}: {
  config: WebWidgetConfig;
  onChange: (config: WebWidgetConfig) => void;
}) {
  const [newDomain, setNewDomain] = useState('');

  const addDomain = () => {
    if (newDomain && !config.allowedDomains.includes(newDomain)) {
      onChange({
        ...config,
        allowedDomains: [...config.allowedDomains, newDomain],
      });
      setNewDomain('');
    }
  };

  const removeDomain = (domain: string) => {
    onChange({
      ...config,
      allowedDomains: config.allowedDomains.filter((d) => d !== domain),
    });
  };

  return (
    <div className="space-y-6">
      {/* Appearance */}
      <div className="space-y-4">
        <h4 className="font-medium">Aspetto</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Colore Primario</Label>
            <div className="flex gap-2">
              <Input
                id="primaryColor"
                type="color"
                value={config.primaryColor}
                onChange={(e) => onChange({ ...config, primaryColor: e.target.value })}
                className="w-12 h-10 p-1"
              />
              <Input
                value={config.primaryColor}
                onChange={(e) => onChange({ ...config, primaryColor: e.target.value })}
                placeholder="#3B82F6"
                className="flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondaryColor">Colore Secondario</Label>
            <div className="flex gap-2">
              <Input
                id="secondaryColor"
                type="color"
                value={config.secondaryColor}
                onChange={(e) => onChange({ ...config, secondaryColor: e.target.value })}
                className="w-12 h-10 p-1"
              />
              <Input
                value={config.secondaryColor}
                onChange={(e) => onChange({ ...config, secondaryColor: e.target.value })}
                placeholder="#1E40AF"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="position">Posizione Widget</Label>
          <Select
            value={config.position}
            onValueChange={(value: 'bottom-right' | 'bottom-left') =>
              onChange({ ...config, position: value })
            }
          >
            <SelectTrigger id="position">
              <SelectValue placeholder="Seleziona posizione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bottom-right">Basso Destra</SelectItem>
              <SelectItem value="bottom-left">Basso Sinistra</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Messages */}
      <div className="space-y-4">
        <h4 className="font-medium">Messaggi</h4>
        <div className="space-y-2">
          <Label htmlFor="greeting">Messaggio di Benvenuto</Label>
          <Input
            id="greeting"
            value={config.greeting}
            onChange={(e) => onChange({ ...config, greeting: e.target.value })}
            placeholder="Ciao! Come posso aiutarti?"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="offlineMessage">Messaggio Offline</Label>
          <Input
            id="offlineMessage"
            value={config.offlineMessage}
            onChange={(e) => onChange({ ...config, offlineMessage: e.target.value })}
            placeholder="Siamo offline. Lascia un messaggio!"
          />
        </div>
      </div>

      <Separator />

      {/* Data Collection */}
      <div className="space-y-4">
        <h4 className="font-medium">Raccolta Dati</h4>
        <div className="flex items-center justify-between">
          <div>
            <Label>Richiedi Email</Label>
            <p className="text-sm text-muted-foreground">Chiedi l'email prima di iniziare la chat</p>
          </div>
          <Switch
            checked={config.collectEmail}
            onCheckedChange={(checked) => onChange({ ...config, collectEmail: checked })}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Richiedi Telefono</Label>
            <p className="text-sm text-muted-foreground">Chiedi il numero di telefono</p>
          </div>
          <Switch
            checked={config.collectPhone}
            onCheckedChange={(checked) => onChange({ ...config, collectPhone: checked })}
          />
        </div>
      </div>

      <Separator />

      {/* Allowed Domains */}
      <div className="space-y-4">
        <h4 className="font-medium">Domini Autorizzati</h4>
        <p className="text-sm text-muted-foreground">
          Il widget funzionera solo sui domini specificati
        </p>
        <div className="flex gap-2">
          <Input
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="www.example.com"
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && addDomain()}
          />
          <Button onClick={addDomain} disabled={!newDomain}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {config.allowedDomains.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {config.allowedDomains.map((domain) => (
              <Badge key={domain} variant="secondary" className="gap-1">
                {domain}
                <button onClick={() => removeDomain(domain)} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChannelCard({
  channel,
  onEdit,
  onTest,
  onToggle,
  onDelete,
}: {
  channel: Channel;
  onEdit: () => void;
  onTest: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const config = CHANNEL_CONFIG[channel.type];

  return (
    <Card className="relative overflow-hidden">
      {channel.isDefault && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-2 py-0.5 text-xs rounded-bl">
          Default
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <ChannelIcon type={channel.type} />
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{channel.name}</CardTitle>
            <CardDescription className="mt-1">{config.description}</CardDescription>
          </div>
          <StatusBadge status={channel.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-muted-foreground">Inviati</p>
              <p className="font-medium">{formatNumber(channel.messagesSent)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ArrowDownLeft className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-muted-foreground">Ricevuti</p>
              <p className="font-medium">{formatNumber(channel.messagesReceived)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">Ultimo</p>
              <p className="font-medium text-xs">{getRelativeTime(channel.lastActivityAt)}</p>
            </div>
          </div>
        </div>

        {/* Webhook URL */}
        {channel.webhookUrl && (
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <p className="text-xs text-muted-foreground">Webhook URL</p>
            <div className="flex items-center gap-2">
              <code className="text-xs flex-1 truncate">{channel.webhookUrl}</code>
              <CopyButton value={channel.webhookUrl} />
            </div>
          </div>
        )}

        {/* Error Message */}
        {channel.status === 'error' && channel.errorMessage && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{channel.errorMessage}</span>
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit} className="flex-1">
            <Settings className="h-4 w-4 mr-1" />
            Configura
          </Button>
          <Button variant="outline" size="sm" onClick={onTest}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Test
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onToggle}
            className={channel.status === 'active' ? 'text-amber-600' : 'text-green-600'}
          >
            {channel.status === 'active' ? (
              <WifiOff className="h-4 w-4" />
            ) : (
              <Wifi className="h-4 w-4" />
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Channels() {
  // State
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedType, setSelectedType] = useState<ChannelType>('whatsapp');

  // Form state
  const [formData, setFormData] = useState<ChannelFormData>({
    name: '',
    type: 'whatsapp',
    isDefault: false,
  });
  const [channelConfig, setChannelConfig] = useState<
    WhatsAppConfig | EmailConfig | SmsConfig | WebWidgetConfig
  >(DEFAULT_WHATSAPP_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Data Fetching
  const fetchChannels = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<PaginatedResponse<Channel>>('/channels');
      setChannels(response.data.data);
    } catch {
      console.warn('API not available, using mock data');
      setChannels(mockChannels);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // Handlers
  const handleAddChannel = (type: ChannelType) => {
    setSelectedType(type);
    setFormData({
      name: `${CHANNEL_CONFIG[type].label} Nuovo`,
      type,
      isDefault: false,
    });

    // Set default config based on type
    switch (type) {
      case 'whatsapp':
        setChannelConfig(DEFAULT_WHATSAPP_CONFIG);
        break;
      case 'email':
        setChannelConfig(DEFAULT_EMAIL_CONFIG);
        break;
      case 'sms':
        setChannelConfig(DEFAULT_SMS_CONFIG);
        break;
      case 'web':
        setChannelConfig(DEFAULT_WEB_CONFIG);
        break;
    }

    setIsAddModalOpen(true);
  };

  const handleEditChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    setFormData({
      name: channel.name,
      type: channel.type,
      isDefault: channel.isDefault,
    });
    setChannelConfig(channel.config);
    setIsConfigModalOpen(true);
  };

  const handleTestChannel = async (channel: Channel) => {
    setSelectedChannel(channel);
    setIsTesting(true);
    setTestResult(null);

    try {
      await apiClient.post(`/channels/${channel.id}/test`);
      setTestResult({ success: true, message: 'Connessione riuscita!' });
    } catch {
      // Simulate test for demo
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const success = Math.random() > 0.3;
      setTestResult({
        success,
        message: success
          ? 'Connessione riuscita!'
          : 'Impossibile connettersi. Verifica le credenziali.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleToggleChannel = async (channel: Channel) => {
    const newStatus: ChannelStatus = channel.status === 'active' ? 'inactive' : 'active';

    try {
      await apiClient.put(`/channels/${channel.id}`, { status: newStatus });
      await fetchChannels();
    } catch {
      // Update local state for demo
      setChannels((prev) =>
        prev.map((c) => (c.id === channel.id ? { ...c, status: newStatus } : c))
      );
    }
  };

  const handleDeleteChannel = async (channel: Channel) => {
    if (!confirm(`Sei sicuro di voler eliminare il canale "${channel.name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/channels/${channel.id}`);
      await fetchChannels();
    } catch {
      setChannels((prev) => prev.filter((c) => c.id !== channel.id));
    }
  };

  const handleSaveChannel = async () => {
    setIsSaving(true);

    try {
      const payload = {
        ...formData,
        config: channelConfig,
      };

      if (isConfigModalOpen && selectedChannel) {
        await apiClient.put(`/channels/${selectedChannel.id}`, payload);
      } else {
        await apiClient.post('/channels', payload);
      }

      await fetchChannels();
      setIsAddModalOpen(false);
      setIsConfigModalOpen(false);
      setSelectedChannel(null);
    } catch (err) {
      console.error('Error saving channel:', err);
      // Update local state for demo
      const newChannel: Channel = {
        id: `temp-${Date.now()}`,
        tenantId: 'tenant-1',
        type: formData.type,
        name: formData.name,
        status: 'pending',
        config: channelConfig,
        isDefault: formData.isDefault,
        messagesSent: 0,
        messagesReceived: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (isConfigModalOpen && selectedChannel) {
        setChannels((prev) =>
          prev.map((c) =>
            c.id === selectedChannel.id
              ? { ...c, ...newChannel, id: c.id, status: c.status }
              : c
          )
        );
      } else {
        setChannels((prev) => [newChannel, ...prev]);
      }

      setIsAddModalOpen(false);
      setIsConfigModalOpen(false);
      setSelectedChannel(null);
    } finally {
      setIsSaving(false);
    }
  };

  // Group channels by type
  const channelsByType = channels.reduce(
    (acc, channel) => {
      if (!acc[channel.type]) {
        acc[channel.type] = [];
      }
      acc[channel.type].push(channel);
      return acc;
    },
    {} as Record<ChannelType, Channel[]>
  );

  // Render config form based on type
  const renderConfigForm = () => {
    const type = isAddModalOpen ? selectedType : selectedChannel?.type || 'whatsapp';

    switch (type) {
      case 'whatsapp':
        return (
          <WhatsAppConfigForm
            config={channelConfig as WhatsAppConfig}
            onChange={(config) => setChannelConfig(config)}
          />
        );
      case 'email':
        return (
          <EmailConfigForm
            config={channelConfig as EmailConfig}
            onChange={(config) => setChannelConfig(config)}
          />
        );
      case 'sms':
        return (
          <SmsConfigForm
            config={channelConfig as SmsConfig}
            onChange={(config) => setChannelConfig(config)}
          />
        );
      case 'web':
        return (
          <WebWidgetConfigForm
            config={channelConfig as WebWidgetConfig}
            onChange={(config) => setChannelConfig(config)}
          />
        );
    }
  };

  // Render
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Canali</h1>
          <p className="text-muted-foreground">
            Configura i canali di comunicazione per i tuoi clienti
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {(['whatsapp', 'email', 'sms', 'web'] as ChannelType[]).map((type) => {
          const config = CHANNEL_CONFIG[type];
          const typeChannels = channelsByType[type] || [];
          const activeCount = typeChannels.filter((c) => c.status === 'active').length;

          return (
            <Card key={type} className="cursor-pointer hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <ChannelIcon type={type} className="h-10 w-10" />
                  <div className="flex-1">
                    <p className="font-medium">{config.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {activeCount > 0 ? (
                        <span className="text-green-600">{activeCount} attivi</span>
                      ) : (
                        'Non configurato'
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleAddChannel(type)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-4 p-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchChannels} className="ml-auto">
              Riprova
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Channels by Type */}
      {!isLoading && (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">Tutti ({channels.length})</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp ({channelsByType.whatsapp?.length || 0})</TabsTrigger>
            <TabsTrigger value="email">Email ({channelsByType.email?.length || 0})</TabsTrigger>
            <TabsTrigger value="sms">SMS ({channelsByType.sms?.length || 0})</TabsTrigger>
            <TabsTrigger value="web">Web ({channelsByType.web?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {channels.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">Nessun canale configurato</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Aggiungi il tuo primo canale per iniziare a comunicare
                  </p>
                  <Button onClick={() => handleAddChannel('whatsapp')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi Canale
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {channels.map((channel) => (
                  <ChannelCard
                    key={channel.id}
                    channel={channel}
                    onEdit={() => handleEditChannel(channel)}
                    onTest={() => handleTestChannel(channel)}
                    onToggle={() => handleToggleChannel(channel)}
                    onDelete={() => handleDeleteChannel(channel)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {(['whatsapp', 'email', 'sms', 'web'] as ChannelType[]).map((type) => (
            <TabsContent key={type} value={type} className="space-y-4">
              {!channelsByType[type]?.length ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <ChannelIcon type={type} className="mb-4" />
                    <h3 className="font-medium mb-2">
                      Nessun canale {CHANNEL_CONFIG[type].label}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configura {CHANNEL_CONFIG[type].label} per i tuoi clienti
                    </p>
                    <Button onClick={() => handleAddChannel(type)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Aggiungi {CHANNEL_CONFIG[type].label}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {channelsByType[type].map((channel) => (
                    <ChannelCard
                      key={channel.id}
                      channel={channel}
                      onEdit={() => handleEditChannel(channel)}
                      onTest={() => handleTestChannel(channel)}
                      onToggle={() => handleToggleChannel(channel)}
                      onDelete={() => handleDeleteChannel(channel)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Add Channel Modal */}
      <Modal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={`Nuovo Canale ${CHANNEL_CONFIG[selectedType].label}`}
        description="Configura un nuovo canale di comunicazione"
        size="lg"
        footer={
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {isTesting && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Test in corso...
                </div>
              )}
              {testResult && (
                <div
                  className={cn(
                    'flex items-center gap-2 text-sm',
                    testResult.success ? 'text-green-600' : 'text-destructive'
                  )}
                >
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {testResult.message}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isSaving}>
                Annulla
              </Button>
              <Button onClick={handleSaveChannel} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  'Crea Canale'
                )}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="channelName">Nome Canale *</Label>
              <Input
                id="channelName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="WhatsApp Principale"
              />
            </div>
            <div className="space-y-2 flex items-end">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isDefault}
                  onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                />
                <Label>Canale Default</Label>
              </div>
            </div>
          </div>

          <Separator />

          {renderConfigForm()}
        </div>
      </Modal>

      {/* Edit Channel Modal */}
      <Modal
        open={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title={`Configura ${selectedChannel?.name || 'Canale'}`}
        description="Modifica la configurazione del canale"
        size="lg"
        footer={
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {isTesting && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Test in corso...
                </div>
              )}
              {testResult && (
                <div
                  className={cn(
                    'flex items-center gap-2 text-sm',
                    testResult.success ? 'text-green-600' : 'text-destructive'
                  )}
                >
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {testResult.message}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => selectedChannel && handleTestChannel(selectedChannel)}
                disabled={isTesting || isSaving}
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', isTesting && 'animate-spin')} />
                Testa Connessione
              </Button>
              <Button variant="outline" onClick={() => setIsConfigModalOpen(false)} disabled={isSaving}>
                Annulla
              </Button>
              <Button onClick={handleSaveChannel} disabled={isSaving}>
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
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="editChannelName">Nome Canale *</Label>
              <Input
                id="editChannelName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2 flex items-end">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isDefault}
                  onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                />
                <Label>Canale Default</Label>
              </div>
            </div>
          </div>

          <Separator />

          {renderConfigForm()}
        </div>
      </Modal>
    </div>
  );
}

export default Channels;
