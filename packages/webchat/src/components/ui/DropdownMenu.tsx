import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Dropdown Menu Context
 */
interface DropdownContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

const DropdownContext = React.createContext<DropdownContextValue | undefined>(undefined);

function useDropdownContext() {
  const context = React.useContext(DropdownContext);
  if (!context) {
    throw new Error('Dropdown components must be used within a DropdownMenu');
  }
  return context;
}

/**
 * DropdownMenu - Root component
 */
interface DropdownMenuProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DropdownMenu({
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
}: DropdownMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const isOpen = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setIsOpen = React.useCallback(
    (open: boolean) => {
      if (controlledOpen === undefined) {
        setUncontrolledOpen(open);
      }
      onOpenChange?.(open);
    },
    [controlledOpen, onOpenChange]
  );

  // Close on escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, setIsOpen]);

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        // Check if click is inside the dropdown content
        const dropdown = document.querySelector('[data-dropdown-content]');
        if (dropdown && !dropdown.contains(e.target as Node)) {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, setIsOpen]);

  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen, triggerRef }}>
      <div className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  );
}

/**
 * DropdownMenuTrigger
 */
interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}

export function DropdownMenuTrigger({ children, asChild, className }: DropdownMenuTriggerProps) {
  const { isOpen, setIsOpen, triggerRef } = useDropdownContext();

  const handleClick = () => setIsOpen(!isOpen);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      ref: triggerRef,
      onClick: handleClick,
      'aria-expanded': isOpen,
      'aria-haspopup': 'menu',
    });
  }

  return (
    <button
      ref={triggerRef}
      onClick={handleClick}
      className={className}
      aria-expanded={isOpen}
      aria-haspopup="menu"
    >
      {children}
    </button>
  );
}

/**
 * DropdownMenuContent
 */
interface DropdownMenuContentProps {
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
  sideOffset?: number;
}

export function DropdownMenuContent({
  children,
  align = 'end',
  className,
  sideOffset = 8,
}: DropdownMenuContentProps) {
  const { isOpen, setIsOpen } = useDropdownContext();

  const alignClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          data-dropdown-content
          role="menu"
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{ marginTop: sideOffset }}
          className={cn(
            'absolute z-50 min-w-[200px]',
            'bg-popover border border-border rounded-lg shadow-lg',
            'backdrop-blur-xl',
            'py-1',
            alignClasses[align],
            className
          )}
          onClick={() => setIsOpen(false)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * DropdownMenuItem
 */
interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  destructive?: boolean;
}

export function DropdownMenuItem({
  children,
  className,
  destructive,
  disabled,
  ...props
}: DropdownMenuItemProps) {
  return (
    <button
      role="menuitem"
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-sm',
        'text-left transition-colors',
        'hover:bg-muted focus:bg-muted focus:outline-none',
        disabled && 'opacity-50 cursor-not-allowed',
        destructive && 'text-destructive hover:bg-destructive/10',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * DropdownMenuLabel
 */
interface DropdownMenuLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function DropdownMenuLabel({ children, className }: DropdownMenuLabelProps) {
  return (
    <div className={cn('px-3 py-2 text-sm font-medium text-muted-foreground', className)}>
      {children}
    </div>
  );
}

/**
 * DropdownMenuSeparator
 */
export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn('h-px bg-border my-1', className)} />;
}

/**
 * DropdownMenuGroup - for grouping items
 */
export function DropdownMenuGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
