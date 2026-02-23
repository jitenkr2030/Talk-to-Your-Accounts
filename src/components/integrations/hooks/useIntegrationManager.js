/**
 * useIntegrationManager Hook
 * 
 * A reusable hook that centralizes common integration management logic
 * for all platform-specific integration managers.
 * 
 * Features:
 * - Centralized state management (loading, syncing, errors)
 * - Standardized sync result handling
 * - Common action handlers (connect, disconnect, sync)
 * - Platform-agnostic interface
 * 
 * @example
 * ```jsx
 * const {
 *   isConnected,
 *   isSyncing,
 *   error,
 *   syncResult,
 *   handleSync,
 *   handleConnect,
 *   handleDisconnect,
 *   getLastSyncText
 * } = useIntegrationManager({
 *   platform: 'quickbooks',
 *   status: quickbooksStatus,
 *   onSync: syncWithQuickBooks,
 *   onConnect: connectQuickBooks,
 *   onDisconnect: disconnectFromQuickBooks
 * });
 * ```
 */

import { useState, useCallback, useEffect } from 'react';

/**
 * Configuration options for useIntegrationManager
 * @typedef {Object} UseIntegrationManagerOptions
 * @property {string} platform - Platform identifier (e.g., 'quickbooks', 'tally')
 * @property {Object} status - Connection status object from useIntegration hook
 * @property {Function} onSync - Async function to trigger sync
 * @property {Function} onConnect - Async function to trigger connection
 * @property {Function} onDisconnect - Async function to trigger disconnection
 * @property {Function} [onMount] - Optional callback to run on component mount
 * @property {boolean} [autoCheckConnection=true] - Whether to check connection on mount
 * @property {string} [confirmDisconnectMessage] - Custom confirmation message for disconnect
 */

/**
 * 
 * @param {UseIntegrationManagerOptions} options 
 * @returns {Object} Integration manager interface
 */
export function useIntegrationManager(options) {
  const {
    platform,
    status,
    onSync,
    onConnect,
    onDisconnect,
    onMount,
    autoCheckConnection = true,
    confirmDisconnectMessage = 'Are you sure you want to disconnect? This will stop all automatic synchronization.'
  } = options;

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [localError, setLocalError] = useState(null);

  // Clear local error
  const clearError = useCallback(() => {
    setLocalError(null);
  }, []);

  // Clear sync result
  const clearSyncResult = useCallback(() => {
    setSyncResult(null);
  }, []);

  // Handle sync action
  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    setSyncResult(null);
    setLocalError(null);

    try {
      const result = await onSync();
      setSyncResult({
        success: true,
        message: `Successfully synced with ${platform}`,
        data: result
      });
      return result;
    } catch (err) {
      const errorMessage = err.message || `${platform} sync failed. Please try again.`;
      setSyncResult({
        success: false,
        message: errorMessage,
        error: err
      });
      setLocalError(errorMessage);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [onSync, platform]);

  // Handle connect action
  const handleConnect = useCallback(async () => {
    setSyncResult(null);
    setLocalError(null);

    try {
      await onConnect();
      return true;
    } catch (err) {
      const errorMessage = err.message || `Failed to connect to ${platform}`;
      setSyncResult({
        success: false,
        message: errorMessage
      });
      setLocalError(errorMessage);
      throw err;
    }
  }, [onConnect, platform]);

  // Handle disconnect action
  const handleDisconnect = useCallback(async () => {
    if (!window.confirm(confirmDisconnectMessage)) {
      return false;
    }

    setIsSyncing(true);
    setSyncResult(null);
    setLocalError(null);

    try {
      await onDisconnect();
      setSyncResult({
        success: true,
        message: `Successfully disconnected from ${platform}`
      });
      return true;
    } catch (err) {
      const errorMessage = err.message || `Failed to disconnect from ${platform}`;
      setSyncResult({
        success: false,
        message: errorMessage
      });
      setLocalError(errorMessage);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [onDisconnect, platform, confirmDisconnectMessage]);

  // Get formatted last sync text
  const getLastSyncText = useCallback(() => {
    if (!status.lastSync) {
      return 'Never';
    }

    const now = new Date();
    const lastSync = new Date(status.lastSync);
    const diffMs = now - lastSync;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }, [status.lastSync]);

  // Get status badge information
  const getStatusBadge = useCallback(() => {
    if (isSyncing) {
      return { bg: '#dbeafe', text: '#1e40af', label: 'Syncing...', className: 'syncing' };
    }
    if (localError || status.error) {
      return { bg: '#fce7f3', text: '#9d174d', label: 'Error', className: 'error' };
    }
    if (status.isConnected) {
      return { bg: '#dcfce7', text: '#166534', label: 'Connected', className: 'connected' };
    }
    return { bg: '#fee2e2', text: '#991b1b', label: 'Disconnected', className: 'disconnected' };
  }, [isSyncing, localError, status.error, status.isConnected]);

  // Run onMount callback if provided
  useEffect(() => {
    if (onMount && autoCheckConnection) {
      onMount();
    }
  }, [onMount, autoCheckConnection]);

  // Combined error (local or status error)
  const error = localError || status.error;

  return {
    // State
    isConnected: status.isConnected,
    isSyncing,
    error,
    syncResult,
    lastSync: status.lastSync,
    companyName: status.companyName,
    
    // Actions
    handleSync,
    handleConnect,
    handleDisconnect,
    clearError,
    clearSyncResult,
    
    // Utilities
    getLastSyncText,
    getStatusBadge
  };
}

export default useIntegrationManager;
