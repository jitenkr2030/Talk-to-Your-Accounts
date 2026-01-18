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
  getPartyBalance: (partyId) => ipcRenderer.invoke('voice-get-party-balance', partyId)
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
  search: (query, filters) => ipcRenderer.invoke('search-audit-logs', query, filters)
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
  recordPayment: (paymentData) => ipcRenderer.invoke('subscription/record-payment', paymentData)
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
  getStatistics: (period) => ipcRenderer.invoke('invoice:get-statistics', period)
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
  
  // New Voice Module (Offline)
  voiceModule,

  // Subscription & Monetization
  subscription,

  // Invoice Scanning
  invoiceScanning,

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

// File system access for exports
contextBridge.exposeInMainWorld('fileSystem', {
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath)
});
