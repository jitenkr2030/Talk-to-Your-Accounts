/**
 * Xero Integration Manager
 * 
 * UI component for managing Xero API integration.
 * Handles OAuth connection flow and data synchronization.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useIntegration } from '../../integrations/hooks/useIntegration';
import { INTEGRATION_PLATFORMS } from '../../integrations/utils/constants';
import './IntegrationStyles.css';

/**
 * Xero Integration Manager Component
 * 
 * @returns {React.ReactElement} Xero integration UI
 */
function XeroIntegrationManager() {
  const {
    xeroStatus,
    connectXero,
    disconnectFromXero,
    syncWithXero,
    error,
    clearError
  } = useIntegration();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  
  const platform = INTEGRATION_PLATFORMS.xero;
  
  // Handle sync button click
  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    setSyncResult(null);
    clearError();
    
    try {
      const result = await syncWithXero();
      setSyncResult({
        success: true,
        message: 'Successfully synced with Xero',
        data: result
      });
    } catch (err) {
      setSyncResult({
        success: false,
        message: err.message || 'Sync failed. Please try again.'
      });
    } finally {
      setIsSyncing(false);
    }
  }, [syncWithXero, clearError]);
  
  // Handle connect button click
  const handleConnect = useCallback(async () => {
    clearError();
    setSyncResult(null);
    
    try {
      await connectXero();
    } catch (err) {
      setSyncResult({
        success: false,
        message: err.message || 'Failed to connect to Xero'
      });
    }
  }, [connectXero, clearError]);
  
  // Handle disconnect button click
  const handleDisconnect = useCallback(async () => {
    if (!window.confirm('Are you sure you want to disconnect from Xero? This will stop all automatic synchronization.')) {
      return;
    }
    
    setIsSyncing(true);
    setSyncResult(null);
    clearError();
    
    try {
      await disconnectFromXero();
      setSyncResult({
        success: true,
        message: 'Successfully disconnected from Xero'
      });
    } catch (err) {
      setSyncResult({
        success: false,
        message: err.message || 'Failed to disconnect from Xero'
      });
    } finally {
      setIsSyncing(false);
    }
  }, [disconnectFromXero, clearError]);
  
  // Get last sync time formatted
  const getLastSyncText = () => {
    if (!xeroStatus.lastSync) {
      return 'Never';
    }
    
    const now = new Date();
    const lastSync = new Date(xeroStatus.lastSync);
    const diffMs = now - lastSync;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };
  
  return (
    <div className="integration-card">
      <div className="integration-header">
        <div className="integration-icon">{platform.icon}</div>
        <div className="integration-info">
          <h3>{platform.name}</h3>
          <p className="integration-description">{platform.description}</p>
        </div>
        <div className={`integration-status ${xeroStatus.isConnected ? 'connected' : 'disconnected'}`}>
          {xeroStatus.isConnected ? (
            <>
              <span className="status-dot connected"></span>
              Connected
            </>
          ) : (
            <>
              <span className="status-dot disconnected"></span>
              Not Connected
            </>
          )}
        </div>
      </div>
      
      {/* Error Display */}
      {(error || xeroStatus.error) && (
        <div className="integration-error">
          <span className="error-icon">⚠️</span>
          <span>{error || xeroStatus.error}</span>
          <button onClick={clearError} className="error-dismiss">×</button>
        </div>
      )}
      
      {/* Sync Result Display */}
      {syncResult && (
        <div className={`sync-result ${syncResult.success ? 'success' : 'error'}`}>
          <span>{syncResult.message}</span>
          <button onClick={() => setSyncResult(null)} className="result-dismiss">×</button>
        </div>
      )}
      
      {/* Connected State */}
      {xeroStatus.isConnected && (
        <div className="integration-details">
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Organization</span>
              <span className="detail-value">{xeroStatus.organizationName || 'Unknown'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Tenant ID</span>
              <span className="detail-value">{xeroStatus.tenantId ? `${xeroStatus.tenantId.substring(0, 8)}...` : 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Last Synced</span>
              <span className="detail-value">{getLastSyncText()}</span>
            </div>
          </div>
          
          <div className="integration-features">
            <h4>Available Features</h4>
            <div className="feature-list">
              {platform.features.map((feature) => (
                <span key={feature} className="feature-badge">
                  {feature}
                </span>
              ))}
            </div>
          </div>
          
          <div className="integration-actions">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="btn btn-primary"
            >
              {isSyncing ? (
                <>
                  <span className="spinner"></span>
                  Syncing...
                </>
              ) : (
                <>
                  <span className="sync-icon">↻</span>
                  Sync Now
                </>
              )}
            </button>
            
            <button
              onClick={handleDisconnect}
              disabled={isSyncing}
              className="btn btn-danger"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
      
      {/* Disconnected State */}
      {!xeroStatus.isConnected && (
        <div className="integration-connect">
          <div className="connect-info">
            <h4>Connect to Xero</h4>
            <p>
              Link your Xero account to automatically sync your
              accounting data including invoices, contacts, and payments.
            </p>
            <ul className="connect-benefits">
              <li>✓ Real-time data synchronization</li>
              <li>✓ Automatic backup of your financial data</li>
              <li>✓ Multi-organization support</li>
            </ul>
          </div>
          
          <button
            onClick={handleConnect}
            disabled={isSyncing}
            className="btn btn-connect"
          >
            <span className="connect-icon">🔗</span>
            Connect to Xero
          </button>
          
          <p className="connect-note">
            You'll be redirected to Xero to authorize access.
          </p>
        </div>
      )}
    </div>
  );
}

export default XeroIntegrationManager;
