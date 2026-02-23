const { app, BrowserWindow, ipcMain, dialog, shell, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const crypto = require('crypto');
const dbManager = require('./database');
const invoiceScanningDB = require('./databaseInvoiceScanning');
const Tesseract = require('tesseract.js');

// Audit Service
const auditService = require('../src/services/auditService');

// E-Invoice Service
const einvoiceService = require('../src/services/einvoiceService');

// GST Return Service
const gstReturnService = require('../src/services/gstReturnService');

// Inventory Service
const inventoryService = require('../src/services/inventoryService');

// Report Engine
const ReportEngine = require('../src/services/reportEngine');
let reportEngine = null;

// Banking Service
const bankingService = require('../src/services/bankingService');

// Payment Gateway Service
const paymentGatewayService = require('../src/services/paymentGatewayService');

// Expense Service
const expenseService = require('../src/services/expenseService');

// Budget Service
const budgetService = require('../src/services/budgetService');

// Vendor Service
const vendorService = require('../src/services/vendorService');

// Project Service
const projectService = require('../src/services/projectService');

// User Service
const userService = require('../src/services/userService');

// E-Way Bill Service
const ewaybillService = require('../src/services/ewaybillService');

// API Gateway Service
const apiGatewayService = require('../src/services/apiGatewayService');

// Analytics Service
const analyticsService = require('../src/services/analyticsService');

// Currency Service
const currencyService = require('../src/services/currencyService');

// Voice Service
const voiceService = require('../src/services/voiceService');

// Security Service
const securityService = require('../src/services/securityService');

// Notification Service
const notificationService = require('../src/services/notificationService');
const aiService = require('../src/services/aiService');

// ==================== AUTHENTICATION HELPERS ====================
function hashPin(pin, salt = null) {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pin, useSalt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt: useSalt };
}

