/**
 * LEO Webchat Plugin System - Tools Module
 *
 * Exports all tool plugins for browser automation,
 * search, code execution, and other tool integrations.
 */

export { BrowserPlugin, default as BrowserPluginDefault } from './BrowserPlugin';
export type { BrowserAction, BrowserExecutionData } from './BrowserPlugin';

// Re-export all tool plugins as array for easy registration
import { BrowserPlugin } from './BrowserPlugin';

export const toolPlugins = [BrowserPlugin];
