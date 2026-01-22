/**
 * Zoho Sync Service
 * 
 * Handles data synchronization between Talk to Your Accounts and Zoho Books.
 * Fetches and syncs charts of accounts, contacts, invoices, and other financial data.
 */

import { ZohoConnectorService, ZohoResponse } from './ZohoConnectorService';

// Type definitions for Zoho Books entities
export interface ZohoAccount {
  account_id: string;
  account_name: string;
  account_type: string;
  account_subtype?: string;
  is_active: boolean;
  is_bank_account: boolean;
  opening_balance?: number;
  current_balance?: number;
}

export interface ZohoContact {
  contact_id: string;
  contact_name: string;
  company_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  is_customer: boolean;
  is_vendor: boolean;
  billing_address?: {
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  shipping_address?: {
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

export interface ZohoInvoice {
  invoice_id: string;
  invoice_number: string;
  date: string;
  due_date: string;
  customer_id: string;
  customer_name: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'voided';
  currency_code: string;
  subtotal: number;
  total: number;
  balance: number;
  line_items: Array<{
    line_item_id: string;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
    item_id?: string;
    account_id?: string;
  }>;
}

export interface ZohoPayment {
  payment_id: string;
  date: string;
  customer_id: string;
  customer_name: string;
  invoice_id?: string;
  amount: number;
  currency_code: string;
  status: 'draft' | 'published' | 'voided';
  payment_mode: string;
  reference_number?: string;
}

export interface ZohoItem {
  item_id: string;
  name: string;
  sku?: string;
  type: 'goods' | 'service' | 'inventory';
  status: 'active' | 'inactive';
  unit?: string;
  rate?: number;
  purchase_rate?: number;
  account_id?: string;
  purchase_account_id?: string;
  track_inventory: boolean;
  quantity_on_hand?: number;
}

export interface ZohoQueryResult<T> {
  [key: string]: T | T[] | number | string;
  page?: number;
  per_page?: number;
  has_more_page?: boolean;
  total_pages?: number;
  total_count?: number;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  errors: string[];
  lastSync?: Date;
}

/**
 * Zoho Sync Service
 * 
 * Provides methods to sync various data types from Zoho Books.
 */
export class ZohoSyncService {
  private connector: ZohoConnectorService;
  
  constructor(connector: ZohoConnectorService) {
    this.connector = connector;
  }
  
  /**
   * Sync all accounts from Zoho Books
   */
  async syncAccounts(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      errors: []
    };
    
    try {
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await this.connector.request<ZohoQueryResult<ZohoAccount>>({
          endpoint: 'chartofaccounts',
          queryParams: { page, per_page: 100 },
          organizationId: this.connector.getOrganizationId()!
        });
        
        if (response.success && response.data) {
          const accounts = (response.data.chart_of_accounts as ZohoAccount[]) || [];
          
          if (accounts.length === 0) {
            hasMore = false;
          } else {
            result.synced += accounts.length;
            
            // Process each account (in production, save to database)
            for (const account of accounts) {
              await this.processAccount(account);
            }
            
            page++;
            
            if (!response.data.has_more_page) {
              hasMore = false;
            }
          }
        } else if (response.error) {
          result.errors.push(`Failed to fetch accounts: ${response.error}`);
          hasMore = false;
          result.success = false;
        }
      }
      
      result.lastSync = new Date();
    } catch (error) {
      result.success = false;
      result.errors.push(`Account sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return result;
  }
  
  /**
   * Sync all contacts from Zoho Books
   */
  async syncContacts(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      errors: []
    };
    
    try {
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await this.connector.request<ZohoQueryResult<ZohoContact>>({
          endpoint: 'contacts',
          queryParams: { page, per_page: 100 },
          organizationId: this.connector.getOrganizationId()!
        });
        
        if (response.success && response.data) {
          const contacts = (response.data.contacts as ZohoContact[]) || [];
          
          if (contacts.length === 0) {
            hasMore = false;
          } else {
            result.synced += contacts.length;
            
            // Process each contact (in production, save to database)
            for (const contact of contacts) {
              await this.processContact(contact);
            }
            
            page++;
            
            if (!response.data.has_more_page) {
              hasMore = false;
            }
          }
        } else if (response.error) {
          result.errors.push(`Failed to fetch contacts: ${response.error}`);
          hasMore = false;
          result.success = false;
        }
      }
      
      result.lastSync = new Date();
    } catch (error) {
      result.success = false;
      result.errors.push(`Contact sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return result;
  }
  
  /**
   * Sync all invoices from Zoho Books
   */
  async syncInvoices(startDate?: string, endDate?: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      errors: []
    };
    
    try {
      let page = 1;
      let hasMore = true;
      
      // Build date filter if provided
      const queryParams: Record<string, string | number> = { page, per_page: 100 };
      
      if (startDate) {
        queryParams['date_start'] = startDate;
      }
      
      if (endDate) {
        queryParams['date_end'] = endDate;
      }
      
      while (hasMore) {
        const response = await this.connector.request<ZohoQueryResult<ZohoInvoice>>({
          endpoint: 'invoices',
          queryParams,
          organizationId: this.connector.getOrganizationId()!
        });
        
        if (response.success && response.data) {
          const invoices = (response.data.invoices as ZohoInvoice[]) || [];
          
          if (invoices.length === 0) {
            hasMore = false;
          } else {
            result.synced += invoices.length;
            
            // Process each invoice (in production, save to database)
            for (const invoice of invoices) {
              await this.processInvoice(invoice);
            }
            
            page++;
            
            if (!response.data.has_more_page) {
              hasMore = false;
            }
          }
        } else if (response.error) {
          result.errors.push(`Failed to fetch invoices: ${response.error}`);
          hasMore = false;
          result.success = false;
        }
      }
      
      result.lastSync = new Date();
    } catch (error) {
      result.success = false;
      result.errors.push(`Invoice sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return result;
  }
  
  /**
   * Sync all payments from Zoho Books
   */
  async syncPayments(startDate?: string, endDate?: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      errors: []
    };
    
    try {
      let page = 1;
      let hasMore = true;
      
      const queryParams: Record<string, string | number> = { page, per_page: 100 };
      
      if (startDate) {
        queryParams['date_start'] = startDate;
      }
      
      if (endDate) {
        queryParams['date_end'] = endDate;
      }
      
      while (hasMore) {
        const response = await this.connector.request<ZohoQueryResult<ZohoPayment>>({
          endpoint: 'customerpayments',
          queryParams,
          organizationId: this.connector.getOrganizationId()!
        });
        
        if (response.success && response.data) {
          const payments = (response.data.payments as ZohoPayment[]) || [];
          
          if (payments.length === 0) {
            hasMore = false;
          } else {
            result.synced += payments.length;
            
            // Process each payment (in production, save to database)
            for (const payment of payments) {
              await this.processPayment(payment);
            }
            
            page++;
            
            if (!response.data.has_more_page) {
              hasMore = false;
            }
          }
        } else if (response.error) {
          result.errors.push(`Failed to fetch payments: ${response.error}`);
          hasMore = false;
          result.success = false;
        }
      }
      
      result.lastSync = new Date();
    } catch (error) {
      result.success = false;
      result.errors.push(`Payment sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return result;
  }
  
  /**
   * Sync all items from Zoho Books
   */
  async syncItems(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      errors: []
    };
    
    try {
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await this.connector.request<ZohoQueryResult<ZohoItem>>({
          endpoint: 'items',
          queryParams: { page, per_page: 100 },
          organizationId: this.connector.getOrganizationId()!
        });
        
        if (response.success && response.data) {
          const items = (response.data.items as ZohoItem[]) || [];
          
          if (items.length === 0) {
            hasMore = false;
          } else {
            result.synced += items.length;
            
            // Process each item (in production, save to database)
            for (const item of items) {
              await this.processItem(item);
            }
            
            page++;
            
            if (!response.data.has_more_page) {
              hasMore = false;
            }
          }
        } else if (response.error) {
          result.errors.push(`Failed to fetch items: ${response.error}`);
          hasMore = false;
          result.success = false;
        }
      }
      
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
    contacts: SyncResult;
    invoices: SyncResult;
    payments: SyncResult;
    items: SyncResult;
  }> {
    const endDate = startDate || new Date().toISOString().split('T')[0];
    
    // Calculate a reasonable start date (30 days ago if not specified)
    const syncStartDate = startDate 
      ? startDate 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const [accounts, contacts, invoices, payments, items] = await Promise.all([
      this.syncAccounts(),
      this.syncContacts(),
      this.syncInvoices(syncStartDate, endDate),
      this.syncPayments(syncStartDate, endDate),
      this.syncItems()
    ]);
    
    return { accounts, contacts, invoices, payments, items };
  }
  
  // Private methods for processing entities
  
  private async processAccount(account: ZohoAccount): Promise<void> {
    console.log(`Processing account: ${account.account_name} (${account.account_type})`);
  }
  
  private async processContact(contact: ZohoContact): Promise<void> {
    console.log(`Processing contact: ${contact.contact_name}`);
  }
  
  private async processInvoice(invoice: ZohoInvoice): Promise<void> {
    console.log(`Processing invoice: ${invoice.invoice_number} - ${invoice.status}`);
  }
  
  private async processPayment(payment: ZohoPayment): Promise<void> {
    console.log(`Processing payment: ${payment.payment_id} - Amount: ${payment.amount}`);
  }
  
  private async processItem(item: ZohoItem): Promise<void> {
    console.log(`Processing item: ${item.name} (${item.type})`);
  }
}
