/**
 * LEO Frontend - OIDC Callback Handler
 *
 * Handles the redirect back from Authentik after OIDC authentication.
 * Processes the authorization code and stores the tokens.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleOIDCCallback, mapOIDCUserToAppUser, type OIDCUser } from '@/lib/oidc';
import { useAuthStore } from '@/stores/authStore';
import { tokenStorage } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * AuthCallback page - Processes OIDC redirect
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser, setToken } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Handle the OIDC callback
        const oidcUser: OIDCUser | null = await handleOIDCCallback();

        if (!oidcUser) {
          setError('Authentication failed. No user returned.');
          return;
        }

        // Map OIDC user to app user
        const appUser = mapOIDCUserToAppUser(oidcUser);

        // Store tokens
        if (oidcUser.access_token) {
          tokenStorage.setAccessToken(oidcUser.access_token);
          setToken(oidcUser.access_token);
        }
        if (oidcUser.refresh_token) {
          tokenStorage.setRefreshToken(oidcUser.refresh_token);
        }

        // Update auth store
        setUser({
          id: appUser.id,
          email: appUser.email,
          name: appUser.name,
          role: appUser.role,
        });

        // Get return URL from state or default to dashboard
        const returnTo = (oidcUser.state as { returnTo?: string })?.returnTo || '/';

        // Redirect to intended destination
        navigate(returnTo, { replace: true });
      } catch (err) {
        console.error('[AuthCallback] Error processing callback:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      }
    };

    processCallback();
  }, [navigate, setUser, setToken]);

  // Show loading or error state
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            {error ? 'Authentication Error' : 'Authenticating...'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {error ? (
            <>
              <p className="text-center text-destructive">{error}</p>
              <button
                className="text-primary underline hover:no-underline"
                onClick={() => navigate('/login', { replace: true })}
              >
                Return to Login
              </button>
            </>
          ) : (
            <>
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-center text-muted-foreground">
                Please wait while we complete your sign-in...
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
