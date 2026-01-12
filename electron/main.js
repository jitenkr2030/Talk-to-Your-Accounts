const { app, BrowserWindow, ipcMain, dialog, shell, Notification } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');

let mainWindow;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#0f172a',
    titleBarStyle: 'hiddenInset',
    show: false,
    icon: path.join(__dirname, '../public/icon.png')
  });

  mainWindow.loadURL('http://localhost:5173');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function initializeDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'talk-to-accounts.db');
  db = new Database(dbPath);
  
  db.exec(`
    -- Business Information
    CREATE TABLE IF NOT EXISTS business_info (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Parties/Ledgers
    CREATE TABLE IF NOT EXISTS parties (
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
    );

    -- Products/Items
    CREATE TABLE IF NOT EXISTS products (
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
    );

    -- Categories
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      parent_id INTEGER DEFAULT 0,
      gst_rate REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Transactions
    CREATE TABLE IF NOT EXISTS transactions (
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
    );

    -- Payments
    CREATE TABLE IF NOT EXISTS payments (
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
    );

    -- Receipts
    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER,
      party_id INTEGER,
      amount REAL NOT NULL,
      method TEXT DEFAULT 'cash',
      reference TEXT,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Expenses
    CREATE TABLE IF NOT EXISTS expenses (
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
    );

    -- Cash Book
    CREATE TABLE IF NOT EXISTS cash_book (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      voucher_no TEXT,
      description TEXT,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- GST Records
    CREATE TABLE IF NOT EXISTS gst_returns (
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
    );

    -- Alerts
    CREATE TABLE IF NOT EXISTS alerts (
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
    );

    -- Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
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
    );

    -- Business Health Metrics
    CREATE TABLE IF NOT EXISTS health_metrics (
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
    );

    -- Tax Settings
    CREATE TABLE IF NOT EXISTS tax_settings (
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
    );

    -- Settings
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Indices
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(voucher_type);
    CREATE INDEX IF NOT EXISTS idx_transactions_party ON transactions(party_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_voucher ON transactions(voucher_no);
    CREATE INDEX IF NOT EXISTS idx_parties_name ON parties(name);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
    CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(is_read, is_dismissed);
  `);

  // Initialize default tax settings
  const defaultTaxes = [
    { tax_type: 'GST0', rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0 },
    { tax_type: 'GST5', rate: 5, cgst_rate: 2.5, sgst_rate: 2.5, igst_rate: 5 },
    { tax_type: 'GST12', rate: 12, cgst_rate: 6, sgst_rate: 6, igst_rate: 12 },
    { tax_type: 'GST18', rate: 18, cgst_rate: 9, sgst_rate: 9, igst_rate: 18 },
    { tax_type: 'GST28', rate: 28, cgst_rate: 14, sgst_rate: 14, igst_rate: 28 }
  ];

  const taxStmt = db.prepare('INSERT OR IGNORE INTO tax_settings (tax_type, rate, cgst_rate, sgst_rate, igst_rate) VALUES (?, ?, ?, ?, ?)');
  for (const tax of defaultTaxes) {
    taxStmt.run(tax.tax_type, tax.rate, tax.cgst_rate, tax.sgst_rate, tax.igst_rate);
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

  const catStmt = db.prepare('INSERT OR IGNORE INTO categories (name, type, gst_rate) VALUES (?, ?, ?)');
  for (const cat of defaultCategories) {
    catStmt.run(cat.name, cat.type, cat.gst_rate);
  }

  console.log('Database initialized at:', dbPath);
  return db;
}

// Helper function to generate voucher number
function generateVoucherNumber(db, type) {
  const prefix = {
    'sale': 'SL',
    'purchase': 'PR',
    'payment': 'PM',
    'receipt': 'RC',
    'journal': 'JR',
    'contra': 'CR',
    'expense': 'EX'
  }[type] || 'TX';
  
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE date LIKE ?').get(`${date.slice(0, 7)}%`).count;
  return `${prefix}/${date.slice(2)}/${String(count + 1).padStart(4, '0')}`;
}

// Helper function to calculate GST
function calculateGST(amount, gstRate, state) {
  const taxableAmount = amount;
  const gstAmount = (taxableAmount * gstRate) / 100;
  
  if (state === 'same') {
    return {
      taxable_amount: taxableAmount,
      cgst_amount: gstAmount / 2,
      sgst_amount: gstAmount / 2,
      igst_amount: 0,
      total_gst: gstAmount,
      total_amount: taxableAmount + gstAmount
    };
  } else {
    return {
      taxable_amount: taxableAmount,
      cgst_amount: 0,
      sgst_amount: 0,
      igst_amount: gstAmount,
      total_gst: gstAmount,
      total_amount: taxableAmount + gstAmount
    };
  }
}

// Helper function to log audit
function logAudit(db, action, entityType, entityId, oldValues, newValues, details) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (action, entity_type, entity_id, old_values, new_values, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(action, entityType, entityId, oldValues ? JSON.stringify(oldValues) : null, newValues ? JSON.stringify(newValues) : null, details);
  } catch (e) {
    console.error('Audit log error:', e);
  }
}

// Helper function to create notification
function showNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}

// ==================== BUSINESS INFO ====================
ipcMain.handle('get-business-info', () => {
  const stmt = db.prepare('SELECT * FROM business_info');
  const results = stmt.all();
  const info = {};
  for (const row of results) {
    info[row.key] = row.value;
  }
  
  // Get additional settings
  const settings = {};
  const settingsStmt = db.prepare('SELECT * FROM settings');
  for (const row of settingsStmt.all()) {
    settings[row.key] = row.value;
  }
  
  return { ...info, ...settings };
});

ipcMain.handle('set-business-info', (event, data) => {
  for (const [key, value] of Object.entries(data)) {
    const existing = db.prepare('SELECT * FROM business_info WHERE key = ?').get(key);
    if (existing) {
      db.prepare('UPDATE business_info SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?').run(value, key);
    } else {
      db.prepare('INSERT INTO business_info (key, value) VALUES (?, ?)').run(key, value);
    }
  }
  logAudit(db, 'UPDATE', 'business_info', null, null, data, 'Updated business information');
  return true;
});

// ==================== PARTIES ====================
ipcMain.handle('get-parties', (event, filters = {}) => {
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
  return db.prepare(query).all(...params);
});

ipcMain.handle('get-party-by-id', (event, id) => {
  return db.prepare('SELECT * FROM parties WHERE id = ?').get(id);
});

