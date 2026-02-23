/**
 * E-Invoice Service
 * 
 * Handles generation and management of GST e-invoices according to
 * Indian Government e-invoice schema requirements.
 * 
 * Features:
 * - E-invoice JSON generation compliant with IRP schema
 * - E-waybill generation
 * - IRN (Invoice Reference Number) management
 * - QR code generation
 * - Digital signing support
 * 
 * API References:
 * - IRP API: https://einvoice-api.gst.gov.in
 * - Schema: https://einvoice-api.gst.gov.in/docs/schema/
 */

const crypto = require('crypto');
const axios = require('axios');

// Configuration
const E_INVOICE_CONFIG = {
  // Sandbox environment (change to production URLs for live)
  baseUrl: 'https://einvoice-api.gst.gov.in',
  sandboxUrl: 'https://einvoice-test-api.gst.gov.in',
  version: '1.1',
  
  // GSP (GST Suvidha Provider) credentials
  // These would be configured by the user
  gsp: {
    username: '',
    password: '',
    clientId: '',
    clientSecret: ''
  },
  
  // GST rate mappings
  gstRates: {
    0: { rate: 0, name: 'Nil Rated' },
    5: { rate: 5, name: '5%' },
    12: { rate: 12, name: '12%' },
    18: { rate: 18, name: '18%' },
    28: { rate: 28, name: '28%' }
  },
  
  // Supply type codes
  supplyTypes: {
    B2B: 'B2B',
    B2C: 'B2C',
    B2CL: 'B2CL',
    EXP: 'EXPORT',
    SEWP: 'SEWP',
    SEWOP: 'SEWOP'
  }
};

// Database instance
let db = null;

/**
 * Initialize the e-invoice service
 * @param {Object} database - Database instance
 */
function initialize(database) {
  db = database;
  console.log('[EInvoiceService] Initialized');
  
  // Create e-invoice tables if they don't exist
  createTables();
}

/**
 * Create e-invoice related database tables
 */
function createTables() {
  if (!db) return;
  
  db.exec(`
    -- E-Invoice records
    CREATE TABLE IF NOT EXISTS einvoice_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      invoice_no TEXT NOT NULL,
      irn TEXT UNIQUE,
      ack_no TEXT,
      ack_date TEXT,
      signed_qr_code TEXT,
      einvoice_json TEXT,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      ewb_no TEXT,
      ewb_date TEXT,
      ewb_valid_until TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    );
    
    -- E-Invoice configuration
    CREATE TABLE IF NOT EXISTS einvoice_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER DEFAULT 1,
      gstin TEXT NOT NULL,
      legal_name TEXT,
      trade_name TEXT,
      address TEXT,
      state TEXT,
      pincode TEXT,
      email TEXT,
      phone TEXT,
      gsp_provider TEXT DEFAULT 'default',
      gsp_username TEXT,
      gsp_password_encrypted TEXT,
      gsp_client_id TEXT,
      gsp_client_secret_encrypted TEXT,
      mode TEXT DEFAULT 'sandbox',
      auto_generate INTEGER DEFAULT 0,
      default_supply_type TEXT DEFAULT 'B2B',
      ewaybill_enabled INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    -- E-Invoice QR codes cache
    CREATE TABLE IF NOT EXISTS einvoice_qr_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      einvoice_id INTEGER NOT NULL,
      qr_data TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (einvoice_id) REFERENCES einvoice_records(id)
    );
    
    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_einvoice_transaction ON einvoice_records(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_einvoice_irn ON einvoice_records(irn);
    CREATE INDEX IF NOT EXISTS idx_einvoice_status ON einvoice_records(status);
  `);
  
  console.log('[EInvoiceService] Tables created');
}

/**
 * Validate GSTIN format
 * @param {string} gstin - GSTIN to validate
 * @returns {Object} Validation result
 */
