import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { MemoryLayer } from '../../types';

// ============================================================================
// Test Setup and Mocks
// ============================================================================

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Helper to ensure matchMedia is properly mocked
const ensureMatchMedia = () => {
  if (!window.matchMedia || typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? false : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }
};

// Initial setup
ensureMatchMedia();

// ============================================================================
// configStore Tests
// ============================================================================

describe('configStore', () => {
  beforeEach(async () => {
    localStorageMock.clear();
    vi.clearAllMocks();
    // Ensure matchMedia is available after any resets
    ensureMatchMedia();
    // Reset module cache to get fresh store
    vi.resetModules();
    // Ensure matchMedia is available again after resetModules
    ensureMatchMedia();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default values', async () => {
    const { useConfigStore } = await import('../configStore');
    const state = useConfigStore.getState();

    expect(state.theme).toBe('system');
    expect(state.streamingEnabled).toBe(true);
    expect(state.features.attachments).toBe(true);
    expect(state.features.voice).toBe(false);
    expect(state.features.memory).toBe(true);
    expect(state.features.tools).toBe(true);
    expect(state.branding.name).toBe('LEO');
    expect(state.branding.primaryColor).toBe('#1E3A5F');
  });

  it('should change theme correctly', async () => {
    // Ensure matchMedia mock is set up
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? false : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { useConfigStore } = await import('../configStore');
    const store = useConfigStore;

    act(() => {
      store.getState().setTheme('dark');
    });
    expect(store.getState().theme).toBe('dark');

    act(() => {
      store.getState().setTheme('light');
    });
    expect(store.getState().theme).toBe('light');

    act(() => {
      store.getState().setTheme('system');
    });
    expect(store.getState().theme).toBe('system');
  });

  it('should change language correctly', async () => {
    const { useConfigStore } = await import('../configStore');
    const store = useConfigStore;

    act(() => {
      store.getState().setLanguage('en');
    });
    expect(store.getState().language).toBe('en');

    act(() => {
      store.getState().setLanguage('fr');
    });
    expect(store.getState().language).toBe('fr');
  });

  it('should toggle debug mode', async () => {
    const { useConfigStore } = await import('../configStore');
    const store = useConfigStore;
    const initialDebug = store.getState().debugMode;

    act(() => {
      store.getState().toggleDebug();
    });
    expect(store.getState().debugMode).toBe(!initialDebug);

    act(() => {
      store.getState().toggleDebug();
    });
    expect(store.getState().debugMode).toBe(initialDebug);
  });

  it('should set feature flags correctly', async () => {
    const { useConfigStore } = await import('../configStore');
    const store = useConfigStore;

    act(() => {
      store.getState().setFeature('voice', true);
    });
    expect(store.getState().features.voice).toBe(true);

    act(() => {
      store.getState().setFeature('attachments', false);
    });
    expect(store.getState().features.attachments).toBe(false);
  });

  it('should set streaming enabled correctly', async () => {
    const { useConfigStore } = await import('../configStore');
    const store = useConfigStore;

    act(() => {
      store.getState().setStreamingEnabled(false);
    });
    expect(store.getState().streamingEnabled).toBe(false);

    act(() => {
      store.getState().setStreamingEnabled(true);
    });
    expect(store.getState().streamingEnabled).toBe(true);
  });

  it('should set branding correctly', async () => {
    const { useConfigStore } = await import('../configStore');
    const store = useConfigStore;

    act(() => {
      store.getState().setBranding({ name: 'Custom LEO', primaryColor: '#FF0000' });
    });
    expect(store.getState().branding.name).toBe('Custom LEO');
    expect(store.getState().branding.primaryColor).toBe('#FF0000');
    expect(store.getState().branding.logo).toBeNull(); // Should preserve existing values
  });

  it('should set API URL correctly', async () => {
    const { useConfigStore } = await import('../configStore');
    const store = useConfigStore;

    act(() => {
      store.getState().setApiUrl('http://custom-api.example.com/v2');
    });
    expect(store.getState().apiUrl).toBe('http://custom-api.example.com/v2');
  });

  it('should reset config to defaults', async () => {
    // Ensure matchMedia mock is set up
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? false : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { useConfigStore } = await import('../configStore');
    const store = useConfigStore;

    // Make changes
    act(() => {
      store.getState().setTheme('dark');
      store.getState().setLanguage('es');
      store.getState().setFeature('voice', true);
    });

    // Reset
    act(() => {
      store.getState().resetConfig();
    });

    expect(store.getState().theme).toBe('system');
    expect(store.getState().features.voice).toBe(false);
  });

  it('should have correct selectors', async () => {
    const {
      useConfigStore,
      selectTheme,
      selectLanguage,
      selectApiUrl,
      selectDebugMode,
      selectStreamingEnabled,
      selectFeatures,
      selectBranding,
    } = await import('../configStore');
    const state = useConfigStore.getState();

    expect(selectTheme(state)).toBe(state.theme);
    expect(selectLanguage(state)).toBe(state.language);
    expect(selectApiUrl(state)).toBe(state.apiUrl);
    expect(selectDebugMode(state)).toBe(state.debugMode);
    expect(selectStreamingEnabled(state)).toBe(state.streamingEnabled);
    expect(selectFeatures(state)).toEqual(state.features);
    expect(selectBranding(state)).toEqual(state.branding);
  });
});

// ============================================================================
// memoryStore Tests
// ============================================================================

