/**
 * LEO Webchat Plugin System - Comprehensive Tests
 *
 * Tests for PluginManager, PluginContext, hooks, and plugin lifecycle.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { PluginManager, resetPluginManager, getPluginManager } from '../core/PluginManager';
import {
  PluginProvider,
  usePluginContext,
  usePlugin,
  usePlugins,
  usePluginsByType,
  useActivePlugins,
  usePluginActivation,
  usePluginRegistration,
  usePluginConfig,
  usePluginSystemAvailable,
} from '../core/PluginContext';
import type { Plugin, PluginConfig, PluginPanelProps } from '../core/types';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock plugin for testing
 */
function createMockPlugin(overrides: Partial<Plugin> = {}): Plugin {
  const id = overrides.id || `test.plugin.${Math.random().toString(36).slice(2)}`;
  return {
    id,
    type: 'tool',
    name: 'Test Plugin',
    version: '1.0.0',
    description: 'A test plugin',
    renderIcon: ({ size = 20, className = '' } = {}) => (
      <span data-testid={`icon-${id}`} style={{ fontSize: size }} className={className}>
        Icon
      </span>
    ),
    ...overrides,
  };
}

/**
 * Create a plugin with lifecycle hooks
 */
function createPluginWithLifecycle(
  hooks: {
    onActivate?: () => void | Promise<void>;
    onDeactivate?: () => void | Promise<void>;
    onConfigChange?: (config: Record<string, unknown>) => void;
  } = {}
): Plugin {
  return createMockPlugin({
    onActivate: hooks.onActivate,
    onDeactivate: hooks.onDeactivate,
    onConfigChange: hooks.onConfigChange,
  });
}

/**
 * Create a plugin with config schema
 */
function createPluginWithConfig(schema: PluginConfig[]): Plugin {
  return createMockPlugin({
    configSchema: schema,
    capabilities: {
      hasPanel: false,
      hasMessageRenderer: false,
      hasConfig: true,
      requiresAuth: false,
    },
  });
}

/**
 * Test component that uses plugin context
 */
function TestPluginConsumer({
  onContextReady,
}: {
  onContextReady?: (ctx: ReturnType<typeof usePluginContext>) => void;
}) {
  const context = usePluginContext();
  React.useEffect(() => {
    onContextReady?.(context);
  }, [context, onContextReady]);
  return (
    <div data-testid="consumer">
      <span data-testid="plugin-count">{context.plugins.size}</span>
    </div>
  );
}

/**
 * Wrapper component for testing hooks
 * Uses a synchronous registration approach to avoid timing issues
 */