function validateGSTIN(gstin) {
  if (!gstin || typeof gstin !== 'string') {
    return { valid: false, error: 'GSTIN is required' };
  }
  
  // GSTIN format: 15 characters
  // 2 digits - state code
  // 10 characters - PAN number
  // 1 character - entity number
  // 1 character - Z
  // 1 character - checksum
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  
  if (!gstinRegex.test(gstin.toUpperCase())) {
    return { valid: false, error: 'Invalid GSTIN format' };
  }
  
  return { valid: true };
}

/**
 * Validate HSN code format
 * @param {string} hsnCode - HSN code to validate
 * @returns {Object} Validation result
 */
function validateHSN(hsnCode) {
  if (!hsnCode) {
    return { valid: false, error: 'HSN code is required' };
  }
  
  // HSN should be 4, 6, or 8 digits
  const hsnRegex = /^[0-9]{4}$|^[0-9]{6}$|^[0-9]{8}$/;
  
  if (!hsnRegex.test(hsnCode)) {
    return { valid: false, error: 'Invalid HSN code format' };
  }
  
  return { valid: true };
}

/**
 * Generate e-invoice JSON payload
 * @param {Object} transaction - Transaction data
 * @param {Object} party - Party (recipient) data
 * @param {Object} businessInfo - Business information
 * @param {Object} config - E-invoice configuration
 * @returns {Object} E-invoice JSON payload
 */
