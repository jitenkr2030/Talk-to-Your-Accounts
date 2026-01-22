/**
 * API Client
 * 
 * HTTP client for communicating with the enterprise integrations backend service.
 */

import { getConfig } from '../config/IntegrationConfig';
import type {
  ApiResponse,
  ConnectionResult,
  WebhookDeliveryLog,
  JobStatus,
  TenantLimits,
  SyncStatus,
} from '../types/integration';
import { INTEGRATION_EVENTS } from '../utils/constants';

/**
 * Create the API client instance with default configuration
 */
class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private accessToken: string | null = null;
  private eventListeners: Map<string, Set<(payload: unknown) => void>> = new Map();

  constructor() {
    const config = getConfig();
    this.baseUrl = config.apiBaseUrl;
    this.timeout = config.apiTimeout;
  }

  /**
   * Set the access token for authenticated requests
   */
  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  /**
   * Get authorization headers for requests
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  /**
   * Make an API request with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.code || 'UNKNOWN_ERROR',
            message: data.message || 'An error occurred',
            details: data.details,
          },
        };
      }

      return {
        success: true,
        data,
        correlationId: response.headers.get('X-Correlation-ID') || undefined,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: 'Request timed out',
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error',
        },
      };
    }
  }

  // ==================== OAuth Endpoints ====================

  /**
   * Get authorization URL for a provider
   */
  async getAuthorizationUrl(provider: string, state: string): Promise<ApiResponse<{ url: string }>> {
    return this.request(`/auth/${provider}/authorize?state=${encodeURIComponent(state)}`);
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(
    provider: string,
    code: string,
    state: string
  ): Promise<ApiResponse<ConnectionResult>> {
    return this.request(`/auth/${provider}/callback`, {
      method: 'POST',
      body: JSON.stringify({ code, state }),
    });
  }

  /**
   * Refresh access token
   */
  async refreshToken(provider: string): Promise<ApiResponse<{ tokens: { accessToken: string; expiresAt: string } }>> {
    return this.request(`/auth/${provider}/refresh`, {
      method: 'POST',
    });
  }

  /**
   * Revoke provider connection
   */
  async revokeConnection(provider: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/auth/${provider}/revoke`, {
      method: 'POST',
    });
  }

  /**
   * Get connection status
   */
  async getConnectionStatus(provider: string): Promise<ApiResponse<{ connected: boolean; details?: Record<string, unknown> }>> {
    return this.request(`/auth/${provider}/status`);
  }

  // ==================== Webhook Endpoints ====================

  /**
   * Verify webhook signature
   */
  async verifyWebhook(
    provider: string,
    payload: string,
    signature: string
  ): Promise<ApiResponse<{ valid: boolean }>> {
    return this.request(`/webhooks/${provider}/verify`, {
      method: 'POST',
      body: JSON.stringify({ payload, signature }),
    });
  }

  /**
   * Get webhook delivery logs
   */
  async getWebhookLogs(
    provider?: string,
    options?: { limit?: number; offset?: number }
  ): Promise<ApiResponse<WebhookDeliveryLog[]>> {
    const params = new URLSearchParams();
    if (provider) params.append('provider', provider);
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.offset) params.append('offset', String(options.offset));

    return this.request(`/webhooks/logs?${params.toString()}`);
  }

  /**
   * Retry failed webhook delivery
   */
  async retryWebhook(deliveryId: string): Promise<ApiResponse<WebhookDeliveryLog>> {
    return this.request(`/webhooks/retry/${deliveryId}`, {
      method: 'POST',
    });
  }

  // ==================== Queue Endpoints ====================

  /**
   * Add job to queue
   */
  async addJob(job: {
    provider: string;
    operation: string;
    payload: Record<string, unknown>;
    priority?: number;
  }): Promise<ApiResponse<{ jobId: string }>> {
    return this.request('/queue/jobs', {
      method: 'POST',
      body: JSON.stringify(job),
    });
  }

  /**
   * Get queue status
   */
  async getQueueStatus(provider?: string): Promise<ApiResponse<Record<string, JobStatus>>> {
    const endpoint = provider ? `/queue/status/${provider}` : '/queue/status';
    return this.request(endpoint);
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(provider: string): Promise<ApiResponse<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }>> {
    return this.request(`/queue/rate-limit/${provider}`);
  }

  /**
   * Pause queue
   */
  async pauseQueue(provider: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/queue/pause/${provider}`, {
      method: 'POST',
    });
  }

  /**
   * Resume queue
   */
  async resumeQueue(provider: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/queue/resume/${provider}`, {
      method: 'POST',
    });
  }

  // ==================== Tenant Endpoints ====================

  /**
   * Get tenant context
   */
  async getTenantContext(): Promise<ApiResponse<{
    tenantId: string;
    tenantName: string;
    status: string;
    plan: string;
  }>> {
    return this.request('/tenant/context');
  }

  /**
   * Get tenant limits
   */
  async getTenantLimits(): Promise<ApiResponse<TenantLimits>> {
    return this.request('/tenant/limits');
  }

  /**
   * Get tenant settings
   */
  async getTenantSettings(): Promise<ApiResponse<Record<string, unknown>>> {
    return this.request('/tenant/settings');
  }

  /**
   * Update tenant settings
   */
  async updateTenantSettings(settings: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> {
    return this.request('/tenant/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  // ==================== Sync Endpoints ====================

  /**
   * Start sync operation
   */
  async startSync(provider: string, options?: {
    entities?: string[];
    since?: string;
  }): Promise<ApiResponse<{ syncId: string }>> {
    return this.request(`/sync/${provider}/start`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
  }

  /**
   * Get sync status
   */
  async getSyncStatus(provider: string): Promise<ApiResponse<SyncStatus>> {
    return this.request(`/sync/${provider}/status`);
  }

  /**
   * Cancel sync operation
   */
  async cancelSync(provider: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/sync/${provider}/cancel`, {
      method: 'POST',
    });
  }

  // ==================== Health Endpoints ====================

  /**
   * Health check
   */
  async healthCheck(): Promise<ApiResponse<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, boolean>;
    version: string;
  }>> {
    return this.request('/health');
  }

  /**
   * Get circuit breaker status
   */
  async getCircuitBreakerStatus(): Promise<ApiResponse<Record<string, {
    state: string;
    failures: number;
    successes: number;
  }>>> {
    return this.request('/health/circuit-breakers');
  }

  // ==================== Event Handling ====================

  /**
   * Subscribe to integration events
   */
  on(event: string, callback: (payload: unknown) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  /**
   * Emit an integration event
   */
  emit(event: string, payload: unknown): void {
    this.eventListeners.get(event)?.forEach((callback) => callback(payload));
  }

  // ==================== OAuth Event Listeners ====================

  /**
   * Subscribe to OAuth completion events
   */
  onOAuthCompleted(callback: (result: ConnectionResult) => void): () => void {
    return this.on(INTEGRATION_EVENTS.OAUTH_COMPLETED, callback);
  }

  /**
   * Subscribe to OAuth failure events
   */
  onOAuthFailed(callback: (error: { provider: string; error: string }) => void): () => void {
    return this.on(INTEGRATION_EVENTS.OAUTH_FAILED, callback);
  }

  /**
   * Subscribe to token refresh events
   */
  onTokenRefreshed(callback: (data: { provider: string; expiresAt: string }) => void): () => void {
    return this.on(INTEGRATION_EVENTS.TOKEN_REFRESHED, callback);
  }

  /**
   * Subscribe to webhook events
   */
  onWebhookReceived(callback: (webhook: WebhookDeliveryLog) => void): () => void {
    return this.on(INTEGRATION_EVENTS.WEBHOOK_RECEIVED, callback);
  }

  /**
   * Subscribe to job completion events
   */
  onJobCompleted(callback: (data: { jobId: string; provider: string; result: unknown }) => void): () => void {
    return this.on(INTEGRATION_EVENTS.JOB_COMPLETED, callback);
  }

  /**
   * Subscribe to job failure events
   */
  onJobFailed(callback: (data: { jobId: string; provider: string; error: string }) => void): () => void {
    return this.on(INTEGRATION_EVENTS.JOB_FAILED, callback);
  }
}

// Singleton instance
let apiClientInstance: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!apiClientInstance) {
    apiClientInstance = new ApiClient();
  }
  return apiClientInstance;
}

export const apiClient = getApiClient();
