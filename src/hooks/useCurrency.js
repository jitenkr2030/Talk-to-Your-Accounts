/**
 * Currency Management Hook
 * Provides state management and API calls for multi-currency functionality
 */

import { useState, useEffect, useCallback } from 'react';

const useCurrency = () => {
  const [currencies, setCurrencies] = useState([]);
  const [exchangeRates, setExchangeRates] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize the currency database
  const initialize = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.currency.initialize();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all currencies
  const fetchCurrencies = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.currency.getCurrencies();
      setCurrencies(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get single currency
  const getCurrency = useCallback(async (code) => {
    try {
      setLoading(true);
      return await window.api.currency.getCurrency(code);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Add new currency
  const addCurrency = useCallback(async (currency) => {
    try {
      setLoading(true);
      const data = await window.api.currency.addCurrency(currency);
      await fetchCurrencies(); // Refresh the list
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCurrencies]);

  // Update exchange rate
  const updateExchangeRate = useCallback(async (fromCurrency, toCurrency, rate) => {
    try {
      setLoading(true);
      const data = await window.api.currency.updateExchangeRate(fromCurrency, toCurrency, rate);
      await fetchExchangeRates(); // Refresh rates
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch exchange rates
  const fetchExchangeRates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.currency.getExchangeRates();
      setExchangeRates(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Convert currency
  const convertCurrency = useCallback(async (amount, fromCurrency, toCurrency) => {
    try {
      setLoading(true);
      return await window.api.currency.convert(amount, fromCurrency, toCurrency);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Record a transaction
  const recordTransaction = useCallback(async (transaction) => {
    try {
      setLoading(true);
      const data = await window.api.currency.recordTransaction(transaction);
      await fetchTransactions(); // Refresh transactions
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch transactions with filters
  const fetchTransactions = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      const data = await window.api.currency.getTransactions(filters);
      setTransactions(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get single transaction
  const getTransaction = useCallback(async (id) => {
    try {
      setLoading(true);
      return await window.api.currency.getTransaction(id);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update transaction
  const updateTransaction = useCallback(async (id, updates) => {
    try {
      setLoading(true);
      const data = await window.api.currency.updateTransaction(id, updates);
      await fetchTransactions(); // Refresh transactions
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTransactions]);

  // Delete transaction
  const deleteTransaction = useCallback(async (id) => {
    try {
      setLoading(true);
      const data = await window.api.currency.deleteTransaction(id);
      await fetchTransactions(); // Refresh transactions
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchTransactions]);

  // Get consolidated report
  const getConsolidatedReport = useCallback(async (startDate, endDate, baseCurrency) => {
    try {
      setLoading(true);
      return await window.api.currency.getConsolidatedReport(startDate, endDate, baseCurrency);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.currency.getSettings();
      setSettings(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update settings
  const updateSettings = useCallback(async (newSettings) => {
    try {
      setLoading(true);
      const data = await window.api.currency.updateSettings(newSettings);
      setSettings(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch live exchange rates
  const fetchLiveRates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.currency.fetchLiveRates();
      setExchangeRates(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await initialize();
        await Promise.all([
          fetchCurrencies(),
          fetchExchangeRates(),
          fetchSettings()
        ]);
      } catch (err) {
        console.error('Error loading initial currency data:', err);
      }
    };
    
    loadInitialData();
  }, [initialize, fetchCurrencies, fetchExchangeRates, fetchSettings]);

  return {
    // State
    currencies,
    exchangeRates,
    transactions,
    settings,
    loading,
    error,
    
    // Actions
    initialize,
    fetchCurrencies,
    getCurrency,
    addCurrency,
    updateExchangeRate,
    fetchExchangeRates,
    convertCurrency,
    recordTransaction,
    fetchTransactions,
    getTransaction,
    updateTransaction,
    deleteTransaction,
    getConsolidatedReport,
    fetchSettings,
    updateSettings,
    fetchLiveRates,
    clearError
  };
};

export default useCurrency;
