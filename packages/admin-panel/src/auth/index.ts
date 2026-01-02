/**
 * LEO Frontend - Auth Module
 * OIDC authentication with oidc-client-ts
 */

// Configuration
export { oidcConfig, createUserManagerSettings, validateOidcConfig, getWellKnownUrl, OIDC_ROUTES, isDevModeEnabled, DEV_MODE_USER } from './config';

// Provider
export { AuthProvider, AuthContext, AuthCallback, SilentRenew } from './AuthProvider';

// Hooks
export {
  useAuth,
  useAuthUser,
  useIsAuthenticated,
  useAuthLoading,
  useAuthError,
  useAccessToken,
  useHasRole,
  useHasAnyRole,
  useIsAdmin,
  useIsOperator,
  useLogin,
  useLogout,
  useSilentRefresh,
  useAuthActions,
  useUserProfile,
  usePermissions,
} from './useAuth';

// Route Protection
export {
  PrivateRoute,
  AdminRoute,
  OperatorRoute,
  PublicRoute,
  withAuth,
} from './PrivateRoute';

// Types
export type {
  LeoUserProfile,
  AuthUser,
  AuthState,
  AuthContextValue,
  OidcConfig,
  AuthEventType,
  AuthEvent,
  AuthEventHandler,
} from './types';

export { isLeoUserProfile, hasRequiredProfileData } from './types';
