const { contextBridge, ipcRenderer } = require('electron');

// Business Info APIs
const businessInfo = {
  get: () => ipcRenderer.invoke('get-business-info'),
  set: (data) => ipcRenderer.invoke('set-business-info', data)
};

// Party/Ledger APIs
const parties = {
  get: (filters) => ipcRenderer.invoke('get-parties', filters),
  getById: (id) => ipcRenderer.invoke('get-party-by-id', id),
  add: (party) => ipcRenderer.invoke('add-party', party),
  update: (id, party) => ipcRenderer.invoke('update-party', id, party),
  delete: (id) => ipcRenderer.invoke('delete-party', id),
  getBalance: (id) => ipcRenderer.invoke('get-party-balance', id)
};

// Product APIs
const products = {
  get: (filters) => ipcRenderer.invoke('get-products', filters),
  getById: (id) => ipcRenderer.invoke('get-product-by-id', id),
  add: (product) => ipcRenderer.invoke('add-product', product),
  update: (id, product) => ipcRenderer.invoke('update-product', id, product),
  delete: (id) => ipcRenderer.invoke('delete-product', id),
  updateStock: (productId, quantity, type) => ipcRenderer.invoke('update-stock', productId, quantity, type)
};

// Transaction APIs
const transactions = {
  get: (filters) => ipcRenderer.invoke('get-transactions', filters),
  getById: (id) => ipcRenderer.invoke('get-transaction-by-id', id),
  add: (transaction) => ipcRenderer.invoke('add-transaction', transaction),
  update: (id, transaction) => ipcRenderer.invoke('update-transaction', id, transaction),
  cancel: (id, reason) => ipcRenderer.invoke('cancel-transaction', id, reason)
};

// Payment APIs
const payments = {
  get: (filters) => ipcRenderer.invoke('get-payments', filters),
  add: (payment) => ipcRenderer.invoke('add-payment', payment)
};

// Expense APIs
const expenses = {
  get: (filters) => ipcRenderer.invoke('get-expenses', filters),
  add: (expense) => ipcRenderer.invoke('add-expense', expense),
  delete: (id) => ipcRenderer.invoke('delete-expense', id)
};

// Report APIs
const reports = {
  getDashboardSummary: (period) => ipcRenderer.invoke('get-dashboard-summary', period),
  getSalesReport: (filters) => ipcRenderer.invoke('get-sales-report', filters),
  getGSTReport: (period) => ipcRenderer.invoke('get-gst-report', period),
  getProfitLoss: (filters) => ipcRenderer.invoke('get-profit-loss', filters),
  getBalanceSheet: (asOnDate) => ipcRenderer.invoke('get-balance-sheet', asOnDate),
  getOutstandingAging: () => ipcRenderer.invoke('get-outstanding-aging'),
  getExpenseSummary: (filters) => ipcRenderer.invoke('get-expense-summary', filters),
  getCashFlow: (filters) => ipcRenderer.invoke('get-cash-flow', filters)
};

// Alert APIs
const alerts = {
  get: (filters) => ipcRenderer.invoke('get-alerts', filters),
  getCount: () => ipcRenderer.invoke('get-alert-count'),
  markRead: (id) => ipcRenderer.invoke('mark-alert-read', id),
  dismiss: (id) => ipcRenderer.invoke('dismiss-alert', id),
  clearAll: () => ipcRenderer.invoke('clear-all-alerts')
};

// Health Score APIs
const health = {
  calculate: (period) => ipcRenderer.invoke('calculate-health-score', period),
  getHistory: () => ipcRenderer.invoke('get-health-history')
};

// CA Mode APIs
const caMode = {
  getDashboard: () => ipcRenderer.invoke('get-ca-dashboard'),
  getAuditTrail: (filters) => ipcRenderer.invoke('get-audit-trail', filters),
  exportForCA: () => ipcRenderer.invoke('export-for-ca')
};

// Data Management APIs
const dataManagement = {
  export: () => ipcRenderer.invoke('export-data'),
  exportEncrypted: (options) => ipcRenderer.invoke('export-encrypted', options),
  decryptData: (options) => ipcRenderer.invoke('decrypt-data', options),
  import: (data) => ipcRenderer.invoke('import-data', data),
  backup: () => ipcRenderer.invoke('backup-database'),
  restore: (backupPath) => ipcRenderer.invoke('restore-database', backupPath)
};

// Settings APIs
const settings = {
  get: () => ipcRenderer.invoke('get-settings'),
  save: (settings) => ipcRenderer.invoke('save-settings', settings)
};

// Authentication APIs
const auth = {
  getUsers: () => ipcRenderer.invoke('get-users'),
  createUser: (userData) => ipcRenderer.invoke('create-user', userData),
  authenticate: (username, pin) => ipcRenderer.invoke('authenticate', username, pin),
  logout: (sessionToken) => ipcRenderer.invoke('logout', sessionToken),
  updateUserPin: (userId, oldPin, newPin) => ipcRenderer.invoke('update-user-pin', userId, oldPin, newPin),
  deleteUser: (userId) => ipcRenderer.invoke('delete-user', userId)
};

// User Management APIs (Collaboration Features)
const users = {
  login: (email, password) => ipcRenderer.invoke('auth:login', email, password),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getAll: () => ipcRenderer.invoke('users:get-all'),
  getById: (id) => ipcRenderer.invoke('users:get-by-id', id),
  create: (userData) => ipcRenderer.invoke('users:create', userData),
  update: (id, updates) => ipcRenderer.invoke('users:update', id, updates),
  delete: (id) => ipcRenderer.invoke('users:delete', id),
  getRoles: () => ipcRenderer.invoke('users:get-roles'),
  getPermissions: (role) => ipcRenderer.invoke('users:get-permissions', role),
  changePassword: (userId, oldPassword, newPassword) => ipcRenderer.invoke('users:change-password', userId, oldPassword, newPassword),
  resetPassword: (id, newPassword) => ipcRenderer.invoke('users:reset-password', id, newPassword),
  setStatus: (id, isActive) => ipcRenderer.invoke('users:set-status', id, isActive)
};

