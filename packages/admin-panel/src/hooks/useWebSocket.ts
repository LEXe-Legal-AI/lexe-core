/**
 * LEO Frontend - WebSocket React Hooks
 * Custom hooks for WebSocket integration in React components
 *
 * Features:
 * - Automatic connection management on mount/unmount
 * - Connection status tracking with realtime store integration
 * - Type-safe message subscriptions
 * - Channel subscription management
 * - Exponential backoff reconnection (up to 15 attempts)
 * - Message dispatch to realtime store
 */

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useRealtimeStore } from '@/stores/realtimeStore';
import { useAuthStore } from '@/stores/authStore';
import wsClient, {
  type ConnectionState,
  type WebSocketMessageType,
  type WebSocketChannel,
  type WebSocketMessage,
  type MessageHandler,
  type AgentStatusPayload,
  type AgentTaskPayload,
  type ConversationMessagePayload,
  type PipelineUpdatePayload,
  type SystemAlertPayload,
} from '@/api/websocket';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for useWebSocket hook
 */
export interface UseWebSocketOptions {
  /** Whether to automatically connect on mount (default: true) */
  autoConnect?: boolean;
  /** Whether the connection is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Return type for useWebSocket hook
 */
export interface UseWebSocketReturn {
  /** Current connection state */
  connectionState: ConnectionState;
  /** Whether currently connected */
  isConnected: boolean;
  /** Whether currently reconnecting */
  isReconnecting: boolean;
  /** Connect to WebSocket server */
  connect: () => Promise<void>;
  /** Disconnect from WebSocket server */
  disconnect: () => void;
  /** Send a message to the server */
  send: (data: unknown) => void;
}

/**
 * Options for useWebSocketSubscription hook
 */
export interface UseWebSocketSubscriptionOptions<T> {
  /** Whether the subscription is enabled (default: true) */
  enabled?: boolean;
  /** Callback when message is received */
  onMessage?: MessageHandler<T>;
}

// ============================================================================
// Main WebSocket Hook
// ============================================================================

/**
 * Main hook for WebSocket connection management
 * Connects on mount and disconnects on unmount
 *
 * @param options - Configuration options
 * @returns WebSocket connection state and controls
 *
 * @example
 * ```tsx
 * function App() {
 *   const { isConnected, connectionState } = useWebSocket();
 *
 *   return (
 *     <div>
 *       <ConnectionIndicator state={connectionState} />
 *       {isConnected ? <Dashboard /> : <Loading />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { autoConnect = true, enabled = true } = options;

  const { token, isAuthenticated } = useAuthStore();
  const {
    connectionState,
    setConnectionState,
    setLastError,
    incrementReconnectAttempts,
    resetReconnectAttempts,
    setLastMessage,
  } = useRealtimeStore();

  // Track if we've connected in this session
  const hasConnectedRef = useRef(false);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(async () => {
    if (!enabled) return;

    try {
      await wsClient.connect(token || undefined);
      resetReconnectAttempts();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setLastError(errorMessage);
      incrementReconnectAttempts();
      console.error('[useWebSocket] Connection failed:', error);
    }
  }, [enabled, token, setLastError, resetReconnectAttempts, incrementReconnectAttempts]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    wsClient.disconnect();
    hasConnectedRef.current = false;
    resetReconnectAttempts();
  }, [resetReconnectAttempts]);

  /**
   * Send a message to the server
   */
  const send = useCallback((data: unknown) => {
    wsClient.send(data);
  }, []);

  // Subscribe to connection state changes
  useEffect(() => {
    const unsubscribe = wsClient.onStateChange((state) => {
      setConnectionState(state);

      // Track reconnection attempts
      if (state === 'reconnecting') {
        incrementReconnectAttempts();
      } else if (state === 'connected') {
        resetReconnectAttempts();
      }
    });

    return unsubscribe;
  }, [setConnectionState, incrementReconnectAttempts, resetReconnectAttempts]);

  // Subscribe to all messages and update realtime store
  useEffect(() => {
    const unsubscribe = wsClient.onAny((message: WebSocketMessage) => {
      setLastMessage(message);
    });

    return unsubscribe;
  }, [setLastMessage]);

  // Auto-connect on mount when authenticated
  useEffect(() => {
    if (!autoConnect || !enabled || !isAuthenticated) {
      return;
    }

    // Prevent multiple connection attempts
    if (hasConnectedRef.current) {
      return;
    }

    hasConnectedRef.current = true;
    connect();

    return () => {
      // Disconnect on unmount
      disconnect();
    };
  }, [autoConnect, enabled, isAuthenticated, connect, disconnect]);

  // Derived state
  const isConnected = connectionState === 'connected';
  const isReconnecting = connectionState === 'reconnecting';

  return {
    connectionState,
    isConnected,
    isReconnecting,
    connect,
    disconnect,
    send,
  };
}

// ============================================================================
// Message Type Subscription Hooks
// ============================================================================

