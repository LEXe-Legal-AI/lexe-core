/**
 * Chat Components Tests
 *
 * Comprehensive tests for ChatMessage, TypingIndicator, TypewriterMessage,
 * MarkdownRenderer, and FileUpload components.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { ChatMessage } from '../ChatMessage';
import { TypingIndicator } from '../TypingIndicator';
import { TypewriterMessage } from '../TypewriterMessage';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { FileUploadTrigger, DropZoneOverlay } from '../FileUpload';

// Mock useTypewriter hook
vi.mock('@/hooks/useTypewriter', () => ({
  useTypewriter: vi.fn(() => ({
    displayedText: 'Test content',
    fullText: 'Test content',
    isTyping: false,
    addTokens: vi.fn(),
    skip: vi.fn(),
    reset: vi.fn(),
    complete: vi.fn(),
  })),
}));

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

// Initialize i18n for tests
const initI18n = () => {
  if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
      lng: 'en',
      fallbackLng: 'en',
      ns: ['chat', 'common'],
      defaultNS: 'chat',
      resources: {
        en: {
          chat: {
            'messages.assistant_typing': 'LEO is typing...',
            'messages.assistant_thinking': 'LEO is thinking...',
            'upload.failed': 'Upload failed',
            'upload.drop_here': 'Drop files here',
            'upload.supported_formats': 'Images, documents, and code files',
          },
          common: {
            remove: 'Remove',
          },
        },
      },
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
  }
  return i18n;
};

// Test wrapper with i18n provider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nextProvider i18n={initI18n()}>{children}</I18nextProvider>
);

// ============================================================
// ChatMessage Tests
// ============================================================

describe('ChatMessage', () => {
  const defaultProps = {
    id: 'msg-1',
    role: 'user' as const,
    content: 'Hello, LEO!',
  };

  describe('rendering', () => {
    it('renders user message correctly', () => {
      render(
        <TestWrapper>
          <ChatMessage {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Hello, LEO!')).toBeInTheDocument();
    });

    it('renders assistant message correctly', () => {
      render(
        <TestWrapper>
          <ChatMessage {...defaultProps} role="assistant" content="How can I help you?" />
        </TestWrapper>
      );

      expect(screen.getByText('How can I help you?')).toBeInTheDocument();
    });

    it('displays user icon for user messages', () => {
      const { container } = render(
        <TestWrapper>
          <ChatMessage {...defaultProps} />
        </TestWrapper>
      );

      // User icon should be present (lucide-react renders SVG)
      const svgElements = container.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(0);
    });

    it('displays bot icon for assistant messages', () => {
      const { container } = render(
        <TestWrapper>
          <ChatMessage {...defaultProps} role="assistant" />
        </TestWrapper>
      );

      const svgElements = container.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(0);
    });
  });

  describe('timestamp', () => {
    it('displays formatted timestamp when provided', () => {
      const timestamp = new Date('2026-01-01T10:30:00');
      render(
        <TestWrapper>
          <ChatMessage {...defaultProps} timestamp={timestamp} />
        </TestWrapper>
      );

      // Time should be formatted (format depends on locale)
      expect(screen.getByText(/10:30/)).toBeInTheDocument();
    });

    it('does not display timestamp when not provided', () => {
      const { container } = render(
        <TestWrapper>
          <ChatMessage {...defaultProps} />
        </TestWrapper>
      );

      // Check no time-like pattern exists outside content
      const timeElements = container.querySelectorAll('[class*="text-xs"]');
      const hasTimestamp = Array.from(timeElements).some(el =>
        el.textContent?.match(/\d{1,2}:\d{2}/)
      );
      expect(hasTimestamp).toBe(false);
    });
  });

  describe('streaming', () => {
    it('shows typing indicator when streaming with no content', () => {
      render(
        <TestWrapper>
          <ChatMessage {...defaultProps} role="assistant" isStreaming={true} streamingContent="" />
        </TestWrapper>
      );

      // TypingIndicator renders dots
      const dots = document.querySelectorAll('[class*="rounded-full"]');
      expect(dots.length).toBeGreaterThan(0);
    });

    it('shows streaming content when available', () => {
      render(
        <TestWrapper>
          <ChatMessage {...defaultProps} role="assistant" isStreaming={true} streamingContent="Streaming..." />
        </TestWrapper>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument(); // From mocked hook
    });
  });

  describe('error state', () => {
    it('displays error message with error styling', () => {
      render(
        <TestWrapper>
          <ChatMessage {...defaultProps} error={true} content="An error occurred" />
        </TestWrapper>
      );

      expect(screen.getByText('An error occurred')).toBeInTheDocument();
    });

    it('shows retry button when onRetry is provided', () => {
      const onRetry = vi.fn();
      render(
        <TestWrapper>
          <ChatMessage {...defaultProps} error={true} content="Error" onRetry={onRetry} />
        </TestWrapper>
      );

      const retryButton = screen.getByTitle('Retry');
      expect(retryButton).toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', async () => {
      const onRetry = vi.fn();
      render(
        <TestWrapper>
          <ChatMessage {...defaultProps} error={true} content="Error" onRetry={onRetry} />
        </TestWrapper>
      );

      await userEvent.click(screen.getByTitle('Retry'));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('copy functionality', () => {
    it('shows copy button on hover', async () => {
      render(
        <TestWrapper>
          <ChatMessage {...defaultProps} />
        </TestWrapper>
      );

      const copyButton = screen.getByTitle('Copy message');
      expect(copyButton).toBeInTheDocument();
    });

    it('copies content to clipboard when copy button is clicked', async () => {
      render(
        <TestWrapper>
          <ChatMessage {...defaultProps} />
        </TestWrapper>
      );

      await userEvent.click(screen.getByTitle('Copy message'));
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Hello, LEO!');
    });
  });
});

// ============================================================
// TypingIndicator Tests
// ============================================================

describe('TypingIndicator', () => {
  describe('rendering', () => {
    it('renders with default typing text', () => {
      render(
        <TestWrapper>
          <TypingIndicator />
        </TestWrapper>
      );

      expect(screen.getByText('LEO is typing...')).toBeInTheDocument();
    });

    it('renders with custom text', () => {
      render(
        <TestWrapper>
          <TypingIndicator text="Custom typing..." />
        </TestWrapper>
      );

      expect(screen.getByText('Custom typing...')).toBeInTheDocument();
    });

    it('renders thinking text when isThinking is true', () => {
      render(
        <TestWrapper>
          <TypingIndicator isThinking />
        </TestWrapper>
      );

      expect(screen.getByText('LEO is thinking...')).toBeInTheDocument();
    });
  });

  describe('animation', () => {
    it('renders three animated dots', () => {
      const { container } = render(
        <TestWrapper>
          <TypingIndicator />
        </TestWrapper>
      );

      const dots = container.querySelectorAll('.rounded-full');
      expect(dots.length).toBe(3);
    });

    it('renders spinner when isThinking is true', () => {
      const { container } = render(
        <TestWrapper>
          <TypingIndicator isThinking />
        </TestWrapper>
      );

      // Spinner has border-t-transparent class
      const spinner = container.querySelector('.border-t-transparent');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <TestWrapper>
          <TypingIndicator className="custom-class" />
        </TestWrapper>
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('applies custom dot color', () => {
      const { container } = render(
        <TestWrapper>
          <TypingIndicator dotColor="bg-red-500" />
        </TestWrapper>
      );

      const dots = container.querySelectorAll('.bg-red-500');
      expect(dots.length).toBe(3);
    });
  });
});

// ============================================================
// TypewriterMessage Tests
// ============================================================

describe('TypewriterMessage', () => {
  describe('rendering', () => {
    it('renders displayed text', () => {
      render(
        <TestWrapper>
          <TypewriterMessage content="Hello world" />
        </TestWrapper>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument(); // From mocked hook
    });

    it('applies custom className', () => {
      const { container } = render(
        <TestWrapper>
          <TypewriterMessage content="Hello" className="custom-class" />
        </TestWrapper>
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('streaming state', () => {
    it('shows cursor when streaming', () => {
      const { container } = render(
        <TestWrapper>
          <TypewriterMessage content="Streaming..." isStreaming={true} />
        </TestWrapper>
      );

      const cursor = container.querySelector('.streaming-cursor');
      expect(cursor).toBeInTheDocument();
    });

    it('shows skip button when streaming and showSkipButton is true', () => {
      render(
        <TestWrapper>
          <TypewriterMessage content="Streaming..." isStreaming={true} showSkipButton={true} />
        </TestWrapper>
      );

      expect(screen.getByText('Skip')).toBeInTheDocument();
    });

    it('hides skip button when showSkipButton is false', () => {
      render(
        <TestWrapper>
          <TypewriterMessage content="Streaming..." isStreaming={true} showSkipButton={false} />
        </TestWrapper>
      );

      expect(screen.queryByText('Skip')).not.toBeInTheDocument();
    });
  });

  describe('skip functionality', () => {
    it('calls onSkip when skip button is clicked', async () => {
      const onSkip = vi.fn();
      render(
        <TestWrapper>
          <TypewriterMessage content="Test" isStreaming={true} onSkip={onSkip} />
        </TestWrapper>
      );

      await userEvent.click(screen.getByText('Skip'));
      expect(onSkip).toHaveBeenCalledTimes(1);
    });
  });
});

// ============================================================
// MarkdownRenderer Tests
// ============================================================

describe('MarkdownRenderer', () => {
  // Reset clipboard mock before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic text', () => {
    it('renders plain text as paragraph', () => {
      render(<MarkdownRenderer content="Hello world" />);
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('renders multiple lines as separate paragraphs', () => {
      // Content with actual line breaks
      const content = 'Line 1\nLine 2';
      const { container } = render(<MarkdownRenderer content={content} />);
      const paragraphs = container.querySelectorAll('p');
      expect(paragraphs.length).toBe(2);
    });
  });

  describe('headers', () => {
    it('renders h1 headers', () => {
      const { container } = render(<MarkdownRenderer content="# Header 1" />);
      const header = container.querySelector('h2'); // h1 -> h2 in component
      expect(header).toHaveTextContent('Header 1');
    });

    it('renders h2 headers', () => {
      const { container } = render(<MarkdownRenderer content="## Header 2" />);
      const header = container.querySelector('h3');
      expect(header).toHaveTextContent('Header 2');
    });

    it('renders h3 headers', () => {
      const { container } = render(<MarkdownRenderer content="### Header 3" />);
      const header = container.querySelector('h4');
      expect(header).toHaveTextContent('Header 3');
    });
  });

  describe('inline formatting', () => {
    it('renders bold text', () => {
      const { container } = render(<MarkdownRenderer content="**bold text**" />);
      const strong = container.querySelector('strong');
      expect(strong).toHaveTextContent('bold text');
    });

    it('renders italic text', () => {
      const { container } = render(<MarkdownRenderer content="*italic text*" />);
      const em = container.querySelector('em');
      expect(em).toHaveTextContent('italic text');
    });

    it('renders inline code', () => {
      const { container } = render(<MarkdownRenderer content="Use `code` here" />);
      const code = container.querySelector('code');
      expect(code).toHaveTextContent('code');
    });

    it('renders links', () => {
      render(<MarkdownRenderer content="[Click here](https://example.com)" />);
      const link = screen.getByRole('link', { name: 'Click here' });
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveAttribute('target', '_blank');
    });
  });

  describe('lists', () => {
    it('renders unordered lists', () => {
      // Use actual newlines for list parsing
      const content = '- Item 1\n- Item 2\n- Item 3';
      const { container } = render(<MarkdownRenderer content={content} />);
      const list = container.querySelector('ul');
      expect(list).toBeInTheDocument();
      const items = container.querySelectorAll('li');
      expect(items.length).toBe(3);
    });

    it('renders ordered lists', () => {
      const content = '1. First\n2. Second\n3. Third';
      const { container } = render(<MarkdownRenderer content={content} />);
      const list = container.querySelector('ol');
      expect(list).toBeInTheDocument();
      const items = container.querySelectorAll('li');
      expect(items.length).toBe(3);
    });
  });

  describe('code blocks', () => {
    it('renders code blocks with language label', () => {
      const content = '```javascript\nconst x = 1;\n```';
      const { container } = render(<MarkdownRenderer content={content} />);
      // Language shown in header span
      const langSpan = container.querySelector('.text-white\\/50.font-mono');
      expect(langSpan).toHaveTextContent('javascript');
      // Code content in code element
      const codeEl = container.querySelector('code');
      expect(codeEl).toHaveTextContent('const x = 1;');
    });

    it('renders code blocks without language with default label', () => {
      const content = '```\nplain code\n```';
      const { container } = render(<MarkdownRenderer content={content} />);
      // Default "code" label
      const langSpan = container.querySelector('.text-white\\/50.font-mono');
      expect(langSpan).toHaveTextContent('code');
      const codeEl = container.querySelector('code');
      expect(codeEl).toHaveTextContent('plain code');
    });

    it('shows copy button on code blocks', () => {
      const content = '```\ncode\n```';
      render(<MarkdownRenderer content={content} />);
      expect(screen.getByText('Copy')).toBeInTheDocument();
    });

    it('copies code when copy button is clicked', async () => {
      const content = '```\ntest code\n```';
      render(<MarkdownRenderer content={content} />);
      await userEvent.click(screen.getByText('Copy'));
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test code');
    });
  });

  describe('styling', () => {
    it('applies custom className', () => {
      const { container } = render(
        <MarkdownRenderer content="Test" className="custom-markdown" />
      );
      expect(container.firstChild).toHaveClass('custom-markdown');
    });
  });
});

// ============================================================
// FileUpload Tests
// ============================================================

describe('FileUploadTrigger', () => {
  describe('rendering', () => {
    it('renders children', () => {
      render(
        <FileUploadTrigger onFilesSelected={vi.fn()}>
          <button>Upload</button>
        </FileUploadTrigger>
      );

      expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument();
    });

    it('renders hidden file input', () => {
      const { container } = render(
        <FileUploadTrigger onFilesSelected={vi.fn()}>
          <button>Upload</button>
        </FileUploadTrigger>
      );

      const input = container.querySelector('input[type="file"]');
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass('hidden');
    });
  });

  describe('interaction', () => {
    it('opens file dialog when clicked', async () => {
      const { container } = render(
        <FileUploadTrigger onFilesSelected={vi.fn()}>
          <button>Upload</button>
        </FileUploadTrigger>
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = vi.spyOn(input, 'click');

      await userEvent.click(screen.getByRole('button', { name: 'Upload' }));
      expect(clickSpy).toHaveBeenCalled();
    });

    it('calls onFilesSelected when files are selected', async () => {
      const onFilesSelected = vi.fn();
      const { container } = render(
        <FileUploadTrigger onFilesSelected={onFilesSelected}>
          <button>Upload</button>
        </FileUploadTrigger>
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });

      // Simulate file selection
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(input);
      expect(onFilesSelected).toHaveBeenCalled();
    });

    it('is disabled when disabled prop is true', () => {
      const { container } = render(
        <FileUploadTrigger onFilesSelected={vi.fn()} disabled>
          <button>Upload</button>
        </FileUploadTrigger>
      );

      const input = container.querySelector('input[type="file"]');
      expect(input).toBeDisabled();
    });
  });
});

describe('DropZoneOverlay', () => {
  describe('rendering', () => {
    it('does not render when isOver is false', () => {
      render(
        <TestWrapper>
          <DropZoneOverlay isOver={false} />
        </TestWrapper>
      );

      expect(screen.queryByText('Drop files here')).not.toBeInTheDocument();
    });

    it('renders overlay when isOver is true', () => {
      render(
        <TestWrapper>
          <DropZoneOverlay isOver={true} />
        </TestWrapper>
      );

      expect(screen.getByText('Drop files here')).toBeInTheDocument();
      expect(screen.getByText('Images, documents, and code files')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('has correct visual styling when visible', () => {
      const { container } = render(
        <TestWrapper>
          <DropZoneOverlay isOver={true} />
        </TestWrapper>
      );

      const overlay = container.querySelector('.border-dashed');
      expect(overlay).toBeInTheDocument();
    });
  });
});
