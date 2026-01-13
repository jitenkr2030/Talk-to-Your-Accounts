// Database operations for Talk to Your Accounts
// SQLite database management with encrypted storage support

const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.dbPath = null;
    this.encryptionKey = null;
  }

  // Initialize database with optional encryption
  initialize(userDataPath, encryptionKey = null) {
    this.dbPath = path.join(userDataPath, 'talk-to-accounts.db');
    this.encryptionKey = encryptionKey;
    
    // Enable WAL mode for better performance
    const options = encryptionKey ? { 
      crypto: this.createCryptoCipher(encryptionKey) 
    } : {};
    
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    
    // Create tables if not exist
    this.createTables();
    
    return this;
  }

  // Create all database tables
  createTables() {
    const statements = [
      // Business Information
      `CREATE TABLE IF NOT EXISTS business_info (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Parties/Ledgers
      `CREATE TABLE IF NOT EXISTS parties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'customer',
        contact TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        gstin TEXT,
        pan TEXT,
        opening_balance REAL DEFAULT 0,
        balance_type TEXT DEFAULT 'receivable',
        credit_limit REAL DEFAULT 0,
        credit_days INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Products/Items
      `CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        sku TEXT,
        hsn_code TEXT,
        sac_code TEXT,
        unit TEXT DEFAULT 'pcs',
        rate REAL NOT NULL,
        cost_price REAL DEFAULT 0,
        gst_rate REAL DEFAULT 0,
        cess_rate REAL DEFAULT 0,
        opening_stock INTEGER DEFAULT 0,
        current_stock INTEGER DEFAULT 0,
        min_stock INTEGER DEFAULT 0,
        max_stock INTEGER DEFAULT 0,
        location TEXT,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Categories
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        parent_id INTEGER DEFAULT 0,
        gst_rate REAL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Transactions
      `CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        voucher_no TEXT NOT NULL,
        voucher_type TEXT NOT NULL DEFAULT 'sale',
        date TEXT NOT NULL,
        party_id INTEGER,
        product_id INTEGER,
        quantity INTEGER NOT NULL DEFAULT 1,
        rate REAL NOT NULL,
        amount REAL NOT NULL,
        discount_percent REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        taxable_amount REAL NOT NULL,
        gst_rate REAL DEFAULT 0,
        cgst_amount REAL DEFAULT 0,
        sgst_amount REAL DEFAULT 0,
        igst_amount REAL DEFAULT 0,
        cess_amount REAL DEFAULT 0,
        total_gst REAL DEFAULT 0,
        total_amount REAL NOT NULL,
        description TEXT,
        narration TEXT,
        payment_status TEXT DEFAULT 'pending',
        payment_method TEXT,
        reference_no TEXT,
        due_date TEXT,
        is_completed INTEGER DEFAULT 1,
        is_cancelled INTEGER DEFAULT 0,
        created_by TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (party_id) REFERENCES parties(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )`,

      // Payments
      `CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER,
        party_id INTEGER,
        amount REAL NOT NULL,
        method TEXT DEFAULT 'cash',
        reference TEXT,
        cheque_no TEXT,
        bank_name TEXT,
        deposit_to TEXT DEFAULT 'cash',
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id),
        FOREIGN KEY (party_id) REFERENCES parties(id)
      )`,

      // Expenses
      `CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        sub_category TEXT,
        amount REAL NOT NULL,
        gst_amount REAL DEFAULT 0,
        description TEXT,
        party_id INTEGER,
        payment_method TEXT,
        reference TEXT,
        date TEXT DEFAULT CURRENT_TIMESTAMP,
        is_recurring INTEGER DEFAULT 0,
        recurring_frequency TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Cash Book
      `CREATE TABLE IF NOT EXISTS cash_book (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        voucher_no TEXT,
        description TEXT,
        debit REAL DEFAULT 0,
        credit REAL DEFAULT 0,
        balance REAL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // GST Records
      `CREATE TABLE IF NOT EXISTS gst_returns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period TEXT NOT NULL,
        return_type TEXT NOT NULL,
        gst_taxable_amount REAL DEFAULT 0,
        gst_collected REAL DEFAULT 0,
        gst_paid REAL DEFAULT 0,
        igst_collected REAL DEFAULT 0,
        igst_paid REAL DEFAULT 0,
        cgst_collected REAL DEFAULT 0,
        cgst_paid REAL DEFAULT 0,
        sgst_collected REAL DEFAULT 0,
        sgst_paid REAL DEFAULT 0,
        cess_collected REAL DEFAULT 0,
        cess_paid REAL DEFAULT 0,
        input_tax_credit REAL DEFAULT 0,
        net_liability REAL DEFAULT 0,
        status TEXT DEFAULT 'draft',
        filed_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Alerts
      `CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        severity TEXT DEFAULT 'medium',
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        is_read INTEGER DEFAULT 0,
        is_dismissed INTEGER DEFAULT 0,
        action_taken TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Audit Logs
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        old_values TEXT,
        new_values TEXT,
        user TEXT,
        ip_address TEXT,
        details TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Health Metrics
      `CREATE TABLE IF NOT EXISTS health_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period TEXT NOT NULL,
        cash_flow_score REAL DEFAULT 0,
        credit_score REAL DEFAULT 0,
        expense_score REAL DEFAULT 0,
        compliance_score REAL DEFAULT 0,
        overall_score REAL DEFAULT 0,
        analysis TEXT,
        recommendations TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Tax Settings
      `CREATE TABLE IF NOT EXISTS tax_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tax_type TEXT NOT NULL,
        rate REAL NOT NULL,
        cgst_rate REAL DEFAULT 0,
        sgst_rate REAL DEFAULT 0,
        igst_rate REAL DEFAULT 0,
        cess_rate REAL DEFAULT 0,
        min_amount REAL DEFAULT 0,
        max_amount REAL DEFAULT 0,
        effective_from TEXT,
        effective_to TEXT,
        is_active INTEGER DEFAULT 1
      )`,

      // Settings
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Users for Authentication
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        pin_hash TEXT NOT NULL,
        pin_salt TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'editor',
        is_active INTEGER DEFAULT 1,
        failed_attempts INTEGER DEFAULT 0,
        locked_until TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_login TEXT
      )`,

      // GST Reminders for Compliance
      `CREATE TABLE IF NOT EXISTS gst_reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reminder_type TEXT NOT NULL,
        period TEXT NOT NULL,
        due_date TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Sessions
      `CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,

      // Notifications & Alerts
      `CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL DEFAULT 'info',
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        severity TEXT DEFAULT 'medium',
        is_read INTEGER DEFAULT 0,
        is_dismissed INTEGER DEFAULT 0,
        action_url TEXT,
        related_entity_type TEXT,
        related_entity_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        read_at TEXT
      )`,

      // Bank Statements for Reconciliation
      `CREATE TABLE IF NOT EXISTS bank_statements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_file TEXT NOT NULL,
        date TEXT NOT NULL,
        description TEXT,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        reference_no TEXT,
        transaction_id INTEGER,
        match_status TEXT DEFAULT 'pending',
        match_confidence REAL DEFAULT 0,
        matched_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id)
      )`,

      // Recommendations
      `CREATE TABLE IF NOT EXISTS recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        impact_score INTEGER DEFAULT 0,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'active',
        actionable_steps TEXT,
        related_entity_type TEXT,
        related_entity_id INTEGER,
        dismissed_at TEXT,
        implemented_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Error Detection Results
      `CREATE TABLE IF NOT EXISTS error_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        error_type TEXT NOT NULL,
        severity TEXT DEFAULT 'warning',
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        detected_value TEXT,
        expected_value TEXT,
        resolution TEXT,
        is_resolved INTEGER DEFAULT 0,
        resolved_at TEXT,
        resolved_by TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Voice Commands Log
      `CREATE TABLE IF NOT EXISTS voice_commands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transcript TEXT NOT NULL,
        parsed_command TEXT,
        action_taken TEXT,
        success INTEGER DEFAULT 0,
        error_message TEXT,
        duration_ms INTEGER,
        language TEXT DEFAULT 'en-IN',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Multi-Language Settings
      `CREATE TABLE IF NOT EXISTS language_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        locale TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Printed Documents Log
      `CREATE TABLE IF NOT EXISTS printed_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_type TEXT NOT NULL,
        title TEXT NOT NULL,
        date_range TEXT,
        parameters TEXT,
        printed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        printed_by TEXT
      )`
    ];

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(voucher_type)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_party ON transactions(party_id)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_voucher ON transactions(voucher_no)',
      'CREATE INDEX IF NOT EXISTS idx_parties_name ON parties(name)',
      'CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)',
      'CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type)',
      'CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(is_read, is_dismissed)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(is_read, is_dismissed)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category)',
      'CREATE INDEX IF NOT EXISTS idx_bank_statements_status ON bank_statements(match_status)',
      'CREATE INDEX IF NOT EXISTS idx_bank_statements_date ON bank_statements(date)',
      'CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status)',
      'CREATE INDEX IF NOT EXISTS idx_recommendations_category ON recommendations(category)',
      'CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(is_resolved)',
      'CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type)',
      'CREATE INDEX IF NOT EXISTS idx_voice_commands_created ON voice_commands(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)'
    ];

    // Execute all statements
    for (const stmt of statements) {
      try {
        this.db.exec(stmt);
      } catch (error) {
        console.error('Error creating table:', error);
      }
    }

    for (const index of indexes) {
      try {
        this.db.exec(index);
      } catch (error) {
        console.error('Error creating index:', error);
      }
    }

    // Initialize default tax settings
    this.initializeDefaultTaxSettings();

    return this;
  }

  // Initialize default GST rates
  initializeDefaultTaxSettings() {
    const defaultTaxes = [
      { tax_type: 'GST0', rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0 },
      { tax_type: 'GST5', rate: 5, cgst_rate: 2.5, sgst_rate: 2.5, igst_rate: 5 },
      { tax_type: 'GST12', rate: 12, cgst_rate: 6, sgst_rate: 6, igst_rate: 12 },
      { tax_type: 'GST18', rate: 18, cgst_rate: 9, sgst_rate: 9, igst_rate: 18 },
      { tax_type: 'GST28', rate: 28, cgst_rate: 14, sgst_rate: 14, igst_rate: 28 }
    ];

    const stmt = this.db.prepare('INSERT OR IGNORE INTO tax_settings (tax_type, rate, cgst_rate, sgst_rate, igst_rate) VALUES (?, ?, ?, ?, ?)');
    for (const tax of defaultTaxes) {
      stmt.run(tax.tax_type, tax.rate, tax.cgst_rate, tax.sgst_rate, tax.igst_rate);
    }

    // Initialize default categories
    const defaultCategories = [
      { name: 'Office Expenses', type: 'expense', gst_rate: 18 },
      { name: 'Rent', type: 'expense', gst_rate: 0 },
      { name: 'Electricity', type: 'expense', gst_rate: 18 },
      { name: 'Telephone', type: 'expense', gst_rate: 18 },
      { name: 'Transportation', type: 'expense', gst_rate: 18 },
      { name: 'Raw Materials', type: 'purchase', gst_rate: 18 },
      { name: 'Finished Goods', type: 'sale', gst_rate: 18 },
      { name: 'Services', type: 'sale', gst_rate: 18 }
    ];

    const catStmt = this.db.prepare('INSERT OR IGNORE INTO categories (name, type, gst_rate) VALUES (?, ?, ?)');
    for (const cat of defaultCategories) {
      catStmt.run(cat.name, cat.type, cat.gst_rate);
    }
  }

  // CRUD Operations - Generic
  insert(table, data) {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);
    
    const stmt = this.db.prepare(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`);
    const result = stmt.run(...values);
    
    return result.lastInsertRowid;
  }

  update(table, data, whereClause, whereValues) {
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), ...whereValues];
    
    const stmt = this.db.prepare(`UPDATE ${table} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE ${whereClause}`);
    stmt.run(...values);
    
    return true;
  }

  delete(table, whereClause, whereValues) {
    const stmt = this.db.prepare(`DELETE FROM ${table} WHERE ${whereClause}`);
    stmt.run(...whereValues);
    
    return true;
  }

  findById(table, id) {
    const stmt = this.db.prepare(`SELECT * FROM ${table} WHERE id = ?`);
    return stmt.get(id);
  }

  findAll(table, options = {}) {
    let query = `SELECT * FROM ${table}`;
    const params = [];
    
    if (options.where) {
      query += ` WHERE ${options.where}`;
      params.push(...(options.whereParams || []));
    }
    
    if (options.orderBy) {
      query += ` ORDER BY ${options.orderBy}`;
    }
    
    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    
    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  // Business Info
  getBusinessInfo(key = null) {
    if (key) {
      return this.db.prepare('SELECT * FROM business_info WHERE key = ?').get(key);
    }
    
    const results = this.db.prepare('SELECT * FROM business_info').all();
    return results.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  }

  setBusinessInfo(data) {
    for (const [key, value] of Object.entries(data)) {
      const existing = this.db.prepare('SELECT * FROM business_info WHERE key = ?').get(key);
      if (existing) {
        this.db.prepare('UPDATE business_info SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?').run(value, key);
      } else {
        this.db.prepare('INSERT INTO business_info (key, value) VALUES (?, ?)').run(key, value);
      }
    }
    return true;
  }

  // Parties
  getParties(filters = {}) {
    let query = 'SELECT * FROM parties WHERE is_active = 1';
    const params = [];
    
    if (filters.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }
    if (filters.search) {
      query += ' AND (name LIKE ? OR gstin LIKE ? OR phone LIKE ?)';
      const search = `%${filters.search}%`;
      params.push(search, search, search);
    }
    
    query += ' ORDER BY name';
    return this.db.prepare(query).all(...params);
  }

  addParty(party) {
    return this.insert('parties', party);
  }

  updateParty(id, party) {
    return this.update('parties', party, 'id = ?', [id]);
  }

  deleteParty(id) {
    return this.update('parties', { is_active: 0 }, 'id = ?', [id]);
  }

  // Products
  getProducts(filters = {}) {
    let query = 'SELECT * FROM products WHERE is_active = 1';
    const params = [];
    
    if (filters.search) {
      query += ' AND (name LIKE ? OR sku LIKE ? OR hsn_code LIKE ?)';
      const search = `%${filters.search}%`;
      params.push(search, search, search);
    }
    
    query += ' ORDER BY name';
    return this.db.prepare(query).all(...params);
  }

  addProduct(product) {
    return this.insert('products', product);
  }

  updateProduct(id, product) {
    return this.update('products', product, 'id = ?', [id]);
  }

  deleteProduct(id) {
    return this.update('products', { is_active: 0 }, 'id = ?', [id]);
  }

  // Transactions
  getTransactions(filters = {}) {
    let query = `
      SELECT t.*, p.name as party_name, p.gstin as party_gstin, pr.name as product_name 
      FROM transactions t
      LEFT JOIN parties p ON t.party_id = p.id
      LEFT JOIN products pr ON t.product_id = pr.id
      WHERE t.is_cancelled = 0
    `;
    const params = [];
    
    if (filters.type) {
      query += ' AND t.voucher_type = ?';
      params.push(filters.type);
    }
    if (filters.startDate) {
      query += ' AND t.date >= ?';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND t.date <= ?';
      params.push(filters.endDate);
    }
    if (filters.partyId) {
      query += ' AND t.party_id = ?';
      params.push(filters.partyId);
    }
    
    query += ' ORDER BY t.date DESC, t.created_at DESC LIMIT ?';
    params.push(filters.limit || 500);
    
    return this.db.prepare(query).all(...params);
  }

  addTransaction(transaction) {
    return this.insert('transactions', transaction);
  }

  updateTransaction(id, transaction) {
    return this.update('transactions', transaction, 'id = ?', [id]);
  }

  cancelTransaction(id, reason) {
    return this.update('transactions', { 
      is_cancelled: 1, 
      narration: `Cancelled: ${reason}` 
    }, 'id = ?', [id]);
  }

  // Payments
  getPayments(filters = {}) {
    let query = 'SELECT * FROM payments WHERE 1=1';
    const params = [];
    
    if (filters.transactionId) {
      query += ' AND transaction_id = ?';
      params.push(filters.transactionId);
    }
    if (filters.partyId) {
      query += ' AND party_id = ?';
      params.push(filters.partyId);
    }
    
    query += ' ORDER BY created_at DESC';
    return this.db.prepare(query).all(...params);
  }

  addPayment(payment) {
    return this.insert('payments', payment);
  }

  // Expenses
  getExpenses(filters = {}) {
    let query = 'SELECT * FROM expenses WHERE 1=1';
    const params = [];
    
    if (filters.startDate) {
      query += ' AND date >= ?';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND date <= ?';
      params.push(filters.endDate);
    }
    if (filters.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }
    
    query += ' ORDER BY date DESC';
    return this.db.prepare(query).all(...params);
  }

  addExpense(expense) {
    return this.insert('expenses', expense);
  }

  // Reports - Dashboard Summary
  getDashboardSummary(startDate) {
    const sales = this.db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count
      FROM transactions WHERE voucher_type = 'sale' AND is_cancelled = 0 AND date >= ?
    `).get(startDate);
    
    const purchases = this.db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count
      FROM transactions WHERE voucher_type = 'purchase' AND is_cancelled = 0 AND date >= ?
    `).get(startDate);
    
    const expenses = this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ?
    `).get(startDate);
    
    const receipts = this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE created_at >= ?
    `).get(`${startDate}%`);
    
    const pendingReceivables = this.db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN payment_status != 'paid' THEN total_amount ELSE 0 END), 0) as total
      FROM transactions WHERE voucher_type = 'sale' AND is_cancelled = 0
    `).get();
    
    const pendingPayables = this.db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN payment_status != 'paid' THEN total_amount ELSE 0 END), 0) as total
      FROM transactions WHERE voucher_type = 'purchase' AND is_cancelled = 0
    `).get();
    
    return {
      sales: { total: sales.total, count: sales.count },
      purchases: { total: purchases.total, count: purchases.count },
      expenses: { total: expenses.total },
      netProfit: sales.total - purchases.total - expenses.total,
      receipts: { total: receipts.total },
      pendingReceivables: pendingReceivables.total,
      pendingPayables: pendingPayables.total
    };
  }

  // Sales Report
  getSalesReport(startDate, endDate) {
    const transactions = this.db.prepare(`
      SELECT t.*, p.name as party_name, p.gstin as party_gstin, pr.name as product_name 
      FROM transactions t
      LEFT JOIN parties p ON t.party_id = p.id
      LEFT JOIN products pr ON t.product_id = pr.id
      WHERE t.voucher_type = 'sale' AND t.is_cancelled = 0
      ${startDate ? "AND t.date >= '" + startDate + "'" : ''}
      ${endDate ? "AND t.date <= '" + endDate + "'" : ''}
      ORDER BY t.date DESC
    `).all();
    
    const summary = this.db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total_sales,
             COUNT(*) as transaction_count,
             COALESCE(SUM(quantity), 0) as total_items,
             COALESCE(SUM(total_gst), 0) as total_gst,
             COALESCE(SUM(taxable_amount), 0) as total_taxable
      FROM transactions 
      WHERE voucher_type = 'sale' AND is_cancelled = 0
      ${startDate ? "AND date >= '" + startDate + "'" : ''}
    `).get();
    
    return { transactions, summary };
  }

  // GST Report
  getGSTReport(period) {
    const periodPattern = period + '%';
    
    const salesByGST = this.db.prepare(`
      SELECT gst_rate, 
             SUM(taxable_amount) as taxable_amount,
             SUM(cgst_amount) as cgst_amount,
             SUM(sgst_amount) as sgst_amount,
             SUM(igst_amount) as igst_amount,
             SUM(total_gst) as total_gst,
             COUNT(*) as count
      FROM transactions 
      WHERE voucher_type = 'sale' AND is_cancelled = 0 AND date LIKE ?
      GROUP BY gst_rate
      ORDER BY gst_rate
    `).all(periodPattern);
    
    const purchasesByGST = this.db.prepare(`
      SELECT gst_rate,
             SUM(taxable_amount) as taxable_amount,
             SUM(cgst_amount) as cgst_amount,
             SUM(sgst_amount) as sgst_amount,
             SUM(igst_amount) as igst_amount,
             SUM(total_gst) as total_gst,
             COUNT(*) as count
      FROM transactions 
      WHERE voucher_type = 'purchase' AND is_cancelled = 0 AND date LIKE ?
      GROUP BY gst_rate
      ORDER BY gst_rate
    `).all(periodPattern);
    
    const summary = this.db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN voucher_type = 'sale' THEN taxable_amount ELSE 0 END), 0) as sales_taxable,
        COALESCE(SUM(CASE WHEN voucher_type = 'purchase' THEN taxable_amount ELSE 0 END), 0) as purchases_taxable,
        COALESCE(SUM(CASE WHEN voucher_type = 'sale' THEN total_gst ELSE 0 END), 0) as gst_collected,
        COALESCE(SUM(CASE WHEN voucher_type = 'purchase' THEN total_gst ELSE 0 END), 0) as gst_paid,
        COALESCE(SUM(CASE WHEN voucher_type = 'sale' THEN igst_amount ELSE 0 END), 0) as igst_collected,
        COALESCE(SUM(CASE WHEN voucher_type = 'purchase' THEN igst_amount ELSE 0 END), 0) as igst_paid
      FROM transactions 
      WHERE is_cancelled = 0 AND date LIKE ?
    `).get(periodPattern);
    
    const netLiability = summary.gst_collected - summary.gst_paid;
    
    return { salesByGST, purchasesByGST, summary: { ...summary, net_liability: netLiability } };
  }

  // Profit & Loss
  getProfitLoss(startDate, endDate) {
    const sales = this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_sales, COALESCE(SUM(total_gst), 0) as total_gst
      FROM transactions WHERE voucher_type = 'sale' AND is_cancelled = 0
      ${startDate ? "AND date >= '" + startDate + "'" : ''}
    `).get();
    
    const purchases = this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_purchases, COALESCE(SUM(total_gst), 0) as total_gst
      FROM transactions WHERE voucher_type = 'purchase' AND is_cancelled = 0
      ${startDate ? "AND date >= '" + startDate + "'" : ''}
    `).get();
    
    const directExpenses = this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses
      ${startDate ? "WHERE date >= '" + startDate + "'" : ''}
    `).get();
    
    const grossProfit = sales.total_sales - purchases.total_purchases;
    const totalExpenses = directExpenses.total;
    const netProfit = grossProfit - totalExpenses;
    
    return {
      sales,
      purchases,
      gross_profit: grossProfit,
      direct_expenses: directExpenses.total,
      total_expenses: totalExpenses,
      net_profit: netProfit,
      profit_margin: sales.total_sales > 0 ? (netProfit / sales.total_sales * 100) : 0
    };
  }

  // Outstanding Aging
  getOutstandingAging() {
    const aging = this.db.prepare(`
      SELECT p.name as party_name, p.id as party_id, p.gstin as party_gstin, p.credit_days,
             SUM(CASE WHEN t.payment_status != 'paid' THEN t.total_amount ELSE 0 END) as outstanding,
             MAX(t.date) as last_transaction,
             MIN(CASE WHEN t.payment_status != 'paid' THEN t.date END) as oldest_due_date
      FROM transactions t
      JOIN parties p ON t.party_id = p.id
      WHERE t.voucher_type = 'sale' AND t.is_cancelled = 0
      GROUP BY p.id
      HAVING outstanding > 0
      ORDER BY oldest_due_date ASC
    `).all();
    
    return aging;
  }

  // Expense Summary
  getExpenseSummary(startDate, endDate) {
    const byCategory = this.db.prepare(`
      SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM expenses
      ${startDate ? "WHERE date >= '" + startDate + "'" : ''}
      GROUP BY category
      ORDER BY total DESC
    `).all();
    
    const total = byCategory.reduce((sum, c) => sum + c.total, 0);
    
    return { byCategory, total };
  }

  // Alerts
  getAlerts(filters = {}) {
    let query = 'SELECT * FROM alerts WHERE is_dismissed = 0';
    const params = [];
    
    if (filters.unreadOnly) {
      query += ' AND is_read = 0';
    }
    if (filters.severity) {
      query += ' AND severity = ?';
      params.push(filters.severity);
    }
    if (filters.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(filters.limit || 50);
    
    return this.db.prepare(query).all(...params);
  }

  getAlertCount() {
    const unread = this.db.prepare('SELECT COUNT(*) as count FROM alerts WHERE is_read = 0 AND is_dismissed = 0').get();
    const bySeverity = this.db.prepare('SELECT severity, COUNT(*) as count FROM alerts WHERE is_dismissed = 0 GROUP BY severity').all();
    return { unread: unread.count, bySeverity };
  }

  addAlert(alert) {
    return this.insert('alerts', alert);
  }

  markAlertRead(id) {
    return this.update('alerts', { is_read: 1 }, 'id = ?', [id]);
  }

  dismissAlert(id) {
    return this.update('alerts', { is_dismissed: 1 }, 'id = ?', [id]);
  }

  // Audit Logs
  addAuditLog(log) {
    return this.insert('audit_logs', log);
  }

  getAuditLogs(filters = {}) {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    
    if (filters.entityType) {
      query += ' AND entity_type = ?';
      params.push(filters.entityType);
    }
    if (filters.startDate) {
      query += ' AND created_at >= ?';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND created_at <= ?';
      params.push(filters.endDate);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(filters.limit || 100);
    
    return this.db.prepare(query).all(...params);
  }

  // Health Metrics
  calculateHealthScore(period) {
    const cashFlow = this.db.prepare(`
      SELECT COALESCE(SUM(credit), 0) as inflows, COALESCE(SUM(debit), 0) as outflows
      FROM cash_book WHERE date >= ?
    `).get(period);
    
    const cashFlowRatio = cashFlow.inflows > 0 ? cashFlow.inflows / (cashFlow.outflows || 1) : 0;
    const cashFlowScore = Math.min(100, Math.round(cashFlowRatio * 50));
    
    // Save health metrics
    this.db.prepare(`
      INSERT INTO health_metrics (period, cash_flow_score, overall_score, analysis, recommendations)
      VALUES (?, ?, ?, ?, ?)
    `).run(period, cashFlowScore, cashFlowScore, JSON.stringify({ cashFlow: cashFlowScore }), JSON.stringify(['Review cash flow regularly']));
    
    return {
      scores: { cash_flow: cashFlowScore, overall: cashFlowScore },
      status: cashFlowScore >= 80 ? 'healthy' : cashFlowScore >= 60 ? 'moderate' : 'critical'
    };
  }

  // Backup and Restore
  backup(backupPath) {
    const fs = require('fs');
    fs.copyFileSync(this.dbPath, backupPath);
    return { success: true, path: backupPath };
  }

  restore(backupPath) {
    const fs = require('fs');
    fs.copyFileSync(backupPath, this.dbPath);
    return { success: true };
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // Helper for encryption (placeholder - implement proper encryption)
  createCryptoCipher(key) {
    return {
      encrypt: (buffer) => buffer,
      decrypt: (buffer) => buffer
    };
  }

  // ==================== NOTIFICATIONS ====================
  getNotifications(filters = {}) {
    let query = 'SELECT * FROM notifications WHERE is_dismissed = 0';
    const params = [];

    if (filters.unreadOnly) {
      query += ' AND is_read = 0';
    }
    if (filters.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }
    if (filters.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }
    if (filters.severity) {
      query += ' AND severity = ?';
      params.push(filters.severity);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(filters.limit || 50);

    return this.db.prepare(query).all(...params);
  }

  getNotificationCount() {
    const unread = this.db.prepare('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0 AND is_dismissed = 0').get();
    const byCategory = this.db.prepare('SELECT category, COUNT(*) as count FROM notifications WHERE is_dismissed = 0 GROUP BY category').all();
    const bySeverity = this.db.prepare('SELECT severity, COUNT(*) as count FROM notifications WHERE is_dismissed = 0 GROUP BY severity').all();
    return { unread: unread.count, byCategory, bySeverity };
  }

  addNotification(notification) {
    return this.insert('notifications', notification);
  }

  markNotificationRead(id) {
    return this.update('notifications', { is_read: 1, read_at: new Date().toISOString() }, 'id = ?', [id]);
  }

  markAllNotificationsRead() {
    this.db.prepare('UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP WHERE is_read = 0').run();
    return true;
  }

  dismissNotification(id) {
    return this.update('notifications', { is_dismissed: 1 }, 'id = ?', [id]);
  }

  // ==================== BANK STATEMENTS ====================
  getBankStatements(filters = {}) {
    let query = 'SELECT * FROM bank_statements';
    const params = [];

    if (filters.matchStatus) {
      query += ' WHERE match_status = ?';
      params.push(filters.matchStatus);
    }
    if (filters.startDate) {
      query += params.length > 0 ? ' AND' : ' WHERE';
      query += ' date >= ?';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND date <= ?';
      params.push(filters.endDate);
    }

    query += ' ORDER BY date DESC';
    return this.db.prepare(query).all(...params);
  }

  addBankStatement(statement) {
    return this.insert('bank_statements', statement);
  }

  bulkAddBankStatements(statements) {
    const stmt = this.db.prepare(`
      INSERT INTO bank_statements (source_file, date, description, amount, type, reference_no)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const results = [];
    for (const statement of statements) {
      try {
        const result = stmt.run(
          statement.source_file,
          statement.date,
          statement.description,
          statement.amount,
          statement.type,
          statement.reference_no
        );
        results.push({ success: true, id: result.lastInsertRowid });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
    return results;
  }

  updateBankStatementMatch(id, transactionId, confidence = 100) {
    return this.update('bank_statements', {
      transaction_id: transactionId,
      match_status: 'matched',
      match_confidence: confidence,
      matched_at: new Date().toISOString()
    }, 'id = ?', [id]);
  }

  markBankStatementIgnored(id) {
    return this.update('bank_statements', { match_status: 'ignored' }, 'id = ?', [id]);
  }

  getUnmatchedBankStatements() {
    return this.db.prepare('SELECT * FROM bank_statements WHERE match_status = ? ORDER BY date DESC').all('pending');
  }

  // ==================== RECOMMENDATIONS ====================
  getRecommendations(filters = {}) {
    let query = 'SELECT * FROM recommendations';
    const params = [];

    if (filters.status) {
      query += ' WHERE status = ?';
      params.push(filters.status);
    }
    if (filters.category) {
      query += params.length > 0 ? ' AND' : ' WHERE';
      query += ' category = ?';
      params.push(filters.category);
    }
    if (filters.priority) {
      query += ' AND priority = ?';
      params.push(filters.priority);
    }

    query += ' ORDER BY created_at DESC';
    return this.db.prepare(query).all(...params);
  }

  addRecommendation(recommendation) {
    return this.insert('recommendations', recommendation);
  }

  updateRecommendationStatus(id, status) {
    const updates = { status, updated_at: new Date().toISOString() };
    if (status === 'dismissed') {
      updates.dismissed_at = new Date().toISOString();
    } else if (status === 'implemented') {
      updates.implemented_at = new Date().toISOString();
    }
    return this.update('recommendations', updates, 'id = ?', [id]);
  }

  dismissRecommendation(id) {
    return this.updateRecommendationStatus(id, 'dismissed');
  }

  implementRecommendation(id) {
    return this.updateRecommendationStatus(id, 'implemented');
  }

  getActiveRecommendations() {
    return this.db.prepare('SELECT * FROM recommendations WHERE status = ? ORDER BY priority DESC, impact_score DESC').all('active');
  }

  // ==================== ERROR LOGS ====================
  getErrorLogs(filters = {}) {
    let query = 'SELECT * FROM error_logs';
    const params = [];

    if (filters.resolved !== undefined) {
      query += ' WHERE is_resolved = ?';
      params.push(filters.resolved ? 1 : 0);
    }
    if (filters.errorType) {
      query += params.length > 0 ? ' AND' : ' WHERE';
      query += ' error_type = ?';
      params.push(filters.errorType);
    }
    if (filters.severity) {
      query += ' AND severity = ?';
      params.push(filters.severity);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(filters.limit || 100);

    return this.db.prepare(query).all(...params);
  }

  addErrorLog(error) {
    return this.insert('error_logs', error);
  }

  resolveErrorLog(id, resolution, resolvedBy) {
    return this.update('error_logs', {
      is_resolved: 1,
      resolution,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString()
    }, 'id = ?', [id]);
  }

  getUnresolvedErrors() {
    return this.db.prepare('SELECT * FROM error_logs WHERE is_resolved = 0 ORDER BY severity DESC, created_at DESC').all();
  }

  // ==================== VOICE COMMANDS ====================
  logVoiceCommand(command) {
    return this.insert('voice_commands', command);
  }

  getVoiceCommands(filters = {}) {
    let query = 'SELECT * FROM voice_commands';
    const params = [];

    if (filters.success !== undefined) {
      query += ' WHERE success = ?';
      params.push(filters.success ? 1 : 0);
    }
    if (filters.language) {
      query += params.length > 0 ? ' AND' : ' WHERE';
      query += ' language = ?';
      params.push(filters.language);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(filters.limit || 50);

    return this.db.prepare(query).all(...params);
  }

  getVoiceCommandStats() {
    const total = this.db.prepare('SELECT COUNT(*) as count FROM voice_commands').get();
    const successful = this.db.prepare('SELECT COUNT(*) as count FROM voice_commands WHERE success = 1').get();
    const byLanguage = this.db.prepare('SELECT language, COUNT(*) as count, SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful FROM voice_commands GROUP BY language').all();
    return { total: total.count, successful: successful.count, byLanguage };
  }

  // ==================== LANGUAGE SETTINGS ====================
  getLanguageSettings() {
    return this.db.prepare('SELECT * FROM language_settings WHERE is_active = 1 ORDER BY display_name').all();
  }

  addLanguageSetting(language) {
    try {
      return this.insert('language_settings', language);
    } catch (error) {
      // Language might already exist
      return null;
    }
  }

  updateLanguageSetting(id, updates) {
    return this.update('language_settings', updates, 'id = ?', [id]);
  }

  initializeDefaultLanguages() {
    const defaultLanguages = [
      { locale: 'en', display_name: 'English', is_default: 1 },
      { locale: 'hi', display_name: 'हिंदी (Hindi)', is_default: 0 },
      { locale: 'hi-en', display_name: 'Hinglish (Hindi-English)', is_default: 0 }
    ];

    const stmt = this.db.prepare('INSERT OR IGNORE INTO language_settings (locale, display_name, is_default) VALUES (?, ?, ?)');
    for (const lang of defaultLanguages) {
      stmt.run(lang.locale, lang.display_name, lang.is_default);
    }
  }

  // ==================== PRINTED DOCUMENTS ====================
  logPrintedDocument(document) {
    return this.insert('printed_documents', document);
  }

  getPrintedDocuments(filters = {}) {
    let query = 'SELECT * FROM printed_documents';
    const params = [];

    if (filters.documentType) {
      query += ' WHERE document_type = ?';
      params.push(filters.documentType);
    }
    if (filters.startDate) {
      query += params.length > 0 ? ' AND' : ' WHERE';
      query += ' printed_at >= ?';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND printed_at <= ?';
      params.push(filters.endDate);
    }

    query += ' ORDER BY printed_at DESC LIMIT ?';
    params.push(filters.limit || 50);

    return this.db.prepare(query).all(...params);
  }

  // ==================== ERROR DETECTION ENGINE ====================
  runErrorDetection() {
    const errors = [];

    // Check for duplicate transactions (same amount, date, party within tolerance)
    const duplicates = this.db.prepare(`
      SELECT t1.id, t1.voucher_no, t1.date, t1.total_amount, t1.party_id, p.name as party_name
      FROM transactions t1
      JOIN parties p ON t1.party_id = p.id
      WHERE t1.is_cancelled = 0 AND EXISTS (
        SELECT 1 FROM transactions t2
        WHERE t2.id != t1.id
        AND t2.date BETWEEN t1.date AND date(t1.date, '+3 days')
        AND t2.total_amount = t1.total_amount
        AND (t2.party_id = t1.party_id OR (t1.party_id IS NULL AND t2.party_id IS NULL))
      )
    `).all();

    for (const dup of duplicates) {
      const existingError = errors.find(e => 
        e.entity_type === 'transactions' && 
        e.entity_id === dup.id &&
        e.error_type === 'duplicate_transaction'
      );
      
      if (!existingError) {
        errors.push({
          error_type: 'duplicate_transaction',
          severity: 'medium',
          title: 'Possible Duplicate Transaction',
          description: `Transaction ${dup.voucher_no} for ₹${dup.total_amount} on ${dup.date} with ${dup.party_name} may be a duplicate`,
          entity_type: 'transactions',
          entity_id: dup.id,
          detected_value: JSON.stringify(dup)
        });
      }
    }

    // Check for negative balances in parties
    const parties = this.db.prepare('SELECT * FROM parties WHERE is_active = 1').all();
    for (const party of parties) {
      const sales = this.db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total FROM transactions 
        WHERE party_id = ? AND voucher_type = 'sale' AND is_cancelled = 0
      `).get(party.id);

      const payments = this.db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM payments 
        WHERE party_id IN (SELECT id FROM transactions WHERE party_id = ? AND voucher_type = 'sale')
      `).get(party.id);

      const openingBalance = party.opening_balance * (party.balance_type === 'receivable' ? 1 : -1);
      const currentBalance = openingBalance + sales.total - payments.total;

      if (currentBalance < -1000) {
        errors.push({
          error_type: 'negative_balance',
          severity: 'high',
          title: 'Large Negative Balance',
          description: `${party.name} has a negative balance of ₹${Math.abs(currentBalance).toLocaleString()}`,
          entity_type: 'parties',
          entity_id: party.id,
          detected_value: currentBalance.toString(),
          expected_value: '>= -1000'
        });
      }
    }

    // Check for missing GSTIN on B2B transactions
    const b2bTransactions = this.db.prepare(`
      SELECT t.id, t.voucher_no, t.date, t.total_amount, p.name as party_name
      FROM transactions t
      JOIN parties p ON t.party_id = p.id
      WHERE t.gst_rate > 0 AND t.total_amount >= 50000 AND (p.gstin IS NULL OR p.gstin = '')
      AND t.is_cancelled = 0
    `).all();

    for (const txn of b2bTransactions) {
      errors.push({
        error_type: 'missing_gstin',
        severity: 'high',
        title: 'Missing GSTIN for B2B Transaction',
        description: `Transaction ${txn.voucher_no} for ₹${txn.total_amount.toLocaleString()} with ${txn.party_name} requires GSTIN`,
        entity_type: 'transactions',
        entity_id: txn.id,
        detected_value: txn.party_name
      });
    }

    // Check for cash transactions above ₹10,000
    const cashTransactions = this.db.prepare(`
      SELECT id, voucher_no, date, total_amount, payment_method
      FROM transactions
      WHERE payment_method = 'cash' AND total_amount > 10000 AND is_cancelled = 0
      AND created_at >= date('now', '-30 days')
    `).all();

    for (const txn of cashTransactions) {
      errors.push({
        error_type: 'large_cash_transaction',
        severity: 'medium',
        title: 'Large Cash Transaction',
        description: `Cash transaction of ₹${txn.total_amount.toLocaleString()} on ${txn.date} (${txn.voucher_no})`,
        entity_type: 'transactions',
        entity_id: txn.id,
        detected_value: txn.total_amount.toString()
      });
    }

    // Save errors to database
    for (const error of errors) {
      this.addErrorLog(error);
    }

    return errors;
  }

  // ==================== RECOMMENDATION ENGINE ====================
  generateRecommendations() {
    const recommendations = [];

    // Cash flow recommendation
    const cashBook = this.db.prepare(`
      SELECT * FROM cash_book ORDER BY date DESC LIMIT 30
    `).all();

    if (cashBook.length > 0) {
      const recentInflows = cashBook.filter(c => c.credit > 0).reduce((sum, c) => sum + c.credit, 0);
      const recentOutflows = cashBook.filter(c => c.debit > 0).reduce((sum, c) => sum + c.debit, 0);

      if (recentOutflows > recentInflows * 1.2) {
        recommendations.push({
          category: 'cash_flow',
          title: 'High Outflow Alert',
          description: 'Your expenses have been 20% higher than income in the recent period. Consider reviewing non-essential expenses.',
          impact_score: 75,
          priority: 'high',
          actionable_steps: JSON.stringify([
            'Review all expense categories',
            'Identify non-essential recurring expenses',
            'Consider negotiating with vendors for better rates',
            'Explore income generation opportunities'
          ])
        });
      }

      if (recentInflows > recentOutflows * 2) {
        recommendations.push({
          category: 'cash_flow',
          title: 'Surplus Cash Available',
          description: 'You have excess cash that could be invested for better returns.',
          impact_score: 60,
          priority: 'medium',
          actionable_steps: JSON.stringify([
            'Consider fixed deposits for short-term surplus',
            'Review investment options with your CA',
            'Keep 3-6 months expenses as emergency fund'
          ])
        });
      }
    }

    // GST compliance recommendation
    const today = new Date();
    const gstDueDate = new Date(today.getFullYear(), today.getMonth(), 20);

    if (today > gstDueDate) {
      const pendingGST = this.db.prepare(`
        SELECT COALESCE(SUM(total_gst), 0) as total FROM transactions 
        WHERE voucher_type = 'sale' AND is_cancelled = 0 AND date LIKE ?
      `).get(`${today.toISOString().slice(0, 7)}%`);

      if (pendingGST.total > 0) {
        recommendations.push({
          category: 'compliance',
          title: 'GST Filing Due',
          description: `GST liability of ₹${pendingGST.total.toLocaleString()} for ${today.toLocaleString('en-US', { month: 'long' })} needs to be filed soon.`,
          impact_score: 90,
          priority: 'high',
          actionable_steps: JSON.stringify([
            'Collect all input tax credit documents',
            'Reconcile output tax liability',
            'File GSTR-1 and GSTR-3B before month end',
            'Consult your CA if needed'
          ])
        });
      }
    }

    // Receivables recommendation
    const overdueReceivables = this.db.prepare(`
      SELECT p.name as party_name, p.id as party_id, SUM(t.total_amount) as outstanding
      FROM transactions t
      JOIN parties p ON t.party_id = p.id
      WHERE t.voucher_type = 'sale' AND t.is_cancelled = 0 AND t.payment_status != 'paid'
      AND t.due_date < ?
      GROUP BY p.id
      ORDER BY outstanding DESC
    `).all(today.toISOString().split('T')[0]);

    if (overdueReceivables.length > 0) {
      const totalOverdue = overdueReceivables.reduce((sum, r) => sum + r.outstanding, 0);
      recommendations.push({
        category: 'receivables',
        title: 'Overdue Payments',
        description: `₹${totalOverdue.toLocaleString()} is overdue from ${overdueReceivables.length} parties. Active follow-up recommended.`,
        impact_score: 80,
        priority: 'high',
        actionable_steps: JSON.stringify([
          'Send payment reminders to overdue parties',
          'Review credit terms for consistently late payers',
          'Consider advance payments for future transactions',
          'Escalate to phone calls for large overdue amounts'
        ]),
        related_entity_type: 'parties',
        related_entity_id: overdueReceivables[0]?.party_id
      });
    }

    // Inventory recommendation
    const lowStockProducts = this.db.prepare(`
      SELECT name, current_stock, min_stock, rate FROM products
      WHERE is_active = 1 AND current_stock <= min_stock
    `).all();

    if (lowStockProducts.length > 0) {
      recommendations.push({
        category: 'inventory',
        title: 'Low Stock Alert',
        description: `${lowStockProducts.length} products are running low on stock. Reorder soon to avoid stockouts.`,
        impact_score: 65,
        priority: 'medium',
        actionable_steps: JSON.stringify([
          'Review reorder levels for low stock items',
          'Contact suppliers for lead times',
          'Place orders before stock runs out',
          'Consider seasonal demand variations'
        ])
      });
    }

    // Save recommendations to database
    for (const rec of recommendations) {
      // Check if similar recommendation exists
      const existing = this.db.prepare(`
        SELECT id FROM recommendations 
        WHERE category = ? AND status = 'active' AND title = ?
      `).get(rec.category, rec.title);

      if (!existing) {
        this.addRecommendation(rec);
      }
    }

    return recommendations;
  }

  // ==================== VOICE COMMAND PARSER ====================
  parseVoiceCommand(transcript) {
    const normalized = transcript.toLowerCase().trim();
    const patterns = [
      // Expense patterns
      { 
        regex: /(?:spent|paid|expense|dish kharcha|kharcha)[\s\S]*?(\d+(?:\.\d{1,2})?)[\s\S]*?(on|for|for\s+(?:the\s+)?)(.+)/i,
        type: 'expense',
        extract: (match) => ({
          amount: parseFloat(match[1]),
          category: match[3].trim(),
          description: match[3].trim()
        })
      },
      // Sale patterns
      {
        regex: /(?:sold|sale|bikri)[\s\S]*?(\d+(?:\.\d{1,2})?)[\s\S]*?(to|for|for\s+(?:the\s+)?)(.+)/i,
        type: 'sale',
        extract: (match) => ({
          amount: parseFloat(match[1]),
          party: match[3].trim()
        })
      },
      // Query patterns
      {
        regex: /(?:what is|show me|batana|kya hai)[\s\S]*?(sale|sales|bikri)/i,
        type: 'query_sales'
      },
      {
        regex: /(?:what is|show me|batana|kya hai)[\s\S]*?(expense|kharcha|kharchi)/i,
        type: 'query_expenses'
      },
      {
        regex: /(?:what is|show me|batana|kya hai)[\s\S]*?(profit|laabh)/i,
        type: 'query_profit'
      },
      {
        regex: /(?:business health|vyavsaak sehat|company status)/i,
        type: 'query_health'
      }
    ];

    for (const pattern of patterns) {
      const match = normalized.match(pattern.regex);
      if (match) {
        if (pattern.extract) {
          const data = pattern.extract(match);
          return { type: pattern.type, ...data };
        }
        return { type: pattern.type };
      }
    }

    return { type: 'unknown', transcript };
  }

  // ==================== RECONCILIATION ENGINE ====================
  autoReconcile() {
    const unmatchedStatements = this.getUnmatchedBankStatements();
    const transactions = this.db.prepare(`
      SELECT t.*, p.name as party_name 
      FROM transactions t
      LEFT JOIN parties p ON t.party_id = p.id
      WHERE t.is_cancelled = 0 AND t.payment_status != 'paid'
      ORDER BY t.date DESC
    `).all();

    const matches = [];

    for (const statement of unmatchedStatements) {
      // Try to find matching transaction
      // Match criteria: amount within 1% tolerance, date within 7 days
      const amountTolerance = Math.abs(statement.amount) * 0.01;
      const dateFrom = new Date(statement.date);
      dateFrom.setDate(dateFrom.getDate() - 7);
      const dateTo = new Date(statement.date);
      dateTo.setDate(dateTo.getDate() + 7);

      const matchingTxns = transactions.filter(txn => {
        const txnDate = new Date(txn.date);
        const amountDiff = Math.abs(txn.total_amount - statement.amount);
        
        return amountDiff <= amountTolerance &&
               txnDate >= dateFrom &&
               txnDate <= dateTo &&
               (!txn.party_id || 
                statement.description.toLowerCase().includes(txn.party_name?.toLowerCase() || '') ||
                txn.party_name?.toLowerCase().includes(statement.description.toLowerCase().substring(0, 10)));
      });

      if (matchingTxns.length > 0) {
        // Get best match (closest amount)
        const bestMatch = matchingTxns.reduce((best, txn) => {
          const currentDiff = Math.abs(txn.total_amount - statement.amount);
          const bestDiff = best ? Math.abs(best.total_amount - statement.amount) : Infinity;
          return currentDiff < bestDiff ? txn : best;
        }, null);

        const confidence = 100 - (Math.abs(bestMatch.total_amount - statement.amount) / statement.amount * 100);

        matches.push({
          statement,
          transaction: bestMatch,
          confidence,
          suggested: true
        });
      }
    }

    return matches;
  }
}

// Export singleton instance
const dbManager = new DatabaseManager();

export default dbManager;
