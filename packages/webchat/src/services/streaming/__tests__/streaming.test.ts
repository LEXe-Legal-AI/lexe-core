/**
 * Tests for Streaming Services
 *
 * SSEClient and StreamParser
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SSEClient,
  SSEClientOptions,
  SSEEvent,
  SSEEventType,
} from '../SSEClient';
import {
  StreamParser,
  ParseState,
  parseSSEEvents,
} from '../StreamParser';

// ============================================================================
// SSEEventType Tests
// ============================================================================

describe('SSEEventType', () => {
  it('should have all required event types', () => {
    expect(SSEEventType.PHASE_START).toBe('phase_start');
    expect(SSEEventType.TOKEN).toBe('token');
    expect(SSEEventType.TOOL_CALL).toBe('tool_call');
    expect(SSEEventType.TOOL_RESULT).toBe('tool_result');
    expect(SSEEventType.DONE).toBe('done');
    expect(SSEEventType.ERROR).toBe('error');
  });
});

// ============================================================================
// SSEClient Tests
// ============================================================================

describe('SSEClient', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create client with default options', () => {
    const client = new SSEClient('http://localhost/stream');
    expect(client).toBeDefined();
    expect(client.connected).toBe(false);
  });

  it('should create client with custom options', () => {
    const options: SSEClientOptions = {
      method: 'POST',
      headers: { 'X-Custom': 'header' },
      body: JSON.stringify({ message: 'test' }),
      reconnect: true,
      reconnectDelay: 2000,
      maxReconnectAttempts: 5,
    };

    const client = new SSEClient('http://localhost/stream', options);
    expect(client).toBeDefined();
  });

  it('should close connection', () => {
    const onClose = vi.fn();
    const client = new SSEClient('http://localhost/stream', { onClose });

    client.close();

    expect(client.connected).toBe(false);
    expect(onClose).toHaveBeenCalled();
  });

  it('should be defined', () => {
    const client = new SSEClient('http://localhost/stream');
    expect(client).toBeDefined();
    expect(client.connected).toBe(false);
  });

  it('should handle successful stream', async () => {
    const onEvent = vi.fn();
    const onOpen = vi.fn();
    const onClose = vi.fn();

    // Create a mock readable stream
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"content": "Hello"}\n\n'),
        })
        .mockResolvedValueOnce({
          done: true,
        }),
    };

    mockFetch.mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    });

    const client = new SSEClient('http://localhost/stream', {
      method: 'POST',
      onEvent,
      onOpen,
      onClose,
    });

    await client.connect();

    expect(onOpen).toHaveBeenCalled();
    expect(onEvent).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('should parse event type from data', async () => {
    const onEvent = vi.fn();

    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('event: token\ndata: {"content": "Hi"}\n\n'),
        })
        .mockResolvedValueOnce({
          done: true,
        }),
    };

    mockFetch.mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    });

    const client = new SSEClient('http://localhost/stream', {
      method: 'POST',
      onEvent,
    });

    await client.connect();

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SSEEventType.TOKEN,
      })
    );
  });

  it('should auto-close on done event', async () => {
    const onEvent = vi.fn();
    const onClose = vi.fn();

    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('event: done\ndata: {"complete": true}\n\n'),
        })
        .mockResolvedValueOnce({
          done: true,
        }),
    };

    mockFetch.mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    });

    const client = new SSEClient('http://localhost/stream', {
      method: 'POST',
      onEvent,
      onClose,
    });

    await client.connect();

    expect(client.connected).toBe(false);
  });

  it('should handle non-JSON data as plain token', async () => {
    const onEvent = vi.fn();

    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: plain text content\n\n'),
        })
        .mockResolvedValueOnce({
          done: true,
        }),
    };

    mockFetch.mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    });

    const client = new SSEClient('http://localhost/stream', {
      method: 'POST',
      onEvent,
    });

    await client.connect();

    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: SSEEventType.TOKEN,
        data: { content: 'plain text content' },
      })
    );
  });

  it('should handle reconnect on error', async () => {
    const onError = vi.fn();
    const error = new Error('Connection failed');

    mockFetch
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true }),
          }),
        },
      });

    const client = new SSEClient('http://localhost/stream', {
      method: 'POST',
      reconnect: true,
      reconnectDelay: 10,
      maxReconnectAttempts: 1,
      onError,
    });

    await client.connect();

    // Wait for reconnect
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(onError).toHaveBeenCalledWith(error);
  });
});

// ============================================================================
// ParseState Tests
// ============================================================================

describe('ParseState', () => {
  it('should have all required states', () => {
    expect(ParseState.TEXT).toBe('text');
    expect(ParseState.CODE_FENCE_START).toBe('code_fence_start');
    expect(ParseState.CODE_BLOCK).toBe('code_block');
    expect(ParseState.CODE_FENCE_END).toBe('code_fence_end');
  });
});

// ============================================================================
// StreamParser Tests
// ============================================================================

describe('StreamParser', () => {
  let parser: StreamParser;

  beforeEach(() => {
    parser = new StreamParser();
  });

  it('should initialize with empty state', () => {
    const buffer = parser.getBuffer();
    expect(buffer.tokens).toEqual([]);
    expect(buffer.content).toBe('');
    expect(buffer.codeBlocks).toEqual([]);
    expect(buffer.state).toBe(ParseState.TEXT);
  });

  it('should add tokens to buffer', () => {
    parser.addToken('Hello');
    parser.addToken(' World');

    expect(parser.getContent()).toBe('Hello World');
    expect(parser.getBuffer().tokens).toEqual(['Hello', ' World']);
  });

  it('should detect code fence start', () => {
    parser.addToken('```');

    expect(parser.isInCodeBlock()).toBe(true);
  });

  it('should detect code fence start', () => {
    parser.addToken('```');
    expect(parser.isInCodeBlock()).toBe(true);
  });

  it('should return empty code blocks array initially', () => {
    expect(parser.getCodeBlocks()).toEqual([]);
  });

  it('should accumulate content in buffer', () => {
    parser.addToken('Hello');
    parser.addToken(' World');
    expect(parser.getBuffer().content).toBe('Hello World');
  });

  it('should handle backticks in text (not fence)', () => {
    parser.addToken('Use `inline` code');

    expect(parser.isInCodeBlock()).toBe(false);
    expect(parser.getContent()).toBe('Use `inline` code');
  });

  it('should reset parser state', () => {
    parser.addToken('Some content ```js\ncode\n```');
    parser.reset();

    expect(parser.getContent()).toBe('');
    expect(parser.getCodeBlocks()).toEqual([]);
    expect(parser.isInCodeBlock()).toBe(false);
    expect(parser.getCurrentCodeBlock()).toBeNull();
  });

  it('should return null for current code block when not in code', () => {
    parser.addToken('plain text');
    expect(parser.getCurrentCodeBlock()).toBeNull();
  });

  it('should create code block object on fence', () => {
    parser.addToken('```');
    // After ``` we should have a current code block being built
    expect(parser.isInCodeBlock()).toBe(true);
  });

  it('should get buffer copy', () => {
    parser.addToken('test');
    const buffer = parser.getBuffer();

    // Modify returned buffer
    buffer.content = 'modified';

    // Original should be unchanged
    expect(parser.getContent()).toBe('test');
  });
});

// ============================================================================
// parseSSEEvents Tests
// ============================================================================

describe('parseSSEEvents', () => {
  it('should parse empty events array', () => {
    const result = parseSSEEvents([]);

    expect(result.content).toBe('');
    expect(result.tools).toEqual([]);
    expect(result.isComplete).toBe(false);
  });

  it('should parse token events', () => {
    const events: SSEEvent[] = [
      { type: SSEEventType.TOKEN, data: { content: 'Hello' } },
      { type: SSEEventType.TOKEN, data: { content: ' World' } },
    ];

    const result = parseSSEEvents(events);

    expect(result.content).toBe('Hello World');
  });

  it('should parse token events with text field', () => {
    const events: SSEEvent[] = [
      { type: SSEEventType.TOKEN, data: { text: 'Hello' } },
    ];

    const result = parseSSEEvents(events);

    expect(result.content).toBe('Hello');
  });

  it('should parse tool call events', () => {
    const events: SSEEvent[] = [
      { type: SSEEventType.TOOL_CALL, data: { tool: 'search', input: 'query' } },
      { type: SSEEventType.TOOL_CALL, data: { name: 'browser' } },
    ];

    const result = parseSSEEvents(events);

    expect(result.tools).toHaveLength(2);
    expect(result.tools[0]).toEqual({ name: 'search', status: 'executing' });
    expect(result.tools[1]).toEqual({ name: 'browser', status: 'executing' });
  });

  it('should parse tool result events', () => {
    const events: SSEEvent[] = [
      { type: SSEEventType.TOOL_CALL, data: { tool: 'search' } },
      { type: SSEEventType.TOOL_RESULT, data: { tool: 'search', result: 'found' } },
    ];

    const result = parseSSEEvents(events);

    expect(result.tools[0]?.status).toBe('completed');
  });

  it('should handle tool result error', () => {
    const events: SSEEvent[] = [
      { type: SSEEventType.TOOL_CALL, data: { tool: 'failing_tool' } },
      { type: SSEEventType.TOOL_RESULT, data: { tool: 'failing_tool', error: 'Failed' } },
    ];

    const result = parseSSEEvents(events);

    expect(result.tools[0]?.status).toBe('failed');
  });

  it('should detect done event', () => {
    const events: SSEEvent[] = [
      { type: SSEEventType.TOKEN, data: { content: 'Done!' } },
      { type: SSEEventType.DONE, data: {} },
    ];

    const result = parseSSEEvents(events);

    expect(result.isComplete).toBe(true);
  });

  it('should handle mixed event types', () => {
    const events: SSEEvent[] = [
      { type: SSEEventType.PHASE_START, data: { phase: 1 } },
      { type: SSEEventType.TOKEN, data: { content: 'Hello' } },
      { type: SSEEventType.TOOL_CALL, data: { tool: 'search' } },
      { type: SSEEventType.TOKEN, data: { content: ' World' } },
      { type: SSEEventType.TOOL_RESULT, data: { tool: 'search', result: 'ok' } },
      { type: SSEEventType.DONE, data: {} },
    ];

    const result = parseSSEEvents(events);

    expect(result.content).toBe('Hello World');
    expect(result.tools).toHaveLength(1);
    expect(result.tools[0]?.status).toBe('completed');
    expect(result.isComplete).toBe(true);
  });

  it('should handle tool result for non-existent tool', () => {
    const events: SSEEvent[] = [
      { type: SSEEventType.TOOL_RESULT, data: { tool: 'unknown', result: 'data' } },
    ];

    const result = parseSSEEvents(events);

    expect(result.tools).toEqual([]);
  });
});
