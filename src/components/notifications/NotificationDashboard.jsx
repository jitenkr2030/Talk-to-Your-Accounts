/**
 * Notification Dashboard Component
 * Main UI for managing notifications and alert configurations
 */

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Check, 
  X, 
  Settings, 
  Plus, 
  Trash2,
  RefreshCw,
  Filter,
  Clock,
  CheckCircle,
  Warning
} from 'lucide-react';
import useNotifications from '../../hooks/useNotifications';

const NotificationDashboard = () => {
  const {
    notifications,
    unreadCount,
    alertRules,
    settings,
    loading,
    error,
    markAsRead,
    deleteNotification,
    getAlertRules,
    updateAlertRule,
    toggleAlertRule,
    getSettings,
    updateSettings,
    pollAlerts,
    clearError
  } = useNotifications();

  const [activeTab, setActiveTab] = useState('notifications');
  const [filterType, setFilterType] = useState('all');
  const [showSettings, setShowSettings] = useState(false);

  // Get severity icon based on notification type
  const getSeverityIcon = (type) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle size={18} className="text-amber-500" />;
      case 'error':
        return <AlertCircle size={18} className="text-red-500" />;
      case 'success':
        return <CheckCircle size={18} className="text-green-500" />;
      default:
        return <Info size={18} className="text-blue-500" />;
    }
  };

  // Get severity background color
  const getSeverityBg = (type) => {
    switch (type) {
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/20';
      case 'error':
        return 'bg-red-500/10 border-red-500/20';
      case 'success':
        return 'bg-green-500/10 border-green-500/20';
      default:
        return 'bg-blue-500/10 border-blue-500/20';
    }
  };

  // Format time relative to now
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

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (filterType === 'all') return true;
    if (filterType === 'unread') return !notification.read;
    return notification.type === filterType;
  });

  // Handle mark as read
  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Handle delete notification
  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  // Handle toggle alert rule
  const handleToggleRule = async (ruleId) => {
    try {
      await toggleAlertRule(ruleId);
    } catch (err) {
      console.error('Failed to toggle alert rule:', err);
    }
  };

  // Handle update alert rule
  const handleUpdateRule = async (ruleId, updates) => {
    try {
      await updateAlertRule(ruleId, updates);
    } catch (err) {
      console.error('Failed to update alert rule:', err);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    try {
      await pollAlerts();
    } catch (err) {
      console.error('Failed to poll alerts:', err);
    }
  };

  // Handle settings update
  const handleSettingsUpdate = async (key, value) => {
    try {
      await updateSettings({ [key]: value });
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <Bell size={24} className="text-emerald-400" />
          <div>
            <h1 className="text-xl font-semibold text-white">Notifications & Alerts</h1>
            <p className="text-sm text-slate-400">Manage your notifications and alert preferences</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showSettings 
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                : 'bg-slate-700 hover:bg-slate-600 text-white'
            }`}
          >
            <Settings size={16} />
            Settings
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={clearError} className="text-red-400 hover:text-red-300">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Settings Panel */}
        {showSettings && (
          <div className="w-80 bg-slate-800 border-r border-slate-700 overflow-y-auto">
            <div className="p-4">
              <h2 className="text-lg font-semibold text-white mb-4">Notification Settings</h2>
              
              {settings && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-medium">Email Notifications</span>
                      <button
                        onClick={() => handleSettingsUpdate('emailEnabled', !settings.emailEnabled)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          settings.emailEnabled ? 'bg-emerald-500' : 'bg-slate-600'
                        }`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          settings.emailEnabled ? 'left-7' : 'left-1'
                        }`} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">Receive notifications via email</p>
                  </div>

                  <div className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-medium">Desktop Notifications</span>
                      <button
                        onClick={() => handleSettingsUpdate('desktopEnabled', !settings.desktopEnabled)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          settings.desktopEnabled ? 'bg-emerald-500' : 'bg-slate-600'
                        }`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          settings.desktopEnabled ? 'left-7' : 'left-1'
                        }`} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">Show desktop push notifications</p>
                  </div>

                  <div className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-medium">Sound Alerts</span>
                      <button
                        onClick={() => handleSettingsUpdate('soundEnabled', !settings.soundEnabled)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          settings.soundEnabled ? 'bg-emerald-500' : 'bg-slate-600'
                        }`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          settings.soundEnabled ? 'left-7' : 'left-1'
                        }`} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">Play sound for important alerts</p>
                  </div>

                  <div className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-medium">Daily Digest</span>
                      <button
                        onClick={() => handleSettingsUpdate('dailyDigest', !settings.dailyDigest)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          settings.dailyDigest ? 'bg-emerald-500' : 'bg-slate-600'
                        }`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          settings.dailyDigest ? 'left-7' : 'left-1'
                        }`} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">Receive daily summary of notifications</p>
                  </div>

                  <div className="p-4 bg-slate-700/50 rounded-lg">
                    <label className="text-white font-medium block mb-2">Alert Frequency</label>
                    <select
                      value={settings.alertFrequency || 'immediate'}
                      onChange={(e) => handleSettingsUpdate('alertFrequency', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-600 text-white rounded-lg border border-slate-500 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="immediate">Immediate</option>
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                    <p className="text-xs text-slate-400 mt-2">How often to check for new alerts</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center gap-1 px-6 py-3 bg-slate-800/50 border-b border-slate-700">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'notifications'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Bell size={16} className="inline-block mr-2" />
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'rules'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <AlertTriangle size={16} className="inline-block mr-2" />
              Alert Rules
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between px-6 py-3 bg-slate-800/30 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 bg-slate-700 text-white text-sm rounded-lg border border-slate-600 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Notifications</option>
                <option value="unread">Unread</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="success">Success</option>
              </select>
            </div>
            <span className="text-sm text-slate-400">
              {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'notifications' ? (
              // Notifications List
              filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <Bell size={48} className="mb-4 opacity-50" />
                  <p className="text-lg">No notifications</p>
                  <p className="text-sm">You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-slate-800/30 transition-colors ${getSeverityBg(notification.type)}`}
                    >
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 mt-1">
                          {getSeverityIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className={`font-medium ${
                                notification.read ? 'text-slate-400' : 'text-white'
                              }`}>
                                {notification.title}
                              </h3>
                              <p className="text-sm text-slate-400 mt-1">
                                {notification.message}
                              </p>
                              {notification.actionUrl && (
                                <a
                                  href={notification.actionUrl}
                                  className="inline-block mt-2 text-sm text-emerald-400 hover:text-emerald-300"
                                >
                                  View Details →
                                </a>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Clock size={12} />
                                {formatTime(notification.createdAt)}
                              </span>
                              <div className="flex items-center gap-1">
                                {!notification.read && (
                                  <button
                                    onClick={() => handleMarkAsRead(notification.id)}
                                    className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                                    title="Mark as read"
                                  >
                                    <Check size={14} />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(notification.id)}
                                  className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-red-400"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              // Alert Rules List
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Alert Rules</h2>
                  <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors">
                    <Plus size={16} />
                    Add Rule
                  </button>
                </div>

                {alertRules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <AlertTriangle size={48} className="mb-4 opacity-50" />
                    <p className="text-lg">No alert rules configured</p>
                    <p className="text-sm">Create rules to get notified about important events</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alertRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="p-4 bg-slate-800/50 rounded-lg border border-slate-700"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleToggleRule(rule.id)}
                              className={`relative w-12 h-6 rounded-full transition-colors ${
                                rule.enabled ? 'bg-emerald-500' : 'bg-slate-600'
                              }`}
                            >
                              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                rule.enabled ? 'left-7' : 'left-1'
                              }`} />
                            </button>
                            <div>
                              <h3 className="font-medium text-white">{rule.name}</h3>
                              <p className="text-sm text-slate-400">{rule.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded ${
                              rule.severity === 'high' 
                                ? 'bg-red-500/20 text-red-400'
                                : rule.severity === 'medium'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {rule.severity}
                            </span>
                            <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white">
                              <Settings size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationDashboard;
