import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { supportedLanguages, languageNames, languageFlags, type SupportedLanguage } from '@/i18n/config';

const dropdownVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94],
      staggerChildren: 0.03,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
};

export interface LanguageSelectorProps {
  /** Compact mode - just the globe icon */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Language selector dropdown with flags
 *
 * Features:
 * - All 6 supported languages
 * - Flag emoji indicators
 * - Animated dropdown
 * - Current language highlight
 *
 * @example
 * ```tsx
 * <LanguageSelector />
 * <LanguageSelector compact />
 * ```
 */
export const LanguageSelector = memo(function LanguageSelector({
  compact = false,
  className,
}: LanguageSelectorProps) {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentLanguage = i18n.language as SupportedLanguage;
  const currentFlag = languageFlags[currentLanguage] || languageFlags.en;
  const currentName = languageNames[currentLanguage] || languageNames.en;
  const currentIndex = supportedLanguages.indexOf(currentLanguage);

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

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          setIsOpen(false);
          buttonRef.current?.focus();
          break;
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex((prev) =>
            prev < supportedLanguages.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex((prev) =>
            prev > 0 ? prev - 1 : supportedLanguages.length - 1
          );
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (focusedIndex >= 0) {
            handleLanguageChange(supportedLanguages[focusedIndex]);
          }
          break;
      }
    },
    [isOpen, focusedIndex]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset focused index when opening
  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(currentIndex);
    }
  }, [isOpen, currentIndex]);

  const handleLanguageChange = useCallback(
    (lang: SupportedLanguage) => {
      i18n.changeLanguage(lang);
      setIsOpen(false);
      buttonRef.current?.focus();
    },
    [i18n]
  );

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-lg transition-all duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-leo-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          compact
            ? 'p-2 hover:bg-muted'
            : 'px-3 py-2 bg-muted/50 hover:bg-muted border border-border',
          isOpen && 'ring-2 ring-leo-accent/50'
        )}
        title={t('language.select')}
        aria-label={`${t('language.select')}: ${currentName}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {compact ? (
          <>
            <Globe className="w-5 h-5" />
            <span className="text-sm" aria-hidden="true">{currentFlag}</span>
          </>
        ) : (
          <>
            <span className="text-lg" aria-hidden="true">{currentFlag}</span>
            <span className="text-sm font-medium">{currentName}</span>
            <motion.span
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4" />
            </motion.span>
          </>
        )}
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              'absolute top-full mt-2 z-50',
              'min-w-[180px]',
              'bg-card/95 backdrop-blur-xl',
              'border border-border rounded-xl',
              'shadow-xl shadow-black/40',
              'overflow-hidden py-1',
              // Responsive positioning: right on desktop, centered on mobile
              'right-0 sm:right-0',
              'max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:right-auto'
            )}
            role="listbox"
            aria-label={t('language.select')}
            aria-activedescendant={focusedIndex >= 0 ? `lang-${supportedLanguages[focusedIndex]}` : undefined}
          >
            {supportedLanguages.map((lang, index) => {
              const isSelected = lang === currentLanguage;
              const isFocused = index === focusedIndex;
              return (
                <motion.button
                  key={lang}
                  id={`lang-${lang}`}
                  variants={itemVariants}
                  onClick={() => handleLanguageChange(lang)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5',
                    'transition-colors duration-150',
                    'focus:outline-none',
                    isSelected && 'bg-leo-accent/15',
                    isFocused && 'bg-muted',
                    !isSelected && !isFocused && 'text-foreground/80'
                  )}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                >
                  <span className="text-lg" aria-hidden="true">{languageFlags[lang]}</span>
                  <span className="flex-1 text-left text-sm font-medium">
                    {languageNames[lang]}
                  </span>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    >
                      <Check className="w-4 h-4 text-leo-accent" />
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default LanguageSelector;