function verifyPin(pin, hash, salt) {
  const { hash: verifyHash } = hashPin(pin, salt);
  return hash === verifyHash;
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Session store (in-memory for demo, use secure storage in production)
const activeSessions = new Map();

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

  // For production builds, load the built files
  const isProduction = process.env.NODE_ENV === 'production' || !process.argv.some(arg => arg.includes('--dev'));
  
  if (isProduction) {
    const path = require('path');
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

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

    -- Users for Authentication
    CREATE TABLE IF NOT EXISTS users (
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
    );

    -- GST Reminders for Compliance
    CREATE TABLE IF NOT EXISTS gst_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reminder_type TEXT NOT NULL,
      period TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Sessions
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Bank Statements (for Auto-Reconciliation)
    CREATE TABLE IF NOT EXISTS bank_statements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_name TEXT NOT NULL,
      account_number TEXT,
      statement_period TEXT,
      file_path TEXT,
      uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      processed_at TEXT,
      status TEXT DEFAULT 'pending',
      total_transactions INTEGER DEFAULT 0,
      matched_count INTEGER DEFAULT 0,
      unmatched_count INTEGER DEFAULT 0,
      created_by TEXT
    );

    -- Bank Statement Transactions
    CREATE TABLE IF NOT EXISTS bank_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_statement_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      reference_no TEXT,
      matched INTEGER DEFAULT 0,
      transaction_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (bank_statement_id) REFERENCES bank_statements(id)
    );

    -- Recommendations
    CREATE TABLE IF NOT EXISTS recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      priority INTEGER DEFAULT 5,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      actionable TEXT,
      potential_impact TEXT,
      implementation TEXT,
      is_read INTEGER DEFAULT 0,
      is_applied INTEGER DEFAULT 0,
      applied_at TEXT,
      expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Voice Command Logs
    CREATE TABLE IF NOT EXISTS voice_command_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      command TEXT NOT NULL,
      transcript TEXT,
      confidence REAL,
      action TEXT,
      success INTEGER DEFAULT 0,
      error_message TEXT,
      duration_ms INTEGER,
      language TEXT DEFAULT 'en-IN',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Indices
    CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
    CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(is_read, is_dismissed);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_bank_transactions_bank ON bank_transactions(bank_statement_id);
    CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(date);
    CREATE INDEX IF NOT EXISTS idx_recommendations_type ON recommendations(type);
    CREATE INDEX IF NOT EXISTS idx_voice_logs_created ON voice_command_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

    -- Subscription Plans
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      monthly_price REAL NOT NULL,
      yearly_price REAL NOT NULL,
      currency TEXT DEFAULT 'INR',
      max_transactions INTEGER DEFAULT 0,
      max_parties INTEGER DEFAULT 0,
      max_products INTEGER DEFAULT 0,
      features TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- User Subscriptions
    CREATE TABLE IF NOT EXISTS user_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan_id TEXT NOT NULL,
      subscription_status TEXT DEFAULT 'active',
      billing_cycle TEXT DEFAULT 'monthly',
      razorpay_subscription_id TEXT,
      period_start TEXT,
      period_end TEXT,
      license_key TEXT UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(plan_id)
    );

    -- Usage Tracking
    CREATE TABLE IF NOT EXISTS usage_tracker (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      transaction_count INTEGER DEFAULT 0,
      party_count INTEGER DEFAULT 0,
      product_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, month)
    );

    -- Payment Records
    CREATE TABLE IF NOT EXISTS payment_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      subscription_id INTEGER,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'INR',
      payment_method TEXT,
      razorpay_payment_id TEXT,
      razorpay_order_id TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id)
    );
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

  // Initialize default subscription plans
  const defaultPlans = [
    {
      plan_id: 'free',
      name: 'Free',
      description: 'Perfect for getting started with basic accounting',
      monthly_price: 0,
      yearly_price: 0,
      max_transactions: 50,
      max_parties: 10,
      max_products: 20,
      features: JSON.stringify([
        'Up to 50 transactions per month',
        'Up to 10 parties/ledgers',
        'Up to 20 products',
        'Basic reports',
        'GST calculations',
        'Email support'
      ])
    },
    {
      plan_id: 'starter',
      name: 'Starter',
      description: 'Ideal for small businesses with growing needs',
      monthly_price: 499,
      yearly_price: 4990,
      max_transactions: 500,
      max_parties: 50,
      max_products: 100,
      features: JSON.stringify([
        'Up to 500 transactions per month',
        'Up to 50 parties/ledgers',
        'Up to 100 products',
        'All reports included',
        'GST filing assistance',
        'Priority email support',
        'Bank reconciliation',
        'Voice commands (Hindi/English)'
      ])
    },
    {
      plan_id: 'professional',
      name: 'Professional',
      description: 'Complete solution for established businesses',
      monthly_price: 1499,
      yearly_price: 14990,
      max_transactions: 5000,
      max_parties: 500,
      max_products: 1000,
      features: JSON.stringify([
        'Up to 5,000 transactions per month',
        'Up to 500 parties/ledgers',
        'Up to 1,000 products',
        'All reports included',
        'Advanced analytics',
        'Multi-user access',
        'API access',
        'Dedicated phone support',
        'Custom integrations',
        'Data export',
        'Automated backups'
      ])
    }
  ];

  const planStmt = db.prepare(`
    INSERT OR IGNORE INTO subscription_plans 
    (plan_id, name, description, monthly_price, yearly_price, max_transactions, max_parties, max_products, features)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const plan of defaultPlans) {
    planStmt.run(
      plan.plan_id,
      plan.name,
      plan.description,
      plan.monthly_price,
      plan.yearly_price,
      plan.max_transactions,
      plan.max_parties,
      plan.max_products,
      plan.features
    );
  }

  console.log('Database initialized at:', dbPath);
  
  // Initialize Audit Service
  initializeAuditService(db);
  
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

// Helper function to log audit (now uses AuditService)
function logAudit(action, entityType, entityId, oldValues, newValues, details, userId = null) {
  auditService.log({
    action,
    entityType,
    entityId,
    userId,
    oldValues,
    newValues,
    details
  });
}

// Initialize Audit Service after database is ready
function initializeAuditService(database) {
  auditService.initialize(database);
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
  logAudit( 'UPDATE', 'business_info', null, null, data, 'Updated business information');
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
  
  logAudit( 'CREATE', 'parties', result.lastInsertRowid, null, party, `Added party: ${party.name}`);
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
  
  logAudit( 'UPDATE', 'parties', id, old, party, `Updated party: ${party.name}`);
  return true;
});

ipcMain.handle('delete-party', (event, id) => {
  const party = db.prepare('SELECT * FROM parties WHERE id = ?').get(id);
  if (!party) throw new Error('Party not found');
  
  // Soft delete
  db.prepare('UPDATE parties SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  logAudit( 'DELETE', 'parties', id, party, null, `Deleted party: ${party.name}`);
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
  
  logAudit( 'CREATE', 'products', result.lastInsertRowid, null, product, `Added product: ${product.name}`);
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
  
  logAudit( 'UPDATE', 'products', id, old, product, `Updated product: ${product.name}`);
  return true;
});

ipcMain.handle('delete-product', (event, id) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!product) throw new Error('Product not found');
  
  db.prepare('UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  logAudit( 'DELETE', 'products', id, product, null, `Deleted product: ${product.name}`);
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
  
  logAudit( 'CREATE', 'transactions', result.lastInsertRowid, null, transaction, `Created ${transaction.voucher_type} transaction: ${voucherNo}`);
  
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
  
  logAudit( 'UPDATE', 'transactions', id, old, transaction, `Updated transaction: ${old.voucher_no}`);
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
  
  logAudit( 'CANCEL', 'transactions', id, { is_cancelled: 0 }, { is_cancelled: 1, reason }, `Cancelled transaction: ${transaction.voucher_no}`);
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
  
  logAudit( 'CREATE', 'payments', result.lastInsertRowid, null, payment, `Added payment: ₹${payment.amount}`);
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
  
  logAudit( 'CREATE', 'expenses', result.lastInsertRowid, null, expense, `Added expense: ₹${expense.amount} (${expense.category})`);
  return result.lastInsertRowid;
});

ipcMain.handle('delete-expense', (event, id) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
  return true;
});

// ==================== EXPENSE SERVICE HANDLERS ====================
ipcMain.handle('expense:get-categories', async (event) => {
  try {
    return await expenseService.getCategories(db);
  } catch (error) {
    console.error('Error getting expense categories:', error);
    throw error;
  }
});

ipcMain.handle('expense:add-category', async (event, categoryData) => {
  try {
    return await expenseService.addCategory(db, categoryData);
  } catch (error) {
    console.error('Error adding expense category:', error);
    throw error;
  }
});

ipcMain.handle('expense:update-category', async (event, categoryId, categoryData) => {
  try {
    return await expenseService.updateCategory(db, categoryId, categoryData);
  } catch (error) {
    console.error('Error updating expense category:', error);
    throw error;
  }
});

ipcMain.handle('expense:delete-category', async (event, categoryId) => {
  try {
    return await expenseService.deleteCategory(db, categoryId);
  } catch (error) {
    console.error('Error deleting expense category:', error);
    throw error;
  }
});

ipcMain.handle('expense:get-all', async (event, filters = {}) => {
  try {
    return await expenseService.getAllExpenses(db, filters);
  } catch (error) {
    console.error('Error getting expenses:', error);
    throw error;
  }
});

ipcMain.handle('expense:get-by-id', async (event, expenseId) => {
  try {
    return await expenseService.getExpenseById(db, expenseId);
  } catch (error) {
    console.error('Error getting expense:', error);
    throw error;
  }
});

ipcMain.handle('expense:create', async (event, expenseData) => {
  try {
    return await expenseService.createExpense(db, expenseData);
  } catch (error) {
    console.error('Error creating expense:', error);
    throw error;
  }
});

ipcMain.handle('expense:update', async (event, expenseId, expenseData) => {
  try {
    return await expenseService.updateExpense(db, expenseId, expenseData);
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
});

ipcMain.handle('expense:delete', async (event, expenseId) => {
  try {
    return await expenseService.deleteExpense(db, expenseId);
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
});

ipcMain.handle('expense:approve', async (event, expenseId, approvalData) => {
  try {
    return await expenseService.approveExpense(db, expenseId, approvalData);
  } catch (error) {
    console.error('Error approving expense:', error);
    throw error;
  }
});

ipcMain.handle('expense:reject', async (event, expenseId, reason) => {
  try {
    return await expenseService.rejectExpense(db, expenseId, reason);
  } catch (error) {
    console.error('Error rejecting expense:', error);
    throw error;
  }
});

ipcMain.handle('expense:get-recurring', async (event, filters = {}) => {
  try {
    return await expenseService.getRecurringExpenses(db, filters);
  } catch (error) {
    console.error('Error getting recurring expenses:', error);
    throw error;
  }
});

ipcMain.handle('expense:create-recurring', async (event, recurringData) => {
  try {
    return await expenseService.createRecurringExpense(db, recurringData);
  } catch (error) {
    console.error('Error creating recurring expense:', error);
    throw error;
  }
});

ipcMain.handle('expense:update-recurring', async (event, recurringId, recurringData) => {
  try {
    return await expenseService.updateRecurringExpense(db, recurringId, recurringData);
  } catch (error) {
    console.error('Error updating recurring expense:', error);
    throw error;
  }
});

ipcMain.handle('expense:delete-recurring', async (event, recurringId) => {
  try {
    return await expenseService.deleteRecurringExpense(db, recurringId);
  } catch (error) {
    console.error('Error deleting recurring expense:', error);
    throw error;
  }
});

ipcMain.handle('expense:process-recurring', async (event, recurringId) => {
  try {
    return await expenseService.processRecurringExpense(db, recurringId);
  } catch (error) {
    console.error('Error processing recurring expense:', error);
    throw error;
  }
});

ipcMain.handle('expense:upload-receipt', async (event, expenseId, receiptData) => {
  try {
    return await expenseService.uploadReceipt(db, expenseId, receiptData);
  } catch (error) {
    console.error('Error uploading receipt:', error);
    throw error;
  }
});

ipcMain.handle('expense:get-receipts', async (event, expenseId) => {
  try {
    return await expenseService.getReceipts(db, expenseId);
  } catch (error) {
    console.error('Error getting receipts:', error);
    throw error;
  }
});

ipcMain.handle('expense:delete-receipt', async (event, receiptId) => {
  try {
    return await expenseService.deleteReceipt(db, receiptId);
  } catch (error) {
    console.error('Error deleting receipt:', error);
    throw error;
  }
});

ipcMain.handle('expense:get-summary', async (event, filters = {}) => {
  try {
    return await expenseService.getExpenseSummary(db, filters);
  } catch (error) {
    console.error('Error getting expense summary:', error);
    throw error;
  }
});

ipcMain.handle('expense:get-by-category', async (event, filters = {}) => {
  try {
    return await expenseService.getExpensesByCategory(db, filters);
  } catch (error) {
    console.error('Error getting expenses by category:', error);
    throw error;
  }
});

ipcMain.handle('expense:get-vendor-expenses', async (event, vendorId, filters = {}) => {
  try {
    return await expenseService.getExpensesByVendor(db, vendorId, filters);
  } catch (error) {
    console.error('Error getting vendor expenses:', error);
    throw error;
  }
});

ipcMain.handle('expense:export', async (event, filters = {}) => {
  try {
    return await expenseService.exportExpenses(db, filters);
  } catch (error) {
    console.error('Error exporting expenses:', error);
    throw error;
  }
});

// ==================== BUDGET SERVICE HANDLERS ====================
ipcMain.handle('budget:get-all', async (event, filters = {}) => {
  try {
    return await budgetService.getAllBudgets(db, filters);
  } catch (error) {
    console.error('Error getting budgets:', error);
    throw error;
  }
});

ipcMain.handle('budget:get-by-id', async (event, budgetId) => {
  try {
    return await budgetService.getBudgetById(db, budgetId);
  } catch (error) {
    console.error('Error getting budget:', error);
    throw error;
  }
});

ipcMain.handle('budget:create', async (event, budgetData) => {
  try {
    return await budgetService.createBudget(db, budgetData);
  } catch (error) {
    console.error('Error creating budget:', error);
    throw error;
  }
});

ipcMain.handle('budget:update', async (event, budgetId, budgetData) => {
  try {
    return await budgetService.updateBudget(db, budgetId, budgetData);
  } catch (error) {
    console.error('Error updating budget:', error);
    throw error;
  }
});

ipcMain.handle('budget:delete', async (event, budgetId) => {
  try {
    return await budgetService.deleteBudget(db, budgetId);
  } catch (error) {
    console.error('Error deleting budget:', error);
    throw error;
  }
});

ipcMain.handle('budget:get-summary', async (event, filters = {}) => {
  try {
    return await budgetService.getBudgetSummary(db, filters);
  } catch (error) {
    console.error('Error getting budget summary:', error);
    throw error;
  }
});

ipcMain.handle('budget:update-variance', async (event, budgetId) => {
  try {
    return await budgetService.updateBudgetVariance(db, budgetId);
  } catch (error) {
    console.error('Error updating budget variance:', error);
    throw error;
  }
});

ipcMain.handle('budget:get-alerts', async (event) => {
  try {
    return await budgetService.getBudgetAlerts(db);
  } catch (error) {
    console.error('Error getting budget alerts:', error);
    throw error;
  }
});

ipcMain.handle('budget:export', async (event, filters = {}) => {
  try {
    return await budgetService.exportBudgets(db, filters);
  } catch (error) {
    console.error('Error exporting budgets:', error);
    throw error;
  }
});

// ==================== VENDOR SERVICE HANDLERS ====================
ipcMain.handle('vendor:get-all', async (event, filters = {}) => {
  try {
    return await vendorService.getAllVendors(db, filters);
  } catch (error) {
    console.error('Error getting vendors:', error);
    throw error;
  }
});

ipcMain.handle('vendor:get-by-id', async (event, vendorId) => {
  try {
    return await vendorService.getVendorById(db, vendorId);
  } catch (error) {
    console.error('Error getting vendor:', error);
    throw error;
  }
});

ipcMain.handle('vendor:create', async (event, vendorData) => {
  try {
    return await vendorService.createVendor(db, vendorData);
  } catch (error) {
    console.error('Error creating vendor:', error);
    throw error;
  }
});

ipcMain.handle('vendor:update', async (event, vendorId, vendorData) => {
  try {
    return await vendorService.updateVendor(db, vendorId, vendorData);
  } catch (error) {
    console.error('Error updating vendor:', error);
    throw error;
  }
});

ipcMain.handle('vendor:delete', async (event, vendorId) => {
  try {
    return await vendorService.deleteVendor(db, vendorId);
  } catch (error) {
    console.error('Error deleting vendor:', error);
    throw error;
  }
});

ipcMain.handle('vendor:add-contact', async (event, vendorId, contactData) => {
  try {
    return await vendorService.addVendorContact(db, vendorId, contactData);
  } catch (error) {
    console.error('Error adding vendor contact:', error);
    throw error;
  }
});

ipcMain.handle('vendor:delete-contact', async (event, contactId) => {
  try {
    return await vendorService.deleteVendorContact(db, contactId);
  } catch (error) {
    console.error('Error deleting vendor contact:', error);
    throw error;
  }
});

ipcMain.handle('vendor:get-summary', async (event, filters = {}) => {
  try {
    return await vendorService.getVendorSummary(db, filters);
  } catch (error) {
    console.error('Error getting vendor summary:', error);
    throw error;
  }
});

ipcMain.handle('vendor:export', async (event, filters = {}) => {
  try {
    return await vendorService.exportVendors(db, filters);
  } catch (error) {
    console.error('Error exporting vendors:', error);
    throw error;
  }
});

// Purchase Order Handlers
ipcMain.handle('po:get-all', async (event, filters = {}) => {
  try {
    return await vendorService.getAllPurchaseOrders(db, filters);
  } catch (error) {
    console.error('Error getting purchase orders:', error);
    throw error;
  }
});

ipcMain.handle('po:get-by-id', async (event, poId) => {
  try {
    return await vendorService.getPurchaseOrderById(db, poId);
  } catch (error) {
    console.error('Error getting purchase order:', error);
    throw error;
  }
});

ipcMain.handle('po:create', async (event, poData) => {
  try {
    return await vendorService.createPurchaseOrder(db, poData);
  } catch (error) {
    console.error('Error creating purchase order:', error);
    throw error;
  }
});

ipcMain.handle('po:update', async (event, poId, poData) => {
  try {
    return await vendorService.updatePurchaseOrder(db, poId, poData);
  } catch (error) {
    console.error('Error updating purchase order:', error);
    throw error;
  }
});

ipcMain.handle('po:cancel', async (event, poId, reason) => {
  try {
    return await vendorService.cancelPurchaseOrder(db, poId, reason);
  } catch (error) {
    console.error('Error cancelling purchase order:', error);
    throw error;
  }
});

ipcMain.handle('po:receive', async (event, poId, items) => {
  try {
    return await vendorService.receivePurchaseOrderItems(db, poId, items);
  } catch (error) {
    console.error('Error receiving purchase order:', error);
    throw error;
  }
});

ipcMain.handle('po:get-vendor-summary', async (event, vendorId) => {
  try {
    return await vendorService.getVendorPurchaseSummary(db, vendorId);
  } catch (error) {
    console.error('Error getting vendor purchase summary:', error);
    throw error;
  }
});

// ==================== PROJECT SERVICE HANDLERS ====================
ipcMain.handle('project:get-all', async (event, filters = {}) => {
  try {
    return await projectService.getAllProjects(db, filters);
  } catch (error) {
    console.error('Error getting projects:', error);
    throw error;
  }
});

ipcMain.handle('project:get-by-id', async (event, projectId) => {
  try {
    return await projectService.getProjectById(db, projectId);
  } catch (error) {
    console.error('Error getting project:', error);
    throw error;
  }
});

ipcMain.handle('project:create', async (event, projectData) => {
  try {
    return await projectService.createProject(db, projectData);
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
});

ipcMain.handle('project:update', async (event, projectId, projectData) => {
  try {
    return await projectService.updateProject(db, projectId, projectData);
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
});

ipcMain.handle('project:delete', async (event, projectId) => {
  try {
    return await projectService.deleteProject(db, projectId);
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
});

ipcMain.handle('project:add-task', async (event, projectId, taskData) => {
  try {
    return await projectService.addTask(db, projectId, taskData);
  } catch (error) {
    console.error('Error adding task:', error);
    throw error;
  }
});

ipcMain.handle('project:update-task', async (event, taskId, taskData) => {
  try {
    return await projectService.updateTask(db, taskId, taskData);
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
});

ipcMain.handle('project:delete-task', async (event, taskId) => {
  try {
    return await projectService.deleteTask(db, taskId);
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
});

ipcMain.handle('project:add-time-entry', async (event, projectId, entryData) => {
  try {
    return await projectService.addTimeEntry(db, projectId, entryData);
  } catch (error) {
    console.error('Error adding time entry:', error);
    throw error;
  }
});

ipcMain.handle('project:delete-time-entry', async (event, entryId) => {
  try {
    return await projectService.deleteTimeEntry(db, entryId);
  } catch (error) {
    console.error('Error deleting time entry:', error);
    throw error;
  }
});

ipcMain.handle('project:add-expense', async (event, projectId, expenseData) => {
  try {
    return await projectService.addProjectExpense(db, projectId, expenseData);
  } catch (error) {
    console.error('Error adding project expense:', error);
    throw error;
  }
});

ipcMain.handle('project:delete-expense', async (event, expenseId) => {
  try {
    return await projectService.deleteProjectExpense(db, expenseId);
  } catch (error) {
    console.error('Error deleting project expense:', error);
    throw error;
  }
});

ipcMain.handle('project:add-milestone', async (event, projectId, milestoneData) => {
  try {
    return await projectService.addMilestone(db, projectId, milestoneData);
  } catch (error) {
    console.error('Error adding milestone:', error);
    throw error;
  }
});

ipcMain.handle('project:update-milestone', async (event, milestoneId, milestoneData) => {
  try {
    return await projectService.updateMilestone(db, milestoneId, milestoneData);
  } catch (error) {
    console.error('Error updating milestone:', error);
    throw error;
  }
});

ipcMain.handle('project:get-summary', async (event, filters = {}) => {
  try {
    return await projectService.getProjectSummary(db, filters);
  } catch (error) {
    console.error('Error getting project summary:', error);
    throw error;
  }
});

ipcMain.handle('project:get-dashboard', async (event) => {
  try {
    return await projectService.getProjectDashboard(db);
  } catch (error) {
    console.error('Error getting project dashboard:', error);
    throw error;
  }
});

ipcMain.handle('project:export', async (event, filters = {}) => {
  try {
    return await projectService.exportProjects(db, filters);
  } catch (error) {
    console.error('Error exporting projects:', error);
    throw error;
  }
});

// ==================== USER MANAGEMENT ====================
ipcMain.handle('auth:login', async (event, email, password) => {
  try {
    return await userService.authenticate(email, password);
  } catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
});

ipcMain.handle('auth:logout', async (event) => {
  try {
    return { success: true, message: 'Logged out successfully' };
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
});

ipcMain.handle('users:get-all', async (event) => {
  try {
    return await userService.getAllUsers();
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
});

ipcMain.handle('users:get-by-id', async (event, id) => {
  try {
    return await userService.getUserById(id);
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
});

ipcMain.handle('users:create', async (event, userData) => {
  try {
    return await userService.createUser(userData);
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
});

ipcMain.handle('users:update', async (event, id, updates) => {
  try {
    return await userService.updateUser(id, updates);
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
});

ipcMain.handle('users:delete', async (event, id) => {
  try {
    return await userService.deleteUser(id);
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
});

ipcMain.handle('users:get-roles', async (event) => {
  try {
    return await userService.getRoles();
  } catch (error) {
    console.error('Error getting roles:', error);
    throw error;
  }
});

ipcMain.handle('users:get-permissions', async (event, role) => {
  try {
    return await userService.getPermissions(role);
  } catch (error) {
    console.error('Error getting permissions:', error);
    throw error;
  }
});

ipcMain.handle('users:change-password', async (event, userId, oldPassword, newPassword) => {
  try {
    return await userService.changePassword(userId, oldPassword, newPassword);
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
});

ipcMain.handle('users:reset-password', async (event, id, newPassword) => {
  try {
    return await userService.resetPassword(id, newPassword);
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
});

ipcMain.handle('users:set-status', async (event, id, isActive) => {
  try {
    return await userService.setUserStatus(id, isActive);
  } catch (error) {
    console.error('Error setting user status:', error);
    throw error;
  }
});

// ==================== E-WAY BILL ====================
ipcMain.handle('ewaybill:create', async (event, ewaybillData) => {
  try {
    return await ewaybillService.createEwaybill(ewaybillData);
  } catch (error) {
    console.error('Error creating e-way bill:', error);
    throw error;
  }
});

ipcMain.handle('ewaybill:get-all', async (event, filters = {}) => {
  try {
    return await ewaybillService.getAllEwaybills(filters);
  } catch (error) {
    console.error('Error getting e-way bills:', error);
    throw error;
  }
});

ipcMain.handle('ewaybill:get-by-id', async (event, id) => {
  try {
    return await ewaybillService.getEwaybillById(id);
  } catch (error) {
    console.error('Error getting e-way bill:', error);
    throw error;
  }
});

ipcMain.handle('ewaybill:get-by-number', async (event, ewbNo) => {
  try {
    return await ewaybillService.getEwaybillByNumber(ewbNo);
  } catch (error) {
    console.error('Error getting e-way bill:', error);
    throw error;
  }
});

ipcMain.handle('ewaybill:update', async (event, id, updates) => {
  try {
    return await ewaybillService.updateEwaybill(id, updates);
  } catch (error) {
    console.error('Error updating e-way bill:', error);
    throw error;
  }
});

ipcMain.handle('ewaybill:cancel', async (event, id, reason) => {
  try {
    return await ewaybillService.cancelEwaybill(id, reason);
  } catch (error) {
    console.error('Error cancelling e-way bill:', error);
    throw error;
  }
});

ipcMain.handle('ewaybill:update-vehicle', async (event, id, vehicleData) => {
  try {
    return await ewaybillService.updateVehicle(id, vehicleData);
  } catch (error) {
    console.error('Error updating vehicle:', error);
    throw error;
  }
});

ipcMain.handle('ewaybill:generate-json', async (event, id) => {
  try {
    return await ewaybillService.generateJson(id);
  } catch (error) {
    console.error('Error generating JSON:', error);
    throw error;
  }
});

ipcMain.handle('ewaybill:get-stats', async (event) => {
  try {
    return await ewaybillService.getDashboardStats();
  } catch (error) {
    console.error('Error getting stats:', error);
    throw error;
  }
});

ipcMain.handle('ewaybill:get-hsn-codes', async (event) => {
  try {
    return await ewaybillService.getHsnCodes();
  } catch (error) {
    console.error('Error getting HSN codes:', error);
    throw error;
  }
});

ipcMain.handle('ewaybill:get-state-codes', async (event) => {
  try {
    return await ewaybillService.getStateCodes();
  } catch (error) {
    console.error('Error getting state codes:', error);
    throw error;
  }
});

// ==================== API GATEWAY ====================
ipcMain.handle('api-gateway:get-config', async (event) => {
  try {
    return await apiGatewayService.getConfig();
  } catch (error) {
    console.error('Error getting API config:', error);
    throw error;
  }
});

ipcMain.handle('api-gateway:update-config', async (event, config) => {
  try {
    return await apiGatewayService.updateConfig(config);
  } catch (error) {
    console.error('Error updating API config:', error);
    throw error;
  }
});

ipcMain.handle('api-gateway:generate-key', async (event, name, permissions) => {
  try {
    return await apiGatewayService.generateApiKey(name, permissions);
  } catch (error) {
    console.error('Error generating API key:', error);
    throw error;
  }
});

ipcMain.handle('api-gateway:get-keys', async (event) => {
  try {
    return await apiGatewayService.getApiKeys();
  } catch (error) {
    console.error('Error getting API keys:', error);
    throw error;
  }
});

ipcMain.handle('api-gateway:revoke-key', async (event, id) => {
  try {
    return await apiGatewayService.revokeApiKey(id);
  } catch (error) {
    console.error('Error revoking API key:', error);
    throw error;
  }
});

ipcMain.handle('api-gateway:validate-key', async (event, plainKey) => {
  try {
    return await apiGatewayService.validateApiKey(plainKey);
  } catch (error) {
    console.error('Error validating API key:', error);
    throw error;
  }
});

ipcMain.handle('api-gateway:create-webhook', async (event, webhookData) => {
  try {
    return await apiGatewayService.createWebhook(webhookData);
  } catch (error) {
    console.error('Error creating webhook:', error);
    throw error;
  }
});

ipcMain.handle('api-gateway:get-webhooks', async (event) => {
  try {
    return await apiGatewayService.getWebhooks();
  } catch (error) {
    console.error('Error getting webhooks:', error);
    throw error;
  }
});

ipcMain.handle('api-gateway:update-webhook', async (event, id, updates) => {
  try {
    return await apiGatewayService.updateWebhook(id, updates);
  } catch (error) {
    console.error('Error updating webhook:', error);
    throw error;
  }
});

ipcMain.handle('api-gateway:delete-webhook', async (event, id) => {
  try {
    return await apiGatewayService.deleteWebhook(id);
  } catch (error) {
    console.error('Error deleting webhook:', error);
    throw error;
  }
});

ipcMain.handle('api-gateway:test-webhook', async (event, id) => {
  try {
    return await apiGatewayService.testWebhook(id);
  } catch (error) {
    console.error('Error testing webhook:', error);
    throw error;
  }
});

ipcMain.handle('api-gateway:trigger-webhook', async (event, eventName, data) => {
  try {
    return await apiGatewayService.triggerWebhook(eventName, data);
  } catch (error) {
    console.error('Error triggering webhook:', error);
    throw error;
  }
});

ipcMain.handle('api-gateway:get-logs', async (event, limit) => {
  try {
    return await apiGatewayService.getLogs(limit);
  } catch (error) {
    console.error('Error getting logs:', error);
    throw error;
  }
});

ipcMain.handle('api-gateway:get-usage-stats', async (event) => {
  try {
    return await apiGatewayService.getUsageStats();
  } catch (error) {
    console.error('Error getting usage stats:', error);
    throw error;
  }
});

ipcMain.handle('api-gateway:get-endpoints', async (event) => {
  try {
    return await apiGatewayService.getApiEndpoints();
  } catch (error) {
    console.error('Error getting endpoints:', error);
    throw error;
  }
});

ipcMain.handle('api-gateway:save-oauth', async (event, provider, tokenData) => {
  try {
    return await apiGatewayService.saveOAuthToken(provider, tokenData);
  } catch (error) {
    console.error('Error saving OAuth token:', error);
    throw error;
  }
});

ipcMain.handle('api-gateway:get-oauth-status', async (event, provider) => {
  try {
    return await apiGatewayService.getOAuthStatus(provider);
  } catch (error) {
    console.error('Error getting OAuth status:', error);
    throw error;
  }
});

ipcMain.handle('api-gateway:disconnect-oauth', async (event, provider) => {
  try {
    return await apiGatewayService.disconnectOAuth(provider);
  } catch (error) {
    console.error('Error disconnecting OAuth:', error);
    throw error;
  }
});

// ==================== ANALYTICS ====================
ipcMain.handle('analytics:generate', async (event, filters = {}) => {
  try {
    // Get transactions from database
    let query = 'SELECT * FROM transactions WHERE is_cancelled = 0';
    const params = [];
    
    if (filters.fromDate) {
      query += ' AND date >= ?';
      params.push(filters.fromDate);
    }
    if (filters.toDate) {
      query += ' AND date <= ?';
      params.push(filters.toDate);
    }
    
    const transactions = db.prepare(query).all(...params);
    
    return await analyticsService.runFullAnalysis(transactions);
  } catch (error) {
    console.error('Error generating analytics:', error);
    throw error;
  }
});

ipcMain.handle('analytics:get-cached', async (event) => {
  try {
    return analyticsService.getCachedAnalysis();
  } catch (error) {
    console.error('Error getting cached analytics:', error);
    throw error;
  }
});

ipcMain.handle('analytics:clear-cache', async (event) => {
  try {
    return analyticsService.clearCache();
  } catch (error) {
    console.error('Error clearing analytics cache:', error);
    throw error;
  }
});

ipcMain.handle('analytics:cashflow-forecast', async (event, filters = {}) => {
  try {
    let query = 'SELECT * FROM transactions WHERE is_cancelled = 0';
    const params = [];
    
    if (filters.fromDate) {
      query += ' AND date >= ?';
      params.push(filters.fromDate);
    }
    if (filters.toDate) {
      query += ' AND date <= ?';
      params.push(filters.toDate);
    }
    
    const transactions = db.prepare(query).all(...params);
    return analyticsService.generateCashFlowForecast(transactions);
  } catch (error) {
    console.error('Error generating cash flow forecast:', error);
    throw error;
  }
});

ipcMain.handle('analytics:detect-anomalies', async (event, filters = {}) => {
  try {
    let query = 'SELECT * FROM transactions WHERE is_cancelled = 0';
    const params = [];
    
    if (filters.fromDate) {
      query += ' AND date >= ?';
      params.push(filters.fromDate);
    }
    if (filters.toDate) {
      query += ' AND date <= ?';
      params.push(filters.toDate);
    }
    
    const transactions = db.prepare(query).all(...params);
    return analyticsService.detectAnomalies(transactions);
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    throw error;
  }
});

// ==================== CURRENCY SERVICE ====================
ipcMain.handle('currency:initialize', async (event) => {
  try {
    return currencyService.initializeDatabase();
  } catch (error) {
    console.error('Error initializing currency database:', error);
    throw error;
  }
});

ipcMain.handle('currency:get-currencies', async (event) => {
  try {
    return currencyService.getCurrencies();
  } catch (error) {
    console.error('Error getting currencies:', error);
    throw error;
  }
});

ipcMain.handle('currency:get-currency', async (event, code) => {
  try {
    return currencyService.getCurrencyByCode(code);
  } catch (error) {
    console.error('Error getting currency:', error);
    throw error;
  }
});

ipcMain.handle('currency:add-currency', async (event, currency) => {
  try {
    return currencyService.addCurrency(currency);
  } catch (error) {
    console.error('Error adding currency:', error);
    throw error;
  }
});

ipcMain.handle('currency:update-exchange-rate', async (event, fromCurrency, toCurrency, rate) => {
  try {
    return currencyService.updateExchangeRate(fromCurrency, toCurrency, rate);
  } catch (error) {
    console.error('Error updating exchange rate:', error);
    throw error;
  }
});

ipcMain.handle('currency:get-exchange-rates', async (event) => {
  try {
    return currencyService.getExchangeRates();
  } catch (error) {
    console.error('Error getting exchange rates:', error);
    throw error;
  }
});

ipcMain.handle('currency:convert', async (event, amount, fromCurrency, toCurrency) => {
  try {
    return currencyService.convertCurrency(amount, fromCurrency, toCurrency);
  } catch (error) {
    console.error('Error converting currency:', error);
    throw error;
  }
});

ipcMain.handle('currency:record-transaction', async (event, transaction) => {
  try {
    return currencyService.recordTransaction(transaction);
  } catch (error) {
    console.error('Error recording transaction:', error);
    throw error;
  }
});

ipcMain.handle('currency:get-transactions', async (event, filters = {}) => {
  try {
    return currencyService.getTransactions(filters);
  } catch (error) {
    console.error('Error getting transactions:', error);
    throw error;
  }
});

ipcMain.handle('currency:get-transaction', async (event, id) => {
  try {
    return currencyService.getTransactionById(id);
  } catch (error) {
    console.error('Error getting transaction:', error);
    throw error;
  }
});

ipcMain.handle('currency:update-transaction', async (event, id, updates) => {
  try {
    return currencyService.updateTransaction(id, updates);
  } catch (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }
});

ipcMain.handle('currency:delete-transaction', async (event, id) => {
  try {
    return currencyService.deleteTransaction(id);
  } catch (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
});

ipcMain.handle('currency:get-consolidated-report', async (event, startDate, endDate, baseCurrency) => {
  try {
    return currencyService.getConsolidatedReport(startDate, endDate, baseCurrency);
  } catch (error) {
    console.error('Error getting consolidated report:', error);
    throw error;
  }
});

ipcMain.handle('currency:get-settings', async (event) => {
  try {
    return currencyService.getSettings();
  } catch (error) {
    console.error('Error getting settings:', error);
    throw error;
  }
});

ipcMain.handle('currency:update-settings', async (event, newSettings) => {
  try {
    return currencyService.updateSettings(newSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
});

ipcMain.handle('currency:fetch-live-rates', async (event) => {
  try {
    return await currencyService.fetchLiveRates();
  } catch (error) {
    console.error('Error fetching live rates:', error);
    throw error;
  }
});

// ==================== VOICE SERVICE ====================
ipcMain.handle('voice:initialize', async (event) => {
  try {
    return voiceService.initializeDatabase();
  } catch (error) {
    console.error('Error initializing voice database:', error);
    throw error;
  }
});

ipcMain.handle('voice:get-settings', async (event) => {
  try {
    return voiceService.getSettings();
  } catch (error) {
    console.error('Error getting voice settings:', error);
    throw error;
  }
});

ipcMain.handle('voice:update-settings', async (event, newSettings) => {
  try {
    return voiceService.updateSettings(newSettings);
  } catch (error) {
    console.error('Error updating voice settings:', error);
    throw error;
  }
});

ipcMain.handle('voice:get-supported-languages', async (event) => {
  try {
    return voiceService.getSupportedLanguages();
  } catch (error) {
    console.error('Error getting supported languages:', error);
    throw error;
  }
});

ipcMain.handle('voice:set-language-enabled', async (event, languageCode, enabled) => {
  try {
    return voiceService.setLanguageEnabled(languageCode, enabled);
  } catch (error) {
    console.error('Error setting language enabled:', error);
    throw error;
  }
});

ipcMain.handle('voice:get-accent-profiles', async (event) => {
  try {
    return voiceService.getAccentProfiles();
  } catch (error) {
    console.error('Error getting accent profiles:', error);
    throw error;
  }
});

ipcMain.handle('voice:save-accent-profile', async (event, userId, profileData) => {
  try {
    return voiceService.saveAccentProfile(userId, profileData);
  } catch (error) {
    console.error('Error saving accent profile:', error);
    throw error;
  }
});

ipcMain.handle('voice:get-accent-profile', async (event, userId) => {
  try {
    return voiceService.getAccentProfile(userId);
  } catch (error) {
    console.error('Error getting accent profile:', error);
    throw error;
  }
});

ipcMain.handle('voice:process-command', async (event, transcript, context) => {
  try {
    return voiceService.processCommand(transcript, context);
  } catch (error) {
    console.error('Error processing voice command:', error);
    throw error;
  }
});

ipcMain.handle('voice:get-transcription-history', async (event, limit) => {
  try {
    return voiceService.getTranscriptionHistory(limit);
  } catch (error) {
    console.error('Error getting transcription history:', error);
    throw error;
  }
});

ipcMain.handle('voice:clear-transcription-history', async (event) => {
  try {
    return voiceService.clearTranscriptionHistory();
  } catch (error) {
    console.error('Error clearing transcription history:', error);
    throw error;
  }
});

ipcMain.handle('voice:get-custom-phrases', async (event) => {
  try {
    return voiceService.getCustomPhrases();
  } catch (error) {
    console.error('Error getting custom phrases:', error);
    throw error;
  }
});

ipcMain.handle('voice:add-custom-phrase', async (event, phrase, command, language) => {
  try {
    return voiceService.addCustomPhrase(phrase, command, language);
  } catch (error) {
    console.error('Error adding custom phrase:', error);
    throw error;
  }
});

ipcMain.handle('voice:remove-custom-phrase', async (event, index) => {
  try {
    return voiceService.removeCustomPhrase(index);
  } catch (error) {
    console.error('Error removing custom phrase:', error);
    throw error;
  }
});

ipcMain.handle('voice:recognize-speech', async (event, audioData, config) => {
  try {
    return await voiceService.recognizeSpeech(audioData, config);
  } catch (error) {
    console.error('Error recognizing speech:', error);
    throw error;
  }
});

// ==================== SECURITY SERVICE ====================
ipcMain.handle('security:initialize', async (event) => {
  try {
    return securityService.initializeDatabase();
  } catch (error) {
    console.error('Error initializing security database:', error);
    throw error;
  }
});

ipcMain.handle('security:get-profile', async (event) => {
  try {
    return securityService.getSecurityProfile();
  } catch (error) {
    console.error('Error getting security profile:', error);
    throw error;
  }
});

ipcMain.handle('security:update-profile', async (event, updates) => {
  try {
    return securityService.updateSecurityProfile(updates);
  } catch (error) {
    console.error('Error updating security profile:', error);
    throw error;
  }
});

ipcMain.handle('security:generate-totp-secret', async (event, userEmail) => {
  try {
    return await securityService.generateTotpSecret(userEmail);
  } catch (error) {
    console.error('Error generating TOTP secret:', error);
    throw error;
  }
});

ipcMain.handle('security:verify-and-enable-totp', async (event, token, userEmail) => {
  try {
    return securityService.verifyAndEnableTotp(token, userEmail);
  } catch (error) {
    console.error('Error verifying and enabling TOTP:', error);
    throw error;
  }
});

ipcMain.handle('security:disable-totp', async (event, token) => {
  try {
    return securityService.disableTotp(token);
  } catch (error) {
    console.error('Error disabling TOTP:', error);
    throw error;
  }
});

ipcMain.handle('security:verify-totp', async (event, token) => {
  try {
    return securityService.verifyTotp(token);
  } catch (error) {
    console.error('Error verifying TOTP:', error);
    throw error;
  }
});

ipcMain.handle('security:get-sessions', async (event) => {
  try {
    return securityService.getActiveSessions();
  } catch (error) {
    console.error('Error getting sessions:', error);
    throw error;
  }
});

ipcMain.handle('security:create-session', async (event, sessionInfo) => {
  try {
    return securityService.createSession(sessionInfo);
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
});

ipcMain.handle('security:revoke-session', async (event, sessionId) => {
  try {
    return securityService.revokeSession(sessionId);
  } catch (error) {
    console.error('Error revoking session:', error);
    throw error;
  }
});

ipcMain.handle('security:revoke-all-other-sessions', async (event) => {
  try {
    return securityService.revokeAllOtherSessions();
  } catch (error) {
    console.error('Error revoking all sessions:', error);
    throw error;
  }
});

ipcMain.handle('security:get-activity-log', async (event, limit) => {
  try {
    return securityService.getActivityLog(limit);
  } catch (error) {
    console.error('Error getting activity log:', error);
    throw error;
  }
});

ipcMain.handle('security:get-recovery-codes', async (event) => {
  try {
    return securityService.getRecoveryCodes();
  } catch (error) {
    console.error('Error getting recovery codes:', error);
    throw error;
  }
});

// ==================== NOTIFICATION SERVICE ====================
ipcMain.handle('notification:initialize', async (event) => {
  try {
    return notificationService.initializeDatabase();
  } catch (error) {
    console.error('Error initializing notification database:', error);
    throw error;
  }
});

ipcMain.handle('notification:get-all', async (event, filters) => {
  try {
    return notificationService.getNotifications(filters);
  } catch (error) {
    console.error('Error getting notifications:', error);
    throw error;
  }
});

ipcMain.handle('notification:get-unread-count', async (event) => {
  try {
    return notificationService.getUnreadCount();
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
});

ipcMain.handle('notification:mark-read', async (event, notificationId) => {
  try {
    return notificationService.markAsRead(notificationId);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
});

ipcMain.handle('notification:delete', async (event, notificationId) => {
  try {
    return notificationService.deleteNotification(notificationId);
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
});

ipcMain.handle('notification:create', async (event, notification) => {
  try {
    return notificationService.createNotification(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
});

ipcMain.handle('notification:get-alert-rules', async (event) => {
  try {
    return notificationService.getAlertRules();
  } catch (error) {
    console.error('Error getting alert rules:', error);
    throw error;
  }
});

ipcMain.handle('notification:update-alert-rule', async (event, ruleId, updates) => {
  try {
    return notificationService.updateAlertRule(ruleId, updates);
  } catch (error) {
    console.error('Error updating alert rule:', error);
    throw error;
  }
});

ipcMain.handle('notification:toggle-alert-rule', async (event, ruleId) => {
  try {
    return notificationService.toggleAlertRule(ruleId);
  } catch (error) {
    console.error('Error toggling alert rule:', error);
    throw error;
  }
});

ipcMain.handle('notification:get-settings', async (event) => {
  try {
    return notificationService.getSettings();
  } catch (error) {
    console.error('Error getting notification settings:', error);
    throw error;
  }
});

ipcMain.handle('notification:update-settings', async (event, updates) => {
  try {
    return notificationService.updateSettings(updates);
  } catch (error) {
    console.error('Error updating notification settings:', error);
    throw error;
  }
});

ipcMain.handle('notification:poll-alerts', async (event) => {
  try {
    return notificationService.pollAlerts();
  } catch (error) {
    console.error('Error polling alerts:', error);
    throw error;
  }
});

// ==================== AI SERVICE ====================
ipcMain.handle('ai:initialize', async (event) => {
  try {
    return aiService.initializeAIService();
  } catch (error) {
    console.error('Error initializing AI service:', error);
    throw error;
  }
});

ipcMain.handle('ai:get-forecast', async (event, days = 30) => {
  try {
    return aiService.getCashFlowForecast(days);
  } catch (error) {
    console.error('Error getting cash flow forecast:', error);
    throw error;
  }
});

ipcMain.handle('ai:get-sales-prediction', async (event) => {
  try {
    return aiService.getSalesPrediction();
  } catch (error) {
    console.error('Error getting sales prediction:', error);
    throw error;
  }
});

ipcMain.handle('ai:get-expense-prediction', async (event) => {
  try {
    return aiService.getExpensePrediction();
  } catch (error) {
    console.error('Error getting expense prediction:', error);
    throw error;
  }
});

ipcMain.handle('ai:get-working-capital', async (event) => {
  try {
    return aiService.getWorkingCapitalAnalysis();
  } catch (error) {
    console.error('Error getting working capital analysis:', error);
    throw error;
  }
});

ipcMain.handle('ai:auto-categorize', async (event) => {
  try {
    return aiService.autoCategorizeTransactions();
  } catch (error) {
    console.error('Error auto-categorizing transactions:', error);
    throw error;
  }
});

ipcMain.handle('ai:apply-category', async (event, transactionId, category) => {
  try {
    return aiService.applyCategorySuggestion(transactionId, category);
  } catch (error) {
    console.error('Error applying category suggestion:', error);
    throw error;
  }
});

ipcMain.handle('ai:detect-anomalies', async (event) => {
  try {
    return aiService.detectAnomalies();
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    throw error;
  }
});

ipcMain.handle('ai:get-insights', async (event) => {
  try {
    return aiService.getAIInsights();
  } catch (error) {
    console.error('Error getting AI insights:', error);
    throw error;
  }
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

// ==================== ENCRYPTED EXPORT ====================
ipcMain.handle('export-encrypted', async (event, options) => {
  const { data, format, password, filename } = options;

  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  try {
    const crypto = require('crypto');
    const fs = require('fs');
    const archiver = require('archiver');

    // Generate encryption key from password
    const key = crypto.pbkdf2Sync(password, 'talk-to-accounts-salt', 100000, 32, 'sha512');
    const iv = crypto.randomBytes(16);

    // Create temporary file for unencrypted data
    const tempPath = path.join(app.getPath('temp'), `export_${Date.now()}.txt`);
    fs.writeFileSync(tempPath, data);

    // Create encrypted file path
    const ext = format === 'json' ? 'txt.enc' : format === 'csv' ? 'csv.enc' : 'pdf.enc';
    const encryptedPath = path.join(app.getPath('temp'), `encrypted_${Date.now()}.${ext}`);

    // Read file and encrypt
    const fileContent = fs.readFileSync(tempPath);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encryptedContent = Buffer.concat([cipher.update(fileContent), cipher.final()]);

    // Prepend IV to encrypted content (needed for decryption)
    const finalContent = Buffer.concat([iv, encryptedContent]);
    fs.writeFileSync(encryptedPath, finalContent);

    // Create password-protected ZIP using archiver with zip-encrypt
    const archivePath = path.join(app.getPath('downloads'), filename || `secure_export_${Date.now()}.zip`);

    // Use showSaveDialog to let user choose location
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save Encrypted Export',
      defaultPath: archivePath,
      filters: [
        { name: 'ZIP Files', extensions: ['zip'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (canceled || !filePath) {
      // Clean up temp files
      fs.unlinkSync(tempPath);
      fs.unlinkSync(encryptedPath);
      return { success: false, canceled: true };
    }

    // Create archive with password
    const output = fs.createWriteStream(filePath);
    const archive = archiver('zip', {
      zlib: { level: 9 },
      encryptionMethod: 'aes256',
      password: password
    });

    archive.pipe(output);

    // Add encrypted data file to archive
    const dataFilename = `data_${Date.now()}.${format}`;
    archive.append(fs.createReadStream(encryptedPath), { name: dataFilename });

    // Add readme with instructions
    const readmeContent = `SECURE EXPORT FILE
===================
Generated: ${new Date().toISOString()}
Format: ${format.toUpperCase()}
Encryption: AES-256-CBC

INSTRUCTIONS:
1. This file is password protected
2. Use your export password to extract
3. Extract the .enc file and decrypt using the provided decryption tool

WARNING: Do not share this file or password with unauthorized users.

Generated by Talk to Your Accounts
`;

    archive.append(readmeContent, { name: 'README.txt' });

    await archive.finalize();

    // Clean up temp files
    fs.unlinkSync(tempPath);
    fs.unlinkSync(encryptedPath);

    logAudit( 'EXPORT', 'encrypted', null, null, { format, filename }, 'Encrypted data export completed');

    return {
      success: true,
      path: filePath,
      size: fs.statSync(filePath).size
    };
  } catch (error) {
    console.error('Encrypted export error:', error);
    throw new Error('Export failed: ' + error.message);
  }
});

ipcMain.handle('decrypt-data', async (event, options) => {
  const { filePath, password } = options;

  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  try {
    const crypto = require('crypto');
    const fs = require('fs');
    const path = require('path');
    const extract = require('extract-zip');

    // Create temp directory
    const tempDir = path.join(app.getPath('temp'), `decrypt_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Extract ZIP with password
    await extract(filePath, { dir: tempDir, password: password });

    // Find the encrypted file
    const files = fs.readdirSync(tempDir);
    const encFile = files.find(f => f.endsWith('.enc'));

    if (!encFile) {
      throw new Error('Encrypted file not found in archive');
    }

    // Read and decrypt
    const encryptedContent = fs.readFileSync(path.join(tempDir, encFile));
    const iv = encryptedContent.slice(0, 16);
    const encryptedData = encryptedContent.slice(16);

    // Derive key from password
    const key = crypto.pbkdf2Sync(password, 'talk-to-accounts-salt', 100000, 32, 'sha512');

    // Decrypt
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decryptedContent = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

    // Return the decrypted data
    const result = decryptedContent.toString('utf8');

    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('Decrypt error:', error);
    throw new Error('Decryption failed: ' + (error.message || 'Invalid password or corrupted file'));
  }
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
    
    logAudit( 'IMPORT', 'system', null, null, { count: imported }, 'Data import completed');
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

