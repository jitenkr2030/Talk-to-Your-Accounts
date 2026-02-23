/**
 * Database Module
 * 
 * Provides SQLite database connection and utilities for the Talk-to-Your-Accounts application.
 * This module handles database initialization, migrations, and provides query interfaces.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database configuration
const DB_CONFIG = {
  filename: path.resolve(__dirname, '../../data/app.db'),
  options: {
    timeout: 30000,
    verbose: console.log
  }
};

// Encryption module reference
let cryptoService = null;

/**
 * Initialize the database connection
 * @returns {sqlite3.Database} Database instance
 */
function initializeDatabase() {
  const dbDir = path.dirname(DB_CONFIG.filename);
  
  // Ensure data directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true, mode: 0o700 });
    console.log(`[Database] Created data directory: ${dbDir}`);
  }
  
  // Create database connection
  const db = new sqlite3.Database(
    DB_CONFIG.filename,
    sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
    (err) => {
      if (err) {
        console.error('[Database] Failed to connect:', err.message);
        throw new Error(`Database connection failed: ${err.message}`);
      }
      console.log(`[Database] Connected to: ${DB_CONFIG.filename}`);
    }
  );
  
  // Configure database settings
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = 64000');
  db.pragma('temp_store = MEMORY');
  
  // Initialize schema
  initializeSchema(db);
  
  return db;
}

/**
 * Initialize database schema from schema.sql
 * @param {sqlite3.Database} db Database instance
 */
