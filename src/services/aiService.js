/**
 * AI Service
 * Provides AI-powered features including predictive analytics, smart categorization, and anomaly detection
 */

import { db } from '../electron/database';

// Keyword to category mapping for auto-categorization
const categoryKeywords = {
  'Office Supplies': ['amazon', 'staples', 'office depot', 'flipkart', 'udemy', 'google'],
  'Travel': ['uber', 'ola', 'lyft', 'airline', 'flight', 'hotel', 'airbnb', 'booking'],
  'Meals & Entertainment': ['restaurant', 'food', 'zomato', 'swiggy', 'starbucks', 'coffee', 'cafe', 'diner'],
  'Utilities': ['electricity', 'water', 'gas', 'internet', 'broadband', 'mobile', 'phone', 'airtel', 'jio'],
  'Rent': ['rent', 'lease', 'property'],
  'Software': ['subscription', 'saas', 'software', 'license', 'microsoft', 'adobe', 'slack'],
  'Professional Services': ['consulting', 'legal', 'accounting', 'audit', 'professional'],
  'Marketing': ['advertising', 'facebook', 'google ads', 'marketing', 'promotion'],
  'Transportation': ['fuel', 'petrol', 'diesel', 'toll', 'parking', 'metro', 'train', 'bus'],
  'Insurance': ['insurance', 'policy', 'premium', 'lic', 'hdfc life', 'bajaj'],
  'Taxes': ['tax', 'gst', 'tds', 'income tax', 'professional tax'],
  'Equipment': ['hardware', 'laptop', 'computer', 'printer', 'scanner', 'machine'],
  'Repairs & Maintenance': ['repair', 'maintenance', 'service', 'AMC'],
  'Interest': ['interest', 'loan', 'emi', 'bank charge'],
  'Commission': ['commission', 'brokerage', 'platform fee'],
  'Rent': ['rent', 'lease', 'property']
};

// Calculate simple linear regression for forecasting
const calculateLinearRegression = (dataPoints) => {
  if (dataPoints.length < 2) return { slope: 0, intercept: 0 };

  const n = dataPoints.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  dataPoints.forEach((point, index) => {
    sumX += index;
    sumY += point.value;
    sumXY += index * point.value;
    sumX2 += index * index;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
};

// Calculate standard deviation
const calculateStandardDeviation = (values) => {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(variance);
};

// Get cash flow forecast
export const getCashFlowForecast = async (days = 30) => {
  try {
    const transactions = await db.getTransactions({});
    
    // Group transactions by date
    const dailyBalances = {};
    let runningBalance = 0;
    
    // Sort transactions by date
    const sortedTransactions = [...transactions].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    // Calculate daily balances
    sortedTransactions.forEach(tx => {
      const date = tx.date.split('T')[0];
      const amount = tx.voucher_type === 'sale' ? tx.total_amount : -tx.total_amount;
      runningBalance += amount;
      dailyBalances[date] = runningBalance;
    });
    
    // Convert to array for regression
    const dataPoints = Object.entries(dailyBalances).map(([date, balance]) => ({
      date,
      value: balance
    }));
    
    // Get last 90 days for regression
    const recentData = dataPoints.slice(-90);
    const { slope, intercept } = calculateLinearRegression(recentData);
    
    // Generate forecast
    const forecast = [];
    const lastDate = new Date(dataPoints[dataPoints.length - 1]?.date || new Date());
    const lastBalance = dataPoints[dataPoints.length - 1]?.value || 0;
    
    for (let i = 1; i <= days; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + i);
      
      const predictedBalance = lastBalance + (slope * i);
      const confidenceInterval = Math.abs(slope) * i * 0.5; // Wider intervals further out
      
      forecast.push({
        date: forecastDate.toISOString().split('T')[0],
        predictedBalance: Math.round(predictedBalance),
        confidenceLow: Math.round(predictedBalance - confidenceInterval),
        confidenceHigh: Math.round(predictedBalance + confidenceInterval),
        confidence: Math.max(50, 95 - i) // Confidence decreases over time
      });
    }
    
    return {
      historical: dataPoints.slice(-30),
      forecast,
      trend: slope > 0 ? 'positive' : slope < 0 ? 'negative' : 'stable',
      averageDailyChange: Math.round(slope)
    };
  } catch (error) {
    console.error('Error getting cash flow forecast:', error);
    throw error;
  }
};

// Get sales prediction
export const getSalesPrediction = async () => {
  try {
    const transactions = await db.getTransactions({ voucher_type: 'sale' });
    
    // Group by month
    const monthlySales = {};
    transactions.forEach(tx => {
      const month = tx.date.substring(0, 7); // YYYY-MM
      monthlySales[month] = (monthlySales[month] || 0) + tx.total_amount;
    });
    
    const salesData = Object.entries(monthlySales)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    // Simple prediction based on trend
    const recentMonths = salesData.slice(-3);
    const avgRecent = recentMonths.reduce((a, b) => a + b.total, 0) / recentMonths.length;
    const growthRate = recentMonths.length > 1 
      ? (recentMonths[recentMonths.length - 1].total - recentMonths[0].total) / recentMonths[0].total 
      : 0;
    
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    return {
      predictedAmount: Math.round(avgRecent * (1 + growthRate)),
      growthRate: Math.round(growthRate * 100),
      trend: growthRate > 0.1 ? 'increasing' : growthRate < -0.1 ? 'decreasing' : 'stable',
      historicalMonthly: salesData.slice(-6),
      confidence: 70
    };
  } catch (error) {
    console.error('Error getting sales prediction:', error);
    throw error;
  }
};

// Get expense prediction
export const getExpensePrediction = async () => {
  try {
    const transactions = await db.getTransactions({ voucher_type: 'purchase' });
    
    // Identify recurring expenses
    const expensesByCategory = {};
    transactions.forEach(tx => {
      const category = tx.category || 'Uncategorized';
      expensesByCategory[category] = (expensesByCategory[category] || 0) + tx.total_amount;
    });
    
    // Group by month
    const monthlyExpenses = {};
    transactions.forEach(tx => {
      const month = tx.date.substring(0, 7);
      monthlyExpenses[month] = (monthlyExpenses[month] || 0) + tx.total_amount;
    });
    
    const expenseData = Object.entries(monthlyExpenses)
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    const recentMonths = expenseData.slice(-3);
    const avgRecent = recentMonths.reduce((a, b) => a + b.total, 0) / recentMonths.length;
    
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    return {
      predictedAmount: Math.round(avgRecent),
      topCategories: Object.entries(expensesByCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, total]) => ({ category, total })),
      trend: 'stable',
      historicalMonthly: expenseData.slice(-6)
    };
  } catch (error) {
    console.error('Error getting expense prediction:', error);
    throw error;
  }
};

