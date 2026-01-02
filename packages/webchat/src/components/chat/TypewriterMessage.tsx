import { memo, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTypewriter } from '@/hooks/useTypewriter';
import { cn } from '@/lib/utils';

export interface TypewriterMessageProps {
  /** Full content to display (for completed messages) */
  content?: string;
  /** Whether message is currently streaming */
  isStreaming?: boolean;
  /** Callback when skip is clicked */
  onSkip?: () => void;
  /** Custom class name */
  className?: string;
  /** Speed in ms between chunks */
  speed?: number;
  /** Characters per chunk */
  chunkSize?: number;
  /** Show skip button */
  showSkipButton?: boolean;
}

/**
 * Message component with typewriter effect for streaming responses
 *
 * @example
 * ```tsx
 * // Streaming message
 * <TypewriterMessage
 *   isStreaming={true}
 *   onSkip={handleSkip}
 * />
 *
 * // Completed message
 * <TypewriterMessage
 *   content="Hello, how can I help?"
 *   isStreaming={false}
 * />
 * ```
 */
export const TypewriterMessage = memo(function TypewriterMessage({
  content = '',
  isStreaming = false,
  onSkip,
  className,
  speed = 30,
  chunkSize = 3,
  showSkipButton = true,
}: TypewriterMessageProps) {
  const { displayedText, isTyping, addTokens, skip, reset } = useTypewriter({
    speed,
    chunkSize,
    initialText: isStreaming ? '' : content,
  });

  // When content updates and we're streaming, add the new tokens
  useEffect(() => {
    if (isStreaming && content) {
      // Calculate new tokens (diff from what we've displayed)
      const newContent = content.slice(displayedText.length);
      if (newContent) {
        addTokens(newContent);
      }
    }
  }, [content, isStreaming, displayedText.length, addTokens]);

  // When streaming ends, make sure we show all content
  useEffect(() => {
    if (!isStreaming && content && displayedText !== content) {
      skip();
    }
  }, [isStreaming, content, displayedText, skip]);

  // Reset when content is cleared
  useEffect(() => {
    if (!content && displayedText) {
      reset();
    }
  }, [content, displayedText, reset]);

  const handleSkip = () => {
    skip();
    onSkip?.();
  };

  // Parse content for code blocks and markdown
  const renderedContent = useMemo(() => {
    return displayedText;
  }, [displayedText]);

  return (
    <div className={cn('relative', className)}>
      {/* Message content */}
      <div className="whitespace-pre-wrap break-words font-body text-base leading-relaxed">
        {renderedContent}

        {/* Blinking cursor */}
        {(isTyping || isStreaming) && (
          <span
            className="streaming-cursor"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Skip button */}
      {showSkipButton && (isTyping || isStreaming) && (
        <motion.button
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          onClick={handleSkip}
          className={cn(
            'absolute -bottom-8 right-0',
            'px-2 py-1 text-xs',
            'text-muted-foreground hover:text-foreground',
            'bg-muted/50 hover:bg-muted',
            'rounded-md transition-colors',
            'flex items-center gap-1'
          )}
        >
          <SkipIcon className="w-3 h-3" />
          Skip
        </motion.button>
      )}
    </div>
  );
});

function SkipIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="5 4 15 12 5 20 5 4" />
      <line x1="19" y1="5" x2="19" y2="19" />
    </svg>
  );
}

export default TypewriterMessage;
