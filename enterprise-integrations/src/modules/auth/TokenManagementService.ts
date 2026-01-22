import { v4 as uuidv4 } from 'uuid';
import { getConfig } from '../../config';
import { getEncryptionService } from '../encryption/EncryptionService';
import { getLogger } from '../logging/LoggerService';
import { getOAuthService, OAuthProvider, OAuthTokens } from './OAuthService';
import { getRetryService, RetryPresets } from '../resilience/RetryService';
import { IntegrationError, AuthenticationError, ErrorCode } from '../errors/IntegrationErrors';

export interface StoredCredentials {
  id: string;
  tenantId: string;
  provider: OAuthProvider;
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  expiresAt: Date;
  tokenType: string;
  scope: string;
  realmId?: string; // QuickBooks-specific
  tenant?: string; // Xero-specific
  createdAt: Date;
  updatedAt: Date;
  lastRefreshedAt?: Date;
}

export interface TokenRefreshJobData {
  credentialId: string;
  tenantId: string;
  provider: OAuthProvider;
  retryCount: number;
}

export interface AuthResult {
  success: boolean;
  accessToken?: string;
  expiresAt?: Date;
  realmId?: string;
  tenant?: string;
  error?: string;
}

export class TokenManagementService {
  private config: ReturnType<typeof getConfig>;
  private encryption = getEncryptionService();
  private oauthService = getOAuthService();
  private retryService = getRetryService();
  private logger = getLogger();
  private refreshTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.config = getConfig();
  }

  /**
   * Store encrypted credentials for a tenant and provider
   */
  async storeCredentials(
    tenantId: string,
    provider: OAuthProvider,
    tokens: OAuthTokens,
    metadata?: { realmId?: string; tenant?: string }
  ): Promise<StoredCredentials> {
    const { encryptedAccessToken, encryptedRefreshToken } = this.oauthService.encryptTokens(tokens);

    const credentials: StoredCredentials = {
      id: uuidv4(),
      tenantId,
      provider,
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt: tokens.expiresAt,
      tokenType: tokens.tokenType,
      scope: tokens.scope,
      realmId: metadata?.realmId,
      tenant: metadata?.tenant,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastRefreshedAt: new Date(),
    };

    // Schedule token refresh
    this.scheduleTokenRefresh(credentials);

    this.logger.info(`Stored credentials for ${provider} for tenant ${tenantId}`, {
      tenantId,
      provider,
      action: 'store_credentials',
      metadata: { credentialId: credentials.id },
    });

    return credentials;
  }

  /**
   * Retrieve and decrypt credentials
   */
  async getCredentials(tenantId: string, provider: OAuthProvider): Promise<StoredCredentials | null> {
    // This would typically query a database
    // For now, we'll return null as this requires database integration
    this.logger.debug(`Retrieving credentials for ${provider} for tenant ${tenantId}`, {
      tenantId,
      provider,
      action: 'get_credentials',
    });
    
    return null; // Database query would go here
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getValidAccessToken(tenantId: string, provider: OAuthProvider): Promise<AuthResult> {
    try {
      const credentials = await this.getCredentials(tenantId, provider);
      
      if (!credentials) {
        return { success: false, error: 'credentials_not_found' };
      }

      // Check if token is expired or will expire soon (within 5 minutes)
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
      
      if (credentials.expiresAt < fiveMinutesFromNow) {
        // Token needs refresh
        const refreshResult = await this.refreshToken(credentials);
        if (!refreshResult.success) {
          return { success: false, error: refreshResult.error };
        }
        
        // Return the new access token
        return {
          success: true,
          accessToken: refreshResult.accessToken,
          expiresAt: refreshResult.expiresAt,
          realmId: credentials.realmId,
          tenant: credentials.tenant,
        };
      }

      // Token is still valid
      const decrypted = this.oauthService.decryptTokens(
        credentials.encryptedAccessToken,
        credentials.encryptedRefreshToken
      );

      return {
        success: true,
        accessToken: decrypted.accessToken,
        expiresAt: credentials.expiresAt,
        realmId: credentials.realmId,
        tenant: credentials.tenant,
      };
    } catch (error) {
      this.logger.error('Failed to get valid access token', error as Error, {
        tenantId,
        provider,
        action: 'get_access_token',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'unknown_error',
      };
    }
  }

  /**
   * Refresh a token using the stored refresh token
   */
  async refreshToken(credentials: StoredCredentials): Promise<AuthResult> {
    try {
      const result = await this.oauthService.refreshTokens(
        credentials.provider,
        credentials.encryptedRefreshToken,
        credentials.tenantId
      );

      if (!result.success || !result.tokens) {
        // Refresh token might be revoked
        if (result.error === 'refresh_token_revoked') {
          throw new AuthenticationError(
            'Refresh token has been revoked. Please re-authenticate.',
            ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
            { tenantId: credentials.tenantId, provider: credentials.provider }
          );
        }

        throw new AuthenticationError(
          `Token refresh failed: ${result.error}`,
          ErrorCode.AUTH_TOKEN_EXPIRED,
          { tenantId: credentials.tenantId, provider: credentials.provider }
        );
      }

      // Update stored credentials with new tokens
      const updatedCredentials = await this.storeCredentials(
        credentials.tenantId,
        credentials.provider,
        result.tokens,
        { realmId: credentials.realmId, tenant: credentials.tenant }
      );

      // Cancel old refresh timeout
      const oldTimeout = this.refreshTimeouts.get(credentials.id);
      if (oldTimeout) {
        clearTimeout(oldTimeout);
        this.refreshTimeouts.delete(credentials.id);
      }

      return {
        success: true,
        accessToken: result.tokens.accessToken,
        expiresAt: result.tokens.expiresAt,
        realmId: updatedCredentials.realmId,
        tenant: updatedCredentials.tenant,
      };
    } catch (error) {
      this.logger.error('Token refresh failed', error as Error, {
        tenantId: credentials.tenantId,
        provider: credentials.provider,
        action: 'token_refresh',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'refresh_failed',
      };
    }
  }

  /**
   * Schedule automatic token refresh before expiration
   */
  private scheduleTokenRefresh(credentials: StoredCredentials): void {
    const expiresAt = new Date(credentials.expiresAt).getTime();
    const now = Date.now();
    const refreshTime = expiresAt - 5 * 60 * 1000; // Refresh 5 minutes before expiration

    if (refreshTime <= now) {
      // Token expires soon, schedule immediate refresh
      this.scheduleImmediateRefresh(credentials);
    } else {
      // Schedule refresh at appropriate time
      const timeout = setTimeout(() => {
        this.handleScheduledRefresh(credentials);
      }, refreshTime - now);

      this.refreshTimeouts.set(credentials.id, timeout);
    }
  }

  /**
   * Handle a scheduled token refresh
   */
  private async handleScheduledRefresh(credentials: StoredCredentials): Promise<void> {
    try {
      const result = await this.refreshToken(credentials);
      
      if (!result.success) {
        this.logger.warn(`Scheduled token refresh failed for ${credentials.provider}`, {
          tenantId: credentials.tenantId,
          provider: credentials.provider,
          action: 'scheduled_refresh_failed',
          metadata: { error: result.error },
        });
      }
    } catch (error) {
      this.logger.error('Scheduled token refresh error', error as Error, {
        tenantId: credentials.tenantId,
        provider: credentials.provider,
        action: 'scheduled_refresh_error',
      });
    }
  }

  /**
   * Schedule immediate token refresh
   */
  private scheduleImmediateRefresh(credentials: StoredCredentials): void {
    setImmediate(async () => {
      await this.handleScheduledRefresh(credentials);
    });
  }

  /**
   * Revoke tokens and clean up
   */
  async revokeCredentials(tenantId: string, provider: OAuthProvider): Promise<boolean> {
    try {
      const credentials = await this.getCredentials(tenantId, provider);
      
      if (!credentials) {
        return false;
      }

      // Cancel any pending refresh
      const timeout = this.refreshTimeouts.get(credentials.id);
      if (timeout) {
        clearTimeout(timeout);
        this.refreshTimeouts.delete(credentials.id);
      }

      // Clear stored credentials (database operation would go here)
      this.logger.info(`Revoked credentials for ${provider} for tenant ${tenantId}`, {
        tenantId,
        provider,
        action: 'revoke_credentials',
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to revoke credentials', error as Error, {
        tenantId,
        provider,
        action: 'revoke_credentials',
      });

      return false;
    }
  }

  /**
   * Check if credentials exist for a tenant and provider
   */
  async hasCredentials(tenantId: string, provider: OAuthProvider): Promise<boolean> {
    const credentials = await this.getCredentials(tenantId, provider);
    return credentials !== null;
  }

  /**
   * Get all providers for a tenant
   */
  async getConnectedProviders(tenantId: string): Promise<OAuthProvider[]> {
    // This would query the database for all connected providers
    // For now, return empty array
    return [];
  }

  /**
   * Clean up all refresh timeouts (for shutdown)
   */
  cleanup(): void {
    this.refreshTimeouts.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.refreshTimeouts.clear();
  }
}

// Singleton instance
let tokenServiceInstance: TokenManagementService | null = null;

export function getTokenManagementService(): TokenManagementService {
  if (!tokenServiceInstance) {
    tokenServiceInstance = new TokenManagementService();
  }
  return tokenServiceInstance;
}
