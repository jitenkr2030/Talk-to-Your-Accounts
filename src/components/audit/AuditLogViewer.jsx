import React, { useState, useEffect, useMemo } from 'react';
import { useAudit } from '../../hooks/useAudit';

/**
 * AuditLogViewer Component
 * 
 * A comprehensive audit log viewer and management interface.
 * Provides filtering, searching, and visualization of audit events.
 * 
 * @example
 * ```jsx
 * <AuditLogViewer 
 *   onClose={() => setShowViewer(false)}
 *   entityType="transactions"
 * />
 * ```
 */
function AuditLogViewer({ 
  onClose, 
  initialFilters = {},
  showSummary = true,
  maxHeight = '600px'
}) {
  const { 
    logs, 
    summary, 
    isLoading, 
    error,
    queryLogs, 
    fetchSummary,
    logAudit,
    cleanupLogs,
    refresh,
    clearError 
  } = useAudit();

  // Filter state
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    severity: '',
    startDate: '',
    endDate: '',
    search: '',
    limit: 100,
    ...initialFilters
  });

  // UI state
  const [activeTab, setActiveTab] = useState('logs');
  const [selectedLog, setSelectedLog] = useState(null);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [cleanupDays, setCleanupDays] = useState(365);

  // Load initial data
  useEffect(() => {
    refresh(filters);
  }, []);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Debounce search
    if (key === 'search') {
      const timeoutId = setTimeout(() => {
        queryLogs(newFilters);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  };

  // Apply filters
  const applyFilters = () => {
    queryLogs(filters);
  };

  // Clear filters
  const clearFilters = () => {
    const defaultFilters = {
      action: '',
      entityType: '',
      severity: '',
      startDate: '',
      endDate: '',
      search: '',
      limit: 100
    };
    setFilters(defaultFilters);
    queryLogs(defaultFilters);
  };

  // Handle cleanup
  const handleCleanup = async () => {
    const deletedCount = await cleanupLogs(cleanupDays);
    if (deletedCount > 0) {
      setShowCleanupConfirm(false);
      refresh(filters);
    }
  };

  // Get severity badge color
  const getSeverityBadge = (severity) => {
    const colors = {
      low: { bg: '#dcfce7', text: '#166534' },
      medium: { bg: '#fef9c3', text: '#854d0e' },
      high: { bg: '#fee2e2', text: '#991b1b' },
      critical: { bg: '#fecaca', text: '#7f1d1d' }
    };
    return colors[severity] || colors.low;
  };

  // Get action category color
  const getActionCategory = (action) => {
    if (action.startsWith('AUTH_')) return '#3b82f6';
    if (action.startsWith('DATA_')) return '#22c55e';
    if (action.startsWith('SYSTEM_')) return '#8b5cf6';
    if (action.startsWith('SECURITY_')) return '#ef4444';
    if (action.startsWith('INTEGRATION_')) return '#f59e0b';
    if (action.startsWith('RECONCILIATION_')) return '#06b6d4';
    return '#6b7280';
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Unique entity types for filter dropdown
  const entityTypes = useMemo(() => {
    const types = new Set(logs.map(log => log.entity_type).filter(Boolean));
    return Array.from(types).sort();
  }, [logs]);

  // Unique actions for filter dropdown
  const actionTypes = useMemo(() => {
    const actions = new Set(logs.map(log => log.action).filter(Boolean));
    return Array.from(actions).sort();
  }, [logs]);

  return (
    <div className="audit-log-viewer" style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Audit Log Viewer</h2>
        <button onClick={onClose} style={styles.closeButton}>×</button>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button 
          style={{ ...styles.tab, ...(activeTab === 'logs' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('logs')}
        >
          Audit Logs ({logs.length})
        </button>
        {showSummary && (
          <button 
            style={{ ...styles.tab, ...(activeTab === 'summary' ? styles.activeTab : {}) }}
            onClick={() => {
              setActiveTab('summary');
              if (!summary) fetchSummary('week');
            }}
          >
            Summary
          </button>
        )}
        <button 
          style={{ ...styles.tab, ...(activeTab === 'settings' ? styles.activeTab : {}) }}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div style={styles.error}>
          <span>{error}</span>
          <button onClick={clearError} style={styles.errorClose}>×</button>
        </div>
      )}

      {/* Content */}
      {activeTab === 'logs' && (
        <>
          {/* Filters */}
          <div style={styles.filterBar}>
            <input
              type="text"
              placeholder="Search logs..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              style={styles.searchInput}
            />
            
            <select
              value={filters.entityType}
              onChange={(e) => handleFilterChange('entityType', e.target.value)}
              style={styles.select}
            >
              <option value="">All Entities</option>
              {entityTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              style={styles.select}
            >
              <option value="">All Actions</option>
              {actionTypes.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>

            <select
              value={filters.severity}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
              style={styles.select}
            >
              <option value="">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>

            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              style={styles.dateInput}
              placeholder="Start Date"
            />

            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              style={styles.dateInput}
              placeholder="End Date"
            />

            <button onClick={applyFilters} style={styles.filterButton}>
              Apply
            </button>
            <button onClick={clearFilters} style={styles.clearButton}>
              Clear
            </button>
          </div>

          {/* Logs Table */}
          <div style={{ ...styles.tableContainer, maxHeight }}>
            {isLoading ? (
              <div style={styles.loading}>Loading audit logs...</div>
            ) : logs.length === 0 ? (
              <div style={styles.empty}>No audit logs found</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Timestamp</th>
                    <th style={styles.th}>Action</th>
                    <th style={styles.th}>Entity</th>
                    <th style={styles.th}>Details</th>
                    <th style={styles.th}>Severity</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr 
                      key={log.id} 
                      style={styles.tr}
                      onClick={() => setSelectedLog(log)}
                    >
                      <td style={styles.td}>{formatTimestamp(log.created_at)}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.actionBadge,
                          borderLeft: `3px solid ${getActionCategory(log.action)}`
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.entityInfo}>
                          <span style={styles.entityType}>{log.entity_type}</span>
                          {log.entity_id && (
                            <span style={styles.entityId}>#{log.entity_id}</span>
                          )}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.details} title={log.details}>
                          {log.details?.substring(0, 50)}
                          {log.details?.length > 50 ? '...' : ''}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.severityBadge,
                          backgroundColor: getSeverityBadge(log.severity).bg,
                          color: getSeverityBadge(log.severity).text
                        }}>
                          {log.severity}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button 
                          style={styles.viewButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {activeTab === 'summary' && summary && (
        <div style={styles.summaryContainer}>
          {/* Period Info */}
          <div style={styles.summaryPeriod}>
            Period: {summary.period.start} to {summary.period.end}
          </div>

          {/* Stats Cards */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{summary.total}</div>
              <div style={styles.statLabel}>Total Events</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{summary.criticalEvents}</div>
              <div style={styles.statLabel}>Critical Events</div>
            </div>
          </div>

          {/* By Action */}
          <div style={styles.summarySection}>
            <h4 style={styles.summaryTitle}>By Action</h4>
            <div style={styles.summaryBars}>
              {summary.byAction?.map((item, index) => (
                <div key={index} style={styles.barRow}>
                  <span style={styles.barLabel}>{item.action}</span>
                  <div style={styles.barContainer}>
                    <div 
                      style={{
                        ...styles.bar,
                        width: `${Math.min((item.count / summary.total) * 100, 100)}%`
                      }}
                    />
                  </div>
                  <span style={styles.barValue}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* By Entity */}
          <div style={styles.summarySection}>
            <h4 style={styles.summaryTitle}>Top Entity Types</h4>
            <div style={styles.summaryBars}>
              {summary.byEntity?.map((item, index) => (
                <div key={index} style={styles.barRow}>
                  <span style={styles.barLabel}>{item.entity_type}</span>
                  <div style={styles.barContainer}>
                    <div 
                      style={{
                        ...styles.bar,
                        width: `${Math.min((item.count / summary.total) * 100, 100)}%`,
                        backgroundColor: '#3b82f6'
                      }}
                    />
                  </div>
                  <span style={styles.barValue}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* By Severity */}
          <div style={styles.summarySection}>
            <h4 style={styles.summaryTitle}>By Severity</h4>
            <div style={styles.severityGrid}>
              {summary.bySeverity?.map((item, index) => (
                <div 
                  key={index} 
                  style={{
                    ...styles.severityCard,
                    borderColor: getSeverityBadge(item.severity).text
                  }}
                >
                  <div 
                    style={{
                      ...styles.severityDot,
                      backgroundColor: getSeverityBadge(item.severity).text
                    }}
                  />
                  <span style={styles.severityLabel}>{item.severity}</span>
                  <span style={styles.severityCount}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div style={styles.settingsContainer}>
          <h4 style={styles.settingsTitle}>Audit Log Settings</h4>
          
          <div style={styles.settingsSection}>
            <h5 style={styles.settingsSubtitle}>Cleanup Old Logs</h5>
            <p style={styles.settingsDescription}>
              Remove audit logs older than a specified number of days to manage database size.
            </p>
            
            <div style={styles.settingsRow}>
              <label style={styles.settingsLabel}>Keep logs for (days):</label>
              <input
                type="number"
                value={cleanupDays}
                onChange={(e) => setCleanupDays(Math.max(30, parseInt(e.target.value) || 365))}
                style={styles.numberInput}
                min="30"
              />
            </div>
            
            <button 
              style={styles.dangerButton}
              onClick={() => setShowCleanupConfirm(true)}
            >
              Clean Up Old Logs
            </button>
          </div>

          <div style={styles.settingsSection}>
            <h5 style={styles.settingsSubtitle}>Log an Event</h5>
            <p style={styles.settingsDescription}>
              Manually log an audit event for testing or recording important actions.
            </p>
            
            <button 
              style={styles.primaryButton}
              onClick={() => {
                logAudit({
                  action: 'MANUAL',
                  entityType: 'test',
                  entityId: Date.now(),
                  details: 'Manual audit log entry for testing',
                  severity: 'low'
                }).then(success => {
                  if (success) {
                    refresh(filters);
                  }
                });
              }}
            >
              Create Test Log Entry
            </button>
          </div>
        </div>
      )}

      {/* Selected Log Detail Modal */}
      {selectedLog && (
        <div style={styles.modalOverlay} onClick={() => setSelectedLog(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Audit Log Details</h3>
              <button onClick={() => setSelectedLog(null)} style={styles.modalClose}>×</button>
            </div>
            
            <div style={styles.modalContent}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>ID:</span>
                <span style={styles.detailValue}>{selectedLog.id}</span>
              </div>
              
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Timestamp:</span>
                <span style={styles.detailValue}>{formatTimestamp(selectedLog.created_at)}</span>
              </div>
              
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Action:</span>
                <span style={{
                  ...styles.actionBadge,
                  borderLeft: `3px solid ${getActionCategory(selectedLog.action)}`
                }}>
                  {selectedLog.action}
                </span>
              </div>
              
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Entity:</span>
                <span style={styles.detailValue}>
                  {selectedLog.entity_type} 
                  {selectedLog.entity_id && ` #${selectedLog.entity_id}`}
                </span>
              </div>
              
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>User ID:</span>
                <span style={styles.detailValue}>{selectedLog.user_id || 'N/A'}</span>
              </div>
              
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>IP Address:</span>
                <span style={styles.detailValue}>{selectedLog.ip_address || 'N/A'}</span>
              </div>
              
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Severity:</span>
                <span style={{
                  ...styles.severityBadge,
                  backgroundColor: getSeverityBadge(selectedLog.severity).bg,
                  color: getSeverityBadge(selectedLog.severity).text
                }}>
                  {selectedLog.severity}
                </span>
              </div>
              
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Details:</span>
                <span style={styles.detailValue}>{selectedLog.details}</span>
              </div>
              
              {selectedLog.old_values && (
                <div style={styles.detailSection}>
                  <span style={styles.detailLabel}>Old Values:</span>
                  <pre style={styles.jsonBlock}>
                    {JSON.stringify(JSON.parse(selectedLog.old_values), null, 2)}
                  </pre>
                </div>
              )}
              
              {selectedLog.new_values && (
                <div style={styles.detailSection}>
                  <span style={styles.detailLabel}>New Values:</span>
                  <pre style={styles.jsonBlock}>
                    {JSON.stringify(JSON.parse(selectedLog.new_values), null, 2)}
                  </pre>
                </div>
              )}
              
              {selectedLog.metadata && (
                <div style={styles.detailSection}>
                  <span style={styles.detailLabel}>Metadata:</span>
                  <pre style={styles.jsonBlock}>
                    {JSON.stringify(JSON.parse(selectedLog.metadata), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cleanup Confirmation Modal */}
      {showCleanupConfirm && (
        <div style={styles.modalOverlay} onClick={() => setShowCleanupConfirm(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Confirm Cleanup</h3>
              <button onClick={() => setShowCleanupConfirm(false)} style={styles.modalClose}>×</button>
            </div>
            
            <div style={styles.modalContent}>
              <p style={styles.confirmText}>
                Are you sure you want to delete all audit logs older than {cleanupDays} days?
                This action cannot be undone.
              </p>
              
              <div style={styles.modalActions}>
                <button 
                  style={styles.cancelButton}
                  onClick={() => setShowCleanupConfirm(false)}
                >
                  Cancel
                </button>
                <button 
                  style={styles.confirmButton}
                  onClick={handleCleanup}
                >
                  Delete Logs
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const styles = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '0 8px'
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb'
  },
  tab: {
    padding: '12px 20px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#6b7280',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s'
  },
  activeTab: {
    color: '#3b82f6',
    borderBottomColor: '#3b82f6'
  },
  error: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: '#fef2f2',
    borderBottom: '1px solid #fee2e2',
    color: '#dc2626',
    fontSize: '14px'
  },
  errorClose: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#dc2626'
  },
  filterBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#ffffff'
  },
  searchInput: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    minWidth: '200px',
    outline: 'none'
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#ffffff'
  },
  dateInput: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none'
  },
  filterButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  clearButton: {
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  tableContainer: {
    overflow: 'auto',
    maxHeight: '500px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px'
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: 600,
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    position: 'sticky',
    top: 0,
    whiteSpace: 'nowrap'
  },
  tr: {
    borderBottom: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'background-color 0.15s'
  },
  td: {
    padding: '12px 16px',
    color: '#374151',
    verticalAlign: 'middle'
  },
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280'
  },
  empty: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280'
  },
  actionBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500
  },
  entityInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  entityType: {
    fontWeight: 500
  },
  entityId: {
    fontSize: '12px',
    color: '#6b7280'
  },
  details: {
    fontSize: '13px',
    color: '#6b7280',
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  severityBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
    textTransform: 'capitalize'
  },
  viewButton: {
    padding: '4px 12px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  summaryContainer: {
    padding: '20px'
  },
  summaryPeriod: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '16px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    textAlign: 'center'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#111827'
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '4px'
  },
  summarySection: {
    marginBottom: '24px'
  },
  summaryTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '12px'
  },
  summaryBars: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  barRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  barLabel: {
    width: '150px',
    fontSize: '13px',
    color: '#374151',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  barContainer: {
    flex: 1,
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  bar: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: '4px',
    transition: 'width 0.3s'
  },
  barValue: {
    width: '40px',
    textAlign: 'right',
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151'
  },
  severityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '12px'
  },
  severityCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    borderLeft: '3px solid'
  },
  severityDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  severityLabel: {
    flex: 1,
    fontSize: '13px',
    color: '#374151',
    textTransform: 'capitalize'
  },
  severityCount: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827'
  },
  settingsContainer: {
    padding: '20px'
  },
  settingsTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '20px'
  },
  settingsSection: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '16px'
  },
  settingsSubtitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '8px'
  },
  settingsDescription: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '16px'
  },
  settingsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px'
  },
  settingsLabel: {
    fontSize: '14px',
    color: '#374151'
  },
  numberInput: {
    width: '100px',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px'
  },
  primaryButton: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  dangerButton: {
    padding: '10px 20px',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb'
  },
  modalTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827'
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280'
  },
  modalContent: {
    padding: '20px'
  },
  detailRow: {
    display: 'flex',
    marginBottom: '12px'
  },
  detailLabel: {
    width: '120px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#6b7280',
    flexShrink: 0
  },
  detailValue: {
    flex: 1,
    fontSize: '14px',
    color: '#111827'
  },
  detailSection: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb'
  },
  jsonBlock: {
    margin: '8px 0',
    padding: '12px',
    backgroundColor: '#f3f4f6',
    borderRadius: '6px',
    fontSize: '12px',
    overflow: 'auto',
    maxHeight: '200px'
  },
  confirmText: {
    fontSize: '14px',
    color: '#374151',
    marginBottom: '20px'
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px'
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  confirmButton: {
    padding: '10px 20px',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  }
};

export default AuditLogViewer;