function generateEinvoicePayload(transaction, party, businessInfo, config) {
  // Validate required fields
  if (!businessInfo.gstin) {
    throw new Error('Business GSTIN is required for e-invoice');
  }
  
  const supplierGstin = businessInfo.gstin.toUpperCase();
  const recipientGstin = party?.gstin ? party.gstin.toUpperCase() : '';
  
  // Determine supply type
  let supplyType = config?.default_supply_type || 'B2B';
  
  // B2C if no GSTIN or Unregistered
  if (!recipientGstin || recipientGstin === '' || recipientGstin === 'URP') {
    supplyType = transaction.total_amount >= 100000 ? 'B2CL' : 'B2C';
  }
  
  // Generate unique invoice number
  const invoiceNo = transaction.voucher_no || `INV-${Date.now()}`;
  
  // Build e-invoice payload according to schema
  const payload = {
    // Version
    Version: E_INVOICE_CONFIG.version,
    
    // Transaction Details
    TranDtls: {
      TaxSch: 'GST',
      SupTyp: supplyType,
      RegRev: 'N', // Regular taxpayer
      EcmGstin: null // E-commerce GSTIN if applicable
    },
    
    // Document Type
    DocDtls: {
      Typ: 'INV', // Invoice
      No: invoiceNo,
      Dt: transaction.date || new Date().toISOString().split('T')[0]
    },
    
    // Supplier Details
    SellerDtls: {
      Gstin: supplierGstin,
      LglNm: businessInfo.legal_name || businessInfo.business_name || businessInfo.name || 'Business Name',
      TrdNm: businessInfo.trade_name || businessInfo.business_name || businessInfo.name,
      Addr1: businessInfo.address || 'Address not provided',
      Addr2: businessInfo.address2 || '',
      Loc: businessInfo.city || 'City',
      Pin: parseInt(businessInfo.pincode) || 110001,
      Stcd: businessInfo.state_code || '07', // Default to Delhi
      Ph: businessInfo.phone || '',
      Em: businessInfo.email || ''
    },
    
    // Buyer Details (different for B2B vs B2C)
    BuyerDtls: supplyType.startsWith('B2B') || supplyType === 'B2CL' ? {
      Gstin: recipientGstin || 'URP',
      LglNm: party?.name || 'Buyer Name',
      TrdNm: party?.name || 'Buyer Name',
      Addr1: party?.address || 'Address not provided',
      Addr2: party?.address2 || '',
      Loc: party?.city || 'City',
      Pin: parseInt(party?.pincode) || 110001,
      Stcd: party?.state_code || '07',
      Ph: party?.phone || '',
      Em: party?.email || ''
    } : {
      Gstin: 'URP',
      LglNm: party?.name || 'Consumer',
      TrdNm: party?.name || 'Consumer',
      Addr1: party?.address || 'Consumer Address',
      Addr2: '',
      Loc: party?.city || 'Local',
      Pin: parseInt(party?.pincode) || 110001,
      Stcd: party?.state_code || '07',
      Ph: '',
      Em: ''
    },
    
    // Dispatch Details (if different from seller)
    DispDtls: {
      Gstin: supplierGstin,
      LglNm: businessInfo.legal_name || businessInfo.business_name || 'Business Name',
      Addr1: businessInfo.address || 'Address',
      Addr2: '',
      Loc: businessInfo.city || 'City',
      Pin: parseInt(businessInfo.pincode) || 110001,
      Stcd: businessInfo.state_code || '07'
    },
    
    // Ship To Details (if different from buyer)
    ShipDtls: supplyType.startsWith('B2B') ? {
      Gstin: recipientGstin || 'URP',
      LglNm: party?.name || 'Buyer Name',
      Addr1: party?.address || 'Address',
      Addr2: '',
      Loc: party?.city || 'City',
      Pin: parseInt(party?.pincode) || 110001,
      Stcd: party?.state_code || '07'
    } : null,
    
    // Item List
    ItemList: [
      {
        SlNo: '1',
        PrdDesc: transaction.description || transaction.narration || 'Product/Service',
        IsServc: 'N',
        HsnCd: transaction.hsn_code || '999999', // Default HSN
        Qty: transaction.quantity || 1,
        Unit: transaction.unit || 'NOS',
        UnitPrice: transaction.rate || 0,
        TotAmt: transaction.amount || 0,
        Discount: transaction.discount_amount || 0,
        PreTaxVal: transaction.taxable_amount || 0,
        AssAmt: transaction.taxable_amount || 0,
        GstRt: transaction.gst_rate || 0,
        IgstAmt: transaction.igst_amount || 0,
        CgstAmt: transaction.cgst_amount || 0,
        SgstAmt: transaction.sgst_amount || 0,
        CessAmt: transaction.cess_amount || 0,
        StateCessAmt: 0,
        TotItemVal: transaction.total_amount || 0
      }
    ],
    
    // Total Calculation
    ValDtls: {
      BaseAmt: transaction.taxable_amount || 0,
      Discount: transaction.discount_amount || 0,
      CgstAmt: transaction.cgst_amount || 0,
      SgstAmt: transaction.sgst_amount || 0,
      IgstAmt: transaction.igst_amount || 0,
      CessAmt: transaction.cess_amount || 0,
      StateCessAmt: 0,
      OthChrg: 0,
      TotInvVal: transaction.total_amount || 0,
      TotInvValFc: transaction.total_amount || 0
    },
    
    // Payment Details
    PayDtls: [
      {
        Nm: businessInfo.bank_name || 'Bank',
        PaidAmt: transaction.paid_amount || transaction.total_amount || 0,
        PaymtMode: transaction.payment_method || 'CASH',
        PaymtTerm: transaction.payment_status === 'pending' ? 'Credit' : 'Immediate',
        CrDay: transaction.credit_days || 0,
        PayinDt: transaction.due_date || null
      }
    ],
    
    // Reference Documents
    RefDtls: {
      InvRm: 'e-Invoice generated by Talk to Your Accounts'
    }
  };
  
  // Remove null values
  return JSON.parse(JSON.stringify(payload));
}

/**
 * Generate JSON for e-waybill
 * @param {Object} transaction - Transaction data
 * @param {Object} party - Party data
 * @param {Object} businessInfo - Business info
 * @param {Object} transport - Transport details
 * @returns {Object} E-waybill JSON payload
 */
