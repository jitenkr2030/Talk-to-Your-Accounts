/**
 * GST Return Service
 * 
 * Handles generation of GST returns (GSTR-1, GSTR-3B) based on
 * transaction data and e-invoice records.
 * 
 * Features:
 * - GSTR-1: Details of outward supplies
 * - GSTR-3B: Summary of tax liability
 * - JSON export for portal upload
 * - Tax credit reconciliation
 */

const db = null;

/**
 * Initialize the GST return service
 * @param {Object} database - Database instance
 */
function initialize(database) {
  db = database;
  console.log('[GSTReturnService] Initialized');
}

/**
 * Get GSTR-1 data (Outward Supplies)
 * @param {Object} filters - Date range and filters
 * @returns {Object} GSTR-1 data
 */
function getGSTR1Data(filters = {}) {
  if (!db) return null;
  
  const { startDate, endDate, filingPeriod } = filters;
  
  // Get all sales transactions with e-invoice
  const transactions = db.prepare(`
    SELECT 
      t.id, t.voucher_no, t.date, t.voucher_type,
      t.total_amount, t.taxable_amount, t.igst_amount, t.cgst_amount, t.sgst_amount,
      t.cess_amount, t.gst_rate,
      p.name as party_name, p.gstin as party_gstin, p.state_code as party_state_code,
      e.irn, e.ack_no, e.ack_date, e.status as einvoice_status
    FROM transactions t
    LEFT JOIN parties p ON t.party_id = p.id
    LEFT JOIN einvoice_records e ON t.id = e.transaction_id
    WHERE t.voucher_type = 'sale'
      AND t.date >= ? 
      AND t.date <= ?
    ORDER BY t.date ASC
  `).all(startDate, endDate);
  
  // Group by GSTIN and rate
  const b2bSupplies = [];
  const b2cSupplies = [];
  const exportSupplies = [];
  
  let totalTaxable = 0;
  let totalIgst = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalCess = 0;
  
  transactions.forEach(txn => {
    const isEInvoice = txn.einvoice_status === 'success';
    const isExport = txn.party_gstin && txn.party_gstin.toUpperCase() === 'EXPORT';
    const isB2B = txn.party_gstin && txn.party_gstin.length === 15;
    
    // Calculate place of supply state code
    const pos = txn.party_state_code || '07';
    const isInterState = pos !== getBusinessStateCode();
    
    const item = {
      invoice_no: txn.voucher_no,
      invoice_date: txn.date,
      invoice_value: txn.total_amount,
      place_of_supply: pos,
      rate: txn.gst_rate || 0,
      taxable_value: txn.taxable_amount || 0,
      igst_amount: txn.igst_amount || 0,
      cgst_amount: txn.cgst_amount || 0,
      sgst_amount: txn.sgst_amount || 0,
      cess_amount: txn.cess_amount || 0,
      party_name: txn.party_name,
      party_gstin: txn.party_gstin || 'URP',
      irn: txn.irn,
      is_e_invoice: isEInvoice
    };
    
    if (isExport) {
      exportSupplies.push(item);
    } else if (isB2B) {
      b2bSupplies.push(item);
    } else {
      b2cSupplies.push(item);
    }
    
    totalTaxable += txn.taxable_amount || 0;
    totalIgst += txn.igst_amount || 0;
    totalCgst += txn.cgst_amount || 0;
    totalSgst += txn.sgst_amount || 0;
    totalCess += txn.cess_amount || 0;
  });
  
  // Group B2C by rate and state
  const b2cSummary = groupB2CByRateAndState(b2cSupplies);
  
  return {
    filing_period: filingPeriod || `${startDate} to ${endDate}`,
    generated_at: new Date().toISOString(),
    summary: {
      total_transactions: transactions.length,
      e_invoices_generated: transactions.filter(t => t.einvoice_status === 'success').length,
      total_taxable_value: totalTaxable,
      total_igst: totalIgst,
      total_cgst: totalCgst,
      total_sgst: totalSgst,
      total_cess: totalCess,
      total_liability: totalIgst + totalCgst + totalSgst + totalCess
    },
    supplies: {
      b2b: b2bSupplies,
      b2c: b2cSupplies,
      b2c_summary: b2cSummary,
      exports: exportSupplies
    }
  };
}

