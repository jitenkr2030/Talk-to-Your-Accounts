const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Business Info
  getBusinessInfo: () => ipcRenderer.invoke('get-business-info'),
  setBusinessInfo: (data) => ipcRenderer.invoke('set-business-info', data),
  
  // Parties
  getParties: () => ipcRenderer.invoke('get-parties'),
  addParty: (party) => ipcRenderer.invoke('add-party', party),
  updateParty: (id, party) => ipcRenderer.invoke('update-party', id, party),
  deleteParty: (id) => ipcRenderer.invoke('delete-party', id),
  
  // Products
  getProducts: () => ipcRenderer.invoke('get-products'),
  addProduct: (product) => ipcRenderer.invoke('add-product', product),
  updateProduct: (id, product) => ipcRenderer.invoke('update-product', id, product),
  deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
  
  // Transactions
  getTransactions: (filters) => ipcRenderer.invoke('get-transactions', filters),
  addTransaction: (transaction) => ipcRenderer.invoke('add-transaction', transaction),
  
  // Payments
  getPayments: (transactionId) => ipcRenderer.invoke('get-payments', transactionId),
  addPayment: (payment) => ipcRenderer.invoke('add-payment', payment),
  
  // Expenses
  getExpenses: (filters) => ipcRenderer.invoke('get-expenses', filters),
  addExpense: (expense) => ipcRenderer.invoke('add-expense', expense),
  
  // Reports
  getSalesReport: (period) => ipcRenderer.invoke('get-sales-report', period),
  getGSTReport: (period) => ipcRenderer.invoke('get-gst-report', period),
  getProfitLoss: (period) => ipcRenderer.invoke('get-profit-loss', period),
  getBalanceSheet: () => ipcRenderer.invoke('get-balance-sheet'),
  getOutstandingAging: () => ipcRenderer.invoke('get-outstanding-aging'),
  getExpenseSummary: (period) => ipcRenderer.invoke('get-expense-summary', period),
  
  // Audit
  getAuditLogs: (limit) => ipcRenderer.invoke('get-audit-logs', limit),
  
  // Fraud Detection
  getFraudAlerts: () => ipcRenderer.invoke('get-fraud-alerts'),
  resolveFraudAlert: (id) => ipcRenderer.invoke('resolve-fraud-alert', id),
  checkFraudPatterns: (transaction) => ipcRenderer.invoke('check-fraud-patterns', transaction),
  
  // Reconciliation
  getReconciliations: () => ipcRenderer.invoke('get-reconciliations'),
  startReconciliation: (data) => ipcRenderer.invoke('start-reconciliation', data),
  addReconciliationItem: (item) => ipcRenderer.invoke('add-reconciliation-item', item),
  
  // Mistake Memory
  getMistakePatterns: () => ipcRenderer.invoke('get-mistake-patterns'),
  addMistakePattern: (pattern, correction) => ipcRenderer.invoke('add-mistake-pattern', pattern, correction),
  deleteMistakePattern: (id) => ipcRenderer.invoke('delete-mistake-pattern', id),
  
  // Import/Export
  importData: (data) => ipcRenderer.invoke('import-data', data),
  exportData: (format) => ipcRenderer.invoke('export-data', format),
});
