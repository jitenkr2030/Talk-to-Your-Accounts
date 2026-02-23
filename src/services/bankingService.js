/**
 * Banking Integration Service
 * 
 * Handles bank account connections, transaction fetching, and reconciliation.
 * Provides auto-matching of bank transactions to invoices.
 * 
 * Features:
 * - Bank account management
 * - Transaction sync (simulated for demo)
 * - Auto-reconciliation logic
 * - Manual matching interface
 * - Bank statement import
 */

let db = null;

/**
 * Initialize the banking service
 * @param {Object} database - Database instance
 */
function initialize(database) {
  db = database;
  console.log('[BankingService] Initialized');
  createBankingTables();
}

/**
 * Create banking-related database tables
 */
function createBankingTables() {
  if (!db) return;
  
  db.exec(`
    -- Connected bank accounts
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_name TEXT NOT NULL,
      account_number TEXT,
      account_type TEXT DEFAULT 'checking',
      balance REAL DEFAULT 0,
      currency TEXT DEFAULT 'INR',
      is_active INTEGER DEFAULT 1,
      last_synced TEXT,
      access_token TEXT,
      refresh_token TEXT,
      token_expiry TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Bank transactions feed
    CREATE TABLE IF NOT EXISTS bank_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      transaction_id TEXT UNIQUE,
      date TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      type TEXT DEFAULT 'debit', -- debit, credit
      category TEXT,
      reference TEXT,
      status TEXT DEFAULT 'pending', -- pending, matched, reconciled
      matched_invoice_id INTEGER,
      matched_invoice_type TEXT,
      is_manually_added INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES bank_accounts(id),
      FOREIGN KEY (matched_invoice_id) REFERENCES transactions(id)
    );
    
    -- Reconciliation rules
    CREATE TABLE IF NOT EXISTS reconciliation_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      pattern TEXT NOT NULL,
      match_type TEXT DEFAULT 'contains', -- contains, exact, regex
      category TEXT,
      account_id INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Manual reconciliation log
    CREATE TABLE IF NOT EXISTS reconciliation_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_transaction_id INTEGER NOT NULL,
      invoice_id INTEGER,
      invoice_type TEXT,
      matched_by TEXT,
      match_type TEXT DEFAULT 'manual',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bank_transaction_id) REFERENCES bank_transactions(id),
      FOREIGN KEY (invoice_id) REFERENCES transactions(id)
    );
  `);
}

/**
 * Add a new bank account
 * @param {Object} accountData - Bank account details
 */
