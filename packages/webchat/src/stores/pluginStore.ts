import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { Plugin } from '../types';

/**
 * Extended plugin interface with lifecycle methods
 */
export interface PluginWithLifecycle extends Plugin {
  // Lifecycle hooks
  onActivate?: () => void | Promise<void>;
  onDeactivate?: () => void | Promise<void>;
  onMessage?: (message: unknown) => void;

  // Rendering (stored separately, not persisted)
  version?: string;
  author?: string;
  homepage?: string;
}

/**
 * Plugin registration info (minimal, for persistence)
 */
interface PluginRegistration {
  id: string;
  name: string;
  type: Plugin['type'];
  enabled: boolean;
  config?: Record<string, unknown>;
}

/**
 * Plugin state interface
 */
interface PluginState {
  // Core data (Map stored as array for persistence)
  registrations: PluginRegistration[];
  activePluginIds: string[];

  // Runtime data (not persisted)
  plugins: Map<string, PluginWithLifecycle>;

  // Loading states
  loadingPlugins: Set<string>;
  errors: Map<string, string>;

  // Actions
  registerPlugin: (plugin: PluginWithLifecycle) => void;
  unregisterPlugin: (id: string) => void;
  activatePlugin: (id: string) => Promise<boolean>;
  deactivatePlugin: (id: string) => Promise<boolean>;
  togglePlugin: (id: string) => Promise<boolean>;
  updatePluginConfig: (id: string, config: Record<string, unknown>) => void;
  getPlugin: (id: string) => PluginWithLifecycle | undefined;
  getActivePlugins: () => PluginWithLifecycle[];
  getPluginsByType: (type: Plugin['type']) => PluginWithLifecycle[];
  isPluginActive: (id: string) => boolean;
  clearError: (id: string) => void;
}

/**
 * Plugin store with persistence for active plugins
 */
