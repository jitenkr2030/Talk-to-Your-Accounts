/**
 * Zoho OAuth Service
 * 
 * Handles the complete OAuth 2.0 authentication flow for Zoho Books API.
 * Includes authorization URL generation, token exchange, and token refresh.
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { ZohoConfig, getZohoConfig } from './ZohoConfig';

export interface ZohoTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenType: string;
  scope: string;
  apiDomain: string;
}

export interface ZohoUser {
  userId: string;
  displayName: string;
  email: string;
}

export interface ZohoOrganization {
  organizationId: string;
  name: string;
  countryCode: string;
  isDefault: boolean;
}

/**
 * Generate a cryptographically secure random string for state parameter
 */
function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate the OAuth authorization URL for Zoho
 */
export function generateAuthorizationUrl(config?: ZohoConfig, accessType = 'offline'): {
  url: string;
  state: string;
} {
  const cfg = config || getZohoConfig();
  const state = generateState();
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    scope: cfg.scopes.join(','),
    state: state,
    access_type: accessType, // 'online' or 'offline' (offline gets refresh token)
  });
  
  const authUrl = `${cfg.authUrl}?${params.toString()}`;
  
  return { url: authUrl, state };
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  config?: ZohoConfig
): Promise<{ tokens: ZohoTokens; user: ZohoUser }> {
  const cfg = config || getZohoConfig();
  
  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: cfg.redirectUri,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });
  
  try {
    const tokenResponse = await axios.post(
      cfg.tokenUrl,
      tokenParams.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      }
    );
    
    const { access_token, refresh_token, expires_in, token_type, scope, api_domain } = tokenResponse.data;
    
    const tokens: ZohoTokens = {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(Date.now() + expires_in * 1000),
      tokenType: token_type || 'Bearer',
      scope: scope || '',
      apiDomain: api_domain || ''
    };
    
    // Get user info
    const userResponse = await axios.get(
      cfg.accountsUrl,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Accept': 'application/json'
        }
      }
    );
    
    const user: ZohoUser = {
      userId: userResponse.data.user_id,
      displayName: userResponse.data.display_name,
      email: userResponse.data.email
    };
    
    return { tokens, user };
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
  config?: ZohoConfig
): Promise<ZohoTokens> {
  const cfg = config || getZohoConfig();
  
  const tokenParams = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });
  
  try {
    const response = await axios.post(
      cfg.tokenUrl,
      tokenParams.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      }
    );
    
    const { access_token, expires_in, token_type, scope, api_domain } = response.data;
    
    return {
      accessToken: access_token,
      refreshToken: refreshToken, // Zoho doesn't always return new refresh token
      expiresAt: new Date(Date.now() + expires_in * 1000),
      tokenType: token_type || 'Bearer',
      scope: scope || '',
      apiDomain: api_domain || ''
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Token refresh failed: ${error.response?.data?.error_description || error.message}`);
    }
    throw error;
  }
}

/**
 * Revoke access tokens (disconnect from Zoho)
 */
export async function revokeAccessToken(
  accessToken: string,
  config?: ZohoConfig
): Promise<boolean> {
  const cfg = config || getZohoConfig();
  
  try {
    await axios.post(
      `${cfg.tokenUrl}/revoke`,
      new URLSearchParams({ token: accessToken }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
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
 * Get organizations for the user
 */
export async function getOrganizations(
  accessToken: string,
  config?: ZohoConfig
): Promise<ZohoOrganization[]> {
  const cfg = config || getZohoConfig();
  
  try {
    // Get API domain from access token info or use default
    const apiDomain = cfg.apiBaseUrl;
    
    const response = await axios.get(
      `${apiDomain}/books/v3/organizations`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );
    
    return response.data.organizations.map((org: Record<string, unknown>) => ({
      organizationId: (org as { organization_id: string }).organization_id,
      name: (org as { name: string }).name,
      countryCode: (org as { country_code: string }).country_code,
      isDefault: (org as { is_default: boolean }).is_default
    }));
  } catch (error) {
    console.error('Failed to get organizations:', error);
    return [];
  }
}

/**
 * Zoho OAuth Service Class
 * 
 * Encapsulates all OAuth operations for Zoho integration.
 */
export class ZohoOAuthService {
  private config: ZohoConfig;
  
  constructor(config?: ZohoConfig) {
    this.config = config || getZohoConfig();
  }
  
  /**
   * Get the authorization URL for initiating OAuth flow
   */
  getAuthorizationUrl(accessType = 'offline'): { url: string; state: string } {
    return generateAuthorizationUrl(this.config, accessType);
  }
  
  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<{ tokens: ZohoTokens; user: ZohoUser }> {
    return exchangeCodeForTokens(code, this.config);
  }
  
  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<ZohoTokens> {
    return refreshAccessToken(refreshToken, this.config);
  }
  
  /**
   * Revoke access token
   */
  async revokeToken(accessToken: string): Promise<boolean> {
    return revokeAccessToken(accessToken, this.config);
  }
  
  /**
   * Get organizations for the user
   */
  async getUserOrganizations(accessToken: string): Promise<ZohoOrganization[]> {
    return getOrganizations(accessToken, this.config);
  }
  
  /**
   * Validate that configuration is properly set up
   */
  validateConfig(): { valid: boolean; error?: string } {
    if (!this.config.clientId || this.config.clientId === 'your-client-id') {
      return { valid: false, error: 'Zoho Client ID is not configured' };
    }
    
    if (!this.config.clientSecret || this.config.clientSecret === 'your-client-secret') {
      return { valid: false, error: 'Zoho Client Secret is not configured' };
    }
    
    if (!this.config.redirectUri) {
      return { valid: false, error: 'Zoho Redirect URI is not configured' };
    }
    
    return { valid: true };
  }
}
