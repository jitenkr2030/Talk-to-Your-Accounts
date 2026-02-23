const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// File paths for data storage
const DATA_DIR = path.join(__dirname, '../../data');
const ANALYTICS_CACHE_FILE = path.join(DATA_DIR, 'analytics-cache.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize analytics cache file if it doesn't exist
if (!fs.existsSync(ANALYTICS_CACHE_FILE)) {
  fs.writeFileSync(ANALYTICS_CACHE_FILE, JSON.stringify({}, null, 2));
}

// Helper functions
const readCache = () => {
  try {
    const data = fs.readFileSync(ANALYTICS_CACHE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
};

const writeCache = (data) => {
  fs.writeFileSync(ANALYTICS_CACHE_FILE, JSON.stringify(data, null, 2));
};

// Statistical functions
const calculateMean = (arr) => {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
};

const calculateStdDev = (arr) => {
  if (!arr || arr.length === 0) return 0;
  const mean = calculateMean(arr);
  const squaredDiffs = arr.map(val => Math.pow(val - mean, 2));
  const variance = calculateMean(squaredDiffs);
  return Math.sqrt(variance);
};

const calculateZScore = (value, arr) => {
  const mean = calculateMean(arr);
  const stdDev = calculateStdDev(arr);
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
};

// Linear regression for trend prediction
const linearRegression = (dataPoints) => {
  if (dataPoints.length < 2) return { slope: 0, intercept: 0 };
  
  const n = dataPoints.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  dataPoints.forEach((point, index) => {
    sumX += index;
    sumY += point;
    sumXY += index * point;
    sumX2 += index * index;
  });
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope, intercept };
};

// Exponential Moving Average
const calculateEMA = (arr, period = 3) => {
  if (!arr || arr.length === 0) return [];
  
  const multiplier = 2 / (period + 1);
  let ema = [arr[0]];
  
  for (let i = 1; i < arr.length; i++) {
    ema.push((arr[i] - ema[i - 1]) * multiplier + ema[i - 1]);
  }
  
  return ema;
};

// Simple Moving Average
const calculateSMA = (arr, period) => {
  if (!arr || arr.length < period) return arr;
  
  const sma = [];
  for (let i = period - 1; i < arr.length; i++) {
    const sum = arr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  
  return sma;
};

class AnalyticsService {
  // Run full analysis
  async runFullAnalysis(transactions) {
    const cache = readCache();
    const now = new Date().toISOString();
    
    // Cash flow forecast
    const cashFlowForecast = this.generateCashFlowForecast(transactions);
    
    // Sales prediction
    const salesPrediction = this.predictSales(transactions);
    
    // Expense prediction
    const expensePrediction = this.predictExpenses(transactions);
    
    // Anomaly detection
    const anomalies = this.detectAnomalies(transactions);
    
    // Generate insights
    const insights = this.generateInsights(transactions, cashFlowForecast, anomalies);
    
    // Cache results
    const results = {
      cashFlow: cashFlowForecast,
      sales: salesPrediction,
      expenses: expensePrediction,
      anomalies,
      insights,
      generatedAt: now
    };
    
    cache.lastAnalysis = results;
    writeCache(cache);
    
    return results;
  }

  // Generate cash flow forecast
  generateCashFlowForecast(transactions) {
    // Aggregate transactions by date
    const dailyData = {};
    
    transactions.forEach(txn => {
      const date = txn.date || new Date().toISOString().split('T')[0];
      const amount = parseFloat(txn.total_amount) || 0;
      const type = txn.voucher_type || 'sale';
      
      if (!dailyData[date]) {
        dailyData[date] = { income: 0, expense: 0, net: 0 };
      }
      
      if (type === 'sale' || type === 'receipt') {
        dailyData[date].income += amount;
      } else {
        dailyData[date].expense += amount;
      }
      dailyData[date].net = dailyData[date].income - dailyData[date].expense;
    });
    
    // Convert to array and sort by date
    const sortedData = Object.entries(dailyData)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Get historical net cash flow values
    const netValues = sortedData.map(d => d.net);
    
    // Calculate trend using linear regression
    const trend = linearRegression(netValues);
    
    // Generate forecast for next 30 days
    const forecast = [];
    const lastDate = sortedData.length > 0 
      ? new Date(sortedData[sortedData.length - 1].date) 
      : new Date();
    const lastNet = sortedData.length > 0 ? sortedData[sortedData.length - 1].net : 0;
    
    // Use EMA for smoothing
    const emaValues = calculateEMA(netValues, 7);
    const avgNetChange = emaValues.length > 0 
      ? (emaValues[emaValues.length - 1] - emaValues[0]) / Math.max(emaValues.length, 1)
      : 0;
    
    let runningBalance = lastNet;
    
    for (let i = 1; i <= 30; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + i);
      
      // Project balance with some variance
      const projectedNet = lastNet + (avgNetChange * i);
      runningBalance += projectedNet / 30;
      
      // Calculate confidence based on data quality
      const confidence = Math.max(0.3, Math.min(0.95, 1 - (i * 0.02)));
      
      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        projectedBalance: runningBalance.toFixed(2),
        confidence: (confidence * 100).toFixed(0),
        type: 'forecast'
      });
    }
    
    // Combine historical and forecast data
    const historical = sortedData.map(d => ({
      date: d.date,
      actualBalance: d.net,
      income: d.income,
      expense: d.expense,
      type: 'historical'
    }));
    
    return {
      historical: historical.slice(-90), // Last 90 days
      forecast,
      summary: {
        currentBalance: lastNet.toFixed(2),
        projected30Day: runningBalance.toFixed(2),
        avgDailyIncome: (calculateMean(netValues.filter(v => v > 0)) || 0).toFixed(2),
        avgDailyExpense: (calculateMean(netValues.filter(v => v < 0).map(v => Math.abs(v))) || 0).toFixed(2)
      }
    };
  }

  // Predict sales
  predictSales(transactions) {
    // Filter sales transactions
    const sales = transactions
      .filter(t => (t.voucher_type === 'sale' || t.voucher_type === 'receipt') && !t.is_cancelled)
      .map(t => ({
        date: t.date,
        amount: parseFloat(t.total_amount) || 0
      }));
    
    // Aggregate by month
    const monthlySales = {};
    sales.forEach(s => {
      const month = s.date.substring(0, 7); // YYYY-MM
      if (!monthlySales[month]) {
        monthlySales[month] = 0;
      }
      monthlySales[month] += s.amount;
    });
    
    const sortedMonths = Object.entries(monthlySales)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]));
    
    const salesValues = sortedMonths.map(m => m[1]);
    
    // Calculate trend
    const trend = linearRegression(salesValues);
    
    // Calculate seasonality (average by day of month)
    const dayOfMonthAvg = {};
    sales.forEach(s => {
      const day = parseInt(s.date.split('-')[2]);
      if (!dayOfMonthAvg[day]) {
        dayOfMonthAvg[day] = [];
      }
      dayOfMonthAvg[day].push(s.amount);
    });
    
    const seasonality = {};
    Object.entries(dayOfMonthAvg).forEach(([day, amounts]) => {
      seasonality[day] = calculateMean(amounts);
    });
    
    // Generate prediction for next 3 months
    const predictions = [];
    const lastMonth = sortedMonths.length > 0 ? sortedMonths[sortedMonths.length - 1][0] : null;
    const lastValue = salesValues.length > 0 ? salesValues[salesValues.length - 1] : 0;
    
    for (let i = 1; i <= 3; i++) {
      const forecastDate = new Date();
      forecastDate.setMonth(forecastDate.getMonth() + i);
      const monthStr = forecastDate.toISOString().substring(0, 7);
      
      // Apply trend with some dampening
      const trendValue = trend.slope * (salesValues.length + i) + trend.intercept;
      const predictedValue = Math.max(0, lastValue + (trendValue - lastValue) * 0.5);
      
      const confidence = Math.max(0.5, 0.9 - (i * 0.1));
      
      predictions.push({
        month: monthStr,
        predictedSales: predictedValue.toFixed(2),
        confidence: (confidence * 100).toFixed(0),
        growthRate: salesValues.length > 1 
          ? ((predictedValue - lastValue) / lastValue * 100).toFixed(1)
          : 0
      });
    }
    
    return {
      historical: sortedMonths.map(([month, amount]) => ({ month, amount: amount.toFixed(2) })),
      predictions,
      summary: {
        totalSales: sales.reduce((sum, s) => sum + s.amount, 0).toFixed(2),
        avgMonthly: calculateMean(salesValues).toFixed(2),
        trend: trend.slope > 0 ? 'increasing' : trend.slope < 0 ? 'decreasing' : 'stable',
        trendPercentage: (Math.abs(trend.slope) / Math.max(calculateMean(salesValues), 1) * 100).toFixed(1)
      }
    };
  }

  // Predict expenses
  predictExpenses(transactions) {
    // Filter expense transactions
    const expenses = transactions
      .filter(t => (t.voucher_type === 'purchase' || t.voucher_type === 'payment') && !t.is_cancelled)
      .map(t => ({
        date: t.date,
        amount: parseFloat(t.total_amount) || 0,
        category: t.category || 'General'
      }));
    
    // Aggregate by category
    const categoryTotals = {};
    expenses.forEach(e => {
      if (!categoryTotals[e.category]) {
        categoryTotals[e.category] = [];
      }
      categoryTotals[e.category].push(e.amount);
    });
    
    // Predict each category
    const categoryPredictions = {};
    Object.entries(categoryTotals).forEach(([category, amounts]) => {
      const avg = calculateMean(amounts);
      const stdDev = calculateStdDev(amounts);
      
      // Detect if recurring (low variance)
      const isRecurring = stdDev / Math.max(avg, 1) < 0.3;
      
      // Predict next month
      const lastMonthExpenses = amounts.slice(-1)[0] || avg;
      const predicted = isRecurring ? avg : (avg + lastMonthExpenses) / 2;
      
      categoryPredictions[category] = {
        predicted: predicted.toFixed(2),
        average: avg.toFixed(2),
        isRecurring,
        variance: stdDev.toFixed(2)
      };
    });
    
    // Aggregate by month
    const monthlyExpenses = {};
    expenses.forEach(e => {
      const month = e.date.substring(0, 7);
      if (!monthlyExpenses[month]) {
        monthlyExpenses[month] = 0;
      }
      monthlyExpenses[month] += e.amount;
    });
    
    const sortedMonths = Object.entries(monthlyExpenses)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([month, amount]) => ({ month, amount }));
    
    // Calculate trend
    const expenseValues = sortedMonths.map(m => m.amount);
    const trend = linearRegression(expenseValues);
    
    return {
      historical: sortedMonths,
      byCategory: categoryPredictions,
      summary: {
        totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2),
        avgMonthly: calculateMean(expenseValues).toFixed(2),
        topCategories: Object.entries(categoryPredictions)
          .sort((a, b) => parseFloat(b[1].predicted) - parseFloat(a[1].predicted))
          .slice(0, 5)
          .map(([cat, data]) => ({ category: cat, predicted: data.predicted })),
        trend: trend.slope > 0 ? 'increasing' : trend.slope < 0 ? 'decreasing' : 'stable'
      }
    };
  }

  // Detect anomalies
  detectAnomalies(transactions) {
    const anomalies = [];
    const amounts = transactions
      .filter(t => !t.is_cancelled)
      .map(t => parseFloat(t.total_amount) || 0);
    
    if (amounts.length < 10) {
      return [];
    }
    
    const mean = calculateMean(amounts);
    const stdDev = calculateStdDev(amounts);
    const threshold = 2.5; // Z-score threshold
    
    // Check each transaction
    transactions.forEach(txn => {
      if (txn.is_cancelled) return;
      
      const amount = parseFloat(txn.total_amount) || 0;
      const zScore = Math.abs(calculateZScore(amount, amounts));
      
      if (zScore > threshold) {
        const severity = zScore > 4 ? 'high' : zScore > 3 ? 'medium' : 'low';
        
        anomalies.push({
          id: txn.id || uuidv4(),
          date: txn.date,
          amount: amount.toFixed(2),
          party: txn.party_name || 'Unknown',
          voucherType: txn.voucher_type,
          zScore: zScore.toFixed(2),
          severity,
          description: `Amount (₹${amount.toLocaleString()}) is ${zScore.toFixed(1)}x the average (₹${mean.toLocaleString()})`
        });
      }
    });
    
    // Also detect unusual patterns (e.g., weekend transactions)
    transactions.forEach(txn => {
      if (txn.is_cancelled) return;
      
      const date = new Date(txn.date);
      const dayOfWeek = date.getDay();
      
      // Weekend transactions might be unusual for some businesses
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        const amount = parseFloat(txn.total_amount) || 0;
        if (amount > mean * 2) {
          anomalies.push({
            id: txn.id || uuidv4(),
            date: txn.date,
            amount: amount.toFixed(2),
            party: txn.party_name || 'Unknown',
            voucherType: txn.voucher_type,
            zScore: 'N/A',
            severity: 'low',
            description: `Unusual ${dayOfWeek === 0 ? 'Sunday' : 'Saturday'} transaction`
          });
        }
      }
    });
    
    return anomalies.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  // Generate AI insights
  generateInsights(transactions, cashFlow, anomalies) {
    const insights = [];
    
    // Cash flow insight
    if (cashFlow.summary) {
      const projected = parseFloat(cashFlow.summary.projected30Day);
      const current = parseFloat(cashFlow.summary.currentBalance);
      
      if (projected < 0) {
        insights.push({
          type: 'warning',
          title: 'Cash Flow Alert',
          message: 'Your projected balance is negative for the next 30 days. Consider accelerating receivables.'
        });
      } else if (projected < current * 0.2) {
        insights.push({
          type: 'caution',
          title: 'Cash Flow Caution',
          message: 'Your cash buffer is projected to decrease significantly. Monitor expenses closely.'
        });
      } else {
        insights.push({
          type: 'positive',
          title: 'Healthy Cash Flow',
          message: 'Your cash flow looks healthy for the next 30 days.'
        });
      }
    }
    
    // Anomaly insights
    if (anomalies && anomalies.length > 0) {
      const highSeverity = anomalies.filter(a => a.severity === 'high');
      if (highSeverity.length > 0) {
        insights.push({
          type: 'warning',
          title: 'Unusual Transactions Detected',
          message: `${highSeverity.length} transaction(s) have amounts significantly higher than normal.`
        });
      }
    }
    
    // Expense insights
    const expenses = transactions.filter(t => 
      (t.voucher_type === 'purchase' || t.voucher_type === 'payment') && !t.is_cancelled
    );
    
    if (expenses.length > 0) {
      // Check for increasing expense trend
      const recentExpenses = expenses.slice(-10);
      const olderExpenses = expenses.slice(-20, -10);
      
      if (olderExpenses.length > 0) {
        const recentAvg = calculateMean(recentExpenses.map(e => parseFloat(e.total_amount) || 0));
        const olderAvg = calculateMean(olderExpenses.map(e => parseFloat(e.total_amount) || 0));
        
        if (recentAvg > olderAvg * 1.2) {
          insights.push({
            type: 'caution',
            title: 'Increasing Expenses',
            message: 'Your recent expenses are 20% higher than the previous period. Review for potential savings.'
          });
        }
      }
    }
    
    // Payment patterns
    const receivables = transactions.filter(t => 
      t.voucher_type === 'sale' && !t.is_cancelled
    );
    
    if (receivables.length > 5) {
      const unpaid = receivables.filter(t => !t.is_cancelled && parseFloat(t.total_amount) > 0);
      if (unpaid.length > receivables.length * 0.3) {
        insights.push({
          type: 'caution',
          title: 'High Receivables',
          message: 'Over 30% of your sales are unpaid. Consider following up on outstanding invoices.'
        });
      }
    }
    
    // Add general insights
    if (insights.length === 0) {
      insights.push({
        type: 'positive',
        title: 'Financial Health',
        message: 'Your financial data looks stable. No significant anomalies detected.'
      });
    }
    
    return insights;
  }

  // Get cached analysis
  getCachedAnalysis() {
    const cache = readCache();
    return cache.lastAnalysis || null;
  }

  // Clear cache
  clearCache() {
    writeCache({});
    return { success: true, message: 'Analytics cache cleared' };
  }
}

module.exports = new AnalyticsService();
