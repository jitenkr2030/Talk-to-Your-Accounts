/**
 * Integration Index
 * 
 * This is the main entry point for accessing all integration services.
 * Import from here to use any integration feature.
 */

// Re-export all services for easy importing
export { IntegrationConfig, getConfig, loadConfig } from './config/IntegrationConfig';
export { useIntegration, IntegrationProvider } from './hooks/useIntegration';
export { apiClient } from './services/apiClient';
export { useOAuth } from './services/useOAuth';
export { useWebhooks } from './services/useWebhooks';
export { useQueue } from './services/useQueue';
export { useTenancy } from './services/useTenancy';

// Provider enums
export { IntegrationProvider, OAuthProvider } from './utils/constants';

// Types
export * from './types/integration';
