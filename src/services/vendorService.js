const crypto = require('crypto');

class VendorService {
  constructor() {
    this.db = null;
  }

  setDatabase(database) {
    this.db = database;
  }

  // Initialize vendor tables
  initializeTables(db) {
    this.db = db;
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vendors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE,
        type TEXT NOT NULL DEFAULT 'supplier',
        contact_person TEXT,
        email TEXT,
        phone TEXT,
        mobile TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        pincode TEXT,
        country TEXT DEFAULT 'India',
        gstin TEXT,
        pan TEXT,
        tan TEXT,
        bank_name TEXT,
        bank_branch TEXT,
        bank_account_no TEXT,
        bank_ifsc TEXT,
        bank_account_name TEXT,
        opening_balance REAL DEFAULT 0,
        credit_limit REAL DEFAULT 0,
        credit_days INTEGER DEFAULT 0,
        tax_exemption_reason TEXT,
        is_active INTEGER DEFAULT 1,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS vendor_contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        designation TEXT,
        department TEXT,
        email TEXT,
        phone TEXT,
        mobile TEXT,
        is_primary INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS vendor_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        vendor_sku TEXT,
        vendor_price REAL DEFAULT 0,
        lead_time_days INTEGER DEFAULT 0,
        minimum_order_qty INTEGER DEFAULT 1,
        discount_percent REAL DEFAULT 0,
        is_preferred INTEGER DEFAULT 0,
        last_purchase_date TEXT,
        last_purchase_price REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      );

