/**
 * Integration Configuration
 * 
 * Manages configuration for the enterprise integrations module.
 * Loads settings from environment variables and provides typed access.
 */

export interface IntegrationConfig {
  // API Configuration
  apiBaseUrl: string;
  apiTimeout: number;
  
  // OAuth Providers
  providers: {
    quickbooks: {
      enabled: boolean;
      clientId: string;
      redirectUri: string;
    };
    xero: {
      enabled: boolean;
      clientId: string;
      redirectUri: string;
    };
    zoho: {
      enabled: boolean;
      clientId: string;
      redirectUri: string;
    };
  };
  
  // Webhook Configuration
  webhook: {
    secret: string;
    enabled: boolean;
  };
  
  // Feature Flags
  features: {
    autoTokenRefresh: boolean;
    rateLimiting: boolean;
    circuitBreaker: boolean;
    retryEnabled: boolean;
  };
  
  // Rate Limits
  rateLimits: {
    quickbooks: { maxRequests: number; windowMs: number };
    xero: { maxRequests: number; windowMs: number };
    zoho: { maxRequests: number; windowMs: number };
  };
}

let config: IntegrationConfig | null = null;

/**
 * Load integration configuration from environment variables
 */
export function loadConfig(): IntegrationConfig {
  if (config) {
    return config;
  }
  
  config = {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
    apiTimeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10),
    
    providers: {
      quickbooks: {
        enabled: import.meta.env.VITE_QB_ENABLED === 'true',
        clientId: import.meta.env.VITE_QB_CLIENT_ID || '',
        redirectUri: import.meta.env.VITE_QB_REDIRECT_URI || 
          `${window.location.origin}/auth/quickbooks/callback`,
      },
      xero: {
        enabled: import.meta.env.VITE_XERO_ENABLED === 'true',
        clientId: import.meta.env.VITE_XERO_CLIENT_ID || '',
        redirectUri: import.meta.env.VITE_XERO_REDIRECT_URI || 
          `${window.location.origin}/auth/xero/callback`,
      },
      zoho: {
        enabled: import.meta.env.VITE_ZOHO_ENABLED === 'true',
        clientId: import.meta.env.VITE_ZOHO_CLIENT_ID || '',
        redirectUri: import.meta.env.VITE_ZOHO_REDIRECT_URI || 
          `${window.location.origin}/auth/zoho/callback`,
      },
    },
    
    webhook: {
      secret: import.meta.env.VITE_WEBHOOK_SECRET || '',
      enabled: import.meta.env.VITE_WEBHOOK_ENABLED === 'true',
    },
    
    features: {
      autoTokenRefresh: import.meta.env.VITE_AUTO_TOKEN_REFRESH !== 'false',
      rateLimiting: import.meta.env.VITE_RATE_LIMITING !== 'false',
      circuitBreaker: import.meta.env.VITE_CIRCUIT_BREAKER !== 'false',
      retryEnabled: import.meta.env.VITE_RETRY_ENABLED !== 'false',
    },
    
    rateLimits: {
      quickbooks: {
        maxRequests: parseInt(import.meta.env.VITE_QB_RATE_LIMIT || '60', 10),
        windowMs: parseInt(import.meta.env.VITE_QB_RATE_WINDOW || '60000', 10),
      },
      xero: {
        maxRequests: parseInt(import.meta.env.VITE_XERO_RATE_LIMIT || '60', 10),
        windowMs: parseInt(import.meta.env.VITE_XERO_RATE_WINDOW || '60000', 10),
      },
      zoho: {
        maxRequests: parseInt(import.meta.env.VITE_ZOHO_RATE_LIMIT || '100', 10),
        windowMs: parseInt(import.meta.env.VITE_ZOHO_RATE_WINDOW || '60000', 10),
      },
    },
  };
  
  return config;
}

/**
 * Get the current configuration
 */
export function getConfig(): IntegrationConfig {
  if (!config) {
    return loadConfig();
  }
  return config;
}

/**
 * Check if a provider is configured and enabled
 */
export function isProviderEnabled(provider: string): boolean {
  const cfg = getConfig();
  const providerConfig = cfg.providers[provider as keyof typeof cfg.providers];
  return providerConfig?.enabled ?? false;
}

/**
 * Get provider configuration
 */
export function getProviderConfig(provider: string) {
  const cfg = getConfig();
  return cfg.providers[provider as keyof typeof cfg.providers];
}

/**
 * Update configuration at runtime
 */
export function updateConfig(updates: Partial<IntegrationConfig>): IntegrationConfig {
  config = { ...getConfig(), ...updates };
  return config;
}

/**
 * Reset configuration (mainly for testing)
 */
export function resetConfig(): void {
  config = null;
}
