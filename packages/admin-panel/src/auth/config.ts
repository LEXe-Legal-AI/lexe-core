/**
 * LEO Frontend - OIDC Configuration
 * Configuration for oidc-client-ts library
 */

import type { UserManagerSettings, WebStorageStateStore } from 'oidc-client-ts';
import type { OidcConfig } from './types';

// ============================================================================
// Environment Variables
// ============================================================================

/**
 * Get OIDC configuration from environment variables with defaults
 */
function getEnvConfig(): OidcConfig {
  return {
    authority: import.meta.env.VITE_OIDC_AUTHORITY || 'http://auth.localhost:9000/application/o/leo-platform/',
    clientId: import.meta.env.VITE_OIDC_CLIENT_ID || 'leo-platform',
    redirectUri: import.meta.env.VITE_OIDC_REDIRECT_URI || `${window.location.origin}/callback`,
    postLogoutRedirectUri: import.meta.env.VITE_OIDC_POST_LOGOUT_URI || window.location.origin,
    scope: import.meta.env.VITE_OIDC_SCOPE || 'openid email profile groups',
    responseType: 'code',
    automaticSilentRenew: true,
    loadUserInfo: true,
    monitorSession: true,
    silentRedirectUri: import.meta.env.VITE_OIDC_SILENT_REDIRECT_URI || `${window.location.origin}/silent-renew.html`,
  };
}

// ============================================================================
// User Manager Settings
// ============================================================================

/**
 * Create UserManagerSettings for oidc-client-ts
 */
export function createUserManagerSettings(
  stateStore?: WebStorageStateStore,
  userStore?: WebStorageStateStore
): UserManagerSettings {
  const config = getEnvConfig();

  return {
    // Authority configuration
    authority: config.authority,
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    post_logout_redirect_uri: config.postLogoutRedirectUri,

    // Response configuration
    response_type: config.responseType,
    scope: config.scope,

    // Token management
    automaticSilentRenew: config.automaticSilentRenew,
    silent_redirect_uri: config.silentRedirectUri,

    // User info
    loadUserInfo: config.loadUserInfo,

    // Session monitoring
    monitorSession: config.monitorSession,

    // Storage
    stateStore: stateStore,
    userStore: userStore,

    // Additional settings
    filterProtocolClaims: true,
    revokeTokensOnSignout: true,

    // Token refresh buffer (refresh 60s before expiry)
    accessTokenExpiringNotificationTimeInSeconds: 60,
  };
}

// ============================================================================
// Default Configuration Export
// ============================================================================

/**
 * Default OIDC configuration values
 */
export const oidcConfig = getEnvConfig();

/**
 * Validate OIDC configuration
 */
export function validateOidcConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const config = getEnvConfig();

  if (!config.authority) {
    errors.push('OIDC authority is required');
  }

  if (!config.clientId) {
    errors.push('OIDC client ID is required');
  }

  if (!config.redirectUri) {
    errors.push('OIDC redirect URI is required');
  }

  // Validate URLs
  try {
    new URL(config.authority);
  } catch {
    errors.push('OIDC authority must be a valid URL');
  }

  try {
    new URL(config.redirectUri);
  } catch {
    errors.push('OIDC redirect URI must be a valid URL');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Well-Known Endpoints
// ============================================================================

/**
 * Get well-known OIDC configuration URL
 */
export function getWellKnownUrl(): string {
  const authority = oidcConfig.authority.replace(/\/$/, '');
  return `${authority}/.well-known/openid-configuration`;
}

/**
 * OIDC callback routes
 */
export const OIDC_ROUTES = {
  /** Login callback route */
  CALLBACK: '/callback',
  /** Silent renew callback route */
  SILENT_RENEW: '/silent-renew',
  /** Logout callback route */
  LOGOUT_CALLBACK: '/logout',
} as const;

// ============================================================================
// Development Mode
// ============================================================================

/**
 * Check if dev mode authentication bypass is enabled
 */
export function isDevModeEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH === 'true';
}

/**
 * Development mode user for testing
 */
export const DEV_MODE_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@leo.local',
  name: 'Admin LEO',
  firstName: 'Admin',
  lastName: 'LEO',
  groups: ['admin', 'operators'],
  role: 'admin' as const,
  tenantId: 'default',
};
