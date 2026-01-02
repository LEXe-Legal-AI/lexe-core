import { create } from 'zustand';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface UIState {
  sidebarCollapsed: boolean;
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
}

interface UIActions {
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (preference: ThemePreference) => void;
  initTheme: () => void;
  toggleTheme: () => void;
}

type UIStore = UIState & UIActions;

const STORAGE_KEY = 'leo-theme';

/**
 * Get the system's preferred color scheme
 */
const getSystemTheme = (): ResolvedTheme => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

/**
 * Resolve the actual theme based on preference
 */
const resolveTheme = (preference: ThemePreference): ResolvedTheme => {
  if (preference === 'system') {
    return getSystemTheme();
  }
  return preference;
};

/**
 * Apply the resolved theme to the document
 */
const applyTheme = (theme: ResolvedTheme): void => {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
};

/**
 * Get the initial theme preference from localStorage
 */
const getStoredPreference = (): ThemePreference => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  }
  return 'system'; // Default to system preference
};

const initialPreference = getStoredPreference();
const initialResolved = resolveTheme(initialPreference);

const initialState: UIState = {
  sidebarCollapsed: false,
  themePreference: initialPreference,
  resolvedTheme: initialResolved,
};

// Store reference to media query listener cleanup
let mediaQueryCleanup: (() => void) | null = null;

export const useUIStore = create<UIStore>()((set, get) => ({
  ...initialState,

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  setSidebarCollapsed: (collapsed: boolean) => {
    set({ sidebarCollapsed: collapsed });
  },

  setTheme: (preference: ThemePreference) => {
    const resolved = resolveTheme(preference);

    set({ themePreference: preference, resolvedTheme: resolved });

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, preference);
      applyTheme(resolved);

      // Clean up previous listener if exists
      if (mediaQueryCleanup) {
        mediaQueryCleanup();
        mediaQueryCleanup = null;
      }

      // Set up system preference listener if using 'system' preference
      if (preference === 'system' && window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => {
          const newResolved: ResolvedTheme = e.matches ? 'dark' : 'light';
          set({ resolvedTheme: newResolved });
          applyTheme(newResolved);
        };

        mediaQuery.addEventListener('change', handler);
        mediaQueryCleanup = () => mediaQuery.removeEventListener('change', handler);
      }
    }
  },

  initTheme: () => {
    const { themePreference, setTheme } = get();
    // Re-apply theme to ensure it's set correctly
    setTheme(themePreference);
  },

  toggleTheme: () => {
    const { themePreference, setTheme } = get();
    // Cycle through: light -> dark -> system -> light
    const nextTheme: ThemePreference =
      themePreference === 'light' ? 'dark' :
      themePreference === 'dark' ? 'system' : 'light';
    setTheme(nextTheme);
  },
}));

// Initialize theme on store creation to prevent flash
if (typeof window !== 'undefined') {
  const state = useUIStore.getState();
  applyTheme(state.resolvedTheme);

  // Set up system preference listener if using 'system' preference
  if (state.themePreference === 'system' && window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const newResolved: ResolvedTheme = e.matches ? 'dark' : 'light';
      useUIStore.setState({ resolvedTheme: newResolved });
      applyTheme(newResolved);
    };

    mediaQuery.addEventListener('change', handler);
    mediaQueryCleanup = () => mediaQuery.removeEventListener('change', handler);
  }
}