function generateEwaybillPayload(transaction, party, businessInfo, transport = {}) {
  const supplierGstin = businessInfo.gstin?.toUpperCase() || '';
  const recipientGstin = party?.gstin?.toUpperCase() || 'URP';
  
  return {
    // Supply Type
    supplyType: transaction.voucher_type === 'sale' ? 'OUTWARD' : 'INWARD',
    
    // Document Type
    docType: 'INV',
    
    // Document Number
    docNo: transaction.voucher_no || `EWB-${Date.now()}`,
    
    // Document Date
    docDate: transaction.date || new Date().toISOString().split('T')[0],
    
    // Supplier Details
    fromGstin: supplierGstin,
    fromTrdName: businessInfo.business_name || businessInfo.name || 'Supplier',
    fromAddr1: businessInfo.address || '',
    fromAddr2: '',
    fromPlace: businessInfo.city || '',
    fromPincode: parseInt(businessInfo.pincode) || 110001,
    fromState: parseInt(businessInfo.state_code) || 7,
    
    // Recipient Details
    toGstin: recipientGstin,
    toTrdName: party?.name || 'Recipient',
    toAddr1: party?.address || '',
    toAddr2: '',
    toPlace: party?.city || '',
    toPincode: parseInt(party?.pincode) || 110001,
    toState: parseInt(party?.state_code) || 7,
    
    // Item Details
    itemList: [
      {
        productName: transaction.description || 'Product',
        hsnCode: transaction.hsn_code || '999999',
        quantity: transaction.quantity || 1,
        unit: transaction.unit || 'NOS',
        taxableAmount: transaction.taxable_amount || 0,
        cgstRate: transaction.gst_rate / 2 || 0,
        sgstRate: transaction.gst_rate / 2 || 0,
        igstRate: transaction.gst_rate || 0,
        cessRate: transaction.cess_rate || 0
      }
    ],
    
    // Total Value
    totalValue: transaction.total_amount || 0,
    cgstValue: transaction.cgst_amount || 0,
    sgstValue: transaction.sgst_amount || 0,
    igstValue: transaction.igst_amount || 0,
    cessValue: transaction.cess_amount || 0,
    
    // Transport Details
    transporterName: transport.transporter_name || '',
    transporterId: transport.transporter_gstin || '',
    vehicleNumber: transport.vehicle_number || '',
    vehicleType: transport.vehicle_type || 'Regular',
    
    // Distance
    distance: transport.distance || 0,
    
    // Place of Delivery
    placeOfDelivery: party?.city || '',
    placeOfDispatch: businessInfo.city || ''
  };
}

/**
 * Generate QR code data for e-invoice
 * @param {Object} einvoice - E-invoice data
 * @returns {string} QR code data string
 */
function generateQRCodeData(einvoice) {
  const qrData = {
    txn: einvoice.ack_no || '',
    ts: einvoice.ack_date || new Date().toISOString(),
    orgn: einvoice.seller_gstin || '',
    dest: einvoice.buyer_gstin || '',
    advc: einvoice.total_amount || 0,
    crc: einvoice.signed_qr_code || ''
  };
  
  // Format for QR code: JSON stringified and base64 encoded
  return Buffer.from(JSON.stringify(qrData)).toString('base64');
}

/**
 * Generate IRN (Invoice Reference Number)
 * @param {string} gstin - GSTIN of supplier
 * @param {string} invoiceNo - Invoice number
 * @param {string} invoiceDate - Invoice date
 * @param {number} totalAmount - Total invoice amount
 * @returns {string} IRN hash
 */
function generateIRN(gstin, invoiceNo, invoiceDate, totalAmount) {
  // IRN generation algorithm (simplified version)
  // In production, this would use SHA-256 of the data
  const data = `${gstin}|${invoiceNo}|${invoiceDate}|${totalAmount}`;
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  // IRN is first 64 characters of hash
  return hash.substring(0, 64);
}

/**
 * Submit e-invoice to IRP
 * @param {Object} payload - E-invoice JSON payload
 * @param {Object} config - E-invoice configuration
 * @returns {Object} API response
 */
