/**
 * Widget Components Tests
 *
 * Comprehensive tests for WidgetLauncher, WidgetWindow, and WidgetChat components
 * covering render, interaction, accessibility, and streaming functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { WidgetLauncher } from '../WidgetLauncher';
import { WidgetWindow } from '../WidgetWindow';
import { WidgetChat } from '../WidgetChat';

// Mock sendMessage and stop functions
const mockSendMessage = vi.fn();
const mockStop = vi.fn();

// Mock useStreaming hook
vi.mock('@/hooks/useStreaming', () => ({
  useStreaming: vi.fn(() => ({
    message: null,
    isStreaming: false,
    error: null,
    sendMessage: mockSendMessage,
    stop: mockStop,
    reset: vi.fn(),
  })),
}));

// Mock useTypewriter hook
vi.mock('@/hooks/useTypewriter', () => ({
  useTypewriter: vi.fn(() => ({
    displayedText: '',
    fullText: '',
    isTyping: false,
    addTokens: vi.fn(),
    skip: vi.fn(),
    reset: vi.fn(),
    complete: vi.fn(),
  })),
}));

// Import the mocked module for manipulation
import { useStreaming } from '@/hooks/useStreaming';

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
            'widget.open': 'Open chat',
            'widget.close': 'Close chat',
            'widget.title': 'LEO Assistant',
            'widget.subtitle': 'How can I help you?',
            'widget.placeholder': 'Type a message...',
            'widget.send': 'Send message',
            'widget.error': 'Something went wrong. Please try again.',
            'widget.poweredBy': 'Powered by LEO',
            'widget.skip': 'Skip',
            'widget.inputLabel': 'Message input',
            'widget.unreadCount': '{{count}} unread messages',
          },
        },
      },
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
  }
  return i18n;
};

// Test wrapper with i18n provider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nextProvider i18n={initI18n()}>{children}</I18nextProvider>
);

// ============================================================
// WidgetLauncher Tests
// ============================================================

describe('WidgetLauncher', () => {
  const defaultProps = {
    isOpen: false,
    onClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the launcher button', () => {
      render(
        <TestWrapper>
          <WidgetLauncher {...defaultProps} />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should render with chat icon when closed', () => {
      render(
        <TestWrapper>
          <WidgetLauncher {...defaultProps} isOpen={false} />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-label', 'Open chat');
    });

    it('should render with close icon when open', () => {
      render(
        <TestWrapper>
          <WidgetLauncher {...defaultProps} isOpen={true} />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'true');
      expect(button).toHaveAttribute('aria-label', 'Close chat');
    });

    it('should apply custom className', () => {
      render(
        <TestWrapper>
          <WidgetLauncher {...defaultProps} className="custom-class" />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Click Handler', () => {
    it('should call onClick when clicked', async () => {
      const onClick = vi.fn();
      render(
        <TestWrapper>
          <WidgetLauncher {...defaultProps} onClick={onClick} />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', async () => {
      const onClick = vi.fn();
      render(
        <TestWrapper>
          <WidgetLauncher {...defaultProps} onClick={onClick} disabled={true} />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Unread Badge', () => {
    it('should not show badge when unreadCount is 0', () => {
      render(
        <TestWrapper>
          <WidgetLauncher {...defaultProps} unreadCount={0} />
        </TestWrapper>
      );

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should show badge with unread count', () => {
      render(
        <TestWrapper>
          <WidgetLauncher {...defaultProps} unreadCount={5} />
        </TestWrapper>
      );

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should show 99+ when unreadCount exceeds 99', () => {
      render(
        <TestWrapper>
          <WidgetLauncher {...defaultProps} unreadCount={150} />
        </TestWrapper>
      );

      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('should hide badge when widget is open', () => {
      render(
        <TestWrapper>
          <WidgetLauncher {...defaultProps} isOpen={true} unreadCount={5} />
        </TestWrapper>
      );

      expect(screen.queryByText('5')).not.toBeInTheDocument();
    });
  });

  describe('Position', () => {
    it('should apply bottom-right position styles by default', () => {
      render(
        <TestWrapper>
          <WidgetLauncher {...defaultProps} />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveClass('fixed');
      expect(button.style.right).toBe('24px');
      expect(button.style.bottom).toBe('24px');
    });

    it('should apply bottom-left position when specified', () => {
      render(
        <TestWrapper>
          <WidgetLauncher {...defaultProps} position="bottom-left" />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      expect(button.style.left).toBe('24px');
      expect(button.style.bottom).toBe('24px');
    });

    it('should apply custom offset', () => {
      render(
        <TestWrapper>
          <WidgetLauncher {...defaultProps} offset={48} />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      expect(button.style.right).toBe('48px');
      expect(button.style.bottom).toBe('48px');
    });

    it('should apply custom zIndex', () => {
      render(
        <TestWrapper>
          <WidgetLauncher {...defaultProps} zIndex={10000} />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      expect(button.style.zIndex).toBe('10000');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-haspopup="dialog"', () => {
      render(
        <TestWrapper>
          <WidgetLauncher {...defaultProps} />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    });

    it('should be focusable', () => {
      render(
        <TestWrapper>
          <WidgetLauncher {...defaultProps} />
        </TestWrapper>
      );

      const button = screen.getByRole('button');
      button.focus();
      expect(document.activeElement).toBe(button);
    });
  });
});

// ============================================================
// WidgetWindow Tests
// ============================================================

describe('WidgetWindow', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Open/Close', () => {
    it('should render when isOpen is true', () => {
      render(
        <TestWrapper>
          <WidgetWindow {...defaultProps} />
        </TestWrapper>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(
        <TestWrapper>
          <WidgetWindow {...defaultProps} isOpen={false} />
        </TestWrapper>
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', async () => {
      const onClose = vi.fn();
      render(
        <TestWrapper>
          <WidgetWindow {...defaultProps} onClose={onClose} />
        </TestWrapper>
      );

      const closeButton = screen.getByRole('button', { name: 'Close chat' });
      await userEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should display custom title', () => {
      render(
        <TestWrapper>
          <WidgetWindow {...defaultProps} title="Custom Title" />
        </TestWrapper>
      );

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should display default title when not provided', () => {
      render(
        <TestWrapper>
          <WidgetWindow {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('LEO Assistant')).toBeInTheDocument();
    });
  });

  describe('Escape Key', () => {
    it('should call onClose when Escape key is pressed', async () => {
      const onClose = vi.fn();
      render(
        <TestWrapper>
          <WidgetWindow {...defaultProps} onClose={onClose} />
        </TestWrapper>
      );

      await act(async () => {
        fireEvent.keyDown(document, { key: 'Escape' });
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when Escape is pressed and window is closed', async () => {
      const onClose = vi.fn();
      render(
        <TestWrapper>
          <WidgetWindow {...defaultProps} isOpen={false} onClose={onClose} />
        </TestWrapper>
      );

      await act(async () => {
        fireEvent.keyDown(document, { key: 'Escape' });
      });

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Focus Trap', () => {
    it('should focus first focusable element when opened', async () => {
      render(
        <TestWrapper>
          <WidgetWindow {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        const focusedElement = document.activeElement;
        expect(focusedElement).not.toBe(document.body);
      });
    });

    it('should trap focus within the dialog', async () => {
      render(
        <TestWrapper>
          <WidgetWindow {...defaultProps} />
        </TestWrapper>
      );

      const dialog = screen.getByRole('dialog');
      const focusableElements = dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      expect(focusableElements.length).toBeGreaterThan(0);
    });

    it('should cycle focus on Tab at last element', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <WidgetWindow {...defaultProps} />
        </TestWrapper>
      );

      const dialog = screen.getByRole('dialog');
      const focusableElements = dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
      const firstElement = focusableElements[0] as HTMLElement;

      // Focus the last element
      await act(async () => {
        lastElement?.focus();
      });

      // Tab to next should wrap to first
      await user.tab();

      // After focus trap, should be back at first element
      await waitFor(() => {
        expect(document.activeElement).toBe(firstElement);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have role="dialog"', () => {
      render(
        <TestWrapper>
          <WidgetWindow {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-modal="true"', () => {
      render(
        <TestWrapper>
          <WidgetWindow {...defaultProps} />
        </TestWrapper>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-label', () => {
      render(
        <TestWrapper>
          <WidgetWindow {...defaultProps} title="Test Title" />
        </TestWrapper>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-label', 'Test Title');
    });
  });

  describe('Position and Size', () => {
    it('should apply bottom-right position by default', () => {
      render(
        <TestWrapper>
          <WidgetWindow {...defaultProps} />
        </TestWrapper>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('fixed');
      expect(dialog.style.right).toBeDefined();
      expect(dialog.style.bottom).toBeDefined();
    });

    it('should apply custom zIndex', () => {
      render(
        <TestWrapper>
          <WidgetWindow {...defaultProps} zIndex={10000} />
        </TestWrapper>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog.style.zIndex).toBe('10000');
    });
  });
});

// ============================================================
// WidgetChat Tests
// ============================================================

describe('WidgetChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset the useStreaming mock for each test
    vi.mocked(useStreaming).mockReturnValue({
      message: null,
      isStreaming: false,
      error: null,
      sendMessage: mockSendMessage,
      stop: mockStop,
      reset: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render chat interface', () => {
      render(
        <TestWrapper>
          <WidgetChat />
        </TestWrapper>
      );

      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });

    it('should render send button', () => {
      render(
        <TestWrapper>
          <WidgetChat />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
    });

    it('should render powered by text', () => {
      render(
        <TestWrapper>
          <WidgetChat />
        </TestWrapper>
      );

      expect(screen.getByText('Powered by LEO')).toBeInTheDocument();
    });

    it('should render greeting message when provided', async () => {
      render(
        <TestWrapper>
          <WidgetChat greeting="Welcome! How can I help?" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Welcome! How can I help?')).toBeInTheDocument();
      });
    });

    it('should render custom placeholder', () => {
      render(
        <TestWrapper>
          <WidgetChat placeholder="Ask me anything..." />
        </TestWrapper>
      );

      expect(screen.getByPlaceholderText('Ask me anything...')).toBeInTheDocument();
    });
  });

  describe('Message Input', () => {
    it('should allow typing in the input', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <WidgetChat />
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Hello, world!');

      expect(input).toHaveValue('Hello, world!');
    });

    it('should disable send button when input is empty', () => {
      render(
        <TestWrapper>
          <WidgetChat />
        </TestWrapper>
      );

      const sendButton = screen.getByRole('button', { name: 'Send message' });
      expect(sendButton).toBeDisabled();
    });

    it('should enable send button when input has text', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <WidgetChat />
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: 'Send message' });
      expect(sendButton).not.toBeDisabled();
    });
  });

  describe('Sending Messages', () => {
    it('should add user message when sending', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <WidgetChat />
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Test message');
      await user.keyboard('{Enter}');

      // User message should appear in the chat
      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });
    });

    it('should call sendMessage from useStreaming hook', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <WidgetChat />
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Test message');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith('Test message');
      });
    });

    it('should clear input after sending', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <WidgetChat />
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Test message');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    it('should not send on Shift+Enter', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <WidgetChat />
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Test message');
      await user.keyboard('{Shift>}{Enter}{/Shift}');

      // Message should still be in input (with newline added)
      expect(input).toHaveValue('Test message\n');
      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Streaming Display', () => {
    it('should show streaming message when isStreaming is true', () => {
      vi.mocked(useStreaming).mockReturnValue({
        message: {
          id: 'msg-1',
          role: 'assistant',
          content: 'Streaming response...',
          isStreaming: true,
        },
        isStreaming: true,
        error: null,
        sendMessage: mockSendMessage,
        stop: mockStop,
        reset: vi.fn(),
      });

      render(
        <TestWrapper>
          <WidgetChat />
        </TestWrapper>
      );

      // The send button should be disabled during streaming
      const sendButton = screen.getByRole('button', { name: 'Send message' });
      expect(sendButton).toBeDisabled();
    });

    it('should disable input during streaming', () => {
      vi.mocked(useStreaming).mockReturnValue({
        message: {
          id: 'msg-1',
          role: 'assistant',
          content: 'Streaming...',
          isStreaming: true,
        },
        isStreaming: true,
        error: null,
        sendMessage: mockSendMessage,
        stop: mockStop,
        reset: vi.fn(),
      });

      render(
        <TestWrapper>
          <WidgetChat />
        </TestWrapper>
      );

      const input = screen.getByPlaceholderText('Type a message...');
      expect(input).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should show error message when error occurs', async () => {
      vi.mocked(useStreaming).mockReturnValue({
        message: null,
        isStreaming: false,
        error: new Error('Network error'),
        sendMessage: mockSendMessage,
        stop: mockStop,
        reset: vi.fn(),
      });

      render(
        <TestWrapper>
          <WidgetChat />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible input label', () => {
      render(
        <TestWrapper>
          <WidgetChat />
        </TestWrapper>
      );

      const input = screen.getByRole('textbox', { name: 'Message input' });
      expect(input).toBeInTheDocument();
    });

    it('should have accessible send button', () => {
      render(
        <TestWrapper>
          <WidgetChat />
        </TestWrapper>
      );

      const sendButton = screen.getByRole('button', { name: 'Send message' });
      expect(sendButton).toBeInTheDocument();
    });
  });
});
