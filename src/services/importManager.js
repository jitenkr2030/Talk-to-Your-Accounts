/**
 * Import Manager Service
 * Handles bank statement imports, data parsing, and auto-reconciliation
 */

class ImportManager {
  constructor(database) {
    this.db = database;
    this.supportedFormats = ['csv', 'xlsx', 'pdf', 'txt'];
    this.bankFormats = this.initializeBankFormats();
  }

  /**
   * Initialize bank-specific format configurations
   */
  initializeBankFormats() {
    return {
      'HDFC': {
        name: 'HDFC Bank',
        patterns: [
          { date: [0], description: [1], amount: [2], type: [3], balance: [4] },
          { date: [0], description: [1], debit: [2], credit: [3], balance: [4] }
        ],
        dateFormats: ['DD/MM/YYYY', 'DD-MM-YYYY', 'YYYY-MM-DD'],
        delimiter: ','
      },
      'ICICI': {
        name: 'ICICI Bank',
        patterns: [
          { date: [0], description: [1], amount: [2], type: [3], balance: [4] }
        ],
        dateFormats: ['DD/MM/YYYY', 'DD-MM-YYYY'],
        delimiter: ','
      },
      'SBI': {
        name: 'State Bank of India',
        patterns: [
          { date: [0], valueDate: [1], description: [2], refNo: [3], amount: [4], balance: [5] }
        ],
        dateFormats: ['DD-MM-YYYY'],
        delimiter: ','
      },
      'AXIS': {
        name: 'Axis Bank',
        patterns: [
          { date: [0], description: [1], amount: [2], type: [3], balance: [4] }
        ],
        dateFormats: ['DD/MM/YYYY'],
        delimiter: ','
      },
      'DEFAULT': {
        name: 'Generic Bank Statement',
        patterns: [
          { date: [0], description: [1], amount: [2], type: [3], balance: [4] }
        ],
        dateFormats: ['DD/MM/YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY'],
        delimiter: ','
      }
    };
  }

  /**
   * Detect bank format from file content
   * @param {string} content - File content
   * @param {string} filename - Original filename
   * @returns {Object} Detected format
   */
  detectBankFormat(content, filename) {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return { format: 'DEFAULT', confidence: 0.5 };
    }

    // Check header for bank identifiers
    const header = lines[0].toLowerCase();
    
    if (header.includes('hdfc') || header.includes('housing development')) {
      return { format: 'HDFC', confidence: 0.95 };
    }
    if (header.includes('icici') || header.includes('industrial credit')) {
      return { format: 'ICICI', confidence: 0.95 };
    }
    if (header.includes('sbi') || header.includes('state bank') || header.includes('statebank')) {
      return { format: 'SBI', confidence: 0.95 };
    }
    if (header.includes('axis') || header.includes('axis bank')) {
      return { format: 'AXIS', confidence: 0.95 };
    }

    // Analyze structure for generic detection
    const sampleLine = lines[1] || '';
    const columns = sampleLine.split(',').map(c => c.trim());
    
    // Try to identify column types
    const hasDate = columns.some(c => this.isDateLike(c));
    const hasAmount = columns.some(c => this.isAmountLike(c));
    const hasBalance = columns.some(c => this.isAmountLike(c) && c !== columns.find(a => this.isAmountLike(a)));
    
    if (hasDate && hasAmount) {
      return { format: 'DEFAULT', confidence: 0.7 };
    }

