/**
 * PlatformConnect Component
 * 
 * A reusable component that displays the connect UI for disconnected
 * integration platforms.
 * 
 * Features:
 * - Informational text about the integration benefits
 * - Connect button with platform-specific icon
 * - Support for OAuth and local integrations
 * - Customizable description and benefits list
 * - Loading state support
 * 
 * @example
 * ```jsx
 * <PlatformConnect
 *   platformName="QuickBooks"
 *   platformIcon="📚"
 *   onConnect={handleConnect}
 *   isLoading={isLoading}
 *   benefits={[
 *     'Real-time data synchronization',
 *     'Automatic backup of your financial data',
 *     'Easy migration from other platforms'
 *   ]}
 *   description="Link your QuickBooks Online account to automatically sync your accounting data."
 * />
 * ```
 */

import React from 'react';

/**
 * PlatformConnect Component
 * @param {Object} props
 * @param {string} props.platformName - Name of the platform
 * @param {string} props.platformIcon - Emoji or icon for the platform
 * @param {Function} props.onConnect - Handler for connect button click
 * @param {boolean} props.isLoading - Whether connection is in progress
 * @param {string} [props.description] - Description of the integration
 * @param {string[]} [props.benefits] - List of benefits (displayed as checkmarks)
 * @param {string} [props.connectLabel] - Custom connect button label
 * @param {string} [props.note] - Additional note text below button
 * @param {boolean} [props.isOAuth=true] - Whether this uses OAuth flow
 */
function PlatformConnect({
  platformName,
  platformIcon,
  onConnect,
  isLoading,
  description,
  benefits = [],
  connectLabel,
  note,
  isOAuth = true
}) {
  return (
    <div
      className="integration-connect"
      style={{
        padding: '8px 0'
      }}
    >
      {/* Connection Info */}
      <div
        className="connect-info"
        style={{
          marginBottom: '20px'
        }}
      >
        <h4
          style={{
            margin: '0 0 12px',
            color: '#f1f5f9',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          Connect to {platformName}
        </h4>
        
        {description && (
          <p
            style={{
              margin: '0 0 16px',
              color: '#94a3b8',
              fontSize: '14px',
              lineHeight: '1.6'
            }}
          >
            {description}
          </p>
        )}

        {benefits.length > 0 && (
          <ul
            className="connect-benefits"
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0
            }}
          >
            {benefits.map((benefit, index) => (
              <li
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px',
                  color: '#94a3b8',
                  fontSize: '14px'
                }}
              >
                <span style={{ color: '#10b981' }}>✓</span>
                {benefit}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Connect Button */}
      <button
        onClick={onConnect}
        disabled={isLoading}
        className="btn btn-connect"
        style={{
          width: '100%',
          padding: '14px 24px',
          borderRadius: '8px',
          border: 'none',
          background: isLoading ? '#475569' : '#10b981',
          color: 'white',
          fontWeight: '600',
          fontSize: '15px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          transition: 'all 0.2s',
          marginBottom: note ? '12px' : 0
        }}
      >
        {isLoading ? (
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
            Connecting...
          </>
        ) : (
          <>
            <span style={{ fontSize: '18px' }}>{platformIcon}</span>
            {connectLabel || `Connect to ${platformName}`}
          </>
        )}
      </button>

      {/* Note */}
      {note && (
        <p
          className="connect-note"
          style={{
            margin: 0,
            color: '#64748b',
            fontSize: '13px',
            textAlign: 'center'
          }}
        >
          {note}
        </p>
      )}

      {/* OAuth Indicator */}
      {isOAuth && !isLoading && (
        <p
          style={{
            margin: '12px 0 0',
            color: '#64748b',
            fontSize: '12px',
            textAlign: 'center',
            fontStyle: 'italic'
          }}
        >
          You'll be redirected to {platformName} to authorize access
        </p>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .btn-connect:hover:not(:disabled) {
          background: #059669;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        
        .btn-connect:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}

export default PlatformConnect;
