/**
 * LEO Webchat Plugin System - Channels Module
 *
 * Exports all channel plugins for web, WhatsApp,
 * email, and other communication channel integrations.
 */

export { WebPlugin, default as WebPluginDefault } from './WebPlugin';
export type { WebChannelConfig, WebChannelStatus } from './WebPlugin';

// Re-export all channel plugins as array for easy registration
import { WebPlugin } from './WebPlugin';

export const channelPlugins = [WebPlugin];
