/**
 * Notifications Hook
 * Provides state management and API calls for notifications and alerts
 */

import { useState, useEffect, useCallback } from 'react';

const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [alertRules, setAlertRules] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize notification service
  const initialize = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.notifications.initialize();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get all notifications
  const getNotifications = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      const data = await window.api.notifications.getAll(filters);
      setNotifications(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get unread count
  const getUnreadCount = useCallback(async () => {
    try {
      const count = await window.api.notifications.getUnreadCount();
      setUnreadCount(count);
      return count;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      setLoading(true);
      await window.api.notifications.markRead(notificationId);
      await getNotifications();
      await getUnreadCount();
      return { success: true };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getNotifications, getUnreadCount]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      setLoading(true);
      await window.api.notifications.delete(notificationId);
      await getNotifications();
      await getUnreadCount();
      return { success: true };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getNotifications, getUnreadCount]);

  // Create notification
  const createNotification = useCallback(async (notification) => {
    try {
      setLoading(true);
      const data = await window.api.notifications.create(notification);
      await getNotifications();
      await getUnreadCount();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getNotifications, getUnreadCount]);

  // Get alert rules
  const getAlertRules = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.notifications.getAlertRules();
      setAlertRules(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update alert rule
  const updateAlertRule = useCallback(async (ruleId, updates) => {
    try {
      setLoading(true);
      const data = await window.api.notifications.updateAlertRule(ruleId, updates);
      await getAlertRules();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getAlertRules]);

  // Toggle alert rule
  const toggleAlertRule = useCallback(async (ruleId) => {
    try {
      setLoading(true);
      const data = await window.api.notifications.toggleAlertRule(ruleId);
      await getAlertRules();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getAlertRules]);

  // Get settings
  const getSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.notifications.getSettings();
      setSettings(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update settings
  const updateSettings = useCallback(async (updates) => {
    try {
      setLoading(true);
      const data = await window.api.notifications.updateSettings(updates);
      setSettings(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll alerts
  const pollAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const newAlerts = await window.api.notifications.pollAlerts();
      await getNotifications();
      await getUnreadCount();
      return newAlerts;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getNotifications, getUnreadCount]);

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
          getNotifications({ limit: 50 }),
          getUnreadCount(),
          getAlertRules(),
          getSettings()
        ]);
      } catch (err) {
        console.error('Error loading initial notification data:', err);
      }
    };
    
    loadInitialData();
  }, [initialize, getNotifications, getUnreadCount, getAlertRules, getSettings]);

  return {
    // State
    notifications,
    unreadCount,
    alertRules,
    settings,
    loading,
    error,
    
    // Actions
    initialize,
    getNotifications,
    getUnreadCount,
    markAsRead,
    deleteNotification,
    createNotification,
    getAlertRules,
    updateAlertRule,
    toggleAlertRule,
    getSettings,
    updateSettings,
    pollAlerts,
    clearError
  };
};

export default useNotifications;
