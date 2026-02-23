/**
 * Expense Management Service
 * 
 * Handles expense tracking, categorization, and reconciliation.
 * Provides comprehensive expense management with GST integration.
 * 
 * Features:
 * - Expense CRUD operations
 * - Receipt attachment support
 * - Category management
 * - Vendor management
 * - GST Input Tax Credit tracking
 * - Banking reconciliation
 * - Approval workflow
 */

let db = null;

/**
 * Initialize the expense service
 * @param {Object} database - Database instance
 */
function initialize(database) {
  db = database;
  console.log('[ExpenseService] Initialized');
  createExpenseTables();
}

/**
 * Create expense-related database tables
 */
function createExpenseTables() {
  if (!db) return;
  
  db.exec(`
    -- Expense Categories
    CREATE TABLE IF NOT EXISTS expense_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES expense_categories(id)
    );
    
    -- Expenses
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_number TEXT UNIQUE,
      date TEXT NOT NULL,
      vendor_id INTEGER,
      category_id INTEGER,
      description TEXT,
      amount REAL NOT NULL,
      cgst REAL DEFAULT 0,
      sgst REAL DEFAULT 0,
      igst REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      gst_rate REAL DEFAULT 0,
      payment_mode TEXT DEFAULT 'cash',
      payment_status TEXT DEFAULT 'pending',
      itc_eligible INTEGER DEFAULT 0,
      receipt_path TEXT,
      reference_number TEXT,
      notes TEXT,
      status TEXT DEFAULT 'draft',
      approved_by INTEGER,
      approved_at TEXT,
      bank_transaction_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES parties(id),
      FOREIGN KEY (category_id) REFERENCES expense_categories(id),
      FOREIGN KEY (approved_by) REFERENCES users(id),
      FOREIGN KEY (bank_transaction_id) REFERENCES bank_transactions(id)
    );
    
    -- Recurring Expenses
    CREATE TABLE IF NOT EXISTS recurring_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_id INTEGER,
      category_id INTEGER,
      amount REAL NOT NULL,
      gst_rate REAL DEFAULT 0,
      frequency TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      last_generated TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES parties(id),
      FOREIGN KEY (category_id) REFERENCES expense_categories(id)
    );
    
    -- Expense Audit Log
    CREATE TABLE IF NOT EXISTS expense_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      old_values TEXT,
      new_values TEXT,
      performed_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (expense_id) REFERENCES expenses(id),
      FOREIGN KEY (performed_by) REFERENCES users(id)
    );
  `);
  
  // Insert default categories
  const defaultCategories = [
    'Office Supplies',
    'Travel & Transport',
    'Food & Entertainment',
    'Utilities',
    'Rent',
    'Salary & Wages',
    'Marketing & Advertising',
    'Professional Services',
    'Software & Subscriptions',
    'Maintenance & Repairs',
    'Insurance',
    'Bank Charges',
    'Miscellaneous'
  ];
  
  const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO expense_categories (name) VALUES (?)
  `);
  
  for (const cat of defaultCategories) {
    insertCategory.run(cat);
  }
}

/**
 * Generate expense voucher number
 */
function generateVoucherNumber() {
  const prefix = 'EXP';
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM expenses WHERE strftime('%Y', created_at) = ?
  `).get(String(year));
  
  const seq = String((result.count || 0) + 1).padStart(4, '0');
  return `${prefix}/${year}/${month}/${seq}`;
}

/**
 * Create expense
 */
