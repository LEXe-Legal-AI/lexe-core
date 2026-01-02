/**
 * LEO Frontend - Skeleton Component
 * Loading placeholder with shimmer animation
 */

import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Variant for common skeleton patterns
   */
  variant?: 'text' | 'circular' | 'rectangular';
  /**
   * Width of the skeleton
   */
  width?: string | number;
  /**
   * Height of the skeleton
   */
  height?: string | number;
}

/**
 * Skeleton loading placeholder component
 * Used to indicate content is loading
 */
function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-muted',
        {
          'rounded-full': variant === 'circular',
          'rounded-md': variant === 'rectangular',
          'rounded h-4': variant === 'text',
        },
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style,
      }}
      {...props}
    />
  );
}

/**
 * Skeleton for card content
 */
function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-3', className)} {...props}>
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

/**
 * Skeleton for stat cards
 */
function SkeletonStatCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6 space-y-2', className)} {...props}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

/**
 * Skeleton for list items
 */
function SkeletonListItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center gap-4 p-3', className)} {...props}>
      <Skeleton variant="circular" className="h-10 w-10" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonStatCard, SkeletonListItem };