function TestWrapper({
  children,
  initialPlugins = [],
}: {
  children: React.ReactNode;
  initialPlugins?: Array<{ plugin: Plugin; options?: { activate?: boolean } }>;
}) {
  // We pre-register plugins synchronously before rendering
  // This ensures they're available immediately when the component mounts
  const [ready, setReady] = React.useState(false);

  React.useLayoutEffect(() => {
    // Clear any existing plugins from previous tests
    const manager = getPluginManager();
    manager.clear();

    // Register initial plugins synchronously
    initialPlugins.forEach(({ plugin, options }) => {
      try {
        manager.register(plugin, options);
      } catch {
        // Ignore duplicate registration errors
      }
    });

    setReady(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - intentionally not including initialPlugins to avoid re-registration

  if (!ready && initialPlugins.length > 0) {
    return null;
  }

  return (
    <PluginProvider>
      {children}
    </PluginProvider>
  );
}

// ============================================================================
// PluginManager Tests
// ============================================================================

describe('PluginManager', () => {
  let manager: PluginManager;

  beforeEach(() => {
    resetPluginManager();
    manager = new PluginManager({ debug: false });
  });

  afterEach(() => {
    manager.clear();
    vi.restoreAllMocks();
  });

  describe('registration', () => {
    it('should register a valid plugin', () => {
      const plugin = createMockPlugin();
      manager.register(plugin);

      expect(manager.getPlugin(plugin.id)).toBeDefined();
      expect(manager.count).toBe(1);
    });

    it('should throw error when registering plugin with same ID', () => {
      const plugin = createMockPlugin({ id: 'duplicate.plugin' });
      manager.register(plugin);

      expect(() => manager.register(plugin)).toThrow('already registered');
    });

    it('should allow override when option is set', () => {
      const plugin1 = createMockPlugin({ id: 'override.plugin', name: 'Original' });
      const plugin2 = createMockPlugin({ id: 'override.plugin', name: 'Updated' });

      manager.register(plugin1);
      manager.register(plugin2, { override: true });

      const registered = manager.getPlugin('override.plugin');
      expect(registered?.plugin.name).toBe('Updated');
    });

    it('should throw error for plugin without id', () => {
      const plugin = createMockPlugin({ id: '' });
      expect(() => manager.register(plugin)).toThrow('valid string ID');
    });

    it('should throw error for plugin without valid type', () => {
      const plugin = createMockPlugin({ type: 'invalid' as 'tool' });
      expect(() => manager.register(plugin)).toThrow('valid type');
    });

    it('should throw error for plugin without name', () => {
      const plugin = createMockPlugin({ name: '' });
      expect(() => manager.register(plugin)).toThrow('valid name');
    });

    it('should throw error for plugin without version', () => {
      const plugin = createMockPlugin({ version: '' });
      expect(() => manager.register(plugin)).toThrow('valid version');
    });

    it('should throw error for plugin without renderIcon', () => {
      const plugin = createMockPlugin({ renderIcon: undefined as unknown as () => React.ReactNode });
      expect(() => manager.register(plugin)).toThrow('renderIcon');
    });

    it('should apply default config from schema on registration', () => {
      const plugin = createPluginWithConfig([
        { key: 'theme', label: 'Theme', type: 'string', defaultValue: 'dark' },
        { key: 'size', label: 'Size', type: 'number', defaultValue: 100 },
      ]);

      manager.register(plugin);

      const config = manager.getConfig(plugin.id);
      expect(config?.theme).toBe('dark');
      expect(config?.size).toBe(100);
    });

    it('should merge initial config with schema defaults', () => {
      const plugin = createPluginWithConfig([
        { key: 'theme', label: 'Theme', type: 'string', defaultValue: 'dark' },
        { key: 'size', label: 'Size', type: 'number', defaultValue: 100 },
      ]);

      manager.register(plugin, { config: { theme: 'light' } });

      const config = manager.getConfig(plugin.id);
      expect(config?.theme).toBe('light');
      expect(config?.size).toBe(100);
    });
  });

  describe('unregistration', () => {
    it('should unregister a plugin', () => {
      const plugin = createMockPlugin();
      manager.register(plugin);
      manager.unregister(plugin.id);

      expect(manager.getPlugin(plugin.id)).toBeUndefined();
      expect(manager.count).toBe(0);
    });

    it('should handle unregistering non-existent plugin gracefully', () => {
      expect(() => manager.unregister('non.existent')).not.toThrow();
    });

    it('should deactivate plugin before unregistering if active', async () => {
      const onDeactivate = vi.fn();
      const plugin = createPluginWithLifecycle({ onDeactivate });

      manager.register(plugin);
      await manager.activate(plugin.id);
      manager.unregister(plugin.id);

      // Give time for async deactivation
      await waitFor(() => {
        expect(onDeactivate).toHaveBeenCalled();
      });
    });
  });

  describe('activation', () => {
    it('should activate a registered plugin', async () => {
      const plugin = createMockPlugin();
      manager.register(plugin);

      await manager.activate(plugin.id);

      expect(manager.isActive(plugin.id)).toBe(true);
    });

    it('should call onActivate hook when activating', async () => {
      const onActivate = vi.fn();
      const plugin = createPluginWithLifecycle({ onActivate });

      manager.register(plugin);
      await manager.activate(plugin.id);

      expect(onActivate).toHaveBeenCalled();
    });

    it('should handle async onActivate hook', async () => {
      const activationOrder: string[] = [];
      const onActivate = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        activationOrder.push('activated');
      });
      const plugin = createPluginWithLifecycle({ onActivate });

      manager.register(plugin);
      activationOrder.push('before');
      await manager.activate(plugin.id);
      activationOrder.push('after');

      expect(activationOrder).toEqual(['before', 'activated', 'after']);
    });

    it('should throw error when activating non-existent plugin', async () => {
      await expect(manager.activate('non.existent')).rejects.toThrow('not found');
    });

    it('should not call onActivate again if already active', async () => {
      const onActivate = vi.fn();
      const plugin = createPluginWithLifecycle({ onActivate });

      manager.register(plugin);
      await manager.activate(plugin.id);
      await manager.activate(plugin.id);

      expect(onActivate).toHaveBeenCalledTimes(1);
    });

    it('should set error state when onActivate throws', async () => {
      const error = new Error('Activation failed');
      const onActivate = vi.fn().mockRejectedValue(error);
      const plugin = createPluginWithLifecycle({ onActivate });

      manager.register(plugin);

      await expect(manager.activate(plugin.id)).rejects.toThrow('Activation failed');

      const registered = manager.getPlugin(plugin.id);
      expect(registered?.state).toBe('error');
      expect(registered?.error).toBe('Activation failed');
    });
  });

  describe('deactivation', () => {
    it('should deactivate an active plugin', async () => {
      const plugin = createMockPlugin();
      manager.register(plugin);
      await manager.activate(plugin.id);

      await manager.deactivate(plugin.id);

      expect(manager.isActive(plugin.id)).toBe(false);
    });

    it('should call onDeactivate hook when deactivating', async () => {
      const onDeactivate = vi.fn();
      const plugin = createPluginWithLifecycle({ onDeactivate });

      manager.register(plugin);
      await manager.activate(plugin.id);
      await manager.deactivate(plugin.id);

      expect(onDeactivate).toHaveBeenCalled();
    });

    it('should throw error when deactivating non-existent plugin', async () => {
      await expect(manager.deactivate('non.existent')).rejects.toThrow('not found');
    });

    it('should not call onDeactivate if not active', async () => {
      const onDeactivate = vi.fn();
      const plugin = createPluginWithLifecycle({ onDeactivate });

      manager.register(plugin);
      await manager.deactivate(plugin.id);

      expect(onDeactivate).not.toHaveBeenCalled();
    });

    it('should still mark as inactive even if onDeactivate throws', async () => {
      const error = new Error('Deactivation failed');
      const onDeactivate = vi.fn().mockRejectedValue(error);
      const plugin = createPluginWithLifecycle({ onDeactivate });

      manager.register(plugin);
      await manager.activate(plugin.id);

      await expect(manager.deactivate(plugin.id)).rejects.toThrow('Deactivation failed');

      // Should still be marked inactive
      expect(manager.isActive(plugin.id)).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should update plugin configuration', () => {
      const plugin = createPluginWithConfig([
        { key: 'theme', label: 'Theme', type: 'string', defaultValue: 'dark' },
      ]);

      manager.register(plugin);
      manager.updateConfig(plugin.id, { theme: 'light' });

      const config = manager.getConfig(plugin.id);
      expect(config?.theme).toBe('light');
    });

    it('should call onConfigChange when config is updated', () => {
      const onConfigChange = vi.fn();
      const plugin = createPluginWithLifecycle({ onConfigChange });

      manager.register(plugin);
      manager.updateConfig(plugin.id, { theme: 'light' });

      expect(onConfigChange).toHaveBeenCalledWith({ theme: 'light' });
    });

    it('should validate config against schema', () => {
      const plugin = createPluginWithConfig([
        {
          key: 'count',
          label: 'Count',
          type: 'number',
          validate: (value) => {
            if (typeof value !== 'number' || value < 0) {
              return 'Count must be a positive number';
            }
            return true;
          },
        },
      ]);

      manager.register(plugin);

      expect(() => manager.updateConfig(plugin.id, { count: -1 })).toThrow(
        'Count must be a positive number'
      );
    });

    it('should throw error when updating config for non-existent plugin', () => {
      expect(() => manager.updateConfig('non.existent', { foo: 'bar' })).toThrow('not found');
    });
  });

  describe('plugin queries', () => {
    it('should get all plugins', () => {
      const plugin1 = createMockPlugin({ id: 'plugin.1' });
      const plugin2 = createMockPlugin({ id: 'plugin.2' });

      manager.register(plugin1);
      manager.register(plugin2);

      expect(manager.getAllPlugins()).toHaveLength(2);
    });

    it('should get plugins by type', () => {
      const toolPlugin = createMockPlugin({ id: 'tool.1', type: 'tool' });
      const channelPlugin = createMockPlugin({ id: 'channel.1', type: 'channel' });
      const memoryPlugin = createMockPlugin({ id: 'memory.1', type: 'memory' });

      manager.register(toolPlugin);
      manager.register(channelPlugin);
      manager.register(memoryPlugin);

      expect(manager.getPluginsByType('tool')).toHaveLength(1);
      expect(manager.getPluginsByType('channel')).toHaveLength(1);
      expect(manager.getPluginsByType('memory')).toHaveLength(1);
    });

    it('should get active plugins', async () => {
      const plugin1 = createMockPlugin({ id: 'plugin.1' });
      const plugin2 = createMockPlugin({ id: 'plugin.2' });

      manager.register(plugin1);
      manager.register(plugin2);
      await manager.activate(plugin1.id);

      expect(manager.getActivePlugins()).toHaveLength(1);
      expect(manager.getActivePlugins()[0]?.plugin.id).toBe('plugin.1');
    });
  });

  describe('iterator', () => {
    it('should be iterable', () => {
      const plugin1 = createMockPlugin({ id: 'plugin.1' });
      const plugin2 = createMockPlugin({ id: 'plugin.2' });

      manager.register(plugin1);
      manager.register(plugin2);

      const ids: string[] = [];
      for (const [id] of manager) {
        ids.push(id);
      }

      expect(ids).toContain('plugin.1');
      expect(ids).toContain('plugin.2');
    });
  });

  describe('clear', () => {
    it('should clear all plugins', () => {
      const plugin1 = createMockPlugin({ id: 'plugin.1' });
      const plugin2 = createMockPlugin({ id: 'plugin.2' });

      manager.register(plugin1);
      manager.register(plugin2);
      manager.clear();

      expect(manager.count).toBe(0);
    });
  });
});

// ============================================================================
// PluginContext Tests
// ============================================================================

describe('PluginContext', () => {
  beforeEach(() => {
    resetPluginManager();
    vi.clearAllMocks();
  });

  describe('PluginProvider', () => {
    it('should render children', () => {
      render(
        <PluginProvider>
          <div data-testid="child">Child Content</div>
        </PluginProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should register initial plugins', async () => {
      const plugin = createMockPlugin();
      let capturedContext: ReturnType<typeof usePluginContext> | null = null;

      render(
        <PluginProvider initialPlugins={[{ plugin }]}>
          <TestPluginConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </PluginProvider>
      );

      await waitFor(() => {
        expect(capturedContext?.plugins.size).toBe(1);
      });
    });

    it('should auto-activate plugins when option is set', async () => {
      const plugin = createMockPlugin();
      let capturedContext: ReturnType<typeof usePluginContext> | null = null;

      render(
        <PluginProvider initialPlugins={[{ plugin, options: { activate: true } }]}>
          <TestPluginConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </PluginProvider>
      );

      await waitFor(() => {
        expect(capturedContext?.isPluginActive(plugin.id)).toBe(true);
      });
    });
  });

  describe('usePluginContext', () => {
    it('should throw error when used outside provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestPluginConsumer />);
      }).toThrow('usePluginContext must be used within a PluginProvider');

      consoleError.mockRestore();
    });

    it('should provide plugin context', () => {
      let capturedContext: ReturnType<typeof usePluginContext> | null = null;

      render(
        <PluginProvider>
          <TestPluginConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </PluginProvider>
      );

      expect(capturedContext).toBeDefined();
      expect(capturedContext?.plugins).toBeDefined();
      expect(typeof capturedContext?.registerPlugin).toBe('function');
      expect(typeof capturedContext?.activatePlugin).toBe('function');
    });
  });

  describe('usePlugin', () => {
    function TestUsePlugin({ pluginId }: { pluginId: string }) {
      const registered = usePlugin(pluginId);
      return (
        <div>
          <span data-testid="plugin-name">{registered?.plugin.name ?? 'Not found'}</span>
          <span data-testid="plugin-state">{registered?.state ?? 'none'}</span>
        </div>
      );
    }

    it('should return plugin by id', async () => {
      const plugin = createMockPlugin({ id: 'test.plugin', name: 'Test Plugin' });

      render(
        <TestWrapper initialPlugins={[{ plugin }]}>
          <TestUsePlugin pluginId="test.plugin" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('plugin-name')).toHaveTextContent('Test Plugin');
      });
    });

    it('should return undefined for non-existent plugin', async () => {
      render(
        <TestWrapper>
          <TestUsePlugin pluginId="non.existent" />
        </TestWrapper>
      );

      expect(screen.getByTestId('plugin-name')).toHaveTextContent('Not found');
    });
  });

  describe('usePlugins', () => {
    function TestUsePlugins() {
      const plugins = usePlugins();
      return (
        <div>
          <span data-testid="plugins-count">{plugins.length}</span>
          <ul>
            {plugins.map((p) => (
              <li key={p.plugin.id} data-testid={`plugin-${p.plugin.id}`}>
                {p.plugin.name}
              </li>
            ))}
          </ul>
        </div>
      );
    }

    it('should return all plugins', async () => {
      const plugin1 = createMockPlugin({ id: 'plugin.1', name: 'Plugin 1' });
      const plugin2 = createMockPlugin({ id: 'plugin.2', name: 'Plugin 2' });

      render(
        <TestWrapper initialPlugins={[{ plugin: plugin1 }, { plugin: plugin2 }]}>
          <TestUsePlugins />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('plugins-count')).toHaveTextContent('2');
        expect(screen.getByTestId('plugin-plugin.1')).toHaveTextContent('Plugin 1');
        expect(screen.getByTestId('plugin-plugin.2')).toHaveTextContent('Plugin 2');
      });
    });
  });

  describe('usePluginsByType', () => {
    function TestUsePluginsByType({ type }: { type: 'tool' | 'channel' | 'memory' }) {
      const plugins = usePluginsByType(type);
      return (
        <div>
          <span data-testid="plugins-count">{plugins.length}</span>
        </div>
      );
    }

    it('should filter plugins by type', async () => {
      const toolPlugin = createMockPlugin({ id: 'tool.1', type: 'tool' });
      const channelPlugin = createMockPlugin({ id: 'channel.1', type: 'channel' });

      render(
        <TestWrapper initialPlugins={[{ plugin: toolPlugin }, { plugin: channelPlugin }]}>
          <TestUsePluginsByType type="tool" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('plugins-count')).toHaveTextContent('1');
      });
    });
  });

  describe('useActivePlugins', () => {
    function TestUseActivePlugins() {
      const plugins = useActivePlugins();
      return <span data-testid="active-count">{plugins.length}</span>;
    }

    it('should return only active plugins', async () => {
      const plugin1 = createMockPlugin({ id: 'plugin.1' });
      const plugin2 = createMockPlugin({ id: 'plugin.2' });

      render(
        <TestWrapper
          initialPlugins={[
            { plugin: plugin1, options: { activate: true } },
            { plugin: plugin2 },
          ]}
        >
          <TestUseActivePlugins />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('active-count')).toHaveTextContent('1');
      });
    });
  });

  describe('usePluginRegistration', () => {
    function TestUsePluginRegistration() {
      const { registerPlugin, unregisterPlugin } = usePluginRegistration();
      const { getAllPlugins } = usePluginContext();
      const [count, setCount] = React.useState(0);

      const handleRegister = React.useCallback(() => {
        registerPlugin(createMockPlugin({ id: 'new.plugin' }));
        // Force re-render after registration by updating state
        setCount((c) => c + 1);
      }, [registerPlugin]);

      const handleUnregister = React.useCallback(() => {
        unregisterPlugin('new.plugin');
        setCount((c) => c + 1);
      }, [unregisterPlugin]);

      // Get fresh count on each render
      const pluginCount = getAllPlugins().length;

      return (
        <div>
          <span data-testid="plugins-count">{pluginCount}</span>
          <span data-testid="render-count">{count}</span>
          <button data-testid="register-btn" onClick={handleRegister}>
            Register
          </button>
          <button data-testid="unregister-btn" onClick={handleUnregister}>
            Unregister
          </button>
        </div>
      );
    }

    it('should register and unregister plugins', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TestUsePluginRegistration />
        </TestWrapper>
      );

      // Initial state should be 0 plugins
      await waitFor(() => {
        expect(screen.getByTestId('plugins-count')).toHaveTextContent('0');
      });

      // Click register and verify count increases
      await user.click(screen.getByTestId('register-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('plugins-count')).toHaveTextContent('1');
      });

      // Click unregister and verify count decreases
      await user.click(screen.getByTestId('unregister-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('plugins-count')).toHaveTextContent('0');
      });
    });
  });

  describe('usePluginActivation', () => {
    function TestUsePluginActivation({ pluginId }: { pluginId: string }) {
      const { activatePlugin, deactivatePlugin, isPluginActive } = usePluginActivation();
      const [isActive, setIsActive] = React.useState(false);

      React.useEffect(() => {
        setIsActive(isPluginActive(pluginId));
      }, [isPluginActive, pluginId]);

      return (
        <div>
          <span data-testid="is-active">{isActive ? 'active' : 'inactive'}</span>
          <button data-testid="activate-btn" onClick={() => activatePlugin(pluginId)}>
            Activate
          </button>
          <button data-testid="deactivate-btn" onClick={() => deactivatePlugin(pluginId)}>
            Deactivate
          </button>
        </div>
      );
    }

    it('should activate and deactivate plugins', async () => {
      const user = userEvent.setup();
      const plugin = createMockPlugin({ id: 'test.plugin' });

      render(
        <TestWrapper initialPlugins={[{ plugin }]}>
          <TestUsePluginActivation pluginId="test.plugin" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('is-active')).toHaveTextContent('inactive');
      });

      await user.click(screen.getByTestId('activate-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('is-active')).toHaveTextContent('active');
      });

      await user.click(screen.getByTestId('deactivate-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('is-active')).toHaveTextContent('inactive');
      });
    });
  });

  describe('usePluginConfig', () => {
    function TestUsePluginConfig({ pluginId }: { pluginId: string }) {
      const { config, updateConfig } = usePluginConfig(pluginId);

      return (
        <div>
          <span data-testid="theme">{String(config.theme ?? 'undefined')}</span>
          <button data-testid="update-btn" onClick={() => updateConfig({ theme: 'light' })}>
            Update
          </button>
        </div>
      );
    }

    it('should read and update plugin config', async () => {
      const user = userEvent.setup();
      const plugin = createPluginWithConfig([
        { key: 'theme', label: 'Theme', type: 'string', defaultValue: 'dark' },
      ]);

      render(
        <TestWrapper initialPlugins={[{ plugin }]}>
          <TestUsePluginConfig pluginId={plugin.id} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      });

      await user.click(screen.getByTestId('update-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('light');
      });
    });
  });

  describe('usePluginSystemAvailable', () => {
    function TestUsePluginSystemAvailable() {
      const available = usePluginSystemAvailable();
      return <span data-testid="available">{available ? 'yes' : 'no'}</span>;
    }

    it('should return true inside provider', () => {
      render(
        <TestWrapper>
          <TestUsePluginSystemAvailable />
        </TestWrapper>
      );

      expect(screen.getByTestId('available')).toHaveTextContent('yes');
    });

    it('should return false outside provider', () => {
      render(<TestUsePluginSystemAvailable />);
      expect(screen.getByTestId('available')).toHaveTextContent('no');
    });
  });
});