/**
 * Subscribe to a specific WebSocket message type
 *
 * @param type - The message type to subscribe to
 * @param handler - Callback when message is received
 * @param options - Subscription options
 *
 * @example
 * ```tsx
 * function AgentMonitor() {
 *   useWebSocketMessage('agent:status', (payload) => {
 *     console.log('Agent status changed:', payload);
 *   });
 *
 *   return <AgentList />;
 * }
 * ```
 */
export function useWebSocketMessage<T = unknown>(
  type: WebSocketMessageType,
  handler: MessageHandler<T>,
  options: UseWebSocketSubscriptionOptions<T> = {}
): void {
  const { enabled = true, onMessage } = options;

  // Memoize handler to prevent unnecessary re-subscriptions
  const stableHandler = useCallback(
    (payload: T, message: WebSocketMessage<T>) => {
      handler(payload, message);
      onMessage?.(payload, message);
    },
    [handler, onMessage]
  );

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = wsClient.on<T>(type, stableHandler);
    return unsubscribe;
  }, [type, stableHandler, enabled]);
}

/**
 * Subscribe to agent status updates
 */
export function useAgentStatusUpdates(
  handler: MessageHandler<AgentStatusPayload>,
  enabled = true
): void {
  useWebSocketMessage<AgentStatusPayload>('agent:status', handler, { enabled });
}

/**
 * Subscribe to agent task updates
 */
export function useAgentTaskUpdates(
  handler: MessageHandler<AgentTaskPayload>,
  enabled = true
): void {
  useWebSocketMessage<AgentTaskPayload>('agent:task', handler, { enabled });
}

/**
 * Subscribe to conversation message updates
 */
export function useConversationUpdates(
  handler: MessageHandler<ConversationMessagePayload>,
  enabled = true
): void {
  useWebSocketMessage<ConversationMessagePayload>('conversation:message', handler, { enabled });
}

/**
 * Subscribe to pipeline updates
 */
export function usePipelineUpdates(
  handler: MessageHandler<PipelineUpdatePayload>,
  enabled = true
): void {
  useWebSocketMessage<PipelineUpdatePayload>('pipeline:update', handler, { enabled });
}

/**
 * Subscribe to system alerts
 */
export function useSystemAlerts(
  handler: MessageHandler<SystemAlertPayload>,
  enabled = true
): void {
  useWebSocketMessage<SystemAlertPayload>('system:alert', handler, { enabled });
}

// ============================================================================
// Channel Subscription Hook
// ============================================================================

/**
 * Subscribe to a WebSocket channel
 *
 * @param channel - The channel to subscribe to
 * @param enabled - Whether the subscription is active
 * @returns Unsubscribe function
 *
 * @example
 * ```tsx
 * function AgentDashboard() {
 *   useWebSocketChannel('agents');
 *   useWebSocketChannel('pipeline');
 *
 *   return <Dashboard />;
 * }
 * ```
 */
export function useWebSocketChannel(channel: WebSocketChannel, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = wsClient.subscribe(channel);
    return unsubscribe;
  }, [channel, enabled]);
}

// ============================================================================
// All Messages Hook
// ============================================================================

/**
 * Subscribe to all WebSocket messages
 *
 * @param handler - Callback for all messages
 * @param enabled - Whether the subscription is active
 *
 * @example
 * ```tsx
 * function MessageLogger() {
 *   useWebSocketAllMessages((message) => {
 *     console.log('Received:', message);
 *   });
 *
 *   return null;
 * }
 * ```
 */
export function useWebSocketAllMessages(
  handler: MessageHandler<WebSocketMessage>,
  enabled = true
): void {
  const stableHandler = useCallback(handler, [handler]);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = wsClient.onAny(stableHandler);
    return unsubscribe;
  }, [stableHandler, enabled]);
}

// ============================================================================
// Connection Status Hook
// ============================================================================

/**
 * Get WebSocket connection status without managing connection
 * Useful for components that just need to display connection state
 *
 * @returns Connection state information
 *
 * @example
 * ```tsx
 * function ConnectionIndicator() {
 *   const { isConnected, connectionState } = useWebSocketStatus();
 *
 *   return (
 *     <div className={isConnected ? 'bg-green-500' : 'bg-red-500'}>
 *       {connectionState}
 *     </div>
 *   );
 * }
 * ```
 */
export function useWebSocketStatus(): {
  connectionState: ConnectionState;
  isConnected: boolean;
  isReconnecting: boolean;
  lastError: string | null;
} {
  const connectionState = useRealtimeStore((state) => state.connectionState);
  const lastError = useRealtimeStore((state) => state.lastError);

  return useMemo(
    () => ({
      connectionState,
      isConnected: connectionState === 'connected',
      isReconnecting: connectionState === 'reconnecting',
      lastError,
    }),
    [connectionState, lastError]
  );
}

// ============================================================================
// Exports
// ============================================================================

export default useWebSocket;
