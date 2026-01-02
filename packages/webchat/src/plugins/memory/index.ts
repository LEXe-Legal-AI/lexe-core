/**
 * LEO Webchat Plugin System - Memory Module
 *
 * Exports all memory plugins for visualization of
 * L0-L4 memory layers and knowledge graph.
 */

export { MemoryL3Plugin, default as MemoryL3PluginDefault } from './MemoryL3Plugin';
export type {
  MemoryFact,
  MemoryCategory,
  MemorySearchResult,
  MemoryL3MessageData,
} from './MemoryL3Plugin';

// Re-export all memory plugins as array for easy registration
import { MemoryL3Plugin } from './MemoryL3Plugin';

export const memoryPlugins = [MemoryL3Plugin];
