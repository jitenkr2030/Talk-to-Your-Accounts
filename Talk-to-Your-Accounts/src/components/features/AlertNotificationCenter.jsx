import React, { useState, useEffect, useCallback } from 'react';
import { Bell, AlertTriangle, AlertCircle, Info, Check, X, Clock, RefreshCw } from 'lucide-react';
import useAppStore from '../../stores/appStore';

const AlertNotificationCenter = ({ isOpen, onClose }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [counts, setCounts] = useState({ unread: 0, bySeverity: {} });
  const { addNotification } = useAppStore();

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await window.api.alerts.get({ limit: 50 });
      setAlerts(response);

      const countData = await window.api.alerts.getCount();
      setCounts(countData);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchAlerts();
    }
  }, [isOpen, fetchAlerts]);

  const handleMarkRead = async (id) => {
    try {
      await window.api.alerts.markRead(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: 1 } : a));
      setCounts(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  const handleDismiss = async (id) => {
    try {
      await window.api.alerts.dismiss(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
      setCounts(prev => ({
        ...prev,
        unread: prev.unread > 0 && alerts.find(a => a.id === id && !a.is_read) ? prev.unread - 1 : prev.unread
      }));
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      await window.api.alerts.clearAll();
      setAlerts([]);
      setCounts({ unread: 0, bySeverity: {} });
      addNotification('success', 'All alerts cleared');
    } catch (error) {
      console.error('Failed to clear alerts:', error);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle size={18} className="text-red-500" />;
      case 'medium':
        return <AlertCircle size={18} className="text-amber-500" />;
      case 'low':
        return <Info size={18} className="text-blue-500" />;
      default:
        return <Bell size={18} className="text-gray-500" />;
    }
  };

  const getSeverityBg = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500/10 border-red-500/20';
      case 'medium':
        return 'bg-amber-500/10 border-amber-500/20';
      case 'low':
        return 'bg-blue-500/10 border-blue-500/20';
      default:
        return 'bg-gray-500/10 border-gray-500/20';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    if (filter === 'unread') return alert.is_read === 0;
    return alert.severity === filter;
  });

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-4">
      <div className="w-96 bg-slate-900 rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Notifications</h2>
            {counts.unread > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                {counts.unread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAlerts}
              className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X size={16} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 px-3 py-2 bg-slate-800/50 border-b border-slate-700">
          {['all', 'unread', 'high', 'medium', 'low'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors capitalize ${
                filter === f
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {f}
              {f !== 'all' && f !== 'unread' && counts.bySeverity[f] && (
                <span className="ml-1 text-slate-500">({counts.bySeverity[f]})</span>
              )}
            </button>
          ))}
        </div>

        {/* Alert List */}
        <div className="max-h-96 overflow-y-auto">
          {filteredAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Bell size={40} className="mb-3 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            filteredAlerts.map(alert => (
              <div
                key={alert.id}
                className={`relative p-3 border-b border-slate-800 hover:bg-slate-800/50 transition-colors ${getSeverityBg(alert.severity)}`}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getSeverityIcon(alert.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`font-medium text-sm ${alert.is_read ? 'text-slate-400' : 'text-white'}`}>
                        {alert.title}
                      </h3>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {formatTime(alert.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {!alert.is_read && (
                        <button
                          onClick={() => handleMarkRead(alert.id)}
                          className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                        >
                          <Check size={12} />
                          Mark read
                        </button>
                      )}
                      <button
                        onClick={() => handleDismiss(alert.id)}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
                      >
                        <X size={12} />
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {alerts.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-t border-slate-700">
            <span className="text-xs text-slate-400">
              {filteredAlerts.length} notification{filteredAlerts.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={handleClearAll}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertNotificationCenter;
