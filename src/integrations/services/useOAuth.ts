/**
 * useOAuth Hook
 * 
 * React hook for managing OAuth authentication with accounting providers.
 */

import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import { useIntegration } from './useIntegration';
import { getConfig } from '../config/IntegrationConfig';
import type { ConnectionResult, OAuthTokens } from '../types/integration';
import { OAuthProvider, PROVIDER_NAMES } from '../utils/constants';

// State Types
interface OAuthState {
  isConnecting: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastConnection: {
    provider: OAuthProvider | null;
    timestamp: string | null;
    success: boolean;
  };
}

// Return Types
interface UseOAuthReturn {
  // State
  isConnecting: boolean;
  isRefreshing: boolean;
  error: string | null;
  connections: Map<OAuthProvider, boolean>;
  connectionDetails: Map<OAuthProvider, { expiresAt: string; scope: string }>;
  
  // Actions
  connect: (provider: OAuthProvider) => Promise<void>;
  disconnect: (provider: OAuthProvider) => Promise<void>;
  refreshToken: (provider: OAuthProvider) => Promise<boolean>;
  getAuthUrl: (provider: OAuthProvider) => Promise<string>;
  handleCallback: (provider: OAuthProvider, code: string, state: string) => Promise<ConnectionResult>;
  
  // Utilities
  isConnected: (provider: OAuthProvider) => boolean;
  getExpiryTime: (provider: OAuthProvider) => Date | null;
  needsRefresh: (provider: OAuthProvider) => boolean;
  clearError: () => void;
}

/**
 * useOAuth Hook
 * 
 * Manages OAuth connections to accounting providers.
 * 
 * @example
 * ```tsx
 * const { connect, disconnect, isConnected } = useOAuth();
 * 
 * const handleConnect = async () => {
 *   await connect('quickbooks');
 * };
 * ```
 */
