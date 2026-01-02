import { memo, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface PulseRingProps {
  children: ReactNode;
  /** Ring color */
  color?: string;
  /** Number of rings */
  rings?: number;
  /** Animation duration */
  duration?: number;
  /** Ring size multiplier */
  scale?: number;
  /** Show pulse */
  active?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Animated pulse ring effect around content
 *
 * @example
 * ```tsx
 * <PulseRing active>
 *   <button className="w-12 h-12 rounded-full bg-accent">
 *     <Icon />
 *   </button>
 * </PulseRing>
 * ```
 */
export const PulseRing = memo(function PulseRing({
  children,
  color = 'var(--leo-accent)',
  rings = 3,
  duration = 2,
  scale = 1.5,
  active = true,
  className,
}: PulseRingProps) {
  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      {/* Pulse rings */}
      {active &&
        Array.from({ length: rings }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full"
            style={{
              border: `2px solid ${color}`,
            }}
            initial={{
              scale: 1,
              opacity: 0.6,
            }}
            animate={{
              scale: [1, scale],
              opacity: [0.6, 0],
            }}
            transition={{
              duration,
              repeat: Infinity,
              delay: (i * duration) / rings,
              ease: 'easeOut',
            }}
          />
        ))}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
});

export default PulseRing;
