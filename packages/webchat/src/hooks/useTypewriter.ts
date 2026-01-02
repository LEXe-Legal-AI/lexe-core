import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseTypewriterOptions {
  /** Delay between chunks in ms (default: 30) */
  speed?: number;
  /** Characters per chunk (default: 3) */
  chunkSize?: number;
  /** Initial text (default: '') */
  initialText?: string;
  /** Callback when typing completes */
  onComplete?: () => void;
}

export interface UseTypewriterReturn {
  /** Currently displayed text */
  displayedText: string;
  /** Full text including buffer */
  fullText: string;
  /** Whether typewriter is actively typing */
  isTyping: boolean;
  /** Add tokens to the buffer */
  addTokens: (tokens: string) => void;
  /** Skip animation and show all text */
  skip: () => void;
  /** Reset the typewriter */
  reset: () => void;
  /** Complete the current animation */
  complete: () => void;
}

/**
 * Hook for typewriter effect with token-by-token streaming
 *
 * @example
 * ```tsx
 * const { displayedText, isTyping, addTokens, skip } = useTypewriter({
 *   speed: 30,
 *   chunkSize: 3,
 * });
 *
 * // Add tokens from SSE stream
 * eventSource.onmessage = (e) => {
 *   const { content } = JSON.parse(e.data);
 *   addTokens(content);
 * };
 *
 * return (
 *   <div>
 *     {displayedText}
 *     {isTyping && <span className="streaming-cursor" />}
 *     <button onClick={skip}>Skip</button>
 *   </div>
 * );
 * ```
 */
export function useTypewriter(options: UseTypewriterOptions = {}): UseTypewriterReturn {
  const {
    speed = 30,
    chunkSize = 3,
    initialText = '',
    onComplete,
  } = options;

  const [displayedText, setDisplayedText] = useState(initialText);
  const [isTyping, setIsTyping] = useState(false);

  const bufferRef = useRef<string[]>([]);
  const fullTextRef = useRef(initialText);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTypingRef = useRef(false);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startTyping = useCallback(() => {
    if (isTypingRef.current || bufferRef.current.length === 0) {
      return;
    }

    isTypingRef.current = true;
    setIsTyping(true);

    intervalRef.current = setInterval(() => {
      const chunk = bufferRef.current.splice(0, chunkSize).join('');

      if (chunk) {
        setDisplayedText((prev) => prev + chunk);
      }

      if (bufferRef.current.length === 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        isTypingRef.current = false;
        setIsTyping(false);
        onComplete?.();
      }
    }, speed);
  }, [speed, chunkSize, onComplete]);

  const addTokens = useCallback(
    (tokens: string) => {
      // Add characters to buffer
      bufferRef.current.push(...tokens.split(''));
      fullTextRef.current += tokens;

      // Start typing if not already
      if (!isTypingRef.current) {
        startTyping();
      }
    },
    [startTyping]
  );

  const skip = useCallback(() => {
    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Add remaining buffer to displayed text
    const remaining = bufferRef.current.join('');
    bufferRef.current = [];

    setDisplayedText((prev) => prev + remaining);
    isTypingRef.current = false;
    setIsTyping(false);
    onComplete?.();
  }, [onComplete]);

  const reset = useCallback(() => {
    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Reset state
    bufferRef.current = [];
    fullTextRef.current = initialText;
    isTypingRef.current = false;
    setDisplayedText(initialText);
    setIsTyping(false);
  }, [initialText]);

  const complete = useCallback(() => {
    skip();
  }, [skip]);

  return {
    displayedText,
    fullText: fullTextRef.current,
    isTyping,
    addTokens,
    skip,
    reset,
    complete,
  };
}

export default useTypewriter;
