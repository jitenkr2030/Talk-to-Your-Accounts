import { create } from 'zustand';

const useAppStore = create((set, get) => ({
  // Business Info
  businessInfo: {},
  loading: false,
  error: null,

  // Data
  transactions: [],
  parties: [],
  products: [],
  expenses: [],
  fraudAlerts: [],
  auditLogs: [],

  // UI State
  currentView: 'dashboard',
  selectedTransaction: null,
  dateRange: { start: null, end: null },

  // Actions
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Business Info Actions
  loadBusinessInfo: async () => {
    try {
      const info = await window.electronAPI.getBusinessInfo();
      set({ businessInfo: info });
    } catch (error) {
      console.error('Failed to load business info:', error);
    }
  },

  saveBusinessInfo: async (data) => {
    try {
      await window.electronAPI.setBusinessInfo(data);
      set((state) => ({
        businessInfo: { ...state.businessInfo, ...data }
      }));
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Transaction Actions
  loadTransactions: async (filters = {}) => {
    set({ loading: true });
    try {
      const transactions = await window.electronAPI.getTransactions(filters);
      set({ transactions, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  addTransaction: async (transaction) => {
    try {
      // Check for fraud patterns
      const alerts = await window.electronAPI.checkFraudPatterns(transaction);
      
      // Add transaction
      const id = await window.electronAPI.addTransaction(transaction);
      
      // Reload transactions
      await get().loadTransactions({});
      
      return { id, alerts };
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Party Actions
  loadParties: async () => {
    try {
      const parties = await window.electronAPI.getParties();
      set({ parties });
    } catch (error) {
      set({ error: error.message });
    }
  },

  addParty: async (party) => {
    try {
      const id = await window.electronAPI.addParty(party);
      await get().loadParties();
      return id;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  updateParty: async (id, party) => {
    try {
      await window.electronAPI.updateParty(id, party);
      await get().loadParties();
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteParty: async (id) => {
    try {
      await window.electronAPI.deleteParty(id);
      await get().loadParties();
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Product Actions
  loadProducts: async () => {
    try {
      const products = await window.electronAPI.getProducts();
      set({ products });
    } catch (error) {
      set({ error: error.message });
    }
  },

  addProduct: async (product) => {
    try {
      const id = await window.electronAPI.addProduct(product);
      await get().loadProducts();
      return id;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  updateProduct: async (id, product) => {
    try {
      await window.electronAPI.updateProduct(id, product);
      await get().loadProducts();
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteProduct: async (id) => {
    try {
      await window.electronAPI.deleteProduct(id);
      await get().loadProducts();
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Expense Actions
  loadExpenses: async (filters = {}) => {
    try {
      const expenses = await window.electronAPI.getExpenses(filters);
      set({ expenses });
    } catch (error) {
      set({ error: error.message });
    }
  },

  addExpense: async (expense) => {
    try {
      const id = await window.electronAPI.addExpense(expense);
      await get().loadExpenses({});
      return id;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Fraud Detection Actions
  loadFraudAlerts: async () => {
    try {
      const fraudAlerts = await window.electronAPI.getFraudAlerts();
      set({ fraudAlerts });
    } catch (error) {
      set({ error: error.message });
    }
  },

  resolveFraudAlert: async (id) => {
    try {
      await window.electronAPI.resolveFraudAlert(id);
      await get().loadFraudAlerts();
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Audit Log Actions
  loadAuditLogs: async (limit = 100) => {
    try {
      const auditLogs = await window.electronAPI.getAuditLogs(limit);
      set({ auditLogs });
    } catch (error) {
      set({ error: error.message });
    }
  },

  // Navigation Actions
  setView: (view) => set({ currentView: view }),
  
  setSelectedTransaction: (transaction) => set({ selectedTransaction: transaction }),
  
  setDateRange: (range) => set({ dateRange: range }),

  // Helper Getters
  getTodaySales: () => {
    const today = new Date().toISOString().split('T')[0];
    return get().transactions
      .filter(t => t.type === 'sale' && t.created_at.startsWith(today))
      .reduce((sum, t) => sum + t.total_amount, 0);
  },

  getPendingPayments: () => {
    return get().transactions
      .filter(t => t.payment_status !== 'paid')
      .reduce((sum, t) => sum + (t.total_amount - (t.paid_amount || 0)), 0);
  },

  getMonthlySales: () => {
    const thisMonth = new Date().toISOString().split('T')[0].substring(0, 7);
    return get().transactions
      .filter(t => t.type === 'sale' && t.created_at.startsWith(thisMonth))
      .reduce((sum, t) => sum + t.total_amount, 0);
  },

  getMonthlyPurchases: () => {
    const thisMonth = new Date().toISOString().split('T')[0].substring(0, 7);
    return get().transactions
      .filter(t => t.type === 'purchase' && t.created_at.startsWith(thisMonth))
      .reduce((sum, t) => sum + t.total_amount, 0);
  },

  getMonthlyExpenses: () => {
    const thisMonth = new Date().toISOString().split('T')[0].substring(0, 7);
    return get().expenses
      .filter(e => e.date.startsWith(thisMonth))
      .reduce((sum, e) => sum + e.amount, 0);
  },
}));

export default useAppStore;
