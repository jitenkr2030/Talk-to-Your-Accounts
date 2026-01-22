/**
 * Zoho Configuration
 * 
 * Defines all configuration constants for Zoho Books API integration.
 * These values should be set via environment variables in production.
 */

export interface ZohoConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  environment: 'sandbox' | 'production';
  scopes: string[];
  apiBaseUrl: string;
  authUrl: string;
  tokenUrl: string;
  accountsUrl: string;
  organizationId?: string; // Optional, can be set during OAuth flow
}

export const ZOHO_CONFIG: ZohoConfig = {
  // These should be overridden by environment variables
  clientId: process.env.ZOHO_CLIENT_ID || 'your-client-id',
  clientSecret: process.env.ZOHO_CLIENT_SECRET || 'your-client-secret',
  redirectUri: process.env.ZOHO_REDIRECT_URI || 'http://localhost:3001/api/v1/integrations/zoho/callback',
  environment: (process.env.ZOHO_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
  
  // OAuth scopes for Zoho Books API
  scopes: [
    'ZohoBooks.fullaccess.all',
    'ZohoBooks.settings.READ',
    'ZohoBooks.contacts.READ',
    'ZohoBooks.invoices.READ',
    'ZohoBooks.payments.READ',
    'ZohoBooks.items.READ',
  ],
  
  // API URLs
  apiBaseUrl: process.env.ZOHO_API_BASE_URL || 'https://www.zohoapis.com',
  
  // OAuth URLs
  authUrl: 'https://accounts.zoho.com/oauth/v2/auth',
  tokenUrl: 'https://accounts.zoho.com/oauth/v2/token',
  accountsUrl: 'https://accounts.zoho.com/oauth/v2/userinfo',
};

/**
 * Sandbox URLs (for testing)
 */
export const ZOHO_SANDBOX_CONFIG: ZohoConfig = {
  ...ZOHO_CONFIG,
  apiBaseUrl: 'https://sandbox.zohoapis.com',
};

/**
 * Production URLs
 */
export const ZOHO_PRODUCTION_CONFIG: ZohoConfig = {
  ...ZOHO_CONFIG,
  apiBaseUrl: 'https://www.zohoapis.com',
};

/**
 * Get the appropriate configuration based on environment
 */
export function getZohoConfig(): ZohoConfig {
  return ZOHO_CONFIG.environment === 'sandbox' 
    ? ZOHO_SANDBOX_CONFIG 
    : ZOHO_PRODUCTION_CONFIG;
}

/**
 * Required environment variables for Zoho integration
 */
export const REQUIRED_ENV_VARS = [
  'ZOHO_CLIENT_ID',
  'ZOHO_CLIENT_SECRET',
  'ZOHO_REDIRECT_URI',
  'ZOHO_ENVIRONMENT'
];

/**
 * Check if all required environment variables are set
 */
export function validateZohoConfig(): { valid: boolean; missingVars: string[] } {
  const missingVars: string[] = [];
  
  for (const envVar of REQUIRED_ENV_VARS) {
    // Skip validation for clientSecret in development
    if (envVar === 'ZOHO_CLIENT_SECRET' && process.env.NODE_ENV === 'development') {
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
 * Zoho API datacenter constants
 */
export const ZOHO_DATACENTERS = {
  US: 'com',
  EU: 'eu',
  IN: 'in',
  AU: 'com.au',
  CN: 'cn',
  JP: 'jp',
  CA: 'ca',
  MX: 'mx',
};

/**
 * Get the correct API base URL based on data center
 */
export function getZohoApiBaseUrl(datacenter: keyof typeof ZOHO_DATACENTERS = 'com'): string {
  const dc = ZOHO_DATACENTERS[datacenter] || 'com';
  const env = ZOHO_CONFIG.environment === 'sandbox' ? 'sandbox.' : '';
  return `https://${env}zohoapis.${dc}`;
}
