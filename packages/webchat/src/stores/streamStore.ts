import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { StreamEvent } from '../types';

/**
 * Tool call structure for streaming
 */
export interface ToolCall {
  id: string;
  name: string;
  type: 'browser' | 'search' | 'code' | 'file' | 'custom';
  status: 'pending' | 'executing' | 'completed' | 'failed';
  input?: unknown;
  output?: unknown;
  error?: string;
  startedAt: number;
  completedAt?: number;
}

/**
 * ORCHIDEA pipeline phases
 */
export type PipelinePhase =
  | 'receiving'
  | 'classifying'
  | 'routing'
  | 'generating'
  | 'validating'
  | 'integrating'
  | 'responding';

/**
 * Phase metadata
 */
export interface PhaseInfo {
  id: PipelinePhase;
  name: string;
  description: string;
  startedAt?: number;
  completedAt?: number;
}

/**
 * Stream state interface
 */
interface StreamState {
  // Streaming state
  isStreaming: boolean;
  isPaused: boolean;
  currentPhase: PipelinePhase | null;
  phaseHistory: PhaseInfo[];

  // Token accumulation
  tokens: string[];
  tokenCount: number;

  // Tool execution
  toolCalls: ToolCall[];
  activeToolId: string | null;

  // Metrics
  startTime: number | null;
  endTime: number | null;
  bytesReceived: number;

  // Error handling
  error: string | null;

  // Actions
  startStream: () => void;
  pauseStream: () => void;
  resumeStream: () => void;
  addToken: (token: string) => void;
  addTokens: (tokens: string[]) => void;
  setPhase: (phase: PipelinePhase, name?: string) => void;
  addToolCall: (toolCall: Omit<ToolCall, 'startedAt'>) => void;
  updateToolCall: (id: string, updates: Partial<ToolCall>) => void;
  completeToolCall: (id: string, output?: unknown, error?: string) => void;
  endStream: () => void;
  setError: (error: string) => void;
  reset: () => void;

  // Event handler
  handleStreamEvent: (event: StreamEvent) => void;

  // Getters
  getContent: () => string;
  getDuration: () => number;
  getTokensPerSecond: () => number;
}

/**
 * Default state values
 */
const defaultState = {
  isStreaming: false,
  isPaused: false,
  currentPhase: null,
  phaseHistory: [],
  tokens: [],
  tokenCount: 0,
  toolCalls: [],
  activeToolId: null,
  startTime: null,
  endTime: null,
  bytesReceived: 0,
  error: null,
};

/**
 * Phase display names
 */
const phaseNames: Record<PipelinePhase, string> = {
  receiving: 'Ricezione',
  classifying: 'Classificazione',
  routing: 'Routing',
  generating: 'Generazione',
  validating: 'Validazione',
  integrating: 'Integrazione',
  responding: 'Risposta',
};

/**
 * Stream store for SSE streaming state
 */
