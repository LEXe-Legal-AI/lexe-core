// Message Types
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  phase?: number;
  phaseName?: string;
  tools?: ToolExecution[];
  attachments?: Attachment[];
  tokens?: number;
  model?: string;
}

// Tool Execution Types
export interface ToolExecution {
  id: string;
  name: string;
  type: 'browser' | 'search' | 'code' | 'file' | 'custom';
  status: 'pending' | 'executing' | 'completed' | 'failed';
  input?: unknown;
  output?: unknown;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

// Attachment Types
export interface Attachment {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  url?: string;
  status: 'uploading' | 'uploaded' | 'processing' | 'ready' | 'failed';
  extractedText?: string;
  error?: string;
}

// Conversation Types
export interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  preview?: string;
  metadata?: ConversationMetadata;
}

export interface ConversationMetadata {
  channel?: string;
  tags?: string[];
  context?: Record<string, unknown>;
}

// Memory Types
export interface MemoryFact {
  id: string;
  content: string;
  layer: MemoryLayer;
  confidence: number;
  createdAt: Date;
  source?: string;
  metadata?: Record<string, unknown>;
}

export enum MemoryLayer {
  L0_SESSION = 0,
  L1_CONVERSATION = 1,
  L2_USER = 2,
  L3_SEMANTIC = 3,
  L4_GRAPH = 4,
}

// Plugin Types
export interface Plugin {
  id: string;
  name: string;
  type: 'tool' | 'channel' | 'memory';
  icon?: string;
  description?: string;
  enabled: boolean;
  config?: Record<string, unknown>;
}

// Theme Types
export type Theme = 'light' | 'dark' | 'system';

// API Types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// Streaming Types
export interface StreamEvent {
  type: 'phase_start' | 'token' | 'tool_call' | 'tool_result' | 'done' | 'error';
  data: Record<string, unknown>;
  timestamp: number;
}

// User Types
export interface User {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: Theme;
  language: string;
  notifications: boolean;
}

// Config Types
export interface WebchatConfig {
  apiUrl: string;
  tenantId?: string;
  theme?: Theme;
  language?: string;
  features?: {
    attachments?: boolean;
    voice?: boolean;
    memory?: boolean;
    tools?: boolean;
  };
  branding?: {
    name?: string;
    logo?: string;
    primaryColor?: string;
  };
}
