/**
 * Report Engine Service
 * Generates comprehensive financial reports for the accounting application
 */

class ReportEngine {
  constructor(database) {
    this.db = database;
  }

  /**
   * Generate Sales Report
   * @param {Object} params - Report parameters
   * @returns {Object} Sales report data
   */
  async generateSalesReport(params = {}) {
    const { startDate, endDate, partyId, groupBy = 'day' } = params;

    try {
      let query = `
        SELECT 
          t.id,
          t.voucher_number,
          t.date,
          t.voucher_type,
          t.total_amount,
          t.total_gst,
          t.payment_status,
          t.party_id,
          p.name as party_name,
          t.notes
        FROM transactions t
        LEFT JOIN parties p ON t.party_id = p.id
        WHERE t.voucher_type = 'sale'
          AND t.status = 'active'
      `;

      const queryParams = [];

      if (startDate) {
        query += ` AND t.date >= ?`;
        queryParams.push(startDate);
      }

      if (endDate) {
        query += ` AND t.date <= ?`;
        queryParams.push(endDate);
      }

      if (partyId) {
        query += ` AND t.party_id = ?`;
        queryParams.push(partyId);
      }

      query += ` ORDER BY t.date DESC, t.created_at DESC`;

      const transactions = await this.db.prepare(query).all(...queryParams);

      // Calculate summary
      const totalSales = transactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
      const totalGST = transactions.reduce((sum, t) => sum + (t.total_gst || 0), 0);
      const taxableAmount = totalSales - totalGST;
      const paidAmount = transactions
        .filter(t => t.payment_status === 'paid')
        .reduce((sum, t) => sum + (t.total_amount || 0), 0);
      const pendingAmount = totalSales - paidAmount;
      const transactionCount = transactions.length;

      // Group by period
      const groupedData = this._groupTransactions(transactions, groupBy);

      // Sales by party
      const salesByParty = this._aggregateByField(transactions, 'party_name');

      // Sales by GST rate
      const salesByGST = this._aggregateByGST(transactions);

      // Daily sales trend (last 30 days if no date range)
      const dailySales = await this._getDailySales(startDate, endDate);

      return {
        summary: {
          total_sales: totalSales,
          taxable_amount: taxableAmount,
          total_gst: totalGST,
          transaction_count: transactionCount,
          paid_amount: paidAmount,
          pending_amount: pendingAmount,
          average_transaction: transactionCount > 0 ? totalSales / transactionCount : 0
        },
        transactions,
        groupedData,
        salesByParty: salesByParty.slice(0, 10),
        salesByGST,
        dailySales,
        period: { startDate, endDate },
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating sales report:', error);
      throw new Error('Failed to generate sales report');
    }
  }

  /**
   * Generate GST Report
   * @param {string} month - Month in YYYY-MM format
   * @returns {Object} GST report data
   */
  async generateGSTReport(month) {
    try {
      const startDate = `${month}-01`;
      const endDate = `${month}-31`;

      // Get sales with GST
      const salesQuery = `
        SELECT 
          t.id,
          t.date,
          t.voucher_number,
          p.name as party_name,
          p.gst_number as party_gst,
          t.total_amount,
          t.total_gst,
          t.cgst_amount,
          t.sgst_amount,
          t.igst_amount,
          t.gst_rate
        FROM transactions t
        LEFT JOIN parties p ON t.party_id = p.id
        WHERE t.voucher_type = 'sale'
          AND t.status = 'active'
          AND t.date >= ? 
          AND t.date <= ?
          AND t.gst_rate > 0
        ORDER BY t.date ASC
      `;

      const sales = await this.db.prepare(salesQuery).all(startDate, endDate);

      // Get purchases with GST
      const purchasesQuery = `
        SELECT 
          t.id,
          t.date,
          t.voucher_number,
          p.name as party_name,
          p.gst_number as party_gst,
          t.total_amount,
          t.total_gst,
          t.cgst_amount,
          t.sgst_amount,
          t.igst_amount,
          t.gst_rate
        FROM transactions t
        LEFT JOIN parties p ON t.party_id = p.id
        WHERE t.voucher_type = 'purchase'
          AND t.status = 'active'
          AND t.date >= ? 
          AND t.date <= ?
          AND t.gst_rate > 0
        ORDER BY t.date ASC
      `;

      const purchases = await this.db.prepare(purchasesQuery).all(startDate, endDate);

      // Calculate GST summary by rate
      const gstSummary = {};
      let totalGSTCollected = 0;
      let totalGSTPaid = 0;

      sales.forEach(sale => {
        const rate = sale.gst_rate || 0;
        if (!gstSummary[rate]) {
          gstSummary[rate] = { taxable_amount: 0, cgst: 0, sgst: 0, igst: 0, total_gst: 0, count: 0 };
        }
        gstSummary[rate].taxable_amount += (sale.total_amount - sale.total_gst);
        gstSummary[rate].cgst += sale.cgst_amount || 0;
        gstSummary[rate].sgst += sale.sgst_amount || 0;
        gstSummary[rate].igst += sale.igst_amount || 0;
        gstSummary[rate].total_gst += sale.total_gst || 0;
        gstSummary[rate].count += 1;
        totalGSTCollected += sale.total_gst || 0;
      });

      purchases.forEach(purchase => {
        const rate = purchase.gst_rate || 0;
        if (!gstSummary[rate]) {
          gstSummary[rate] = { taxable_amount: 0, cgst: 0, sgst: 0, igst: 0, total_gst: 0, count: 0 };
        }
        gstSummary[rate].taxable_amount -= (purchase.total_amount - purchase.total_gst);
        gstSummary[rate].cgst -= purchase.cgst_amount || 0;
        gstSummary[rate].sgst -= purchase.sgst_amount || 0;
        gstSummary[rate].igst -= purchase.igst_amount || 0;
        gstSummary[rate].total_gst -= purchase.total_gst || 0;
        totalGSTPaid += purchase.total_gst || 0;
      });

      // Convert to array and sort by rate
      const salesByGST = Object.entries(gstSummary)
        .map(([rate, data]) => ({
          gst_rate: parseFloat(rate),
          ...data
        }))
        .sort((a, b) => a.gst_rate - b.gst_rate);

      // B2B sales summary
      const b2bSales = sales.filter(s => s.party_gst && s.party_gst.length === 15);
      const b2cSales = sales.filter(s => !s.party_gst || s.party_gst.length !== 15);

      // Export type summary (for GSTR-1)
      const exportSummary = {
        b2b: {
          count: b2bSales.length,
          taxable_amount: b2bSales.reduce((sum, s) => sum + (s.total_amount - s.total_gst), 0),
          tax_amount: b2bSales.reduce((sum, s) => sum + s.total_gst, 0)
        },
        b2c: {
          count: b2cSales.length,
          taxable_amount: b2cSales.reduce((sum, s) => sum + (s.total_amount - s.total_gst), 0),
          tax_amount: b2cSales.reduce((sum, s) => sum + s.total_gst, 0)
        }
      };

      return {
        summary: {
          month,
          total_sales: sales.reduce((sum, s) => sum + s.total_amount, 0),
          total_purchases: purchases.reduce((sum, p) => sum + p.total_amount, 0),
          gst_collected: totalGSTCollected,
          gst_paid: totalGSTPaid,
          net_liability: totalGSTCollected - totalGSTPaid,
          sales_count: sales.length,
          purchases_count: purchases.length
        },
        salesByGST,
        exportSummary,
        salesDetails: sales,
        purchasesDetails: purchases,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating GST report:', error);
      throw new Error('Failed to generate GST report');
    }
  }

  /**
   * Generate Profit and Loss Report
   * @param {Object} params - Report parameters
   * @returns {Object} P&L report data
   */
  async generateProfitLoss(params = {}) {
    const { startDate, endDate } = params;

    try {
      // Get sales
      const salesQuery = `
        SELECT 
          SUM(total_amount) as total_sales,
          SUM(total_gst) as total_sales_gst,
          COUNT(*) as transaction_count
        FROM transactions
        WHERE voucher_type = 'sale'
          AND status = 'active'
          AND date >= ?
          AND date <= ?
      `;

      const salesResult = await this.db.prepare(salesQuery).get(startDate, endDate);
      const totalSales = salesResult?.total_sales || 0;
      const salesGST = salesResult?.total_sales_gst || 0;
      const netSales = totalSales - salesGST;

      // Get purchases
      const purchasesQuery = `
        SELECT 
          SUM(total_amount) as total_purchases,
          SUM(total_gst) as total_purchases_gst,
          COUNT(*) as transaction_count
        FROM transactions
        WHERE voucher_type = 'purchase'
          AND status = 'active'
          AND date >= ?
          AND date <= ?
      `;

      const purchasesResult = await this.db.prepare(purchasesQuery).get(startDate, endDate);
      const totalPurchases = purchasesResult?.total_purchases || 0;
      const purchasesGST = purchasesResult?.total_purchases_gst || 0;
      const netPurchases = totalPurchases - purchasesGST;

      // Get expenses
      const expensesQuery = `
        SELECT 
          category,
          SUM(amount) as total_amount,
          COUNT(*) as count
        FROM expenses
        WHERE date >= ?
          AND date <= ?
          AND status = 'active'
        GROUP BY category
      `;

      const expensesByCategory = await this.db.prepare(expensesQuery).all(startDate, endDate);
      const totalExpenses = expensesByCategory.reduce((sum, e) => sum + e.total_amount, 0);

      // Calculate margins
      const grossProfit = netSales - netPurchases;
      const netProfit = grossProfit - totalExpenses;
      const grossMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;
      const netMargin = netSales > 0 ? (netProfit / netSales) * 100 : 0;

      // Previous period comparison
      const periodDays = this._getDaysBetween(startDate, endDate);
      const prevStartDate = this._addDays(startDate, -periodDays);
      const prevEndDate = this._addDays(startDate, -1);

      const prevSalesQuery = `SELECT SUM(total_amount) as total FROM transactions WHERE voucher_type = 'sale' AND status = 'active' AND date >= ? AND date <= ?`;
      const prevSales = await this.db.prepare(prevSalesQuery).get(prevStartDate, prevEndDate);
      const prevSalesTotal = prevSales?.total || 0;

      const salesGrowth = prevSalesTotal > 0 
        ? ((totalSales - prevSalesTotal) / prevSalesTotal) * 100 
        : 0;

      return {
        summary: {
          period: { startDate, endDate },
          total_sales: totalSales,
          sales_gst: salesGST,
          net_sales: netSales,
          total_purchases: totalPurchases,
          purchases_gst: purchasesGST,
          net_purchases: netPurchases,
          gross_profit: grossProfit,
          gross_margin: grossMargin,
          total_expenses: totalExpenses,
          net_profit: netProfit,
          net_margin: netMargin,
          sales_growth: salesGrowth,
          transaction_count: (salesResult?.transaction_count || 0) + (purchasesResult?.transaction_count || 0)
        },
        sales: {
          total_sales: totalSales,
          net_sales: netSales,
          transaction_count: salesResult?.transaction_count || 0
        },
        purchases: {
          total_purchases: totalPurchases,
          net_purchases: netPurchases,
          transaction_count: purchasesResult?.transaction_count || 0
        },
        expenses: {
          total: totalExpenses,
          by_category: expensesByCategory
        },
        gross_profit: grossProfit,
        net_profit: netProfit,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating P&L report:', error);
      throw new Error('Failed to generate profit & loss report');
    }
  }

  /**
   * Generate Balance Sheet
   * @param {string} asOfDate - Balance sheet as of date
   * @returns {Object} Balance sheet data
   */
  async generateBalanceSheet(asOfDate) {
    try {
      const date = asOfDate || new Date().toISOString().split('T')[0];

      // Assets
      const cashInHandQuery = `SELECT SUM(balance) as total FROM cash_accounts WHERE type = 'cash' AND status = 'active'`;
      const cashResult = await this.db.prepare(cashInHandQuery).get();
      const cashInHand = cashResult?.total || 0;

      const bankBalancesQuery = `SELECT SUM(current_balance) as total FROM bank_accounts WHERE status = 'active'`;
      const bankResult = await this.db.prepare(bankBalancesQuery).get();
      const bankBalance = bankResult?.total || 0;

      // Accounts Receivable (outstanding amounts)
      const receivablesQuery = `
        SELECT 
          SUM(CASE WHEN payment_status = 'pending' THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END) as total_receivables,
          SUM(CASE WHEN payment_status = 'overdue' THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END) as overdue_receivables
        FROM transactions
        WHERE voucher_type = 'sale' AND status = 'active' AND date <= ?
      `;
      const receivables = await this.db.prepare(receivablesQuery).get(date);
      const accountsReceivable = receivables?.total_receivables || 0;

      // Inventory value
      const inventoryQuery = `
        SELECT 
          SUM(p.current_stock * p.purchase_price) as total_value
        FROM products p
        WHERE p.status = 'active' AND p.current_stock > 0
      `;
      const inventory = await this.db.prepare(inventoryQuery).get();
      const inventoryValue = inventory?.total_value || 0;

      // Fixed Assets
      const fixedAssetsQuery = `SELECT SUM(COALESCE(purchase_value, 0) - COALESCE(depreciation, 0)) as total FROM fixed_assets WHERE status = 'active'`;
      const fixedAssets = await this.db.prepare(fixedAssetsQuery).get();
      const totalFixedAssets = fixedAssets?.total || 0;

      // Liabilities
      const accountsPayableQuery = `
        SELECT 
          SUM(CASE WHEN payment_status = 'pending' THEN total_amount - COALESCE(paid_amount, 0) ELSE 0 END) as total_payables
        FROM transactions
        WHERE voucher_type = 'purchase' AND status = 'active' AND date <= ?
      `;
      const payables = await this.db.prepare(accountsPayableQuery).get(date);
      const accountsPayable = payables?.total_payables || 0;

      // GST Liability
      const gstLiabilityQuery = `
        SELECT 
          SUM(CASE WHEN voucher_type = 'sale' THEN total_gst ELSE 0 END) as gst_collected,
          SUM(CASE WHEN voucher_type = 'purchase' THEN total_gst ELSE 0 END) as gst_paid
        FROM transactions
        WHERE status = 'active' AND date <= ?
      `;
      const gstLiability = await this.db.prepare(gstLiabilityQuery).get(date);
      const netGSTLiability = (gstLiability?.gst_collected || 0) - (gstLiability?.gst_paid || 0);

      // Loans
      const loansQuery = `SELECT SUM(COALESCE(outstanding_amount, 0)) as total FROM loans WHERE status = 'active'`;
      const loans = await this.db.prepare(loansQuery).get();
      const totalLoans = loans?.total || 0;

      // Calculate Equity
      const totalAssets = cashInHand + bankBalance + accountsReceivable + inventoryValue + totalFixedAssets;
      const totalLiabilities = accountsPayable + netGSTLiability + totalLoans;
      const totalEquity = totalAssets - totalLiabilities;

      return {
        as_of_date: date,
        assets: {
          current_assets: {
            cash_and_bank: {
              cash_in_hand: cashInHand,
              bank_balance: bankBalance,
              total: cashInHand + bankBalance
            },
            accounts_receivable: {
              total: accountsReceivable,
              overdue: receivables?.overdue_receivables || 0
            },
            inventory: {
              value: inventoryValue,
              item_count: await this._countProducts()
            },
            total_current_assets: cashInHand + bankBalance + accountsReceivable + inventoryValue
          },
          fixed_assets: {
            total: totalFixedAssets,
            details: await this._getFixedAssets()
          },
          total_assets: totalAssets
        },
        liabilities: {
          current_liabilities: {
            accounts_payable: accountsPayable,
            gst_liability: netGSTLiability,
            total: accountsPayable + netGSTLiability
          },
          long_term_liabilities: {
            loans: totalLoans,
            total: totalLoans
          },
          total_liabilities: totalLiabilities
        },
        equity: {
          total: totalEquity,
          capital: await this._getCapital(),
          retained_earnings: totalEquity - (await this._getCapital())
        },
        balance_check: {
          total_liabilities_equity: totalLiabilities + totalEquity,
          total_assets: totalAssets,
          balanced: Math.abs((totalLiabilities + totalEquity) - totalAssets) < 1
        },
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating balance sheet:', error);
      throw new Error('Failed to generate balance sheet');
    }
  }

  /**
   * Generate Cash Flow Statement
   * @param {Object} params - Report parameters
   * @returns {Object} Cash flow data
   */
  async generateCashFlow(params = {}) {
    const { startDate, endDate } = params;

    try {
      // Operating Activities
      const cashFromSalesQuery = `
        SELECT SUM(paid_amount) as total
        FROM transactions
        WHERE voucher_type = 'sale' AND status = 'active'
          AND date >= ? AND date <= ?
      `;
      const cashFromSales = await this.db.prepare(cashFromSalesQuery).get(startDate, endDate);

      const cashForPurchasesQuery = `
        SELECT SUM(paid_amount) as total
        FROM transactions
        WHERE voucher_type = 'purchase' AND status = 'active'
          AND date >= ? AND date <= ?
      `;
      const cashForPurchases = await this.db.prepare(cashForPurchasesQuery).get(startDate, endDate);

      const cashForExpensesQuery = `SELECT SUM(amount) as total FROM expenses WHERE date >= ? AND date <= ? AND status = 'active'`;
      const cashForExpenses = await this.db.prepare(cashForExpensesQuery).get(startDate, endDate);

      const netCashFromOperating = 
        (cashFromSales?.total || 0) - 
        (cashForPurchases?.total || 0) - 
        (cashForExpenses?.total || 0);

      // Investing Activities
      const assetPurchasesQuery = `SELECT SUM(COALESCE(purchase_value, 0)) as total FROM fixed_assets WHERE purchase_date >= ? AND purchase_date <= ? AND status = 'active'`;
      const assetPurchases = await this.db.prepare(assetPurchasesQuery).get(startDate, endDate);

      const assetSalesQuery = `SELECT SUM(COALESCE(sale_value, 0)) as total FROM fixed_assets WHERE sale_date >= ? AND sale_date <= ? AND status = 'sold'`;
      const assetSales = await this.db.prepare(assetSalesQuery).get(startDate, endDate);

      const netCashFromInvesting = (assetSales?.total || 0) - (assetPurchases?.total || 0);

      // Financing Activities
      const loanReceiptsQuery = `SELECT SUM(COALESCE(loan_amount, 0)) as total FROM loans WHERE disbursement_date >= ? AND disbursement_date <= ? AND status = 'active'`;
      const loanReceipts = await this.db.prepare(loanReceiptsQuery).get(startDate, endDate);

      const loanPaymentsQuery = `SELECT SUM(COALESCE(emi_amount, 0)) as total FROM loan_payments WHERE payment_date >= ? AND payment_date <= ?`;
      const loanPayments = await this.db.prepare(loanPaymentsQuery).get(startDate, endDate);

      const netCashFromFinancing = (loanReceipts?.total || 0) - (loanPayments?.total || 0);

      // Net Change
      const netCashChange = netCashFromOperating + netCashFromInvesting + netCashFromFinancing;

      // Opening and Closing Cash
      const openingCashQuery = `
        SELECT 
          (SELECT COALESCE(SUM(balance), 0) FROM cash_accounts WHERE type = 'cash' AND status = 'active') +
          (SELECT COALESCE(SUM(current_balance), 0) FROM bank_accounts WHERE status = 'active') as total
      `;
      const openingCash = await this.db.prepare(openingCashQuery).get();

      return {
        summary: {
          period: { startDate, endDate },
          net_cash_from_operating: netCashFromOperating,
          net_cash_from_investing: netCashFromInvesting,
          net_cash_from_financing: netCashFromFinancing,
          net_change_in_cash: netCashChange,
          opening_cash: openingCash?.total || 0,
          closing_cash: (openingCash?.total || 0) + netCashChange
        },
        operating_activities: {
          cash_received_from_customers: cashFromSales?.total || 0,
          cash_paid_to_suppliers: cashForPurchases?.total || 0,
          cash_paid_for_expenses: cashForExpenses?.total || 0,
          net: netCashFromOperating
        },
        investing_activities: {
          purchase_of_assets: assetPurchases?.total || 0,
          sale_of_assets: assetSales?.total || 0,
          net: netCashFromInvesting
        },
        financing_activities: {
          loan_receipts: loanReceipts?.total || 0,
          loan_payments: loanPayments?.total || 0,
          net: netCashFromFinancing
        },
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating cash flow statement:', error);
      throw new Error('Failed to generate cash flow statement');
    }
  }

  /**
   * Generate Outstanding Aging Report
   * @returns {Object} Aging analysis data
   */
  async generateOutstandingAging() {
    try {
      // Receivables aging
      const receivablesQuery = `
        SELECT 
          t.id,
          t.voucher_number,
          t.date,
          p.name as party_name,
          p.phone,
          t.total_amount,
          COALESCE(t.paid_amount, 0) as paid_amount,
          (t.total_amount - COALESCE(t.paid_amount, 0)) as outstanding_amount,
          t.due_date,
          t.payment_status,
          JULIANDAY('now') - JULIANDAY(t.due_date) as days_overdue
        FROM transactions t
        LEFT JOIN parties p ON t.party_id = p.id
        WHERE t.voucher_type = 'sale' 
          AND t.status = 'active'
          AND (t.payment_status != 'paid' OR t.payment_status IS NULL)
          AND (t.total_amount - COALESCE(t.paid_amount, 0)) > 0
        ORDER BY days_overdue DESC
      `;

      const receivables = await this.db.prepare(receivablesQuery).all();

      // Categorize by aging buckets
      const agingBuckets = {
        '0-30': { count: 0, amount: 0, parties: new Set() },
        '31-60': { count: 0, amount: 0, parties: new Set() },
        '61-90': { count: 0, amount: 0, parties: new Set() },
        '91-180': { count: 0, amount: 0, parties: new Set() },
        '180+': { count: 0, amount: 0, parties: new Set() }
      };

      let totalOutstanding = 0;
      let totalOverdue = 0;

      receivables.forEach(r => {
        const outstanding = r.outstanding_amount || 0;
        totalOutstanding += outstanding;
        
        const daysOverdue = r.days_overdue || 0;
        if (daysOverdue > 0) {
          totalOverdue += outstanding;
        }

        const age = Math.max(0, (new Date() - new Date(r.due_date || r.date)) / (1000 * 60 * 60 * 24));
        
        let bucket;
        if (age <= 30) bucket = '0-30';
        else if (age <= 60) bucket = '31-60';
        else if (age <= 90) bucket = '61-90';
        else if (age <= 180) bucket = '91-180';
        else bucket = '180+';

        agingBuckets[bucket].count += 1;
        agingBuckets[bucket].amount += outstanding;
        agingBuckets[bucket].parties.add(r.party_name);
      });

      // Convert Sets to counts for JSON serialization
      Object.keys(agingBuckets).forEach(key => {
        agingBuckets[key].party_count = agingBuckets[key].parties.size;
        delete agingBuckets[key].parties;
      });

      // Payables aging
      const payablesQuery = `
        SELECT 
          t.id,
          t.voucher_number,
          t.date,
          p.name as party_name,
          t.total_amount,
          COALESCE(t.paid_amount, 0) as paid_amount,
          (t.total_amount - COALESCE(t.paid_amount, 0)) as outstanding_amount,
          t.due_date
        FROM transactions t
        LEFT JOIN parties p ON t.party_id = p.id
        WHERE t.voucher_type = 'purchase' 
          AND t.status = 'active'
          AND (t.payment_status != 'paid' OR t.payment_status IS NULL)
          AND (t.total_amount - COALESCE(t.paid_amount, 0)) > 0
        ORDER BY t.due_date ASC
      `;

      const payables = await this.db.prepare(payablesQuery).all();
      const totalPayables = payables.reduce((sum, p) => sum + (p.outstanding_amount || 0), 0);

      // Top debtors
      const topDebtors = receivables
        .reduce((acc, r) => {
          const existing = acc.find(item => item.party_name === r.party_name);
          if (existing) {
            existing.outstanding += r.outstanding_amount || 0;
          } else {
            acc.push({
              party_name: r.party_name,
              phone: r.phone,
              outstanding: r.outstanding_amount || 0
            });
          }
          return acc;
        }, [])
        .sort((a, b) => b.outstanding - a.outstanding)
        .slice(0, 10);

      return {
        summary: {
          total_outstanding: totalOutstanding,
          total_overdue: totalOverdue,
          receivable_count: receivables.length,
          payable_count: payables.length,
          total_payables: totalPayables,
          net_position: totalOutstanding - totalPayables
        },
        receivables_aging: agingBuckets,
        top_debtors: topDebtors,
        receivables: receivables.slice(0, 50),
        payables: payables.slice(0, 50),
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating outstanding aging report:', error);
      throw new Error('Failed to generate outstanding aging report');
    }
  }

  /**
   * Generate Expense Summary
   * @param {Object} params - Report parameters
   * @returns {Object} Expense summary data
   */
  async generateExpenseSummary(params = {}) {
    const { startDate, endDate, category } = params;

    try {
      let query = `
        SELECT 
          e.id,
          e.date,
          e.category,
          e.amount,
          e.description,
          e.payment_method,
          e.reference_number,
          e.created_at
        FROM expenses e
        WHERE e.status = 'active'
      `;

      const queryParams = [];

      if (startDate) {
        query += ` AND e.date >= ?`;
        queryParams.push(startDate);
      }

      if (endDate) {
        query += ` AND e.date <= ?`;
        queryParams.push(endDate);
      }

      if (category) {
        query += ` AND e.category = ?`;
        queryParams.push(category);
      }

      query += ` ORDER BY e.date DESC`;

      const expenses = await this.db.prepare(query).all(...queryParams);

      // Summary by category
      const byCategory = expenses.reduce((acc, e) => {
        if (!acc[e.category]) {
          acc[e.category] = { total: 0, count: 0 };
        }
        acc[e.category].total += e.amount || 0;
        acc[e.category].count += 1;
        return acc;
      }, {});

      // Summary by payment method
      const byPaymentMethod = expenses.reduce((acc, e) => {
        const method = e.payment_method || 'cash';
        if (!acc[method]) {
          acc[method] = { total: 0, count: 0 };
        }
        acc[method].total += e.amount || 0;
        acc[method].count += 1;
        return acc;
      }, {});

      // Monthly trend
      const monthlyTrend = this._groupExpensesByMonth(expenses);

      // Total
      const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      return {
        summary: {
          total_expenses: totalExpenses,
          transaction_count: expenses.length,
          average_expense: expenses.length > 0 ? totalExpenses / expenses.length : 0,
          period: { startDate, endDate }
        },
        by_category: Object.entries(byCategory)
          .map(([category, data]) => ({
            category,
            total: data.total,
            count: data.count,
            percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0
          }))
          .sort((a, b) => b.total - a.total),
        by_payment_method: Object.entries(byPaymentMethod)
          .map(([method, data]) => ({
            method,
            total: data.total,
            count: data.count
          })),
        monthly_trend: monthlyTrend,
        expenses: expenses.slice(0, 100),
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating expense summary:', error);
      throw new Error('Failed to generate expense summary');
    }
  }

  // Helper methods

  _groupTransactions(transactions, groupBy) {
    const grouped = {};

    transactions.forEach(t => {
      let key;
      const date = new Date(t.date);

      switch (groupBy) {
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default: // day
          key = t.date;
      }

      if (!grouped[key]) {
        grouped[key] = { total: 0, count: 0, transactions: [] };
      }
      grouped[key].total += t.total_amount || 0;
      grouped[key].count += 1;
      grouped[key].transactions.push(t);
    });

    return grouped;
  }

  _aggregateByField(transactions, field) {
    const aggregated = {};

    transactions.forEach(t => {
      const value = t[field] || 'Unknown';
      if (!aggregated[value]) {
        aggregated[value] = { total: 0, count: 0 };
      }
      aggregated[value].total += t.total_amount || 0;
      aggregated[value].count += 1;
    });

    return Object.entries(aggregated)
      .map(([name, data]) => ({ name, total: data.total, count: data.count }))
      .sort((a, b) => b.total - a.total);
  }

  _aggregateByGST(transactions) {
    const aggregated = {};

    transactions.forEach(t => {
      const rate = t.gst_rate || 0;
      const key = `${rate}%`;
      if (!aggregated[key]) {
        aggregated[key] = { gst_rate: rate, taxable_amount: 0, total_gst: 0, count: 0 };
      }
      aggregated[key].taxable_amount += (t.total_amount - t.total_gst);
      aggregated[key].total_gst += t.total_gst || 0;
      aggregated[key].count += 1;
    });

    return Object.values(aggregated).sort((a, b) => a.gst_rate - b.gst_rate);
  }

  async _getDailySales(startDate, endDate) {
    try {
      const query = `
        SELECT 
          date,
          SUM(total_amount) as total
        FROM transactions
        WHERE voucher_type = 'sale' AND status = 'active'
          AND date >= ? AND date <= ?
        GROUP BY date
        ORDER BY date ASC
      `;
      return await this.db.prepare(query).all(startDate, endDate);
    } catch {
      return [];
    }
  }

  async _countProducts() {
    try {
      const result = await this.db.prepare(`SELECT COUNT(*) as count FROM products WHERE status = 'active' AND current_stock > 0`).get();
      return result?.count || 0;
    } catch {
      return 0;
    }
  }

  async _getFixedAssets() {
    try {
      return await this.db.prepare(`SELECT * FROM fixed_assets WHERE status = 'active'`).all();
    } catch {
      return [];
    }
  }

  async _getCapital() {
    try {
      const result = await this.db.prepare(`SELECT SUM(COALESCE(opening_balance, 0)) as total FROM business_info`).get();
      return result?.total || 0;
    } catch {
      return 0;
    }
  }

  _getDaysBetween(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  }

  _addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString().split('T')[0];
  }

  _groupExpensesByMonth(expenses) {
    const grouped = {};

    expenses.forEach(e => {
      const month = e.date.substring(0, 7);
      if (!grouped[month]) {
        grouped[month] = { total: 0, count: 0 };
      }
      grouped[month].total += e.amount || 0;
      grouped[month].count += 1;
    });

    return Object.entries(grouped)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }
}

export default ReportEngine;
