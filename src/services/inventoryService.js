/**
 * Inventory Service
 * 
 * Handles inventory management with batch and serial number tracking.
 * Provides stock management, batch tracking, and inventory reports.
 * 
 * Features:
 * - Product stock management
 * - Batch/Lot tracking
 * - Serial number tracking
 * - Stock movements (in/out)
 * - Low stock alerts
 * - Inventory valuation
 */

let db = null;

/**
 * Initialize the inventory service
 * @param {Object} database - Database instance
 */
function initialize(database) {
  db = database;
  console.log('[InventoryService] Initialized');
  createInventoryTables();
}

/**
 * Create inventory-related database tables
 */
function createInventoryTables() {
  if (!db) return;
  
  db.exec(`
    -- Batch/Lot tracking table
    CREATE TABLE IF NOT EXISTS inventory_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      batch_number TEXT,
      manufacturing_date TEXT,
      expiry_date TEXT,
      quantity INTEGER DEFAULT 0,
      remaining_quantity INTEGER DEFAULT 0,
      unit_cost REAL DEFAULT 0,
      location TEXT,
      supplier_id INTEGER,
      purchase_id INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (supplier_id) REFERENCES parties(id)
    );
    
    -- Serial number tracking table
    CREATE TABLE IF NOT EXISTS inventory_serial_numbers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      serial_number TEXT NOT NULL,
      batch_id INTEGER,
      status TEXT DEFAULT 'available', -- available, sold, damaged, returned
      purchase_id INTEGER,
      sale_id INTEGER,
      warranty_expiry TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (batch_id) REFERENCES inventory_batches(id),
      UNIQUE(serial_number)
    );
    
    -- Stock movement history
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      batch_id INTEGER,
      movement_type TEXT NOT NULL, -- purchase, sale, adjustment, transfer, return
      quantity INTEGER NOT NULL,
      rate REAL DEFAULT 0,
      amount REAL DEFAULT 0,
      reference_type TEXT, -- purchase, sale, adjustment
      reference_id INTEGER,
      party_id INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (batch_id) REFERENCES inventory_batches(id),
      FOREIGN KEY (party_id) REFERENCES parties(id)
    );
    
    -- Inventory adjustments
    CREATE TABLE IF NOT EXISTS inventory_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      batch_id INTEGER,
      adjustment_type TEXT NOT NULL, -- stock_in, stock_out, damage, expiry, correction
      quantity INTEGER NOT NULL,
      reason TEXT,
      approved_by INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (batch_id) REFERENCES inventory_batches(id)
    );
    
    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_batches_product ON inventory_batches(product_id);
    CREATE INDEX IF NOT EXISTS idx_batches_batch ON inventory_batches(batch_number);
    CREATE INDEX IF NOT EXISTS idx_serial_product ON inventory_serial_numbers(product_id);
    CREATE INDEX IF NOT EXISTS idx_serial_status ON inventory_serial_numbers(status);
    CREATE INDEX IF NOT EXISTS idx_movements_product ON inventory_movements(product_id);
    CREATE INDEX IF NOT EXISTS idx_movements_type ON inventory_movements(movement_type);
  `);
  
  console.log('[InventoryService] Tables created');
}

/**
 * Add a new batch for a product
 * @param {Object} batchData - Batch data
 * @returns {Object} Result
 */
