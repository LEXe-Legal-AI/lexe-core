/**
 * OAuth Service for LEO Webchat
 *
 * Handles Authentik OAuth authentication flow.
 */

const AUTHENTIK_BASE_URL = import.meta.env.VITE_AUTHENTIK_URL || 'https://auth.leo-itc.com';
const CLIENT_ID = import.meta.env.VITE_OAUTH_CLIENT_ID || 'leo-webchat';
const REDIRECT_URI = import.meta.env.VITE_OAUTH_REDIRECT_URI || `${window.location.origin}/auth/callback`;

/**
 * OAuth Service
 */
export const oauthService = {
  /**
   * Initiate OAuth login flow with Authentik
   */
  login(): void {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'openid profile email',
      state: generateState(),
    });

    window.location.href = `${AUTHENTIK_BASE_URL}/application/o/authorize/?${params.toString()}`;
  },

  /**
   * Handle OAuth callback
   */
  async handleCallback(code: string, state: string): Promise<void> {
    // Verify state
    const savedState = sessionStorage.getItem('oauth_state');
    if (state !== savedState) {
      throw new Error('Invalid OAuth state');
    }
    sessionStorage.removeItem('oauth_state');

    // Exchange code for tokens
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/auth/oauth/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'OAuth callback failed');
    }

    const data = await response.json();

    // Store tokens
    localStorage.setItem('leo-auth-tokens', JSON.stringify({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      isGuest: false,
    }));
  },

  /**
   * Logout and revoke tokens
   */
  async logout(): Promise<void> {
    // Clear local tokens
    localStorage.removeItem('leo-auth-tokens');

    // Redirect to Authentik logout
    window.location.href = `${AUTHENTIK_BASE_URL}/application/o/logout/`;
  },
};

/**
 * Generate random state for CSRF protection
 */
function generateState(): string {
  const state = crypto.randomUUID();
  sessionStorage.setItem('oauth_state', state);
  return state;
}

export default oauthService;