ipcMain.handle('add-party', (event, party) => {
  const existing = db.prepare('SELECT id FROM parties WHERE name = ? AND type = ?').get(party.name, party.type);
  if (existing) {
    throw new Error('Party with this name already exists');
  }
  
  const stmt = db.prepare(`
    INSERT INTO parties (name, type, contact, email, phone, address, city, state, gstin, pan, opening_balance, balance_type, credit_limit, credit_days, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    party.name, party.type, party.contact || null, party.email || null, party.phone || null,
    party.address || null, party.city || null, party.state || null, party.gstin || null, party.pan || null,
    party.opening_balance || 0, party.balance_type || 'receivable', party.credit_limit || 0,
    party.credit_days || 0, party.notes || null
  );
  
  logAudit(db, 'CREATE', 'parties', result.lastInsertRowid, null, party, `Added party: ${party.name}`);
  return result.lastInsertRowid;
});

ipcMain.handle('update-party', (event, id, party) => {
  const old = db.prepare('SELECT * FROM parties WHERE id = ?').get(id);
  if (!old) throw new Error('Party not found');
  
  const stmt = db.prepare(`
    UPDATE parties SET name=?, type=?, contact=?, email=?, phone=?, address=?, city=?, state=?, 
    gstin=?, pan=?, opening_balance=?, balance_type=?, credit_limit=?, credit_days=?, notes=?,
    updated_at=CURRENT_TIMESTAMP WHERE id=?
  `);
  
  stmt.run(
    party.name, party.type, party.contact || null, party.email || null, party.phone || null,
    party.address || null, party.city || null, party.state || null, party.gstin || null, party.pan || null,
    party.opening_balance || 0, party.balance_type || 'receivable', party.credit_limit || 0,
    party.credit_days || 0, party.notes || null, id
  );
  
  logAudit(db, 'UPDATE', 'parties', id, old, party, `Updated party: ${party.name}`);
  return true;
});

ipcMain.handle('delete-party', (event, id) => {
  const party = db.prepare('SELECT * FROM parties WHERE id = ?').get(id);
  if (!party) throw new Error('Party not found');
  
  // Soft delete
  db.prepare('UPDATE parties SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  logAudit(db, 'DELETE', 'parties', id, party, null, `Deleted party: ${party.name}`);
  return true;
});

ipcMain.handle('get-party-balance', (event, id) => {
  const party = db.prepare('SELECT * FROM parties WHERE id = ?').get(id);
  if (!party) throw new Error('Party not found');
  
  // Calculate current balance based on transactions
  const sales = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as total FROM transactions 
    WHERE party_id = ? AND voucher_type = 'sale' AND is_cancelled = 0
  `).get(id);
  
  const payments = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM payments 
    WHERE party_id = ? AND transaction_id IN (SELECT id FROM transactions WHERE party_id = ? AND voucher_type = 'sale')
  `).get(id, id);
  
  const openingBalance = party.opening_balance * (party.balance_type === 'receivable' ? 1 : -1);
  const balance = openingBalance + sales.total - payments.total;
  
  return {
    party,
    opening_balance: openingBalance,
    total_sales: sales.total,
    total_received: payments.total,
    current_balance: balance
  };
});

// ==================== PRODUCTS ====================
ipcMain.handle('get-products', (event, filters = {}) => {
  let query = 'SELECT * FROM products WHERE is_active = 1';
  const params = [];
  
  if (filters.search) {
    query += ' AND (name LIKE ? OR sku LIKE ? OR hsn_code LIKE ?)';
    const search = `%${filters.search}%`;
    params.push(search, search, search);
  }
  
  query += ' ORDER BY name';
  return db.prepare(query).all(...params);
});

ipcMain.handle('get-product-by-id', (event, id) => {
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
});

ipcMain.handle('add-product', (event, product) => {
  const existing = db.prepare('SELECT id FROM products WHERE name = ?').get(product.name);
  if (existing) {
    throw new Error('Product with this name already exists');
  }
  
  const stmt = db.prepare(`
    INSERT INTO products (name, sku, hsn_code, sac_code, unit, rate, cost_price, gst_rate, cess_rate, opening_stock, current_stock, min_stock, max_stock, location, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    product.name, product.sku || null, product.hsn_code || null, product.sac_code || null,
    product.unit || 'pcs', product.rate, product.cost_price || 0, product.gst_rate || 0,
    product.cess_rate || 0, product.opening_stock || 0, product.current_stock || 0,
    product.min_stock || 0, product.max_stock || 0, product.location || null, product.description || null
  );
  
  logAudit(db, 'CREATE', 'products', result.lastInsertRowid, null, product, `Added product: ${product.name}`);
  return result.lastInsertRowid;
});

ipcMain.handle('update-product', (event, id, product) => {
  const old = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!old) throw new Error('Product not found');
  
  const stmt = db.prepare(`
    UPDATE products SET name=?, sku=?, hsn_code=?, sac_code=?, unit=?, rate=?, cost_price=?, 
    gst_rate=?, cess_rate=?, opening_stock=?, current_stock=?, min_stock=?, max_stock=?, 
    location=?, description=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
  `);
  
  stmt.run(
    product.name, product.sku || null, product.hsn_code || null, product.sac_code || null,
    product.unit || 'pcs', product.rate, product.cost_price || 0, product.gst_rate || 0,
    product.cess_rate || 0, product.opening_stock || 0, product.current_stock || 0,
    product.min_stock || 0, product.max_stock || 0, product.location || null, product.description || null, id
  );
  
  logAudit(db, 'UPDATE', 'products', id, old, product, `Updated product: ${product.name}`);
  return true;
});

ipcMain.handle('delete-product', (event, id) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!product) throw new Error('Product not found');
  
  db.prepare('UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  logAudit(db, 'DELETE', 'products', id, product, null, `Deleted product: ${product.name}`);
  return true;
});