// ==================== AUTHENTICATION ====================
ipcMain.handle('get-users', () => {
  try {
    const users = db.prepare('SELECT id, username, role, is_active, failed_attempts, locked_until, created_at, last_login FROM users').all();
    return { users };
  } catch (error) {
    // If users table doesn't exist, return empty
    return { users: [] };
  }
});

ipcMain.handle('create-user', (event, userData) => {
  const { username, pin, role } = userData;
  
  if (!username || username.length < 3) {
    throw new Error('Username must be at least 3 characters');
  }
  
  if (!/^\d{4}$/.test(pin)) {
    throw new Error('PIN must be exactly 4 digits');
  }
  
  // Check if user already exists
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    throw new Error('Username already exists');
  }
  
  // Hash the PIN
  const { hash, salt } = hashPin(pin);
  
  // Insert user
  const stmt = db.prepare(`
    INSERT INTO users (username, pin_hash, pin_salt, role)
    VALUES (?, ?, ?, ?)
  `);
  
  const result = stmt.run(username, hash, salt, role || 'editor');
  
  logAudit( 'CREATE', 'users', result.lastInsertRowid, null, { username, role }, `Created user: ${username}`);
  
  return { 
    success: true, 
    user: { id: result.lastInsertRowid, username, role } 
  };
});

ipcMain.handle('authenticate', (event, username, pin) => {
  if (!username || !pin) {
    return { success: false, error: 'INVALID_CREDENTIALS', message: 'Username and PIN are required' };
  }
  
  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    
    if (!user) {
      return { success: false, error: 'USER_NOT_FOUND', message: 'User not found' };
    }
    
    if (!user.is_active) {
      return { success: false, error: 'ACCOUNT_DISABLED', message: 'Account is disabled' };
    }
    
    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remaining = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return { 
        success: false, 
        error: 'ACCOUNT_LOCKED', 
        message: `Account locked. Try again in ${remaining} minutes` 
      };
    }
    
    // Verify PIN
    if (!verifyPin(pin, user.pin_hash, user.pin_salt)) {
      // Increment failed attempts
      const failedAttempts = (user.failed_attempts || 0) + 1;
      let lockedUntil = null;
      
      // Lock account after 5 failed attempts for 30 minutes
      if (failedAttempts >= 5) {
        lockedUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?')
          .run(failedAttempts, lockedUntil, user.id);
        
        logAudit( 'SECURITY', 'users', user.id, { failed_attempts: failedAttempts - 1 }, 
          { failed_attempts, locked_until: lockedUntil }, `Account locked due to failed login attempts`);
        
        return { 
          success: false, 
          error: 'ACCOUNT_LOCKED', 
          message: 'Account locked due to too many failed attempts. Try again in 30 minutes.' 
        };
      }
      
      db.prepare('UPDATE users SET failed_attempts = ? WHERE id = ?').run(failedAttempts, user.id);
      
      logAudit( 'LOGIN_FAILED', 'users', user.id, null, { failed_attempts }, `Failed login attempt for ${username}`);
      
      return { 
        success: false, 
        error: 'INVALID_PIN', 
        message: `Invalid PIN. ${5 - failedAttempts} attempts remaining.` 
      };
    }
    
    // Successful login - reset failed attempts and update last login
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
    
    db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP WHERE id = ?')
      .run(user.id);
    
    // Create session
    db.prepare(`
      INSERT INTO sessions (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `).run(user.id, sessionToken, expiresAt);
    
    // Clean up expired sessions
    db.prepare('DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP OR is_active = 0').run();
    
    logAudit( 'LOGIN', 'users', user.id, null, { session_created: true }, `User ${username} logged in`);
    
    return {
      success: true,
      session: {
        token: sessionToken,
        userId: user.id,
        username: user.username,
        role: user.role,
        expiresAt
      }
    };
  } catch (error) {
    console.error('Auth error:', error);
    return { success: false, error: 'AUTH_ERROR', message: 'Authentication failed' };
  }
});

ipcMain.handle('logout', (event, sessionToken) => {
  try {
    if (sessionToken) {
      db.prepare('UPDATE sessions SET is_active = 0 WHERE token = ?').run(sessionToken);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: 'LOGOUT_FAILED' };
  }
});

ipcMain.handle('update-user-pin', (event, userId, oldPin, newPin) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  if (!verifyPin(oldPin, user.pin_hash, user.pin_salt)) {
    return { success: false, error: 'INVALID_OLD_PIN' };
  }
  
  const { hash, salt } = hashPin(newPin);
  
  db.prepare('UPDATE users SET pin_hash = ?, pin_salt = ? WHERE id = ?').run(hash, salt, userId);
  
  logAudit( 'UPDATE', 'users', userId, null, { pin_changed: true }, `PIN changed for user ${user.username}`);
  
  return { success: true };
});

ipcMain.handle('delete-user', (event, userId) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Soft delete - deactivate user
  db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(userId);
  
  // Invalidate all sessions for this user
  db.prepare('UPDATE sessions SET is_active = 0 WHERE user_id = ?').run(userId);
  
  logAudit( 'DELETE', 'users', userId, { is_active: 1 }, { is_active: 0 }, `Deactivated user ${user.username}`);
  
  return { success: true };
});

// ==================== GST REMINDERS ====================
ipcMain.handle('get-gst-reminders', () => {
  return db.prepare('SELECT * FROM gst_reminders ORDER BY due_date ASC').all();
});

