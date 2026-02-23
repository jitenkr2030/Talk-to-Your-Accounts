/**
 * Notification Service - Alerts & Notifications Module
 * Handles notification management, alert rules, and real-time notifications
 */

const fs = require('fs');
const path = require('path');

// Database path
const getDbPath = () => {
  const userDataPath = process.env.APPDATA || process.env.HOME || '.';
  return path.join(userDataPath, 'Talk-to-Your-Accounts', 'notifications.json');
};

// Initialize database structure
const initializeDatabase = () => {
  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  if (!fs.existsSync(dbPath)) {
    const initialData = getDefaultNotificationData();
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
  }
  
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
};

// Get default notification data
const getDefaultNotificationData = () => ({
  notifications: [],
  alertRules: getDefaultAlertRules(),
  settings: {
    enabled: true,
    soundEnabled: true,
    desktopNotifications: true,
    retentionDays: 30
  }
});

// Get default alert rules
const getDefaultAlertRules = () => [
  {
    id: 'rule_gst_filing',
    name: 'GST Filing Warning',
    description: 'Alert when GST filing due date is approaching',
    category: 'compliance',
    severity: 'critical',
    enabled: true,
    config: {
      daysBeforeDue: 3,
      frequency: 'once'
    }
  },
  {
    id: 'rule_low_stock',
    name: 'Low Stock Alert',
    description: 'Alert when inventory falls below threshold',
    category: 'inventory',
    severity: 'warning',
    enabled: true,
    config: {
      threshold: 10,
      frequency: 'daily'
    }
  },
  {
    id: 'rule_invoice_overdue',
    name: 'Invoice Overdue',
    description: 'Alert when invoice payment is overdue',
    category: 'finance',
    severity: 'warning',
    enabled: true,
    config: {
      daysOverdue: 30,
      frequency: 'once'
    }
  },
  {
    id: 'rule_large_transaction',
    name: 'Large Transaction',
    description: 'Alert for unusually large transactions',
    category: 'finance',
    severity: 'info',
    enabled: true,
    config: {
      threshold: 10000,
      currency: 'INR'
    }
  },
  {
    id: 'rule_eway_expiry',
    name: 'E-Way Bill Expiry',
    description: 'Alert when E-Way Bill is about to expire',
    category: 'compliance',
    severity: 'critical',
    enabled: true,
    config: {
      daysBeforeExpiry: 2,
      frequency: 'once'
    }
  },
  {
    id: 'rule_party_statement',
    name: 'Outstanding Statement',
    description: 'Alert for parties with outstanding balances',
    category: 'finance',
    severity: 'info',
    enabled: false,
    config: {
      minOutstanding: 50000,
      frequency: 'weekly'
    }
  }
]);

