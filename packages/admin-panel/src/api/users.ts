/**
 * LEO Frontend - Users API
 * API functions for user management in the Identity service
 */

import { apiClient, getResponseData } from './client';
import type { PaginatedResponse, PaginatedRequest } from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * User role type (matches leo-core identity model)
 */
export type UserRole = 'admin' | 'operator' | 'viewer';

/**
 * User status
 */
export type UserStatus = 'active' | 'inactive';

/**
 * User entity from the Identity service
 */
export interface User {
  id: string;
  tenantId: string;
  authentikId?: string;
  email: string;
  username?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isActive: boolean;
  avatar?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * User with extended information for detail views
 */
export interface UserDetail extends User {
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
  permissions: string[];
  sessions: UserSession[];
  activityLog: UserActivity[];
}

/**
 * User session information
 */
export interface UserSession {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  lastActiveAt: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

/**
 * User activity log entry
 */
export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

/**
 * DTO for creating/inviting a user
 */
export interface CreateUserDto {
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  sendInvite?: boolean;
}

/**
 * DTO for updating a user
 */
export interface UpdateUserDto {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

/**
 * Filter parameters for user listing
 */
export interface UserFilters extends PaginatedRequest {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
}

/**
 * Response for password reset action
 */
export interface PasswordResetResponse {
  success: boolean;
  message: string;
  resetLink?: string; // Only in dev mode
}

// ============================================================================
// Role Utilities
// ============================================================================

/**
 * Role configuration with labels and colors
 */
export const roleConfig: Record<UserRole, { label: string; color: string; description: string }> = {
  admin: {
    label: 'Amministratore',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    description: 'Accesso completo a tutte le funzionalita',
  },
  operator: {
    label: 'Operatore',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    description: 'Gestione conversazioni e contatti',
  },
  viewer: {
    label: 'Visualizzatore',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    description: 'Accesso in sola lettura',
  },
};

/**
 * Status configuration with labels and colors
 */
export const statusConfig: Record<UserStatus, { label: string; color: string }> = {
  active: {
    label: 'Attivo',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
  inactive: {
    label: 'Inattivo',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  },
};

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get paginated list of users with optional filters
 */
export const getUsers = async (
  filters?: UserFilters
): Promise<PaginatedResponse<User>> => {
  const params = new URLSearchParams();

  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));
  if (filters?.sortBy) params.append('sortBy', filters.sortBy);
  if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.role) params.append('role', filters.role);
  if (filters?.status) params.append('status', filters.status);

  const queryString = params.toString();
  const url = `/identity/users${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient.get<PaginatedResponse<User>>(url);
  return getResponseData(response);
};

/**
 * Get a single user by ID with extended details
 */
export const getUser = async (userId: string): Promise<UserDetail> => {
  const response = await apiClient.get<UserDetail>(`/identity/users/${userId}`);
  return getResponseData(response);
};

/**
 * Create/invite a new user
 */
export const createUser = async (data: CreateUserDto): Promise<User> => {
  const response = await apiClient.post<User>('/identity/users/invite', data);
  return getResponseData(response);
};

/**
 * Update an existing user
 */
export const updateUser = async (
  userId: string,
  data: UpdateUserDto
): Promise<User> => {
  const response = await apiClient.put<User>(`/identity/users/${userId}`, data);
  return getResponseData(response);
};

/**
 * Delete a user
 */
export const deleteUser = async (userId: string): Promise<void> => {
  await apiClient.delete(`/identity/users/${userId}`);
};

/**
 * Deactivate a user (soft delete)
 */
export const deactivateUser = async (userId: string): Promise<User> => {
  const response = await apiClient.post<User>(`/identity/users/${userId}/deactivate`);
  return getResponseData(response);
};

/**
 * Reactivate a user
 */
export const reactivateUser = async (userId: string): Promise<User> => {
  const response = await apiClient.post<User>(`/identity/users/${userId}/reactivate`);
  return getResponseData(response);
};

/**
 * Send password reset email to user
 */
export const resetUserPassword = async (
  userId: string
): Promise<PasswordResetResponse> => {
  const response = await apiClient.post<PasswordResetResponse>(
    `/identity/users/${userId}/reset-password`
  );
  return getResponseData(response);
};

/**
 * Resend invite email to user
 */
export const resendInvite = async (userId: string): Promise<void> => {
  await apiClient.post(`/identity/users/${userId}/resend-invite`);
};

/**
 * Get user's active sessions
 */
export const getUserSessions = async (userId: string): Promise<UserSession[]> => {
  const response = await apiClient.get<UserSession[]>(
    `/identity/users/${userId}/sessions`
  );
  return getResponseData(response);
};

/**
 * Revoke a specific user session
 */
export const revokeUserSession = async (
  userId: string,
  sessionId: string
): Promise<void> => {
  await apiClient.delete(`/identity/users/${userId}/sessions/${sessionId}`);
};

/**
 * Revoke all sessions for a user (except current if applicable)
 */
export const revokeAllUserSessions = async (userId: string): Promise<void> => {
  await apiClient.delete(`/identity/users/${userId}/sessions`);
};

/**
 * Get user's activity log
 */
export const getUserActivity = async (
  userId: string,
  limit = 10
): Promise<UserActivity[]> => {
  const response = await apiClient.get<UserActivity[]>(
    `/identity/users/${userId}/activity?limit=${limit}`
  );
  return getResponseData(response);
};

// ============================================================================
// Export as default object
// ============================================================================

const usersApi = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  deactivateUser,
  reactivateUser,
  resetUserPassword,
  resendInvite,
  getUserSessions,
  revokeUserSession,
  revokeAllUserSessions,
  getUserActivity,
};

export default usersApi;
