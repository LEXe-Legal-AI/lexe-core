/**
 * LEO Frontend - Private Route Component
 * Route protection with OIDC authentication
 */

import { type ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, useIsAuthenticated, useAuthLoading, useHasAnyRole } from './useAuth';

// ============================================================================
// Loading Component
// ============================================================================

interface LoadingSpinnerProps {
  message?: string;
}

function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Unauthorized Component
// ============================================================================

interface UnauthorizedProps {
  requiredRoles?: string[];
}

function Unauthorized({ requiredRoles }: UnauthorizedProps) {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-4 text-6xl">403</div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="mb-4 text-muted-foreground">
          You don't have permission to access this page.
          {requiredRoles && requiredRoles.length > 0 && (
            <span className="block mt-2">
              Required role: {requiredRoles.join(' or ')}
            </span>
          )}
        </p>
        <div className="space-x-4">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
          >
            Go Back
          </button>
          <button
            onClick={() => logout()}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Private Route Component
// ============================================================================

interface PrivateRouteProps {
  children: ReactNode;
  /** Redirect path when not authenticated */
  redirectTo?: string;
  /** Required roles to access the route (any of these) */
  requiredRoles?: string[];
  /** Custom loading component */
  loadingComponent?: ReactNode;
  /** Custom unauthorized component */
  unauthorizedComponent?: ReactNode;
  /** Whether to show unauthorized page or redirect */
  showUnauthorized?: boolean;
}

/**
 * Private route component that protects routes requiring authentication
 *
 * @example
 * ```tsx
 * <PrivateRoute>
 *   <Dashboard />
 * </PrivateRoute>
 *
 * // With role requirement
 * <PrivateRoute requiredRoles={['admin']}>
 *   <AdminPanel />
 * </PrivateRoute>
 * ```
 */
export function PrivateRoute({
  children,
  redirectTo = '/login',
  requiredRoles,
  loadingComponent,
  unauthorizedComponent,
  showUnauthorized = true,
}: PrivateRouteProps) {
  const location = useLocation();
  const isAuthenticated = useIsAuthenticated();
  const isLoading = useAuthLoading();
  const hasRequiredRole = useHasAnyRole(requiredRoles || []);

  // Listen for auth:logout events
  useEffect(() => {
    const handleLogout = () => {
      // Navigation will happen through state change
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  // Show loading state while checking authentication
  if (isLoading) {
    return loadingComponent ? <>{loadingComponent}</> : <LoadingSpinner message="Checking authentication..." />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Preserve the attempted URL for redirect after login
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${redirectTo}?returnUrl=${returnUrl}`} replace />;
  }

  // Check role requirements
  if (requiredRoles && requiredRoles.length > 0 && !hasRequiredRole) {
    if (showUnauthorized) {
      return unauthorizedComponent ? (
        <>{unauthorizedComponent}</>
      ) : (
        <Unauthorized requiredRoles={requiredRoles} />
      );
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// ============================================================================
// Role-Based Route Components
// ============================================================================

interface RoleRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Route that requires admin role
 */
export function AdminRoute({ children, fallback }: RoleRouteProps) {
  return (
    <PrivateRoute
      requiredRoles={['admin', 'administrators']}
      unauthorizedComponent={fallback}
    >
      {children}
    </PrivateRoute>
  );
}

/**
 * Route that requires operator or admin role
 */
export function OperatorRoute({ children, fallback }: RoleRouteProps) {
  return (
    <PrivateRoute
      requiredRoles={['admin', 'administrators', 'operator', 'operators']}
      unauthorizedComponent={fallback}
    >
      {children}
    </PrivateRoute>
  );
}

// ============================================================================
// Public Route Component
// ============================================================================

interface PublicRouteProps {
  children: ReactNode;
  /** Redirect path when already authenticated */
  redirectTo?: string;
}

/**
 * Route that redirects authenticated users away (e.g., login page)
 */
export function PublicRoute({ children, redirectTo = '/' }: PublicRouteProps) {
  const isAuthenticated = useIsAuthenticated();
  const isLoading = useAuthLoading();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner message="Loading..." />;
  }

  if (isAuthenticated) {
    // Check for returnUrl in query params
    const searchParams = new URLSearchParams(location.search);
    const returnUrl = searchParams.get('returnUrl');
    const targetPath = returnUrl ? decodeURIComponent(returnUrl) : redirectTo;

    return <Navigate to={targetPath} replace />;
  }

  return <>{children}</>;
}

// ============================================================================
// HOC for Route Protection
// ============================================================================

interface WithAuthOptions {
  requiredRoles?: string[];
  redirectTo?: string;
}

/**
 * Higher-order component for protecting components
 *
 * @example
 * ```tsx
 * const ProtectedDashboard = withAuth(Dashboard);
 * const AdminPanel = withAuth(AdminPanelComponent, { requiredRoles: ['admin'] });
 * ```
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: WithAuthOptions = {}
) {
  const { requiredRoles, redirectTo } = options;

  function WrappedComponent(props: P) {
    return (
      <PrivateRoute requiredRoles={requiredRoles} redirectTo={redirectTo}>
        <Component {...props} />
      </PrivateRoute>
    );
  }

  WrappedComponent.displayName = `withAuth(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

// ============================================================================
// Default Export
// ============================================================================

export default PrivateRoute;
