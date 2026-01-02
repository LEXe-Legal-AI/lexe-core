/**
 * LEO Frontend - User Management Page
 *
 * Complete user management interface with:
 * - User listing with DataTable
 * - Search and filters (role, status)
 * - Invite/Create user modal
 * - Edit user modal
 * - User detail drawer with activity log and sessions
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  UserX,
  UserCheck,
  Mail,
  KeyRound,
  Shield,
  Clock,
  Monitor,
  Activity,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable, type Column } from '@/components/ui/data-table';
import { useToast } from '@/hooks/use-toast';

// API
import {
  type User,
  type UserDetail,
  type UserRole,
  type UserStatus,
  type UserSession,
  type UserActivity,
  type CreateUserDto,
  type UpdateUserDto,
  roleConfig,
  statusConfig,
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  deactivateUser,
  reactivateUser,
  resetUserPassword,
  getUserSessions,
  revokeUserSession,
  getUserActivity,
} from '@/api/users';

// ============================================================================
// Types
// ============================================================================

interface UserFormData {
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  sendInvite: boolean;
}

const defaultFormData: UserFormData = {
  email: '',
  displayName: '',
  firstName: '',
  lastName: '',
  role: 'viewer',
  sendInvite: true,
};

// ============================================================================
// Mock Data (for development - remove when API is ready)
// ============================================================================

const mockUsers: User[] = [
  {
    id: '1',
    tenantId: 'tenant-1',
    email: 'admin@leo.it',
    displayName: 'Marco Amministratore',
    firstName: 'Marco',
    lastName: 'Rossi',
    role: 'admin',
    isActive: true,
    lastLoginAt: '2025-12-28T14:30:00Z',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2025-12-28T14:30:00Z',
  },
  {
    id: '2',
    tenantId: 'tenant-1',
    email: 'operatore@leo.it',
    displayName: 'Laura Bianchi',
    firstName: 'Laura',
    lastName: 'Bianchi',
    role: 'operator',
    isActive: true,
    lastLoginAt: '2025-12-27T09:15:00Z',
    createdAt: '2024-03-20T08:00:00Z',
    updatedAt: '2025-12-27T09:15:00Z',
  },
  {
    id: '3',
    tenantId: 'tenant-1',
    email: 'viewer@leo.it',
    displayName: 'Giuseppe Verdi',
    firstName: 'Giuseppe',
    lastName: 'Verdi',
    role: 'viewer',
    isActive: true,
    lastLoginAt: '2025-12-20T16:45:00Z',
    createdAt: '2024-06-10T14:00:00Z',
    updatedAt: '2025-12-20T16:45:00Z',
  },
  {
    id: '4',
    tenantId: 'tenant-1',
    email: 'anna.ferrari@leo.it',
    displayName: 'Anna Ferrari',
    firstName: 'Anna',
    lastName: 'Ferrari',
    role: 'operator',
    isActive: false,
    lastLoginAt: '2025-11-15T11:00:00Z',
    createdAt: '2024-02-28T09:00:00Z',
    updatedAt: '2025-11-15T11:00:00Z',
  },
  {
    id: '5',
    tenantId: 'tenant-1',
    email: 'paolo.conti@leo.it',
    displayName: 'Paolo Conti',
    firstName: 'Paolo',
    lastName: 'Conti',
    role: 'viewer',
    isActive: true,
    createdAt: '2024-09-05T12:00:00Z',
    updatedAt: '2024-09-05T12:00:00Z',
  },
  {
    id: '6',
    tenantId: 'tenant-1',
    email: 'sofia.romano@leo.it',
    displayName: 'Sofia Romano',
    firstName: 'Sofia',
    lastName: 'Romano',
    role: 'admin',
    isActive: true,
    lastLoginAt: '2025-12-28T10:00:00Z',
    createdAt: '2024-01-20T08:00:00Z',
    updatedAt: '2025-12-28T10:00:00Z',
  },
];

const mockSessions: UserSession[] = [
  {
    id: 'session-1',
    userId: '1',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    lastActiveAt: '2025-12-28T14:30:00Z',
    createdAt: '2025-12-28T08:00:00Z',
    expiresAt: '2025-12-29T08:00:00Z',
    isCurrent: true,
  },
  {
    id: 'session-2',
    userId: '1',
    ipAddress: '10.0.0.50',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/605.1.15',
    lastActiveAt: '2025-12-27T18:00:00Z',
    createdAt: '2025-12-27T10:00:00Z',
    expiresAt: '2025-12-28T10:00:00Z',
    isCurrent: false,
  },
];

const mockActivity: UserActivity[] = [
  {
    id: 'act-1',
    userId: '1',
    action: 'login',
    resource: 'session',
    createdAt: '2025-12-28T14:30:00Z',
    ipAddress: '192.168.1.100',
  },
  {
    id: 'act-2',
    userId: '1',
    action: 'update',
    resource: 'settings',
    resourceId: 'general',
    details: { changed: ['theme', 'language'] },
    createdAt: '2025-12-28T12:00:00Z',
  },
  {
    id: 'act-3',
    userId: '1',
    action: 'create',
    resource: 'conversation',
    resourceId: 'conv-123',
    createdAt: '2025-12-28T10:30:00Z',
  },
  {
    id: 'act-4',
    userId: '1',
    action: 'view',
    resource: 'dashboard',
    createdAt: '2025-12-28T08:00:00Z',
  },
  {
    id: 'act-5',
    userId: '1',
    action: 'logout',
    resource: 'session',
    createdAt: '2025-12-27T18:00:00Z',
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateString?: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(user: User): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  if (user.displayName) {
    const parts = user.displayName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return user.displayName.substring(0, 2).toUpperCase();
  }
  return user.email.substring(0, 2).toUpperCase();
}

function getActionIcon(action: string) {
  switch (action) {
    case 'login':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'logout':
      return <XCircle className="h-4 w-4 text-gray-500" />;
    case 'create':
      return <Plus className="h-4 w-4 text-blue-500" />;
    case 'update':
      return <Edit className="h-4 w-4 text-yellow-500" />;
    case 'delete':
      return <Trash2 className="h-4 w-4 text-red-500" />;
    default:
      return <Activity className="h-4 w-4 text-gray-400" />;
  }
}

function parseUserAgent(userAgent: string): string {
  if (userAgent.includes('iPhone')) return 'iPhone Safari';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('Chrome')) return 'Chrome Desktop';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  return 'Browser sconosciuto';
}

// ============================================================================
// Sub-components
// ============================================================================

interface RoleBadgeProps {
  role: UserRole;
}

function RoleBadge({ role }: RoleBadgeProps) {
  const config = roleConfig[role];
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', config.color)}>
      {config.label}
    </span>
  );
}

interface StatusBadgeProps {
  isActive: boolean;
}

function StatusBadge({ isActive }: StatusBadgeProps) {
  const status: UserStatus = isActive ? 'active' : 'inactive';
  const config = statusConfig[status];
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', config.color)}>
      {config.label}
    </span>
  );
}

// ============================================================================
// Invite User Modal
// ============================================================================

interface InviteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateUserDto) => void;
  isLoading: boolean;
}

function InviteUserModal({ open, onOpenChange, onSubmit, isLoading }: InviteUserModalProps) {
  const [formData, setFormData] = useState<UserFormData>(defaultFormData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      email: formData.email,
      displayName: formData.displayName || undefined,
      firstName: formData.firstName || undefined,
      lastName: formData.lastName || undefined,
      role: formData.role,
      sendInvite: formData.sendInvite,
    });
  };

  const handleClose = () => {
    setFormData(defaultFormData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Invita Utente</DialogTitle>
          <DialogDescription>
            Invia un invito email per aggiungere un nuovo utente al sistema.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="utente@esempio.it"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nome</Label>
              <Input
                id="firstName"
                placeholder="Mario"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Cognome</Label>
              <Input
                id="lastName"
                placeholder="Rossi"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Nome visualizzato</Label>
            <Input
              id="displayName"
              placeholder="Mario Rossi"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Ruolo</Label>
            <Select
              value={formData.role}
              onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona ruolo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex flex-col">
                    <span>Amministratore</span>
                    <span className="text-xs text-muted-foreground">
                      {roleConfig.admin.description}
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="operator">
                  <div className="flex flex-col">
                    <span>Operatore</span>
                    <span className="text-xs text-muted-foreground">
                      {roleConfig.operator.description}
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="viewer">
                  <div className="flex flex-col">
                    <span>Visualizzatore</span>
                    <span className="text-xs text-muted-foreground">
                      {roleConfig.viewer.description}
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="sendInvite" className="text-base">
                Invia email di invito
              </Label>
              <p className="text-sm text-muted-foreground">
                L'utente ricevera un link per impostare la password
              </p>
            </div>
            <Switch
              id="sendInvite"
              checked={formData.sendInvite}
              onCheckedChange={(checked) => setFormData({ ...formData, sendInvite: checked })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annulla
            </Button>
            <Button type="submit" disabled={isLoading || !formData.email}>
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Invio in corso...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Invia Invito
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Edit User Modal
// ============================================================================

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSubmit: (userId: string, data: UpdateUserDto) => void;
  onResetPassword: (userId: string) => void;
  isLoading: boolean;
}

function EditUserModal({
  open,
  onOpenChange,
  user,
  onSubmit,
  onResetPassword,
  isLoading,
}: EditUserModalProps) {
  const [formData, setFormData] = useState<Partial<UserFormData>>({});

  // Update form when user changes
  useState(() => {
    if (user) {
      setFormData({
        displayName: user.displayName || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.role,
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    onSubmit(user.id, {
      displayName: formData.displayName || undefined,
      firstName: formData.firstName || undefined,
      lastName: formData.lastName || undefined,
      role: formData.role,
    });
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Modifica Utente</DialogTitle>
          <DialogDescription>
            Modifica le informazioni dell'utente {user.email}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>{getInitials(user)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user.displayName || user.email}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-firstName">Nome</Label>
              <Input
                id="edit-firstName"
                value={formData.firstName || user.firstName || ''}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lastName">Cognome</Label>
              <Input
                id="edit-lastName"
                value={formData.lastName || user.lastName || ''}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-displayName">Nome visualizzato</Label>
            <Input
              id="edit-displayName"
              value={formData.displayName || user.displayName || ''}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-role">Ruolo</Label>
            <Select
              value={formData.role || user.role}
              onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Amministratore</SelectItem>
                <SelectItem value="operator">Operatore</SelectItem>
                <SelectItem value="viewer">Visualizzatore</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Password</p>
              <p className="text-sm text-muted-foreground">
                Invia email per reimpostare la password
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => onResetPassword(user.id)}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              Reset Password
            </Button>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                'Salva Modifiche'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// User Detail Drawer
// ============================================================================

interface UserDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  sessions: UserSession[];
  activity: UserActivity[];
  onRevokeSession: (sessionId: string) => void;
  isLoadingSessions: boolean;
  isLoadingActivity: boolean;
}

function UserDetailDrawer({
  open,
  onOpenChange,
  user,
  sessions,
  activity,
  onRevokeSession,
  isLoadingSessions,
  isLoadingActivity,
}: UserDetailDrawerProps) {
  if (!user) return null;

  const permissions = useMemo(() => {
    switch (user.role) {
      case 'admin':
        return [
          'Gestione utenti',
          'Gestione impostazioni',
          'Gestione conversazioni',
          'Gestione contatti',
          'Visualizzazione report',
          'Gestione agenti AI',
        ];
      case 'operator':
        return [
          'Gestione conversazioni',
          'Gestione contatti',
          'Visualizzazione report',
        ];
      case 'viewer':
        return ['Visualizzazione conversazioni', 'Visualizzazione contatti'];
      default:
        return [];
    }
  }, [user.role]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Dettagli Utente</SheetTitle>
          <SheetDescription>
            Informazioni complete, sessioni attive e log attivita
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* User Info Header */}
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="text-lg">{getInitials(user)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">
                {user.displayName || `${user.firstName} ${user.lastName}`}
              </h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <RoleBadge role={user.role} />
                <StatusBadge isActive={user.isActive} />
              </div>
            </div>
          </div>

          {/* User Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Ultimo accesso</p>
              <p className="font-medium">{formatDateTime(user.lastLoginAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Data creazione</p>
              <p className="font-medium">{formatDate(user.createdAt)}</p>
            </div>
          </div>

          <Separator />

          {/* Tabs for Sessions, Activity, Permissions */}
          <Tabs defaultValue="sessions" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sessions" className="text-xs">
                <Monitor className="h-3 w-3 mr-1" />
                Sessioni
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs">
                <Activity className="h-3 w-3 mr-1" />
                Attivita
              </TabsTrigger>
              <TabsTrigger value="permissions" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Permessi
              </TabsTrigger>
            </TabsList>

            {/* Sessions Tab */}
            <TabsContent value="sessions" className="mt-4 space-y-3">
              {isLoadingSessions ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Monitor className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nessuna sessione attiva</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      'p-3 rounded-lg border',
                      session.isCurrent && 'border-primary bg-primary/5'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {parseUserAgent(session.userAgent)}
                          </span>
                          {session.isCurrent && (
                            <Badge variant="secondary" className="text-xs">
                              Corrente
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          IP: {session.ipAddress}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Ultima attivita: {formatDateTime(session.lastActiveAt)}
                        </p>
                      </div>
                      {!session.isCurrent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onRevokeSession(session.id)}
                        >
                          Revoca
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-4">
              {isLoadingActivity ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : activity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nessuna attivita recente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activity.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 text-sm">
                      <div className="mt-0.5">{getActionIcon(item.action)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium capitalize">
                          {item.action} {item.resource}
                          {item.resourceId && (
                            <span className="text-muted-foreground font-normal">
                              {' '}
                              #{item.resourceId.substring(0, 8)}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(item.createdAt)}
                          {item.ipAddress && ` - ${item.ipAddress}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Permissions Tab */}
            <TabsContent value="permissions" className="mt-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">
                    Ruolo: {roleConfig[user.role].label}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {roleConfig[user.role].description}
                </p>
                <div className="space-y-2">
                  {permissions.map((permission, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50"
                    >
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {permission}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// Delete Confirmation Dialog
// ============================================================================

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onConfirm: () => void;
  isLoading: boolean;
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  user,
  onConfirm,
  isLoading,
}: DeleteConfirmDialogProps) {
  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Elimina Utente
          </DialogTitle>
          <DialogDescription>
            Sei sicuro di voler eliminare l'utente <strong>{user.email}</strong>?
            Questa azione non puo essere annullata.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Eliminazione...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Elimina
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main Users Page Component
// ============================================================================

export function Users() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');

  // Modal states
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  // For now, use mock data. Replace with actual API call when backend is ready
  const {
    data: usersData,
    isLoading: isLoadingUsers,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['users', { search: searchQuery, role: roleFilter, status: statusFilter }],
    queryFn: async () => {
      // Uncomment when API is ready:
      // return getUsers({ search: searchQuery, role: roleFilter !== 'all' ? roleFilter : undefined, status: statusFilter !== 'all' ? statusFilter : undefined });

      // Mock implementation
      await new Promise((resolve) => setTimeout(resolve, 500));
      let filtered = [...mockUsers];

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (u) =>
            u.email.toLowerCase().includes(query) ||
            u.displayName?.toLowerCase().includes(query) ||
            u.firstName?.toLowerCase().includes(query) ||
            u.lastName?.toLowerCase().includes(query)
        );
      }

      if (roleFilter !== 'all') {
        filtered = filtered.filter((u) => u.role === roleFilter);
      }

      if (statusFilter !== 'all') {
        filtered = filtered.filter((u) =>
          statusFilter === 'active' ? u.isActive : !u.isActive
        );
      }

      return {
        data: filtered,
        meta: {
          total: filtered.length,
          page: 1,
          limit: 50,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    },
  });

  const users = usersData?.data ?? [];

  // Sessions query for detail drawer
  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ['user-sessions', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return [];
      // Uncomment when API is ready:
      // return getUserSessions(selectedUser.id);
      await new Promise((resolve) => setTimeout(resolve, 300));
      return mockSessions;
    },
    enabled: !!selectedUser && detailDrawerOpen,
  });

  // Activity query for detail drawer
  const { data: activity = [], isLoading: isLoadingActivity } = useQuery({
    queryKey: ['user-activity', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return [];
      // Uncomment when API is ready:
      // return getUserActivity(selectedUser.id, 10);
      await new Promise((resolve) => setTimeout(resolve, 300));
      return mockActivity;
    },
    enabled: !!selectedUser && detailDrawerOpen,
  });

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      toast({
        title: 'Invito inviato',
        description: "L'utente ricevera un'email con le istruzioni per accedere.",
      });
      setInviteModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: "Impossibile inviare l'invito. Riprova.",
        variant: 'destructive',
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateUserDto }) =>
      updateUser(userId, data),
    onSuccess: () => {
      toast({
        title: 'Utente aggiornato',
        description: 'Le modifiche sono state salvate con successo.',
      });
      setEditModalOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: "Impossibile aggiornare l'utente. Riprova.",
        variant: 'destructive',
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      toast({
        title: 'Utente eliminato',
        description: "L'utente e stato rimosso dal sistema.",
      });
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: "Impossibile eliminare l'utente. Riprova.",
        variant: 'destructive',
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, activate }: { userId: string; activate: boolean }) =>
      activate ? reactivateUser(userId) : deactivateUser(userId),
    onSuccess: (_, variables) => {
      toast({
        title: variables.activate ? 'Utente riattivato' : 'Utente disattivato',
        description: variables.activate
          ? "L'utente puo ora accedere al sistema."
          : "L'utente non puo piu accedere al sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: "Impossibile modificare lo stato dell'utente. Riprova.",
        variant: 'destructive',
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: resetUserPassword,
    onSuccess: () => {
      toast({
        title: 'Email inviata',
        description: "L'utente ricevera un link per reimpostare la password.",
      });
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: "Impossibile inviare l'email di reset. Riprova.",
        variant: 'destructive',
      });
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) =>
      selectedUser ? revokeUserSession(selectedUser.id, sessionId) : Promise.reject(),
    onSuccess: () => {
      toast({
        title: 'Sessione revocata',
        description: "La sessione e stata terminata.",
      });
      queryClient.invalidateQueries({ queryKey: ['user-sessions', selectedUser?.id] });
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: 'Impossibile revocare la sessione. Riprova.',
        variant: 'destructive',
      });
    },
  });

  // -------------------------------------------------------------------------
  // Event Handlers
  // -------------------------------------------------------------------------

  const handleInviteUser = useCallback(
    (data: CreateUserDto) => {
      // Mock for now - uncomment when API ready
      // createUserMutation.mutate(data);
      console.log('Invite user:', data);
      toast({
        title: 'Invito inviato (demo)',
        description: `Invito simulato inviato a ${data.email}`,
      });
      setInviteModalOpen(false);
    },
    [toast]
  );

  const handleUpdateUser = useCallback(
    (userId: string, data: UpdateUserDto) => {
      // Mock for now - uncomment when API ready
      // updateUserMutation.mutate({ userId, data });
      console.log('Update user:', userId, data);
      toast({
        title: 'Utente aggiornato (demo)',
        description: 'Modifiche simulate salvate',
      });
      setEditModalOpen(false);
      setSelectedUser(null);
    },
    [toast]
  );

  const handleDeleteUser = useCallback(() => {
    if (!selectedUser) return;
    // Mock for now - uncomment when API ready
    // deleteUserMutation.mutate(selectedUser.id);
    console.log('Delete user:', selectedUser.id);
    toast({
      title: 'Utente eliminato (demo)',
      description: 'Eliminazione simulata completata',
    });
    setDeleteDialogOpen(false);
    setSelectedUser(null);
  }, [selectedUser, toast]);

  const handleToggleStatus = useCallback(
    (user: User) => {
      // Mock for now - uncomment when API ready
      // toggleStatusMutation.mutate({ userId: user.id, activate: !user.isActive });
      console.log('Toggle status:', user.id, !user.isActive);
      toast({
        title: user.isActive ? 'Utente disattivato (demo)' : 'Utente riattivato (demo)',
        description: 'Cambio stato simulato',
      });
    },
    [toast]
  );

  const handleResetPassword = useCallback(
    (userId: string) => {
      // Mock for now - uncomment when API ready
      // resetPasswordMutation.mutate(userId);
      console.log('Reset password:', userId);
      toast({
        title: 'Email inviata (demo)',
        description: 'Reset password simulato',
      });
    },
    [toast]
  );

  const handleRevokeSession = useCallback(
    (sessionId: string) => {
      // Mock for now - uncomment when API ready
      // revokeSessionMutation.mutate(sessionId);
      console.log('Revoke session:', sessionId);
      toast({
        title: 'Sessione revocata (demo)',
        description: 'Revoca simulata',
      });
    },
    [toast]
  );

  const handleRowClick = useCallback((user: User) => {
    setSelectedUser(user);
    setDetailDrawerOpen(true);
  }, []);

  const handleEditClick = useCallback((user: User) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  }, []);

  const handleDeleteClick = useCallback((user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  }, []);

  // -------------------------------------------------------------------------
  // Table Columns
  // -------------------------------------------------------------------------

  const columns: Column<User>[] = useMemo(
    () => [
      {
        id: 'user',
        header: 'Utente',
        sortable: true,
        accessor: (row) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={row.avatar} />
              <AvatarFallback>{getInitials(row)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">
                {row.displayName || `${row.firstName || ''} ${row.lastName || ''}`.trim() || row.email}
              </p>
              <p className="text-sm text-muted-foreground">{row.email}</p>
            </div>
          </div>
        ),
      },
      {
        id: 'role',
        header: 'Ruolo',
        sortable: true,
        accessor: (row) => <RoleBadge role={row.role} />,
      },
      {
        id: 'status',
        header: 'Stato',
        sortable: true,
        accessor: (row) => <StatusBadge isActive={row.isActive} />,
      },
      {
        id: 'lastLogin',
        header: 'Ultimo accesso',
        sortable: true,
        accessor: (row) => (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {formatDateTime(row.lastLoginAt)}
          </div>
        ),
      },
      {
        id: 'createdAt',
        header: 'Creato il',
        sortable: true,
        accessor: (row) => (
          <span className="text-sm text-muted-foreground">{formatDate(row.createdAt)}</span>
        ),
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        accessor: (row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => handleEditClick(row)}>
                <Edit className="mr-2 h-4 w-4" />
                Modifica
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleStatus(row)}>
                {row.isActive ? (
                  <>
                    <UserX className="mr-2 h-4 w-4" />
                    Disattiva
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Riattiva
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => handleDeleteClick(row)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Elimina
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [handleEditClick, handleToggleStatus, handleDeleteClick]
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestione Utenti</h1>
          <p className="text-muted-foreground">
            Gestisci gli utenti e i loro permessi di accesso
          </p>
        </div>
        <Button onClick={() => setInviteModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Invita Utente
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={roleFilter}
                onValueChange={(value) => setRoleFilter(value as UserRole | 'all')}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Ruolo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i ruoli</SelectItem>
                  <SelectItem value="admin">Amministratore</SelectItem>
                  <SelectItem value="operator">Operatore</SelectItem>
                  <SelectItem value="viewer">Visualizzatore</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as UserStatus | 'all')}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="active">Attivi</SelectItem>
                  <SelectItem value="inactive">Inattivi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista Utenti</CardTitle>
          <CardDescription>
            {users.length} utent{users.length === 1 ? 'e' : 'i'} trovati
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={users}
            columns={columns}
            isLoading={isLoadingUsers}
            emptyMessage="Nessun utente trovato"
            onRowClick={handleRowClick}
            getRowId={(row) => row.id}
            showPagination={true}
            pageSize={10}
          />
        </CardContent>
      </Card>

      {/* Modals */}
      <InviteUserModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        onSubmit={handleInviteUser}
        isLoading={createUserMutation.isPending}
      />

      <EditUserModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        user={selectedUser}
        onSubmit={handleUpdateUser}
        onResetPassword={handleResetPassword}
        isLoading={updateUserMutation.isPending}
      />

      <UserDetailDrawer
        open={detailDrawerOpen}
        onOpenChange={setDetailDrawerOpen}
        user={selectedUser}
        sessions={sessions}
        activity={activity}
        onRevokeSession={handleRevokeSession}
        isLoadingSessions={isLoadingSessions}
        isLoadingActivity={isLoadingActivity}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        user={selectedUser}
        onConfirm={handleDeleteUser}
        isLoading={deleteUserMutation.isPending}
      />
    </div>
  );
}

export default Users;
