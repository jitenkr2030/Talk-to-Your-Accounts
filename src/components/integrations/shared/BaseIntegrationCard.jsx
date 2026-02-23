/**
 * BaseIntegrationCard Component
 * 
 * A reusable card component that provides consistent layout and styling
 * for all platform-specific integration managers.
 * 
 * Features:
 * - Standardized header with icon, title, and status
 * - Configurable action area
 * - Consistent styling with the application theme
 * - Support for error and sync result displays
 * 
 * @example
 * ```jsx
 * <BaseIntegrationCard
 *   title="QuickBooks"
 *   description="Connect your QuickBooks Online account"
 *   icon="📚"
 *   statusBadge={statusBadge}
 *   onHeaderClick={() => setShowDetails(!showDetails)}
 * >
 *   <ConnectionDetails {...details} />
 *   <SyncControls onSync={handleSync} onDisconnect={handleDisconnect} />
 * </BaseIntegrationCard>
 * ```
 */

import React from 'react';

/**
 * BaseIntegrationCard Component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Main content area
 * @param {React.ReactNode} props.footer - Footer content (actions, etc.)
 * @param {string} props.icon - Emoji or icon for the platform
 * @param {string} props.title - Platform name
 * @param {string} props.description - Platform description
 * @param {Object} props.statusBadge - Status badge object with bg, text, label, className
 * @param {Function} [props.onHeaderClick] - Click handler for header (for expandable sections)
 * @param {boolean} [props.showExpandToggle=false] - Whether to show expand/collapse toggle
 * @param {boolean} props.isExpanded - Current expand state
 * @param {React.ReactNode} [props.error] - Error message to display
 * @param {React.ReactNode} [props.syncResult] - Sync result to display
 * @param {Function} [props.onDismissError] - Handler to dismiss error
 * @param {Function} [props.onDismissResult] - Handler to dismiss sync result
 * @param {string} [props.testId] - Test ID for testing
 */
function BaseIntegrationCard({
  children,
  footer,
  icon,
  title,
  description,
  statusBadge,
  onHeaderClick,
  showExpandToggle = false,
  isExpanded,
  error,
  syncResult,
  onDismissError,
  onDismissResult,
  testId
}) {
  return (
    <div
      className="integration-card"
      style={{
        background: '#1e293b',
        borderRadius: '12px',
        border: '1px solid #334155',
        overflow: 'hidden'
      }}
      data-testid={testId}
    >
      {/* Header */}
      <div
        className="integration-header"
        onClick={onHeaderClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '20px',
          cursor: onHeaderClick ? 'pointer' : 'default',
          borderBottom: error || syncResult ? '1px solid #334155' : 'none',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => {
          if (onHeaderClick) e.currentTarget.style.background = '#0f172a';
        }}
        onMouseLeave={(e) => {
          if (onHeaderClick) e.currentTarget.style.background = 'transparent';
        }}
      >
        <div
          className="integration-icon"
          style={{
            fontSize: '40px',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f172a',
            borderRadius: '12px'
          }}
        >
          {icon}
        </div>
        
        <div className="integration-info" style={{ flex: 1 }}>
          <h3
            style={{
              margin: 0,
              color: '#f1f5f9',
              fontSize: '18px',
              fontWeight: '600'
            }}
          >
            {title}
          </h3>
          <p
            className="integration-description"
            style={{
              margin: '4px 0 0',
              color: '#94a3b8',
              fontSize: '14px'
            }}
          >
            {description}
          </p>
        </div>

        <div
          className={`integration-status ${statusBadge.className}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {statusBadge.className === 'connected' && (
            <span
              className="status-dot"
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)'
              }}
            />
          )}
          {statusBadge.className === 'disconnected' && (
            <span
              className="status-dot"
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#ef4444'
              }}
            />
          )}
          {statusBadge.className === 'syncing' && (
            <span
              className="status-dot"
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#3b82f6',
                animation: 'pulse 1.5s infinite'
              }}
            />
          )}
          {statusBadge.className === 'error' && (
            <span
              className="status-dot"
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#f59e0b'
              }}
            />
          )}
          <span
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '600',
              background: statusBadge.bg,
              color: statusBadge.text
            }}
          >
            {statusBadge.label}
          </span>
          {showExpandToggle && (
            <span
              style={{
                marginLeft: '8px',
                transition: 'transform 0.2s',
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                color: '#94a3b8'
              }}
            >
              ▼
            </span>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div
          className="integration-error"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 20px',
            background: '#fef2f2',
            borderBottom: '1px solid #fecaca'
          }}
        >
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <span style={{ flex: 1, color: '#991b1b', fontSize: '14px' }}>{error}</span>
          {onDismissError && (
            <button
              onClick={onDismissError}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#991b1b',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0 8px'
              }}
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* Sync Result Display */}
      {syncResult && (
        <div
          className={`sync-result ${syncResult.success ? 'success' : 'error'}`}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '16px 20px',
            background: syncResult.success ? '#f0fdf4' : '#fef2f2',
            borderBottom: `1px solid ${syncResult.success ? '#bbf7d0' : '#fecaca'}`
          }}
        >
          <span style={{ fontSize: '16px' }}>
            {syncResult.success ? '✅' : '❌'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{
              color: syncResult.success ? '#166534' : '#991b1b',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: syncResult.data ? '8px' : 0
            }}>
              {syncResult.success ? 'Sync Completed Successfully' : 'Sync Failed'}
            </div>
            {syncResult.data && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '8px',
                fontSize: '13px',
                color: '#166534'
              }}>
                {syncResult.data.syncedMasters !== undefined && (
                  <div>Masters: {syncResult.data.syncedMasters}</div>
                )}
                {syncResult.data.syncedTransactions !== undefined && (
                  <div>Transactions: {syncResult.data.syncedTransactions}</div>
                )}
                {syncResult.data.errors?.length > 0 && (
                  <div style={{ color: '#f59e0b' }}>
                    Warnings: {syncResult.data.errors.length}
                  </div>
                )}
              </div>
            )}
            {syncResult.error && (
              <div style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px' }}>
                {syncResult.error}
              </div>
            )}
          </div>
          {onDismissResult && (
            <button
              onClick={onDismissResult}
              style={{
                background: 'transparent',
                border: 'none',
                color: syncResult.success ? '#166534' : '#991b1b',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0 8px'
              }}
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* Main Content */}
      {children && (
        <div className="integration-content" style={{ padding: '20px' }}>
          {children}
        </div>
      )}

      {/* Footer */}
      {footer && (
        <div
          className="integration-footer"
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #334155',
            background: '#0f172a'
          }}
        >
          {footer}
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default BaseIntegrationCard;