describe('memoryStore', () => {
  beforeEach(async () => {
    localStorageMock.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should initialize with default values', async () => {
    const { useMemoryStore } = await import('../memoryStore');
    act(() => {
      useMemoryStore.getState().clearMemories();
    });
    const state = useMemoryStore.getState();

    expect(state.memories).toEqual([]);
    expect(state.selectedLayer).toBe('L0');
    expect(state.searchQuery).toBe('');
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.page).toBe(1);
    expect(state.pageSize).toBe(20);
    expect(state.totalCount).toBe(0);
  });

  it('should add memory correctly', async () => {
    const { useMemoryStore } = await import('../memoryStore');
    const store = useMemoryStore;
    act(() => {
      store.getState().clearMemories();
    });

    const testMemory = {
      id: 'mem-1',
      content: 'Test memory content',
      layer: MemoryLayer.L0_SESSION,
      confidence: 0.95,
      createdAt: new Date(),
    };

    act(() => {
      store.getState().addMemory(testMemory);
    });

    expect(store.getState().memories).toHaveLength(1);
    expect(store.getState().memories[0].content).toBe('Test memory content');
    expect(store.getState().memories[0].isNew).toBe(true);
    expect(store.getState().totalCount).toBe(1);

    // Advance timer to remove isNew flag
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(store.getState().memories[0].isNew).toBe(false);
  });

  it('should remove memory correctly', async () => {
    const { useMemoryStore } = await import('../memoryStore');
    const store = useMemoryStore;
    act(() => {
      store.getState().clearMemories();
    });

    const testMemory = {
      id: 'mem-remove',
      content: 'Memory to remove',
      layer: MemoryLayer.L1_CONVERSATION,
      confidence: 0.8,
      createdAt: new Date(),
    };

    act(() => {
      store.getState().addMemory(testMemory);
    });
    expect(store.getState().memories).toHaveLength(1);

    act(() => {
      store.getState().removeMemory('mem-remove');
    });
    expect(store.getState().memories).toHaveLength(0);
    expect(store.getState().totalCount).toBe(0);
  });

  it('should update memory correctly', async () => {
    const { useMemoryStore } = await import('../memoryStore');
    const store = useMemoryStore;
    act(() => {
      store.getState().clearMemories();
    });

    const testMemory = {
      id: 'mem-update',
      content: 'Original content',
      layer: MemoryLayer.L2_USER,
      confidence: 0.7,
      createdAt: new Date(),
    };

    act(() => {
      store.getState().addMemory(testMemory);
    });

    act(() => {
      store.getState().updateMemory('mem-update', { content: 'Updated content', confidence: 0.9 });
    });

    expect(store.getState().memories[0].content).toBe('Updated content');
    expect(store.getState().memories[0].confidence).toBe(0.9);
  });

  it('should select layer correctly', async () => {
    const { useMemoryStore } = await import('../memoryStore');
    const store = useMemoryStore;
    act(() => {
      store.getState().clearMemories();
    });

    // Mock fetchMemories to avoid actual fetch
    const fetchSpy = vi.spyOn(store.getState(), 'fetchMemories').mockResolvedValue();

    act(() => {
      store.getState().selectLayer('L2');
    });

    expect(store.getState().selectedLayer).toBe('L2');
    expect(store.getState().page).toBe(1);
    expect(fetchSpy).toHaveBeenCalledWith('L2');
  });

  it('should handle pagination correctly', async () => {
    const { useMemoryStore } = await import('../memoryStore');
    const store = useMemoryStore;
    act(() => {
      store.getState().clearMemories();
    });

    // Mock fetchMemories
    const fetchSpy = vi.spyOn(store.getState(), 'fetchMemories').mockResolvedValue();

    act(() => {
      store.getState().setPage(3);
    });

    expect(store.getState().page).toBe(3);
    expect(fetchSpy).toHaveBeenCalled();
  });

  it('should set search query correctly', async () => {
    const { useMemoryStore } = await import('../memoryStore');
    const store = useMemoryStore;
    act(() => {
      store.getState().clearMemories();
    });

    act(() => {
      store.getState().setSearchQuery('test query');
    });

    expect(store.getState().searchQuery).toBe('test query');
    expect(store.getState().page).toBe(1); // Page should reset
  });

  it('should highlight memory correctly', async () => {
    const { useMemoryStore } = await import('../memoryStore');
    const store = useMemoryStore;
    act(() => {
      store.getState().clearMemories();
    });

    const testMemory = {
      id: 'mem-highlight',
      content: 'Highlight me',
      layer: MemoryLayer.L3_SEMANTIC,
      confidence: 0.85,
      createdAt: new Date(),
    };

    act(() => {
      store.getState().addMemory(testMemory);
    });

    act(() => {
      store.getState().highlightMemory('mem-highlight', true);
    });
    expect(store.getState().memories[0].isHighlighted).toBe(true);

    act(() => {
      store.getState().highlightMemory('mem-highlight', false);
    });
    expect(store.getState().memories[0].isHighlighted).toBe(false);
  });

  it('should set loading and error states', async () => {
    const { useMemoryStore } = await import('../memoryStore');
    const store = useMemoryStore;
    act(() => {
      store.getState().clearMemories();
    });

    act(() => {
      store.getState().setLoading(true);
    });
    expect(store.getState().isLoading).toBe(true);

    act(() => {
      store.getState().setError('Test error');
    });
    expect(store.getState().error).toBe('Test error');
    expect(store.getState().isLoading).toBe(false); // Error sets loading to false
  });

  it('should clear memories correctly', async () => {
    const { useMemoryStore } = await import('../memoryStore');
    const store = useMemoryStore;

    act(() => {
      store.getState().clearMemories();
    });

    act(() => {
      store.getState().addMemory({
        id: 'mem-1',
        content: 'Memory 1',
        layer: MemoryLayer.L0_SESSION,
        confidence: 0.9,
        createdAt: new Date(),
      });
      store.getState().addMemory({
        id: 'mem-2',
        content: 'Memory 2',
        layer: MemoryLayer.L1_CONVERSATION,
        confidence: 0.8,
        createdAt: new Date(),
      });
    });

    expect(store.getState().memories).toHaveLength(2);

    act(() => {
      store.getState().clearMemories();
    });

    expect(store.getState().memories).toHaveLength(0);
    expect(store.getState().totalCount).toBe(0);
    expect(store.getState().page).toBe(1);
  });

  it('should have correct selectors', async () => {
    const {
      useMemoryStore,
      selectMemories,
      selectSelectedLayer,
      selectIsLoading,
      selectError,
      selectSearchQuery,
      selectPagination,
    } = await import('../memoryStore');
    act(() => {
      useMemoryStore.getState().clearMemories();
    });
    const state = useMemoryStore.getState();

    expect(selectMemories(state)).toEqual(state.memories);
    expect(selectSelectedLayer(state)).toBe(state.selectedLayer);
    expect(selectIsLoading(state)).toBe(state.isLoading);
    expect(selectError(state)).toBe(state.error);
    expect(selectSearchQuery(state)).toBe(state.searchQuery);
    expect(selectPagination(state)).toEqual({
      page: state.page,
      pageSize: state.pageSize,
      totalCount: state.totalCount,
    });
  });
});

// ============================================================================
// streamStore Tests
// ============================================================================