/**
 * Get GSTR-3B data (Tax Liability Summary)
 * @param {Object} filters - Date range and filters
 * @returns {Object} GSTR-3B data
 */
function getGSTR3BData(filters = {}) {
  if (!db) return null;
  
  const { startDate, endDate, filingPeriod } = filters;
  
  // Get all transactions for the period
  const sales = db.prepare(`
    SELECT 
      SUM(t.taxable_amount) as total_taxable,
      SUM(t.igst_amount) as total_igst,
      SUM(t.cgst_amount) as total_cgst,
      SUM(t.sgst_amount) as total_sgst,
      SUM(t.cess_amount) as total_cess
    FROM transactions t
    WHERE t.voucher_type = 'sale'
      AND t.date >= ? 
      AND t.date <= ?
  `).get(startDate, endDate);
  
  const purchases = db.prepare(`
    SELECT 
      SUM(t.taxable_amount) as total_taxable,
      SUM(t.igst_amount) as total_igst,
      SUM(t.cgst_amount) as total_cgst,
      SUM(t.sgst_amount) as total_sgst,
      SUM(t.cess_amount) as total_cess
    FROM transactions t
    WHERE t.voucher_type = 'purchase'
      AND t.date >= ? 
      AND t.date <= ?
  `).get(startDate, endDate);
  
  // Get ITC claims from expenses (if tracked)
  const itcClaims = db.prepare(`
    SELECT 
      SUM(t.igst_amount) as igst_itc,
      SUM(t.cgst_amount) as cgst_itc,
      SUM(t.sgst_amount) as sgst_itc,
      SUM(t.cess_amount) as cess_itc
    FROM transactions t
    WHERE t.voucher_type = 'purchase'
      AND t.date >= ? 
      AND t.date <= ?
      AND t.is_itc_eligible = 1
  `).get(startDate, endDate);
  
  // Calculate tax liability
  const outwardTax = {
    igst: sales?.total_igst || 0,
    cgst: sales?.total_cgst || 0,
    sgst: sales?.total_sgst || 0,
    cess: sales?.total_cess || 0
  };
  
  const itc = {
    igst: itcClaims?.igst_itc || 0,
    cgst: itcClaims?.cgst_itc || 0,
    sgst: itcClaims?.sgst_itc || 0,
    cess: itcClaims?.cess_itc || 0
  };
  
  // Net liability (outward - ITC)
  const netLiability = {
    igst: Math.max(0, outwardTax.igst - itc.igst),
    cgst: Math.max(0, outwardTax.cgst - itc.cgst),
    sgst: Math.max(0, outwardTax.sgst - itc.sgst),
    cess: Math.max(0, outwardTax.cess - itc.cess)
  };
  
  const totalLiability = netLiability.igst + netLiability.cgst + netLiability.sgst + netLiability.cess;
  
  return {
    filing_period: filingPeriod || `${startDate} to ${endDate}`,
    generated_at: new Date().toISOString(),
    summary: {
      total_outward_taxable: sales?.total_taxable || 0,
      total_inward_taxable: purchases?.total_taxable || 0,
      total_tax_collected: outwardTax.igst + outwardTax.cgst + outwardTax.sgst + outwardTax.cess,
      total_itc_available: itc.igst + itc.cgst + itc.sgst + itc.cess,
      total_tax_liability: totalLiability,
      cash_tax_liability: totalLiability // Simplified - could be adjusted for ITC reversal
    },
    outward_supplies: outwardTax,
    itc_available: itc,
    net_liability: netLiability,
    tax_rate_breakdown: getTaxRateBreakdown(startDate, endDate)
  };
}

/**
 * Group B2C supplies by rate and state
 * @param {Array} b2cSupplies - B2C transaction list
 * @returns {Array} Grouped summary
 */
