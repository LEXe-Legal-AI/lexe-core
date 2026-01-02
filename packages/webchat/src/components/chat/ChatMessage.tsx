import { memo, useMemo, forwardRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, User, Copy, Check, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TypewriterMessage } from './TypewriterMessage';
import { TypingIndicator } from './TypingIndicator';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useStreamStore, selectCurrentPhase } from '@/stores';

export interface ChatMessageProps {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  streamingContent?: string;
  timestamp?: Date | string;
  error?: boolean;
  onRetry?: () => void;
  onSkipStreaming?: () => void;
}

/**
 * Premium chat message bubble with avatar
 *
 * Features:
 * - Distinct styling for user/assistant
 * - Avatar with gradient background
 * - Glassmorphism for assistant messages
 * - Copy button on hover
 * - Streaming/typing indicator support
 * - Markdown rendering with syntax highlighting
 */
export const ChatMessage = memo(forwardRef<HTMLDivElement, ChatMessageProps>(function ChatMessage({
  id,
  role,
  content,
  isStreaming = false,
  streamingContent = '',
  timestamp,
  error = false,
  onRetry,
  onSkipStreaming,
}, ref) {
  const [copied, setCopied] = useState(false);
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';

  // Get current pipeline phase for typing indicator
  const currentPhase = useStreamStore(selectCurrentPhase);

  const formattedTime = useMemo(() => {
    if (!timestamp) return null;
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      if (isNaN(date.getTime())) return null;
      return new Intl.DateTimeFormat('default', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return null;
    }
  }, [timestamp]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content || streamingContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      ref={ref}
      key={id}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={cn(
        'group flex gap-3 px-4 py-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 500, damping: 25 }}
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
          'shadow-lg',
          isUser
            ? 'bg-gradient-to-br from-leo-secondary to-amber-500'
            : 'bg-gradient-to-br from-leo-accent to-emerald-400'
        )}
      >
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Bot className="w-5 h-5 text-white" />
        )}
      </motion.div>

      {/* Message Content */}
      <div
        className={cn(
          'relative max-w-[75%] min-w-[120px]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        {/* Message Bubble */}
        <div
          className={cn(
            'relative px-4 py-3 rounded-2xl',
            'transition-all duration-200',
            isUser
              ? [
                  'bg-gradient-to-br from-leo-primary to-leo-primary/90',
                  'text-white',
                  'rounded-tr-sm',
                  'shadow-lg shadow-leo-primary/20',
                ]
              : [
                  'bg-card/80 backdrop-blur-xl',
                  'border border-border',
                  'text-foreground',
                  'rounded-tl-sm',
                  'shadow-xl shadow-black/10',
                ],
            error && 'border-red-500/50 bg-red-500/10'
          )}
        >
          {/* Copy Button (hover) */}
          {!isStreaming && content && (
            <button
              onClick={handleCopy}
              className={cn(
                'absolute -top-2 -right-2 p-1.5 rounded-lg',
                'bg-muted backdrop-blur-sm border border-border',
                'opacity-0 group-hover:opacity-100',
                'transition-all duration-200',
                'hover:bg-muted/80',
                'z-10'
              )}
              title="Copy message"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-leo-accent" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>
          )}

          {/* Content */}
          {isStreaming ? (
            streamingContent ? (
              <TypewriterMessage
                content={streamingContent}
                isStreaming={true}
                onSkip={onSkipStreaming}
              />
            ) : (
              <TypingIndicator
                phase={currentPhase}
                isThinking={!currentPhase || currentPhase === 'classifying' || currentPhase === 'routing'}
              />
            )
          ) : error ? (
            <div className="flex items-center gap-2">
              <span className="text-red-400">{content}</span>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="p-1 hover:bg-muted rounded transition-colors"
                  title="Retry"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : isAssistant ? (
            <MarkdownRenderer content={content} />
          ) : (
            <p className="whitespace-pre-wrap break-words leading-relaxed">
              {content}
            </p>
          )}
        </div>

        {/* Timestamp */}
        {formattedTime && !isStreaming && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={cn(
              'block text-xs text-muted-foreground mt-1 px-1',
              isUser ? 'text-right' : 'text-left'
            )}
          >
            {formattedTime}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}));

export default ChatMessage;
