/**
 * LEO Webchat Stores
 *
 * Centralized state management using Zustand with:
 * - TypeScript strict mode
 * - Persist middleware for local storage
 * - DevTools integration in development
 * - Optimized selectors for re-render prevention
 */

// Auth Store - Authentication (OAuth and magic link)
export {
  useAuthStore,
  selectIsAuthenticated,
  selectIsLoading as selectAuthIsLoading,
  selectAuthError,
  selectUserInfo,
} from './authStore';

// Chat Store - Conversation and message management
export { useChatStore, type ChatMessage, type Conversation } from './chatStore';

// Config Store - Application configuration
export {
  useConfigStore,
  selectTheme,
  selectLanguage,
  selectApiUrl,
  selectDebugMode,
  selectStreamingEnabled,
  selectFeatures,
  selectBranding,
} from './configStore';
export type { default as ConfigState } from './configStore';

// Memory Store - LEO Memory System (L0-L4)
export {
  useMemoryStore,
  selectMemories,
  selectSelectedLayer,
  selectIsLoading as selectMemoryIsLoading,
  selectError as selectMemoryError,
  selectSearchQuery,
  selectPagination,
  selectMemoriesByLayer,
  type MemoryEntry,
  type MemoryLayerKey,
} from './memoryStore';

// Stream Store - SSE Streaming state
export {
  useStreamStore,
  selectIsStreaming,
  selectIsPaused,
  selectCurrentPhase,
  selectTokens,
  selectTokenCount,
  selectToolCalls,
  selectActiveToolId,
  selectError as selectStreamError,
  selectPhaseHistory,
  selectActiveToolCall,
  selectCompletedToolCalls,
  selectFailedToolCalls,
  type ToolCall,
  type PipelinePhase,
  type PhaseInfo,
} from './streamStore';

// Plugin Store - Plugin management
export {
  usePluginStore,
  selectRegistrations,
  selectActivePluginIds,
  selectLoadingPlugins,
  selectErrors as selectPluginErrors,
  selectPluginCount,
  selectActivePluginCount,
  selectPluginError,
  selectIsPluginLoading,
  type PluginWithLifecycle,
} from './pluginStore';

// UI Store - User interface state
export {
  useUIStore,
  selectTheme as selectUITheme,
  selectSidebarOpen,
  selectSidebarWidth,
  selectPreviewPanelOpen,
  selectPreviewPanelWidth,
  selectActiveTab,
  selectActiveRoute,
  selectModals,
  selectNotifications,
  selectInputFocused,
  selectInputValue,
  selectIsMobile,
  selectMobileMenuOpen,
  selectIsPageLoading,
  selectLoadingMessage,
  selectHasModals,
  selectHasNotifications,
  selectTopModal,
  selectLayoutDimensions,
  type Notification,
  type ModalConfig,
  type Theme,
} from './uiStore';

// Attachment Store - File uploads and attachments
export {
  useAttachmentStore,
  type PendingAttachment,
} from './attachmentStore';
