import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const cardVariants = cva(
  // Base styles
  [
    'rounded-xl',
    'transition-all duration-300 ease-out',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-white dark:bg-leo-dark/80',
          'border border-leo-gray/10',
          'shadow-sm',
        ],
        elevated: [
          'bg-white dark:bg-leo-dark/80',
          'shadow-lg shadow-leo-dark/5',
          'border border-leo-gray/5',
        ],
        glass: [
          'bg-white/60 dark:bg-leo-dark/40',
          'backdrop-blur-xl',
          'border border-white/20 dark:border-white/10',
          'shadow-xl shadow-leo-dark/5',
        ],
        outline: [
          'bg-transparent',
          'border-2 border-leo-primary/20',
        ],
      },
      hover: {
        true: [
          'hover:shadow-lg hover:shadow-leo-primary/5',
          'hover:-translate-y-0.5',
          'hover:border-leo-primary/20',
        ],
        false: '',
      },
      padding: {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      hover: false,
      padding: 'none',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, hover, padding, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, hover, padding, className }))}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

// CardHeader
type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col space-y-1.5 p-6', className)}
        {...props}
      />
    );
  }
);

CardHeader.displayName = 'CardHeader';

// CardTitle
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, as: Component = 'h3', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          'font-heading text-xl font-semibold leading-none tracking-tight',
          'text-leo-dark dark:text-leo-light',
          className
        )}
        {...props}
      />
    );
  }
);

CardTitle.displayName = 'CardTitle';

// CardDescription
type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn('font-body text-sm text-leo-gray', className)}
        {...props}
      />
    );
  }
);

CardDescription.displayName = 'CardDescription';

// CardContent
type CardContentProps = React.HTMLAttributes<HTMLDivElement>;

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
    );
  }
);

CardContent.displayName = 'CardContent';

// CardFooter
type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center p-6 pt-0',
          'border-t border-leo-gray/10 mt-auto',
          className
        )}
        {...props}
      />
    );
  }
);

CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
};
