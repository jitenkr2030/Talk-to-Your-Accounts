/**
 * Error Recovery Panel Component
 * 
 * UI component for managing failed sync operations, dead letter queue,
 * and reconciliation issues. Provides user-friendly error messages and
 * retry capabilities.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useIntegration } from '../../integrations/hooks/useIntegration';

// Icons (SVG components)
const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const WarningIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// Default user ID for single-user desktop app
const DEFAULT_USER_ID = 1;

/**
 * Error Recovery Panel Component
 */
export function ErrorRecoveryPanel({ provider = null, onClose }) {
  const { error } = useIntegration();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [deadLetterQueue, setDeadLetterQueue] = useState([]);
  const [syncHistory, setSyncHistory] = useState([]);
  const [reconciliationIssues, setReconciliationIssues] = useState([]);
  const [operationStats, setOperationStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());
  
  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, [provider]);
  
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadDeadLetterQueue(),
        loadSyncHistory(),
        loadReconciliationIssues(),
        loadOperationStats()
      ]);
    } catch (err) {
      console.error('Failed to load error recovery data:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadDeadLetterQueue = async () => {
    if (!window.api?.integrations) return;
    
    try {
      const result = await window.api.integrations.getDeadLetterQueue({
        userId: DEFAULT_USER_ID,
        provider,
        limit: 50
      });
      
      if (result.success) {
        setDeadLetterQueue(result.items || []);
      }
    } catch (err) {
      console.error('Failed to load DLQ:', err);
    }
  };
  
  const loadSyncHistory = async () => {
    if (!window.api?.integrations) return;
    
    try {
      const result = await window.api.integrations.getSyncHistoryEnhanced(
        DEFAULT_USER_ID,
        provider,
        20
      );
      
      if (result.success) {
        setSyncHistory(result.history || []);
      }
    } catch (err) {
      console.error('Failed to load sync history:', err);
    }
  };
  
  const loadReconciliationIssues = async () => {
    if (!window.api?.integrations || !provider) return;
    
    try {
      const result = await window.api.integrations.checkReconciliation(
        DEFAULT_USER_ID,
        provider,
        'all'
      );
      
      if (result.success) {
        setReconciliationIssues(result.issues || []);
      }
    } catch (err) {
      console.error('Failed to load reconciliation issues:', err);
    }
  };
  
  const loadOperationStats = async () => {
    if (!window.api?.integrations) return;
    
    try {
      const result = await window.api.integrations.getOperationStats(
        DEFAULT_USER_ID,
        provider
      );
      
      if (result.success) {
        setOperationStats(result.stats);
      }
    } catch (err) {
      console.error('Failed to load operation stats:', err);
    }
  };
  
  const handleRetryItem = async (dlqId) => {
    if (!window.api?.integrations) return;
    
    try {
      const result = await window.api.integrations.retryDlqItem(dlqId);
      
      if (result.success) {
        await loadDeadLetterQueue();
        await loadSyncHistory();
      } else {
        alert(`Retry failed: ${result.error?.userMessage || result.error}`);
      }
    } catch (err) {
      alert(`Retry failed: ${err.message}`);
    }
  };
  
  const handleResolveItem = async (dlqId, resolution) => {
    if (!window.api?.integrations) return;
    
    try {
      const result = await window.api.integrations.resolveDlqItem(dlqId, resolution);
      
      if (result.success) {
        await loadDeadLetterQueue();
      } else {
        alert(`Resolve failed: ${result.error?.userMessage || result.error}`);
      }
    } catch (err) {
      alert(`Resolve failed: ${err.message}`);
    }
  };
  
  const handleClearQueue = async () => {
    if (!window.api?.integrations || !provider) return;
    
    if (!confirm('Are you sure you want to clear all failed items? This action cannot be undone.')) {
      return;
    }
    
    try {
      const result = await window.api.integrations.clearDeadLetterQueue(DEFAULT_USER_ID, provider);
      
      if (result.success) {
        await loadDeadLetterQueue();
      } else {
        alert(`Clear failed: ${result.error?.userMessage || result.error}`);
      }
    } catch (err) {
      alert(`Clear failed: ${err.message}`);
    }
  };
  
  const toggleExpanded = (id) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };
  
  const getSeverityClass = (severity) => {
    const classes = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      error: 'bg-red-50 text-red-700 border-red-200',
      warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      info: 'bg-blue-50 text-blue-700 border-blue-200'
    };
    return classes[severity] || classes.info;
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  const getStatusBadge = (status) => {
    const badges = {
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      running: 'bg-blue-100 text-blue-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[status] || 'bg-gray-100 text-gray-800'}`}>
        {status?.charAt(0).toUpperCase() + (status?.slice(1) || 'Unknown')}
      </span>
    );
  };
  
  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading error recovery data...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Error Recovery & Sync Status</h2>
          <p className="text-sm text-gray-500">Manage failed operations and view sync history</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAllData}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshIcon />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <XIcon />
            </button>
          )}
        </div>
      </div>
      
      {/* Stats Summary */}
      {operationStats && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{operationStats.total}</div>
              <div className="text-sm text-gray-500">Total Operations</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-green-600">{operationStats.completed}</div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-red-600">{operationStats.failed}</div>
              <div className="text-sm text-gray-500">Failed</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-blue-600">{operationStats.successRate}%</div>
              <div className="text-sm text-gray-500">Success Rate</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('dead-letter')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'dead-letter'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Failed Items
            {deadLetterQueue.length > 0 && (
              <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">
                {deadLetterQueue.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Sync History
          </button>
          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'reconciliation'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Reconciliation
            {reconciliationIssues.length > 0 && (
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                {reconciliationIssues.length}
              </span>
            )}
          </button>
        </nav>
      </div>
      
      {/* Content */}
      <div className="p-6 max-h-96 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg border ${getSeverityClass('warning')}`}>
                <div className="flex items-center gap-3">
                  <AlertIcon />
                  <div>
                    <div className="font-medium">Failed Operations</div>
                    <div className="text-2xl font-bold">{operationStats?.failed || 0}</div>
                  </div>
                </div>
              </div>
              <div className={`p-4 rounded-lg border ${getSeverityClass('error')}`}>
                <div className="flex items-center gap-3">
                  <WarningIcon />
                  <div>
                    <div className="font-medium">Dead Letter Queue</div>
                    <div className="text-2xl font-bold">{deadLetterQueue.length}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Reconciliation Summary */}
            {reconciliationIssues.length > 0 && (
              <div className={`p-4 rounded-lg border ${getSeverityClass('warning')}`}>
                <div className="font-medium mb-2">Reconciliation Issues Detected</div>
                <div className="text-sm">
                  {reconciliationIssues.length} issue(s) found that may need your attention.
                </div>
                <button
                  onClick={() => setActiveTab('reconciliation')}
                  className="mt-2 text-sm font-medium underline"
                >
                  View Issues →
                </button>
              </div>
            )}
            
            {/* Recent Failed Syncs */}
            {syncHistory.filter(h => h.status === 'failed').length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Recent Failed Syncs</h4>
                <div className="space-y-2">
                  {syncHistory.filter(h => h.status === 'failed').slice(0, 3).map((item, index) => (
                    <div
                      key={item.id || index}
                      className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                    >
                      <div>
                        <div className="font-medium text-red-800">{item.provider}</div>
                        <div className="text-sm text-red-600">
                          {formatDate(item.started_at)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-red-700">
                          {item.errors_count || 0} errors
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'dead-letter' && (
          <div>
            {deadLetterQueue.length === 0 ? (
              <div className="text-center py-8">
                <CheckIcon />
                <div className="mt-2 text-gray-600">No failed items in queue</div>
                <div className="text-sm text-gray-500">All operations completed successfully</div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm text-gray-500">
                    {deadLetterQueue.length} item(s) awaiting action
                  </div>
                  <button
                    onClick={handleClearQueue}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <TrashIcon />
                    Clear All
                  </button>
                </div>
                <div className="space-y-3">
                  {deadLetterQueue.map((item, index) => (
                    <DLQItem
                      key={item.id || index}
                      item={item}
                      isExpanded={expandedItems.has(item.id)}
                      onToggle={() => toggleExpanded(item.id)}
                      onRetry={() => handleRetryItem(item.id)}
                      onResolve={(resolution) => handleResolveItem(item.id, resolution)}
                      getSeverityClass={getSeverityClass}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        
        {activeTab === 'history' && (
          <div>
            {syncHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No sync history available
              </div>
            ) : (
              <div className="space-y-3">
                {syncHistory.map((item, index) => (
                  <SyncHistoryItem
                    key={item.id || index}
                    item={item}
                    isExpanded={expandedItems.has(item.id)}
                    onToggle={() => toggleExpanded(item.id)}
                    getSeverityClass={getSeverityClass}
                    formatDate={formatDate}
                    getStatusBadge={getStatusBadge}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'reconciliation' && (
          <div>
            {reconciliationIssues.length === 0 ? (
              <div className="text-center py-8">
                <CheckIcon />
                <div className="mt-2 text-gray-600">No reconciliation issues</div>
                <div className="text-sm text-gray-500">All entities are in sync</div>
              </div>
            ) : (
              <div className="space-y-3">
                {reconciliationIssues.map((issue, index) => (
                  <ReconciliationIssue
                    key={index}
                    issue={issue}
                    getSeverityClass={getSeverityClass}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Dead Letter Queue Item Component
 */
function DLQItem({ item, isExpanded, onToggle, onRetry, onResolve, getSeverityClass, formatDate }) {
  const [resolution, setResolution] = useState('manual');
  
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          <div>
            <div className="font-medium text-gray-900">
              {item.provider} - {item.operation_type}
            </div>
            <div className="text-sm text-gray-500">
              Failed {formatDate(item.first_failure_at)} • {item.retry_count} retries
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs rounded-full ${getSeverityClass('error')}`}>
            Failed
          </span>
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-200">
          {/* Error Details */}
          <div className="mt-3 p-3 bg-red-50 rounded-lg">
            <div className="text-sm font-medium text-red-800">Error</div>
            <div className="text-sm text-red-700 mt-1">
              {item.formattedError?.title || item.error_message || 'Unknown error'}
            </div>
            {item.formattedError?.troubleshooting && (
              <div className="mt-2">
                <div className="text-xs font-medium text-red-600">Suggested Actions:</div>
                <ul className="mt-1 text-xs text-red-600 list-disc list-inside">
                  {item.formattedError.troubleshooting.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {/* Payload Preview */}
          <div className="mt-3">
            <div className="text-xs font-medium text-gray-500 mb-1">Payload:</div>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
              {JSON.stringify(item.payload, null, 2)}
            </pre>
          </div>
          
          {/* Actions */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={onRetry}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshIcon />
              Retry
            </button>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg"
            >
              <option value="manual">Mark as Resolved (Manual)</option>
              <option value="skipped">Skip</option>
              <option value="ignored">Ignore Future Errors</option>
            </select>
            <button
              onClick={() => onResolve(resolution)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Apply Resolution
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Sync History Item Component
 */
function SyncHistoryItem({ item, isExpanded, onToggle, getSeverityClass, formatDate, getStatusBadge }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          <div>
            <div className="font-medium text-gray-900">{item.provider}</div>
            <div className="text-sm text-gray-500">
              {formatDate(item.started_at)} • {item.sync_type}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            {item.records_processed || 0} records
          </div>
          {getStatusBadge(item.status)}
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 mt-3">
            <div>
              <div className="text-xs text-gray-500">Records Processed</div>
              <div className="font-medium">{item.records_processed || 0}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Errors</div>
              <div className="font-medium text-red-600">{item.errors_count || 0}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Duration</div>
              <div className="font-medium">
                {item.completed_at
                  ? `${Math.round((new Date(item.completed_at) - new Date(item.started_at)) / 1000)}s`
                  : 'In Progress'}
              </div>
            </div>
          </div>
          
          {/* Error Details */}
          {item.status === 'failed' && item.error_details && (
            <div className="mt-3 p-3 bg-red-50 rounded-lg">
              <div className="text-sm font-medium text-red-800">Error Details</div>
              <pre className="mt-1 text-xs text-red-700 overflow-x-auto">
                {typeof item.error_details === 'string'
                  ? item.error_details
                  : JSON.stringify(item.error_details, null, 2)}
              </pre>
            </div>
          )}
          
          {/* Formatted Error */}
          {item.formattedError && (
            <div className={`mt-3 p-3 rounded-lg border ${getSeverityClass('error')}`}>
              <div className="text-sm font-medium">{item.formattedError.title}</div>
              {item.formattedError.troubleshooting && (
                <ul className="mt-2 text-xs list-disc list-inside">
                  {item.formattedError.troubleshooting.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Reconciliation Issue Component
 */
function ReconciliationIssue({ issue, getSeverityClass }) {
  return (
    <div className={`p-4 rounded-lg border ${getSeverityClass('warning')}`}>
      <div className="flex items-start gap-3">
        <WarningIcon />
        <div className="flex-1">
          <div className="font-medium">{issue.title || issue.type}</div>
          <div className="text-sm mt-1">{issue.description}</div>
          {issue.suggestion && (
            <div className="mt-2 text-sm">
              <span className="font-medium">Suggestion: </span>
              {issue.suggestion}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ErrorRecoveryPanel;
