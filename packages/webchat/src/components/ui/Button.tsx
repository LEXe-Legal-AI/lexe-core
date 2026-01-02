import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center gap-2',
    'font-heading font-medium text-sm',
    'rounded-lg',
    'transition-all duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.98]',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-leo-primary text-white',
          'hover:bg-leo-primary/90',
          'focus-visible:ring-leo-primary',
          'shadow-md hover:shadow-lg',
        ],
        primary: [
          'bg-gradient-to-r from-leo-primary to-leo-primary/80',
          'text-white',
          'hover:from-leo-primary/90 hover:to-leo-primary/70',
          'focus-visible:ring-leo-primary',
          'shadow-lg shadow-leo-primary/25 hover:shadow-xl hover:shadow-leo-primary/30',
        ],
        secondary: [
          'bg-leo-secondary text-leo-dark',
          'hover:bg-leo-secondary/90',
          'focus-visible:ring-leo-secondary',
          'shadow-md hover:shadow-lg shadow-leo-secondary/20',
        ],
        ghost: [
          'bg-transparent text-leo-primary',
          'hover:bg-leo-primary/10',
          'focus-visible:ring-leo-primary/50',
        ],
        outline: [
          'border-2 border-leo-primary text-leo-primary',
          'bg-transparent',
          'hover:bg-leo-primary hover:text-white',
          'focus-visible:ring-leo-primary',
        ],
        destructive: [
          'bg-red-600 text-white',
          'hover:bg-red-700',
          'focus-visible:ring-red-500',
          'shadow-md hover:shadow-lg shadow-red-500/20',
        ],
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-lg',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Loading state - shows spinner and disables button */
  isLoading?: boolean;
  /** Icon to display before children */
  leftIcon?: React.ReactNode;
  /** Icon to display after children */
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
