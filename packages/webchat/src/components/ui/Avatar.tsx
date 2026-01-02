import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// Context for Avatar state
interface AvatarContextValue {
  imageError: boolean;
  setImageError: (error: boolean) => void;
}

const AvatarContext = React.createContext<AvatarContextValue | undefined>(undefined);

function useAvatarContext() {
  const context = React.useContext(AvatarContext);
  if (!context) {
    throw new Error('Avatar components must be used within an Avatar provider');
  }
  return context;
}

// Avatar variants
const avatarVariants = cva(
  [
    'relative flex shrink-0 overflow-hidden',
    'rounded-full',
    'bg-leo-gray/20',
  ],
  {
    variants: {
      size: {
        xs: 'h-6 w-6 text-xs',
        sm: 'h-8 w-8 text-sm',
        md: 'h-10 w-10 text-base',
        lg: 'h-12 w-12 text-lg',
        xl: 'h-16 w-16 text-xl',
        '2xl': 'h-20 w-20 text-2xl',
      },
      variant: {
        default: '',
        ring: [
          'ring-2 ring-offset-2',
          'ring-leo-primary',
          'ring-offset-white dark:ring-offset-leo-dark',
        ],
        status: '',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  }
);

export interface AvatarProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof avatarVariants> {
  /** Status indicator */
  status?: 'online' | 'offline' | 'away' | 'busy';
}

const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, size, variant, status, children, ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false);

    // Status indicator colors
    const statusColors = {
      online: 'bg-green-500',
      offline: 'bg-gray-400',
      away: 'bg-amber-500',
      busy: 'bg-red-500',
    };

    // Status indicator sizes
    const statusSizes = {
      xs: 'h-1.5 w-1.5',
      sm: 'h-2 w-2',
      md: 'h-2.5 w-2.5',
      lg: 'h-3 w-3',
      xl: 'h-3.5 w-3.5',
      '2xl': 'h-4 w-4',
    };

    return (
      <AvatarContext.Provider value={{ imageError, setImageError }}>
        <span
          ref={ref}
          className={cn(avatarVariants({ size, variant, className }))}
          {...props}
        >
          {children}
          {status && (
            <span
              className={cn(
                'absolute bottom-0 right-0',
                'rounded-full',
                'ring-2 ring-white dark:ring-leo-dark',
                statusColors[status],
                statusSizes[size || 'md']
              )}
              aria-label={`Status: ${status}`}
            />
          )}
        </span>
      </AvatarContext.Provider>
    );
  }
);

Avatar.displayName = 'Avatar';

// AvatarImage
export type AvatarImageProps = React.ImgHTMLAttributes<HTMLImageElement>;

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, src, alt = '', onError, ...props }, ref) => {
    const { setImageError, imageError } = useAvatarContext();

    const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setImageError(true);
      onError?.(e);
    };

    if (imageError || !src) {
      return null;
    }

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        onError={handleError}
        className={cn(
          'aspect-square h-full w-full object-cover',
          'transition-opacity duration-200',
          className
        )}
        {...props}
      />
    );
  }
);

AvatarImage.displayName = 'AvatarImage';

// AvatarFallback
export interface AvatarFallbackProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Delay before showing fallback (for loading states) */
  delayMs?: number;
}

const AvatarFallback = React.forwardRef<HTMLSpanElement, AvatarFallbackProps>(
  ({ className, delayMs = 0, children, ...props }, ref) => {
    const { imageError } = useAvatarContext();
    const [showFallback, setShowFallback] = React.useState(delayMs === 0);

    React.useEffect(() => {
      if (delayMs > 0) {
        const timer = setTimeout(() => setShowFallback(true), delayMs);
        return () => clearTimeout(timer);
      }
    }, [delayMs]);

    if (!showFallback && !imageError) {
      return null;
    }

    return (
      <span
        ref={ref}
        className={cn(
          'flex h-full w-full items-center justify-center',
          'bg-gradient-to-br from-leo-primary to-leo-primary/70',
          'font-heading font-medium text-white uppercase',
          'select-none',
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

AvatarFallback.displayName = 'AvatarFallback';

// Utility function to get initials
export function getInitials(name: string, maxLength = 2): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, maxLength)
    .join('')
    .toUpperCase();
}

export { Avatar, AvatarImage, AvatarFallback, avatarVariants };
