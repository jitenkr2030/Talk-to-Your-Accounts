import { IntegrationConfig } from '../config/IntegrationConfig';

/**
 * Busy Accounting Software Configuration
 * 
 * Busy is an Indian accounting software that provides HTTP API access
 * for integration with third-party applications.
 * 
 * Default API Settings:
 * - Host: localhost
 * - Port: 6543 (default Busy API port)
 * - Protocol: HTTP
 */
export const BUSY_CONFIG: IntegrationConfig = {
  platform: 'busy',
  name: 'Busy Accounting',
  description: 'Sync transactions and masters with Busy Accounting Software',
  
  // Busy API connection settings
  connection: {
    host: 'localhost',
    port: 6543,
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  
  // Authentication configuration
  auth: {
    type: 'basic', // Busy supports basic authentication
    credentials: {
      username: '',
      password: ''
    }
  },
  
  // Rate limiting for Busy API
  rateLimit: {
    requestsPerMinute: 30, // Busy is slower, use lower rate
    burstLimit: 5
  },
  
  // Sync configuration
  sync: {
    batchSize: 50, // Smaller batch size for Busy
    incrementalSync: true,
    syncInterval: 300000, // 5 minutes
    conflictResolution: 'busy_wins' // or 'app_wins', 'manual'
  },
  
  // Data mapping configuration
  mappings: {
    // Voucher type mappings for Busy
    voucherTypes: {
      sales: 'Sales',
      purchase: 'Purchase',
      payment: 'Payment',
      receipt: 'Receipt',
      journal: 'Journal',
      contra: 'Contra',
      debit_note: 'Debit Note',
      credit_note: 'Credit Note'
    },
    
    // Party type mappings
    partyTypes: {
      customer: 'Sundry Debtors',
      vendor: 'Sundry Creditors',
      bank: 'Bank Accounts',
      cash: 'Cash'
    },
    
    // Status field mappings
    statusFields: {
      active: 'Active',
      inactive: 'Inactive'
    },
    
    // Date format configuration
    dateFormat: 'DD/MM/YYYY',
    
    // Master type mappings
    masterTypes: {
      parties: 'Account Master',
      items: 'Item Master',
      categories: 'Group Master',
      godowns: 'Godown Master'
    }
  },
  
  // Feature flags
  features: {
    syncMasters: true,
    syncTransactions: true,
    syncInventory: true,
    syncReports: true,
    twoWaySync: true
  }
};

export default BUSY_CONFIG;