    return { format: 'DEFAULT', confidence: 0.3 };
  }

  /**
   * Parse CSV content to structured data
   * @param {string} content - CSV content
   * @param {Object} format - Bank format config
   * @returns {Array} Parsed transactions
   */
  parseCSV(content, format) {
    const lines = content.split('\n').filter(line => line.trim());
    const transactions = [];
    
    // Detect delimiter
    const firstLine = lines[0];
    let delimiter = format.delimiter || ',';
    if (firstLine.includes('\t')) delimiter = '\t';
    if (firstLine.includes(';')) delimiter = ';';

    // Find header row and data start
    let headerRow = 0;
    let dataStartRow = 1;
    
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const columns = lines[i].split(delimiter).map(c => c.trim());
      if (columns.some(c => this.isDateLike(c)) && columns.some(c => this.isAmountLike(c))) {
        headerRow = i;
        dataStartRow = i + 1;
        break;
      }
    }

    const headers = lines[headerRow].split(delimiter).map(h => h.toLowerCase().trim());

    // Parse data rows
    for (let i = dataStartRow; i < lines.length; i++) {
      const columns = lines[i].split(delimiter).map(c => c.trim());
      if (columns.length < 3) continue;

      const transaction = this.parseRow(columns, headers, format);
      if (transaction && transaction.amount !== 0) {
        transactions.push(transaction);
      }
    }

    return transactions;
  }

  /**
   * Parse individual row based on format
   */
  parseRow(columns, headers, format) {
    try {
      // Find date column
      const dateIndex = headers.findIndex(h => 
        h.includes('date') || h.includes('txn date') || h.includes('transaction date')
      );
      
      // Find description column
      const descIndex = headers.findIndex(h => 
        h.includes('description') || h.includes('narration') || h.includes('particulars') || h.includes('details')
      );
      
      // Find amount columns
      const amountIndex = headers.findIndex(h => 
        h.includes('amount') && !h.includes('balance')
      );
      
      const debitIndex = headers.findIndex(h => 
        h.includes('debit') || h.includes('withdrawal') || h.includes('paid out')
      );
      
      const creditIndex = headers.findIndex(h => 
        h.includes('credit') || h.includes('deposit') || h.includes('received')
      );
      
      // Find balance column
      const balanceIndex = headers.findIndex(h => 
        h.includes('balance') || h.includes('closing')
      );

      // Find type column
      const typeIndex = headers.findIndex(h => 
        h.includes('type') || h.includes('dr/cr')
      );

      let amount = 0;
      let transactionType = 'unknown';
      
      if (amountIndex >= 0 && columns[amountIndex]) {
        amount = this.parseAmount(columns[amountIndex]);
        if (typeIndex >= 0 && columns[typeIndex]) {
          transactionType = this.determineTransactionType(columns[typeIndex], amount);
        }
      } else {
        // Check debit/credit columns
        const debit = debitIndex >= 0 ? this.parseAmount(columns[debitIndex]) : 0;
        const credit = creditIndex >= 0 ? this.parseAmount(columns[creditIndex]) : 0;
        
        if (credit > 0) {
          amount = credit;
          transactionType = 'credit';
        } else if (debit > 0) {
          amount = debit;
          transactionType = 'debit';
        }
      }

      return {
        date: dateIndex >= 0 ? this.parseDate(columns[dateIndex]) : null,
        description: descIndex >= 0 ? columns[descIndex] : '',
        amount: Math.abs(amount),
        type: transactionType,
        balance: balanceIndex >= 0 ? this.parseAmount(columns[balanceIndex]) : null,
        rawData: columns
      };
    } catch (error) {
      console.error('Error parsing row:', error);
      return null;
    }
  }

  /**
   * Import bank statement file
   * @param {string} filePath - Path to file
   * @param {Object} options - Import options
   * @returns {Object} Import result
   */
  async importStatement(filePath, options = {}) {
    try {
      const fs = require('fs');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Detect format
      const formatDetect = this.detectBankFormat(content, filePath);
      
      // Parse content
      const transactions = this.parseCSV(content, formatDetect);
      
      if (transactions.length === 0) {
        return {
          success: false,
          error: 'NO_TRANSACTIONS_FOUND',
          message: 'No transactions could be parsed from the file'
        };
      }

      // Calculate totals
      const totalCredits = transactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalDebits = transactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + t.amount, 0);

      // Calculate file hash for duplicate detection
      const crypto = require('crypto');
      const fileHash = crypto.createHash('sha256').update(content).digest('hex');

      // Check for duplicate imports
      const existingFile = this.db.prepare(`
        SELECT id FROM bank_statements WHERE file_hash = ?
      `).get(fileHash);

      if (existingFile) {
        return {
          success: false,
          error: 'DUPLICATE_FILE',
          message: 'This file has already been imported'
        };
      }

      // Store statement record
      const insertResult = this.db.prepare(`
        INSERT INTO bank_statements 
        (file_name, file_hash, import_date, statement_date, total_credits, total_debits, record_count, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        require('path').basename(filePath),
        fileHash,
        new Date().toISOString().split('T')[0],
        transactions[0]?.date || new Date().toISOString().split('T')[0],
        totalCredits,
        totalDebits,
        transactions.length,
        'imported'
      );

      const statementId = insertResult.lastInsertRowid;

      // Insert individual transactions
      const insertTxn = this.db.prepare(`
        INSERT INTO bank_transactions 
        (statement_id, transaction_date, description, amount, type, balance)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const txn of transactions) {
        insertTxn.run(statementId, txn.date, txn.description, txn.amount, txn.type, txn.balance);
      }

      // Auto-match if enabled
      let matchedCount = 0;
      let unmatchedTransactions = [];
      
      if (options.autoReconcile !== false) {
        const matchResult = await this.autoReconcile(statementId, options);
        matchedCount = matchResult.matched;
        unmatchedTransactions = matchResult.unmatched;
      }

      return {
        success: true,
        statementId,
        fileName: require('path').basename(filePath),
        totalTransactions: transactions.length,
        totalCredits,
        totalDebits,
        matchedCount,
        unmatchedCount: transactions.length - matchedCount,
        transactions: unmatchedTransactions.slice(0, 20), // Return first 20 for review
        format: formatDetect.format,
        confidence: formatDetect.confidence
      };
    } catch (error) {
      console.error('Import error:', error);
      return {
        success: false,
        error: 'IMPORT_ERROR',
        message: error.message
      };
    }
  }

  /**
   * Auto-reconcile bank transactions with recorded transactions
   * @param {number} statementId - Bank statement ID
   * @param {Object} options - Reconciliation options
   * @returns {Object} Reconciliation result
   */
  async autoReconcile(statementId, options = {}) {
    const tolerance = options.amountTolerance || 1; // 1 rupee tolerance
    
    // Get unreconciled bank transactions
    const bankTxns = this.db.prepare(`
      SELECT * FROM bank_transactions 
      WHERE statement_id = ? AND is_reconciled = 0
    `).all(statementId);

    let matched = 0;
    const unmatched = [];

    // Match against transactions from same period
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 30);
    const recentDateStr = recentDate.toISOString().split('T')[0];

    for (const bankTxn of bankTxns) {
      // Try to find matching recorded transaction
      let matchStmt;
      let matchParams;

      if (bankTxn.type === 'credit') {
        // Credit = payment received from customer
        matchStmt = this.db.prepare(`
          SELECT t.id, t.voucher_no, t.total_amount, t.party_name, t.date
          FROM transactions t
          WHERE t.voucher_type = 'sale'
            AND t.is_active = 1
            AND ABS(t.total_amount - ?) <= ?
            AND t.date BETWEEN ? AND ?
            AND t.id NOT IN (
              SELECT matched_transaction_id FROM bank_transactions 
              WHERE matched_transaction_id IS NOT NULL
            )
          ORDER BY ABS(t.total_amount - ?) ASC
          LIMIT 1
        `);
        matchParams = [bankTxn.amount, tolerance, recentDateStr, bankTxn.transaction_date, bankTxn.amount];
      } else {
        // Debit = payment made to vendor
        matchStmt = this.db.prepare(`
          SELECT t.id, t.voucher_no, t.total_amount, t.party_name, t.date
          FROM transactions t
          WHERE t.voucher_type = 'purchase'
            AND t.is_active = 1
            AND ABS(t.total_amount - ?) <= ?
            AND t.date BETWEEN ? AND ?
            AND t.id NOT IN (
              SELECT matched_transaction_id FROM bank_transactions 
              WHERE matched_transaction_id IS NOT NULL
            )
          ORDER BY ABS(t.total_amount - ?) ASC
          LIMIT 1
        `);
        matchParams = [bankTxn.amount, tolerance, recentDateStr, bankTxn.transaction_date, bankTxn.amount];
      }

      const match = matchStmt.get(...matchParams);

      if (match) {
        // Mark as reconciled
        this.db.prepare(`
          UPDATE bank_transactions
          SET is_reconciled = 1, matched_transaction_id = ?, category = 'matched'
          WHERE id = ?
        `).run(match.id, bankTxn.id);
        
        matched++;
      } else {
        // Try to suggest party based on description
        const suggestedParty = await this.suggestParty(bankTxn.description);
        unmatched.push({
          ...bankTxn,
          suggestedParty
        });
      }
    }

    return { matched, unmatched };
  }

  /**
   * Suggest party based on transaction description
   */
  async suggestParty(description) {
    if (!description) return null;

    // Search for similar party names
    const parties = this.db.prepare(`
      SELECT id, name, type
      FROM parties
      WHERE is_active = 1
        AND (name LIKE ? OR name LIKE ?)
      LIMIT 3
    `).all(
      `%${description.substring(0, 5)}%`,
      `%${description.substring(description.length - 5)}%`
    );

    if (parties.length > 0) {
      return parties[0];
    }

    return null;
  }

  /**
   * Manual reconciliation match
   * @param {number} bankTxnId - Bank transaction ID
   * @param {number} transactionId - Recorded transaction ID
   * @param {string} matchedBy - User who performed match
   */
  async manualMatch(bankTxnId, transactionId, matchedBy) {
    try {
      this.db.prepare(`
        UPDATE bank_transactions
        SET is_reconciled = 1, matched_transaction_id = ?, category = 'manual'
        WHERE id = ?
      `).run(transactionId, bankTxnId);

      // Log the match
      this.db.prepare(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_value)
        VALUES (?, 'MANUAL_MATCH', 'bank_transactions', ?, ?)
      `).run(
        matchedBy,
        bankTxnId,
        JSON.stringify({ matched_transaction_id: transactionId })
      );

      return { success: true };
    } catch (error) {
      console.error('Manual match error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Undo reconciliation
   * @param {number} bankTxnId - Bank transaction ID
   */
  async undoMatch(bankTxnId) {
    try {
      this.db.prepare(`
        UPDATE bank_transactions
        SET is_reconciled = 0, matched_transaction_id = NULL, category = NULL
        WHERE id = ?
      `).run(bankTxnId);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get reconciliation status for a statement
   */
  getReconciliationStatus(statementId) {
    const stats = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_reconciled = 1 THEN 1 ELSE 0 END) as matched,
        SUM(CASE WHEN is_reconciled = 0 THEN 1 ELSE 0 END) as unmatched,
        SUM(CASE WHEN is_reconciled = 1 THEN amount ELSE 0 END) as matched_amount,
        SUM(CASE WHEN is_reconciled = 0 THEN amount ELSE 0 END) as unmatched_amount
      FROM bank_transactions
      WHERE statement_id = ?
    `).get(statementId);

    return {
      total: stats.total || 0,
      matched: stats.matched || 0,
      unmatched: stats.unmatched || 0,
      matchPercentage: stats.total > 0 ? ((stats.matched / stats.total) * 100).toFixed(1) : 0,
      matchedAmount: stats.matched_amount || 0,
      unmatchedAmount: stats.unmatched_amount || 0
    };
  }

  /**
   * Get import history
   */
  getImportHistory(limit = 20) {
    return this.db.prepare(`
      SELECT * FROM bank_statements
      ORDER BY import_date DESC
      LIMIT ?
    `).all(limit);
  }

  /**
   * Get statement details
   */
  getStatementDetails(statementId) {
    const statement = this.db.prepare(`
      SELECT * FROM bank_statements WHERE id = ?
    `).get(statementId);

    const transactions = this.db.prepare(`
      SELECT * FROM bank_transactions
      WHERE statement_id = ?
      ORDER BY transaction_date
    `).all(statementId);

    const reconciliation = this.getReconciliationStatus(statementId);

    return {
      statement,
      transactions,
      reconciliation
    };
  }

  /**
   * Delete imported statement
   */
  async deleteStatement(statementId) {
    try {
      // Delete bank transactions
      this.db.prepare(`DELETE FROM bank_transactions WHERE statement_id = ?`).run(statementId);
      
      // Delete statement record
      this.db.prepare(`DELETE FROM bank_statements WHERE id = ?`).run(statementId);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper: Check if string looks like a date
   */
  isDateLike(str) {
    if (!str) return false;
    const datePatterns = [
      /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/,
      /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/,
      /^\d{1,2}[A-Za-z]{3,}\d{2,4}$/
    ];
    return datePatterns.some(p => p.test(str.trim()));
  }

  /**
   * Helper: Check if string looks like an amount
   */
  isAmountLike(str) {
    if (!str) return false;
    const cleaned = str.replace(/[₹$,\s]/g, '').replace(/[()]/g, '');
    return /^-?\d*\.?\d+$/.test(cleaned);
  }

  /**
   * Helper: Parse amount string to number
   */
  parseAmount(str) {
    if (!str) return 0;
    const cleaned = str.toString().replace(/[₹$,\s]/g, '').replace(/[()]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Helper: Parse date string to YYYY-MM-DD
   */
  parseDate(str) {
    if (!str) return null;
    
    const formats = [
      { pattern: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/, parse: (m) => `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` },
      { pattern: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/, parse: (m) => `20${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` },
      { pattern: /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/, parse: (m) => `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` }
    ];

    for (const format of formats) {
      const match = str.trim().match(format.pattern);
      if (match) {
        const dateStr = format.parse(match);
        if (this.isValidDate(dateStr)) {
          return dateStr;
        }
      }
    }

    return null;
  }

  /**
   * Helper: Validate date
   */
  isValidDate(dateStr) {
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date);
  }

  /**
   * Helper: Determine transaction type
   */
  determineTransactionType(typeStr, amount) {
    if (!typeStr) return amount >= 0 ? 'credit' : 'debit';
    
    const lower = typeStr.toLowerCase();
    if (lower.includes('credit') || lower.includes('cr') || lower.includes('deposit')) {
      return 'credit';
    }
    if (lower.includes('debit') || lower.includes('dr') || lower.includes('withdrawal')) {
      return 'debit';
    }
    return amount >= 0 ? 'credit' : 'debit';
  }

  /**
   * Export matched transactions to CSV
   */
  exportMatchedTransactions(statementId) {
    const transactions = this.db.prepare(`
      SELECT 
        bt.transaction_date,
        bt.description,
        bt.amount,
        bt.type,
        t.voucher_no,
        t.date as txn_date,
        t.party_name,
        t.total_amount as txn_amount
      FROM bank_transactions bt
      LEFT JOIN transactions t ON bt.matched_transaction_id = t.id
      WHERE bt.statement_id = ?
        AND bt.is_reconciled = 1
      ORDER BY bt.transaction_date
    `).all(statementId);

    let csv = 'Bank Date,Description,Bank Amount,Type,Voucher No,Txn Date,Party,Txn Amount\n';
    
    transactions.forEach(t => {
      csv += `"${t.transaction_date}","${t.description}",${t.amount},${t.type},"${t.voucher_no || ''}","${t.txn_date || ''}","${t.party_name || ''}",${t.txn_amount || ''}\n`;
    });

    return csv;
  }
}

module.exports = ImportManager;
