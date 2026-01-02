/**
 * LEO Frontend - API Type Definitions
 * TypeScript interfaces for API communication
 */

// ============================================================================
// Authentication Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'operator' | 'viewer';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  isActive: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: User;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

// ============================================================================
// API Error Types
// ============================================================================

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  details?: Record<string, unknown>;
  timestamp: string;
  path: string;
}

export interface ValidationError extends ApiError {
  validationErrors: {
    field: string;
    message: string;
    code: string;
  }[];
}

// ============================================================================
// Contact Types
// ============================================================================

export interface Contact {
  id: string;
  externalId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  channel: 'whatsapp' | 'email' | 'web' | 'sms';
  metadata?: Record<string, unknown>;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  lastContactAt?: string;
}

// ============================================================================
// Conversation Types
// ============================================================================

export type ConversationStatus =
  | 'active'
  | 'pending'
  | 'resolved'
  | 'escalated'
  | 'closed';

export type ConversationPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent';

export interface Conversation {
  id: string;
  contactId: string;
  contact?: Contact;
  channel: 'whatsapp' | 'email' | 'web' | 'sms';
  status: ConversationStatus;
  priority: ConversationPriority;
  subject?: string;
  assignedTo?: string;
  assignedUser?: User;
  tags?: string[];
  metadata?: Record<string, unknown>;
  messageCount: number;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

// ============================================================================
// Message Types
// ============================================================================

export type MessageDirection = 'inbound' | 'outbound';

export type MessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'location'
  | 'contact'
  | 'template'
  | 'interactive';

export type MessageStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export interface MessageAttachment {
  id: string;
  type: 'image' | 'audio' | 'video' | 'document';
  url: string;
  filename?: string;
  mimeType: string;
  size?: number;
}

export interface Message {
  id: string;
  conversationId: string;
  contactId: string;
  direction: MessageDirection;
  type: MessageType;
  content: string;
  attachments?: MessageAttachment[];
  status: MessageStatus;
  metadata?: Record<string, unknown>;
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
  // AI-related fields
  isAiGenerated?: boolean;
  aiConfidence?: number;
  aiModel?: string;
}

// ============================================================================
// Pagination Types
// ============================================================================

export interface PaginatedRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// ============================================================================
// Review Queue Types
// ============================================================================

export type ReviewStatus =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'escalated';

export type ReviewPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent';

export type ReviewType =
  | 'ai_response'
  | 'escalation'
  | 'quality_check'
  | 'compliance';

export interface ReviewItem {
  id: string;
  conversationId: string;
  messageId?: string;
  type: ReviewType;
  status: ReviewStatus;
  priority: ReviewPriority;
  title: string;
  description?: string;
  aiResponse?: string;
  aiConfidence?: number;
  suggestedResponse?: string;
  assignedTo?: string;
  assignedUser?: User;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  dueAt?: string;
}

export interface ReviewFilters {
  status?: ReviewStatus;
  priority?: ReviewPriority;
  type?: ReviewType;
  assignedTo?: string;
  fromDate?: string;
  toDate?: string;
}

export interface ReviewActionRequest {
  action: 'approve' | 'reject' | 'escalate';
  notes?: string;
  modifiedResponse?: string;
}

export interface ReviewStats {
  pending: number;
  inReview: number;
  approvedToday: number;
  rejectedToday: number;
  averageReviewTime: number;
}

// ============================================================================
// Tenant Types
// ============================================================================

export type TenantStatus = 'active' | 'suspended' | 'trial' | 'cancelled';

export type TenantPlan = 'free' | 'starter' | 'professional' | 'enterprise';

export interface TenantLimits {
  maxUsers: number;
  maxContacts: number;
  maxConversationsPerMonth: number;
  maxAgents: number;
  maxStorageGb: number;
}

export interface TenantFeatures {
  whatsapp: boolean;
  email: boolean;
  sms: boolean;
  webWidget: boolean;
  aiAssistant: boolean;
  customPrompts: boolean;
  analytics: boolean;
  apiAccess: boolean;
  webhooks: boolean;
  multiLanguage: boolean;
}

export interface TenantUsage {
  currentUsers: number;
  currentContacts: number;
  conversationsThisMonth: number;
  activeAgents: number;
  storageUsedGb: number;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  status: TenantStatus;
  plan: TenantPlan;
  limits: TenantLimits;
  features: TenantFeatures;
  usage?: TenantUsage;
  ownerId: string;
  owner?: User;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  vatNumber?: string;
  logoUrl?: string;
  primaryColor?: string;
  timezone: string;
  language: string;
  createdAt: string;
  updatedAt: string;
  trialEndsAt?: string;
  billingCycleStart?: string;
}

export interface TenantCreateRequest {
  name: string;
  slug: string;
  domain?: string;
  plan: TenantPlan;
  contactEmail: string;
  contactPhone?: string;
  ownerId?: string;
}

export interface TenantUpdateRequest {
  name?: string;
  domain?: string;
  status?: TenantStatus;
  plan?: TenantPlan;
  limits?: Partial<TenantLimits>;
  features?: Partial<TenantFeatures>;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  vatNumber?: string;
  logoUrl?: string;
  primaryColor?: string;
  timezone?: string;
  language?: string;
}

// ============================================================================
// Channel Types
// ============================================================================

export type ChannelType = 'whatsapp' | 'email' | 'sms' | 'web';

export type ChannelStatus = 'active' | 'inactive' | 'error' | 'pending' | 'configuring';

export interface WhatsAppConfig {
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
  webhookVerifyToken: string;
  displayPhoneNumber: string;
}

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
  fromEmail: string;
  fromName: string;
  useTls: boolean;
}

export interface SmsConfig {
  provider: 'twilio' | 'vonage' | 'messagebird';
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export interface WebWidgetConfig {
  primaryColor: string;
  secondaryColor: string;
  position: 'bottom-right' | 'bottom-left';
  greeting: string;
  offlineMessage: string;
  collectEmail: boolean;
  collectPhone: boolean;
  allowedDomains: string[];
}

export type ChannelConfig = WhatsAppConfig | EmailConfig | SmsConfig | WebWidgetConfig;

export interface Channel {
  id: string;
  tenantId: string;
  type: ChannelType;
  name: string;
  status: ChannelStatus;
  config: ChannelConfig;
  isDefault: boolean;
  webhookUrl?: string;
  lastActivityAt?: string;
  errorMessage?: string;
  messagesSent: number;
  messagesReceived: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelCreateRequest {
  type: ChannelType;
  name: string;
  config: ChannelConfig;
  isDefault?: boolean;
}

export interface ChannelUpdateRequest {
  name?: string;
  status?: ChannelStatus;
  config?: Partial<ChannelConfig>;
  isDefault?: boolean;
}

export interface ChannelTestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
  testedAt: string;
}

// ============================================================================
// Generic API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiListResponse<T> extends ApiResponse<T[]> {
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}
