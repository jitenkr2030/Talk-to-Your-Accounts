import axios, { AxiosInstance, AxiosError } from 'axios';
import { getConfig } from '../../config';
import { getEncryptionService } from '../encryption/EncryptionService';
import { getLogger } from '../logging/LoggerService';
import { getRetryService, RetryPresets } from '../resilience/RetryService';
import {
  IntegrationError,
  AuthenticationError,
  ErrorCode,
} from '../errors/IntegrationErrors';

export enum OAuthProvider {
  QUICKBOOKS = 'quickbooks',
  XERO = 'xero',
  ZOHO = 'zoho',
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenType: string;
  scope: string;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authEndpoint: string;
  tokenEndpoint: string;
  apiBaseUrl: string;
  scopes: string[];
}

export interface TokenRefreshResult {
  success: boolean;
  tokens?: OAuthTokens;
  error?: string;
}

// Provider-specific OAuth configurations
export const OAUTH_CONFIGS: Record<OAuthProvider, Partial<OAuthConfig>> = {
  [OAuthProvider.QUICKBOOKS]: {
    authEndpoint: 'https://appcenter.intuit.com/connect/oauth2',
    tokenEndpoint: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    apiBaseUrl: 'https://quickbooks.api.intuit.com/v3',
    scopes: ['com.intuit.quickbooks.accounting', 'com.intuit.quickbooks.payment'],
  },
  [OAuthProvider.XERO]: {
    authEndpoint: 'https://login.xero.com/identity/connect/authorize',
    tokenEndpoint: 'https://identity.xero.com/connect/token',
    apiBaseUrl: 'https://api.xero.com/api.xro/2.0',
    scopes: ['openid', 'profile', 'email', 'accounting.transactions', 'accounting.contacts'],
  },
  [OAuthProvider.ZOHO]: {
    authEndpoint: 'https://accounts.zoho.com/oauth/v2/auth',
    tokenEndpoint: 'https://accounts.zoho.com/oauth/v2/token',
    apiBaseUrl: 'https://www.zohoapis.com',
    scopes: ['ZohoBooks.fullaccess.all'],
  },
};

export class OAuthService {
  private config: ReturnType<typeof getConfig>;
  private encryption = getEncryptionService();
  private logger = getLogger();
  private retryService = getRetryService();

  constructor() {
    this.config = getConfig();
  }