ipcMain.handle('update-stock', (event, productId, quantity, type) => {
  const change = type === 'sale' ? -quantity : quantity;
  db.prepare('UPDATE products SET current_stock = current_stock + ?, opening_stock = opening_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(change, change, productId);
  return true;
});

// ==================== TRANSACTIONS ====================
ipcMain.handle('get-transactions', (event, filters = {}) => {
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
  if (filters.voucherNo) {
    query += ' AND t.voucher_no LIKE ?';
    params.push(`%${filters.voucherNo}%`);
  }
  
  query += ' ORDER BY t.date DESC, t.created_at DESC LIMIT ?';
  params.push(filters.limit || 500);
  
  return db.prepare(query).all(...params);
});

ipcMain.handle('get-transaction-by-id', (event, id) => {
  const transaction = db.prepare(`
    SELECT t.*, p.name as party_name, p.gstin as party_gstin, p.address as party_address, 
    pr.name as product_name, pr.hsn_code as product_hsn
    FROM transactions t
    LEFT JOIN parties p ON t.party_id = p.id
    LEFT JOIN products pr ON t.product_id = pr.id
    WHERE t.id = ?
  `).get(id);
  
  if (transaction) {
    transaction.payments = db.prepare('SELECT * FROM payments WHERE transaction_id = ?').all(id);
  }
  
  return transaction;
});

ipcMain.handle('add-transaction', (event, transaction) => {
  const voucherNo = generateVoucherNumber(db, transaction.voucher_type);
  const businessInfo = db.prepare('SELECT * FROM business_info').all().reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
  
  const party = transaction.party_id ? db.prepare('SELECT * FROM parties WHERE id = ?').get(transaction.party_id) : null;
  const state = party && businessInfo.state && party.state && businessInfo.state.toLowerCase() === party.state.toLowerCase() ? 'same' : 'different';
  
  const gstCalculation = calculateGST(transaction.amount, transaction.gst_rate || 0, state);
  
  const stmt = db.prepare(`
    INSERT INTO transactions (
      voucher_no, voucher_type, date, party_id, product_id, quantity, rate, amount,
      discount_percent, discount_amount, taxable_amount, gst_rate,
      cgst_amount, sgst_amount, igst_amount, cess_amount, total_gst, total_amount,
      description, narration, payment_status, payment_method, reference_no, due_date, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    voucherNo, transaction.voucher_type, transaction.date, transaction.party_id || null,
    transaction.product_id || null, transaction.quantity || 1, transaction.rate, transaction.amount,
    transaction.discount_percent || 0, transaction.discount_amount || 0, gstCalculation.taxable_amount,
    transaction.gst_rate || 0, gstCalculation.cgst_amount, gstCalculation.sgst_amount,
    gstCalculation.igst_amount, transaction.cess_amount || 0, gstCalculation.total_gst, gstCalculation.total_amount,
    transaction.description || null, transaction.narration || null, transaction.payment_status || 'pending',
    transaction.payment_method || null, transaction.reference_no || null, transaction.due_date || null,
    transaction.created_by || 'system'
  );
  
  // Update stock if applicable
  if (transaction.product_id && transaction.quantity) {
    const stockChange = transaction.voucher_type === 'sale' ? -transaction.quantity : transaction.quantity;
    db.prepare('UPDATE products SET current_stock = current_stock + ?, opening_stock = opening_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(stockChange, stockChange, transaction.product_id);
    
    checkLowStock(transaction.product_id);
  }
  
  // Add cash book entry
  const cashType = transaction.voucher_type === 'sale' || transaction.voucher_type === 'receipt' ? 'in' : 'out';
  db.prepare(`
    INSERT INTO cash_book (date, type, voucher_no, description, debit, credit, balance)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(transaction.date, cashType, voucherNo, transaction.description, 
    cashType === 'in' ? gstCalculation.total_amount : 0,
    cashType === 'out' ? gstCalculation.total_amount : 0, 0);
  
  logAudit(db, 'CREATE', 'transactions', result.lastInsertRowid, null, transaction, `Created ${transaction.voucher_type} transaction: ${voucherNo}`);
  
  // Check for alerts
  checkTransactionAlerts(result.lastInsertRowid, transaction, gstCalculation);
  
  return { id: result.lastInsertRowid, voucher_no: voucherNo, ...gstCalculation };
});

ipcMain.handle('update-transaction', (event, id, transaction) => {
  const old = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
  if (!old) throw new Error('Transaction not found');
  
  const stmt = db.prepare(`
    UPDATE transactions SET date=?, party_id=?, product_id=?, quantity=?, rate=?, amount=?,
    discount_percent=?, discount_amount=?, taxable_amount=?, gst_rate=?, cgst_amount=?,
    sgst_amount=?, igst_amount=?, cess_amount=?, total_gst=?, total_amount=?, description=?,
    narration=?, payment_status=?, payment_method=?, reference_no=?, due_date=?,
    updated_at=CURRENT_TIMESTAMP WHERE id=?
  `);
  
  stmt.run(
    transaction.date, transaction.party_id || null, transaction.product_id || null,
    transaction.quantity || 1, transaction.rate, transaction.amount,
    transaction.discount_percent || 0, transaction.discount_amount || 0,
    transaction.taxable_amount || transaction.amount, transaction.gst_rate || 0,
    transaction.cgst_amount || 0, transaction.sgst_amount || 0, transaction.igst_amount || 0,
    transaction.cess_amount || 0, transaction.total_gst || 0, transaction.total_amount,
    transaction.description || null, transaction.narration || null, transaction.payment_status || 'pending',
    transaction.payment_method || null, transaction.reference_no || null, transaction.due_date || null, id
  );
  
  logAudit(db, 'UPDATE', 'transactions', id, old, transaction, `Updated transaction: ${old.voucher_no}`);
  return true;
});

ipcMain.handle('cancel-transaction', (event, id, reason) => {
  const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
  if (!transaction) throw new Error('Transaction not found');
  
  db.prepare('UPDATE transactions SET is_cancelled = 1, narration = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(`Cancelled: ${reason}`, id);
  
  // Reverse stock if applicable
  if (transaction.product_id && transaction.quantity) {
    const stockChange = transaction.voucher_type === 'sale' ? transaction.quantity : -transaction.quantity;
    db.prepare('UPDATE products SET current_stock = current_stock + ?, opening_stock = opening_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(stockChange, stockChange, transaction.product_id);
  }
  
  logAudit(db, 'CANCEL', 'transactions', id, { is_cancelled: 0 }, { is_cancelled: 1, reason }, `Cancelled transaction: ${transaction.voucher_no}`);
  return true;
});

// ==================== PAYMENTS ====================
ipcMain.handle('get-payments', (event, filters = {}) => {
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
  if (filters.startDate) {
    query += ' AND created_at >= ?';
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    query += ' AND created_at <= ?';
    params.push(filters.endDate);
  }
  
  query += ' ORDER BY created_at DESC';
  return db.prepare(query).all(...params);
});

ipcMain.handle('add-payment', (event, payment) => {
  const stmt = db.prepare(`
    INSERT INTO payments (transaction_id, party_id, amount, method, reference, cheque_no, bank_name, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    payment.transaction_id || null, payment.party_id || null, payment.amount,
    payment.method || 'cash', payment.reference || null, payment.cheque_no || null,
    payment.bank_name || null, payment.description || null
  );
  
  // Update transaction payment status
  if (payment.transaction_id) {
    const totalPaid = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE transaction_id = ?')
      .get(payment.transaction_id);
    const transaction = db.prepare('SELECT total_amount FROM transactions WHERE id = ?').get(payment.transaction_id);
    
    let status = 'pending';
    if (totalPaid.total >= transaction.total_amount) {
      status = 'paid';
    } else if (totalPaid.total > 0) {
      status = 'partial';
    }
    
    db.prepare('UPDATE transactions SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, payment.transaction_id);
  }
  
  logAudit(db, 'CREATE', 'payments', result.lastInsertRowid, null, payment, `Added payment: ₹${payment.amount}`);
  return result.lastInsertRowid;
});

// ==================== EXPENSES ====================
ipcMain.handle('get-expenses', (event, filters = {}) => {
  let query = 'SELECT * FROM expenses WHERE 1=1';
  const params = [];
  
  if (filters.category) {
    query += ' AND category = ?';
    params.push(filters.category);
  }
  if (filters.startDate) {
    query += ' AND date >= ?';
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    query += ' AND date <= ?';
    params.push(filters.endDate);
  }
  
  query += ' ORDER BY date DESC';
  return db.prepare(query).all(...params);
});

ipcMain.handle('add-expense', (event, expense) => {
  const stmt = db.prepare(`
    INSERT INTO expenses (category, sub_category, amount, gst_amount, description, party_id, payment_method, reference, date, is_recurring, recurring_frequency)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    expense.category, expense.sub_category || null, expense.amount, expense.gst_amount || 0,
    expense.description || null, expense.party_id || null, expense.payment_method || null,
    expense.reference || null, expense.date || new Date().toISOString().split('T')[0],
    expense.is_recurring ? 1 : 0, expense.recurring_frequency || null
  );
  
  logAudit(db, 'CREATE', 'expenses', result.lastInsertRowid, null, expense, `Added expense: ₹${expense.amount} (${expense.category})`);
  return result.lastInsertRowid;
});

ipcMain.handle('delete-expense', (event, id) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
  return true;
});

// ==================== REPORTS ====================
ipcMain.handle('get-dashboard-summary', (event, period = 'month') => {
  const today = new Date();
  let startDate;
  
  if (period === 'today') {
    startDate = today.toISOString().split('T')[0];
  } else if (period === 'week') {
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    startDate = weekAgo.toISOString().split('T')[0];
  } else if (period === 'month') {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    startDate = monthStart.toISOString().split('T')[0];
  } else {
    const yearStart = new Date(today.getFullYear(), 0, 1);
    startDate = yearStart.toISOString().split('T')[0];
  }
  
  const datePattern = startDate.replace(/-/g, '') + '%';
  
  const sales = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count
    FROM transactions WHERE voucher_type = 'sale' AND is_cancelled = 0 AND date >= ?
  `).get(startDate);
  
  const purchases = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as total, COUNT(*) as count
    FROM transactions WHERE voucher_type = 'purchase' AND is_cancelled = 0 AND date >= ?
  `).get(startDate);
  
  const expenses = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ?
  `).get(startDate);
  
  const receipts = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE created_at >= ?
  `).get(`${startDate}%`);
  
  const payments = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as total FROM transactions 
    WHERE voucher_type IN ('purchase', 'expense') AND is_cancelled = 0 AND date >= ?
  `).get(startDate);
  
  const pendingReceivables = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN payment_status != 'paid' THEN total_amount ELSE 0 END), 0) as total
    FROM transactions WHERE voucher_type = 'sale' AND is_cancelled = 0
  `).get();
  
  const pendingPayables = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN payment_status != 'paid' THEN total_amount ELSE 0 END), 0) as total
    FROM transactions WHERE voucher_type = 'purchase' AND is_cancelled = 0
  `).get();
  
  const todaySales = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as total FROM transactions 
    WHERE voucher_type = 'sale' AND date = ? AND is_cancelled = 0
  `).get(today.toISOString().split('T')[0]);
  
  const gstCollected = db.prepare(`
    SELECT COALESCE(SUM(total_gst), 0) as total FROM transactions 
    WHERE voucher_type = 'sale' AND is_cancelled = 0 AND date >= ?
  `).get(startDate);
  
  return {
    period: { start: startDate, end: today.toISOString().split('T')[0] },
    sales: { total: sales.total, count: sales.count },
    purchases: { total: purchases.total, count: purchases.count },
    expenses: { total: expenses.total },
    netProfit: sales.total - purchases.total - expenses.total,
    receipts: { total: receipts.total },
    payments: { total: payments.total },
    cashFlow: receipts.total - payments.total,
    pendingReceivables: pendingReceivables.total,
    pendingPayables: pendingPayables.total,
    todaySales: todaySales.total,
    gstCollected: gstCollected.total
  };
});

