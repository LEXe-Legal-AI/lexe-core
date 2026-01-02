/**
 * LEO Frontend - API Module
 * Central export point for all API utilities
 */

// Client and utilities
export { apiClient, tokenStorage, isAuthenticated, getResponseData } from './client';

// Auth functions
export {
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
} from './auth';
export { default as authApi } from './auth';

// Agent functions and types
export {
  agentsApi,
  type Agent,
  type AgentStatus,
  type AgentType,
  type AgentCurrentTask,
  type AgentMetricsData,
  type AgentTask,
  type AgentTaskStatus,
  type AgentTaskPriority,
  type AgentMetrics,
  type AgentsFilter,
  type CreateAgentTaskRequest,
} from './agents';
export { default as agentsApiDefault } from './agents';

// WebSocket client and types
export {
  wsClient,
  WebSocketClient,
  type ConnectionState,
  type WebSocketMessageType,
  type WebSocketChannel,
  type WebSocketMessage,
  type WebSocketConfig,
  type MessageHandler,
  type AgentStatusPayload,
  type AgentTaskPayload,
  type ConversationMessagePayload,
  type PipelineUpdatePayload,
  type SystemAlertPayload,
} from './websocket';
export { default as wsClientDefault } from './websocket';

// Users API functions and types
export {
  type UserRole,
  type UserStatus,
  type User as IdentityUser,
  type UserDetail,
  type UserSession,
  type UserActivity,
  type CreateUserDto,
  type UpdateUserDto,
  type UserFilters,
  roleConfig,
  statusConfig,
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
} from './users';
export { default as usersApi } from './users';

// Review API
export { reviewApi } from './review';
export { default as reviewApiDefault } from './review';

// Types
export type {
  // Auth types
  User,
  LoginRequest,
  AuthResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  // Error types
  ApiError,
  ValidationError,
  // Domain types
  Contact,
  Conversation,
  ConversationStatus,
  ConversationPriority,
  Message,
  MessageDirection,
  MessageType,
  MessageStatus,
  MessageAttachment,
  // Pagination types
  PaginatedRequest,
  PaginatedResponse,
  // Generic response types
  ApiResponse,
  ApiListResponse,
  // Review types
  ReviewStatus,
  ReviewPriority,
  ReviewType,
  ReviewItem,
  ReviewFilters,
  ReviewActionRequest,
  ReviewStats,
} from './types';
