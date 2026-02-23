/**
 * Currency Service - Multi-Currency Management Module
 * Handles exchange rates, currency conversion, and multi-currency accounting
 */

const fs = require('fs');
const path = require('path');

// Database path
const getDbPath = () => {
  const userDataPath = process.env.APPDATA || process.env.HOME || '.';
  return path.join(userDataPath, 'Talk-to-Your-Accounts', 'currency_data.json');
};

// Initialize database structure
const initializeDatabase = () => {
  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  if (!fs.existsSync(dbPath)) {
    const initialData = {
      currencies: getDefaultCurrencies(),
      exchangeRates: getDefaultExchangeRates(),
      transactions: [],
      settings: {
        baseCurrency: 'INR',
        autoUpdateRates: true,
        updateFrequency: 'daily'
      }
    };
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
  }
  
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
};

// Get default currencies
const getDefaultCurrencies = () => [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2 },
  { code: 'USD', name: 'United States Dollar', symbol: '$', decimals: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimals: 2 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimals: 2 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimals: 2 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', decimals: 2 }
];

// Get default exchange rates (base: INR)
const getDefaultExchangeRates = () => ({
  lastUpdated: new Date().toISOString(),
  base: 'INR',
  rates: {
    INR: 1,
    USD: 0.012,
    EUR: 0.011,
    GBP: 0.0095,
    JPY: 1.75,
    CNY: 0.086,
    AUD: 0.018,
    CAD: 0.016,
    SGD: 0.016,
    AED: 0.044
  }
});

