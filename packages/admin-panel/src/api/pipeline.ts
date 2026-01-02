/**
 * LEO Frontend - Pipeline API Service
 * API integration for ORCHIDEA pipeline management
 */

import { apiClient, getResponseData } from './client';
import type { PaginatedRequest, PaginatedResponse } from './types';

// Pipeline Types
export type PipelinePhase =
  | 'intake'
  | 'routing'
  | 'processing'
  | 'memory'
  | 'generation'
  | 'validation'
  | 'delivery';

export type PipelineStatus = 'healthy' | 'degraded' | 'error' | 'maintenance';

export interface PipelinePhaseMetrics {
  phase: PipelinePhase;
  status: 'active' | 'idle' | 'error';
  avgLatencyMs: number;
  throughput: number; // requests/min
  errorRate: number;
  lastProcessedAt?: string;
}

export interface PipelineRun {
  id: string;
  conversationId: string;
  channel: 'whatsapp' | 'email' | 'web';
  status: 'running' | 'completed' | 'failed';
  currentPhase: PipelinePhase;
  phases: {
    phase: PipelinePhase;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    startedAt?: string;
    completedAt?: string;
    latencyMs?: number;
    error?: string;
  }[];
  routingLevel: 'L0' | 'L1' | 'L2' | 'L3' | 'L4';
  startedAt: string;
  completedAt?: string;
  totalLatencyMs?: number;
}

export interface PipelineMetrics {
  status: PipelineStatus;
  activeRuns: number;
  completedToday: number;
  failedToday: number;
  avgLatencyMs: number;
  throughput: number;
  phases: PipelinePhaseMetrics[];
  routingDistribution: Record<string, number>;
}

export interface PipelineConfig {
  maxConcurrentRuns: number;
  timeoutMs: number;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
  phases: Record<PipelinePhase, {
    enabled: boolean;
    timeoutMs: number;
    config?: Record<string, unknown>;
  }>;
}

// API Functions
export const pipelineApi = {
  getMetrics: async (): Promise<PipelineMetrics> => {
    const response = await apiClient.get('/orchestrator/pipeline/metrics');
    return getResponseData(response);
  },

  getRuns: async (filters?: PaginatedRequest & { status?: string }): Promise<PaginatedResponse<PipelineRun>> => {
    const response = await apiClient.get('/orchestrator/pipeline/runs', { params: filters });
    return getResponseData(response);
  },

  getRun: async (id: string): Promise<PipelineRun> => {
    const response = await apiClient.get(`/orchestrator/pipeline/runs/${id}`);
    return getResponseData(response);
  },

  getConfig: async (): Promise<PipelineConfig> => {
    const response = await apiClient.get('/orchestrator/pipeline/config');
    return getResponseData(response);
  },

  updateConfig: async (config: Partial<PipelineConfig>): Promise<PipelineConfig> => {
    const response = await apiClient.patch('/orchestrator/pipeline/config', config);
    return getResponseData(response);
  },

  retryRun: async (id: string): Promise<PipelineRun> => {
    const response = await apiClient.post(`/orchestrator/pipeline/runs/${id}/retry`);
    return getResponseData(response);
  },
};

export default pipelineApi;
