/**
 * LEO Frontend - Memory API Service
 * API integration for LEO Memory System (L0-L4)
 *
 * Memory Levels:
 * - L0: Working Memory (current conversation context)
 * - L1: Short-term Memory (recent conversations)
 * - L2: Episodic Memory (significant events)
 * - L3: Semantic Memory (knowledge graph)
 * - L4: Long-term Memory (persistent facts)
 */

import { apiClient, getResponseData } from './client';
import type { PaginatedRequest, PaginatedResponse } from './types';

// Memory Types
export type MemoryLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';
export type MemoryStatus = 'healthy' | 'warning' | 'degraded' | 'error';
export type MemoryEntryType = 'context' | 'fact' | 'event' | 'relation' | 'embedding' | 'message' | 'knowledge';

export interface MemoryEntry {
  id: string;
  level: MemoryLevel;
  contactId?: string;
  conversationId?: string;
  type: MemoryEntryType;
  content: string;
  metadata?: Record<string, unknown>;
  embedding?: number[];
  relevanceScore?: number;
  accessCount: number;
  lastAccessedAt?: string;
  expiresAt?: string;
  source?: string;
  tags?: string[];
  relatedEntries?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MemoryLevelStats {
  level: MemoryLevel;
  name: string;
  nameEn: string;
  description: string;
  totalEntries: number;
  sizeBytes: number;
  avgAccessTime: number;
  hitRate: number;
  status: MemoryStatus;
  retention: string;
  usageHistory: { timestamp: string; entries: number; size: number }[];
}

export interface MemoryStats {
  totalEntries: number;
  totalSizeBytes: number;
  levels: MemoryLevelStats[];
  recentQueries: number;
  cacheHitRate: number;
  vectorDbStatus: MemoryStatus;
  lastConsolidation?: string;
  lastPrune?: string;
}

export interface MemorySearchRequest {
  query: string;
  levels?: MemoryLevel[];
  types?: MemoryEntryType[];
  contactId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  minRelevance?: number;
}

export interface MemorySearchResult {
  entries: (MemoryEntry & { score: number })[];
  totalFound: number;
  queryTimeMs: number;
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: 'entity' | 'concept' | 'relation';
  properties?: Record<string, unknown>;
}

export interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  weight?: number;
}

export interface KnowledgeGraphData {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    topEntities: { name: string; connections: number }[];
  };
}

export interface ConsolidationResult {
  entriesProcessed: number;
  entriesMoved: number;
  duration: number;
  levels: { from: MemoryLevel; to: MemoryLevel; count: number }[];
}

export interface PruneResult {
  entriesRemoved: number;
  spaceFreed: number;
  levelsAffected: MemoryLevel[];
}

// API Functions
export const memoryApi = {
  /**
   * Get overall memory system statistics
   */
  getStats: async (): Promise<MemoryStats> => {
    const response = await apiClient.get('/orchestrator/memory/stats');
    return getResponseData(response);
  },

  /**
   * Get paginated memory entries for a specific level
   */
  getEntries: async (
    level?: MemoryLevel,
    filters?: PaginatedRequest & {
      type?: MemoryEntryType;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<PaginatedResponse<MemoryEntry>> => {
    const params = { ...filters };
    const url = level
      ? `/orchestrator/memory/entries?level=${level}`
      : '/orchestrator/memory/entries';
    const response = await apiClient.get(url, { params });
    return getResponseData(response);
  },

  /**
   * Get a single memory entry by ID
   */
  getEntry: async (id: string): Promise<MemoryEntry> => {
    const response = await apiClient.get(`/orchestrator/memory/entries/${id}`);
    return getResponseData(response);
  },

  /**
   * Semantic search across memory levels
   */
  search: async (request: MemorySearchRequest): Promise<MemorySearchResult> => {
    const response = await apiClient.get('/orchestrator/memory/search', {
      params: {
        q: request.query,
        levels: request.levels?.join(','),
        types: request.types?.join(','),
        contactId: request.contactId,
        dateFrom: request.dateFrom,
        dateTo: request.dateTo,
        limit: request.limit,
        minRelevance: request.minRelevance,
      },
    });
    return getResponseData(response);
  },

  /**
   * Consolidate memory entries (move from lower to higher levels)
   */
  consolidate: async (options?: {
    fromLevel?: MemoryLevel;
    toLevel?: MemoryLevel;
    dryRun?: boolean;
  }): Promise<ConsolidationResult> => {
    const response = await apiClient.post('/orchestrator/memory/consolidate', options);
    return getResponseData(response);
  },

  /**
   * Prune old or expired entries
   */
  prune: async (options?: {
    level?: MemoryLevel;
    olderThan?: string;
    dryRun?: boolean;
  }): Promise<PruneResult> => {
    const response = await apiClient.delete('/orchestrator/memory/prune', {
      data: options,
    });
    return getResponseData(response);
  },

  /**
   * Clear all entries in a memory level
   */
  clearLevel: async (level: MemoryLevel): Promise<{ deletedCount: number }> => {
    const response = await apiClient.post(`/orchestrator/memory/${level.toLowerCase()}/clear`);
    return getResponseData(response);
  },

  /**
   * Delete a specific memory entry
   */
  deleteEntry: async (id: string): Promise<void> => {
    await apiClient.delete(`/orchestrator/memory/entries/${id}`);
  },

  /**
   * Get knowledge graph data for L3 visualization
   */
  getKnowledgeGraph: async (options?: {
    limit?: number;
    entityType?: string;
  }): Promise<KnowledgeGraphData> => {
    const response = await apiClient.get('/orchestrator/memory/knowledge-graph', {
      params: options,
    });
    return getResponseData(response);
  },

  /**
   * Export memory data
   */
  exportMemory: async (options?: {
    levels?: MemoryLevel[];
    format?: 'json' | 'csv';
  }): Promise<Blob> => {
    const response = await apiClient.get('/orchestrator/memory/export', {
      params: options,
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Get all memory entries for a specific contact
   */
  getContactMemory: async (contactId: string): Promise<MemoryEntry[]> => {
    const response = await apiClient.get(`/orchestrator/memory/contacts/${contactId}`);
    return getResponseData(response);
  },
};

export default memoryApi;
