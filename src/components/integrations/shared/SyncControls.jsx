/**
 * SyncControls Component
 * 
 * A reusable component that provides standardized sync and disconnect
 * action buttons for integration platforms.
 * 
 * Features:
 * - Sync Now button with loading state
 * - Refresh Token button for OAuth platforms
 * - Disconnect button with confirmation
 * - Consistent styling and behavior
 * - Disabled states when not connected or syncing
 * 
 * @example
 * ```jsx
 * <SyncControls
 *   isConnected={isConnected}
 *   isSyncing={isSyncing}
 *   onSync={handleSync}
 *   onDisconnect={handleDisconnect}
 *   onRefreshToken={handleRefreshToken}
 *   showRefreshToken={true}
 * />
 * ```
 */

import React from 'react';

/**
 * SyncControls Component
 * @param {Object} props
 * @param {boolean} props.isConnected - Whether the integration is connected
 * @param {boolean} props.isSyncing - Whether a sync is in progress
 * @param {Function} props.onSync - Handler for sync button click
 * @param {Function} props.onDisconnect - Handler for disconnect button click
 * @param {Function} [props.onRefreshToken] - Handler for refresh token button (optional)
 * @param {boolean} [props.showRefreshToken=false] - Whether to show refresh token button
 * @param {string} [props.platformName] - Name of the platform for button labels
 * @param {boolean} [props.isLocal=true] - Whether this is a local (non-OAuth) integration
 */
function SyncControls({
  isConnected,
  isSyncing,
  onSync,
  onDisconnect,
  onRefreshToken,
  showRefreshToken = false,
  platformName = 'integration',
  isLocal = true
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap'
      }}
    >
      {/* Sync Button */}
      <button
        onClick={onSync}
        disabled={!isConnected || isSyncing}
        style={{
          padding: '10px 20px',
          borderRadius: '8px',
          border: 'none',
          background: isConnected && !isSyncing ? '#3b82f6' : '#475569',
          color: 'white',
          fontWeight: '600',
          cursor: !isConnected || isSyncing ? 'not-allowed' : 'pointer',
          opacity: !isConnected || isSyncing ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.2s'
        }}
        title={!isConnected ? `Connect to ${platformName} first` : undefined}
      >
        {isSyncing ? (
          <>
            <span
              style={{
                width: '16px',
                height: '16px',
                border: '2px solid transparent',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}
            />
            Syncing...
          </>
        ) : (
          <>
            <span style={{ fontSize: '16px' }}>🔄</span>
            Sync Now
          </>
        )}
      </button>

      {/* Refresh Token Button (for OAuth platforms) */}
      {showRefreshToken && onRefreshToken && (
        <button
          onClick={onRefreshToken}
          disabled={!isConnected || isSyncing}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid #475569',
            background: 'transparent',
            color: '#94a3b8',
            fontWeight: '500',
            cursor: !isConnected || isSyncing ? 'not-allowed' : 'pointer',
            opacity: !isConnected || isSyncing ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <span style={{ fontSize: '16px' }}>🔑</span>
          Refresh Token
        </button>
      )}

      {/* Disconnect Button */}
      <button
        onClick={onDisconnect}
        disabled={!isConnected || isSyncing}
        style={{
          padding: '10px 20px',
          borderRadius: '8px',
          border: '1px solid #dc2626',
          background: 'transparent',
          color: '#dc2626',
          fontWeight: '500',
          cursor: !isConnected || isSyncing ? 'not-allowed' : 'pointer',
          opacity: !isConnected || isSyncing ? 0.6 : 1,
          transition: 'all 0.2s'
        }}
      >
        Disconnect
      </button>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        
        button:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}

export default SyncControls;
