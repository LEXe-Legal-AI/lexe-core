/**
 * API Services barrel export
 */

export { ApiClient, getApiClient } from './client';
export type { ApiError, ApiResponse, AuthTokens } from './client';

export { conversationApi } from './conversations';
export type {
  ApiConversation,
  ApiMessage,
  PaginatedResponse,
  CreateConversationRequest,
  CreateMessageRequest,
} from './conversations';

export { memoryApi } from './memory';
export type {
  MemoryContextResponse,
  MemoryGraphResponse,
  MemorySearchRequest,
  MemorySearchResponse,
  MemorySearchResult,
  SessionMemory,
  ShortTermMemory,
  LongTermMemory,
  SemanticMemory,
  GraphNode,
  GraphEdge,
} from './memory';

export {
  uploadFile,
  deleteFile,
  validateFile,
  formatFileSize,
  getFileCategory,
  generatePreviewUrl,
  createMockAttachment,
  SUPPORTED_FILE_TYPES,
  ALL_SUPPORTED_TYPES,
  FILE_SIZE_LIMITS,
} from './upload';
export type { UploadProgressCallback } from './upload';

// Note: OAuth is now in @/services/auth - use getOAuthService() from there
