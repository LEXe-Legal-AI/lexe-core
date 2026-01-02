import { memo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Check, ChevronDown, Sparkles, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useConfigStore, AVAILABLE_MODELS, type ModelDefinition } from '@/stores/configStore';
import { useAuthStore, selectIsGuest } from '@/stores/authStore';

export interface ModelSelectorProps {
  /** Compact mode - just the icon */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Model selector dropdown with grouped models
 *
 * Features:
 * - Auto option with smart routing
 * - FREE models section (3 models)
 * - PREMIUM models section (9 models)
 * - Provider icons
 * - Animated dropdown
 *
 * @example
 * ```tsx
 * <ModelSelector />
 * <ModelSelector compact />
 * ```
 */
export const ModelSelector = memo(function ModelSelector({
  compact = false,
  className,
}: ModelSelectorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedModel = useConfigStore((state) => state.selectedModel);
  const setSelectedModel = useConfigStore((state) => state.setSelectedModel);

  // Check if user is guest (premium models disabled for guests)
  const isGuest = useAuthStore(selectIsGuest);

  // Non-null assertion: AVAILABLE_MODELS always has at least the 'auto' model
  const currentModel = AVAILABLE_MODELS.find((m) => m.id === selectedModel) ?? AVAILABLE_MODELS[0]!;

  // Group models by free/premium
  const autoModel = AVAILABLE_MODELS.find((m) => m.id === 'auto')!;
  const freeModels = AVAILABLE_MODELS.filter((m) => m.free && m.id !== 'auto');
  const premiumModels = AVAILABLE_MODELS.filter((m) => !m.free);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleModelChange = (modelId: string, isFree: boolean) => {
    // Guests can only select free models
    if (isGuest && !isFree) {
      return; // Don't allow selection
    }
    setSelectedModel(modelId);
    setIsOpen(false);
  };

  const renderModelItem = (model: ModelDefinition) => {
    const isSelected = model.id === selectedModel;
    const isDisabled = isGuest && !model.free;

    return (
      <button
        key={model.id}
        onClick={() => handleModelChange(model.id, model.free)}
        disabled={isDisabled}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-2.5',
          'transition-colors duration-150',
          isDisabled
            ? 'opacity-50 cursor-not-allowed text-muted-foreground'
            : isSelected
              ? 'bg-leo-accent/20 text-foreground'
              : 'hover:bg-muted text-foreground/80 hover:text-foreground'
        )}
        role="option"
        aria-selected={isSelected}
        aria-disabled={isDisabled}
        title={isDisabled ? t('model.premiumRequired', 'Accedi per usare modelli premium') : undefined}
      >
        <span className="text-lg">{model.icon}</span>
        <div className="flex-1 text-left">
          <span className="text-sm font-medium">{model.name}</span>
          {model.free && model.id !== 'auto' && (
            <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-green-500/20 text-green-400 rounded">
              FREE
            </span>
          )}
        </div>
        {isDisabled ? (
          <Lock className="w-4 h-4 text-muted-foreground" />
        ) : isSelected ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          >
            <Check className="w-4 h-4 text-leo-accent" />
          </motion.div>
        ) : null}
      </button>
    );
  };

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-lg transition-colors',
          compact
            ? 'p-2 hover:bg-muted'
            : 'px-3 py-2 bg-muted/50 hover:bg-muted border border-border'
        )}
        title={t('model.select', 'Seleziona modello')}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {compact ? (
          <>
            <Bot className="w-5 h-5" />
            <span className="text-sm">{currentModel.icon}</span>
          </>
        ) : (
          <>
            <span className="text-lg">{currentModel.icon}</span>
            <span className="text-sm max-w-[120px] truncate">{currentModel.name}</span>
            {currentModel.free && currentModel.id !== 'auto' && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-500/20 text-green-400 rounded">
                FREE
              </span>
            )}
            <ChevronDown
              className={cn(
                'w-4 h-4 transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
            />
          </>
        )}
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'absolute top-full mt-2 z-50',
              'min-w-[240px] max-h-[400px] overflow-y-auto',
              'bg-card/95 backdrop-blur-xl',
              'border border-border rounded-xl',
              'shadow-xl shadow-black/40',
              'overflow-hidden',
              // Responsive positioning
              'right-0 sm:right-0',
              'max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:right-auto'
            )}
            role="listbox"
            aria-label={t('model.select', 'Seleziona modello')}
          >
            {/* Auto option */}
            {renderModelItem(autoModel)}

            {/* Divider + FREE section */}
            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              FREE
            </div>
            {freeModels.map(renderModelItem)}

            {/* Divider + PREMIUM section */}
            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 flex items-center justify-between">
              <span>PREMIUM</span>
              {isGuest && (
                <span className="flex items-center gap-1 text-[10px] normal-case font-normal">
                  <Lock className="w-3 h-3" />
                  {t('model.loginRequired', 'Accedi per sbloccare')}
                </span>
              )}
            </div>
            {premiumModels.map(renderModelItem)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default ModelSelector;
