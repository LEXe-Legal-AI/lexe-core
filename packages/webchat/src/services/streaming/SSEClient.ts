/**
 * SSE Event Types for LEO Webchat
 */
export enum SSEEventType {
  PHASE_START = 'phase_start',
  TOKEN = 'token',
  TOOL_CALL = 'tool_call',
  TOOL_RESULT = 'tool_result',
  DONE = 'done',
  ERROR = 'error',
}

/**
 * SSE Event structure
 */
export interface SSEEvent {
  type: SSEEventType;
  data: Record<string, unknown>;
  timestamp?: number;
}

/**
 * SSE Client options
 */
export interface SSEClientOptions {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  onEvent?: (event: SSEEvent) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
  /** Reconnect on error (default: false for POST) */
  reconnect?: boolean;
  /** Reconnect delay in ms (default: 1000) */
  reconnectDelay?: number;
  /** Max reconnect attempts (default: 3) */
  maxReconnectAttempts?: number;
}

/**
 * SSE Client for streaming responses
 *
 * Supports both GET (EventSource) and POST (fetch) methods
 *
 * @example
 * ```ts
 * const client = new SSEClient('/api/chat/stream', {
 *   method: 'POST',
 *   body: JSON.stringify({ message: 'Hello' }),
 *   onEvent: (event) => {
 *     if (event.type === SSEEventType.TOKEN) {
 *       console.log(event.data.content);
 *     }
 *   },
 * });
 *
 * await client.connect();
 * ```
 */
export class SSEClient {
  private url: string;
  private options: SSEClientOptions;
  private abortController: AbortController | null = null;
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private isConnected = false;

  constructor(url: string, options: SSEClientOptions = {}) {
    this.url = url;
    this.options = {
      method: 'POST',
      reconnect: false,
      reconnectDelay: 1000,
      maxReconnectAttempts: 3,
      ...options,
    };
  }

  /**
   * Connect and start receiving events
   */
  async connect(): Promise<void> {
    if (this.options.method === 'GET') {
      return this.connectEventSource();
    }
    return this.connectFetch();
  }

  /**
   * Connect using native EventSource (GET only)
   */
  private connectEventSource(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.eventSource = new EventSource(this.url);

        this.eventSource.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.options.onOpen?.();
          resolve();
        };

        this.eventSource.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.eventSource.onerror = () => {
          const error = new Error('EventSource error');
          if (!this.isConnected) {
            reject(error);
          } else {
            this.handleError(error);
          }
        };

        // Listen for custom event types
        for (const eventType of Object.values(SSEEventType)) {
          this.eventSource.addEventListener(eventType, (event) => {
            this.handleMessage((event as MessageEvent).data, eventType);
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Connect using fetch API (supports POST)
   */
  private async connectFetch(): Promise<void> {
    this.abortController = new AbortController();

    try {
      const response = await fetch(this.url, {
        method: this.options.method,
        headers: {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          ...this.options.headers,
        },
        body: this.options.body,
        signal: this.abortController.signal,
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      this.isConnected = true;
      this.options.onOpen?.();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          this.handleClose();
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // Process complete events
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent: { type?: string; data: string[] } = { data: [] };

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent.type = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            currentEvent.data.push(line.slice(5).trim());
          } else if (line === '') {
            // Empty line = event complete
            if (currentEvent.data.length > 0) {
              const dataStr = currentEvent.data.join('\n');
              this.handleMessage(dataStr, currentEvent.type);
            }
            currentEvent = { data: [] };
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        this.handleClose();
        return;
      }
      this.handleError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Map backend event names to frontend SSEEventType
   */
  private mapEventType(eventType: string): SSEEventType {
    const mapping: Record<string, SSEEventType> = {
      'phase': SSEEventType.PHASE_START,
      'phase_start': SSEEventType.PHASE_START,
      'token': SSEEventType.TOKEN,
      'complete': SSEEventType.DONE,
      'done': SSEEventType.DONE,
      'error': SSEEventType.ERROR,
      'tool_call': SSEEventType.TOOL_CALL,
      'tool_result': SSEEventType.TOOL_RESULT,
    };
    return mapping[eventType] || SSEEventType.TOKEN;
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string, eventType?: string): void {
    try {
      const parsed = JSON.parse(data);

      // Determine event type with mapping
      const rawType = eventType || parsed.event || parsed.type || 'token';
      const type = this.mapEventType(rawType);

      const event: SSEEvent = {
        type,
        data: parsed.data || parsed,
        timestamp: Date.now(),
      };

      this.options.onEvent?.(event);

      // Auto-close on done
      if (type === SSEEventType.DONE) {
        this.close();
      }
    } catch {
      // Non-JSON data, treat as plain token
      this.options.onEvent?.({
        type: SSEEventType.TOKEN,
        data: { content: data },
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle error
   */
  private handleError(error: Error): void {
    this.options.onError?.(error);

    if (this.options.reconnect && this.reconnectAttempts < (this.options.maxReconnectAttempts || 3)) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect();
      }, this.options.reconnectDelay);
    } else {
      this.close();
    }
  }

  /**
   * Handle close
   */
  private handleClose(): void {
    this.isConnected = false;
    this.options.onClose?.();
  }

  /**
   * Close the connection
   */
  close(): void {
    this.isConnected = false;

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.options.onClose?.();
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected;
  }
}

export default SSEClient;
