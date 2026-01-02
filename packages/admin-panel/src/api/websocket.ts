/**
 * LEO Frontend - WebSocket Client
 * Real-time communication with LEO orchestrator
 *
 * Features:
 * - Auto-reconnect with exponential backoff
 * - Heartbeat/ping-pong for connection health
 * - Type-safe message handlers
 * - Connection state management
 * - Subscription management for channels
 */

// ============================================================================
// Types
// ============================================================================

/**
 * WebSocket connection states
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/**
 * All possible WebSocket message types from the LEO backend
 */
export type WebSocketMessageType =
  | 'agent:status'        // Agent status changes
  | 'agent:task'          // Task updates
  | 'conversation:message' // New messages
  | 'pipeline:update'     // Pipeline status changes
  | 'system:alert'        // System notifications
  | 'pong'                // Heartbeat response
  | 'subscribed'          // Subscription confirmation
  | 'unsubscribed'        // Unsubscription confirmation
  | 'error';              // Error messages

/**
 * WebSocket channel types for subscription
 */
export type WebSocketChannel =
  | 'agents'        // Agent status updates
  | 'pipeline'      // Pipeline run updates
  | 'memory'        // Memory changes
  | 'conversations' // New messages
  | 'metrics'       // Real-time metrics
  | 'system';       // System alerts

/**
 * Base WebSocket message structure
 */
export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  channel?: WebSocketChannel;
  payload: T;
  timestamp: string;
  id?: string;
}

/**
 * Agent status update payload
 */
export interface AgentStatusPayload {
  agentId: string;
  status: 'idle' | 'active' | 'busy' | 'error' | 'offline';
  previousStatus?: string;
  reason?: string;
}

/**
 * Agent task update payload
 */
export interface AgentTaskPayload {
  agentId: string;
  taskId: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  result?: unknown;
  error?: string;
}

/**
 * Conversation message payload
 */
export interface ConversationMessagePayload {
  conversationId: string;
  messageId: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: string;
}

/**
 * Pipeline update payload
 */
export interface PipelineUpdatePayload {
  pipelineId: string;
  runId: string;
  phase: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  metadata?: Record<string, unknown>;
}

/**
 * System alert payload
 */
export interface SystemAlertPayload {
  alertId: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  source?: string;
  actionRequired?: boolean;
}

/**
 * Type-safe message handler
 */
export type MessageHandler<T = unknown> = (payload: T, message: WebSocketMessage<T>) => void;

/**
 * WebSocket client configuration
 */
export interface WebSocketConfig {
  url?: string;
  maxReconnectAttempts?: number;
  initialReconnectDelay?: number;
  maxReconnectDelay?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  debug?: boolean;
}

// ============================================================================
// WebSocket Client Class
// ============================================================================