// E-Way Bill APIs
const ewaybill = {
  create: (ewaybillData) => ipcRenderer.invoke('ewaybill:create', ewaybillData),
  getAll: (filters) => ipcRenderer.invoke('ewaybill:get-all', filters),
  getById: (id) => ipcRenderer.invoke('ewaybill:get-by-id', id),
  getByNumber: (ewbNo) => ipcRenderer.invoke('ewaybill:get-by-number', ewbNo),
  update: (id, updates) => ipcRenderer.invoke('ewaybill:update', id, updates),
  cancel: (id, reason) => ipcRenderer.invoke('ewaybill:cancel', id, reason),
  updateVehicle: (id, vehicleData) => ipcRenderer.invoke('ewaybill:update-vehicle', id, vehicleData),
  generateJson: (id) => ipcRenderer.invoke('ewaybill:generate-json', id),
  getStats: () => ipcRenderer.invoke('ewaybill:get-stats'),
  getHsnCodes: () => ipcRenderer.invoke('ewaybill:get-hsn-codes'),
  getStateCodes: () => ipcRenderer.invoke('ewaybill:get-state-codes')
};

// API Gateway APIs
const apiGateway = {
  getConfig: () => ipcRenderer.invoke('api-gateway:get-config'),
  updateConfig: (config) => ipcRenderer.invoke('api-gateway:update-config', config),
  generateKey: (name, permissions) => ipcRenderer.invoke('api-gateway:generate-key', name, permissions),
  getKeys: () => ipcRenderer.invoke('api-gateway:get-keys'),
  revokeKey: (id) => ipcRenderer.invoke('api-gateway:revoke-key', id),
  validateKey: (plainKey) => ipcRenderer.invoke('api-gateway:validate-key', plainKey),
  createWebhook: (webhookData) => ipcRenderer.invoke('api-gateway:create-webhook', webhookData),
  getWebhooks: () => ipcRenderer.invoke('api-gateway:get-webhooks'),
  updateWebhook: (id, updates) => ipcRenderer.invoke('api-gateway:update-webhook', id, updates),
  deleteWebhook: (id) => ipcRenderer.invoke('api-gateway:delete-webhook', id),
  testWebhook: (id) => ipcRenderer.invoke('api-gateway:test-webhook', id),
  triggerWebhook: (eventName, data) => ipcRenderer.invoke('api-gateway:trigger-webhook', eventName, data),
  getLogs: (limit) => ipcRenderer.invoke('api-gateway:get-logs', limit),
  getUsageStats: () => ipcRenderer.invoke('api-gateway:get-usage-stats'),
  getEndpoints: () => ipcRenderer.invoke('api-gateway:get-endpoints'),
  saveOAuth: (provider, tokenData) => ipcRenderer.invoke('api-gateway:save-oauth', provider, tokenData),
  getOAuthStatus: (provider) => ipcRenderer.invoke('api-gateway:get-oauth-status', provider),
  disconnectOAuth: (provider) => ipcRenderer.invoke('api-gateway:disconnect-oauth', provider)
};

// Analytics APIs
const analytics = {
  generate: (filters) => ipcRenderer.invoke('analytics:generate', filters),
  getCached: () => ipcRenderer.invoke('analytics:get-cached'),
  clearCache: () => ipcRenderer.invoke('analytics:clear-cache'),
  getCashFlowForecast: (filters) => ipcRenderer.invoke('analytics:cashflow-forecast', filters),
  detectAnomalies: (filters) => ipcRenderer.invoke('analytics:detect-anomalies', filters)
};

// Currency APIs
const currency = {
  initialize: () => ipcRenderer.invoke('currency:initialize'),
  getCurrencies: () => ipcRenderer.invoke('currency:get-currencies'),
  getCurrency: (code) => ipcRenderer.invoke('currency:get-currency', code),
  addCurrency: (currency) => ipcRenderer.invoke('currency:add-currency', currency),
  updateExchangeRate: (fromCurrency, toCurrency, rate) => ipcRenderer.invoke('currency:update-exchange-rate', fromCurrency, toCurrency, rate),
  getExchangeRates: () => ipcRenderer.invoke('currency:get-exchange-rates'),
  convert: (amount, fromCurrency, toCurrency) => ipcRenderer.invoke('currency:convert', amount, fromCurrency, toCurrency),
  recordTransaction: (transaction) => ipcRenderer.invoke('currency:record-transaction', transaction),
  getTransactions: (filters) => ipcRenderer.invoke('currency:get-transactions', filters),
  getTransaction: (id) => ipcRenderer.invoke('currency:get-transaction', id),
  updateTransaction: (id, updates) => ipcRenderer.invoke('currency:update-transaction', id, updates),
  deleteTransaction: (id) => ipcRenderer.invoke('currency:delete-transaction', id),
  getConsolidatedReport: (startDate, endDate, baseCurrency) => ipcRenderer.invoke('currency:get-consolidated-report', startDate, endDate, baseCurrency),
  getSettings: () => ipcRenderer.invoke('currency:get-settings'),
  updateSettings: (newSettings) => ipcRenderer.invoke('currency:update-settings', newSettings),
  fetchLiveRates: () => ipcRenderer.invoke('currency:fetch-live-rates')
};

