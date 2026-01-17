/**
 * API Service - Wraps Electron IPC API calls for renderer process
 * This provides a unified interface for accessing Electron main process functionality
 */

const api = {
  // Reports API
  reports: {
    getSalesReport: async (filters) => {
      try {
        return await window.api.reports.getSalesReport(filters);
      } catch (error) {
        console.error('Failed to get sales report:', error);
        return { transactions: [], summary: {} };
      }
    },
    getGSTReport: async (period) => {
      try {
        return await window.api.reports.getGSTReport(period);
      } catch (error) {
        console.error('Failed to get GST report:', error);
        return null;
      }
    },
    getProfitLoss: async (filters) => {
      try {
        return await window.api.reports.getProfitLoss(filters);
      } catch (error) {
        console.error('Failed to get P&L:', error);
        return null;
      }
    }
  },

  // Parties API
  parties: {
    get: async (filters) => {
      try {
        return await window.api.parties.get(filters) || [];
      } catch (error) {
        console.error('Failed to get parties:', error);
        return [];
      }
    }
  },

  // Products API
  products: {
    get: async (filters) => {
      try {
        return await window.api.products.get(filters) || [];
      } catch (error) {
        console.error('Failed to get products:', error);
        return [];
      }
    }
  },

  // Expenses API
  expenses: {
    get: async (filters) => {
      try {
        return await window.api.expenses.get(filters) || [];
      } catch (error) {
        console.error('Failed to get expenses:', error);
        return [];
      }
    }
  },

  // GST Returns API
  gstReturns: {
    get: async () => {
      try {
        return await window.api.reports.getGSTReport(new Date().toISOString().slice(0, 7)) || [];
      } catch (error) {
        console.error('Failed to get GST returns:', error);
        return [];
      }
    }
  },

  // Payments API
  payments: {
    get: async (filters) => {
      try {
        return await window.api.payments.get(filters) || [];
      } catch (error) {
        console.error('Failed to get payments:', error);
        return [];
      }
    }
  },

  // Data Management API
  dataManagement: {
    export: async () => {
      try {
        return await window.api.dataManagement.export() || {};
      } catch (error) {
        console.error('Failed to export data:', error);
        return {};
      }
    },
    exportEncrypted: async (options) => {
      try {
        return await window.api.dataManagement.exportEncrypted(options) || {};
      } catch (error) {
        console.error('Failed to export encrypted data:', error);
        return {};
      }
    }
  }
};

export default api;
