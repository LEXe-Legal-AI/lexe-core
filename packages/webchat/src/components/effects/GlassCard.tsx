import { forwardRef, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  /** Enable glow effect on border */
  glow?: boolean;
  /** Enable hover lift effect */
  hover?: boolean;
  /** Enable animated border */
  animatedBorder?: boolean;
  /** Enable shine effect on hover */
  shine?: boolean;
  /** Glass variant */
  variant?: 'light' | 'dark' | 'primary' | 'frosted';
  /** Border radius size */
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** As child (merge with child element) */
  asChild?: boolean;
}

const variantClasses = {
  light: 'glass',
  dark: 'glass-dark',
  primary: 'frosted-primary',
  frosted: 'frosted-light dark:frosted-dark',
};

const roundedClasses = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

const paddingClasses = {
  none: 'p-0',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
};

/**
 * Premium glassmorphism card component
 *
 * @example
 * ```tsx
 * <GlassCard glow hover padding="lg">
 *   <h2>Premium Card</h2>
 *   <p>With glass effect</p>
 * </GlassCard>
 *
 * <GlassCard variant="dark" animatedBorder>
 *   <p>Animated border</p>
 * </GlassCard>
 * ```
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  function GlassCard(
    {
      children,
      className,
      glow = false,
      hover = false,
      animatedBorder = false,
      shine = false,
      variant = 'light',
      rounded = 'xl',
      padding = 'md',
      ...props
    },
    ref
  ) {
    return (
      <motion.div
        ref={ref}
        className={cn(
          // Base glass styles
          variantClasses[variant],
          roundedClasses[rounded],
          paddingClasses[padding],

          // Glow effect
          glow && 'glass-glow',

          // Animated border
          animatedBorder && 'glass-animated-border',

          // Shine effect
          shine && 'glass-shine',

          // Hover effects
          hover && 'hover-lift',

          // Shadow
          'shadow-lg',

          className
        )}
        whileHover={
          hover
            ? {
                y: -2,
                transition: { duration: 0.2 },
              }
            : undefined
        }
        whileTap={
          hover
            ? {
                scale: 0.98,
                transition: { duration: 0.1 },
              }
            : undefined
        }
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

export default GlassCard;
