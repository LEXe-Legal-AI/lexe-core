import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// Tooltip variants
const tooltipVariants = cva(
  [
    'absolute z-50',
    'px-3 py-1.5',
    'rounded-md',
    'font-body text-xs',
    'shadow-lg',
    'animate-fade-in',
    'pointer-events-none',
    'whitespace-nowrap',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-leo-dark text-leo-light',
          'dark:bg-leo-light dark:text-leo-dark',
        ],
        primary: [
          'bg-leo-primary text-white',
        ],
        light: [
          'bg-white text-leo-dark',
          'border border-leo-gray/10',
        ],
      },
      side: {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      side: 'top',
    },
  }
);

// Arrow styles based on side
const arrowStyles = {
  top: 'bottom-[-4px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent',
  bottom: 'top-[-4px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent',
  left: 'right-[-4px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent',
  right: 'left-[-4px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent',
};

export interface TooltipProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'content'>,
    VariantProps<typeof tooltipVariants> {
  /** Tooltip content */
  content: React.ReactNode;
  /** Delay before showing (ms) */
  delayMs?: number;
  /** Delay before hiding (ms) */
  hideDelayMs?: number;
  /** Show arrow */
  arrow?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Controlled open state */
  open?: boolean;
  /** Default open state */
  defaultOpen?: boolean;
  /** Callback when open changes */
  onOpenChange?: (open: boolean) => void;
}

const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  (
    {
      className,
      children,
      content,
      variant,
      side = 'top',
      delayMs = 200,
      hideDelayMs = 0,
      arrow = true,
      disabled = false,
      open: controlledOpen,
      defaultOpen = false,
      onOpenChange,
      ...props
    },
    ref
  ) => {
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
    const openTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>();
    const closeTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>();

    const isControlled = controlledOpen !== undefined;
    const isOpen = isControlled ? controlledOpen : internalOpen;

    const setOpen = React.useCallback(
      (newOpen: boolean) => {
        if (!isControlled) {
          setInternalOpen(newOpen);
        }
        onOpenChange?.(newOpen);
      },
      [isControlled, onOpenChange]
    );

    const handleMouseEnter = () => {
      if (disabled) return;
      clearTimeout(closeTimeoutRef.current);
      openTimeoutRef.current = setTimeout(() => setOpen(true), delayMs);
    };

    const handleMouseLeave = () => {
      clearTimeout(openTimeoutRef.current);
      closeTimeoutRef.current = setTimeout(() => setOpen(false), hideDelayMs);
    };

    const handleFocus = () => {
      if (disabled) return;
      clearTimeout(closeTimeoutRef.current);
      setOpen(true);
    };

    const handleBlur = () => {
      clearTimeout(openTimeoutRef.current);
      setOpen(false);
    };

    // Cleanup on unmount
    React.useEffect(() => {
      return () => {
        clearTimeout(openTimeoutRef.current);
        clearTimeout(closeTimeoutRef.current);
      };
    }, []);

    // Determine arrow color based on variant
    const arrowColor = {
      default: 'border-leo-dark dark:border-leo-light',
      primary: 'border-leo-primary',
      light: 'border-white',
    }[variant || 'default'];

    return (
      <div
        ref={ref}
        className="relative inline-flex"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      >
        {children}

        {isOpen && content && (
          <div
            role="tooltip"
            className={cn(tooltipVariants({ variant, side, className }))}
          >
            {content}

            {arrow && (
              <span
                className={cn(
                  'absolute',
                  'w-0 h-0',
                  'border-4',
                  arrowStyles[side || 'top'],
                  arrowColor
                )}
              />
            )}
          </div>
        )}
      </div>
    );
  }
);

Tooltip.displayName = 'Tooltip';

// TooltipProvider for global config (optional)
interface TooltipProviderProps {
  children: React.ReactNode;
  delayMs?: number;
  hideDelayMs?: number;
}

interface TooltipContextValue {
  delayMs: number;
  hideDelayMs: number;
}

const TooltipContext = React.createContext<TooltipContextValue>({
  delayMs: 200,
  hideDelayMs: 0,
});

const TooltipProvider: React.FC<TooltipProviderProps> = ({
  children,
  delayMs = 200,
  hideDelayMs = 0,
}) => {
  return (
    <TooltipContext.Provider value={{ delayMs, hideDelayMs }}>
      {children}
    </TooltipContext.Provider>
  );
};

TooltipProvider.displayName = 'TooltipProvider';

export function useTooltipContext() {
  return React.useContext(TooltipContext);
}

export { Tooltip, TooltipProvider, tooltipVariants };
