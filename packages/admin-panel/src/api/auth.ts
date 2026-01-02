/**
 * LEO Frontend - Authentication API
 * Functions for user authentication and session management
 */

import { apiClient, tokenStorage, getResponseData } from './client';
import type {
  AuthResponse,
  LoginRequest,
  RefreshTokenResponse,
  User,
} from './types';

// ============================================================================
// Authentication API Functions
// ============================================================================

/**
 * Authenticate user with email and password
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise resolving to AuthResponse with tokens and user data
 */
export const login = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const payload: LoginRequest = { email, password };

  const response = await apiClient.post<AuthResponse>('/auth/login', payload);
  const data = getResponseData(response);

  // Store tokens in localStorage
  tokenStorage.setTokens(data.accessToken, data.refreshToken);

  return data;
};

/**
 * Log out the current user
 * Clears tokens and optionally notifies the server
 */
export const logout = async (): Promise<void> => {
  const refreshToken = tokenStorage.getRefreshToken();

  try {
    // Notify server to invalidate the refresh token
    if (refreshToken) {
      await apiClient.post('/auth/logout', { refreshToken });
    }
  } catch {
    // Ignore errors during logout - we'll clear tokens anyway
    console.warn('Logout request failed, clearing tokens locally');
  } finally {
    // Always clear local tokens
    tokenStorage.clearTokens();

    // Dispatch logout event for app-wide handling
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }
};

/**
 * Refresh the access token using the stored refresh token
 * @returns Promise resolving to new tokens
 */
export const refreshToken = async (): Promise<RefreshTokenResponse> => {
  const storedRefreshToken = tokenStorage.getRefreshToken();

  if (!storedRefreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh', {
    refreshToken: storedRefreshToken,
  });

  const data = getResponseData(response);

  // Update stored tokens
  tokenStorage.setTokens(data.accessToken, data.refreshToken);

  return data;
};

/**
 * Get the currently authenticated user's profile
 * @returns Promise resolving to User data
 */
export const getCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get<User>('/auth/me');
  return getResponseData(response);
};

/**
 * Request password reset email
 * @param email - User's email address
 */
export const requestPasswordReset = async (email: string): Promise<void> => {
  await apiClient.post('/auth/password-reset/request', { email });
};

/**
 * Reset password with token from email
 * @param token - Password reset token
 * @param newPassword - New password to set
 */
export const resetPassword = async (
  token: string,
  newPassword: string
): Promise<void> => {
  await apiClient.post('/auth/password-reset/confirm', {
    token,
    newPassword,
  });
};

/**
 * Change password for authenticated user
 * @param currentPassword - Current password for verification
 * @param newPassword - New password to set
 */
export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  await apiClient.post('/auth/password-change', {
    currentPassword,
    newPassword,
  });
};

/**
 * Verify email with token
 * @param token - Email verification token
 */
export const verifyEmail = async (token: string): Promise<void> => {
  await apiClient.post('/auth/verify-email', { token });
};

/**
 * Resend email verification
 */
export const resendVerificationEmail = async (): Promise<void> => {
  await apiClient.post('/auth/resend-verification');
};

// ============================================================================
// Auth State Helpers
// ============================================================================

/**
 * Check if user is currently authenticated
 * Note: This only checks for token presence, not validity
 */
export const isLoggedIn = (): boolean => {
  return tokenStorage.getAccessToken() !== null;
};

/**
 * Get stored access token
 */
export const getAccessToken = (): string | null => {
  return tokenStorage.getAccessToken();
};

// ============================================================================
// Export all auth functions as default object
// ============================================================================

const authApi = {
  login,
  logout,
  refreshToken,
  getCurrentUser,
  requestPasswordReset,
  resetPassword,
  changePassword,
  verifyEmail,
  resendVerificationEmail,
  isLoggedIn,
  getAccessToken,
};

export default authApi;
