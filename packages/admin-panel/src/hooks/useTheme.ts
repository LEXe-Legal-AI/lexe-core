import { useCallback, useEffect } from 'react';
import { useUIStore, ThemePreference, ResolvedTheme } from '@/stores/uiStore';

interface UseThemeReturn {
  /** The user's theme preference (light, dark, or system) */
  themePreference: ThemePreference;
  /** The resolved/actual theme being applied (light or dark) */
  resolvedTheme: ResolvedTheme;
  /** Whether dark mode is currently active */
  isDark: boolean;
  /** Set a specific theme preference */
  setTheme: (preference: ThemePreference) => void;
  /** Toggle through themes: light -> dark -> system -> light */
  toggleTheme: () => void;
  /** Set to light mode */
  setLight: () => void;
  /** Set to dark mode */
  setDark: () => void;
  /** Set to follow system preference */
  setSystem: () => void;
}

/**
 * Hook for managing theme preferences
 *
 * @example
 * ```tsx
 * function ThemeButton() {
 *   const { resolvedTheme, toggleTheme, isDark } = useTheme();
 *   return (
 *     <button onClick={toggleTheme}>
 *       {isDark ? 'Switch to Light' : 'Switch to Dark'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useTheme(): UseThemeReturn {
  const themePreference = useUIStore((state) => state.themePreference);
  const resolvedTheme = useUIStore((state) => state.resolvedTheme);
  const setThemeAction = useUIStore((state) => state.setTheme);
  const toggleThemeAction = useUIStore((state) => state.toggleTheme);
  const initTheme = useUIStore((state) => state.initTheme);

  // Initialize theme on mount
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  const setTheme = useCallback((preference: ThemePreference) => {
    setThemeAction(preference);
  }, [setThemeAction]);

  const toggleTheme = useCallback(() => {
    toggleThemeAction();
  }, [toggleThemeAction]);

  const setLight = useCallback(() => {
    setThemeAction('light');
  }, [setThemeAction]);

  const setDark = useCallback(() => {
    setThemeAction('dark');
  }, [setThemeAction]);

  const setSystem = useCallback(() => {
    setThemeAction('system');
  }, [setThemeAction]);

  return {
    themePreference,
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    setTheme,
    toggleTheme,
    setLight,
    setDark,
    setSystem,
  };
}

export default useTheme;