async function submitToIRP(payload, config) {
  // In sandbox mode, simulate the API response
  if (config.mode === 'sandbox') {
    console.log('[EInvoiceService] Sandbox mode - simulating IRP response');
    
    // Generate mock response
    const irn = generateIRN(
      payload.SellerDtls.Gstin,
      payload.DocDtls.No,
      payload.DocDtls.Dt,
      payload.ValDtls.TotInvVal
    );
    
    const ackNo = `ACK${Date.now()}`;
    const ackDate = new Date().toISOString();
    
    return {
      success: true,
      data: {
        Irn: irn,
        AckNo: ackNo,
        AckDt: ackDate,
        SignedInvoice: 'mock-signed-data',
        SignedQRCode: 'mock-qr-code',
        Status: 'Success'
      }
    };
  }
  
  // Production API call would go here
  // This requires GSP authentication and API integration
  try {
    // Get access token first
    const tokenResponse = await axios.post(`${config.baseUrl}/oauth/token`, {
      grant_type: 'client_credentials',
      client_id: config.gsp_client_id,
      client_secret: config.gsp_client_secret,
      username: config.gsp_username,
      password: config.gsp_password
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    const accessToken = tokenResponse.data.access_token;
    
    // Submit e-invoice
    const response = await axios.post(
      `${config.baseUrl}/einvoice`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'user_name': config.gsp_username,
          'password': config.gsp_password,
          'request_id': `REQ-${Date.now()}`
        }
      }
    );
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('[EInvoiceService] IRP API Error:', error.message);
    return {
      success: false,
      error: error.message,
      details: error.response?.data || null
    };
  }
}

/**
 * Submit e-waybill to government portal
 * @param {Object} payload - E-waybill JSON payload
 * @param {Object} config - Configuration
 * @returns {Object} API response
 */