function initializeSchema(db) {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  
  try {
    if (!fs.existsSync(schemaPath)) {
      console.warn('[Database] Schema file not found, creating default schema');
      createDefaultSchema(db);
      return;
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    db.exec(schema, (err) => {
      if (err) {
        console.error('[Database] Schema initialization failed:', err.message);
        throw new Error(`Schema initialization failed: ${err.message}`);
      }
      console.log('[Database] Schema initialized successfully');
    });
  } catch (error) {
    console.error('[Database] Schema error:', error.message);
    createDefaultSchema(db);
  }
}

/**
 * Create default schema if schema.sql does not exist
 * @param {sqlite3.Database} db Database instance
 */
function createDefaultSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS oauth_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      access_token_encrypted TEXT NOT NULL,
      refresh_token_encrypted TEXT,
      access_token_iv TEXT NOT NULL,
      refresh_token_iv TEXT,
      realm_id TEXT,
      tenant_id TEXT,
      organization_id TEXT,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, provider)
    );
    
    CREATE TABLE IF NOT EXISTS integration_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      config_encrypted TEXT NOT NULL,
      config_iv TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, provider)
    );
    
    CREATE TABLE IF NOT EXISTS sync_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      last_sync_at DATETIME,
      last_sync_token TEXT,
      sync_status TEXT DEFAULT 'idle',
      records_synced INTEGER DEFAULT 0,
      records_failed INTEGER DEFAULT 0,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, provider, entity_type)
    );
    
    CREATE TABLE IF NOT EXISTS sync_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      sync_type TEXT NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      status TEXT,
      records_processed INTEGER DEFAULT 0,
      errors_count INTEGER DEFAULT 0,
      error_details TEXT,
      metadata TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS webhook_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_data TEXT NOT NULL,
      received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      processing_status TEXT DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      error_message TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `, (err) => {
    if (err) {
      console.error('[Database] Default schema creation failed:', err.message);
    } else {
      console.log('[Database] Default schema created successfully');
    }
  });
}

/**
 * Set the crypto service for encryption operations
 * @param {Object} cryptoModule Crypto service module
 */
function setCryptoService(cryptoModule) {
  cryptoService = cryptoModule;
}

/**
 * Get user by ID
 * @param {number} userId User ID
 * @returns {Promise<Object>} User object
 */
function getUserById(userId) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

/**
 * Get or create user by email
 * @param {string} email User email
 * @param {string} name User name
 * @returns {Promise<Object>} User object
 */
function getOrCreateUser(email, name = null) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (row) {
        resolve(row);
        return;
      }
      
      // Create new user
      db.run(
        'INSERT INTO users (email, name) VALUES (?, ?)',
        [email, name],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({ id: this.lastID, email, name });
        }
      );
    });
  });
}

/**
 * Save OAuth tokens for a user and provider
 * @param {number} userId User ID
 * @param {string} provider Provider name
 * @param {Object} tokens Token data
 * @returns {Promise<void>}
 */
async function saveOAuthTokens(userId, provider, tokens) {
  const db = getDb();
  
  // Encrypt tokens before storage
  if (!cryptoService) {
    throw new Error('Crypto service not initialized');
  }
  
  const accessEncrypted = cryptoService.encrypt(tokens.accessToken);
  const refreshEncrypted = tokens.refreshToken 
    ? cryptoService.encrypt(tokens.refreshToken) 
    : { content: null, iv: null };
  
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT OR REPLACE INTO oauth_tokens 
      (user_id, provider, access_token_encrypted, refresh_token_encrypted, 
       access_token_iv, refresh_token_iv, realm_id, tenant_id, organization_id, expires_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    db.run(sql, [
      userId,
      provider,
      accessEncrypted.content,
      refreshEncrypted.content,
      accessEncrypted.iv,
      refreshEncrypted.iv,
      tokens.realmId || null,
      tokens.tenantId || null,
      tokens.organizationId || null,
      tokens.expiresAt || null
    ], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Get OAuth tokens for a user and provider
 * @param {number} userId User ID
 * @param {string} provider Provider name
 * @returns {Promise<Object|null>} Token object with decrypted tokens
 */
async function getOAuthTokens(userId, provider) {
  const db = getDb();
  
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM oauth_tokens WHERE user_id = ? AND provider = ?',
      [userId, provider],
      async (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!row) {
          resolve(null);
          return;
        }
        
        // Decrypt tokens
        if (!cryptoService) {
          reject(new Error('Crypto service not initialized'));
          return;
        }
        
        try {
          const accessToken = cryptoService.decrypt(row.access_token_encrypted, row.access_token_iv);
          const refreshToken = row.refresh_token_encrypted 
            ? cryptoService.decrypt(row.refresh_token_encrypted, row.refresh_token_iv)
            : null;
          
          resolve({
            accessToken,
            refreshToken,
            realmId: row.realm_id,
            tenantId: row.tenant_id,
            organizationId: row.organization_id,
            expiresAt: row.expires_at
          });
        } catch (decryptError) {
          reject(decryptError);
        }
      }
    );
  });
}

/**
 * Delete OAuth tokens
 * @param {number} userId User ID
 * @param {string} provider Provider name
 * @returns {Promise<void>}
 */
function deleteOAuthTokens(userId, provider) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.run(
      'DELETE FROM oauth_tokens WHERE user_id = ? AND provider = ?',
      [userId, provider],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

/**
 * Update sync state
 * @param {number} userId User ID
 * @param {string} provider Provider name
 * @param {string} entityType Entity type
 * @param {Object} state Sync state data
 * @returns {Promise<void>}
 */
async function updateSyncState(userId, provider, entityType, state) {
  const db = getDb();
  
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT OR REPLACE INTO sync_state 
      (user_id, provider, entity_type, last_sync_at, last_sync_token, sync_status, 
       records_synced, records_failed, error_message, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    db.run(sql, [
      userId,
      provider,
      entityType,
      state.lastSyncAt || null,
      state.lastSyncToken || null,
      state.status || 'idle',
      state.recordsSynced || 0,
      state.recordsFailed || 0,
      state.errorMessage || null
    ], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Get sync state
 * @param {number} userId User ID
 * @param {string} provider Provider name
 * @param {string} entityType Entity type
 * @returns {Promise<Object|null>}
 */
function getSyncState(userId, provider, entityType) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.get(
      'SELECT * FROM sync_state WHERE user_id = ? AND provider = ? AND entity_type = ?',
      [userId, provider, entityType],
      (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      }
    );
  });
}

/**
 * Log audit event
 * @param {Object} auditData Audit log data
 * @returns {Promise<void>}
 */
function logAuditEvent(auditData) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    db.run(
      `INSERT INTO audit_log 
       (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        auditData.userId || null,
        auditData.action,
        auditData.resourceType || null,
        auditData.resourceId || null,
        auditData.details ? JSON.stringify(auditData.details) : null,
        auditData.ipAddress || null,
        auditData.userAgent || null
      ],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

/**
 * Queue webhook event for processing
 * @param {Object} eventData Webhook event data
 * @returns {Promise<void>}
 */
async function queueWebhookEvent(eventData) {
  const db = getDb();
  
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO webhook_events 
       (user_id, provider, event_type, event_data, processing_status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [
        eventData.userId,
        eventData.provider,
        eventData.eventType,
        JSON.stringify(eventData.eventData)
      ],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

// Database instance singleton
let dbInstance = null;

/**
 * Get database instance (singleton)
 * @returns {sqlite3.Database} Database instance
 */
function getDb() {
  if (!dbInstance) {
    dbInstance = initializeDatabase();
  }
  return dbInstance;
}

/**
 * Close database connection
 * @returns {Promise<void>}
 */
function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      dbInstance.close((err) => {
        if (err) reject(err);
        else {
          dbInstance = null;
          console.log('[Database] Connection closed');
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

// Export all database utilities
module.exports = {
  initializeDatabase,
  getDb,
  closeDatabase,
  setCryptoService,
  getUserById,
  getOrCreateUser,
  saveOAuthTokens,
  getOAuthTokens,
  deleteOAuthTokens,
  updateSyncState,
  getSyncState,
  logAuditEvent,
  queueWebhookEvent
};
