import { useState, useCallback, useRef, useEffect } from 'react';
import { SSEClient, SSEEvent, SSEEventType } from '@/services/streaming/SSEClient';
import { getApiClient } from '@/services/api';
import { useConfigStore } from '@/stores/configStore';

export interface StreamingMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming: boolean;
  phase?: number;
  phaseName?: string;
  tools?: ToolExecution[];
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ToolExecution {
  id: string;
  name: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  input?: unknown;
  output?: unknown;
  startedAt?: Date;
  completedAt?: Date;
}

export interface UseStreamingOptions {
  /** API endpoint for chat streaming */
  endpoint?: string;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Conversation ID for backend persistence */
  conversationId?: string;
  /** Skip authentication (for demo mode) */
  skipAuth?: boolean;
  /** Callback when streaming starts */
  onStart?: () => void;
  /** Callback when token received */
  onToken?: (token: string) => void;
  /** Callback when tool execution updates */
  onToolUpdate?: (tool: ToolExecution) => void;
  /** Callback when streaming completes */
  onComplete?: (message: StreamingMessage) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface UseStreamingReturn {
  /** Current streaming message */
  message: StreamingMessage | null;
  /** Whether currently streaming */
  isStreaming: boolean;
  /** Error if any */
  error: Error | null;
  /** Start streaming with a prompt */
  sendMessage: (content: string, attachments?: File[]) => Promise<void>;
  /** Stop current streaming */
  stop: () => void;
  /** Reset state */
  reset: () => void;
}

/**
 * Hook for managing SSE streaming chat responses
 */
export function useStreaming(options: UseStreamingOptions = {}): UseStreamingReturn {
  const {
    endpoint = '/api/v1/gateway/stream',
    headers = {},
    conversationId,
    skipAuth = false,
    onStart,
    onToken,
    onToolUpdate,
    onComplete,
    onError,
  } = options;

  // Get API URL from environment or default
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';

  const [message, setMessage] = useState<StreamingMessage | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const clientRef = useRef<SSEClient | null>(null);
  const messageIdRef = useRef(0);

  useEffect(() => {
    return () => {
      clientRef.current?.close();
    };
  }, []);

  const handleEvent = useCallback(
    (event: SSEEvent) => {
      const data = event.data;

      switch (event.type) {
        case SSEEventType.PHASE_START:
          setMessage((prev) =>
            prev
              ? {
                  ...prev,
                  phase: typeof data.phase === 'number' ? data.phase : undefined,
                  phaseName: typeof data.name === 'string' ? data.name : undefined,
                }
              : null
          );
          break;

        case SSEEventType.TOKEN: {
          const content = data.content ?? data.text ?? '';
          const tokenContent = typeof content === 'string' ? content : String(content);
          setMessage((prev) =>
            prev
              ? {
                  ...prev,
                  content: prev.content + tokenContent,
                }
              : null
          );
          onToken?.(tokenContent);
          break;
        }

        case SSEEventType.TOOL_CALL: {
          const toolId = typeof data.id === 'string' ? data.id : `tool-${Date.now()}`;
          const toolName = typeof data.tool === 'string' ? data.tool :
                          typeof data.name === 'string' ? data.name : 'unknown';
          const newTool: ToolExecution = {
            id: toolId,
            name: toolName,
            status: 'executing',
            input: data.input,
            startedAt: new Date(),
          };
          setMessage((prev) =>
            prev
              ? {
                  ...prev,
                  tools: [...(prev.tools || []), newTool],
                }
              : null
          );
          onToolUpdate?.(newTool);
          break;
        }

        case SSEEventType.TOOL_RESULT:
          setMessage((prev) => {
            if (!prev?.tools) return prev;
            const toolIndex = prev.tools.findIndex(
              (t) => t.id === data.id || t.name === data.tool
            );
            if (toolIndex === -1) return prev;

            const existingTool = prev.tools[toolIndex];
            if (!existingTool) return prev;

            const updatedTools = [...prev.tools];
            const updatedTool: ToolExecution = {
              ...existingTool,
              status: data.error ? 'failed' : 'completed',
              output: data.result,
              completedAt: new Date(),
            };
            updatedTools[toolIndex] = updatedTool;
            onToolUpdate?.(updatedTool);

            return { ...prev, tools: updatedTools };
          });
          break;

        case SSEEventType.DONE:
          setMessage((prev) => {
            if (!prev) return null;
            const completed: StreamingMessage = {
              ...prev,
              isStreaming: false,
              metadata: {
                ...prev.metadata,
                totalTokens: data.total_tokens,
              },
            };
            onComplete?.(completed);
            return completed;
          });
          setIsStreaming(false);
          break;

        case SSEEventType.ERROR: {
          const errMsg = typeof data.message === 'string' ? data.message : 'Stream error';
          const err = new Error(errMsg);
          setError(err);
          setMessage((prev) =>
            prev
              ? {
                  ...prev,
                  isStreaming: false,
                  error: errMsg,
                }
              : null
          );
          setIsStreaming(false);
          onError?.(err);
          break;
        }
      }
    },
    [onToken, onToolUpdate, onComplete, onError]
  );

  const sendMessage = useCallback(
    async (content: string, attachments?: File[]) => {
      setError(null);
      setIsStreaming(true);

      const newMessage: StreamingMessage = {
        id: `msg-${++messageIdRef.current}`,
        role: 'assistant',
        content: '',
        isStreaming: true,
        tools: [],
      };
      setMessage(newMessage);

      onStart?.();

      try {
        // Get auth headers and contact_id if not in demo mode
        let authHeaders: Record<string, string> = {};
        let contactId: string | null = null;

        if (!skipAuth && !demoMode) {
          const client = getApiClient();
          await client.ensureAuthenticated();
          const token = client.getAccessToken();
          if (token) {
            authHeaders['Authorization'] = `Bearer ${token}`;
          }
          contactId = client.getContactId();
        }

        // Get selected model from config store
        const selectedModel = useConfigStore.getState().selectedModel;

        // Build request body matching backend StreamRequest schema
        const body: Record<string, unknown> = {
          message: content,
          contact_id: contactId || '', // Use contact ID from auth
          model: selectedModel !== 'auto' ? selectedModel : undefined, // Pass model if not auto
        };

        if (conversationId) {
          body.conversation_id = conversationId;
        }

        if (attachments?.length) {
          body.attachments = attachments.map((f) => f.name);
        }

        // Construct full URL
        const streamUrl = demoMode ? endpoint : `${apiUrl}/gateway/stream`;

        clientRef.current = new SSEClient(streamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
            ...headers,
          },
          body: JSON.stringify(body),
          onEvent: handleEvent,
          onError: (err) => {
            setError(err);
            setIsStreaming(false);
            onError?.(err);
          },
        });

        await clientRef.current.connect();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        setIsStreaming(false);
        onError?.(error);
      }
    },
    [apiUrl, demoMode, endpoint, headers, conversationId, skipAuth, handleEvent, onStart, onError]
  );

  const stop = useCallback(() => {
    clientRef.current?.close();
    setIsStreaming(false);
    setMessage((prev) =>
      prev
        ? {
            ...prev,
            isStreaming: false,
          }
        : null
    );
  }, []);

  const reset = useCallback(() => {
    clientRef.current?.close();
    setMessage(null);
    setIsStreaming(false);
    setError(null);
  }, []);

  return {
    message,
    isStreaming,
    error,
    sendMessage,
    stop,
    reset,
  };
}

export default useStreaming;