export const useStreamStore = create<StreamState>()(
  devtools(
    (set, get) => ({
      // Initial state
      ...defaultState,

      // Start streaming
      startStream: () => {
        set(
          {
            ...defaultState,
            isStreaming: true,
            startTime: Date.now(),
          },
          false,
          'startStream'
        );
      },

      // Pause streaming
      pauseStream: () => {
        set({ isPaused: true }, false, 'pauseStream');
      },

      // Resume streaming
      resumeStream: () => {
        set({ isPaused: false }, false, 'resumeStream');
      },

      // Add single token
      addToken: (token) => {
        if (get().isPaused) return;

        set(
          (state) => ({
            tokens: [...state.tokens, token],
            tokenCount: state.tokenCount + 1,
            bytesReceived: state.bytesReceived + token.length,
          }),
          false,
          'addToken'
        );
      },

      // Add multiple tokens (batch)
      addTokens: (tokens) => {
        if (get().isPaused) return;

        set(
          (state) => ({
            tokens: [...state.tokens, ...tokens],
            tokenCount: state.tokenCount + tokens.length,
            bytesReceived: state.bytesReceived + tokens.join('').length,
          }),
          false,
          'addTokens'
        );
      },

      // Set current phase
      setPhase: (phase, name) => {
        const now = Date.now();
        const displayName = name || phaseNames[phase] || phase;

        set(
          (state) => {
            // Complete previous phase
            const updatedHistory = state.phaseHistory.map((p, idx) => {
              if (idx === state.phaseHistory.length - 1 && !p.completedAt) {
                return { ...p, completedAt: now };
              }
              return p;
            });

            // Add new phase
            const newPhase: PhaseInfo = {
              id: phase,
              name: displayName,
              description: `Phase ${phase}`,
              startedAt: now,
            };

            return {
              currentPhase: phase,
              phaseHistory: [...updatedHistory, newPhase],
            };
          },
          false,
          'setPhase'
        );
      },

      // Add tool call
      addToolCall: (toolCall) => {
        const newToolCall: ToolCall = {
          ...toolCall,
          startedAt: Date.now(),
          status: toolCall.status || 'pending',
        };

        set(
          (state) => ({
            toolCalls: [...state.toolCalls, newToolCall],
            activeToolId: newToolCall.id,
          }),
          false,
          'addToolCall'
        );
      },

      // Update tool call
      updateToolCall: (id, updates) => {
        set(
          (state) => ({
            toolCalls: state.toolCalls.map((tc) => (tc.id === id ? { ...tc, ...updates } : tc)),
          }),
          false,
          'updateToolCall'
        );
      },

      // Complete tool call
      completeToolCall: (id, output, error) => {
        set(
          (state) => ({
            toolCalls: state.toolCalls.map((tc) =>
              tc.id === id
                ? {
                    ...tc,
                    status: error ? 'failed' : 'completed',
                    output,
                    error,
                    completedAt: Date.now(),
                  }
                : tc
            ),
            activeToolId: state.activeToolId === id ? null : state.activeToolId,
          }),
          false,
          'completeToolCall'
        );
      },

      // End streaming
      endStream: () => {
        const now = Date.now();

        set(
          (state) => ({
            isStreaming: false,
            isPaused: false,
            endTime: now,
            // Complete last phase
            phaseHistory: state.phaseHistory.map((p, idx) => {
              if (idx === state.phaseHistory.length - 1 && !p.completedAt) {
                return { ...p, completedAt: now };
              }
              return p;
            }),
          }),
          false,
          'endStream'
        );
      },

      // Set error
      setError: (error) => {
        set(
          {
            error,
            isStreaming: false,
            endTime: Date.now(),
          },
          false,
          'setError'
        );
      },

      // Reset state
      reset: () => {
        set(defaultState, false, 'reset');
      },

      // Handle stream events from SSE
      handleStreamEvent: (event) => {
        const { type, data } = event;

        switch (type) {
          case 'phase_start':
            get().setPhase(data.phase as PipelinePhase, data.name as string);
            break;

          case 'token':
            get().addToken(data.content as string);
            break;

          case 'tool_call':
            get().addToolCall({
              id: data.id as string,
              name: data.name as string,
              type: (data.type as ToolCall['type']) || 'custom',
              status: 'executing',
              input: data.input,
            });
            break;

          case 'tool_result':
            get().completeToolCall(
              data.id as string,
              data.output,
              data.error as string | undefined
            );
            break;

          case 'done':
            get().endStream();
            break;

          case 'error':
            get().setError(data.message as string);
            break;
        }
      },

      // Get accumulated content
      getContent: () => {
        return get().tokens.join('');
      },

      // Get duration in milliseconds
      getDuration: () => {
        const { startTime, endTime } = get();
        if (!startTime) return 0;
        return (endTime || Date.now()) - startTime;
      },

      // Get tokens per second
      getTokensPerSecond: () => {
        const { tokenCount } = get();
        const duration = get().getDuration();
        if (duration === 0) return 0;
        return Math.round((tokenCount / duration) * 1000);
      },
    }),
    { name: 'StreamStore', enabled: import.meta.env.DEV }
  )
);

// Selectors for optimized re-renders
export const selectIsStreaming = (state: StreamState) => state.isStreaming;
export const selectIsPaused = (state: StreamState) => state.isPaused;
export const selectCurrentPhase = (state: StreamState) => state.currentPhase;
export const selectTokens = (state: StreamState) => state.tokens;
export const selectTokenCount = (state: StreamState) => state.tokenCount;
export const selectToolCalls = (state: StreamState) => state.toolCalls;
export const selectActiveToolId = (state: StreamState) => state.activeToolId;
export const selectError = (state: StreamState) => state.error;
export const selectPhaseHistory = (state: StreamState) => state.phaseHistory;

// Derived selectors
export const selectActiveToolCall = (state: StreamState) =>
  state.toolCalls.find((tc) => tc.id === state.activeToolId);

export const selectCompletedToolCalls = (state: StreamState) =>
  state.toolCalls.filter((tc) => tc.status === 'completed');

export const selectFailedToolCalls = (state: StreamState) =>
  state.toolCalls.filter((tc) => tc.status === 'failed');

export default useStreamStore;