function addBankAccount(accountData) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const { bank_name, account_number, account_type, balance, currency } = accountData;
    
    const stmt = db.prepare(`
      INSERT INTO bank_accounts (bank_name, account_number, account_type, balance, currency, last_synced)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);
    
    const result = stmt.run(
      bank_name || 'Unknown Bank',
      account_number || '',
      account_type || 'checking',
      balance || 0,
      currency || 'INR'
    );
    
    return {
      success: true,
      account_id: result.lastInsertRowid,
      message: 'Bank account added successfully'
    };
  } catch (error) {
    console.error('[BankingService] Add account error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all bank accounts
 */
function getBankAccounts() {
  if (!db) return [];
  
  try {
    const accounts = db.prepare(`
      SELECT * FROM bank_accounts WHERE is_active = 1 ORDER BY created_at DESC
    `).all();
    
    return accounts;
  } catch (error) {
    console.error('[BankingService] Get accounts error:', error);
    return [];
  }
}

/**
 * Get single bank account with transactions
 */
function getBankAccount(accountId) {
  if (!db) return null;
  
  try {
    const account = db.prepare(`
      SELECT * FROM bank_accounts WHERE id = ? AND is_active = 1
    `).get(accountId);
    
    if (!account) return null;
    
    const transactions = db.prepare(`
      SELECT * FROM bank_transactions 
      WHERE account_id = ? 
      ORDER BY date DESC, created_at DESC
    `).all(accountId);
    
    return {
      ...account,
      transactions
    };
  } catch (error) {
    console.error('[BankingService] Get account error:', error);
    return null;
  }
}

/**
 * Update bank account
 */
function updateBankAccount(accountId, updates) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const fields = [];
    const values = [];
    
    if (updates.bank_name !== undefined) {
      fields.push('bank_name = ?');
      values.push(updates.bank_name);
    }
    if (updates.balance !== undefined) {
      fields.push('balance = ?');
      values.push(updates.balance);
    }
    if (updates.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.is_active);
    }
    
    fields.push('updated_at = datetime(\'now\')');
    values.push(accountId);
    
    const stmt = db.prepare(`
      UPDATE bank_accounts SET ${fields.join(', ')} WHERE id = ?
    `);
    
    stmt.run(...values);
    
    return { success: true, message: 'Account updated successfully' };
  } catch (error) {
    console.error('[BankingService] Update account error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete bank account (soft delete)
 */
function deleteBankAccount(accountId) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    db.prepare(`
      UPDATE bank_accounts SET is_active = 0 WHERE id = ?
    `).run(accountId);
    
    return { success: true, message: 'Account removed successfully' };
  } catch (error) {
    console.error('[BankingService] Delete account error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add manual bank transaction
 */
function addBankTransaction(transactionData) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const { account_id, date, description, amount, type, category, reference } = transactionData;
    
    const stmt = db.prepare(`
      INSERT INTO bank_transactions (account_id, transaction_id, date, description, amount, type, category, reference, is_manually_added)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    
    const txnId = `MAN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const result = stmt.run(
      account_id,
      txnId,
      date,
      description || '',
      amount || 0,
      type || (amount >= 0 ? 'credit' : 'debit'),
      category || '',
      reference || ''
    );
    
    return {
      success: true,
      transaction_id: result.lastInsertRowid,
      message: 'Transaction added successfully'
    };
  } catch (error) {
    console.error('[BankingService] Add transaction error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get bank transactions with filters
 */
function getBankTransactions(filters = {}) {
  if (!db) return [];
  
  try {
    const { account_id, status, start_date, end_date, limit = 100 } = filters;
    
    let query = `
      SELECT bt.*, ba.bank_name, ba.account_number
      FROM bank_transactions bt
      LEFT JOIN bank_accounts ba ON bt.account_id = ba.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (account_id) {
      query += ' AND bt.account_id = ?';
      params.push(account_id);
    }
    
    if (status) {
      query += ' AND bt.status = ?';
      params.push(status);
    }
    
    if (start_date) {
      query += ' AND bt.date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND bt.date <= ?';
      params.push(end_date);
    }
    
    query += ' ORDER BY bt.date DESC, bt.created_at DESC LIMIT ?';
    params.push(limit);
    
    return db.prepare(query).all(...params);
  } catch (error) {
    console.error('[BankingService] Get transactions error:', error);
    return [];
  }
}

/**
 * Get unmatched bank transactions
 */
function getUnmatchedTransactions(accountId = null) {
  if (!db) return [];
  
  try {
    let query = `
      SELECT bt.*, ba.bank_name, ba.account_number
      FROM bank_transactions bt
      LEFT JOIN bank_accounts ba ON bt.account_id = ba.id
      WHERE bt.status IN ('pending', 'matched')
    `;
    
    const params = [];
    
    if (accountId) {
      query += ' AND bt.account_id = ?';
      params.push(accountId);
    }
    
    query += ' ORDER BY bt.date DESC';
    
    return db.prepare(query).all(...params);
  } catch (error) {
    console.error('[BankingService] Get unmatched error:', error);
    return [];
  }
}

/**
 * Auto-reconcile bank transactions with invoices
 */