ipcMain.handle('create-gst-reminder', (event, reminder) => {
  const stmt = db.prepare(`
    INSERT INTO gst_reminders (reminder_type, period, due_date, status, notes)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    reminder.reminder_type,
    reminder.period,
    reminder.due_date,
    reminder.status || 'pending',
    reminder.notes || null
  );
  
  logAudit( 'CREATE', 'gst_reminders', result.lastInsertRowid, null, reminder, `Created GST reminder: ${reminder.reminder_type}`);
  
  return result.lastInsertRowid;
});

ipcMain.handle('update-gst-reminder', (event, id, updates) => {
  db.prepare(`
    UPDATE gst_reminders SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(updates.status, updates.notes || null, id);
  
  return true;
});

ipcMain.handle('delete-gst-reminder', (event, id) => {
  db.prepare('DELETE FROM gst_reminders WHERE id = ?').run(id);
  return true;
});

// ==================== BANK RECONCILIATION ====================
ipcMain.handle('get-bank-statements', (event, filters = {}) => {
  let query = 'SELECT * FROM bank_statements ORDER BY uploaded_at DESC';
  const params = [];

  if (filters.status) {
    query = 'SELECT * FROM bank_statements WHERE status = ? ORDER BY uploaded_at DESC';
    params.push(filters.status);
  }

  return db.prepare(query).all(...params);
});

ipcMain.handle('get-bank-statement-by-id', (event, id) => {
  const statement = db.prepare('SELECT * FROM bank_statements WHERE id = ?').get(id);
  if (statement) {
    statement.transactions = db.prepare('SELECT * FROM bank_transactions WHERE bank_statement_id = ? ORDER BY date').all(id);
  }
  return statement;
});

ipcMain.handle('create-bank-statement', (event, data) => {
  const stmt = db.prepare(`
    INSERT INTO bank_statements (bank_name, account_number, statement_period, file_path, created_by)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.bank_name,
    data.account_number || null,
    data.statement_period || null,
    data.file_path || null,
    data.created_by || 'system'
  );

  logAudit( 'CREATE', 'bank_statements', result.lastInsertRowid, null, data, `Created bank statement record for ${data.bank_name}`);

  return result.lastInsertRowid;
});

ipcMain.handle('add-bank-transaction', (event, data) => {
  const stmt = db.prepare(`
    INSERT INTO bank_transactions (bank_statement_id, date, description, amount, type, reference_no)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.bank_statement_id,
    data.date,
    data.description || null,
    data.amount,
    data.type,
    data.reference_no || null
  );

  return result.lastInsertRowid;
});

ipcMain.handle('process-bank-statement', (event, id) => {
  // Get all unmatched bank transactions
  const bankTxns = db.prepare(`
    SELECT * FROM bank_transactions
    WHERE bank_statement_id = ? AND matched = 0
    ORDER BY date
  `).all(id);

  let matched = 0;
  let unmatched = 0;

  for (const txn of bankTxns) {
    // Try to find matching transaction based on amount and date proximity
    const tolerance = 2; // 2 days tolerance
    const startDate = new Date(txn.date);
    startDate.setDate(startDate.getDate() - tolerance);
    const endDate = new Date(txn.date);
    endDate.setDate(endDate.getDate() + tolerance);

    const matches = db.prepare(`
      SELECT * FROM transactions
      WHERE ABS(total_amount - ?) < 1
      AND date BETWEEN ? AND ?
      AND is_cancelled = 0
      AND matched = 0
      ORDER BY ABS(total_amount - ?)
      LIMIT 1
    `).all(txn.amount, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0], txn.amount);

    if (matches.length > 0) {
      const match = matches[0];
      db.prepare('UPDATE bank_transactions SET matched = 1, transaction_id = ? WHERE id = ?').run(match.id, txn.id);
      db.prepare('UPDATE transactions SET is_matched = 1 WHERE id = ?').run(match.id);
      matched++;
    } else {
      unmatched++;
    }
  }

  // Update statement status
  db.prepare(`
    UPDATE bank_statements
    SET status = 'processed', processed_at = CURRENT_TIMESTAMP, total_transactions = ?, matched_count = ?, unmatched_count = ?
    WHERE id = ?
  `).run(bankTxns.length, matched, unmatched, id);

  logAudit( 'PROCESS', 'bank_statements', id, null, { matched, unmatched }, `Processed bank statement with ${matched} matches`);

  return { matched, unmatched };
});

ipcMain.handle('get-unreconciled-transactions', () => {
  return db.prepare(`
    SELECT t.*, p.name as party_name
    FROM transactions t
    LEFT JOIN parties p ON t.party_id = p.id
    WHERE t.is_cancelled = 0 AND (t.is_matched IS NULL OR t.is_matched = 0)
    AND t.payment_status != 'paid'
    ORDER BY t.date DESC
  `).all();
});

ipcMain.handle('reconcile-transaction', (event, transactionId, bankTxnId) => {
  db.prepare('UPDATE transactions SET is_matched = 1 WHERE id = ?').run(transactionId);
  db.prepare('UPDATE bank_transactions SET matched = 1, transaction_id = ? WHERE id = ?').run(transactionId, bankTxnId);

  logAudit( 'RECONCILE', 'transactions', transactionId, null, { bank_txn_id: bankTxnId }, 'Manual reconciliation completed');

  return true;
});

// ==================== VOICE RECONCILIATION ====================
ipcMain.handle('voice-search-party', (event, query) => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const searchTerm = `%${query}%`;
  const parties = db.prepare(`
    SELECT id, name, type, gstin, phone, email, opening_balance, balance_type
    FROM parties
    WHERE is_active = 1 AND (name LIKE ? OR gstin LIKE ? OR phone LIKE ?)
    ORDER BY name
    LIMIT 10
  `).all(searchTerm, searchTerm, searchTerm);

  return parties;
});

ipcMain.handle('voice-search-transactions', (event, criteria) => {
  const { amount, partyId, date, tolerance = 10 } = criteria;
  let query = `
    SELECT t.*, p.name as party_name, p.gstin as party_gstin
    FROM transactions t
    LEFT JOIN parties p ON t.party_id = p.id
    WHERE t.is_cancelled = 0
  `;
  const params = [];

  if (amount) {
    const minAmount = amount * (1 - tolerance / 100);
    const maxAmount = amount * (1 + tolerance / 100);
    query += ' AND t.total_amount BETWEEN ? AND ?';
    params.push(minAmount, maxAmount);
  }

  if (partyId) {
    query += ' AND t.party_id = ?';
    params.push(partyId);
  }

  if (date) {
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 7);
    query += ' AND t.date BETWEEN ? AND ?';
    params.push(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
  }

  query += ' ORDER BY t.date DESC LIMIT 20';

  return db.prepare(query).all(...params);
});

ipcMain.handle('voice-reconcile-by-amount', (event, data) => {
  const { amount, partyName, date, description } = data;

  // First, try to find the party
  let partyId = null;
  if (partyName) {
    const party = db.prepare(`
      SELECT id FROM parties
      WHERE is_active = 1 AND name LIKE ?
      ORDER BY CASE WHEN name = ? THEN 0 ELSE 1 END
      LIMIT 1
    `).get(`%${partyName}%`, partyName);
    partyId = party?.id;
  }

  // Search for matching transactions
  const criteria = { amount, partyId, date, tolerance: 5 };
  const transactions = db.prepare(`
    SELECT t.*, p.name as party_name, p.gstin as party_gstin
    FROM transactions t
    LEFT JOIN parties p ON t.party_id = p.id
    WHERE t.is_cancelled = 0
    AND ABS(t.total_amount - ?) < ?
    ${partyId ? 'AND t.party_id = ?' : ''}
    ${date ? "AND t.date BETWEEN date(?, '-7 days') AND date(?, '+7 days')" : ''}
    AND (t.payment_status IS NULL OR t.payment_status != 'paid')
    ORDER BY ABS(t.total_amount - ?) ASC
    LIMIT 10
  `).all(
    amount,
    amount * 0.05,
    ...(partyId ? [partyId] : []),
    ...(date ? [date, date] : []),
    amount
  );

  return {
    matches: transactions,
    count: transactions.length,
    partyFound: !!partyId
  };
});

ipcMain.handle('voice-create-payment', (event, data) => {
  const { transactionId, amount, method, reference, partyId } = data;

  try {
    // Create payment record
    const stmt = db.prepare(`
      INSERT INTO payments (transaction_id, party_id, amount, method, reference, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      transactionId,
      partyId || null,
      amount,
      method || 'cash',
      reference || null,
      'Voice-initiated payment via reconciliation'
    );

    // Update transaction payment status
    if (transactionId) {
      const totalPaid = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE transaction_id = ?')
        .get(transactionId);
      const transaction = db.prepare('SELECT total_amount FROM transactions WHERE id = ?').get(transactionId);

      let status = 'pending';
      if (totalPaid.total >= transaction.total_amount) {
        status = 'paid';
      } else if (totalPaid.total > 0) {
        status = 'partial';
      }

      db.prepare('UPDATE transactions SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(status, transactionId);
    }

    logAudit( 'CREATE', 'payments', result.lastInsertRowid, null, data, 'Voice-initiated payment');

    return { success: true, paymentId: result.lastInsertRowid };
  } catch (error) {
    console.error('Voice payment error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('voice-get-party-balance', (event, partyId) => {
  const party = db.prepare('SELECT * FROM parties WHERE id = ?').get(partyId);
  if (!party) throw new Error('Party not found');

  const sales = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as total FROM transactions
    WHERE party_id = ? AND voucher_type = 'sale' AND is_cancelled = 0
  `).get(partyId);

  const payments = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM payments
    WHERE party_id = ?
  `).get(partyId);

  const openingBalance = party.opening_balance * (party.balance_type === 'receivable' ? 1 : -1);
  const currentBalance = openingBalance + sales.total - payments.total;

  return {
    party,
    opening_balance: openingBalance,
    total_sales: sales.total,
    total_received: payments.total,
    current_balance: currentBalance,
    payment_status: currentBalance <= 0 ? 'paid' : currentBalance < openingBalance + sales.total ? 'partial' : 'pending'
  };
});

// ==================== VOICE RECONCILIATION COMMAND HANDLERS ====================

// Reconcile a single transaction
ipcMain.handle('reconciliation:reconcile-single', (event, data) => {
  try {
    const { amount, party_id, party_name, transaction_id, reference, tolerance } = data;
    
    // Find matching transactions
    let query = `
      SELECT t.*, p.name as party_name, p.gstin as party_gstin
      FROM transactions t
      LEFT JOIN parties p ON t.party_id = p.id
      WHERE t.is_cancelled = 0
      AND ABS(t.total_amount - ?) < ?
      AND (t.payment_status IS NULL OR t.payment_status != 'paid')
    `;
    const params = [amount, tolerance || 1];

    if (party_id) {
      query += ' AND t.party_id = ?';
      params.push(party_id);
    }

    if (transaction_id) {
      query += ' AND t.id = ?';
      params.push(transaction_id);
    }

    query += ' ORDER BY t.date DESC LIMIT 5';

    const matches = db.prepare(query).all(...params);

    if (matches.length === 0) {
      return { success: false, error: 'No matching transaction found' };
    }

    // Use the first/best match
    const match = matches[0];

    // Mark as matched
    db.prepare('UPDATE transactions SET is_matched = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(match.id);

    logAudit( 'RECONCILE', 'transactions', match.id, null, { 
      amount, 
      party_name, 
      matched_via: 'voice' 
    }, `Voice reconciliation: reconciled transaction ${match.voucher_no}`);

    return {
      success: true,
      data: {
        transaction: match,
        matched: true,
        amount: amount
      }
    };
  } catch (error) {
    console.error('Reconcile single error:', error);
    return { success: false, error: error.message };
  }
});

// Reconcile all pending transactions
ipcMain.handle('reconciliation:reconcile-all', (event, data) => {
  try {
    const { party_id, date, auto_match_only } = data;

    let query = `
      SELECT t.*, p.name as party_name
      FROM transactions t
      LEFT JOIN parties p ON t.party_id = p.id
      WHERE t.is_cancelled = 0
      AND (t.payment_status IS NULL OR t.payment_status != 'paid')
      AND (t.is_matched IS NULL OR t.is_matched = 0)
    `;
    const params = [];

    if (party_id) {
      query += ' AND t.party_id = ?';
      params.push(party_id);
    }

    if (date) {
      query += ' AND t.date = ?';
      params.push(date);
    }

    const unreconciled = db.prepare(query).all(...params);

    let reconciledCount = 0;
    if (!auto_match_only) {
      for (const txn of unreconciled) {
        db.prepare('UPDATE transactions SET is_matched = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(txn.id);
        reconciledCount++;
      }
    } else {
      reconciledCount = unreconciled.length;
    }

    logAudit( 'RECONCILE', 'transactions', null, null, { 
      count: reconciledCount, 
      party_id, 
      date,
      auto_match_only 
    }, `Voice batch reconciliation: ${reconciledCount} transactions`);

    return {
      success: true,
      data: {
        unreconciled_count: unreconciled.length,
        reconciled_count: reconciledCount,
        transactions: unreconciled
      }
    };
  } catch (error) {
    console.error('Reconcile all error:', error);
    return { success: false, error: error.message };
  }
});

// Reconcile transactions for a specific party
ipcMain.handle('reconciliation:reconcile-by-party', (event, data) => {
  try {
    const { party_id, party_name } = data;

    // First try to find the party
    let party = null;
    if (party_id) {
      party = db.prepare('SELECT * FROM parties WHERE id = ? AND is_active = 1').get(party_id);
    } else if (party_name) {
      party = db.prepare(`
        SELECT * FROM parties 
        WHERE is_active = 1 AND name LIKE ?
        ORDER BY CASE WHEN name = ? THEN 0 ELSE 1 END
        LIMIT 1
      `).get(`%${party_name}%`, party_name);
    }

    if (!party) {
      return { success: false, error: 'Party not found' };
    }

    // Get unreconciled transactions for this party
    const transactions = db.prepare(`
      SELECT t.*, p.name as party_name
      FROM transactions t
      LEFT JOIN parties p ON t.party_id = p.id
      WHERE t.party_id = ? AND t.is_cancelled = 0
      AND (t.payment_status IS NULL OR t.payment_status != 'paid')
      AND (t.is_matched IS NULL OR t.is_matched = 0)
      ORDER BY t.date DESC
    `).all(party.id);

    // Mark all as reconciled
    for (const txn of transactions) {
      db.prepare('UPDATE transactions SET is_matched = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(txn.id);
    }

    const totalAmount = transactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);

    logAudit( 'RECONCILE', 'transactions', party.id, null, { 
      party_name: party.name,
      count: transactions.length,
      total_amount: totalAmount 
    }, `Voice reconciliation by party: ${party.name}`);

    return {
      success: true,
      data: {
        party,
        transactions,
        count: transactions.length,
        total_amount: totalAmount
      }
    };
  } catch (error) {
    console.error('Reconcile by party error:', error);
    return { success: false, error: error.message };
  }
});

// Reconcile transactions for a specific date
ipcMain.handle('reconciliation:reconcile-by-date', (event, data) => {
  try {
    const { date } = data;

    if (!date) {
      return { success: false, error: 'Date is required' };
    }

    // Get unreconciled transactions for this date
    const transactions = db.prepare(`
      SELECT t.*, p.name as party_name
      FROM transactions t
      LEFT JOIN parties p ON t.party_id = p.id
      WHERE t.date = ? AND t.is_cancelled = 0
      AND (t.payment_status IS NULL OR t.payment_status != 'paid')
      AND (t.is_matched IS NULL OR t.is_matched = 0)
      ORDER BY t.created_at DESC
    `).all(date);

    // Mark all as reconciled
    for (const txn of transactions) {
      db.prepare('UPDATE transactions SET is_matched = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(txn.id);
    }

    const totalAmount = transactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);

    logAudit( 'RECONCILE', 'transactions', null, null, { 
      date,
      count: transactions.length,
      total_amount: totalAmount 
    }, `Voice reconciliation by date: ${date}`);

    return {
      success: true,
      data: {
        date,
        transactions,
        count: transactions.length,
        total_amount: totalAmount
      }
    };
  } catch (error) {
    console.error('Reconcile by date error:', error);
    return { success: false, error: error.message };
  }
});

// Mark a transaction as reconciled
ipcMain.handle('reconciliation:mark-reconciled', (event, data) => {
  try {
    const { transaction_id } = data;

    if (!transaction_id) {
      return { success: false, error: 'Transaction ID is required' };
    }

    const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(transaction_id);
    if (!transaction) {
      return { success: false, error: 'Transaction not found' };
    }

    db.prepare('UPDATE transactions SET is_matched = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(transaction_id);

    logAudit( 'RECONCILE', 'transactions', transaction_id, null, null, 'Voice: marked as reconciled');

    return {
      success: true,
      data: { id: transaction_id, is_matched: 1 }
    };
  } catch (error) {
    console.error('Mark reconciled error:', error);
    return { success: false, error: error.message };
  }
});

// Unreconcile a transaction
ipcMain.handle('reconciliation:unreconcile', (event, data) => {
  try {
    const { transaction_id } = data;

    if (!transaction_id) {
      return { success: false, error: 'Transaction ID is required' };
    }

    const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(transaction_id);
    if (!transaction) {
      return { success: false, error: 'Transaction not found' };
    }

    db.prepare('UPDATE transactions SET is_matched = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(transaction_id);

    logAudit( 'UNRECONCILE', 'transactions', transaction_id, null, null, 'Voice: unreconciled transaction');

    return {
      success: true,
      data: { id: transaction_id, is_matched: 0 }
    };
  } catch (error) {
    console.error('Unreconcile error:', error);
    return { success: false, error: error.message };
  }
});

// Get reconciled transactions
ipcMain.handle('reconciliation:get-reconciled', (event, data) => {
  try {
    const { party_id, date, limit = 50 } = data;

    let query = `
      SELECT t.*, p.name as party_name, p.gstin as party_gstin
      FROM transactions t
      LEFT JOIN parties p ON t.party_id = p.id
      WHERE t.is_cancelled = 0 AND t.is_matched = 1
    `;
    const params = [];

    if (party_id) {
      query += ' AND t.party_id = ?';
      params.push(party_id);
    }

    if (date) {
      query += ' AND t.date = ?';
      params.push(date);
    }

    query += ' ORDER BY t.date DESC LIMIT ?';
    params.push(limit);

    const transactions = db.prepare(query).all(...params);

    const totalAmount = transactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);

    return {
      success: true,
      data: {
        transactions,
        count: transactions.length,
        total_amount: totalAmount
      }
    };
  } catch (error) {
    console.error('Get reconciled error:', error);
    return { success: false, error: error.message };
  }
});

// Get reconciliation summary
ipcMain.handle('reconciliation:get-summary', (event, data) => {
  try {
    const { period } = data;
    
    let startDate = new Date();
    if (period === 'today') {
      startDate = new Date();
    } else if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else {
      startDate.setDate(startDate.getDate() - 30);
    }
    startDate = startDate.toISOString().split('T')[0];

    const reconciled = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
      FROM transactions
      WHERE is_matched = 1 AND is_cancelled = 0 AND date >= ?
    `).get(startDate);

    const unreconciled = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
      FROM transactions
      WHERE (is_matched IS NULL OR is_matched = 0) AND is_cancelled = 0
      AND (payment_status IS NULL OR payment_status != 'paid')
      AND date >= ?
    `).get(startDate);

    const total = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
      FROM transactions
      WHERE is_cancelled = 0 AND date >= ?
    `).get(startDate);

    const reconciliationRate = total.count > 0 ? (reconciled.count / total.count * 100) : 0;

    return {
      success: true,
      data: {
        period: { start: startDate, end: new Date().toISOString().split('T')[0] },
        reconciled: { count: reconciled.count, total: reconciled.total },
        unreconciled: { count: unreconciled.count, total: unreconciled.total },
        total: { count: total.count, total: total.total },
        reconciliation_rate: reconciliationRate.toFixed(1)
      }
    };
  } catch (error) {
    console.error('Get summary error:', error);
    return { success: false, error: error.message };
  }
});