// Save data to database
const saveData = (data) => {
  const dbPath = getDbPath();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

// Create notification
const createNotification = (notification) => {
  const data = initializeDatabase();
  
  const newNotification = {
    id: `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: notification.title,
    message: notification.message,
    category: notification.category || 'general',
    severity: notification.severity || 'info', // critical, warning, info, success
    isRead: false,
    metadata: notification.metadata || {},
    actionUrl: notification.actionUrl || null,
    createdAt: new Date().toISOString()
  };
  
  data.notifications.unshift(newNotification);
  
  // Keep only last 500 notifications
  if (data.notifications.length > 500) {
    data.notifications = data.notifications.slice(0, 500);
  }
  
  saveData(data);
  
  return newNotification;
};

// Get all notifications
const getNotifications = (filters = {}) => {
  const data = initializeDatabase();
  let notifications = [...data.notifications];
  
  if (filters.unreadOnly) {
    notifications = notifications.filter(n => !n.isRead);
  }
  
  if (filters.category) {
    notifications = notifications.filter(n => n.category === filters.category);
  }
  
  if (filters.severity) {
    notifications = notifications.filter(n => n.severity === filters.severity);
  }
  
  if (filters.limit) {
    notifications = notifications.slice(0, filters.limit);
  }
  
  return notifications;
};

// Get unread count
const getUnreadCount = () => {
  const data = initializeDatabase();
  return data.notifications.filter(n => !n.isRead).length;
};

// Mark notification as read
const markAsRead = (notificationId) => {
  const data = initializeDatabase();
  
  if (notificationId === 'all') {
    data.notifications.forEach(n => { n.isRead = true; });
  } else {
    const notification = data.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
    }
  }
  
  saveData(data);
  
  return { success: true };
};

// Delete notification
const deleteNotification = (notificationId) => {
  const data = initializeDatabase();
  
  if (notificationId === 'all') {
    data.notifications = [];
  } else {
    data.notifications = data.notifications.filter(n => n.id !== notificationId);
  }
  
  saveData(data);
  
  return { success: true };
};

// Get alert rules
const getAlertRules = () => {
  const data = initializeDatabase();
  return data.alertRules;
};

// Update alert rule
const updateAlertRule = (ruleId, updates) => {
  const data = initializeDatabase();
  const ruleIndex = data.alertRules.findIndex(r => r.id === ruleId);
  
  if (ruleIndex === -1) {
    throw new Error('Alert rule not found');
  }
  
  data.alertRules[ruleIndex] = { ...data.alertRules[ruleIndex], ...updates };
  saveData(data);
  
  return data.alertRules[ruleIndex];
};

// Toggle alert rule
const toggleAlertRule = (ruleId) => {
  const data = initializeDatabase();
  const rule = data.alertRules.find(r => r.id === ruleId);
  
  if (!rule) {
    throw new Error('Alert rule not found');
  }
  
  rule.enabled = !rule.enabled;
  saveData(data);
  
  return rule;
};

// Get settings
const getSettings = () => {
  const data = initializeDatabase();
  return data.settings;
};

// Update settings
const updateSettings = (updates) => {
  const data = initializeDatabase();
  data.settings = { ...data.settings, ...updates };
  saveData(data);
  return data.settings;
};

// Check and create compliance alerts (GST)
const checkComplianceAlerts = () => {
  const data = initializeDatabase();
  const results = [];
  
  const gstRule = data.alertRules.find(r => r.id === 'rule_gst_filing' && r.enabled);
  if (gstRule) {
    // Simulate GST filing check - in production, this would query actual GST data
    const daysBeforeDue = gstRule.config.daysBeforeDue;
    // This would check actual GST return due dates
    results.push({
      title: 'GST Filing Due',
      message: `GST filing is due in ${daysBeforeDue} days. Please ensure timely compliance.`,
      category: 'compliance',
      severity: 'critical',
      actionUrl: 'gst'
    });
  }
  
  const ewayRule = data.alertRules.find(r => r.id === 'rule_eway_expiry' && r.enabled);
  if (ewayRule) {
    results.push({
      title: 'E-Way Bill Expiry Warning',
      message: `E-Way Bills are expiring in ${ewayRule.config.daysBeforeExpiry} days.`,
      category: 'compliance',
      severity: 'critical',
      actionUrl: 'ewaybill'
    });
  }
  
  return results;
};

// Check and create inventory alerts
const checkInventoryAlerts = () => {
  const data = initializeDatabase();
  const results = [];
  
  const stockRule = data.alertRules.find(r => r.id === 'rule_low_stock' && r.enabled);
  if (stockRule) {
    // Simulate low stock check - in production, query actual inventory
    results.push({
      title: 'Low Stock Alert',
      message: `${stockRule.config.threshold} items are below minimum stock threshold.`,
      category: 'inventory',
      severity: 'warning',
      metadata: { threshold: stockRule.config.threshold },
      actionUrl: 'inventory'
    });
  }
  
  return results;
};

// Check and create financial alerts
const checkFinancialAlerts = () => {
  const data = initializeDatabase();
  const results = [];
  
  const overdueRule = data.alertRules.find(r => r.id === 'rule_invoice_overdue' && r.enabled);
  if (overdueRule) {
    results.push({
      title: 'Invoice Overdue',
      message: `${overdueRule.config.daysOverdue} days overdue invoices need attention.`,
      category: 'finance',
      severity: 'warning',
      actionUrl: 'reports'
    });
  }
  
  const largeRule = data.alertRules.find(r => r.id === 'rule_large_transaction' && r.enabled);
  if (largeRule) {
    // This would check actual transaction data
    results.push({
      title: 'Large Transaction Detected',
      message: `Transaction above ${largeRule.config.threshold} ${largeRule.config.currency} detected.`,
      category: 'finance',
      severity: 'info',
      metadata: { threshold: largeRule.config.threshold },
      actionUrl: 'transactions'
    });
  }
  
  return results;
};

// Poll all alert sources and create notifications
const pollAlerts = () => {
  const data = initializeDatabase();
  
  if (!data.settings.enabled) {
    return [];
  }
  
  const newNotifications = [];
  
  // Check compliance alerts
  const complianceAlerts = checkComplianceAlerts();
  complianceAlerts.forEach(alert => {
    const notification = createNotification(alert);
    newNotifications.push(notification);
  });
  
  // Check inventory alerts
  const inventoryAlerts = checkInventoryAlerts();
  inventoryAlerts.forEach(alert => {
    const notification = createNotification(alert);
    newNotifications.push(notification);
  });
  
  // Check financial alerts
  const financialAlerts = checkFinancialAlerts();
  financialAlerts.forEach(alert => {
    const notification = createNotification(alert);
    newNotifications.push(notification);
  });
  
  return newNotifications;
};

// Clean old notifications
const cleanOldNotifications = () => {
  const data = initializeDatabase();
  const retentionDays = data.settings.retentionDays || 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  
  const originalCount = data.notifications.length;
  data.notifications = data.notifications.filter(n => 
    new Date(n.createdAt) > cutoffDate
  );
  
  const deletedCount = originalCount - data.notifications.length;
  
  if (deletedCount > 0) {
    saveData(data);
  }
  
  return { deletedCount };
};

// Export functions
module.exports = {
  initializeDatabase,
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  deleteNotification,
  getAlertRules,
  updateAlertRule,
  toggleAlertRule,
  getSettings,
  updateSettings,
  pollAlerts,
  cleanOldNotifications
};
