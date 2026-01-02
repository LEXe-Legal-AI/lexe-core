/**
 * LEO Frontend - OIDC Authentication Types
 * TypeScript interfaces for OIDC authentication
 */

import type { User as OidcUser, UserProfile } from 'oidc-client-ts';

// ============================================================================
// OIDC User Types
// ============================================================================

/**
 * Extended OIDC profile with LEO-specific claims
 */
export interface LeoUserProfile extends UserProfile {
  /** User's email address */
  email?: string;
  /** Email verification status */
  email_verified?: boolean;
  /** User's display name */
  name?: string;
  /** User's given/first name */
  given_name?: string;
  /** User's family/last name */
  family_name?: string;
  /** User's preferred username */
  preferred_username?: string;
  /** Profile picture URL */
  picture?: string;
  /** Groups/roles the user belongs to */
  groups?: string[];
  /** Tenant ID for multi-tenant support */
  tenant_id?: string;
  /** User's locale */
  locale?: string;
  /** Timezone preference */
  zoneinfo?: string;
}

/**
 * Authenticated user representation for the application
 */
export interface AuthUser {
  /** Unique user identifier (sub claim) */
  id: string;
  /** User's email address */
  email: string;
  /** User's display name */
  name: string;
  /** User's first name */
  firstName: string;
  /** User's last name */
  lastName: string;
  /** Profile picture URL */
  avatar?: string;
  /** User's groups/roles */
  groups: string[];
  /** Computed primary role */
  role: 'admin' | 'operator' | 'viewer';
  /** Tenant ID */
  tenantId?: string;
}

// ============================================================================
// Auth State Types
// ============================================================================

/**
 * Authentication state
 */
export interface AuthState {
  /** Whether authentication is being processed */
  isLoading: boolean;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Current authenticated user */
  user: AuthUser | null;
  /** Raw OIDC user object */
  oidcUser: OidcUser | null;
  /** Authentication error message */
  error: string | null;
}

/**
 * Authentication context value
 */
export interface AuthContextValue extends AuthState {
  /** Initiate login flow */
  login: () => Promise<void>;
  /** Initiate logout flow */
  logout: () => Promise<void>;
  /** Silently refresh the access token */
  silentRefresh: () => Promise<void>;
  /** Get current access token */
  getAccessToken: () => string | null;
  /** Check if user has a specific role/group */
  hasRole: (role: string) => boolean;
  /** Check if user has any of the specified roles */
  hasAnyRole: (roles: string[]) => boolean;
}

// ============================================================================
// OIDC Configuration Types
// ============================================================================

/**
 * OIDC configuration options
 */
export interface OidcConfig {
  /** OIDC authority URL */
  authority: string;
  /** OAuth client ID */
  clientId: string;
  /** Redirect URI after login */
  redirectUri: string;
  /** Post-logout redirect URI */
  postLogoutRedirectUri: string;
  /** OAuth scopes */
  scope: string;
  /** Response type */
  responseType: string;
  /** Whether to automatically renew tokens */
  automaticSilentRenew: boolean;
  /** Whether to load user info from userinfo endpoint */
  loadUserInfo: boolean;
  /** Whether to monitor session */
  monitorSession: boolean;
  /** Silent redirect URI for token renewal */
  silentRedirectUri?: string;
}

// ============================================================================
// Helper Type Guards
// ============================================================================

/**
 * Type guard to check if a user profile has LEO-specific claims
 */
export function isLeoUserProfile(profile: UserProfile): profile is LeoUserProfile {
  return 'email' in profile || 'groups' in profile;
}

/**
 * Type guard to check if user has required profile data
 */
export function hasRequiredProfileData(profile: UserProfile | undefined): profile is LeoUserProfile {
  if (!profile) return false;
  return typeof profile.sub === 'string' && profile.sub.length > 0;
}

// ============================================================================
// Auth Event Types
// ============================================================================

/**
 * Auth event types for event handling
 */
export type AuthEventType =
  | 'userLoaded'
  | 'userUnloaded'
  | 'accessTokenExpired'
  | 'accessTokenExpiring'
  | 'silentRenewError'
  | 'userSignedOut'
  | 'userSessionChanged';

/**
 * Auth event payload
 */
export interface AuthEvent {
  type: AuthEventType;
  user?: OidcUser | null;
  error?: Error;
  timestamp: Date;
}

/**
 * Auth event handler
 */
export type AuthEventHandler = (event: AuthEvent) => void;