function groupB2CByRateAndState(b2cSupplies) {
  const grouped = {};
  
  b2cSupplies.forEach(supply => {
    const key = `${supply.place_of_supply}-${supply.rate}`;
    if (!grouped[key]) {
      grouped[key] = {
        place_of_supply: supply.place_of_supply,
        rate: supply.rate,
        taxable_value: 0,
        igst_amount: 0,
        cgst_amount: 0,
        sgst_amount: 0,
        cess_amount: 0,
        invoice_count: 0
      };
    }
    
    grouped[key].taxable_value += supply.taxable_value;
    grouped[key].igst_amount += supply.igst_amount;
    grouped[key].cgst_amount += supply.cgst_amount;
    grouped[key].sgst_amount += supply.sgst_amount;
    grouped[key].cess_amount += supply.cess_amount;
    grouped[key].invoice_count += 1;
  });
  
  return Object.values(grouped);
}

/**
 * Get tax rate breakdown for the period
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Array} Rate-wise breakdown
 */
function getTaxRateBreakdown(startDate, endDate) {
  if (!db) return [];
  
  const breakdown = db.prepare(`
    SELECT 
      t.gst_rate,
      SUM(t.taxable_amount) as total_taxable,
      SUM(t.igst_amount) as total_igst,
      SUM(t.cgst_amount) as total_cgst,
      SUM(t.sgst_amount) as total_sgst,
      SUM(t.cess_amount) as total_cess,
      COUNT(*) as transaction_count
    FROM transactions t
    WHERE t.voucher_type = 'sale'
      AND t.date >= ?
      AND t.date <= ?
    GROUP BY t.gst_rate
    ORDER BY t.gst_rate ASC
  `).all(startDate, endDate);
  
  return breakdown.map(row => ({
    rate: row.gst_rate || 0,
    taxable_value: row.total_taxable || 0,
    igst_amount: row.total_igst || 0,
    cgst_amount: row.total_cgst || 0,
    sgst_amount: row.total_sgst || 0,
    cess_amount: row.total_cess || 0,
    total_tax: (row.total_igst || 0) + (row.total_cgst || 0) + (row.total_sgst || 0) + (row.total_cess || 0),
    transaction_count: row.transaction_count
  }));
}

/**
 * Get business state code from configuration
 * @returns {string} State code
 */
function getBusinessStateCode() {
  if (!db) return '07';
  
  const state = db.prepare(`SELECT value FROM business_info WHERE key = 'state_code'`).get();
  return state?.value || '07';
}

/**
 * Export GSTR-1 as JSON for portal upload
 * @param {Object} filters - Date range
 * @returns {Object} JSON for upload
 */
function exportGSTR1JSON(filters = {}) {
  const data = getGSTR1Data(filters);
  
  // Format for GST portal
  const gstr1Json = {
    gstin: getBusinessGSTIN(),
    fp: filters.filingPeriod || getFilingPeriod(filters.startDate),
    gen_date: new Date().toISOString(),
    sum: {
      ct: data.summary.total_taxable,
      igst: data.summary.total_igst,
      cgst: data.summary.total_cgst,
      sgst: data.summary.total_sgst,
      cess: data.summary.total_cess,
      sec7act: 'N'
    },
    b2b: data.supplies.b2b.map(inv => ({
      ctin: inv.party_gstin,
      inv: [{
        inum: inv.invoice_no,
        idt: inv.invoice_date,
        val: inv.invoice_value,
        pos: inv.place_of_supply,
        rchrg: 'N',
        inv_typ: 'R',
        etin: inv.irn || '',
        items: [{
          num: 1,
          txval: inv.taxable_value,
          rt: inv.rate,
          igst: inv.igst_amount,
          cgst: inv.cgst_amount,
          sgst: inv.sgst_amount,
          cess: inv.cess_amount
        }]
      }]
    })),
    b2cl: [], // B2C Large - invoices > Rs 2.5 Lakhs
    b2cs: data.supplies.b2c_summary.map(item => ({
      pos: item.place_of_supply,
      txval: item.taxable_value,
      rt: item.rate,
      igst: item.igst_amount,
      cgst: 0,
      sgst: 0,
      cess: item.cess_amount,
      typ: 'OE'
    })),
    exp: data.supplies.exports.map(exp => ({
      exp_typ: 'WPAY',
      inum: exp.invoice_no,
      idt: exp.invoice_date,
      val: exp.invoice_value,
      sbdt: exp.ack_date || '',
      sbnum: exp.irn || '',
      items: [{
        txval: exp.taxable_value,
        rt: exp.rate,
        igst: exp.igst_amount,
        cgst: 0,
        sgst: 0,
        cess: exp.cess_amount
      }]
    }))
  };
  
  return gstr1Json;
}