describe('streamStore', () => {
  beforeEach(async () => {
    localStorageMock.clear();
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default values', async () => {
    const { useStreamStore } = await import('../streamStore');
    act(() => {
      useStreamStore.getState().reset();
    });
    const state = useStreamStore.getState();

    expect(state.isStreaming).toBe(false);
    expect(state.isPaused).toBe(false);
    expect(state.currentPhase).toBeNull();
    expect(state.phaseHistory).toEqual([]);
    expect(state.tokens).toEqual([]);
    expect(state.tokenCount).toBe(0);
    expect(state.toolCalls).toEqual([]);
    expect(state.activeToolId).toBeNull();
    expect(state.error).toBeNull();
  });

  it('should start streaming correctly', async () => {
    const { useStreamStore } = await import('../streamStore');
    const store = useStreamStore;
    act(() => {
      store.getState().reset();
    });

    const beforeStart = Date.now();
    act(() => {
      store.getState().startStream();
    });

    expect(store.getState().isStreaming).toBe(true);
    expect(store.getState().isPaused).toBe(false);
    expect(store.getState().startTime).toBeGreaterThanOrEqual(beforeStart);
    expect(store.getState().tokens).toEqual([]);
    expect(store.getState().tokenCount).toBe(0);
  });

  it('should pause and resume streaming', async () => {
    const { useStreamStore } = await import('../streamStore');
    const store = useStreamStore;
    act(() => {
      store.getState().reset();
    });

    act(() => {
      store.getState().startStream();
    });

    act(() => {
      store.getState().pauseStream();
    });
    expect(store.getState().isPaused).toBe(true);

    act(() => {
      store.getState().resumeStream();
    });
    expect(store.getState().isPaused).toBe(false);
  });

  it('should accumulate tokens correctly', async () => {
    const { useStreamStore } = await import('../streamStore');
    const store = useStreamStore;
    act(() => {
      store.getState().reset();
    });

    act(() => {
      store.getState().startStream();
    });

    act(() => {
      store.getState().addToken('Hello');
    });
    expect(store.getState().tokens).toEqual(['Hello']);
    expect(store.getState().tokenCount).toBe(1);

    act(() => {
      store.getState().addToken(' World');
    });
    expect(store.getState().tokens).toEqual(['Hello', ' World']);
    expect(store.getState().tokenCount).toBe(2);
    expect(store.getState().bytesReceived).toBe(11); // 'Hello' + ' World' = 11 chars
  });

  it('should add multiple tokens in batch', async () => {
    const { useStreamStore } = await import('../streamStore');
    const store = useStreamStore;
    act(() => {
      store.getState().reset();
    });

    act(() => {
      store.getState().startStream();
    });

    act(() => {
      store.getState().addTokens(['Hello', ' ', 'World', '!']);
    });

    expect(store.getState().tokens).toEqual(['Hello', ' ', 'World', '!']);
    expect(store.getState().tokenCount).toBe(4);
    expect(store.getState().getContent()).toBe('Hello World!');
  });

  it('should not add tokens when paused', async () => {
    const { useStreamStore } = await import('../streamStore');
    const store = useStreamStore;
    act(() => {
      store.getState().reset();
    });

    act(() => {
      store.getState().startStream();
      store.getState().pauseStream();
    });

    act(() => {
      store.getState().addToken('Should not appear');
    });

    expect(store.getState().tokens).toEqual([]);
    expect(store.getState().tokenCount).toBe(0);
  });

  it('should handle phase transitions correctly', async () => {
    const { useStreamStore } = await import('../streamStore');
    const store = useStreamStore;
    act(() => {
      store.getState().reset();
    });

    act(() => {
      store.getState().startStream();
    });

    act(() => {
      store.getState().setPhase('receiving');
    });
    expect(store.getState().currentPhase).toBe('receiving');
    expect(store.getState().phaseHistory).toHaveLength(1);
    expect(store.getState().phaseHistory[0].id).toBe('receiving');

    act(() => {
      store.getState().setPhase('classifying', 'Custom Classification');
    });
    expect(store.getState().currentPhase).toBe('classifying');
    expect(store.getState().phaseHistory).toHaveLength(2);
    expect(store.getState().phaseHistory[1].name).toBe('Custom Classification');
    // Previous phase should be completed
    expect(store.getState().phaseHistory[0].completedAt).toBeDefined();
  });

  it('should handle tool calls lifecycle', async () => {
    const { useStreamStore } = await import('../streamStore');
    const store = useStreamStore;
    act(() => {
      store.getState().reset();
    });

    act(() => {
      store.getState().startStream();
    });

    // Add tool call
    act(() => {
      store.getState().addToolCall({
        id: 'tool-1',
        name: 'browser_search',
        type: 'browser',
        status: 'pending',
        input: { query: 'test' },
      });
    });

    expect(store.getState().toolCalls).toHaveLength(1);
    expect(store.getState().activeToolId).toBe('tool-1');
    expect(store.getState().toolCalls[0].status).toBe('pending');

    // Update tool call
    act(() => {
      store.getState().updateToolCall('tool-1', { status: 'executing' });
    });
    expect(store.getState().toolCalls[0].status).toBe('executing');

    // Complete tool call
    act(() => {
      store.getState().completeToolCall('tool-1', { results: ['data'] });
    });
    expect(store.getState().toolCalls[0].status).toBe('completed');
    expect(store.getState().toolCalls[0].output).toEqual({ results: ['data'] });
    expect(store.getState().toolCalls[0].completedAt).toBeDefined();
    expect(store.getState().activeToolId).toBeNull();
  });

  it('should handle tool call failure', async () => {
    const { useStreamStore } = await import('../streamStore');
    const store = useStreamStore;
    act(() => {
      store.getState().reset();
    });

    act(() => {
      store.getState().startStream();
      store.getState().addToolCall({
        id: 'tool-fail',
        name: 'failing_tool',
        type: 'custom',
        status: 'executing',
      });
    });

    act(() => {
      store.getState().completeToolCall('tool-fail', undefined, 'Tool execution failed');
    });

    expect(store.getState().toolCalls[0].status).toBe('failed');
    expect(store.getState().toolCalls[0].error).toBe('Tool execution failed');
  });

  it('should end streaming correctly', async () => {
    const { useStreamStore } = await import('../streamStore');
    const store = useStreamStore;
    act(() => {
      store.getState().reset();
    });

    act(() => {
      store.getState().startStream();
      store.getState().setPhase('generating');
      store.getState().addTokens(['Hello', ' ', 'World']);
    });

    act(() => {
      store.getState().endStream();
    });

    expect(store.getState().isStreaming).toBe(false);
    expect(store.getState().isPaused).toBe(false);
    expect(store.getState().endTime).toBeDefined();
    // Last phase should be completed
    expect(
      store.getState().phaseHistory[store.getState().phaseHistory.length - 1].completedAt
    ).toBeDefined();
  });

  it('should set error correctly', async () => {
    const { useStreamStore } = await import('../streamStore');
    const store = useStreamStore;
    act(() => {
      store.getState().reset();
    });

    act(() => {
      store.getState().startStream();
    });

    act(() => {
      store.getState().setError('Connection lost');
    });

    expect(store.getState().error).toBe('Connection lost');
    expect(store.getState().isStreaming).toBe(false);
    expect(store.getState().endTime).toBeDefined();
  });

  it('should handle stream events correctly', async () => {
    const { useStreamStore } = await import('../streamStore');
    const store = useStreamStore;
    act(() => {
      store.getState().reset();
    });

    act(() => {
      store.getState().startStream();
    });

    // Phase start event
    act(() => {
      store.getState().handleStreamEvent({
        type: 'phase_start',
        data: { phase: 'routing', name: 'Routing Phase' },
        timestamp: Date.now(),
      });
    });
    expect(store.getState().currentPhase).toBe('routing');

    // Token event
    act(() => {
      store.getState().handleStreamEvent({
        type: 'token',
        data: { content: 'Hello' },
        timestamp: Date.now(),
      });
    });
    expect(store.getState().tokens).toContain('Hello');

    // Tool call event
    act(() => {
      store.getState().handleStreamEvent({
        type: 'tool_call',
        data: { id: 'tool-event', name: 'search', type: 'search', input: {} },
        timestamp: Date.now(),
      });
    });
    expect(store.getState().toolCalls.find((t) => t.id === 'tool-event')).toBeDefined();

    // Tool result event
    act(() => {
      store.getState().handleStreamEvent({
        type: 'tool_result',
        data: { id: 'tool-event', output: { data: 'result' } },
        timestamp: Date.now(),
      });
    });
    expect(store.getState().toolCalls.find((t) => t.id === 'tool-event')?.status).toBe('completed');

    // Done event
    act(() => {
      store.getState().handleStreamEvent({
        type: 'done',
        data: {},
        timestamp: Date.now(),
      });
    });
    expect(store.getState().isStreaming).toBe(false);
  });

  it('should handle error event', async () => {
    const { useStreamStore } = await import('../streamStore');
    const store = useStreamStore;
    act(() => {
      store.getState().reset();
    });

    act(() => {
      store.getState().startStream();
    });

    act(() => {
      store.getState().handleStreamEvent({
        type: 'error',
        data: { message: 'Stream error occurred' },
        timestamp: Date.now(),
      });
    });

    expect(store.getState().error).toBe('Stream error occurred');
    expect(store.getState().isStreaming).toBe(false);
  });

  it('should calculate metrics correctly', async () => {
    const { useStreamStore } = await import('../streamStore');
    const store = useStreamStore;
    act(() => {
      store.getState().reset();
    });

    act(() => {
      store.getState().startStream();
    });

    act(() => {
      store.getState().addTokens(['a', 'b', 'c', 'd', 'e']);
    });

    expect(store.getState().getContent()).toBe('abcde');
    // Duration should be >= 0 (might be 0 if test runs very fast)
    expect(store.getState().getDuration()).toBeGreaterThanOrEqual(0);
    // Token rate depends on actual time elapsed
    const tps = store.getState().getTokensPerSecond();
    expect(typeof tps).toBe('number');
  });

  it('should reset correctly', async () => {
    const { useStreamStore } = await import('../streamStore');
    const store = useStreamStore;

    act(() => {
      store.getState().startStream();
      store.getState().setPhase('generating');
      store.getState().addTokens(['Hello', 'World']);
      store.getState().addToolCall({
        id: 'tool-reset',
        name: 'test',
        type: 'custom',
        status: 'executing',
      });
    });

    act(() => {
      store.getState().reset();
    });

    expect(store.getState().isStreaming).toBe(false);
    expect(store.getState().tokens).toEqual([]);
    expect(store.getState().tokenCount).toBe(0);
    expect(store.getState().toolCalls).toEqual([]);
    expect(store.getState().phaseHistory).toEqual([]);
    expect(store.getState().currentPhase).toBeNull();
  });

  it('should have correct selectors', async () => {
    const {
      useStreamStore,
      selectIsStreaming,
      selectIsPaused,
      selectCurrentPhase,
      selectTokens,
      selectTokenCount,
      selectToolCalls,
      selectActiveToolId,
      selectError,
      selectPhaseHistory,
      selectActiveToolCall,
      selectCompletedToolCalls,
      selectFailedToolCalls,
    } = await import('../streamStore');

    act(() => {
      useStreamStore.getState().reset();
      useStreamStore.getState().startStream();
      useStreamStore.getState().addToolCall({
        id: 'sel-1',
        name: 'tool1',
        type: 'search',
        status: 'completed',
      });
      useStreamStore.getState().addToolCall({
        id: 'sel-2',
        name: 'tool2',
        type: 'browser',
        status: 'failed',
      });
    });

    const state = useStreamStore.getState();

    expect(selectIsStreaming(state)).toBe(true);
    expect(selectIsPaused(state)).toBe(false);
    expect(selectCurrentPhase(state)).toBeNull();
    expect(selectTokens(state)).toEqual([]);
    expect(selectTokenCount(state)).toBe(0);
    expect(selectToolCalls(state)).toHaveLength(2);
    expect(selectActiveToolId(state)).toBe('sel-2');
    expect(selectError(state)).toBeNull();
    expect(selectPhaseHistory(state)).toEqual([]);
    expect(selectActiveToolCall(state)?.id).toBe('sel-2');
    expect(selectCompletedToolCalls(state)).toHaveLength(1);
    expect(selectFailedToolCalls(state)).toHaveLength(1);
  });
});