// Get working capital analysis
export const getWorkingCapitalAnalysis = async () => {
  try {
    const transactions = await db.getTransactions({});
    
    // Calculate current assets (receivables from sales)
    const receivables = transactions
      .filter(tx => tx.voucher_type === 'sale' && tx.payment_status !== 'paid')
      .reduce((sum, tx) => sum + (tx.total_amount - (tx.paid_amount || 0)), 0);
    
    // Calculate current liabilities (payables from purchases)
    const payables = transactions
      .filter(tx => tx.voucher_type === 'purchase' && tx.payment_status !== 'paid')
      .reduce((sum, tx) => sum + (tx.total_amount - (tx.paid_amount || 0)), 0);
    
    // Assume cash is available balance (simplified)
    const cash = transactions.reduce((sum, tx) => {
      return sum + (tx.voucher_type === 'sale' ? tx.total_amount : -tx.total_amount);
    }, 0);
    
    const currentAssets = cash + receivables;
    const currentLiabilities = payables;
    const workingCapital = currentAssets - currentLiabilities;
    const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
    const quickRatio = currentAssets > 0 ? (cash / currentAssets) : 0;
    
    return {
      currentAssets: Math.round(currentAssets),
      currentLiabilities: Math.round(currentLiabilities),
      workingCapital: Math.round(workingCapital),
      receivables: Math.round(receivables),
      payables: Math.round(payables),
      currentRatio: Math.round(currentRatio * 100) / 100,
      quickRatio: Math.round(quickRatio * 100) / 100,
      health: workingCapital > 0 && currentRatio > 1.5 ? 'good' : 
              workingCapital > 0 ? 'moderate' : 'poor',
      recommendations: generateWorkingCapitalRecommendations(workingCapital, currentRatio, receivables, payables)
    };
  } catch (error) {
    console.error('Error getting working capital analysis:', error);
    throw error;
  }
};

// Generate working capital recommendations
const generateWorkingCapitalRecommendations = (workingCapital, currentRatio, receivables, payables) => {
  const recommendations = [];
  
  if (workingCapital < 0) {
    recommendations.push({
      type: 'warning',
      message: 'Negative working capital - consider improving collections or reducing payables'
    });
  }
  
  if (currentRatio < 1) {
    recommendations.push({
      type: 'warning',
      message: 'Current ratio below 1 - may have difficulty meeting short-term obligations'
    });
  }
  
  if (receivables > payables * 2) {
    recommendations.push({
      type: 'info',
      message: 'Receivables are significantly higher than payables - focus on collections'
    });
  }
  
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'success',
      message: 'Working capital position is healthy'
    });
  }
  
  return recommendations;
};

// Auto-categorize transactions
export const autoCategorizeTransactions = async () => {
  try {
    const transactions = await db.getTransactions({});
    const suggestions = [];
    
    transactions.forEach(tx => {
      if (tx.category && tx.category !== 'Uncategorized') return;
      
      const description = (tx.description || '').toLowerCase();
      const partyName = (tx.party_name || '').toLowerCase();
      const searchText = description + ' ' + partyName;
      
      for (const [category, keywords] of Object.entries(categoryKeywords)) {
        const matchedKeyword = keywords.find(keyword => searchText.includes(keyword));
        if (matchedKeyword) {
          suggestions.push({
            transactionId: tx.id,
            currentCategory: tx.category || 'Uncategorized',
            suggestedCategory: category,
            confidence: 85,
            reason: `Matched keyword: "${matchedKeyword}"`
          });
          break;
        }
      }
    });
    
    return suggestions;
  } catch (error) {
    console.error('Error auto-categorizing transactions:', error);
    throw error;
  }
};

