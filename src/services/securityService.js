/**
 * Security Service - Security & Privacy Module
 * Handles Two-Factor Authentication, Session Management, and Activity Logging
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');

// Database path
const getDbPath = () => {
  const userDataPath = process.env.APPDATA || process.env.HOME || '.';
  return path.join(userDataPath, 'Talk-to-Your-Accounts', 'security_data.json');
};

// Initialize database structure
const initializeDatabase = () => {
  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  if (!fs.existsSync(dbPath)) {
    const initialData = getDefaultSecurityData();
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
  }
  
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
};

// Get default security data
const getDefaultSecurityData = () => ({
  securityProfile: {
    totpEnabled: false,
    totpSecret: null,
    recoveryCodes: [],
    loginNotifications: true,
    lastPasswordChange: new Date().toISOString(),
    passwordExpiryDays: 90
  },
  sessions: [],
  activityLog: []
});

// Save data to database
const saveData = (data) => {
  const dbPath = getDbPath();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

// Get security profile
const getSecurityProfile = () => {
  const data = initializeDatabase();
  const profile = { ...data.securityProfile };
  // Don't expose the actual secret
  profile.totpSecret = profile.totpSecret ? '********' : null;
  return profile;
};

// Update security profile
const updateSecurityProfile = (updates) => {
  const data = initializeDatabase();
  data.securityProfile = { ...data.securityProfile, ...updates };
  saveData(data);
  return getSecurityProfile();
};

// Generate TOTP secret for 2FA setup
const generateTotpSecret = async (userEmail) => {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(userEmail, 'Talk-to-Your-Accounts', secret);
  
  // Generate QR code as data URL
  const qrCodeDataUrl = await QRCode.toDataURL(otpauth);
  
  // Store secret temporarily (not enabled until verified)
  const data = initializeDatabase();
  data.securityProfile.pendingTotpSecret = secret;
  saveData(data);
  
  return {
    secret,
    qrCode: qrCodeDataUrl
  };
};

// Verify and enable TOTP
const verifyAndEnableTotp = (token, userEmail) => {
  const data = initializeDatabase();
  const pendingSecret = data.securityProfile.pendingTotpSecret;
  
  if (!pendingSecret) {
    throw new Error('No pending 2FA setup. Please start setup process again.');
  }
  
  // Verify the token
  const isValid = authenticator.verify({
    token,
    secret: pendingSecret
  });
  
  if (!isValid) {
    throw new Error('Invalid verification code. Please try again.');
  }
  
  // Generate recovery codes
  const recoveryCodes = [];
  for (let i = 0; i < 10; i++) {
    recoveryCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  
  // Enable 2FA
  data.securityProfile.totpEnabled = true;
  data.securityProfile.totpSecret = pendingSecret;
  data.securityProfile.recoveryCodes = recoveryCodes;
  data.securityProfile.pendingTotpSecret = null;
  
  // Log the activity
  data.activityLog.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: '2FA_ENABLED',
    details: 'Two-factor authentication enabled',
    ip: '127.0.0.1',
    status: 'SUCCESS'
  });
  
  saveData(data);
  
  return {
    success: true,
    recoveryCodes
  };
};

// Disable TOTP
const disableTotp = (token) => {
  const data = initializeDatabase();
  
  if (!data.securityProfile.totpEnabled) {
    throw new Error('2FA is not enabled');
  }
  
  // Verify token first
  const isValid = authenticator.verify({
    token,
    secret: data.securityProfile.totpSecret
  });
  
  // Also accept recovery codes
  const isRecoveryCode = data.securityProfile.recoveryCodes.includes(token.toUpperCase());
  
  if (!isValid && !isRecoveryCode) {
    throw new Error('Invalid verification code');
  }
  
  // If using recovery code, remove it
  if (isRecoveryCode) {
    data.securityProfile.recoveryCodes = data.securityProfile.recoveryCodes.filter(
      code => code !== token.toUpperCase()
    );
  }
  
  // Disable 2FA
  data.securityProfile.totpEnabled = false;
  data.securityProfile.totpSecret = null;
  data.securityProfile.recoveryCodes = [];
  
  // Log the activity
  data.activityLog.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: '2FA_DISABLED',
    details: 'Two-factor authentication disabled',
    ip: '127.0.0.1',
    status: 'SUCCESS'
  });
  
  saveData(data);
  
  return { success: true };
};

// Verify TOTP token (for login)
const verifyTotp = (token) => {
  const data = initializeDatabase();
  
  if (!data.securityProfile.totpEnabled) {
    return { valid: true, requires2FA: false };
  }
  
  const isValid = authenticator.verify({
    token,
    secret: data.securityProfile.totpSecret
  });
  
  // Check recovery codes
  const isRecoveryCode = data.securityProfile.recoveryCodes.includes(token.toUpperCase());
  
  if (isRecoveryCode) {
    // Remove used recovery code
    data.securityProfile.recoveryCodes = data.securityProfile.recoveryCodes.filter(
      code => code !== token.toUpperCase()
    );
    saveData(data);
    return { valid: true, requires2FA: false, usedRecoveryCode: true };
  }
  
  return { valid: isValid, requires2FA: true };
};

// Get active sessions
const getActiveSessions = () => {
  const data = initializeDatabase();
  return data.sessions;
};

// Create new session
const createSession = (sessionInfo) => {
  const data = initializeDatabase();
  
  const session = {
    id: `SES-${crypto.randomBytes(16).toString('hex')}`,
    deviceInfo: sessionInfo.deviceInfo || 'Unknown Device',
    ip: sessionInfo.ip || '127.0.0.1',
    location: sessionInfo.location || 'Local',
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    isCurrent: true
  };
  
  // Mark other sessions as not current
  data.sessions = data.sessions.map(s => ({ ...s, isCurrent: false }));
  
  data.sessions.unshift(session);
  
  // Log the activity
  data.activityLog.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'LOGIN',
    details: `New session created from ${session.deviceInfo}`,
    ip: session.ip,
    status: 'SUCCESS'
  });
  
  // Keep only last 50 sessions
  if (data.sessions.length > 50) {
    data.sessions = data.sessions.slice(0, 50);
  }
  
  saveData(data);
  
  return session;
};

// Revoke session
const revokeSession = (sessionId) => {
  const data = initializeDatabase();
  const session = data.sessions.find(s => s.id === sessionId);
  
  if (!session) {
    throw new Error('Session not found');
  }
  
  if (session.isCurrent) {
    throw new Error('Cannot revoke current session');
  }
  
  data.sessions = data.sessions.filter(s => s.id !== sessionId);
  
  // Log the activity
  data.activityLog.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'SESSION_REVOKED',
    details: `Session revoked: ${session.deviceInfo}`,
    ip: session.ip,
    status: 'SUCCESS'
  });
  
  saveData(data);
  
  return { success: true };
};

// Revoke all other sessions
const revokeAllOtherSessions = () => {
  const data = initializeDatabase();
  
  const currentSession = data.sessions.find(s => s.isCurrent);
  data.sessions = currentSession ? [currentSession] : [];
  
  // Log the activity
  data.activityLog.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'ALL_SESSIONS_REVOKED',
    details: 'All other sessions revoked',
    ip: '127.0.0.1',
    status: 'SUCCESS'
  });
  
  saveData(data);
  
  return { success: true };
};

// Update session activity
const updateSessionActivity = (sessionId) => {
  const data = initializeDatabase();
  const session = data.sessions.find(s => s.id === sessionId);
  
  if (session) {
    session.lastActive = new Date().toISOString();
    saveData(data);
  }
  
  return session;
};

// Get activity log
const getActivityLog = (limit = 50) => {
  const data = initializeDatabase();
  return data.activityLog.slice(0, limit);
};

// Log activity
const logActivity = (action, details, status = 'SUCCESS', ip = '127.0.0.1') => {
  const data = initializeDatabase();
  
  data.activityLog.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action,
    details,
    ip,
    status
  });
  
  // Keep only last 500 activities
  if (data.activityLog.length > 500) {
    data.activityLog = data.activityLog.slice(0, 500);
  }
  
  saveData(data);
  
  return data.activityLog[0];
};

// Get recovery codes (for display)
const getRecoveryCodes = () => {
  const data = initializeDatabase();
  
  if (!data.securityProfile.totpEnabled) {
    throw new Error('2FA is not enabled');
  }
  
  return {
    recoveryCodes: data.securityProfile.recoveryCodes
  };
};

// Export functions
module.exports = {
  initializeDatabase,
  getSecurityProfile,
  updateSecurityProfile,
  generateTotpSecret,
  verifyAndEnableTotp,
  disableTotp,
  verifyTotp,
  getActiveSessions,
  createSession,
  revokeSession,
  revokeAllOtherSessions,
  updateSessionActivity,
  getActivityLog,
  logActivity,
  getRecoveryCodes
};