ipcMain.handle('get-sales-report', (event, filters = {}) => {
  const { startDate, endDate, partyId } = filters || {};
  
  let query = `
    SELECT t.*, p.name as party_name, p.gstin as party_gstin, pr.name as product_name 
    FROM transactions t
    LEFT JOIN parties p ON t.party_id = p.id
    LEFT JOIN products pr ON t.product_id = pr.id
    WHERE t.voucher_type = 'sale' AND t.is_cancelled = 0
  `;
  const params = [];
  
  if (startDate) {
    query += ' AND t.date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND t.date <= ?';
    params.push(endDate);
  }
  if (partyId) {
    query += ' AND t.party_id = ?';
    params.push(partyId);
  }
  
  query += ' ORDER BY t.date DESC';
  
  const transactions = db.prepare(query).all(...params);
  
  const summary = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as total_sales,
           COUNT(*) as transaction_count,
           COALESCE(SUM(quantity), 0) as total_items,
           COALESCE(SUM(total_gst), 0) as total_gst,
           COALESCE(SUM(taxable_amount), 0) as total_taxable
    FROM transactions 
    WHERE voucher_type = 'sale' AND is_cancelled = 0
    ${startDate ? "AND date >= '" + startDate + "'" : ''}
    ${endDate ? "AND date <= '" + endDate + "'" : ''}
  `).get();
  
  return { transactions, summary };
});

ipcMain.handle('get-gst-report', (event, period) => {
  const periodPattern = period + '%';
  
  const salesByGST = db.prepare(`
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
  
  const purchasesByGST = db.prepare(`
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
  
  const summary = db.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN voucher_type = 'sale' THEN taxable_amount ELSE 0 END), 0) as sales_taxable,
      COALESCE(SUM(CASE WHEN voucher_type = 'purchase' THEN taxable_amount ELSE 0 END), 0) as purchases_taxable,
      COALESCE(SUM(CASE WHEN voucher_type = 'sale' THEN total_gst ELSE 0 END), 0) as gst_collected,
      COALESCE(SUM(CASE WHEN voucher_type = 'purchase' THEN total_gst ELSE 0 END), 0) as gst_paid,
      COALESCE(SUM(CASE WHEN voucher_type = 'sale' THEN igst_amount ELSE 0 END), 0) as igst_collected,
      COALESCE(SUM(CASE WHEN voucher_type = 'purchase' THEN igst_amount ELSE 0 END), 0) as igst_paid,
      COALESCE(SUM(CASE WHEN voucher_type = 'sale' THEN (cgst_amount + sgst_amount) ELSE 0 END), 0) as cgst_sgst_collected,
      COALESCE(SUM(CASE WHEN voucher_type = 'purchase' THEN (cgst_amount + sgst_amount) ELSE 0 END), 0) as cgst_sgst_paid,
      COALESCE(SUM(CASE WHEN voucher_type = 'sale' THEN cess_amount ELSE 0 END), 0) as cess_collected,
      COALESCE(SUM(CASE WHEN voucher_type = 'purchase' THEN cess_amount ELSE 0 END), 0) as cess_paid
    FROM transactions 
    WHERE is_cancelled = 0 AND date LIKE ?
  `).get(periodPattern);
  
  const netLiability = summary.gst_collected - summary.gst_paid;
  
  return {
    period,
    salesByGST,
    purchasesByGST,
    summary: { ...summary, net_liability: netLiability }
  };
});

