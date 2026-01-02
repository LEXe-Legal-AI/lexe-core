import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import {
  Brain,
  Route,
  Sparkles,
  CheckCircle2,
  Layers,
  Send,
  Search,
} from 'lucide-react';
import type { PipelinePhase } from '@/stores/streamStore';

export interface TypingIndicatorProps {
  /** Custom text to show (default: from i18n) */
  text?: string;
  /** Show thinking indicator instead of typing */
  isThinking?: boolean;
  /** Current ORCHIDEA pipeline phase */
  phase?: PipelinePhase | null;
  /** Custom class name */
  className?: string;
  /** Dot color (default: accent) */
  dotColor?: string;
  /** Compact mode for inline display */
  compact?: boolean;
}

/**
 * Phase configuration with icons and colors
 */
const phaseConfig: Record<PipelinePhase, {
  icon: typeof Brain;
  color: string;
  bgColor: string;
  i18nKey: string;
}> = {
  receiving: {
    icon: Search,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    i18nKey: 'phases.receiving',
  },
  classifying: {
    icon: Layers,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    i18nKey: 'phases.classifying',
  },
  routing: {
    icon: Route,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    i18nKey: 'phases.routing',
  },
  generating: {
    icon: Brain,
    color: 'text-leo-accent',
    bgColor: 'bg-leo-accent/20',
    i18nKey: 'phases.generating',
  },
  validating: {
    icon: CheckCircle2,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    i18nKey: 'phases.validating',
  },
  integrating: {
    icon: Sparkles,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
    i18nKey: 'phases.integrating',
  },
  responding: {
    icon: Send,
    color: 'text-leo-secondary',
    bgColor: 'bg-leo-secondary/20',
    i18nKey: 'phases.responding',
  },
};

/**
 * Animated typing/thinking indicator with ORCHIDEA pipeline phases
 *
 * Features:
 * - Phase-specific icons and colors
 * - Pulsing glow effect
 * - Bouncing dots animation
 * - i18n support for all phases
 *
 * @example
 * ```tsx
 * <TypingIndicator />
 * <TypingIndicator isThinking />
 * <TypingIndicator phase="generating" />
 * <TypingIndicator text="Searching..." />
 * ```
 */
export const TypingIndicator = memo(function TypingIndicator({
  text,
  isThinking = false,
  phase,
  className,
  dotColor,
  compact = false,
}: TypingIndicatorProps) {
  const { t } = useTranslation('chat');

  // Get phase configuration
  const currentPhase = useMemo(() => {
    if (phase && phaseConfig[phase]) {
      return phaseConfig[phase];
    }
    return null;
  }, [phase]);

  // Determine display text
  const displayText = useMemo(() => {
    if (text) return text;
    if (currentPhase) {
      return t(currentPhase.i18nKey, { defaultValue: `LEO is ${phase}...` });
    }
    if (isThinking) {
      return t('messages.assistant_thinking');
    }
    return t('messages.assistant_typing');
  }, [text, currentPhase, phase, isThinking, t]);

  // Get phase icon component
  const PhaseIcon = currentPhase?.icon || Brain;
  const iconColor = currentPhase?.color || 'text-leo-accent';
  const bgColor = currentPhase?.bgColor || 'bg-leo-accent/20';

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn('inline-flex items-center gap-1.5', className)}
      >
        <div className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className={cn('w-1.5 h-1.5 rounded-full', dotColor || 'bg-leo-accent')}
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.12,
              }}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn('flex items-center gap-3 py-3', className)}
    >
      {/* Phase Icon with enhanced glow effect */}
      <motion.div
        className={cn(
          'relative flex items-center justify-center w-10 h-10 rounded-xl',
          bgColor,
          'border border-white/10'
        )}
        animate={{
          boxShadow: [
            '0 0 0 0 rgba(0, 168, 150, 0)',
            '0 0 15px 3px rgba(0, 168, 150, 0.3)',
            '0 0 0 0 rgba(0, 168, 150, 0)',
          ],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {/* Pulsing ring behind icon */}
        <motion.div
          className={cn('absolute inset-0 rounded-xl', bgColor)}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
        <motion.div
          animate={{
            rotate: isThinking ? 360 : 0,
            scale: [1, 1.1, 1],
          }}
          transition={{
            rotate: {
              duration: 2,
              repeat: isThinking ? Infinity : 0,
              ease: 'linear',
            },
            scale: {
              duration: 1,
              repeat: Infinity,
              ease: 'easeInOut',
            },
          }}
        >
          <PhaseIcon className={cn('w-5 h-5', iconColor)} />
        </motion.div>
      </motion.div>

      {/* Enhanced animated dots with wave effect */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className={cn(
              'w-2.5 h-2.5 rounded-full',
              dotColor || 'bg-leo-accent',
              'shadow-sm shadow-leo-accent/30'
            )}
            animate={{
              y: [0, -8, 0],
              scale: [1, 1.3, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.12,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Text with enhanced animation */}
      <motion.span
        className="text-sm font-medium text-foreground/80"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {displayText}
      </motion.span>

      {/* Enhanced progress indicator */}
      {isThinking && (
        <motion.div
          className="ml-auto flex items-center gap-2"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {/* Shimmer progress bar */}
          <div className="w-20 h-1.5 bg-muted/50 rounded-full overflow-hidden">
            <motion.div
              className={cn(
                'h-full rounded-full',
                'bg-gradient-to-r from-transparent via-leo-accent to-transparent'
              )}
              animate={{
                x: ['-100%', '200%'],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: 'linear',
              }}
              style={{ width: '50%' }}
            />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
});

export default TypingIndicator;
