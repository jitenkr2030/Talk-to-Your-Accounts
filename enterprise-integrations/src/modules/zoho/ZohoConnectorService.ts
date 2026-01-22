/**
 * Zoho Connector Service
 * 
 * Handles HTTP communication with Zoho Books API.
 * Includes automatic token refresh, rate limiting, and circuit breaker pattern.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { ZohoConfig, getZohoConfig } from './ZohoConfig';
import { ZohoTokens, ZohoOAuthService, refreshAccessToken } from './ZohoOAuthService';
import CircuitBreaker from 'opossum';

export interface ZohoRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  queryParams?: Record<string, string | number>;
  body?: Record<string, unknown>;
  organizationId: string;
}

export interface ZohoResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Custom error class for Zoho API errors
 */
export class ZohoAPIError extends Error {
  public readonly code: string;
  public readonly message: string;
  public readonly statusCode: number;
  public readonly endpoint: string;
  
  constructor(
    message: string,
    code: string,
    statusCode: number,
    endpoint: string
  ) {
    super(message);
    this.name = 'ZohoAPIError';
    this.code = code;
    this.message = message;
    this.statusCode = statusCode;
    this.endpoint = endpoint;
  }
}

/**
 * Zoho API Connector
 * 
 * Manages all API communications with Zoho Books.
 * Handles authentication, token refresh, and error handling.
 */
export class ZohoConnectorService {
  private config: ZohoConfig;
  private tokens: ZohoTokens | null = null;
  private organizationId: string | null = null;
  private oauthService: ZohoOAuthService;
  private httpClient: AxiosInstance;
  private circuitBreaker: CircuitBreaker;
  private refreshPromise: Promise<ZohoTokens> | null = null;
  
  // Rate limiting state
  private requestsRemaining: number = 100;
  private resetTime: Date | null = null;
  
  constructor(config?: ZohoConfig) {
    this.config = config || getZohoConfig();
    this.oauthService = new ZohoOAuthService(this.config);
    
    // Create base HTTP client
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    // Initialize circuit breaker for API calls
    this.circuitBreaker = new CircuitBreaker(async (fn: () => Promise<unknown>) => fn(), {
      timeout: 10000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
      volumeThreshold: 5
    });
    
    // Set up circuit breaker events
    this.circuitBreaker.on('open', () => {
      console.warn('[Zoho] Circuit breaker OPEN - API calls will fail fast');
    });
    
    this.circuitBreaker.on('close', () => {
      console.info('[Zoho] Circuit breaker CLOSED - API calls restored');
    });
  }
  
  /**
   * Set the current tokens (after OAuth flow)
   */
  setTokens(tokens: ZohoTokens, organizationId: string): void {
    this.tokens = tokens;
    this.organizationId = organizationId;
  }
  
  /**
   * Get the current tokens
   */
  getTokens(): ZohoTokens | null {
    return this.tokens;
  }
  
  /**
   * Get the current organization ID
   */
  getOrganizationId(): string | null {
    return this.organizationId;
  }
  
  /**
   * Check if tokens are valid and not expired
   */
  isTokenValid(): boolean {
    if (!this.tokens) return false;
    
    // Consider token valid if it expires in more than 5 minutes
    const expiresIn = this.tokens.expiresAt.getTime() - Date.now();
    return expiresIn > 5 * 60 * 1000;
  }
  