function createExpense(expenseData) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const { 
      date, vendor_id, category_id, description, amount, cgst, sgst, igst, 
      gst_rate, payment_mode, itc_eligible, receipt_path, reference_number, notes 
    } = expenseData;
    
    const totalAmount = parseFloat(amount) + parseFloat(cgst || 0) + parseFloat(sgst || 0) + parseFloat(igst || 0);
    const voucherNumber = generateVoucherNumber();
    
    const result = db.prepare(`
      INSERT INTO expenses (
        voucher_number, date, vendor_id, category_id, description, amount,
        cgst, sgst, igst, total_amount, gst_rate, payment_mode, itc_eligible,
        receipt_path, reference_number, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `).run(
      voucherNumber,
      date,
      vendor_id || null,
      category_id || null,
      description || '',
      amount,
      cgst || 0,
      sgst || 0,
      igst || 0,
      totalAmount,
      gst_rate || 0,
      payment_mode || 'cash',
      itc_eligible ? 1 : 0,
      receipt_path || '',
      reference_number || '',
      notes || ''
    );
    
    // Log audit
    logExpenseAudit(result.lastInsertRowid, 'created', null, expenseData);
    
    return {
      success: true,
      expense_id: result.lastInsertRowid,
      voucher_number: voucherNumber,
      message: 'Expense created successfully'
    };
  } catch (error) {
    console.error('[ExpenseService] Create expense error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get expense by ID
 */
function getExpense(expenseId) {
  if (!db) return null;
  
  try {
    const expense = db.prepare(`
      SELECT e.*, 
             v.name as vendor_name,
             c.name as category_name
      FROM expenses e
      LEFT JOIN parties v ON e.vendor_id = v.id
      LEFT JOIN expense_categories c ON e.category_id = c.id
      WHERE e.id = ?
    `).get(expenseId);
    
    return expense;
  } catch (error) {
    console.error('[ExpenseService] Get expense error:', error);
    return null;
  }
}

/**
 * Get expenses with filters
 */
function getExpenses(filters = {}) {
  if (!db) return [];
  
  try {
    const { 
      status, category_id, vendor_id, payment_mode, itc_eligible,
      start_date, end_date, limit = 100, offset = 0 
    } = filters;
    
    let query = `
      SELECT e.*, 
             v.name as vendor_name,
             c.name as category_name
      FROM expenses e
      LEFT JOIN parties v ON e.vendor_id = v.id
      LEFT JOIN expense_categories c ON e.category_id = c.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      query += ' AND e.status = ?';
      params.push(status);
    }
    
    if (category_id) {
      query += ' AND e.category_id = ?';
      params.push(category_id);
    }
    
    if (vendor_id) {
      query += ' AND e.vendor_id = ?';
      params.push(vendor_id);
    }
    
    if (payment_mode) {
      query += ' AND e.payment_mode = ?';
      params.push(payment_mode);
    }
    
    if (itc_eligible !== undefined) {
      query += ' AND e.itc_eligible = ?';
      params.push(itc_eligible ? 1 : 0);
    }
    
    if (start_date) {
      query += ' AND e.date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND e.date <= ?';
      params.push(end_date);
    }
    
    query += ' ORDER BY e.date DESC, e.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    return db.prepare(query).all(...params);
  } catch (error) {
    console.error('[ExpenseService] Get expenses error:', error);
    return [];
  }
}

/**
 * Update expense
 */
function updateExpense(expenseId, updates) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    // Get old values for audit
    const oldExpense = getExpense(expenseId);
    if (!oldExpense) {
      return { success: false, error: 'Expense not found' };
    }
    
    const fields = [];
    const values = [];
    
    const allowedFields = [
      'date', 'vendor_id', 'category_id', 'description', 'amount',
      'cgst', 'sgst', 'igst', 'gst_rate', 'payment_mode', 'payment_status',
      'itc_eligible', 'receipt_path', 'reference_number', 'notes', 'status'
    ];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }
    
    // Recalculate total if amounts changed
    if (updates.amount || updates.cgst || updates.sgst || updates.igst) {
      const current = getExpense(expenseId);
      const amount = updates.amount !== undefined ? updates.amount : current.amount;
      const cgst = updates.cgst !== undefined ? updates.cgst : current.cgst;
      const sgst = updates.sgst !== undefined ? updates.sgst : current.sgst;
      const igst = updates.igst !== undefined ? updates.igst : current.igst;
      
      fields.push('total_amount = ?');
      values.push(parseFloat(amount) + parseFloat(cgst) + parseFloat(sgst) + parseFloat(igst));
    }
    
    if (fields.length === 0) {
      return { success: false, error: 'No fields to update' };
    }
    
    fields.push('updated_at = datetime(\'now\')');
    values.push(expenseId);
    
    db.prepare(`UPDATE expenses SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    
    // Log audit
    logExpenseAudit(expenseId, 'updated', oldExpense, updates);
    
    return { success: true, message: 'Expense updated successfully' };
  } catch (error) {
    console.error('[ExpenseService] Update expense error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete expense (soft delete)
 */
function deleteExpense(expenseId) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const oldExpense = getExpense(expenseId);
    if (!oldExpense) {
      return { success: false, error: 'Expense not found' };
    }
    
    db.prepare(`UPDATE expenses SET status = 'deleted', updated_at = datetime('now') WHERE id = ?`).run(expenseId);
    
    // Log audit
    logExpenseAudit(expenseId, 'deleted', oldExpense, null);
    
    return { success: true, message: 'Expense deleted successfully' };
  } catch (error) {
    console.error('[ExpenseService] Delete expense error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Approve expense
 */
function approveExpense(expenseId, approvedBy) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const expense = getExpense(expenseId);
    if (!expense) {
      return { success: false, error: 'Expense not found' };
    }
    
    db.prepare(`
      UPDATE expenses 
      SET status = 'approved', approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(approvedBy, expenseId);
    
    // Log audit
    logExpenseAudit(expenseId, 'approved', { status: expense.status }, { status: 'approved', approved_by: approvedBy });
    
    return { success: true, message: 'Expense approved successfully' };
  } catch (error) {
    console.error('[ExpenseService] Approve expense error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get expense summary
 */
function getExpenseSummary(filters = {}) {
  if (!db) return null;
  
  try {
    const { start_date, end_date, category_id } = filters;
    
    let whereClause = 'WHERE status != \'deleted\'';
    const params = [];
    
    if (start_date) {
      whereClause += ' AND date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      whereClause += ' AND date <= ?';
      params.push(end_date);
    }
    
    if (category_id) {
      whereClause += ' AND category_id = ?';
      params.push(category_id);
    }
    
    const summary = db.prepare(`
      SELECT 
        COUNT(*) as total_expenses,
        SUM(amount) as total_amount,
        SUM(cgst) as total_cgst,
        SUM(sgst) as total_sgst,
        SUM(igst) as total_igst,
        SUM(total_amount) as grand_total,
        SUM(CASE WHEN itc_eligible = 1 THEN (cgst + sgst + igst) ELSE 0 END) as total_itc
      FROM expenses
      ${whereClause}
    `).get(...params);
    
    // By category
    const byCategory = db.prepare(`
      SELECT c.name, SUM(e.amount) as total, COUNT(*) as count
      FROM expenses e
      LEFT JOIN expense_categories c ON e.category_id = c.id
      ${whereClause.replace('WHERE', 'WHERE e.category_id IS NOT NULL AND')}
      GROUP BY e.category_id
      ORDER BY total DESC
    `).all(...params);
    
    // By status
    const byStatus = db.prepare(`
      SELECT status, SUM(total_amount) as total, COUNT(*) as count
      FROM expenses
      ${whereClause}
      GROUP BY status
    `).all(...params);
    
    // By payment mode
    const byPaymentMode = db.prepare(`
      SELECT payment_mode, SUM(total_amount) as total, COUNT(*) as count
      FROM expenses
      ${whereClause}
      GROUP BY payment_mode
    `).all(...params);
    
    return {
      ...summary,
      by_category: byCategory,
      by_status: byStatus,
      by_payment_mode: byPaymentMode
    };
  } catch (error) {
    console.error('[ExpenseService] Get summary error:', error);
    return null;
  }
}

/**
 * Get expense categories
 */
function getCategories(parentId = null) {
  if (!db) return [];
  
  try {
    let query = 'SELECT * FROM expense_categories WHERE is_active = 1';
    const params = [];
    
    if (parentId !== undefined) {
      if (parentId === null) {
        query += ' AND parent_id IS NULL';
      } else {
        query += ' AND parent_id = ?';
        params.push(parentId);
      }
    }
    
    query += ' ORDER BY name';
    
    return db.prepare(query).all(...params);
  } catch (error) {
    console.error('[ExpenseService] Get categories error:', error);
    return [];
  }
}

/**
 * Add expense category
 */
function addCategory(categoryData) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const { name, parent_id, description } = categoryData;
    
    const result = db.prepare(`
      INSERT INTO expense_categories (name, parent_id, description)
      VALUES (?, ?, ?)
    `).run(name, parent_id || null, description || '');
    
    return {
      success: true,
      category_id: result.lastInsertRowid,
      message: 'Category added successfully'
    };
  } catch (error) {
    console.error('[ExpenseService] Add category error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Match expense to bank transaction
 */
function matchToBankTransaction(expenseId, bankTransactionId) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    // Update expense with bank transaction reference
    db.prepare(`
      UPDATE expenses SET bank_transaction_id = ?, updated_at = datetime('now') WHERE id = ?
    `).run(bankTransactionId, expenseId);
    
    // Update bank transaction status
    db.prepare(`
      UPDATE bank_transactions SET status = 'matched', matched_invoice_id = ?, matched_invoice_type = 'expense'
      WHERE id = ?
    `).run(expenseId, bankTransactionId);
    
    return { success: true, message: 'Expense matched to bank transaction' };
  } catch (error) {
    console.error('[ExpenseService] Match to bank error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get unmatched bank transactions for expense matching
 */
function getUnmatchedBankTransactions() {
  if (!db) return [];
  
  try {
    return db.prepare(`
      SELECT * FROM bank_transactions 
      WHERE status = 'pending' AND type = 'debit'
      ORDER BY date DESC
      LIMIT 50
    `).all();
  } catch (error) {
    console.error('[ExpenseService] Get unmatched bank transactions error:', error);
    return [];
  }
}

/**
 * Log expense audit
 */
function logExpenseAudit(expenseId, action, oldValues, newValues) {
  if (!db) return;
  
  try {
    db.prepare(`
      INSERT INTO expense_audit_log (expense_id, action, old_values, new_values)
      VALUES (?, ?, ?, ?)
    `).run(
      expenseId,
      action,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null
    );
  } catch (error) {
    console.error('[ExpenseService] Audit log error:', error);
  }
}

/**
 * Get expense audit log
 */
function getExpenseAuditLog(expenseId) {
  if (!db) return [];
  
  try {
    return db.prepare(`
      SELECT * FROM expense_audit_log WHERE expense_id = ? ORDER BY created_at DESC
    `).all(expenseId);
  } catch (error) {
    console.error('[ExpenseService] Get audit log error:', error);
    return [];
  }
}

/**
 * Create recurring expense
 */
function createRecurringExpense(recurringData) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const { vendor_id, category_id, amount, gst_rate, frequency, start_date, end_date } = recurringData;
    
    const result = db.prepare(`
      INSERT INTO recurring_expenses (vendor_id, category_id, amount, gst_rate, frequency, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(vendor_id || null, category_id || null, amount, gst_rate || 0, frequency, start_date, end_date || null);
    
    return {
      success: true,
      recurring_id: result.lastInsertRowid,
      message: 'Recurring expense created successfully'
    };
  } catch (error) {
    console.error('[ExpenseService] Create recurring error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get recurring expenses
 */
function getRecurringExpenses() {
  if (!db) return [];
  
  try {
    return db.prepare(`
      SELECT r.*, v.name as vendor_name, c.name as category_name
      FROM recurring_expenses r
      LEFT JOIN parties v ON r.vendor_id = v.id
      LEFT JOIN expense_categories c ON r.category_id = c.id
      WHERE r.is_active = 1
      ORDER BY r.created_at DESC
    `).all();
  } catch (error) {
    console.error('[ExpenseService] Get recurring error:', error);
    return [];
  }
}

/**
 * Process recurring expenses
 */
function processRecurringExpenses() {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const recurring = getRecurringExpenses();
    const today = new Date().toISOString().split('T')[0];
    let created = 0;
    
    for (const rec of recurring) {
      // Check if it's time to generate
      let shouldGenerate = false;
      
      if (rec.frequency === 'daily') {
        shouldGenerate = true;
      } else if (rec.frequency === 'weekly') {
        const lastGen = rec.last_generated ? new Date(rec.last_generated) : new Date(rec.start_date);
        const daysSince = Math.floor((new Date() - lastGen) / (1000 * 60 * 60 * 24));
        shouldGenerate = daysSince >= 7;
      } else if (rec.frequency === 'monthly') {
        const lastGen = rec.last_generated ? new Date(rec.last_generated) : new Date(rec.start_date);
        shouldGenerate = lastGen.getMonth() !== new Date().getMonth();
      }
      
      if (shouldGenerate) {
        // Create expense
        const gstAmount = rec.amount * (rec.gst_rate / 100);
        createExpense({
          date: today,
          vendor_id: rec.vendor_id,
          category_id: rec.category_id,
          amount: rec.amount,
          cgst: gstAmount / 2,
          sgst: gstAmount / 2,
          igst: 0,
          gst_rate: rec.gst_rate,
          payment_mode: 'bank',
          description: `Recurring expense - ${rec.frequency}`
        });
        
        // Update last generated
        db.prepare(`UPDATE recurring_expenses SET last_generated = ? WHERE id = ?`).run(today, rec.id);
        created++;
      }
    }
    
    return { success: true, created_count: created };
  } catch (error) {
    console.error('[ExpenseService] Process recurring error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  initialize,
  createExpense,
  getExpense,
  getExpenses,
  updateExpense,
  deleteExpense,
  approveExpense,
  getExpenseSummary,
  getCategories,
  addCategory,
  matchToBankTransaction,
  getUnmatchedBankTransactions,
  getExpenseAuditLog,
  createRecurringExpense,
  getRecurringExpenses,
  processRecurringExpenses
};
