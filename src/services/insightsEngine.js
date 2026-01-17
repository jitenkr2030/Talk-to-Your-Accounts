/**
 * Insights Engine Service
 * AI-powered business insights, health scoring, and recommendations
 */

class InsightsEngine {
  constructor(database) {
    this.db = database;
    this.healthThresholds = {
      excellent: 80,
      good: 60,
      moderate: 40,
      poor: 0
    };
  }

  /**
   * Calculate comprehensive business health score
   * @param {string} period - Time period (week, month, quarter, year)
   * @param {string} asOfDate - Calculate as of specific date
   * @returns {Object} Health score with detailed breakdown
   */
  async calculateHealthScore(period = 'month', asOfDate = null) {
    const date = asOfDate || new Date();
    const startDate = this._getPeriodStart(period, date);

    try {
      // Calculate individual scores
      const [
        cashFlowScore,
        creditScore,
        expenseScore,
        complianceScore,
        growthScore,
        operationalScore
      ] = await Promise.all([
        this._calculateCashFlowScore(startDate, date),
        this._calculateCreditScore(startDate, date),
        this._calculateExpenseScore(startDate, date),
        this._calculateComplianceScore(startDate, date),
        this._calculateGrowthScore(startDate, date),
        this._calculateOperationalScore(startDate, date)
      ]);

      // Calculate overall score (weighted average)
      const weights = {
        cashFlow: 0.25,
        credit: 0.20,
        expense: 0.15,
        compliance: 0.15,
        growth: 0.15,
        operational: 0.10
      };

      const overallScore = Math.round(
        cashFlowScore * weights.cashFlow +
        creditScore * weights.credit +
        expenseScore * weights.expense +
        complianceScore * weights.compliance +
        growthScore * weights.growth +
        operationalScore * weights.operational
      );

      // Determine status
      let status;
      if (overallScore >= this.healthThresholds.excellent) {
        status = 'healthy';
      } else if (overallScore >= this.healthThresholds.good) {
        status = 'good';
      } else if (overallScore >= this.healthThresholds.moderate) {
        status = 'moderate';
      } else {
        status = 'unhealthy';
      }

      // Generate recommendations based on low scores
      const recommendations = await this._generateRecommendations({
        cashFlowScore,
        creditScore,
        expenseScore,
        complianceScore,
        growthScore,
        operationalScore,
        period,
        startDate,
        date
      });

      // Identify risks
      const risks = await this._identifyRisks({
        startDate,
        date,
        cashFlowScore,
        creditScore,
        expenseScore
      });

      // Identify opportunities
      const opportunities = await this._identifyOpportunities({
        startDate,
        date,
        growthScore,
        operationalScore
      });

      return {
        overall: overallScore,
        status,
        scores: {
          overall: overallScore,
          cash_flow: cashFlowScore,
          credit: creditScore,
          expenses: expenseScore,
          compliance: complianceScore,
          growth: growthScore,
          operational: operationalScore
        },
        weights,
        period: {
          type: period,
          startDate: startDate.toISOString().split('T')[0],
          endDate: date.toISOString().split('T')[0]
        },
        recommendations,
        risks,
        opportunities,
        trend: await this._calculateTrend(period, overallScore),
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error calculating health score:', error);
      throw new Error('Failed to calculate business health score');
    }
  }

  /**
   * Generate AI-powered business insights
   * @param {Object} params - Parameters for insight generation
   * @returns {Array} Array of insights
   */
  async generateInsights(params = {}) {
    const { startDate, endDate, includeTrends = true, includePredictions = true } = params;
    
    try {
      const insights = [];

      // Sales insights
      const salesInsights = await this._analyzeSalesInsights(startDate, endDate);
      insights.push(...salesInsights);

      // Cash flow insights
      const cashInsights = await this._analyzeCashFlowInsights(startDate, endDate);
      insights.push(...cashInsights);

      // Customer/Vendor insights
      const partyInsights = await this._analyzePartyInsights(startDate, endDate);
      insights.push(...partyInsights);

      // Inventory insights
      const inventoryInsights = await this._analyzeInventoryInsights();
      insights.push(...inventoryInsights);

      // Expense insights
      const expenseInsights = await this._analyzeExpenseInsights(startDate, endDate);
      insights.push(...expenseInsights);

      // Sort by importance/severity
      const sortedInsights = this._prioritizeInsights(insights);

      return {
        insights: sortedInsights,
        summary: {
          total: sortedInsights.length,
          critical: sortedInsights.filter(i => i.severity === 'critical').length,
          warning: sortedInsights.filter(i => i.severity === 'warning').length,
          info: sortedInsights.filter(i => i.severity === 'info').length,
          opportunity: sortedInsights.filter(i => i.type === 'opportunity').length
        },
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating insights:', error);
      throw new Error('Failed to generate business insights');
    }
  }

  /**
   * Generate and manage alerts
   * @param {Object} params - Alert parameters
   * @returns {Array} Active alerts
   */
  async checkAlerts(params = {}) {
    const alerts = [];
    const today = new Date();

    try {
      // Check for overdue payments (receivables)
      const overdueAlert = await this._checkOverduePayments();
      if (overdueAlert) alerts.push(overdueAlert);

      // Check for upcoming GST due dates
      const gstAlert = await this._checkGSTDues();
      if (gstAlert) alerts.push(gstAlert);

      // Check for low cash balance
      const cashAlert = await this._checkCashBalance();
      if (cashAlert) alerts.push(cashAlert);

      // Check for inventory alerts
      const inventoryAlerts = await this._checkInventoryLevels();
      alerts.push(...inventoryAlerts);

      // Check for unusual transactions
      const transactionAlerts = await this._checkUnusualTransactions();
      alerts.push(...transactionAlerts);

      // Check for compliance deadlines
      const complianceAlerts = await this._checkComplianceDeadlines();
      alerts.push(...complianceAlerts);

      // Check for payment due soon
      const paymentDueAlerts = await this._checkUpcomingPayments();
      alerts.push(...paymentDueAlerts);

      return {
        alerts: alerts.sort((a, b) => {
          const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        }),
        summary: {
          total: alerts.length,
          unread: alerts.filter(a => !a.is_read).length,
          bySeverity: {
            critical: alerts.filter(a => a.severity === 'critical').length,
            high: alerts.filter(a => a.severity === 'high').length,
            medium: alerts.filter(a => a.severity === 'medium').length,
            low: alerts.filter(a => a.severity === 'low').length
          }
        },
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error checking alerts:', error);
      throw new Error('Failed to check business alerts');
    }
  }

  /**
   * Generate financial predictions
   * @param {Object} params - Prediction parameters
   * @returns {Object} Predictions data
   */
  async generatePredictions(params = {}) {
    const { months = 3, includeSeasonality = true } = params;

    try {
      // Get historical data
      const historicalData = await this._getHistoricalData(12);
      
      // Generate predictions
      const salesPrediction = this._predictSales(historicalData.sales, months);
      const expensePrediction = this._predictExpenses(historicalData.expenses, months);
      const cashFlowPrediction = this._predictCashFlow(historicalData.cashFlow, months);

      // Calculate confidence scores
      const salesConfidence = this._calculatePredictionConfidence(historicalData.sales);
      const expenseConfidence = this._calculatePredictionConfidence(historicalData.expenses);

      return {
        period: months,
        predictions: {
          sales: salesPrediction,
          expenses: expensePrediction,
          cashFlow: cashFlowPrediction
        },
        confidence: {
          sales: salesConfidence,
          expenses: expenseConfidence,
          overall: (salesConfidence + expenseConfidence) / 2
        },
        assumptions: this._getPredictionAssumptions(includeSeasonality),
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating predictions:', error);
      throw new Error('Failed to generate financial predictions');
    }
  }

  // Private scoring methods

  async _calculateCashFlowScore(startDate, endDate) {
    try {
      // Get cash inflows and outflows
      const inflowsQuery = `
        SELECT COALESCE(SUM(paid_amount), 0) as total
        FROM transactions
        WHERE voucher_type = 'sale' AND status = 'active'
          AND date >= ? AND date <= ?
      `;
      const inflows = await this.db.prepare(inflowsQuery).get(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      const outflowsQuery = `
        SELECT COALESCE(SUM(paid_amount), 0) + COALESCE((SELECT SUM(amount) FROM expenses WHERE date >= ? AND date <= ?), 0) as total
        FROM transactions
        WHERE voucher_type = 'purchase' AND status = 'active'
          AND date >= ? AND date <= ?
      `;
      const outflows = await this.db.prepare(outflowsQuery).get(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      const inflowAmount = inflows?.total || 0;
      const outflowAmount = outflows?.total || 0;

      // Calculate cash flow ratio
      if (inflowAmount === 0 && outflowAmount === 0) return 50; // Neutral
      
      const ratio = inflowAmount > 0 ? inflowAmount / (outflowAmount || 1) : 0;
      
      // Score based on ratio
      if (ratio >= 1.2) return 100; // Excellent
      if (ratio >= 1.0) return 85;  // Good
      if (ratio >= 0.8) return 70;  // Fair
      if (ratio >= 0.6) return 50;  // Poor
      return 30; // Critical
    } catch (error) {
      console.error('Error calculating cash flow score:', error);
      return 50; // Default score
    }
  }

  async _calculateCreditScore(startDate, endDate) {
    try {
      // Get receivables and payables
      const receivablesQuery = `
        SELECT COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0) as total
        FROM transactions
        WHERE voucher_type = 'sale' AND status = 'active'
          AND payment_status != 'paid'
      `;
      const receivables = await this.db.prepare(receivablesQuery).get();

      const receivablesOverdueQuery = `
        SELECT COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0) as total
        FROM transactions
        WHERE voucher_type = 'sale' AND status = 'active'
          AND payment_status != 'paid'
          AND due_date < date('now')
      `;
      const overdueReceivables = await this.db.prepare(receivablesOverdueQuery).get();

      const totalReceivables = receivables?.total || 0;
      const overdueAmount = overdueReceivables?.total || 0;

      // Get sales for the period
      const salesQuery = `
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM transactions
        WHERE voucher_type = 'sale' AND status = 'active'
          AND date >= ? AND date <= ?
      `;
      const sales = await this.db.prepare(salesQuery).get(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      const totalSales = sales?.total || 1;

      // Calculate receivables to sales ratio
      const receivablesRatio = totalSales > 0 ? (totalReceivables / totalSales) * 100 : 0;
      
      // Calculate overdue ratio
      const overdueRatio = totalReceivables > 0 ? (overdueAmount / totalReceivables) * 100 : 0;

      // Score based on ratios
      let score = 100;
      
      // Deduct for high receivables
      if (receivablesRatio > 50) score -= 30;
      else if (receivablesRatio > 30) score -= 20;
      else if (receivablesRatio > 15) score -= 10;

      // Deduct for overdue
      if (overdueRatio > 30) score -= 40;
      else if (overdueRatio > 20) score -= 30;
      else if (overdueRatio > 10) score -= 15;

      return Math.max(0, Math.min(100, score));
    } catch (error) {
      console.error('Error calculating credit score:', error);
      return 50;
    }
  }

  async _calculateExpenseScore(startDate, endDate) {
    try {
      // Get total expenses
      const expensesQuery = `
        SELECT COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE date >= ? AND date <= ? AND status = 'active'
      `;
      const expenses = await this.db.prepare(expensesQuery).get(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      // Get sales for comparison
      const salesQuery = `
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM transactions
        WHERE voucher_type = 'sale' AND status = 'active'
          AND date >= ? AND date <= ?
      `;
      const sales = await this.db.prepare(salesQuery).get(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      const totalExpenses = expenses?.total || 0;
      const totalSales = sales?.total || 1;

      // Calculate expense ratio
      const expenseRatio = (totalExpenses / totalSales) * 100;

      // Score based on expense ratio
      if (expenseRatio <= 20) return 100; // Excellent
      if (expenseRatio <= 30) return 85;  // Good
      if (expenseRatio <= 40) return 70;  // Fair
      if (expenseRatio <= 50) return 50;  // Poor
      return 30; // Critical
    } catch (error) {
      console.error('Error calculating expense score:', error);
      return 50;
    }
  }

  async _calculateComplianceScore(startDate, endDate) {
    try {
      let score = 100;
      const deductions = [];

      // Check for missing GST on sales
      const missingGSTQuery = `
        SELECT COUNT(*) as count
        FROM transactions
        WHERE voucher_type = 'sale' AND status = 'active'
          AND date >= ? AND date <= ?
          AND (total_amount >= 10000 AND gst_rate = 0)
      `;
      const missingGST = await this.db.prepare(missingGSTQuery).get(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      if (missingGST?.count > 0) {
        deductions.push({ amount: missingGST.count * 2, reason: `${missingGST.count} sales over ₹10,000 without GST` });
      }

      // Check for missing GST numbers on B2B transactions
      const missingGSTNumQuery = `
        SELECT COUNT(*) as count
        FROM transactions t
        JOIN parties p ON t.party_id = p.id
        WHERE t.voucher_type = 'sale' AND t.status = 'active'
          AND t.date >= ? AND t.date <= ?
          AND t.total_amount >= 10000
          AND (p.gst_number IS NULL OR p.gst_number = '')
      `;
      const missingGSTNum = await this.db.prepare(missingGSTNumQuery).get(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      if (missingGSTNum?.count > 0) {
        deductions.push({ amount: missingGSTNum.count * 3, reason: `${missingGSTNum.count} B2B sales without party GST number` });
      }

      // Apply deductions
      deductions.forEach(d => {
        score -= d.amount;
      });

      return Math.max(0, Math.min(100, score));
    } catch (error) {
      console.error('Error calculating compliance score:', error);
      return 50;
    }
  }

  async _calculateGrowthScore(startDate, endDate) {
    try {
      // Current period sales
      const currentSalesQuery = `
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM transactions
        WHERE voucher_type = 'sale' AND status = 'active'
          AND date >= ? AND date <= ?
      `;
      const currentSales = await this.db.prepare(currentSalesQuery).get(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      // Previous period sales
      const periodDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - periodDays);
      
      const prevSales = await this.db.prepare(currentSalesQuery).get(
        prevStartDate.toISOString().split('T')[0],
        startDate.toISOString().split('T')[0]
      );

      const currentAmount = currentSales?.total || 0;
      const previousAmount = prevSales?.total || 1;

      // Calculate growth percentage
      const growth = ((currentAmount - previousAmount) / previousAmount) * 100;

      // Score based on growth
      if (growth >= 20) return 100; // Excellent growth
      if (growth >= 10) return 85;  // Good growth
      if (growth >= 0) return 70;   // Stable
      if (growth >= -10) return 50; // Minor decline
      if (growth >= -25) return 30; // Significant decline
      return 15; // Major decline
    } catch (error) {
      console.error('Error calculating growth score:', error);
      return 50;
    }
  }

  async _calculateOperationalScore(startDate, endDate) {
    try {
      // Check transaction frequency
      const transactionCountQuery = `
        SELECT COUNT(*) as count
        FROM transactions
        WHERE status = 'active'
          AND date >= ? AND date <= ?
      `;
      const transactionCount = await this.db.prepare(transactionCountQuery).get(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const avgTransactionsPerDay = (transactionCount?.count || 0) / days;

      // Check party engagement
      const activePartiesQuery = `
        SELECT COUNT(DISTINCT party_id) as count
        FROM transactions
        WHERE status = 'active'
          AND date >= ? AND date <= ?
      `;
      const activeParties = await this.db.prepare(activePartiesQuery).get(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      // Score based on activity
      if (avgTransactionsPerDay >= 5) return 100; // Very active
      if (avgTransactionsPerDay >= 2) return 85;  // Active
      if (avgTransactionsPerDay >= 1) return 70;  // Moderate
      if (avgTransactionsPerDay >= 0.5) return 50; // Low
      return 30; // Very low
    } catch (error) {
      console.error('Error calculating operational score:', error);
      return 50;
    }
  }

  // Helper methods for insights

  async _generateRecommendations(scores) {
    const recommendations = [];

    if (scores.cashFlowScore < 70) {
      recommendations.push({
        area: 'Cash Flow',
        priority: 'high',
        message: 'Consider improving collections or negotiating better payment terms with suppliers.',
        action: 'Review receivables aging and follow up on overdue payments.'
      });
    }

    if (scores.creditScore < 70) {
      recommendations.push({
        area: 'Credit Management',
        priority: 'high',
        message: 'High outstanding receivables are affecting your cash flow.',
        action: 'Implement stricter credit terms and follow up on overdue invoices.'
      });
    }

    if (scores.expenseScore < 70) {
      recommendations.push({
        area: 'Expenses',
        priority: 'medium',
        message: 'Operating expenses are high relative to sales.',
        action: 'Review and optimize recurring expenses, consider cost-cutting measures.'
      });
    }

    if (scores.complianceScore < 80) {
      recommendations.push({
        area: 'Compliance',
        priority: 'critical',
        message: 'Compliance issues detected that may attract penalties.',
        action: 'Ensure all applicable transactions have proper GST documentation.'
      });
    }

    if (scores.growthScore < 60) {
      recommendations.push({
        area: 'Growth',
        priority: 'medium',
        message: 'Sales growth is below target.',
        action: 'Consider promotional activities, new customer acquisition, or product expansion.'
      });
    }

    if (scores.operationalScore < 60) {
      recommendations.push({
        area: 'Operations',
        priority: 'low',
        message: 'Transaction frequency is low.',
        action: 'Focus on increasing sales frequency and customer engagement.'
      });
    }

    return recommendations;
  }

  async _identifyRisks(params) {
    const risks = [];

    // Check for cash crunch risk
    if (params.cashFlowScore < 50) {
      risks.push({
        type: 'cash_crunch',
        severity: 'high',
        title: 'Cash Flow Risk',
        description: 'Low cash flow indicator suggests potential difficulty in meeting short-term obligations.',
        mitigation: 'Accelerate collections, negotiate extended credit with suppliers.'
      });
    }

    // Check for credit risk
    if (params.creditScore < 50) {
      risks.push({
        type: 'credit_risk',
        severity: 'high',
        title: 'Credit Risk',
        description: 'High percentage of overdue receivables increases bad debt risk.',
        mitigation: 'Review credit policy, consider credit insurance, tighten terms.'
      });
    }

    // Check for expense risk
    if (params.expenseScore < 50) {
      risks.push({
        type: 'expense_risk',
        severity: 'medium',
        title: 'Expense Risk',
        description: 'Expenses are growing faster than revenue.',
        mitigation: 'Conduct expense audit, identify cost-saving opportunities.'
      });
    }

    return risks;
  }

  async _identifyOpportunities(params) {
    const opportunities = [];

    // Growth opportunity
    if (params.growthScore > 70 && params.operationalScore > 60) {
      opportunities.push({
        type: 'growth',
        title: 'Expansion Opportunity',
        description: 'Strong growth and operational metrics suggest readiness for expansion.',
        recommendation: 'Consider expanding product line or entering new markets.'
      });
    }

    // Efficiency opportunity
    if (params.operationalScore > 80) {
      opportunities.push({
        type: 'efficiency',
        title: 'Process Optimization',
        description: 'High operational efficiency creates capacity for more volume.',
        recommendation: 'Automate manual processes, consider scaling operations.'
      });
    }

    return opportunities;
  }

  async _calculateTrend(period, currentScore) {
    try {
      // Compare with previous period
      const prevPeriod = this._getPreviousPeriod(period);
      const prevScore = await this.calculateHealthScore(prevPeriod);

      if (currentScore > prevScore.overall + 5) {
        return 'improving';
      } else if (currentScore < prevScore.overall - 5) {
        return 'declining';
      }
      return 'stable';
    } catch {
      return 'unknown';
    }
  }

  async _analyzeSalesInsights(startDate, endDate) {
    const insights = [];

    try {
      // Get sales data
      const salesQuery = `
        SELECT 
          date,
          SUM(total_amount) as daily_total
        FROM transactions
        WHERE voucher_type = 'sale' AND status = 'active'
          AND date >= ? AND date <= ?
        GROUP BY date
        ORDER BY date
      `;
      const sales = await this.db.prepare(salesQuery).all(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      if (sales.length < 2) return insights;

      // Analyze trends
      const totals = sales.map(s => s.daily_total);
      const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
      const lastWeek = totals.slice(-7);
      const prevWeek = totals.slice(-14, -7);

      const lastAvg = lastWeek.reduce((a, b) => a + b, 0) / (lastWeek.length || 1);
      const prevAvg = prevWeek.reduce((a, b) => a + b, 0) / (prevWeek.length || 1);

      if (lastAvg > prevAvg * 1.2) {
        insights.push({
          type: 'trend',
          category: 'sales',
          severity: 'info',
          title: 'Sales Trending Up',
          message: `Sales this week are ${((lastAvg / prevAvg - 1) * 100).toFixed(1)}% higher than last week.`,
          metric: 'sales_trend',
          value: ((lastAvg / prevAvg - 1) * 100).toFixed(1)
        });
      } else if (lastAvg < prevAvg * 0.8) {
        insights.push({
          type: 'trend',
          category: 'sales',
          severity: 'warning',
          title: 'Sales Declining',
          message: `Sales this week are ${((1 - lastAvg / prevAvg) * 100).toFixed(1)}% lower than last week.`,
          metric: 'sales_trend',
          value: ((lastAvg / prevAvg - 1) * 100).toFixed(1)
        });
      }

      // Identify slow days
      const dayOfWeekSales = {};
      sales.forEach(s => {
        const day = new Date(s.date).getDay();
        if (!dayOfWeekSales[day]) dayOfWeekSales[day] = [];
        dayOfWeekSales[day].push(s.daily_total);
      });

      const slowDays = Object.entries(dayOfWeekSales)
        .filter(([_, values]) => values.length >= 2)
        .map(([day, values]) => ({
          day: parseInt(day),
          avg: values.reduce((a, b) => a + b, 0) / values.length
        }))
        .sort((a, b) => a.avg - b.avg);

      if (slowDays.length > 0 && slowDays[0].avg < avg * 0.5) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        insights.push({
          type: 'pattern',
          category: 'sales',
          severity: 'info',
          title: 'Slow Sales Day Detected',
          message: `${dayNames[slowDays[0].day]}s have the lowest average sales. Consider promotions on this day.`,
          metric: 'slowest_day',
          value: dayNames[slowDays[0].day]
        });
      }
    } catch (error) {
      console.error('Error analyzing sales insights:', error);
    }

    return insights;
  }

  async _analyzeCashFlowInsights(startDate, endDate) {
    const insights = [];

    try {
      // Get cash flow data
      const inflowQuery = `
        SELECT COALESCE(SUM(paid_amount), 0) as total
        FROM transactions
        WHERE voucher_type = 'sale' AND status = 'active'
          AND date >= ? AND date <= ?
      `;
      const inflow = await this.db.prepare(inflowQuery).get(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      const outflowQuery = `
        SELECT COALESCE(SUM(paid_amount), 0) as total
        FROM transactions
        WHERE voucher_type = 'purchase' AND status = 'active'
          AND date >= ? AND date <= ?
      `;
      const outflow = await this.db.prepare(outflowQuery).get(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      const expenseQuery = `
        SELECT COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE date >= ? AND date <= ? AND status = 'active'
      `;
      const expenses = await this.db.prepare(expenseQuery).get(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      const totalInflow = inflow?.total || 0;
      const totalOutflow = (outflow?.total || 0) + (expenses?.total || 0);
      const ratio = totalInflow / (totalOutflow || 1);

      if (ratio < 0.8) {
        insights.push({
          type: 'alert',
          category: 'cashflow',
          severity: 'warning',
          title: 'Negative Cash Flow',
          message: `Cash outflows exceed inflows by ${((1 - ratio) * 100).toFixed(1)}%. Immediate attention required.`,
          metric: 'cash_flow_ratio',
          value: ratio.toFixed(2)
        });
      } else if (ratio > 1.2) {
        insights.push({
          type: 'opportunity',
          category: 'cashflow',
          severity: 'info',
          title: 'Strong Cash Position',
          message: `Cash inflows exceed outflows by ${((ratio - 1) * 100).toFixed(1)}%. Consider investment opportunities.`,
          metric: 'cash_flow_ratio',
          value: ratio.toFixed(2)
        });
      }
    } catch (error) {
      console.error('Error analyzing cash flow insights:', error);
    }

    return insights;
  }

  async _analyzePartyInsights(startDate, endDate) {
    const insights = [];

    try {
      // Get top customers
      const topCustomersQuery = `
        SELECT p.name, SUM(t.total_amount) as total
        FROM transactions t
        JOIN parties p ON t.party_id = p.id
        WHERE t.voucher_type = 'sale' AND t.status = 'active'
          AND t.date >= ? AND t.date <= ?
        GROUP BY p.id
        ORDER BY total DESC
        LIMIT 5
      `;
      const topCustomers = await this.db.prepare(topCustomersQuery).all(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      if (topCustomers.length > 0) {
        const totalSalesQuery = `
          SELECT COALESCE(SUM(total_amount), 0) as total
          FROM transactions
          WHERE voucher_type = 'sale' AND status = 'active'
            AND date >= ? AND date <= ?
        `;
        const totalSales = await this.db.prepare(totalSalesQuery).get(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );

        const topCustomerPercent = totalSales?.total > 0 
          ? (topCustomers[0].total / totalSales.total) * 100 
          : 0;

        if (topCustomerPercent > 50) {
          insights.push({
            type: 'risk',
            category: 'customers',
            severity: 'warning',
            title: 'Customer Concentration Risk',
            message: `${topCustomers[0].name} accounts for ${topCustomerPercent.toFixed(1)}% of sales. Consider diversifying customer base.`,
            metric: 'top_customer_percentage',
            value: topCustomerPercent.toFixed(1)
          });
        }
      }
    } catch (error) {
      console.error('Error analyzing party insights:', error);
    }

    return insights;
  }

  async _analyzeInventoryInsights() {
    const insights = [];

    try {
      // Get low stock items
      const lowStockQuery = `
        SELECT name, current_stock, minimum_stock
        FROM products
        WHERE status = 'active' AND current_stock <= COALESCE(minimum_stock, 10)
        ORDER BY current_stock ASC
        LIMIT 5
      `;
      const lowStock = await this.db.prepare(lowStockQuery).all();

      if (lowStock.length > 0) {
        insights.push({
          type: 'alert',
          category: 'inventory',
          severity: lowStock.length > 3 ? 'warning' : 'info',
          title: 'Low Stock Alert',
          message: `${lowStock.length} product(s) are running low on stock.`,
          items: lowStock,
          metric: 'low_stock_count',
          value: lowStock.length
        });
      }

      // Get slow moving items
      const slowMovingQuery = `
        SELECT name, current_stock, last_sold_date
        FROM products
        WHERE status = 'active' AND current_stock > 0
          AND (last_sold_date IS NULL OR last_sold_date < date('now', '-60 days'))
        ORDER BY last_sold_date ASC
        LIMIT 5
      `;
      const slowMoving = await this.db.prepare(slowMovingQuery).all();

      if (slowMoving.length > 0) {
        insights.push({
          type: 'insight',
          category: 'inventory',
          severity: 'info',
          title: 'Slow Moving Inventory',
          message: `${slowMoving.length} product(s) haven't been sold in over 60 days.`,
          items: slowMoving,
          metric: 'slow_moving_count',
          value: slowMoving.length
        });
      }
    } catch (error) {
      console.error('Error analyzing inventory insights:', error);
    }

    return insights;
  }

  async _analyzeExpenseInsights(startDate, endDate) {
    const insights = [];

    try {
      // Get expense by category
      const expenseQuery = `
        SELECT category, SUM(amount) as total
        FROM expenses
        WHERE date >= ? AND date <= ? AND status = 'active'
        GROUP BY category
        ORDER BY total DESC
      `;
      const expenses = await this.db.prepare(expenseQuery).all(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      if (expenses.length > 0) {
        const totalExpenses = expenses.reduce((sum, e) => sum + e.total, 0);
        const topCategory = expenses[0];
        const topPercent = (topCategory.total / totalExpenses) * 100;

        if (topPercent > 40) {
          insights.push({
            type: 'insight',
            category: 'expenses',
            severity: 'info',
            title: 'High Expense Concentration',
            message: `${topCategory.category} accounts for ${topPercent.toFixed(1)}% of total expenses. Review for potential savings.`,
            metric: 'top_expense_category',
            value: topCategory.category,
            amount: topCategory.total
          });
        }
      }
    } catch (error) {
      console.error('Error analyzing expense insights:', error);
    }

    return insights;
  }

  _prioritizeInsights(insights) {
    return insights.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  // Alert checking methods

  async _checkOverduePayments() {
    try {
      const query = `
        SELECT COUNT(*) as count, SUM(total_amount - COALESCE(paid_amount, 0)) as total
        FROM transactions
        WHERE voucher_type = 'sale' AND status = 'active'
          AND payment_status != 'paid'
          AND due_date < date('now')
      `;
      const result = await this.db.prepare(query).get();

      if (result?.count > 0 && result?.total > 0) {
        return {
          id: `overdue_${Date.now()}`,
          type: 'payment',
          category: 'receivables',
          title: 'Overdue Payments',
          message: `${result.count} invoices worth ₹${(result.total || 0).toLocaleString()} are overdue.`,
          severity: result.count > 10 ? 'high' : 'medium',
          data: { count: result.count, amount: result.total },
          action_required: 'Follow up on overdue invoices',
          created_at: new Date().toISOString(),
          is_read: false
        };
      }
    } catch (error) {
      console.error('Error checking overdue payments:', error);
    }
    return null;
  }

  async _checkGSTDues() {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    // Check if we're in the last week of the month
    const daysRemaining = Math.ceil((lastDay - today) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining <= 7) {
      return {
        id: `gst_due_${Date.now()}`,
        type: 'compliance',
        category: 'gst',
        title: 'GST Filing Due Soon',
        message: `GST filing is due in ${daysRemaining} days. Ensure all invoices are recorded.`,
        severity: daysRemaining <= 3 ? 'high' : 'medium',
        data: { due_date: lastDay.toISOString().split('T')[0], days_remaining: daysRemaining },
        action_required: 'Prepare and file GST returns',
        created_at: new Date().toISOString(),
        is_read: false
      };
    }
    return null;
  }

  async _checkCashBalance() {
    try {
      const cashQuery = `SELECT COALESCE(SUM(balance), 0) as total FROM cash_accounts WHERE type = 'cash' AND status = 'active'`;
      const cash = await this.db.prepare(cashQuery).get();

      if ((cash?.total || 0) < 10000) {
        return {
          id: `cash_low_${Date.now()}`,
          type: 'cashflow',
          category: 'cash',
          title: 'Low Cash Balance',
          message: `Cash balance is below ₹10,000. Consider depositing funds or accelerating collections.`,
          severity: 'medium',
          data: { current_balance: cash?.total || 0 },
          action_required: 'Review cash position and collections',
          created_at: new Date().toISOString(),
          is_read: false
        };
      }
    } catch (error) {
      console.error('Error checking cash balance:', error);
    }
    return null;
  }

  async _checkInventoryLevels() {
    const alerts = [];
    
    try {
      const query = `
        SELECT id, name, current_stock, minimum_stock
        FROM products
        WHERE status = 'active' AND current_stock <= COALESCE(minimum_stock, 5)
      `;
      const lowStock = await this.db.prepare(query).all();

      lowStock.forEach(product => {
        alerts.push({
          id: `inventory_${product.id}_${Date.now()}`,
          type: 'inventory',
          category: 'stock',
          title: 'Low Stock Alert',
          message: `${product.name} is running low (${product.current_stock} units remaining).`,
          severity: product.current_stock === 0 ? 'high' : 'medium',
          data: { product_id: product.id, current_stock: product.current_stock, minimum_stock: product.minimum_stock },
          action_required: 'Reorder inventory',
          created_at: new Date().toISOString(),
          is_read: false
        });
      });
    } catch (error) {
      console.error('Error checking inventory levels:', error);
    }

    return alerts;
  }

  async _checkUnusualTransactions() {
    const alerts = [];
    
    try {
      const query = `
        SELECT id, voucher_number, total_amount, date
        FROM transactions
        WHERE status = 'active'
          AND date >= date('now', '-7 days')
          AND total_amount > (
            SELECT COALESCE(AVG(total_amount) * 3, 100000)
            FROM transactions
            WHERE status = 'active' AND voucher_type = 'sale'
          )
      `;
      const largeTransactions = await this.db.prepare(query).all();

      largeTransactions.forEach(t => {
        alerts.push({
          id: `large_txn_${t.id}_${Date.now()}`,
          type: 'transaction',
          category: 'audit',
          title: 'Unusually Large Transaction',
          message: `Transaction ${t.voucher_number} of ₹${(t.total_amount || 0).toLocaleString()} on ${t.date} is significantly above average.`,
          severity: 'low',
          data: { transaction_id: t.id, amount: t.total_amount, date: t.date },
          action_required: 'Verify transaction details',
          created_at: new Date().toISOString(),
          is_read: false
        });
      });
    } catch (error) {
      console.error('Error checking unusual transactions:', error);
    }

    return alerts;
  }

  async _checkComplianceDeadlines() {
    const alerts = [];
    const today = new Date();

    // Check for GST anniversary (monthly)
    if (today.getDate() >= 20) {
      alerts.push({
        id: `gst_filing_${Date.now()}`,
        type: 'compliance',
        category: 'gst',
        title: 'Monthly GST Filing',
        message: 'Ensure all GST-inclusive transactions for this month are recorded before filing.',
        severity: 'medium',
        data: { type: 'monthly_gst' },
        action_required: 'Review and record all GST transactions',
        created_at: new Date().toISOString(),
        is_read: false
      });
    }

    return alerts;
  }

  async _checkUpcomingPayments() {
    try {
      const query = `
        SELECT id, voucher_number, party_name, (total_amount - COALESCE(paid_amount, 0)) as due_amount, due_date
        FROM transactions
        WHERE voucher_type = 'purchase' AND status = 'active'
          AND payment_status != 'paid'
          AND due_date BETWEEN date('now') AND date('now', '+7 days')
        ORDER BY due_date ASC
      `;
      const upcoming = await this.db.prepare(query).all();

      if (upcoming.length > 0) {
        const totalDue = upcoming.reduce((sum, p) => sum + (p.due_amount || 0), 0);
        return {
          id: `upcoming_payments_${Date.now()}`,
          type: 'payment',
          category: 'payables',
          title: 'Payments Due This Week',
          message: `${upcoming.length} payments worth ₹${totalDue.toLocaleString()} are due in the next 7 days.`,
          severity: 'medium',
          data: { count: upcoming.length, total_amount: totalDue, payments: upcoming },
          action_required: 'Arrange funds for upcoming payments',
          created_at: new Date().toISOString(),
          is_read: false
        };
      }
    } catch (error) {
      console.error('Error checking upcoming payments:', error);
    }
    return null;
  }

  // Prediction methods

  async _getHistoricalData(months) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const salesQuery = `
        SELECT date, SUM(total_amount) as total
        FROM transactions
        WHERE voucher_type = 'sale' AND status = 'active'
          AND date >= ? AND date <= ?
        GROUP BY date
        ORDER BY date
      `;
      const sales = await this.db.prepare(salesQuery).all(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      const expenseQuery = `
        SELECT date, SUM(amount) as total
        FROM expenses
        WHERE date >= ? AND date <= ? AND status = 'active'
        GROUP BY date
        ORDER BY date
      `;
      const expenses = await this.db.prepare(expenseQuery).all(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      return { sales, expenses, cashFlow: sales }; // Simplified cash flow
    } catch (error) {
      console.error('Error getting historical data:', error);
      return { sales: [], expenses: [], cashFlow: [] };
    }
  }

  _predictSales(historicalData, months) {
    if (historicalData.length < 7) {
      return { prediction: null, message: 'Insufficient data for prediction' };
    }

    const totals = historicalData.map(d => d.total);
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
    const trend = this._calculateLinearTrend(totals);

    const predictions = [];
    const lastDate = new Date(historicalData[historicalData.length - 1].date);

    for (let i = 1; i <= months; i++) {
      const nextDate = new Date(lastDate);
      nextDate.setMonth(nextDate.getMonth() + i);
      const predictedValue = avg + (trend * i);
      
      predictions.push({
        month: nextDate.toISOString().split('T')[0].substring(0, 7),
        predicted_sales: Math.max(0, predictedValue),
        confidence: this._decreaseConfidence(i)
      });
    }

    return {
      predictions,
      average: avg,
      trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable'
    };
  }

  _predictExpenses(historicalData, months) {
    if (historicalData.length < 7) {
      return { prediction: null, message: 'Insufficient data for prediction' };
    }

    const totals = historicalData.map(d => d.total);
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
    const trend = this._calculateLinearTrend(totals);

    const predictions = [];
    const lastDate = new Date(historicalData[historicalData.length - 1].date);

    for (let i = 1; i <= months; i++) {
      const nextDate = new Date(lastDate);
      nextDate.setMonth(nextDate.getMonth() + i);
      const predictedValue = avg + (trend * i);
      
      predictions.push({
        month: nextDate.toISOString().split('T')[0].substring(0, 7),
        predicted_expenses: Math.max(0, predictedValue),
        confidence: this._decreaseConfidence(i)
      });
    }

    return {
      predictions,
      average: avg,
      trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable'
    };
  }

  _predictCashFlow(historicalData, months) {
    // Simplified cash flow prediction
    const salesPrediction = this._predictSales(historicalData, months);
    
    return {
      predictions: salesPrediction.predictions?.map(p => ({
        month: p.month,
        predicted_cash_inflow: p.predicted_sales,
        predicted_cash_outflow: p.predicted_sales * 0.8, // Simplified assumption
        net_cash_flow: p.predicted_sales * 0.2
      })) || []
    };
  }

  _calculateLinearTrend(data) {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += data[i];
      sumXY += i * data[i];
      sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  _decreaseConfidence(monthIndex) {
    // Confidence decreases with prediction horizon
    const baseConfidence = 0.95;
    return Math.max(0.5, baseConfidence - (monthIndex * 0.05));
  }

  _calculatePredictionConfidence(data) {
    if (data.length < 7) return 0.5;
    
    // Calculate coefficient of variation
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / (mean || 1);
    
    // Lower CV = higher confidence
    return Math.max(0.5, Math.min(0.95, 1 - cv));
  }

  _getPredictionAssumptions(includeSeasonality) {
    return {
      historical_patterns: 'Based on last 12 months of data',
      seasonality: includeSeasonality ? 'Seasonal variations are considered' : 'Seasonality is not considered',
      methodology: 'Linear regression with confidence intervals',
      limitations: 'Predictions assume historical trends continue'
    };
  }

  // Utility methods

  _getPeriodStart(period, date) {
    const start = new Date(date);
    
    switch (period) {
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start.setMonth(start.getMonth() - 1);
    }
    
    return start;
  }

  _getPreviousPeriod(period) {
    switch (period) {
      case 'week': return 'week';
      case 'month': return 'month';
      case 'quarter': return 'quarter';
      case 'year': return 'year';
      default: return 'month';
    }
  }
}

export default InsightsEngine;