/**
 * Export GSTR-3B as JSON for portal upload
 * @param {Object} filters - Date range
 * @returns {Object} JSON for upload
 */
function exportGSTR3BJSON(filters = {}) {
  const data = getGSTR3BData(filters);
  
  const gstr3bJson = {
    gstin: getBusinessGSTIN(),
    fp: filters.filingPeriod || getFilingPeriod(filters.startDate),
    gen_date: new Date().toISOString(),
    
    // Summary of outward supplies
    sup_details: {
      osup: {
        val: data.summary.total_outward_taxable,
        cry: data.outward_supplies.cgst + data.outward_supplies.sgst,
        intral: 0
      },
      osup_zero: { val: 0, cry: 0, intral: 0 },
      osup_exempt: { val: 0, nilsup: 0, exptd: 0 },
      isup_rev: { val: 0, cry: 0, intral: 0 },
      osup_nongst: { val: 0, nilsup: 0, exptd: 0 }
    },
    
    // Input tax credit
    itc_avail: {
      c1: {
        iit: {
          cgst: data.itc_available.cgst,
          sgst: data.itc_available.sgst,
          igst: data.itc_available.igst,
          cess: data.itc_available.cess
        }
      }
    },
    
    // Inward supplies attracting reverse charge
    inp_details: {
      isup_rev: {
        cgst: 0,
        sgst: 0,
        igst: 0,
        cess: 0
      }
    },
    
    // Tax liability
    tax_pay: {
      cgst: { camt: data.net_liability.cgst, camt_adj: 0, camt_paid: data.net_liability.cgst },
      sgst: { samt: data.net_liability.sgst, samt_adj: 0, samt_paid: data.net_liability.sgst },
      igst: { iamt: data.net_liability.igst, iamt_adj: 0, iamt_paid: data.net_liability.igst },
      cess: { csamt: data.net_liability.cess, csamt_adj: 0, csamt_paid: data.net_liability.cess }
    },
    
    // Interest and late fee
    interest: {
      cgst: 0,
      sgst: 0,
      igst: 0,
      cess: 0
    },
    late_fee: {
      cgst: 0,
      sgst: 0,
      igst: 0,
      cess: 0
    }
  };
  
  return gstr3bJson;
}

/**
 * Get business GSTIN
 * @returns {string} GSTIN
 */
function getBusinessGSTIN() {
  if (!db) return '';
  
  const gstin = db.prepare(`SELECT value FROM business_info WHERE key = 'gstin'`).get();
  return gstin?.value || '';
}

/**
 * Get filing period from date
 * @param {string} date - Date string
 * @returns {string} Filing period (MMYYYY)
 */
function getFilingPeriod(date) {
  if (!date) {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
  }
  
  const [year, month] = date.split('-');
  return `${month}${year}`;
}

/**
 * Get ITC reconciliation report
 * @param {Object} filters - Date range
 * @returns {Object} ITC reconciliation data
 */
