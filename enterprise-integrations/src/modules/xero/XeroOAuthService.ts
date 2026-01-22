/**
 * Xero OAuth Service
 * 
 * Handles the complete OAuth 2.0 authentication flow for Xero API.
 * Includes authorization URL generation, token exchange, and token refresh.
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { XeroConfig, getXeroConfig, XeroTenant } from './XeroConfig';

export interface XeroTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenType: string;
  scope: string;
}

export interface XeroConnection {
  id: string;
  tenantId: string;
  tenantType: string;
  tenantName: string;
}

/**
 * Generate a cryptographically secure random string for state parameter
 */
function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate PKCE code verifier and challenge
 */
export function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  
  return { verifier, challenge };
}

/**
 * Generate the OAuth authorization URL for Xero
 */
export function generateAuthorizationUrl(config?: XeroConfig, usePKCE = true): {
  url: string;
  state: string;
  codeVerifier?: string;
} {
  const cfg = config || getXeroConfig();
  const state = generateState();
  
  let codeVerifier: string | undefined;
  let codeChallenge: string | undefined;
  
  if (usePKCE) {
    const pkce = generatePKCE();
    codeVerifier = pkce.verifier;
    codeChallenge = pkce.challenge;
  }
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    scope: cfg.scopes.join(' '),
    state: state,
  });
  
  if (codeChallenge) {
    params.append('code_challenge', codeChallenge);
    params.append('code_challenge_method', 'S256');
  }
  
  const authUrl = `${cfg.authUrl}?${params.toString()}`;
  
  return { url: authUrl, state, codeVerifier };
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier?: string,
  config?: XeroConfig
): Promise<{ tokens: XeroTokens; connection: XeroConnection }> {
  const cfg = config || getXeroConfig();
  
  const tokenParams: Record<string, string> = {
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: cfg.redirectUri,
  };
  
  if (codeVerifier) {
    tokenParams.code_verifier = codeVerifier;
  }
  
  // Create Basic auth header with client credentials
  const authHeader = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
  
  try {
    const tokenResponse = await axios.post(
      cfg.tokenUrl,
      new URLSearchParams(tokenParams).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authHeader}`,
          'Accept': 'application/json'
        }
      }
    );
    
    const { access_token, refresh_token, expires_in, token_type, scope } = tokenResponse.data;
    
    // Get tenant/connection info
    const connectionResponse = await axios.get(
      cfg.connectionsUrl,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Accept': 'application/json'
        }
      }
    );
    
    const connections: XeroTenant[] = connectionResponse.data;
    
    if (connections.length === 0) {
      throw new Error('No Xero organizations found for this user');
    }
    
    // Use the first organization
    const tenant = connections[0];
    
    const tokens: XeroTokens = {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(Date.now() + expires_in * 1000),
      tokenType: token_type || 'Bearer',
      scope: scope || ''
    };
    
    const connection: XeroConnection = {
      id: tenant.id,
      tenantId: tenant.tenantId,
      tenantType: tenant.tenantType,
      tenantName: tenant.tenantName
    };
    
    return { tokens, connection };
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
  config?: XeroConfig
): Promise<XeroTokens> {
  const cfg = config || getXeroConfig();
  
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
    
    const { access_token, refresh_token, expires_in, token_type, scope } = response.data;
    
    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(Date.now() + expires_in * 1000),
      tokenType: token_type || 'Bearer',
      scope: scope || ''
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Token refresh failed: ${error.response?.data?.error_description || error.message}`);
    }
    throw error;
  }
}

/**
 * Revoke access tokens (disconnect from Xero)
 */
export async function revokeAccessToken(
  accessToken: string,
  tenantId: string,
  config?: XeroConfig
): Promise<boolean> {
  const cfg = config || getXeroConfig();
  
  try {
    await axios.delete(
      `${cfg.connectionsUrl}/${tenantId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
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
 * Get all connections for a user
 */
export async function getConnections(
  accessToken: string,
  config?: XeroConfig
): Promise<XeroConnection[]> {
  const cfg = config || getXeroConfig();
  
  try {
    const response = await axios.get(
      cfg.connectionsUrl,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );
    
    return response.data.map((tenant: XeroTenant) => ({
      id: tenant.id,
      tenantId: tenant.tenantId,
      tenantType: tenant.tenantType,
      tenantName: tenant.tenantName
    }));
  } catch (error) {
    console.error('Failed to get connections:', error);
    return [];
  }
}

/**
 * Xero OAuth Service Class
 * 
 * Encapsulates all OAuth operations for Xero integration.
 */
export class XeroOAuthService {
  private config: XeroConfig;
  private codeVerifier: string | null = null;
  
  constructor(config?: XeroConfig) {
    this.config = config || getXeroConfig();
  }
  
  /**
   * Get the authorization URL for initiating OAuth flow
   */
  getAuthorizationUrl(): { url: string; state: string; codeVerifier: string } {
    const result = generateAuthorizationUrl(this.config);
    
    if (result.codeVerifier) {
      this.codeVerifier = result.codeVerifier;
    }
    
    return {
      url: result.url,
      state: result.state,
      codeVerifier: result.codeVerifier || ''
    };
  }
  
  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(code: string): Promise<{ tokens: XeroTokens; connection: XeroConnection }> {
    return exchangeCodeForTokens(code, this.codeVerifier || undefined, this.config);
  }
  
  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<XeroTokens> {
    return refreshAccessToken(refreshToken, this.config);
  }
  
  /**
   * Revoke access token
   */
  async revokeToken(accessToken: string, tenantId: string): Promise<boolean> {
    return revokeAccessToken(accessToken, tenantId, this.config);
  }
  
  /**
   * Get connections for a user
   */
  async getUserConnections(accessToken: string): Promise<XeroConnection[]> {
    return getConnections(accessToken, this.config);
  }
  
  /**
   * Validate that configuration is properly set up
   */
  validateConfig(): { valid: boolean; error?: string } {
    if (!this.config.clientId || this.config.clientId === 'your-client-id') {
      return { valid: false, error: 'Xero Client ID is not configured' };
    }
    
    if (!this.config.clientSecret || this.config.clientSecret === 'your-client-secret') {
      return { valid: false, error: 'Xero Client Secret is not configured' };
    }
    
    if (!this.config.redirectUri) {
      return { valid: false, error: 'Xero Redirect URI is not configured' };
    }
    
    return { valid: true };
  }
}
