/**
 * QuickBooks Configuration
 * 
 * Defines all configuration constants for QuickBooks Online integration.
 * These values should be set via environment variables in production.
 */

export interface QuickBooksConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  environment: 'sandbox' | 'production';
  scopes: string[];
  apiBaseUrl: string;
  authUrl: string;
  tokenUrl: string;
  companyId?: string; // Optional, can be set during OAuth flow
}

export const QUICKBOOKS_CONFIG: QuickBooksConfig = {
  // These should be overridden by environment variables
  clientId: process.env.QUICKBOOKS_CLIENT_ID || 'your-client-id',
  clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || 'your-client-secret',
  redirectUri: process.env.QUICKBOOKS_REDIRECT_URI || 'http://localhost:3001/api/v1/integrations/quickbooks/callback',
  environment: (process.env.QUICKBOOKS_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
  
  // OAuth scopes for QuickBooks Online
  scopes: [
    'com.intuit.quickbooks.accounting',
    'com.intuit.quickbooks.payment',
    'openid',
    'profile',
    'email'
  ],
  
  // API URLs
  apiBaseUrl: process.env.QUICKBOOKS_API_BASE_URL || 'https://quickbooks.api.intuit.com/v3',
  
  // OAuth URLs
  authUrl: 'https://appcenter.intuit.com/connect/oauth2',
  tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
};

/**
 * Sandbox URLs (for testing)
 */
export const QUICKBOOKS_SANDBOX_CONFIG: QuickBooksConfig = {
  ...QUICKBOOKS_CONFIG,
  apiBaseUrl: 'https://sandbox-quickbooks.api.intuit.com/v3',
  authUrl: 'https://appcenter.intuit.com/connect/oauth2', // Same URL for sandbox
};

/**
 * Production URLs
 */
export const QUICKBOOKS_PRODUCTION_CONFIG: QuickBooksConfig = {
  ...QUICKBOOKS_CONFIG,
  apiBaseUrl: 'https://quickbooks.api.intuit.com/v3',
  authUrl: 'https://appcenter.intuit.com/connect/oauth2',
};

/**
 * Get the appropriate configuration based on environment
 */
export function getQuickBooksConfig(): QuickBooksConfig {
  return QUICKBOOKS_CONFIG.environment === 'sandbox' 
    ? QUICKBOOKS_SANDBOX_CONFIG 
    : QUICKBOOKS_PRODUCTION_CONFIG;
}

/**
 * Required environment variables for QuickBooks integration
 */
export const REQUIRED_ENV_VARS = [
  'QUICKBOOKS_CLIENT_ID',
  'QUICKBOOKS_CLIENT_SECRET',
  'QUICKBOOKS_REDIRECT_URI',
  'QUICKBOOKS_ENVIRONMENT'
];

/**
 * Check if all required environment variables are set
 */
export function validateQuickBooksConfig(): { valid: boolean; missingVars: string[] } {
  const missingVars: string[] = [];
  
  for (const envVar of REQUIRED_ENV_VARS) {
    // Skip validation for clientSecret in development
    if (envVar === 'QUICKBOOKS_CLIENT_SECRET' && process.env.NODE_ENV === 'development') {
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
