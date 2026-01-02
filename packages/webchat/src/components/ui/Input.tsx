import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const inputVariants = cva(
  // Base styles
  [
    'flex w-full',
    'font-body text-sm',
    'bg-white dark:bg-leo-dark/50',
    'border rounded-lg',
    'px-4 py-2.5',
    'transition-all duration-200 ease-out',
    'placeholder:text-leo-gray/60',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium',
  ],
  {
    variants: {
      state: {
        default: [
          'border-leo-gray/30',
          'text-leo-dark dark:text-leo-light',
          'hover:border-leo-primary/50',
          'focus:border-leo-primary focus:ring-2 focus:ring-leo-primary/20',
          'focus:outline-none',
        ],
        error: [
          'border-red-500',
          'text-leo-dark dark:text-leo-light',
          'focus:border-red-500 focus:ring-2 focus:ring-red-500/20',
          'focus:outline-none',
        ],
        success: [
          'border-leo-accent',
          'text-leo-dark dark:text-leo-light',
          'focus:border-leo-accent focus:ring-2 focus:ring-leo-accent/20',
          'focus:outline-none',
        ],
      },
      inputSize: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-5 text-base',
      },
    },
    defaultVariants: {
      state: 'default',
      inputSize: 'md',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /** Error message to display */
  error?: string;
  /** Helper text below the input */
  helperText?: string;
  /** Icon to display at the start */
  startIcon?: React.ReactNode;
  /** Icon to display at the end */
  endIcon?: React.ReactNode;
  /** Label for the input */
  label?: string;
  /** Required indicator */
  required?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      state,
      inputSize,
      error,
      helperText,
      startIcon,
      endIcon,
      label,
      required,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    // Determine the actual state
    const actualState = error ? 'error' : state;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block font-heading text-sm font-medium',
              disabled ? 'text-leo-gray/50' : 'text-leo-dark dark:text-leo-light'
            )}
          >
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}

        <div className="relative">
          {startIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-leo-gray">
              {startIcon}
            </div>
          )}

          <input
            type={type}
            id={inputId}
            ref={ref}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={cn(
              inputVariants({ state: actualState, inputSize, className }),
              startIcon && 'pl-10',
              endIcon && 'pr-10',
              disabled && 'cursor-not-allowed opacity-50 bg-leo-gray/10'
            )}
            {...props}
          />

          {endIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-leo-gray">
              {endIcon}
            </div>
          )}
        </div>

        {error && (
          <p id={errorId} className="text-xs font-medium text-red-500" role="alert">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={helperId} className="text-xs text-leo-gray">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input, inputVariants };
