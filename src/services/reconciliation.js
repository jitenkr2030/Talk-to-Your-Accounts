import api from '../utils/api';

/**
 * Bank Reconciliation Service
 * Handles auto-matching of bank statements with transactions
 */
class ReconciliationService {
  constructor() {
    this.statements = [];
    this.unreconciledTxns = [];
    this.matchingThreshold = 0.85; // 85% confidence threshold
  }

  /**
   * Get all bank statements
   */
  async getStatements(filters = {}) {
    try {
      this.statements = await api.reconciliation.getStatements(filters);
      return this.statements;
    } catch (error) {
      console.error('Failed to fetch bank statements:', error);
      throw error;
    }
  }

  /**
   * Get a specific bank statement with transactions
   */
  async getStatement(id) {
    try {
      return await api.reconciliation.getStatementById(id);
    } catch (error) {
      console.error('Failed to fetch bank statement:', error);
      throw error;
    }
  }

  /**
   * Upload/create a new bank statement record
   */
  async createStatement(data) {
    try {
      const id = await api.reconciliation.createStatement(data);
      const newStatement = await this.getStatement(id);
      this.statements.unshift(newStatement);
      return newStatement;
    } catch (error) {
      console.error('Failed to create bank statement:', error);
      throw error;
    }
  }

  /**
   * Add transactions from bank statement
   */
  async addTransactions(bankStatementId, transactions) {
    const results = [];
    for (const txn of transactions) {
      try {
        const id = await api.reconciliation.addTransaction({
          bank_statement_id: bankStatementId,
          ...txn
        });
        results.push({ success: true, id, ...txn });
      } catch (error) {
        results.push({ success: false, error: error.message, ...txn });
      }
    }
    return results;
  }

  /**
   * Process/auto-match a bank statement
   */
  async processStatement(id) {
    try {
      const result = await api.reconciliation.processStatement(id);

      // Refresh the statement to get updated data
      const statement = await this.getStatement(id);

      return {
        success: true,
        ...result,
        statement
      };
    } catch (error) {
      console.error('Failed to process bank statement:', error);
      throw error;
    }
  }

  /**
   * Get all unreconciled transactions
   */
  async getUnreconciledTransactions() {
    try {
      this.unreconciledTxns = await api.reconciliation.getUnreconciled();
      return this.unreconciledTxns;
    } catch (error) {
      console.error('Failed to fetch unreconciled transactions:', error);
      throw error;
    }
  }

  /**
   * Manually reconcile a transaction with a bank transaction
   */
  async reconcileTransaction(transactionId, bankTxnId) {
    try {
      await api.reconciliation.reconcile(transactionId, bankTxnId);

      // Update local cache
      this.unreconciledTxns = this.unreconciledTxns.filter(t => t.id !== transactionId);

      return { success: true };
    } catch (error) {
      console.error('Failed to reconcile transaction:', error);
      throw error;
    }
  }

  /**
   * Parse bank statement CSV/Excel data
   */
  parseBankStatementData(data, format = 'standard') {
    const transactions = [];

    for (const row of data) {
      let amount = 0;
      let type = 'credit';

      if (format === 'hdfc') {
        // HDFC bank format
        amount = Math.abs(parseFloat(row['Amount']) || 0);
        type = (row['Debit/Credit'] || '').toLowerCase().includes('credit') ? 'credit' : 'debit';
      } else if (format === 'sbi') {
        // SBI bank format
        amount = Math.abs(parseFloat(row['Withdrawals']) || parseFloat(row['Deposits']) || 0);
        type = row['Deposits'] && parseFloat(row['Deposits']) > 0 ? 'credit' : 'debit';
      } else if (format === 'icici') {
        // ICICI bank format
        amount = Math.abs(parseFloat(row['Transaction Amount']) || 0);
        type = (row['Transaction Type'] || '').toLowerCase().includes('credit') ? 'credit' : 'debit';
      } else {
        // Standard format
        amount = Math.abs(parseFloat(row.amount || row.Amount || row.AMOUNT || 0) || 0);
        type = (row.type || row.Type || row.TYPE || 'credit').toLowerCase();
        if (type === 'cr' || type === 'c' || type === '+') type = 'credit';
        if (type === 'dr' || type === 'd' || type === '-') type = 'debit';
      }

      transactions.push({
        date: row.date || row.Date || row.DATE || row['Transaction Date'],
        description: row.description || row.Description || row.DESCRIPTION || row['Transaction Details'] || row.Narration,
        amount,
        type,
        reference_no: row.reference || row.Reference || row.REFERENCE || row['Cheque/Ref No.']
      });
    }

    return transactions.filter(t => t.date && !isNaN(t.amount));
  }

  /**
   * Find matching transaction for a bank transaction
   */
  findMatchingTransaction(bankTxn, transactions, tolerance = { amount: 5, days: 3 }) {
    let bestMatch = null;
    let bestScore = 0;

    for (const txn of transactions) {
      if (txn.is_matched) continue;

      // Amount match (weighted 60%)
      const amountDiff = Math.abs(txn.total_amount - bankTxn.amount);
      const amountScore = amountDiff <= tolerance.amount ? 1 - (amountDiff / tolerance.amount) : 0;
      if (amountScore < 0.5) continue; // Skip if amount match is poor

      // Date match (weighted 40%)
      const txnDate = new Date(txn.date);
      const bankDate = new Date(bankTxn.date);
      const daysDiff = Math.abs((txnDate - bankDate) / (1000 * 60 * 60 * 24));
      const dateScore = daysDiff <= tolerance.days ? 1 - (daysDiff / tolerance.days) : 0;

      // Combined score
      const totalScore = (amountScore * 0.6) + (dateScore * 0.4);

      if (totalScore > bestScore && totalScore >= this.matchingThreshold) {
        bestMatch = { transaction: txn, score: totalScore, amountDiff, daysDiff };
        bestScore = totalScore;
      }
    }

    return bestMatch;
  }

  /**
   * Get reconciliation statistics
   */
  getReconciliationStats() {
    const total = this.statements.reduce((sum, s) => sum + (s.total_transactions || 0), 0);
    const matched = this.statements.reduce((sum, s) => sum + (s.matched_count || 0), 0);
    const unmatched = this.statements.reduce((sum, s) => sum + (s.unmatched_count || 0), 0);

    return {
      totalStatements: this.statements.length,
      processedStatements: this.statements.filter(s => s.status === 'processed').length,
      pendingStatements: this.statements.filter(s => s.status === 'pending').length,
      totalTransactions: total,
      matchedTransactions: matched,
      unmatchedTransactions: unmatched,
      matchRate: total > 0 ? ((matched / total) * 100).toFixed(1) : 0
    };
  }
}

export default new ReconciliationService();