// ============================================================================
// pluginStore Tests
// ============================================================================

describe('pluginStore', () => {
  beforeEach(async () => {
    localStorageMock.clear();
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with empty state', async () => {
    const { usePluginStore } = await import('../pluginStore');
    const state = usePluginStore.getState();

    // Clear any persisted state
    expect(Array.isArray(state.registrations)).toBe(true);
    expect(Array.isArray(state.activePluginIds)).toBe(true);
    expect(state.plugins instanceof Map).toBe(true);
    expect(state.loadingPlugins instanceof Set).toBe(true);
    expect(state.errors instanceof Map).toBe(true);
  });

  it('should register plugin correctly', async () => {
    const { usePluginStore } = await import('../pluginStore');
    const store = usePluginStore;

    const testPlugin = {
      id: 'fresh-test-plugin',
      name: 'Test Plugin',
      type: 'tool' as const,
      enabled: false,
      config: { setting1: 'value1' },
    };

    const initialCount = store.getState().registrations.length;

    act(() => {
      store.getState().registerPlugin(testPlugin);
    });

    expect(store.getState().plugins.get('fresh-test-plugin')).toBeDefined();
    expect(store.getState().registrations).toHaveLength(initialCount + 1);
    const registration = store.getState().registrations.find((r) => r.id === 'fresh-test-plugin');
    expect(registration).toBeDefined();
    expect(registration?.config).toEqual({ setting1: 'value1' });
  });

  it('should update existing plugin registration', async () => {
    const { usePluginStore } = await import('../pluginStore');
    const store = usePluginStore;

    const plugin1 = {
      id: 'update-test-unique',
      name: 'Original Name',
      type: 'channel' as const,
      enabled: false,
    };

    const plugin2 = {
      id: 'update-test-unique',
      name: 'Updated Name',
      type: 'channel' as const,
      enabled: true,
    };

    act(() => {
      store.getState().registerPlugin(plugin1);
    });

    const countAfterFirst = store.getState().registrations.length;

    act(() => {
      store.getState().registerPlugin(plugin2);
    });

    // Count should be same (updated, not added)
    expect(store.getState().registrations).toHaveLength(countAfterFirst);
    const registration = store.getState().registrations.find(
      (r) => r.id === 'update-test-unique'
    );
    expect(registration?.name).toBe('Updated Name');
  });

  it('should activate plugin with lifecycle hook', async () => {
    const { usePluginStore } = await import('../pluginStore');
    const store = usePluginStore;

    const onActivate = vi.fn();
    const testPlugin = {
      id: 'activate-test-unique',
      name: 'Activation Test',
      type: 'memory' as const,
      enabled: false,
      onActivate,
    };

    act(() => {
      store.getState().registerPlugin(testPlugin);
    });

    let result: boolean = false;
    await act(async () => {
      result = await store.getState().activatePlugin('activate-test-unique');
    });

    expect(result).toBe(true);
    expect(onActivate).toHaveBeenCalled();
    expect(store.getState().activePluginIds).toContain('activate-test-unique');
    expect(store.getState().isPluginActive('activate-test-unique')).toBe(true);
  });

  it('should handle activation failure', async () => {
    const { usePluginStore } = await import('../pluginStore');
    const store = usePluginStore;

    const onActivate = vi.fn().mockRejectedValue(new Error('Activation error'));
    const testPlugin = {
      id: 'fail-activate-unique',
      name: 'Failing Plugin',
      type: 'tool' as const,
      enabled: false,
      onActivate,
    };

    act(() => {
      store.getState().registerPlugin(testPlugin);
    });

    let result: boolean = true;
    await act(async () => {
      result = await store.getState().activatePlugin('fail-activate-unique');
    });

    expect(result).toBe(false);
    expect(store.getState().activePluginIds).not.toContain('fail-activate-unique');
    expect(store.getState().errors.get('fail-activate-unique')).toBe('Activation error');
  });

  it('should return true for already active plugin', async () => {
    const { usePluginStore } = await import('../pluginStore');
    const store = usePluginStore;

    const testPlugin = {
      id: 'already-active-unique',
      name: 'Already Active',
      type: 'tool' as const,
      enabled: false,
    };

    act(() => {
      store.getState().registerPlugin(testPlugin);
    });

    await act(async () => {
      await store.getState().activatePlugin('already-active-unique');
    });

    let result: boolean = false;
    await act(async () => {
      result = await store.getState().activatePlugin('already-active-unique');
    });

    expect(result).toBe(true); // Should return true for already active
  });

  it('should deactivate plugin with lifecycle hook', async () => {
    const { usePluginStore } = await import('../pluginStore');
    const store = usePluginStore;

    const onDeactivate = vi.fn();
    const testPlugin = {
      id: 'deactivate-test-unique',
      name: 'Deactivation Test',
      type: 'tool' as const,
      enabled: false,
      onDeactivate,
    };

    act(() => {
      store.getState().registerPlugin(testPlugin);
    });

    await act(async () => {
      await store.getState().activatePlugin('deactivate-test-unique');
    });
    expect(store.getState().isPluginActive('deactivate-test-unique')).toBe(true);

    let result: boolean = false;
    await act(async () => {
      result = await store.getState().deactivatePlugin('deactivate-test-unique');
    });

    expect(result).toBe(true);
    expect(onDeactivate).toHaveBeenCalled();
    expect(store.getState().activePluginIds).not.toContain('deactivate-test-unique');
    expect(store.getState().isPluginActive('deactivate-test-unique')).toBe(false);
  });

  it('should toggle plugin state', async () => {
    const { usePluginStore } = await import('../pluginStore');
    const store = usePluginStore;

    const testPlugin = {
      id: 'toggle-test-unique',
      name: 'Toggle Test',
      type: 'tool' as const,
      enabled: false,
    };

    act(() => {
      store.getState().registerPlugin(testPlugin);
    });

    // Toggle on
    await act(async () => {
      await store.getState().togglePlugin('toggle-test-unique');
    });
    expect(store.getState().isPluginActive('toggle-test-unique')).toBe(true);

    // Toggle off
    await act(async () => {
      await store.getState().togglePlugin('toggle-test-unique');
    });
    expect(store.getState().isPluginActive('toggle-test-unique')).toBe(false);
  });

  it('should unregister plugin and deactivate if active', async () => {
    const { usePluginStore } = await import('../pluginStore');
    const store = usePluginStore;

    const onDeactivate = vi.fn();
    const testPlugin = {
      id: 'unregister-test-unique',
      name: 'Unregister Test',
      type: 'tool' as const,
      enabled: false,
      onDeactivate,
    };

    act(() => {
      store.getState().registerPlugin(testPlugin);
    });

    await act(async () => {
      await store.getState().activatePlugin('unregister-test-unique');
    });

    act(() => {
      store.getState().unregisterPlugin('unregister-test-unique');
    });

    expect(store.getState().plugins.has('unregister-test-unique')).toBe(false);
    expect(
      store.getState().registrations.find((r) => r.id === 'unregister-test-unique')
    ).toBeUndefined();
    expect(onDeactivate).toHaveBeenCalled();
  });

  it('should update plugin config', async () => {
    const { usePluginStore } = await import('../pluginStore');
    const store = usePluginStore;

    const testPlugin = {
      id: 'config-test-unique',
      name: 'Config Test',
      type: 'tool' as const,
      enabled: false,
      config: { key1: 'value1' },
    };

    act(() => {
      store.getState().registerPlugin(testPlugin);
    });

    act(() => {
      store.getState().updatePluginConfig('config-test-unique', { key2: 'value2' });
    });

    const plugin = store.getState().plugins.get('config-test-unique');
    expect(plugin?.config).toEqual({ key1: 'value1', key2: 'value2' });
  });

  it('should get plugin by ID', async () => {
    const { usePluginStore } = await import('../pluginStore');
    const store = usePluginStore;

    const testPlugin = {
      id: 'get-test-unique',
      name: 'Get Test',
      type: 'memory' as const,
      enabled: false,
    };

    act(() => {
      store.getState().registerPlugin(testPlugin);
    });

    expect(store.getState().getPlugin('get-test-unique')?.name).toBe('Get Test');
    expect(store.getState().getPlugin('nonexistent-xyz')).toBeUndefined();
  });

  it('should get active plugins', async () => {
    const { usePluginStore } = await import('../pluginStore');
    const store = usePluginStore;

    // Register unique plugins for this test
    act(() => {
      store.getState().registerPlugin({ id: 'p1-unique', name: 'P1', type: 'tool', enabled: false });
      store.getState().registerPlugin({
        id: 'p2-unique',
        name: 'P2',
        type: 'channel',
        enabled: false,
      });
      store.getState().registerPlugin({
        id: 'p3-unique',
        name: 'P3',
        type: 'memory',
        enabled: false,
      });
    });

    await act(async () => {
      await store.getState().activatePlugin('p1-unique');
      await store.getState().activatePlugin('p3-unique');
    });

    const activePlugins = store.getState().getActivePlugins();
    const uniqueActivePlugins = activePlugins.filter((p) =>
      ['p1-unique', 'p3-unique'].includes(p.id)
    );
    expect(uniqueActivePlugins).toHaveLength(2);
    expect(uniqueActivePlugins.map((p) => p.id).sort()).toEqual(['p1-unique', 'p3-unique']);
  });

  it('should get plugins by type', async () => {
    const { usePluginStore } = await import('../pluginStore');
    const store = usePluginStore;

    // Register unique plugins for this test
    act(() => {
      store.getState().registerPlugin({
        id: 't1-type-test',
        name: 'Tool1',
        type: 'tool',
        enabled: false,
      });
      store.getState().registerPlugin({
        id: 't2-type-test',
        name: 'Tool2',
        type: 'tool',
        enabled: false,
      });
      store.getState().registerPlugin({
        id: 'c1-type-test',
        name: 'Channel1',
        type: 'channel',
        enabled: false,
      });
    });

    const toolPlugins = store
      .getState()
      .getPluginsByType('tool')
      .filter((p) => p.id.includes('-type-test'));
    const channelPlugins = store
      .getState()
      .getPluginsByType('channel')
      .filter((p) => p.id.includes('-type-test'));

    expect(toolPlugins).toHaveLength(2);
    expect(channelPlugins).toHaveLength(1);
  });

  it('should clear error', async () => {
    const { usePluginStore } = await import('../pluginStore');
    const store = usePluginStore;

    const onActivate = vi.fn().mockRejectedValue(new Error('Test error'));
    act(() => {
      store.getState().registerPlugin({
        id: 'error-clear-unique',
        name: 'Error Clear',
        type: 'tool',
        enabled: false,
        onActivate,
      });
    });

    await act(async () => {
      await store.getState().activatePlugin('error-clear-unique');
    });
    expect(store.getState().errors.get('error-clear-unique')).toBe('Test error');

    act(() => {
      store.getState().clearError('error-clear-unique');
    });
    expect(store.getState().errors.has('error-clear-unique')).toBe(false);
  });

  it('should return error when activating nonexistent plugin', async () => {
    const { usePluginStore } = await import('../pluginStore');
    const store = usePluginStore;

    let result: boolean = true;
    await act(async () => {
      result = await store.getState().activatePlugin('nonexistent-plugin-xyz');
    });

    expect(result).toBe(false);
    expect(store.getState().errors.get('nonexistent-plugin-xyz')).toBe('Plugin not found');
  });

  it('should have correct selectors', async () => {
    const {
      usePluginStore,
      selectRegistrations,
      selectActivePluginIds,
      selectLoadingPlugins,
      selectErrors,
      selectPluginCount,
      selectActivePluginCount,
      selectPluginError,
      selectIsPluginLoading,
    } = await import('../pluginStore');

    act(() => {
      usePluginStore.getState().registerPlugin({
        id: 'sel-test-unique',
        name: 'Selector Test',
        type: 'tool',
        enabled: false,
      });
    });

    await act(async () => {
      await usePluginStore.getState().activatePlugin('sel-test-unique');
    });

    const state = usePluginStore.getState();

    expect(selectRegistrations(state).find((r) => r.id === 'sel-test-unique')).toBeDefined();
    expect(selectActivePluginIds(state)).toContain('sel-test-unique');
    expect(selectLoadingPlugins(state).size).toBe(0);
    expect(selectErrors(state).has('sel-test-unique')).toBe(false);
    expect(selectPluginCount(state)).toBeGreaterThan(0);
    expect(selectActivePluginCount(state)).toBeGreaterThan(0);
    expect(selectPluginError('sel-test-unique')(state)).toBeUndefined();
    expect(selectIsPluginLoading('sel-test-unique')(state)).toBe(false);
  });
});