// Save data to database
const saveData = (data) => {
  const dbPath = getDbPath();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

// Get all currencies
const getCurrencies = () => {
  const data = initializeDatabase();
  return data.currencies;
};

// Get currency by code
const getCurrencyByCode = (code) => {
  const data = initializeDatabase();
  return data.currencies.find(c => c.code === code);
};

// Add custom currency
const addCurrency = (currency) => {
  const data = initializeDatabase();
  
  // Check if currency already exists
  if (data.currencies.find(c => c.code === currency.code)) {
    throw new Error(`Currency ${currency.code} already exists`);
  }
  
  // Validate currency code (3 uppercase letters)
  if (!/^[A-Z]{3}$/.test(currency.code)) {
    throw new Error('Currency code must be 3 uppercase letters');
  }
  
  data.currencies.push({
    code: currency.code,
    name: currency.name,
    symbol: currency.symbol || currency.code,
    decimals: currency.decimals || 2
  });
  
  // Initialize exchange rate
  data.exchangeRates.rates[currency.code] = currency.rate || 1;
  
  saveData(data);
  return currency;
};

// Update exchange rate
const updateExchangeRate = (fromCurrency, toCurrency, rate) => {
  const data = initializeDatabase();
  
  if (!data.exchangeRates.rates[fromCurrency]) {
    throw new Error(`Currency ${fromCurrency} not found`);
  }
  
  // Update rate (rates are stored with INR as base)
  const inrRate = data.exchangeRates.rates[fromCurrency];
  data.exchangeRates.rates[toCurrency] = rate * inrRate;
  data.exchangeRates.lastUpdated = new Date().toISOString();
  
  saveData(data);
  return data.exchangeRates;
};

// Get exchange rates
const getExchangeRates = () => {
  const data = initializeDatabase();
  return data.exchangeRates;
};

// Convert amount between currencies
const convertCurrency = (amount, fromCurrency, toCurrency) => {
  const data = initializeDatabase();
  
  const rates = data.exchangeRates.rates;
  
  if (!rates[fromCurrency] || !rates {
    throw new[toCurrency]) Error('Invalid currency code');
  }
  
  // Convert through INR as base
  const inrAmount = amount / rates[fromCurrency];
  const convertedAmount = inrAmount * rates[toCurrency];
  
  return {
    from: { currency: fromCurrency, amount },
    to: { currency: toCurrency, amount: convertedAmount },
    rate: rates[toCurrency] / rates[fromCurrency],
    timestamp: new Date().toISOString()
  };
};

// Record a multi-currency transaction
const recordTransaction = (transaction) => {
  const data = initializeDatabase();
  
  const newTransaction = {
    id: transaction.id || `TXN-${Date.now()}`,
    date: transaction.date || new Date().toISOString(),
    type: transaction.type, // income, expense, transfer
    description: transaction.description,
    amount: transaction.amount,
    currency: transaction.currency,
    convertedAmount: transaction.convertedAmount,
    baseCurrency: transaction.baseCurrency || data.settings.baseCurrency,
    exchangeRate: transaction.exchangeRate,
    category: transaction.category,
    reference: transaction.reference,
    metadata: transaction.metadata || {}
  };
  
  data.transactions.push(newTransaction);
  saveData(data);
  
  return newTransaction;
};

// Get transactions with optional filters
const getTransactions = (filters = {}) => {
  const data = initializeDatabase();
  let transactions = [...data.transactions];
  
  if (filters.currency) {
    transactions = transactions.filter(t => t.currency === filters.currency);
  }
  
  if (filters.type) {
    transactions = transactions.filter(t => t.type === filters.type);
  }
  
  if (filters.startDate) {
    transactions = transactions.filter(t => new Date(t.date) >= new Date(filters.startDate));
  }
  
  if (filters.endDate) {
    transactions = transactions.filter(t => new Date(t.date) <= new Date(filters.endDate));
  }
  
  if (filters.category) {
    transactions = transactions.filter(t => t.category === filters.category);
  }
  
  // Sort by date descending
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  return transactions;
};

// Get transaction by ID
const getTransactionById = (id) => {
  const data = initializeDatabase();
  return data.transactions.find(t => t.id === id);
};

// Update transaction
const updateTransaction = (id, updates) => {
  const data = initializeDatabase();
  const index = data.transactions.findIndex(t => t.id === id);
  
  if (index === -1) {
    throw new Error('Transaction not found');
  }
  
  data.transactions[index] = { ...data.transactions[index], ...updates };
  saveData(data);
  
  return data.transactions[index];
};

// Delete transaction
const deleteTransaction = (id) => {
  const data = initializeDatabase();
  const index = data.transactions.findIndex(t => t.id === id);
  
  if (index === -1) {
    throw new Error('Transaction not found');
  }
  
  data.transactions.splice(index, 1);
  saveData(data);
  
  return { success: true };
};

// Get consolidated report in base currency
const getConsolidatedReport = (startDate, endDate, baseCurrency = 'INR') => {
  const data = initializeDatabase();
  const transactions = getTransactions({ startDate, endDate });
  
  const report = {
    period: { startDate, endDate },
    baseCurrency,
    summary: {
      totalIncome: 0,
      totalExpense: 0,
      netBalance: 0,
      byCurrency: {}
    },
    transactions: []
  };
  
  transactions.forEach(txn => {
    // Convert to base currency
    const conversion = convertCurrency(txn.amount, txn.currency, baseCurrency);
    const convertedAmount = conversion.to.amount;
    
    // Initialize currency summary
    if (!report.summary.byCurrency[txn.currency]) {
      report.summary.byCurrency[txn.currency] = {
        income: 0,
        expense: 0,
        balance: 0,
        transactionCount: 0
      };
    }
    
    // Update totals
    if (txn.type === 'income') {
      report.summary.totalIncome += convertedAmount;
      report.summary.byCurrency[txn.currency].income += txn.amount;
    } else if (txn.type === 'expense') {
      report.summary.totalExpense += convertedAmount;
      report.summary.byCurrency[txn.currency].expense += txn.amount;
    }
    
    report.summary.byCurrency[txn.currency].balance += 
      (txn.type === 'income' ? txn.amount : -txn.amount);
    report.summary.byCurrency[txn.currency].transactionCount++;
    
    // Add to transactions list with converted amount
    report.transactions.push({
      ...txn,
      convertedAmount,
      baseCurrency
    });
  });
  
  report.summary.netBalance = report.summary.totalIncome - report.summary.totalExpense;
  
  return report;
};

// Get settings
const getSettings = () => {
  const data = initializeDatabase();
  return data.settings;
};

// Update settings
const updateSettings = (newSettings) => {
  const data = initializeDatabase();
  
  data.settings = {
    ...data.settings,
    ...newSettings,
    baseCurrency: newSettings.baseCurrency || data.settings.baseCurrency
  };
  
  saveData(data);
  return data.settings;
};

// Fetch live exchange rates (simulated - in production, use real API)
const fetchLiveRates = async () => {
  // Simulated API call - in production, integrate with services like:
  // - Open Exchange Rates
  // - Exchange Rate API
  // - Fixer.io
  
  const simulatedRates = {
    INR: 1,
    USD: 0.012 + (Math.random() - 0.5) * 0.001,
    EUR: 0.011 + (Math.random() - 0.5) * 0.001,
    GBP: 0.0095 + (Math.random() - 0.5) * 0.0005,
    JPY: 1.75 + (Math.random() - 0.5) * 0.1,
    CNY: 0.086 + (Math.random() - 0.5) * 0.005,
    AUD: 0.018 + (Math.random() - 0.5) * 0.001,
    CAD: 0.016 + (Math.random() - 0.5) * 0.001,
    SGD: 0.016 + (Math.random() - 0.5) * 0.001,
    AED: 0.044 + (Math.random() - 0.5) * 0.002
  };
  
  const data = initializeDatabase();
  data.exchangeRates = {
    lastUpdated: new Date().toISOString(),
    base: 'INR',
    rates: simulatedRates
  };
  
  saveData(data);
  return data.exchangeRates;
};

// Export functions
module.exports = {
  initializeDatabase,
  getCurrencies,
  getCurrencyByCode,
  addCurrency,
  updateExchangeRate,
  getExchangeRates,
  convertCurrency,
  recordTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getConsolidatedReport,
  getSettings,
  updateSettings,
  fetchLiveRates
};
