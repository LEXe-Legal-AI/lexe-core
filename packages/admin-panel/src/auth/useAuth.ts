/**
 * LEO Frontend - useAuth Hook
 * Custom hook for accessing authentication context
 */

import { useContext, useMemo } from 'react';
import { AuthContext } from './AuthProvider';
import type { AuthContextValue, AuthUser } from './types';

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Hook to access authentication context
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Hook to get just the authenticated user
 */
export function useAuthUser(): AuthUser | null {
  const { user } = useAuth();
  return user;
}

/**
 * Hook to check authentication status
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

/**
 * Hook to get authentication loading state
 */
export function useAuthLoading(): boolean {
  const { isLoading } = useAuth();
  return isLoading;
}

/**
 * Hook to get authentication error
 */
export function useAuthError(): string | null {
  const { error } = useAuth();
  return error;
}

/**
 * Hook to get access token
 */
export function useAccessToken(): string | null {
  const { getAccessToken } = useAuth();
  return useMemo(() => getAccessToken(), [getAccessToken]);
}

// ============================================================================
// Role-Based Hooks
// ============================================================================

/**
 * Hook to check if user has a specific role
 */
export function useHasRole(role: string): boolean {
  const { hasRole } = useAuth();
  return useMemo(() => hasRole(role), [hasRole, role]);
}

/**
 * Hook to check if user has any of the specified roles
 */
export function useHasAnyRole(roles: string[]): boolean {
  const { hasAnyRole } = useAuth();
  return useMemo(() => hasAnyRole(roles), [hasAnyRole, roles]);
}

/**
 * Hook to check if user is admin
 */
export function useIsAdmin(): boolean {
  const { user, hasRole } = useAuth();
  return useMemo(() => {
    return user?.role === 'admin' || hasRole('admin') || hasRole('administrators');
  }, [user, hasRole]);
}

/**
 * Hook to check if user is operator or higher
 */
export function useIsOperator(): boolean {
  const { user, hasAnyRole } = useAuth();
  return useMemo(() => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'operator' ||
           hasAnyRole(['admin', 'administrators', 'operator', 'operators']);
  }, [user, hasAnyRole]);
}

// ============================================================================
// Action Hooks
// ============================================================================

/**
 * Hook to get login function
 */
export function useLogin(): () => Promise<void> {
  const { login } = useAuth();
  return login;
}

/**
 * Hook to get logout function
 */
export function useLogout(): () => Promise<void> {
  const { logout } = useAuth();
  return logout;
}

/**
 * Hook to get silent refresh function
 */
export function useSilentRefresh(): () => Promise<void> {
  const { silentRefresh } = useAuth();
  return silentRefresh;
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook that returns auth state and actions for forms/components
 */
export function useAuthActions() {
  const { login, logout, silentRefresh, isLoading, error } = useAuth();

  return useMemo(() => ({
    login,
    logout,
    silentRefresh,
    isLoading,
    error,
  }), [login, logout, silentRefresh, isLoading, error]);
}

/**
 * Hook that returns user profile data
 */
export function useUserProfile() {
  const { user, isAuthenticated } = useAuth();

  return useMemo(() => ({
    isAuthenticated,
    user,
    displayName: user?.name || user?.email || 'Unknown',
    initials: user?.name
      ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : user?.email?.slice(0, 2).toUpperCase() || '??',
    email: user?.email || '',
    avatar: user?.avatar,
    role: user?.role || 'viewer',
    groups: user?.groups || [],
  }), [user, isAuthenticated]);
}

/**
 * Hook for permission checking
 */
export function usePermissions() {
  const { user, hasRole, hasAnyRole } = useAuth();

  return useMemo(() => ({
    hasRole,
    hasAnyRole,
    isAdmin: user?.role === 'admin' || hasRole('admin'),
    isOperator: hasAnyRole(['admin', 'operator']),
    canManageUsers: hasAnyRole(['admin', 'user_manager']),
    canManageAgents: hasAnyRole(['admin', 'agent_manager', 'operator']),
    canViewAnalytics: hasAnyRole(['admin', 'analyst', 'operator']),
    canModifySettings: hasRole('admin'),
  }), [user, hasRole, hasAnyRole]);
}

// ============================================================================
// Default Export
// ============================================================================

export default useAuth;
