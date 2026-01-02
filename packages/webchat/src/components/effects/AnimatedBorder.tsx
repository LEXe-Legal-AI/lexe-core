import { forwardRef, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface AnimatedBorderProps {
  children: ReactNode;
  /** Border width */
  borderWidth?: number;
  /** Animation duration in seconds */
  duration?: number;
  /** Border colors */
  colors?: string[];
  /** Border radius */
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Additional class names */
  className?: string;
  /** Inner container class names */
  innerClassName?: string;
}

const roundedClasses = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

/**
 * Container with animated gradient border
 *
 * @example
 * ```tsx
 * <AnimatedBorder colors={['#00A896', '#F7931E', '#1E3A5F']}>
 *   <div className="p-4 bg-background">
 *     Content with animated border
 *   </div>
 * </AnimatedBorder>
 * ```
 */
export const AnimatedBorder = forwardRef<HTMLDivElement, AnimatedBorderProps>(
  function AnimatedBorder(
    {
      children,
      borderWidth = 2,
      duration = 4,
      colors = ['#00A896', '#F7931E', '#1E3A5F', '#00A896'],
      rounded = 'xl',
      className,
      innerClassName,
    },
    ref
  ) {
    const gradientColors = colors.join(', ');

    return (
      <div
        ref={ref}
        className={cn('relative', roundedClasses[rounded], className)}
        style={{ padding: borderWidth }}
      >
        {/* Animated gradient background */}
        <motion.div
          className={cn(
            'absolute inset-0',
            roundedClasses[rounded]
          )}
          style={{
            background: `conic-gradient(from 0deg, ${gradientColors})`,
          }}
          animate={{
            rotate: 360,
          }}
          transition={{
            duration,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Blur overlay for glow effect */}
        <motion.div
          className={cn(
            'absolute inset-0 blur-md opacity-50',
            roundedClasses[rounded]
          )}
          style={{
            background: `conic-gradient(from 0deg, ${gradientColors})`,
          }}
          animate={{
            rotate: 360,
          }}
          transition={{
            duration,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Inner content */}
        <div
          className={cn(
            'relative bg-background',
            roundedClasses[rounded],
            innerClassName
          )}
        >
          {children}
        </div>
      </div>
    );
  }
);

export default AnimatedBorder;