  /**
   * Ensure we have a valid access token, refreshing if necessary
   */
  private async ensureValidToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error('No tokens set. Please complete OAuth flow first.');
    }
    
    // Check if token needs refresh (within 5 minutes of expiry)
    const expiresIn = this.tokens.expiresAt.getTime() - Date.now();
    
    if (expiresIn <= 5 * 60 * 1000) {
      // Token is expired or about to expire, need to refresh
      return this.refreshTokenIfNeeded();
    }
    
    return this.tokens.accessToken;
  }
  
  /**
   * Refresh token if needed (with deduplication)
   */
  private async refreshTokenIfNeeded(): Promise<string> {
    // If refresh is already in progress, wait for it
    if (this.refreshPromise) {
      const newTokens = await this.refreshPromise;
      return newTokens.accessToken;
    }
    
    if (!this.tokens) {
      throw new Error('No tokens available for refresh');
    }
    
    // Start refresh
    this.refreshPromise = refreshAccessToken(
      this.tokens.refreshToken,
      this.config
    ).then(newTokens => {
      this.tokens = newTokens;
      this.refreshPromise = null;
      return newTokens;
    }).catch(error => {
      this.refreshPromise = null;
      throw error;
    });
    
    const newTokens = await this.refreshPromise;
    return newTokens.accessToken;
  }
  
  /**
   * Build the API URL for an endpoint
   */
  private buildUrl(endpoint: string, queryParams?: Record<string, string | number>): string {
    let url = `${this.config.apiBaseUrl}/books/v3/${endpoint}`;
    
    if (queryParams) {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        params.append(key, String(value));
      });
      url += `?${params.toString()}`;
    }
    
    return url;
  }
  
  /**
   * Update rate limit state from response headers
   */
  private updateRateLimit(headers: Record<string, string>): void {
    const remaining = headers['x-rate-limit-remaining'];
    const reset = headers['x-rate-limit-reset'];
    
    if (remaining) {
      this.requestsRemaining = parseInt(remaining, 10);
    }
    
    if (reset) {
      this.resetTime = new Date(parseInt(reset, 10) * 1000);
    }
  }
  
  /**
   * Make an API request to Zoho
   */
  async request<T>(options: ZohoRequestOptions): Promise<ZohoResponse<T>> {
    await this.checkRateLimit();
    
    if (!this.organizationId) {
      return {
        success: false,
        error: 'No organization ID set. Please complete OAuth flow first.'
      };
    }
    
    try {
      const accessToken = await this.ensureValidToken();
      const url = this.buildUrl(options.endpoint, options.queryParams);
      
      const response = await this.circuitBreaker.fire(async () => {
        return this.httpClient.request({
          method: options.method || 'GET',
          url,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-com-zoho-books-organizationid': this.organizationId!
          },
          data: options.body
        });
      }) as { data: unknown; status: number; headers: Record<string, string> };
      
      this.updateRateLimit(response.headers);
      
      return {
        success: true,
        data: response.data as T
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return this.handleApiError(error, options.endpoint);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Check if we're being rate limited and wait if necessary
   */
  private async checkRateLimit(): Promise<void> {
    if (this.requestsRemaining <= 0 && this.resetTime) {
      const waitTime = this.resetTime.getTime() - Date.now();
      if (waitTime > 0) {
        console.warn(`[Zoho] Rate limited. Waiting ${waitTime}ms before retry.`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  /**
   * Handle API errors
   */
  private handleApiError(error: AxiosError, endpoint: string): ZohoResponse<never> {
    const response = error.response;
    
    if (!response) {
      return {
        success: false,
        error: `Network error: ${error.message}`
      };
    }
    
    const statusCode = response.status;
    const errorData = response.data as { code?: string; message?: string; error?: string };
    
    // Handle different error types
    if (statusCode === 401) {
      // Token expired - trigger refresh
      this.refreshTokenIfNeeded().catch(console.error);
      
      return {
        success: false,
        error: 'Access token expired. Please reconnect your Zoho account.'
      };
    }
    
    if (statusCode === 429) {
      // Rate limited
      const retryAfter = response.headers['retry-after'];
      console.warn(`[Zoho] Rate limited. Retry after: ${retryAfter}`);
      
      return {
        success: false,
        error: 'Too many requests. Please wait before trying again.'
      };
    }
    
    if (statusCode === 400 || statusCode === 500) {
      const errorMessage = errorData?.message || errorData?.error || error.message;
      const errorCode = errorData?.code || 'UNKNOWN';
      
      return {
        success: false,
        error: `Zoho API Error: ${errorMessage}`
      };
    }
    
    return {
      success: false,
      error: `API request failed with status ${statusCode}: ${error.message}`
    };
  }
  
  /**
   * Get organization info
   */
  async getOrganizationInfo(): Promise<ZohoResponse<{ organization: Record<string, unknown> }>> {
    return this.request<{ organization: Record<string, unknown> }>({
      endpoint: 'organization',
      organizationId: this.organizationId!
    });
  }
  
  /**
   * Test connection by fetching organization info
   */
  async testConnection(): Promise<boolean> {
    const response = await this.getOrganizationInfo();
    return response.success;
  }
  
  /**
   * Disconnect from Zoho
   */
  async disconnect(): Promise<void> {
    if (this.tokens?.accessToken) {
      await this.oauthService.revokeToken(this.tokens.accessToken);
    }
    this.tokens = null;
    this.organizationId = null;
    this.refreshPromise = null;
  }
}
