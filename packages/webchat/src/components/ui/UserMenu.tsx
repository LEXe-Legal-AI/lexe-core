/**
 * UserMenu Component
 *
 * Dropdown menu showing user info and logout option.
 */

import { useTranslation } from 'react-i18next';
import { LogOut, Settings, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage, getInitials } from './Avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './DropdownMenu';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

export function UserMenu() {
  const { t } = useTranslation();
  const { userInfo, logout, isAuthenticated } = useAuthStore();

  const displayName = userInfo?.name || userInfo?.email?.split('@')[0] || t('user.user');
  const displayEmail = userInfo?.email || t('user.noEmail');
  const initials = getInitials(displayName);

  const handleLogout = async () => {
    await logout();
    // After logout, page will redirect to login or show auth screen
    window.location.reload();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 p-1.5 rounded-lg',
            'hover:bg-muted transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-leo-primary/50'
          )}
          aria-label={t('user.menu')}
        >
          <Avatar size="sm" status={isAuthenticated ? 'online' : 'offline'}>
            <AvatarImage src={undefined} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {/* User Info Header */}
        <div className="px-3 py-3">
          <div className="flex items-center gap-3">
            <Avatar size="md">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Menu Items */}
        <DropdownMenuItem onClick={() => console.log('Settings clicked')}>
          <Settings className="w-4 h-4" />
          <span>{t('user.settings')}</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => console.log('Profile clicked')}>
          <User className="w-4 h-4" />
          <span>{t('user.profile')}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Logout */}
        <DropdownMenuItem onClick={handleLogout} destructive>
          <LogOut className="w-4 h-4" />
          <span>{t('user.logout')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
