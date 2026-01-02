/**
 * LEO Webchat Plugin System
 *
 * Main entry point for the modular plugin architecture.
 * Exports all plugin types, managers, contexts, and built-in plugins.
 *
 * @example
 * ```tsx
 * import {
 *   PluginProvider,
 *   usePlugins,
 *   usePluginsByType,
 *   BrowserPlugin,
 *   WebPlugin,
 *   MemoryL3Plugin,
 * } from './plugins';
 *
 * // Wrap app with provider
 * <PluginProvider initialPlugins={[
 *   { plugin: BrowserPlugin, options: { activate: true } },
 *   { plugin: WebPlugin, options: { activate: true } },
 *   { plugin: MemoryL3Plugin, options: { activate: true } },
 * ]}>
 *   <App />
 * </PluginProvider>
 *
 * // Use plugins in components
 * function PluginList() {
 *   const tools = usePluginsByType('tool');
 *   return tools.map(p => <div key={p.plugin.id}>{p.plugin.name}</div>);
 * }
 * ```
 */

// ============================================================================
// Core - Types, Manager, and Context
// ============================================================================

export type {
  // Plugin types
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
  // Manager types
  PluginManagerEvents,
  PluginManagerConfig,
  PluginRegistrationOptions,
  // Context types
  PluginContextValue,
} from './core';

export {
  // Plugin Manager
  PluginManager,
  getPluginManager,
  resetPluginManager,
  // React Context and Hooks
  PluginProvider,
  PluginContext,
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
} from './core';

// ============================================================================
// Tools - Browser, Search, Code, etc.
// ============================================================================

export { BrowserPlugin, toolPlugins } from './tools';
export type { BrowserAction, BrowserExecutionData } from './tools';

// ============================================================================
// Channels - Web, WhatsApp, Email, etc.
// ============================================================================

export { WebPlugin, channelPlugins } from './channels';
export type { WebChannelConfig, WebChannelStatus } from './channels';

// ============================================================================
// Memory - L0-L4 Memory Layers
// ============================================================================

export { MemoryL3Plugin, memoryPlugins } from './memory';
export type {
  MemoryFact,
  MemoryCategory,
  MemorySearchResult,
  MemoryL3MessageData,
} from './memory';

// ============================================================================
// All Built-in Plugins
// ============================================================================

import { toolPlugins } from './tools';
import { channelPlugins } from './channels';
import { memoryPlugins } from './memory';
import type { Plugin } from './core';

/**
 * All built-in plugins grouped by type
 */
export const builtinPlugins = {
  tools: toolPlugins,
  channels: channelPlugins,
  memory: memoryPlugins,
};

/**
 * All built-in plugins as a flat array
 */
export const allBuiltinPlugins: Plugin[] = [
  ...toolPlugins,
  ...channelPlugins,
  ...memoryPlugins,
];

/**
 * Default plugins to register (commonly used subset)
 */
export const defaultPlugins: Plugin[] = [
  ...toolPlugins,
  ...channelPlugins,
  ...memoryPlugins,
];
