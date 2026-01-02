/**
 * LEO Webchat Plugin System - Core Module
 *
 * Exports all core plugin system components including types,
 * the plugin manager, and React context/hooks.
 */

// Types
export type {
  Plugin,
  PluginType,
  PluginState,
  PluginPanelProps,
  PluginMessageProps,
  PluginIconProps,
  PluginConfig,
  PluginMeta,
  PluginCapabilities,
  RegisteredPlugin,
  PluginManagerEvents,
  PluginManagerConfig,
  PluginRegistrationOptions,
  PluginContextValue,
} from './types';

// Plugin Manager
export {
  PluginManager,
  getPluginManager,
  resetPluginManager,
} from './PluginManager';

// React Context and Hooks
export {
  PluginProvider,
  usePluginContext,
  usePlugin,
  usePlugins,
  usePluginsByType,
  useActivePlugins,
  useActivePluginsByType,
  usePluginRegistration,
  usePluginActivation,
  usePluginConfig,
  usePluginSystemAvailable,
} from './PluginContext';

export { default as PluginContext } from './PluginContext';
