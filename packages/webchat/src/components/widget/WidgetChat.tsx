import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useStreaming } from '@/hooks/useStreaming';
import { useTypewriter } from '@/hooks/useTypewriter';
import { generateId } from '@/lib/utils';

export interface WidgetChatProps {
  /** API endpoint for streaming chat */
  apiEndpoint?: string;
  /** Custom headers for API requests */
  apiHeaders?: Record<string, string>;
  /** Custom class name */
  className?: string;
  /** Initial greeting message */
  greeting?: string;
  /** Placeholder text for input */
  placeholder?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

/**
 * Compact chat interface for the widget
 *
 * Features:
 * - Scrollable message list
 * - Compact input with send button
 * - Streaming support with typewriter effect
 * - Loading states
 * - Error handling
 *
 * @example
 * ```tsx
 * <WidgetChat
 *   apiEndpoint="/api/v1/chat/stream"
 *   greeting="Hi! How can I help you today?"
 * />
 * ```
 */
export const WidgetChat = memo(function WidgetChat({
  apiEndpoint = '/api/v1/chat/stream',
  apiHeaders = {},
  className,
  greeting,
  placeholder,
}: WidgetChatProps) {
  const { t } = useTranslation('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Streaming hook
  const {
    message: streamingMessage,
    isStreaming,
    error,
    sendMessage,
    stop,
  } = useStreaming({
    endpoint: apiEndpoint,
    headers: apiHeaders,
    onComplete: (msg) => {
      // Add completed message to history
      setMessages((prev) => [
        ...prev.filter((m) => !m.isStreaming),
        {
          id: msg.id,
          role: 'assistant',
          content: msg.content,
          timestamp: new Date(),
          isStreaming: false,
        },
      ]);
    },
  });

  // Add initial greeting if provided
  useEffect(() => {
    if (greeting && messages.length === 0) {
      setMessages([
        {
          id: generateId('greeting'),
          role: 'assistant',
          content: greeting,
          timestamp: new Date(),
        },
      ]);
    }
  }, [greeting, messages.length]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage?.content]);

  // Handle send message
  const handleSend = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || isStreaming) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: generateId('user'),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    // Send to API
    await sendMessage(content);
  }, [inputValue, isStreaming, sendMessage]);

  // Handle Enter key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    // Auto-resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, []);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
        <AnimatePresence mode="popLayout">
          {/* Existing messages */}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* Streaming message */}
          {isStreaming && streamingMessage && (
            <StreamingBubble
              key="streaming"
              content={streamingMessage.content}
              onSkip={stop}
            />
          )}

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-red-400 text-sm py-2"
            >
              {t('widget.error', 'Something went wrong. Please try again.')}
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 px-3 pb-3 pt-1">
        <div
          className={cn(
            'flex items-end gap-2',
            'bg-white/5 border border-white/10',
            'rounded-xl p-2',
            'focus-within:border-leo-secondary/50',
            'transition-colors duration-200'
          )}
        >
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || t('widget.placeholder', 'Type a message...')}
            disabled={isStreaming}
            rows={1}
            className={cn(
              'flex-1',
              'bg-transparent',
              'text-white text-sm',
              'placeholder:text-white/40',
              'resize-none',
              'outline-none',
              'min-h-[36px] max-h-[120px]',
              'py-2 px-2',
              'disabled:opacity-50'
            )}
            aria-label={t('widget.inputLabel', 'Message input')}
          />

          <motion.button
            type="button"
            onClick={handleSend}
            disabled={!inputValue.trim() || isStreaming}
            className={cn(
              'shrink-0',
              'w-9 h-9',
              'flex items-center justify-center',
              'rounded-lg',
              'bg-leo-secondary text-white',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'transition-opacity duration-150',
              'outline-none',
              'focus-visible:ring-2 focus-visible:ring-white'
            )}
            whileHover={{ scale: inputValue.trim() && !isStreaming ? 1.05 : 1 }}
            whileTap={{ scale: inputValue.trim() && !isStreaming ? 0.95 : 1 }}
            aria-label={t('widget.send', 'Send message')}
          >
            {isStreaming ? (
              <LoadingSpinner className="w-4 h-4" />
            ) : (
              <SendIcon className="w-4 h-4" />
            )}
          </motion.button>
        </div>

        {/* Powered by LEO */}
        <p className="text-center text-white/30 text-[10px] mt-2">
          {t('widget.poweredBy', 'Powered by LEO')}
        </p>
      </div>
    </div>
  );
});

/** Individual message bubble */
const MessageBubble = memo(function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[85%] px-3 py-2 rounded-2xl',
          isUser
            ? 'bg-leo-secondary text-white rounded-br-md'
            : 'bg-white/10 text-white rounded-bl-md'
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>
      </div>
    </motion.div>
  );
});

/** Streaming message with typewriter effect */
const StreamingBubble = memo(function StreamingBubble({
  content,
  onSkip,
}: {
  content: string;
  onSkip: () => void;
}) {
  const { t } = useTranslation('chat');
  const { displayedText, isTyping, addTokens, skip } = useTypewriter({
    speed: 25,
    chunkSize: 2,
  });

  // Add new content as tokens
  useEffect(() => {
    if (content) {
      const newContent = content.slice(displayedText.length);
      if (newContent) {
        addTokens(newContent);
      }
    }
  }, [content, displayedText.length, addTokens]);

  const handleSkip = useCallback(() => {
    skip();
    onSkip();
  }, [skip, onSkip]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="flex justify-start group"
    >
      <div className="max-w-[85%] px-3 py-2 rounded-2xl bg-white/10 text-white rounded-bl-md relative">
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {displayedText}
          {/* Blinking cursor */}
          {isTyping && (
            <span className="inline-block w-0.5 h-4 ml-0.5 bg-leo-accent animate-pulse" />
          )}
        </p>

        {/* Skip button */}
        {isTyping && (
          <button
            type="button"
            onClick={handleSkip}
            className={cn(
              'absolute -bottom-6 right-0',
              'px-2 py-0.5 text-[10px]',
              'text-white/50 hover:text-white/80',
              'bg-white/5 hover:bg-white/10',
              'rounded transition-colors',
              'opacity-0 group-hover:opacity-100'
            )}
            aria-label={t('widget.skip', 'Skip animation')}
          >
            {t('widget.skip', 'Skip')}
          </button>
        )}
      </div>
    </motion.div>
  );
});

/** Send arrow icon */
function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

/** Loading spinner */
function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeDasharray="32"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default WidgetChat;