// Voice APIs
const voice = {
  initialize: () => ipcRenderer.invoke('voice:initialize'),
  getSettings: () => ipcRenderer.invoke('voice:get-settings'),
  updateSettings: (newSettings) => ipcRenderer.invoke('voice:update-settings', newSettings),
  getSupportedLanguages: () => ipcRenderer.invoke('voice:get-supported-languages'),
  setLanguageEnabled: (languageCode, enabled) => ipcRenderer.invoke('voice:set-language-enabled', languageCode, enabled),
  getAccentProfiles: () => ipcRenderer.invoke('voice:get-accent-profiles'),
  saveAccentProfile: (userId, profileData) => ipcRenderer.invoke('voice:save-accent-profile', userId, profileData),
  getAccentProfile: (userId) => ipcRenderer.invoke('voice:get-accent-profile', userId),
  processCommand: (transcript, context) => ipcRenderer.invoke('voice:process-command', transcript, context),
  getTranscriptionHistory: (limit) => ipcRenderer.invoke('voice:get-transcription-history', limit),
  clearTranscriptionHistory: () => ipcRenderer.invoke('voice:clear-transcription-history'),
  getCustomPhrases: () => ipcRenderer.invoke('voice:get-custom-phrases'),
  addCustomPhrase: (phrase, command, language) => ipcRenderer.invoke('voice:add-custom-phrase', phrase, command, language),
  removeCustomPhrase: (index) => ipcRenderer.invoke('voice:remove-custom-phrase', index),
  recognizeSpeech: (audioData, config) => ipcRenderer.invoke('voice:recognize-speech', audioData, config)
};

// Security APIs
const security = {
  initialize: () => ipcRenderer.invoke('security:initialize'),
  getProfile: () => ipcRenderer.invoke('security:get-profile'),
  updateProfile: (updates) => ipcRenderer.invoke('security:update-profile', updates),
  generateTotpSecret: (userEmail) => ipcRenderer.invoke('security:generate-totp-secret', userEmail),
  verifyAndEnableTotp: (token, userEmail) => ipcRenderer.invoke('security:verify-and-enable-totp', token, userEmail),
  disableTotp: (token) => ipcRenderer.invoke('security:disable-totp', token),
  verifyTotp: (token) => ipcRenderer.invoke('security:verify-totp', token),
  getSessions: () => ipcRenderer.invoke('security:get-sessions'),
  createSession: (sessionInfo) => ipcRenderer.invoke('security:create-session', sessionInfo),
  revokeSession: (sessionId) => ipcRenderer.invoke('security:revoke-session', sessionId),
  revokeAllOtherSessions: () => ipcRenderer.invoke('security:revoke-all-other-sessions'),
  getActivityLog: (limit) => ipcRenderer.invoke('security:get-activity-log', limit),
  getRecoveryCodes: () => ipcRenderer.invoke('security:get-recovery-codes')
};

// Notification APIs
const notifications = {
  initialize: () => ipcRenderer.invoke('notification:initialize'),
  getAll: (filters) => ipcRenderer.invoke('notification:get-all', filters),
  getUnreadCount: () => ipcRenderer.invoke('notification:get-unread-count'),
  markRead: (notificationId) => ipcRenderer.invoke('notification:mark-read', notificationId),
  delete: (notificationId) => ipcRenderer.invoke('notification:delete', notificationId),
  create: (notification) => ipcRenderer.invoke('notification:create', notification),
  getAlertRules: () => ipcRenderer.invoke('notification:get-alert-rules'),
  updateAlertRule: (ruleId, updates) => ipcRenderer.invoke('notification:update-alert-rule', ruleId, updates),
  toggleAlertRule: (ruleId) => ipcRenderer.invoke('notification:toggle-alert-rule', ruleId),
  getSettings: () => ipcRenderer.invoke('notification:get-settings'),
  updateSettings: (updates) => ipcRenderer.invoke('notification:update-settings', updates),
  pollAlerts: () => ipcRenderer.invoke('notification:poll-alerts')
};

// AI Service APIs
const ai = {
  initialize: () => ipcRenderer.invoke('ai:initialize'),
  getForecast: (days) => ipcRenderer.invoke('ai:get-forecast', days),
  getSalesPrediction: () => ipcRenderer.invoke('ai:get-sales-prediction'),
  getExpensePrediction: () => ipcRenderer.invoke('ai:get-expense-prediction'),
  getWorkingCapital: () => ipcRenderer.invoke('ai:get-working-capital'),
  autoCategorize: () => ipcRenderer.invoke('ai:auto-categorize'),
  applyCategory: (transactionId, category) => ipcRenderer.invoke('ai:apply-category', transactionId, category),
  detectAnomalies: () => ipcRenderer.invoke('ai:detect-anomalies'),
  getInsights: () => ipcRenderer.invoke('ai:get-insights')
};

// GST Reminders APIs
const gstReminders = {
  get: () => ipcRenderer.invoke('get-gst-reminders'),
  create: (reminder) => ipcRenderer.invoke('create-gst-reminder', reminder),
  update: (id, updates) => ipcRenderer.invoke('update-gst-reminder', id, updates),
  delete: (id) => ipcRenderer.invoke('delete-gst-reminder', id)
};

