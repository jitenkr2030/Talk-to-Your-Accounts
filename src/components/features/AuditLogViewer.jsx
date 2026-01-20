import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  Calendar,
  ChevronDown,
  User,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Eye,
  MoreHorizontal,
  History
} from 'lucide-react';
import api from '../../utils/api';

const AuditLogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    action: '',
    entityType: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [period, setPeriod] = useState('week');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.audit.getTrail({
        ...filters,
        limit: 100
      });
      setLogs(data);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await api.audit.getSummary(period);
      setSummary(data);
    } catch (error) {
      console.error('Failed to fetch audit summary:', error);
    }
  }, [period]);

  useEffect(() => {
    fetchLogs();
    fetchSummary();
  }, [fetchLogs, fetchSummary]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchLogs();
      return;
    }
    setLoading(true);
    try {
      const data = await api.audit.search(searchQuery, filters);
      setLogs(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await api.caMode.exportForCA();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getActionIcon = (action) => {
    if (action.includes('CREATE') || action.includes('ADD')) {
      return <ArrowUpRight size={14} className="text-emerald-400" />;
    }
    if (action.includes('DELETE') || action.includes('CANCEL')) {
      return <ArrowDownRight size={14} className="text-red-400" />;
    }
    if (action.includes('UPDATE') || action.includes('MODIFY')) {
      return <MoreHorizontal size={14} className="text-amber-400" />;
    }
    if (action.includes('LOGIN') || action.includes('LOGOUT')) {
      return <User size={14} className="text-blue-400" />;
    }
    return <FileText size={14} className="text-slate-400" />;
  };

  const getActionColor = (action) => {
    if (action.includes('CREATE') || action.includes('ADD')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    if (action.includes('DELETE') || action.includes('CANCEL') || action.includes('SECURITY')) {
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    }
    if (action.includes('UPDATE') || action.includes('MODIFY')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
    if (action.includes('LOGIN') || action.includes('LOGOUT')) {
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
    return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short'
    });
  };

  const uniqueActions = [...new Set(logs.map(l => l.action))];
  const uniqueEntities = [...new Set(logs.map(l => l.entity_type))];

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <History size={20} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Audit Trail</h2>
            <p className="text-xs text-slate-400">
              Track all system activities and changes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
          >
            <Download size={14} />
            Export
          </button>
          <button
            onClick={fetchLogs}
            className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-4 gap-px bg-slate-800">
          <div className="bg-slate-900 p-3 text-center">
            <div className="text-2xl font-bold text-white">{summary.total_actions}</div>
            <div className="text-xs text-slate-400">Total Activities</div>
          </div>
          {summary.by_action?.slice(0, 3).map((item, i) => (
            <div key={i} className="bg-slate-900 p-3 text-center">
              <div className="text-2xl font-bold text-emerald-400">{item.count}</div>
              <div className="text-xs text-slate-400 capitalize">{item.action.toLowerCase()}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search and Filters */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search audit logs..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              showFilters
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Filter size={16} />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-4 gap-3 p-3 bg-slate-800/50 rounded-lg">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Action Type</label>
              <select
                value={filters.action}
                onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Actions</option>
                {uniqueActions.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Entity Type</label>
              <select
                value={filters.entityType}
                onChange={(e) => setFilters(prev => ({ ...prev, entityType: e.target.value }))}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Entities</option>
                {uniqueEntities.map(entity => (
                  <option key={entity} value={entity}>{entity}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="max-h-96 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <FileText size={48} className="mb-4 text-slate-600" />
            <p className="text-lg font-medium text-slate-400">No audit logs found</p>
            <p className="text-sm text-slate-500 mt-1">
              {filters.startDate || filters.action ? 'Try adjusting your filters' : 'Activity will appear here'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 bg-slate-800/50 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Timestamp</th>
                <th className="text-left px-4 py-2 font-medium">Action</th>
                <th className="text-left px-4 py-2 font-medium">Entity</th>
                <th className="text-left px-4 py-2 font-medium">User</th>
                <th className="text-left px-4 py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {logs.map(log => (
                <tr
                  key={log.id}
                  className="hover:bg-slate-800/30 cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar size={12} className="text-slate-500" />
                      {formatDate(log.created_at)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getActionColor(log.action)}`}>
                      {getActionIcon(log.action)}
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {log.entity_type}
                    {log.entity_id && <span className="text-slate-500 ml-1">#{log.entity_id}</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    <div className="flex items-center gap-2">
                      <User size={12} className="text-slate-500" />
                      {log.user || 'System'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 truncate max-w-xs">
                    {log.details || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg bg-slate-900 rounded-xl border border-slate-700 shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Audit Log Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <span className="text-slate-400 text-lg">&times;</span>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Action</label>
                  <p className="text-white font-medium">{selectedLog.action}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Timestamp</label>
                  <p className="text-white">{formatDate(selectedLog.created_at)}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Entity Type</label>
                  <p className="text-white">{selectedLog.entity_type}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Entity ID</label>
                  <p className="text-white">{selectedLog.entity_id || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">User</label>
                  <p className="text-white">{selectedLog.user || 'System'}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">IP Address</label>
                  <p className="text-white">{selectedLog.ip_address || 'N/A'}</p>
                </div>
              </div>
              {selectedLog.old_values && (
                <div>
                  <label className="text-xs text-slate-500">Old Values</label>
                  <pre className="mt-1 p-2 bg-slate-800 rounded-lg text-xs text-slate-300 overflow-x-auto">
                    {JSON.stringify(JSON.parse(selectedLog.old_values), null, 2)}
                  </pre>
                </div>
              )}
              {selectedLog.new_values && (
                <div>
                  <label className="text-xs text-slate-500">New Values</label>
                  <pre className="mt-1 p-2 bg-slate-800 rounded-lg text-xs text-slate-300 overflow-x-auto">
                    {JSON.stringify(JSON.parse(selectedLog.new_values), null, 2)}
                  </pre>
                </div>
              )}
              <div>
                <label className="text-xs text-slate-500">Details</label>
                <p className="text-slate-300">{selectedLog.details || 'No additional details'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogViewer;
