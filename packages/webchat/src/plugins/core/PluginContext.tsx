/**
 * LEO Webchat Plugin System - React Context
 *
 * Provides React context and hooks for accessing the plugin system
 * throughout the application component tree.
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from 'react';

import { getPluginManager } from './PluginManager';
import type {
  Plugin,
  PluginType,
  RegisteredPlugin,
  PluginContextValue,
  PluginRegistrationOptions,
  PluginManagerConfig,
} from './types';

/**
 * Plugin context
 */
const PluginContext = createContext<PluginContextValue | null>(null);

/**
 * Plugin provider props
 */
interface PluginProviderProps {
  /** Child components */
  children: ReactNode;
  /** Plugin manager configuration */
  config?: PluginManagerConfig;
  /** Initial plugins to register */
  initialPlugins?: Array<{ plugin: Plugin; options?: PluginRegistrationOptions }>;
}

/**
 * Plugin Provider Component
 *
 * Wraps the application to provide plugin context to all child components.
 */
export function PluginProvider({
  children,
  config,
  initialPlugins = [],
}: PluginProviderProps): JSX.Element {
  // Initialize plugin manager with event handlers that trigger re-renders
  const [updateCounter, setUpdateCounter] = useState(0);

  const manager = useMemo(() => {
    const mgr = getPluginManager({
      ...config,
      events: {
        ...config?.events,
        onPluginRegistered: (plugin) => {
          config?.events?.onPluginRegistered?.(plugin);
          setUpdateCounter((c) => c + 1);
        },
        onPluginUnregistered: (id) => {
          config?.events?.onPluginUnregistered?.(id);
          setUpdateCounter((c) => c + 1);
        },
        onPluginActivated: (plugin) => {
          config?.events?.onPluginActivated?.(plugin);
          setUpdateCounter((c) => c + 1);
        },
        onPluginDeactivated: (id) => {
          config?.events?.onPluginDeactivated?.(id);
          setUpdateCounter((c) => c + 1);
        },
        onPluginError: (id, error) => {
          config?.events?.onPluginError?.(id, error);
          setUpdateCounter((c) => c + 1);
        },
      },
    });
    return mgr;
  }, [config]);

  // Register initial plugins on mount
  useEffect(() => {
    initialPlugins.forEach(({ plugin, options }) => {
      try {
        manager.register(plugin, options);
      } catch (error) {
        console.error(`Failed to register initial plugin ${plugin.id}:`, error);
      }
    });
  }, [initialPlugins, manager]);

  // Create plugin map for context
  const plugins = useMemo(() => {
    // Use updateCounter to trigger memo recalculation
    void updateCounter;
    const map = new Map<string, RegisteredPlugin>();
    manager.getAllPlugins().forEach((registered) => {
      map.set(registered.plugin.id, registered);
    });
    return map;
  }, [manager, updateCounter]);

  // Context methods
  const getPlugin = useCallback(
    (id: string): RegisteredPlugin | undefined => {
      return manager.getPlugin(id);
    },
    [manager]
  );

  const getAllPlugins = useCallback((): RegisteredPlugin[] => {
    return manager.getAllPlugins();
  }, [manager]);

  const getPluginsByType = useCallback(
    (type: PluginType): RegisteredPlugin[] => {
      return manager.getPluginsByType(type);
    },
    [manager]
  );

  const registerPlugin = useCallback(
    (plugin: Plugin, options?: PluginRegistrationOptions): void => {
      manager.register(plugin, options);
    },
    [manager]
  );

  const unregisterPlugin = useCallback(
    (id: string): void => {
      manager.unregister(id);
    },
    [manager]
  );

  const activatePlugin = useCallback(
    async (id: string): Promise<void> => {
      await manager.activate(id);
    },
    [manager]
  );

  const deactivatePlugin = useCallback(
    async (id: string): Promise<void> => {
      await manager.deactivate(id);
    },
    [manager]
  );

  const updatePluginConfig = useCallback(
    (id: string, newConfig: Record<string, unknown>): void => {
      manager.updateConfig(id, newConfig);
      setUpdateCounter((c) => c + 1);
    },
    [manager]
  );

  const isPluginActive = useCallback(
    (id: string): boolean => {
      return manager.isActive(id);
    },
    [manager]
  );

  const contextValue: PluginContextValue = useMemo(
    () => ({
      plugins,
      getPlugin,
      getAllPlugins,
      getPluginsByType,
      registerPlugin,
      unregisterPlugin,
      activatePlugin,
      deactivatePlugin,
      updatePluginConfig,
      isPluginActive,
    }),
    [
      plugins,
      getPlugin,
      getAllPlugins,
      getPluginsByType,
      registerPlugin,
      unregisterPlugin,
      activatePlugin,
      deactivatePlugin,
      updatePluginConfig,
      isPluginActive,
    ]
  );

  return <PluginContext.Provider value={contextValue}>{children}</PluginContext.Provider>;
}