// ============================================================================
// uiStore Tests
// ============================================================================

describe('uiStore', () => {
  beforeEach(async () => {
    localStorageMock.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should initialize with default values', async () => {
    const { useUIStore } = await import('../uiStore');
    act(() => {
      useUIStore.getState().resetUI();
    });
    const state = useUIStore.getState();

    expect(state.sidebarOpen).toBe(true);
    expect(state.sidebarWidth).toBe(280);
    expect(state.previewPanelOpen).toBe(false);
    expect(state.previewPanelWidth).toBe(400);
    expect(state.activeTab).toBe('chat');
    expect(state.activeRoute).toBe('/');
    expect(state.modals).toEqual([]);
    expect(state.notifications).toEqual([]);
    expect(state.inputFocused).toBe(false);
    expect(state.inputValue).toBe('');
    expect(state.isMobile).toBe(false);
    expect(state.mobileMenuOpen).toBe(false);
    expect(state.isPageLoading).toBe(false);
  });

  it('should toggle sidebar', async () => {
    const { useUIStore } = await import('../uiStore');
    const store = useUIStore;
    act(() => {
      store.getState().resetUI();
    });

    act(() => {
      store.getState().toggleSidebar();
    });
    expect(store.getState().sidebarOpen).toBe(false);

    act(() => {
      store.getState().toggleSidebar();
    });
    expect(store.getState().sidebarOpen).toBe(true);
  });

  it('should set sidebar open state', async () => {
    const { useUIStore } = await import('../uiStore');
    const store = useUIStore;
    act(() => {
      store.getState().resetUI();
    });

    act(() => {
      store.getState().setSidebarOpen(false);
    });
    expect(store.getState().sidebarOpen).toBe(false);

    act(() => {
      store.getState().setSidebarOpen(true);
    });
    expect(store.getState().sidebarOpen).toBe(true);
  });

  it('should clamp sidebar width within bounds', async () => {
    const { useUIStore } = await import('../uiStore');
    const store = useUIStore;
    act(() => {
      store.getState().resetUI();
    });

    act(() => {
      store.getState().setSidebarWidth(100); // Below min
    });
    expect(store.getState().sidebarWidth).toBe(200); // Min value

    act(() => {
      store.getState().setSidebarWidth(600); // Above max
    });
    expect(store.getState().sidebarWidth).toBe(500); // Max value

    act(() => {
      store.getState().setSidebarWidth(350); // Valid value
    });
    expect(store.getState().sidebarWidth).toBe(350);
  });

  it('should toggle preview panel', async () => {
    const { useUIStore } = await import('../uiStore');
    const store = useUIStore;
    act(() => {
      store.getState().resetUI();
    });

    act(() => {
      store.getState().togglePreview();
    });
    expect(store.getState().previewPanelOpen).toBe(true);

    act(() => {
      store.getState().togglePreview();
    });
    expect(store.getState().previewPanelOpen).toBe(false);
  });

  it('should clamp preview panel width', async () => {
    const { useUIStore } = await import('../uiStore');
    const store = useUIStore;
    act(() => {
      store.getState().resetUI();
    });

    act(() => {
      store.getState().setPreviewPanelWidth(100); // Below min
    });
    expect(store.getState().previewPanelWidth).toBe(300); // Min value

    act(() => {
      store.getState().setPreviewPanelWidth(1000); // Above max
    });
    expect(store.getState().previewPanelWidth).toBe(800); // Max value
  });

  it('should manage modals correctly', async () => {
    const { useUIStore } = await import('../uiStore');
    const store = useUIStore;
    act(() => {
      store.getState().resetUI();
    });

    // Open modal
    act(() => {
      store.getState().openModal({ id: 'modal-1', title: 'Test Modal' });
    });
    expect(store.getState().modals).toHaveLength(1);
    expect(store.getState().modals[0].id).toBe('modal-1');

    // Open another modal
    act(() => {
      store.getState().openModal({ id: 'modal-2', title: 'Second Modal', size: 'lg' });
    });
    expect(store.getState().modals).toHaveLength(2);

    // Close specific modal
    act(() => {
      store.getState().closeModal('modal-1');
    });
    expect(store.getState().modals).toHaveLength(1);
    expect(store.getState().modals[0].id).toBe('modal-2');

    // Close all modals
    act(() => {
      store.getState().openModal({ id: 'modal-3', title: 'Third' });
    });
    act(() => {
      store.getState().closeAllModals();
    });
    expect(store.getState().modals).toHaveLength(0);
  });

  it('should add notifications with auto-dismiss', async () => {
    const { useUIStore } = await import('../uiStore');
    const store = useUIStore;
    act(() => {
      store.getState().resetUI();
    });

    let notificationId: string = '';
    act(() => {
      notificationId = store.getState().addNotification({
        type: 'success',
        title: 'Success!',
        message: 'Operation completed',
        duration: 3000,
      });
    });

    expect(store.getState().notifications).toHaveLength(1);
    expect(store.getState().notifications[0].id).toBe(notificationId);
    expect(store.getState().notifications[0].type).toBe('success');
    expect(store.getState().notifications[0].dismissible).toBe(true);

    // Advance time to trigger auto-dismiss
    act(() => {
      vi.advanceTimersByTime(3500);
    });

    expect(store.getState().notifications).toHaveLength(0);
  });

  it('should not auto-dismiss notifications with duration 0', async () => {
    const { useUIStore } = await import('../uiStore');
    const store = useUIStore;
    act(() => {
      store.getState().resetUI();
    });

    act(() => {
      store.getState().addNotification({
        type: 'warning',
        title: 'Persistent Warning',
        duration: 0,
      });
    });

    expect(store.getState().notifications).toHaveLength(1);

    // Advance time significantly
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    // Should still be there
    expect(store.getState().notifications).toHaveLength(1);
  });

  it('should remove notification manually', async () => {
    const { useUIStore } = await import('../uiStore');
    const store = useUIStore;
    act(() => {
      store.getState().resetUI();
    });

    let id: string = '';
    act(() => {
      id = store.getState().addNotification({
        type: 'info',
        title: 'Info',
        duration: 0, // No auto-dismiss
      });
    });

    expect(store.getState().notifications).toHaveLength(1);

    act(() => {
      store.getState().removeNotification(id);
    });

    expect(store.getState().notifications).toHaveLength(0);
  });

  it('should clear all notifications', async () => {
    const { useUIStore } = await import('../uiStore');
    const store = useUIStore;
    act(() => {
      store.getState().resetUI();
    });

    act(() => {
      store.getState().addNotification({ type: 'info', title: 'Info 1', duration: 0 });
      store.getState().addNotification({ type: 'success', title: 'Success 1', duration: 0 });
      store.getState().addNotification({ type: 'error', title: 'Error 1', duration: 0 });
    });

    expect(store.getState().notifications).toHaveLength(3);

    act(() => {
      store.getState().clearNotifications();
    });

    expect(store.getState().notifications).toHaveLength(0);
  });

  it('should manage input state', async () => {
    const { useUIStore } = await import('../uiStore');
    const store = useUIStore;
    act(() => {
      store.getState().resetUI();
    });

    act(() => {
      store.getState().setInputFocused(true);
    });
    expect(store.getState().inputFocused).toBe(true);

    act(() => {
      store.getState().setInputValue('Hello World');
    });
    expect(store.getState().inputValue).toBe('Hello World');

    act(() => {
      store.getState().clearInput();
    });
    expect(store.getState().inputValue).toBe('');
  });

  it('should handle mobile state correctly', async () => {
    const { useUIStore } = await import('../uiStore');
    const store = useUIStore;
    act(() => {
      store.getState().resetUI();
    });

    // Ensure sidebar is open first
    act(() => {
      store.getState().setSidebarOpen(true);
    });

    // Set mobile mode - should close sidebar
    act(() => {
      store.getState().setIsMobile(true);
    });
    expect(store.getState().isMobile).toBe(true);
    expect(store.getState().sidebarOpen).toBe(false); // Should close on mobile

    // Toggle mobile menu
    act(() => {
      store.getState().toggleMobileMenu();
    });
    expect(store.getState().mobileMenuOpen).toBe(true);

    act(() => {
      store.getState().setMobileMenuOpen(false);
    });
    expect(store.getState().mobileMenuOpen).toBe(false);
  });

  it('should set navigation state', async () => {
    const { useUIStore } = await import('../uiStore');
    const store = useUIStore;
    act(() => {
      store.getState().resetUI();
    });

    act(() => {
      store.getState().setActiveTab('settings');
    });
    expect(store.getState().activeTab).toBe('settings');

    act(() => {
      store.getState().setActiveRoute('/conversations');
    });
    expect(store.getState().activeRoute).toBe('/conversations');
  });

  it('should set page loading state', async () => {
    const { useUIStore } = await import('../uiStore');
    const store = useUIStore;
    act(() => {
      store.getState().resetUI();
    });

    act(() => {
      store.getState().setPageLoading(true, 'Loading data...');
    });
    expect(store.getState().isPageLoading).toBe(true);
    expect(store.getState().loadingMessage).toBe('Loading data...');

    act(() => {
      store.getState().setPageLoading(false);
    });
    expect(store.getState().isPageLoading).toBe(false);
    expect(store.getState().loadingMessage).toBeNull();
  });

  it('should reset UI to defaults', async () => {
    const { useUIStore } = await import('../uiStore');
    const store = useUIStore;
    act(() => {
      store.getState().resetUI();
    });

    // Make changes
    act(() => {
      store.getState().setSidebarOpen(false);
      store.getState().setPreviewPanelOpen(true);
      store.getState().setActiveTab('memory');
      store.getState().addNotification({ type: 'info', title: 'Test', duration: 0 });
      store.getState().openModal({ id: 'test', title: 'Test Modal' });
    });

    expect(store.getState().sidebarOpen).toBe(false);
    expect(store.getState().modals).toHaveLength(1);

    // Reset
    act(() => {
      store.getState().resetUI();
    });

    expect(store.getState().sidebarOpen).toBe(true);
    expect(store.getState().previewPanelOpen).toBe(false);
    expect(store.getState().activeTab).toBe('chat');
    expect(store.getState().modals).toHaveLength(0);
    expect(store.getState().notifications).toHaveLength(0);
  });

  it('should have correct selectors', async () => {
    const {
      useUIStore,
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
    } = await import('../uiStore');

    act(() => {
      useUIStore.getState().resetUI();
      useUIStore.getState().openModal({ id: 'selector-modal', title: 'Selector Test' });
      useUIStore.getState().addNotification({ type: 'info', title: 'Test', duration: 0 });
    });

    const state = useUIStore.getState();

    expect(selectSidebarOpen(state)).toBe(true);
    expect(selectSidebarWidth(state)).toBe(280);
    expect(selectPreviewPanelOpen(state)).toBe(false);
    expect(selectPreviewPanelWidth(state)).toBe(400);
    expect(selectActiveTab(state)).toBe('chat');
    expect(selectActiveRoute(state)).toBe('/');
    expect(selectModals(state)).toHaveLength(1);
    expect(selectNotifications(state)).toHaveLength(1);
    expect(selectInputFocused(state)).toBe(false);
    expect(selectInputValue(state)).toBe('');
    expect(selectIsMobile(state)).toBe(false);
    expect(selectMobileMenuOpen(state)).toBe(false);
    expect(selectIsPageLoading(state)).toBe(false);
    expect(selectLoadingMessage(state)).toBeNull();
    expect(selectHasModals(state)).toBe(true);
    expect(selectHasNotifications(state)).toBe(true);
    expect(selectTopModal(state)?.id).toBe('selector-modal');
    expect(selectLayoutDimensions(state)).toEqual({
      sidebarWidth: 280, // Sidebar is open
      previewPanelWidth: 0, // Preview is closed
    });
  });

  it('should calculate layout dimensions correctly when panels are open/closed', async () => {
    const { useUIStore, selectLayoutDimensions } = await import('../uiStore');
    const store = useUIStore;
    act(() => {
      store.getState().resetUI();
    });

    // Both closed
    act(() => {
      store.getState().setSidebarOpen(false);
      store.getState().setPreviewPanelOpen(false);
    });
    expect(selectLayoutDimensions(store.getState())).toEqual({
      sidebarWidth: 0,
      previewPanelWidth: 0,
    });

    // Both open
    act(() => {
      store.getState().setSidebarOpen(true);
      store.getState().setPreviewPanelOpen(true);
    });
    expect(selectLayoutDimensions(store.getState())).toEqual({
      sidebarWidth: 280,
      previewPanelWidth: 400,
    });
  });
});

