/**
 * QuickBooks OAuth Service
 * 
 * Handles the complete OAuth 2.0 authentication flow for QuickBooks Online.
 * Includes authorization URL generation, token exchange, and token refresh.
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { QuickBooksConfig, getQuickBooksConfig } from './QuickBooksConfig';

export interface QuickBooksTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  realmId: string;
  tokenType: string;
}

export interface AuthorizationUrlParams {
  clientId: string;
  redirectUri: string;
  scope: string[];
  state: string;
  responseType: string;
}

/**
 * Generate a cryptographically secure random string for state parameter
 */
function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate the OAuth authorization URL for QuickBooks
 */
export function generateAuthorizationUrl(config?: QuickBooksConfig): {
  url: string;
  state: string;
} {
  const cfg = config || getQuickBooksConfig();
  const state = generateState();
  
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    scope: cfg.scopes.join(' '),
    state: state,
    response_type: 'code',
    // QuickBooks specific parameters
    minorversion: '65' // Use a stable minor version
  });
  
  const authUrl = `${cfg.authUrl}?${params.toString()}`;
  
  return { url: authUrl, state };
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  realmId: string,
  config?: QuickBooksConfig
): Promise<QuickBooksTokens> {
  const cfg = config || getQuickBooksConfig();
  
  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: cfg.redirectUri,
  });
  
  // Create Basic auth header with client credentials
  const authHeader = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
  
  try {
    const response = await axios.post(
      cfg.tokenUrl,
      tokenParams.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authHeader}`,
          'Accept': 'application/json'
        }
      }
    );
    
    const { access_token, refresh_token, expires_in, token_type } = response.data;
    
    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(Date.now() + expires_in * 1000),
      realmId: realmId,
      tokenType: token_type || 'bearer'
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Token exchange failed: ${error.response?.data?.error_description || error.message}`);
    }
    throw error;
  }
}

/**
 * Refresh an expired access token using the refresh token
 */
export async function refreshAccessToken(
  refreshToken: string,
  realmId: string,
  config?: QuickBooksConfig
): Promise<QuickBooksTokens> {
  const cfg = config || getQuickBooksConfig();
  
  const tokenParams = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  
  const authHeader = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
  
  try {
    const response = await axios.post(
      cfg.tokenUrl,
      tokenParams.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authHeader}`,
          'Accept': 'application/json'
        }
      }
    );
    
    const { access_token, refresh_token, expires_in, token_type } = response.data;
    
    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(Date.now() + expires_in * 1000),
      realmId: realmId,
      tokenType: token_type || 'bearer'
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Token refresh failed: ${error.response?.data?.error_description || error.message}`);
    }
    throw error;
  }
}

/**
 * Revoke access tokens (disconnect from QuickBooks)
 */
export async function revokeAccessToken(
  accessToken: string,
  config?: QuickBooksConfig
): Promise<boolean> {
  const cfg = config || getQuickBooksConfig();
  
  const tokenParams = new URLSearchParams({
    token: accessToken,
    token_type_hint: 'access_token'
  });
  
  try {
    await axios.post(
      'https://developer.api.intuit.com/v2/oauth2/tokens/revoke',
      tokenParams.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64')}`,
          'Accept': 'application/json'
        }
      }
    );
    
    return true;
  } catch (error) {
    console.error('Failed to revoke token:', error);
    return false;
  }
}

/**
 * QuickBooks OAuth Service Class
 * 
 * Encapsulates all OAuth operations for QuickBooks integration.
 */
export class QuickBooksOAuthService {
  private config: QuickBooksConfig;
  
  constructor(config?: QuickBooksConfig) {
    this.config = config || getQuickBooksConfig();
  }
  
  /**
   * Get the authorization URL for initiating OAuth flow
   */
  getAuthorizationUrl(): { url: string; state: string } {
    return generateAuthorizationUrl(this.config);
  }
  
  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string, realmId: string): Promise<QuickBooksTokens> {
    return exchangeCodeForTokens(code, realmId, this.config);
  }
  
  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string, realmId: string): Promise<QuickBooksTokens> {
    return refreshAccessToken(refreshToken, realmId, this.config);
  }
  
  /**
   * Revoke access token
   */
  async revokeToken(accessToken: string): Promise<boolean> {
    return revokeAccessToken(accessToken, this.config);
  }
  
  /**
   * Validate that configuration is properly set up
   */
  validateConfig(): { valid: boolean; error?: string } {
    if (!this.config.clientId || this.config.clientId === 'your-client-id') {
      return { valid: false, error: 'QuickBooks Client ID is not configured' };
    }
    
    if (!this.config.clientSecret || this.config.clientSecret === 'your-client-secret') {
      return { valid: false, error: 'QuickBooks Client Secret is not configured' };
    }
    
    if (!this.config.redirectUri) {
      return { valid: false, error: 'QuickBooks Redirect URI is not configured' };
    }
    
    return { valid: true };
  }
}
