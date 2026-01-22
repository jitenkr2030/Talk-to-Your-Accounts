import React, { useState, useEffect } from 'react';
import useIntegration from '../../integrations/hooks/useIntegration';
import { INTEGRATION_STATUS, INTEGRATION_PLATFORMS } from '../../integrations/utils/constants';

/**
 * IntegrationManager Component
 * 
 * This component demonstrates how to use the useIntegration hook to manage
 * accounting software integrations (QuickBooks, Xero, Zoho, etc.)
 * 
 * Features:
 * - Display available integrations
 * - OAuth connection flow
 * - Connection status monitoring
 * - Sync status and controls
 */
const IntegrationManager = () => {
  const {
    integrations,
    connections,
    isLoading,
    error,
    connectPlatform,
    disconnectPlatform,
    syncPlatform,
    refreshToken,
    getIntegrationStats
  } = useIntegration();

  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);
  const [showDetails, setShowDetails] = useState(false);

  // Handle platform connection
  const handleConnect = async (platform) => {
    try {
      setSelectedPlatform(platform);
      await connectPlatform(platform);
      addSyncLog('info', `Initiating OAuth flow for ${platform}`);
    } catch (err) {
      addSyncLog('error', `Failed to connect ${platform}: ${err.message}`);
    }
  };

  // Handle platform disconnection
  const handleDisconnect = async (platform) => {
    try {
      await disconnectPlatform(platform);
      addSyncLog('info', `Disconnected from ${platform}`);
    } catch (err) {
      addSyncLog('error', `Failed to disconnect ${platform}: ${err.message}`);
    }
  };

  // Handle data synchronization
  const handleSync = async (platform) => {
    try {
      addSyncLog('info', `Starting sync with ${platform}...`);
      await syncPlatform(platform);
      addSyncLog('success', `Successfully synced with ${platform}`);
    } catch (err) {
      addSyncLog('error', `Sync failed for ${platform}: ${err.message}`);
    }
  };

  // Handle token refresh
  const handleRefreshToken = async (platform) => {
    try {
      await refreshToken(platform);
      addSyncLog('success', `Token refreshed for ${platform}`);
    } catch (err) {
      addSyncLog('error', `Token refresh failed for ${platform}: ${err.message}`);
    }
  };

  // Add log entry
  const addSyncLog = (type, message) => {
    const timestamp = new Date().toISOString();
    setSyncLogs(prev => [...prev, { timestamp, type, message }]);
  };

  // Clear logs
  const clearLogs = () => {
    setSyncLogs([]);
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    const badges = {
      connected: { bg: '#dcfce7', text: '#166534', label: 'Connected' },
      disconnected: { bg: '#fee2e2', text: '#991b1b', label: 'Disconnected' },
      pending: { bg: '#fef3c7', text: '#92400e', label: 'Pending' },
      error: { bg: '#fce7f3', text: '#9d174d', label: 'Error' },
      syncing: { bg: '#dbeafe', text: '#1e40af', label: 'Syncing...' }
    };
    return badges[status] || badges.disconnected;
  };

  // Get platform icon
  const getPlatformIcon = (platform) => {
    const icons = {
      quickbooks: '📚',
      xero: '📊',
      zoho: '🏢',
      tally: '📋',
      busy: '⚡'
    };
    return icons[platform] || '🔗';
  };

  // Render platform card
  const renderPlatformCard = (platform) => {
    const connection = connections[platform];
    const status = connection?.status || 'disconnected';
    const badge = getStatusBadge(status);
    const lastSync = connection?.lastSync ? new Date(connection.lastSync).toLocaleString() : 'Never';

    return (
      <div
        key={platform}
        style={{
          background: '#1e293b',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '16px',
          border: '1px solid #334155',
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '32px' }}>{getPlatformIcon(platform)}</span>
            <div>
              <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: '18px' }}>
                {INTEGRATION_PLATFORMS[platform]?.name || platform}
              </h3>
              <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '13px' }}>
                {INTEGRATION_PLATFORMS[platform]?.description || 'Accounting Platform Integration'}
              </p>
            </div>
          </div>
          <span style={{
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            background: badge.bg,
            color: badge.text
          }}>
            {badge.label}
          </span>
        </div>

        {/* Connection Details */}
        {status === 'connected' && connection && (
          <div style={{
            background: '#0f172a',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '13px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <span style={{ color: '#64748b' }}>Last Sync: </span>
                <span style={{ color: '#f1f5f9' }}>{lastSync}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Companies: </span>
                <span style={{ color: '#f1f5f9' }}>{connection.companyCount || 1}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Token Expires: </span>
                <span style={{ color: '#f1f5f9' }}>
                  {connection.tokenExpiry ? new Date(connection.tokenExpiry).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>API Calls Today: </span>
                <span style={{ color: '#f1f5f9' }}>{connection.apiCallsToday || 0}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {status === 'connected' ? (
            <>
              <button
                onClick={() => handleSync(platform)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#3b82f6',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                🔄 Sync Data
              </button>
              <button
                onClick={() => handleRefreshToken(platform)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #475569',
                  background: 'transparent',
                  color: '#94a3b8',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                🔑 Refresh Token
              </button>
              <button
                onClick={() => handleDisconnect(platform)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #dc2626',
                  background: 'transparent',
                  color: '#dc2626',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={() => handleConnect(platform)}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: status === 'error' ? '#f59e0b' : '#10b981',
                color: 'white',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {status === 'error' ? '⚠️ Retry Connection' : '🔗 Connect Now'}
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render sync logs
  const renderSyncLogs = () => {
    if (syncLogs.length === 0) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#64748b'
        }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📋</span>
          <p>No sync logs yet. Connect a platform or start a sync to see activity here.</p>
        </div>
      );
    }

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4 style={{ margin: 0, color: '#f1f5f9' }}>Sync Activity</h4>
          <button
            onClick={clearLogs}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: '#475569',
              color: '#94a3b8',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Clear Logs
          </button>
        </div>
        <div style={{
          background: '#0f172a',
          borderRadius: '8px',
          padding: '12px',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          {syncLogs.map((log, index) => (
            <div
              key={index}
              style={{
                padding: '8px 0',
                borderBottom: '1px solid #1e293b',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}
            >
              <span style={{
                fontSize: '12px',
                color: '#64748b',
                whiteSpace: 'nowrap',
                minWidth: '80px'
              }}>
                {log.timestamp.split('T')[1].split('.')[0]}
              </span>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                marginTop: '6px',
                flexShrink: 0,
                background: log.type === 'error' ? '#ef4444' :
                           log.type === 'success' ? '#10b981' :
                           log.type === 'info' ? '#3b82f6' : '#64748b'
              }} />
              <span style={{
                color: log.type === 'error' ? '#fca5a5' :
                       log.type === 'success' ? '#86efac' :
                       log.type === 'info' ? '#93c5fd' : '#94a3b8',
                fontSize: '13px'
              }}>
                {log.message}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        color: '#64748b'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid #334155',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ marginTop: '16px' }}>Loading integrations...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        background: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '12px',
        padding: '24px',
        textAlign: 'center'
      }}>
        <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>⚠️</span>
        <h3 style={{ color: '#991b1b', margin: '0 0 8px' }}>Integration Error</h3>
        <p style={{ color: '#b91c1c', margin: 0 }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          margin: '0 0 8px',
          color: '#f1f5f9',
          fontSize: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          🔗 Integrations
        </h1>
        <p style={{ margin: 0, color: '#94a3b8' }}>
          Connect your accounting software to sync data automatically
        </p>
      </div>

      {/* Platform List */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{
          margin: '0 0 16px',
          color: '#f1f5f9',
          fontSize: '18px'
        }}>
          Available Integrations
        </h2>
        {Object.keys(INTEGRATION_PLATFORMS).map(platform => renderPlatformCard(platform))}
      </div>

      {/* Sync Logs */}
      <div style={{
        background: '#1e293b',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #334155'
      }}>
        {renderSyncLogs()}
      </div>

      {/* Integration Stats */}
      <div style={{
        marginTop: '32px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        <div style={{
          background: '#1e293b',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #334155',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f1f5f9' }}>
            {Object.values(connections).filter(c => c.status === 'connected').length}
          </div>
          <div style={{ color: '#64748b', fontSize: '14px' }}>Connected Platforms</div>
        </div>
        <div style={{
          background: '#1e293b',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #334155',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f1f5f9' }}>
            {Object.values(connections).reduce((sum, c) => sum + (c.syncedTransactions || 0), 0)}
          </div>
          <div style={{ color: '#64748b', fontSize: '14px' }}>Synced Transactions</div>
        </div>
        <div style={{
          background: '#1e293b',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #334155',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔄</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f1f5f9' }}>
            {syncLogs.filter(l => l.type === 'success').length}
          </div>
          <div style={{ color: '#64748b', fontSize: '14px' }}>Successful Syncs</div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationManager;