function addBatch(batchData) {
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }
  
  try {
    const { product_id, batch_number, manufacturing_date, expiry_date, quantity, unit_cost, location, supplier_id, purchase_id } = batchData;
    
    // Validate required fields
    if (!product_id || !quantity) {
      return { success: false, error: 'Product ID and quantity are required' };
    }
    
    // Check if batch number already exists for this product
    if (batch_number) {
      const existing = db.prepare(`
        SELECT id FROM inventory_batches 
        WHERE product_id = ? AND batch_number = ? AND is_active = 1
      `).get(product_id, batch_number);
      
      if (existing) {
        // Update existing batch
        db.prepare(`
          UPDATE inventory_batches 
          SET quantity = quantity + ?, remaining_quantity = remaining_quantity + ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE product_id = ? AND batch_number = ?
        `).run(quantity, quantity, product_id, batch_number);
        
        return { success: true, message: 'Batch updated with additional quantity' };
      }
    }
    
    // Insert new batch
    const result = db.prepare(`
      INSERT INTO inventory_batches 
      (product_id, batch_number, manufacturing_date, expiry_date, quantity, remaining_quantity, unit_cost, location, supplier_id, purchase_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      product_id,
      batch_number || null,
      manufacturing_date || null,
      expiry_date || null,
      quantity,
      quantity,
      unit_cost || 0,
      location || null,
      supplier_id || null,
      purchase_id || null
    );
    
    // Update product stock
    updateProductStock(product_id);
    
    return {
      success: true,
      batch_id: result.lastInsertRowid,
      message: 'Batch added successfully'
    };
  } catch (error) {
    console.error('[InventoryService] Add batch error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get batches for a product
 * @param {number} productId - Product ID
 * @returns {Array} List of batches
 */
function getProductBatches(productId) {
  if (!db) return [];
  
  return db.prepare(`
    SELECT b.*, p.name as product_name
    FROM inventory_batches b
    JOIN products p ON b.product_id = p.id
    WHERE b.product_id = ? AND b.is_active = 1
    ORDER BY b.expiry_date ASC, b.created_at DESC
  `).all(productId);
}

/**
 * Add serial number(s) for a product
 * @param {Object} serialData - Serial number data
 * @returns {Object} Result
 */
function addSerialNumbers(serialData) {
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }
  
  try {
    const { product_id, serial_numbers, batch_id, purchase_id, warranty_expiry } = serialData;
    
    if (!product_id || !serial_numbers || serial_numbers.length === 0) {
      return { success: false, error: 'Product ID and serial numbers are required' };
    }
    
    const added = [];
    const failed = [];
    
    serial_numbers.forEach(serial => {
      try {
        // Check if serial already exists
        const existing = db.prepare(`
          SELECT id FROM inventory_serial_numbers WHERE serial_number = ?
        `).get(serial);
        
        if (existing) {
          failed.push({ serial, reason: 'Already exists' });
          return;
        }
        
        db.prepare(`
          INSERT INTO inventory_serial_numbers (product_id, serial_number, batch_id, purchase_id, warranty_expiry)
          VALUES (?, ?, ?, ?, ?)
        `).run(product_id, serial, batch_id || null, purchase_id || null, warranty_expiry || null);
        
        added.push(serial);
      } catch (err) {
        failed.push({ serial, reason: err.message });
      }
    });
    
    return {
      success: true,
      added_count: added.length,
      failed_count: failed.length,
      added,
      failed
    };
  } catch (error) {
    console.error('[InventoryService] Add serial error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get serial numbers for a product
 * @param {number} productId - Product ID
 * @param {string} status - Filter by status
 * @returns {Array} List of serial numbers
 */
function getProductSerialNumbers(productId, status = null) {
  if (!db) return [];
  
  let query = `
    SELECT s.*, p.name as product_name, b.batch_number
    FROM inventory_serial_numbers s
    JOIN products p ON s.product_id = p.id
    LEFT JOIN inventory_batches b ON s.batch_id = b.id
    WHERE s.product_id = ?
  `;
  
  const params = [productId];
  
  if (status) {
    query += ' AND s.status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY s.created_at DESC';
  
  return db.prepare(query).all(...params);
}

/**
 * Record stock movement
 * @param {Object} movementData - Movement data
 * @returns {Object} Result
 */
function recordMovement(movementData) {
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }
  
  try {
    const { product_id, batch_id, movement_type, quantity, rate, amount, reference_type, reference_id, party_id, notes } = movementData;
    
    if (!product_id || !movement_type || !quantity) {
      return { success: false, error: 'Product ID, movement type, and quantity are required' };
    }
    
    // Insert movement record
    const result = db.prepare(`
      INSERT INTO inventory_movements 
      (product_id, batch_id, movement_type, quantity, rate, amount, reference_type, reference_id, party_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      product_id,
      batch_id || null,
      movement_type,
      quantity,
      rate || 0,
      amount || (quantity * (rate || 0)),
      reference_type || null,
      reference_id || null,
      party_id || null,
      notes || null
    );
    
    // Update batch quantities if applicable
    if (batch_id) {
      const batch = db.prepare('SELECT * FROM inventory_batches WHERE id = ?').get(batch_id);
      if (batch) {
        let newRemaining = batch.remaining_quantity;
        
        if (movement_type === 'sale') {
          newRemaining -= quantity;
        } else if (movement_type === 'purchase' || movement_type === 'return') {
          newRemaining += quantity;
        }
        
        db.prepare(`
          UPDATE inventory_batches SET remaining_quantity = ? WHERE id = ?
        `).run(newRemaining, batch_id);
      }
    }
    
    // Update product stock
    updateProductStock(product_id);
    
    return {
      success: true,
      movement_id: result.lastInsertRowid,
      message: 'Stock movement recorded'
    };
  } catch (error) {
    console.error('[InventoryService] Movement error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update product current stock from batches
 * @param {number} productId - Product ID
 */
function updateProductStock(productId) {
  if (!db) return;
  
  const result = db.prepare(`
    SELECT COALESCE(SUM(remaining_quantity), 0) as total_stock
    FROM inventory_batches
    WHERE product_id = ? AND is_active = 1
  `).get(productId);
  
  db.prepare(`
    UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(result.total_stock, productId);
}

/**
 * Get inventory summary for all products
 * @param {Object} filters - Filter options
 * @returns {Array} Inventory summary
 */
function getInventorySummary(filters = {}) {
  if (!db) return [];
  
  let query = `
    SELECT 
      p.id, p.name, p.sku, p.hsn_code, p.unit, p.rate, p.cost_price,
      p.current_stock, p.min_stock, p.max_stock,
      COALESCE(SUM(b.quantity), 0) as total_batch_quantity,
      COUNT(DISTINCT b.id) as batch_count,
      COUNT(DISTINCT s.id) as serial_count
    FROM products p
    LEFT JOIN inventory_batches b ON p.id = b.product_id AND b.is_active = 1
    LEFT JOIN inventory_serial_numbers s ON p.id = s.product_id
    WHERE p.is_active = 1
  `;
  
  const params = [];
  
  if (filters.lowStock) {
    query += ' AND p.current_stock <= p.min_stock';
  }
  
  if (filters.category) {
    query += ' AND p.category = ?';
    params.push(filters.category);
  }
  
  query += ' GROUP BY p.id ORDER BY p.name ASC';
  
  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }
  
  return db.prepare(query).all(...params);
}

/**
 * Get stock movement history
 * @param {Object} filters - Filter options
 * @returns {Array} Movement history
 */
function getMovementHistory(filters = {}) {
  if (!db) return [];
  
  let query = `
    SELECT m.*, p.name as product_name, b.batch_number, pt.name as party_name
    FROM inventory_movements m
    JOIN products p ON m.product_id = p.id
    LEFT JOIN inventory_batches b ON m.batch_id = b.id
    LEFT JOIN parties pt ON m.party_id = pt.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (filters.productId) {
    query += ' AND m.product_id = ?';
    params.push(filters.productId);
  }
  
  if (filters.movementType) {
    query += ' AND m.movement_type = ?';
    params.push(filters.movementType);
  }
  
  if (filters.startDate) {
    query += ' AND m.created_at >= ?';
    params.push(filters.startDate);
  }
  
  if (filters.endDate) {
    query += ' AND m.created_at <= ?';
    params.push(filters.endDate);
  }
  
  query += ' ORDER BY m.created_at DESC';
  
  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  } else {
    query += ' LIMIT 100';
  }
  
  return db.prepare(query).all(...params);
}

/**
 * Get low stock products
 * @returns {Array} Low stock products
 */
function getLowStockProducts() {
  if (!db) return [];
  
  return db.prepare(`
    SELECT p.*, 
           (p.min_stock - p.current_stock) as shortage
    FROM products p
    WHERE p.is_active = 1 
      AND p.current_stock <= p.min_stock
    ORDER BY shortage DESC
  `).all();
}

/**
 * Get expiring batches (within specified days)
 * @param {number} days - Number of days
 * @returns {Array} Expiring batches
 */
function getExpiringBatches(days = 30) {
  if (!db) return [];
  
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return db.prepare(`
    SELECT b.*, p.name as product_name, p.sku
    FROM inventory_batches b
    JOIN products p ON b.product_id = p.id
    WHERE b.is_active = 1 
      AND b.expiry_date IS NOT NULL
      AND b.expiry_date <= ?
      AND b.remaining_quantity > 0
    ORDER BY b.expiry_date ASC
  `).all(futureDate.toISOString().split('T')[0]);
}

/**
 * Get inventory valuation report
 * @returns {Object} Valuation report
 */
function getInventoryValuation() {
  if (!db) return null;
  
  // Get products with batch costs
  const products = db.prepare(`
    SELECT 
      p.id, p.name, p.sku, p.current_stock,
      COALESCE(AVG(b.unit_cost), p.cost_price) as avg_cost,
      p.current_stock * COALESCE(AVG(b.unit_cost), p.cost_price) as total_value
    FROM products p
    LEFT JOIN inventory_batches b ON p.id = b.product_id AND b.is_active = 1
    WHERE p.is_active = 1 AND p.current_stock > 0
    GROUP BY p.id
    ORDER BY total_value DESC
  `).all();
  
  // Calculate totals
  let totalItems = 0;
  let totalValue = 0;
  
  products.forEach(p => {
    totalItems += p.current_stock || 0;
    totalValue += p.total_value || 0;
  });
  
  return {
    generated_at: new Date().toISOString(),
    total_products: products.length,
    total_items: totalItems,
    total_value: totalValue,
    products
  };
}

/**
 * Transfer stock between batches
 * @param {Object} transferData - Transfer data
 * @returns {Object} Result
 */
function transferStock(transferData) {
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }
  
  try {
    const { from_batch_id, to_batch_id, quantity, notes } = transferData;
    
    // Get source batch
    const fromBatch = db.prepare('SELECT * FROM inventory_batches WHERE id = ?').get(from_batch_id);
    if (!fromBatch) {
      return { success: false, error: 'Source batch not found' };
    }
    
    if (fromBatch.remaining_quantity < quantity) {
      return { success: false, error: 'Insufficient stock in source batch' };
    }
    
    // Get destination batch
    const toBatch = db.prepare('SELECT * FROM inventory_batches WHERE id = ?').get(to_batch_id);
    if (!toBatch) {
      return { success: false, error: 'Destination batch not found' };
    }
    
    // Perform transfer
    db.prepare(`
      UPDATE inventory_batches 
      SET remaining_quantity = remaining_quantity - ? 
      WHERE id = ?
    `).run(quantity, from_batch_id);
    
    db.prepare(`
      UPDATE inventory_batches 
      SET remaining_quantity = remaining_quantity + ?
      WHERE id = ?
    `).run(quantity, to_batch_id);
    
    // Record movements
    db.prepare(`
      INSERT INTO inventory_movements (product_id, batch_id, movement_type, quantity, notes)
      VALUES (?, ?, 'transfer', ?, ?)
    `).run(fromBatch.product_id, from_batch_id, -quantity, `Transfer to batch ${to_batch_id}`);
    
    db.prepare(`
      INSERT INTO inventory_movements (product_id, batch_id, movement_type, quantity, notes)
      VALUES (?, ?, 'transfer', ?, ?)
    `).run(toBatch.product_id, to_batch_id, quantity, `Transfer from batch ${from_batch_id}`);
    
    return { success: true, message: 'Stock transferred successfully' };
  } catch (error) {
    console.error('[InventoryService] Transfer error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Adjust inventory (stock in/out)
 * @param {Object} adjustmentData - Adjustment data
 * @returns {Object} Result
 */
function adjustInventory(adjustmentData) {
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }
  
  try {
    const { product_id, batch_id, adjustment_type, quantity, reason, notes } = adjustmentData;
    
    if (!product_id || !adjustment_type || !quantity) {
      return { success: false, error: 'Product ID, adjustment type, and quantity are required' };
    }
    
    // Insert adjustment record
    const result = db.prepare(`
      INSERT INTO inventory_adjustments (product_id, batch_id, adjustment_type, quantity, reason, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(product_id, batch_id || null, adjustment_type, quantity, reason || null, notes || null);
    
    // Update batch if applicable
    if (batch_id) {
      const batch = db.prepare('SELECT * FROM inventory_batches WHERE id = ?').get(batch_id);
      if (batch) {
        let newRemaining = batch.remaining_quantity;
        
        if (adjustment_type === 'stock_in') {
          newRemaining += quantity;
        } else if (adjustment_type === 'stock_out' || adjustment_type === 'damage' || adjustment_type === 'expiry') {
          newRemaining -= quantity;
        }
        
        db.prepare('UPDATE inventory_batches SET remaining_quantity = ? WHERE id = ?')
          .run(newRemaining, batch_id);
      }
    }
    
    // Record movement
    const movementType = adjustment_type === 'stock_in' ? 'adjustment' : 
                         adjustment_type === 'stock_out' ? 'adjustment' : adjustment_type;
    
    db.prepare(`
      INSERT INTO inventory_movements (product_id, batch_id, movement_type, quantity, reference_type, reference_id, notes)
      VALUES (?, ?, ?, ?, 'adjustment', ?, ?)
    `).run(product_id, batch_id || null, movementType, quantity, result.lastInsertRowid, notes);
    
    // Update product stock
    updateProductStock(product_id);
    
    return {
      success: true,
      adjustment_id: result.lastInsertRowid,
      message: 'Inventory adjusted successfully'
    };
  } catch (error) {
    console.error('[InventoryService] Adjustment error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  initialize,
  addBatch,
  getProductBatches,
  addSerialNumbers,
  getProductSerialNumbers,
  recordMovement,
  getInventorySummary,
  getMovementHistory,
  getLowStockProducts,
  getExpiringBatches,
  getInventoryValuation,
  transferStock,
  adjustInventory
};
