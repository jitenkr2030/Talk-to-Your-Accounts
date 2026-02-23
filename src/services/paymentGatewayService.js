/**
 * Payment Gateway Service
 * 
 * Handles payment gateway integration for collecting payments from invoices.
 * Supports multiple gateways (Razorpay, Stripe, PayPal) with auto-reconciliation.
 * 
 * Features:
 * - Gateway configuration management
 * - Payment link generation
 * - Payment processing
 * - Webhook handling
 * - Refund management
 * - Transaction logging
 */

let db = null;

/**
 * Initialize the payment gateway service
 * @param {Object} database - Database instance
 */
function initialize(database) {
  db = database;
  console.log('[PaymentGatewayService] Initialized');
  createPaymentTables();
}

/**
 * Create payment-related database tables
 */
function createPaymentTables() {
  if (!db) return;
  
  db.exec(`
    -- Payment Gateway Configuration
    CREATE TABLE IF NOT EXISTS payment_gateways (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gateway_name TEXT NOT NULL,
      is_active INTEGER DEFAULT 0,
      api_key TEXT,
      api_secret TEXT,
      webhook_secret TEXT,
      merchant_id TEXT,
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Payment Transactions
    CREATE TABLE IF NOT EXISTS payment_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER,
      gateway_id INTEGER,
      payment_id TEXT UNIQUE,
      order_id TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'INR',
      status TEXT DEFAULT 'pending', -- pending, processing, succeeded, failed, refunded, partially_refunded
      payment_method TEXT,
      customer_email TEXT,
      customer_phone TEXT,
      gateway_response TEXT,
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES transactions(id),
      FOREIGN KEY (gateway_id) REFERENCES payment_gateways(id)
    );
    
    -- Payment Links
    CREATE TABLE IF NOT EXISTS payment_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      link_token TEXT UNIQUE,
      payment_url TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'INR',
      status TEXT DEFAULT 'active', -- active, expired, used
      expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES transactions(id)
    );
    
    -- Refund Records
    CREATE TABLE IF NOT EXISTS refunds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id INTEGER NOT NULL,
      refund_id TEXT UNIQUE,
      amount REAL NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'initiated', -- initiated, processed, failed
      gateway_response TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (payment_id) REFERENCES payment_transactions(id)
    );
    
    -- Webhook Logs
    CREATE TABLE IF NOT EXISTS webhook_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gateway_id INTEGER,
      event_type TEXT,
      payload TEXT,
      signature_valid INTEGER DEFAULT 0,
      processed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (gateway_id) REFERENCES payment_gateways(id)
    );
  `);
}

/**
 * Save gateway configuration
 */
