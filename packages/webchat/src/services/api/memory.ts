/**
 * Memory API Service
 *
 * Handles communication with the LEO Memory System (L0-L4) backend.
 * Endpoints are served from leo-memory at http://localhost:8003/api/v1
 */

import { getApiClient } from './client';
import { MemoryLayer, type MemoryFact } from '@/types';

/**
 * Memory context response from API
 */
export interface MemoryContextResponse {
  contact_id: string;
  L0: {
    session_history: SessionMemory[];
  };
  L1: {
    short_term: ShortTermMemory[];
  };
  L2: {
    long_term: LongTermMemory[];
  };
  L3: {
    semantic: SemanticMemory[];
  };
  L4: {
    graph: GraphNode[];
  };
  metadata?: {
    last_updated: string;
    total_memories: number;
  };
}

/**
 * Session memory (L0) - Current conversation context
 */
export interface SessionMemory {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  tokens?: number;
}

/**
 * Short-term memory (L1) - Recent interactions within hours
 */
export interface ShortTermMemory {
  id: string;
  content: string;
  type: 'fact' | 'preference' | 'intent' | 'entity';
  confidence: number;
  created_at: string;
  expires_at?: string;
  source?: string;
}

/**
 * Long-term memory (L2) - Persistent user knowledge
 */
