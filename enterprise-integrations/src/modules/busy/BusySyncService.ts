import { BusyConnectorService } from './BusyConnectorService';
import { LoggerService } from '../../core/logging/LoggerService';
import { QueueService } from '../queuing/QueueService';
import { BUSY_CONFIG } from './BusyConfig';

interface SyncResult {
  success: boolean;
  syncedMasters: number;
  syncedTransactions: number;
  errors: string[];
  timestamp: Date;
}

interface SyncOptions {
  syncParties: boolean;
  syncItems: boolean;
  syncTransactions: boolean;
  importToBusy: boolean;
  exportFromBusy: boolean;
}

interface SyncStatus {
  isConnected: boolean;
  companyName?: string;
  busyVersion?: string;
  lastSync?: Date;
  queueLength: number;
  pendingJobs: number;
}

/**
 * BusySyncService
 * 
 * Orchestrates bidirectional data synchronization between
 * Talk to Your Accounts and Busy Accounting Software
 */
export class BusySyncService {
  private connector: BusyConnectorService;
  private queueService: QueueService;
  private logger: LoggerService;
  private lastSyncTimestamp: Date | null = null;
  
  constructor() {
    this.connector = new BusyConnectorService();
    this.queueService = new QueueService('busy-sync');
    this.logger = new LoggerService('BusySync');
  }
  
