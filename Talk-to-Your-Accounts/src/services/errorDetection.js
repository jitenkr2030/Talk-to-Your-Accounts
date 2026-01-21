import api from '../utils/api';

/**
 * Error Detection Service
 * Scans transactions and data for common errors and anomalies
 */
class ErrorDetectionService {
  constructor() {
    this.errorTypes = [
      { id: 'duplicate_voucher', name: 'Duplicate Vouchers', severity: 'high' },
      { id: 'negative_amount', name: 'Negative Amounts', severity: 'medium' },
      { id: 'missing_party', name: 'Missing Party', severity: 'medium' },
      { id: 'gst_mismatch', name: 'GST Mismatch', severity: 'high' },
      { id: 'round_off', name: 'Round-off Issues', severity: 'low' }
    ];
    this.lastScan = null;
    this.cachedErrors = [];
  }

  /**
   * Get available error types for detection
   */
  getErrorTypes() {
    return this.errorTypes;
  }

  /**
   * Run error detection scan
   * @param {string[]} types - Specific error types to scan (empty for all)
   * @returns {Promise<Object>} Scan results
   */
  async scan(types = []) {
    try {
      const errors = await api.errorDetection.detect(types);
      this.cachedErrors = errors;
      this.lastScan = new Date();

      return {
        success: true,
        errors,
        summary: this.summarizeErrors(errors),
        scannedAt: this.lastScan
      };
    } catch (error) {
      console.error('Error detection failed:', error);
      return {
        success: false,
        error: error.message,
        errors: []
      };
    }
  }

  /**
   * Get cached errors from last scan
   */
  getCachedErrors() {
    return {
      errors: this.cachedErrors,
      scannedAt: this.lastScan
    };
  }

  /**
   * Summarize errors by type and severity
   */
  summarizeErrors(errors) {
    const summary = {
      total: errors.length,
      bySeverity: { high: 0, medium: 0, low: 0 },
      byType: {},
      critical: []
    };

    for (const error of errors) {
      // Count by severity
      summary.bySeverity[error.severity] = (summary.bySeverity[error.severity] || 0) + 1;

      // Count by type
      summary.byType[error.type] = (summary.byType[error.type] || 0) + 1;

      // Track critical errors
      if (error.severity === 'high') {
        summary.critical.push(error);
      }
    }

    return summary;
  }

  /**
   * Fix a specific error
   */
  async fixError(errorType, entityId, fixData = {}) {
    try {
      await api.errorDetection.fix(errorType, entityId, fixData);
      return { success: true };
    } catch (error) {
      console.error('Error fix failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Batch fix errors of a specific type
   */
  async batchFix(errors) {
    const results = [];
    for (const error of errors) {
      const result = await this.fixError(error.type, error.entity_ids[0]);
      results.push({ error, ...result });
    }
    return results;
  }

  /**
   * Get errors filtered by criteria
   */
  filterErrors(criteria = {}) {
    let filtered = [...this.cachedErrors];

    if (criteria.severity) {
      filtered = filtered.filter(e => e.severity === criteria.severity);
    }

    if (criteria.type) {
      filtered = filtered.filter(e => e.type === criteria.type);
    }

    if (criteria.entityType) {
      filtered = filtered.filter(e => e.entity_type === criteria.entityType);
    }

    return filtered;
  }

  /**
   * Export errors to report format
   */
  exportReport(format = 'json') {
    const report = {
      generatedAt: new Date().toISOString(),
      lastScan: this.lastScan,
      summary: this.summarizeErrors(this.cachedErrors),
      errors: this.cachedErrors
    };

    if (format === 'json') {
      return JSON.stringify(report, null, 2);
    }

    if (format === 'csv') {
      const headers = ['Type', 'Severity', 'Title', 'Description', 'Entity Type', 'Suggestion'];
      const rows = this.cachedErrors.map(e => [
        e.type, e.severity, e.title, e.description, e.entity_type, e.suggestion
      ]);
      return [headers, ...rows].map(r => r.join(',')).join('\n');
    }

    return report;
  }
}

export default new ErrorDetectionService();
