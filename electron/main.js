const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

let mainWindow;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#f8fafc',
    titleBarStyle: 'hiddenInset',
    show: false
  });

  mainWindow.loadURL('http://localhost:5173');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function initializeDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'talk-to-accounts.db');
  db = new Database(dbPath);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS business_info (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS parties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      contact TEXT,
      email TEXT,
      address TEXT,
      gstin TEXT,
      opening_balance REAL DEFAULT 0,
      balance_type TEXT DEFAULT 'receivable',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT,
      hsn_code TEXT,
      unit TEXT DEFAULT 'pcs',
      rate REAL NOT NULL,
      gst_rate REAL DEFAULT 0,
      opening_stock INTEGER DEFAULT 0,
      stock_value REAL DEFAULT 0,
      min_stock INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      party_id INTEGER,
      product_id INTEGER,
      quantity INTEGER NOT NULL,
      rate REAL NOT NULL,
      amount REAL NOT NULL,
      gst_rate REAL DEFAULT 0,
      gst_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      description TEXT,
      payment_status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (party_id) REFERENCES parties(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER,
      party_id INTEGER,
      amount REAL NOT NULL,
      method TEXT DEFAULT 'cash',
      reference TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id),
      FOREIGN KEY (party_id) REFERENCES parties(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      date TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      details TEXT,
      user TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fraud_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      severity TEXT DEFAULT 'medium',
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      transaction_id INTEGER,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS mistake_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern TEXT NOT NULL,
      correction TEXT NOT NULL,
      frequency INTEGER DEFAULT 0,
      confidence REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reconciliation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_name TEXT NOT NULL,
      statement_file TEXT,
      opening_balance REAL NOT NULL,
      closing_balance REAL NOT NULL,
      matched_count INTEGER DEFAULT 0,
      unmatched_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS reconciliation_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reconciliation_id INTEGER,
      bank_date TEXT,
      bank_description TEXT,
      bank_amount REAL,
      ledger_date TEXT,
      ledger_description TEXT,
      ledger_amount REAL,
      status TEXT DEFAULT 'unmatched',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reconciliation_id) REFERENCES reconciliation(id)
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(created_at);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_transactions_party ON transactions(party_id);
  `);

  console.log('Database initialized at:', dbPath);
}

// Business Info
ipcMain.handle('get-business-info', () => {
  const stmt = db.prepare('SELECT * FROM business_info');
  const results = stmt.all();
  return results.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
});

ipcMain.handle('set-business-info', (event, data) => {
  const stmt = db.prepare('INSERT OR REPLACE INTO business_info (key, value) VALUES (?, ?)');
  const insert = db.prepare('INSERT INTO business_info (key, value) VALUES (?, ?)');
  const update = db.prepare('UPDATE business_info SET value = ? WHERE key = ?');
  
  for (const [key, value] of Object.entries(data)) {
    const existing = db.prepare('SELECT * FROM business_info WHERE key = ?').get(key);
    if (existing) {
      db.prepare('UPDATE business_info SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?').run(value, key);
    } else {
      insert.run(key, value);
    }
  }
  logAudit('UPDATE', 'Updated business info');
  return true;
});

// Parties
ipcMain.handle('get-parties', () => {
  return db.prepare('SELECT * FROM parties ORDER BY name').all();
});

ipcMain.handle('add-party', (event, party) => {
  const stmt = db.prepare(`
    INSERT INTO parties (name, type, contact, email, address, gstin, opening_balance, balance_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    party.name, party.type, party.contact, party.email, 
    party.address, party.gstin, party.opening_balance || 0, 
    party.balance_type || 'receivable'
  );
  logAudit('CREATE', `Added party: ${party.name}`);
  return result.lastInsertRowid;
});

