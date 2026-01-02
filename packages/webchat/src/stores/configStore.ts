import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { Theme } from '../types';

/**
 * Model definition for LLM selection
 */
export interface ModelDefinition {
  id: string;
  name: string;
  provider: string;
  icon: string;
  free: boolean;
  description?: string;
}

/**
 * Available models for selection
 */
export const AVAILABLE_MODELS: ModelDefinition[] = [
  // AUTO option
  { id: 'auto', name: 'Auto', provider: 'LEO', icon: '⚡', free: true, description: 'Selezione automatica intelligente' },
  // FREE models
  { id: 'llama-3.3-free', name: 'Llama 3.3 70B', provider: 'Meta', icon: '🦙', free: true, description: 'Ottimo modello gratuito' },
  { id: 'gemini-flash-free', name: 'Gemini 2.0 Flash', provider: 'Google', icon: '💎', free: true, description: 'Veloce e gratuito' },
  { id: 'qwen-2.5-free', name: 'Qwen 2.5 72B', provider: 'Alibaba', icon: '🔮', free: true, description: 'Multilingue gratuito' },
  // PREMIUM models
  { id: 'claude-sonnet', name: 'Claude Sonnet 4.5', provider: 'Anthropic', icon: '🟣', free: false, description: 'Ottimo per coding e agenti' },
  { id: 'claude-haiku', name: 'Claude Haiku 4.5', provider: 'Anthropic', icon: '🟣', free: false, description: 'Veloce ed economico' },
  { id: 'claude-opus', name: 'Claude Opus 4.5', provider: 'Anthropic', icon: '🟣', free: false, description: 'Massima capacità ragionamento' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', icon: '🟢', free: false, description: 'Flagship multimodale' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', icon: '🟢', free: false, description: 'Economico' },
  { id: 'gemini-flash', name: 'Gemini 2.5 Flash', provider: 'Google', icon: '💎', free: false, description: 'Veloce ed efficiente' },
  { id: 'deepseek-chat', name: 'DeepSeek V3', provider: 'DeepSeek', icon: '🔵', free: false, description: 'Ottimo rapporto qualità/prezzo' },
  { id: 'mistral-large', name: 'Mistral Large', provider: 'Mistral', icon: '🔷', free: false, description: 'Flagship europeo' },
  { id: 'devstral', name: 'Devstral', provider: 'Mistral', icon: '🔷', free: false, description: 'Specialista coding' },
];

/**
 * Configuration state for LEO Webchat
 */
interface ConfigState {
  // Configuration values
  apiUrl: string;
  theme: Theme;
  language: string;
  streamingEnabled: boolean;
  debugMode: boolean;
  selectedModel: string;

  // Feature flags
  features: {
    attachments: boolean;
    voice: boolean;
    memory: boolean;
    tools: boolean;
  };

  // Branding
  branding: {
    name: string;
    logo: string | null;
    primaryColor: string;
  };

  // Actions
  setTheme: (theme: Theme) => void;
  setLanguage: (language: string) => void;
  setApiUrl: (url: string) => void;
  toggleDebug: () => void;
  setStreamingEnabled: (enabled: boolean) => void;
  setSelectedModel: (model: string) => void;
  setFeature: (feature: keyof ConfigState['features'], enabled: boolean) => void;
  setBranding: (branding: Partial<ConfigState['branding']>) => void;
  resetConfig: () => void;
}

/**
 * Default configuration values
 */
const defaultConfig = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  theme: 'system' as Theme,
  language: navigator.language.split('-')[0] || 'it',
  streamingEnabled: true,
  debugMode: import.meta.env.DEV || false,
  selectedModel: 'llama-3.3-free',  // Default to free model
  features: {
    attachments: true,
    voice: false,
    memory: true,
    tools: true,
  },
  branding: {
    name: 'LEO',
    logo: null,
    primaryColor: '#1E3A5F',
  },
};

/**
 * Detect system theme preference
 */
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * Apply theme to document
 */
const applyTheme = (theme: Theme): void => {
  if (typeof document === 'undefined') return;

  const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(effectiveTheme);
  document.documentElement.setAttribute('data-theme', effectiveTheme);
};

/**
 * Config store with persistence
 */
export const useConfigStore = create<ConfigState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        ...defaultConfig,

        // Theme action
        setTheme: (theme) => {
          applyTheme(theme);
          set({ theme }, false, 'setTheme');
        },

        // Language action
        setLanguage: (language) => {
          set({ language }, false, 'setLanguage');
        },

        // API URL action
        setApiUrl: (apiUrl) => {
          set({ apiUrl }, false, 'setApiUrl');
        },

        // Debug mode toggle
        toggleDebug: () => {
          set((state) => ({ debugMode: !state.debugMode }), false, 'toggleDebug');
        },

        // Streaming toggle
        setStreamingEnabled: (enabled) => {
          set({ streamingEnabled: enabled }, false, 'setStreamingEnabled');
        },

        // Model selection
        setSelectedModel: (model) => {
          set({ selectedModel: model }, false, 'setSelectedModel');
        },

        // Feature flag action
        setFeature: (feature, enabled) => {
          set(
            (state) => ({
              features: { ...state.features, [feature]: enabled },
            }),
            false,
            'setFeature'
          );
        },

        // Branding action
        setBranding: (branding) => {
          set(
            (state) => ({
              branding: { ...state.branding, ...branding },
            }),
            false,
            'setBranding'
          );
        },

        // Reset to defaults
        resetConfig: () => {
          applyTheme(defaultConfig.theme);
          set(defaultConfig, false, 'resetConfig');
        },
      }),
      {
        name: 'leo-config-storage',
        partialize: (state) => ({
          theme: state.theme,
          language: state.language,
          streamingEnabled: state.streamingEnabled,
          debugMode: state.debugMode,
          selectedModel: state.selectedModel,
          features: state.features,
        }),
        onRehydrateStorage: () => (state) => {
          // Apply theme on rehydration
          if (state?.theme) {
            applyTheme(state.theme);
          }
        },
      }
    ),
    { name: 'ConfigStore', enabled: import.meta.env.DEV }
  )
);

// Selectors for optimized re-renders
export const selectTheme = (state: ConfigState) => state.theme;
export const selectLanguage = (state: ConfigState) => state.language;
export const selectApiUrl = (state: ConfigState) => state.apiUrl;
export const selectDebugMode = (state: ConfigState) => state.debugMode;
export const selectStreamingEnabled = (state: ConfigState) => state.streamingEnabled;
export const selectSelectedModel = (state: ConfigState) => state.selectedModel;
export const selectFeatures = (state: ConfigState) => state.features;
export const selectBranding = (state: ConfigState) => state.branding;

export default useConfigStore;