export const usePluginStore = create<PluginState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        registrations: [],
        activePluginIds: [],
        plugins: new Map(),
        loadingPlugins: new Set(),
        errors: new Map(),

        // Register a plugin
        registerPlugin: (plugin) => {
          const registration: PluginRegistration = {
            id: plugin.id,
            name: plugin.name,
            type: plugin.type,
            enabled: plugin.enabled,
            config: plugin.config,
          };

          set(
            (state) => {
              const newPlugins = new Map(state.plugins);
              newPlugins.set(plugin.id, plugin);

              // Update or add registration
              const existingIdx = state.registrations.findIndex((r) => r.id === plugin.id);
              const newRegistrations =
                existingIdx >= 0
                  ? state.registrations.map((r, idx) => (idx === existingIdx ? registration : r))
                  : [...state.registrations, registration];

              return {
                plugins: newPlugins,
                registrations: newRegistrations,
              };
            },
            false,
            'registerPlugin'
          );
        },

        // Unregister a plugin
        unregisterPlugin: (id) => {
          // Deactivate first if active
          if (get().activePluginIds.includes(id)) {
            get().deactivatePlugin(id);
          }

          set(
            (state) => {
              const newPlugins = new Map(state.plugins);
              newPlugins.delete(id);

              return {
                plugins: newPlugins,
                registrations: state.registrations.filter((r) => r.id !== id),
              };
            },
            false,
            'unregisterPlugin'
          );
        },

        // Activate a plugin
        activatePlugin: async (id) => {
          const plugin = get().plugins.get(id);
          if (!plugin) {
            set(
              (state) => {
                const newErrors = new Map(state.errors);
                newErrors.set(id, 'Plugin not found');
                return { errors: newErrors };
              },
              false,
              'activatePlugin/notFound'
            );
            return false;
          }

          if (get().activePluginIds.includes(id)) {
            return true; // Already active
          }

          // Set loading state
          set(
            (state) => {
              const newLoading = new Set(state.loadingPlugins);
              newLoading.add(id);
              return { loadingPlugins: newLoading };
            },
            false,
            'activatePlugin/loading'
          );

          try {
            // Call lifecycle hook
            if (plugin.onActivate) {
              await plugin.onActivate();
            }

            set(
              (state) => {
                const newLoading = new Set(state.loadingPlugins);
                newLoading.delete(id);

                const newErrors = new Map(state.errors);
                newErrors.delete(id);

                return {
                  activePluginIds: [...state.activePluginIds, id],
                  registrations: state.registrations.map((r) =>
                    r.id === id ? { ...r, enabled: true } : r
                  ),
                  loadingPlugins: newLoading,
                  errors: newErrors,
                };
              },
              false,
              'activatePlugin/success'
            );

            return true;
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Activation failed';

            set(
              (state) => {
                const newLoading = new Set(state.loadingPlugins);
                newLoading.delete(id);

                const newErrors = new Map(state.errors);
                newErrors.set(id, message);

                return {
                  loadingPlugins: newLoading,
                  errors: newErrors,
                };
              },
              false,
              'activatePlugin/error'
            );

            return false;
          }
        },

        // Deactivate a plugin
        deactivatePlugin: async (id) => {
          const plugin = get().plugins.get(id);
          if (!plugin) {
            return false;
          }

          if (!get().activePluginIds.includes(id)) {
            return true; // Already inactive
          }

          // Set loading state
          set(
            (state) => {
              const newLoading = new Set(state.loadingPlugins);
              newLoading.add(id);
              return { loadingPlugins: newLoading };
            },
            false,
            'deactivatePlugin/loading'
          );

          try {
            // Call lifecycle hook
            if (plugin.onDeactivate) {
              await plugin.onDeactivate();
            }

            set(
              (state) => {
                const newLoading = new Set(state.loadingPlugins);
                newLoading.delete(id);

                return {
                  activePluginIds: state.activePluginIds.filter((pid) => pid !== id),
                  registrations: state.registrations.map((r) =>
                    r.id === id ? { ...r, enabled: false } : r
                  ),
                  loadingPlugins: newLoading,
                };
              },
              false,
              'deactivatePlugin/success'
            );

            return true;
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Deactivation failed';

            set(
              (state) => {
                const newLoading = new Set(state.loadingPlugins);
                newLoading.delete(id);

                const newErrors = new Map(state.errors);
                newErrors.set(id, message);

                return {
                  loadingPlugins: newLoading,
                  errors: newErrors,
                };
              },
              false,
              'deactivatePlugin/error'
            );

            return false;
          }
        },

        // Toggle plugin
        togglePlugin: async (id) => {
          if (get().activePluginIds.includes(id)) {
            return get().deactivatePlugin(id);
          }
          return get().activatePlugin(id);
        },

        // Update plugin config
        updatePluginConfig: (id, config) => {
          set(
            (state) => {
              const plugin = state.plugins.get(id);
              if (!plugin) return state;

              const newPlugins = new Map(state.plugins);
              newPlugins.set(id, { ...plugin, config: { ...plugin.config, ...config } });

              return {
                plugins: newPlugins,
                registrations: state.registrations.map((r) =>
                  r.id === id ? { ...r, config: { ...r.config, ...config } } : r
                ),
              };
            },
            false,
            'updatePluginConfig'
          );
        },

        // Get plugin by ID
        getPlugin: (id) => {
          return get().plugins.get(id);
        },

        // Get all active plugins
        getActivePlugins: () => {
          const { plugins, activePluginIds } = get();
          return activePluginIds
            .map((id) => plugins.get(id))
            .filter((p): p is PluginWithLifecycle => p !== undefined);
        },

        // Get plugins by type
        getPluginsByType: (type) => {
          const { plugins } = get();
          return Array.from(plugins.values()).filter((p) => p.type === type);
        },

        // Check if plugin is active
        isPluginActive: (id) => {
          return get().activePluginIds.includes(id);
        },

        // Clear error for plugin
        clearError: (id) => {
          set(
            (state) => {
              const newErrors = new Map(state.errors);
              newErrors.delete(id);
              return { errors: newErrors };
            },
            false,
            'clearError'
          );
        },
      }),
      {
        name: 'leo-plugin-storage',
        partialize: (state) => ({
          registrations: state.registrations,
          activePluginIds: state.activePluginIds,
        }),
        // Custom storage to handle Map/Set serialization
        storage: {
          getItem: (name) => {
            const str = localStorage.getItem(name);
            if (!str) return null;
            return JSON.parse(str);
          },
          setItem: (name, value) => {
            localStorage.setItem(name, JSON.stringify(value));
          },
          removeItem: (name) => {
            localStorage.removeItem(name);
          },
        },
      }
    ),
    { name: 'PluginStore', enabled: import.meta.env.DEV }
  )
);

// Selectors for optimized re-renders
export const selectRegistrations = (state: PluginState) => state.registrations;
export const selectActivePluginIds = (state: PluginState) => state.activePluginIds;
export const selectLoadingPlugins = (state: PluginState) => state.loadingPlugins;
export const selectErrors = (state: PluginState) => state.errors;

// Derived selectors
export const selectPluginCount = (state: PluginState) => state.registrations.length;
export const selectActivePluginCount = (state: PluginState) => state.activePluginIds.length;

export const selectPluginError = (id: string) => (state: PluginState) => state.errors.get(id);

export const selectIsPluginLoading = (id: string) => (state: PluginState) =>
  state.loadingPlugins.has(id);

export default usePluginStore;