// ============================================================================
// Plugin Lifecycle Tests
// ============================================================================

describe('Plugin Lifecycle', () => {
  beforeEach(() => {
    resetPluginManager();
  });

  describe('lifecycle hooks', () => {
    it('should call onActivate when plugin is activated', async () => {
      const onActivate = vi.fn();
      const plugin = createPluginWithLifecycle({ onActivate });

      render(
        <TestWrapper initialPlugins={[{ plugin, options: { activate: true } }]}>
          <div />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(onActivate).toHaveBeenCalled();
      });
    });

    it('should call onDeactivate when plugin is deactivated', async () => {
      const onDeactivate = vi.fn();
      const plugin = createPluginWithLifecycle({ onDeactivate });

      function TestComponent() {
        const { deactivatePlugin } = usePluginActivation();
        return (
          <button data-testid="deactivate" onClick={() => deactivatePlugin(plugin.id)}>
            Deactivate
          </button>
        );
      }

      const user = userEvent.setup();

      render(
        <TestWrapper initialPlugins={[{ plugin, options: { activate: true } }]}>
          <TestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('deactivate')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('deactivate'));

      await waitFor(() => {
        expect(onDeactivate).toHaveBeenCalled();
      });
    });

    it('should call onConfigChange when config is updated', async () => {
      const onConfigChange = vi.fn();
      const plugin = createMockPlugin({
        configSchema: [
          { key: 'theme', label: 'Theme', type: 'string', defaultValue: 'dark' },
        ],
        onConfigChange,
      });

      function TestComponent() {
        const { updateConfig } = usePluginConfig(plugin.id);
        return (
          <button data-testid="update" onClick={() => updateConfig({ theme: 'light' })}>
            Update
          </button>
        );
      }

      const user = userEvent.setup();

      render(
        <TestWrapper initialPlugins={[{ plugin }]}>
          <TestComponent />
        </TestWrapper>
      );

      await user.click(screen.getByTestId('update'));

      await waitFor(() => {
        expect(onConfigChange).toHaveBeenCalledWith(
          expect.objectContaining({ theme: 'light' })
        );
      });
    });
  });
});

