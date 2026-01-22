/**
 * QuickBooks Connector Service
 * 
 * Handles HTTP communication with QuickBooks Online API.
 * Includes automatic token refresh, rate limiting, and circuit breaker pattern.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { QuickBooksConfig, getQuickBooksConfig } from './QuickBooksConfig';
import { QuickBooksTokens, QuickBooksOAuthService, refreshAccessToken } from './QuickBooksOAuthService';
import CircuitBreaker from 'opossum';

export interface QuickBooksRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  queryParams?: Record<string, string>;
  body?: Record<string, unknown>;
  minorVersion?: string;
}

export interface QuickBooksResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Custom error class for QuickBooks API errors
 */
export class QuickBooksAPIError extends Error {
  public readonly code: string;
  public readonly detail: string;
  public readonly statusCode: number;
  public readonly endpoint: string;
  
  constructor(
    message: string,
    code: string,
    detail: string,
    statusCode: number,
    endpoint: string
  ) {
    super(message);
    this.name = 'QuickBooksAPIError';
    this.code = code;
    this.detail = detail;
    this.statusCode = statusCode;
    this.endpoint = endpoint;
  }
}

/**
 * QuickBooks API Connector
 * 
 * Manages all API communications with QuickBooks Online.
 * Handles authentication, token refresh, and error handling.
 */
export class QuickBooksConnectorService {
  private config: QuickBooksConfig;
  private tokens: QuickBooksTokens | null = null;
  private oauthService: QuickBooksOAuthService;
  private httpClient: AxiosInstance;
  private circuitBreaker: CircuitBreaker;
  private refreshPromise: Promise<QuickBooksTokens> | null = null;
  
  // Rate limiting state
  private requestsRemaining: number = 60;
  private resetTime: Date | null = null;
  
  constructor(config?: QuickBooksConfig) {
    this.config = config || getQuickBooksConfig();
    this.oauthService = new QuickBooksOAuthService(this.config);
    
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
      timeout: 10000, // If API call takes longer than 10s, trigger failure
      errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
      resetTimeout: 30000, // Try again after 30s
      volumeThreshold: 5 // Need at least 5 requests to start evaluating
    });
    
    // Set up circuit breaker events
    this.circuitBreaker.on('open', () => {
      console.warn('[QuickBooks] Circuit breaker OPEN - API calls will fail fast');
    });
    
    this.circuitBreaker.on('close', () => {
      console.info('[QuickBooks] Circuit breaker CLOSED - API calls restored');
    });
  }
  
  /**
   * Set the current tokens (after OAuth flow)
   */
  setTokens(tokens: QuickBooksTokens): void {
    this.tokens = tokens;
  }
  
  /**
   * Get the current tokens
   */
  getTokens(): QuickBooksTokens | null {
    return this.tokens;
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
      this.tokens.realmId,
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
  private buildUrl(endpoint: string, queryParams?: Record<string, string>): string {
    const minorVersion = this.config.environment === 'production' ? '65' : '65';
    
    let url = `${this.config.apiBaseUrl}/company/${this.tokens?.realmId}/${endpoint}`;
    
    if (queryParams) {
      const params = new URLSearchParams(queryParams);
      url += `?${params.toString()}`;
    }
    
    // Add minorversion if not already in query params
    if (!queryParams?.minorversion) {
      url += url.includes('?') ? `&minorversion=${minorVersion}` : `?minorversion=${minorVersion}`;
    }
    
    return url;
  }
  
  /**
   * Update rate limit state from response headers
   */
  private updateRateLimit(headers: Record<string, string>): void {
    const remaining = headers['x-ratelimit-remaining'];
    const reset = headers['x-ratelimit-reset'];
    
    if (remaining) {
      this.requestsRemaining = parseInt(remaining, 10);
    }
    
    if (reset) {
      this.resetTime = new Date(parseInt(reset, 10) * 1000);
    }
  }
  
  /**
   * Check if we're being rate limited and wait if necessary
   */
  private async checkRateLimit(): Promise<void> {
    if (this.requestsRemaining <= 0 && this.resetTime) {
      const waitTime = this.resetTime.getTime() - Date.now();
      if (waitTime > 0) {
        console.warn(`[QuickBooks] Rate limited. Waiting ${waitTime}ms before retry.`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  /**
   * Make an API request to QuickBooks
   */
  async request<T>(options: QuickBooksRequestOptions): Promise<QuickBooksResponse<T>> {
    await this.checkRateLimit();
    
    try {
      const accessToken = await this.ensureValidToken();
      const url = this.buildUrl(options.endpoint, options.queryParams);
      
      const response = await this.circuitBreaker.fire(async () => {
        return this.httpClient.request({
          method: options.method || 'GET',
          url,
          headers: {
            'Authorization': `Bearer ${accessToken}`
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
   * Handle API errors
   */
  private handleApiError(error: AxiosError, endpoint: string): QuickBooksResponse<never> {
    const response = error.response;
    
    if (!response) {
      return {
        success: false,
        error: `Network error: ${error.message}`
      };
    }
    
    const statusCode = response.status;
    const errorData = response.data as { Error?: Array<{ Code: string; Message: string; Detail: string }> };
    
    // Handle different error types
    if (statusCode === 401) {
      // Token expired - trigger refresh
      this.refreshTokenIfNeeded().catch(console.error);
      
      return {
        success: false,
        error: 'Access token expired. Please reconnect your QuickBooks account.'
      };
    }
    
    if (statusCode === 429) {
      // Rate limited
      const retryAfter = response.headers['retry-after'];
      console.warn(`[QuickBooks] Rate limited. Retry after: ${retryAfter}`);
      
      return {
        success: false,
        error: 'Too many requests. Please wait before trying again.'
      };
    }
    
    if (statusCode === 400 || statusCode === 500) {
      const errorMessage = errorData?.Error?.[0]?.Message || error.message;
      const errorCode = errorData?.Error?.[0]?.Code || 'UNKNOWN';
      const errorDetail = errorData?.Error?.[0]?.Detail || '';
      
      return {
        success: false,
        error: `QuickBooks API Error: ${errorMessage}`
      };
    }
    
    return {
      success: false,
      error: `API request failed with status ${statusCode}: ${error.message}`
    };
  }
  
  /**
   * Get company information
   */
  async getCompanyInfo(): Promise<QuickBooksResponse<Record<string, unknown>>> {
    return this.request<Record<string, unknown>>({
      endpoint: 'companyinfo/' + this.tokens?.realmId,
      queryParams: {
        minorversion: '65'
      }
    });
  }
  
  /**
   * Test connection by fetching company info
   */
  async testConnection(): Promise<boolean> {
    const response = await this.getCompanyInfo();
    return response.success;
  }
  
  /**
   * Disconnect from QuickBooks
   */
  async disconnect(): Promise<void> {
    if (this.tokens?.accessToken) {
      await this.oauthService.revokeToken(this.tokens.accessToken);
    }
    this.tokens = null;
    this.refreshPromise = null;
  }
}
