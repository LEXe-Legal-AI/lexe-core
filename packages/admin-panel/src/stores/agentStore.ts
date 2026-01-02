/**
 * LEO Frontend - Agent Store
 * Zustand store for agent state management
 *
 * Manages:
 * - List of agents with their statuses
 * - Selected agent for detail view
 * - Agent metrics and statistics
 * - Real-time status updates
 * - Filtering and search
 */

import { create } from 'zustand';
import type {
  Agent,
  AgentMetrics,
  AgentStatus,
  AgentType,
  AgentCurrentTask,
} from '@/api/agents';

/**
 * Agent event for activity logging (real-time updates)
 */
export interface AgentEvent {
  id: string;
  agentId: string;
  agentName: string;
  type: 'task_started' | 'task_completed' | 'task_failed' | 'status_change' | 'error';
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

// ============================================================================
// Types
// ============================================================================

/**
 * Filter options for agent list
 */
interface AgentFilters {
  status?: AgentStatus;
  type?: AgentType;
  search?: string;
}

/**
 * Agent store state
 */
interface AgentState {
  /** List of all agents */
  agents: Agent[];
  /** Currently selected agent for detail view */
  selectedAgent: Agent | null;
  /** Aggregated metrics for all agents */
  metrics: AgentMetrics | null;
  /** Current filter settings */
  filters: AgentFilters;
  /** Recent agent events */
  recentEvents: AgentEvent[];
  /** Loading state for async operations */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Timestamp of last data refresh */
  lastRefreshedAt: string | null;
}

/**
 * Agent store actions
 */
interface AgentActions {
  // Data setters
  setAgents: (agents: Agent[]) => void;
  setSelectedAgent: (agent: Agent | null) => void;
  setMetrics: (metrics: AgentMetrics) => void;
  setFilters: (filters: AgentFilters) => void;
  setRecentEvents: (events: AgentEvent[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Real-time update handlers
  updateAgentStatus: (agentId: string, status: AgentStatus) => void;
  updateAgentTask: (agentId: string, task: AgentCurrentTask | undefined) => void;
  updateAgent: (agentId: string, updates: Partial<Agent>) => void;
  addEvent: (event: AgentEvent) => void;

  // Utility actions
  clearFilters: () => void;
  resetStore: () => void;
  markRefreshed: () => void;

  // Computed getters
  getFilteredAgents: () => Agent[];
  getAgentById: (agentId: string) => Agent | undefined;
  getAgentsByStatus: (status: AgentStatus) => Agent[];
  getAgentsByType: (type: AgentType) => Agent[];
}

type AgentStore = AgentState & AgentActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: AgentState = {
  agents: [],
  selectedAgent: null,
  metrics: null,
  filters: {},
  recentEvents: [],
  isLoading: false,
  error: null,
  lastRefreshedAt: null,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useAgentStore = create<AgentStore>()((set, get) => ({
  ...initialState,

  // --------------------------------------------------------------------------
  // Data Setters
  // --------------------------------------------------------------------------

  setAgents: (agents) => set({ agents, lastRefreshedAt: new Date().toISOString() }),

  setSelectedAgent: (selectedAgent) => set({ selectedAgent }),

  setMetrics: (metrics) => set({ metrics }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  setRecentEvents: (recentEvents) => set({ recentEvents }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  // --------------------------------------------------------------------------
  // Real-time Update Handlers
  // --------------------------------------------------------------------------

  /**
   * Update status for a specific agent
   * Updates both the agents list and selectedAgent if applicable
   */
  updateAgentStatus: (agentId, status) =>
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === agentId
          ? { ...agent, status, lastActiveAt: new Date().toISOString() }
          : agent
      ),
      selectedAgent:
        state.selectedAgent?.id === agentId
          ? { ...state.selectedAgent, status, lastActiveAt: new Date().toISOString() }
          : state.selectedAgent,
    })),

  /**
   * Update current task for a specific agent
   * Pass undefined to clear the current task
   */
  updateAgentTask: (agentId, task) =>
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === agentId
          ? { ...agent, currentTask: task, lastActiveAt: new Date().toISOString() }
          : agent
      ),
      selectedAgent:
        state.selectedAgent?.id === agentId
          ? { ...state.selectedAgent, currentTask: task, lastActiveAt: new Date().toISOString() }
          : state.selectedAgent,
    })),

  /**
   * Update multiple fields for a specific agent
   */
  updateAgent: (agentId, updates) =>
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === agentId ? { ...agent, ...updates } : agent
      ),
      selectedAgent:
        state.selectedAgent?.id === agentId
          ? { ...state.selectedAgent, ...updates }
          : state.selectedAgent,
    })),

  /**
   * Add a new event to the recent events list
   * Keeps only the most recent 100 events
   */
  addEvent: (event) =>
    set((state) => ({
      recentEvents: [event, ...state.recentEvents].slice(0, 100),
    })),

  // --------------------------------------------------------------------------
  // Utility Actions
  // --------------------------------------------------------------------------

  clearFilters: () => set({ filters: {} }),

  resetStore: () => set(initialState),

  markRefreshed: () => set({ lastRefreshedAt: new Date().toISOString() }),

  // --------------------------------------------------------------------------
  // Computed Getters
  // --------------------------------------------------------------------------

  /**
   * Get agents filtered by current filter settings
   */
  getFilteredAgents: () => {
    const { agents, filters } = get();

    return agents.filter((agent) => {
      // Filter by status
      if (filters.status && agent.status !== filters.status) {
        return false;
      }

      // Filter by type
      if (filters.type && agent.type !== filters.type) {
        return false;
      }

      // Filter by search term (name or description)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesName = agent.name.toLowerCase().includes(searchLower);
        const matchesDescription = agent.description?.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesDescription) {
          return false;
        }
      }

      return true;
    });
  },

  /**
   * Get a specific agent by ID
   */
  getAgentById: (agentId) => {
    const { agents } = get();
    return agents.find((agent) => agent.id === agentId);
  },

  /**
   * Get all agents with a specific status
   */
  getAgentsByStatus: (status) => {
    const { agents } = get();
    return agents.filter((agent) => agent.status === status);
  },

  /**
   * Get all agents of a specific type
   */
  getAgentsByType: (type) => {
    const { agents } = get();
    return agents.filter((agent) => agent.type === type);
  },
}));

// ============================================================================
// Selector Hooks (for optimized re-renders)
// ============================================================================

/**
 * Select only the agents list
 */
export const useAgents = () => useAgentStore((state) => state.agents);

/**
 * Select only the selected agent
 */
export const useSelectedAgent = () => useAgentStore((state) => state.selectedAgent);

/**
 * Select only the metrics
 */
export const useAgentMetrics = () => useAgentStore((state) => state.metrics);

/**
 * Select only the loading state
 */
export const useAgentLoading = () => useAgentStore((state) => state.isLoading);

/**
 * Select only the error state
 */
export const useAgentError = () => useAgentStore((state) => state.error);

/**
 * Select only the filters
 */
export const useAgentFilters = () => useAgentStore((state) => state.filters);

/**
 * Select only recent events
 */
export const useAgentEvents = () => useAgentStore((state) => state.recentEvents);
