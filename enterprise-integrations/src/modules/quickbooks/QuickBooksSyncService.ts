/**
 * QuickBooks Sync Service
 * 
 * Handles data synchronization between Talk to Your Accounts and QuickBooks Online.
 * Fetches and syncs accounts, customers, invoices, and other financial data.
 */

import { QuickBooksConnectorService, QuickBooksResponse } from './QuickBooksConnectorService';

// Type definitions for QuickBooks entities
export interface QuickBooksAccount {
  Id: string;
  Name: string;
  AccountType: string;
  AccountSubType?: string;
  CurrentBalance?: number;
  Active: boolean;
  MetaData?: {
    CreateTime: string;
    LastUpdatedTime: string;
  };
}

export interface QuickBooksCustomer {
  Id: string;
  DisplayName: string;
  CompanyName?: string;
  GivenName?: string;
  FamilyName?: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  BillAddr?: {
    Line1?: string;
    City?: string;
    CountrySubDivisionCode?: string;
    PostalCode?: string;
  };
  MetaData?: {
    CreateTime: string;
    LastUpdatedTime: string;
  };
}

export interface QuickBooksInvoice {
  Id: string;
  DocNumber: string;
  TxnDate: string;
  DueDate: string;
  TotalAmt: number;
  Balance: number;
  CustomerRef: { value: string; name?: string };
  Line: Array<{
    Id?: string;
    LineNum?: number;
    Description?: string;
    Amount: number;
    DetailType: string;
    SalesItemLineDetail?: {
      ItemRef: { value: string; name?: string };
      Qty?: number;
      UnitPrice?: number;
    };
  }>;
  EmailStatus?: 'NotSet' | 'NeedToSend' | 'EmailSent';
  MetaData?: {
    CreateTime: string;
    LastUpdatedTime: string;
  };
}

export interface QuickBooksPayment {
  Id: string;
  TxnDate: string;
  TotalAmt: number;
  CustomerRef: { value: string; name?: string };
  PaymentMethodRef?: { value: string; name?: string };
  Line: Array<{
    Amount: number;
    LinkedTxn: Array<{ TxnId: string; TxnType: string }>;
  }>;
  MetaData?: {
    CreateTime: string;
    LastUpdatedTime: string;
  };
}

export interface QuickBooksItem {
  Id: string;
  Name: string;
  Type: string;
  QtyOnHand?: number;
  UnitPrice?: number;
  PurchaseCost?: number;
  IncomeAccountRef?: { value: string; name?: string };
  ExpenseAccountRef?: { value: string; name?: string };
  MetaData?: {
    CreateTime: string;
    LastUpdatedTime: string;
  };
}

export interface QuickBooksQueryResult<T> {
  QueryResponse: {
    [entity: string]: T[];
    startPosition?: number;
    maxResults?: number;
  };
}

export interface SyncResult {
  success: boolean;
  synced: number;
  errors: string[];
  lastSync?: Date;
}

/**
 * QuickBooks Sync Service
 * 
 * Provides methods to sync various data types from QuickBooks.
 */
export class QuickBooksSyncService {
  private connector: QuickBooksConnectorService;
  
  constructor(connector: QuickBooksConnectorService) {
    this.connector = connector;
  }
  
  /**
   * Sync all account types from QuickBooks
   */
  async syncAccounts(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      errors: []
    };
    
    try {
      // Fetch all account types
      const accountTypes = ['Bank', 'Accounts Receivable', 'Other Current Asset', 'Fixed Asset', 
                           'Other Asset', 'Accounts Payable', 'Other Current Liability', 
                           'Long Term Liability', 'Equity', 'Income', 'Cost of Goods Sold', 'Expense', 'Other Income'];
      
      for (const accountType of accountTypes) {
        const response = await this.connector.request<QuickBooksQueryResult<QuickBooksAccount>>({
          endpoint: 'query',
          queryParams: {
            query: `SELECT * FROM Account WHERE AccountType = '${accountType}' MAXRESULTS 1000`
          }
        });
        
        if (response.success && response.data) {
          const accounts = response.data.QueryResponse.Account || [];
          result.synced += accounts.length;
          
          // Process each account (in production, save to database)
          for (const account of accounts) {
            await this.processAccount(account);
          }
        } else if (response.error) {
          result.errors.push(`Failed to fetch ${accountType} accounts: ${response.error}`);
        }
      }
      
      result.success = result.errors.length === 0;
      result.lastSync = new Date();
    } catch (error) {
      result.success = false;
      result.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return result;
  }
  
