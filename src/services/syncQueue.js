/**
 * Sync Queue Service
 * Handles offline mutations and synchronizes them when connectivity is restored
 */

class SyncQueueService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.isSyncing = false;
    this.listeners = [];
    this.pendingCount = 0;
    
    // Initialize network listeners
    this.initNetworkListeners();
    
    // Load pending items count
    this.updatePendingCount();
  }

  initNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('[SyncQueue] Network online - triggering sync');
      this.notifyListeners('online');
      this.processQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('[SyncQueue] Network offline');
      this.notifyListeners('offline');
    });
  }

  // Add listener for sync events
  addListener(callback) {
    this.listeners.push(callback);
  }

  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  notifyListeners(event, data = {}) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (err) {
        console.error('[SyncQueue] Listener error:', err);
      }
    });
  }

  // Update pending items count
  async updatePendingCount() {
    try {
      const pending = await window.offlineDB.getPendingSyncItems();
      this.pendingCount = pending.length;
      this.notifyListeners('countUpdate', { count: this.pendingCount });
    } catch (err) {
      console.error('[SyncQueue] Error getting pending count:', err);
    }
  }

  // Add item to sync queue
  async add(type, payload, priority = 0) {
    try {
      await window.offlineDB.addToSyncQueue(type, payload);
      this.pendingCount++;
      this.notifyListeners('itemAdded', { type, count: this.pendingCount });
      
      console.log(`[SyncQueue] Added ${type} to queue (${this.pendingCount} pending)`);
      
      // Try to sync immediately if online
      if (this.isOnline) {
        this.processQueue();
      }
      
      return true;
    } catch (err) {
      console.error('[SyncQueue] Error adding to queue:', err);
      return false;
    }
  }

  // Process all pending items in the queue
  async processQueue() {
    if (!this.isOnline || this.isSyncing) {
      console.log('[SyncQueue] Skipping sync - offline or already syncing');
      return;
    }

    this.isSyncing = true;
    this.notifyListeners('syncStart', {});

    try {
      const pendingItems = await window.offlineDB.getPendingSyncItems();
      
      console.log(`[SyncQueue] Processing ${pendingItems.length} pending items`);

      for (const item of pendingItems) {
        try {
          await this.processItem(item);
          await window.offlineDB.removeSyncItem(item.id);
          console.log(`[SyncQueue] Synced item ${item.id}: ${item.type}`);
        } catch (err) {
          console.error(`[SyncQueue] Error processing item ${item.id}:`, err);
          
          // Update retry count
          const retries = (item.retries || 0) + 1;
          
          if (retries >= 3) {
            // Max retries exceeded - mark as failed
            await window.offlineDB.updateSyncItem(item.id, {
              status: 'failed',
              error: err.message,
              lastAttempt: Date.now()
            });
            this.notifyListeners('itemFailed', { item, error: err.message });
          } else {
            // Update retry count
            await window.offlineDB.updateSyncItem(item.id, {
              status: 'retrying',
              retries,
              lastAttempt: Date.now()
            });
          }
        }
      }
    } catch (err) {
      console.error('[SyncQueue] Error processing queue:', err);
    } finally {
      this.isSyncing = false;
      await this.updatePendingCount();
      this.notifyListeners('syncComplete', {});
    }
  }

  // Process a single sync item
  async processItem(item) {
    const { type, payload } = item;
    
    switch (type) {
      case 'CREATE_TRANSACTION':
        return this.syncCreateTransaction(payload);
      case 'UPDATE_TRANSACTION':
        return this.syncUpdateTransaction(payload);
      case 'DELETE_TRANSACTION':
        return this.syncDeleteTransaction(payload);
      case 'CREATE_PARTY':
        return this.syncCreateParty(payload);
      case 'UPDATE_PARTY':
        return this.syncUpdateParty(payload);
      case 'CREATE_PRODUCT':
        return this.syncCreateProduct(payload);
      case 'UPDATE_PRODUCT':
        return this.syncUpdateProduct(payload);
      default:
        console.warn(`[SyncQueue] Unknown sync type: ${type}`);
        return { success: false, error: 'Unknown sync type' };
    }
  }

  // Sync transaction operations
  async syncCreateTransaction(payload) {
    const result = await window.api.transaction.add(payload);
    if (result && result.id) {
      // Update local transaction with server ID
      await window.offlineDB.put('transactions', {
        ...payload,
        id: result.id,
        synced: true,
        syncedAt: Date.now()
      });
      return result;
    }
    throw new Error(result?.error || 'Failed to create transaction');
  }

  async syncUpdateTransaction(payload) {
    const result = await window.api.transaction.update(payload.id, payload);
    if (result) {
      await window.offlineDB.put('transactions', {
        ...payload,
        synced: true,
        syncedAt: Date.now()
      });
      return result;
    }
    throw new Error('Failed to update transaction');
  }

  async syncDeleteTransaction(payload) {
    const result = await window.api.transaction.delete(payload.id);
    if (result) {
      await window.offlineDB.delete('transactions', payload.id);
      return result;
    }
    throw new Error('Failed to delete transaction');
  }

  // Sync party operations
  async syncCreateParty(payload) {
    const result = await window.api.party.add(payload);
    if (result && result.id) {
      await window.offlineDB.put('parties', {
        ...payload,
        id: result.id,
        synced: true,
        syncedAt: Date.now()
      });
      return result;
    }
    throw new Error(result?.error || 'Failed to create party');
  }

  async syncUpdateParty(payload) {
    const result = await window.api.party.update(payload.id, payload);
    if (result) {
      await window.offlineDB.put('parties', {
        ...payload,
        synced: true,
        syncedAt: Date.now()
      });
      return result;
    }
    throw new Error('Failed to update party');
  }

  // Sync product operations
  async syncCreateProduct(payload) {
    const result = await window.api.product.add(payload);
    if (result && result.id) {
      await window.offlineDB.put('products', {
        ...payload,
        id: result.id,
        synced: true,
        syncedAt: Date.now()
      });
      return result;
    }
    throw new Error(result?.error || 'Failed to create product');
  }

  async syncUpdateProduct(payload) {
    const result = await window.api.product.update(payload.id, payload);
    if (result) {
      await window.offlineDB.put('products', {
        ...payload,
        synced: true,
        syncedAt: Date.now()
      });
      return result;
    }
    throw new Error('Failed to update product');
  }

  // Retry failed items
  async retryFailed() {
    const failedItems = await window.offlineDB.where('syncQueue', 'status', 'failed');
    
    for (const item of failedItems) {
      await window.offlineDB.updateSyncItem(item.id, {
        status: 'pending',
        retries: 0,
        error: null
      });
    }
    
    await this.updatePendingCount();
    
    if (this.isOnline) {
      this.processQueue();
    }
  }

  // Clear all pending items (use with caution)
  async clearQueue() {
    await window.offlineDB.clear('syncQueue');
    this.pendingCount = 0;
    this.notifyListener('queueCleared', {});
  }

  // Get sync status
  getStatus() {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: this.pendingCount
    };
  }
}

// Create singleton instance
const syncQueue = new SyncQueueService();

// Export for use in the app
window.syncQueue = syncQueue;

export default syncQueue;