// Bank Reconciliation APIs
const reconciliation = {
  getStatements: (filters) => ipcRenderer.invoke('get-bank-statements', filters),
  getStatementById: (id) => ipcRenderer.invoke('get-bank-statement-by-id', id),
  createStatement: (data) => ipcRenderer.invoke('create-bank-statement', data),
  addTransaction: (data) => ipcRenderer.invoke('add-bank-transaction', data),
  processStatement: (id) => ipcRenderer.invoke('process-bank-statement', id),
  getUnreconciled: () => ipcRenderer.invoke('get-unreconciled-transactions'),
  reconcile: (transactionId, bankTxnId) => ipcRenderer.invoke('reconcile-transaction', transactionId, bankTxnId),
  
  // Voice Reconciliation APIs
  searchParty: (query) => ipcRenderer.invoke('voice-search-party', query),
  searchTransactions: (criteria) => ipcRenderer.invoke('voice-search-transactions', criteria),
  reconcileByAmount: (data) => ipcRenderer.invoke('voice-reconcile-by-amount', data),
  createPayment: (data) => ipcRenderer.invoke('voice-create-payment', data),
  getPartyBalance: (partyId) => ipcRenderer.invoke('voice-get-party-balance', partyId),
  
  // Additional Voice Reconciliation Handlers (matching main.js handlers)
  getReconciliationUnreconciled: (filters) => ipcRenderer.invoke('reconciliation:get-unreconciled', filters),
  getReconciliationReconciled: (filters) => ipcRenderer.invoke('reconciliation:get-reconciled', filters),
  reconcileSingle: (data) => ipcRenderer.invoke('reconciliation:reconcile-single', data),
  reconcileAll: (data) => ipcRenderer.invoke('reconciliation:reconcile-all', data),
  reconcileByParty: (data) => ipcRenderer.invoke('reconciliation:reconcile-by-party', data),
  reconcileByDate: (data) => ipcRenderer.invoke('reconciliation:reconcile-by-date', data),
  markReconciled: (data) => ipcRenderer.invoke('reconciliation:mark-reconciled', data),
  unreconcile: (data) => ipcRenderer.invoke('reconciliation:unreconcile', data),
  getReconciliationSummary: (data) => ipcRenderer.invoke('reconciliation:get-summary', data),
  getReconciliationStatus: () => ipcRenderer.invoke('reconciliation:get-status'),
  compareBalances: (data) => ipcRenderer.invoke('reconciliation:compare-balances', data),
  getDifference: (data) => ipcRenderer.invoke('reconciliation:get-difference', data),
  matchTransaction: (data) => ipcRenderer.invoke('reconciliation:match-transaction', data),
  flagTransaction: (data) => ipcRenderer.invoke('reconciliation:flag', data),
  getReconciliationStatistics: (data) => ipcRenderer.invoke('reconciliation:get-statistics', data)
};

// Recommendations APIs
const recommendations = {
  get: (filters) => ipcRenderer.invoke('get-recommendations', filters),
  create: (data) => ipcRenderer.invoke('create-recommendation', data),
  markRead: (id) => ipcRenderer.invoke('mark-recommendation-read', id),
  apply: (id) => ipcRenderer.invoke('apply-recommendation', id),
  generate: () => ipcRenderer.invoke('generate-recommendations')
};

// Voice Command APIs
const voice = {
  log: (data) => ipcRenderer.invoke('log-voice-command', data),
  getLogs: (filters) => ipcRenderer.invoke('get-voice-command-logs', filters),
  getStats: () => ipcRenderer.invoke('get-voice-stats')
};

// Error Detection APIs
const errorDetection = {
  detect: (types) => ipcRenderer.invoke('detect-errors', types),
  fix: (errorType, entityId, fixData) => ipcRenderer.invoke('fix-error', errorType, entityId, fixData)
};

// Enhanced Audit Trail APIs
const audit = {
  getTrail: (filters) => ipcRenderer.invoke('get-audit-trail', filters),
  getSummary: (period) => ipcRenderer.invoke('get-audit-summary', period),
  search: (query, filters) => ipcRenderer.invoke('search-audit-logs', query, filters),
  
  // New Audit Service APIs
  query: (filters) => ipcRenderer.invoke('audit/query', filters),
  getServiceSummary: (period) => ipcRenderer.invoke('audit/get-summary', period),
  log: (params) => ipcRenderer.invoke('audit/log', params),
  cleanup: (daysToKeep) => ipcRenderer.invoke('audit/cleanup', daysToKeep)
};

// Subscription APIs
const subscription = {
  getPlans: () => ipcRenderer.invoke('subscription/get-plans'),
  getPlan: (planId) => ipcRenderer.invoke('subscription/get-plan', planId),
  getSubscription: (userId) => ipcRenderer.invoke('subscription/get-subscription', userId),
  create: (userId, planId, billingCycle) => ipcRenderer.invoke('subscription/create', userId, planId, billingCycle),
  updateStatus: (userId, status, razorpaySubscriptionId) => ipcRenderer.invoke('subscription/update-status', userId, status, razorpaySubscriptionId),
  getUsage: (userId) => ipcRenderer.invoke('subscription/get-usage', userId),
  checkLimits: (userId) => ipcRenderer.invoke('subscription/check-limits', userId),
  incrementUsage: (userId, type) => ipcRenderer.invoke('subscription/increment-usage', userId, type),
  getPaymentHistory: (userId) => ipcRenderer.invoke('subscription/get-payment-history', userId),
  recordPayment: (paymentData) => ipcRenderer.invoke('subscription/record-payment', paymentData),
  diagnose: () => ipcRenderer.invoke('subscription/diagnose')
};

// Invoice Scanning APIs
const invoiceScanning = {
  getInvoices: (filters) => ipcRenderer.invoke('invoice:get-all', filters),
  getInvoice: (id) => ipcRenderer.invoke('invoice:get', id),
  saveInvoice: (data) => ipcRenderer.invoke('invoice:save', data),
  updateInvoice: (id, data) => ipcRenderer.invoke('invoice:update', id, data),
  deleteInvoice: (id) => ipcRenderer.invoke('invoice:delete', id),
  importToTransactions: (id) => ipcRenderer.invoke('invoice:import', id),
  checkDuplicate: (invoiceNumber, vendorName, invoiceDate, totalAmount) => 
    ipcRenderer.invoke('invoice:check-duplicate', invoiceNumber, vendorName, invoiceDate, totalAmount),
  getStatistics: (period) => ipcRenderer.invoke('invoice:get-statistics', period),
  processOCR: (imageData) => ipcRenderer.invoke('invoice:process-ocr', imageData)
};