// ============================================================================
// chatStore Tests
// ============================================================================

describe('chatStore', () => {
  beforeEach(async () => {
    localStorageMock.clear();
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default values', async () => {
    const { useChatStore } = await import('../chatStore');
    const state = useChatStore.getState();

    expect(state.conversations).toBeDefined();
    expect(state.activeConversationId).toBeDefined();
    expect(state.isStreaming).toBe(false);
    expect(state.streamingContent).toBe('');
  });

  it('should create a new conversation', async () => {
    const { useChatStore } = await import('../chatStore');
    const store = useChatStore;

    const initialCount = store.getState().conversations.length;

    let id: string = '';
    act(() => {
      id = store.getState().createConversation();
    });

    expect(id).toBeTruthy();
    expect(store.getState().conversations.length).toBe(initialCount + 1);
    expect(store.getState().activeConversationId).toBe(id);
  });

  it('should delete a conversation', async () => {
    const { useChatStore } = await import('../chatStore');
    const store = useChatStore;

    let id: string = '';
    act(() => {
      id = store.getState().createConversation();
    });

    const countAfterCreate = store.getState().conversations.length;

    act(() => {
      store.getState().deleteConversation(id);
    });

    expect(store.getState().conversations.length).toBe(countAfterCreate - 1);
    expect(store.getState().conversations.find((c) => c.id === id)).toBeUndefined();
  });

  it('should set active conversation', async () => {
    const { useChatStore } = await import('../chatStore');
    const store = useChatStore;

    let id1: string = '';
    let id2: string = '';
    act(() => {
      id1 = store.getState().createConversation();
      id2 = store.getState().createConversation();
    });

    act(() => {
      store.getState().setActiveConversation(id1);
    });

    expect(store.getState().activeConversationId).toBe(id1);
  });

  it('should rename a conversation', async () => {
    const { useChatStore } = await import('../chatStore');
    const store = useChatStore;

    let id: string = '';
    act(() => {
      id = store.getState().createConversation();
    });

    act(() => {
      store.getState().renameConversation(id, 'New Title');
    });

    const conversation = store.getState().conversations.find((c) => c.id === id);
    expect(conversation?.title).toBe('New Title');
  });

  it('should add messages to active conversation', async () => {
    const { useChatStore } = await import('../chatStore');
    const store = useChatStore;

    let id: string = '';
    act(() => {
      id = store.getState().createConversation();
    });

    act(() => {
      store.getState().addMessage({
        role: 'user',
        content: 'Hello!',
      });
    });

    const conversation = store.getState().conversations.find((c) => c.id === id);
    expect(conversation?.messages.length).toBe(1);
    expect(conversation?.messages[0].content).toBe('Hello!');
  });

  it('should update message content', async () => {
    const { useChatStore } = await import('../chatStore');
    const store = useChatStore;

    let convId: string = '';
    act(() => {
      convId = store.getState().createConversation();
    });

    act(() => {
      store.getState().addMessage({
        role: 'user',
        content: 'Original message',
      });
    });

    const conversation = store.getState().conversations.find((c) => c.id === convId);
    const msgId = conversation?.messages[0]?.id;

    if (msgId) {
      act(() => {
        store.getState().updateMessage(msgId, 'Updated message');
      });

      const updated = store.getState().conversations.find((c) => c.id === convId);
      expect(updated?.messages[0]?.content).toBe('Updated message');
    }
  });

  it('should clear messages in active conversation', async () => {
    const { useChatStore } = await import('../chatStore');
    const store = useChatStore;

    act(() => {
      store.getState().createConversation();
    });

    act(() => {
      store.getState().addMessage({ role: 'user', content: 'Test 1' });
      store.getState().addMessage({ role: 'assistant', content: 'Test 2' });
    });

    act(() => {
      store.getState().clearMessages();
    });

    const messages = store.getState().getMessages();
    expect(messages.length).toBe(0);
  });

  it('should handle streaming state', async () => {
    const { useChatStore } = await import('../chatStore');
    const store = useChatStore;

    act(() => {
      store.getState().setStreaming(true);
    });
    expect(store.getState().isStreaming).toBe(true);

    act(() => {
      store.getState().setStreamingContent('Hello ');
    });
    expect(store.getState().streamingContent).toBe('Hello ');

    act(() => {
      store.getState().setStreaming(false);
    });
    expect(store.getState().isStreaming).toBe(false);
  });

  it('should complete streaming and add assistant message', async () => {
    const { useChatStore } = await import('../chatStore');
    const store = useChatStore;

    let id: string = '';
    act(() => {
      id = store.getState().createConversation();
      store.getState().setStreaming(true);
      store.getState().setStreamingContent('Full response');
    });

    act(() => {
      store.getState().completeStreaming('Full response');
    });

    expect(store.getState().isStreaming).toBe(false);
    expect(store.getState().streamingContent).toBe('');

    const conversation = store.getState().conversations.find((c) => c.id === id);
    const lastMessage = conversation?.messages[conversation.messages.length - 1];
    expect(lastMessage?.role).toBe('assistant');
    expect(lastMessage?.content).toBe('Full response');
  });

  it('should toggle sidebar', async () => {
    const { useChatStore } = await import('../chatStore');
    const store = useChatStore;

    const initial = store.getState().sidebarOpen;

    act(() => {
      store.getState().toggleSidebar();
    });

    expect(store.getState().sidebarOpen).toBe(!initial);
  });

  it('should set sidebar open state', async () => {
    const { useChatStore } = await import('../chatStore');
    const store = useChatStore;

    act(() => {
      store.getState().setSidebarOpen(false);
    });
    expect(store.getState().sidebarOpen).toBe(false);

    act(() => {
      store.getState().setSidebarOpen(true);
    });
    expect(store.getState().sidebarOpen).toBe(true);
  });

  it('should toggle demo mode', async () => {
    const { useChatStore } = await import('../chatStore');
    const store = useChatStore;

    const initial = store.getState().demoMode;

    act(() => {
      store.getState().toggleDemoMode();
    });

    expect(store.getState().demoMode).toBe(!initial);
  });

  it('should get active conversation', async () => {
    const { useChatStore } = await import('../chatStore');
    const store = useChatStore;

    let id: string = '';
    act(() => {
      id = store.getState().createConversation();
    });

    const activeConv = store.getState().getActiveConversation();
    expect(activeConv?.id).toBe(id);
  });

  it('should get messages from active conversation', async () => {
    const { useChatStore } = await import('../chatStore');
    const store = useChatStore;

    act(() => {
      store.getState().createConversation();
      store.getState().addMessage({ role: 'user', content: 'Test message' });
    });

    const messages = store.getState().getMessages();
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0].content).toBe('Test message');
  });

  it('should auto-generate title from first user message', async () => {
    const { useChatStore } = await import('../chatStore');
    const store = useChatStore;

    let id: string = '';
    act(() => {
      id = store.getState().createConversation();
    });

    // First user message should set the title
    act(() => {
      store.getState().addMessage({ role: 'user', content: 'Hello, this is a test message' });
    });

    const conversation = store.getState().conversations.find((c) => c.id === id);
    expect(conversation?.title).toContain('Hello');
  });
});

