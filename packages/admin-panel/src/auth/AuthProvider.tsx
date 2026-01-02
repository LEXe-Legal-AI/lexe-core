/**
 * LEO Frontend - OIDC Auth Provider
 * React context provider for authentication state management
 */

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  UserManager,
  WebStorageStateStore,
  User as OidcUser,
  type UserProfile,
} from 'oidc-client-ts';

import { createUserManagerSettings, isDevModeEnabled, DEV_MODE_USER } from './config';
import type {
  AuthContextValue,
  AuthState,
  AuthUser,
  LeoUserProfile,
} from './types';

// ============================================================================
// Context Creation
// ============================================================================

const initialState: AuthState = {
  isLoading: true,
  isAuthenticated: false,
  user: null,
  oidcUser: null,
  error: null,
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Transform OIDC user profile to application user
 */
function transformOidcUser(oidcUser: OidcUser): AuthUser {
  const profile = oidcUser.profile as LeoUserProfile;

  // Extract groups from profile or access token
  const groups: string[] = profile.groups || [];

  // Determine role based on groups
  let role: AuthUser['role'] = 'viewer';
  if (groups.includes('admin') || groups.includes('administrators')) {
    role = 'admin';
  } else if (groups.includes('operator') || groups.includes('operators')) {
    role = 'operator';
  }

  return {
    id: profile.sub,
    email: profile.email || profile.preferred_username || '',
    name: profile.name || `${profile.given_name || ''} ${profile.family_name || ''}`.trim() || profile.preferred_username || '',
    firstName: profile.given_name || '',
    lastName: profile.family_name || '',
    avatar: profile.picture,
    groups,
    role,
    tenantId: profile.tenant_id,
  };
}

/**
 * Create mock OIDC user for development mode
 */
function createDevModeOidcUser(): OidcUser {
  const now = Math.floor(Date.now() / 1000);
  const profile: UserProfile = {
    sub: DEV_MODE_USER.id,
    email: DEV_MODE_USER.email,
    name: DEV_MODE_USER.name,
    given_name: DEV_MODE_USER.firstName,
    family_name: DEV_MODE_USER.lastName,
    groups: DEV_MODE_USER.groups,
    iss: 'dev-mode',
    aud: 'leo-platform',
    exp: now + 3600,
    iat: now,
  } as UserProfile;

  return {
    id_token: 'dev-id-token',
    session_state: 'dev-session',
    access_token: 'dev-access-token',
    refresh_token: 'dev-refresh-token',
    token_type: 'Bearer',
    scope: 'openid email profile groups',
    profile,
    expires_at: now + 3600,
    state: null,
    expired: false,
    scopes: ['openid', 'email', 'profile', 'groups'],
    toStorageString: () => JSON.stringify({ profile }),
  } as OidcUser;
}

// ============================================================================
// Auth Provider Component
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
  /** Optional: Override UserManager for testing */
  userManager?: UserManager;
}