// Get reconciliation status
ipcMain.handle('reconciliation:get-status', (event, data) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const todayReconciled = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
      FROM transactions
      WHERE is_matched = 1 AND is_cancelled = 0 AND date = ?
    `).get(today);

    const todayUnreconciled = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
      FROM transactions
      WHERE (is_matched IS NULL OR is_matched = 0) AND is_cancelled = 0
      AND (payment_status IS NULL OR payment_status != 'paid')
      AND date = ?
    `).get(today);

    const weekReconciled = db.prepare(`
      SELECT COUNT(*) as count FROM transactions
      WHERE is_matched = 1 AND is_cancelled = 0
      AND date >= date(?, '-7 days')
    `).get(today);

    return {
      success: true,
      data: {
        today: {
          reconciled: { count: todayReconciled.count, total: todayReconciled.total },
          unreconciled: { count: todayUnreconciled.count, total: todayUnreconciled.total }
        },
        this_week: { reconciled_count: weekReconciled.count },
        last_updated: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Get status error:', error);
    return { success: false, error: error.message };
  }
});

// Compare bank and party balances
ipcMain.handle('reconciliation:compare-balances', (event, data) => {
  try {
    const { party_id } = data;

    let parties = [];
    if (party_id) {
      const party = db.prepare('SELECT * FROM parties WHERE id = ? AND is_active = 1').get(party_id);
      if (party) parties = [party];
    } else {
      parties = db.prepare('SELECT * FROM parties WHERE is_active = 1 ORDER BY name').all();
    }

    const comparisons = [];
    for (const party of parties) {
      // Get party balance
      const sales = db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total FROM transactions
        WHERE party_id = ? AND voucher_type = 'sale' AND is_cancelled = 0
      `).get(party.id);

      const payments = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total FROM payments
        WHERE party_id = ?
      `).get(party.id);

      const openingBalance = party.opening_balance * (party.balance_type === 'receivable' ? 1 : -1);
      const partyBalance = openingBalance + sales.total - payments.total;

      comparisons.push({
        party: { id: party.id, name: party.name, type: party.type },
        party_balance: partyBalance,
        opening_balance: openingBalance,
        total_sales: sales.total,
        total_received: payments.total
      });
    }

    return {
      success: true,
      data: {
        comparisons,
        count: comparisons.length,
        total_party_receivable: comparisons
          .filter(c => c.party.type === 'customer')
          .reduce((sum, c) => sum + Math.max(0, c.party_balance), 0),
        total_party_payable: comparisons
          .filter(c => c.party.type === 'vendor')
          .reduce((sum, c) => sum + Math.max(0, -c.party_balance), 0)
      }
    };
  } catch (error) {
    console.error('Compare balances error:', error);
    return { success: false, error: error.message };
  }
});

// Get difference between bank and ledger
ipcMain.handle('reconciliation:get-difference', (event, data) => {
  try {
    const { party_id, date } = data;

    // Get unreconciled transactions (ledger side)
    let ledgerQuery = `
      SELECT t.*, p.name as party_name
      FROM transactions t
      LEFT JOIN parties p ON t.party_id = p.id
      WHERE t.is_cancelled = 0
      AND (t.is_matched IS NULL OR t.is_matched = 0)
    `;
    const ledgerParams = [];

    if (party_id) {
      ledgerQuery += ' AND t.party_id = ?';
      ledgerParams.push(party_id);
    }

    if (date) {
      ledgerQuery += ' AND t.date = ?';
      ledgerParams.push(date);
    }

    const unreconciledTxns = db.prepare(ledgerQuery).all(...ledgerParams);
    const ledgerTotal = unreconciledTxns.reduce((sum, t) => sum + (t.total_amount || 0), 0);

    // Get unmatched bank transactions (bank side)
    let bankQuery = `
      SELECT * FROM bank_transactions
      WHERE matched = 0
    `;
    const bankParams = [];

    if (date) {
      bankQuery += ' AND date = ?';
      bankParams.push(date);
    }

    const unmatchedBankTxns = db.prepare(bankQuery).all(...bankParams);
    const bankTotal = unmatchedBankTxns.reduce((sum, t) => sum + (t.amount || 0), 0);

    return {
      success: true,
      data: {
        unreconciled_transactions: unreconciledTxns,
        unreconciled_count: unreconciledTxns.length,
        ledger_total: ledgerTotal,
        unmatched_bank_transactions: unmatchedBankTxns,
        unmatched_bank_count: unmatchedBankTxns.length,
        bank_total: bankTotal,
        difference: bankTotal - ledgerTotal
      }
    };
  } catch (error) {
    console.error('Get difference error:', error);
    return { success: false, error: error.message };
  }
});

// Match a transaction
ipcMain.handle('reconciliation:match-transaction', (event, data) => {
  try {
    const { amount, party_id, party_name, reference } = data;

    // Find matching transactions
    let query = `
      SELECT t.*, p.name as party_name, p.gstin as party_gstin
      FROM transactions t
      LEFT JOIN parties p ON t.party_id = p.id
      WHERE t.is_cancelled = 0
      AND ABS(t.total_amount - ?) < 1
    `;
    const params = [amount];

    if (party_id) {
      query += ' AND t.party_id = ?';
      params.push(party_id);
    }

    query += ' ORDER BY t.date DESC LIMIT 10';

    const matches = db.prepare(query).all(...params);

    if (matches.length === 0) {
      return { success: false, error: 'No matching transactions found', matches: [] };
    }

    return {
      success: true,
      data: {
        matches,
        count: matches.length,
        search_criteria: { amount, party_id, party_name, reference }
      }
    };
  } catch (error) {
    console.error('Match transaction error:', error);
    return { success: false, error: error.message };
  }
});

