/**
 * Integration Service
 * 
 * Central service that manages all accounting integrations.
 * Provides unified interface for authentication, synchronization, and data management.
 * Integrates with the database layer for persistent storage.
 * Includes idempotency controls and comprehensive error messaging.
 */

const path = require('path');
const fs = require('fs');

// Lazy initialization of modules
let db = null;
let crypto = null;
let idempotencyService = null;
let errorMessaging = null;

/**
 * Initialize integration service with dependencies
 * @param {Object} options Initialization options
 */
async function initialize(options = {}) {
  console.log('[IntegrationService] Initializing...');
  
  try {
    // Initialize database
    const dbPath = options.dbPath || path.resolve(__dirname, '../../src/db');
    process.env.DATA_DIR = options.dataDir || path.resolve(__dirname, '../../data');
    
    // Ensure data directory exists
    const dataDir = process.env.DATA_DIR;
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
    }
    
    // Initialize database module
    const dbModule = require(path.resolve(dbPath, 'index.js'));
    db = dbModule;
    console.log('[IntegrationService] Database initialized');
    
    // Initialize crypto service
    crypto = require('../../utils/crypto');
    db.setCryptoService(crypto);
    console.log('[IntegrationService] Crypto service initialized');
    
    // Initialize idempotency service
    try {
      idempotencyService = require('./idempotencyService');
      await idempotencyService.initialize({ dbPath });
      console.log('[IntegrationService] Idempotency service initialized');
    } catch (err) {
      console.warn('[IntegrationService] Idempotency service not available:', err.message);
    }
    
    // Initialize error messaging service
    try {
      errorMessaging = require('./errorMessagingService');
      console.log('[IntegrationService] Error messaging service initialized');
    } catch (err) {
      console.warn('[IntegrationService] Error messaging service not available:', err.message);
    }
    
    console.log('[IntegrationService] Initialization complete');
    return { success: true };
  } catch (error) {
    console.error('[IntegrationService] Initialization failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get database instance
 */
function getDb() {
  if (!db) {
    throw new Error('Integration service not initialized. Call initialize() first.');
  }
  return db;
}

/**
 * Get crypto service instance
 */
function getCrypto() {
  if (!crypto) {
    throw new Error('Integration service not initialized. Call initialize() first.');
  }
  return crypto;
}

/**
 * Get idempotency service instance
 */
function getIdempotencyService() {
  return idempotencyService;
}

/**
 * Get error messaging service instance
 */
function getErrorMessaging() {
  return errorMessaging;
}

/**
 * Create a formatted error using the error messaging service
 * @param {string} category Error category
 * @param {string} key Error key
 * @param {Object} options Additional options
 * @returns {Object} Formatted error
 */
function createFormattedError(category, key, options = {}) {
  if (errorMessaging) {
    return errorMessaging.wrapError(
      new Error(options.originalError?.message || 'Unknown error'),
      category,
      key,
      options
    );
  }
  
  // Fallback if error messaging service is not available
  return {
    code: options.code || 'GEN000',
    message: options.message || 'An error occurred',
    userMessage: options.userMessage || 'An error occurred. Please try again.',
    timestamp: new Date().toISOString(),
    ...options
  };
}

/**
 * Authentication Operations
 */
const AuthService = {
  /**
   * Get or create user
   * @param {string} email User email
   * @param {string} name User name
   * @returns {Promise<Object>} User object
   */
  async getOrCreateUser(email, name = null) {
    return getDb().getOrCreateUser(email, name);
  },
  
  /**
   * Save OAuth tokens securely
   * @param {number} userId User ID
   * @param {string} provider Provider name
   * @param {Object} tokens Token data
   * @returns {Promise<Object>} Result with formatted error if applicable
   */
  async saveTokens(userId, provider, tokens) {
    try {
      await getDb().saveOAuthTokens(userId, provider, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        realmId: tokens.realmId,
        tenantId: tokens.tenantId,
        organizationId: tokens.organizationId,
        expiresAt: tokens.expiresAt
      });
      
      // Log audit event
      await getDb().logAuditEvent({
        userId,
        action: 'TOKENS_SAVED',
        resourceType: 'integration',
        resourceId: provider,
        details: { hasRefreshToken: !!tokens.refreshToken }
      });
      
      return { success: true };
    } catch (error) {
      const formattedError = createFormattedError('DATABASE', 'QUERY_FAILED', {
        originalError: error,
        context: { userId, provider }
      });
      
      return { success: false, error: formattedError };
    }
  },
  
  /**
   * Get OAuth tokens securely
   * @param {number} userId User ID
   * @param {string} provider Provider name
   * @returns {Promise<Object>} Token data or null
   */
  async getTokens(userId, provider) {
    return getDb().getOAuthTokens(userId, provider);
  },
  
  /**
   * Delete OAuth tokens
   * @param {number} userId User ID
   * @param {string} provider Provider name
   * @returns {Promise<Object>} Result with formatted error if applicable
   */
  async deleteTokens(userId, provider) {
    try {
      await getDb().deleteOAuthTokens(userId, provider);
      
      // Log audit event
      await getDb().logAuditEvent({
        userId,
        action: 'TOKENS_DELETED',
        resourceType: 'integration',
        resourceId: provider
      });
      
      return { success: true };
    } catch (error) {
      const formattedError = createFormattedError('DATABASE', 'QUERY_FAILED', {
        originalError: error,
        context: { userId, provider }
      });
      
      return { success: false, error: formattedError };
    }
  }
};

/**
 * Sync Operations with Idempotency Support
 */
const SyncService = {
  /**
   * Start a sync operation
   * @param {number} userId User ID
   * @param {string} provider Provider name
   * @param {string} syncType Type of sync
   * @returns {Promise<Object>} Sync session info
   */
  async startSync(userId, provider, syncType) {
    const db = getDb();
    
    // Create sync history entry
    const syncId = await new Promise((resolve, reject) => {
      db.getDb().run(
        `INSERT INTO sync_history (user_id, provider, sync_type, status) VALUES (?, ?, ?, 'running')`,
        [userId, provider, syncType],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
    
    // Log audit event
    await db.logAuditEvent({
      userId,
      action: 'SYNC_STARTED',
      resourceType: 'integration',
      resourceId: provider,
      details: { syncType, syncId }
    });
    
    return { syncId, status: 'running' };
  },
  
  /**
   * Complete a sync operation
   * @param {number} syncId Sync history ID
   * @param {Object} result Sync result
   * @returns {Promise<Object>} Result with formatted error if applicable
   */
  async completeSync(syncId, result) {
    try {
      const db = getDb();
      
      await new Promise((resolve, reject) => {
        db.getDb().run(
          `UPDATE sync_history SET 
            completed_at = CURRENT_TIMESTAMP,
            status = ?,
            records_processed = ?,
            errors_count = ?,
            error_details = ?
          WHERE id = ?`,
          [
            result.success ? 'completed' : 'failed',
            result.recordsProcessed || 0,
            result.errorsCount || 0,
            result.errorDetails ? JSON.stringify(result.errorDetails) : null,
            syncId
          ],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      
      return { success: true };
    } catch (error) {
      const formattedError = createFormattedError('DATABASE', 'QUERY_FAILED', {
        originalError: error,
        context: { syncId }
      });
      
      return { success: false, error: formattedError };
    }
  },
  
  /**
   * Update sync state for reconciliation
   * @param {number} userId User ID
   * @param {string} provider Provider name
   * @param {string} entityType Entity type
   * @param {Object} state Sync state
   * @returns {Promise<void>}
   */
  async updateSyncState(userId, provider, entityType, state) {
    await getDb().updateSyncState(userId, provider, entityType, {
      lastSyncAt: state.lastSyncAt || new Date().toISOString(),
      lastSyncToken: state.lastSyncToken,
      status: state.status || 'completed',
      recordsSynced: state.recordsSynced || 0,
      recordsFailed: state.recordsFailed || 0,
      errorMessage: state.errorMessage
    });
  },
  
  /**
   * Get last sync state
   * @param {number} userId User ID
   * @param {string} provider Provider name
   * @param {string} entityType Entity type
   * @returns {Promise<Object|null>}
   */
  async getSyncState(userId, provider, entityType) {
    return getDb().getSyncState(userId, provider, entityType);
  },
  
  /**
   * Sync entity with idempotency
   * @param {number} userId User ID
   * @param {string} provider Provider name
   * @param {string} entityType Entity type
   * @param {Object} entityData Entity data to sync
   * @param {Function} syncFunction Function to perform the actual sync
   * @returns {Promise<Object>} Sync result
   */
  async syncEntityWithIdempotency(userId, provider, entityType, entityData, syncFunction) {
    if (!idempotencyService) {
      // Fallback to regular sync if idempotency service is not available
      return syncFunction(entityData);
    }
    
    const operationId = `${provider}_${entityType}_${entityData.id || entityData.externalId}_${Date.now()}`;
    
    return idempotencyService.processIdempotent(
      {
        userId,
        provider,
        operationType: 'sync',
        entityType,
        entityId: entityData.id || entityData.externalId,
        payload: entityData
      },
      async (payload) => {
        return syncFunction(payload);
      }
    );
  },
  
  /**
   * Get sync history with error details
   * @param {number} userId User ID
   * @param {string} provider Provider name
   * @param {number} limit Maximum records to return
   * @returns {Promise<Array>} Sync history with formatted errors
   */
  async getSyncHistory(userId, provider = null, limit = 50) {
    return new Promise((resolve, reject) => {
      const db = getDb();
      let sql = `
        SELECT sh.*, 
          CASE 
            WHEN sh.status = 'failed' THEN 
              (SELECT error_details FROM sync_history WHERE id = sh.id)
            ELSE NULL 
          END as error_details
        FROM sync_history sh
        WHERE sh.user_id = ?
      `;
      const params = [userId];
      
      if (provider) {
        sql += ' AND sh.provider = ?';
        params.push(provider);
      }
      
      sql += ' ORDER BY sh.started_at DESC LIMIT ?';
      params.push(limit);
      
      db.getDb().all(sql, params, (err, rows) => {
        if (err) reject(err);
        
        // Format errors for display
        const formattedRows = (rows || []).map(row => {
          if (row.error_details && errorMessaging) {
            try {
              const errorDetails = JSON.parse(row.error_details);
              row.formattedError = errorMessaging.formatForDisplay({
                code: errorDetails.code || 'SYN001',
                message: errorDetails.message,
                userMessage: errorDetails.userMessage,
                troubleshooting: errorDetails.troubleshooting,
                severity: errorDetails.severity || 'error'
              });
            } catch (e) {
              // Keep original error_details if parsing fails
            }
          }
          return row;
        });
        
        resolve(formattedRows);
      });
    });
  }
};

/**
 * Audit Operations
 */
const AuditService = {
  /**
   * Log an audit event
   * @param {Object} eventData Event data
   * @returns {Promise<void>}
   */
  async log(eventData) {
    await getDb().logAuditEvent(eventData);
  },
  
  /**
   * Get audit log for a user
   * @param {number} userId User ID
   * @param {Object} options Query options
   * @returns {Promise<Array>}
   */
  async getLogs(userId, options = {}) {
    const db = getDb();
    const limit = options.limit || 100;
    const offset = options.offset || 0;
    
    return new Promise((resolve, reject) => {
      db.getDb().all(
        `SELECT * FROM audit_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [userId, limit, offset],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }
};

/**
 * Error Recovery Operations
 */
const ErrorRecoveryService = {
  /**
   * Get dead letter queue items
   * @param {Object} options Query options
   * @returns {Promise<Array>} DLQ items with formatted errors
   */
  async getDeadLetterQueue(options = {}) {
    if (!idempotencyService) {
      return { success: false, error: createFormattedError('GENERAL', 'NOT_IMPLEMENTED') };
    }
    
    try {
      const items = await idempotencyService.getDeadLetterQueue(options);
      
      // Format errors for display
      const formattedItems = items.map(item => {
        let formattedError = null;
        if (errorMessaging && item.error_message) {
          formattedError = errorMessaging.formatForDisplay({
            code: item.error_code || 'GEN000',
            message: item.error_message,
            troubleshooting: item.troubleshooting,
            severity: 'error'
          });
        }
        
        return {
          ...item,
          payload: typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload,
          formattedError
        };
      });
      
      return { success: true, items: formattedItems };
    } catch (error) {
      return { success: false, error: createFormattedError('DATABASE', 'QUERY_FAILED', { originalError: error }) };
    }
  },
  
  /**
   * Retry a dead letter queue item
   * @param {number} dlqId DLQ entry ID
   * @returns {Promise<Object>} Retry result
   */
  async retryDeadLetterItem(dlqId) {
    if (!idempotencyService) {
      return { success: false, error: createFormattedError('GENERAL', 'NOT_IMPLEMENTED') };
    }
    
    try {
      const item = await idempotencyService.retryDeadLetterQueueItem(dlqId);
      
      // Update status
      await idempotencyService.resolveDeadLetterQueueItem(dlqId, 'retry_initiated');
      
      return { 
        success: true, 
        item: {
          operationId: item.operationId,
          provider: item.provider,
          operationType: item.operationType,
          payload: item.payload
        }
      };
    } catch (error) {
      return { success: false, error: createFormattedError('DATABASE', 'QUERY_FAILED', { originalError: error }) };
    }
  },
  
  /**
   * Resolve a dead letter queue item
   * @param {number} dlqId DLQ entry ID
   * @param {string} resolution Resolution action taken
   * @returns {Promise<Object>} Resolution result
   */
  async resolveDeadLetterItem(dlqId, resolution) {
    if (!idempotencyService) {
      return { success: false, error: createFormattedError('GENERAL', 'NOT_IMPLEMENTED') };
    }
    
    try {
      await idempotencyService.resolveDeadLetterQueueItem(dlqId, resolution);
      return { success: true };
    } catch (error) {
      return { success: false, error: createFormattedError('DATABASE', 'QUERY_FAILED', { originalError: error }) };
    }
  },
  
  /**
   * Clear dead letter queue for a provider
   * @param {number} userId User ID
   * @param {string} provider Provider name
   * @returns {Promise<Object>} Clear result
   */
  async clearDeadLetterQueue(userId, provider) {
    if (!idempotencyService) {
      return { success: false, error: createFormattedError('GENERAL', 'NOT_IMPLEMENTED') };
    }
    
    try {
      const count = await idempotencyService.clearDeadLetterQueue(userId, provider);
      return { success: true, clearedCount: count };
    } catch (error) {
      return { success: false, error: createFormattedError('DATABASE', 'QUERY_FAILED', { originalError: error }) };
    }
  },
  
  /**
   * Check for reconciliation issues
   * @param {number} userId User ID
   * @param {string} provider Provider name
   * @param {string} entityType Entity type
   * @returns {Promise<Array>} List of issues
   */
  async checkReconciliation(userId, provider, entityType) {
    if (!idempotencyService) {
      return { success: false, error: createFormattedError('GENERAL', 'NOT_IMPLEMENTED') };
    }
    
    try {
      const issues = await idempotencyService.checkReconciliation(userId, provider, entityType);
      return { success: true, issues };
    } catch (error) {
      return { success: false, error: createFormattedError('DATABASE', 'QUERY_FAILED', { originalError: error }) };
    }
  },
  
  /**
   * Get operation statistics
   * @param {number} userId User ID
   * @param {string} provider Provider name
   * @returns {Promise<Object>} Operation statistics
   */
  async getOperationStats(userId, provider = null) {
    if (!idempotencyService) {
      return { success: false, error: createFormattedError('GENERAL', 'NOT_IMPLEMENTED') };
    }
    
    try {
      const stats = await idempotencyService.getOperationStats(userId, provider);
      return { success: true, stats };
    } catch (error) {
      return { success: false, error: createFormattedError('DATABASE', 'QUERY_FAILED', { originalError: error }) };
    }
  }
};

/**
 * Webhook Operations
 */
const WebhookService = {
  /**
   * Queue a webhook event for processing
   * @param {Object} eventData Event data
   * @returns {Promise<void>}
   */
  async queueEvent(eventData) {
    await getDb().queueWebhookEvent(eventData);
  },
  
  /**
   * Get pending webhook events
   * @param {string} provider Filter by provider
   * @returns {Promise<Array>}
   */
  async getPendingEvents(provider = null) {
    const db = getDb();
    
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM webhook_events WHERE processing_status = ?';
      const params = ['pending'];
      
      if (provider) {
        sql += ' AND provider = ?';
        params.push(provider);
      }
      
      sql += ' ORDER BY received_at ASC LIMIT 50';
      
      db.getDb().all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },
  
  /**
   * Mark webhook event as processed
   * @param {number} eventId Event ID
   * @returns {Promise<void>}
   */
  async markEventProcessed(eventId) {
    const db = getDb();
    
    await new Promise((resolve, reject) => {
      db.getDb().run(
        `UPDATE webhook_events SET 
          processing_status = 'completed',
          processed_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [eventId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }
};

// Export all services
module.exports = {
  initialize,
  getDb,
  getCrypto,
  getIdempotencyService,
  getErrorMessaging,
  createFormattedError,
  AuthService,
  SyncService,
  AuditService,
  ErrorRecoveryService,
  WebhookService
};
