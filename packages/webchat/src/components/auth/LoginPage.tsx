/**
 * LoginPage Component
 *
 * Premium login page with OAuth and magic link email authentication.
 * Follows LEO design system with glassmorphism and animations.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, Mail, Lock, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';

import { GlassCard } from '@/components/effects/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';
import { getOAuthService } from '@/services/auth';
import { getApiClient } from '@/services/api/client';
import { cn } from '@/lib/utils';

/**
 * Animation variants for staggered entry
 */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

/**
 * LoginPage Component
 */
export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { initAuth, isLoading: authLoading } = useAuthStore();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMethod, setActiveMethod] = useState<'oauth' | 'magic' | 'email' | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Check if in development mode
  const isDev = import.meta.env.DEV;

  // Check for error from callback
  const callbackError = searchParams.get('error');

  /**
   * Handle OAuth login with Authentik
   */
  const handleOAuthLogin = useCallback(async () => {
    setActiveMethod('oauth');
    setError(null);
    try {
      const oauthService = getOAuthService();
      await oauthService.login();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth not configured');
      setActiveMethod(null);
    }
  }, []);

  /**
   * Handle magic link request
   */
  const handleMagicLinkRequest = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setActiveMethod('magic');
    setError(null);
    setIsSubmitting(true);

    try {
      // Extract base host from API URL
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const urlParts = apiUrl.match(/^(https?:\/\/[^/]+)/);
      const baseHost = urlParts ? urlParts[1] : apiUrl;
      const registerUrl = `${baseHost}/api/auth/register`;

      const response = await fetch(registerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to send magic link');
      }

      // Success - show confirmation
      setMagicLinkSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors:auth.magic_link_failed', 'Failed to send login link'));
    } finally {
      setIsSubmitting(false);
      setActiveMethod(null);
    }
  }, [email, t]);

  /**
   * Handle email/password login (dev only)
   */
  const handleEmailLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setActiveMethod('email');
    setError(null);
    setIsSubmitting(true);

    try {
      const client = getApiClient();
      const { data } = await client.post<{
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      }>('/auth/login', { email, password });

      // Store tokens
      localStorage.setItem('leo-auth-tokens', JSON.stringify({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
        isGuest: false,
      }));

      // Reinitialize auth state
      await initAuth();
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors:auth.login_failed'));
    } finally {
      setIsSubmitting(false);
      setActiveMethod(null);
    }
  }, [email, password, initAuth, navigate, t]);

  /**
   * Reset to try again with different email
   */
  const handleTryAgain = useCallback(() => {
    setMagicLinkSent(false);
    setEmail('');
    setError(null);
  }, []);

  const isLoading = isSubmitting || authLoading;

  return (
    <div className={cn(
      'min-h-screen flex items-center justify-center p-4',
      'bg-gradient-to-br from-leo-dark via-leo-primary/30 to-leo-dark'
    )}>
      {/* Background decorative elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.1, scale: 1 }}
          transition={{ duration: 1.5 }}
          className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-gradient-to-br from-leo-accent to-transparent blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.1, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.3 }}
          className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-gradient-to-tr from-leo-secondary to-transparent blur-3xl"
        />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative w-full max-w-md"
      >
        {/* Logo and branding */}
        <motion.div variants={itemVariants} className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-leo-primary via-leo-accent to-leo-secondary shadow-2xl shadow-leo-primary/40 mb-4"
          >
            <span className="text-4xl font-bold text-white font-heading">L</span>
          </motion.div>
          <h1 className="text-3xl font-heading font-bold bg-gradient-to-r from-white via-leo-light to-white/80 bg-clip-text text-transparent">
            {t('auth.title', 'LEO Platform')}
          </h1>
          <p className="text-leo-gray mt-2">
            {t('auth.subtitle', 'Your Virtual Operations Director')}
          </p>
        </motion.div>

        {/* Login card */}
        <motion.div variants={itemVariants}>
          <GlassCard
            variant="dark"
            padding="lg"
            glow
            className="border border-white/10"
          >
            <AnimatePresence mode="wait">
              {magicLinkSent ? (
                /* Magic link sent confirmation */
                <motion.div
                  key="sent"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="text-center space-y-4 py-4"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                    className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30"
                  >
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  </motion.div>

                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-white">
                      {t('auth.check_email', 'Check your email')}
                    </h2>
                    <p className="text-leo-gray">
                      {t('auth.magic_link_sent', 'We sent a login link to')}
                    </p>
                    <p className="text-leo-accent font-medium">{email}</p>
                  </div>

                  <p className="text-sm text-leo-gray/80">
                    {t('auth.magic_link_expires', 'The link expires in 15 minutes')}
                  </p>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleTryAgain}
                    className="text-leo-gray hover:text-white"
                  >
                    {t('auth.try_different_email', 'Use a different email')}
                  </Button>
                </motion.div>
              ) : (
                /* Login form */
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* Error message */}
                  {(error || callbackError) && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm flex items-start gap-2"
                    >
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{error || (callbackError === 'invalid_token' ? t('errors:auth.invalid_token', 'Invalid or expired login link') : callbackError)}</span>
                    </motion.div>
                  )}

                  {/* OAuth Button - Authentik */}
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={handleOAuthLogin}
                    disabled={isLoading}
                    isLoading={activeMethod === 'oauth' && isLoading}
                    leftIcon={!isLoading || activeMethod !== 'oauth' ? <Shield className="w-5 h-5" /> : undefined}
                  >
                    {t('auth.login_oauth', 'Continue with Authentik')}
                  </Button>

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-transparent px-2 text-leo-gray">
                        {t('auth.or', 'or')}
                      </span>
                    </div>
                  </div>

                  {/* Magic Link Form */}
                  <form onSubmit={handleMagicLinkRequest} className="space-y-4">
                    <Input
                      type="email"
                      label={t('auth.email', 'Email')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      startIcon={<Mail className="w-4 h-4" />}
                      disabled={isLoading}
                      autoComplete="email"
                      autoFocus
                    />

                    <Button
                      type="submit"
                      variant="outline"
                      size="lg"
                      className="w-full border-leo-accent/50 text-leo-accent hover:bg-leo-accent hover:text-white"
                      disabled={!email || isLoading}
                      isLoading={activeMethod === 'magic' && isLoading}
                      rightIcon={!isLoading || activeMethod !== 'magic' ? <ArrowRight className="w-4 h-4" /> : undefined}
                    >
                      {t('auth.send_magic_link', 'Send login link')}
                    </Button>
                  </form>

                  {/* Dev-only email/password form */}
                  {isDev && (
                    <>
                      <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-transparent px-2 text-leo-gray">
                            Dev Mode
                          </span>
                        </div>
                      </div>

                      <form onSubmit={handleEmailLogin} className="space-y-4">
                        <Input
                          type="password"
                          label={t('auth.password', 'Password')}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="********"
                          startIcon={<Lock className="w-4 h-4" />}
                          disabled={isLoading}
                          autoComplete="current-password"
                        />

                        <Button
                          type="submit"
                          variant="secondary"
                          size="lg"
                          className="w-full"
                          disabled={!email || !password || isLoading}
                          isLoading={activeMethod === 'email' && isLoading}
                          rightIcon={!isLoading || activeMethod !== 'email' ? <ArrowRight className="w-4 h-4" /> : undefined}
                        >
                          {t('auth.login_submit', 'Sign In')}
                        </Button>
                      </form>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </motion.div>

        {/* Footer */}
        <motion.p
          variants={itemVariants}
          className="text-center text-xs text-leo-gray/60 mt-6"
        >
          {t('app.tagline', 'From chaos to results')}
        </motion.p>
      </motion.div>
    </div>
  );
}

export default LoginPage;
