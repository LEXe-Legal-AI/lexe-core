import { memo, forwardRef, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { WidgetChat } from './WidgetChat';

export interface WidgetWindowProps {
  /** Whether the window is open */
  isOpen: boolean;
  /** Callback to close the window */
  onClose: () => void;
  /** Custom position (defaults to bottom-right, aligned with launcher) */
  position?: 'bottom-right' | 'bottom-left';
  /** Offset from edge in pixels */
  offset?: number;
  /** Custom z-index */
  zIndex?: number;
  /** Window width (mobile-first, responsive) */
  width?: number;
  /** Window height (mobile-first, responsive) */
  height?: number;
  /** Enable resize handle */
  resizable?: boolean;
  /** Custom header title */
  title?: string;
  /** Custom logo URL */
  logoUrl?: string;
  /** Custom class name */
  className?: string;
  /** API endpoint for chat */
  apiEndpoint?: string;
  /** Custom headers for API requests */
  apiHeaders?: Record<string, string>;
}

/**
 * Widget window popup with chat interface
 *
 * Features:
 * - Slide-up animation from launcher position
 * - Glassmorphism design
 * - Focus trap for accessibility
 * - Responsive sizing
 * - Optional resize handle
 * - Escape key to close
 *
 * @example
 * ```tsx
 * <WidgetWindow
 *   isOpen={isOpen}
 *   onClose={() => setOpen(false)}
 *   title="LEO Assistant"
 * />
 * ```
 */
export const WidgetWindow = memo(
  forwardRef<HTMLDivElement, WidgetWindowProps>(function WidgetWindow(
    {
      isOpen,
      onClose,
      position = 'bottom-right',
      offset = 24,
      zIndex = 9998,
      width = 380,
      height = 560,
      resizable = false,
      title,
      logoUrl = '/leo-icon.svg',
      className,
      apiEndpoint,
      apiHeaders,
    },
    ref
  ) {
    const { t } = useTranslation('chat');
    const windowRef = useRef<HTMLDivElement>(null);
    const dragControls = useDragControls();

    // Focus trap - focus first focusable element when opened
    useEffect(() => {
      if (isOpen && windowRef.current) {
        const focusableElements = windowRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement | undefined;
        firstElement?.focus();
      }
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Handle focus trap
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key !== 'Tab' || !windowRef.current) return;

        const focusableElements = windowRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement | undefined;
        const lastElement = focusableElements[focusableElements.length - 1] as
          | HTMLElement
          | undefined;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      },
      []
    );

    const positionStyles = {
      'bottom-right': { right: offset, bottom: offset + 80 },
      'bottom-left': { left: offset, bottom: offset + 80 },
    };

    const slideOrigin = {
      'bottom-right': { x: 100, y: 50 },
      'bottom-left': { x: -100, y: 50 },
    };

    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={(el) => {
              (windowRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
              if (typeof ref === 'function') {
                ref(el);
              } else if (ref) {
                ref.current = el;
              }
            }}
            role="dialog"
            aria-modal="true"
            aria-label={title || t('widget.title', 'Chat with LEO')}
            className={cn(
              // Position
              'fixed',
              // Size constraints
              'max-w-[calc(100vw-48px)] max-h-[calc(100vh-120px)]',
              // Flex layout
              'flex flex-col',
              // Glassmorphism
              'bg-gradient-to-br from-leo-dark/95 to-leo-primary/95',
              'backdrop-blur-xl',
              'border border-white/10',
              'rounded-2xl',
              'shadow-2xl shadow-leo-dark/50',
              // Overflow
              'overflow-hidden',
              className
            )}
            style={{
              ...positionStyles[position],
              width: Math.min(width, typeof window !== 'undefined' ? window.innerWidth - 48 : width),
              height: Math.min(height, typeof window !== 'undefined' ? window.innerHeight - 120 : height),
              zIndex,
            }}
            initial={{
              opacity: 0,
              scale: 0.8,
              ...slideOrigin[position],
            }}
            animate={{
              opacity: 1,
              scale: 1,
              x: 0,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.8,
              ...slideOrigin[position],
            }}
            transition={{
              type: 'spring',
              stiffness: 350,
              damping: 30,
            }}
            onKeyDown={handleKeyDown}
          >
            {/* Header */}
            <header
              className={cn(
                'flex items-center justify-between',
                'px-4 py-3',
                'bg-gradient-to-r from-leo-primary to-leo-primary/80',
                'border-b border-white/10',
                'shrink-0'
              )}
            >
              {/* Logo and title */}
              <div className="flex items-center gap-3">
                {logoUrl && (
                  <motion.img
                    src={logoUrl}
                    alt="LEO"
                    className="w-8 h-8 rounded-lg object-contain"
                    initial={{ rotate: -10, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    onError={(e) => {
                      // Hide image on error
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <div>
                  <motion.h2
                    className="text-white font-semibold text-base leading-tight"
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.15 }}
                  >
                    {title || t('widget.title', 'LEO Assistant')}
                  </motion.h2>
                  <motion.p
                    className="text-white/60 text-xs"
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {t('widget.subtitle', 'How can I help you?')}
                  </motion.p>
                </div>
              </div>

              {/* Close button */}
              <motion.button
                type="button"
                onClick={onClose}
                className={cn(
                  'w-8 h-8',
                  'flex items-center justify-center',
                  'rounded-full',
                  'text-white/70 hover:text-white',
                  'bg-white/0 hover:bg-white/10',
                  'transition-colors duration-150',
                  'outline-none',
                  'focus-visible:ring-2 focus-visible:ring-leo-secondary'
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label={t('widget.close', 'Close chat')}
              >
                <CloseIcon className="w-4 h-4" />
              </motion.button>
            </header>

            {/* Chat body */}
            <div className="flex-1 overflow-hidden">
              <WidgetChat apiEndpoint={apiEndpoint} apiHeaders={apiHeaders} />
            </div>

            {/* Resize handle (optional) */}
            {resizable && (
              <div
                className={cn(
                  'absolute top-0 right-0 w-4 h-4',
                  'cursor-nwse-resize',
                  'hover:bg-white/10',
                  'transition-colors'
                )}
                onPointerDown={(e) => dragControls.start(e)}
                aria-hidden="true"
              />
            )}

            {/* Bottom gradient decoration */}
            <div
              className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none bg-gradient-to-t from-leo-dark/20 to-transparent"
              aria-hidden="true"
            />
          </motion.div>
        )}
      </AnimatePresence>
    );
  })
);

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

export default WidgetWindow;