  /**
   * Generate authorization URL for a provider
   */
  getAuthorizationUrl(provider: OAuthProvider, state: string): string {
    const providerConfig = this.getProviderConfig(provider);
    const params = new URLSearchParams({
      client_id: providerConfig.clientId,
      redirect_uri: providerConfig.redirectUri,
      response_type: 'code',
      scope: providerConfig.scopes.join(' '),
      state,
    });

    return `${providerConfig.authEndpoint}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    provider: OAuthProvider,
    code: string,
    tenantId: string
  ): Promise<OAuthTokens> {
    const providerConfig = this.getProviderConfig(provider);

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: providerConfig.redirectUri,
      client_id: providerConfig.clientId,
      client_secret: providerConfig.clientSecret,
    });

    try {
      const response = await this.retryService.execute(
        async () => {
          return axios.post(
            providerConfig.tokenEndpoint,
            params.toString(),
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(
                  `${providerConfig.clientId}:${providerConfig.clientSecret}`
                ).toString('base64')}`,
              },
              timeout: 10000,
            }
          );
        },
        RetryPresets[provider.toUpperCase()]
      );

      const tokens = this.parseTokenResponse(response.data, providerConfig.apiBaseUrl);
      
      this.logger.logOAuthEvent('token_exchange', provider, true, {
        tenantId,
        provider,
        action: 'oauth_token_exchange',
      });

      return tokens;
    } catch (error) {
      this.logger.logOAuthEvent('token_exchange', provider, false, {
        tenantId,
        provider,
        action: 'oauth_token_exchange',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });

      throw new AuthenticationError(
        `Failed to exchange authorization code for ${provider} tokens`,
        ErrorCode.AUTH_OAUTH_FAILED,
        { tenantId, provider }
      );
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(
    provider: OAuthProvider,
    encryptedRefreshToken: string,
    tenantId: string
  ): Promise<TokenRefreshResult> {
    const providerConfig = this.getProviderConfig(provider);
    const refreshToken = this.encryption.decrypt(encryptedRefreshToken);

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: providerConfig.clientId,
      client_secret: providerConfig.clientSecret,
    });

    try {
      const response = await this.retryService.execute(
        async () => {
          return axios.post(
            providerConfig.tokenEndpoint,
            params.toString(),
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(
                  `${providerConfig.clientId}:${providerConfig.clientSecret}`
                ).toString('base64')}`,
              },
              timeout: 10000,
            }
          );
        },
        RetryPresets[provider.toUpperCase()]
      );

      const tokens = this.parseTokenResponse(response.data, providerConfig.apiBaseUrl);

      this.logger.logOAuthEvent('token_refresh', provider, true, {
        tenantId,
        provider,
        action: 'oauth_token_refresh',
      });

      return { success: true, tokens };
    } catch (error) {
      const axiosError = error as AxiosError;
      
      this.logger.logOAuthEvent('token_refresh', provider, false, {
        tenantId,
        provider,
        action: 'oauth_token_refresh',
        metadata: {
          status: axiosError.response?.status,
          error: axiosError.message,
        },
      });

      // Check if refresh token is permanently invalid
      if (axiosError.response?.status === 400) {
        return { success: false, error: 'refresh_token_revoked' };
      }

      return { success: false, error: axiosError.message };
    }
  }

  /**
   * Create an authenticated API client for a provider
   */
  async createApiClient(
    provider: OAuthProvider,
    accessToken: string
  ): Promise<AxiosInstance> {
    const providerConfig = this.getProviderConfig(provider);

    const client = axios.create({
      baseURL: providerConfig.apiBaseUrl,
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          throw new AuthenticationError(
            'Access token expired or invalid',
            ErrorCode.AUTH_TOKEN_EXPIRED,
            { provider }
          );
        }
        throw error;
      }
    );

    return client;
  }

  /**
   * Encrypt tokens for storage
   */
  encryptTokens(tokens: OAuthTokens): { encryptedAccessToken: string; encryptedRefreshToken: string } {
    return {
      encryptedAccessToken: this.encryption.encrypt(tokens.accessToken),
      encryptedRefreshToken: this.encryption.encrypt(tokens.refreshToken),
    };
  }

  /**
   * Decrypt tokens from storage
   */
  decryptTokens(encryptedAccessToken: string, encryptedRefreshToken: string): OAuthTokens {
    return {
      accessToken: this.encryption.decrypt(encryptedAccessToken),
      refreshToken: this.encryption.decrypt(encryptedRefreshToken),
      expiresAt: new Date(), // Note: Original expiresAt not stored - should be stored separately
      tokenType: 'Bearer',
      scope: '',
    };
  }

  /**
   * Get provider configuration with environment-specific settings
   */
  private getProviderConfig(provider: OAuthProvider): OAuthConfig {
    const baseConfig = OAUTH_CONFIGS[provider];

    let clientId: string;
    let clientSecret: string;
    let redirectUri: string;

    switch (provider) {
      case OAuthProvider.QUICKBOOKS:
        clientId = this.config.quickbooks.clientId;
        clientSecret = this.config.quickbooks.clientSecret;
        redirectUri = this.config.quickbooks.redirectUri;
        break;
      case OAuthProvider.XERO:
        clientId = this.config.xero.clientId;
        clientSecret = this.config.xero.clientSecret;
        redirectUri = this.config.xero.redirectUri;
        break;
      case OAuthProvider.ZOHO:
        clientId = this.config.zoho.clientId;
        clientSecret = this.config.zoho.clientSecret;
        redirectUri = this.config.zoho.redirectUri;
        break;
      default:
        throw new Error(`Unknown OAuth provider: ${provider}`);
    }

    if (!clientId || !clientSecret) {
      throw new IntegrationError(
        `OAuth credentials not configured for ${provider}`,
        ErrorCode.PROVIDER_CONFIG_MISSING,
        { provider }
      );
    }

    return {
      ...baseConfig,
      clientId,
      clientSecret,
      redirectUri,
    } as OAuthConfig;
  }

  /**
   * Parse token response from OAuth provider
   */
  private parseTokenResponse(data: Record<string, unknown>, _apiBaseUrl: string): OAuthTokens {
    const expiresIn = (data.expires_in as number) || 3600;
    
    return {
      accessToken: data.access_token as string,
      refreshToken: data.refresh_token as string,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
      tokenType: (data.token_type as string) || 'Bearer',
      scope: (data.scope as string) || '',
    };
  }
}

// Singleton instance
let oauthServiceInstance: OAuthService | null = null;

export function getOAuthService(): OAuthService {
  if (!oauthServiceInstance) {
    oauthServiceInstance = new OAuthService();
  }
  return oauthServiceInstance;
}