/**
 * Hook to access the full plugin context
 *
 * @returns The plugin context value
 * @throws Error if used outside of PluginProvider
 */
export function usePluginContext(): PluginContextValue {
  const context = useContext(PluginContext);
  if (!context) {
    throw new Error('usePluginContext must be used within a PluginProvider');
  }
  return context;
}

/**
 * Hook to get a specific plugin by ID
 *
 * @param id - The plugin ID
 * @returns The registered plugin or undefined
 */
export function usePlugin(id: string): RegisteredPlugin | undefined {
  const { getPlugin } = usePluginContext();
  return useMemo(() => getPlugin(id), [getPlugin, id]);
}

/**
 * Hook to get all registered plugins
 *
 * @returns Array of all registered plugins
 */
export function usePlugins(): RegisteredPlugin[] {
  const { getAllPlugins } = usePluginContext();
  return useMemo(() => getAllPlugins(), [getAllPlugins]);
}

/**
 * Hook to get plugins filtered by type
 *
 * @param type - The plugin type to filter by
 * @returns Array of plugins matching the type
 */
export function usePluginsByType(type: PluginType): RegisteredPlugin[] {
  const { getPluginsByType } = usePluginContext();
  return useMemo(() => getPluginsByType(type), [getPluginsByType, type]);
}

/**
 * Hook to get only active plugins
 *
 * @returns Array of active plugins
 */
export function useActivePlugins(): RegisteredPlugin[] {
  const { getAllPlugins } = usePluginContext();
  return useMemo(
    () => getAllPlugins().filter((p) => p.state === 'active'),
    [getAllPlugins]
  );
}

/**
 * Hook to get active plugins filtered by type
 *
 * @param type - The plugin type to filter by
 * @returns Array of active plugins matching the type
 */
export function useActivePluginsByType(type: PluginType): RegisteredPlugin[] {
  const { getPluginsByType } = usePluginContext();
  return useMemo(
    () => getPluginsByType(type).filter((p) => p.state === 'active'),
    [getPluginsByType, type]
  );
}

/**
 * Hook for plugin registration operations
 *
 * @returns Object with register and unregister functions
 */
export function usePluginRegistration() {
  const { registerPlugin, unregisterPlugin } = usePluginContext();
  return { registerPlugin, unregisterPlugin };
}

/**
 * Hook for plugin activation operations
 *
 * @returns Object with activate, deactivate, and isActive functions
 */
export function usePluginActivation() {
  const { activatePlugin, deactivatePlugin, isPluginActive } = usePluginContext();
  return { activatePlugin, deactivatePlugin, isPluginActive };
}

/**
 * Hook for plugin configuration
 *
 * @param id - The plugin ID
 * @returns Object with config and updateConfig function
 */
export function usePluginConfig(id: string) {
  const { getPlugin, updatePluginConfig } = usePluginContext();
  const registered = getPlugin(id);

  const updateConfig = useCallback(
    (config: Record<string, unknown>) => {
      updatePluginConfig(id, config);
    },
    [updatePluginConfig, id]
  );

  return {
    config: registered?.config ?? {},
    updateConfig,
  };
}

/**
 * Hook to check if plugin system is available
 *
 * @returns True if inside PluginProvider
 */
export function usePluginSystemAvailable(): boolean {
  const context = useContext(PluginContext);
  return context !== null;
}

export default PluginContext;
