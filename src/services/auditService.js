/**
 * Audit Service
 * 
 * A comprehensive audit logging service that provides standardized
 * logging for all sensitive operations across the application.
 * 
 * Features:
 * - Standardized audit log format
 * - Action categorization (AUTH, DATA, SYSTEM, SECURITY)
 * - Sensitive data sanitization
 * - IP address tracking
 * - User context support
 * - Query and filter capabilities
 * 
 * @example
 * ```javascript
 * AuditService.log({
 *   action: 'CREATE',
 *   entityType: 'invoice',
 *   entityId: 'INV-001',
 *   userId: 1,
 *   details: { amount: 1000, customer: 'ABC Corp' }
 * });
 * ```
 */

const path = require('path');

// Action Categories
const ACTION_CATEGORIES = {
  AUTH: 'AUTH',           // Authentication operations
  DATA: 'DATA',           // Data manipulation (CRUD)
  SYSTEM: 'SYSTEM',       // System operations
  SECURITY: 'SECURITY',   // Security-related events
  INTEGRATION: 'INTEGRATION', // Integration operations
  RECONCILIATION: 'RECONCILIATION', // Bank reconciliation
  IMPORT_EXPORT: 'IMPORT_EXPORT', // Import/Export operations
  VOICE: 'VOICE'          // Voice command operations
};

// Severity Levels
const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Sanitize sensitive data from an object
 * Removes or masks fields that shouldn't be logged
 * @param {Object} data - Data to sanitize
 * @returns {Object} Sanitized data
 */
function sanitizeData(data) {
  if (!data || typeof data !== 'object') return data;
  
  const sanitized = { ...data };
  const sensitiveFields = [
    'password', 'pin', 'pin_hash', 'accessToken', 'refreshToken',
    'encryptedAccessToken', 'encryptedRefreshToken', 'secret', 'apiKey',
    'token', 'creditCard', 'cvv', 'authorization'
  ];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      if (field.includes('Token') || field.includes('password') || field.includes('pin')) {
        sanitized[field] = '[REDACTED]';
      } else {
        delete sanitized[field];
      }
    }
  }
  
  return sanitized;
}

/**
 * Create an audit log entry
 * @param {Object} params - Audit log parameters
 * @param {string} params.action - Action type (CREATE, UPDATE, DELETE, etc.)
 * @param {string} params.entityType - Type of entity being operated on
 * @param {string|number} params.entityId - ID of the entity
 * @param {number} [params.userId] - User who performed the action
 * @param {string} [params.ipAddress] - IP address of the client
 * @param {Object} [params.oldValues] - Previous values (for updates)
 * @param {Object} [params.newValues] - New values (for creates/updates)
 * @param {string} [params.details] - Additional details message
 * @param {string} [params.severity] - Severity level
 * @param {Object} [params.metadata] - Additional metadata
 * @returns {Object} Audit log entry
 */
function createAuditLog({
  action,
  entityType,
  entityId,
  userId = null,
  ipAddress = null,
  oldValues = null,
  newValues = null,
  details = '',
  severity = SEVERITY_LEVELS.LOW,
  metadata = {}
}) {
  const timestamp = new Date().toISOString();
  
  // Determine category from action or entity type
  let category = ACTION_CATEGORIES.DATA;
  if (['LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PIN_CHANGE', 'PASSWORD_RESET'].includes(action)) {
    category = ACTION_CATEGORIES.AUTH;
  } else if (['EXPORT', 'IMPORT', 'BACKUP', 'RESTORE'].includes(action)) {
    category = ACTION_CATEGORIES.IMPORT_EXPORT;
  } else if (['RECONCILE', 'UNRECONCILE', 'FLAG'].includes(action)) {
    category = ACTION_CATEGORIES.RECONCILIATION;
  } else if (entityType.includes('voice') || action.includes('VOICE')) {
    category = ACTION_CATEGORIES.VOICE;
  }
  
  // Determine severity based on action
  let effectiveSeverity = severity;
  if (['DELETE', 'LOGIN_FAILED', 'SECURITY', 'CANCEL'].includes(action)) {
    effectiveSeverity = SEVERITY_LEVELS.HIGH;
  }
  if (['LOGIN_FAILED'].includes(action) && metadata.failed_attempts >= 3) {
    effectiveSeverity = SEVERITY_LEVELS.CRITICAL;
  }
  
  return {
    action: `${category}_${action}`,
    entity_type: entityType,
    entity_id: String(entityId || ''),
    user_id: userId,
    ip_address: ipAddress,
    old_values: oldValues ? JSON.stringify(sanitizeData(oldValues)) : null,
    new_values: newValues ? JSON.stringify(sanitizeData(newValues)) : null,
    details: details,
    severity: effectiveSeverity,
    metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
    created_at: timestamp
  };
}

