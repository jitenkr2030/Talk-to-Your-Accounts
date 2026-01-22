/**
 * Integration Constants
 * 
 * Defines all constants used throughout the integration module.
 */

/**
 * OAuth Provider enumeration
 */
export enum OAuthProvider {
  QUICKBOOKS = 'quickbooks',
  XERO = 'xero',
  ZOHO = 'zoho',
  TALLY = 'tally',
}

/**
 * Integration platform types (includes non-OAuth platforms like Tally)
 */
export const INTEGRATION_PLATFORMS = {
  quickbooks: {
    name: 'QuickBooks Online',
    description: 'Sync with QuickBooks Online accounting software',
    icon: '📚',
    authType: 'oauth2',
    features: ['transactions', 'contacts', 'items', 'reports']
  },
  xero: {
    name: 'Xero',
    description: 'Sync with Xero accounting software',
    icon: '📊',
    authType: 'oauth2',
    features: ['transactions', 'contacts', 'items', 'reports']
  },
  zoho: {
    name: 'Zoho Books',
    description: 'Sync with Zoho Books accounting software',
    icon: '🏢',
    authType: 'oauth2',
    features: ['transactions', 'contacts', 'items', 'reports']
  },
  tally: {
    name: 'Tally Prime',
    description: 'Sync with Tally Prime accounting software',
    icon: '📋',
    authType: 'api',
    features: ['transactions', 'ledgers', 'items', 'masters'],
    requiresTallyRunning: true
  },
  busy: {
    name: 'Busy Accounting',
    description: 'Sync with Busy accounting software',
    icon: '⚡',
    authType: 'api',
    features: ['transactions', 'ledgers', 'items']
  }
};

/**
 * Integration status values
 */
export const INTEGRATION_STATUS = {
  connected: 'connected',
  disconnected: 'disconnected',
  pending: 'pending',
  error: 'error',
  syncing: 'syncing'
} as const;

/**
 * Integration provider display names
 */
export const PROVIDER_NAMES: Record<OAuthProvider | string, string> = {
  [OAuthProvider.QUICKBOOKS]: 'QuickBooks Online',
  [OAuthProvider.XERO]: 'Xero',
  [OAuthProvider.ZOHO]: 'Zoho Books',
  [OAuthProvider.TALLY]: 'Tally Prime',
  busy: 'Busy Accounting',
};

/**
 * OAuth endpoints for each provider
 */
export const OAUTH_ENDPOINTS: Record<OAuthProvider, { auth: string; token: string }> = {
  [OAuthProvider.QUICKBOOKS]: {
    auth: 'https://appcenter.intuit.com/connect/oauth2',
    token: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
  },
  [OAuthProvider.XERO]: {
    auth: 'https://login.xero.com/identity/connect/authorize',
    token: 'https://identity.xero.com/connect/token',
  },
  [OAuthProvider.ZOHO]: {
    auth: 'https://accounts.zoho.com/oauth/v2/auth',
    token: 'https://accounts.zoho.com/oauth/v2/token',
  },
};

/**
 * API base URLs for each provider
 */
export const API_BASE_URLS: Record<OAuthProvider, string> = {
  [OAuthProvider.QUICKBOOKS]: 'https://quickbooks.api.intuit.com/v3',
  [OAuthProvider.XERO]: 'https://api.xero.com/api.xro/2.0',
  [OAuthProvider.ZOHO]: 'https://www.zohoapis.com',
};

/**
 * OAuth scopes for each provider
 */
export const OAUTH_SCOPES: Record<OAuthProvider, string[]> = {
  [OAuthProvider.QUICKBOOKS]: [
    'com.intuit.quickbooks.accounting',
    'com.intuit.quickbooks.payment',
  ],
  [OAuthProvider.XERO]: [
    'openid',
    'profile',
    'email',
    'accounting.transactions',
    'accounting.contacts',
  ],
  [OAuthProvider.ZOHO]: [
    'ZohoBooks.fullaccess.all',
  ],
};

/**
 * Webhook event type mappings
 */
export const WEBHOOK_EVENTS = {
  // Invoice events
  INVOICE_CREATED: 'invoice.created',
  INVOICE_UPDATED: 'invoice.updated',
  INVOICE_DELETED: 'invoice.deleted',
  INVOICE_SENT: 'invoice.sent',
  INVOICE_PAID: 'invoice.paid',
  
  // Payment events
  PAYMENT_CREATED: 'payment.created',
  PAYMENT_DELETED: 'payment.deleted',
  
  // Contact events
  CONTACT_CREATED: 'contact.created',
  CONTACT_UPDATED: 'contact.updated',
  
  // Item events
  ITEM_CREATED: 'item.created',
  ITEM_UPDATED: 'item.updated',
};

/**
 * Job priorities
 */
export const JOB_PRIORITIES = {
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
} as const;

/**
 * Tenant status values
 */
export const TENANT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
} as const;

/**
 * Plan types
 */
export const PLANS = {
  FREE: 'free',
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
} as const;

/**
 * Storage keys for localStorage
 */
export const STORAGE_KEYS = {
  INTEGRATION_TOKENS: 'ttya_integration_tokens',
  INTEGRATION_STATE: 'ttya_integration_state',
  WEBHOOK_EVENTS: 'ttya_webhook_events',
  QUEUE_STATUS: 'ttya_queue_status',
} as const;

/**
 * Event names for internal messaging
 */
export const INTEGRATION_EVENTS = {
  // OAuth events
  OAUTH_STARTED: 'integration:oauth:started',
  OAUTH_COMPLETED: 'integration:oauth:completed',
  OAUTH_FAILED: 'integration:oauth:failed',
  OAUTH_REVOKED: 'integration:oauth:revoked',
  
  // Token events
  TOKEN_REFRESHED: 'integration:token:refreshed',
  TOKEN_EXPIRED: 'integration:token:expired',
  
  // Webhook events
  WEBHOOK_RECEIVED: 'integration:webhook:received',
  WEBHOOK_PROCESSED: 'integration:webhook:processed',
  WEBHOOK_FAILED: 'integration:webhook:failed',
  
  // Queue events
  JOB_QUEUED: 'integration:job:queued',
  JOB_COMPLETED: 'integration:job:completed',
  JOB_FAILED: 'integration:job:failed',
  
  // Connection events
  CONNECTED: 'integration:connected',
  DISCONNECTED: 'integration:disconnected',
  RECONNECTING: 'integration:reconnecting',
} as const;

/**
 * Default rate limits (requests per window)
 */
export const DEFAULT_RATE_LIMITS = {
  [OAuthProvider.QUICKBOOKS]: { maxRequests: 60, windowMs: 60000 },
  [OAuthProvider.XERO]: { maxRequests: 60, windowMs: 60000 },
  [OAuthProvider.ZOHO]: { maxRequests: 100, windowMs: 60000 },
};

/**
 * Circuit breaker states
 */
export const CIRCUIT_STATES = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
} as const;

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  maxRetries: 5,
  initialDelay: 1000,
  multiplier: 2,
  maxDelay: 30000,
  jitterRange: 100,
};

/**
 * Cache TTL values (in milliseconds)
 */
export const CACHE_TTL = {
  TOKEN: 5 * 60 * 1000, // 5 minutes before expiration
  CONFIG: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT: 60 * 1000, // 1 minute
  WEBHOOK_CACHE: 10 * 60 * 1000, // 10 minutes
};
