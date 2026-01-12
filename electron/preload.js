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
  import: (data) => ipcRenderer.invoke('import-data', data),
  backup: () => ipcRenderer.invoke('backup-database'),
  restore: (backupPath) => ipcRenderer.invoke('restore-database', backupPath)
};

// Settings APIs
const settings = {
  get: () => ipcRenderer.invoke('get-settings'),
  save: (settings) => ipcRenderer.invoke('save-settings', settings)
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
  
  // Utility
  ping: () => 'pong'
});

// Voice recognition API (browser-based, exposed through context bridge)
contextBridge.exposeInMainWorld('voiceAPI', {
  isSupported: () => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
  
  start: (options) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = options?.continuous || false;
    recognition.interimResults = options?.interimResults || false;
    recognition.lang = options?.lang || 'en-IN';
    
    return recognition;
  },
  
  speak: (text, options) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options?.lang || 'en-IN';
    utterance.rate = options?.rate || 1;
    utterance.pitch = options?.pitch || 1;
    utterance.volume = options?.volume || 1;
    
    return new Promise((resolve, reject) => {
      utterance.onend = resolve;
      utterance.onerror = reject;
      window.speechSynthesis.speak(utterance);
    });
  }
});

// File system access for exports
contextBridge.exposeInMainWorld('fileSystem', {
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath)
});
