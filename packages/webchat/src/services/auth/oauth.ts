/**
 * OAuth Service with PKCE Flow for Authentik
 *
 * Implements OAuth 2.0 Authorization Code Flow with PKCE
 * for secure authentication with Authentik IdP.
 */

// ============================================================================
// Types
// ============================================================================

export interface OAuthConfig {
  authority: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  postLogoutRedirectUri?: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  tokenType: string;
  expiresAt: number; // Unix timestamp in milliseconds
  scope: string;
}

export interface OAuthUserInfo {
  sub: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  preferredUsername?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
  locale?: string;
  updatedAt?: number;
  [key: string]: unknown;
}

interface PKCEState {
  state: string;
  codeVerifier: string;
  redirectUri: string;
  timestamp: number;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEYS = {
  TOKENS: 'leo_oauth_tokens',
  PKCE_STATE: 'leo_oauth_pkce_state',
} as const;

// PKCE state expires after 10 minutes
const PKCE_STATE_EXPIRY_MS = 10 * 60 * 1000;

// Refresh tokens 5 minutes before expiry
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a cryptographically random string
 */
function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  let result = '';
  for (let i = 0; i < length; i++) {
    const randomValue = randomValues[i];
    if (randomValue !== undefined) {
      result += charset[randomValue % charset.length];
    }
  }
  return result;
}

/**
 * Generate code verifier for PKCE (43-128 characters)
 */
function generateCodeVerifier(): string {
  return generateRandomString(64);
}

/**
 * Generate state parameter for CSRF protection
 */
function generateState(): string {
  return generateRandomString(32);
}

/**
 * Generate code challenge from code verifier using SHA-256
 */
async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);

  // Base64url encode the digest
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Build URL with query parameters
 */
function buildUrl(base: string, params: Record<string, string>): string {
  const url = new URL(base);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return url.toString();
}

// ============================================================================
// OAuth Service Class
// ============================================================================

export class OAuthService {
  private config: OAuthConfig;
  private cachedTokens: OAuthTokens | null = null;
  private refreshPromise: Promise<OAuthTokens> | null = null;

  constructor(config: OAuthConfig) {
    this.config = config;
    this.loadTokensFromStorage();
  }

  // ==========================================================================
  // Authentik Endpoints
  // ==========================================================================

  private get authorizeEndpoint(): string {
    return `${this.config.authority}/authorize/`;
  }

  private get tokenEndpoint(): string {
    return `${this.config.authority}/token/`;
  }

  private get userInfoEndpoint(): string {
    return `${this.config.authority}/userinfo/`;
  }

  private get endSessionEndpoint(): string {
    return `${this.config.authority}/end-session/`;
  }

  // ==========================================================================
  // Storage Operations
  // ==========================================================================

