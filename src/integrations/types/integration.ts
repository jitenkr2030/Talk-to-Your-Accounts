/**
 * Integration Types
 * 
 * TypeScript type definitions for the integration module.
 */

// Provider Types
export type OAuthProvider = 'quickbooks' | 'xero' | 'zoho';

export interface ProviderConfig {
  enabled: boolean;
  clientId: string;
  redirectUri: string;
}

// Token Types
export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  tokenType: string;
  scope: string;
}

export interface EncryptedTokens {
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
}

// Credential Types
export interface StoredCredentials {
  id: string;
  tenantId: string;
  provider: OAuthProvider;
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  expiresAt: string;
  tokenType: string;
  scope: string;
  realmId?: string;
  tenant?: string;
  createdAt: string;
  updatedAt: string;
  lastRefreshedAt?: string;
}

// Connection Types
export interface ConnectionStatus {
  provider: OAuthProvider;
  connected: boolean;
  lastSyncAt?: string;
  error?: string;
  credentials?: {
    expiresAt: string;
    scope: string;
  };
}

export interface ConnectionResult {
  success: boolean;
  provider: OAuthProvider;
  tokens?: OAuthTokens;
  error?: string;
  realmId?: string;
  tenant?: string;
}

// Webhook Types
export interface WebhookPayload {
  provider: OAuthProvider;
  eventType: string;
  deliveryId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WebhookDeliveryLog {
  id: string;
  provider: OAuthProvider;
  eventType: string;
  deliveryId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  receivedAt: string;
  processedAt?: string;
  attempts: number;
  payload: string;
  response?: string;
  error?: string;
  correlationId?: string;
}

export interface WebhookHandlerResult {
  success: boolean;
  handler?: string;
  result?: Record<string, unknown>;
  error?: string;
}

// Job Types
export interface IntegrationJob {
  id?: string;
  tenantId: string;
  provider: OAuthProvider;
  operation: string;
  payload: Record<string, unknown>;
  priority?: number;
  attempts?: number;
  maxAttempts?: number;
}

export interface JobResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  attempts: number;
}

export interface JobStatus {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

// Queue Types
export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// Tenant Types
export interface TenantContext {
  tenantId: string;
  tenantName: string;
  tenantStatus: 'active' | 'inactive' | 'suspended';
  tenantPlan: string;
  correlationId: string;
  requestId: string;
}

export interface TenantLimits {
  apiCallsRemaining: number;
  integrationsRemaining: number;
  usersRemaining: number;
  storageRemaining: number;
}

export interface TenantSettings {
  defaultCurrency: string;
  timezone: string;
  dateFormat: string;
  notifications: {
    email: boolean;
    webhook: boolean;
    inApp: boolean;
  };
  security: {
    mfaRequired: boolean;
    ipWhitelist: string[];
    sessionTimeout: number;
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  correlationId?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// Error Types
export interface IntegrationError {
  code: string;
  message: string;
  provider?: OAuthProvider;
  correlationId?: string;
  retryable: boolean;
}

// Configuration Types
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface CircuitBreakerConfig {
  timeout: number;
  errorThreshold: number;
  resetTimeout: number;
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  multiplier: number;
  maxDelay: number;
  jitterRange: number;
}

// Event Types
export interface IntegrationEvent {
  type: string;
  provider?: OAuthProvider;
  timestamp: string;
  correlationId: string;
  payload?: Record<string, unknown>;
}

export type IntegrationEventHandler = (event: IntegrationEvent) => void;

// Sync Types
export interface SyncStatus {
  provider: OAuthProvider;
  status: 'idle' | 'syncing' | 'completed' | 'failed';
  lastSyncAt?: string;
  nextSyncAt?: string;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
  error?: string;
}

export interface SyncResult {
  success: boolean;
  provider: OAuthProvider;
  itemsProcessed: number;
  itemsFailed: number;
  errors?: Array<{ item: string; error: string }>;
  duration: number;
}

// Feature Flags
export interface FeatureFlags {
  autoTokenRefresh: boolean;
  rateLimiting: boolean;
  circuitBreaker: boolean;
  retryEnabled: boolean;
}
