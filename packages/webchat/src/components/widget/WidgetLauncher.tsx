import { memo, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export interface WidgetLauncherProps {
  /** Whether the widget window is currently open */
  isOpen: boolean;
  /** Callback when launcher is clicked */
  onClick: () => void;
  /** Number of unread messages */
  unreadCount?: number;
  /** Custom position (defaults to bottom-right) */
  position?: 'bottom-right' | 'bottom-left';
  /** Custom z-index */
  zIndex?: number;
  /** Offset from edge in pixels */
  offset?: number;
  /** Custom class name */
  className?: string;
  /** Disable launcher */
  disabled?: boolean;
}

/**
 * Floating Action Button (FAB) that launches the widget window
 *
 * Features:
 * - Animated chat icon with pulse effect
 * - Unread message badge
 * - Transforms to close icon when widget is open
 * - Glassmorphism styling
 * - Accessible focus states
 *
 * @example
 * ```tsx
 * <WidgetLauncher
 *   isOpen={isWidgetOpen}
 *   onClick={() => setWidgetOpen(!isWidgetOpen)}
 *   unreadCount={3}
 * />
 * ```
 */
export const WidgetLauncher = memo(
  forwardRef<HTMLButtonElement, WidgetLauncherProps>(function WidgetLauncher(
    {
      isOpen,
      onClick,
      unreadCount = 0,
      position = 'bottom-right',
      zIndex = 9999,
      offset = 24,
      className,
      disabled = false,
    },
    ref
  ) {
    const { t } = useTranslation('chat');

    const positionStyles = {
      'bottom-right': { right: offset, bottom: offset },
      'bottom-left': { left: offset, bottom: offset },
    };

    return (
      <motion.button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          // Position
          'fixed',
          // Size
          'w-14 h-14 sm:w-16 sm:h-16',
          // Shape & appearance
          'rounded-full',
          'shadow-lg shadow-leo-primary/25',
          // Glassmorphism
          'bg-gradient-to-br from-leo-primary to-leo-primary/90',
          'backdrop-blur-sm',
          'border border-white/20',
          // Flex centering
          'flex items-center justify-center',
          // Interaction
          'cursor-pointer select-none',
          'outline-none',
          'focus-visible:ring-2 focus-visible:ring-leo-secondary focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          // Transition
          'transition-shadow duration-200',
          'hover:shadow-xl hover:shadow-leo-primary/30',
          className
        )}
        style={{
          ...positionStyles[position],
          zIndex,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          rotate: isOpen ? 0 : 0,
        }}
        exit={{ scale: 0, opacity: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        aria-label={isOpen ? t('widget.close', 'Close chat') : t('widget.open', 'Open chat')}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {/* Pulse ring animation (only when closed and has unread) */}
        <AnimatePresence>
          {!isOpen && unreadCount > 0 && (
            <motion.span
              className="absolute inset-0 rounded-full bg-leo-secondary/40"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{
                scale: [1, 1.4, 1.4],
                opacity: [0.6, 0, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeOut',
              }}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>

        {/* Icon container with rotation animation */}
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
            >
              <CloseIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </motion.span>
          ) : (
            <motion.span
              key="chat"
              initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
            >
              <ChatIcon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </motion.span>
          )}
        </AnimatePresence>

        {/* Unread badge */}
        <AnimatePresence>
          {!isOpen && unreadCount > 0 && (
            <motion.span
              className={cn(
                'absolute -top-1 -right-1',
                'min-w-[20px] h-5 px-1.5',
                'flex items-center justify-center',
                'bg-leo-secondary text-white',
                'text-xs font-semibold',
                'rounded-full',
                'shadow-md'
              )}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              aria-label={t('widget.unreadCount', { count: unreadCount })}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    );
  })
);

/** Chat bubble icon */
function ChatIcon({ className }: { className?: string }) {
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
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 10h.01" />
      <path d="M12 10h.01" />
      <path d="M16 10h.01" />
    </svg>
  );
}

/** Close X icon */
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default WidgetLauncher;