ipcMain.handle('get-profit-loss', (event, filters = {}) => {
  const { startDate, endDate } = filters || {};
  
  let dateFilter = '';
  const params = [];
  
  if (startDate) {
    dateFilter += " AND date >= '" + startDate + "'";
    params.push(startDate);
  }
  if (endDate) {
    dateFilter += " AND date <= '" + endDate + "'";
    params.push(endDate);
  }
  
  const sales = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_sales, COALESCE(SUM(total_gst), 0) as total_gst,
           COALESCE(SUM(quantity), 0) as total_items, COUNT(*) as transactions
    FROM transactions WHERE voucher_type = 'sale' AND is_cancelled = 0 ${dateFilter}
  `).get();
  
  const purchases = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_purchases, COALESCE(SUM(total_gst), 0) as total_gst,
           COALESCE(SUM(quantity), 0) as total_items, COUNT(*) as transactions
    FROM transactions WHERE voucher_type = 'purchase' AND is_cancelled = 0 ${dateFilter}
  `).get();
  
  const directExpenses = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE 1=1 ${startDate ? "AND date >= '" + startDate + "'" : ''} ${endDate ? "AND date <= '" + endDate + "'" : ''}
  `).get();
  
  const indirectExpenses = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as total 
    FROM transactions WHERE voucher_type = 'expense' AND is_cancelled = 0 ${dateFilter}
  `).get();
  
  const grossProfit = sales.total_sales - purchases.total_purchases;
  const totalExpenses = directExpenses.total + indirectExpenses.total;
  const netProfit = grossProfit - totalExpenses;
  const profitMargin = sales.total_sales > 0 ? (netProfit / sales.total_sales * 100) : 0;
  
  return {
    period: { start: startDate, end: endDate },
    sales: sales,
    purchases: purchases,
    gross_profit: grossProfit,
    direct_expenses: directExpenses.total,
    indirect_expenses: indirectExpenses.total,
    total_expenses: totalExpenses,
    net_profit: netProfit,
    profit_margin: profitMargin,
    gst_summary: {
      output_gst: sales.total_gst,
      input_gst: purchases.total_gst,
      net_gst_liability: sales.total_gst - purchases.total_gst
    }
  };
});

ipcMain.handle('get-balance-sheet', (event, asOnDate) => {
  const date = asOnDate || new Date().toISOString().split('T')[0];
  
  const assets = db.prepare(`
    SELECT 
      'Cash in Hand' as name,
      (SELECT COALESCE(SUM(credit), 0) - COALESCE(SUM(debit), 0) FROM cash_book WHERE date <= ?) as amount
    UNION ALL
    SELECT 
      'Accounts Receivable' as name,
      COALESCE((SELECT SUM(total_amount) FROM transactions WHERE voucher_type = 'sale' AND is_cancelled = 0 AND date <= ? AND payment_status != 'paid'), 0) as amount
    UNION ALL
    SELECT 
      'Inventory' as name,
      COALESCE((SELECT SUM(current_stock * rate) FROM products WHERE is_active = 1), 0) as amount
    UNION ALL
    SELECT 
      'Fixed Assets' as name,
      0 as amount
  `).all(date, date);
  
  const liabilities = db.prepare(`
    SELECT 
      'Accounts Payable' as name,
      COALESCE((SELECT SUM(total_amount) FROM transactions WHERE voucher_type = 'purchase' AND is_cancelled = 0 AND date <= ? AND payment_status != 'paid'), 0) as amount
    UNION ALL
    SELECT 
      'GST Payable' as name,
      COALESCE((SELECT SUM(total_gst) FROM transactions WHERE voucher_type = 'sale' AND is_cancelled = 0 AND date <= ?), 0) - 
      COALESCE((SELECT SUM(total_gst) FROM transactions WHERE voucher_type = 'purchase' AND is_cancelled = 0 AND date <= ?), 0) as amount
  `).all(date, date, date);
  
  const equity = db.prepare(`
    SELECT COALESCE(opening_balance, 0) as opening_balance FROM business_info WHERE key = 'opening_capital'
  `).get();
  
  const totalAssets = assets.reduce((sum, a) => sum + (a.amount || 0), 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + (l.amount || 0), 0);
  const retainedEarnings = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM (
      SELECT COALESCE(SUM(amount), 0) as amount FROM transactions WHERE voucher_type = 'sale' AND is_cancelled = 0 AND date <= ?
      UNION ALL
      SELECT COALESCE(SUM(-amount), 0) as amount FROM transactions WHERE voucher_type = 'purchase' AND is_cancelled = 0 AND date <= ?
      UNION ALL
      SELECT COALESCE(SUM(-amount), 0) as amount FROM expenses WHERE date <= ?
    )
  `).get(date, date, date);
  
  return {
    as_on_date: date,
    assets: assets,
    liabilities: liabilities,
    equity: {
      opening_capital: equity?.opening_balance || 0,
      retained_earnings: retainedEarnings.total,
      total: (equity?.opening_balance || 0) + retainedEarnings.total
    },
    totals: {
      assets: totalAssets,
      liabilities: totalLiabilities,
      equity: (equity?.opening_balance || 0) + retainedEarnings.total,
      check: totalAssets - totalLiabilities
    }
  };
});

ipcMain.handle('get-outstanding-aging', () => {
  const aging = db.prepare(`
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
  
  // Calculate aging buckets
  const today = new Date();
  for (const item of aging) {
    const dueDate = new Date(item.oldest_due_date);
    const daysPast = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
    
    if (daysPast <= 0) {
      item.aging_bucket = 'current';
    } else if (daysPast <= 30) {
      item.aging_bucket = '1-30';
    } else if (daysPast <= 60) {
      item.aging_bucket = '31-60';
    } else if (daysPast <= 90) {
      item.aging_bucket = '61-90';
    } else {
      item.aging_bucket = '90+';
    }
    
    item.days_overdue = daysPast > 0 ? daysPast : 0;
  }
  
  const summary = {
    total_outstanding: aging.reduce((sum, a) => sum + (a.outstanding || 0), 0),
    current: aging.filter(a => a.aging_bucket === 'current').reduce((sum, a) => sum + a.outstanding, 0),
    '1-30': aging.filter(a => a.aging_bucket === '1-30').reduce((sum, a) => sum + a.outstanding, 0),
    '31-60': aging.filter(a => a.aging_bucket === '31-60').reduce((sum, a) => sum + a.outstanding, 0),
    '61-90': aging.filter(a => a.aging_bucket === '61-90').reduce((sum, a) => sum + a.outstanding, 0),
    '90+': aging.filter(a => a.aging_bucket === '90+').reduce((sum, a) => sum + a.outstanding, 0)
  };
  
  return { aging, summary };
});

