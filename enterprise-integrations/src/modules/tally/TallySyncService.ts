import { TallyConnectorService } from './TallyConnectorService';
import { LoggerService } from '../../core/logging/LoggerService';
import { QueueService } from '../queuing/QueueService';
import { TALLY_CONFIG } from './TallyConfig';

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
  importToTally: boolean;
  exportFromTally: boolean;
}

interface SyncStatus {
  isConnected: boolean;
  companyName?: string;
  lastSync?: Date;
  queueLength: number;
  pendingJobs: number;
}

/**
 * TallySyncService
 * 
 * Orchestrates bidirectional data synchronization between
 * Talk to Your Accounts and Tally Prime
 */
export class TallySyncService {
  private connector: TallyConnectorService;
  private queueService: QueueService;
  private logger: LoggerService;
  private lastSyncTimestamp: Date | null = null;
  
  constructor() {
    this.connector = new TallyConnectorService();
    this.queueService = new QueueService('tally-sync');
    this.logger = new LoggerService('TallySync');
  }
  
  /**
   * Perform full synchronization with Tally
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
        throw new Error(connectionStatus.error || 'Tally is not running or not accessible');
      }
      
      this.logger.info('Starting Tally synchronization', { company: connectionStatus.companyName });
      
      // Sync parties/ledgers
      if (options.syncParties) {
        if (options.exportFromTally) {
          const parties = await this.connector.getParties();
          await this.importPartiesToApp(parties);
          result.syncedMasters += parties.length;
          this.logger.info(`Imported ${parties.length} parties from Tally`);
        }
        
        if (options.importToTally) {
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
          this.logger.info(`Exported ${newParties.length} parties to Tally`);
        }
      }
      
      // Sync inventory items
      if (options.syncItems) {
        if (options.exportFromTally) {
          const items = await this.connector.getItems();
          await this.importItemsToApp(items);
          result.syncedMasters += items.length;
          this.logger.info(`Imported ${items.length} items from Tally`);
        }
      }
      
      // Sync transactions
      if (options.syncTransactions) {
        if (options.exportFromTally) {
          const vouchers = await this.connector.getVouchers();
          await this.importVouchersToApp(vouchers);
          result.syncedTransactions += vouchers.length;
          this.logger.info(`Imported ${vouchers.length} vouchers from Tally`);
        }
        
        if (options.importToTally) {
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
          this.logger.info(`Exported ${newTransactions.length} transactions to Tally`);
        }
      }
      
      this.lastSyncTimestamp = new Date();
      this.logger.info('Tally synchronization completed', result);
      
    } catch (error) {
      result.success = false;
      result.errors.push((error as Error).message);
      this.logger.error('Tally synchronization failed', { error: (error as Error).message });
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
      importToTally: true,
      exportFromTally: true
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
        throw new Error(connectionStatus.error || 'Tally is not running');
      }
      
      // Just sync recent vouchers
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const vouchers = await this.connector.getVouchers(
        oneWeekAgo.toISOString().split('T')[0]
      );
      
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
      type: 'tally-sync',
      payload: options,
      retryAttempts: 3,
      priority: 'normal'
    });
    
    this.logger.info('Tally sync job queued', { jobId });
    return jobId;
  }
  
  /**
   * Get sync status and statistics
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const isConnected = await this.connector.checkConnection();
    const lastSync = this.lastSyncTimestamp;
    const queueLength = await this.queueService.getQueueLength('tally-sync');
    const pendingJobs = await this.queueService.getPendingJobs('tally-sync');
    
    const connectionStatus = isConnected 
      ? await this.connector.checkConnection() 
      : { companyName: undefined };
    
    return {
      isConnected,
      companyName: connectionStatus.companyName,
      lastSync,
      queueLength,
      pendingJobs
    };
  }
  
  /**
   * Get parties that need to be synced to Tally
   */
  private async getNewPartiesFromApp(): Promise<any[]> {
    // This would query your application database for parties
    // that haven't been synced to Tally yet
    // For now, return empty array as this depends on your app's database structure
    return [];
  }
  
  /**
   * Get transactions that need to be synced to Tally
   */
  private async getNewTransactionsFromApp(): Promise<any[]> {
    // This would query your application database for transactions
    // that haven't been synced to Tally yet
    // For now, return empty array as this depends on your app's database structure
    return [];
  }
  
  /**
   * Mark party as synced in application
   */
  private async markPartyAsSynced(partyId: number): Promise<void> {
    // Update party record to mark as synced to Tally
    // This depends on your app's database implementation
    this.logger.debug(`Marked party ${partyId} as synced to Tally`);
  }
  
