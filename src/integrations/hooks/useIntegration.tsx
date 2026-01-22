/**
 * useIntegration Hook
 * 
 * React hook for managing the overall integration state and context.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '../services/apiClient';
import { loadConfig, getConfig, IntegrationConfig } from '../config/IntegrationConfig';
import type { ConnectionStatus, IntegrationEvent } from '../types/integration';
import { INTEGRATION_EVENTS, INTEGRATION_STATUS, INTEGRATION_PLATFORMS } from '../utils/constants';

// Context Types
interface IntegrationContextValue {
  // Configuration
  config: IntegrationConfig;
  isConfigured: boolean;
  
  // Connection States
  connections: ConnectionStatus[];
  isLoading: boolean;
  error: string | null;
  
  // Tally-specific state
  tallyStatus: {
    isConnected: boolean;
    companyName?: string;
    lastSync?: Date;
    error?: string;
  };
  
  // Busy-specific state
  busyStatus: {
    isConnected: boolean;
    companyName?: string;
    busyVersion?: string;
    lastSync?: Date;
    error?: string;
  };
  
  // QuickBooks-specific state
  quickbooksStatus: {
    isConnected: boolean;
    companyName?: string;
    realmId?: string;
    lastSync?: Date;
    error?: string;
  };
  
  // Xero-specific state
  xeroStatus: {
    isConnected: boolean;
    organizationName?: string;
    tenantId?: string;
    lastSync?: Date;
    error?: string;
  };
  
  // Zoho-specific state
  zohoStatus: {
    isConnected: boolean;
    organizationName?: string;
    organizationId?: string;
    lastSync?: Date;
    error?: string;
  };
  
  // Event handling
  emit: (event: string, payload: unknown) => void;
  on: (event: string, callback: (payload: unknown) => void) => () => void;
  
  // Actions
  refreshConnections: () => Promise<void>;
  clearError: () => void;
  checkTallyConnection: () => Promise<boolean>;
  syncWithTally: () => Promise<any>;
  disconnectFromTally: () => Promise<void>;
  checkBusyConnection: () => Promise<boolean>;
  syncWithBusy: () => Promise<any>;
  disconnectFromBusy: () => Promise<void>;
  configureBusyConnection: (config: { host?: string; port?: number; username?: string; password?: string }) => Promise<void>;
  
  // QuickBooks-specific actions
  connectQuickBooks: () => Promise<void>;
  disconnectFromQuickBooks: () => Promise<void>;
  syncWithQuickBooks: () => Promise<any>;
  quickbooksStatus: {
    isConnected: boolean;
    companyName?: string;
    realmId?: string;
    lastSync?: Date;
    error?: string;
  };
  
  // Xero-specific actions
  connectXero: () => Promise<void>;
  disconnectFromXero: () => Promise<void>;
  syncWithXero: () => Promise<any>;
  xeroStatus: {
    isConnected: boolean;
    organizationName?: string;
    tenantId?: string;
    lastSync?: Date;
    error?: string;
  };
  
  // Zoho-specific actions
  connectZoho: () => Promise<void>;
  disconnectFromZoho: () => Promise<void>;
  syncWithZoho: () => Promise<any>;
  zohoStatus: {
    isConnected: boolean;
    organizationName?: string;
    organizationId?: string;
    lastSync?: Date;
    error?: string;
  };
}

// Create context
const IntegrationContext = createContext<IntegrationContextValue | null>(null);

// Provider Props
interface IntegrationProviderProps {
  children: React.ReactNode;
  autoInitialize?: boolean;
  onEvent?: (event: IntegrationEvent) => void;
}

/**
 * Integration Provider Component
 * 
 * Wraps the application and provides integration context to all child components.
 * 
 * @example
 * ```tsx
 * <IntegrationProvider>
 *   <App />
 * </IntegrationProvider>
 * ```
 */