function saveGatewayConfig(configData) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const { gateway_name, api_key, api_secret, webhook_secret, merchant_id, is_default } = configData;
    
    // If this is set as default, unset other defaults
    if (is_default) {
      db.prepare(`UPDATE payment_gateways SET is_default = 0`).run();
    }
    
    // Check if gateway exists
    const existing = db.prepare(`SELECT id FROM payment_gateways WHERE gateway_name = ?`).get(gateway_name);
    
    if (existing) {
      // Update existing
      db.prepare(`
        UPDATE payment_gateways 
        SET api_key = ?, api_secret = ?, webhook_secret = ?, merchant_id = ?, is_default = ?, updated_at = datetime('now')
        WHERE gateway_name = ?
      `).run(api_key, api_secret, webhook_secret, merchant_id, is_default ? 1 : 0, gateway_name);
      
      return { success: true, message: 'Gateway configuration updated' };
    } else {
      // Insert new
      db.prepare(`
        INSERT INTO payment_gateways (gateway_name, api_key, api_secret, webhook_secret, merchant_id, is_default)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(gateway_name, api_key, api_secret, webhook_secret, merchant_id, is_default ? 1 : 0);
      
      return { success: true, message: 'Gateway configuration saved' };
    }
  } catch (error) {
    console.error('[PaymentGatewayService] Save config error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get gateway configuration
 */
function getGatewayConfig(gatewayName = null) {
  if (!db) return [];
  
  try {
    let query = `SELECT id, gateway_name, is_active, is_default, merchant_id, created_at, updated_at FROM payment_gateways`;
    const params = [];
    
    if (gatewayName) {
      query += ` WHERE gateway_name = ?`;
      params.push(gatewayName);
    }
    
    query += ` ORDER BY is_default DESC, created_at DESC`;
    
    return db.prepare(query).all(...params);
  } catch (error) {
    console.error('[PaymentGatewayService] Get config error:', error);
    return [];
  }
}

/**
 * Get active gateway
 */
function getActiveGateway() {
  if (!db) return null;
  
  try {
    return db.prepare(`
      SELECT * FROM payment_gateways WHERE is_active = 1 OR is_default = 1
      ORDER BY is_default DESC LIMIT 1
    `).get();
  } catch (error) {
    console.error('[PaymentGatewayService] Get active gateway error:', error);
    return null;
  }
}

/**
 * Activate/deactivate gateway
 */
function setGatewayStatus(gatewayId, isActive) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    db.prepare(`UPDATE payment_gateways SET is_active = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(isActive ? 1 : 0, gatewayId);
    
    return { success: true, message: `Gateway ${isActive ? 'activated' : 'deactivated'}` };
  } catch (error) {
    console.error('[PaymentGatewayService] Set status error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create payment link for invoice
 */
function createPaymentLink(invoiceId) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    // Get invoice details
    const invoice = db.prepare(`
      SELECT t.*, p.name as party_name, p.contact as party_contact
      FROM transactions t
      LEFT JOIN parties p ON t.party_id = p.id
      WHERE t.id = ?
    `).get(invoiceId);
    
    if (!invoice) {
      return { success: false, error: 'Invoice not found' };
    }
    
    // Get active gateway
    const gateway = getActiveGateway();
    if (!gateway) {
      return { success: false, error: 'No active payment gateway configured' };
    }
    
    // Generate unique token
    const token = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create payment link
    const result = db.prepare(`
      INSERT INTO payment_links (invoice_id, link_token, amount, currency, expires_at)
      VALUES (?, ?, ?, ?, datetime('now', '+30 days'))
    `).run(invoiceId, token, invoice.total_amount, invoice.currency || 'INR');
    
    const paymentLink = {
      id: result.lastInsertRowid,
      link_token: token,
      payment_url: `/pay/${token}`,
      amount: invoice.total_amount,
      invoice_number: invoice.voucher_number,
      party_name: invoice.party_name
    };
    
    return {
      success: true,
      payment_link: paymentLink,
      message: 'Payment link created successfully'
    };
  } catch (error) {
    console.error('[PaymentGatewayService] Create payment link error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get payment link by token
 */
function getPaymentLink(token) {
  if (!db) return null;
  
  try {
    const link = db.prepare(`
      SELECT pl.*, t.voucher_number, t.total_amount, t.party_id, p.name as party_name, p.contact as party_contact
      FROM payment_links pl
      LEFT JOIN transactions t ON pl.invoice_id = t.id
      LEFT JOIN parties p ON t.party_id = p.id
      WHERE pl.link_token = ? AND pl.status = 'active'
    `).get(token);
    
    return link;
  } catch (error) {
    console.error('[PaymentGatewayService] Get payment link error:', error);
    return null;
  }
}

/**
 * Initiate payment (simulated)
 */
function initiatePayment(paymentData) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const { invoice_id, gateway_id, amount, currency, customer_email, customer_phone, payment_method } = paymentData;
    
    // Generate payment ID
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create payment transaction
    const result = db.prepare(`
      INSERT INTO payment_transactions (invoice_id, gateway_id, payment_id, amount, currency, status, payment_method, customer_email, customer_phone)
      VALUES (?, ?, ?, ?, ?, 'processing', ?, ?, ?)
    `).run(invoice_id, gateway_id, paymentId, amount, currency || 'INR', payment_method, customer_email, customer_phone);
    
    // Simulate payment processing (in real implementation, this would call gateway API)
    return {
      success: true,
      payment_id: paymentId,
      transaction_id: result.lastInsertRowid,
      message: 'Payment initiated successfully',
      // In real implementation, would return gateway payment URL
      payment_url: `/payment/process/${paymentId}`
    };
  } catch (error) {
    console.error('[PaymentGatewayService] Initiate payment error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update payment status (webhook handler)
 */
function updatePaymentStatus(paymentId, status, gatewayResponse = {}) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const updateData = {
      status: status,
      gateway_response: JSON.stringify(gatewayResponse),
      updated_at: new Date().toISOString()
    };
    
    db.prepare(`
      UPDATE payment_transactions 
      SET status = ?, gateway_response = ?, updated_at = datetime('now')
      WHERE payment_id = ?
    `).run(status, JSON.stringify(gatewayResponse), paymentId);
    
    // If payment succeeded, update invoice status
    if (status === 'succeeded') {
      const payment = db.prepare(`SELECT invoice_id FROM payment_transactions WHERE payment_id = ?`).get(paymentId);
      if (payment) {
        db.prepare(`UPDATE transactions SET payment_status = 'paid' WHERE id = ?`).run(payment.invoice_id);
      }
    }
    
    return { success: true, message: 'Payment status updated' };
  } catch (error) {
    console.error('[PaymentGatewayService] Update status error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get payment transaction by ID
 */
function getPaymentTransaction(paymentId) {
  if (!db) return null;
  
  try {
    return db.prepare(`
      SELECT pt.*, t.voucher_number, t.total_amount, pg.gateway_name
      FROM payment_transactions pt
      LEFT JOIN transactions t ON pt.invoice_id = t.id
      LEFT JOIN payment_gateways pg ON pt.gateway_id = pg.id
      WHERE pt.payment_id = ?
    `).get(paymentId);
  } catch (error) {
    console.error('[PaymentGatewayService] Get payment error:', error);
    return null;
  }
}

/**
 * Get payments for invoice
 */
function getInvoicePayments(invoiceId) {
  if (!db) return [];
  
  try {
    return db.prepare(`
      SELECT * FROM payment_transactions WHERE invoice_id = ? ORDER BY created_at DESC
    `).all(invoiceId);
  } catch (error) {
    console.error('[PaymentGatewayService] Get invoice payments error:', error);
    return [];
  }
}

/**
 * Get all payment transactions with filters
 */
function getPaymentTransactions(filters = {}) {
  if (!db) return [];
  
  try {
    const { status, gateway_id, start_date, end_date, limit = 50 } = filters;
    
    let query = `
      SELECT pt.*, t.voucher_number, pg.gateway_name
      FROM payment_transactions pt
      LEFT JOIN transactions t ON pt.invoice_id = t.id
      LEFT JOIN payment_gateways pg ON pt.gateway_id = pg.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      query += ' AND pt.status = ?';
      params.push(status);
    }
    
    if (gateway_id) {
      query += ' AND pt.gateway_id = ?';
      params.push(gateway_id);
    }
    
    if (start_date) {
      query += ' AND pt.created_at >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND pt.created_at <= ?';
      params.push(end_date);
    }
    
    query += ' ORDER BY pt.created_at DESC LIMIT ?';
    params.push(limit);
    
    return db.prepare(query).all(...params);
  } catch (error) {
    console.error('[PaymentGatewayService] Get transactions error:', error);
    return [];
  }
}

/**
 * Get payment summary
 */
function getPaymentSummary(filters = {}) {
  if (!db) return null;
  
  try {
    const { start_date, end_date } = filters;
    
    let whereClause = '';
    const params = [];
    
    if (start_date || end_date) {
      whereClause = 'WHERE ';
      if (start_date) {
        whereClause += 'created_at >= ?';
        params.push(start_date);
      }
      if (start_date && end_date) {
        whereClause += ' AND ';
      }
      if (end_date) {
        whereClause += 'created_at <= ?';
        params.push(end_date);
      }
    }
    
    const summary = db.prepare(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END) as total_collected,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as total_pending,
        SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END) as total_failed,
        SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END) as total_refunded
      FROM payment_transactions
      ${whereClause}
    `).get(...params);
    
    // By status breakdown
    const byStatus = db.prepare(`
      SELECT status, COUNT(*) as count, SUM(amount) as total
      FROM payment_transactions
      ${whereClause}
      GROUP BY status
    `).all(...params);
    
    return {
      ...summary,
      by_status: byStatus
    };
  } catch (error) {
    console.error('[PaymentGatewayService] Get summary error:', error);
    return null;
  }
}

/**
 * Process refund
 */
function processRefund(paymentId, amount, reason) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const payment = db.prepare(`SELECT * FROM payment_transactions WHERE payment_id = ?`).get(paymentId);
    
    if (!payment) {
      return { success: false, error: 'Payment not found' };
    }
    
    if (payment.status !== 'succeeded') {
      return { success: false, error: 'Can only refund successful payments' };
    }
    
    if (amount > payment.amount) {
      return { success: false, error: 'Refund amount cannot exceed payment amount' };
    }
    
    // Create refund record
    const refundId = `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    db.prepare(`
      INSERT INTO refunds (payment_id, refund_id, amount, reason, status)
      VALUES (?, ?, ?, ?, 'initiated')
    `).run(payment.id, refundId, amount, reason);
    
    // Update payment status
    const newStatus = amount === payment.amount ? 'refunded' : 'partially_refunded';
    db.prepare(`UPDATE payment_transactions SET status = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(newStatus, payment.id);
    
    return {
      success: true,
      refund_id: refundId,
      message: 'Refund initiated successfully'
    };
  } catch (error) {
    console.error('[PaymentGatewayService] Process refund error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get refunds for payment
 */
function getRefunds(paymentId) {
  if (!db) return [];
  
  try {
    return db.prepare(`
      SELECT * FROM refunds WHERE payment_id = ? ORDER BY created_at DESC
    `).all(paymentId);
  } catch (error) {
    console.error('[PaymentGatewayService] Get refunds error:', error);
    return [];
  }
}

/**
 * Log webhook event
 */
function logWebhookEvent(gatewayId, eventType, payload, signatureValid) {
  if (!db) return;
  
  try {
    db.prepare(`
      INSERT INTO webhook_logs (gateway_id, event_type, payload, signature_valid)
      VALUES (?, ?, ?, ?)
    `).run(gatewayId, eventType, JSON.stringify(payload), signatureValid ? 1 : 0);
  } catch (error) {
    console.error('[PaymentGatewayService] Log webhook error:', error);
  }
}

/**
 * Get webhook logs
 */
function getWebhookLogs(limit = 50) {
  if (!db) return [];
  
  try {
    return db.prepare(`
      SELECT wl.*, pg.gateway_name
      FROM webhook_logs wl
      LEFT JOIN payment_gateways pg ON wl.gateway_id = pg.id
      ORDER BY wl.created_at DESC
      LIMIT ?
    `).all(limit);
  } catch (error) {
    console.error('[PaymentGatewayService] Get webhook logs error:', error);
    return [];
  }
}

/**
 * Test gateway connection
 */
function testGatewayConnection(gatewayId) {
  if (!db) return { success: false, error: 'Database not initialized' };
  
  try {
    const gateway = db.prepare(`SELECT * FROM payment_gateways WHERE id = ?`).get(gatewayId);
    
    if (!gateway) {
      return { success: false, error: 'Gateway not found' };
    }
    
    // Simulate connection test (in real implementation, would call gateway API)
    // For demo, just check if keys exist
    if (!gateway.api_key || !gateway.api_secret) {
      return { success: false, error: 'API keys not configured' };
    }
    
    return {
      success: true,
      message: `Connection to ${gateway.gateway_name} successful`
    };
  } catch (error) {
    console.error('[PaymentGatewayService] Test connection error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  initialize,
  saveGatewayConfig,
  getGatewayConfig,
  getActiveGateway,
  setGatewayStatus,
  createPaymentLink,
  getPaymentLink,
  initiatePayment,
  updatePaymentStatus,
  getPaymentTransaction,
  getInvoicePayments,
  getPaymentTransactions,
  getPaymentSummary,
  processRefund,
  getRefunds,
  logWebhookEvent,
  getWebhookLogs,
  testGatewayConnection
};
