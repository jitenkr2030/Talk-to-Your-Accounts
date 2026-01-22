/**
 * Xero Configuration
 * 
 * Defines all configuration constants for Xero API integration.
 * These values should be set via environment variables in production.
 */

export interface XeroConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  environment: 'sandbox' | 'production';
  scopes: string[];
  apiBaseUrl: string;
  authUrl: string;
  tokenUrl: string;
  connectionsUrl: string;
}

export const XERO_CONFIG: XeroConfig = {
  // These should be overridden by environment variables
  clientId: process.env.XERO_CLIENT_ID || 'your-client-id',
  clientSecret: process.env.XERO_CLIENT_SECRET || 'your-client-secret',
  redirectUri: process.env.XERO_REDIRECT_URI || 'http://localhost:3001/api/v1/integrations/xero/callback',
  environment: (process.env.XERO_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
  
  // OAuth scopes for Xero API
  scopes: [
    'openid',
    'profile',
    'email',
    'accounting.transactions',
    'accounting.contacts',
    'accounting.settings',
    'accounting.reports.read',
    'accounting.journals.read',
    'accounting.attachments',
  ],
  
  // API URLs
  apiBaseUrl: process.env.XERO_API_BASE_URL || 'https://api.xero.com/api.xro/2.0',
  
  // OAuth URLs
  authUrl: 'https://login.xero.com/identity/connect/authorize',
  tokenUrl: 'https://identity.xero.com/connect/token',
  connectionsUrl: 'https://api.xero.com/connections',
};

/**
 * Sandbox URLs (for testing)
 */
export const XERO_SANDBOX_CONFIG: XeroConfig = {
  ...XERO_CONFIG,
  // Xero uses the same API URL for sandbox, but you need to create a demo org
  // The authentication is against Xero's sandbox environment
};

/**
 * Production URLs
 */
export const XERO_PRODUCTION_CONFIG: XeroConfig = {
  ...XERO_CONFIG,
  // Production uses the same URLs but requires production app credentials
};

/**
 * Get the appropriate configuration based on environment
 */
export function getXeroConfig(): XeroConfig {
  return XERO_CONFIG.environment === 'sandbox' 
    ? XERO_SANDBOX_CONFIG 
    : XERO_PRODUCTION_CONFIG;
}

/**
 * Required environment variables for Xero integration
 */
export const REQUIRED_ENV_VARS = [
  'XERO_CLIENT_ID',
  'XERO_CLIENT_SECRET',
  'XERO_REDIRECT_URI',
  'XERO_ENVIRONMENT'
];

/**
 * Check if all required environment variables are set
 */
export function validateXeroConfig(): { valid: boolean; missingVars: string[] } {
  const missingVars: string[] = [];
  
  for (const envVar of REQUIRED_ENV_VARS) {
    // Skip validation for clientSecret in development
    if (envVar === 'XERO_CLIENT_SECRET' && process.env.NODE_ENV === 'development') {
      continue;
    }
    
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  }
  
  return {
    valid: missingVars.length === 0,
    missingVars
  };
}

/**
 * Xero tenant types
 */
export enum XeroTenantType {
  ORGANIZATION = 'ORGANIZATION',
  PRACTICE = 'PRACTICE'
}

/**
 * Xero tenant connection info
 */
export interface XeroTenant {
  id: string;
  name: string;
  tenantType: XeroTenantType;
  createdDateUtc: string;
  updatedDateUtc: string;
}
