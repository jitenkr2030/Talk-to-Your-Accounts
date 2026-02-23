/**
 * ConnectionStatus Component
 * 
 * A reusable component that displays connection status information
 * for integration platforms.
 * 
 * Features:
 * - Displays connection state (connected, disconnected, error)
 * - Shows company/organization name
 * - Displays last sync time
 * - Shows additional metadata (realmId, tenantId, etc.)
 * - Format last sync time as relative time (e.g., "2 hours ago")
 * 
 * @example
 * ```jsx
 * <ConnectionStatus
 *   isConnected={isConnected}
 *   companyName="My Company"
 *   lastSync={lastSync}
 *   metadata={{ realmId: '123', tokenExpiry: '2024-01-01' }}
 * />
 * ```
 */

import React from 'react';

/**
 * Format a date as relative time string
 * @param {Date|string|null} date - Date to format
 * @returns {string} Formatted relative time string
 */
function formatRelativeTime(date) {
  if (!date) return 'Never';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now - dateObj;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return dateObj.toLocaleDateString();
}

/**
 * ConnectionStatus Component
 * @param {Object} props
 * @param {boolean} props.isConnected - Whether the integration is connected
 * @param {string} [props.companyName] - Company or organization name
 * @param {Date|string|null} [props.lastSync] - Last sync timestamp
 * @param {string|null} [props.error] - Error message if any
 * @param {Object} [props.metadata] - Additional metadata to display
 * @param {string} [props.metadata.realmId] - QuickBooks realm ID
 * @param {string} [props.metadata.tenantId] - Xero/Zoho tenant ID
 * @param {string} [props.metadata.organizationId] - Zoho organization ID
 * @param {string} [props.metadata.busyVersion] - Busy software version
 * @param {Date|string} [props.metadata.tokenExpiry] - OAuth token expiry date
 * @param {number} [props.metadata.apiCallsToday] - API calls used today
 * @param {number} [props.metadata.companyCount] - Number of companies
 * @param {Function} [props.onRetry] - Retry connection handler
 */
function ConnectionStatus({
  isConnected,
  companyName,
  lastSync,
  error,
  metadata = {},
  onRetry
}) {
  const {
    realmId,
    tenantId,
    organizationId,
    busyVersion,
    tokenExpiry,
    apiCallsToday,
    companyCount
  } = metadata;

  return (
    <div
      style={{
        background: '#0f172a',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px'
      }}
    >
      {/* Status and Company */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '16px',
          fontSize: '14px'
        }}
      >
        {/* Connection Status */}
        <div>
          <span style={{ color: '#64748b' }}>Status: </span>
          <span
            style={{
              color: isConnected ? '#10b981' : error ? '#f59e0b' : '#ef4444',
              fontWeight: '500'
            }}
          >
            {error ? 'Error' : isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {error && onRetry && (
            <button
              onClick={onRetry}
              style={{
                marginLeft: '8px',
                padding: '2px 8px',
                fontSize: '12px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          )}
        </div>

        {/* Company Name */}
        <div>
          <span style={{ color: '#64748b' }}>Company: </span>
          <span style={{ color: '#f1f5f9' }}>
            {companyName || 'Not connected'}
          </span>
        </div>

        {/* Last Sync */}
        <div>
          <span style={{ color: '#64748b' }}>Last Sync: </span>
          <span style={{ color: '#f1f5f9' }}>
            {formatRelativeTime(lastSync)}
          </span>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{ gridColumn: '1 / -1' }}>
            <span style={{ color: '#64748b' }}>Error: </span>
            <span style={{ color: '#ef4444' }}>{error}</span>
          </div>
        )}
      </div>

      {/* Additional Metadata */}
      {(realmId || tenantId || organizationId || busyVersion || tokenExpiry || apiCallsToday !== undefined || companyCount) && (
        <div
          style={{
            borderTop: '1px solid #334155',
            paddingTop: '12px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '8px',
            fontSize: '13px'
          }}
        >
          {realmId && (
            <div>
              <span style={{ color: '#64748b' }}>Realm ID: </span>
              <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{realmId}</span>
            </div>
          )}
          {tenantId && (
            <div>
              <span style={{ color: '#64748b' }}>Tenant ID: </span>
              <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{tenantId}</span>
            </div>
          )}
          {organizationId && (
            <div>
              <span style={{ color: '#64748b' }}>Organization ID: </span>
              <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{organizationId}</span>
            </div>
          )}
          {busyVersion && (
            <div>
              <span style={{ color: '#64748b' }}>Version: </span>
              <span style={{ color: '#94a3b8' }}>{busyVersion}</span>
            </div>
          )}
          {tokenExpiry && (
            <div>
              <span style={{ color: '#64748b' }}>Token Expires: </span>
              <span style={{ color: '#94a3b8' }}>
                {new Date(tokenExpiry).toLocaleDateString()}
              </span>
            </div>
          )}
          {apiCallsToday !== undefined && (
            <div>
              <span style={{ color: '#64748b' }}>API Calls Today: </span>
              <span style={{ color: '#94a3b8' }}>{apiCallsToday}</span>
            </div>
          )}
          {companyCount !== undefined && (
            <div>
              <span style={{ color: '#64748b' }}>Companies: </span>
              <span style={{ color: '#94a3b8' }}>{companyCount}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ConnectionStatus;
