import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

/**
 * Notification type
 */
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
  createdAt: number;
}

/**
 * Modal configuration
 */
export interface ModalConfig {
  id: string;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  data?: unknown;
}

/**
 * Theme type
 */
export type Theme = 'light' | 'dark';

/**
 * UI state interface
 */
interface UIState {
  // Theme
  theme: Theme;

  // Sidebar state
  sidebarOpen: boolean;
  sidebarWidth: number;

  // Preview panel state
  previewPanelOpen: boolean;
  previewPanelWidth: number;

  // Navigation
  activeTab: string;
  activeRoute: string;

  // Modals
  modals: ModalConfig[];

  // Notifications
  notifications: Notification[];

  // Input state
  inputFocused: boolean;
  inputValue: string;

  // Mobile
  isMobile: boolean;
  mobileMenuOpen: boolean;

  // Loading states
  isPageLoading: boolean;
  loadingMessage: string | null;

  // Actions - Sidebar
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;

  // Actions - Preview Panel
  togglePreview: () => void;
  setPreviewPanelOpen: (open: boolean) => void;
  setPreviewPanelWidth: (width: number) => void;

  // Actions - Navigation
  setActiveTab: (tab: string) => void;
  setActiveRoute: (route: string) => void;

  // Actions - Modals
  openModal: (config: ModalConfig) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;

  // Actions - Notifications
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Actions - Input
  setInputFocused: (focused: boolean) => void;
  setInputValue: (value: string) => void;
  clearInput: () => void;

  // Actions - Mobile
  setIsMobile: (isMobile: boolean) => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;

  // Actions - Loading
  setPageLoading: (loading: boolean, message?: string) => void;

  // Actions - Theme
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  initializeTheme: () => void;

  // Actions - Reset
  resetUI: () => void;
}

/**
 * Generate unique ID
 */
const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/**
 * Get system theme preference
 */
const getSystemTheme = (): Theme => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
};

/**
 * Apply theme to DOM with CSS variables
 */
const applyThemeToDOM = (theme: Theme) => {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.setAttribute('data-theme', theme);

    // Update CSS variables for theme
    if (theme === 'dark') {
      root.style.setProperty('--background', '222.2 84% 4.9%');
      root.style.setProperty('--foreground', '210 40% 98%');
      root.style.setProperty('--muted', '217.2 32.6% 17.5%');
      root.style.setProperty('--muted-foreground', '215 20.2% 65.1%');
    } else {
      root.style.setProperty('--background', '0 0% 100%');
      root.style.setProperty('--foreground', '222.2 84% 4.9%');
      root.style.setProperty('--muted', '210 40% 96.1%');
      root.style.setProperty('--muted-foreground', '215.4 16.3% 46.9%');
    }
  }
};

/**
 * Default state values
 */
const defaultState = {
  theme: 'dark' as Theme,
  sidebarOpen: true,
  sidebarWidth: 280,
  previewPanelOpen: false,
  previewPanelWidth: 400,
  activeTab: 'chat',
  activeRoute: '/',
  modals: [],
  notifications: [],
  inputFocused: false,
  inputValue: '',
  isMobile: false,
  mobileMenuOpen: false,
  isPageLoading: false,
  loadingMessage: null,
};

/**
 * UI store with persistence for layout preferences
 */