function autoReconcile(accountId = null) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    // Get pending transactions
    const pendingTxns = getUnmatchedTransactions(accountId);
    
    // Get all unpaid invoices
    const invoices = db.prepare(`
      SELECT id, voucher_number, date, total_amount, payment_status, party_id
      FROM transactions 
      WHERE voucher_type = 'sale' 
      AND payment_status != 'paid'
      AND status = 'active'
      ORDER BY date DESC
    `).all();
    
    let matched = 0;
    let suggestions = [];
    
    for (const txn of pendingTxns) {
      // Exact amount match
      const matchingInvoice = invoices.find(inv => 
        Math.abs(inv.total_amount - Math.abs(txn.amount)) < 0.01
      );
      
      if (matchingInvoice) {
        // Mark as matched
        db.prepare(`
          UPDATE bank_transactions 
          SET status = 'matched', matched_invoice_id = ?, matched_invoice_type = 'sale'
          WHERE id = ?
        `).run(matchingInvoice.id, txn.id);
        
        matched++;
        
        suggestions.push({
          transaction_id: txn.id,
          invoice_id: matchingInvoice.id,
          confidence: 100,
          type: 'exact_amount'
        });
      }
    }
    
    return {
      success: true,
      matched_count: matched,
      suggestions
    };
  } catch (error) {
    console.error('[BankingService] Auto reconcile error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Manually match a bank transaction to an invoice
 */
function matchTransaction(transactionId, invoiceId, invoiceType = 'sale') {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    // Update bank transaction
    db.prepare(`
      UPDATE bank_transactions 
      SET status = 'reconciled', matched_invoice_id = ?, matched_invoice_type = ?
      WHERE id = ?
    `).run(invoiceId, invoiceType, transactionId);
    
    // If invoice type is sale and invoice exists, mark it as paid
    if (invoiceType === 'sale') {
      const invoice = db.prepare(`SELECT total_amount FROM transactions WHERE id = ?`).get(invoiceId);
      if (invoice) {
        db.prepare(`
          UPDATE transactions SET payment_status = 'paid' WHERE id = ?
        `).run(invoiceId);
      }
    }
    
    // Log reconciliation
    db.prepare(`
      INSERT INTO reconciliation_log (bank_transaction_id, invoice_id, invoice_type, matched_by, match_type)
      VALUES (?, ?, ?, 'system', 'manual')
    `).run(transactionId, invoiceId, invoiceType);
    
    return { success: true, message: 'Transaction matched successfully' };
  } catch (error) {
    console.error('[BankingService] Match error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Unmatch a previously reconciled transaction
 */
function unmatchTransaction(transactionId) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    // Get transaction info
    const txn = db.prepare(`SELECT matched_invoice_id, matched_invoice_type FROM bank_transactions WHERE id = ?`).get(transactionId);
    
    if (!txn || !txn.matched_invoice_id) {
      return { success: false, error: 'Transaction not matched' };
    }
    
    // Update transaction
    db.prepare(`
      UPDATE bank_transactions 
      SET status = 'pending', matched_invoice_id = NULL, matched_invoice_type = NULL
      WHERE id = ?
    `).run(transactionId);
    
    // Restore invoice payment status if it was a sale
    if (txn.matched_invoice_type === 'sale') {
      db.prepare(`
        UPDATE transactions SET payment_status = 'pending' WHERE id = ?
      `).run(txn.matched_invoice_id);
    }
    
    // Remove from reconciliation log
    db.prepare(`DELETE FROM reconciliation_log WHERE bank_transaction_id = ?`).run(transactionId);
    
    return { success: true, message: 'Transaction unmatched successfully' };
  } catch (error) {
    console.error('[BankingService] Unmatch error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get reconciliation summary
 */
function getReconciliationSummary(accountId = null) {
  if (!db) return null;
  
  try {
    let whereClause = '';
    const params = [];
    
    if (accountId) {
      whereClause = 'WHERE account_id = ?';
      params.push(accountId);
    }
    
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'matched' THEN 1 ELSE 0 END) as matched,
        SUM(CASE WHEN status = 'reconciled' THEN 1 ELSE 0 END) as reconciled,
        SUM(CASE WHEN type = 'credit' AND status = 'pending' THEN amount ELSE 0 END) as pending_credits,
        SUM(CASE WHEN type = 'debit' AND status = 'pending' THEN amount ELSE 0 END) as pending_debits
      FROM bank_transactions
      ${whereClause}
    `).get(...params);
    
    // Get recent reconciliations
    const recentReconciliations = db.prepare(`
      SELECT rl.*, bt.description, bt.amount as txn_amount, bt.date as txn_date,
             t.voucher_number
      FROM reconciliation_log rl
      LEFT JOIN bank_transactions bt ON rl.bank_transaction_id = bt.id
      LEFT JOIN transactions t ON rl.invoice_id = t.id
      ORDER BY rl.created_at DESC
      LIMIT 10
    `).all();
    
    return {
      ...stats,
      recent_reconciliations: recentReconciliations
    };
  } catch (error) {
    console.error('[BankingService] Summary error:', error);
    return null;
  }
}

/**
 * Add reconciliation rule
 */
function addReconciliationRule(ruleData) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const { name, pattern, match_type, category, account_id } = ruleData;
    
    const stmt = db.prepare(`
      INSERT INTO reconciliation_rules (name, pattern, match_type, category, account_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(name, pattern, match_type || 'contains', category || '', account_id || null);
    
    return {
      success: true,
      rule_id: result.lastInsertRowid,
      message: 'Rule added successfully'
    };
  } catch (error) {
    console.error('[BankingService] Add rule error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get reconciliation rules
 */
function getReconciliationRules(accountId = null) {
  if (!db) return [];
  
  try {
    let query = `SELECT * FROM reconciliation_rules WHERE is_active = 1`;
    const params = [];
    
    if (accountId) {
      query += ' AND (account_id = ? OR account_id IS NULL)';
      params.push(accountId);
    }
    
    query += ' ORDER BY created_at DESC';
    
    return db.prepare(query).all(...params);
  } catch (error) {
    console.error('[BankingService] Get rules error:', error);
    return [];
  }
}

/**
 * Delete reconciliation rule
 */
function deleteReconciliationRule(ruleId) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    db.prepare(`DELETE FROM reconciliation_rules WHERE id = ?`).run(ruleId);
    return { success: true, message: 'Rule deleted successfully' };
  } catch (error) {
    console.error('[BankingService] Delete rule error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Import bank statement (CSV format - simulated)
 */
function importBankStatement(accountId, transactions) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    let imported = 0;
    let duplicates = 0;
    
    for (const txn of transactions) {
      // Check for duplicates
      const existing = db.prepare(`
        SELECT id FROM bank_transactions 
        WHERE account_id = ? AND transaction_id = ?
      `).get(accountId, txn.transaction_id);
      
      if (existing) {
        duplicates++;
        continue;
      }
      
      db.prepare(`
        INSERT INTO bank_transactions (account_id, transaction_id, date, description, amount, type)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        accountId,
        txn.transaction_id || `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        txn.date,
        txn.description || '',
        txn.amount || 0,
        txn.type || (txn.amount >= 0 ? 'credit' : 'debit')
      );
      
      imported++;
    }
    
    return {
      success: true,
      imported_count: imported,
      duplicate_count: duplicates,
      message: `Imported ${imported} transactions, ${duplicates} duplicates skipped`
    };
  } catch (error) {
    console.error('[BankingService] Import error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  initialize,
  addBankAccount,
  getBankAccounts,
  getBankAccount,
  updateBankAccount,
  deleteBankAccount,
  addBankTransaction,
  getBankTransactions,
  getUnmatchedTransactions,
  autoReconcile,
  matchTransaction,
  unmatchTransaction,
  getReconciliationSummary,
  addReconciliationRule,
  getReconciliationRules,
  deleteReconciliationRule,
  importBankStatement
};