function getITCReconciliation(filters = {}) {
  if (!db) return null;
  
  const { startDate, endDate } = filters;
  
  // Get purchase transactions eligible for ITC
  const itcEligible = db.prepare(`
    SELECT 
      t.id, t.voucher_no, t.date, t.voucher_type,
      t.total_amount, t.taxable_amount, 
      t.igst_amount, t.cgst_amount, t.sgst_amount, t.cess_amount,
      p.name as party_name, p.gstin as party_gstin,
      e.irn, e.status as einvoice_status
    FROM transactions t
    LEFT JOIN parties p ON t.party_id = p.id
    LEFT JOIN einvoice_records e ON t.id = e.transaction_id
    WHERE t.voucher_type = 'purchase'
      AND t.date >= ?
      AND t.date <= ?
      AND (t.is_itc_eligible = 1 OR t.is_itc_eligible IS NULL)
    ORDER BY t.date ASC
  `).all(startDate, endDate);
  
  // Calculate total ITC available
  let totalIgstItc = 0;
  let totalCgstItc = 0;
  let totalSgstItc = 0;
  let totalCessItc = 0;
  
  const itcDetails = itcEligible.map(txn => {
    const igst = txn.igst_amount || 0;
    const cgst = txn.cgst_amount || 0;
    const sgst = txn.sgst_amount || 0;
    const cess = txn.cess_amount || 0;
    
    totalIgstItc += igst;
    totalCgstItc += cgst;
    totalSgstItc += sgst;
    totalCessItc += cess;
    
    return {
      voucher_no: txn.voucher_no,
      date: txn.date,
      party_name: txn.party_name,
      party_gstin: txn.party_gstin,
      taxable_amount: txn.taxable_amount,
      igst_itc: igst,
      cgst_itc: cgst,
      sgst_itc: sgst,
      cess_itc: cess,
      total_itc: igst + cgst + sgst + cess,
      has_e_invoice: txn.einvoice_status === 'success'
    };
  });
  
  return {
    filing_period: `${startDate} to ${endDate}`,
    generated_at: new Date().toISOString(),
    summary: {
      total_transactions: itcEligible.length,
      total_igst_itc: totalIgstItc,
      total_cgst_itc: totalCgstItc,
      total_sgst_itc: totalSgstItc,
      total_cess_itc: totalCessItc,
      total_itc_available: totalIgstItc + totalCgstItc + totalSgstItc + totalCessItc
    },
    details: itcDetails
  };
}

/**
 * Generate GST liability summary for a period
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Object} Liability summary
 */
function getGSTLiabilitySummary(startDate, endDate) {
  if (!db) return null;
  
  const sales = db.prepare(`
    SELECT 
      SUM(t.igst_amount) as igst,
      SUM(t.cgst_amount) as cgst,
      SUM(t.sgst_amount) as sgst,
      SUM(t.cess_amount) as cess
    FROM transactions t
    WHERE t.voucher_type = 'sale'
      AND t.date >= ?
      AND t.date <= ?
  `).get(startDate, endDate);
  
  const purchases = db.prepare(`
    SELECT 
      SUM(t.igst_amount) as igst,
      SUM(t.cgst_amount) as cgst,
      SUM(t.sgst_amount) as sgst,
      SUM(t.cess_amount) as cess
    FROM transactions t
    WHERE t.voucher_type = 'purchase'
      AND t.date >= ?
      AND t.date <= ?
      AND t.is_itc_eligible = 1
  `).get(startDate, endDate);
  
  return {
    period: `${startDate} to ${endDate}`,
    tax_collected: {
      igst: sales?.igst || 0,
      cgst: sales?.cgst || 0,
      sgst: sales?.sgst || 0,
      cess: sales?.cess || 0,
      total: (sales?.igst || 0) + (sales?.cgst || 0) + (sales?.sgst || 0) + (sales?.cess || 0)
    },
    itc_claimed: {
      igst: purchases?.igst || 0,
      cgst: purchases?.cgst || 0,
      sgst: purchases?.sgst || 0,
      cess: purchases?.cess || 0,
      total: (purchases?.igst || 0) + (purchases?.cgst || 0) + (purchases?.sgst || 0) + (purchases?.cess || 0)
    },
    net_liability: {
      igst: Math.max(0, (sales?.igst || 0) - (purchases?.igst || 0)),
      cgst: Math.max(0, (sales?.cgst || 0) - (purchases?.cgst || 0)),
      sgst: Math.max(0, (sales?.sgst || 0) - (purchases?.sgst || 0)),
      cess: Math.max(0, (sales?.cess || 0) - (purchases?.cess || 0))
    }
  };
}

module.exports = {
  initialize,
  getGSTR1Data,
  getGSTR3BData,
  exportGSTR1JSON,
  exportGSTR3BJSON,
  getITCReconciliation,
  getGSTLiabilitySummary
};
