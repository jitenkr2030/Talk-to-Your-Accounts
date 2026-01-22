import { IntegrationConfig } from '../config/IntegrationConfig';

export const TALLY_CONFIG: IntegrationConfig = {
  platform: 'tally',
  name: 'Tally Prime',
  description: 'Sync transactions and masters with Tally Prime accounting software',
  
  // Tally API connection settings
  connection: {
    host: 'localhost',
    port: 9000,
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },
  
  // OAuth configuration (Tally local API doesn't require OAuth)
  auth: {
    type: 'none',
    credentials: null
  },
  
  // Rate limiting for Tally API
  rateLimit: {
    requestsPerMinute: 60,
    burstLimit: 10
  },
  
  // Sync configuration
  sync: {
    batchSize: 100,
    incrementalSync: true,
    syncInterval: 300000,
    conflictResolution: 'tally_wins'
  },
  
  // Data mapping configuration
  mappings: {
    // Voucher type mappings
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
    
    // Status field mappings
    statusFields: {
      active: 'Yes',
      inactive: 'No'
    },
    
    // Date format configuration
    dateFormat: 'DD/MM/YYYY'
  },
  
  // Feature flags
  features: {
    syncMasters: true,
    syncTransactions: true,
    syncInventory: true,
    syncReports: false,
    twoWaySync: true
  }
};

export default TALLY_CONFIG;
