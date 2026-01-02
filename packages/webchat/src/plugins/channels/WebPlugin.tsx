/**
 * LEO Webchat Plugin - Web Channel
 *
 * Plugin for the web channel configuration and visualization.
 * Manages webchat appearance, behavior, and connection settings.
 */

import React, { useState, useCallback } from 'react';
import type {
  Plugin,
  PluginPanelProps,
  PluginMessageProps,
  PluginIconProps,
  PluginConfig,
} from '../core/types';

/**
 * Web channel configuration
 */
export interface WebChannelConfig {
  /** Widget position on page */
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Widget theme */
  theme: 'light' | 'dark' | 'auto';
  /** Primary color */
  primaryColor: string;
  /** Widget title */
  title: string;
  /** Placeholder text */
  placeholder: string;
  /** Welcome message */
  welcomeMessage?: string;
  /** Enable sound notifications */
  soundEnabled: boolean;
  /** Enable typing indicators */
  typingIndicator: boolean;
  /** Enable file attachments */
  attachmentsEnabled: boolean;
  /** Maximum file size in MB */
  maxFileSize: number;
}

/**
 * Web channel status data
 */
export interface WebChannelStatus {
  /** Connection status */
  connected: boolean;
  /** Active sessions count */
  activeSessions: number;
  /** Messages today */
  messagesToday: number;
  /** Average response time in ms */
  avgResponseTime: number;
  /** Last activity timestamp */
  lastActivity?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: WebChannelConfig = {
  position: 'bottom-right',
  theme: 'auto',
  primaryColor: '#1E3A5F',
  title: 'LEO Assistant',
  placeholder: 'Scrivi un messaggio...',
  welcomeMessage: 'Ciao! Come posso aiutarti oggi?',
  soundEnabled: true,
  typingIndicator: true,
  attachmentsEnabled: true,
  maxFileSize: 10,
};

/**
 * Web channel icon component
 */
function WebIcon({ size = 20, className = '' }: PluginIconProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

/**
 * Connection status indicator
 */
function ConnectionStatus({ connected }: { connected: boolean }): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-2.5 h-2.5 rounded-full ${
          connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        }`}
      />
      <span className={`text-sm ${connected ? 'text-green-600' : 'text-red-600'}`}>
        {connected ? 'Connesso' : 'Disconnesso'}
      </span>
    </div>
  );
}

/**
 * Stats card component
 */
function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}): JSX.Element {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
            {value}
          </p>
        </div>
        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
          {icon}
        </div>
      </div>
    </div>
  );
}

/**
 * Web channel panel component
 */
function WebChannelPanel({ plugin, onClose }: PluginPanelProps): JSX.Element {
  const [config, setConfig] = useState<WebChannelConfig>(DEFAULT_CONFIG);
  const [status] = useState<WebChannelStatus>({
    connected: true,
    activeSessions: 24,
    messagesToday: 156,
    avgResponseTime: 1200,
    lastActivity: Date.now() - 30000,
  });
  const [activeTab, setActiveTab] = useState<'status' | 'config'>('status');

  const updateConfig = useCallback(
    <K extends keyof WebChannelConfig>(key: K, value: WebChannelConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <WebIcon size={18} />
          <span className="font-medium text-gray-900 dark:text-white">{plugin.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionStatus connected={status.connected} />
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('status')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'status'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Status
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'config'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Configurazione
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'status' ? (
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Sessioni Attive"
                value={status.activeSessions}
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                }
              />
              <StatCard
                label="Messaggi Oggi"
                value={status.messagesToday}
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                }
              />
              <StatCard
                label="Tempo Risposta"
                value={`${(status.avgResponseTime / 1000).toFixed(1)}s`}
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                }
              />
              <StatCard
                label="Uptime"
                value="99.9%"
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                }
              />
            </div>

            {/* Last Activity */}
            {status.lastActivity && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Ultima Attivita
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {new Date(status.lastActivity).toLocaleString('it-IT')}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Position */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Posizione Widget
              </label>
              <select
                value={config.position}
                onChange={(e) => updateConfig('position', e.target.value as WebChannelConfig['position'])}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="bottom-right">Basso Destra</option>
                <option value="bottom-left">Basso Sinistra</option>
                <option value="top-right">Alto Destra</option>
                <option value="top-left">Alto Sinistra</option>
              </select>
            </div>

            {/* Theme */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tema
              </label>
              <select
                value={config.theme}
                onChange={(e) => updateConfig('theme', e.target.value as WebChannelConfig['theme'])}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="auto">Automatico</option>
                <option value="light">Chiaro</option>
                <option value="dark">Scuro</option>
              </select>
            </div>

            {/* Primary Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Colore Primario
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={config.primaryColor}
                  onChange={(e) => updateConfig('primaryColor', e.target.value)}
                  className="w-10 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={config.primaryColor}
                  onChange={(e) => updateConfig('primaryColor', e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Titolo
              </label>
              <input
                type="text"
                value={config.title}
                onChange={(e) => updateConfig('title', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Suoni</span>
                <input
                  type="checkbox"
                  checked={config.soundEnabled}
                  onChange={(e) => updateConfig('soundEnabled', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Indicatore Digitazione</span>
                <input
                  type="checkbox"
                  checked={config.typingIndicator}
                  onChange={(e) => updateConfig('typingIndicator', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Allegati</span>
                <input
                  type="checkbox"
                  checked={config.attachmentsEnabled}
                  onChange={(e) => updateConfig('attachmentsEnabled', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {activeTab === 'config' && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Salva Configurazione
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Web channel in-message component (for channel info in messages)
 */
function WebChannelInMessage({ data }: PluginMessageProps): JSX.Element | null {
  const channelData = data as { source?: string; sessionId?: string };

  if (!channelData?.source) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded text-xs text-blue-600 dark:text-blue-400">
      <WebIcon size={12} />
      <span>{channelData.source}</span>
      {channelData.sessionId && (
        <span className="text-blue-400 dark:text-blue-500">#{channelData.sessionId.slice(0, 8)}</span>
      )}
    </div>
  );
}

/**
 * Plugin configuration schema
 */
const configSchema: PluginConfig[] = [
  {
    key: 'position',
    label: 'Widget Position',
    type: 'select',
    defaultValue: 'bottom-right',
    options: [
      { value: 'bottom-right', label: 'Bottom Right' },
      { value: 'bottom-left', label: 'Bottom Left' },
      { value: 'top-right', label: 'Top Right' },
      { value: 'top-left', label: 'Top Left' },
    ],
  },
  {
    key: 'theme',
    label: 'Theme',
    type: 'select',
    defaultValue: 'auto',
    options: [
      { value: 'auto', label: 'Auto' },
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
    ],
  },
  {
    key: 'primaryColor',
    label: 'Primary Color',
    type: 'string',
    defaultValue: '#1E3A5F',
  },
  {
    key: 'title',
    label: 'Widget Title',
    type: 'string',
    defaultValue: 'LEO Assistant',
  },
  {
    key: 'soundEnabled',
    label: 'Enable Sounds',
    type: 'boolean',
    defaultValue: true,
  },
  {
    key: 'typingIndicator',
    label: 'Show Typing Indicator',
    type: 'boolean',
    defaultValue: true,
  },
  {
    key: 'attachmentsEnabled',
    label: 'Enable Attachments',
    type: 'boolean',
    defaultValue: true,
  },
];

/**
 * Web Channel Plugin Definition
 */
export const WebPlugin: Plugin = {
  id: 'leo.channels.web',
  type: 'channel',
  name: 'Web Channel',
  version: '1.0.0',
  description: 'Web channel configuration and management for the LEO webchat widget.',

  meta: {
    author: 'LEO Platform',
    keywords: ['web', 'channel', 'widget', 'chat'],
  },

  capabilities: {
    hasPanel: true,
    hasMessageRenderer: true,
    hasConfig: true,
    requiresAuth: false,
  },

  configSchema,

  renderIcon: (props) => <WebIcon {...props} />,

  renderPanel: (props) => <WebChannelPanel {...props} />,

  renderInMessage: (props) => <WebChannelInMessage {...props} />,

  onActivate: () => {
    console.log('[WebPlugin] Activated');
  },

  onDeactivate: () => {
    console.log('[WebPlugin] Deactivated');
  },

  onConfigChange: (config) => {
    console.log('[WebPlugin] Config changed:', config);
  },
};

export default WebPlugin;