  /**
   * Sync all customers from QuickBooks
   */
  async syncCustomers(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      errors: []
    };
    
    try {
      let hasMore = true;
      let startPosition = 1;
      
      while (hasMore) {
        const response = await this.connector.request<QuickBooksQueryResult<QuickBooksCustomer>>({
          endpoint: 'query',
          queryParams: {
            query: `SELECT * FROM Customer STARTPOSITION ${startPosition} MAXRESULTS 1000`
          }
        });
        
        if (response.success && response.data) {
          const customers = response.data.QueryResponse.Customer || [];
          
          if (customers.length === 0) {
            hasMore = false;
          } else {
            result.synced += customers.length;
            
            // Process each customer (in production, save to database)
            for (const customer of customers) {
              await this.processCustomer(customer);
            }
            
            startPosition += 1000;
            
            if (customers.length < 1000) {
              hasMore = false;
            }
          }
        } else if (response.error) {
          result.errors.push(`Failed to fetch customers: ${response.error}`);
          hasMore = false;
        }
      }
      
      result.success = result.errors.length === 0;
      result.lastSync = new Date();
    } catch (error) {
      result.success = false;
      result.errors.push(`Customer sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return result;
  }
  
  /**
   * Sync all invoices from QuickBooks
   */
  async syncInvoices(startDate?: string, endDate?: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      errors: []
    };
    
    try {
      let hasMore = true;
      let startPosition = 1;
      
      // Build date filter if provided
      let dateFilter = '';
      if (startDate) {
        dateFilter += ` WHERE TxnDate >= '${startDate}'`;
        if (endDate) {
          dateFilter += ` AND TxnDate <= '${endDate}'`;
        }
      }
      
      while (hasMore) {
        const query = `SELECT * FROM Invoice${dateFilter} STARTPOSITION ${startPosition} MAXRESULTS 1000`;
        
        const response = await this.connector.request<QuickBooksQueryResult<QuickBooksInvoice>>({
          endpoint: 'query',
          queryParams: { query }
        });
        
        if (response.success && response.data) {
          const invoices = response.data.QueryResponse.Invoice || [];
          
          if (invoices.length === 0) {
            hasMore = false;
          } else {
            result.synced += invoices.length;
            
            // Process each invoice (in production, save to database)
            for (const invoice of invoices) {
              await this.processInvoice(invoice);
            }
            
            startPosition += 1000;
            
            if (invoices.length < 1000) {
              hasMore = false;
            }
          }
        } else if (response.error) {
          result.errors.push(`Failed to fetch invoices: ${response.error}`);
          hasMore = false;
        }
      }
      
      result.success = result.errors.length === 0;
      result.lastSync = new Date();
    } catch (error) {
      result.success = false;
      result.errors.push(`Invoice sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return result;
  }
  
  /**
   * Sync all payments from QuickBooks
   */
  async syncPayments(startDate?: string, endDate?: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      errors: []
    };
    
    try {
      let hasMore = true;
      let startPosition = 1;
      
      let dateFilter = '';
      if (startDate) {
        dateFilter += ` WHERE TxnDate >= '${startDate}'`;
        if (endDate) {
          dateFilter += ` AND TxnDate <= '${endDate}'`;
        }
      }
      
      while (hasMore) {
        const query = `SELECT * FROM Payment${dateFilter} STARTPOSITION ${startPosition} MAXRESULTS 1000`;
        
        const response = await this.connector.request<QuickBooksQueryResult<QuickBooksPayment>>({
          endpoint: 'query',
          queryParams: { query }
        });
        
        if (response.success && response.data) {
          const payments = response.data.QueryResponse.Payment || [];
          
          if (payments.length === 0) {
            hasMore = false;
          } else {
            result.synced += payments.length;
            
            // Process each payment (in production, save to database)
            for (const payment of payments) {
              await this.processPayment(payment);
            }
            
            startPosition += 1000;
            
            if (payments.length < 1000) {
              hasMore = false;
            }
          }
        } else if (response.error) {
          result.errors.push(`Failed to fetch payments: ${response.error}`);
          hasMore = false;
        }
      }
      
      result.success = result.errors.length === 0;
      result.lastSync = new Date();
    } catch (error) {
      result.success = false;
      result.errors.push(`Payment sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return result;
  }
  
  /**
   * Sync all items/products from QuickBooks
   */
  async syncItems(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      errors: []
    };
    
    try {
      let hasMore = true;
      let startPosition = 1;
      
      while (hasMore) {
        const query = `SELECT * FROM Item STARTPOSITION ${startPosition} MAXRESULTS 1000`;
        
        const response = await this.connector.request<QuickBooksQueryResult<QuickBooksItem>>({
          endpoint: 'query',
          queryParams: { query }
        });
        
        if (response.success && response.data) {
          const items = response.data.QueryResponse.Item || [];
          
          if (items.length === 0) {
            hasMore = false;
          } else {
            result.synced += items.length;
            
            // Process each item (in production, save to database)
            for (const item of items) {
              await this.processItem(item);
            }
            
            startPosition += 1000;
            
            if (items.length < 1000) {
              hasMore = false;
            }
          }
        } else if (response.error) {
          result.errors.push(`Failed to fetch items: ${response.error}`);
          hasMore = false;
        }
      }
      
      result.success = result.errors.length === 0;
      result.lastSync = new Date();
    } catch (error) {
      result.success = false;
      result.errors.push(`Item sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return result;
  }
  
  /**
   * Perform a full sync of all data types
   */
  async fullSync(startDate?: string): Promise<{
    accounts: SyncResult;
    customers: SyncResult;
    invoices: SyncResult;
    payments: SyncResult;
    items: SyncResult;
  }> {
    const endDate = startDate || new Date().toISOString().split('T')[0];
    
    // Calculate a reasonable start date (30 days ago if not specified)
    const syncStartDate = startDate 
      ? startDate 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const [accounts, customers, invoices, payments, items] = await Promise.all([
      this.syncAccounts(),
      this.syncCustomers(),
      this.syncInvoices(syncStartDate, endDate),
      this.syncPayments(syncStartDate, endDate),
      this.syncItems()
    ]);
    
    return { accounts, customers, invoices, payments, items };
  }
  
  /**
   * Get sync status by checking when data was last updated
   */
  async getSyncStatus(): Promise<{
    lastSyncTime: Date | null;
    pendingChanges: number;
  }> {
    // In production, this would check the database for last sync time
    // and count pending changes from webhooks or change data capture
    
    return {
      lastSyncTime: new Date(), // Placeholder
      pendingChanges: 0 // Placeholder - would be calculated from webhook queue
    };
  }
  
  // Private methods for processing entities (would be expanded in production)
  
  private async processAccount(account: QuickBooksAccount): Promise<void> {
    // In production: save to database, transform to internal format, etc.
    console.log(`Processing account: ${account.Name} (${account.AccountType})`);
  }
  
  private async processCustomer(customer: QuickBooksCustomer): Promise<void> {
    // In production: save to database, transform to internal format, etc.
    console.log(`Processing customer: ${customer.DisplayName}`);
  }
  
  private async processInvoice(invoice: QuickBooksInvoice): Promise<void> {
    // In production: save to database, transform to internal format, etc.
    console.log(`Processing invoice: ${invoice.DocNumber}`);
  }
  
  private async processPayment(payment: QuickBooksPayment): Promise<void> {
    // In production: save to database, transform to internal format, etc.
    console.log(`Processing payment: ${payment.Id}`);
  }
  
  private async processItem(item: QuickBooksItem): Promise<void> {
    // In production: save to database, transform to internal format, etc.
    console.log(`Processing item: ${item.Name} (${item.Type})`);
  }
}
