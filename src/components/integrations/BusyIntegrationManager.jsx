import React, { useState, useEffect } from 'react';
import { useIntegration } from '../hooks/useIntegration';
import { INTEGRATION_STATUS, INTEGRATION_PLATFORMS } from '../utils/constants';

/**
 * BusyIntegrationManager Component
 * 
 * UI component for managing Busy Accounting Software integration
 * Features:
 * - Check Busy connection status
 * - Connect/Disconnect from Busy
 * - Configure connection settings
 * - Sync data with Busy
 * - View sync history and status
 */
const BusyIntegrationManager: React.FC = () => {
  const {
    busyStatus,
    isLoading,
    error,
    checkBusyConnection,
    syncWithBusy,
    disconnectFromBusy,
    configureBusyConnection,
    emit
  } = useIntegration();

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  // Configuration form state
  const [configForm, setConfigForm] = useState({
    host: 'localhost',
    port: 6543,
    username: '',
    password: ''
  });

  // Check connection on mount
  useEffect(() => {
    checkBusyConnection();
  }, [checkBusyConnection]);

  // Handle connection button click
  const handleConnect = async () => {
    try {
      await checkBusyConnection();
    } catch (err) {
      console.error('Failed to connect to Busy:', err);
    }
  };

  // Handle sync button click
  const handleSync = async () => {
    try {
      setIsSyncing(true);
      setSyncResult(null);
      
      const result = await syncWithBusy();
      setSyncResult(result);
      
      // Refresh connection status
      await checkBusyConnection();
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
      await disconnectFromBusy();
      setSyncResult(null);
    } catch (err) {
      console.error('Failed to disconnect from Busy:', err);
    }
  };

  // Handle configuration save
  const handleSaveConfig = async () => {
    try {
      await configureBusyConnection(configForm);
      setShowConfig(false);
      await checkBusyConnection();
    } catch (err) {
      console.error('Failed to save configuration:', err);
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfigForm(prev => ({
      ...prev,
      [name]: name === 'port' ? parseInt(value) || 0 : value
    }));
  };

  // Get status badge
  const getStatusBadge = () => {
    if (isSyncing) {
      return { bg: '#dbeafe', text: '#1e40af', label: 'Syncing...' };
    }
    if (busyStatus.error) {
      return { bg: '#fce7f3', text: '#9d174d', label: 'Error' };
    }
    if (busyStatus.isConnected) {
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
        <span style={{ fontSize: '40px' }}>⚡</span>
        <div style={{ flex: 1 }}>
          <h2 style={{
            margin: 0,
            color: '#f1f5f9',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {INTEGRATION_PLATFORMS.busy.name}
          </h2>
          <p style={{
            margin: '4px 0 0',
            color: '#94a3b8',
            fontSize: '14px'
          }}>
            {INTEGRATION_PLATFORMS.busy.description}
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
              color: busyStatus.isConnected ? '#10b981' : '#ef4444',
              fontWeight: '500'
            }}>
              {busyStatus.isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Company: </span>
            <span style={{ color: '#f1f5f9' }}>
              {busyStatus.companyName || 'Not connected'}
            </span>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Version: </span>
            <span style={{ color: '#f1f5f9' }}>
              {busyStatus.busyVersion || 'Unknown'}
            </span>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Last Sync: </span>
            <span style={{ color: '#f1f5f9' }}>
              {formatDate(busyStatus.lastSync)}
            </span>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <span style={{ color: '#64748b' }}>Error: </span>
            <span style={{ color: busyStatus.error ? '#ef4444' : '#94a3b8' }}>
              {busyStatus.error || 'None'}
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
          disabled={!busyStatus.isConnected || isSyncing}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: busyStatus.isConnected && !isSyncing ? '#10b981' : '#475569',
            color: 'white',
            fontWeight: '600',
            cursor: !busyStatus.isConnected || isSyncing ? 'not-allowed' : 'pointer',
            opacity: !busyStatus.isConnected || isSyncing ? 0.6 : 1,
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
          onClick={() => setShowConfig(!showConfig)}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid #475569',
            background: 'transparent',
            color: '#94a3b8',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ⚙️ Configure
        </button>

        <button
          onClick={handleDisconnect}
          disabled={!busyStatus.isConnected || isSyncing}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid #dc2626',
            background: 'transparent',
            color: '#dc2626',
            fontWeight: '500',
            cursor: !busyStatus.isConnected || isSyncing ? 'not-allowed' : 'pointer',
            opacity: !busyStatus.isConnected || isSyncing ? 0.6 : 1
          }}
        >
          Disconnect
        </button>
      </div>

      {/* Configuration Form */}
      {showConfig && (
        <div style={{
          background: '#0f172a',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <h4 style={{
            margin: '0 0 16px',
            color: '#f1f5f9',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            Connection Configuration
          </h4>
          
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '4px',
                color: '#94a3b8',
                fontSize: '13px'
              }}>
                Host
              </label>
              <input
                type="text"
                name="host"
                value={configForm.host}
                onChange={handleInputChange}
                placeholder="localhost"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  background: '#1e293b',
                  color: '#f1f5f9',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div>
              <label style={{
                display: 'block',
                marginBottom: '4px',
                color: '#94a3b8',
                fontSize: '13px'
              }}>
                Port
              </label>
              <input
                type="number"
                name="port"
                value={configForm.port}
                onChange={handleInputChange}
                placeholder="6543"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  background: '#1e293b',
                  color: '#f1f5f9',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div>
              <label style={{
                display: 'block',
                marginBottom: '4px',
                color: '#94a3b8',
                fontSize: '13px'
              }}>
                Username (optional)
              </label>
              <input
                type="text"
                name="username"
                value={configForm.username}
                onChange={handleInputChange}
                placeholder=""
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  background: '#1e293b',
                  color: '#f1f5f9',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div>
              <label style={{
                display: 'block',
                marginBottom: '4px',
                color: '#94a3b8',
                fontSize: '13px'
              }}>
                Password (optional)
              </label>
              <input
                type="password"
                name="password"
                value={configForm.password}
                onChange={handleInputChange}
                placeholder=""
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  background: '#1e293b',
                  color: '#f1f5f9',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <button
              onClick={handleSaveConfig}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: 'none',
                background: '#10b981',
                color: 'white',
                fontWeight: '600',
                cursor: 'pointer',
                marginTop: '8px'
              }}
            >
              Save Configuration
            </button>
          </div>
        </div>
      )}

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
          <span>⚡ Requirements & Setup Instructions</span>
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
              To connect Busy Accounting Software:
            </p>
            <ol style={{ paddingLeft: '20px', margin: 0 }}>
              <li style={{ marginBottom: '8px' }}>
                Open Busy Accounting Software
              </li>
              <li style={{ marginBottom: '8px' }}>
                Ensure the API Server is enabled in Busy settings
              </li>
              <li style={{ marginBottom: '8px' }}>
                Note the API port number (default: 6543)
              </li>
              <li style={{ marginBottom: '8px' }}>
                A company must be open in Busy for API access
              </li>
              <li style={{ marginBottom: '8px' }}>
                Ensure no modal dialogs are open in Busy
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
              <div style={{ marginBottom: '4px' }}><strong>Default Configuration:</strong></div>
              <div>Host: localhost</div>
              <div>Port: 6543</div>
              <div>Auth: Basic (optional)</div>
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

export default BusyIntegrationManager;
