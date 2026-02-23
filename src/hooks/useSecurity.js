/**
 * Security Hook
 * Provides state management and API calls for security features
 */

import { useState, useEffect, useCallback } from 'react';

const useSecurity = () => {
  const [securityProfile, setSecurityProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize security service
  const initialize = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.security.initialize();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get security profile
  const getProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.security.getProfile();
      setSecurityProfile(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update security profile
  const updateProfile = useCallback(async (updates) => {
    try {
      setLoading(true);
      const data = await window.api.security.updateProfile(updates);
      setSecurityProfile(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate TOTP secret for 2FA setup
  const generateTotpSecret = useCallback(async (userEmail) => {
    try {
      setLoading(true);
      return await window.api.security.generateTotpSecret(userEmail);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Verify and enable TOTP
  const verifyAndEnableTotp = useCallback(async (token, userEmail) => {
    try {
      setLoading(true);
      const data = await window.api.security.verifyAndEnableTotp(token, userEmail);
      await getProfile(); // Refresh profile
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getProfile]);

  // Disable TOTP
  const disableTotp = useCallback(async (token) => {
    try {
      setLoading(true);
      const data = await window.api.security.disableTotp(token);
      await getProfile(); // Refresh profile
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getProfile]);

  // Verify TOTP token
  const verifyTotp = useCallback(async (token) => {
    try {
      setLoading(true);
      return await window.api.security.verifyTotp(token);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get active sessions
  const getSessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.security.getSessions();
      setSessions(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new session
  const createSession = useCallback(async (sessionInfo) => {
    try {
      setLoading(true);
      const data = await window.api.security.createSession(sessionInfo);
      await getSessions(); // Refresh sessions
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getSessions]);

  // Revoke session
  const revokeSession = useCallback(async (sessionId) => {
    try {
      setLoading(true);
      const data = await window.api.security.revokeSession(sessionId);
      await getSessions(); // Refresh sessions
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getSessions]);

  // Revoke all other sessions
  const revokeAllOtherSessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.security.revokeAllOtherSessions();
      await getSessions(); // Refresh sessions
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getSessions]);

  // Get activity log
  const getActivityLog = useCallback(async (limit = 50) => {
    try {
      setLoading(true);
      const data = await window.api.security.getActivityLog(limit);
      setActivityLog(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get recovery codes
  const getRecoveryCodes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.security.getRecoveryCodes();
      setRecoveryCodes(data.recoveryCodes);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await initialize();
        await Promise.all([
          getProfile(),
          getSessions(),
          getActivityLog()
        ]);
      } catch (err) {
        console.error('Error loading initial security data:', err);
      }
    };
    
    loadInitialData();
  }, [initialize, getProfile, getSessions, getActivityLog]);

  return {
    // State
    securityProfile,
    sessions,
    activityLog,
    recoveryCodes,
    loading,
    error,
    
    // Actions
    initialize,
    getProfile,
    updateProfile,
    generateTotpSecret,
    verifyAndEnableTotp,
    disableTotp,
    verifyTotp,
    getSessions,
    createSession,
    revokeSession,
    revokeAllOtherSessions,
    getActivityLog,
    getRecoveryCodes,
    clearError
  };
};

export default useSecurity;
