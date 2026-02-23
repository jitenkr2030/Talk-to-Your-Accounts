/**
 * Security Settings Dashboard Component
 * Two-Factor Authentication, Session Management, and Activity Monitoring
 */

import { useState, useEffect } from 'react';
import useSecurity from '../../hooks/useSecurity';

const SecuritySettingsDashboard = () => {
  const {
    securityProfile,
    sessions,
    activityLog,
    recoveryCodes,
    loading,
    error,
    generateTotpSecret,
    verifyAndEnableTotp,
    disableTotp,
    revokeSession,
    revokeAllOtherSessions,
    getActivityLog,
    getRecoveryCodes,
    clearError
  } = useSecurity();

  const [activeTab, setActiveTab] = useState('two-factor');
  const [totpSetup, setTotpSetup] = useState({ secret: '', qrCode: '', step: 'init' });
  const [verifyToken, setVerifyToken] = useState('');
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Handle starting 2FA setup
  const handleStartSetup = async () => {
    try {
      setActionLoading(true);
      const result = await generateTotpSecret('user@talktoyouraccounts.com');
      setTotpSetup({
        secret: result.secret,
        qrCode: result.qrCode,
        step: 'verify'
      });
    } catch (err) {
      console.error('Error starting 2FA setup:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle verifying and enabling 2FA
  const handleVerifyAndEnable = async (e) => {
    e.preventDefault();
    if (!verifyToken.trim()) return;
    
    try {
      setActionLoading(true);
      const result = await verifyAndEnableTotp(verifyToken, 'user@talktoyouraccounts.com');
      setTotpSetup({ secret: '', qrCode: '', step: 'complete' });
      setRecoveryCodes(result.recoveryCodes);
      setShowRecoveryCodes(true);
      setVerifyToken('');
    } catch (err) {
      console.error('Error verifying 2FA:', err);
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle disabling 2FA
  const handleDisable2FA = async () => {
    const token = prompt('Enter your 2FA code or recovery code to disable:');
    if (!token) return;
    
    try {
      setActionLoading(true);
      await disableTotp(token);
      alert('2FA has been disabled');
      setShowRecoveryCodes(false);
    } catch (err) {
      console.error('Error disabling 2FA:', err);
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle viewing recovery codes
  const handleViewRecoveryCodes = async () => {
    try {
      setActionLoading(true);
      await getRecoveryCodes();
      setShowRecoveryCodes(true);
    } catch (err) {
      console.error('Error getting recovery codes:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle revoking session
  const handleRevokeSession = async (sessionId) => {
    if (!confirm('Are you sure you want to revoke this session?')) return;
    
    try {
      setActionLoading(true);
      await revokeSession(sessionId);
      alert('Session revoked successfully');
    } catch (err) {
      console.error('Error revoking session:', err);
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle revoking all other sessions
  const handleRevokeAll = async () => {
    if (!confirm('Are you sure you want to revoke all other sessions? This cannot be undone.')) return;
    
    try {
      setActionLoading(true);
      await revokeAllOtherSessions();
      alert('All other sessions have been revoked');
    } catch (err) {
      console.error('Error revoking sessions:', err);
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Get action icon
  const getActionIcon = (action) => {
    const icons = {
      'LOGIN': '🔑',
      '2FA_ENABLED': '🛡️',
      '2FA_DISABLED': '⚠️',
      'SESSION_REVOKED': '🚫',
      'ALL_SESSIONS_REVOKED': '🔒',
      'PASSWORD_CHANGE': '🔐',
      'PROFILE_UPDATE': '✏️'
    };
    return icons[action] || '📋';
  };

  // Tab navigation items
  const tabs = [
    { id: 'two-factor', label: 'Two-Factor Auth' },
    { id: 'sessions', label: 'Active Sessions' },
    { id: 'activity', label: 'Activity Log' }
  ];

  if (loading && !securityProfile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Security & Privacy</h1>
        <p className="text-slate-400">Manage your account security, two-factor authentication, and session settings</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400">{error}</p>
          <button onClick={clearError} className="text-sm text-red-300 hover:underline mt-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-700 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Two-Factor Authentication Tab */}
      {activeTab === 'two-factor' && (
        <div className="max-w-2xl">
          {/* 2FA Status Card */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Two-Factor Authentication</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                securityProfile?.totpEnabled 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-slate-600 text-slate-300'
              }`}>
                {securityProfile?.totpEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            <p className="text-slate-400 mb-6">
              Two-factor authentication adds an extra layer of security to your account. 
              When enabled, you'll need to enter a verification code from your authenticator app 
              in addition to your password.
            </p>

            {!securityProfile?.totpEnabled ? (
              // 2FA Disabled State
              totpSetup.step === 'init' ? (
                <button
                  onClick={handleStartSetup}
                  disabled={actionLoading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
                >
                  {actionLoading ? 'Setting up...' : 'Enable Two-Factor Authentication'}
                </button>
              ) : totpSetup.step === 'verify' ? (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg flex justify-center">
                    <img src={totpSetup.qrCode} alt="QR Code" className="w-48 h-48" />
                  </div>
                  <p className="text-slate-400 text-sm text-center">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                  </p>
                  <p className="text-slate-500 text-xs text-center">
                    Or enter this secret manually: <code className="bg-slate-700 px-2 py-1 rounded">{totpSetup.secret}</code>
                  </p>
                  
                  <form onSubmit={handleVerifyAndEnable} className="space-y-4 mt-4">
                    <div>
                      <label className="block text-slate-400 text-sm mb-2">Enter Verification Code</label>
                      <input
                        type="text"
                        value={verifyToken}
                        onChange={(e) => setVerifyToken(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        required
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setTotpSetup({ secret: '', qrCode: '', step: 'init' })}
                        className="flex-1 py-3 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
                      >
                        {actionLoading ? 'Verifying...' : 'Verify & Enable'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : null
            ) : (
              // 2FA Enabled State
              <div className="space-y-4">
                <div className="flex gap-3">
                  <button
                    onClick={handleViewRecoveryCodes}
                    disabled={actionLoading}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
                  >
                    View Recovery Codes
                  </button>
                  <button
                    onClick={handleDisable2FA}
                    disabled={actionLoading}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
                  >
                    Disable 2FA
                  </button>
                </div>
                
                <p className="text-slate-500 text-sm">
                  Recovery codes are used to access your account if you lose your authenticator device.
                  Store these codes in a secure location.
                </p>
              </div>
            )}
          </div>

          {/* Recovery Codes Display */}
          {showRecoveryCodes && recoveryCodes.length > 0 && (
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Recovery Codes</h3>
              <p className="text-slate-400 text-sm mb-4">
                Each code can only be used once. Store these codes securely.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {recoveryCodes.map((code, index) => (
                  <div key={index} className="bg-slate-700/50 rounded px-3 py-2 font-mono text-sm text-white">
                    {code}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowRecoveryCodes(false)}
                className="mt-4 text-blue-400 hover:text-blue-300 text-sm"
              >
                I've saved these codes
              </button>
            </div>
          )}

          {/* Security Settings */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mt-6">
            <h2 className="text-xl font-semibold text-white mb-6">Security Preferences</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white">Login Notifications</p>
                  <p className="text-slate-400 text-sm">Receive notifications for new login attempts</p>
                </div>
                <input
                  type="checkbox"
                  checked={securityProfile?.loginNotifications || false}
                  onChange={(e) => {
                    // Update preference
                  }}
                  className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="max-w-4xl">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Active Sessions</h2>
              <button
                onClick={handleRevokeAll}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                Revoke All Other Sessions
              </button>
            </div>

            <p className="text-slate-400 mb-6">
              Manage your active sessions across all devices. You can revoke sessions you no longer use or trust.
            </p>

            {sessions.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No active sessions found</p>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div 
                    key={session.id} 
                    className={`bg-slate-700/50 rounded-lg p-4 flex items-center justify-between ${
                      session.isCurrent ? 'border border-blue-500/30' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
                        <span className="text-xl">💻</span>
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {session.deviceInfo}
                          {session.isCurrent && (
                            <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                              This Device
                            </span>
                          )}
                        </p>
                        <p className="text-slate-400 text-sm">
                          {session.ip} • Last active: {formatDate(session.lastActive)}
                        </p>
                      </div>
                    </div>
                    
                    {!session.isCurrent && (
                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={actionLoading}
                        className="px-3 py-1 text-red-400 hover:text-red-300 text-sm hover:bg-red-500/10 rounded transition-colors"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activity Log Tab */}
      {activeTab === 'activity' && (
        <div className="max-w-4xl">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Activity Log</h2>
              <button
                onClick={() => getActivityLog(50)}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
              >
                Refresh
              </button>
            </div>

            <p className="text-slate-400 mb-6">
              View recent account activity including logins, security changes, and important actions.
            </p>

            {activityLog.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No activity recorded yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left text-slate-400 text-sm py-3 px-4">Action</th>
                      <th className="text-left text-slate-400 text-sm py-3 px-4">Details</th>
                      <th className="text-left text-slate-400 text-sm py-3 px-4">IP Address</th>
                      <th className="text-left text-slate-400 text-sm py-3 px-4">Status</th>
                      <th className="text-right text-slate-400 text-sm py-3 px-4">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLog.map((log) => (
                      <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        <td className="py-3 px-4">
                          <span className="text-white flex items-center gap-2">
                            <span>{getActionIcon(log.action)}</span>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{log.details}</td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-sm">{log.ip}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            log.status === 'SUCCESS' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400 text-sm">
                          {formatDate(log.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SecuritySettingsDashboard;