ipcMain.handle('update-party', (event, id, party) => {
  const stmt = db.prepare(`
    UPDATE parties SET name=?, type=?, contact=?, email=?, address=?, 
    gstin=?, opening_balance=?, balance_type=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
  `);
  stmt.run(party.name, party.type, party.contact, party.email, 
    party.address, party.gstin, party.opening_balance, party.balance_type, id);
  logAudit('UPDATE', `Updated party: ${party.name}`);
  return true;
});

ipcMain.handle('delete-party', (event, id) => {
  db.prepare('DELETE FROM parties WHERE id = ?').run(id);
  logAudit('DELETE', `Deleted party ID: ${id}`);
  return true;
});

// Products
ipcMain.handle('get-products', () => {
  return db.prepare('SELECT * FROM products ORDER BY name').all();
});

ipcMain.handle('add-product', (event, product) => {
  const stmt = db.prepare(`
    INSERT INTO products (name, sku, hsn_code, unit, rate, gst_rate, opening_stock, min_stock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    product.name, product.sku, product.hsn_code, product.unit,
    product.rate, product.gst_rate || 0, product.opening_stock || 0, 
    product.min_stock || 0
  );
  logAudit('CREATE', `Added product: ${product.name}`);
  return result.lastInsertRowid;
});

ipcMain.handle('update-product', (event, id, product) => {
  const stmt = db.prepare(`
    UPDATE products SET name=?, sku=?, hsn_code=?, unit=?, rate=?, 
    gst_rate=?, opening_stock=?, min_stock=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
  `);
  stmt.run(product.name, product.sku, product.hsn_code, product.unit,
    product.rate, product.gst_rate, product.opening_stock, product.min_stock, id);
  logAudit('UPDATE', `Updated product: ${product.name}`);
  return true;
});

ipcMain.handle('delete-product', (event, id) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  logAudit('DELETE', `Deleted product ID: ${id}`);
  return true;
});

// Transactions
ipcMain.handle('get-transactions', (event, filters = {}) => {
  let query = 'SELECT t.*, p.name as party_name, pr.name as product_name FROM transactions t LEFT JOIN parties p ON t.party_id = p.id LEFT JOIN products pr ON t.product_id = pr.id WHERE 1=1';
  const params = [];
  
  if (filters.type) {
    query += ' AND t.type = ?';
    params.push(filters.type);
  }
  if (filters.startDate) {
    query += ' AND t.created_at >= ?';
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    query += ' AND t.created_at <= ?';
    params.push(filters.endDate);
  }
  if (filters.partyId) {
    query += ' AND t.party_id = ?';
    params.push(filters.partyId);
  }
  
  query += ' ORDER BY t.created_at DESC LIMIT ?';
  params.push(filters.limit || 100);
  
  return db.prepare(query).all(...params);
});

ipcMain.handle('add-transaction', (event, transaction) => {
  const stmt = db.prepare(`
    INSERT INTO transactions (type, party_id, product_id, quantity, rate, amount, gst_rate, gst_amount, total_amount, description, payment_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    transaction.type, transaction.party_id, transaction.product_id,
    transaction.quantity, transaction.rate, transaction.amount,
    transaction.gst_rate || 0, transaction.gst_amount || 0,
    transaction.total_amount, transaction.description, transaction.payment_status || 'pending'
  );
  
  // Update product stock
  if (transaction.product_id && transaction.quantity) {
    const stockChange = transaction.type === 'sale' ? -transaction.quantity : transaction.quantity;
    db.prepare('UPDATE products SET opening_stock = opening_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(stockChange, transaction.product_id);
  }
  
  logAudit('CREATE', `Added ${transaction.type} transaction: ₹${transaction.total_amount}`);
  return result.lastInsertRowid;
});

// Payments
ipcMain.handle('get-payments', (event, transactionId) => {
  return db.prepare('SELECT * FROM payments WHERE transaction_id = ? ORDER BY created_at DESC').all(transactionId);
});

ipcMain.handle('add-payment', (event, payment) => {
  const stmt = db.prepare(`
    INSERT INTO payments (transaction_id, party_id, amount, method, reference)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(payment.transaction_id, payment.party_id, payment.amount, payment.method, payment.reference);
  
  // Update transaction payment status
  const totalPaid = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE transaction_id = ?')
    .get(payment.transaction_id);
  const transaction = db.prepare('SELECT total_amount FROM transactions WHERE id = ?').get(payment.transaction_id);
  
  const status = totalPaid.total >= transaction.total_amount ? 'paid' : 'partial';
  db.prepare('UPDATE transactions SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(status, payment.transaction_id);
  
  logAudit('CREATE', `Added payment: ₹${payment.amount}`);
  return result.lastInsertRowid;
});

// Expenses
ipcMain.handle('get-expenses', (event, filters = {}) => {
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
  return db.prepare(query).all(...params);
});

ipcMain.handle('add-expense', (event, expense) => {
  const stmt = db.prepare(`
    INSERT INTO expenses (category, amount, description, date)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(expense.category, expense.amount, expense.description, expense.date);
  logAudit('CREATE', `Added expense: ₹${expense.amount} (${expense.category})`);
  return result.lastInsertRowid;
});

// Reports
ipcMain.handle('get-sales-report', (event, period) => {
  const transactions = db.prepare(`
    SELECT t.*, p.name as party_name FROM transactions t
    LEFT JOIN parties p ON t.party_id = p.id
    WHERE t.type = 'sale' AND t.created_at LIKE ?
    ORDER BY t.created_at DESC
  `).all(`${period}%`);
  
  const summary = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as total_sales,
           COUNT(*) as transaction_count,
           COALESCE(SUM(quantity), 0) as total_items
    FROM transactions WHERE type = 'sale' AND created_at LIKE ?
  `).get(`${period}%`);
  
  return { transactions, summary };
});

ipcMain.handle('get-gst-report', (event, period) => {
  const sales = db.prepare(`
    SELECT gst_rate, SUM(total_amount) as taxable_amount, SUM(gst_amount) as gst_collected
    FROM transactions WHERE type = 'sale' AND created_at LIKE ?
    GROUP BY gst_rate
  `).all(`${period}%`);
  
  const purchases = db.prepare(`
    SELECT gst_rate, SUM(total_amount) as taxable_amount, SUM(gst_amount) as gst_paid
    FROM transactions WHERE type = 'purchase' AND created_at LIKE ?
    GROUP BY gst_rate
  `).all(`${period}%`);
  
  return { sales, purchases };
});

ipcMain.handle('get-profit-loss', (event, period) => {
  const sales = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_sales
    FROM transactions WHERE type = 'sale' AND created_at LIKE ?
  `).get(`${period}%`);
  
  const purchases = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_purchases
    FROM transactions WHERE type = 'purchase' AND created_at LIKE ?
  `).get(`${period}%`);
  
  const expenses = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_expenses
    FROM expenses WHERE date LIKE ?
  `).get(`${period}%`);
  
  const grossProfit = sales.total_sales - purchases.total_purchases;
  const netProfit = grossProfit - expenses.total_expenses;
  
  return {
    total_sales: sales.total_sales,
    total_purchases: purchases.total_purchases,
    total_expenses: expenses.total_expenses,
    gross_profit: grossProfit,
    net_profit: netProfit
  };
});

ipcMain.handle('get-balance-sheet', () => {
  const assets = db.prepare(`
    SELECT 'Cash in Hand' as name, COALESCE(SUM(CASE WHEN type IN ('sale', 'payment_received') THEN amount ELSE 0 END) - COALESCE(SUM(CASE WHEN type IN ('purchase', 'payment_made', 'expense') THEN amount ELSE 0 END), 0) as amount
    FROM transactions
    UNION ALL
    SELECT 'Accounts Receivable' as name, COALESCE(SUM(CASE WHEN payment_status != 'paid' THEN total_amount ELSE 0 END), 0) as amount
    FROM transactions WHERE type = 'sale'
  `).all();
  
  const liabilities = db.prepare(`
    SELECT 'Accounts Payable' as name, COALESCE(SUM(CASE WHEN payment_status != 'paid' THEN total_amount ELSE 0 END), 0) as amount
    FROM transactions WHERE type = 'purchase'
  `).all();
  
  return { assets, liabilities };
});

ipcMain.handle('get-outstanding-aging', () => {
  return db.prepare(`
    SELECT p.name as party_name, 
           SUM(CASE WHEN t.payment_status != 'paid' THEN t.total_amount ELSE 0 END) as outstanding,
           MAX(t.created_at) as last_transaction
    FROM transactions t
    JOIN parties p ON t.party_id = p.id
    WHERE t.type = 'sale'
    GROUP BY p.id
    HAVING outstanding > 0
    ORDER BY outstanding DESC
  `).all();
});

ipcMain.handle('get-expense-summary', (event, period) => {
  return db.prepare(`
    SELECT category, SUM(amount) as total
    FROM expenses
    WHERE date LIKE ?
    GROUP BY category
    ORDER BY total DESC
  `).all(`${period}%`);
});

// Audit Logs
ipcMain.handle('get-audit-logs', (event, limit = 100) => {
  return db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?').all(limit);
});

function logAudit(action, details) {
  try {
    db.prepare('INSERT INTO audit_logs (action, details) VALUES (?, ?)').run(action, details);
  } catch (e) {
    console.error('Audit log error:', e);
  }
}

// Fraud Detection
ipcMain.handle('get-fraud-alerts', () => {
  return db.prepare('SELECT * FROM fraud_alerts WHERE status = "active" ORDER BY created_at DESC').all();
});

ipcMain.handle('resolve-fraud-alert', (event, id) => {
  db.prepare('UPDATE fraud_alerts SET status = "resolved", resolved_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  return true;
});

ipcMain.handle('check-fraud-patterns', (event, transaction) => {
  const alerts = [];
  
  // Check for unusually large transactions
  if (transaction.total_amount > 100000) {
    alerts.push({
      type: 'LARGE_TRANSACTION',
      severity: 'high',
      title: 'Unusually Large Transaction',
      description: `Transaction of ₹${transaction.total_amount} exceeds threshold of ₹1,00,000`
    });
  }
  
  // Check for round number transactions (potential fake)
  if (transaction.total_amount % 1000 === 0 && transaction.total_amount > 10000) {
    alerts.push({
      type: 'ROUND_NUMBER',
      severity: 'medium',
      title: 'Round Number Transaction',
      description: `Transaction amount ₹${transaction.total_amount} is a round number, may need verification`
    });
  }
  
  // Check for new party with large transaction
  const partyAge = db.prepare('SELECT created_at FROM parties WHERE id = ?').get(transaction.party_id);
  if (partyAge) {
    const daysOld = (Date.now() - new Date(partyAge.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld < 7 && transaction.total_amount > 50000) {
      alerts.push({
        type: 'NEW_PARTY_LARGE_TRANSACTION',
        severity: 'high',
        title: 'Large Transaction with New Party',
        description: `New party (created ${Math.floor(daysOld)} days ago) with transaction of ₹${transaction.total_amount}`
      });
    }
  }
  
  // Save alerts
  const insertAlert = db.prepare(`
    INSERT INTO fraud_alerts (type, severity, title, description, transaction_id)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  alerts.forEach(alert => {
    insertAlert.run(alert.type, alert.severity, alert.title, alert.description, transaction.id || 0);
  });
  
  return alerts;
});

// Reconciliation
ipcMain.handle('get-reconciliations', () => {
  return db.prepare('SELECT * FROM reconciliation ORDER BY created_at DESC').all();
});

ipcMain.handle('start-reconciliation', (event, data) => {
  const stmt = db.prepare(`
    INSERT INTO reconciliation (bank_name, statement_file, opening_balance, closing_balance)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(data.bankName, data.statementFile, data.openingBalance, data.closingBalance);
  return result.lastInsertRowid;
});

ipcMain.handle('add-reconciliation-item', (event, item) => {
  const stmt = db.prepare(`
    INSERT INTO reconciliation_items (reconciliation_id, bank_date, bank_description, bank_amount, ledger_date, ledger_description, ledger_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(item.reconciliationId, item.bankDate, item.bankDescription, item.bankAmount,
    item.ledgerDate, item.ledgerDescription, item.ledgerAmount);
});

// Mistake Memory
ipcMain.handle('get-mistake-patterns', () => {
  return db.prepare('SELECT * FROM mistake_patterns ORDER BY frequency DESC').all();
});

ipcMain.handle('add-mistake-pattern', (event, pattern, correction) => {
  const existing = db.prepare('SELECT * FROM mistake_patterns WHERE pattern = ?').get(pattern);
  if (existing) {
    db.prepare('UPDATE mistake_patterns SET frequency = frequency + 1, confidence = (frequency + 1) / (frequency + 2), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(existing.id);
    return existing.id;
  } else {
    const stmt = db.prepare('INSERT INTO mistake_patterns (pattern, correction, frequency, confidence) VALUES (?, ?, 1, 0.5)');
    return stmt.run(pattern, correction);
  }
});

ipcMain.handle('delete-mistake-pattern', (event, id) => {
  db.prepare('DELETE FROM mistake_patterns WHERE id = ?').run(id);
  return true;
});

// Import/Export
ipcMain.handle('import-data', (event, data) => {
  const { source, data: importData } = data;
  let imported = 0;
  
  if (source === 'tally' || source === 'busy' || source === 'marg') {
    // Import parties
    if (importData.parties && Array.isArray(importData.parties)) {
      const stmt = db.prepare(`
        INSERT INTO parties (name, type, contact, email, address, gstin, opening_balance)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const party of importData.parties) {
        try {
          stmt.run(party.name, party.type, party.contact, party.email, party.address, party.gstin, party.opening_balance || 0);
          imported++;
        } catch (e) {
          // Skip duplicates
        }
      }
    }
    
    // Import products
    if (importData.products && Array.isArray(importData.products)) {
      const stmt = db.prepare(`
        INSERT INTO products (name, sku, hsn_code, unit, rate, gst_rate)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const product of importData.products) {
        try {
          stmt.run(product.name, product.sku, product.hsn_code, product.unit, product.rate, product.gst_rate || 0);
          imported++;
        } catch (e) {
          // Skip duplicates
        }
      }
    }
    
    // Import transactions
    if (importData.transactions && Array.isArray(importData.transactions)) {
      for (const txn of importData.transactions) {
        try {
          db.prepare(`
            INSERT INTO transactions (type, party_id, product_id, quantity, rate, amount, gst_rate, gst_amount, total_amount, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(txn.type, txn.party_id, txn.product_id, txn.quantity, txn.rate, txn.amount,
            txn.gst_rate || 0, txn.gst_amount || 0, txn.total_amount, txn.description);
          imported++;
        } catch (e) {
          // Skip invalid records
        }
      }
    }
  }
  
  logAudit('IMPORT', `Imported ${imported} records from ${source}`);
  return imported;
});

ipcMain.handle('export-data', (event, format) => {
  const parties = db.prepare('SELECT * FROM parties').all();
  const products = db.prepare('SELECT * FROM products').all();
  const transactions = db.prepare('SELECT t.*, p.name as party_name, pr.name as product_name FROM transactions t LEFT JOIN parties p ON t.party_id = p.id LEFT JOIN products pr ON t.product_id = pr.id').all();
  const expenses = db.prepare('SELECT * FROM expenses').all();
  
  return { parties, products, transactions, expenses };
});

app.whenReady().then(() => {
  initializeDatabase();
  createWindow();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