// Apply categorization suggestion
export const applyCategorySuggestion = async (transactionId, category) => {
  try {
    await db.updateTransaction(transactionId, { category });
    return { success: true };
  } catch (error) {
    console.error('Error applying category suggestion:', error);
    throw error;
  }
};

// Detect anomalies in transactions
export const detectAnomalies = async () => {
  try {
    const transactions = await db.getTransactions({});
    const anomalies = [];
    
    // Check for duplicates
    const seen = {};
    transactions.forEach(tx => {
      const key = `${tx.date}-${tx.total_amount}-${tx.party_name}`;
      if (seen[key]) {
        anomalies.push({
          type: 'duplicate',
          severity: 'high',
          transactionIds: [seen[key].id, tx.id],
          message: `Potential duplicate transaction of ₹${tx.total_amount} on ${tx.date}`,
          details: { amount: tx.total_amount, date: tx.date, party: tx.party_name }
        });
      } else {
        seen[key] = tx;
      }
    });
    
    // Check for unusual amounts by party
    const partyAmounts = {};
    transactions.forEach(tx => {
      const party = tx.party_name || 'Unknown';
      if (!partyAmounts[party]) partyAmounts[party] = [];
      partyAmounts[party].push(tx.total_amount);
    });
    
    for (const [party, amounts] of Object.entries(partyAmounts)) {
      if (amounts.length < 3) continue;
      
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const stdDev = calculateStandardDeviation(amounts);
      const threshold = avg + (2 * stdDev);
      
      transactions
        .filter(tx => tx.party_name === party && tx.total_amount > threshold)
        .forEach(tx => {
          anomalies.push({
            type: 'unusual_amount',
            severity: 'medium',
            transactionId: tx.id,
            message: `Unusual amount for ${party}: ₹${tx.total_amount} (avg: ₹${Math.round(avg)})`,
            details: { amount: tx.total_amount, average: Math.round(avg), deviation: Math.round(tx.total_amount - avg) }
          });
        });
    }
    
    // Check for price variations in recurring expenses
    const vendorPrices = {};
    transactions
      .filter(tx => tx.voucher_type === 'purchase')
      .forEach(tx => {
        const vendor = tx.party_name || 'Unknown';
        if (!vendorPrices[vendor]) vendorPrices[vendor] = [];
        vendorPrices[vendor].push({ amount: tx.total_amount, date: tx.date, id: tx.id });
      });
    
    for (const [vendor, transactionsList] of Object.entries(vendorPrices)) {
      if (transactionsList.length < 2) continue;
      
      const amounts = transactionsList.map(t => t.amount);
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      
      transactionsList.forEach(tx => {
        const variation = Math.abs(tx.amount - avg) / avg;
        if (variation > 0.2) { // More than 20% variation
          anomalies.push({
            type: 'price_variation',
            severity: 'low',
            transactionId: tx.id,
            message: `Price variation for ${vendor}: ₹${tx.amount} (avg: ₹${Math.round(avg)})`,
            details: { amount: tx.amount, average: Math.round(avg), variation: Math.round(variation * 100) }
          });
        }
      });
    }
    
    return anomalies;
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    throw error;
  }
};

// Get AI insights summary
export const getAIInsights = async () => {
  try {
    const [forecast, salesPrediction, expensePrediction, workingCapital, anomalies] = await Promise.all([
      getCashFlowForecast(30),
      getSalesPrediction(),
      getExpensePrediction(),
      getWorkingCapitalAnalysis(),
      detectAnomalies()
    ]);
    
    return {
      forecast,
      salesPrediction,
      expensePrediction,
      workingCapital,
      anomalies: anomalies.slice(0, 10), // Top 10 anomalies
      summary: {
        totalAnomalies: anomalies.length,
        criticalAlerts: anomalies.filter(a => a.severity === 'high').length,
        pendingCategorization: 0 // Would need to track this
      }
    };
  } catch (error) {
    console.error('Error getting AI insights:', error);
    throw error;
  }
};

// Initialize AI service
export const initializeAIService = async () => {
  try {
    console.log('AI Service initialized');
    return { success: true, message: 'AI Service ready' };
  } catch (error) {
    console.error('Error initializing AI service:', error);
    throw error;
  }
};

export const aiService = {
  initializeAIService,
  getCashFlowForecast,
  getSalesPrediction,
  getExpensePrediction,
  getWorkingCapitalAnalysis,
  autoCategorizeTransactions,
  applyCategorySuggestion,
  detectAnomalies,
  getAIInsights
};

export default aiService;