ipcMain.handle('get-expense-summary', (event, filters = {}) => {
  const { startDate, endDate } = filters || {};
  
  let query = 'SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM expenses WHERE 1=1';
  const params = [];
  
  if (startDate) {
    query += ' AND date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND date <= ?';
    params.push(endDate);
  }
  
  query += ' GROUP BY category ORDER BY total DESC';
  
  const byCategory = db.prepare(query).all(...params);
  
  const total = byCategory.reduce((sum, c) => sum + c.total, 0);
  
  return { byCategory, total };
});

ipcMain.handle('get-cash-flow', (event, filters = {}) => {
  const { startDate, endDate } = filters || {};
  
  let query = 'SELECT * FROM cash_book WHERE 1=1';
  const params = [];
  
  if (startDate) {
    query += ' AND date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND date <= ?';
    params.push(endDate);
  }
  
  query += ' ORDER BY date, created_at';
  
  const transactions = db.prepare(query).all(...params);
  
  let balance = 0;
  for (const txn of transactions) {
    balance = balance + (txn.credit || 0) - (txn.debit || 0);
    txn.balance = balance;
  }
  
  const summary = {
    opening_balance: 0,
    total_inflows: transactions.reduce((sum, t) => sum + (t.credit || 0), 0),
    total_outflows: transactions.reduce((sum, t) => sum + (t.debit || 0), 0),
    closing_balance: balance,
    transaction_count: transactions.length
  };
  
  return { transactions, summary };
});

// ==================== ALERTS ====================
ipcMain.handle('get-alerts', (event, filters = {}) => {
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
  
  return db.prepare(query).all(...params);
});

ipcMain.handle('get-alert-count', () => {
  const unread = db.prepare('SELECT COUNT(*) as count FROM alerts WHERE is_read = 0 AND is_dismissed = 0').get();
  const bySeverity = db.prepare('SELECT severity, COUNT(*) as count FROM alerts WHERE is_dismissed = 0 GROUP BY severity').all();
  return { unread: unread.count, bySeverity };
});

ipcMain.handle('mark-alert-read', (event, id) => {
  db.prepare('UPDATE alerts SET is_read = 1 WHERE id = ?').run(id);
  return true;
});

ipcMain.handle('dismiss-alert', (event, id) => {
  db.prepare('UPDATE alerts SET is_dismissed = 1 WHERE id = ?').run(id);
  return true;
});

ipcMain.handle('clear-all-alerts', () => {
  db.prepare('UPDATE alerts SET is_dismissed = 1').run();
  return true;
});

