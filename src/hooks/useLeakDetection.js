import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for Cash Leak Detection functionality
 * Provides methods to run analysis, get anomalies, and manage leak detection
 */
export function useLeakDetection() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [config, setConfig] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Run full leak analysis
  const runAnalysis = useCallback(async (options = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.leakDetection.runAnalysis(options);
      if (result.success) {
        setAnalysisResults(result.data);
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
      console.error('Leak analysis error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get anomalies with filters
  const getAnomalies = useCallback(async (filters = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.leakDetection.getAnomalies(filters);
      if (result.success) {
        setAnomalies(result.data);
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
      console.error('Get anomalies error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new anomaly
  const createAnomaly = useCallback(async (data) => {
    try {
      const result = await window.leakDetection.createAnomaly(data);
      if (result.success) {
        // Refresh anomalies list
        await getAnomalies();
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
      console.error('Create anomaly error:', err);
      return null;
    }
  }, [getAnomalies]);

  // Resolve anomaly
  const resolveAnomaly = useCallback(async (id, resolutionNotes) => {
    try {
      const result = await window.leakDetection.resolveAnomaly(id, resolutionNotes);
      if (result.success) {
        // Refresh anomalies and dashboard
        await getAnomalies();
        await getDashboardSummary();
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
      console.error('Resolve anomaly error:', err);
      return null;
    }
  }, [getAnomalies]);

  // Get configuration
  const getConfig = useCallback(async (key = null) => {
    try {
      const result = await window.leakDetection.getConfig(key);
      if (result.success) {
        setConfig(result.data);
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
      console.error('Get config error:', err);
      return [];
    }
  }, []);

  // Update configuration
  const updateConfig = useCallback(async (key, value) => {
    try {
      const result = await window.leakDetection.updateConfig(key, value);
      if (result.success) {
        // Refresh config
        await getConfig();
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
      console.error('Update config error:', err);
      return null;
    }
  }, [getConfig]);

  // Get dashboard summary
  const getDashboardSummary = useCallback(async () => {
    try {
      const result = await window.leakDetection.getDashboardSummary();
      if (result.success) {
        setDashboardSummary(result.data);
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
      console.error('Get dashboard summary error:', err);
      return null;
    }
  }, []);

  // Record shift data
  const recordShift = useCallback(async (data) => {
    try {
      const result = await window.leakDetection.recordShift(data);
      if (result.success) {
        // Refresh shifts
        await getShifts();
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
      console.error('Record shift error:', err);
      return null;
    }
  }, []);

  // Get shifts
  const getShifts = useCallback(async (filters = {}) => {
    try {
      const result = await window.leakDetection.getShifts(filters);
      if (result.success) {
        setShifts(result.data);
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
      console.error('Get shifts error:', err);
      return [];
    }
  }, []);

  // Record audit event
  const recordAuditEvent = useCallback(async (data) => {
    try {
      const result = await window.leakDetection.recordAuditEvent(data);
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
      console.error('Record audit event error:', err);
      return null;
    }
  }, []);

  // Get audit logs
  const getAuditLogs = useCallback(async (filters = {}) => {
    try {
      const result = await window.leakDetection.getAuditLogs(filters);
      if (result.success) {
        setAuditLogs(result.data);
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
      console.error('Get audit logs error:', err);
      return [];
    }
  }, []);

  // Initialize data on mount
  useEffect(() => {
    getDashboardSummary();
    getConfig();
    getAnomalies({ status: 'OPEN', limit: 20 });
  }, [getDashboardSummary, getConfig, getAnomalies]);

  return {
    // State
    isLoading,
    error,
    anomalies,
    analysisResults,
    dashboardSummary,
    config,
    shifts,
    auditLogs,
    // Actions
    runAnalysis,
    getAnomalies,
    createAnomaly,
    resolveAnomaly,
    getConfig,
    updateConfig,
    getDashboardSummary,
    recordShift,
    getShifts,
    recordAuditEvent,
    getAuditLogs
  };
}

export default useLeakDetection;