export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        ...defaultState,

        // Sidebar actions
        toggleSidebar: () => {
          set((state) => ({ sidebarOpen: !state.sidebarOpen }), false, 'toggleSidebar');
        },

        setSidebarOpen: (open) => {
          set({ sidebarOpen: open }, false, 'setSidebarOpen');
        },

        setSidebarWidth: (width) => {
          // Clamp width between min and max
          const clampedWidth = Math.max(200, Math.min(500, width));
          set({ sidebarWidth: clampedWidth }, false, 'setSidebarWidth');
        },

        // Preview panel actions
        togglePreview: () => {
          set((state) => ({ previewPanelOpen: !state.previewPanelOpen }), false, 'togglePreview');
        },

        setPreviewPanelOpen: (open) => {
          set({ previewPanelOpen: open }, false, 'setPreviewPanelOpen');
        },

        setPreviewPanelWidth: (width) => {
          const clampedWidth = Math.max(300, Math.min(800, width));
          set({ previewPanelWidth: clampedWidth }, false, 'setPreviewPanelWidth');
        },

        // Navigation actions
        setActiveTab: (tab) => {
          set({ activeTab: tab }, false, 'setActiveTab');
        },

        setActiveRoute: (route) => {
          set({ activeRoute: route }, false, 'setActiveRoute');
        },

        // Modal actions
        openModal: (config) => {
          set(
            (state) => ({
              modals: [...state.modals, config],
            }),
            false,
            'openModal'
          );
        },

        closeModal: (id) => {
          set(
            (state) => ({
              modals: state.modals.filter((m) => m.id !== id),
            }),
            false,
            'closeModal'
          );
        },

        closeAllModals: () => {
          set({ modals: [] }, false, 'closeAllModals');
        },

        // Notification actions
        addNotification: (notification) => {
          const id = generateId();
          const newNotification: Notification = {
            ...notification,
            id,
            createdAt: Date.now(),
            dismissible: notification.dismissible ?? true,
          };

          set(
            (state) => ({
              notifications: [...state.notifications, newNotification],
            }),
            false,
            'addNotification'
          );

          // Auto-remove after duration
          const duration = notification.duration ?? 5000;
          if (duration > 0) {
            setTimeout(() => {
              get().removeNotification(id);
            }, duration);
          }

          return id;
        },

        removeNotification: (id) => {
          set(
            (state) => ({
              notifications: state.notifications.filter((n) => n.id !== id),
            }),
            false,
            'removeNotification'
          );
        },

        clearNotifications: () => {
          set({ notifications: [] }, false, 'clearNotifications');
        },

        // Input actions
        setInputFocused: (focused) => {
          set({ inputFocused: focused }, false, 'setInputFocused');
        },

        setInputValue: (value) => {
          set({ inputValue: value }, false, 'setInputValue');
        },

        clearInput: () => {
          set({ inputValue: '' }, false, 'clearInput');
        },

        // Mobile actions
        setIsMobile: (isMobile) => {
          set(
            {
              isMobile,
              // Close sidebar on mobile by default
              sidebarOpen: isMobile ? false : get().sidebarOpen,
            },
            false,
            'setIsMobile'
          );
        },

        toggleMobileMenu: () => {
          set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen }), false, 'toggleMobileMenu');
        },

        setMobileMenuOpen: (open) => {
          set({ mobileMenuOpen: open }, false, 'setMobileMenuOpen');
        },

        // Loading actions
        setPageLoading: (loading, message) => {
          set(
            {
              isPageLoading: loading,
              loadingMessage: loading ? message || null : null,
            },
            false,
            'setPageLoading'
          );
        },

        // Theme actions
        setTheme: (theme) => {
          applyThemeToDOM(theme);
          set({ theme }, false, 'setTheme');
        },

        toggleTheme: () => {
          const newTheme = get().theme === 'light' ? 'dark' : 'light';
          applyThemeToDOM(newTheme);
          set({ theme: newTheme }, false, 'toggleTheme');
        },

        initializeTheme: () => {
          // Check if we have a persisted theme, otherwise use system preference
          const persistedTheme = get().theme;
          const storageKey = 'leo-ui-storage';
          const hasPersistedTheme = typeof localStorage !== 'undefined' &&
            localStorage.getItem(storageKey) !== null;

          const theme = hasPersistedTheme ? persistedTheme : getSystemTheme();

          // Update state if using system theme
          if (!hasPersistedTheme && theme !== persistedTheme) {
            set({ theme }, false, 'initializeTheme');
          }

          applyThemeToDOM(theme);
        },

        // Reset UI
        resetUI: () => {
          set(defaultState, false, 'resetUI');
          applyThemeToDOM(defaultState.theme);
        },
      }),
      {
        name: 'leo-ui-storage',
        partialize: (state) => ({
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
          sidebarWidth: state.sidebarWidth,
          previewPanelOpen: state.previewPanelOpen,
          previewPanelWidth: state.previewPanelWidth,
          activeTab: state.activeTab,
        }),
      }
    ),
    { name: 'UIStore', enabled: import.meta.env.DEV }
  )
);

// Selectors for optimized re-renders
export const selectTheme = (state: UIState) => state.theme;
export const selectSidebarOpen = (state: UIState) => state.sidebarOpen;
export const selectSidebarWidth = (state: UIState) => state.sidebarWidth;
export const selectPreviewPanelOpen = (state: UIState) => state.previewPanelOpen;
export const selectPreviewPanelWidth = (state: UIState) => state.previewPanelWidth;
export const selectActiveTab = (state: UIState) => state.activeTab;
export const selectActiveRoute = (state: UIState) => state.activeRoute;
export const selectModals = (state: UIState) => state.modals;
export const selectNotifications = (state: UIState) => state.notifications;
export const selectInputFocused = (state: UIState) => state.inputFocused;
export const selectInputValue = (state: UIState) => state.inputValue;
export const selectIsMobile = (state: UIState) => state.isMobile;
export const selectMobileMenuOpen = (state: UIState) => state.mobileMenuOpen;
export const selectIsPageLoading = (state: UIState) => state.isPageLoading;
export const selectLoadingMessage = (state: UIState) => state.loadingMessage;

// Derived selectors
export const selectHasModals = (state: UIState) => state.modals.length > 0;
export const selectHasNotifications = (state: UIState) => state.notifications.length > 0;
export const selectTopModal = (state: UIState) =>
  state.modals.length > 0 ? state.modals[state.modals.length - 1] : null;

export const selectLayoutDimensions = (state: UIState) => ({
  sidebarWidth: state.sidebarOpen ? state.sidebarWidth : 0,
  previewPanelWidth: state.previewPanelOpen ? state.previewPanelWidth : 0,
});

export default useUIStore;