/**
 * WebSocket client with auto-reconnect, heartbeat, and type-safe message handling
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private config: Required<Omit<WebSocketConfig, 'url'>>;

  // Connection state
  private _state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  // Heartbeat
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastPongReceived: number = 0;

  // Message handling
  private handlers: Map<WebSocketMessageType, Set<MessageHandler>> = new Map();
  private globalHandlers: Set<MessageHandler<WebSocketMessage>> = new Set();
  private subscriptions: Set<WebSocketChannel> = new Set();

  // State change listeners
  private stateListeners: Set<(state: ConnectionState) => void> = new Set();

  // Pending messages queue (for messages sent while reconnecting)
  private messageQueue: unknown[] = [];

  constructor(config: WebSocketConfig = {}) {
    // Determine WebSocket URL from environment or derive from API URL
    const defaultUrl = this.getDefaultUrl();
    this.url = config.url || import.meta.env.VITE_WS_URL || defaultUrl;

    // Set configuration with defaults (exponential backoff tuned for production)
    this.config = {
      maxReconnectAttempts: config.maxReconnectAttempts ?? 15,
      initialReconnectDelay: config.initialReconnectDelay ?? 1000,
      maxReconnectDelay: config.maxReconnectDelay ?? 30000,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      heartbeatTimeout: config.heartbeatTimeout ?? 10000,
      debug: config.debug ?? import.meta.env.DEV,
    };
  }

  /**
   * Get default WebSocket URL based on current location or API URL
   * Priority:
   * 1. VITE_WS_URL environment variable (handled in constructor)
   * 2. Derive from VITE_API_URL if set
   * 3. Use current window location
   */
  private getDefaultUrl(): string {
    // Try to derive from API URL if set
    const apiUrl = import.meta.env.VITE_API_URL;
    if (apiUrl) {
      try {
        const url = new URL(apiUrl);
        const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${wsProtocol}//${url.host}/ws`;
      } catch {
        // Invalid URL, fall through to default
      }
    }

    // Fallback to deriving from current location
    if (typeof window === 'undefined') {
      return 'ws://localhost:8000/ws';
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }

  /**
   * Log debug messages if debug mode is enabled
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.log(`[WebSocket] ${message}`, ...args);
    }
  }

  /**
   * Log error messages
   */
  private logError(message: string, ...args: unknown[]): void {
    console.error(`[WebSocket] ${message}`, ...args);
  }

  // ============================================================================
  // Connection State Management
  // ============================================================================

  /**
   * Get current connection state
   */
  get state(): ConnectionState {
    return this._state;
  }

  /**
   * Check if currently connected
   */
  get isConnected(): boolean {
    return this._state === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Set connection state and notify listeners
   */
  private setState(state: ConnectionState): void {
    if (this._state !== state) {
      this.log(`State change: ${this._state} -> ${state}`);
      this._state = state;
      this.stateListeners.forEach((listener) => listener(state));
    }
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(listener: (state: ConnectionState) => void): () => void {
    this.stateListeners.add(listener);
    // Immediately call with current state
    listener(this._state);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Connect to WebSocket server
   */
  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.log('Already connected');
        resolve();
        return;
      }

      if (this._state === 'connecting') {
        this.log('Connection already in progress');
        resolve();
        return;
      }

      this.setState('connecting');

      try {
        // Append token to URL if provided
        const url = token ? `${this.url}?token=${encodeURIComponent(token)}` : this.url;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.log('Connected');
          this.setState('connected');
          this.reconnectAttempts = 0;

          // Start heartbeat
          this.startHeartbeat();

          // Resubscribe to channels
          this.resubscribeAll();

          // Flush message queue
          this.flushMessageQueue();

          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          this.log(`Disconnected: code=${event.code}, reason=${event.reason}`);
          this.stopHeartbeat();

          if (this._state !== 'disconnected') {
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          this.logError('Connection error:', error);
          if (this._state === 'connecting') {
            reject(new Error('WebSocket connection failed'));
          }
        };
      } catch (error) {
        this.logError('Failed to create WebSocket:', error);
        this.setState('disconnected');
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.log('Disconnecting');
    this.setState('disconnected');

    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Stop heartbeat
    this.stopHeartbeat();

    // Close WebSocket
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    // Clear state
    this.handlers.clear();
    this.globalHandlers.clear();
    this.subscriptions.clear();
    this.stateListeners.clear();
    this.messageQueue = [];
    this.reconnectAttempts = 0;
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.logError('Max reconnection attempts reached');
      this.setState('disconnected');
      return;
    }

    this.setState('reconnecting');
    this.reconnectAttempts++;

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.config.initialReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.config.maxReconnectDelay
    );

    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(() => {
        // Will trigger another reconnect attempt via onclose
      });
    }, delay);
  }

  // ============================================================================
  // Heartbeat Management
  // ============================================================================

  /**
   * Start heartbeat ping-pong mechanism
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.lastPongReceived = Date.now();

    this.heartbeatInterval = setInterval(() => {
      if (!this.isConnected) {
        return;
      }

      // Check if last pong was received within timeout
      if (Date.now() - this.lastPongReceived > this.config.heartbeatInterval + this.config.heartbeatTimeout) {
        this.logError('Heartbeat timeout - connection may be dead');
        this.ws?.close(4000, 'Heartbeat timeout');
        return;
      }

      // Send ping
      this.send({ type: 'ping', timestamp: new Date().toISOString() });

      // Set timeout for pong response
      this.heartbeatTimeout = setTimeout(() => {
        if (Date.now() - this.lastPongReceived > this.config.heartbeatTimeout) {
          this.log('Pong timeout warning');
        }
      }, this.config.heartbeatTimeout);
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  // ============================================================================
  // Message Handling
  // ============================================================================

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.log('Received:', message.type, message);

      // Handle pong messages
      if (message.type === 'pong') {
        this.lastPongReceived = Date.now();
        return;
      }

      // Call type-specific handlers
      const typeHandlers = this.handlers.get(message.type);
      if (typeHandlers) {
        typeHandlers.forEach((handler) => {
          try {
            handler(message.payload, message);
          } catch (error) {
            this.logError('Handler error:', error);
          }
        });
      }

      // Call global handlers (they receive the whole message as payload)
      this.globalHandlers.forEach((handler) => {
        try {
          (handler as MessageHandler<unknown>)(message, message);
        } catch (error) {
          this.logError('Global handler error:', error);
        }
      });
    } catch (error) {
      this.logError('Failed to parse message:', error);
    }
  }

  /**
   * Send a message to the server
   */
  send(data: unknown): void {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify(data));
    } else {
      // Queue message for later
      this.messageQueue.push(data);
      this.log('Message queued (not connected)');
    }
  }

  /**
   * Flush queued messages after reconnection
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length > 0) {
      this.log(`Flushing ${this.messageQueue.length} queued messages`);
      const queue = [...this.messageQueue];
      this.messageQueue = [];
      queue.forEach((data) => this.send(data));
    }
  }

  // ============================================================================
  // Subscription Management
  // ============================================================================

  /**
   * Subscribe to a specific message type
   */
  on<T = unknown>(type: WebSocketMessageType, handler: MessageHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as MessageHandler);

    return () => {
      this.handlers.get(type)?.delete(handler as MessageHandler);
    };
  }

  /**
   * Subscribe to all messages
   */
  onAny(handler: MessageHandler<WebSocketMessage>): () => void {
    this.globalHandlers.add(handler);
    return () => {
      this.globalHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to a channel
   */
  subscribe(channel: WebSocketChannel): () => void {
    this.subscriptions.add(channel);

    if (this.isConnected) {
      this.send({ type: 'subscribe', channel });
    }

    return () => {
      this.unsubscribe(channel);
    };
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: WebSocketChannel): void {
    this.subscriptions.delete(channel);

    if (this.isConnected) {
      this.send({ type: 'unsubscribe', channel });
    }
  }

  /**
   * Resubscribe to all channels after reconnection
   */
  private resubscribeAll(): void {
    this.subscriptions.forEach((channel) => {
      this.send({ type: 'subscribe', channel });
    });
  }

  /**
   * Get list of active subscriptions
   */
  getSubscriptions(): WebSocketChannel[] {
    return Array.from(this.subscriptions);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Default WebSocket client instance
 */
export const wsClient = new WebSocketClient({
  debug: import.meta.env.DEV,
});

export default wsClient;
