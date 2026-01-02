/**
 * LEO Webchat Plugin System - Plugin Manager
 *
 * Manages plugin registration, activation, and lifecycle.
 * Provides a singleton interface for managing all plugins in the application.
 */

import type {
  Plugin,
  PluginType,
  RegisteredPlugin,
  PluginManagerConfig,
  PluginManagerEvents,
  PluginRegistrationOptions,
} from './types';

/**
 * Default plugin manager configuration
 */
const DEFAULT_CONFIG: PluginManagerConfig = {
  debug: false,
  autoActivate: false,
  storageKey: 'leo-webchat-plugins',
};

/**
 * Plugin Manager Class
 *
 * Handles all plugin operations including registration, activation,
 * deactivation, and configuration management.
 */
export class PluginManager {
  private plugins: Map<string, RegisteredPlugin> = new Map();
  private config: PluginManagerConfig;
  private events: Partial<PluginManagerEvents>;

  constructor(config: PluginManagerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.events = config.events || {};
    this.loadPersistedState();
  }

  /**
   * Log debug messages if debug mode is enabled
   */
  private log(message: string, ...args: unknown[]): void {
    if (this.config.debug) {
      console.log(`[PluginManager] ${message}`, ...args);
    }
  }

  /**
   * Load persisted plugin state from storage
   */
  private loadPersistedState(): void {
    if (typeof window === 'undefined' || !this.config.storageKey) return;

    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const state = JSON.parse(stored);
        this.log('Loaded persisted state', state);
        // State will be applied when plugins are registered
      }
    } catch (error) {
      this.log('Failed to load persisted state', error);
    }
  }

  /**
   * Persist plugin state to storage
   */
  private persistState(): void {
    if (typeof window === 'undefined' || !this.config.storageKey) return;

    try {
      const state: Record<string, { config: Record<string, unknown>; active: boolean }> = {};
      this.plugins.forEach((registered, id) => {
        state[id] = {
          config: registered.config,
          active: registered.state === 'active',
        };
      });
      localStorage.setItem(this.config.storageKey, JSON.stringify(state));
      this.log('Persisted state');
    } catch (error) {
      this.log('Failed to persist state', error);
    }
  }

  /**
   * Validate a plugin before registration
   */
  private validatePlugin(plugin: Plugin): void {
    if (!plugin.id || typeof plugin.id !== 'string') {
      throw new Error('Plugin must have a valid string ID');
    }
    if (!plugin.type || !['tool', 'channel', 'memory'].includes(plugin.type)) {
      throw new Error('Plugin must have a valid type: tool, channel, or memory');
    }
    if (!plugin.name || typeof plugin.name !== 'string') {
      throw new Error('Plugin must have a valid name');
    }
    if (!plugin.version || typeof plugin.version !== 'string') {
      throw new Error('Plugin must have a valid version');
    }
    if (typeof plugin.renderIcon !== 'function') {
      throw new Error('Plugin must implement renderIcon function');
    }
  }

  /**
   * Register a plugin
   *
   * @param plugin - The plugin to register
   * @param options - Registration options
   */
  register(plugin: Plugin, options: PluginRegistrationOptions = {}): void {
    this.validatePlugin(plugin);

    const existing = this.plugins.get(plugin.id);
    if (existing && !options.override) {
      throw new Error(`Plugin with ID "${plugin.id}" is already registered. Use override option to replace.`);
    }

    // Build initial config from schema defaults
    const initialConfig: Record<string, unknown> = {};
    if (plugin.configSchema) {
      plugin.configSchema.forEach((configItem) => {
        if (configItem.defaultValue !== undefined) {
          initialConfig[configItem.key] = configItem.defaultValue;
        }
      });
    }

    const registered: RegisteredPlugin = {
      plugin,
      state: 'inactive',
      config: { ...initialConfig, ...options.config },
      registeredAt: new Date(),
    };

    this.plugins.set(plugin.id, registered);
    this.log(`Registered plugin: ${plugin.id}`);

    this.events.onPluginRegistered?.(plugin);

    // Auto-activate if configured or requested
    if (this.config.autoActivate || options.activate) {
      this.activate(plugin.id).catch((error) => {
        this.log(`Failed to auto-activate plugin ${plugin.id}`, error);
      });
    }

    this.persistState();
  }

  /**
   * Unregister a plugin
   *
   * @param id - The plugin ID to unregister
   */
  unregister(id: string): void {
    const registered = this.plugins.get(id);
    if (!registered) {
      this.log(`Plugin not found: ${id}`);
      return;
    }

    // Deactivate first if active
    if (registered.state === 'active') {
      this.deactivate(id).catch((error) => {
        this.log(`Failed to deactivate plugin ${id} before unregistering`, error);
      });
    }

    this.plugins.delete(id);
    this.log(`Unregistered plugin: ${id}`);

    this.events.onPluginUnregistered?.(id);
    this.persistState();
  }

  /**
   * Get a registered plugin by ID
   *
   * @param id - The plugin ID
   * @returns The registered plugin or undefined
   */
  getPlugin(id: string): RegisteredPlugin | undefined {
    return this.plugins.get(id);
  }

  /**
   * Get all registered plugins
   *
   * @returns Array of all registered plugins
   */
  getAllPlugins(): RegisteredPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins filtered by type
   *
   * @param type - The plugin type to filter by
   * @returns Array of plugins matching the type
   */
  getPluginsByType(type: PluginType): RegisteredPlugin[] {
    return this.getAllPlugins().filter((registered) => registered.plugin.type === type);
  }

  /**
   * Get active plugins
   *
   * @returns Array of active plugins
   */
  getActivePlugins(): RegisteredPlugin[] {
    return this.getAllPlugins().filter((registered) => registered.state === 'active');
  }

  /**
   * Activate a plugin
   *
   * @param id - The plugin ID to activate
   */
  async activate(id: string): Promise<void> {
    const registered = this.plugins.get(id);
    if (!registered) {
      throw new Error(`Plugin not found: ${id}`);
    }

    if (registered.state === 'active') {
      this.log(`Plugin already active: ${id}`);
      return;
    }

    this.log(`Activating plugin: ${id}`);

    try {
      if (registered.plugin.onActivate) {
        await registered.plugin.onActivate();
      }

      registered.state = 'active';
      registered.activatedAt = new Date();
      registered.error = undefined;

      this.log(`Activated plugin: ${id}`);
      this.events.onPluginActivated?.(registered.plugin);
      this.persistState();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      registered.state = 'error';
      registered.error = errorMessage;

      this.log(`Failed to activate plugin ${id}:`, error);
      this.events.onPluginError?.(id, error instanceof Error ? error : new Error(errorMessage));
      throw error;
    }
  }

  /**
   * Deactivate a plugin
   *
   * @param id - The plugin ID to deactivate
   */
  async deactivate(id: string): Promise<void> {
    const registered = this.plugins.get(id);
    if (!registered) {
      throw new Error(`Plugin not found: ${id}`);
    }

    if (registered.state !== 'active') {
      this.log(`Plugin not active: ${id}`);
      return;
    }

    this.log(`Deactivating plugin: ${id}`);

    try {
      if (registered.plugin.onDeactivate) {
        await registered.plugin.onDeactivate();
      }

      registered.state = 'inactive';
      registered.error = undefined;

      this.log(`Deactivated plugin: ${id}`);
      this.events.onPluginDeactivated?.(id);
      this.persistState();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Failed to deactivate plugin ${id}:`, error);
      this.events.onPluginError?.(id, error instanceof Error ? error : new Error(errorMessage));
      // Still mark as inactive even if deactivation fails
      registered.state = 'inactive';
      this.persistState();
      throw error;
    }
  }

  /**
   * Check if a plugin is active
   *
   * @param id - The plugin ID
   * @returns True if the plugin is active
   */
  isActive(id: string): boolean {
    const registered = this.plugins.get(id);
    return registered?.state === 'active';
  }

  /**
   * Update plugin configuration
   *
   * @param id - The plugin ID
   * @param config - New configuration values (merged with existing)
   */
  updateConfig(id: string, config: Record<string, unknown>): void {
    const registered = this.plugins.get(id);
    if (!registered) {
      throw new Error(`Plugin not found: ${id}`);
    }

    // Validate config against schema if available
    if (registered.plugin.configSchema) {
      for (const [key, value] of Object.entries(config)) {
        const schemaItem = registered.plugin.configSchema.find((item) => item.key === key);
        if (schemaItem?.validate) {
          const result = schemaItem.validate(value);
          if (result !== true) {
            throw new Error(`Invalid config value for "${key}": ${result}`);
          }
        }
      }
    }

    registered.config = { ...registered.config, ...config };
    this.log(`Updated config for plugin ${id}:`, config);

    // Notify plugin of config change
    registered.plugin.onConfigChange?.(registered.config);
    this.persistState();
  }

  /**
   * Get plugin configuration
   *
   * @param id - The plugin ID
   * @returns The plugin configuration
   */
  getConfig(id: string): Record<string, unknown> | undefined {
    return this.plugins.get(id)?.config;
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    const ids = Array.from(this.plugins.keys());
    for (const id of ids) {
      this.unregister(id);
    }
    this.log('Cleared all plugins');
  }

  /**
   * Get plugin count
   */
  get count(): number {
    return this.plugins.size;
  }

  /**
   * Get plugins as array for iteration
   */
  [Symbol.iterator](): IterableIterator<[string, RegisteredPlugin]> {
    return this.plugins.entries();
  }
}

/**
 * Global plugin manager instance
 */
let globalPluginManager: PluginManager | null = null;

/**
 * Get or create the global plugin manager instance
 *
 * @param config - Optional configuration for the manager
 * @returns The global plugin manager instance
 */
export function getPluginManager(config?: PluginManagerConfig): PluginManager {
  if (!globalPluginManager) {
    globalPluginManager = new PluginManager(config);
  }
  return globalPluginManager;
}

/**
 * Reset the global plugin manager (useful for testing)
 */
export function resetPluginManager(): void {
  globalPluginManager?.clear();
  globalPluginManager = null;
}

export default PluginManager;
