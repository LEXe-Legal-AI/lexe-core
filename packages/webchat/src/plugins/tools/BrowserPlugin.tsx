/**
 * LEO Webchat Plugin - Browser Tool
 *
 * Plugin for browser automation and web scraping tool visualization.
 * Displays browser actions, screenshots, and extracted content in the chat.
 */

import React, { useState, useCallback } from 'react';
import type {
  Plugin,
  PluginPanelProps,
  PluginMessageProps,
  PluginIconProps,
} from '../core/types';

/**
 * Browser action types
 */
export type BrowserAction =
  | 'navigate'
  | 'click'
  | 'type'
  | 'scroll'
  | 'screenshot'
  | 'extract'
  | 'wait';

/**
 * Browser execution data structure
 */
export interface BrowserExecutionData {
  /** Action being performed */
  action: BrowserAction;
  /** Target URL or selector */
  target?: string;
  /** Execution status */
  status: 'pending' | 'executing' | 'completed' | 'failed';
  /** Screenshot URL if available */
  screenshot?: string;
  /** Extracted content */
  extractedContent?: string;
  /** Error message if failed */
  error?: string;
  /** Execution timestamp */
  timestamp?: number;
  /** Duration in milliseconds */
  duration?: number;
}

/**
 * Browser icon component
 */
function BrowserIcon({ size = 20, className = '' }: PluginIconProps): JSX.Element {
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
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <circle cx="7" cy="6" r="1" fill="currentColor" />
      <circle cx="10" cy="6" r="1" fill="currentColor" />
      <circle cx="13" cy="6" r="1" fill="currentColor" />
    </svg>
  );
}

/**
 * Status indicator component
 */
function StatusIndicator({ status }: { status: BrowserExecutionData['status'] }): JSX.Element {
  const statusStyles = {
    pending: 'bg-gray-400',
    executing: 'bg-yellow-400 animate-pulse',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
  };

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${statusStyles[status]}`}
      title={status}
    />
  );
}

/**
 * Action label component
 */
function ActionLabel({ action }: { action: BrowserAction }): JSX.Element {
  const actionLabels: Record<BrowserAction, string> = {
    navigate: 'Navigate',
    click: 'Click',
    type: 'Type',
    scroll: 'Scroll',
    screenshot: 'Screenshot',
    extract: 'Extract',
    wait: 'Wait',
  };

  const actionColors: Record<BrowserAction, string> = {
    navigate: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    click: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    type: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    scroll: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    screenshot: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    extract: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
    wait: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${actionColors[action]}`}
    >
      {actionLabels[action]}
    </span>
  );
}

/**
 * Browser panel component
 */
function BrowserPanel({ plugin, isExpanded: _isExpanded, onClose }: PluginPanelProps): JSX.Element {
  const [url, setUrl] = useState('');
  const [history, setHistory] = useState<BrowserExecutionData[]>([]);

  const handleNavigate = useCallback(() => {
    if (!url.trim()) return;

    const newAction: BrowserExecutionData = {
      action: 'navigate',
      target: url,
      status: 'pending',
      timestamp: Date.now(),
    };

    setHistory((prev) => [...prev, newAction]);
    setUrl('');

    // Simulate execution (in real implementation, this would call the backend)
    setTimeout(() => {
      setHistory((prev) =>
        prev.map((item, idx) =>
          idx === prev.length - 1
            ? { ...item, status: 'completed', duration: 1200 }
            : item
        )
      );
    }, 1200);
  }, [url]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <BrowserIcon size={18} />
          <span className="font-medium text-gray-900 dark:text-white">{plugin.name}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* URL Input */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL to navigate..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
          />
          <button
            onClick={handleNavigate}
            disabled={!url.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Go
          </button>
        </div>
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto p-4">
        {history.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <BrowserIcon size={48} className="mx-auto mb-4 opacity-50" />
            <p>No browser actions yet</p>
            <p className="text-sm mt-1">Enter a URL above to start browsing</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item, index) => (
              <div
                key={index}
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StatusIndicator status={item.status} />
                    <ActionLabel action={item.action} />
                  </div>
                  {item.duration && (
                    <span className="text-xs text-gray-500">{item.duration}ms</span>
                  )}
                </div>
                {item.target && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                    {item.target}
                  </p>
                )}
                {item.error && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{item.error}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Browser in-message component
 */
function BrowserInMessage({ data, isStreaming }: PluginMessageProps): JSX.Element | null {
  const executionData = data as BrowserExecutionData | BrowserExecutionData[];

  // Handle array of executions
  const executions = Array.isArray(executionData) ? executionData : [executionData];

  if (executions.length === 0) return null;

  return (
    <div className="my-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        <BrowserIcon size={16} />
        <span>Browser Actions</span>
        {isStreaming && (
          <span className="animate-pulse text-blue-500">executing...</span>
        )}
      </div>
      <div className="space-y-2">
        {executions.map((exec, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded border border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center gap-2">
              <StatusIndicator status={exec.status} />
              <ActionLabel action={exec.action} />
              {exec.target && (
                <span className="text-sm text-gray-500 truncate max-w-[200px]">
                  {exec.target}
                </span>
              )}
            </div>
            {exec.duration && (
              <span className="text-xs text-gray-400">{exec.duration}ms</span>
            )}
          </div>
        ))}
      </div>
      {executions.some((e) => e.screenshot) && (
        <div className="mt-3">
          <img
            src={executions.find((e) => e.screenshot)?.screenshot}
            alt="Browser screenshot"
            className="rounded-lg max-w-full h-auto border border-gray-200 dark:border-gray-700"
          />
        </div>
      )}
      {executions.some((e) => e.extractedContent) && (
        <div className="mt-3 p-2 bg-white dark:bg-gray-900 rounded border border-gray-100 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 mb-1">Extracted Content:</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {executions.find((e) => e.extractedContent)?.extractedContent}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Browser Plugin Definition
 */
export const BrowserPlugin: Plugin = {
  id: 'leo.tools.browser',
  type: 'tool',
  name: 'Browser',
  version: '1.0.0',
  description: 'Browser automation and web scraping tool for navigating, clicking, and extracting content from web pages.',

  meta: {
    author: 'LEO Platform',
    keywords: ['browser', 'automation', 'scraping', 'web'],
  },

  capabilities: {
    hasPanel: true,
    hasMessageRenderer: true,
    hasConfig: false,
    requiresAuth: false,
  },

  renderIcon: (props) => <BrowserIcon {...props} />,

  renderPanel: (props) => <BrowserPanel {...props} />,

  renderInMessage: (props) => <BrowserInMessage {...props} />,

  onActivate: () => {
    console.log('[BrowserPlugin] Activated');
  },

  onDeactivate: () => {
    console.log('[BrowserPlugin] Deactivated');
  },
};

export default BrowserPlugin;
