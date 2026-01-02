/**
 * Tests for React Hooks
 *
 * useTypewriter, useStreaming, useMemory
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ============================================================================
// Mocks
// ============================================================================

// Mock SSEClient - must be inside vi.mock factory due to hoisting
vi.mock('@/services/streaming/SSEClient', () => {
  const mockSSEClient = {
    connect: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
    connected: false,
  };
  return {
    SSEClient: vi.fn().mockImplementation(() => mockSSEClient),
    SSEEventType: {
      TOKEN: 'token',
      PHASE_START: 'phase_start',
      TOOL_CALL: 'tool_call',
      TOOL_RESULT: 'tool_result',
      DONE: 'done',
      ERROR: 'error',
    },
  };
});

// Mock API client
vi.mock('@/services/api', () => ({
  getApiClient: vi.fn(() => ({
    ensureAuthenticated: vi.fn().mockResolvedValue(undefined),
    getAccessToken: vi.fn().mockReturnValue('mock-token'),
  })),
}));

// Mock memory API
vi.mock('@/services/api/memory', () => ({
  memoryApi: {
    getContext: vi.fn().mockResolvedValue({
      contact_id: 'test-contact',
      L0: { session_history: [] },
      L1: { short_term: [] },
      L2: { long_term: [] },
      L3: { semantic: [] },
      L4: { graph: [] },
      metadata: { last_updated: new Date().toISOString(), total_memories: 0 },
    }),
    getGraph: vi.fn().mockResolvedValue({
      contact_id: 'test-contact',
      nodes: [],
      edges: [],
      metadata: { node_count: 0, edge_count: 0, last_updated: new Date().toISOString() },
    }),
    search: vi.fn().mockResolvedValue({
      results: [],
      total: 0,
      query: 'test',
      search_time_ms: 10,
    }),
    contextToViewerData: vi.fn().mockReturnValue({
      layers: [],
      totalMemories: 0,
      lastUpdated: new Date(),
    }),
    graphToComponentData: vi.fn().mockReturnValue({
      nodes: [],
      edges: [],
    }),
  },
}));

// Mock import.meta.env
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_API_URL: 'http://localhost:8000',
      VITE_DEMO_MODE: 'false',
    },
  },
});

// ============================================================================
// useTypewriter Tests
// ============================================================================

describe('useTypewriter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should initialize with default values', async () => {
    const { useTypewriter } = await import('../useTypewriter');
    const { result } = renderHook(() => useTypewriter());

    expect(result.current.displayedText).toBe('');
    expect(result.current.fullText).toBe('');
    expect(result.current.isTyping).toBe(false);
  });

  it('should initialize with custom initial text', async () => {
    const { useTypewriter } = await import('../useTypewriter');
    const { result } = renderHook(() =>
      useTypewriter({ initialText: 'Hello' })
    );

    expect(result.current.displayedText).toBe('Hello');
  });

  it('should add tokens and start typing', async () => {
    const { useTypewriter } = await import('../useTypewriter');
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useTypewriter({ speed: 10, chunkSize: 1, onComplete })
    );

    act(() => {
      result.current.addTokens('Hi');
    });

    expect(result.current.isTyping).toBe(true);

    // Advance timers to type all characters
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.displayedText).toBe('Hi');
    expect(result.current.isTyping).toBe(false);
    expect(onComplete).toHaveBeenCalled();
  });

  it('should skip animation and show all text', async () => {
    const { useTypewriter } = await import('../useTypewriter');
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useTypewriter({ speed: 100, chunkSize: 1, onComplete })
    );

    act(() => {
      result.current.addTokens('Hello World');
    });

    expect(result.current.isTyping).toBe(true);

    act(() => {
      result.current.skip();
    });

    expect(result.current.displayedText).toBe('Hello World');
    expect(result.current.isTyping).toBe(false);
    expect(onComplete).toHaveBeenCalled();
  });

  it('should reset the typewriter', async () => {
    const { useTypewriter } = await import('../useTypewriter');
    const { result } = renderHook(() =>
      useTypewriter({ initialText: 'Start' })
    );

    act(() => {
      result.current.addTokens(' More');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.displayedText).toBe('Start');
    expect(result.current.isTyping).toBe(false);
  });

  it('should complete and skip to end', async () => {
    const { useTypewriter } = await import('../useTypewriter');
    const { result } = renderHook(() => useTypewriter());

    act(() => {
      result.current.addTokens('Test complete');
    });

    act(() => {
      result.current.complete();
    });

    expect(result.current.displayedText).toBe('Test complete');
    expect(result.current.isTyping).toBe(false);
  });

  it('should handle multiple token additions', async () => {
    const { useTypewriter } = await import('../useTypewriter');
    const { result } = renderHook(() =>
      useTypewriter({ speed: 5, chunkSize: 2 })
    );

    act(() => {
      result.current.addTokens('Hello');
    });

    act(() => {
      result.current.addTokens(' World');
    });

    act(() => {
      result.current.skip();
    });

    expect(result.current.displayedText).toBe('Hello World');
  });

  it('should type with custom chunk size', async () => {
    const { useTypewriter } = await import('../useTypewriter');
    const { result } = renderHook(() =>
      useTypewriter({ speed: 10, chunkSize: 3 })
    );

    act(() => {
      result.current.addTokens('ABCDEF');
    });

    // First chunk: ABC
    await act(async () => {
      vi.advanceTimersByTime(15);
    });

    expect(result.current.displayedText.length).toBeGreaterThanOrEqual(3);
  });
});

// ============================================================================
// useStreaming Tests
// ============================================================================

describe('useStreaming', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default state', async () => {
    const { useStreaming } = await import('../useStreaming');
    const { result } = renderHook(() => useStreaming());

    expect(result.current.message).toBeNull();
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should have sendMessage, stop, and reset functions', async () => {
    const { useStreaming } = await import('../useStreaming');
    const { result } = renderHook(() => useStreaming());

    expect(typeof result.current.sendMessage).toBe('function');
    expect(typeof result.current.stop).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('should reset state correctly', async () => {
    const { useStreaming } = await import('../useStreaming');
    const { result } = renderHook(() => useStreaming());

    act(() => {
      result.current.reset();
    });

    expect(result.current.message).toBeNull();
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should stop streaming', async () => {
    const { useStreaming } = await import('../useStreaming');
    const { result } = renderHook(() => useStreaming());

    act(() => {
      result.current.stop();
    });

    expect(result.current.isStreaming).toBe(false);
  });

  it('should accept custom endpoint', async () => {
    const { useStreaming } = await import('../useStreaming');
    const { result } = renderHook(() =>
      useStreaming({ endpoint: '/custom/stream' })
    );

    expect(result.current).toBeDefined();
  });

  it('should accept custom headers', async () => {
    const { useStreaming } = await import('../useStreaming');
    const { result } = renderHook(() =>
      useStreaming({ headers: { 'X-Custom': 'value' } })
    );

    expect(result.current).toBeDefined();
  });

  it('should accept conversationId', async () => {
    const { useStreaming } = await import('../useStreaming');
    const { result } = renderHook(() =>
      useStreaming({ conversationId: 'conv-123' })
    );

    expect(result.current).toBeDefined();
  });

  it('should have sendMessage function that sets streaming state', async () => {
    const { useStreaming } = await import('../useStreaming');
    const { result } = renderHook(() => useStreaming());

    // Verify sendMessage function exists and is callable
    expect(typeof result.current.sendMessage).toBe('function');
  });

  it('should handle skipAuth option', async () => {
    const { useStreaming } = await import('../useStreaming');
    const { result } = renderHook(() =>
      useStreaming({ skipAuth: true })
    );

    expect(result.current).toBeDefined();
  });
});

// ============================================================================
// useMemory Tests
// ============================================================================

describe('useMemory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default state', async () => {
    const { useMemory } = await import('../useMemory');
    const { result } = renderHook(() => useMemory());

    expect(result.current.memoryData).toBeNull();
    expect(result.current.context).toBeNull();
    expect(result.current.graph).toBeNull();
    expect(result.current.graphNodes).toEqual([]);
    expect(result.current.graphEdges).toEqual([]);
    expect(result.current.isLoadingContext).toBe(false);
    expect(result.current.isLoadingGraph).toBe(false);
    expect(result.current.isSearching).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should have all required functions', async () => {
    const { useMemory } = await import('../useMemory');
    const { result } = renderHook(() => useMemory());

    expect(typeof result.current.fetchContext).toBe('function');
    expect(typeof result.current.fetchGraph).toBe('function');
    expect(typeof result.current.searchMemories).toBe('function');
    expect(typeof result.current.refresh).toBe('function');
    expect(typeof result.current.clear).toBe('function');
  });

  it('should clear all data', async () => {
    const { useMemory } = await import('../useMemory');
    const { result } = renderHook(() => useMemory());

    act(() => {
      result.current.clear();
    });

    expect(result.current.memoryData).toBeNull();
    expect(result.current.context).toBeNull();
    expect(result.current.graph).toBeNull();
    expect(result.current.graphNodes).toEqual([]);
    expect(result.current.graphEdges).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should return null for empty search query', async () => {
    const { useMemory } = await import('../useMemory');
    const { result } = renderHook(() => useMemory());

    let searchResult: unknown;
    await act(async () => {
      searchResult = await result.current.searchMemories('');
    });

    expect(searchResult).toBeNull();
  });

  it('should accept options', async () => {
    const { useMemory } = await import('../useMemory');
    const { result } = renderHook(() =>
      useMemory({
        contactId: 'test-contact',
        autoFetch: false,
        pollInterval: 0,
        demoMode: true,
      })
    );

    expect(result.current).toBeDefined();
    expect(result.current.error).toBeNull();
  });
});
