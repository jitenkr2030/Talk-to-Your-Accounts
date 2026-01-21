import { create } from 'zustand';

// Helper to safely check if API is available
const isApiAvailable = () => {
  return typeof window !== 'undefined' && 
         window.api && 
         typeof window.api.auth === 'object';
};

// Safe API call wrapper
const safeApiCall = async (apiCall, fallback = null) => {
  if (!isApiAvailable()) {
    console.warn('API not available, skipping call');
    return fallback;
  }
  try {
    return await apiCall();
  } catch (error) {
    console.error('API call failed:', error);
    return fallback;
  }
};

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

  // ==================== AUTHENTICATION STATE ====================
  isAuthenticated: false,
  currentUser: null,
  sessionToken: null,
  isLoadingAuth: false,
  
  login: async (username, pin) => {
    get().setLoading('auth', true);
    try {
      const result = await safeApiCall(
        () => window.api.auth.authenticate(username, pin),
        { success: false, message: 'API not available' }
      );
      if (result && result.success) {
        set({
          isAuthenticated: true,
          currentUser: {
            id: result.session.userId,
            username: result.session.username,
            role: result.session.role
          },
          sessionToken: result.session.token,
          error: null
        });
        // Store session in localStorage for persistence
        localStorage.setItem('sessionToken', result.session.token);
        localStorage.setItem('currentUser', JSON.stringify(result.session));
        return { success: true };
      } else {
        set({ error: result?.message || 'Authentication failed' });
        return { success: false, error: result?.message || 'Authentication failed', errorCode: result?.error };
      }
    } catch (error) {
      set({ error: 'Authentication failed. Please try again.' });
      return { success: false, error: error.message };
    } finally {
      get().setLoading('auth', false);
    }
  },
  
  logout: async () => {
    try {
      const token = get().sessionToken;
      if (token && isApiAvailable()) {
        await window.api.auth.logout(token);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      set({
        isAuthenticated: false,
        currentUser: null,
        sessionToken: null
      });
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('currentUser');
    }
  },
  
  checkAuthStatus: async () => {
    const storedUser = localStorage.getItem('currentUser');
    const storedToken = localStorage.getItem('sessionToken');
    
    if (storedUser && storedToken) {
      try {
        const user = JSON.parse(storedUser);
        // Verify session is still valid
        set({
          isAuthenticated: true,
          currentUser: {
            id: user.userId,
            username: user.username,
            role: user.role
          },
          sessionToken: storedToken
        });
        return true;
      } catch (error) {
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('currentUser');
        return false;
      }
    }
    return false;
  },
  
  loadUsers: async () => {
    return await safeApiCall(
      () => window.api.auth.getUsers(),
      { users: [] }
    )?.users || [];
  },
  
  createUser: async (userData) => {
    return await safeApiCall(
      () => window.api.auth.createUser(userData),
      { success: false, error: 'API not available' }
    );
  },
  
  deleteUser: async (userId) => {
    return await safeApiCall(
      () => window.api.auth.deleteUser(userId),
      { success: false, error: 'API not available' }
    );
  },
  
  updateUserPin: async (userId, oldPin, newPin) => {
    return await safeApiCall(
      () => window.api.auth.updateUserPin(userId, oldPin, newPin),
      { success: false, error: 'API not available' }
    );
  },

  // ==================== BUSINESS INFO ====================
  businessInfo: {},
  settings: {},
  
  loadBusinessInfo: async () => {
    const info = await safeApiCall(
      () => window.api.businessInfo.get(),
      {}
    );
    set({ businessInfo: info || {} });
    return info || {};
  },
  
  saveBusinessInfo: async (data) => {
    const result = await safeApiCall(
      () => window.api.businessInfo.set(data),
      false
    );
    if (result) {
      set((state) => ({
        businessInfo: { ...state.businessInfo, ...data }
      }));
    }
    return result;
  },

  // ==================== SETTINGS ====================
  loadSettings: async () => {
    const settings = await safeApiCall(
      () => window.api.settings.get(),
      {}
    );
    set({ settings: settings || {} });
    return settings || {};
  },
  
  saveSettings: async (newSettings) => {
    const result = await safeApiCall(
      () => window.api.settings.save(newSettings),
      false
    );
    if (result) {
      set((state) => ({
        settings: { ...state.settings, ...newSettings }
      }));
    }
    return result;
  },

  // ==================== PARTIES/LEDGERS ====================
  parties: [],
  selectedParty: null,
  
  loadParties: async (filters = {}) => {
    get().setLoading('parties', true);
    try {
      const parties = await safeApiCall(
        () => window.api.parties.get(filters),
        []
      );
      set({ parties: parties || [], selectedParty: null });
      return parties || [];
    } catch (error) {
      set({ error: error.message });
      return [];
    } finally {
      get().setLoading('parties', false);
    }
  },
  
  loadPartyById: async (id) => {
    const party = await safeApiCall(
      () => window.api.parties.getById(id),
      null
    );
    set({ selectedParty: party });
    return party;
  },
  
  getPartyBalance: async (id) => {
    return await safeApiCall(
      () => window.api.parties.getBalance(id),
      null
    );
  },
  
  addParty: async (party) => {
    const id = await safeApiCall(
      () => window.api.parties.add(party),
      null
    );
    if (id) {
      await get().loadParties({});
    }
    return id;
  },
  
  updateParty: async (id, party) => {
    const result = await safeApiCall(
      () => window.api.parties.update(id, party),
      false
    );
    if (result) {
      await get().loadParties({});
      if (get().selectedParty?.id === id) {
        await get().loadPartyById(id);
      }
    }
    return result;
  },
  
  deleteParty: async (id) => {
    const result = await safeApiCall(
      () => window.api.parties.delete(id),
      false
    );
    if (result) {
      await get().loadParties({});
    }
    return result;
  },

  // ==================== PRODUCTS/INVENTORY ====================
  products: [],
  selectedProduct: null,
  
  loadProducts: async (filters = {}) => {
    get().setLoading('products', true);
    try {
      const products = await safeApiCall(
        () => window.api.products.get(filters),
        []
      );
      set({ products: products || [], selectedProduct: null });
      return products || [];
    } catch (error) {
      set({ error: error.message });
      return [];
    } finally {
      get().setLoading('products', false);
    }
  },
  
  loadProductById: async (id) => {
    const product = await safeApiCall(
      () => window.api.products.getById(id),
      null
    );
    set({ selectedProduct: product });
    return product;
  },
  
  addProduct: async (product) => {
    const id = await safeApiCall(
      () => window.api.products.add(product),
      null
    );
    if (id) {
      await get().loadProducts({});
    }
    return id;
  },
  
  updateProduct: async (id, product) => {
    const result = await safeApiCall(
      () => window.api.products.update(id, product),
      false
    );
    if (result) {
      await get().loadProducts({});
      if (get().selectedProduct?.id === id) {
        await get().loadProductById(id);
      }
    }
    return result;
  },
  
  deleteProduct: async (id) => {
    const result = await safeApiCall(
      () => window.api.products.delete(id),
      false
    );
    if (result) {
      await get().loadProducts({});
    }
    return result;
  },

  // ==================== TRANSACTIONS ====================
  transactions: [],
  selectedTransaction: null,
  
  loadTransactions: async (filters = {}) => {
    get().setLoading('transactions', true);
    try {
      const transactions = await safeApiCall(
        () => window.api.transactions.get(filters),
        []
      );
      set({ transactions: transactions || [], selectedTransaction: null });
      return transactions || [];
    } catch (error) {
      set({ error: error.message });
      return [];
    } finally {
      get().setLoading('transactions', false);
    }
  },
  
  loadTransactionById: async (id) => {
    const transaction = await safeApiCall(
      () => window.api.transactions.getById(id),
      null
    );
    set({ selectedTransaction: transaction });
    return transaction;
  },
  
  addTransaction: async (transaction) => {
    const result = await safeApiCall(
      () => window.api.transactions.add(transaction),
      null
    );
    if (result) {
      await get().loadTransactions({});
    }
    return result;
  },
  
  updateTransaction: async (id, transaction) => {
    const result = await safeApiCall(
      () => window.api.transactions.update(id, transaction),
      false
    );
    if (result) {
      await get().loadTransactions({});
      if (get().selectedTransaction?.id === id) {
        await get().loadTransactionById(id);
      }
    }
    return result;
  },
  
  cancelTransaction: async (id, reason) => {
    const result = await safeApiCall(
      () => window.api.transactions.cancel(id, reason),
      false
    );
    if (result) {
      await get().loadTransactions({});
    }
    return result;
  },

  // ==================== PAYMENTS ====================
  payments: [],
  
  loadPayments: async (filters = {}) => {
    const payments = await safeApiCall(
      () => window.api.payments.get(filters),
      []
    );
    set({ payments: payments || [] });
    return payments || [];
  },
  
  addPayment: async (payment) => {
    const id = await safeApiCall(
      () => window.api.payments.add(payment),
      null
    );
    if (id) {
      await get().loadPayments({});
    }
    return id;
  },

  // ==================== EXPENSES ====================
  expenses: [],
  
  loadExpenses: async (filters = {}) => {
    const expenses = await safeApiCall(
      () => window.api.expenses.get(filters),
      []
    );
    set({ expenses: expenses || [] });
    return expenses || [];
  },
  
  addExpense: async (expense) => {
    const id = await safeApiCall(
      () => window.api.expenses.add(expense),
      null
    );
    if (id) {
      await get().loadExpenses({});
    }
    return id;
  },
  
  deleteExpense: async (id) => {
    const result = await safeApiCall(
      () => window.api.expenses.delete(id),
      false
    );
    if (result) {
      await get().loadExpenses({});
    }
    return result;
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
      const summary = await safeApiCall(
        () => window.api.reports.getDashboardSummary(period),
        null
      );
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
      const report = await safeApiCall(
        () => window.api.reports.getSalesReport(filters),
        null
      );
      set({ salesReport: report });
      return report;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  loadGSTReport: async (period) => {
    try {
      const report = await safeApiCall(
        () => window.api.reports.getGSTReport(period),
        null
      );
      set({ gstReport: report });
      return report;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  loadProfitLoss: async (filters = {}) => {
    try {
      const report = await safeApiCall(
        () => window.api.reports.getProfitLoss(filters),
        null
      );
      set({ profitLoss: report });
      return report;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  loadBalanceSheet: async (asOnDate) => {
    try {
      const report = await safeApiCall(
        () => window.api.reports.getBalanceSheet(asOnDate),
        null
      );
      set({ balanceSheet: report });
      return report;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  loadOutstandingAging: async () => {
    try {
      const report = await safeApiCall(
        () => window.api.reports.getOutstandingAging(),
        null
      );
      set({ outstandingAging: report });
      return report;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  loadExpenseSummary: async (filters = {}) => {
    try {
      const report = await safeApiCall(
        () => window.api.reports.getExpenseSummary(filters),
        null
      );
      set({ expenseSummary: report });
      return report;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  loadCashFlow: async (filters = {}) => {
    try {
      const report = await safeApiCall(
        () => window.api.reports.getCashFlow(filters),
        null
      );
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
      const alerts = await safeApiCall(
        () => window.api.alerts.get(filters),
        []
      );
      set({ alerts: alerts || [] });
      return alerts || [];
    } catch (error) {
      set({ error: error.message });
      throw error;
    } finally {
      get().setLoading('alerts', false);
    }
  },
  
  loadAlertCount: async () => {
    try {
      const count = await safeApiCall(
        () => window.api.alerts.getCount(),
        { unread: 0, bySeverity: [] }
      );
      set({ 
        unreadAlertCount: count?.unread || 0,
        alertCountsBySeverity: count?.bySeverity || []
      });
      return count;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  markAlertRead: async (id) => {
    try {
      await safeApiCall(
        () => window.api.alerts.markRead(id),
        false
      );
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
      await safeApiCall(
        () => window.api.alerts.dismiss(id),
        false
      );
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
      await safeApiCall(
        () => window.api.alerts.clearAll(),
        false
      );
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
      const healthScore = await safeApiCall(
        () => window.api.health.calculate(period),
        null
      );
      set({ healthScore });
      return healthScore;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  loadHealthHistory: async () => {
    try {
      const history = await safeApiCall(
        () => window.api.health.getHistory(),
        []
      );
      set({ healthHistory: history || [] });
      return history || [];
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
      const dashboard = await safeApiCall(
        () => window.api.caMode.getDashboard(),
        null
      );
      set({ caDashboard: dashboard });
      return dashboard;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  loadAuditTrail: async (filters = {}) => {
    try {
      const trail = await safeApiCall(
        () => window.api.caMode.getAuditTrail(filters),
        []
      );
      set({ auditTrail: trail || [] });
      return trail || [];
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  setCAMode: (enabled) => set({ isCAMode: enabled }),

  // ==================== DATA MANAGEMENT ====================
  exportData: async () => {
    try {
      const data = await safeApiCall(
        () => window.api.dataManagement.export(),
        null
      );
      return data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  importData: async (data) => {
    try {
      const result = await safeApiCall(
        () => window.api.dataManagement.import(data),
        { success: false }
      );
      await get().loadAllData();
      return result;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  backupDatabase: async () => {
    try {
      const result = await safeApiCall(
        () => window.api.dataManagement.backup(),
        null
      );
      return result;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  restoreDatabase: async (backupPath) => {
    try {
      await safeApiCall(
        () => window.api.dataManagement.restore(backupPath),
        false
      );
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
  },

  // ==================== SUBSCRIPTION STATE ====================
  subscription: {
    plans: [],
    currentSubscription: null,
    usage: null,
    usageLimits: null,
    isLoading: false,
    showPricingModal: false
  },

  loadPlans: async () => {
    get().setLoading('subscription', true);
    try {
      const plans = await safeApiCall(
        () => window.api.subscription.getPlans(),
        []
      );
      set((state) => ({
        subscription: { ...state.subscription, plans: plans || [] }
      }));
      return plans || [];
    } catch (error) {
      set({ error: error.message });
      throw error;
    } finally {
      get().setLoading('subscription', false);
    }
  },

  loadSubscription: async (userId) => {
    get().setLoading('subscription', true);
    try {
      const subscription = await safeApiCall(
        () => window.api.subscription.getSubscription(userId),
        null
      );
      const usage = await safeApiCall(
        () => window.api.subscription.getUsage(userId),
        null
      );
      const limits = await safeApiCall(
        () => window.api.subscription.checkLimits(userId),
        null
      );
      set((state) => ({
        subscription: {
          ...state.subscription,
          currentSubscription: subscription,
          usage,
          usageLimits: limits
        }
      }));
      return { subscription, usage, limits };
    } catch (error) {
      set({ error: error.message });
      throw error;
    } finally {
      get().setLoading('subscription', false);
    }
  },

  createSubscription: async (userId, planId, billingCycle) => {
    try {
      const subscription = await safeApiCall(
        () => window.api.subscription.create(userId, planId, billingCycle),
        null
      );
      await get().loadSubscription(userId);
      return subscription;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  checkUsageLimits: async (userId) => {
    try {
      const limits = await safeApiCall(
        () => window.api.subscription.checkLimits(userId),
        null
      );
      set((state) => ({
        subscription: { ...state.subscription, usageLimits: limits }
      }));
      return limits;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  incrementUsage: async (userId, type) => {
    try {
      await safeApiCall(
        () => window.api.subscription.incrementUsage(userId, type),
        false
      );
      await get().loadSubscription(userId);
    } catch (error) {
      console.error('Failed to increment usage:', error);
    }
  },

  showPricingModal: (show) => set((state) => ({
    subscription: { ...state.subscription, showPricingModal: show }
  })),

  getPlanById: (planId) => {
    return get().subscription.plans.find(p => p.plan_id === planId);
  }
}));

export default useAppStore;