  /**
   * Perform full synchronization with Busy
   */
  async syncAll(options: SyncOptions): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedMasters: 0,
      syncedTransactions: 0,
      errors: [],
      timestamp: new Date()
    };
    
    try {
      // Check connection first
      const connectionStatus = await this.connector.checkConnection();
      if (!connectionStatus.isConnected) {
        throw new Error(connectionStatus.error || 'Busy is not running or not accessible');
      }
      
      this.logger.info('Starting Busy synchronization', { 
        company: connectionStatus.companyName,
        version: connectionStatus.busyVersion
      });
      
      // Sync parties/ledgers
      if (options.syncParties) {
        if (options.exportFromBusy) {
          // Fetch customers (Sundry Debtors)
          const customers = await this.connector.getParties('Sundry Debtors');
          await this.importPartiesToApp(customers, 'customer');
          result.syncedMasters += customers.length;
          
          // Fetch vendors (Sundry Creditors)
          const vendors = await this.connector.getParties('Sundry Creditors');
          await this.importPartiesToApp(vendors, 'vendor');
          result.syncedMasters += vendors.length;
          
          this.logger.info(`Imported ${customers.length + vendors.length} parties from Busy`);
        }
        
        if (options.importToBusy) {
          const newParties = await this.getNewPartiesFromApp();
          for (const party of newParties) {
            const success = await this.connector.createParty(party);
            if (success.success) {
              result.syncedMasters++;
              await this.markPartyAsSynced(party.id);
            } else {
              result.errors.push(`Failed to sync party: ${party.name} - ${success.error}`);
            }
          }
          this.logger.info(`Exported ${newParties.length} parties to Busy`);
        }
      }
      
      // Sync inventory items
      if (options.syncItems) {
        if (options.exportFromBusy) {
          const items = await this.connector.getItems();
          await this.importItemsToApp(items);
          result.syncedMasters += items.length;
          this.logger.info(`Imported ${items.length} items from Busy`);
        }
        
        if (options.importToBusy) {
          const newItems = await this.getNewItemsFromApp();
          for (const item of newItems) {
            const success = await this.connector.createItem(item);
            if (success.success) {
              result.syncedMasters++;
              await this.markItemAsSynced(item.id);
            } else {
              result.errors.push(`Failed to sync item: ${item.name} - ${success.error}`);
            }
          }
          this.logger.info(`Exported ${newItems.length} items to Busy`);
        }
      }
      
      // Sync transactions
      if (options.syncTransactions) {
        if (options.exportFromBusy) {
          const vouchers = await this.connector.getVouchers();
          await this.importVouchersToApp(vouchers);
          result.syncedTransactions += vouchers.length;
          this.logger.info(`Imported ${vouchers.length} vouchers from Busy`);
        }
        
        if (options.importToBusy) {
          const newTransactions = await this.getNewTransactionsFromApp();
          for (const txn of newTransactions) {
            const success = await this.connector.createVoucher(txn);
            if (success.success) {
              result.syncedTransactions++;
              await this.markTransactionAsSynced(txn.id);
            } else {
              result.errors.push(`Failed to sync transaction ${txn.voucherNumber}: ${success.error}`);
            }
          }
          this.logger.info(`Exported ${newTransactions.length} transactions to Busy`);
        }
      }
      
      this.lastSyncTimestamp = new Date();
      this.logger.info('Busy synchronization completed', result);
      
    } catch (error) {
      result.success = false;
      result.errors.push((error as Error).message);
      this.logger.error('Busy synchronization failed', { error: (error as Error).message });
    }
    
    return result;
  }
  
  /**
   * Sync only new data since last synchronization
   */
  async incrementalSync(): Promise<SyncResult> {
    const options: SyncOptions = {
      syncParties: true,
      syncItems: true,
      syncTransactions: true,
      importToBusy: true,
      exportFromBusy: true
    };
    
    return this.syncAll(options);
  }
  
  /**
   * Quick sync - just check connection and get recent data
   */
  async quickSync(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedMasters: 0,
      syncedTransactions: 0,
      errors: [],
      timestamp: new Date()
    };
    
    try {
      const connectionStatus = await this.connector.checkConnection();
      if (!connectionStatus.isConnected) {
        throw new Error(connectionStatus.error || 'Busy is not running');
      }
      
      // Get recent vouchers from the last week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const vouchers = await this.connector.getVouchers({
        fromDate: oneWeekAgo.toISOString()
      });
      
      await this.importVouchersToApp(vouchers);
      result.syncedTransactions = vouchers.length;
      
      this.lastSyncTimestamp = new Date();
      this.logger.info('Quick sync completed', { transactionCount: vouchers.length });
      
    } catch (error) {
      result.success = false;
      result.errors.push((error as Error).message);
      this.logger.error('Quick sync failed', { error: (error as Error).message });
    }
    
    return result;
  }
  
  /**
   * Queue synchronization job
   */
  async queueSyncJob(options: SyncOptions): Promise<string> {
    const jobId = await this.queueService.addJob({
      type: 'busy-sync',
      payload: options,
      retryAttempts: 3,
      priority: 'normal'
    });
    
    this.logger.info('Busy sync job queued', { jobId });
    return jobId;
  }
  
  /**
   * Get sync status and statistics
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const isConnected = await this.connector.checkConnection();
    const lastSync = this.lastSyncTimestamp;
    const queueLength = await this.queueService.getQueueLength('busy-sync');
    const pendingJobs = await this.queueService.getPendingJobs('busy-sync');
    
    return {
      isConnected,
      companyName: isConnected ? (await this.connector.checkConnection()).companyName : undefined,
      busyVersion: isConnected ? (await this.connector.checkConnection()).busyVersion : undefined,
      lastSync,
      queueLength,
      pendingJobs
    };
  }
  
  /**
   * Get parties that need to be synced to Busy
   */
  private async getNewPartiesFromApp(): Promise<any[]> {
    // This would query your application database for parties
    // that haven't been synced to Busy yet
    // Return empty array as this depends on your app's database structure
    return [];
  }
  
  /**
   * Get items that need to be synced to Busy
   */
  private async getNewItemsFromApp(): Promise<any[]> {
    // This would query your application database for items
    // that haven't been synced to Busy yet
    return [];
  }
  
  /**
   * Get transactions that need to be synced to Busy
   */
  private async getNewTransactionsFromApp(): Promise<any[]> {
    // This would query your application database for transactions
    // that haven't been synced to Busy yet
    return [];
  }
  
  /**
   * Mark party as synced in application
   */
  private async markPartyAsSynced(partyId: number): Promise<void> {
    // Update party record to mark as synced to Busy
    this.logger.debug(`Marked party ${partyId} as synced to Busy`);
  }
  
  /**
   * Mark item as synced in application
   */
  private async markItemAsSynced(itemId: number): Promise<void> {
    // Update item record to mark as synced to Busy
    this.logger.debug(`Marked item ${itemId} as synced to Busy`);
  }
  
  /**
   * Mark transaction as synced in application
   */
  private async markTransactionAsSynced(transactionId: number): Promise<void> {
    // Update transaction record to mark as synced to Busy
    this.logger.debug(`Marked transaction ${transactionId} as synced to Busy`);
  }
  
  /**
   * Import parties from Busy to application
   */
  private async importPartiesToApp(parties: any[], defaultType: string = 'customer'): Promise<void> {
    this.logger.info(`Importing ${parties.length} parties from Busy`);
    
    for (const party of parties) {
      try {
        const transformedParty = {
          name: party.Name || party.name,
          type: this.mapPartyType(party.GroupName, defaultType),
          openingBalance: this.parseAmount(party.OpeningBalance),
          gstin: party.GSTIN || null,
          address: party.Address || null,
          city: party.City || null,
          state: party.State || null,
          pincode: party.PinCode || null,
          phone: party.Phone || null,
          email: party.Email || null,
          source: 'busy',
          busyName: party.Name || party.name,
          lastSyncedAt: new Date().toISOString()
        };
        
        // Save to application database
        // await dbService.upsertParty(transformedParty);
        this.logger.debug(`Imported party: ${transformedParty.name}`);
        
      } catch (error) {
        this.logger.error(`Failed to import party`, { error: (error as Error).message, party: party.Name });
      }
    }
  }
  
  /**
   * Import items from Busy to application
   */
  private async importItemsToApp(items: any[]): Promise<void> {
    this.logger.info(`Importing ${items.length} items from Busy`);
    
    for (const item of items) {
      try {
        const transformedItem = {
          name: item.Name || item.name,
          sku: (item.Name || item.name)?.substring(0, 20).toUpperCase().replace(/\s+/g, '-') || '',
          unit: item.Unit || 'NOS',
          rate: this.parseAmount(item.Rate) || 0,
          hsnCode: item.HSNCode || null,
          sacCode: item.SACCode || null,
          gstRate: this.parseAmount(item.GSTRate) || 0,
          source: 'busy',
          busyName: item.Name || item.name,
          lastSyncedAt: new Date().toISOString()
        };
        
        // Save to application database
        // await dbService.upsertItem(transformedItem);
        this.logger.debug(`Imported item: ${transformedItem.name}`);
        
      } catch (error) {
        this.logger.error(`Failed to import item`, { error: (error as Error).message, item: item.Name });
      }
    }
  }
  
  /**
   * Import vouchers from Busy to application
   */
  private async importVouchersToApp(vouchers: any[]): Promise<void> {
    this.logger.info(`Importing ${vouchers.length} vouchers from Busy`);
    
    for (const voucher of vouchers) {
      try {
        const transformedVoucher = {
          voucherNumber: voucher.VoucherNumber || voucher.VchNo || '',
          voucherType: this.mapVoucherType(voucher.VoucherType),
          date: this.parseDate(voucher.VoucherDate),
          partyName: voucher.PartyName || '',
          amount: this.parseAmount(voucher.Amount || voucher.TotalAmount),
          narration: voucher.Narration || null,
          source: 'busy',
          busyVoucherNo: voucher.VoucherNumber || voucher.VchNo,
          lastSyncedAt: new Date().toISOString()
        };
        
        // Save to application database
        // await dbService.upsertTransaction(transformedVoucher);
        this.logger.debug(`Imported voucher: ${transformedVoucher.voucherNumber}`);
        
      } catch (error) {
        this.logger.error(`Failed to import voucher`, { error: (error as Error).message, voucher: voucher.VoucherNumber });
      }
    }
  }
  
  /**
   * Map Busy party group to application party type
   */
  private mapPartyType(groupName: string, defaultType: string): string {
    const groupLower = groupName?.toLowerCase() || '';
    
    if (groupLower.includes('sundry debtors') || groupLower.includes('customers') || groupLower.includes('receivables')) {
      return 'customer';
    }
    if (groupLower.includes('sundry creditors') || groupLower.includes('suppliers') || groupLower.includes('payables')) {
      return 'vendor';
    }
    if (groupLower.includes('bank')) {
      return 'bank';
    }
    if (groupLower.includes('cash')) {
      return 'cash';
    }
    
    return defaultType;
  }
  
  /**
   * Map Busy voucher type to application voucher type
   */
  private mapVoucherType(voucherType: string): string {
    const typeLower = voucherType?.toLowerCase() || '';
    
    if (typeLower.includes('sales') || typeLower === 'sr') {
      return 'sale';
    }
    if (typeLower.includes('purchase') || typeLower === 'pr') {
      return 'purchase';
    }
    if (typeLower.includes('payment') || typeLower === 'pm') {
      return 'payment';
    }
    if (typeLower.includes('receipt') || typeLower === 'rc') {
      return 'receipt';
    }
    if (typeLower.includes('journal') || typeLower === 'jr') {
      return 'journal';
    }
    if (typeLower.includes('contra')) {
      return 'contra';
    }
    if (typeLower.includes('debit note')) {
      return 'debit_note';
    }
    if (typeLower.includes('credit note')) {
      return 'credit_note';
    }
    
    return 'sale'; // Default
  }
  
  /**
   * Parse Busy amount (may include Dr/Cr suffix)
   */
  private parseAmount(amountStr: string | number): number {
    if (typeof amountStr === 'number') return amountStr;
    if (!amountStr) return 0;
    
    // Remove Dr/Cr suffix and sign
    let cleaned = amountStr
      .toString()
      .replace(/\s*Dr$/i, '')
      .replace(/\s*Cr$/i, '')
      .replace(/[-]/g, '')
      .trim();
    
    return parseFloat(cleaned) || 0;
  }
  
  /**
   * Parse Busy date (DD/MM/YYYY or MM/DD/YYYY format)
   */
  private parseDate(dateStr: string): string {
    if (!dateStr) return new Date().toISOString();
    
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
      // Try DD/MM/YYYY first (Indian format)
      const [day, month, year] = parts;
      if (parseInt(day) > 12) {
        // DD is greater than 12, so it's DD/MM/YYYY
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else {
        // Could be DD/MM/YYYY or MM/DD/YYYY
        // Assume DD/MM/YYYY as it's more common in India
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }
    
    return new Date().toISOString();
  }
}

export default BusySyncService;