      CREATE TABLE IF NOT EXISTS purchase_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        po_number TEXT UNIQUE NOT NULL,
        vendor_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        expected_date TEXT,
        reference_no TEXT,
        status TEXT DEFAULT 'draft',
        subtotal REAL DEFAULT 0,
        discount_percent REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        taxable_amount REAL DEFAULT 0,
        gst_amount REAL DEFAULT 0,
        total_amount REAL DEFAULT 0,
        notes TEXT,
        terms TEXT,
        is_cancelled INTEGER DEFAULT 0,
        cancelled_by TEXT,
        cancelled_at TEXT,
        created_by TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendors(id)
      );

      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        po_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        description TEXT,
        quantity INTEGER NOT NULL,
        unit TEXT DEFAULT 'pcs',
        rate REAL NOT NULL,
        discount_percent REAL DEFAULT 0,
        taxable_amount REAL NOT NULL,
        gst_rate REAL DEFAULT 0,
        gst_amount REAL DEFAULT 0,
        total_amount REAL NOT NULL,
        received_quantity INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      );
    `);
  }

  // Get all vendors
  async getAllVendors(db, filters = {}) {
    let query = `
      SELECT v.*,
             (SELECT COUNT(*) FROM purchase_orders WHERE vendor_id = v.id) as total_orders,
             (SELECT COALESCE(SUM(total_amount), 0) FROM purchase_orders WHERE vendor_id = v.id AND is_cancelled = 0) as total_purchases
      FROM vendors v
      WHERE 1=1
    `;
    
    const params = [];
    
    if (filters.is_active !== undefined) {
      query += ' AND v.is_active = ?';
      params.push(filters.is_active);
    }
    
    if (filters.type) {
      query += ' AND v.type = ?';
      params.push(filters.type);
    }
    
    if (filters.search) {
      query += ' AND (v.name LIKE ? OR v.code LIKE ? OR v.gstin LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ' ORDER BY v.name ASC';
    
    return db.prepare(query).all(...params);
  }

  // Get vendor by ID
  async getVendorById(db, vendorId) {
    const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(vendorId);
    
    if (vendor) {
      vendor.contacts = db.prepare('SELECT * FROM vendor_contacts WHERE vendor_id = ?').all(vendorId);
      vendor.products = db.prepare(`
        SELECT vp.*, p.name as product_name, p.sku as product_sku
        FROM vendor_products vp
        JOIN products p ON vp.product_id = p.id
        WHERE vp.vendor_id = ?
      `).all(vendorId);
      vendor.purchase_orders = db.prepare(`
        SELECT * FROM purchase_orders 
        WHERE vendor_id = ?
        ORDER BY date DESC
        LIMIT 10
      `).all(vendorId);
    }
    
    return vendor;
  }

  // Create vendor
  async createVendor(db, vendorData) {
    const {
      name, code, type, contact_person, email, phone, mobile,
      address, city, state, pincode, country, gstin, pan, tan,
      bank_name, bank_branch, bank_account_no, bank_ifsc, bank_account_name,
      opening_balance, credit_limit, credit_days, tax_exemption_reason,
      is_active, notes, contacts, products
    } = vendorData;
    
    // Generate code if not provided
    const vendorCode = code || `V${Date.now().toString(36).toUpperCase()}`;
    
    const result = db.prepare(`
      INSERT INTO vendors (
        name, code, type, contact_person, email, phone, mobile,
        address, city, state, pincode, country, gstin, pan, tan,
        bank_name, bank_branch, bank_account_no, bank_ifsc, bank_account_name,
        opening_balance, credit_limit, credit_days, tax_exemption_reason,
        is_active, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, vendorCode, type || 'supplier', contact_person || null, email || null, 
      phone || null, mobile || null, address || null, city || null, state || null,
      pincode || null, country || 'India', gstin || null, pan || null, tan || null,
      bank_name || null, bank_branch || null, bank_account_no || null, 
      bank_ifsc || null, bank_account_name || null, opening_balance || 0,
      credit_limit || 0, credit_days || 0, tax_exemption_reason || null,
      is_active !== false ? 1 : 0, notes || null
    );
    
    const vendorId = result.lastInsertRowid;
    
    // Add contacts if provided
    if (contacts && contacts.length > 0) {
      const insertContact = db.prepare(`
        INSERT INTO vendor_contacts (vendor_id, name, designation, department, email, phone, mobile, is_primary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      contacts.forEach((contact, index) => {
        insertContact.run(
          vendorId, contact.name, contact.designation || null, 
          contact.department || null, contact.email || null,
          contact.phone || null, contact.mobile || null, index === 0 ? 1 : 0
        );
      });
    }
    
    // Add products if provided
    if (products && products.length > 0) {
      const insertProduct = db.prepare(`
        INSERT INTO vendor_products (
          vendor_id, product_id, vendor_sku, vendor_price, lead_time_days,
          minimum_order_qty, discount_percent, is_preferred
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      products.forEach(product => {
        insertProduct.run(
          vendorId, product.product_id, product.vendor_sku || null,
          product.vendor_price || 0, product.lead_time_days || 0,
          product.minimum_order_qty || 1, product.discount_percent || 0,
          product.is_preferred ? 1 : 0
        );
      });
    }
    
    return { id: vendorId, ...vendorData };
  }

  // Update vendor
  async updateVendor(db, vendorId, vendorData) {
    const {
      name, code, type, contact_person, email, phone, mobile,
      address, city, state, pincode, country, gstin, pan, tan,
      bank_name, bank_branch, bank_account_no, bank_ifsc, bank_account_name,
      opening_balance, credit_limit, credit_days, tax_exemption_reason,
      is_active, notes
    } = vendorData;
    
    db.prepare(`
      UPDATE vendors SET
        name = ?, code = ?, type = ?, contact_person = ?, email = ?, phone = ?, mobile = ?,
        address = ?, city = ?, state = ?, pincode = ?, country = ?, gstin = ?, pan = ?, tan = ?,
        bank_name = ?, bank_branch = ?, bank_account_no = ?, bank_ifsc = ?, bank_account_name = ?,
        opening_balance = ?, credit_limit = ?, credit_days = ?, tax_exemption_reason = ?,
        is_active = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name, code, type, contact_person, email, phone, mobile,
      address, city, state, pincode, country, gstin, pan, tan,
      bank_name, bank_branch, bank_account_no, bank_ifsc, bank_account_name,
      opening_balance, credit_limit, credit_days, tax_exemption_reason,
      is_active !== false ? 1 : 0, notes, vendorId
    );
    
    return { id: vendorId, ...vendorData };
  }

  // Delete vendor
  async deleteVendor(db, vendorId) {
    db.prepare('DELETE FROM vendor_contacts WHERE vendor_id = ?').run(vendorId);
    db.prepare('DELETE FROM vendor_products WHERE vendor_id = ?').run(vendorId);
    db.prepare('DELETE FROM vendors WHERE id = ?').run(vendorId);
    return { success: true };
  }

  // Add vendor contact
  async addVendorContact(db, vendorId, contactData) {
    const result = db.prepare(`
      INSERT INTO vendor_contacts (vendor_id, name, designation, department, email, phone, mobile, is_primary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      vendorId, contactData.name, contactData.designation || null,
      contactData.department || null, contactData.email || null,
      contactData.phone || null, contactData.mobile || null,
      contactData.is_primary ? 1 : 0
    );
    
    return { id: result.lastInsertRowid, vendor_id: vendorId, ...contactData };
  }

  // Delete vendor contact
  async deleteVendorContact(db, contactId) {
    db.prepare('DELETE FROM vendor_contacts WHERE id = ?').run(contactId);
    return { success: true };
  }

  // Get vendor summary
  async getVendorSummary(db, filters = {}) {
    const vendors = await this.getAllVendors(db, { is_active: 1, ...filters });
    
    const summary = {
      total_vendors: vendors.length,
      active_vendors: vendors.filter(v => v.is_active).length,
      total_outstanding: vendors.reduce((sum, v) => sum + (v.opening_balance || 0), 0),
      vendors_with_gst: vendors.filter(v => v.gstin).length
    };
    
    return summary;
  }

  // Purchase Order Methods
  // Get all purchase orders
  async getAllPurchaseOrders(db, filters = {}) {
    let query = `
      SELECT po.*, v.name as vendor_name, v.gstin as vendor_gstin
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (filters.vendor_id) {
      query += ' AND po.vendor_id = ?';
      params.push(filters.vendor_id);
    }
    
    if (filters.status) {
      query += ' AND po.status = ?';
      params.push(filters.status);
    }
    
    if (filters.start_date) {
      query += ' AND po.date >= ?';
      params.push(filters.start_date);
    }
    
    if (filters.end_date) {
      query += ' AND po.date <= ?';
      params.push(filters.end_date);
    }
    
    query += ' ORDER BY po.date DESC';
    
    return db.prepare(query).all(...params);
  }

  // Get purchase order by ID
  async getPurchaseOrderById(db, poId) {
    const po = db.prepare(`
      SELECT po.*, v.name as vendor_name, v.gstin as vendor_gstin, v.address as vendor_address
      FROM purchase_orders po
      JOIN vendors v ON po.vendor_id = v.id
      WHERE po.id = ?
    `).get(poId);
    
    if (po) {
      po.items = db.prepare(`
        SELECT poi.*, p.name as product_name, p.sku as product_sku
        FROM purchase_order_items poi
        JOIN products p ON poi.product_id = p.id
        WHERE poi.po_id = ?
      `).all(poId);
    }
    
    return po;
  }

  // Create purchase order
  async createPurchaseOrder(db, poData) {
    const { po_number, vendor_id, date, expected_date, reference_no, items, notes, terms } = poData;
    
    // Calculate totals
    let subtotal = 0;
    let total_gst = 0;
    
    if (items && items.length > 0) {
      items.forEach(item => {
        const itemTotal = item.quantity * item.rate * (1 - (item.discount_percent || 0) / 100);
        const itemGst = itemTotal * ((item.gst_rate || 0) / 100);
        subtotal += itemTotal;
        total_gst += itemGst;
      });
    }
    
    const discount_amount = poData.discount_amount || (subtotal * (poData.discount_percent || 0) / 100);
    const taxable_amount = subtotal - discount_amount;
    const total_amount = taxable_amount + total_gst;
    
    // Generate PO number if not provided
    const poNum = po_number || `PO${Date.now().toString(36).toUpperCase()}`;
    
    const result = db.prepare(`
      INSERT INTO purchase_orders (
        po_number, vendor_id, date, expected_date, reference_no,
        subtotal, discount_percent, discount_amount, taxable_amount,
        gst_amount, total_amount, notes, terms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      poNum, vendor_id, date, expected_date || null, reference_no || null,
      subtotal, poData.discount_percent || 0, discount_amount, taxable_amount,
      total_gst, total_amount, notes || null, terms || null
    );
    
    const poId = result.lastInsertRowid;
    
    // Add items
    if (items && items.length > 0) {
      const insertItem = db.prepare(`
        INSERT INTO purchase_order_items (
          po_id, product_id, description, quantity, unit, rate,
          discount_percent, taxable_amount, gst_rate, gst_amount, total_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      items.forEach(item => {
        const itemTotal = item.quantity * item.rate * (1 - (item.discount_percent || 0) / 100);
        const itemGst = itemTotal * ((item.gst_rate || 0) / 100);
        
        insertItem.run(
          poId, item.product_id, item.description || null, item.quantity, item.unit || 'pcs',
          item.rate, item.discount_percent || 0, itemTotal - (itemTotal * (item.gst_rate || 0) / 100),
          item.gst_rate || 0, itemGst, itemTotal + itemGst
        );
      });
    }
    
    return { id: poId, po_number: poNum, ...poData };
  }

  // Update purchase order
  async updatePurchaseOrder(db, poId, poData) {
    const { status, expected_date, reference_no, notes, terms } = poData;
    
    db.prepare(`
      UPDATE purchase_orders SET
        expected_date = ?, reference_no = ?, status = ?,
        notes = ?, terms = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(expected_date, reference_no, status, notes, terms, poId);
    
    return { id: poId, ...poData };
  }

  // Cancel purchase order
  async cancelPurchaseOrder(db, poId, reason) {
    db.prepare(`
      UPDATE purchase_orders SET
        is_cancelled = 1, status = 'cancelled',
        cancelled_at = CURRENT_TIMESTAMP, cancelled_by = ?
      WHERE id = ?
    `).run(reason, poId);
    
    return { success: true };
  }

  // Receive purchase order (update received quantity)
  async receivePurchaseOrderItems(db, poId, items) {
    for (const item of items) {
      db.prepare(`
        UPDATE purchase_order_items SET
          received_quantity = received_quantity + ?
        WHERE id = ?
      `).run(item.quantity, item.po_item_id);
    }
    
    // Check if fully received
    const poItems = db.prepare('SELECT quantity, received_quantity FROM purchase_order_items WHERE po_id = ?').all(poId);
    const allReceived = poItems.every(item => item.received_quantity >= item.quantity);
    
    if (allReceived) {
      db.prepare("UPDATE purchase_orders SET status = 'received' WHERE id = ?").run(poId);
    } else {
      db.prepare("UPDATE purchase_orders SET status = 'partial' WHERE id = ?").run(poId);
    }
    
    return { success: true };
  }

  // Get vendor purchase summary
  async getVendorPurchaseSummary(db, vendorId) {
    const vendor = await this.getVendorById(db, vendorId);
    if (!vendor) return null;
    
    const orders = await this.getAllPurchaseOrders(db, { vendor_id: vendorId });
    
    const summary = {
      vendor: vendor,
      total_orders: orders.length,
      pending_orders: orders.filter(o => o.status === 'draft' || o.status === 'sent').length,
      total_value: orders.filter(o => !o.is_cancelled).reduce((sum, o) => sum + o.total_amount, 0),
      received_value: orders.filter(o => o.status === 'received').reduce((sum, o) => sum + o.total_amount, 0)
    };
    
    return summary;
  }

  // Export vendors
  async exportVendors(db, filters = {}) {
    const vendors = await this.getAllVendors(db, filters);
    return vendors;
  }
}

module.exports = new VendorService();
