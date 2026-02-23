/**
 * IndexedDB Database Layer for Offline Support
 * Uses Dexie.js-style API for easier database operations
 */

class OfflineDatabase {
  constructor() {
    this.dbName = 'TalkToAccountsDB';
    this.version = 1;
    this.db = null;
    this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('[OfflineDB] Failed to open database');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OfflineDB] Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('transactions')) {
          db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
        }
        
        if (!db.objectStoreNames.contains('parties')) {
          db.createObjectStore('parties', { keyPath: 'id', autoIncrement: true });
        }
        
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
        }
        
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('status', 'status', { unique: false });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
        
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        console.log('[OfflineDB] Database schema created');
      };
    });
  }

  // Generic CRUD operations
  async add(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // Query with filters
  async where(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Sync Queue operations
  async addToSyncQueue(type, payload) {
    const item = {
      type,
      payload,
      status: 'pending',
      timestamp: Date.now(),
      retries: 0
    };
    return this.add('syncQueue', item);
  }

  async getPendingSyncItems() {
    return this.where('syncQueue', 'status', 'pending');
  }

  async updateSyncItem(id, updates) {
    const item = await this.get('syncQueue', id);
    if (item) {
      return this.put('syncQueue', { ...item, ...updates });
    }
  }

  async removeSyncItem(id) {
    return this.delete('syncQueue', id);
  }

  // Cache operations
  async setCache(key, value, expiryMs = 3600000) {
    const cacheItem = {
      key,
      value,
      expiry: Date.now() + expiryMs
    };
    return this.put('cache', cacheItem);
  }

  async getCache(key) {
    const item = await this.get('cache', key);
    if (item && item.expiry > Date.now()) {
      return item.value;
    }
    if (item) {
      await this.delete('cache', key);
    }
    return null;
  }

  // Settings operations
  async setSetting(key, value) {
    return this.put('settings', { key, value });
  }

  async getSetting(key, defaultValue = null) {
    const item = await this.get('settings', key);
    return item ? item.value : defaultValue;
  }

  // Bulk operations
  async bulkPut(storeName, items) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      items.forEach(item => store.put(item));
      
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Clear all data
  async clearAll() {
    const stores = ['transactions', 'parties', 'products', 'syncQueue', 'cache', 'settings'];
    return Promise.all(stores.map(store => this.clear(store)));
  }

  // Get storage estimate
  async getStorageEstimate() {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage,
        quota: estimate.quota,
        usagePercentage: ((estimate.usage / estimate.quota) * 100).toFixed(2)
      };
    }
    return null;
  }
}

// Create singleton instance
const offlineDB = new OfflineDatabase();

// Export for use in the app
window.offlineDB = offlineDB;

export default offlineDB;