// E-Invoice APIs
const einvoice = {
  generate: (transactionId) => ipcRenderer.invoke('einvoice:generate', transactionId),
  generateEwaybill: (transactionId, transport) => ipcRenderer.invoke('einvoice:generate-ewaybill', transactionId, transport),
  get: (transactionId) => ipcRenderer.invoke('einvoice:get', transactionId),
  list: (filters) => ipcRenderer.invoke('einvoice:list', filters),
  getPending: (filters) => ipcRenderer.invoke('einvoice:get-pending', filters),
  getConfig: () => ipcRenderer.invoke('einvoice:get-config'),
  saveConfig: (config) => ipcRenderer.invoke('einvoice:save-config', config),
  cancel: (transactionId, reason) => ipcRenderer.invoke('einvoice:cancel', transactionId, reason),
  validateGstin: (gstin) => ipcRenderer.invoke('einvoice:validate-gstin', gstin),
  validateHsn: (hsnCode) => ipcRenderer.invoke('einvoice:validate-hsn', hsnCode)
};

// Inventory APIs
const inventory = {
  addBatch: (batchData) => ipcRenderer.invoke('inventory:add-batch', batchData),
  getBatches: (productId) => ipcRenderer.invoke('inventory:get-batches', productId),
  addSerialNumbers: (serialData) => ipcRenderer.invoke('inventory:add-serial-numbers', serialData),
  getSerialNumbers: (productId) => ipcRenderer.invoke('inventory:get-serial-numbers', productId),
  recordMovement: (movementData) => ipcRenderer.invoke('inventory:record-movement', movementData),
  getSummary: (filters) => ipcRenderer.invoke('inventory:get-summary', filters),
  getMovements: (filters) => ipcRenderer.invoke('inventory:get-movements', filters),
  getLowStock: (threshold) => ipcRenderer.invoke('inventory:get-low-stock', threshold),
  getExpiring: (daysAhead) => ipcRenderer.invoke('inventory:get-expiring', daysAhead),
  getValuation: (asOnDate) => ipcRenderer.invoke('inventory:get-valuation', asOnDate),
  transferStock: (transferData) => ipcRenderer.invoke('inventory:transfer-stock', transferData),
  adjust: (adjustmentData) => ipcRenderer.invoke('inventory:adjust', adjustmentData)
};

// Integration Services APIs
const integrations = {
  // Initialize the integration service
  initialize: () => ipcRenderer.invoke('integration:initialize'),
  
  // Get all integration connections status
  getConnections: (userId = 1) => ipcRenderer.invoke('integration:get-connections', userId),
  
  // Check specific provider connection status
  checkConnection: (provider, userId = 1) => ipcRenderer.invoke('integration:check-connection', provider, userId),
  
  // Save OAuth tokens after OAuth callback
  saveTokens: (userId, provider, tokens) => ipcRenderer.invoke('integration:save-tokens', userId, provider, tokens),
  
  // Disconnect an integration
  disconnect: (userId, provider) => ipcRenderer.invoke('integration:disconnect', userId, provider),
  
  // Get OAuth authorization URL for cloud providers
  getAuthUrl: (provider) => ipcRenderer.invoke('integration:get-auth-url', provider),
  
  // Start sync operation
  startSync: (userId, provider, syncType = 'full') => ipcRenderer.invoke('integration:start-sync', userId, provider, syncType),
  
  // Complete sync operation
  completeSync: (syncId, result) => ipcRenderer.invoke('integration:complete-sync', syncId, result),
  
  // Get sync history
  getSyncHistory: (userId, provider = null, limit = 20) => ipcRenderer.invoke('integration:get-sync-history', userId, provider, limit),
  
  // Get enhanced sync history with formatted errors
  getSyncHistoryEnhanced: (userId, provider = null, limit = 50) => ipcRenderer.invoke('integration:get-sync-history-enhanced', userId, provider, limit),
  
  // Get audit logs for integrations
  getAuditLogs: (userId, options = {}) => ipcRenderer.invoke('integration:get-audit-logs', userId, options),
  
  // Configure local integration (Tally, Busy)
  configureLocal: (userId, provider, config) => ipcRenderer.invoke('integration:configure-local', userId, provider, config),
  
  // Test local integration connection
  testLocalConnection: (userId, provider, config) => ipcRenderer.invoke('integration:test-local-connection', userId, provider, config),
  
  // Error Recovery APIs
  getDeadLetterQueue: (options = {}) => ipcRenderer.invoke('integration:get-dead-letter-queue', options),
  retryDlqItem: (dlqId) => ipcRenderer.invoke('integration:retry-dlq-item', dlqId),
  resolveDlqItem: (dlqId, resolution) => ipcRenderer.invoke('integration:resolve-dlq-item', dlqId, resolution),
  clearDeadLetterQueue: (userId, provider) => ipcRenderer.invoke('integration:clear-dead-letter-queue', userId, provider),
  checkReconciliation: (userId, provider, entityType) => ipcRenderer.invoke('integration:check-reconciliation', userId, provider, entityType),
  getOperationStats: (userId, provider = null) => ipcRenderer.invoke('integration:get-operation-stats', userId, provider)
};

