/**
 * LEO Frontend - OIDC Callback Page
 * Handles the redirect after OIDC authentication
 */

import { useNavigate } from 'react-router-dom';
import { AuthCallback } from '@/auth';

export default function Callback() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    // Check for returnUrl in sessionStorage or use default
    const returnUrl = sessionStorage.getItem('auth_return_url') || '/';
    sessionStorage.removeItem('auth_return_url');
    navigate(returnUrl, { replace: true });
  };

  const handleError = (error: Error) => {
    console.error('Authentication callback error:', error);
    navigate('/login?error=auth_failed', { replace: true });
  };

  return (
    <AuthCallback
      onSuccess={handleSuccess}
      onError={handleError}
      loadingComponent={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-sm text-muted-foreground">
              Completamento autenticazione...
            </p>
          </div>
        </div>
      }
    />
  );
}
