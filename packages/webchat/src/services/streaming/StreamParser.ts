import { SSEEvent, SSEEventType } from './SSEClient';

/**
 * Stream buffer for managing incoming tokens
 */
export interface StreamBuffer {
  /** Raw tokens */
  tokens: string[];
  /** Parsed content */
  content: string;
  /** Code blocks being parsed */
  codeBlocks: CodeBlock[];
  /** Current parsing state */
  state: ParseState;
}

export interface CodeBlock {
  language: string;
  code: string;
  isComplete: boolean;
}

export enum ParseState {
  TEXT = 'text',
  CODE_FENCE_START = 'code_fence_start',
  CODE_BLOCK = 'code_block',
  CODE_FENCE_END = 'code_fence_end',
}

/**
 * Stream parser for processing SSE tokens into structured content
 */
export class StreamParser {
  private buffer: StreamBuffer = {
    tokens: [],
    content: '',
    codeBlocks: [],
    state: ParseState.TEXT,
  };

  private currentCodeBlock: CodeBlock | null = null;
  private fenceBuffer = '';

  /**
   * Add a token to the buffer
   */
  addToken(token: string): void {
    this.buffer.tokens.push(token);
    this.buffer.content += token;
    this.parseToken(token);
  }

  /**
   * Parse a token and update state
   */
  private parseToken(token: string): void {
    for (const char of token) {
      switch (this.buffer.state) {
        case ParseState.TEXT:
          this.parseTextChar(char);
          break;
        case ParseState.CODE_FENCE_START:
          this.parseCodeFenceStartChar(char);
          break;
        case ParseState.CODE_BLOCK:
          this.parseCodeBlockChar(char);
          break;
        case ParseState.CODE_FENCE_END:
          this.parseCodeFenceEndChar(char);
          break;
      }
    }
  }

  private parseTextChar(char: string): void {
    if (char === '`') {
      this.fenceBuffer = '`';
      this.buffer.state = ParseState.CODE_FENCE_START;
    }
  }

  private parseCodeFenceStartChar(char: string): void {
    if (char === '`') {
      this.fenceBuffer += '`';
      if (this.fenceBuffer === '```') {
        this.currentCodeBlock = {
          language: '',
          code: '',
          isComplete: false,
        };
        this.fenceBuffer = '';
      }
    } else if (this.fenceBuffer === '```') {
      // Parsing language
      if (char === '\n') {
        this.buffer.state = ParseState.CODE_BLOCK;
      } else if (this.currentCodeBlock) {
        this.currentCodeBlock.language += char;
      }
    } else {
      // Not a code fence
      this.fenceBuffer = '';
      this.buffer.state = ParseState.TEXT;
    }
  }

  private parseCodeBlockChar(char: string): void {
    if (char === '`') {
      this.fenceBuffer = '`';
      this.buffer.state = ParseState.CODE_FENCE_END;
    } else if (this.currentCodeBlock) {
      this.currentCodeBlock.code += char;
    }
  }

  private parseCodeFenceEndChar(char: string): void {
    if (char === '`') {
      this.fenceBuffer += '`';
      if (this.fenceBuffer === '```') {
        // Code block complete
        if (this.currentCodeBlock) {
          this.currentCodeBlock.isComplete = true;
          this.buffer.codeBlocks.push(this.currentCodeBlock);
          this.currentCodeBlock = null;
        }
        this.fenceBuffer = '';
        this.buffer.state = ParseState.TEXT;
      }
    } else {
      // False alarm, add backticks to code
      if (this.currentCodeBlock) {
        this.currentCodeBlock.code += this.fenceBuffer + char;
      }
      this.fenceBuffer = '';
      this.buffer.state = ParseState.CODE_BLOCK;
    }
  }

  /**
   * Get current buffer state
   */
  getBuffer(): StreamBuffer {
    return { ...this.buffer };
  }

  /**
   * Get complete code blocks
   */
  getCodeBlocks(): CodeBlock[] {
    return this.buffer.codeBlocks.filter((b) => b.isComplete);
  }

  /**
   * Get current incomplete code block
   */
  getCurrentCodeBlock(): CodeBlock | null {
    return this.currentCodeBlock;
  }

  /**
   * Check if currently in a code block
   */
  isInCodeBlock(): boolean {
    return (
      this.buffer.state === ParseState.CODE_BLOCK ||
      this.buffer.state === ParseState.CODE_FENCE_START ||
      this.buffer.state === ParseState.CODE_FENCE_END
    );
  }

  /**
   * Get full content
   */
  getContent(): string {
    return this.buffer.content;
  }

  /**
   * Reset parser state
   */
  reset(): void {
    this.buffer = {
      tokens: [],
      content: '',
      codeBlocks: [],
      state: ParseState.TEXT,
    };
    this.currentCodeBlock = null;
    this.fenceBuffer = '';
  }
}

/**
 * Parse SSE events into a stream of updates
 */
export function parseSSEEvents(events: SSEEvent[]): {
  content: string;
  tools: Array<{ name: string; status: string }>;
  isComplete: boolean;
} {
  let content = '';
  const tools: Array<{ name: string; status: string }> = [];
  let isComplete = false;

  for (const event of events) {
    switch (event.type) {
      case SSEEventType.TOKEN:
        content += event.data.content || event.data.text || '';
        break;
      case SSEEventType.TOOL_CALL:
        tools.push({
          name: String(event.data.tool || event.data.name),
          status: 'executing',
        });
        break;
      case SSEEventType.TOOL_RESULT: {
        const toolIndex = tools.findIndex(
          (t) => t.name === event.data.tool || t.name === event.data.name
        );
        if (toolIndex !== -1) {
          tools[toolIndex]!.status = event.data.error ? 'failed' : 'completed';
        }
        break;
      }
      case SSEEventType.DONE:
        isComplete = true;
        break;
    }
  }

  return { content, tools, isComplete };
}

export default StreamParser;