// Flag a transaction
ipcMain.handle('reconciliation:flag', (event, data) => {
  try {
    const { transaction_id } = data;

    if (!transaction_id) {
      return { success: false, error: 'Transaction ID is required' };
    }

    const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(transaction_id);
    if (!transaction) {
      return { success: false, error: 'Transaction not found' };
    }

    // Add a note to flag the transaction
    db.prepare(`
      UPDATE transactions SET narration = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(`[FLAG] ${transaction.narration || ''} - Flagged via voice command`, transaction_id);

    logAudit( 'FLAG', 'transactions', transaction_id, null, null, 'Voice: flagged transaction');

    return {
      success: true,
      data: { id: transaction_id, flagged: true }
    };
  } catch (error) {
    console.error('Flag error:', error);
    return { success: false, error: error.message };
  }
});

// Get all parties (for voice matching)
ipcMain.handle('parties:get-all', (event, filters = {}) => {
  try {
    let query = 'SELECT * FROM parties WHERE is_active = 1';
    const params = [];

    if (filters.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    if (filters.include_inactive) {
      query = query.replace('is_active = 1', '1=1');
    }

    query += ' ORDER BY name';
    const parties = db.prepare(query).all(...params);

    return { success: true, data: parties };
  } catch (error) {
    console.error('Get all parties error:', error);
    return { success: false, error: error.message, data: [] };
  }
});

// ==================== RECOMMENDATIONS ====================
ipcMain.handle('get-recommendations', (event, filters = {}) => {
  let query = 'SELECT * FROM recommendations WHERE (expires_at IS NULL OR expires_at > datetime("now"))';
  const params = [];

  if (filters.unreadOnly) {
    query += ' AND is_read = 0';
  }
  if (filters.unappliedOnly) {
    query += ' AND is_applied = 0';
  }
  if (filters.type) {
    query += ' AND type = ?';
    params.push(filters.type);
  }
  if (filters.category) {
    query += ' AND category = ?';
    params.push(filters.category);
  }

  query += ' ORDER BY priority DESC, created_at DESC LIMIT ?';
  params.push(filters.limit || 50);

  return db.prepare(query).all(...params);
});

ipcMain.handle('create-recommendation', (event, data) => {
  const stmt = db.prepare(`
    INSERT INTO recommendations (type, category, priority, title, description, actionable, potential_impact, implementation, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.type,
    data.category,
    data.priority || 5,
    data.title,
    data.description,
    data.actionable || null,
    data.potential_impact || null,
    data.implementation || null,
    data.expires_at || null
  );

  return result.lastInsertRowid;
});

ipcMain.handle('mark-recommendation-read', (event, id) => {
  db.prepare('UPDATE recommendations SET is_read = 1 WHERE id = ?').run(id);
  return true;
});

ipcMain.handle('apply-recommendation', (event, id) => {
  db.prepare('UPDATE recommendations SET is_applied = 1, applied_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

  const recommendation = db.prepare('SELECT * FROM recommendations WHERE id = ?').get(id);
  logAudit( 'APPLY', 'recommendations', id, null, recommendation, `Applied recommendation: ${recommendation.title}`);

  return true;
});

ipcMain.handle('generate-recommendations', () => {
  const recommendations = [];

  // Check for high outstanding receivables
  const overdue = db.prepare(`
    SELECT p.name, COUNT(*) as count, SUM(t.total_amount) as total
    FROM transactions t
    JOIN parties p ON t.party_id = p.id
    WHERE t.voucher_type = 'sale' AND t.is_cancelled = 0 AND t.payment_status != 'paid'
    AND t.due_date < datetime('now', '-30 days')
    GROUP BY p.id
    HAVING total > 10000
  `).all();

  for (const item of overdue) {
    recommendations.push({
      type: 'cash_flow',
      category: 'collections',
      priority: 9,
      title: 'Follow up on overdue payments',
      description: `${item.name} has ₹${item.total.toLocaleString()} overdue for more than 30 days (${item.count} invoices).`,
      actionable: `Contact ${item.name} to follow up on pending payments.`,
      potential_impact: 'Improved cash flow of ₹' + item.total.toLocaleString()
    });
  }

  // Check for GST compliance
  const pendingGST = db.prepare(`
    SELECT COUNT(*) as count FROM transactions
    WHERE voucher_type = 'sale' AND is_cancelled = 0
    AND date LIKE ?
    AND gst_rate > 0
  `).get(`${new Date().toISOString().slice(0, 7)}%`);

  if (pendingGST.count > 0) {
    recommendations.push({
      type: 'compliance',
      category: 'gst',
      priority: 8,
      title: 'GST filing reminder',
      description: `You have ${pendingGST.count} taxable transactions this month that need to be included in GST returns.`,
      actionable: 'Prepare and file GSTR-1 and GSTR-3B for the current tax period.',
      potential_impact: 'Avoid penalties and maintain compliance'
    });
  }

  // Check for low stock items
  const lowStock = db.prepare(`
    SELECT name, current_stock, min_stock, rate
    FROM products
    WHERE current_stock <= min_stock AND is_active = 1
    LIMIT 5
  `).all();

  for (const item of lowStock) {
    recommendations.push({
      type: 'inventory',
      category: 'stock',
      priority: 7,
      title: 'Reorder ' + item.name,
      description: `${item.name} is at minimum stock level (${item.current_stock} units).`,
      actionable: `Place purchase order for ${item.name} to maintain stock levels.`,
      potential_impact: 'Prevent stockouts and maintain sales'
    });
  }

  // Insert all recommendations
  for (const rec of recommendations) {
    db.prepare(`
      INSERT INTO recommendations (type, category, priority, title, description, actionable, potential_impact)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(rec.type, rec.category, rec.priority, rec.title, rec.description, rec.actionable, rec.potential_impact);
  }

  return recommendations.length;
});

// ==================== VOICE COMMANDS ====================
ipcMain.handle('log-voice-command', (event, data) => {
  const stmt = db.prepare(`
    INSERT INTO voice_command_logs (command, transcript, confidence, action, success, error_message, duration_ms, language)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.command || null,
    data.transcript || null,
    data.confidence || null,
    data.action || null,
    data.success ? 1 : 0,
    data.error_message || null,
    data.duration_ms || null,
    data.language || 'en-IN'
  );

  return result.lastInsertRowid;
});

ipcMain.handle('get-voice-command-logs', (event, filters = {}) => {
  let query = 'SELECT * FROM voice_command_logs ORDER BY created_at DESC';
  const params = [];

  if (filters.startDate) {
    query = 'SELECT * FROM voice_command_logs WHERE created_at >= ? ORDER BY created_at DESC';
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    query += ' AND created_at <= ?';
    params.push(filters.endDate);
  }
  if (filters.success !== undefined) {
    query += ' AND success = ?';
    params.push(filters.success ? 1 : 0);
  }

  query += ' LIMIT ?';
  params.push(filters.limit || 100);

  return db.prepare(query).all(...params);
});

ipcMain.handle('get-voice-stats', () => {
  const total = db.prepare('SELECT COUNT(*) as count FROM voice_command_logs').get();
  const success = db.prepare('SELECT COUNT(*) as count FROM voice_command_logs WHERE success = 1').get();
  const byLanguage = db.prepare('SELECT language, COUNT(*) as count, AVG(confidence) as avg_confidence FROM voice_command_logs GROUP BY language').all();
  const recent = db.prepare('SELECT * FROM voice_command_logs ORDER BY created_at DESC LIMIT 10').all();

  return {
    total_commands: total.count,
    successful_commands: success.count,
    success_rate: total.count > 0 ? (success.count / total.count * 100).toFixed(1) : 0,
    by_language: byLanguage,
    recent_commands: recent
  };
});

// ==================== ERROR DETECTION ====================
ipcMain.handle('detect-errors', (event, types = []) => {
  const errors = [];

  // Check for duplicate voucher numbers
  if (!types.length || types.includes('duplicate_voucher')) {
    const duplicates = db.prepare(`
      SELECT voucher_no, COUNT(*) as count, GROUP_CONCAT(id) as ids
      FROM transactions
      GROUP BY voucher_no
      HAVING count > 1
    `).all();

    for (const dup of duplicates) {
      errors.push({
        type: 'duplicate_voucher',
        severity: 'high',
        title: 'Duplicate Voucher Numbers',
        description: `Voucher ${dup.voucher_no} appears ${dup.count} times in the system.`,
        entity_type: 'transactions',
        entity_ids: dup.ids.split(',').map(Number),
        suggestion: 'Merge or delete duplicate transactions.'
      });
    }
  }

  // Check for transactions with negative amounts
  if (!types.length || types.includes('negative_amount')) {
    const negatives = db.prepare(`
      SELECT id, voucher_no, total_amount, date
      FROM transactions
      WHERE total_amount < 0 AND is_cancelled = 0
    `).all();

    for (const txn of negatives) {
      errors.push({
        type: 'negative_amount',
        severity: 'medium',
        title: 'Negative Transaction Amount',
        description: `Transaction ${txn.voucher_no} has negative amount: ₹${txn.total_amount}`,
        entity_type: 'transactions',
        entity_ids: [txn.id],
        suggestion: 'Review and correct the transaction amount.'
      });
    }
  }

  // Check for missing party in transactions
  if (!types.length || types.includes('missing_party')) {
    const missingParty = db.prepare(`
      SELECT id, voucher_no, total_amount, date
      FROM transactions
      WHERE party_id IS NULL AND voucher_type IN ('sale', 'purchase')
    `).all();

    for (const txn of missingParty) {
      errors.push({
        type: 'missing_party',
        severity: 'medium',
        title: 'Transaction Without Party',
        description: `Transaction ${txn.voucher_no} (₹${txn.total_amount}) has no party assigned.`,
        entity_type: 'transactions',
        entity_ids: [txn.id],
        suggestion: 'Assign the appropriate party to this transaction.'
      });
    }
  }

  // Check for GST rate mismatch
  if (!types.length || types.includes('gst_mismatch')) {
    const gstMismatches = db.prepare(`
      SELECT id, voucher_no, gst_rate, amount, total_gst
      FROM transactions
      WHERE is_cancelled = 0
      AND gst_rate > 0
      AND ABS(total_gst - (amount * gst_rate / 100)) > 1
    `).all();

    for (const txn of gstMismatches) {
      errors.push({
        type: 'gst_mismatch',
        severity: 'high',
        title: 'GST Calculation Mismatch',
        description: `Transaction ${txn.voucher_no} has inconsistent GST calculation.`,
        entity_type: 'transactions',
        entity_ids: [txn.id],
        suggestion: 'Recalculate and correct the GST amounts.'
      });
    }
  }

  // Check for round-off issues
  if (!types.length || types.includes('round_off')) {
    const roundOffs = db.prepare(`
      SELECT id, voucher_no, amount, total_amount
      FROM transactions
      WHERE is_cancelled = 0
      AND ABS(total_amount - round(amount + total_gst)) > 0.5
    `).all();

    for (const txn of roundOffs) {
      errors.push({
        type: 'round_off',
        severity: 'low',
        title: 'Round-off Discrepancy',
        description: `Transaction ${txn.voucher_no} has round-off difference > ₹0.50`,
        entity_type: 'transactions',
        entity_ids: [txn.id],
        suggestion: 'Check the total calculation and apply proper rounding.'
      });
    }
  }

  // Log error detection
  logAudit( 'ERROR_CHECK', 'system', null, null, { types, error_count: errors.length }, 'Ran error detection checks');

  return errors;
});

ipcMain.handle('fix-error', (event, errorType, entityId, fixData) => {
  switch (errorType) {
    case 'duplicate_voucher':
      // Merge transactions - keep first, cancel others
      const ids = entityId.split(',');
      if (ids.length > 1) {
        for (let i = 1; i < ids.length; i++) {
          db.prepare('UPDATE transactions SET is_cancelled = 1, narration = ? WHERE id = ?')
            .run('Cancelled due to duplicate voucher number', ids[i]);
        }
      }
      break;

    case 'negative_amount':
      db.prepare('UPDATE transactions SET total_amount = ABS(total_amount) WHERE id = ?').run(entityId);
      break;

    case 'gst_mismatch':
      if (fixData && fixData.total_gst !== undefined) {
        db.prepare('UPDATE transactions SET total_gst = ? WHERE id = ?').run(fixData.total_gst, entityId);
      }
      break;
  }

  logAudit( 'ERROR_FIX', 'transactions', entityId, null, { error_type: errorType, fix_data: fixData }, `Fixed error: ${errorType}`);

  return true;
});

// ==================== AUDIT TRAIL ENHANCED ====================
ipcMain.handle('get-audit-summary', (event, period = 'week') => {
  const today = new Date();
  let startDate;

  if (period === 'today') {
    startDate = today.toISOString().split('T')[0];
  } else if (period === 'week') {
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    startDate = weekAgo.toISOString().split('T')[0];
  } else {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    startDate = monthStart.toISOString().split('T')[0];
  }

  const byAction = db.prepare(`
    SELECT action, COUNT(*) as count
    FROM audit_logs
    WHERE created_at >= ?
    GROUP BY action
  `).all(startDate);

  const byEntity = db.prepare(`
    SELECT entity_type, COUNT(*) as count
    FROM audit_logs
    WHERE created_at >= ?
    GROUP BY entity_type
  `).all(startDate);

  const recentActivity = db.prepare(`
    SELECT * FROM audit_logs
    WHERE created_at >= ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(startDate);

  const total = db.prepare('SELECT COUNT(*) as count FROM audit_logs WHERE created_at >= ?').get(startDate);

  return {
    period: { start: startDate, end: today.toISOString().split('T')[0] },
    total_actions: total.count,
    by_action: byAction,
    by_entity: byEntity,
    recent_activity: recentActivity
  };
});

ipcMain.handle('search-audit-logs', (event, query, filters = {}) => {
  let sql = `
    SELECT * FROM audit_logs
    WHERE (action LIKE ? OR entity_type LIKE ? OR details LIKE ?)
  `;
  const searchTerm = `%${query}%`;
  const params = [searchTerm, searchTerm, searchTerm];

  if (filters.startDate) {
    sql += ' AND created_at >= ?';
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    sql += ' AND created_at <= ?';
    params.push(filters.endDate);
  }
  if (filters.action) {
    sql += ' AND action = ?';
    params.push(filters.action);
  }
  if (filters.entityType) {
    sql += ' AND entity_type = ?';
    params.push(filters.entityType);
  }

  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(filters.limit || 100);

  return db.prepare(sql).all(...params);
});

// ==================== AUDIT SERVICE IPC HANDLERS ====================

// Query audit logs using the new AuditService
ipcMain.handle('audit/query', (event, filters = {}) => {
  try {
    const logs = auditService.query(filters);
    return { success: true, logs };
  } catch (error) {
    console.error('Audit query error:', error);
    return { success: false, error: error.message, logs: [] };
  }
});

// Get audit summary using the new AuditService
ipcMain.handle('audit/get-summary', (event, period = 'week') => {
  try {
    const summary = auditService.getSummary(period);
    return { success: true, summary };
  } catch (error) {
    console.error('Audit summary error:', error);
    return { success: false, error: error.message, summary: null };
  }
});

// Log an audit event via IPC (for frontend-initiated actions)
ipcMain.handle('audit/log', (event, params) => {
  try {
    const result = auditService.log(params);
    return { success: result };
  } catch (error) {
    console.error('Audit log error:', error);
    return { success: false, error: error.message };
  }
});

// Clean up old audit logs
ipcMain.handle('audit/cleanup', (event, daysToKeep = 365) => {
  try {
    const deletedCount = auditService.cleanup(daysToKeep);
    return { success: true, deletedCount };
  } catch (error) {
    console.error('Audit cleanup error:', error);
    return { success: false, error: error.message, deletedCount: 0 };
  }
});

// ==================== SUBSCRIPTION MANAGEMENT ====================
ipcMain.handle('subscription/get-plans', () => {
  // First ensure plans exist by calling getAllPlans (which seeds if needed)
  const plans = dbManager.getAllPlans();
  
  // If no plans exist, seed them directly here
  if (!plans || plans.length === 0) {
    const defaultPlans = [
      { plan_id: 'free', name: 'Free', description: 'Perfect for getting started', monthly_price: 0, yearly_price: 0 },
      { plan_id: 'starter', name: 'Starter', description: 'Ideal for small businesses', monthly_price: 499, yearly_price: 4990 },
      { plan_id: 'professional', name: 'Professional', description: 'Complete solution', monthly_price: 1499, yearly_price: 14990 }
    ];
    
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO subscription_plans 
      (plan_id, name, description, monthly_price, yearly_price, max_transactions, max_parties, max_products, features, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    
    for (const plan of defaultPlans) {
      const features = plan.plan_id === 'free' 
        ? JSON.stringify(['50 transactions', '10 parties', '20 products', 'Basic reports'])
        : plan.plan_id === 'starter'
        ? JSON.stringify(['500 transactions', '50 parties', '100 products', 'All reports', 'Voice commands'])
        : JSON.stringify(['5000 transactions', '500 parties', '1000 products', 'All features', 'API access']);
        
      stmt.run(
        plan.plan_id, 
        plan.name, 
        plan.description, 
        plan.monthly_price, 
        plan.yearly_price,
        plan.plan_id === 'free' ? 50 : plan.plan_id === 'starter' ? 500 : 5000,
        plan.plan_id === 'free' ? 10 : plan.plan_id === 'starter' ? 50 : 500,
        plan.plan_id === 'free' ? 20 : plan.plan_id === 'starter' ? 100 : 1000,
        features
      );
    }
    
    // Return the newly created plans
    return dbManager.getAllPlans();
  }
  
  return plans;
});

ipcMain.handle('subscription/get-plan', (event, planId) => {
  return dbManager.getPlanById(planId);
});

ipcMain.handle('subscription/get-subscription', (event, userId) => {
  return dbManager.getUserSubscription(userId);
});

ipcMain.handle('subscription/create', (event, userId, planId, billingCycle) => {
  return dbManager.createSubscription(userId, planId, billingCycle);
});

ipcMain.handle('subscription/update-status', (event, userId, status, razorpaySubscriptionId) => {
  return dbManager.updateSubscriptionStatus(userId, status, razorpaySubscriptionId);
});

ipcMain.handle('subscription/get-usage', (event, userId) => {
  return dbManager.getUsage(userId);
});

ipcMain.handle('subscription/check-limits', (event, userId) => {
  return dbManager.checkUsageLimits(userId);
});

ipcMain.handle('subscription/increment-usage', (event, userId, type) => {
  return dbManager.incrementUsage(userId, type);
});

ipcMain.handle('subscription/get-payment-history', (event, userId) => {
  return dbManager.getPaymentHistory(userId);
});

ipcMain.handle('subscription/record-payment', (event, paymentData) => {
  return dbManager.recordPayment(paymentData);
});

// Diagnostic: Check and repair subscription tables
ipcMain.handle('subscription/diagnose', () => {
  try {
    // Check if subscription_plans table exists
    const tablesExist = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='subscription_plans'
    `).get();

    if (!tablesExist) {
      return {
        success: false,
        issue: 'subscription_plans_table_missing',
        message: 'Subscription tables do not exist. Please restart the application to initialize them.'
      };
    }

    // Check if plans exist
    const plansCount = db.prepare('SELECT COUNT(*) as count FROM subscription_plans').get();
    if (plansCount.count === 0) {
      return {
        success: false,
        issue: 'no_plans_exist',
        message: 'No subscription plans found in database.'
      };
    }

    // Return current plans
    const plans = db.prepare('SELECT * FROM subscription_plans WHERE is_active = 1').all();

    return {
      success: true,
      plans_count: plansCount.count,
      plans: plans
    };
  } catch (error) {
    return {
      success: false,
      issue: 'error',
      message: error.message
    };
  }
});

// ==================== INVOICE SCANNING ====================

// Get all scanned invoices
ipcMain.handle('invoice:get-all', (event, filters = {}) => {
  try {
    const invoices = invoiceScanningDB.getInvoiceHeaders(filters);
    return { success: true, invoices };
  } catch (error) {
    console.error('Error getting invoices:', error);
    return { success: false, error: error.message };
  }
});

// Get single invoice with line items
ipcMain.handle('invoice:get', (event, id) => {
  try {
    const invoice = invoiceScanningDB.getInvoiceHeader(id);
    if (invoice) {
      return { success: true, invoice };
    }
    return { success: false, error: 'Invoice not found' };
  } catch (error) {
    console.error('Error getting invoice:', error);
    return { success: false, error: error.message };
  }
});

// Save scanned invoice
ipcMain.handle('invoice:save', (event, data) => {
  try {
    const { header, lines } = data;
    
    // Save header
    const headerId = invoiceScanningDB.addInvoiceHeader({
      invoice_number: header.invoice_number,
      invoice_date: header.invoice_date,
      due_date: header.due_date || null,
      party_name: header.party_name || null,
      party_gstin: header.party_gstin || null,
      party_address: header.party_address || null,
      party_phone: header.party_phone || null,
      vendor_name: header.vendor_name || null,
      vendor_gstin: header.vendor_gstin || null,
      subtotal: header.subtotal || 0,
      total_gst: header.total_gst || 0,
      total_amount: header.total_amount,
      tax_type: header.tax_type || 'GST',
      notes: header.notes || null,
      image_path: null,
      ocr_confidence: data.confidence || 0,
      status: 'pending'
    });
    
    // Save line items
    if (lines && lines.length > 0) {
      const lineItems = lines.map((line, index) => ({
        header_id: headerId,
        item_number: index,
        description: line.description,
        hsn_code: line.hsn_code || null,
        quantity: line.quantity,
        unit: line.unit || 'pcs',
        rate: line.rate,
        amount: line.amount,
        discount_percent: line.discount_percent || 0,
        discount_amount: line.discount_amount || 0,
        gst_rate: line.gst_rate || 0,
        cgst_amount: line.cgst_amount || 0,
        sgst_amount: line.sgst_amount || 0,
        igst_amount: line.igst_amount || 0,
        total_amount: line.total_amount,
        confidence: line.confidence || 0
      }));
      invoiceScanningDB.addInvoiceLines(lineItems);
    }
    
    logAudit( 'CREATE', 'invoice_scanning', headerId, null, { invoice_number: header.invoice_number }, 'Scanned and saved invoice');
    
    return { success: true, id: headerId };
  } catch (error) {
    console.error('Error saving invoice:', error);
    return { success: false, error: error.message };
  }
});

// Update scanned invoice
ipcMain.handle('invoice:update', (event, id, data) => {
  try {
    const { header, lines } = data;
    
    // Update header
    invoiceScanningDB.updateInvoiceHeader(id, header);
    
    // Update line items (simplified - in production, you'd want to sync properly)
    if (lines && lines.length > 0) {
      // Delete existing lines and re-insert
      const existingLines = invoiceScanningDB.getInvoiceLines(id);
      for (const line of existingLines) {
        // Lines are deleted by CASCADE when header is updated, but we need to handle this carefully
      }
      
      const lineItems = lines.map((line, index) => ({
        header_id: id,
        item_number: index,
        description: line.description,
        hsn_code: line.hsn_code || null,
        quantity: line.quantity,
        unit: line.unit || 'pcs',
        rate: line.rate,
        amount: line.amount,
        discount_percent: line.discount_percent || 0,
        discount_amount: line.discount_amount || 0,
        gst_rate: line.gst_rate || 0,
        cgst_amount: line.cgst_amount || 0,
        sgst_amount: line.sgst_amount || 0,
        igst_amount: line.igst_amount || 0,
        total_amount: line.total_amount,
        confidence: line.confidence || 0
      }));
      
      // For simplicity, we'll just add new lines (existing ones would need proper sync)
      invoiceScanningDB.addInvoiceLines(lineItems);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating invoice:', error);
    return { success: false, error: error.message };
  }
});

// Delete scanned invoice
ipcMain.handle('invoice:delete', (event, id) => {
  try {
    const invoice = invoiceScanningDB.getInvoiceHeader(id);
    if (!invoice) {
      return { success: false, error: 'Invoice not found' };
    }
    
    invoiceScanningDB.deleteInvoiceHeader(id);
    logAudit( 'DELETE', 'invoice_scanning', id, { invoice_number: invoice.invoice_number }, null, 'Deleted scanned invoice');
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return { success: false, error: error.message };
  }
});

// Import invoice to transactions
ipcMain.handle('invoice:import', (event, id) => {
  try {
    const result = invoiceScanningDB.importToTransactions(id, {
      getProducts: (filters) => {
        let query = 'SELECT * FROM products WHERE is_active = 1';
        const params = [];
        if (filters?.search) {
          query += ' AND (name LIKE ? OR sku LIKE ? OR hsn_code LIKE ?)';
          const search = `%${filters.search}%`;
          params.push(search, search, search);
        }
        query += ' ORDER BY name';
        return db.prepare(query).all(...params);
      },
      getParties: (filters) => {
        let query = 'SELECT * FROM parties WHERE is_active = 1';
        const params = [];
        if (filters?.search) {
          query += ' AND (name LIKE ? OR gstin LIKE ? OR phone LIKE ?)';
          const search = `%${filters.search}%`;
          params.push(search, search, search);
        }
        query += ' ORDER BY name';
        return db.prepare(query).all(...params);
      },
      addTransaction: (transaction) => {
        const voucherNo = generateVoucherNumber(db, transaction.voucher_type);
        const stmt = db.prepare(`
          INSERT INTO transactions (
            voucher_no, voucher_type, date, party_id, product_id, quantity, rate, amount,
            discount_percent, discount_amount, taxable_amount, gst_rate,
            cgst_amount, sgst_amount, igst_amount, cess_amount, total_gst, total_amount,
            description, narration, payment_status, payment_method, reference_no, due_date, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const gstAmount = (transaction.taxable_amount || transaction.amount) * (transaction.gst_rate || 0) / 100;
        
        const result = stmt.run(
          voucherNo, transaction.voucher_type, transaction.date, transaction.party_id || null,
          transaction.product_id || null, transaction.quantity || 1, transaction.rate, transaction.amount,
          transaction.discount_percent || 0, transaction.discount_amount || 0, transaction.taxable_amount || transaction.amount,
          transaction.gst_rate || 0, transaction.cgst_amount || gstAmount / 2, transaction.sgst_amount || gstAmount / 2,
          transaction.igst_amount || 0, transaction.cess_amount || 0, gstAmount, transaction.total_amount,
          transaction.description || null, transaction.narration || null, transaction.payment_status || 'pending',
          transaction.payment_method || null, transaction.reference_no || null, transaction.due_date || null,
          transaction.created_by || 'system'
        );
        
        return result.lastInsertRowid;
      }
    });
    
    if (result.success) {
      logAudit( 'IMPORT', 'invoice_scanning', id, null, { transaction_count: result.transactionCount }, 'Imported invoice to transactions');
    }
    
    return result;
  } catch (error) {
    console.error('Error importing invoice:', error);
    return { success: false, error: error.message };
  }
});

// Check for duplicate invoices
ipcMain.handle('invoice:check-duplicate', (event, invoiceNumber, vendorName, invoiceDate, totalAmount) => {
  try {
    const result = invoiceScanningDB.checkDuplicate(invoiceNumber, vendorName, invoiceDate, totalAmount);
    return result;
  } catch (error) {
    console.error('Error checking duplicate:', error);
    return { isDuplicate: false, error: error.message };
  }
});

// Get invoice scanning statistics
ipcMain.handle('invoice:get-statistics', (event, period) => {
  try {
    const stats = invoiceScanningDB.getStatistics(period);
    return { success: true, statistics: stats };
  } catch (error) {
    console.error('Error getting statistics:', error);
    return { success: false, error: error.message };
  }
});

// Process invoice image with OCR
ipcMain.handle('invoice:process-ocr', async (event, imageData) => {
  try {
    console.log('Starting OCR processing in main process...');
    
    // Validate input
    if (!imageData || typeof imageData !== 'string') {
      throw new Error('Invalid image data provided');
    }
    
    let imagePath = imageData;
    let tempFilePath = null;
    
    // Check if it's a valid data URL
    if (imageData.startsWith('data:')) {
      // Parse data URL
      const matches = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
      
      if (matches && matches[2].length > 0) {
        const ext = matches[1];
        const data = matches[2];
        
        // Validate base64 data
        const buffer = Buffer.from(data, 'base64');
        if (buffer.length < 100) {
          throw new Error('Image data is too small or invalid');
        }
        
        tempFilePath = path.join(app.getPath('temp'), `invoice_scan_${Date.now()}.${ext}`);
        fs.writeFileSync(tempFilePath, buffer);
        imagePath = tempFilePath;
      } else {
        // Malformed data URL - try to extract base64 data anyway
        const base64Data = imageData.replace(/^data:[^,]*,/, '');
        if (base64Data.length > 100) {
          try {
            tempFilePath = path.join(app.getPath('temp'), `invoice_scan_${Date.now()}.jpg`);
            const buffer = Buffer.from(base64Data, 'base64');
            if (buffer.length > 100) {
              fs.writeFileSync(tempFilePath, buffer);
              imagePath = tempFilePath;
            } else {
              throw new Error('Invalid image data');
            }
          } catch (e) {
            throw new Error('Failed to parse image data. Please try capturing or uploading again.');
          }
        } else {
          throw new Error('Invalid image format. Please try again.');
        }
      }
    } else if (imageData.length > 0) {
      // Treat as file path - check if it exists
      if (!fs.existsSync(imageData)) {
        throw new Error('Image file not found');
      }
      imagePath = imageData;
    } else {
      throw new Error('No image data provided');
    }

    // Perform OCR using Tesseract
    console.log('Running Tesseract OCR on:', imagePath);
    const result = await Tesseract.recognize(imagePath, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${(m.progress * 100).toFixed(0)}%`);
        }
      }
    });

    const text = result.data.text;
    const words = result.data.words || [];
    const confidence = words.length > 0 
      ? words.reduce((sum, word) => sum + word.confidence, 0) / words.length 
      : 0;

    // Parse the extracted text into invoice data
    const parsedData = parseInvoiceText(text);

    // Clean up temp file if created
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    console.log('OCR completed successfully');
    return {
      success: true,
      header: parsedData.header,
      lines: parsedData.lines,
      confidence: confidence,
      rawText: text
    };
  } catch (error) {
    console.error('OCR Processing Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process invoice. Please try again.',
      header: null,
      lines: [],
      confidence: 0
    };
  }
});

// Helper function to parse invoice text
function parseInvoiceText(text) {
  const header = {
    invoice_number: null,
    invoice_date: null,
    due_date: null,
    party_name: null,
    party_gstin: null,
    party_address: null,
    party_phone: null,
    vendor_name: null,
    vendor_gstin: null,
    subtotal: 0,
    total_gst: 0,
    total_amount: 0,
    tax_type: 'GST'
  };

  const lines = [];
  const linesArray = text.split('\n');

  // Patterns for extraction
  const patterns = {
    invoiceNumber: /(?:invoice|inv|bill|receipt)[\s#]*[:.]?\s*([A-Z0-9\-\/]+)/i,
    date: /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/,
    gstin: /([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1})/i,
    vendorName: /(?:from|sold by|vendor|supplier)[\s:]+([A-Za-z\s]+?)(?:\n|$)/i,
    partyName: /(?:to|bill to|ship to|customer)[\s:]+([A-Za-z\s]+?)(?:\n|$)/i,
    totalAmount: /(?:total|grand total|amount payable|net amount|total payable)[\s:]*₹?\s*([\d,]+\.?\d*)/i,
    gstAmount: /(?:gst|tax|total tax|sgst|cgst|igst)[\s:]*₹?\s*([\d,]+\.?\d*)/i
  };

  // Extract header information
  for (const line of linesArray) {
    const blockText = line.trim();
    if (!blockText) continue;

    // Invoice number
    if (!header.invoice_number) {
      const invoiceMatch = blockText.match(patterns.invoiceNumber);
      if (invoiceMatch) {
        header.invoice_number = invoiceMatch[1].trim();
      }
    }

    // Date
    if (!header.invoice_date) {
      const dateMatch = blockText.match(patterns.date);
      if (dateMatch) {
        header.invoice_date = normalizeDate(dateMatch[0]);
      }
    }

    // GSTIN
    const gstinMatch = blockText.match(patterns.gstin);
    if (gstinMatch && !header.party_gstin) {
      header.party_gstin = gstinMatch[1];
    }

    // Vendor name
    if (!header.vendor_name) {
      const vendorMatch = blockText.match(patterns.vendorName);
      if (vendorMatch) {
        header.vendor_name = vendorMatch[1].trim();
      }
    }

    // Party name
    if (!header.party_name) {
      const partyMatch = blockText.match(patterns.partyName);
      if (partyMatch) {
        header.party_name = partyMatch[1].trim();
      }
    }

    // Total amount
    if (header.total_amount === 0) {
      const totalMatch = blockText.match(patterns.totalAmount);
      if (totalMatch) {
        header.total_amount = parseFloat(totalMatch[1].replace(/,/g, ''));
      }
    }

    // GST amount
    if (header.total_gst === 0) {
      const gstMatch = blockText.match(patterns.gstAmount);
      if (gstMatch) {
        header.total_gst = parseFloat(gstMatch[1].replace(/,/g, ''));
      }
    }

    // Detect line items
    if (isLineItemStart(blockText) && lines.length === 0) {
      // Start collecting line items
    }

    if (isLineItem(blockText) && (header.invoice_number || lines.length > 0)) {
      const lineItem = parseLineItem(blockText, lines.length);
      if (lineItem) {
        lines.push(lineItem);
      }
    }

    // End of line items
    if (lines.length > 0 && isLineItemEnd(blockText)) {
      break;
    }
  }

  // Calculate subtotal from line items
  header.subtotal = lines.reduce((sum, line) => sum + line.amount, 0);

  // If total not found, calculate from line items
  if (header.total_amount === 0 && lines.length > 0) {
    header.total_amount = lines.reduce((sum, line) => sum + line.total_amount, 0);
  }

  return { header, lines };
}

// Helper functions for parsing
function isLineItemStart(line) {
  const indicators = ['item', 'description', 'qty', 'quantity', 'rate', 'price', 'amount', 'items', 'particulars', 'product', 'code', 'hsn', 'sac'];
  return indicators.some(ind => line.toLowerCase().includes(ind));
}

function isLineItem(line) {
  const lineItemPatterns = [
    /^\d+\s+\d+\s+[\d,]+\.?\d*/,
    /^\d+\s*[xX*]\s*\d+.*[\d,]+\.?\d*/,
    /^[A-Za-z\s]+\d+[\d,]*\.?\d+/,
    /\d+\s+\w+\s+\d+\.?\d*\s+\d+\.?\d*/
  ];
  return lineItemPatterns.some(pattern => pattern.test(line.trim()));
}

function isLineItemEnd(line) {
  const endIndicators = ['subtotal', 'sub total', 'total', 'grand total', 'tax', 'gst', 'round off', 'roundoff', 'amount payable', 'net amount'];
  return endIndicators.some(ind => line.toLowerCase().includes(ind));
}

function parseLineItem(line, itemNumber) {
  try {
    const cleanedLine = line.trim();
    let quantity = 1;
    let rate = 0;
    let amount = 0;
    let description = cleanedLine;
    let gstRate = 0;

    // Pattern 1: "2 x 5 = 100" or "2*5 100"
    let match = cleanedLine.match(/(\d+\.?\d*)\s*[xX*]\s*(\d+\.?\d*)\s*[=]*\s*(\d+\.?\d*)/);
    if (match) {
      quantity = parseFloat(match[1]);
      rate = parseFloat(match[2]);
      amount = parseFloat(match[3]);
      description = cleanedLine.replace(match[0], '').trim();
    }

    // Pattern 2: "2 5 100" (qty rate amount)
    if (!match) {
      match = cleanedLine.match(/^(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)/);
      if (match) {
        quantity = parseFloat(match[1]);
        rate = parseFloat(match[2]);
        amount = parseFloat(match[3]);
        description = cleanedLine.replace(match[0], '').trim();
      }
    }

    // Pattern 3: Extract from end of line
    if (!match) {
      match = cleanedLine.match(/(.+?)\s+(\d+\.?\d*)\s*$/);
      if (match) {
        description = match[1].trim();
        amount = parseFloat(match[2]);
        if (amount > 0 && amount < 100000) {
          rate = amount;
        } else {
          rate = amount;
        }
      }
    }

    // Estimate GST rate
    const taxableAmount = amount;
    gstRate = estimateGSTRate(taxableAmount);
    const gstAmount = (taxableAmount * gstRate) / 100;

    return {
      item_number: itemNumber,
      description: description || 'Item',
      quantity,
      unit: 'pcs',
      rate,
      amount: taxableAmount,
      gst_rate: gstRate,
      cgst_amount: gstAmount / 2,
      sgst_amount: gstAmount / 2,
      igst_amount: 0,
      total_amount: taxableAmount + gstAmount,
      confidence: 70
    };
  } catch (error) {
    return null;
  }
}

function estimateGSTRate(amount) {
  if (amount <= 1000) return 0;
  if (amount <= 10000) return 5;
  if (amount <= 20000) return 12;
  if (amount <= 50000) return 18;
  return 28;
}

function normalizeDate(dateStr) {
  try {
    const parts = dateStr.split(/[\/\-\.]/);
    if (parts.length !== 3) return dateStr;

    let day, month, year;
    if (parts[0].length === 4) {
      year = parts[0];
      month = parts[1];
      day = parts[2];
    } else {
      day = parts[0];
      month = parts[1];
      year = parts[2];
      if (year.length === 2) {
        year = '20' + year;
      }
    }

    const monthNum = parseInt(month);
    if (monthNum < 1 || monthNum > 12) {
      const temp = day;
      day = month;
      month = temp;
    }

    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } catch (error) {
    return dateStr;
  }
}

// ==================== INITIALIZATION ====================
app.whenReady().then(() => {
  initializeDatabase();
  
  // Initialize dbManager for subscription and advanced database features
  // This must be called AFTER initializeDatabase() to ensure tables exist
  dbManager.initialize(app.getPath('userData'));
  console.log('dbManager initialized for subscription features');
  
  // Initialize Invoice Scanning Database
  invoiceScanningDB.initialize(app.getPath('userData'));
  console.log('Invoice Scanning DB initialized at:', path.join(app.getPath('userData'), 'invoice_scanning.db'));
  
  // Initialize E-Invoice Service
  einvoiceService.initialize(db);
  console.log('E-Invoice Service initialized');
  
  // Initialize GST Return Service
  gstReturnService.initialize(db);
  console.log('GST Return Service initialized');
  
  // Initialize Inventory Service
  inventoryService.initialize(db);
  console.log('Inventory Service initialized');
  
  // Initialize Report Engine
  reportEngine = new ReportEngine(db);
  console.log('Report Engine initialized');
  
  // Initialize Banking Service
  bankingService.initialize(db);
  console.log('Banking Service initialized');
  
  // Initialize Payment Gateway Service
  paymentGatewayService.initialize(db);
  console.log('Payment Gateway Service initialized');
  
  createWindow();
  
  // Initialize Voice Module
  initializeVoiceModule();

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

// ==================== VOICE MODULE INITIALIZATION ====================
function initializeVoiceModule() {
  try {
    // Load voice handlers from electron/voice directory (included in build)
    const { setupVoiceHandlers } = require('./voice/VoiceIPCHandlers.js');
    
    // Initialize with main window reference
    setupVoiceHandlers(mainWindow);
    
    console.log('[Main] Voice Module initialized successfully');
  } catch (error) {
    console.warn('[Main] Voice Module initialization warning:', error.message);
    // Voice module is optional - continue without it
  }
}

// ==================== INTEGRATION SERVICES ====================
// Initialize the integration service
let integrationServiceInitialized = false;

async function initializeIntegrationService() {
  if (integrationServiceInitialized) {
    return { success: true };
  }
  
  try {
    const integrationService = require(path.join(__dirname, '../src/services/integrationService'));
    const result = await integrationService.initialize({
      dbPath: path.join(__dirname, '../src/db'),
      dataDir: app.getPath('userData')
    });
    
    integrationServiceInitialized = result.success;
    console.log('[IntegrationService] Main process initialized:', result.success ? 'success' : result.error);
    return result;
  } catch (error) {
    console.error('[IntegrationService] Initialization error:', error.message);
    return { success: false, error: error.message };
  }
}

// ==================== E-INVOICE ====================

// Generate e-invoice for a transaction
ipcMain.handle('einvoice:generate', async (event, transactionId) => {
  try {
    const result = await einvoiceService.generateEinvoice(transactionId);
    if (result.success) {
      logAudit('CREATE', 'einvoice', transactionId, null, result, `Generated e-invoice IRN: ${result.irn}`);
    }
    return result;
  } catch (error) {
    console.error('E-invoice generation error:', error);
    return { success: false, error: error.message };
  }
});

// Generate e-waybill for a transaction
ipcMain.handle('einvoice:generate-ewaybill', async (event, transactionId, transport) => {
  try {
    const result = await einvoiceService.generateEwaybill(transactionId, transport);
    if (result.success) {
      logAudit('CREATE', 'ewaybill', transactionId, null, result, `Generated e-waybill: ${result.ewbNo}`);
    }
    return result;
  } catch (error) {
    console.error('E-waybill generation error:', error);
    return { success: false, error: error.message };
  }
});

// Get e-invoice details
ipcMain.handle('einvoice:get', (event, transactionId) => {
  try {
    return einvoiceService.getEinvoice(transactionId);
  } catch (error) {
    console.error('E-invoice get error:', error);
    return null;
  }
});

// List e-invoices
ipcMain.handle('einvoice:list', (event, filters) => {
  try {
    return einvoiceService.listEinvoices(filters);
  } catch (error) {
    console.error('E-invoice list error:', error);
    return [];
  }
});

// Get pending invoices (transactions without e-invoice)
ipcMain.handle('einvoice:get-pending', (event, filters) => {
  try {
    return einvoiceService.getPendingInvoices(filters);
  } catch (error) {
    console.error('E-invoice pending error:', error);
    return [];
  }
});

// Get e-invoice configuration
ipcMain.handle('einvoice:get-config', () => {
  try {
    return einvoiceService.getConfig();
  } catch (error) {
    console.error('E-invoice config error:', error);
    return null;
  }
});

// Save e-invoice configuration
ipcMain.handle('einvoice:save-config', (event, config) => {
  try {
    const result = einvoiceService.saveConfig(config);
    if (result.success) {
      logAudit('UPDATE', 'einvoice_config', 1, null, config, 'E-invoice configuration updated');
    }
    return result;
  } catch (error) {
    console.error('E-invoice config save error:', error);
    return { success: false, error: error.message };
  }
});

// Cancel e-invoice
ipcMain.handle('einvoice:cancel', async (event, transactionId, reason) => {
  try {
    const result = await einvoiceService.cancelEinvoice(transactionId, reason);
    if (result.success) {
      logAudit('CANCEL', 'einvoice', transactionId, null, { reason }, 'E-invoice cancelled');
    }
    return result;
  } catch (error) {
    console.error('E-invoice cancel error:', error);
    return { success: false, error: error.message };
  }
});

// Validate GSTIN
ipcMain.handle('einvoice:validate-gstin', (event, gstin) => {
  return einvoiceService.validateGSTIN(gstin);
});

// Validate HSN code
ipcMain.handle('einvoice:validate-hsn', (event, hsnCode) => {
  return einvoiceService.validateHSN(hsnCode);
});

// ==================== GST RETURN HANDLERS ====================

// Get GSTR-1 data
ipcMain.handle('gst:get-gstr1', (event, filters) => {
  try {
    const { startDate, endDate } = filters || {};
    return gstReturnService.getGSTR1Data({ 
      startDate: startDate || getDefaultStartDate(), 
      endDate: endDate || getDefaultEndDate() 
    });
  } catch (error) {
    console.error('GSTR-1 error:', error);
    return null;
  }
});

// Get GSTR-3B data
ipcMain.handle('gst:get-gstr3b', (event, filters) => {
  try {
    const { startDate, endDate } = filters || {};
    return gstReturnService.getGSTR3BData({ 
      startDate: startDate || getDefaultStartDate(), 
      endDate: endDate || getDefaultEndDate() 
    });
  } catch (error) {
    console.error('GSTR-3B error:', error);
    return null;
  }
});

// Export GSTR-1 JSON
ipcMain.handle('gst:export-gstr1-json', (event, filters) => {
  try {
    return gstReturnService.exportGSTR1JSON(filters);
  } catch (error) {
    console.error('GSTR-1 export error:', error);
    return null;
  }
});

// Export GSTR-3B JSON
ipcMain.handle('gst:export-gstr3b-json', (event, filters) => {
  try {
    return gstReturnService.exportGSTR3BJSON(filters);
  } catch (error) {
    console.error('GSTR-3B export error:', error);
    return null;
  }
});

// Get ITC Reconciliation
ipcMain.handle('gst:get-itc-reconciliation', (event, filters) => {
  try {
    const { startDate, endDate } = filters || {};
    return gstReturnService.getITCReconciliation({ 
      startDate: startDate || getDefaultStartDate(), 
      endDate: endDate || getDefaultEndDate() 
    });
  } catch (error) {
    console.error('ITC reconciliation error:', error);
    return null;
  }
});

// Get GST Liability Summary
ipcMain.handle('gst:get-liability-summary', (event, filters) => {
  try {
    const { startDate, endDate } = filters || {};
    return gstReturnService.getGSTLiabilitySummary(
      startDate || getDefaultStartDate(), 
      endDate || getDefaultEndDate()
    );
  } catch (error) {
    console.error('GST liability summary error:', error);
    return null;
  }
});

// ==================== CASH LEAK DETECTION IPC HANDLERS ====================

// Run full cash leak analysis
ipcMain.handle('leak:run-analysis', async (event, options = {}) => {
  try {
    // Ensure tables exist
    dbManager.createLeakDetectionTables();
    
    // Run the analysis
    const results = dbManager.runCashLeakAnalysis();
    return { success: true, data: results };
  } catch (error) {
    console.error('Cash leak analysis error:', error);
    return { success: false, error: error.message };
  }
});

// Get leak anomalies
ipcMain.handle('leak:get-anomalies', async (event, filters = {}) => {
  try {
    const anomalies = dbManager.getLeakAnomalies(filters);
    return { success: true, data: anomalies };
  } catch (error) {
    console.error('Get leak anomalies error:', error);
    return { success: false, error: error.message };
  }
});

// Create leak anomaly
ipcMain.handle('leak:create-anomaly', async (event, data) => {
  try {
    const result = dbManager.createLeakAnomaly(data);
    return { success: true, data: result };
  } catch (error) {
    console.error('Create leak anomaly error:', error);
    return { success: false, error: error.message };
  }
});

// Resolve leak anomaly
ipcMain.handle('leak:resolve-anomaly', async (event, id, resolutionNotes) => {
  try {
    const result = dbManager.resolveLeakAnomaly(id, resolutionNotes);
    return { success: true, data: result };
  } catch (error) {
    console.error('Resolve leak anomaly error:', error);
    return { success: false, error: error.message };
  }
});

// Get leak configuration
ipcMain.handle('leak:get-config', async (event, key = null) => {
  try {
    const config = dbManager.getLeakConfig(key);
    return { success: true, data: config };
  } catch (error) {
    console.error('Get leak config error:', error);
    return { success: false, error: error.message };
  }
});

// Update leak configuration
ipcMain.handle('leak:update-config', async (event, key, value) => {
  try {
    const result = dbManager.updateLeakConfig(key, value);
    return { success: true, data: result };
  } catch (error) {
    console.error('Update leak config error:', error);
    return { success: false, error: error.message };
  }
});

// Get leak dashboard summary
ipcMain.handle('leak:get-dashboard-summary', async (event) => {
  try {
    const summary = dbManager.getLeakDashboardSummary();
    return { success: true, data: summary };
  } catch (error) {
    console.error('Get leak dashboard summary error:', error);
    return { success: false, error: error.message };
  }
});

// Record shift data
ipcMain.handle('leak:record-shift', async (event, data) => {
  try {
    const result = dbManager.recordShiftData(data);
    return { success: true, data: result };
  } catch (error) {
    console.error('Record shift data error:', error);
    return { success: false, error: error.message };
  }
});

// Get shift data
ipcMain.handle('leak:get-shifts', async (event, filters = {}) => {
  try {
    const shifts = dbManager.getShiftData(filters);
    return { success: true, data: shifts };
  } catch (error) {
    console.error('Get shift data error:', error);
    return { success: false, error: error.message };
  }
});

// Record POS audit event
ipcMain.handle('leak:record-audit-event', async (event, data) => {
  try {
    const result = dbManager.recordPOSAuditEvent(data);
    return { success: true, data: result };
  } catch (error) {
    console.error('Record POS audit event error:', error);
    return { success: false, error: error.message };
  }
});

// Get POS audit logs
ipcMain.handle('leak:get-audit-logs', async (event, filters = {}) => {
  try {
    const logs = dbManager.getPOSAuditLogs(filters);
    return { success: true, data: logs };
  } catch (error) {
    console.error('Get POS audit logs error:', error);
    return { success: false, error: error.message };
  }
});

// ==================== INVENTORY IPC HANDLERS ====================

// Add new batch/lot
ipcMain.handle('inventory:add-batch', (event, batchData) => {
  try {
    return inventoryService.addBatch(batchData);
  } catch (error) {
    console.error('Add batch error:', error);
    return { success: false, error: error.message };
  }
});

// Get product batches
ipcMain.handle('inventory:get-batches', (event, productId) => {
  try {
    return inventoryService.getProductBatches(productId);
  } catch (error) {
    console.error('Get batches error:', error);
    return [];
  }
});

// Add serial numbers
ipcMain.handle('inventory:add-serial-numbers', (event, serialData) => {
  try {
    return inventoryService.addSerialNumbers(serialData);
  } catch (error) {
    console.error('Add serial numbers error:', error);
    return { success: false, error: error.message };
  }
});

// Get product serial numbers
ipcMain.handle('inventory:get-serial-numbers', (event, productId) => {
  try {
    return inventoryService.getProductSerialNumbers(productId);
  } catch (error) {
    console.error('Get serial numbers error:', error);
    return [];
  }
});

// Record stock movement
ipcMain.handle('inventory:record-movement', (event, movementData) => {
  try {
    return inventoryService.recordMovement(movementData);
  } catch (error) {
    console.error('Record movement error:', error);
    return { success: false, error: error.message };
  }
});

// Get inventory summary
ipcMain.handle('inventory:get-summary', (event, filters) => {
  try {
    return inventoryService.getInventorySummary(filters);
  } catch (error) {
    console.error('Get inventory summary error:', error);
    return null;
  }
});

// Get movement history
ipcMain.handle('inventory:get-movements', (event, filters) => {
  try {
    return inventoryService.getMovementHistory(filters);
  } catch (error) {
    console.error('Get movements error:', error);
    return [];
  }
});

// Get low stock products
ipcMain.handle('inventory:get-low-stock', (event, threshold) => {
  try {
    return inventoryService.getLowStockProducts(threshold);
  } catch (error) {
    console.error('Get low stock error:', error);
    return [];
  }
});

// Get expiring batches
ipcMain.handle('inventory:get-expiring', (event, daysAhead) => {
  try {
    return inventoryService.getExpiringBatches(daysAhead);
  } catch (error) {
    console.error('Get expiring batches error:', error);
    return [];
  }
});

// Get inventory valuation
ipcMain.handle('inventory:get-valuation', (event, asOnDate) => {
  try {
    return inventoryService.getInventoryValuation(asOnDate);
  } catch (error) {
    console.error('Get valuation error:', error);
    return null;
  }
});

// Transfer stock
ipcMain.handle('inventory:transfer-stock', (event, transferData) => {
  try {
    return inventoryService.transferStock(transferData);
  } catch (error) {
    console.error('Transfer stock error:', error);
    return { success: false, error: error.message };
  }
});

// Adjust inventory
ipcMain.handle('inventory:adjust', (event, adjustmentData) => {
  try {
    return inventoryService.adjustInventory(adjustmentData);
  } catch (error) {
    console.error('Adjust inventory error:', error);
    return { success: false, error: error.message };
  }
});

// ==================== REPORT ENGINE IPC HANDLERS ====================

// Generate Sales Report
ipcMain.handle('report:generate-sales', async (event, params) => {
  try {
    return await reportEngine.generateSalesReport(params);
  } catch (error) {
    console.error('Sales report error:', error);
    return null;
  }
});

// Generate GST Report
ipcMain.handle('report:generate-gst', async (event, month) => {
  try {
    return await reportEngine.generateGSTReport(month);
  } catch (error) {
    console.error('GST report error:', error);
    return null;
  }
});

// Generate Profit & Loss Report
ipcMain.handle('report:generate-pnl', async (event, params) => {
  try {
    return await reportEngine.generateProfitLoss(params);
  } catch (error) {
    console.error('P&L report error:', error);
    return null;
  }
});

// Generate Balance Sheet
ipcMain.handle('report:generate-balance-sheet', async (event, asOfDate) => {
  try {
    return await reportEngine.generateBalanceSheet(asOfDate);
  } catch (error) {
    console.error('Balance sheet error:', error);
    return null;
  }
});

// Generate Cash Flow Report
ipcMain.handle('report:generate-cashflow', async (event, params) => {
  try {
    return await reportEngine.generateCashFlow(params);
  } catch (error) {
    console.error('Cash flow report error:', error);
    return null;
  }
});

// Generate Outstanding Aging Report
ipcMain.handle('report:generate-outstanding', async (event) => {
  try {
    return await reportEngine.generateOutstandingAging();
  } catch (error) {
    console.error('Outstanding aging error:', error);
    return null;
  }
});

// Generate Expense Summary
ipcMain.handle('report:generate-expense-summary', async (event, params) => {
  try {
    return await reportEngine.generateExpenseSummary(params);
  } catch (error) {
    console.error('Expense summary error:', error);
    return null;
  }
});

// Get Dashboard Summary
ipcMain.handle('report:get-dashboard-summary', async (event) => {
  try {
    const now = new Date();
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    
    const [salesReport, outstandingReport, expenseSummary] = await Promise.all([
      reportEngine.generateSalesReport({ startDate: startOfMonth, endDate: endOfMonth }),
      reportEngine.generateOutstandingAging(),
      reportEngine.generateExpenseSummary({ startDate: startOfMonth, endDate: endOfMonth })
    ]);
    
    return {
      sales: salesReport?.summary || null,
      outstanding: outstandingReport || null,
      expenses: expenseSummary?.summary || null,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Dashboard summary error:', error);
    return null;
  }
});

// ==================== BANKING IPC HANDLERS ====================

// Add bank account
ipcMain.handle('banking:add-account', (event, accountData) => {
  try {
    return bankingService.addBankAccount(accountData);
  } catch (error) {
    console.error('Add bank account error:', error);
    return { success: false, error: error.message };
  }
});

// Get all bank accounts
ipcMain.handle('banking:get-accounts', (event) => {
  try {
    return bankingService.getBankAccounts();
  } catch (error) {
    console.error('Get accounts error:', error);
    return [];
  }
});

// Get single bank account
ipcMain.handle('banking:get-account', (event, accountId) => {
  try {
    return bankingService.getBankAccount(accountId);
  } catch (error) {
    console.error('Get account error:', error);
    return null;
  }
});

// Update bank account
ipcMain.handle('banking:update-account', (event, accountId, updates) => {
  try {
    return bankingService.updateBankAccount(accountId, updates);
  } catch (error) {
    console.error('Update account error:', error);
    return { success: false, error: error.message };
  }
});

// Delete bank account
ipcMain.handle('banking:delete-account', (event, accountId) => {
  try {
    return bankingService.deleteBankAccount(accountId);
  } catch (error) {
    console.error('Delete account error:', error);
    return { success: false, error: error.message };
  }
});

// Add bank transaction
ipcMain.handle('banking:add-transaction', (event, transactionData) => {
  try {
    return bankingService.addBankTransaction(transactionData);
  } catch (error) {
    console.error('Add transaction error:', error);
    return { success: false, error: error.message };
  }
});

// Get bank transactions
ipcMain.handle('banking:get-transactions', (event, filters) => {
  try {
    return bankingService.getBankTransactions(filters);
  } catch (error) {
    console.error('Get transactions error:', error);
    return [];
  }
});

// Get unmatched transactions
ipcMain.handle('banking:get-unmatched', (event, accountId) => {
  try {
    return bankingService.getUnmatchedTransactions(accountId);
  } catch (error) {
    console.error('Get unmatched error:', error);
    return [];
  }
});

// Auto reconcile
ipcMain.handle('banking:auto-reconcile', (event, accountId) => {
  try {
    return bankingService.autoReconcile(accountId);
  } catch (error) {
    console.error('Auto reconcile error:', error);
    return { success: false, error: error.message };
  }
});

// Match transaction
ipcMain.handle('banking:match-transaction', (event, transactionId, invoiceId, invoiceType) => {
  try {
    return bankingService.matchTransaction(transactionId, invoiceId, invoiceType);
  } catch (error) {
    console.error('Match transaction error:', error);
    return { success: false, error: error.message };
  }
});

// Unmatch transaction
ipcMain.handle('banking:unmatch-transaction', (event, transactionId) => {
  try {
    return bankingService.unmatchTransaction(transactionId);
  } catch (error) {
    console.error('Unmatch transaction error:', error);
    return { success: false, error: error.message };
  }
});

// Get reconciliation summary
ipcMain.handle('banking:get-summary', (event, accountId) => {
  try {
    return bankingService.getReconciliationSummary(accountId);
  } catch (error) {
    console.error('Reconciliation summary error:', error);
    return null;
  }
});

// Add reconciliation rule
ipcMain.handle('banking:add-rule', (event, ruleData) => {
  try {
    return bankingService.addReconciliationRule(ruleData);
  } catch (error) {
    console.error('Add rule error:', error);
    return { success: false, error: error.message };
  }
});

// Get reconciliation rules
ipcMain.handle('banking:get-rules', (event, accountId) => {
  try {
    return bankingService.getReconciliationRules(accountId);
  } catch (error) {
    console.error('Get rules error:', error);
    return [];
  }
});

// Delete reconciliation rule
ipcMain.handle('banking:delete-rule', (event, ruleId) => {
  try {
    return bankingService.deleteReconciliationRule(ruleId);
  } catch (error) {
    console.error('Delete rule error:', error);
    return { success: false, error: error.message };
  }
});

// Import bank statement
ipcMain.handle('banking:import-statement', (event, accountId, transactions) => {
  try {
    return bankingService.importBankStatement(accountId, transactions);
  } catch (error) {
    console.error('Import statement error:', error);
    return { success: false, error: error.message };
  }
});

// ==================== PAYMENT GATEWAY IPC HANDLERS ====================

// Save gateway configuration
ipcMain.handle('payment:save-config', (event, configData) => {
  try {
    return paymentGatewayService.saveGatewayConfig(configData);
  } catch (error) {
    console.error('Save payment config error:', error);
    return { success: false, error: error.message };
  }
});

// Get gateway configuration
ipcMain.handle('payment:get-config', (event, gatewayName) => {
  try {
    return paymentGatewayService.getGatewayConfig(gatewayName);
  } catch (error) {
    console.error('Get payment config error:', error);
    return [];
  }
});

// Get active gateway
ipcMain.handle('payment:get-active-gateway', (event) => {
  try {
    return paymentGatewayService.getActiveGateway();
  } catch (error) {
    console.error('Get active gateway error:', error);
    return null;
  }
});

// Set gateway status
ipcMain.handle('payment:set-status', (event, gatewayId, isActive) => {
  try {
    return paymentGatewayService.setGatewayStatus(gatewayId, isActive);
  } catch (error) {
    console.error('Set gateway status error:', error);
    return { success: false, error: error.message };
  }
});

// Create payment link
ipcMain.handle('payment:create-link', (event, invoiceId) => {
  try {
    return paymentGatewayService.createPaymentLink(invoiceId);
  } catch (error) {
    console.error('Create payment link error:', error);
    return { success: false, error: error.message };
  }
});

// Get payment link
ipcMain.handle('payment:get-link', (event, token) => {
  try {
    return paymentGatewayService.getPaymentLink(token);
  } catch (error) {
    console.error('Get payment link error:', error);
    return null;
  }
});

// Initiate payment
ipcMain.handle('payment:initiate', (event, paymentData) => {
  try {
    return paymentGatewayService.initiatePayment(paymentData);
  } catch (error) {
    console.error('Initiate payment error:', error);
    return { success: false, error: error.message };
  }
});

// Update payment status
ipcMain.handle('payment:update-status', (event, paymentId, status, gatewayResponse) => {
  try {
    return paymentGatewayService.updatePaymentStatus(paymentId, status, gatewayResponse);
  } catch (error) {
    console.error('Update payment status error:', error);
    return { success: false, error: error.message };
  }
});

// Get payment transaction
ipcMain.handle('payment:get-transaction', (event, paymentId) => {
  try {
    return paymentGatewayService.getPaymentTransaction(paymentId);
  } catch (error) {
    console.error('Get payment transaction error:', error);
    return null;
  }
});

// Get invoice payments
ipcMain.handle('payment:get-invoice-payments', (event, invoiceId) => {
  try {
    return paymentGatewayService.getInvoicePayments(invoiceId);
  } catch (error) {
    console.error('Get invoice payments error:', error);
    return [];
  }
});

// Get payment transactions
ipcMain.handle('payment:get-transactions', (event, filters) => {
  try {
    return paymentGatewayService.getPaymentTransactions(filters);
  } catch (error) {
    console.error('Get payment transactions error:', error);
    return [];
  }
});

// Get payment summary
ipcMain.handle('payment:get-summary', (event, filters) => {
  try {
    return paymentGatewayService.getPaymentSummary(filters);
  } catch (error) {
    console.error('Get payment summary error:', error);
    return null;
  }
});

// Process refund
ipcMain.handle('payment:process-refund', (event, paymentId, amount, reason) => {
  try {
    return paymentGatewayService.processRefund(paymentId, amount, reason);
  } catch (error) {
    console.error('Process refund error:', error);
    return { success: false, error: error.message };
  }
});

// Get refunds
ipcMain.handle('payment:get-refunds', (event, paymentId) => {
  try {
    return paymentGatewayService.getRefunds(paymentId);
  } catch (error) {
    console.error('Get refunds error:', error);
    return [];
  }
});

// Get webhook logs
ipcMain.handle('payment:get-webhook-logs', (event, limit) => {
  try {
    return paymentGatewayService.getWebhookLogs(limit);
  } catch (error) {
    console.error('Get webhook logs error:', error);
    return [];
  }
});

// Test gateway connection
ipcMain.handle('payment:test-connection', (event, gatewayId) => {
  try {
    return paymentGatewayService.testGatewayConnection(gatewayId);
  } catch (error) {
    console.error('Test connection error:', error);
    return { success: false, error: error.message };
  }
});

// Helper functions
function getDefaultStartDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function getDefaultEndDate() {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.toISOString().split('T')[0];
}

// Integration initialization handler
ipcMain.handle('integration:initialize', async () => {
  return initializeIntegrationService();
});

// Get all integration connections status
ipcMain.handle('integration:get-connections', async (event, userId = 1) => {
  try {
    await initializeIntegrationService();
    const integrationService = require(path.join(__dirname, '../src/services/integrationService'));
    
    // Get tokens for each provider to determine connection status
    const providers = ['tally', 'busy', 'quickbooks', 'xero', 'zoho'];
    const connections = [];
    
    for (const provider of providers) {
      try {
        const tokens = await integrationService.AuthService.getTokens(userId, provider);
        connections.push({
          provider,
          connected: !!tokens,
          hasRefreshToken: !!tokens?.refreshToken
        });
      } catch (err) {
        connections.push({
          provider,
          connected: false,
          error: err.message
        });
      }
    }
    
    return { success: true, connections };
  } catch (error) {
    console.error('Get connections error:', error);
    return { success: false, error: error.message, connections: [] };
  }
});

// Check specific provider connection status
ipcMain.handle('integration:check-connection', async (event, provider, userId = 1) => {
  try {
    await initializeIntegrationService();
    const integrationService = require(path.join(__dirname, '../src/services/integrationService'));
    
    const tokens = await integrationService.AuthService.getTokens(userId, provider);
    
    return {
      success: true,
      isConnected: !!tokens,
      hasRefreshToken: !!tokens?.refreshToken,
      expiresAt: tokens?.expiresAt
    };
  } catch (error) {
    console.error('Check connection error:', error);
    return { success: false, error: error.message, isConnected: false };
  }
});

// Save OAuth tokens after OAuth callback
ipcMain.handle('integration:save-tokens', async (event, userId, provider, tokens) => {
  try {
    await initializeIntegrationService();
    const integrationService = require(path.join(__dirname, '../src/services/integrationService'));
    
    await integrationService.AuthService.saveTokens(userId, provider, tokens);
    
    // Log audit event
    const dbService = integrationService.getDb();
    await dbService.logAuditEvent({
      userId,
      action: 'OAUTH_CONNECTED',
      resourceType: 'integration',
      resourceId: provider,
      details: { provider, hasRefreshToken: !!tokens.refreshToken }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Save tokens error:', error);
    return { success: false, error: error.message };
  }
});

// Delete tokens (disconnect)
ipcMain.handle('integration:disconnect', async (event, userId, provider) => {
  try {
    await initializeIntegrationService();
    const integrationService = require(path.join(__dirname, '../src/services/integrationService'));
    
    await integrationService.AuthService.deleteTokens(userId, provider);
    
    // Log audit event
    const dbService = integrationService.getDb();
    await dbService.logAuditEvent({
      userId,
      action: 'OAUTH_DISCONNECTED',
      resourceType: 'integration',
      resourceId: provider
    });
    
    return { success: true };
  } catch (error) {
    console.error('Disconnect error:', error);
    return { success: false, error: error.message };
  }
});

// Get OAuth authorization URL for cloud providers
ipcMain.handle('integration:get-auth-url', async (event, provider) => {
  try {
    await initializeIntegrationService();
    const integrationService = require(path.join(__dirname, '../src/services/integrationService'));
    
    let authUrl;
    
    switch (provider) {
      case 'quickbooks': {
        const QuickBooksModule = require(path.join(__dirname, '../enterprise-integrations/src/modules/quickbooks'));
        authUrl = QuickBooksModule.getAuthUrl();
        break;
      }
      case 'xero': {
        const XeroModule = require(path.join(__dirname, '../enterprise-integrations/src/modules/xero'));
        authUrl = XeroModule.getAuthUrl();
        break;
      }
      case 'zoho': {
        const ZohoModule = require(path.join(__dirname, '../enterprise-integrations/src/modules/zoho'));
        authUrl = ZohoModule.getAuthUrl();
        break;
      }
      default:
        throw new Error(`Provider ${provider} does not require OAuth`);
    }
    
    return { success: true, url: authUrl };
  } catch (error) {
    console.error('Get auth URL error:', error);
    return { success: false, error: error.message };
  }
});

// Start sync operation
ipcMain.handle('integration:start-sync', async (event, userId, provider, syncType = 'full') => {
  try {
    await initializeIntegrationService();
    const integrationService = require(path.join(__dirname, '../src/services/integrationService'));
    
    // Create sync session
    const session = await integrationService.SyncService.startSync(userId, provider, syncType);
    
    return {
      success: true,
      syncId: session.syncId,
      status: session.status
    };
  } catch (error) {
    console.error('Start sync error:', error);
    return { success: false, error: error.message };
  }
});

// Complete sync operation
ipcMain.handle('integration:complete-sync', async (event, syncId, result) => {
  try {
    const integrationService = require(path.join(__dirname, '../src/services/integrationService'));
    
    await integrationService.SyncService.completeSync(syncId, result);
    
    return { success: true };
  } catch (error) {
    console.error('Complete sync error:', error);
    return { success: false, error: error.message };
  }
});

// Get sync history
ipcMain.handle('integration:get-sync-history', async (event, userId, provider = null, limit = 20) => {
  try {
    const integrationService = require(path.join(__dirname, '../src/services/integrationService'));
    const db = integrationService.getDb();
    
    return new Promise((resolve, reject) => {
      let sql = 'SELECT * FROM sync_history WHERE user_id = ?';
      const params = [userId];
      
      if (provider) {
        sql += ' AND provider = ?';
        params.push(provider);
      }
      
      sql += ' ORDER BY started_at DESC LIMIT ?';
      params.push(limit);
      
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve({ success: true, history: rows || [] });
      });
    });
  } catch (error) {
    console.error('Get sync history error:', error);
    return { success: false, error: error.message, history: [] };
  }
});

// Get audit logs for integrations
ipcMain.handle('integration:get-audit-logs', async (event, userId, options = {}) => {
  try {
    await initializeIntegrationService();
    const integrationService = require(path.join(__dirname, '../src/services/integrationService'));
    
    const logs = await integrationService.AuditService.getLogs(userId, options);
    
    return { success: true, logs };
  } catch (error) {
    console.error('Get audit logs error:', error);
    return { success: false, error: error.message, logs: [] };
  }
});

// Configure local integration (Tally, Busy)
ipcMain.handle('integration:configure-local', async (event, userId, provider, config) => {
  try {
    await initializeIntegrationService();
    const integrationService = require(path.join(__dirname, '../src/services/integrationService'));
    const db = integrationService.getDb();
    
    // Save configuration (encrypted)
    const crypto = integrationService.getCrypto();
    const configEncrypted = crypto.encrypt(JSON.stringify(config));
    
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO integration_configs 
         (user_id, provider, config_encrypted, config_iv, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [userId, provider, configEncrypted.content, configEncrypted.iv],
        (err) => {
          if (err) reject(err);
          else resolve({ success: true });
        }
      );
    });
  } catch (error) {
    console.error('Configure local error:', error);
    return { success: false, error: error.message };
  }
});

// Test local integration connection
ipcMain.handle('integration:test-local-connection', async (event, userId, provider, config) => {
  try {
    await initializeIntegrationService();
    
    let testResult;
    
    switch (provider) {
      case 'tally': {
        const TallyModule = require(path.join(__dirname, '../enterprise-integrations/src/modules/tally'));
        testResult = await TallyModule.testConnection(config);
        break;
      }
      case 'busy': {
        const BusyModule = require(path.join(__dirname, '../enterprise-integrations/src/modules/busy'));
        testResult = await BusyModule.testConnection(config);
        break;
      }
      default:
        throw new Error(`Unknown local provider: ${provider}`);
    }
    
    return testResult;
  } catch (error) {
    console.error('Test local connection error:', error);
    return { success: false, error: error.message };
  }
});

// ==================== ERROR RECOVERY & IDEMPOTENCY IPC HANDLERS ====================

// Get dead letter queue
ipcMain.handle('integration:get-dead-letter-queue', async (event, options = {}) => {
  try {
    await initializeIntegrationService();
    const integrationService = require(path.join(__dirname, '../src/services/integrationService'));
    
    const result = await integrationService.ErrorRecoveryService.getDeadLetterQueue(options);
    return result;
  } catch (error) {
    console.error('Get DLQ error:', error);
    return { success: false, error: error.message, items: [] };
  }
});

// Retry dead letter queue item
ipcMain.handle('integration:retry-dlq-item', async (event, dlqId) => {
  try {
    await initializeIntegrationService();
    const integrationService = require(path.join(__dirname, '../src/services/integrationService'));
    
    const result = await integrationService.ErrorRecoveryService.retryDeadLetterItem(dlqId);
    return result;
  } catch (error) {
    console.error('Retry DLQ item error:', error);
    return { success: false, error: error.message };
  }
});

// Resolve dead letter queue item
ipcMain.handle('integration:resolve-dlq-item', async (event, dlqId, resolution) => {
  try {
    await initializeIntegrationService();
    const integrationService = require(path.join(__dirname, '../src/services/integrationService'));
    
    const result = await integrationService.ErrorRecoveryService.resolveDeadLetterItem(dlqId, resolution);
    return result;
  } catch (error) {
    console.error('Resolve DLQ item error:', error);
    return { success: false, error: error.message };
  }
});

// Clear dead letter queue
ipcMain.handle('integration:clear-dead-letter-queue', async (event, userId, provider) => {
  try {
    await initializeIntegrationService();
    const integrationService = require(path.join(__dirname, '../src/services/integrationService'));
    
    const result = await integrationService.ErrorRecoveryService.clearDeadLetterQueue(userId, provider);
    return result;
  } catch (error) {
    console.error('Clear DLQ error:', error);
    return { success: false, error: error.message };
  }
});

// Check reconciliation
ipcMain.handle('integration:check-reconciliation', async (event, userId, provider, entityType) => {
  try {
    await initializeIntegrationService();
    const integrationService = require(path.join(__dirname, '../src/services/integrationService'));
    
    const result = await integrationService.ErrorRecoveryService.checkReconciliation(userId, provider, entityType);
    return result;
  } catch (error) {
    console.error('Check reconciliation error:', error);
    return { success: false, error: error.message, issues: [] };
  }
});

// Get operation statistics
ipcMain.handle('integration:get-operation-stats', async (event, userId, provider = null) => {
  try {
    await initializeIntegrationService();
    const integrationService = require(path.join(__dirname, '../src/services/integrationService'));
    
    const result = await integrationService.ErrorRecoveryService.getOperationStats(userId, provider);
    return result;
  } catch (error) {
    console.error('Get operation stats error:', error);
    return { success: false, error: error.message, stats: null };
  }
});

// Get enhanced sync history (with formatted errors)
ipcMain.handle('integration:get-sync-history-enhanced', async (event, userId, provider = null, limit = 50) => {
  try {
    await initializeIntegrationService();
    const integrationService = require(path.join(__dirname, '../src/services/integrationService'));
    
    const history = await integrationService.SyncService.getSyncHistory(userId, provider, limit);
    return { success: true, history };
  } catch (error) {
    console.error('Get enhanced sync history error:', error);
    return { success: false, error: error.message, history: [] };
  }
});