/**
 * AuditService Class
 * Provides a unified interface for audit logging
 */
class AuditService {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  /**
   * Initialize the audit service with database connection
   * @param {Object} database - Database connection instance
   */
  initialize(database) {
    this.db = database;
    this.initialized = true;
    console.log('[AuditService] Initialized successfully');
  }

  /**
   * Log an audit event
   * @param {Object} params - Audit log parameters
   * @returns {boolean} Success status
   */
  log(params) {
    if (!this.initialized || !this.db) {
      console.warn('[AuditService] Not initialized, logging to console only');
      console.log('[Audit]', JSON.stringify(params, null, 2));
      return false;
    }

    try {
      const entry = createAuditLog(params);
      
      this.db.prepare(`
        INSERT INTO audit_logs 
        (action, entity_type, entity_id, user_id, ip_address, old_values, new_values, details, severity, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        entry.action,
        entry.entity_type,
        entry.entity_id,
        entry.user_id,
        entry.ip_address,
        entry.old_values,
        entry.new_values,
        entry.details,
        entry.severity,
        entry.metadata,
        entry.created_at
      );

      return true;
    } catch (error) {
      console.error('[AuditService] Failed to log audit event:', error.message);
      return false;
    }
  }

  /**
   * Log authentication event
   * @param {string} action - Auth action (LOGIN, LOGOUT, LOGIN_FAILED, etc.)
   * @param {Object} params - Additional parameters
   */
  logAuth(action, { userId, username, ipAddress, metadata = {} }) {
    return this.log({
      action,
      entityType: 'users',
      entityId: userId,
      userId,
      ipAddress,
      details: `${action} for user ${username}`,
      severity: action === 'LOGIN_FAILED' ? SEVERITY_LEVELS.HIGH : SEVERITY_LEVELS.LOW,
      metadata: { username, ...metadata }
    });
  }

  /**
   * Log data operation
   * @param {string} action - CRUD action (CREATE, UPDATE, DELETE)
   * @param {string} entityType - Entity type
   * @param {string|number} entityId - Entity ID
   * @param {Object} params - Additional parameters
   */
  logData(action, entityType, entityId, { userId, oldValues, newValues, ipAddress, details }) {
    return this.log({
      action,
      entityType,
      entityId,
      userId,
      ipAddress,
      oldValues,
      newValues,
      details: details || `${action} ${entityType} ${entityId}`,
      severity: action === 'DELETE' ? SEVERITY_LEVELS.HIGH : SEVERITY_LEVELS.LOW
    });
  }

  /**
   * Log system operation
   * @param {string} action - System action
   * @param {Object} params - Additional parameters
   */
  logSystem(action, { userId, ipAddress, metadata = {}, details }) {
    return this.log({
      action: `SYSTEM_${action}`,
      entityType: 'system',
      entityId: null,
      userId,
      ipAddress,
      details: details || `System operation: ${action}`,
      severity: SEVERITY_LEVELS.LOW,
      metadata
    });
  }

  /**
   * Log integration operation
   * @param {string} action - Integration action
   * @param {string} provider - Integration provider
   * @param {Object} params - Additional parameters
   */
  logIntegration(action, provider, { userId, status, metadata = {} }) {
    return this.log({
      action: `INTEGRATION_${action}`,
      entityType: `integration_${provider}`,
      entityId: provider,
      userId,
      details: `Integration ${action} for ${provider}: ${status}`,
      severity: status === 'failed' ? SEVERITY_LEVELS.MEDIUM : SEVERITY_LEVELS.LOW,
      metadata: { provider, status, ...metadata }
    });
  }

  /**
   * Log import/export operation
   * @param {string} action - Import or Export
   * @param {Object} params - Additional parameters
   */
  logImportExport(action, { userId, format, recordCount, filename, ipAddress }) {
    return this.log({
      action: action.toUpperCase(),
      entityType: 'data',
      entityId: null,
      userId,
      ipAddress,
      details: `${action} ${recordCount} records in ${format} format${filename ? `: ${filename}` : ''}`,
      severity: SEVERITY_LEVELS.MEDIUM,
      metadata: { format, record_count: recordCount, filename }
    });
  }

  /**
   * Query audit logs with filters
   * @param {Object} filters - Query filters
   * @returns {Array} Audit log entries
   */
  query(filters = {}) {
    if (!this.initialized || !this.db) {
      return [];
    }

    try {
      let query = 'SELECT * FROM audit_logs WHERE 1=1';
      const params = [];

      if (filters.action) {
        query += ' AND action = ?';
        params.push(filters.action);
      }
      if (filters.entityType) {
        query += ' AND entity_type LIKE ?';
        params.push(`%${filters.entityType}%`);
      }
      if (filters.userId) {
        query += ' AND user_id = ?';
        params.push(filters.userId);
      }
      if (filters.severity) {
        query += ' AND severity = ?';
        params.push(filters.severity);
      }
      if (filters.startDate) {
        query += ' AND created_at >= ?';
        params.push(filters.startDate);
      }
      if (filters.endDate) {
        query += ' AND created_at <= ?';
        params.push(filters.endDate);
      }
      if (filters.search) {
        query += ' AND (details LIKE ? OR action LIKE ?)';
        const search = `%${filters.search}%`;
        params.push(search, search);
      }

      query += ' ORDER BY created_at DESC';

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      } else {
        query += ' LIMIT 100';
      }

      return this.db.prepare(query).all(...params);
    } catch (error) {
      console.error('[AuditService] Query failed:', error.message);
      return [];
    }
  }

  /**
   * Get audit summary statistics
   * @param {string} period - Time period (today, week, month)
   * @returns {Object} Summary statistics
   */
  getSummary(period = 'week') {
    if (!this.initialized || !this.db) {
      return null;
    }

    try {
      const now = new Date();
      let startDate;

      if (period === 'today') {
        startDate = now.toISOString().split('T')[0];
      } else if (period === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString().split('T')[0];
      } else {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = monthStart.toISOString().split('T')[0];
      }

      // Count by action
      const byAction = this.db.prepare(`
        SELECT action, COUNT(*) as count
        FROM audit_logs
        WHERE created_at >= ?
        GROUP BY action
        ORDER BY count DESC
      `).all(startDate);

      // Count by severity
      const bySeverity = this.db.prepare(`
        SELECT severity, COUNT(*) as count
        FROM audit_logs
        WHERE created_at >= ?
        GROUP BY severity
      `).all(startDate);

      // Count by entity type
      const byEntity = this.db.prepare(`
        SELECT entity_type, COUNT(*) as count
        FROM audit_logs
        WHERE created_at >= ?
        GROUP BY entity_type
        ORDER BY count DESC
        LIMIT 10
      `).all(startDate);

      // Total count
      const total = this.db.prepare(`
        SELECT COUNT(*) as count FROM audit_logs WHERE created_at >= ?
      `).get(startDate);

      // Recent critical events
      const criticalEvents = this.db.prepare(`
        SELECT * FROM audit_logs
        WHERE created_at >= ? AND severity IN ('high', 'critical')
        ORDER BY created_at DESC
        LIMIT 20
      `).all(startDate);

      return {
        period: { start: startDate, end: now.toISOString().split('T')[0] },
        total: total.count,
        byAction,
        bySeverity,
        byEntity,
        criticalEvents: criticalEvents.length,
        criticalEventsList: criticalEvents.slice(0, 10)
      };
    } catch (error) {
      console.error('[AuditService] Get summary failed:', error.message);
      return null;
    }
  }

  /**
   * Clean up old audit logs based on retention policy
   * @param {number} daysToKeep - Number of days to retain logs
   * @returns {number} Number of deleted records
   */
  cleanup(daysToKeep = 365) {
    if (!this.initialized || !this.db) {
      return 0;
    }

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const result = this.db.prepare(`
        DELETE FROM audit_logs WHERE created_at < ?
      `).run(cutoffDate.toISOString());

      console.log(`[AuditService] Cleaned up ${result.changes} old audit logs`);
      return result.changes;
    } catch (error) {
      console.error('[AuditService] Cleanup failed:', error.message);
      return 0;
    }
  }
}

// Export singleton instance
const auditService = new AuditService();

module.exports = {
  AuditService: auditService,
  ACTION_CATEGORIES,
  SEVERITY_LEVELS,
  createAuditLog
};
