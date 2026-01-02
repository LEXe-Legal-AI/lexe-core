/**
 * Auth Callback Page
 *
 * Handles both:
 * - OAuth callback from Authentik (code exchange)
 * - Magic link verification (token validation)
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { GlassCard } from '@/components/effects/GlassCard';
import { getOAuthService } from '@/services/auth';
import { useAuthStore } from '@/stores/authStore';

type CallbackState = 'processing' | 'success' | 'error';
type CallbackType = 'oauth' | 'magic_link';

export function CallbackPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<CallbackState>('processing');
  const [callbackType, setCallbackType] = useState<CallbackType>('oauth');
  const [error, setError] = useState<string | null>(null);
  const { initAuth } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for magic link token first
        const magicToken = searchParams.get('token');
        if (magicToken) {
          setCallbackType('magic_link');
          await handleMagicLinkVerification(magicToken);
          return;
        }

        // Otherwise, handle OAuth callback
        setCallbackType('oauth');

        // Check for error in callback URL
        const errorParam = searchParams.get('error');
        if (errorParam) {
          const errorDesc = searchParams.get('error_description') || 'Authorization failed';
          throw new Error(errorDesc);
        }

        // Handle the OAuth callback
        const oauthService = getOAuthService();
        await oauthService.handleCallback(window.location.href);

        // Reinitialize auth state with new tokens
        await initAuth();

        setState('success');

        // Redirect to home after brief delay
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1000);
      } catch (err) {
        console.error('Callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setState('error');

        // Redirect to login after delay
        setTimeout(() => {
          navigate('/login?error=invalid_token', { replace: true });
        }, 3000);
      }
    };

    /**
     * Handle magic link token verification
     */
    const handleMagicLinkVerification = async (token: string) => {
      try {
        // Extract base host from API URL
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
        const urlParts = apiUrl.match(/^(https?:\/\/[^/]+)/);
        const baseHost = urlParts ? urlParts[1] : apiUrl;
        const verifyUrl = `${baseHost}/api/auth/verify?token=${encodeURIComponent(token)}`;

        const response = await fetch(verifyUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || 'Invalid or expired token');
        }

        const data = await response.json();

        // Store tokens
        localStorage.setItem('leo-auth-tokens', JSON.stringify({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
          isGuest: false,
        }));

        // Reinitialize auth state
        await initAuth();

        setState('success');

        // Redirect to home after brief delay
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1000);
      } catch (err) {
        console.error('Magic link verification error:', err);
        throw err;
      }
    };

    handleCallback();
  }, [searchParams, navigate, initAuth]);

  // Get appropriate messages based on callback type
  const processingMessage = callbackType === 'magic_link'
    ? t('auth.verifying_link', 'Verifying your login link...')
    : t('auth.authenticating', 'Authenticating...');

  const processingSubtext = callbackType === 'magic_link'
    ? t('auth.verifying_link_subtext', 'Just a moment while we log you in')
    : t('auth.authenticating_subtext', 'Please wait while we verify your credentials');

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-leo-dark via-leo-primary/30 to-leo-dark">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <GlassCard variant="dark" padding="lg" className="text-center">
          {state === 'processing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {callbackType === 'magic_link' ? (
                <div className="relative">
                  <Mail className="w-12 h-12 mx-auto text-leo-accent" />
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-leo-accent/30"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </div>
              ) : (
                <Loader2 className="w-12 h-12 mx-auto text-leo-accent animate-spin" />
              )}
              <p className="text-lg font-medium text-white">{processingMessage}</p>
              <p className="text-sm text-leo-gray">{processingSubtext}</p>
            </motion.div>
          )}

          {state === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                <CheckCircle className="w-12 h-12 mx-auto text-emerald-400" />
              </motion.div>
              <p className="text-lg font-medium text-white">
                {t('auth.success', 'Authentication Successful')}
              </p>
              <p className="text-sm text-leo-gray">
                {t('auth.redirecting', 'Redirecting to LEO...')}
              </p>
            </motion.div>
          )}

          {state === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                <XCircle className="w-12 h-12 mx-auto text-red-400" />
              </motion.div>
              <p className="text-lg font-medium text-white">
                {callbackType === 'magic_link'
                  ? t('auth.link_invalid', 'Invalid or Expired Link')
                  : t('auth.failed', 'Authentication Failed')
                }
              </p>
              <p className="text-sm text-red-300">{error}</p>
              <p className="text-xs text-leo-gray">
                {t('auth.redirecting_login', 'Redirecting to login...')}
              </p>
            </motion.div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}

export default CallbackPage;