export function AuthProvider({ children, userManager: externalUserManager }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(initialState);
  const userManagerRef = useRef<UserManager | null>(null);
  const initializedRef = useRef(false);

  // Initialize UserManager
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Dev mode bypass
    if (isDevModeEnabled()) {
      console.info('[Auth] Development mode enabled - using mock authentication');
      const devUser = createDevModeOidcUser();
      setState({
        isLoading: false,
        isAuthenticated: true,
        user: DEV_MODE_USER,
        oidcUser: devUser,
        error: null,
      });
      return;
    }

    // Use external UserManager or create new one
    const manager = externalUserManager || new UserManager(
      createUserManagerSettings(
        new WebStorageStateStore({ store: window.sessionStorage }),
        new WebStorageStateStore({ store: window.localStorage })
      )
    );
    userManagerRef.current = manager;

    // Event handlers
    const handleUserLoaded = (user: OidcUser) => {
      console.info('[Auth] User loaded');
      setState({
        isLoading: false,
        isAuthenticated: true,
        user: transformOidcUser(user),
        oidcUser: user,
        error: null,
      });
    };

    const handleUserUnloaded = () => {
      console.info('[Auth] User unloaded');
      setState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        oidcUser: null,
        error: null,
      });
    };

    const handleAccessTokenExpired = () => {
      console.warn('[Auth] Access token expired');
      setState(prev => ({
        ...prev,
        error: 'Session expired. Please log in again.',
      }));
    };

    const handleSilentRenewError = (error: Error) => {
      console.error('[Auth] Silent renew error:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to refresh session. Please log in again.',
      }));
    };

    const handleUserSignedOut = () => {
      console.info('[Auth] User signed out from IDP');
      setState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        oidcUser: null,
        error: null,
      });
    };

    // Register event handlers
    manager.events.addUserLoaded(handleUserLoaded);
    manager.events.addUserUnloaded(handleUserUnloaded);
    manager.events.addAccessTokenExpired(handleAccessTokenExpired);
    manager.events.addSilentRenewError(handleSilentRenewError);
    manager.events.addUserSignedOut(handleUserSignedOut);

    // Check for existing session
    manager.getUser()
      .then((user) => {
        if (user && !user.expired) {
          handleUserLoaded(user);
        } else {
          setState(prev => ({
            ...prev,
            isLoading: false,
          }));
        }
      })
      .catch((error) => {
        console.error('[Auth] Error loading user:', error);
        setState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          oidcUser: null,
          error: 'Failed to load user session',
        });
      });

    // Cleanup
    return () => {
      manager.events.removeUserLoaded(handleUserLoaded);
      manager.events.removeUserUnloaded(handleUserUnloaded);
      manager.events.removeAccessTokenExpired(handleAccessTokenExpired);
      manager.events.removeSilentRenewError(handleSilentRenewError);
      manager.events.removeUserSignedOut(handleUserSignedOut);
    };
  }, [externalUserManager]);

  // Login handler
  const login = useCallback(async () => {
    if (isDevModeEnabled()) {
      console.info('[Auth] Dev mode - login bypassed');
      return;
    }

    const manager = userManagerRef.current;
    if (!manager) {
      throw new Error('UserManager not initialized');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await manager.signinRedirect();
    } catch (error) {
      console.error('[Auth] Login error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }));
      throw error;
    }
  }, []);

  // Logout handler
  const logout = useCallback(async () => {
    if (isDevModeEnabled()) {
      console.info('[Auth] Dev mode - logout');
      setState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        oidcUser: null,
        error: null,
      });
      window.dispatchEvent(new CustomEvent('auth:logout'));
      return;
    }

    const manager = userManagerRef.current;
    if (!manager) {
      throw new Error('UserManager not initialized');
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      await manager.signoutRedirect();
    } catch (error) {
      console.error('[Auth] Logout error:', error);
      // Clear state even on error
      setState({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        oidcUser: null,
        error: null,
      });
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
  }, []);

  // Silent refresh handler
  const silentRefresh = useCallback(async () => {
    if (isDevModeEnabled()) {
      console.info('[Auth] Dev mode - silent refresh bypassed');
      return;
    }

    const manager = userManagerRef.current;
    if (!manager) {
      throw new Error('UserManager not initialized');
    }

    try {
      await manager.signinSilent();
    } catch (error) {
      console.error('[Auth] Silent refresh error:', error);
      throw error;
    }
  }, []);

  // Get access token
  const getAccessToken = useCallback((): string | null => {
    if (isDevModeEnabled()) {
      return 'dev-access-token';
    }
    return state.oidcUser?.access_token || null;
  }, [state.oidcUser]);

  // Role checking
  const hasRole = useCallback((role: string): boolean => {
    return state.user?.groups.includes(role) || state.user?.role === role || false;
  }, [state.user]);

  const hasAnyRole = useCallback((roles: string[]): boolean => {
    if (!state.user) return false;
    return roles.some(role => state.user!.groups.includes(role) || state.user!.role === role);
  }, [state.user]);

  // Context value
  const contextValue = useMemo<AuthContextValue>(() => ({
    ...state,
    login,
    logout,
    silentRefresh,
    getAccessToken,
    hasRole,
    hasAnyRole,
  }), [state, login, logout, silentRefresh, getAccessToken, hasRole, hasAnyRole]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// Callback Handler Component
// ============================================================================

interface CallbackHandlerProps {
  /** Called after successful authentication */
  onSuccess?: () => void;
  /** Called on authentication error */
  onError?: (error: Error) => void;
  /** Loading component to show during callback processing */
  loadingComponent?: ReactNode;
}

/**
 * Component to handle OIDC callback
 * Place this at your callback route (e.g., /callback)
 */
export function AuthCallback({
  onSuccess,
  onError,
  loadingComponent,
}: CallbackHandlerProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isDevModeEnabled()) {
      onSuccess?.();
      return;
    }

    const manager = new UserManager(createUserManagerSettings());

    manager.signinRedirectCallback()
      .then(() => {
        console.info('[Auth] Callback successful');
        onSuccess?.();
      })
      .catch((err) => {
        console.error('[Auth] Callback error:', err);
        setError(err.message || 'Authentication failed');
        onError?.(err);
      });
  }, [onSuccess, onError]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-red-600">Authentication Error</h1>
          <p className="mt-2 text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return loadingComponent || (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}

// ============================================================================
// Silent Renew Handler Component
// ============================================================================

/**
 * Component to handle silent token renewal
 * Place this at your silent renew route (e.g., /silent-renew)
 */
export function SilentRenew() {
  useEffect(() => {
    if (isDevModeEnabled()) return;

    const manager = new UserManager(createUserManagerSettings());
    manager.signinSilentCallback()
      .catch((error) => {
        console.error('[Auth] Silent renew callback error:', error);
      });
  }, []);

  return null;
}

export default AuthProvider;
