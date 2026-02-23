import offlineDB from './offlineDatabase';

/**
 * DataSyncManager handles synchronization between local IndexedDB
 * and the backend API when network connectivity is restored
 */
class DataSyncManager {
  constructor() {
    this.isSyncing = false;
    this.listeners = [];
  }

  // Subscribe to sync events
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // Notify all listeners
  notify(event, data) {
    this.listeners.forEach(callback => callback(event, data));
  }

  // Initialize sync listener
  init() {
    if (typeof window !== 'undefined') {
      window.addEventListener('app:syncData', () => {
        this.syncAll();
      });

      window.addEventListener('app:syncRequested', () => {
        if (navigator.onLine) {
          this.syncAll();
        }
      });
    }
  }

  // Sync all pending data
  async syncAll() {
    if (this.isSyncing || !navigator.onLine) {
      return;
    }

    this.isSyncing = true;
    this.notify('sync:started', {});

    try {
      // Process pending queue using the global syncQueue instance
      if (window.syncQueue) {
        await window.syncQueue.processQueue();
      }

      // Refresh data from server
      await this.refreshCache();

      this.notify('sync:completed', {});
    } catch (error) {
      console.error('Sync failed:', error);
      this.notify('sync:failed', { error });
    } finally {
      this.isSyncing = false;
    }
  }

  // Refresh local cache from server
  async refreshCache() {
    try {
      // Get all transactions from server and update IndexedDB
      if (window.api?.transactions) {
        const transactions = await window.api.transactions.getAll();
        if (transactions) {
          await offlineDB.transactions.bulkPut(transactions);
        }
      }

      // Get all parties from server and update IndexedDB
      if (window.api?.parties) {
        const parties = await window.api.parties.getAll();
        if (parties) {
          await offlineDB.parties.bulkPut(parties);
        }
      }

      // Get all products from server and update IndexedDB
      if (window.api?.products) {
        const products = await window.api.products.getAll();
        if (products) {
          await offlineDB.products.bulkPut(products);
        }
      }

      // Get all expenses from server and update IndexedDB
      if (window.api?.expenses) {
        const expenses = await window.api.expenses.getAll();
        if (expenses) {
          await offlineDB.expenses.bulkPut(expenses);
        }
      }

      this.notify('cache:refreshed', {});
    } catch (error) {
      console.error('Cache refresh failed:', error);
      throw error;
    }
  }

  // Get data from local cache (offline-first)
  async getFromCache(table) {
    try {
      return await offlineDB[table].toArray();
    } catch (error) {
      console.error(`Failed to get ${table} from cache:`, error);
      return [];
    }
  }

  // Save data to local cache
  async saveToCache(table, data) {
    try {
      if (Array.isArray(data)) {
        await offlineDB[table].bulkPut(data);
      } else {
        await offlineDB[table].put(data);
      }
      return true;
    } catch (error) {
      console.error(`Failed to save ${table} to cache:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const dataSyncManager = new DataSyncManager();
export default dataSyncManager;
