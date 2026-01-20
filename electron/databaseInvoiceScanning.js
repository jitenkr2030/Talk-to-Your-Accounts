// Database operations for Invoice Scanning Feature
// SQLite database management for scanned invoices with header-line item structure

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class InvoiceScanningDB {
  constructor() {
    this.db = null;
    this.dbPath = null;
  }

  // Initialize the invoice scanning database tables
  initialize(userDataPath) {
    this.dbPath = path.join(userDataPath, 'invoice_scanning.db');
    
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    
    // Create tables if not exist
    this.createTables();
    
    return this;
  }

  // Create all database tables for invoice scanning
  createTables() {
    const statements = [
      // Invoice Headers - stores common invoice information
      `CREATE TABLE IF NOT EXISTS invoice_headers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT NOT NULL,
        invoice_date TEXT NOT NULL,
        due_date TEXT,
        party_name TEXT,
        party_gstin TEXT,
        party_address TEXT,
        party_phone TEXT,
        vendor_name TEXT,
        vendor_gstin TEXT,
        subtotal REAL DEFAULT 0,
        total_gst REAL DEFAULT 0,
        total_amount REAL NOT NULL,
        tax_type TEXT DEFAULT 'GST',
        notes TEXT,
        image_path TEXT,
        ocr_confidence REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Invoice Line Items - stores individual line items
      `CREATE TABLE IF NOT EXISTS invoice_lines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        header_id INTEGER NOT NULL,
        item_number INTEGER DEFAULT 0,
        description TEXT NOT NULL,
        hsn_code TEXT,
        quantity REAL NOT NULL,
        unit TEXT DEFAULT 'pcs',
        rate REAL NOT NULL,
        amount REAL NOT NULL,
        discount_percent REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        gst_rate REAL DEFAULT 0,
        cgst_amount REAL DEFAULT 0,
        sgst_amount REAL DEFAULT 0,
        igst_amount REAL DEFAULT 0,
        total_amount REAL NOT NULL,
        confidence REAL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (header_id) REFERENCES invoice_headers(id) ON DELETE CASCADE
      )`,

      // Scanned Images - stores image paths and metadata
      `CREATE TABLE IF NOT EXISTS scanned_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        header_id INTEGER,
        image_path TEXT NOT NULL,
        thumbnail_path TEXT,
        image_width INTEGER,
        image_height INTEGER,
        file_size INTEGER,
        scan_quality TEXT DEFAULT 'medium',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (header_id) REFERENCES invoice_headers(id) ON DELETE CASCADE
      )`,

      // Duplicate Detection Log
      `CREATE TABLE IF NOT EXISTS duplicate_check_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT NOT NULL,
        vendor_name TEXT,
        invoice_date TEXT,
        total_amount REAL,
        check_result TEXT,
        matched_invoice_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,

      // Processing Queue
      `CREATE TABLE IF NOT EXISTS processing_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_path TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        priority INTEGER DEFAULT 0,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        processed_at TEXT
      )`
    ];

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_invoice_headers_number ON invoice_headers(invoice_number)',
      'CREATE INDEX IF NOT EXISTS idx_invoice_headers_date ON invoice_headers(invoice_date)',
      'CREATE INDEX IF NOT EXISTS idx_invoice_headers_status ON invoice_headers(status)',
      'CREATE INDEX IF NOT EXISTS idx_invoice_lines_header ON invoice_lines(header_id)',
      'CREATE INDEX IF NOT EXISTS idx_duplicate_check_log_number ON duplicate_check_log(invoice_number)',
      'CREATE INDEX IF NOT EXISTS idx_processing_queue_status ON processing_queue(status, priority)'
    ];

    // Execute all statements
    for (const stmt of statements) {
      try {
        this.db.exec(stmt);
      } catch (error) {
        console.error('Error creating invoice scanning table:', error);
      }
    }

    for (const index of indexes) {
      try {
        this.db.exec(index);
      } catch (error) {
        console.error('Error creating invoice scanning index:', error);
      }
    }
  }

  // ==================== INVOICE HEADER OPERATIONS ====================

  // Add a new invoice header
  addInvoiceHeader(header) {
    const stmt = this.db.prepare(`
      INSERT INTO invoice_headers (
        invoice_number, invoice_date, due_date, party_name, party_gstin,
        party_address, party_phone, vendor_name, vendor_gstin, subtotal,
        total_gst, total_amount, tax_type, notes, image_path, ocr_confidence, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      header.invoice_number,
      header.invoice_date,
      header.due_date || null,
      header.party_name || null,
      header.party_gstin || null,
      header.party_address || null,
      header.party_phone || null,
      header.vendor_name || null,
      header.vendor_gstin || null,
      header.subtotal || 0,
      header.total_gst || 0,
      header.total_amount,
      header.tax_type || 'GST',
      header.notes || null,
      header.image_path || null,
      header.ocr_confidence || 0,
      header.status || 'pending'
    );

    return result.lastInsertRowid;
  }

  // Update invoice header
  updateInvoiceHeader(id, header) {
    const fields = [];
    const values = [];

    const allowedFields = [
      'invoice_number', 'invoice_date', 'due_date', 'party_name', 'party_gstin',
      'party_address', 'party_phone', 'vendor_name', 'vendor_gstin', 'subtotal',
      'total_gst', 'total_amount', 'tax_type', 'notes', 'image_path', 'ocr_confidence', 'status'
    ];

    for (const field of allowedFields) {
      if (header[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(header[field]);
      }
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = this.db.prepare(`UPDATE invoice_headers SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return true;
  }

  // Get invoice header by ID with all line items
  getInvoiceHeader(id) {
    const header = this.db.prepare('SELECT * FROM invoice_headers WHERE id = ?').get(id);
    if (!header) return null;

    header.lines = this.db.prepare('SELECT * FROM invoice_lines WHERE header_id = ? ORDER BY item_number').all(id);
    return header;
  }

  // Get all invoice headers with optional filters
  getInvoiceHeaders(filters = {}) {
    let query = 'SELECT * FROM invoice_headers WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.startDate) {
      query += ' AND invoice_date >= ?';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ' AND invoice_date <= ?';
      params.push(filters.endDate);
    }
    if (filters.search) {
      query += ' AND (invoice_number LIKE ? OR party_name LIKE ? OR vendor_name LIKE ?)';
      const search = `%${filters.search}%`;
      params.push(search, search, search);
    }

    query += ' ORDER BY invoice_date DESC, created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    return this.db.prepare(query).all(...params);
  }

  // Delete invoice header and all line items
  deleteInvoiceHeader(id) {
    // Line items will be deleted automatically due to ON DELETE CASCADE
    const stmt = this.db.prepare('DELETE FROM invoice_headers WHERE id = ?');
    stmt.run(id);
    return true;
  }

  // ==================== INVOICE LINE OPERATIONS ====================

  // Add a new invoice line item
  addInvoiceLine(line) {
    const stmt = this.db.prepare(`
      INSERT INTO invoice_lines (
        header_id, item_number, description, hsn_code, quantity, unit,
        rate, amount, discount_percent, discount_amount, gst_rate,
        cgst_amount, sgst_amount, igst_amount, total_amount, confidence
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      line.header_id,
      line.item_number || 0,
      line.description,
      line.hsn_code || null,
      line.quantity,
      line.unit || 'pcs',
      line.rate,
      line.amount,
      line.discount_percent || 0,
      line.discount_amount || 0,
      line.gst_rate || 0,
      line.cgst_amount || 0,
      line.sgst_amount || 0,
      line.igst_amount || 0,
      line.total_amount,
      line.confidence || 0
    );

    return result.lastInsertRowid;
  }

  // Add multiple line items
  addInvoiceLines(lines) {
    const results = [];
    for (const line of lines) {
      results.push(this.addInvoiceLine(line));
    }
    return results;
  }

  // Update invoice line
  updateInvoiceLine(id, line) {
    const fields = [];
    const values = [];

    const allowedFields = [
      'item_number', 'description', 'hsn_code', 'quantity', 'unit',
      'rate', 'amount', 'discount_percent', 'discount_amount', 'gst_rate',
      'cgst_amount', 'sgst_amount', 'igst_amount', 'total_amount', 'confidence'
    ];

    for (const field of allowedFields) {
      if (line[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(line[field]);
      }
    }

    if (fields.length === 0) return false;

    values.push(id);

    const stmt = this.db.prepare(`UPDATE invoice_lines SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return true;
  }

  // Get line items for a header
  getInvoiceLines(headerId) {
    return this.db.prepare('SELECT * FROM invoice_lines WHERE header_id = ? ORDER BY item_number').all(headerId);
  }

  // ==================== DUPLICATE DETECTION ====================

  // Check for duplicate invoices
  checkDuplicate(invoiceNumber, vendorName, invoiceDate, totalAmount, tolerance = 0.01) {
    // First, log the check
    const checkStmt = this.db.prepare(`
      INSERT INTO duplicate_check_log (invoice_number, vendor_name, invoice_date, total_amount, check_result)
      VALUES (?, ?, ?, ?, ?)
    `);

    // Check for similar invoice numbers
    const exactMatch = this.db.prepare(`
      SELECT id, invoice_number, total_amount, invoice_date
      FROM invoice_headers
      WHERE invoice_number = ? AND status != 'rejected'
      LIMIT 1
    `).get(invoiceNumber);

    if (exactMatch) {
      const amountDiff = Math.abs(exactMatch.total_amount - totalAmount) / totalAmount;
      checkStmt.run(invoiceNumber, vendorName, invoiceDate, totalAmount, 'exact_match');

      return {
        isDuplicate: true,
        matchedInvoice: exactMatch,
        matchType: 'exact_number',
        confidence: 100 - (amountDiff * 100)
      };
    }

    // Check for similar amounts with same vendor and date
    const amountTolerance = totalAmount * tolerance;
    const fuzzyMatch = this.db.prepare(`
      SELECT id, invoice_number, total_amount, invoice_date, party_name, vendor_name
      FROM invoice_headers
      WHERE ABS(total_amount - ?) <= ?
      AND invoice_date = ?
      AND status != 'rejected'
      AND (party_name LIKE ? OR vendor_name LIKE ?)
      ORDER BY ABS(total_amount - ?) ASC
      LIMIT 1
    `).get(totalAmount, amountTolerance, invoiceDate, `%${vendorName}%`, `%${vendorName}%`, totalAmount);

    if (fuzzyMatch) {
      checkStmt.run(invoiceNumber, vendorName, invoiceDate, totalAmount, 'fuzzy_match');

      return {
        isDuplicate: true,
        matchedInvoice: fuzzyMatch,
        matchType: 'fuzzy_amount_date',
        confidence: 85
      };
    }

    checkStmt.run(invoiceNumber, vendorName, invoiceDate, totalAmount, 'no_match');

    return {
      isDuplicate: false,
      matchedInvoice: null,
      matchType: null,
      confidence: 0
    };
  }

  // Log duplicate check result
  logDuplicateCheck(checkData) {
    const stmt = this.db.prepare(`
      INSERT INTO duplicate_check_log (
        invoice_number, vendor_name, invoice_date, total_amount,
        check_result, matched_invoice_id
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      checkData.invoice_number,
      checkData.vendor_name || null,
      checkData.invoice_date || null,
      checkData.total_amount || 0,
      checkData.check_result,
      checkData.matched_invoice_id || null
    );

    return true;
  }

  // Get duplicate check history
  getDuplicateCheckHistory(limit = 50) {
    return this.db.prepare(`
      SELECT * FROM duplicate_check_log
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit);
  }

  // ==================== PROCESSING QUEUE ====================

  // Add image to processing queue
  addToQueue(imagePath, priority = 0) {
    const stmt = this.db.prepare(`
      INSERT INTO processing_queue (image_path, status, priority)
      VALUES (?, 'pending', ?)
    `);

    const result = stmt.run(imagePath, priority);
    return result.lastInsertRowid;
  }

  // Get next pending item from queue
  getNextPendingItem() {
    return this.db.prepare(`
      SELECT * FROM processing_queue
      WHERE status = 'pending'
      ORDER BY priority DESC, created_at ASC
      LIMIT 1
    `).get();
  }

  // Update queue item status
  updateQueueItem(id, updates) {
    const fields = [];
    const values = [];

    if (updates.status) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.error_message) {
      fields.push('error_message = ?');
      values.push(updates.error_message);
    }
    if (updates.retry_count !== undefined) {
      fields.push('retry_count = ?');
      values.push(updates.retry_count);
    }
    if (updates.status === 'completed' || updates.status === 'failed') {
      fields.push('processed_at = CURRENT_TIMESTAMP');
    }

    if (fields.length === 0) return false;

    values.push(id);

    const stmt = this.db.prepare(`UPDATE processing_queue SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return true;
  }

  // Get queue statistics
  getQueueStats() {
    const pending = this.db.prepare("SELECT COUNT(*) as count FROM processing_queue WHERE status = 'pending'").get();
    const processing = this.db.prepare("SELECT COUNT(*) as count FROM processing_queue WHERE status = 'processing'").get();
    const completed = this.db.prepare("SELECT COUNT(*) as count FROM processing_queue WHERE status = 'completed'").get();
    const failed = this.db.prepare("SELECT COUNT(*) as count FROM processing_queue WHERE status = 'failed'").get();

    return {
      pending: pending.count,
      processing: processing.count,
      completed: completed.count,
      failed: failed.count
    };
  }

  // ==================== IMAGE MANAGEMENT ====================

  // Add scanned image record
  addScannedImage(imageData) {
    const stmt = this.db.prepare(`
      INSERT INTO scanned_images (header_id, image_path, thumbnail_path, image_width, image_height, file_size, scan_quality)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      imageData.header_id || null,
      imageData.image_path,
      imageData.thumbnail_path || null,
      imageData.image_width || null,
      imageData.image_height || null,
      imageData.file_size || null,
      imageData.scan_quality || 'medium'
    );

    return result.lastInsertRowid;
  }

  // Get images for a header
  getScannedImages(headerId) {
    return this.db.prepare('SELECT * FROM scanned_images WHERE header_id = ? ORDER BY created_at').all(headerId);
  }

  // ==================== IMPORT TO MAIN TRANSACTIONS ====================

  // Convert scanned invoice to transaction entries
  importToTransactions(headerId, mainDb) {
    const header = this.getInvoiceHeader(headerId);
    if (!header) return { success: false, error: 'Invoice not found' };

    if (header.lines.length === 0) {
      return { success: false, error: 'No line items found' };
    }

    const transactions = [];

    // Determine voucher type based on party type or vendor
    let voucherType = 'purchase';
    if (header.party_name && header.party_gstin) {
      // If we have party details, it might be a sale
      voucherType = 'sale';
    }

    // Group by party - create one transaction per line item or aggregate
    const voucherNo = `INV/${header.invoice_number}`;
    const date = header.invoice_date;

    // Create individual transactions for each line item
    for (const line of header.lines) {
      const taxableAmount = line.amount - (line.discount_amount || 0);
      const gstAmount = (taxableAmount * line.gst_rate) / 100;
      const totalAmount = taxableAmount + gstAmount;

      // Try to find matching product
      const products = mainDb.getProducts({ search: line.description.substring(0, 20) });
      let productId = null;
      if (products.length > 0) {
        productId = products[0].id;
      }

      // Try to find matching party
      let partyId = null;
      const parties = mainDb.getParties({ search: header.party_name || header.vendor_name });
      if (parties.length > 0) {
        partyId = parties[0].id;
      }

      const transaction = {
        voucher_no: `${voucherNo}-${line.item_number + 1}`,
        voucher_type: voucherType,
        date: date,
        party_id: partyId,
        product_id: productId,
        quantity: line.quantity,
        rate: line.rate,
        amount: line.amount,
        discount_percent: line.discount_percent || 0,
        discount_amount: line.discount_amount || 0,
        taxable_amount: taxableAmount,
        gst_rate: line.gst_rate,
        cgst_amount: line.cgst_amount,
        sgst_amount: line.sgst_amount,
        igst_amount: line.igst_amount,
        total_gst: gstAmount,
        total_amount: totalAmount,
        description: line.description,
        payment_status: 'pending'
      };

      try {
        const txnId = mainDb.addTransaction(transaction);
        transactions.push({ id: txnId, ...transaction });
      } catch (error) {
        console.error('Error importing transaction:', error);
      }
    }

    // Update header status
    this.updateInvoiceHeader(headerId, { status: 'imported' });

    return {
      success: true,
      transactionCount: transactions.length,
      transactions
    };
  }

  // ==================== STATISTICS ====================

  // Get scanning statistics
  getStatistics(period = 'month') {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'today':
        startDate = now.toISOString().split('T')[0];
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
    }

    const totalScanned = this.db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total_value
      FROM invoice_headers
      WHERE created_at >= ?
    `).get(`${startDate}%`);

    const byStatus = this.db.prepare(`
      SELECT status, COUNT(*) as count
      FROM invoice_headers
      WHERE created_at >= ?
      GROUP BY status
    `).all(`${startDate}%`);

    const averageConfidence = this.db.prepare(`
      SELECT AVG(ocr_confidence) as avg_confidence
      FROM invoice_headers
      WHERE created_at >= ? AND ocr_confidence > 0
    `).get(`${startDate}%`);

    return {
      period,
      totalScanned: totalScanned.count,
      totalValue: totalScanned.total_value,
      byStatus: byStatus,
      averageConfidence: averageConfidence?.avg_confidence || 0
    };
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
const invoiceScanningDB = new InvoiceScanningDB();

module.exports = invoiceScanningDB;
