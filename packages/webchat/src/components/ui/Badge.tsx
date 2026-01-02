import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center',
    'font-heading font-medium',
    'rounded-full',
    'transition-colors duration-200',
    'whitespace-nowrap',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-leo-primary text-white',
          'shadow-sm',
        ],
        secondary: [
          'bg-leo-secondary/20 text-leo-secondary',
          'dark:bg-leo-secondary/30',
        ],
        outline: [
          'border-2 border-leo-primary text-leo-primary',
          'bg-transparent',
        ],
        destructive: [
          'bg-red-100 text-red-700',
          'dark:bg-red-900/30 dark:text-red-400',
        ],
        success: [
          'bg-leo-accent/20 text-leo-accent',
          'dark:bg-leo-accent/30',
        ],
        warning: [
          'bg-amber-100 text-amber-700',
          'dark:bg-amber-900/30 dark:text-amber-400',
        ],
        info: [
          'bg-blue-100 text-blue-700',
          'dark:bg-blue-900/30 dark:text-blue-400',
        ],
      },
      size: {
        sm: 'h-5 px-2 text-[10px]',
        md: 'h-6 px-2.5 text-xs',
        lg: 'h-7 px-3 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Icon to display before the label */
  icon?: React.ReactNode;
  /** Dot indicator */
  dot?: boolean;
  /** Dot color override */
  dotColor?: string;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, icon, dot, dotColor, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size, className }))}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'mr-1.5 h-1.5 w-1.5 rounded-full',
              dotColor || 'bg-current'
            )}
            style={dotColor ? { backgroundColor: dotColor } : undefined}
          />
        )}
        {icon && <span className="mr-1">{icon}</span>}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