function createAlert(db, type, category, severity, title, message, entityType, entityId) {
  const stmt = db.prepare(`
    INSERT INTO alerts (type, category, severity, title, message, entity_type, entity_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(type, category, severity, title, message, entityType, entityId);
  
  // Show notification for high severity alerts
  if (severity === 'high') {
    showNotification(title, message);
  }
  
  return result.lastInsertRowid;
}

function checkLowStock(productId) {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) return;
  
  if (product.current_stock <= product.min_stock) {
    createAlert(db, 'inventory', 'low_stock', 'medium', 'Low Stock Alert',
      `Product "${product.name}" is running low. Current stock: ${product.current_stock}, Minimum stock: ${product.min_stock}`,
      'products', productId);
  }
}

function checkTransactionAlerts(transactionId, transaction, gstCalculation) {
  const businessInfo = db.prepare('SELECT * FROM business_info').all().reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
  
  // Large transaction alert
  if (transaction.total_amount > 100000) {
    createAlert(db, 'transaction', 'large_transaction', 'high', 'Large Transaction Alert',
      `Transaction of ₹${transaction.total_amount.toLocaleString()} exceeds ₹1,00,000 threshold`,
      'transactions', transactionId);
  }
  
  // Cash transaction alert (above ₹10,000 as per Income Tax)
  if (transaction.payment_method === 'cash' && transaction.total_amount > 10000) {
    createAlert(db, 'compliance', 'cash_transaction', 'medium', 'Cash Transaction Alert',
      `Cash transaction of ₹${transaction.total_amount.toLocaleString()} detected. Ensure proper documentation.`,
      'transactions', transactionId);
  }
  
  // Missing GSTIN alert for B2B transactions
  if (transaction.gst_rate > 0 && transaction.total_amount > 50000) {
    const party = transaction.party_id ? db.prepare('SELECT * FROM parties WHERE id = ?').get(transaction.party_id) : null;
    if (party && !party.gstin) {
      createAlert(db, 'compliance', 'missing_gstin', 'high', 'Missing GSTIN Alert',
        `Transaction of ₹${transaction.total_amount.toLocaleString()} with "${party.name}" but party has no GSTIN recorded.`,
        'parties', transaction.party_id);
    }
  }
  
  // GST filing reminder (if due)
  const today = new Date();
  const gstDueDate = new Date(today.getFullYear(), today.getMonth(), 20);
  if (today > gstDueDate) {
    createAlert(db, 'compliance', 'gst_filing', 'high', 'GST Filing Reminder',
      'GST return filing for current month may be due. Please verify and file GSTR-1 and GSTR-3B.',
      null, null);
  }
}

function runPeriodicAlerts() {
  const today = new Date();
  
  // Check for overdue payments
  const overduePayments = db.prepare(`
    SELECT t.*, p.name as party_name FROM transactions t
    JOIN parties p ON t.party_id = p.id
    WHERE t.voucher_type = 'sale' AND t.is_cancelled = 0 AND t.payment_status != 'paid' 
    AND t.due_date < ?
  `).all(today.toISOString().split('T')[0]);
  
  for (const payment of overduePayments) {
    const daysOverdue = Math.floor((today - new Date(payment.due_date)) / (1000 * 60 * 60 * 24));
    if (daysOverdue % 7 === 0) { // Alert every 7 days
      createAlert(db, 'payment', 'overdue', 'high', 'Overdue Payment Alert',
        `Payment from "${payment.party_name}" is ${daysOverdue} days overdue. Amount: ₹${payment.total_amount.toLocaleString()}`,
        'transactions', payment.id);
    }
  }
  
  // Check for missing invoice numbers
  const transactions = db.prepare(`
    SELECT voucher_no, date FROM transactions 
    WHERE is_cancelled = 0 AND date LIKE ?
    ORDER BY date, voucher_no
  `).all(`${today.toISOString().slice(0, 7)}%`);
  
  // Simple check for gaps in voucher numbers (basic implementation)
  for (let i = 1; i < transactions.length; i++) {
    const prev = transactions[i - 1].voucher_no;
    const curr = transactions[i].voucher_no;
    const prevNum = parseInt(prev.split('/').pop());
    const currNum = parseInt(curr.split('/').pop());
    
    if (currNum > prevNum + 1) {
      createAlert(db, 'transaction', 'missing_voucher', 'medium', 'Missing Voucher Alert',
        `Possible missing voucher between ${prev} and ${curr} for ${transactions[i].date}`,
        null, null);
    }
  }
  
  // Check credit limit
  const parties = db.prepare('SELECT * FROM parties WHERE credit_limit > 0').all();
  for (const party of parties) {
    const outstanding = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total FROM transactions 
      WHERE party_id = ? AND voucher_type = 'sale' AND is_cancelled = 0 AND payment_status != 'paid'
    `).get(party.id);
    
    if (outstanding.total > party.credit_limit) {
      createAlert(db, 'credit', 'credit_limit', 'high', 'Credit Limit Exceeded',
        `Party "${party.name}" has exceeded credit limit of ₹${party.credit_limit.toLocaleString()}. Outstanding: ₹${outstanding.total.toLocaleString()}`,
        'parties', party.id);
    }
  }
  
  console.log('Periodic alerts check completed');
}

// ==================== HEALTH SCORE ====================
ipcMain.handle('calculate-health-score', (event, period = 'month') => {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];
  
  // Cash Flow Score (0-100)
  const cashFlow = db.prepare(`
    SELECT 
      COALESCE(SUM(credit), 0) as inflows,
      COALESCE(SUM(debit), 0) as outflows
    FROM cash_book WHERE date >= ? AND date <= ?
  `).get(startDate, endDate);
  
  const cashFlowRatio = cashFlow.inflows > 0 ? cashFlow.inflows / (cashFlow.outflows || 1) : 0;
  const cashFlowScore = Math.min(100, Math.round(cashFlowRatio * 50));
  
  // Credit Score (0-100)
  const receivables = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as outstanding,
           MAX(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as collected
    FROM transactions WHERE voucher_type = 'sale' AND is_cancelled = 0
  `).get();
  
  const collectionRatio = receivables.outstanding > 0 
    ? receivables.collected / (receivables.collected + receivables.outstanding) 
    : 1;
  const creditScore = Math.min(100, Math.round(collectionRatio * 100));
  
  // Expense Score (0-100) - lower expenses = higher score
  const expenses = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ?
  `).get(startDate);
  
  const sales = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as total FROM transactions 
    WHERE voucher_type = 'sale' AND is_cancelled = 0 AND date >= ?
  `).get(startDate);
  
  const expenseRatio = sales.total > 0 ? expenses.total / sales.total : 0;
  const expenseScore = Math.max(0, Math.round(100 - (expenseRatio * 100)));
  
  // Compliance Score (0-100)
  const unpaidGST = db.prepare(`
    SELECT COALESCE(SUM(total_gst), 0) as total FROM transactions 
    WHERE voucher_type = 'sale' AND is_cancelled = 0 AND date < ?
  `).get(startDate);
  
  const complianceScore = unpaidGST.total > 100000 ? 50 : 100; // Simplified
  
  // Overall Score
  const overallScore = Math.round(
    (cashFlowScore * 0.3) + (creditScore * 0.3) + (expenseScore * 0.2) + (complianceScore * 0.2)
  );
  
  // Determine status
  let status, recommendations;
  if (overallScore >= 80) {
    status = 'healthy';
    recommendations = ['Keep up the good work', 'Consider expanding operations', 'Maintain current credit policies'];
  } else if (overallScore >= 60) {
    status = 'moderate';
    recommendations = ['Improve collection efficiency', 'Review expense patterns', 'Monitor cash flow closely'];
  } else {
    status = 'critical';
    recommendations = ['Immediate attention needed on collections', 'Reduce non-essential expenses', 'Review credit terms', 'Consider seeking professional advice'];
  }
  
  // Save health metrics
  db.prepare(`
    INSERT INTO health_metrics (period, cash_flow_score, credit_score, expense_score, compliance_score, overall_score, analysis, recommendations)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(period, cashFlowScore, creditScore, expenseScore, complianceScore, overallScore, 
    JSON.stringify({ cashFlow: cashFlowScore, credit: creditScore, expenses: expenseScore, compliance: complianceScore }),
    JSON.stringify(recommendations));
  
  return {
    period,
    scores: {
      cash_flow: cashFlowScore,
      credit: creditScore,
      expenses: expenseScore,
      compliance: complianceScore,
      overall: overallScore
    },
    status,
    recommendations,
    details: {
      inflows: cashFlow.inflows,
      outflows: cashFlow.outflows,
      receivables: receivables.outstanding,
      collected: receivables.collected,
      monthly_expenses: expenses.total,
      monthly_sales: sales.total
    }
  };
});

ipcMain.handle('get-health-history', () => {
  return db.prepare('SELECT * FROM health_metrics ORDER BY created_at DESC LIMIT 12').all();
});

