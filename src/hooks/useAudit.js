import { useState, useCallback } from 'react';

/**
 * Audit Hook
 * 
 * Provides comprehensive audit logging and querying capabilities
 * for the application. Built on top of the centralized AuditService.
 * 
 * @example
 * ```jsx
 * const { logs, summary, queryLogs } = useAudit();
 * 
 * // Query logs
 * useEffect(() => {
 *   queryLogs({ entityType: 'transactions', limit: 50 });
 * }, []);
 * 
 * // Log an action
 * const handleCreate = () => {
 *   logAudit({ action: 'CREATE', entityType: 'invoice', entityId: 'INV-001' });
 * };
 * ```
 */
export function useAudit() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Query audit logs with filters
   * @param {Object} filters - Query filters
   * @param {string} [filters.action] - Filter by action type
   * @param {string} [filters.entityType] - Filter by entity type
   * @param {number} [filters.userId] - Filter by user ID
   * @param {string} [filters.severity] - Filter by severity level
   * @param {string} [filters.startDate] - Start date filter (ISO format)
   * @param {string} [filters.endDate] - End date filter (ISO format)
   * @param {string} [filters.search] - Search term
   * @param {number} [filters.limit=100] - Maximum number of results
   */
  const queryLogs = useCallback(async (filters = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await window.api.audit.query(filters);
      
      if (result.success) {
        setLogs(result.logs);
        return result.logs;
      } else {
        setError(result.error);
        return [];
      }
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get audit summary statistics
   * @param {string} period - Time period ('today', 'week', 'month')
   * @returns {Object|null} Summary statistics or null on error
   */
  const fetchSummary = useCallback(async (period = 'week') => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await window.api.audit.getServiceSummary(period);
      
      if (result.success && result.summary) {
        setSummary(result.summary);
        return result.summary;
      } else {
        setError(result.error);
        return null;
      }
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Log an audit event
   * @param {Object} params - Audit log parameters
   * @param {string} params.action - Action type (CREATE, UPDATE, DELETE, etc.)
   * @param {string} params.entityType - Type of entity being operated on
   * @param {string|number} params.entityId - ID of the entity
   * @param {number} [params.userId] - User who performed the action
   * @param {Object} [params.oldValues] - Previous values (for updates)
   * @param {Object} [params.newValues] - New values (for creates/updates)
   * @param {string} [params.details] - Additional details message
   * @param {string} [params.severity] - Severity level (low, medium, high, critical)
   */
  const logAudit = useCallback(async (params) => {
    try {
      const result = await window.api.audit.log(params);
      return result.success;
    } catch (err) {
      console.error('Failed to log audit event:', err);
      return false;
    }
  }, []);

  /**
   * Clear audit logs older than specified days
   * @param {number} daysToKeep - Number of days to retain logs (default: 365)
   * @returns {number} Number of deleted records, or -1 on error
   */
  const cleanupLogs = useCallback(async (daysToKeep = 365) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await window.api.audit.cleanup(daysToKeep);
      
      if (result.success) {
        return result.deletedCount;
      } else {
        setError(result.error);
        return -1;
      }
    } catch (err) {
      setError(err.message);
      return -1;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh audit data (logs and summary)
   * @param {Object} filters - Optional filters for logs
   */
  const refresh = useCallback(async (filters = {}) => {
    await Promise.all([
      queryLogs(filters),
      fetchSummary('week')
    ]);
  }, [queryLogs, fetchSummary]);

  return {
    // State
    logs,
    summary,
    isLoading,
    error,
    
    // Actions
    queryLogs,
    fetchSummary,
    logAudit,
    cleanupLogs,
    refresh,
    
    // Helpers
    clearError: () => setError(null)
  };
}

export default useAudit;