export interface LongTermMemory {
  id: string;
  content: string;
  category: string;
  confidence: number;
  created_at: string;
  updated_at: string;
  access_count: number;
  source?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Semantic memory (L3) - Vector-indexed knowledge
 */
export interface SemanticMemory {
  id: string;
  content: string;
  embedding_id?: string;
  similarity_score?: number;
  confidence: number;
  created_at: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Graph node (L4) - Knowledge graph entities
 */
export interface GraphNode {
  id: string;
  label: string;
  type: string;
  properties?: Record<string, unknown>;
  confidence?: number;
}

/**
 * Graph edge (L4) - Knowledge graph relationships
 */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  weight?: number;
  properties?: Record<string, unknown>;
}

/**
 * Memory graph response
 */
export interface MemoryGraphResponse {
  contact_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata?: {
    node_count: number;
    edge_count: number;
    last_updated: string;
  };
}

/**
 * Memory search request
 */
export interface MemorySearchRequest {
  query: string;
  layers?: MemoryLayer[];
  limit?: number;
  min_confidence?: number;
  include_metadata?: boolean;
}

/**
 * Memory search result
 */
export interface MemorySearchResult {
  id: string;
  content: string;
  layer: MemoryLayer;
  confidence: number;
  similarity_score: number;
  created_at: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Memory search response
 */
export interface MemorySearchResponse {
  results: MemorySearchResult[];
  total: number;
  query: string;
  search_time_ms: number;
}

/**
 * Convert API memory to MemoryFact type
 */
function toMemoryFact(
  memory: ShortTermMemory | LongTermMemory | SemanticMemory,
  layer: MemoryLayer
): MemoryFact {
  return {
    id: memory.id,
    content: memory.content,
    layer,
    confidence: memory.confidence,
    createdAt: new Date(memory.created_at),
    source: memory.source,
    metadata: 'metadata' in memory ? memory.metadata : undefined,
  };
}

/**
 * Convert session memory to MemoryFact
 */
function sessionToMemoryFact(session: SessionMemory): MemoryFact {
  return {
    id: session.id,
    content: `[${session.role}] ${session.content}`,
    layer: MemoryLayer.L0_SESSION,
    confidence: 1.0,
    createdAt: new Date(session.timestamp),
    source: 'session',
    metadata: { role: session.role, tokens: session.tokens },
  };
}

/**
 * Memory API base URL (defaults to leo-memory service)
 */
const getMemoryApiUrl = (): string => {
  return import.meta.env.VITE_MEMORY_API_URL || 'http://localhost:8003/api/v1';
};

/**
 * Memory API Service
 */
export const memoryApi = {
  /**
   * Get memory context for a contact
   * Returns all memory layers (L0-L4) for the specified contact
   */
  async getContext(contactId: string): Promise<MemoryContextResponse> {
    const client = getApiClient();
    const memoryUrl = getMemoryApiUrl();

    // Use custom fetch for memory service (different base URL)
    const token = client.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${memoryUrl}/memory/${contactId}/context`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Return empty context for new contacts
        return createEmptyContext(contactId);
      }
      throw new Error(`Failed to fetch memory context: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Get memory graph data for a contact
   * Returns nodes and edges for visualization
   */
  async getGraph(contactId: string): Promise<MemoryGraphResponse> {
    const client = getApiClient();
    const memoryUrl = getMemoryApiUrl();

    const token = client.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${memoryUrl}/memory/graph/${contactId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Return empty graph for new contacts
        return createEmptyGraph(contactId);
      }
      throw new Error(`Failed to fetch memory graph: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Search memories across layers
   */
  async search(request: MemorySearchRequest): Promise<MemorySearchResponse> {
    const client = getApiClient();
    const memoryUrl = getMemoryApiUrl();

    const token = client.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const params = new URLSearchParams({
      q: request.query,
    });

    if (request.layers?.length) {
      params.set('layers', request.layers.join(','));
    }
    if (request.limit) {
      params.set('limit', String(request.limit));
    }
    if (request.min_confidence) {
      params.set('min_confidence', String(request.min_confidence));
    }
    if (request.include_metadata) {
      params.set('include_metadata', 'true');
    }

    const response = await fetch(`${memoryUrl}/memory/search?${params.toString()}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Memory search failed: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Convert API response to MemoryViewer data format
   */
  contextToViewerData(context: MemoryContextResponse) {
    const layers: { [K in MemoryLayer]?: MemoryFact[] } = {};

    // L0 - Session History
    if (context.L0?.session_history?.length) {
      layers[MemoryLayer.L0_SESSION] = context.L0.session_history.map(sessionToMemoryFact);
    }

    // L1 - Short Term
    if (context.L1?.short_term?.length) {
      layers[MemoryLayer.L1_CONVERSATION] = context.L1.short_term.map((m) =>
        toMemoryFact(m, MemoryLayer.L1_CONVERSATION)
      );
    }

    // L2 - Long Term
    if (context.L2?.long_term?.length) {
      layers[MemoryLayer.L2_USER] = context.L2.long_term.map((m) =>
        toMemoryFact(m, MemoryLayer.L2_USER)
      );
    }

    // L3 - Semantic
    if (context.L3?.semantic?.length) {
      layers[MemoryLayer.L3_SEMANTIC] = context.L3.semantic.map((m) =>
        toMemoryFact(m, MemoryLayer.L3_SEMANTIC)
      );
    }

    // L4 - Graph (convert nodes to facts for viewer)
    if (context.L4?.graph?.length) {
      layers[MemoryLayer.L4_GRAPH] = context.L4.graph.map((node) => ({
        id: node.id,
        content: `${node.type}: ${node.label}`,
        layer: MemoryLayer.L4_GRAPH,
        confidence: node.confidence ?? 1.0,
        createdAt: new Date(),
        source: 'graph',
        metadata: node.properties,
      }));
    }

    return {
      layers,
      stats: {
        totalFacts: Object.values(layers).reduce((sum, arr) => sum + (arr?.length || 0), 0),
        lastUpdated: context.metadata?.last_updated
          ? new Date(context.metadata.last_updated)
          : undefined,
      },
    };
  },

  /**
   * Convert graph response to MemoryGraph component format
   */
  graphToComponentData(graph: MemoryGraphResponse) {
    return {
      nodes: graph.nodes.map((node) => ({
        id: node.id,
        label: node.label,
        layer: nodeTypeToLayer(node.type),
        content: node.properties?.description as string | undefined,
        confidence: node.confidence,
        metadata: node.properties,
      })),
      edges: graph.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        relation: edge.relation,
        weight: edge.weight,
      })),
    };
  },
};

/**
 * Map node type to memory layer
 */
function nodeTypeToLayer(type: string): MemoryLayer {
  switch (type.toLowerCase()) {
    case 'session':
    case 'message':
      return MemoryLayer.L0_SESSION;
    case 'conversation':
    case 'topic':
      return MemoryLayer.L1_CONVERSATION;
    case 'user':
    case 'preference':
    case 'profile':
      return MemoryLayer.L2_USER;
    case 'concept':
    case 'entity':
    case 'semantic':
      return MemoryLayer.L3_SEMANTIC;
    default:
      return MemoryLayer.L4_GRAPH;
  }
}

/**
 * Create empty context for new contacts
 */
function createEmptyContext(contactId: string): MemoryContextResponse {
  return {
    contact_id: contactId,
    L0: { session_history: [] },
    L1: { short_term: [] },
    L2: { long_term: [] },
    L3: { semantic: [] },
    L4: { graph: [] },
    metadata: {
      last_updated: new Date().toISOString(),
      total_memories: 0,
    },
  };
}

/**
 * Create empty graph for new contacts
 */
function createEmptyGraph(contactId: string): MemoryGraphResponse {
  return {
    contact_id: contactId,
    nodes: [],
    edges: [],
    metadata: {
      node_count: 0,
      edge_count: 0,
      last_updated: new Date().toISOString(),
    },
  };
}

export default memoryApi;
