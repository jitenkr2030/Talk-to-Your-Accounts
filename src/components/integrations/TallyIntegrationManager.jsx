import React, { useState, useEffect } from 'react';
import { useIntegration } from '../hooks/useIntegration';
import { INTEGRATION_STATUS, INTEGRATION_PLATFORMS } from '../utils/constants';

/**
 * TallyIntegrationManager Component
 * 
 * UI component for managing Tally Prime integration
 * Features:
 * - Check Tally connection status
 * - Connect/Disconnect from Tally
 * - Sync data with Tally
 * - View sync history and status
 */
const TallyIntegrationManager: React.FC = () => {
  const {
    tallyStatus,
    isLoading,
    error,
    checkTallyConnection,
    syncWithTally,
    disconnectFromTally,
    emit
  } = useIntegration();

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Check connection on mount
  useEffect(() => {
    checkTallyConnection();
  }, [checkTallyConnection]);

  // Handle connect button click
  const handleConnect = async () => {
    try {
      await checkTallyConnection();
    } catch (err) {
      console.error('Failed to connect to Tally:', err);
    }
  };

  // Handle sync button click
  const handleSync = async () => {
    try {
      setIsSyncing(true);
      setSyncResult(null);
      
      const result = await syncWithTally();
      setSyncResult(result);
      
      // Refresh connection status
      await checkTallyConnection();
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncResult({
        success: false,
        error: err instanceof Error ? err.message : 'Sync failed'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle disconnect button click
  const handleDisconnect = async () => {
    try {
      await disconnectFromTally();
      setSyncResult(null);
    } catch (err) {
      console.error('Failed to disconnect from Tally:', err);
    }
  };

  // Get status badge
  const getStatusBadge = () => {
    if (isSyncing) {
      return { bg: '#dbeafe', text: '#1e40af', label: 'Syncing...' };
    }
    if (tallyStatus.error) {
      return { bg: '#fce7f3', text: '#9d174d', label: 'Error' };
    }
    if (tallyStatus.isConnected) {
      return { bg: '#dcfce7', text: '#166534', label: 'Connected' };
    }
    return { bg: '#fee2e2', text: '#991b1b', label: 'Disconnected' };
  };

  const statusBadge = getStatusBadge();

  // Format date
  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '24px',
      background: '#1e293b',
      borderRadius: '12px',
      border: '1px solid #334155'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid #334155'
      }}>
        <span style={{ fontSize: '40px' }}>📋</span>
        <div style={{ flex: 1 }}>
          <h2 style={{
            margin: 0,
            color: '#f1f5f9',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {INTEGRATION_PLATFORMS.tally.name}
          </h2>
          <p style={{
            margin: '4px 0 0',
            color: '#94a3b8',
            fontSize: '14px'
          }}>
            {INTEGRATION_PLATFORMS.tally.description}
          </p>
        </div>
        <span style={{
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600',
          background: statusBadge.bg,
          color: statusBadge.text
        }}>
          {statusBadge.label}
        </span>
      </div>

      {/* Connection Status */}
      <div style={{
        background: '#0f172a',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <h3 style={{
          margin: '0 0 12px',
          color: '#f1f5f9',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          Connection Status
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          fontSize: '14px'
        }}>
          <div>
            <span style={{ color: '#64748b' }}>Status: </span>
            <span style={{
              color: tallyStatus.isConnected ? '#10b981' : '#ef4444',
              fontWeight: '500'
            }}>
              {tallyStatus.isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Company: </span>
            <span style={{ color: '#f1f5f9' }}>
              {tallyStatus.companyName || 'Not connected'}
            </span>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Last Sync: </span>
            <span style={{ color: '#f1f5f9' }}>
              {formatDate(tallyStatus.lastSync)}
            </span>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Error: </span>
            <span style={{ color: tallyStatus.error ? '#ef4444' : '#94a3b8' }}>
              {tallyStatus.error || 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px',
          color: '#991b1b',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <div style={{
          background: syncResult.success ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${syncResult.success ? '#bbf7d0' : '#fecaca'}`,
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px'
        }}>
          <h4 style={{
            margin: '0 0 8px',
            color: syncResult.success ? '#166534' : '#991b1b',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {syncResult.success ? 'Sync Completed Successfully' : 'Sync Failed'}
          </h4>
          {syncResult.success ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              fontSize: '13px',
              color: '#166534'
            }}>
              <div>Masters Synced: {syncResult.syncedMasters || 0}</div>
              <div>Transactions Synced: {syncResult.syncedTransactions || 0}</div>
              {syncResult.errors && syncResult.errors.length > 0 && (
                <div style={{ gridColumn: '1 / -1', color: '#f59e0b' }}>
                  Warnings: {syncResult.errors.length}
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: '#dc2626', fontSize: '13px' }}>
              {syncResult.error || 'An error occurred during synchronization'}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        marginBottom: '20px'
      }}>
        <button
          onClick={handleConnect}
          disabled={isLoading || isSyncing}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: '#3b82f6',
            color: 'white',
            fontWeight: '600',
            cursor: isLoading || isSyncing ? 'not-allowed' : 'pointer',
            opacity: isLoading || isSyncing ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          🔄 Check Connection
        </button>

        <button
          onClick={handleSync}
          disabled={!tallyStatus.isConnected || isSyncing}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: tallyStatus.isConnected && !isSyncing ? '#10b981' : '#475569',
            color: 'white',
            fontWeight: '600',
            cursor: !tallyStatus.isConnected || isSyncing ? 'not-allowed' : 'pointer',
            opacity: !tallyStatus.isConnected || isSyncing ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {isSyncing ? (
            <>
              <span style={{
                width: '16px',
                height: '16px',
                border: '2px solid transparent',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Syncing...
            </>
          ) : (
            <>
              📊 Sync Data
            </>
          )}
        </button>

        <button
          onClick={handleDisconnect}
          disabled={!tallyStatus.isConnected || isSyncing}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid #dc2626',
            background: 'transparent',
            color: '#dc2626',
            fontWeight: '500',
            cursor: !tallyStatus.isConnected || isSyncing ? 'not-allowed' : 'pointer',
            opacity: !tallyStatus.isConnected || isSyncing ? 0.6 : 1
          }}
        >
          Disconnect
        </button>
      </div>

      {/* Requirements Section */}
      <div style={{
        background: '#0f172a',
        borderRadius: '8px',
        padding: '16px',
        marginTop: '20px'
      }}>
        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            width: '100%',
            padding: '0',
            border: 'none',
            background: 'transparent',
            color: '#94a3b8',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span>📋 Requirements & Setup Instructions</span>
          <span style={{
            transform: showDetails ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s'
          }}>
            ▼
          </span>
        </button>

        {showDetails && (
          <div style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid #334155',
            fontSize: '13px',
            color: '#94a3b8',
            lineHeight: '1.6'
          }}>
            <p style={{ marginTop: 0, marginBottom: '12px', color: '#f1f5f9', fontWeight: '600' }}>
              To connect Tally Prime:
            </p>
            <ol style={{ paddingLeft: '20px', margin: 0 }}>
              <li style={{ marginBottom: '8px' }}>
                Open Tally Prime and go to <strong>F12: Gateway of Tally</strong>
              </li>
              <li style={{ marginBottom: '8px' }}>
                Navigate to <strong>Administration &gt; Tally.ERP 9 Server</strong>
              </li>
              <li style={{ marginBottom: '8px' }}>
                Enable <strong>HTTP API</strong> option
              </li>
              <li style={{ marginBottom: '8px' }}>
                Note the port number (default: 9000)
              </li>
              <li style={{ marginBottom: '8px' }}>
                Ensure Tally is running while using this integration
              </li>
            </ol>
            <div style={{
              background: '#1e293b',
              borderRadius: '6px',
              padding: '12px',
              marginTop: '16px',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#94a3b8'
            }}>
              <div style={{ marginBottom: '4px' }}><strong>Configuration:</strong></div>
              <div>Host: localhost</div>
              <div>Port: 9000 (default)</div>
              <div>Type: HTTP API</div>
            </div>
          </div>
        )}
      </div>

      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default TallyIntegrationManager;