// ==================== CA MODE ====================
ipcMain.handle('get-ca-dashboard', () => {
  // Get multiple client data summary
  const clientCount = db.prepare('SELECT COUNT(DISTINCT party_id) as count FROM transactions').get();
  
  const pendingItems = db.prepare(`
    SELECT COUNT(*) as count FROM transactions 
    WHERE is_cancelled = 0 AND payment_status != 'paid'
  `).get();
  
  const pendingGST = db.prepare(`
    SELECT COALESCE(SUM(total_gst), 0) as total FROM transactions 
    WHERE voucher_type = 'sale' AND is_cancelled = 0
  `).get();
  
  const auditTrail = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20').all();
  
  const riskIndicators = db.prepare(`
    SELECT type, severity, COUNT(*) as count FROM alerts 
    WHERE is_dismissed = 0 AND severity = 'high'
    GROUP BY type
  `).all();
  
  return {
    clientCount: clientCount.count,
    pendingItems: pendingItems.count,
    pendingGST: pendingGST.total,
    auditTrail: auditTrail,
    riskIndicators: riskIndicators,
    lastSync: new Date().toISOString()
  };
});

ipcMain.handle('get-audit-trail', (event, filters = {}) => {
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
  
  return db.prepare(query).all(...params);
});

ipcMain.handle('export-for-ca', (event, format) => {
  const data = {
    transactions: db.prepare('SELECT t.*, p.name as party_name FROM transactions t LEFT JOIN parties p ON t.party_id = p.id WHERE t.is_cancelled = 0').all(),
    parties: db.prepare('SELECT * FROM parties WHERE is_active = 1').all(),
    products: db.prepare('SELECT * FROM products WHERE is_active = 1').all(),
    expenses: db.prepare('SELECT * FROM expenses').all(),
    audit_logs: db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100').all(),
    export_date: new Date().toISOString()
  };
  
  return data;
});

// ==================== EXPORT/IMPORT ====================
ipcMain.handle('export-data', (event, format) => {
  const parties = db.prepare('SELECT * FROM parties WHERE is_active = 1').all();
  const products = db.prepare('SELECT * FROM products WHERE is_active = 1').all();
  const transactions = db.prepare('SELECT t.*, p.name as party_name, pr.name as product_name FROM transactions t LEFT JOIN parties p ON t.party_id = p.id LEFT JOIN products pr ON t.product_id = pr.id WHERE t.is_cancelled = 0').all();
  const expenses = db.prepare('SELECT * FROM expenses').all();
  const businessInfo = db.prepare('SELECT * FROM business_info').all().reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
  
  return {
    version: '1.0',
    export_date: new Date().toISOString(),
    business_info: businessInfo,
    parties,
    products,
    transactions,
    expenses
  };
});

ipcMain.handle('import-data', (event, data) => {
  let imported = { parties: 0, products: 0, transactions: 0, expenses: 0 };
  
  try {
    // Import parties
    if (data.parties && Array.isArray(data.parties)) {
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO parties (name, type, contact, email, phone, address, city, state, gstin, pan, opening_balance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const party of data.parties) {
        try {
          const existing = db.prepare('SELECT id FROM parties WHERE name = ? AND type = ?').get(party.name, party.type);
          if (!existing) {
            stmt.run(party.name, party.type, party.contact || null, party.email || null, party.phone || null,
              party.address || null, party.city || null, party.state || null, party.gstin || null, party.pan || null,
              party.opening_balance || 0);
            imported.parties++;
          }
        } catch (e) {
          // Skip
        }
      }
    }
    
    // Import products
    if (data.products && Array.isArray(data.products)) {
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO products (name, sku, hsn_code, unit, rate, gst_rate)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const product of data.products) {
        try {
          const existing = db.prepare('SELECT id FROM products WHERE name = ?').get(product.name);
          if (!existing) {
            stmt.run(product.name, product.sku || null, product.hsn_code || null, product.unit || 'pcs',
              product.rate, product.gst_rate || 0);
            imported.products++;
          }
        } catch (e) {
          // Skip
        }
      }
    }
    
    // Import transactions
    if (data.transactions && Array.isArray(data.transactions)) {
      for (const txn of data.transactions) {
        try {
          db.prepare(`
            INSERT INTO transactions (voucher_no, voucher_type, date, party_id, product_id, quantity, rate, amount, gst_rate, total_amount, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(txn.voucher_no, txn.voucher_type, txn.date, txn.party_id, txn.product_id, txn.quantity || 1,
            txn.rate, txn.amount, txn.gst_rate || 0, txn.total_amount, txn.description || null);
          imported.transactions++;
        } catch (e) {
          // Skip
        }
      }
    }
    
    logAudit(db, 'IMPORT', 'system', null, null, { count: imported }, 'Data import completed');
  } catch (error) {
    throw new Error('Import failed: ' + error.message);
  }
  
  return imported;
});

// ==================== BACKUP ====================
ipcMain.handle('backup-database', () => {
  const dbPath = path.join(app.getPath('userData'), 'talk-to-accounts.db');
  const backupPath = path.join(app.getPath('documents'), 'talk-to-accounts-backup.db');
  
  try {
    const fs = require('fs');
    fs.copyFileSync(dbPath, backupPath);
    return { success: true, path: backupPath };
  } catch (error) {
    throw new Error('Backup failed: ' + error.message);
  }
});

ipcMain.handle('restore-database', (event, backupPath) => {
  const dbPath = path.join(app.getPath('userData'), 'talk-to-accounts.db');
  
  try {
    const fs = require('fs');
    fs.copyFileSync(backupPath, dbPath);
    return { success: true };
  } catch (error) {
    throw new Error('Restore failed: ' + error.message);
  }
});

// ==================== SETTINGS ====================
ipcMain.handle('get-settings', () => {
  const settings = {};
  const stmt = db.prepare('SELECT * FROM settings');
  for (const row of stmt.all()) {
    settings[row.key] = row.value;
  }
  return settings;
});

ipcMain.handle('save-settings', (event, settings) => {
  for (const [key, value] of Object.entries(settings)) {
    const existing = db.prepare('SELECT * FROM settings WHERE key = ?').get(key);
    if (existing) {
      db.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?').run(value, key);
    } else {
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, value);
    }
  }
  return true;
});

// ==================== INITIALIZATION ====================
app.whenReady().then(() => {
  initializeDatabase();
  createWindow();
  
  // Run periodic alerts check every hour
  setInterval(runPeriodicAlerts, 60 * 60 * 1000);
  
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
