import { create } from 'zustand';

// Main Application Store with Comprehensive State Management
const useAppStore = create((set, get) => ({
  // ==================== LOADING & ERROR STATES ====================
  loading: {
    global: false,
    transactions: false,
    parties: false,
    products: false,
    reports: false,
    alerts: false
  },
  
  error: null,
  
  setLoading: (key, value) => set((state) => ({
    loading: { ...state.loading, [key]: value }
  })),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),

  // ==================== BUSINESS INFO ====================
  businessInfo: {},
  settings: {},
  
  loadBusinessInfo: async () => {
    try {
      const info = await window.api.businessInfo.get();
      set({ businessInfo: info });
      return info;
    } catch (error) {
      console.error('Failed to load business info:', error);
      throw error;
    }
  },
  
  saveBusinessInfo: async (data) => {
    try {
      await window.api.businessInfo.set(data);
      set((state) => ({
        businessInfo: { ...state.businessInfo, ...data }
      }));
      return true;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // ==================== SETTINGS ====================
  loadSettings: async () => {
    try {
      const settings = await window.api.settings.get();
      set({ settings });
      return settings;
    } catch (error) {
      console.error('Failed to load settings:', error);
      throw error;
    }
  },
  
  saveSettings: async (newSettings) => {
    try {
      await window.api.settings.save(newSettings);
      set((state) => ({
        settings: { ...state.settings, ...newSettings }
      }));
      return true;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // ==================== PARTIES/LEDGERS ====================
  parties: [],
  selectedParty: null,
  
  loadParties: async (filters = {}) => {
    get().setLoading('parties', true);
    try {
      const parties = await window.api.parties.get(filters);
      set({ parties, selectedParty: null });
      return parties;
    } catch (error) {
      set({ error: error.message });
      throw error;
    } finally {
      get().setLoading('parties', false);
    }
  },
  
  loadPartyById: async (id) => {
    try {
      const party = await window.api.parties.getById(id);
      set({ selectedParty: party });
      return party;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  getPartyBalance: async (id) => {
    try {
      return await window.api.parties.getBalance(id);
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  addParty: async (party) => {
    try {
      const id = await window.api.parties.add(party);
      await get().loadParties({});
      return id;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  updateParty: async (id, party) => {
    try {
      await window.api.parties.update(id, party);
      await get().loadParties({});
      if (get().selectedParty?.id === id) {
        await get().loadPartyById(id);
      }
      return true;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  deleteParty: async (id) => {
    try {
      await window.api.parties.delete(id);
      await get().loadParties({});
      return true;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // ==================== PRODUCTS/INVENTORY ====================
  products: [],
  selectedProduct: null,
  
  loadProducts: async (filters = {}) => {
    get().setLoading('products', true);
    try {
      const products = await window.api.products.get(filters);
      set({ products, selectedProduct: null });
      return products;
    } catch (error) {
      set({ error: error.message });
      throw error;
    } finally {
      get().setLoading('products', false);
    }
  },
  
  loadProductById: async (id) => {
    try {
      const product = await window.api.products.getById(id);
      set({ selectedProduct: product });
      return product;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  addProduct: async (product) => {
    try {
      const id = await window.api.products.add(product);
      await get().loadProducts({});
      return id;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  updateProduct: async (id, product) => {
    try {
      await window.api.products.update(id, product);
      await get().loadProducts({});
      if (get().selectedProduct?.id === id) {
        await get().loadProductById(id);
      }
      return true;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  deleteProduct: async (id) => {
    try {
      await window.api.products.delete(id);
      await get().loadProducts({});
      return true;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // ==================== TRANSACTIONS ====================
  transactions: [],
  selectedTransaction: null,
  
  loadTransactions: async (filters = {}) => {
    get().setLoading('transactions', true);
    try {
      const transactions = await window.api.transactions.get(filters);
      set({ transactions, selectedTransaction: null });
      return transactions;
    } catch (error) {
      set({ error: error.message });
      throw error;
    } finally {
      get().setLoading('transactions', false);
    }
  },
  
  loadTransactionById: async (id) => {
    try {
      const transaction = await window.api.transactions.getById(id);
      set({ selectedTransaction: transaction });
      return transaction;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  addTransaction: async (transaction) => {
    try {
      const result = await window.api.transactions.add(transaction);
      await get().loadTransactions({});
      return result;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  updateTransaction: async (id, transaction) => {
    try {
      await window.api.transactions.update(id, transaction);
      await get().loadTransactions({});
      if (get().selectedTransaction?.id === id) {
        await get().loadTransactionById(id);
      }
      return true;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  cancelTransaction: async (id, reason) => {
    try {
      await window.api.transactions.cancel(id, reason);
      await get().loadTransactions({});
      return true;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // ==================== PAYMENTS ====================
  payments: [],
  
  loadPayments: async (filters = {}) => {
    try {
      const payments = await window.api.payments.get(filters);
      set({ payments });
      return payments;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  addPayment: async (payment) => {
    try {
      const id = await window.api.payments.add(payment);
      await get().loadPayments({});
      return id;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // ==================== EXPENSES ====================
  expenses: [],
  
  loadExpenses: async (filters = {}) => {
    try {
      const expenses = await window.api.expenses.get(filters);
      set({ expenses });
      return expenses;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  addExpense: async (expense) => {
    try {
      const id = await window.api.expenses.add(expense);
      await get().loadExpenses({});
      return id;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  deleteExpense: async (id) => {
    try {
      await window.api.expenses.delete(id);
      await get().loadExpenses({});
      return true;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // ==================== REPORTS & DASHBOARD ====================
  dashboardSummary: null,
  salesReport: null,
  gstReport: null,
  profitLoss: null,
  balanceSheet: null,
  outstandingAging: null,
  expenseSummary: null,
  cashFlow: null,
  healthScore: null,
  
  loadDashboardSummary: async (period = 'month') => {
    get().setLoading('reports', true);
    try {
      const summary = await window.api.reports.getDashboardSummary(period);
      set({ dashboardSummary: summary });
      return summary;
    } catch (error) {
      set({ error: error.message });
      throw error;
    } finally {
      get().setLoading('reports', false);
    }
  },
  
  loadSalesReport: async (filters = {}) => {
    try {
      const report = await window.api.reports.getSalesReport(filters);
      set({ salesReport: report });
      return report;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  loadGSTReport: async (period) => {
    try {
      const report = await window.api.reports.getGSTReport(period);
      set({ gstReport: report });
      return report;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  loadProfitLoss: async (filters = {}) => {
    try {
      const report = await window.api.reports.getProfitLoss(filters);
      set({ profitLoss: report });
      return report;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  loadBalanceSheet: async (asOnDate) => {
    try {
      const report = await window.api.reports.getBalanceSheet(asOnDate);
      set({ balanceSheet: report });
      return report;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  loadOutstandingAging: async () => {
    try {
      const report = await window.api.reports.getOutstandingAging();
      set({ outstandingAging: report });
      return report;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  loadExpenseSummary: async (filters = {}) => {
    try {
      const report = await window.api.reports.getExpenseSummary(filters);
      set({ expenseSummary: report });
      return report;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  loadCashFlow: async (filters = {}) => {
    try {
      const report = await window.api.reports.getCashFlow(filters);
      set({ cashFlow: report });
      return report;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // ==================== ALERTS ====================
  alerts: [],
  unreadAlertCount: 0,
  alertCountsBySeverity: [],
  
  loadAlerts: async (filters = {}) => {
    get().setLoading('alerts', true);
    try {
      const alerts = await window.api.alerts.get(filters);
      set({ alerts });
      return alerts;
    } catch (error) {
      set({ error: error.message });
      throw error;
    } finally {
      get().setLoading('alerts', false);
    }
  },
  
  loadAlertCount: async () => {
    try {
      const count = await window.api.alerts.getCount();
      set({ 
        unreadAlertCount: count.unread,
        alertCountsBySeverity: count.bySeverity
      });
      return count;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  markAlertRead: async (id) => {
    try {
      await window.api.alerts.markRead(id);
      await get().loadAlerts({});
      await get().loadAlertCount();
      return true;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  dismissAlert: async (id) => {
    try {
      await window.api.alerts.dismiss(id);
      await get().loadAlerts({});
      await get().loadAlertCount();
      return true;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  clearAllAlerts: async () => {
    try {
      await window.api.alerts.clearAll();
      await get().loadAlerts({});
      await get().loadAlertCount();
      return true;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // ==================== HEALTH SCORE ====================
  healthHistory: [],
  
  calculateHealthScore: async (period = 'month') => {
    try {
      const healthScore = await window.api.health.calculate(period);
      set({ healthScore });
      return healthScore;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  loadHealthHistory: async () => {
    try {
      const history = await window.api.health.getHistory();
      set({ healthHistory: history });
      return history;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // ==================== CA MODE ====================
  caDashboard: null,
  auditTrail: [],
  isCAMode: false,
  
  loadCADashboard: async () => {
    try {
      const dashboard = await window.api.caMode.getDashboard();
      set({ caDashboard: dashboard });
      return dashboard;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  loadAuditTrail: async (filters = {}) => {
    try {
      const trail = await window.api.caMode.getAuditTrail(filters);
      set({ auditTrail: trail });
      return trail;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  setCAMode: (enabled) => set({ isCAMode: enabled }),

  // ==================== DATA MANAGEMENT ====================
  exportData: async () => {
    try {
      const data = await window.api.dataManagement.export();
      return data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  importData: async (data) => {
    try {
      const result = await window.api.dataManagement.import(data);
      await get().loadAllData();
      return result;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  backupDatabase: async () => {
    try {
      const result = await window.api.dataManagement.backup();
      return result;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  restoreDatabase: async (backupPath) => {
    try {
      await window.api.dataManagement.restore(backupPath);
      await get().loadAllData();
      return true;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // ==================== CHAT/CONVERSATION ====================
  conversationHistory: [],
  currentChatMessage: '',
  
  addToConversation: (message, response, type = 'user') => {
    const newMessage = {
      id: Date.now(),
      type,
      message,
      response,
      timestamp: new Date().toISOString()
    };
    set((state) => ({
      conversationHistory: [...state.conversationHistory, newMessage]
    }));
    return newMessage;
  },
  
  setCurrentChatMessage: (message) => set({ currentChatMessage: message }),
  
  clearConversation: () => set({ conversationHistory: [] }),

  // ==================== VOICE STATE ====================
  voiceState: {
    isListening: false,
    isSpeaking: false,
    language: 'english',
    audioLevel: 0
  },
  
  setVoiceState: (updates) => set((state) => ({
    voiceState: { ...state.voiceState, ...updates }
  })),

  // ==================== UI STATE ====================
  currentView: 'dashboard',
  sidebarCollapsed: false,
  theme: 'light',
  
  setView: (view) => set({ currentView: view }),
  
  toggleSidebar: () => set((state) => ({
    sidebarCollapsed: !state.sidebarCollapsed
  })),
  
  setTheme: (theme) => set({ theme }),
  
  setDateRange: (range) => set({ dateRange: range }),

  // ==================== INITIALIZATION ====================
  loadAllData: async () => {
    get().setLoading('global', true);
    try {
      await Promise.all([
        get().loadBusinessInfo(),
        get().loadParties({}),
        get().loadProducts({}),
        get().loadTransactions({}),
        get().loadExpenses({}),
        get().loadDashboardSummary('month'),
        get().loadAlerts({}),
        get().loadAlertCount()
      ]);
    } catch (error) {
      console.error('Failed to load all data:', error);
    } finally {
      get().setLoading('global', false);
    }
  },

  // ==================== HELPER GETTERS ====================
  getTodaySales: () => {
    const today = new Date().toISOString().split('T')[0];
    return get().transactions
      .filter(t => t.voucher_type === 'sale' && t.date === today)
      .reduce((sum, t) => sum + (t.total_amount || 0), 0);
  },
  
  getTodayPurchases: () => {
    const today = new Date().toISOString().split('T')[0];
    return get().transactions
      .filter(t => t.voucher_type === 'purchase' && t.date === today)
      .reduce((sum, t) => sum + (t.total_amount || 0), 0);
  },
  
  getMonthlySales: () => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    return get().transactions
      .filter(t => t.voucher_type === 'sale' && t.date.startsWith(thisMonth))
      .reduce((sum, t) => sum + (t.total_amount || 0), 0);
  },
  
  getMonthlyPurchases: () => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    return get().transactions
      .filter(t => t.voucher_type === 'purchase' && t.date.startsWith(thisMonth))
      .reduce((sum, t) => sum + (t.total_amount || 0), 0);
  },
  
  getMonthlyExpenses: () => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    return get().expenses
      .filter(e => e.date.startsWith(thisMonth))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  },
  
  getPendingReceivables: () => {
    return get().transactions
      .filter(t => t.voucher_type === 'sale' && t.payment_status !== 'paid')
      .reduce((sum, t) => sum + ((t.total_amount || 0) - (t.paid_amount || 0)), 0);
  },
  
  getPendingPayables: () => {
    return get().transactions
      .filter(t => t.voucher_type === 'purchase' && t.payment_status !== 'paid')
      .reduce((sum, t) => sum + ((t.total_amount || 0) - (t.paid_amount || 0)), 0);
  },
  
  getProfit: () => {
    const summary = get().dashboardSummary;
    if (summary) {
      return summary.netProfit || 0;
    }
    return get().getMonthlySales() - get().getMonthlyPurchases() - get().getMonthlyExpenses();
  },
  
  getCustomerCount: () => {
    return get().parties.filter(p => p.type === 'customer').length;
  },
  
  getSupplierCount: () => {
    return get().parties.filter(p => p.type === 'supplier').length;
  },
  
  getLowStockProducts: () => {
    return get().products.filter(p => p.current_stock <= p.min_stock);
  }
}));

export default useAppStore;