  private loadTokensFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TOKENS);
      if (stored) {
        const tokens = JSON.parse(stored) as OAuthTokens;
        // Only load if not expired
        if (tokens.expiresAt > Date.now()) {
          this.cachedTokens = tokens;
        } else {
          // Clear expired tokens
          localStorage.removeItem(STORAGE_KEYS.TOKENS);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEYS.TOKENS);
    }
  }

  private saveTokensToStorage(tokens: OAuthTokens): void {
    this.cachedTokens = tokens;
    localStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(tokens));
  }

  private clearTokensFromStorage(): void {
    this.cachedTokens = null;
    localStorage.removeItem(STORAGE_KEYS.TOKENS);
  }

  private savePKCEState(state: PKCEState): void {
    localStorage.setItem(STORAGE_KEYS.PKCE_STATE, JSON.stringify(state));
  }

  private loadPKCEState(): PKCEState | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PKCE_STATE);
      if (!stored) return null;

      const state = JSON.parse(stored) as PKCEState;

      // Check if PKCE state has expired
      if (Date.now() - state.timestamp > PKCE_STATE_EXPIRY_MS) {
        localStorage.removeItem(STORAGE_KEYS.PKCE_STATE);
        return null;
      }

      return state;
    } catch {
      localStorage.removeItem(STORAGE_KEYS.PKCE_STATE);
      return null;
    }
  }

  private clearPKCEState(): void {
    localStorage.removeItem(STORAGE_KEYS.PKCE_STATE);
  }

  // ==========================================================================
  // Public Methods
  // ==========================================================================

  /**
   * Check if user is authenticated with valid (non-expired) tokens
   */
  isAuthenticated(): boolean {
    if (!this.cachedTokens) return false;
    return this.cachedTokens.expiresAt > Date.now();
  }

  /**
   * Check if tokens need refresh (within buffer period before expiry)
   */
  needsRefresh(): boolean {
    if (!this.cachedTokens) return false;
    return this.cachedTokens.expiresAt - Date.now() < TOKEN_REFRESH_BUFFER_MS;
  }

  /**
   * Get current access token (refreshes if needed)
   */
  async getAccessToken(): Promise<string | null> {
    if (!this.cachedTokens) return null;

    // Refresh if needed
    if (this.needsRefresh() && this.cachedTokens.refreshToken) {
      try {
        await this.refreshToken();
      } catch {
        // If refresh fails, return current token if still valid
        if (!this.isAuthenticated()) {
          return null;
        }
      }
    }

    return this.cachedTokens?.accessToken ?? null;
  }

  /**
   * Get current tokens without refresh
   */
  getTokens(): OAuthTokens | null {
    return this.cachedTokens;
  }

  /**
   * Start OAuth login flow with PKCE
   * Redirects user to Authentik authorization endpoint
   */
  async login(additionalParams?: Record<string, string>): Promise<void> {
    // Generate PKCE parameters
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Save PKCE state for callback verification
    this.savePKCEState({
      state,
      codeVerifier,
      redirectUri: this.config.redirectUri,
      timestamp: Date.now(),
    });

    // Build authorization URL
    const params: Record<string, string> = {
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      ...additionalParams,
    };

    const authorizeUrl = buildUrl(this.authorizeEndpoint, params);

    // Redirect to Authentik
    window.location.href = authorizeUrl;
  }

  /**
   * Handle OAuth callback after authorization
   * Exchanges authorization code for tokens
   */
  async handleCallback(callbackUrl?: string): Promise<OAuthTokens> {
    const url = new URL(callbackUrl ?? window.location.href);
    const params = url.searchParams;

    // Check for errors
    const error = params.get('error');
    if (error) {
      const errorDescription = params.get('error_description') || 'Authorization failed';
      throw new OAuthError(error, errorDescription);
    }

    // Get authorization code
    const code = params.get('code');
    if (!code) {
      throw new OAuthError('missing_code', 'Authorization code not found in callback URL');
    }

    // Get state and verify
    const state = params.get('state');
    const pkceState = this.loadPKCEState();

    if (!pkceState) {
      throw new OAuthError('invalid_state', 'PKCE state not found or expired');
    }

    if (state !== pkceState.state) {
      this.clearPKCEState();
      throw new OAuthError('state_mismatch', 'State parameter does not match');
    }

    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(code, pkceState.codeVerifier);

    // Clear PKCE state after successful exchange
    this.clearPKCEState();

    // Save tokens
    this.saveTokensToStorage(tokens);

    return tokens;
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(
    code: string,
    codeVerifier: string
  ): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      code,
      redirect_uri: this.config.redirectUri,
      code_verifier: codeVerifier,
    });

    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new OAuthError(
        errorData.error || 'token_exchange_failed',
        errorData.error_description || 'Failed to exchange code for tokens'
      );
    }

    const data: TokenResponse = await response.json();

    return this.parseTokenResponse(data);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<OAuthTokens> {
    // Prevent concurrent refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.cachedTokens?.refreshToken) {
      throw new OAuthError('no_refresh_token', 'No refresh token available');
    }

    this.refreshPromise = this.doRefreshToken(this.cachedTokens.refreshToken);

    try {
      const tokens = await this.refreshPromise;
      return tokens;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefreshToken(refreshToken: string): Promise<OAuthTokens> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      refresh_token: refreshToken,
    });

    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Clear tokens if refresh fails with invalid_grant
      if (errorData.error === 'invalid_grant') {
        this.clearTokensFromStorage();
      }

      throw new OAuthError(
        errorData.error || 'token_refresh_failed',
        errorData.error_description || 'Failed to refresh token'
      );
    }

    const data: TokenResponse = await response.json();
    const tokens = this.parseTokenResponse(data);

    // Preserve refresh token if not returned in response
    if (!tokens.refreshToken && this.cachedTokens?.refreshToken) {
      tokens.refreshToken = this.cachedTokens.refreshToken;
    }

    this.saveTokensToStorage(tokens);

    return tokens;
  }

  /**
   * Get user information from Authentik
   */
  async getUserInfo(): Promise<OAuthUserInfo> {
    const accessToken = await this.getAccessToken();

    if (!accessToken) {
      throw new OAuthError('not_authenticated', 'No access token available');
    }

    const response = await fetch(this.userInfoEndpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token might be invalid, try refresh
        if (this.cachedTokens?.refreshToken) {
          await this.refreshToken();
          return this.getUserInfo();
        }
        throw new OAuthError('unauthorized', 'Access token is invalid');
      }

      throw new OAuthError('userinfo_failed', 'Failed to fetch user info');
    }

    const data = await response.json();

    return {
      sub: data.sub,
      email: data.email,
      emailVerified: data.email_verified,
      name: data.name,
      preferredUsername: data.preferred_username,
      givenName: data.given_name,
      familyName: data.family_name,
      picture: data.picture,
      locale: data.locale,
      updatedAt: data.updated_at,
      ...data,
    };
  }

  /**
   * Logout user and optionally redirect to Authentik end-session
   */
  async logout(options?: { redirect?: boolean }): Promise<void> {
    const idToken = this.cachedTokens?.idToken;

    // Clear local tokens
    this.clearTokensFromStorage();

    // Redirect to Authentik end-session endpoint
    if (options?.redirect !== false) {
      const params: Record<string, string> = {};

      if (idToken) {
        params.id_token_hint = idToken;
      }

      if (this.config.postLogoutRedirectUri) {
        params.post_logout_redirect_uri = this.config.postLogoutRedirectUri;
      }

      const endSessionUrl = buildUrl(this.endSessionEndpoint, params);
      window.location.href = endSessionUrl;
    }
  }

  /**
   * Parse token response into OAuthTokens
   */
  private parseTokenResponse(data: TokenResponse): OAuthTokens {
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      idToken: data.id_token ?? null,
      tokenType: data.token_type,
      expiresAt: Date.now() + data.expires_in * 1000,
      scope: data.scope,
    };
  }
}