async function submitEwaybill(payload, config) {
  // Sandbox simulation
  if (config.mode === 'sandbox') {
    console.log('[EInvoiceService] Sandbox mode - simulating e-waybill response');
    
    const ewbNo = `EWB${Date.now()}`;
    const ewbDate = new Date().toISOString();
    const validUntil = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(); // 72 hours
    
    return {
      success: true,
      data: {
        ewbNo,
        ewbDate,
        validUpto: validUntil,
        status: 'Success'
      }
    };
  }
  
  // Production e-waybill API call
  try {
    const tokenResponse = await axios.post(`${config.baseUrl}/ewaybill/token`, {
      grant_type: 'client_credentials',
      client_id: config.gsp_client_id,
      client_secret: config.gsp_client_secret
    });
    
    const accessToken = tokenResponse.data.access_token;
    
    const response = await axios.post(
      `${config.baseUrl}/ewaybill`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('[EInvoiceService] E-waybill API Error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate e-invoice for a transaction
 * @param {number} transactionId - Transaction ID
 * @returns {Object} Result
 */
async function generateEinvoice(transactionId) {
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }
  
  try {
    // Get transaction with party details
    const transaction = db.prepare(`
      SELECT t.*, p.name as party_name, p.gstin as party_gstin, 
             p.address as party_address, p.city as party_city, 
             p.state as party_state, p.pincode as party_pincode,
             p.state_code as party_state_code
      FROM transactions t
      LEFT JOIN parties p ON t.party_id = p.id
      WHERE t.id = ?
    `).get(transactionId);
    
    if (!transaction) {
      return { success: false, error: 'Transaction not found' };
    }
    
    // Get business info
    const businessInfo = {};
    const infoRows = db.prepare('SELECT key, value FROM business_info').all();
    infoRows.forEach(row => {
      businessInfo[row.key] = row.value;
    });
    
    // Add state code mapping
    const stateCodes = {
      'Delhi': '07', 'Maharashtra': '27', 'Karnataka': '29',
      'Tamil Nadu': '33', 'Gujarat': '24', 'West Bengal': '19',
      'Uttar Pradesh': '09', 'Rajasthan': '08', 'Madhya Pradesh': '23',
      'Kerala': '32', 'Punjab': '03', 'Haryana': '06',
      'Telangana': '36', 'Andhra Pradesh': '28', 'Bihar': '10',
      'Odisha': '21', 'Chhattisgarh': '22', 'Jharkhand': '20',
      'Uttarakhand': '05', 'Puducherry': '34', 'Goa': '30'
    };
    businessInfo.state_code = businessInfo.state_code || stateCodes[businessInfo.state] || '07';
    
    if (transaction.party_state_code) {
      transaction.party_state_code = stateCodes[transaction.party_state] || transaction.party_state_code || '07';
    }
    
    // Get e-invoice config
    const config = db.prepare('SELECT * FROM einvoice_config LIMIT 1').get() || {
      mode: 'sandbox',
      default_supply_type: 'B2B',
      ewaybill_enabled: 0
    };
    
    // Check if already generated
    const existing = db.prepare('SELECT * FROM einvoice_records WHERE transaction_id = ?').get(transactionId);
    if (existing && existing.status === 'success') {
      return { 
        success: false, 
        error: 'E-invoice already generated',
        existing 
      };
    }
    
    // Generate e-invoice payload
    const party = {
      name: transaction.party_name,
      gstin: transaction.party_gstin,
      address: transaction.party_address,
      city: transaction.party_city,
      state: transaction.party_state,
      pincode: transaction.party_pincode,
      state_code: transaction.party_state_code
    };
    
    const payload = generateEinvoicePayload(transaction, party, businessInfo, config);
    
    // Submit to IRP
    const result = await submitToIRP(payload, config);
    
    if (result.success) {
      // Save to database
      const irn = result.data.Irn;
      const ackNo = result.data.AckNo;
      const ackDate = result.data.AckDt;
      
      const insertStmt = db.prepare(`
        INSERT INTO einvoice_records 
        (transaction_id, invoice_no, irn, ack_no, ack_date, signed_qr_code, einvoice_json, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'success')
      `);
      
      const insertResult = insertStmt.run(
        transactionId,
        payload.DocDtls.No,
        irn,
        ackNo,
        ackDate,
        result.data.SignedQRCode,
        JSON.stringify(payload)
      );
      
      return {
        success: true,
        irn,
        ackNo,
        ackDate,
        qrCode: result.data.SignedQRCode,
        id: insertResult.lastInsertRowid
      };
    } else {
      // Save failed attempt
      const insertStmt = db.prepare(`
        INSERT INTO einvoice_records 
        (transaction_id, invoice_no, einvoice_json, status, error_message)
        VALUES (?, ?, ?, 'failed', ?)
      `);
      
      insertStmt.run(
        transactionId,
        payload.DocDtls.No,
        JSON.stringify(payload),
        result.error
      );
      
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    console.error('[EInvoiceService] Generate error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate e-waybill for a transaction
 * @param {number} transactionId - Transaction ID
 * @param {Object} transport - Transport details
 * @returns {Object} Result
 */
async function generateEwaybill(transactionId, transport = {}) {
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }
  
  try {
    // Get transaction
    const transaction = db.prepare(`
      SELECT t.*, p.name as party_name, p.gstin as party_gstin, 
             p.address as party_address, p.city as party_city, 
             p.state as party_state, p.pincode as party_pincode
      FROM transactions t
      LEFT JOIN parties p ON t.party_id = p.id
      WHERE t.id = ?
    `).get(transactionId);
    
    if (!transaction) {
      return { success: false, error: 'Transaction not found' };
    }
    
    // Get business info
    const businessInfo = {};
    const infoRows = db.prepare('SELECT key, value FROM business_info').all();
    infoRows.forEach(row => {
      businessInfo[row.key] = row.value;
    });
    
    // Get e-invoice record
    const einvoice = db.prepare('SELECT * FROM einvoice_records WHERE transaction_id = ?').get(transactionId);
    
    if (!einvoice) {
      return { success: false, error: 'E-invoice must be generated first' };
    }
    
    // Generate e-waybill payload
    const party = {
      name: transaction.party_name,
      gstin: transaction.party_gstin,
      address: transaction.party_address,
      city: transaction.party_city,
      state: transaction.party_state,
      pincode: transaction.party_pincode
    };
    
    const payload = generateEwaybillPayload(transaction, party, businessInfo, transport);
    
    // Get config
    const config = db.prepare('SELECT * FROM einvoice_config LIMIT 1').get() || { mode: 'sandbox' };
    
    // Submit e-waybill
    const result = await submitEwaybill(payload, config);
    
    if (result.success) {
      // Update einvoice record
      db.prepare(`
        UPDATE einvoice_records 
        SET ewb_no = ?, ewb_date = ?, ewb_valid_until = ?, updated_at = CURRENT_TIMESTAMP
        WHERE transaction_id = ?
      `).run(
        result.data.ewbNo,
        result.data.ewbDate,
        result.data.validUpto,
        transactionId
      );
      
      return {
        success: true,
        ewbNo: result.data.ewbNo,
        ewbDate: result.data.ewbDate,
        validUntil: result.data.validUpto
      };
    } else {
      return {
        success: false,
        error: result.error
      };
    }
  } catch (error) {
    console.error('[EInvoiceService] E-waybill error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get e-invoice status
 * @param {number} transactionId - Transaction ID
 * @returns {Object} E-invoice details
 */
function getEinvoice(transactionId) {
  if (!db) return null;
  
  return db.prepare(`
    SELECT e.*, t.voucher_no, t.date, t.total_amount, t.voucher_type,
           p.name as party_name, p.gstin as party_gstin
    FROM einvoice_records e
    JOIN transactions t ON e.transaction_id = t.id
    LEFT JOIN parties p ON t.party_id = p.id
    WHERE e.transaction_id = ?
  `).get(transactionId);
}

/**
 * List all e-invoices
 * @param {Object} filters - Filter options
 * @returns {Array} List of e-invoices
 */
function listEinvoices(filters = {}) {
  if (!db) return [];
  
  let query = `
    SELECT e.*, t.voucher_no, t.date, t.total_amount, t.voucher_type,
           p.name as party_name, p.gstin as party_gstin
    FROM einvoice_records e
    JOIN transactions t ON e.transaction_id = t.id
    LEFT JOIN parties p ON t.party_id = p.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (filters.status) {
    query += ' AND e.status = ?';
    params.push(filters.status);
  }
  
  if (filters.startDate) {
    query += ' AND e.created_at >= ?';
    params.push(filters.startDate);
  }
  
  if (filters.endDate) {
    query += ' AND e.created_at <= ?';
    params.push(filters.endDate);
  }
  
  query += ' ORDER BY e.created_at DESC';
  
  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  } else {
    query += ' LIMIT 100';
  }
  
  return db.prepare(query).all(...params);
}

/**
 * Get pending invoices (transactions without e-invoice)
 * @param {Object} filters - Filter options
 * @returns {Array} List of pending transactions
 */
function getPendingInvoices(filters = {}) {
  if (!db) return [];
  
  // Get transactions that don't have successful e-invoice records
  // Focus on sales vouchers that are eligible for e-invoicing
  let query = `
    SELECT t.id, t.voucher_no, t.date, t.total_amount, t.voucher_type,
           t.description, t.party_id, t.gst_rate, t.taxable_amount,
           t.igst_amount, t.cgst_amount, t.sgst_amount,
           p.name as party_name, p.gstin as party_gstin, p.address as party_address,
           p.city as party_city, p.state as party_state, p.pincode as party_pincode,
           p.state_code as party_state_code
    FROM transactions t
    LEFT JOIN parties p ON t.party_id = p.id
    WHERE t.voucher_type = 'sale'
      AND t.total_amount > 0
      AND (
        SELECT COUNT(*) FROM einvoice_records e 
        WHERE e.transaction_id = t.id AND e.status = 'success'
      ) = 0
  `;
  
  const params = [];
  
  // Filter by date range
  if (filters.startDate) {
    query += ' AND t.date >= ?';
    params.push(filters.startDate);
  }
  
  if (filters.endDate) {
    query += ' AND t.date <= ?';
    params.push(filters.endDate);
  }
  
  // Filter by minimum amount (e-invoice mandatory for B2B > Rs 50,000)
  if (filters.minAmount) {
    query += ' AND t.total_amount >= ?';
    params.push(filters.minAmount);
  }
  
  // Filter by party GSTIN (B2B vs B2C)
  if (filters.hasGstin !== undefined) {
    if (filters.hasGstin) {
      query += ' AND p.gstin IS NOT NULL AND p.gstin != ""';
    } else {
      query += ' AND (p.gstin IS NULL OR p.gstin = "")';
    }
  }
  
  query += ' ORDER BY t.date DESC, t.id DESC';
  
  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  } else {
    query += ' LIMIT 50';
  }
  
  return db.prepare(query).all(...params);
}

/**
 * Save e-invoice configuration
 * @param {Object} config - Configuration data
 * @returns {Object} Result
 */
function saveConfig(config) {
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }
  
  try {
    const existing = db.prepare('SELECT id FROM einvoice_config LIMIT 1').get();
    
    if (existing) {
      db.prepare(`
        UPDATE einvoice_config 
        SET gstin = ?, legal_name = ?, trade_name = ?, address = ?,
            state = ?, pincode = ?, email = ?, phone = ?,
            gsp_provider = ?, gsp_username = ?, mode = ?,
            auto_generate = ?, ewaybill_enabled = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        config.gstin, config.legal_name, config.trade_name, config.address,
        config.state, config.pincode, config.email, config.phone,
        config.gsp_provider, config.gsp_username, config.mode,
        config.auto_generate ? 1 : 0, config.ewaybill_enabled ? 1 : 0,
        existing.id
      );
    } else {
      db.prepare(`
        INSERT INTO einvoice_config 
        (gstin, legal_name, trade_name, address, state, pincode, email, phone,
         gsp_provider, gsp_username, mode, auto_generate, ewaybill_enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        config.gstin, config.legal_name, config.trade_name, config.address,
        config.state, config.pincode, config.email, config.phone,
        config.gsp_provider, config.gsp_username, config.mode,
        config.auto_generate ? 1 : 0, config.ewaybill_enabled ? 1 : 0
      );
    }
    
    return { success: true };
  } catch (error) {
    console.error('[EInvoiceService] Config save error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get e-invoice configuration
 * @returns {Object} Configuration
 */
function getConfig() {
  if (!db) return null;
  return db.prepare('SELECT * FROM einvoice_config LIMIT 1').get();
}

/**
 * Cancel e-invoice
 * @param {number} transactionId - Transaction ID
 * @param {string} reason - Cancellation reason
 * @returns {Object} Result
 */
async function cancelEinvoice(transactionId, reason) {
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }
  
  const einvoice = db.prepare('SELECT * FROM einvoice_records WHERE transaction_id = ?').get(transactionId);
  
  if (!einvoice) {
    return { success: false, error: 'E-invoice not found' };
  }
  
  if (einvoice.status === 'cancelled') {
    return { success: false, error: 'E-invoice already cancelled' };
  }
  
  // In production, call IRP cancel API
  // For now, just update local status
  db.prepare(`
    UPDATE einvoice_records 
    SET status = 'cancelled', error_message = ?, updated_at = CURRENT_TIMESTAMP
    WHERE transaction_id = ?
  `).run(`Cancelled: ${reason}`, transactionId);
  
  return { success: true };
}

// Export service
module.exports = {
  initialize,
  generateEinvoicePayload,
  generateEwaybillPayload,
  generateQRCodeData,
  generateIRN,
  validateGSTIN,
  validateHSN,
  generateEinvoice,
  generateEwaybill,
  getEinvoice,
  listEinvoices,
  getPendingInvoices,
  saveConfig,
  getConfig,
  cancelEinvoice,
  E_INVOICE_CONFIG
};
