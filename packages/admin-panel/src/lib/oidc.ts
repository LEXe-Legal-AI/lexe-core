/**
 * LEO Frontend - OIDC Configuration
 *
 * Configures oidc-client-ts for Authentik integration.
 * Supports both direct OIDC login and fallback to internal JWT.
 */

import { UserManager, type UserManagerSettings, type User as OIDCUser } from 'oidc-client-ts';

// ============================================================================
// OIDC Configuration
// ============================================================================

/**
 * Get OIDC settings from environment variables
 */
const getOIDCSettings = (): UserManagerSettings => {
  const authority = import.meta.env.VITE_OIDC_AUTHORITY || 'http://auth.localhost:9000/application/o/leo-platform';
  const clientId = import.meta.env.VITE_OIDC_CLIENT_ID || 'leo-platform';
  const redirectUri = import.meta.env.VITE_OIDC_REDIRECT_URI || `${window.location.origin}/auth/callback`;
  const postLogoutRedirectUri = import.meta.env.VITE_OIDC_POST_LOGOUT_URI || `${window.location.origin}/login`;

  return {
    authority,
    client_id: clientId,
    redirect_uri: redirectUri,
    post_logout_redirect_uri: postLogoutRedirectUri,
    response_type: 'code',
    scope: 'openid email profile roles',
    automaticSilentRenew: true,
    silentRequestTimeoutInSeconds: 30,
    accessTokenExpiringNotificationTimeInSeconds: 60,
    filterProtocolClaims: true,
    loadUserInfo: true,
    monitorSession: true,
    // Authentik-specific settings
    metadata: {
      issuer: authority,
      authorization_endpoint: `${authority}/authorize/`,
      token_endpoint: `${authority}/token/`,
      userinfo_endpoint: `${authority}/userinfo/`,
      end_session_endpoint: `${authority}/end-session/`,
      jwks_uri: `${authority}/jwks/`,
    },
  };
};

// ============================================================================
// User Manager Singleton
// ============================================================================

let userManagerInstance: UserManager | null = null;

/**
 * Get or create UserManager instance
 */
export const getUserManager = (): UserManager => {
  if (!userManagerInstance) {
    userManagerInstance = new UserManager(getOIDCSettings());

    // Log events for debugging
    if (import.meta.env.DEV) {
      userManagerInstance.events.addUserLoaded((user) => {
        console.log('[OIDC] User loaded:', user.profile.email);
      });

      userManagerInstance.events.addUserUnloaded(() => {
        console.log('[OIDC] User unloaded');
      });

      userManagerInstance.events.addSilentRenewError((error) => {
        console.error('[OIDC] Silent renew error:', error);
      });

      userManagerInstance.events.addAccessTokenExpiring(() => {
        console.log('[OIDC] Access token expiring');
      });

      userManagerInstance.events.addAccessTokenExpired(() => {
        console.log('[OIDC] Access token expired');
      });
    }
  }

  return userManagerInstance;
};

// ============================================================================
// OIDC Helper Functions
// ============================================================================

/**
 * Initiate OIDC login redirect
 * @param returnTo - URL to return to after login (optional)
 */
export const loginWithOIDC = async (returnTo?: string): Promise<void> => {
  const userManager = getUserManager();
  const state = returnTo ? { returnTo } : undefined;
  await userManager.signinRedirect({ state });
};

/**
 * Handle OIDC callback after redirect
 * @returns The authenticated user or null
 */
export const handleOIDCCallback = async (): Promise<OIDCUser | null> => {
  const userManager = getUserManager();
  try {
    const user = await userManager.signinRedirectCallback();
    return user;
  } catch (error) {
    console.error('[OIDC] Callback error:', error);
    return null;
  }
};

/**
 * Get current OIDC user (if any)
 */
export const getOIDCUser = async (): Promise<OIDCUser | null> => {
  const userManager = getUserManager();
  try {
    return await userManager.getUser();
  } catch {
    return null;
  }
};

/**
 * Logout via OIDC
 */
export const logoutWithOIDC = async (): Promise<void> => {
  const userManager = getUserManager();
  try {
    await userManager.signoutRedirect();
  } catch (error) {
    console.error('[OIDC] Logout error:', error);
    // Clear local state even if signout fails
    await userManager.removeUser();
  }
};

/**
 * Silent token renewal
 */
export const renewToken = async (): Promise<OIDCUser | null> => {
  const userManager = getUserManager();
  try {
    return await userManager.signinSilent();
  } catch (error) {
    console.error('[OIDC] Silent renewal failed:', error);
    return null;
  }
};

/**
 * Check if OIDC is enabled
 */
export const isOIDCEnabled = (): boolean => {
  return import.meta.env.VITE_OIDC_ENABLED === 'true';
};

/**
 * Subscribe to OIDC events
 */
export const subscribeToOIDCEvents = (callbacks: {
  onUserLoaded?: (user: OIDCUser) => void;
  onUserUnloaded?: () => void;
  onSilentRenewError?: (error: Error) => void;
  onAccessTokenExpired?: () => void;
}): (() => void) => {
  const userManager = getUserManager();

  if (callbacks.onUserLoaded) {
    userManager.events.addUserLoaded(callbacks.onUserLoaded);
  }
  if (callbacks.onUserUnloaded) {
    userManager.events.addUserUnloaded(callbacks.onUserUnloaded);
  }
  if (callbacks.onSilentRenewError) {
    userManager.events.addSilentRenewError(callbacks.onSilentRenewError);
  }
  if (callbacks.onAccessTokenExpired) {
    userManager.events.addAccessTokenExpired(callbacks.onAccessTokenExpired);
  }

  // Return cleanup function
  return () => {
    if (callbacks.onUserLoaded) {
      userManager.events.removeUserLoaded(callbacks.onUserLoaded);
    }
    if (callbacks.onUserUnloaded) {
      userManager.events.removeUserUnloaded(callbacks.onUserUnloaded);
    }
    if (callbacks.onSilentRenewError) {
      userManager.events.removeSilentRenewError(callbacks.onSilentRenewError);
    }
    if (callbacks.onAccessTokenExpired) {
      userManager.events.removeAccessTokenExpired(callbacks.onAccessTokenExpired);
    }
  };
};

// ============================================================================
// Token Helpers
// ============================================================================

/**
 * Get access token from OIDC user
 */
export const getOIDCAccessToken = async (): Promise<string | null> => {
  const user = await getOIDCUser();
  return user?.access_token ?? null;
};

/**
 * Map OIDC user to application user format
 */
export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId?: string;
  groups?: string[];
}

export const mapOIDCUserToAppUser = (oidcUser: OIDCUser): AppUser => {
  const profile = oidcUser.profile;

  // Extract role from groups or direct claim
  let role = 'viewer';
  const groups = (profile.groups as string[]) || [];
  const directRole = profile.role as string | undefined;

  if (directRole) {
    role = directRole;
  } else if (groups.some((g) => g.toLowerCase().includes('admin'))) {
    role = 'admin';
  } else if (groups.some((g) => g.toLowerCase().includes('operator'))) {
    role = 'operator';
  }

  return {
    id: profile.sub,
    email: profile.email || '',
    name: profile.name || profile.preferred_username || profile.email || '',
    role,
    tenantId: profile.tenant_id as string | undefined,
    groups,
  };
};

export type { OIDCUser };
