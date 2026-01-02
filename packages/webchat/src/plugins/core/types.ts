/**
 * LEO Webchat Plugin System - Core Types
 *
 * Defines the plugin interface and related types for the modular plugin architecture.
 * Plugins can extend functionality for tools, channels, and memory visualization.
 */

import type { ReactNode } from 'react';

/**
 * Plugin types supported by the system
 */
export type PluginType = 'tool' | 'channel' | 'memory';

/**
 * Plugin lifecycle state
 */
export type PluginState = 'inactive' | 'active' | 'error';

/**
 * Props passed to plugin panel renderers
 */
export interface PluginPanelProps {
  /** Current plugin instance */
  plugin: Plugin;
  /** Whether the panel is expanded */
  isExpanded: boolean;
  /** Toggle panel expansion */
  onToggleExpand: () => void;
  /** Close the panel */
  onClose: () => void;
  /** Plugin-specific data */
  data?: unknown;
  /** Current conversation ID */
  conversationId?: string;
  /** Current message ID (if rendered in message context) */
  messageId?: string;
}

/**
 * Props passed to plugin message renderers
 */
export interface PluginMessageProps {
  /** Current plugin instance */
  plugin: Plugin;
  /** Message ID */
  messageId: string;
  /** Conversation ID */
  conversationId: string;
  /** Plugin-specific data attached to the message */
  data: unknown;
  /** Whether the message is currently streaming */
  isStreaming?: boolean;
}

/**
 * Plugin icon render props
 */
export interface PluginIconProps {
  /** Icon size in pixels */
  size?: number;
  /** Additional CSS class */
  className?: string;
}

/**
 * Plugin configuration schema
 */
export interface PluginConfig {
  /** Configuration key */
  key: string;
  /** Display label */
  label: string;
  /** Configuration type */
  type: 'string' | 'number' | 'boolean' | 'select' | 'json';
  /** Default value */
  defaultValue?: unknown;
  /** Required field */
  required?: boolean;
  /** Description/help text */
  description?: string;
  /** Options for select type */
  options?: Array<{ value: string; label: string }>;
  /** Validation function */
  validate?: (value: unknown) => boolean | string;
}

/**
 * Plugin metadata
 */
export interface PluginMeta {
  /** Plugin author */
  author?: string;
  /** Plugin homepage URL */
  homepage?: string;
  /** Plugin repository URL */
  repository?: string;
  /** Plugin license */
  license?: string;
  /** Plugin keywords for search */
  keywords?: string[];
  /** Minimum webchat version required */
  minVersion?: string;
}

/**
 * Plugin capabilities
 */
export interface PluginCapabilities {
  /** Can render a panel */
  hasPanel: boolean;
  /** Can render in messages */
  hasMessageRenderer: boolean;
  /** Supports configuration */
  hasConfig: boolean;
  /** Requires authentication */
  requiresAuth: boolean;
}

/**
 * Core Plugin Interface
 *
 * All plugins must implement this interface to be compatible with the plugin system.
 */
export interface Plugin {
  /** Unique plugin identifier (e.g., 'leo.tools.browser') */
  id: string;

  /** Plugin type: tool, channel, or memory */
  type: PluginType;

  /** Human-readable plugin name */
  name: string;

  /** Semantic version (e.g., '1.0.0') */
  version: string;

  /** Plugin description */
  description?: string;

  /** Plugin metadata */
  meta?: PluginMeta;

  /** Plugin capabilities */
  capabilities?: PluginCapabilities;

  /** Configuration schema */
  configSchema?: PluginConfig[];

  /**
   * Render the plugin icon
   * @param props - Icon render props
   * @returns React node for the icon
   */
  renderIcon: (props?: PluginIconProps) => ReactNode;

  /**
   * Render the plugin panel (optional)
   * @param props - Panel render props
   * @returns React node for the panel
   */
  renderPanel?: (props: PluginPanelProps) => ReactNode;

  /**
   * Render plugin content within a message (optional)
   * @param props - Message render props
   * @returns React node for in-message content
   */
  renderInMessage?: (props: PluginMessageProps) => ReactNode;

  /**
   * Called when the plugin is activated
   */
  onActivate?: () => void | Promise<void>;

  /**
   * Called when the plugin is deactivated
   */
  onDeactivate?: () => void | Promise<void>;

  /**
   * Called when plugin configuration changes
   * @param config - New configuration values
   */
  onConfigChange?: (config: Record<string, unknown>) => void;
}

/**
 * Registered plugin with runtime state
 */
export interface RegisteredPlugin {
  /** The plugin instance */
  plugin: Plugin;
  /** Current state */
  state: PluginState;
  /** Current configuration */
  config: Record<string, unknown>;
  /** Error message if state is 'error' */
  error?: string;
  /** Registration timestamp */
  registeredAt: Date;
  /** Last activation timestamp */
  activatedAt?: Date;
}

/**
 * Plugin manager events
 */
export interface PluginManagerEvents {
  /** Fired when a plugin is registered */
  onPluginRegistered: (plugin: Plugin) => void;
  /** Fired when a plugin is unregistered */
  onPluginUnregistered: (pluginId: string) => void;
  /** Fired when a plugin is activated */
  onPluginActivated: (plugin: Plugin) => void;
  /** Fired when a plugin is deactivated */
  onPluginDeactivated: (pluginId: string) => void;
  /** Fired when a plugin encounters an error */
  onPluginError: (pluginId: string, error: Error) => void;
}

/**
 * Plugin manager configuration
 */
export interface PluginManagerConfig {
  /** Enable debug logging */
  debug?: boolean;
  /** Auto-activate plugins on registration */
  autoActivate?: boolean;
  /** Storage key for plugin state persistence */
  storageKey?: string;
  /** Event handlers */
  events?: Partial<PluginManagerEvents>;
}

/**
 * Plugin registration options
 */
export interface PluginRegistrationOptions {
  /** Initial configuration */
  config?: Record<string, unknown>;
  /** Activate immediately after registration */
  activate?: boolean;
  /** Override existing plugin with same ID */
  override?: boolean;
}

/**
 * Plugin context value
 */
export interface PluginContextValue {
  /** All registered plugins */
  plugins: Map<string, RegisteredPlugin>;
  /** Get a plugin by ID */
  getPlugin: (id: string) => RegisteredPlugin | undefined;
  /** Get all plugins */
  getAllPlugins: () => RegisteredPlugin[];
  /** Get plugins by type */
  getPluginsByType: (type: PluginType) => RegisteredPlugin[];
  /** Register a plugin */
  registerPlugin: (plugin: Plugin, options?: PluginRegistrationOptions) => void;
  /** Unregister a plugin */
  unregisterPlugin: (id: string) => void;
  /** Activate a plugin */
  activatePlugin: (id: string) => Promise<void>;
  /** Deactivate a plugin */
  deactivatePlugin: (id: string) => Promise<void>;
  /** Update plugin configuration */
  updatePluginConfig: (id: string, config: Record<string, unknown>) => void;
  /** Check if a plugin is active */
  isPluginActive: (id: string) => boolean;
}