// ============================================================================
// Plugin Configuration Validation Tests
// ============================================================================

describe('Plugin Configuration Validation', () => {
  let manager: PluginManager;

  beforeEach(() => {
    resetPluginManager();
    manager = new PluginManager();
  });

  afterEach(() => {
    manager.clear();
  });

  it('should validate string config', () => {
    const plugin = createPluginWithConfig([
      {
        key: 'name',
        label: 'Name',
        type: 'string',
        required: true,
        validate: (value) => {
          if (typeof value !== 'string' || value.length < 3) {
            return 'Name must be at least 3 characters';
          }
          return true;
        },
      },
    ]);

    manager.register(plugin);

    expect(() => manager.updateConfig(plugin.id, { name: 'ab' })).toThrow(
      'Name must be at least 3 characters'
    );

    expect(() => manager.updateConfig(plugin.id, { name: 'abc' })).not.toThrow();
  });

  it('should validate number config', () => {
    const plugin = createPluginWithConfig([
      {
        key: 'port',
        label: 'Port',
        type: 'number',
        validate: (value) => {
          if (typeof value !== 'number' || value < 1 || value > 65535) {
            return 'Port must be between 1 and 65535';
          }
          return true;
        },
      },
    ]);

    manager.register(plugin);

    expect(() => manager.updateConfig(plugin.id, { port: 0 })).toThrow(
      'Port must be between 1 and 65535'
    );

    expect(() => manager.updateConfig(plugin.id, { port: 3000 })).not.toThrow();
  });

  it('should validate boolean config', () => {
    const plugin = createPluginWithConfig([
      {
        key: 'enabled',
        label: 'Enabled',
        type: 'boolean',
        validate: (value) => {
          if (typeof value !== 'boolean') {
            return 'Enabled must be a boolean';
          }
          return true;
        },
      },
    ]);

    manager.register(plugin);

    expect(() => manager.updateConfig(plugin.id, { enabled: 'yes' })).toThrow(
      'Enabled must be a boolean'
    );

    expect(() => manager.updateConfig(plugin.id, { enabled: true })).not.toThrow();
  });

  it('should validate select config', () => {
    const validThemes = ['light', 'dark', 'auto'];
    const plugin = createPluginWithConfig([
      {
        key: 'theme',
        label: 'Theme',
        type: 'select',
        options: validThemes.map((t) => ({ value: t, label: t })),
        validate: (value) => {
          if (!validThemes.includes(String(value))) {
            return `Theme must be one of: ${validThemes.join(', ')}`;
          }
          return true;
        },
      },
    ]);

    manager.register(plugin);

    expect(() => manager.updateConfig(plugin.id, { theme: 'invalid' })).toThrow(
      'Theme must be one of'
    );

    expect(() => manager.updateConfig(plugin.id, { theme: 'dark' })).not.toThrow();
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Plugin Integration', () => {
  beforeEach(() => {
    resetPluginManager();
  });

  it('should render plugin icon', async () => {
    const plugin = createMockPlugin({ id: 'icon.test' });

    function TestComponent() {
      const registered = usePlugin('icon.test');
      return <div data-testid="icon-container">{registered?.plugin.renderIcon()}</div>;
    }

    render(
      <TestWrapper initialPlugins={[{ plugin }]}>
        <TestComponent />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('icon-icon.test')).toBeInTheDocument();
    });
  });

  it('should render plugin panel', async () => {
    const renderPanel = vi.fn(({ plugin, onClose }: PluginPanelProps) => (
      <div data-testid="panel">
        <span data-testid="panel-name">{plugin.name}</span>
        <button data-testid="close-btn" onClick={onClose}>
          Close
        </button>
      </div>
    ));

    const plugin = createMockPlugin({
      id: 'panel.test',
      name: 'Panel Plugin',
      renderPanel,
      capabilities: {
        hasPanel: true,
        hasMessageRenderer: false,
        hasConfig: false,
        requiresAuth: false,
      },
    });

    function TestComponent() {
      const registered = usePlugin('panel.test');
      const [showPanel, setShowPanel] = React.useState(true);

      if (!registered?.plugin.renderPanel || !showPanel) return null;

      return registered.plugin.renderPanel({
        plugin: registered.plugin,
        isExpanded: true,
        onToggleExpand: () => {},
        onClose: () => setShowPanel(false),
      });
    }

    const user = userEvent.setup();

    render(
      <TestWrapper initialPlugins={[{ plugin }]}>
        <TestComponent />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('panel-name')).toHaveTextContent('Panel Plugin');
    });

    await user.click(screen.getByTestId('close-btn'));

    await waitFor(() => {
      expect(screen.queryByTestId('panel')).not.toBeInTheDocument();
    });
  });

  it('should support multiple plugins of different types', async () => {
    const toolPlugin = createMockPlugin({ id: 'tool.1', type: 'tool', name: 'Tool 1' });
    const channelPlugin = createMockPlugin({ id: 'channel.1', type: 'channel', name: 'Channel 1' });
    const memoryPlugin = createMockPlugin({ id: 'memory.1', type: 'memory', name: 'Memory 1' });

    function TestComponent() {
      const tools = usePluginsByType('tool');
      const channels = usePluginsByType('channel');
      const memories = usePluginsByType('memory');

      return (
        <div>
          <span data-testid="tools-count">{tools.length}</span>
          <span data-testid="channels-count">{channels.length}</span>
          <span data-testid="memories-count">{memories.length}</span>
        </div>
      );
    }

    render(
      <TestWrapper
        initialPlugins={[
          { plugin: toolPlugin },
          { plugin: channelPlugin },
          { plugin: memoryPlugin },
        ]}
      >
        <TestComponent />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('tools-count')).toHaveTextContent('1');
      expect(screen.getByTestId('channels-count')).toHaveTextContent('1');
      expect(screen.getByTestId('memories-count')).toHaveTextContent('1');
    });
  });
});