// ============================================================================
// OAuth Error Class
// ============================================================================

export class OAuthError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'OAuthError';
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let oauthServiceInstance: OAuthService | null = null;

/**
 * Get OAuth service singleton instance
 * Reads configuration from VITE_OAUTH_* environment variables
 */
export function getOAuthService(): OAuthService {
  if (!oauthServiceInstance) {
    const authority = import.meta.env.VITE_OAUTH_AUTHORITY;
    const clientId = import.meta.env.VITE_OAUTH_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_OAUTH_REDIRECT_URI;
    const scopes = import.meta.env.VITE_OAUTH_SCOPES || 'openid profile email';
    const postLogoutRedirectUri = import.meta.env.VITE_OAUTH_POST_LOGOUT_REDIRECT_URI;

    if (!authority || !clientId || !redirectUri) {
      throw new Error(
        'OAuth configuration incomplete. Please set VITE_OAUTH_AUTHORITY, VITE_OAUTH_CLIENT_ID, and VITE_OAUTH_REDIRECT_URI environment variables.'
      );
    }

    oauthServiceInstance = new OAuthService({
      authority,
      clientId,
      redirectUri,
      scopes: scopes.split(' ').filter(Boolean),
      postLogoutRedirectUri,
    });
  }

  return oauthServiceInstance;
}

/**
 * Check if OAuth is enabled via environment variable
 */
export function isOAuthEnabled(): boolean {
  return import.meta.env.VITE_OAUTH_ENABLED === 'true';
}

/**
 * Reset OAuth service instance (useful for testing)
 */
export function resetOAuthService(): void {
  oauthServiceInstance = null;
}