// Expose protected APIs to renderer
contextBridge.exposeInMainWorld('api', {
  // Business Info
  businessInfo,
  
  // Master Data
  parties,
  products,
  
  // Transactions
  transactions,
  payments,
  expenses,
  
  // User Management
  users,
  
  // E-Way Bill
  ewaybill,
  
  // API Gateway
  apiGateway,
  
  // Analytics
  analytics,
  
  // Currency
  currency,
  
  // Voice
  voice,
  
  // Security
  security,
  
  // Notifications
  notifications,
  
  // AI Service
  ai,
  
  // Reports
  reports,
  
  // Alerts & Health
  alerts,
  health,
  
  // CA Mode
  caMode,
  
  // Data Management
  dataManagement,
  
  // Settings
  settings,
  
  // Authentication
  auth,
  
  // GST Reminders
  gstReminders,
  
  // Voice Commands
  voice,

  // Subscription & Monetization
  subscription,

  // Invoice Scanning
  invoiceScanning,
  
  // E-Invoice
  einvoice,

  // Inventory
  inventory,

  // Report Engine APIs
  reports: {
    generateSales: (params) => ipcRenderer.invoke('report:generate-sales', params),
    generateGST: (month) => ipcRenderer.invoke('report:generate-gst', month),
    generatePNL: (params) => ipcRenderer.invoke('report:generate-pnl', params),
    generateBalanceSheet: (asOfDate) => ipcRenderer.invoke('report:generate-balance-sheet', asOfDate),
    generateCashFlow: (params) => ipcRenderer.invoke('report:generate-cashflow', params),
    generateOutstanding: () => ipcRenderer.invoke('report:generate-outstanding'),
    generateExpenseSummary: (params) => ipcRenderer.invoke('report:generate-expense-summary', params),
    getDashboardSummary: () => ipcRenderer.invoke('report:get-dashboard-summary')
  },

  // GST Return APIs
  gst: {
    getGstr1: (filters) => ipcRenderer.invoke('gst:get-gstr1', filters),
    getGstr3b: (filters) => ipcRenderer.invoke('gst:get-gstr3b', filters),
    exportGstr1Json: (filters) => ipcRenderer.invoke('gst:export-gstr1-json', filters),
    exportGstr3bJson: (filters) => ipcRenderer.invoke('gst:export-gstr3b-json', filters),
    getItcReconciliation: (filters) => ipcRenderer.invoke('gst:get-itc-reconciliation', filters),
    getLiabilitySummary: (filters) => ipcRenderer.invoke('gst:get-liability-summary', filters)
  },

  // Banking APIs
  banking: {
    addAccount: (accountData) => ipcRenderer.invoke('banking:add-account', accountData),
    getAccounts: () => ipcRenderer.invoke('banking:get-accounts'),
    getAccount: (accountId) => ipcRenderer.invoke('banking:get-account', accountId),
    updateAccount: (accountId, updates) => ipcRenderer.invoke('banking:update-account', accountId, updates),
    deleteAccount: (accountId) => ipcRenderer.invoke('banking:delete-account', accountId),
    addTransaction: (transactionData) => ipcRenderer.invoke('banking:add-transaction', transactionData),
    getTransactions: (filters) => ipcRenderer.invoke('banking:get-transactions', filters),
    getUnmatched: (accountId) => ipcRenderer.invoke('banking:get-unmatched', accountId),
    autoReconcile: (accountId) => ipcRenderer.invoke('banking:auto-reconcile', accountId),
    matchTransaction: (transactionId, invoiceId, invoiceType) => ipcRenderer.invoke('banking:match-transaction', transactionId, invoiceId, invoiceType),
    unmatchTransaction: (transactionId) => ipcRenderer.invoke('banking:unmatch-transaction', transactionId),
    getSummary: (accountId) => ipcRenderer.invoke('banking:get-summary', accountId),
    addRule: (ruleData) => ipcRenderer.invoke('banking:add-rule', ruleData),
    getRules: (accountId) => ipcRenderer.invoke('banking:get-rules', accountId),
    deleteRule: (ruleId) => ipcRenderer.invoke('banking:delete-rule', ruleId),
    importStatement: (accountId, transactions) => ipcRenderer.invoke('banking:import-statement', accountId, transactions)
  },

  // Payment Gateway APIs
  payment: {
    saveConfig: (configData) => ipcRenderer.invoke('payment:save-config', configData),
    getConfig: (gatewayName) => ipcRenderer.invoke('payment:get-config', gatewayName),
    getActiveGateway: () => ipcRenderer.invoke('payment:get-active-gateway'),
    setStatus: (gatewayId, isActive) => ipcRenderer.invoke('payment:set-status', gatewayId, isActive),
    createLink: (invoiceId) => ipcRenderer.invoke('payment:create-link', invoiceId),
    getLink: (token) => ipcRenderer.invoke('payment:get-link', token),
    initiate: (paymentData) => ipcRenderer.invoke('payment:initiate', paymentData),
    updateStatus: (paymentId, status, gatewayResponse) => ipcRenderer.invoke('payment:update-status', paymentId, status, gatewayResponse),
    getTransaction: (paymentId) => ipcRenderer.invoke('payment:get-transaction', paymentId),
    getInvoicePayments: (invoiceId) => ipcRenderer.invoke('payment:get-invoice-payments', invoiceId),
    getTransactions: (filters) => ipcRenderer.invoke('payment:get-transactions', filters),
    getSummary: (filters) => ipcRenderer.invoke('payment:get-summary', filters),
    processRefund: (paymentId, amount, reason) => ipcRenderer.invoke('payment:process-refund', paymentId, amount, reason),
    getRefunds: (paymentId) => ipcRenderer.invoke('payment:get-refunds', paymentId),
    getWebhookLogs: (limit) => ipcRenderer.invoke('payment:get-webhook-logs', limit),
    testConnection: (gatewayId) => ipcRenderer.invoke('payment:test-connection', gatewayId)
  },

  // Expense Management APIs
  expense: {
    getCategories: () => ipcRenderer.invoke('expense:get-categories'),
    addCategory: (categoryData) => ipcRenderer.invoke('expense:add-category', categoryData),
    updateCategory: (categoryId, categoryData) => ipcRenderer.invoke('expense:update-category', categoryId, categoryData),
    deleteCategory: (categoryId) => ipcRenderer.invoke('expense:delete-category', categoryId),
    getAll: (filters) => ipcRenderer.invoke('expense:get-all', filters),
    getById: (expenseId) => ipcRenderer.invoke('expense:get-by-id', expenseId),
    create: (expenseData) => ipcRenderer.invoke('expense:create', expenseData),
    update: (expenseId, expenseData) => ipcRenderer.invoke('expense:update', expenseId, expenseData),
    delete: (expenseId) => ipcRenderer.invoke('expense:delete', expenseId),
    approve: (expenseId, approvalData) => ipcRenderer.invoke('expense:approve', expenseId, approvalData),
    reject: (expenseId, reason) => ipcRenderer.invoke('expense:reject', expenseId, reason),
    getRecurring: (filters) => ipcRenderer.invoke('expense:get-recurring', filters),
    createRecurring: (recurringData) => ipcRenderer.invoke('expense:create-recurring', recurringData),
    updateRecurring: (recurringId, recurringData) => ipcRenderer.invoke('expense:update-recurring', recurringId, recurringData),
    deleteRecurring: (recurringId) => ipcRenderer.invoke('expense:delete-recurring', recurringId),
    processRecurring: (recurringId) => ipcRenderer.invoke('expense:process-recurring', recurringId),
    uploadReceipt: (expenseId, receiptData) => ipcRenderer.invoke('expense:upload-receipt', expenseId, receiptData),
    getReceipts: (expenseId) => ipcRenderer.invoke('expense:get-receipts', expenseId),
    deleteReceipt: (receiptId) => ipcRenderer.invoke('expense:delete-receipt', receiptId),
    getSummary: (filters) => ipcRenderer.invoke('expense:get-summary', filters),
    getByCategory: (filters) => ipcRenderer.invoke('expense:get-by-category', filters),
    getVendorExpenses: (vendorId, filters) => ipcRenderer.invoke('expense:get-vendor-expenses', vendorId, filters),
    export: (filters) => ipcRenderer.invoke('expense:export', filters)
  },

  // Budget Management APIs
  budget: {
    getAll: (filters) => ipcRenderer.invoke('budget:get-all', filters),
    getById: (budgetId) => ipcRenderer.invoke('budget:get-by-id', budgetId),
    create: (budgetData) => ipcRenderer.invoke('budget:create', budgetData),
    update: (budgetId, budgetData) => ipcRenderer.invoke('budget:update', budgetId, budgetData),
    delete: (budgetId) => ipcRenderer.invoke('budget:delete', budgetId),
    getSummary: (filters) => ipcRenderer.invoke('budget:get-summary', filters),
    updateVariance: (budgetId) => ipcRenderer.invoke('budget:update-variance', budgetId),
    getAlerts: () => ipcRenderer.invoke('budget:get-alerts'),
    export: (filters) => ipcRenderer.invoke('budget:export', filters)
  },

  // Vendor Management APIs
  vendor: {
    getAll: (filters) => ipcRenderer.invoke('vendor:get-all', filters),
    getById: (vendorId) => ipcRenderer.invoke('vendor:get-by-id', vendorId),
    create: (vendorData) => ipcRenderer.invoke('vendor:create', vendorData),
    update: (vendorId, vendorData) => ipcRenderer.invoke('vendor:update', vendorId, vendorData),
    delete: (vendorId) => ipcRenderer.invoke('vendor:delete', vendorId),
    addContact: (vendorId, contactData) => ipcRenderer.invoke('vendor:add-contact', vendorId, contactData),
    deleteContact: (contactId) => ipcRenderer.invoke('vendor:delete-contact', contactId),
    getSummary: (filters) => ipcRenderer.invoke('vendor:get-summary', filters),
    export: (filters) => ipcRenderer.invoke('vendor:export', filters)
  },

  // Purchase Order APIs
  purchaseOrder: {
    getAll: (filters) => ipcRenderer.invoke('po:get-all', filters),
    getById: (poId) => ipcRenderer.invoke('po:get-by-id', poId),
    create: (poData) => ipcRenderer.invoke('po:create', poData),
    update: (poId, poData) => ipcRenderer.invoke('po:update', poId, poData),
    cancel: (poId, reason) => ipcRenderer.invoke('po:cancel', poId, reason),
    receive: (poId, items) => ipcRenderer.invoke('po:receive', poId, items),
    getVendorSummary: (vendorId) => ipcRenderer.invoke('po:get-vendor-summary', vendorId)
  },

  // Project Management APIs
  project: {
    getAll: (filters) => ipcRenderer.invoke('project:get-all', filters),
    getById: (projectId) => ipcRenderer.invoke('project:get-by-id', projectId),
    create: (projectData) => ipcRenderer.invoke('project:create', projectData),
    update: (projectId, projectData) => ipcRenderer.invoke('project:update', projectId, projectData),
    delete: (projectId) => ipcRenderer.invoke('project:delete', projectId),
    addTask: (projectId, taskData) => ipcRenderer.invoke('project:add-task', projectId, taskData),
    updateTask: (taskId, taskData) => ipcRenderer.invoke('project:update-task', taskId, taskData),
    deleteTask: (taskId) => ipcRenderer.invoke('project:delete-task', taskId),
    addTimeEntry: (projectId, entryData) => ipcRenderer.invoke('project:add-time-entry', projectId, entryData),
    deleteTimeEntry: (entryId) => ipcRenderer.invoke('project:delete-time-entry', entryId),
    addExpense: (projectId, expenseData) => ipcRenderer.invoke('project:add-expense', projectId, expenseData),
    deleteExpense: (expenseId) => ipcRenderer.invoke('project:delete-expense', expenseId),
    addMilestone: (projectId, milestoneData) => ipcRenderer.invoke('project:add-milestone', projectId, milestoneData),
    updateMilestone: (milestoneId, milestoneData) => ipcRenderer.invoke('project:update-milestone', milestoneId, milestoneData),
    getSummary: (filters) => ipcRenderer.invoke('project:get-summary', filters),
    getDashboard: () => ipcRenderer.invoke('project:get-dashboard'),
    export: (filters) => ipcRenderer.invoke('project:export', filters)
  },

  // Integration Services
  integrations,

  // Utility
  ping: () => 'pong'
});

