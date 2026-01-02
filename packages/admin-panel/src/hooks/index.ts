/**
 * LEO Frontend - Hooks Index
 * Central export for all custom React hooks
 */

// Toast hook
export { useToast, toast } from './use-toast';

// Theme hook
export { useTheme } from './useTheme';

// WebSocket hooks
export {
  useWebSocket,
  useWebSocketMessage,
  useWebSocketChannel,
  useWebSocketAllMessages,
  useWebSocketStatus,
  useAgentStatusUpdates,
  useAgentTaskUpdates,
  useConversationUpdates,
  usePipelineUpdates,
  useSystemAlerts,
} from './useWebSocket';
export type {
  UseWebSocketOptions,
  UseWebSocketReturn,
  UseWebSocketSubscriptionOptions,
} from './useWebSocket';

// Query hooks
export * from './queries';
