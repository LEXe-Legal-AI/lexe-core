/**
 * LEO Frontend - Agent API Service
 * API integration with leo-orchestrator for agent management
 */

import { apiClient, getResponseData } from './client';
import type { PaginatedRequest, PaginatedResponse, ApiResponse } from './types';

// ============================================================================
// Agent Types
// ============================================================================

/**
 * Possible status values for an agent
 */
export type AgentStatus = 'idle' | 'active' | 'busy' | 'error' | 'offline';

/**
 * Types of agents in the LEO orchestrator system
 */
export type AgentType = 'orchestrator' | 'router' | 'memory' | 'channel' | 'worker';

/**
 * Represents a task currently being executed by an agent
 */
export interface AgentCurrentTask {
  id: string;
  name: string;
  progress: number;
}

/**
 * Performance metrics for an agent
 */
export interface AgentMetricsData {
  tasksCompleted: number;
  avgResponseTime: number;
  successRate: number;
  uptime: number;
}

/**
 * Full agent representation
 */
export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  description?: string;
  capabilities: string[];
  currentTask?: AgentCurrentTask;
  metrics: AgentMetricsData;
  lastActiveAt: string;
  createdAt: string;
  config?: Record<string, unknown>;
}

/**
 * Status values for agent tasks
 */
export type AgentTaskStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Priority levels for agent tasks
 */
export type AgentTaskPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Represents a task assigned to an agent
 */
export interface AgentTask {
  id: string;
  agentId: string;
  name: string;
  status: AgentTaskStatus;
  priority: AgentTaskPriority;
  progress: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

/**
 * Summary metrics for all agents
 */
export interface AgentMetrics {
  totalAgents: number;
  activeAgents: number;
  idleAgents: number;
  errorAgents: number;
  totalTasksToday: number;
  avgResponseTime: number;
  successRate: number;
}

/**
 * Filter options for listing agents
 */
export interface AgentsFilter extends PaginatedRequest {
  status?: AgentStatus;
  type?: AgentType;
  search?: string;
}

/**
 * Request body for creating/assigning a task to an agent
 */
export interface CreateAgentTaskRequest {
  name: string;
  priority?: AgentTaskPriority;
  input?: Record<string, unknown>;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Agent API service for managing LEO orchestrator agents
 */
export const agentsApi = {
  /**
   * Get all agents with optional filtering and pagination
   * @param filters - Optional filters for status, type, search, and pagination
   * @returns Paginated list of agents
   */
  getAgents: async (filters?: AgentsFilter): Promise<PaginatedResponse<Agent>> => {
    const response = await apiClient.get('/orchestrator/agents', { params: filters });
    return getResponseData(response);
  },

  /**
   * Get a single agent by ID
   * @param id - The agent's unique identifier
   * @returns The agent details
   */
  getAgent: async (id: string): Promise<Agent> => {
    const response = await apiClient.get(`/orchestrator/agents/${id}`);
    return getResponseData(response);
  },

  /**
   * Get aggregated metrics for all agents
   * @returns Summary metrics including counts and performance data
   */
  getMetrics: async (): Promise<AgentMetrics> => {
    const response = await apiClient.get('/orchestrator/agents/metrics');
    return getResponseData(response);
  },

  /**
   * Get tasks for a specific agent
   * @param agentId - The agent's unique identifier
   * @param filters - Optional pagination filters
   * @returns Paginated list of agent tasks
   */
  getAgentTasks: async (
    agentId: string,
    filters?: PaginatedRequest
  ): Promise<PaginatedResponse<AgentTask>> => {
    const response = await apiClient.get(`/orchestrator/agents/${agentId}/tasks`, {
      params: filters,
    });
    return getResponseData(response);
  },

  /**
   * Get a specific task by ID
   * @param agentId - The agent's unique identifier
   * @param taskId - The task's unique identifier
   * @returns The task details
   */
  getAgentTask: async (agentId: string, taskId: string): Promise<AgentTask> => {
    const response = await apiClient.get(`/orchestrator/agents/${agentId}/tasks/${taskId}`);
    return getResponseData(response);
  },

  /**
   * Start an agent that is currently stopped or idle
   * @param id - The agent's unique identifier
   * @returns The updated agent with new status
   */
  startAgent: async (id: string): Promise<ApiResponse<Agent>> => {
    const response = await apiClient.post(`/orchestrator/agents/${id}/start`);
    return getResponseData(response);
  },

  /**
   * Stop a running agent
   * @param id - The agent's unique identifier
   * @returns The updated agent with new status
   */
  stopAgent: async (id: string): Promise<ApiResponse<Agent>> => {
    const response = await apiClient.post(`/orchestrator/agents/${id}/stop`);
    return getResponseData(response);
  },

  /**
   * Restart an agent (stop and start)
   * @param id - The agent's unique identifier
   * @returns The updated agent with new status
   */
  restartAgent: async (id: string): Promise<ApiResponse<Agent>> => {
    const response = await apiClient.post(`/orchestrator/agents/${id}/restart`);
    return getResponseData(response);
  },

  /**
   * Assign a new task to an agent
   * @param agentId - The agent's unique identifier
   * @param task - The task to assign
   * @returns The created task
   */
  assignTask: async (
    agentId: string,
    task: CreateAgentTaskRequest
  ): Promise<ApiResponse<AgentTask>> => {
    const response = await apiClient.post(`/orchestrator/agents/${agentId}/tasks`, task);
    return getResponseData(response);
  },

  /**
   * Cancel a running or pending task
   * @param agentId - The agent's unique identifier
   * @param taskId - The task's unique identifier
   * @returns The cancelled task
   */
  cancelTask: async (agentId: string, taskId: string): Promise<ApiResponse<AgentTask>> => {
    const response = await apiClient.post(
      `/orchestrator/agents/${agentId}/tasks/${taskId}/cancel`
    );
    return getResponseData(response);
  },

  /**
   * Update agent configuration
   * @param id - The agent's unique identifier
   * @param config - The new configuration values
   * @returns The updated agent
   */
  updateAgentConfig: async (
    id: string,
    config: Record<string, unknown>
  ): Promise<ApiResponse<Agent>> => {
    const response = await apiClient.patch(`/orchestrator/agents/${id}/config`, { config });
    return getResponseData(response);
  },

  /**
   * Get agent logs for debugging and monitoring
   * @param id - The agent's unique identifier
   * @param filters - Optional filters for log retrieval
   * @returns List of log entries
   */
  getAgentLogs: async (
    id: string,
    filters?: {
      level?: 'debug' | 'info' | 'warn' | 'error';
      startTime?: string;
      endTime?: string;
      limit?: number;
    }
  ): Promise<{
    logs: Array<{
      timestamp: string;
      level: string;
      message: string;
      metadata?: Record<string, unknown>;
    }>;
  }> => {
    const response = await apiClient.get(`/orchestrator/agents/${id}/logs`, {
      params: filters,
    });
    return getResponseData(response);
  },

  /**
   * Get health status of an agent
   * @param id - The agent's unique identifier
   * @returns Health check information
   */
  getAgentHealth: async (
    id: string
  ): Promise<{
    healthy: boolean;
    lastCheck: string;
    details: {
      cpu: number;
      memory: number;
      connections: number;
    };
  }> => {
    const response = await apiClient.get(`/orchestrator/agents/${id}/health`);
    return getResponseData(response);
  },
};

export default agentsApi;