// New offline voice module API
contextBridge.exposeInMainWorld('voiceAPI', {
  // Core listening operations
  startListening: () => ipcRenderer.invoke('voice:start'),
  stopListening: () => ipcRenderer.invoke('voice:stop'),
  toggleListening: () => ipcRenderer.invoke('voice:toggle'),
  cancelRecording: () => ipcRenderer.invoke('voice:cancel'),
  
  // State queries
  getStatus: () => ipcRenderer.invoke('voice:status'),
  getAudioLevel: () => ipcRenderer.invoke('voice:get-audio-level'),
  isListening: () => ipcRenderer.invoke('voice:is-listening'),
  
  // Settings management
  getSettings: () => ipcRenderer.invoke('voice:get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('voice:save-settings', settings),
  setEnabled: (enabled) => ipcRenderer.invoke('voice:set-enabled', enabled),
  setLanguage: (language) => ipcRenderer.invoke('voice:set-language', language),
  
  // Dictionary operations
  getDictionary: () => ipcRenderer.invoke('voice:get-dictionary'),
  addTerm: (spoken, mapped, category) => ipcRenderer.invoke('voice:add-term', spoken, mapped, category),
  removeTerm: (id) => ipcRenderer.invoke('voice:remove-term', id),
  updateTerm: (id, updates) => ipcRenderer.invoke('voice:update-term', id, updates),
  searchTerms: (query) => ipcRenderer.invoke('voice:search-terms', query),
  
  // Model management
  getModels: () => ipcRenderer.invoke('voice:get-models'),
  setModel: (modelId) => ipcRenderer.invoke('voice:set-model', modelId),
  downloadModel: (modelId) => ipcRenderer.invoke('voice:download-model', modelId),
  
  // Command operations
  parseCommand: (text) => ipcRenderer.invoke('voice:parse-command', text),
  executeCommand: (command) => ipcRenderer.invoke('voice:execute-command', command),
  confirmCommand: (command) => ipcRenderer.invoke('voice:confirm-command', command),
  
  // History
  getHistory: () => ipcRenderer.invoke('voice:get-history'),
  clearHistory: () => ipcRenderer.invoke('voice:clear-history'),
  retryLast: () => ipcRenderer.invoke('voice:retry-last'),
  
  // Event listeners setup
  onStatusChange: (callback) => {
    ipcRenderer.on('voice:status', (_, data) => callback(data));
    return () => ipcRenderer.removeListener('voice:status', callback);
  },
  onListeningStarted: (callback) => {
    ipcRenderer.on('voice:listeningStarted', (_, data) => callback(data));
    return () => ipcRenderer.removeListener('voice:listeningStarted', callback);
  },
  onListeningStopped: (callback) => {
    ipcRenderer.on('voice:listeningStopped', (_, data) => callback(data));
    return () => ipcRenderer.removeListener('voice:listeningStopped', callback);
  },
  onTranscriptionComplete: (callback) => {
    ipcRenderer.on('voice:transcriptionComplete', (_, data) => callback(data));
    return () => ipcRenderer.removeListener('voice:transcriptionComplete', callback);
  },
  onPartialTranscription: (callback) => {
    ipcRenderer.on('voice:partialTranscription', (_, data) => callback(data));
    return () => ipcRenderer.removeListener('voice:partialTranscription', callback);
  },
  onCommandReady: (callback) => {
    ipcRenderer.on('voice:commandReady', (_, data) => callback(data));
    return () => ipcRenderer.removeListener('voice:commandReady', callback);
  },
  onCommandParsed: (callback) => {
    ipcRenderer.on('voice:commandParsed', (_, data) => callback(data));
    return () => ipcRenderer.removeListener('voice:commandParsed', callback);
  },
  onAudioLevel: (callback) => {
    ipcRenderer.on('voice:audioLevel', (_, data) => callback(data));
    return () => ipcRenderer.removeListener('voice:audioLevel', callback);
  },
  onError: (callback) => {
    ipcRenderer.on('voice:error', (_, data) => callback(data));
    return () => ipcRenderer.removeListener('voice:error', callback);
  },
  onModelChanged: (callback) => {
    ipcRenderer.on('voice:modelChanged', (_, data) => callback(data));
    return () => ipcRenderer.removeListener('voice:modelChanged', callback);
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.on('voice:download-progress', (_, data) => callback(data));
    return () => ipcRenderer.removeListener('voice:download-progress', callback);
  },
  onHistoryUpdated: (callback) => {
    ipcRenderer.on('voice:historyUpdated', (_, data) => callback(data));
    return () => ipcRenderer.removeListener('voice:historyUpdated', callback);
  }
});

// Cash Leak Detection APIs
contextBridge.exposeInMainWorld('leakDetection', {
  runAnalysis: (options) => ipcRenderer.invoke('leak:run-analysis', options),
  getAnomalies: (filters) => ipcRenderer.invoke('leak:get-anomalies', filters),
  createAnomaly: (data) => ipcRenderer.invoke('leak:create-anomaly', data),
  resolveAnomaly: (id, resolutionNotes) => ipcRenderer.invoke('leak:resolve-anomaly', id, resolutionNotes),
  getConfig: (key) => ipcRenderer.invoke('leak:get-config', key),
  updateConfig: (key, value) => ipcRenderer.invoke('leak:update-config', key, value),
  getDashboardSummary: () => ipcRenderer.invoke('leak:get-dashboard-summary'),
  recordShift: (data) => ipcRenderer.invoke('leak:record-shift', data),
  getShifts: (filters) => ipcRenderer.invoke('leak:get-shifts', filters),
  recordAuditEvent: (data) => ipcRenderer.invoke('leak:record-audit-event', data),
  getAuditLogs: (filters) => ipcRenderer.invoke('leak:get-audit-logs', filters)
});

// File system access for exports
contextBridge.exposeInMainWorld('fileSystem', {
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath)
});