export function useOAuth(): UseOAuthReturn {
  const { config, connections: contextConnections, refreshConnections } = useIntegration();
  
  const [state, setState] = useState<OAuthState>({
    isConnecting: false,
    isRefreshing: false,
    error: null,
    lastConnection: {
      provider: null,
      timestamp: null,
      success: false,
    },
  });

  // Track connection states locally
  const [connections, setConnections] = useState<Map<OAuthProvider, boolean>>(
    new Map(contextConnections.map((c) => [c.provider as OAuthProvider, c.connected]))
  );
  
  const [connectionDetails, setConnectionDetails] = useState<Map<OAuthProvider, { expiresAt: string; scope: string }>>(
    new Map()
  );

  // Sync with context connections
  useEffect(() => {
    const newConnections = new Map<OAuthProvider, boolean>();
    const newDetails = new Map<OAuthProvider, { expiresAt: string; scope: string }>();
    
    contextConnections.forEach((c) => {
      const provider = c.provider as OAuthProvider;
      newConnections.set(provider, c.connected);
      
      if (c.connected && c.credentials) {
        newDetails.set(provider, {
          expiresAt: c.credentials.expiresAt,
          scope: c.credentials.scope,
        });
      }
    });
    
    setConnections(newConnections);
    setConnectionDetails(newDetails);
  }, [contextConnections]);

  // Set up event listeners
  useEffect(() => {
    const unsubCompleted = apiClient.onOAuthCompleted((result) => {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        lastConnection: {
          provider: result.provider as OAuthProvider,
          timestamp: new Date().toISOString(),
          success: result.success,
        },
      }));
      
      if (result.success) {
        setConnections((prev) => new Map(prev).set(result.provider as OAuthProvider, true));
        if (result.expiresAt) {
          setConnectionDetails((prev) =>
            new Map(prev).set(result.provider as OAuthProvider, {
              expiresAt: result.expiresAt,
              scope: result.tokens?.scope || '',
            })
          );
        }
        refreshConnections();
      }
    });

    const unsubFailed = apiClient.onOAuthFailed((error) => {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: error.error,
        lastConnection: {
          provider: error.provider as OAuthProvider,
          timestamp: new Date().toISOString(),
          success: false,
        },
      }));
    });

    const unsubRefreshed = apiClient.onTokenRefreshed((data) => {
      setState((prev) => ({
        ...prev,
        isRefreshing: false,
      }));
      
      setConnectionDetails((prev) =>
        new Map(prev).set(data.provider as OAuthProvider, {
          expiresAt: data.expiresAt,
          scope: prev.get(data.provider as OAuthProvider)?.scope || '',
        })
      );
    });

    return () => {
      unsubCompleted();
      unsubFailed();
      unsubRefreshed();
    };
  }, [refreshConnections]);

  // Connect to a provider
  const connect = useCallback(async (provider: OAuthProvider) => {
    if (!config.providers[provider]?.enabled) {
      setState((prev) => ({
        ...prev,
        error: `${PROVIDER_NAMES[provider]} is not enabled`,
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isConnecting: true,
      error: null,
    }));

    try {
      // Generate state for CSRF protection
      const state = generateState();
      sessionStorage.setItem(`oauth_state_${provider}`, state);

      // Get authorization URL
      const response = await apiClient.getAuthorizationUrl(provider, state);
      
      if (!response.success || !response.data?.url) {
        throw new Error(response.error?.message || 'Failed to get authorization URL');
      }

      // Redirect to provider's OAuth page
      window.location.href = response.data.url;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: err instanceof Error ? err.message : 'Connection failed',
      }));
    }
  }, [config]);

  // Disconnect from a provider
  const disconnect = useCallback(async (provider: OAuthProvider) => {
    setState((prev) => ({
      ...prev,
      isConnecting: true,
      error: null,
    }));

    try {
      const response = await apiClient.revokeConnection(provider);
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to disconnect');
      }

      setConnections((prev) => {
        const next = new Map(prev);
        next.delete(provider);
        return next;
      });
      
      setConnectionDetails((prev) => {
        const next = new Map(prev);
        next.delete(provider);
        return next;
      });

      await refreshConnections();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Disconnect failed',
      }));
    } finally {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
      }));
    }
  }, [refreshConnections]);

  // Refresh token
  const refreshToken = useCallback(async (provider: OAuthProvider): Promise<boolean> => {
    if (!connections.get(provider)) {
      return false;
    }

    setState((prev) => ({
      ...prev,
      isRefreshing: true,
      error: null,
    }));

    try {
      const response = await apiClient.refreshToken(provider);
      
      if (!response.success || !response.data?.tokens) {
        throw new Error(response.error?.message || 'Token refresh failed');
      }

      setConnectionDetails((prev) =>
        new Map(prev).set(provider, {
          expiresAt: response.data.tokens.expiresAt,
          scope: response.data.tokens.scope,
        })
      );

      return true;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Token refresh failed',
      }));
      return false;
    } finally {
      setState((prev) => ({
        ...prev,
        isRefreshing: false,
      }));
    }
  }, [connections]);

  // Get authorization URL (for custom handling)
  const getAuthUrl = useCallback(async (provider: OAuthProvider): Promise<string> => {
    const state = generateState();
    sessionStorage.setItem(`oauth_state_${provider}`, state);

    const response = await apiClient.getAuthorizationUrl(provider, state);
    
    if (!response.success || !response.data?.url) {
      throw new Error(response.error?.message || 'Failed to get authorization URL');
    }

    return response.data.url;
  }, []);

  // Handle OAuth callback
  const handleCallback = useCallback(async (
    provider: OAuthProvider,
    code: string,
    state: string
  ): Promise<ConnectionResult> => {
    // Verify state
    const savedState = sessionStorage.getItem(`oauth_state_${provider}`);
    sessionStorage.removeItem(`oauth_state_${provider}`);
    
    if (state !== savedState) {
      throw new Error('Invalid OAuth state');
    }

    setState((prev) => ({
      ...prev,
      isConnecting: true,
      error: null,
    }));

    try {
      const response = await apiClient.exchangeCode(provider, code, state);
      
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to exchange code');
      }

      setConnections((prev) => new Map(prev).set(provider, true));
      
      if (response.data.tokens) {
        setConnectionDetails((prev) =>
          new Map(prev).set(provider, {
            expiresAt: response.data!.expiresAt || new Date().toISOString(),
            scope: response.data.tokens.scope,
          })
        );
      }

      await refreshConnections();

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: errorMessage,
      }));
      
      return {
        success: false,
        provider,
        error: errorMessage,
      };
    }
  }, [refreshConnections]);

  // Check if connected
  const isConnected = useCallback((provider: OAuthProvider): boolean => {
    return connections.get(provider) ?? false;
  }, [connections]);

  // Get expiry time
  const getExpiryTime = useCallback((provider: OAuthProvider): Date | null => {
    const details = connectionDetails.get(provider);
    if (!details) return null;
    
    return new Date(details.expiresAt);
  }, [connectionDetails]);

  // Check if needs refresh
  const needsRefresh = useCallback((provider: OAuthProvider): boolean => {
    const expiryTime = getExpiryTime(provider);
    if (!expiryTime) return false;
    
    // Refresh 5 minutes before expiry
    const refreshThreshold = new Date(Date.now() + 5 * 60 * 1000);
    return expiryTime < refreshThreshold;
  }, [getExpiryTime]);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    connections,
    connectionDetails,
    connect,
    disconnect,
    refreshToken,
    getAuthUrl,
    handleCallback,
    isConnected,
    getExpiryTime,
    needsRefresh,
    clearError,
  };
}

/**
 * Generate OAuth state parameter
 */
function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * useOAuthConnection Hook
 * 
 * Get OAuth state for a specific provider.
 * 
 * @example
 * ```tsx
 * const { isConnected, isConnecting, connect, disconnect } = useOAuthConnection('quickbooks');
 * ```
 */
export function useOAuthConnection(provider: OAuthProvider) {
  const oauth = useOAuth();
  
  return {
    isConnected: oauth.isConnected(provider),
    isConnecting: oauth.isConnecting,
    isRefreshing: oauth.isRefreshing,
    error: oauth.error,
    details: oauth.connectionDetails.get(provider),
    needsRefresh: oauth.needsRefresh(provider),
    connect: () => oauth.connect(provider),
    disconnect: () => oauth.disconnect(provider),
    refreshToken: () => oauth.refreshToken(provider),
    clearError: oauth.clearError,
  };
}

/**
 * useAllConnections Hook
 * 
 * Get connection status for all providers.
 */
export function useAllConnections(): {
  connections: Array<{ provider: OAuthProvider; isConnected: boolean; name: string }>;
  isAnyConnecting: boolean;
  connectedCount: number;
} {
  const { connections, isConnecting, isRefreshing } = useOAuth();
  
  const connectionList = Object.entries(OAuthProvider).map(([key, value]) => ({
    provider: value as OAuthProvider,
    isConnected: connections.get(value as OAuthProvider) ?? false,
    name: PROVIDER_NAMES[value as OAuthProvider],
  }));

  return {
    connections: connectionList,
    isAnyConnecting: isConnecting || isRefreshing,
    connectedCount: connectionList.filter((c) => c.isConnected).length,
  };
}