// ============================================================================
// attachmentStore Tests
// ============================================================================

describe('attachmentStore', () => {
  beforeEach(async () => {
    localStorageMock.clear();
    vi.clearAllMocks();
    vi.resetModules();
    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default values', async () => {
    const { useAttachmentStore } = await import('../attachmentStore');
    const state = useAttachmentStore.getState();

    expect(state.pendingAttachments).toEqual([]);
    expect(state.isUploading).toBe(false);
    expect(state.demoMode).toBe(true);
  });

  it('should remove a file from pending', async () => {
    const { useAttachmentStore } = await import('../attachmentStore');
    const store = useAttachmentStore;

    // Manually add a pending attachment for testing
    act(() => {
      store.setState({
        pendingAttachments: [
          {
            id: 'test-file',
            file: new File(['test'], 'test.txt', { type: 'text/plain' }),
            filename: 'test.txt',
            size: 4,
            mimeType: 'text/plain',
            status: 'ready',
            progress: 100,
          },
        ],
      });
    });

    expect(store.getState().pendingAttachments.length).toBe(1);

    act(() => {
      store.getState().removeFile('test-file');
    });

    expect(store.getState().pendingAttachments.length).toBe(0);
  });

  it('should clear all pending attachments', async () => {
    const { useAttachmentStore } = await import('../attachmentStore');
    const store = useAttachmentStore;

    act(() => {
      store.setState({
        pendingAttachments: [
          {
            id: 'file-1',
            file: new File(['test'], 'test1.txt', { type: 'text/plain' }),
            filename: 'test1.txt',
            size: 4,
            mimeType: 'text/plain',
            status: 'ready',
            progress: 100,
          },
          {
            id: 'file-2',
            file: new File(['test'], 'test2.txt', { type: 'text/plain' }),
            filename: 'test2.txt',
            size: 4,
            mimeType: 'text/plain',
            status: 'ready',
            progress: 100,
          },
        ],
      });
    });

    act(() => {
      store.getState().clearPending();
    });

    expect(store.getState().pendingAttachments.length).toBe(0);
    expect(store.getState().isUploading).toBe(false);
  });

  it('should update progress', async () => {
    const { useAttachmentStore } = await import('../attachmentStore');
    const store = useAttachmentStore;

    act(() => {
      store.setState({
        pendingAttachments: [
          {
            id: 'progress-file',
            file: new File(['test'], 'test.txt', { type: 'text/plain' }),
            filename: 'test.txt',
            size: 4,
            mimeType: 'text/plain',
            status: 'uploading',
            progress: 0,
          },
        ],
      });
    });

    act(() => {
      store.getState().updateProgress('progress-file', 50);
    });

    expect(store.getState().pendingAttachments[0].progress).toBe(50);
  });

  it('should update status', async () => {
    const { useAttachmentStore } = await import('../attachmentStore');
    const store = useAttachmentStore;

    act(() => {
      store.setState({
        pendingAttachments: [
          {
            id: 'status-file',
            file: new File(['test'], 'test.txt', { type: 'text/plain' }),
            filename: 'test.txt',
            size: 4,
            mimeType: 'text/plain',
            status: 'uploading',
            progress: 50,
          },
        ],
      });
    });

    act(() => {
      store.getState().updateStatus('status-file', 'ready');
    });

    expect(store.getState().pendingAttachments[0].status).toBe('ready');
  });

  it('should update status with error', async () => {
    const { useAttachmentStore } = await import('../attachmentStore');
    const store = useAttachmentStore;

    act(() => {
      store.setState({
        pendingAttachments: [
          {
            id: 'error-file',
            file: new File(['test'], 'test.txt', { type: 'text/plain' }),
            filename: 'test.txt',
            size: 4,
            mimeType: 'text/plain',
            status: 'uploading',
            progress: 50,
          },
        ],
      });
    });

    act(() => {
      store.getState().updateStatus('error-file', 'failed', 'Upload failed');
    });

    expect(store.getState().pendingAttachments[0].status).toBe('failed');
    expect(store.getState().pendingAttachments[0].error).toBe('Upload failed');
  });

  it('should get pending attachments', async () => {
    const { useAttachmentStore } = await import('../attachmentStore');
    const store = useAttachmentStore;

    act(() => {
      store.setState({
        pendingAttachments: [
          {
            id: 'get-file',
            file: new File(['test'], 'test.txt', { type: 'text/plain' }),
            filename: 'test.txt',
            size: 4,
            mimeType: 'text/plain',
            status: 'ready',
            progress: 100,
          },
        ],
      });
    });

    const pending = store.getState().getPendingAttachments();
    expect(pending.length).toBe(1);
    expect(pending[0].id).toBe('get-file');
  });

  it('should get attachments for message without internal fields', async () => {
    const { useAttachmentStore } = await import('../attachmentStore');
    const store = useAttachmentStore;

    const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    act(() => {
      store.setState({
        pendingAttachments: [
          {
            id: 'msg-file',
            file: testFile,
            filename: 'test.txt',
            size: 4,
            mimeType: 'text/plain',
            status: 'ready',
            progress: 100,
            previewUrl: 'blob:test',
          },
        ],
      });
    });

    const attachments = store.getState().getAttachmentsForMessage();
    expect(attachments.length).toBe(1);
    expect(attachments[0].id).toBe('msg-file');
    expect((attachments[0] as unknown as Record<string, unknown>).file).toBeUndefined();
    expect((attachments[0] as unknown as Record<string, unknown>).previewUrl).toBeUndefined();
    expect((attachments[0] as unknown as Record<string, unknown>).progress).toBeUndefined();
  });

  it('should set demo mode', async () => {
    const { useAttachmentStore } = await import('../attachmentStore');
    const store = useAttachmentStore;

    act(() => {
      store.getState().setDemoMode(false);
    });

    expect(store.getState().demoMode).toBe(false);

    act(() => {
      store.getState().setDemoMode(true);
    });

    expect(store.getState().demoMode).toBe(true);
  });
});
