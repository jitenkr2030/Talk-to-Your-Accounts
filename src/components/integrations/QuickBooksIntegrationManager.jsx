/**
 * QuickBooks Integration Manager
 * 
 * UI component for managing QuickBooks Online integration.
 * Handles OAuth connection flow and data synchronization.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useIntegration } from '../../integrations/hooks/useIntegration';
import { INTEGRATION_PLATFORMS, INTEGRATION_STATUS } from '../../integrations/utils/constants';
import './IntegrationStyles.css';

/**
 * QuickBooks Integration Manager Component
 * 
 * @returns {React.ReactElement} QuickBooks integration UI
 */
function QuickBooksIntegrationManager() {
  const {
    quickbooksStatus,
    connectQuickBooks,
    disconnectFromQuickBooks,
    syncWithQuickBooks,
    error,
    clearError
  } = useIntegration();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  
  const platform = INTEGRATION_PLATFORMS.quickbooks;
  
  // Handle sync button click
  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    setSyncResult(null);
    clearError();
    
    try {
      const result = await syncWithQuickBooks();
      setSyncResult({
        success: true,
        message: 'Successfully synced with QuickBooks',
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
  }, [syncWithQuickBooks, clearError]);
  
  // Handle connect button click
  const handleConnect = useCallback(async () => {
    clearError();
    setSyncResult(null);
    
    try {
      await connectQuickBooks();
    } catch (err) {
      setSyncResult({
        success: false,
        message: err.message || 'Failed to connect to QuickBooks'
      });
    }
  }, [connectQuickBooks, clearError]);
  
  // Handle disconnect button click
  const handleDisconnect = useCallback(async () => {
    if (!window.confirm('Are you sure you want to disconnect from QuickBooks? This will stop all automatic synchronization.')) {
      return;
    }
    
    setIsSyncing(true);
    setSyncResult(null);
    clearError();
    
    try {
      await disconnectFromQuickBooks();
      setSyncResult({
        success: true,
        message: 'Successfully disconnected from QuickBooks'
      });
    } catch (err) {
      setSyncResult({
        success: false,
        message: err.message || 'Failed to disconnect from QuickBooks'
      });
    } finally {
      setIsSyncing(false);
    }
  }, [disconnectFromQuickBooks, clearError]);
  
  // Get last sync time formatted
  const getLastSyncText = () => {
    if (!quickbooksStatus.lastSync) {
      return 'Never';
    }
    
    const now = new Date();
    const lastSync = new Date(quickbooksStatus.lastSync);
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
        <div className={`integration-status ${quickbooksStatus.isConnected ? 'connected' : 'disconnected'}`}>
          {quickbooksStatus.isConnected ? (
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
      {(error || quickbooksStatus.error) && (
        <div className="integration-error">
          <span className="error-icon">⚠️</span>
          <span>{error || quickbooksStatus.error}</span>
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
      {quickbooksStatus.isConnected && (
        <div className="integration-details">
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Company</span>
              <span className="detail-value">{quickbooksStatus.companyName || 'Unknown'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Realm ID</span>
              <span className="detail-value">{quickbooksStatus.realmId || 'N/A'}</span>
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
      {!quickbooksStatus.isConnected && (
        <div className="integration-connect">
          <div className="connect-info">
            <h4>Connect to QuickBooks Online</h4>
            <p>
              Link your QuickBooks Online account to automatically sync your
              accounting data including invoices, customers, and payments.
            </p>
            <ul className="connect-benefits">
              <li>✓ Real-time data synchronization</li>
              <li>✓ Automatic backup of your financial data</li>
              <li>✓ Easy migration from other platforms</li>
            </ul>
          </div>
          
          <button
            onClick={handleConnect}
            disabled={isSyncing}
            className="btn btn-connect"
          >
            <span className="connect-icon">🔗</span>
            Connect to QuickBooks
          </button>
          
          <p className="connect-note">
            You'll be redirected to QuickBooks to authorize access.
          </p>
        </div>
      )}
    </div>
  );
}

export default QuickBooksIntegrationManager;