export function IntegrationProvider({
  children,
  autoInitialize = true,
  onEvent,
}: IntegrationProviderProps): React.ReactElement {
  const [config, setConfig] = useState<IntegrationConfig | null>(null);
  const [connections, setConnections] = useState<ConnectionStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tallyStatus, setTallyStatus] = useState({
    isConnected: false,
    companyName: undefined,
    lastSync: undefined,
    error: undefined
  });
  
  const [busyStatus, setBusyStatus] = useState({
    isConnected: false,
    companyName: undefined,
    busyVersion: undefined,
    lastSync: undefined,
    error: undefined
  });
  
  const [quickbooksStatus, setQuickbooksStatus] = useState({
    isConnected: false,
    companyName: undefined,
    realmId: undefined,
    lastSync: undefined,
    error: undefined
  });
  
  const [xeroStatus, setXeroStatus] = useState({
    isConnected: false,
    organizationName: undefined,
    tenantId: undefined,
    lastSync: undefined,
    error: undefined
  });
  
  const [zohoStatus, setZohoStatus] = useState({
    isConnected: false,
    organizationName: undefined,
    organizationId: undefined,
    lastSync: undefined,
    error: undefined
  });
  
  const eventListenersRef = useRef<Map<string, Set<(payload: unknown) => void>>>(new Map());
  const initializedRef = useRef(false);

  // Initialize configuration
  useEffect(() => {
    try {
      const loadedConfig = loadConfig();
      setConfig(loadedConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    }
  }, []);

  // Auto-initialize connections
  useEffect(() => {
    if (autoInitialize && config && !initializedRef.current) {
      initializedRef.current = true;
      refreshConnections();
    }
  }, [autoInitialize, config]);

  // Set up event listeners
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Listen to all integration events
    const eventTypes = Object.values(INTEGRATION_EVENTS);
    
    eventTypes.forEach((eventType) => {
      const unsubscribe = apiClient.on(eventType, (payload) => {
        // Emit to local listeners
        eventListenersRef.current.get(eventType)?.forEach((callback) => {
          callback(payload);
        });

        // Forward to external handler
        if (onEvent && payload && typeof payload === 'object' && 'type' in payload) {
          onEvent(payload as IntegrationEvent);
        }
      });
      
      unsubscribers.push(unsubscribe);
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [onEvent]);

  // Refresh connection statuses
  const refreshConnections = useCallback(async () => {
    if (!config) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const providers = Object.keys(config.providers) as Array<keyof typeof config.providers>;
      const statuses: ConnectionStatus[] = [];

      for (const provider of providers) {
        if (!config.providers[provider].enabled) continue;

        const response = await apiClient.getConnectionStatus(provider);
        
        if (response.success && response.data) {
          statuses.push({
            provider: provider as ConnectionStatus['provider'],
            connected: response.data.connected,
            error: response.data.details?.error as string | undefined,
          });
        }
      }

      setConnections(statuses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh connections');
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check Tally Prime connection status
  const checkTallyConnection = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const response = await apiClient.get('/integrations/tally/status');
      
      if (response.success) {
        setTallyStatus(prev => ({
          ...prev,
          isConnected: response.data.isConnected || false,
          companyName: response.data.companyName || undefined,
          error: response.data.error || undefined
        }));
        return response.data.isConnected || false;
      }
      return false;
    } catch (err) {
      setTallyStatus(prev => ({
        ...prev,
        isConnected: false,
        error: err instanceof Error ? err.message : 'Failed to check Tally connection'
      }));
      return false;
    }
  }, []);

  // Sync with Tally Prime
  const syncWithTally = useCallback(async (): Promise<any> => {
    try {
      setError(null);
      
      // First check if Tally is connected
      const isConnected = await checkTallyConnection();
      if (!isConnected) {
        throw new Error('Tally Prime is not connected. Please connect first.');
      }
      
      // Trigger sync
      const response = await apiClient.post('/integrations/tally/sync', {});
      
      if (response.success) {
        setTallyStatus(prev => ({
          ...prev,
          lastSync: new Date()
        }));
        
        // Emit sync completed event
        emit(INTEGRATION_EVENTS.JOB_COMPLETED, {
          provider: 'tally',
          type: 'sync',
          result: response.data
        });
      }
      
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Tally sync failed';
      setError(errorMessage);
      
      emit(INTEGRATION_EVENTS.JOB_FAILED, {
        provider: 'tally',
        type: 'sync',
        error: errorMessage
      });
      
      throw err;
    }
  }, [checkTallyConnection, emit]);

  // Disconnect from Tally Prime
  const disconnectFromTally = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const response = await apiClient.post('/integrations/tally/disconnect');
      
      if (response.success) {
        setTallyStatus({
          isConnected: false,
          companyName: undefined,
          lastSync: undefined,
          error: undefined
        });
        
        emit(INTEGRATION_EVENTS.DISCONNECTED, {
          provider: 'tally'
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect from Tally';
      setError(errorMessage);
      throw err;
    }
  }, [emit]);

  // Check Busy connection status
  const checkBusyConnection = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const response = await apiClient.get('/integrations/busy/status');
      
      if (response.success) {
        setBusyStatus(prev => ({
          ...prev,
          isConnected: response.data.isConnected || false,
          companyName: response.data.companyName || undefined,
          busyVersion: response.data.busyVersion || undefined,
          error: response.data.error || undefined
        }));
        return response.data.isConnected || false;
      }
      return false;
    } catch (err) {
      setBusyStatus(prev => ({
        ...prev,
        isConnected: false,
        error: err instanceof Error ? err.message : 'Failed to check Busy connection'
      }));
      return false;
    }
  }, []);

  // Sync with Busy
  const syncWithBusy = useCallback(async (): Promise<any> => {
    try {
      setError(null);
      
      // First check if Busy is connected
      const isConnected = await checkBusyConnection();
      if (!isConnected) {
        throw new Error('Busy is not connected. Please connect first.');
      }
      
      // Trigger sync
      const response = await apiClient.post('/integrations/busy/sync', {});
      
      if (response.success) {
        setBusyStatus(prev => ({
          ...prev,
          lastSync: new Date()
        }));
        
        // Emit sync completed event
        emit(INTEGRATION_EVENTS.JOB_COMPLETED, {
          provider: 'busy',
          type: 'sync',
          result: response.data
        });
      }
      
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Busy sync failed';
      setError(errorMessage);
      
      emit(INTEGRATION_EVENTS.JOB_FAILED, {
        provider: 'busy',
        type: 'sync',
        error: errorMessage
      });
      
      throw err;
    }
  }, [checkBusyConnection, emit]);

  // Disconnect from Busy
  const disconnectFromBusy = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const response = await apiClient.post('/integrations/busy/disconnect');
      
      if (response.success) {
        setBusyStatus({
          isConnected: false,
          companyName: undefined,
          busyVersion: undefined,
          lastSync: undefined,
          error: undefined
        });
        
        emit(INTEGRATION_EVENTS.DISCONNECTED, {
          provider: 'busy'
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect from Busy';
      setError(errorMessage);
      throw err;
    }
  }, [emit]);

  // Configure Busy connection
  const configureBusyConnection = useCallback(async (config: {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
  }): Promise<void> => {
    try {
      setError(null);
      const response = await apiClient.post('/integrations/busy/configure', config);
      
      if (response.success) {
        // Re-check connection with new configuration
        await checkBusyConnection();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to configure Busy connection';
      setError(errorMessage);
      throw err;
    }
  }, [checkBusyConnection]);

  // Connect to QuickBooks - initiates OAuth flow
  const connectQuickBooks = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      
      // Get authorization URL from backend
      const response = await apiClient.get('/integrations/quickbooks/auth-url');
      
      if (response.success && response.data?.url) {
        // Redirect to QuickBooks OAuth page
        window.location.href = response.data.url;
      } else {
        throw new Error(response.error || 'Failed to get QuickBooks authorization URL');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to QuickBooks';
      setQuickbooksStatus(prev => ({
        ...prev,
        error: errorMessage
      }));
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Disconnect from QuickBooks
  const disconnectFromQuickBooks = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const response = await apiClient.post('/integrations/quickbooks/disconnect');
      
      if (response.success) {
        setQuickbooksStatus({
          isConnected: false,
          companyName: undefined,
          realmId: undefined,
          lastSync: undefined,
          error: undefined
        });
        
        emit(INTEGRATION_EVENTS.DISCONNECTED, {
          provider: 'quickbooks'
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect from QuickBooks';
      setError(errorMessage);
      throw err;
    }
  }, [emit]);

  // Sync with QuickBooks
  const syncWithQuickBooks = useCallback(async (): Promise<any> => {
    try {
      setError(null);
      
      // First check if QuickBooks is connected
      if (!quickbooksStatus.isConnected) {
        throw new Error('QuickBooks is not connected. Please connect first.');
      }
      
      // Trigger sync
      const response = await apiClient.post('/integrations/quickbooks/sync', {});
      
      if (response.success) {
        setQuickbooksStatus(prev => ({
          ...prev,
          lastSync: new Date()
        }));
        
        // Emit sync completed event
        emit(INTEGRATION_EVENTS.JOB_COMPLETED, {
          provider: 'quickbooks',
          type: 'sync',
          result: response.data
        });
      }
      
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'QuickBooks sync failed';
      setError(errorMessage);
      
      emit(INTEGRATION_EVENTS.JOB_FAILED, {
        provider: 'quickbooks',
        type: 'sync',
        error: errorMessage
      });
      
      throw err;
    }
  }, [quickbooksStatus.isConnected, emit]);

  // Connect to Xero - initiates OAuth flow
  const connectXero = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      
      // Get authorization URL from backend
      const response = await apiClient.get('/integrations/xero/auth-url');
      
      if (response.success && response.data?.url) {
        // Redirect to Xero OAuth page
        window.location.href = response.data.url;
      } else {
        throw new Error(response.error || 'Failed to get Xero authorization URL');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to Xero';
      setXeroStatus(prev => ({
        ...prev,
        error: errorMessage
      }));
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Disconnect from Xero
  const disconnectFromXero = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const response = await apiClient.post('/integrations/xero/disconnect');
      
      if (response.success) {
        setXeroStatus({
          isConnected: false,
          organizationName: undefined,
          tenantId: undefined,
          lastSync: undefined,
          error: undefined
        });
        
        emit(INTEGRATION_EVENTS.DISCONNECTED, {
          provider: 'xero'
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect from Xero';
      setError(errorMessage);
      throw err;
    }
  }, [emit]);

  // Sync with Xero
  const syncWithXero = useCallback(async (): Promise<any> => {
    try {
      setError(null);
      
      // First check if Xero is connected
      if (!xeroStatus.isConnected) {
        throw new Error('Xero is not connected. Please connect first.');
      }
      
      // Trigger sync
      const response = await apiClient.post('/integrations/xero/sync', {});
      
      if (response.success) {
        setXeroStatus(prev => ({
          ...prev,
          lastSync: new Date()
        }));
        
        // Emit sync completed event
        emit(INTEGRATION_EVENTS.JOB_COMPLETED, {
          provider: 'xero',
          type: 'sync',
          result: response.data
        });
      }
      
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Xero sync failed';
      setError(errorMessage);
      
      emit(INTEGRATION_EVENTS.JOB_FAILED, {
        provider: 'xero',
        type: 'sync',
        error: errorMessage
      });
      
      throw err;
    }
  }, [xeroStatus.isConnected, emit]);

  // Connect to Zoho - initiates OAuth flow
  const connectZoho = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      
      // Get authorization URL from backend
      const response = await apiClient.get('/integrations/zoho/auth-url');
      
      if (response.success && response.data?.url) {
        // Redirect to Zoho OAuth page
        window.location.href = response.data.url;
      } else {
        throw new Error(response.error || 'Failed to get Zoho authorization URL');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to Zoho';
      setZohoStatus(prev => ({
        ...prev,
        error: errorMessage
      }));
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Disconnect from Zoho
  const disconnectFromZoho = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const response = await apiClient.post('/integrations/zoho/disconnect');
      
      if (response.success) {
        setZohoStatus({
          isConnected: false,
          organizationName: undefined,
          organizationId: undefined,
          lastSync: undefined,
          error: undefined
        });
        
        emit(INTEGRATION_EVENTS.DISCONNECTED, {
          provider: 'zoho'
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect from Zoho';
      setError(errorMessage);
      throw err;
    }
  }, [emit]);

  // Sync with Zoho
  const syncWithZoho = useCallback(async (): Promise<any> => {
    try {
      setError(null);
      
      // First check if Zoho is connected
      if (!zohoStatus.isConnected) {
        throw new Error('Zoho is not connected. Please connect first.');
      }
      
      // Trigger sync
      const response = await apiClient.post('/integrations/zoho/sync', {});
      
      if (response.success) {
        setZohoStatus(prev => ({
          ...prev,
          lastSync: new Date()
        }));
        
        // Emit sync completed event
        emit(INTEGRATION_EVENTS.JOB_COMPLETED, {
          provider: 'zoho',
          type: 'sync',
          result: response.data
        });
      }
      
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Zoho sync failed';
      setError(errorMessage);
      
      emit(INTEGRATION_EVENTS.JOB_FAILED, {
        provider: 'zoho',
        type: 'sync',
        error: errorMessage
      });
      
      throw err;
    }
  }, [zohoStatus.isConnected, emit]);

  // Emit event to all listeners
  const emit = useCallback((event: string, payload: unknown) => {
    apiClient.emit(event, payload);
  }, []);

  // Subscribe to events
  const on = useCallback((event: string, callback: (payload: unknown) => void) => {
    if (!eventListenersRef.current.has(event)) {
      eventListenersRef.current.set(event, new Set());
    }
    eventListenersRef.current.get(event)!.add(callback);

    return () => {
      eventListenersRef.current.get(event)?.delete(callback);
    };
  }, []);

  // Check if configured
  const isConfigured = config !== null && 
    Object.values(config.providers).some((p) => p.enabled);

  // Context value
  const value: IntegrationContextValue = {
    config: config || loadConfig(),
    isConfigured,
    connections,
    isLoading,
    error,
    tallyStatus,
    busyStatus,
    emit,
    on,
    refreshConnections,
    clearError,
    checkTallyConnection,
    syncWithTally,
    disconnectFromTally,
    checkBusyConnection,
    syncWithBusy,
    disconnectFromBusy,
    configureBusyConnection,
    quickbooksStatus,
    connectQuickBooks,
    disconnectFromQuickBooks,
    syncWithQuickBooks,
    xeroStatus,
    connectXero,
    disconnectFromXero,
    syncWithXero,
    zohoStatus,
    connectZoho,
    disconnectFromZoho,
    syncWithZoho,
  };

  return (
    <IntegrationContext.Provider value={value}>
      {children}
    </IntegrationContext.Provider>
  );
}

/**
 * useIntegration Hook
 * 
 * Access the integration context from any component.
 * 
 * @example
 * ```tsx
 * const { connections, refreshConnections } = useIntegration();
 * ```
 */
export function useIntegration(): IntegrationContextValue {
  const context = useContext(IntegrationContext);
  
  if (!context) {
    throw new Error('useIntegration must be used within an IntegrationProvider');
  }
  
  return context;
}

/**
 * useIntegrationConfig Hook
 * 
 * Access only the integration configuration.
 */
export function useIntegrationConfig(): IntegrationConfig {
  const { config } = useIntegration();
  return config;
}

/**
 * useIntegrationConnections Hook
 * 
 * Access connection statuses for all providers.
 */
export function useIntegrationConnections(): {
  connections: ConnectionStatus[];
  isLoading: boolean;
  refresh: () => Promise<void>;
} {
  const { connections, isLoading, refreshConnections } = useIntegration();
  return { connections, isLoading, refresh: refreshConnections };
}

/**
 * useIsConfigured Hook
 * 
 * Check if integrations are configured.
 */
export function useIsConfigured(): boolean {
  const { isConfigured } = useIntegration();
  return isConfigured;
}

/**
 * useIntegrationError Hook
 * 
 * Access and clear integration errors.
 */
export function useIntegrationError(): {
  error: string | null;
  clearError: () => void;
} {
  const { error, clearError } = useIntegration();
  return { error, clearError };
}

/**
 * useIntegrationEvent Hook
 * 
 * Subscribe to specific integration events.
 * 
 * @example
 * ```tsx
 * useIntegrationEvent(INTEGRATION_EVENTS.OAUTH_COMPLETED, (result) => {
 *   console.log('Connected to:', result.provider);
 * });
 * ```
 */
export function useIntegrationEvent<T>(
  event: string,
  callback: (payload: T) => void
): void {
  const { on } = useIntegration();

  useEffect(() => {
    return on(event, callback as (payload: unknown) => void);
  }, [event, callback, on]);
}

/**
 * useConnection Hook
 * 
 * Get connection status for a specific provider.
 */
export function useConnection(provider: string): {
  status: ConnectionStatus | undefined;
  isConnected: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
} {
  const { connections, isLoading, refreshConnections } = useIntegrationConnections();
  const status = connections.find((c) => c.provider === provider);
  
  return {
    status,
    isConnected: status?.connected ?? false,
    isLoading,
    refresh: refreshConnections,
  };
}

/**
 * useAnyConnection Hook
 * 
 * Check if any integration is connected.
 */
export function useAnyConnection(): {
  hasConnections: boolean;
  connectionCount: number;
  providers: string[];
} {
  const { connections } = useIntegrationConnections();
  const connected = connections.filter((c) => c.connected);
  
  return {
    hasConnections: connected.length > 0,
    connectionCount: connected.length,
    providers: connected.map((c) => c.provider),
  };
}
