import { memo, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ShimmerTextProps {
  children: ReactNode;
  /** Shimmer animation duration */
  duration?: number;
  /** Gradient colors */
  colors?: [string, string, string];
  /** Additional class names */
  className?: string;
  /** Play animation */
  animate?: boolean;
}

/**
 * Text with animated shimmer/gradient effect
 *
 * @example
 * ```tsx
 * <ShimmerText>
 *   Premium Feature
 * </ShimmerText>
 *
 * <ShimmerText colors={['#F7931E', '#FF6B6B', '#F7931E']}>
 *   Hot Deal!
 * </ShimmerText>
 * ```
 */
export const ShimmerText = memo(function ShimmerText({
  children,
  duration = 2,
  colors = ['#1E3A5F', '#00A896', '#1E3A5F'],
  className,
  animate = true,
}: ShimmerTextProps) {
  const gradient = `linear-gradient(90deg, ${colors[0]} 0%, ${colors[1]} 50%, ${colors[2]} 100%)`;

  return (
    <motion.span
      className={cn(
        'inline-block bg-clip-text text-transparent',
        animate && 'animate-shimmer',
        className
      )}
      style={{
        backgroundImage: gradient,
        backgroundSize: animate ? '200% 100%' : '100% 100%',
      }}
      animate={
        animate
          ? {
              backgroundPosition: ['200% 0', '-200% 0'],
            }
          : undefined
      }
      transition={
        animate
          ? {
              duration,
              repeat: Infinity,
              ease: 'linear',
            }
          : undefined
      }
    >
      {children}
    </motion.span>
  );
});

export default ShimmerText;