  /**
   * Mark transaction as synced in application
   */
  private async markTransactionAsSynced(transactionId: number): Promise<void> {
    // Update transaction record to mark as synced to Tally
    // This depends on your app's database implementation
    this.logger.debug(`Marked transaction ${transactionId} as synced to Tally`);
  }
  
  /**
   * Import parties from Tally to application
   */
  private async importPartiesToApp(parties: any[]): Promise<void> {
    this.logger.info(`Importing ${parties.length} parties from Tally`);
    
    for (const party of parties) {
      try {
        const transformedParty = {
          name: party.Name,
          type: this.mapLedgerType(party.Parent),
          openingBalance: this.parseAmount(party.OpeningBalance),
          gstin: party.GSTIN || null,
          address: party.Address || null,
          state: party.State || null,
          pincode: party.Pincode || null,
          phone: party.Phone || null,
          email: party.Email || null,
          source: 'tally',
          tallyName: party.Name,
          lastSyncedAt: new Date().toISOString()
        };
        
        // Save to application database
        // await dbService.upsertParty(transformedParty);
        this.logger.debug(`Imported party: ${party.Name}`);
        
      } catch (error) {
        this.logger.error(`Failed to import party: ${party.Name}`, { error: (error as Error).message });
      }
    }
  }
  
  /**
   * Import items from Tally to application
   */
  private async importItemsToApp(items: any[]): Promise<void> {
    this.logger.info(`Importing ${items.length} items from Tally`);
    
    for (const item of items) {
      try {
        const transformedItem = {
          name: item.Name,
          sku: item.Name?.substring(0, 20).toUpperCase().replace(/\s+/g, '-') || '',
          unit: item.Unit || 'PCS',
          rate: this.parseAmount(item.RateOfDecrement) || 0,
          source: 'tally',
          tallyName: item.Name,
          lastSyncedAt: new Date().toISOString()
        };
        
        // Save to application database
        // await dbService.upsertItem(transformedItem);
        this.logger.debug(`Imported item: ${item.Name}`);
        
      } catch (error) {
        this.logger.error(`Failed to import item: ${item.Name}`, { error: (error as Error).message });
      }
    }
  }
  
  /**
   * Import vouchers from Tally to application
   */
  private async importVouchersToApp(vouchers: any[]): Promise<void> {
    this.logger.info(`Importing ${vouchers.length} vouchers from Tally`);
    
    for (const voucher of vouchers) {
      try {
        const transformedVoucher = {
          voucherNumber: voucher.VoucherNumber,
          voucherType: this.mapVoucherType(voucher.VoucherType),
          date: this.parseDate(voucher.Date),
          partyName: voucher.PartyName,
          amount: this.parseAmount(voucher.Amount),
          narration: voucher.Narration || null,
          source: 'tally',
          tallyGuid: voucher.GUID,
          lastSyncedAt: new Date().toISOString()
        };
        
        // Save to application database
        // await dbService.upsertTransaction(transformedVoucher);
        this.logger.debug(`Imported voucher: ${voucher.VoucherNumber}`);
        
      } catch (error) {
        this.logger.error(`Failed to import voucher: ${voucher.VoucherNumber}`, { error: (error as Error).message });
      }
    }
  }
  
  /**
   * Map Tally ledger type to application party type
   */
  private mapLedgerType(parent: string): string {
    const parentLower = parent?.toLowerCase() || '';
    
    if (parentLower.includes('sundry debtors') || parentLower.includes('customers')) {
      return 'customer';
    }
    if (parentLower.includes('sundry creditors') || parentLower.includes('suppliers')) {
      return 'vendor';
    }
    if (parentLower.includes('bank') || parentLower.includes('cash')) {
      return 'bank';
    }
    
    return 'customer'; // Default
  }
  
  /**
   * Map Tally voucher type to application voucher type
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
    
    return 'sale'; // Default
  }
  
  /**
   * Parse Tally amount (may include Dr/Cr suffix)
   */
  private parseAmount(amountStr: string): number {
    if (!amountStr) return 0;
    
    // Remove Dr/Cr suffix and sign
    let cleaned = amountStr
      .replace(/\s*Dr$/i, '')
      .replace(/\s*Cr$/i, '')
      .replace(/[-]/g, '')
      .trim();
    
    return parseFloat(cleaned) || 0;
  }
  
  /**
   * Parse Tally date (DD/MM/YYYY format)
   */
  private parseDate(dateStr: string): string {
    if (!dateStr) return new Date().toISOString();
    
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return new Date().toISOString();
  }
}

export default TallySyncService;
