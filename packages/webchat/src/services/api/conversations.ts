/**
 * Conversation API Service
 *
 * Handles conversation CRUD operations with the backend.
 */

import { getApiClient } from './client';

/**
 * Conversation response from API
 */
export interface ApiConversation {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  title: string | null;
  channel: string;
  status: 'active' | 'archived' | 'deleted';
  metadata: Record<string, unknown>;
  message_count: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Message response from API
 */
export interface ApiMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens_used: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Paginated list response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

/**
 * Create conversation request
 */
export interface CreateConversationRequest {
  title?: string;
  channel?: 'webchat' | 'whatsapp' | 'email' | 'telegram';
  metadata?: Record<string, unknown>;
}

/**
 * Create message request
 */
export interface CreateMessageRequest {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens_used?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Conversation API service
 */
export const conversationApi = {
  /**
   * List conversations with pagination
   */
  async list(
    page = 1,
    pageSize = 20,
    filters?: { status?: string; channel?: string }
  ): Promise<PaginatedResponse<ApiConversation>> {
    const client = getApiClient();
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });

    if (filters?.status) params.append('status', filters.status);
    if (filters?.channel) params.append('channel', filters.channel);

    const response = await client.get<PaginatedResponse<ApiConversation>>(
      `/conversations?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get conversation by ID
   */
  async get(id: string, includeMessages = true): Promise<ApiConversation & { messages?: ApiMessage[] }> {
    const client = getApiClient();
    const params = new URLSearchParams({
      include_messages: String(includeMessages),
    });

    const response = await client.get<ApiConversation & { messages?: ApiMessage[] }>(
      `/conversations/${id}?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Create new conversation
   */
  async create(data: CreateConversationRequest = {}): Promise<ApiConversation> {
    const client = getApiClient();
    const response = await client.post<ApiConversation>('/conversations', {
      title: data.title,
      channel: data.channel || 'webchat',
      metadata: data.metadata || {},
    });
    return response.data;
  },

  /**
   * Update conversation
   */
  async update(
    id: string,
    data: { title?: string; status?: string; metadata?: Record<string, unknown> }
  ): Promise<ApiConversation> {
    const client = getApiClient();
    const response = await client.patch<ApiConversation>(`/conversations/${id}`, data);
    return response.data;
  },

  /**
   * Delete conversation (soft delete by default)
   */
  async delete(id: string, hard = false): Promise<void> {
    const client = getApiClient();
    const params = hard ? '?hard=true' : '';
    await client.delete(`/conversations/${id}${params}`);
  },

  /**
   * Get messages for a conversation
   */
  async getMessages(
    conversationId: string,
    page = 1,
    pageSize = 50
  ): Promise<PaginatedResponse<ApiMessage>> {
    const client = getApiClient();
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });

    const response = await client.get<PaginatedResponse<ApiMessage>>(
      `/conversations/${conversationId}/messages?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Add message to conversation
   */
  async addMessage(conversationId: string, data: CreateMessageRequest): Promise<ApiMessage> {
    const client = getApiClient();
    const response = await client.post<ApiMessage>(
      `/conversations/${conversationId}/messages`,
      data
    );
    return response.data;
  },

  /**
   * Delete message
   */
  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    const client = getApiClient();
    await client.delete(`/conversations/${conversationId}/messages/${messageId}`);
  },

  /**
   * Auto-generate title from first message
   */
  async autoTitle(conversationId: string): Promise<ApiConversation> {
    const client = getApiClient();
    const response = await client.post<ApiConversation>(
      `/conversations/${conversationId}/auto-title`
    );
    return response.data;
  },
};

export default conversationApi;
