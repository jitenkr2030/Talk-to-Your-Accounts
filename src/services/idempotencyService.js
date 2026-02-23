/**
 * Idempotency Service
 * 
 * Provides duplicate detection and prevention for all sync operations.
 * Implements unique identifier tracking, upsert logic, and reconciliation checks.
 */

const path = require('path');
const crypto = require('crypto');

// Operation tracking
let db = null;
let operationCache = new Map();

/**
 * Initialize idempotency service
 * @param {Object} options Initialization options
 */
async function initialize(options = {}) {
  console.log('[IdempotencyService] Initializing...');
  
  try {
    const dbPath = options.dbPath || path.resolve(__dirname, '../db');
    
    // Load database module
    const dbModule = require(path.resolve(dbPath, 'index.js'));
    db = dbModule;
    
    // Ensure idempotency tables exist
    await ensureTables();
    
    console.log('[IdempotencyService] Initialization complete');
    return { success: true };
  } catch (error) {
    console.error('[IdempotencyService] Initialization failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Ensure required tables exist
 */
async function ensureTables() {
  return new Promise((resolve, reject) => {
    db.getDb().exec(`
      -- Sync operation tracking (for idempotency)
      CREATE TABLE IF NOT EXISTS sync_operations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        provider TEXT NOT NULL,
        operation_type TEXT NOT NULL,
        operation_id TEXT UNIQUE NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        status TEXT DEFAULT 'pending',
        payload_hash TEXT NOT NULL,
        payload TEXT,
        result TEXT,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      
      -- Entity tracking (for reconciliation)
      CREATE TABLE IF NOT EXISTS entity_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        provider TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        external_id TEXT NOT NULL,
        local_id INTEGER,
        sync_version INTEGER DEFAULT 0,
        last_sync_at DATETIME,
        last_operation_id TEXT,
        checksum TEXT,
        is_deleted INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(provider, entity_type, external_id)
      );
      
      -- Dead letter queue for failed operations
      CREATE TABLE IF NOT EXISTS dead_letter_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        provider TEXT NOT NULL,
        operation_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        error_message TEXT NOT NULL,
        error_stack TEXT,
        retry_count INTEGER DEFAULT 0,
        first_failure_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_failure_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'queued',
        resolution TEXT,
        resolved_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      
      -- Indices
      CREATE INDEX IF NOT EXISTS idx_sync_ops_operation_id ON sync_operations(operation_id);
      CREATE INDEX IF NOT EXISTS idx_sync_ops_status ON sync_operations(status);
      CREATE INDEX IF NOT EXISTS idx_sync_ops_provider ON sync_operations(provider, entity_type);
      CREATE INDEX IF NOT EXISTS idx_entity_tracking ON entity_tracking(provider, entity_type, external_id);
      CREATE INDEX IF NOT EXISTS idx_dlq_status ON dead_letter_queue(status);
      CREATE INDEX IF NOT EXISTS idx_dlq_provider ON dead_letter_queue(provider, status);
    `, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Generate a unique operation ID
 * @param {string} prefix Operation prefix
 * @returns {string} Unique operation ID
 */
function generateOperationId(prefix = 'op') {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString('hex');
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Generate payload hash for duplicate detection
 * @param {Object} payload Operation payload
 * @returns {string} SHA-256 hash of payload
 */
function generatePayloadHash(payload) {
  const sortedPayload = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto.createHash('sha256').update(sortedPayload).digest('hex');
}

/**
 * Check if operation already exists (idempotency check)
 * @param {string} operationId Unique operation identifier
 * @returns {Promise<Object|null>} Existing operation or null
 */
async function checkOperation(operationId) {
  return new Promise((resolve, reject) => {
    db.getDb().get(
      'SELECT * FROM sync_operations WHERE operation_id = ?',
      [operationId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      }
    );
  });
}

/**
 * Record a new operation
 * @param {Object} operationData Operation data
 * @returns {Promise<Object>} Created operation
 */
async function recordOperation(operationData) {
  const {
    userId,
    provider,
    operationType,
    entityType,
    entityId,
    payload,
    operationId = generateOperationId(operationType)
  } = operationData;
  
  const payloadHash = generatePayloadHash(payload);
  const payloadString = JSON.stringify(payload);
  
  return new Promise((resolve, reject) => {
    db.getDb().run(
      `INSERT INTO sync_operations 
       (user_id, provider, operation_type, operation_id, entity_type, entity_id, status, payload_hash, payload)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [userId, provider, operationType, operationId, entityType, entityId || null, payloadHash, payloadString],
      function(err) {
        if (err) reject(err);
        else resolve({
          id: this.lastID,
          operationId,
          status: 'pending',
          payloadHash
        });
      }
    );
  });
}

/**
 * Update operation status
 * @param {string} operationId Operation ID
 * @param {string} status New status
 * @param {Object} result Operation result
 * @param {string} errorMessage Error message if failed
 * @returns {Promise<void>}
 */
async function updateOperation(operationId, status, result = null, errorMessage = null) {
  return new Promise((resolve, reject) => {
    db.getDb().run(
      `UPDATE sync_operations SET 
        status = ?,
        result = ?,
        error_message = ?,
        updated_at = CURRENT_TIMESTAMP,
        completed_at = ?
      WHERE operation_id = ?`,
      [
        status,
        result ? JSON.stringify(result) : null,
        errorMessage,
        status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
        operationId
      ],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

/**
 * Mark operation as completed
 * @param {string} operationId Operation ID
 * @param {Object} result Operation result
 * @returns {Promise<void>}
 */
async function completeOperation(operationId, result) {
  return updateOperation(operationId, 'completed', result);
}

/**
 * Mark operation as failed
 * @param {string} operationId Operation ID
 * @param {string} errorMessage Error message
 * @returns {Promise<void>}
 */
async function failOperation(operationId, errorMessage) {
  return updateOperation(operationId, 'failed', null, errorMessage);
}

/**
 * Process operation with idempotency
 * @param {Object} operationData Operation data
 * @param {Function} processor Function to process the operation
 * @returns {Promise<Object>} Operation result
 */
async function processIdempotent(operationData, processor) {
  const {
    userId,
    provider,
    operationType,
    entityType,
    entityId,
    payload
  } = operationData;
  
  // Generate or use provided operation ID
  const operationId = operationData.operationId || generateOperationId(operationType);
  const payloadHash = generatePayloadHash(payload);
  
  // Check for existing operation (idempotency key check)
  const existing = await checkOperation(operationId);
  
  if (existing) {
    // Return existing result if already processed
    if (existing.status === 'completed') {
      console.log(`[Idempotency] Operation ${operationId} already completed, returning cached result`);
      return {
        idempotent: true,
        operationId,
        status: 'completed',
        result: existing.result ? JSON.parse(existing.result) : null,
        cached: true
      };
    }
    
    if (existing.status === 'pending') {
      // Operation in progress, wait for completion
      console.log(`[Idempotency] Operation ${operationId} in progress, waiting...`);
      
      // Wait up to 30 seconds for completion
      const result = await waitForCompletion(operationId, 30000);
      return result;
    }
    
    if (existing.status === 'failed') {
      // Return cached failure
      console.log(`[Idempotency] Operation ${operationId} previously failed`);
      return {
        idempotent: true,
        operationId,
        status: 'failed',
        error: existing.error_message,
        cached: true
      };
    }
  }
  
  // Record new operation
  await recordOperation({
    userId,
    provider,
    operationType,
    entityType,
    entityId,
    payload,
    operationId
  });
  
  try {
    // Process the operation
    const result = await processor(payload, { operationId });
    
    // Mark as completed
    await completeOperation(operationId, result);
    
    // Update entity tracking
    await trackEntity({
      userId,
      provider,
      entityType,
      externalId: entityId || result?.externalId || result?.id,
      localId: result?.localId,
      operationId,
      checksum: payloadHash
    });
    
    return {
      idempotent: false,
      operationId,
      status: 'completed',
      result
    };
  } catch (error) {
    // Mark as failed
    await failOperation(operationId, error.message);
    
    // Optionally add to dead letter queue
    await addToDeadLetterQueue({
      operationId,
      userId,
      provider,
      operationType,
      entityType,
      payload,
      error
    });
    
    throw error;
  }
}

/**
 * Wait for operation completion
 * @param {string} operationId Operation ID
 * @param {number} timeout Timeout in milliseconds
 * @returns {Promise<Object>} Operation result
 */
async function waitForCompletion(operationId, timeout = 30000) {
  const startTime = Date.now();
  const pollInterval = 500;
  
  while (Date.now() - startTime < timeout) {
    const operation = await checkOperation(operationId);
    
    if (operation && operation.status !== 'pending') {
      return {
        idempotent: true,
        operationId,
        status: operation.status,
        result: operation.result ? JSON.parse(operation.result) : null,
        error: operation.error_message,
        cached: true
      };
    }
    
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  throw new Error(`Operation ${operationId} timed out after ${timeout}ms`);
}

/**
 * Track entity for reconciliation
 * @param {Object} trackingData Entity tracking data
 */
async function trackEntity(trackingData) {
  const {
    userId,
    provider,
    entityType,
    externalId,
    localId,
    operationId,
    checksum,
    isDeleted = false
  } = trackingData;
  
  if (!externalId) return;
  
  return new Promise((resolve, reject) => {
    db.getDb().run(
      `INSERT OR REPLACE INTO entity_tracking 
       (user_id, provider, entity_type, external_id, local_id, last_operation_id, checksum, is_deleted, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, provider, entityType, externalId, localId || null, operationId, checksum, isDeleted ? 1 : 0],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

/**
 * Get entity tracking info
 * @param {number} userId User ID
 * @param {string} provider Provider
 * @param {string} entityType Entity type
 * @param {string} externalId External ID
 * @returns {Promise<Object|null>}
 */
async function getEntityTracking(userId, provider, entityType, externalId) {
  return new Promise((resolve, reject) => {
    db.getDb().get(
      'SELECT * FROM entity_tracking WHERE user_id = ? AND provider = ? AND entity_type = ? AND external_id = ?',
      [userId, provider, entityType, externalId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      }
    );
  });
}

/**
 * Check for reconciliation issues
 * @param {number} userId User ID
 * @param {string} provider Provider
 * @param {string} entityType Entity type
 * @returns {Promise<Array>} List of reconciliation issues
 */
async function checkReconciliation(userId, provider, entityType) {
  const issues = [];
  
  // Get all tracked entities
  const tracked = await new Promise((resolve, reject) => {
    db.getDb().all(
      'SELECT * FROM entity_tracking WHERE user_id = ? AND provider = ? AND entity_type = ? AND is_deleted = 0',
      [userId, provider, entityType],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
  
  // Get pending operations
  const pending = await new Promise((resolve, reject) => {
    db.getDb().all(
      'SELECT * FROM sync_operations WHERE user_id = ? AND provider = ? AND entity_type = ? AND status = ?',
      [userId, provider, entityType, 'pending'],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
  
  // Check for stale entities (not synced recently)
  const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  for (const entity of tracked) {
    if (entity.last_sync_at && entity.last_sync_at < staleThreshold) {
      issues.push({
        type: 'stale_entity',
        entityType,
        externalId: entity.external_id,
        lastSync: entity.last_sync_at,
        message: `Entity ${entity.external_id} has not been synced in over 24 hours`
      });
    }
  }
  
  // Check for stuck operations
  const stuckThreshold = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  for (const op of pending) {
    if (op.created_at < stuckThreshold) {
      issues.push({
        type: 'stuck_operation',
        operationId: op.operation_id,
        operationType: op.operation_type,
        createdAt: op.created_at,
        message: `Operation ${op.operation_id} has been pending for over 1 hour`
      });
    }
  }
  
  return issues;
}

/**
 * Add failed operation to dead letter queue
 * @param {Object} dlqData Dead letter queue entry
 */
async function addToDeadLetterQueue(dlqData) {
  const {
    operationId,
    userId,
    provider,
    operationType,
    entityType,
    payload,
    error
  } = dlqData;
  
  return new Promise((resolve, reject) => {
    db.getDb().run(
      `INSERT OR REPLACE INTO dead_letter_queue 
       (operation_id, user_id, provider, operation_type, entity_type, payload, error_message, error_stack, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'queued')`,
      [
        operationId,
        userId,
        provider,
        operationType,
        entityType,
        JSON.stringify(payload),
        error.message,
        error.stack
      ],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

/**
 * Get dead letter queue items
 * @param {Object} options Query options
 * @returns {Promise<Array>} DLQ items
 */
async function getDeadLetterQueue(options = {}) {
  const { userId, provider, status = 'queued', limit = 100 } = options;
  
  return new Promise((resolve, reject) => {
    let sql = 'SELECT * FROM dead_letter_queue WHERE status = ?';
    const params = [status];
    
    if (userId) {
      sql += ' AND user_id = ?';
      params.push(userId);
    }
    
    if (provider) {
      sql += ' AND provider = ?';
      params.push(provider);
    }
    
    sql += ' ORDER BY first_failure_at DESC LIMIT ?';
    params.push(limit);
    
    db.getDb().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

/**
 * Retry dead letter queue item
 * @param {number} dlqId DLQ entry ID
 * @returns {Promise<Object>} Retry result
 */
async function retryDeadLetterQueueItem(dlqId) {
  const item = await new Promise((resolve, reject) => {
    db.getDb().get(
      'SELECT * FROM dead_letter_queue WHERE id = ?',
      [dlqId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
  
  if (!item) {
    throw new Error(`DLQ item ${dlqId} not found`);
  }
  
  // Update retry count and status
  await new Promise((resolve, reject) => {
    db.getDb().run(
      'UPDATE dead_letter_queue SET retry_count = retry_count + 1, last_failure_at = CURRENT_TIMESTAMP, status = ? WHERE id = ?',
      ['retrying', dlqId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
  
  return {
    dlqId,
    operationId: item.operation_id,
    provider: item.provider,
    operationType: item.operation_type,
    payload: JSON.parse(item.payload)
  };
}

/**
 * Mark DLQ item as resolved
 * @param {number} dlqId DLQ entry ID
 * @param {string} resolution Resolution action taken
 * @returns {Promise<void>}
 */
async function resolveDeadLetterQueueItem(dlqId, resolution) {
  return new Promise((resolve, reject) => {
    db.getDb().run(
      'UPDATE dead_letter_queue SET status = ?, resolution = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['resolved', resolution, dlqId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

/**
 * Clear dead letter queue for a provider
 * @param {number} userId User ID
 * @param {string} provider Provider
 * @returns {Promise<number>} Number of items cleared
 */
async function clearDeadLetterQueue(userId, provider) {
  return new Promise((resolve, reject) => {
    db.getDb().run(
      'DELETE FROM dead_letter_queue WHERE user_id = ? AND provider = ?',
      [userId, provider],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
}

/**
 * Get operation history
 * @param {Object} options Query options
 * @returns {Promise<Array>} Operation history
 */
async function getOperationHistory(options = {}) {
  const { userId, provider, status, limit = 100, offset = 0 } = options;
  
  return new Promise((resolve, reject) => {
    let sql = 'SELECT * FROM sync_operations WHERE 1=1';
    const params = [];
    
    if (userId) {
      sql += ' AND user_id = ?';
      params.push(userId);
    }
    
    if (provider) {
      sql += ' AND provider = ?';
      params.push(provider);
    }
    
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    db.getDb().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

/**
 * Get operation statistics
 * @param {number} userId User ID
 * @param {string} provider Provider
 * @returns {Promise<Object>} Operation stats
 */
async function getOperationStats(userId, provider = null) {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(retry_count) as total_retries
      FROM sync_operations
      WHERE user_id = ?
    `;
    const params = [userId];
    
    if (provider) {
      sql += ' AND provider = ?';
      params.push(provider);
    }
    
    db.getDb().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve({
        total: row.total,
        completed: row.completed,
        failed: row.failed,
        pending: row.pending,
        successRate: row.total > 0 ? (row.completed / row.total * 100).toFixed(2) : 0,
        totalRetries: row.total_retries
      });
    });
  });
}

module.exports = {
  initialize,
  generateOperationId,
  generatePayloadHash,
  checkOperation,
  recordOperation,
  updateOperation,
  completeOperation,
  failOperation,
  processIdempotent,
  trackEntity,
  getEntityTracking,
  checkReconciliation,
  getDeadLetterQueue,
  retryDeadLetterQueueItem,
  resolveDeadLetterQueueItem,
  clearDeadLetterQueue,
  getOperationHistory,
  getOperationStats
};
