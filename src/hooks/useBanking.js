/**
 * Banking Hook
 * 
 * React hook for managing banking operations and reconciliation.
 * Provides functions for bank accounts, transactions, and matching.
 */

import { useState, useCallback } from 'react';

const useBanking = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [unmatchedTransactions, setUnmatchedTransactions] = useState([]);
  const [reconciliationSummary, setReconciliationSummary] = useState(null);
  const [rules, setRules] = useState([]);

  // Get all bank accounts
  const getAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.banking.getAccounts();
      setAccounts(result || []);
      return result;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get single account with transactions
  const getAccount = useCallback(async (accountId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.banking.getAccount(accountId);
      setSelectedAccount(result);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Add bank account
  const addAccount = useCallback(async (accountData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.banking.addAccount(accountData);
      if (result.success) {
        await getAccounts();
      }
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [getAccounts]);

  // Update bank account
  const updateAccount = useCallback(async (accountId, updates) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.banking.updateAccount(accountId, updates);
      if (result.success) {
        await getAccounts();
      }
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [getAccounts]);

  // Delete bank account
  const deleteAccount = useCallback(async (accountId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.banking.deleteAccount(accountId);
      if (result.success) {
        await getAccounts();
      }
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [getAccounts]);

  // Get bank transactions
  const getTransactions = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.banking.getTransactions(filters);
      setTransactions(result || []);
      return result;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get unmatched transactions
  const getUnmatchedTransactions = useCallback(async (accountId = null) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.banking.getUnmatched(accountId);
      setUnmatchedTransactions(result || []);
      return result;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Add bank transaction
  const addTransaction = useCallback(async (transactionData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.banking.addTransaction(transactionData);
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto reconcile
  const autoReconcile = useCallback(async (accountId = null) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.banking.autoReconcile(accountId);
      if (result.success) {
        await getUnmatchedTransactions(accountId);
        await getReconciliationSummary(accountId);
      }
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [getUnmatchedTransactions]);

  // Match transaction to invoice
  const matchTransaction = useCallback(async (transactionId, invoiceId, invoiceType = 'sale') => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.banking.matchTransaction(transactionId, invoiceId, invoiceType);
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Unmatch transaction
  const unmatchTransaction = useCallback(async (transactionId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.banking.unmatchTransaction(transactionId);
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get reconciliation summary
  const getReconciliationSummary = useCallback(async (accountId = null) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.banking.getSummary(accountId);
      setReconciliationSummary(result);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get reconciliation rules
  const getRules = useCallback(async (accountId = null) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.banking.getRules(accountId);
      setRules(result || []);
      return result;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Add reconciliation rule
  const addRule = useCallback(async (ruleData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.banking.addRule(ruleData);
      if (result.success) {
        await getRules();
      }
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [getRules]);

  // Delete reconciliation rule
  const deleteRule = useCallback(async (ruleId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.banking.deleteRule(ruleId);
      if (result.success) {
        await getRules();
      }
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [getRules]);

  // Import bank statement
  const importStatement = useCallback(async (accountId, transactions) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.banking.importStatement(accountId, transactions);
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    loading,
    error,
    accounts,
    selectedAccount,
    transactions,
    unmatchedTransactions,
    reconciliationSummary,
    rules,
    
    // Functions
    getAccounts,
    getAccount,
    addAccount,
    updateAccount,
    deleteAccount,
    getTransactions,
    getUnmatchedTransactions,
    addTransaction,
    autoReconcile,
    matchTransaction,
    unmatchTransaction,
    getReconciliationSummary,
    getRules,
    addRule,
    deleteRule,
    importStatement,
    clearError
  };
};

export default useBanking;
