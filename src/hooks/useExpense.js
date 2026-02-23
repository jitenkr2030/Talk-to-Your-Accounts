import { useState, useEffect, useCallback } from 'react';

const useExpense = () => {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [expenseSummary, setExpenseSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all expenses
  const fetchExpenses = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.expense.getAll(filters);
      setExpenses(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch expense categories
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.expense.getCategories();
      setCategories(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Add new category
  const addCategory = useCallback(async (categoryData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.expense.addCategory(categoryData);
      await fetchCategories();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  // Update category
  const updateCategory = useCallback(async (categoryId, categoryData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.expense.updateCategory(categoryId, categoryData);
      await fetchCategories();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  // Delete category
  const deleteCategory = useCallback(async (categoryId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.expense.deleteCategory(categoryId);
      await fetchCategories();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  // Create new expense
  const createExpense = useCallback(async (expenseData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.expense.create(expenseData);
      await fetchExpenses();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchExpenses]);

  // Update expense
  const updateExpense = useCallback(async (expenseId, expenseData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.expense.update(expenseId, expenseData);
      await fetchExpenses();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchExpenses]);

  // Delete expense
  const deleteExpense = useCallback(async (expenseId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.expense.delete(expenseId);
      await fetchExpenses();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchExpenses]);

  // Approve expense
  const approveExpense = useCallback(async (expenseId, approvalData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.expense.approve(expenseId, approvalData);
      await fetchExpenses();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchExpenses]);

  // Reject expense
  const rejectExpense = useCallback(async (expenseId, reason) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.expense.reject(expenseId, reason);
      await fetchExpenses();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchExpenses]);

  // Get recurring expenses
  const fetchRecurringExpenses = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.expense.getRecurring(filters);
      setRecurringExpenses(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create recurring expense
  const createRecurringExpense = useCallback(async (recurringData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.expense.createRecurring(recurringData);
      await fetchRecurringExpenses();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchRecurringExpenses]);

  // Update recurring expense
  const updateRecurringExpense = useCallback(async (recurringId, recurringData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.expense.updateRecurring(recurringId, recurringData);
      await fetchRecurringExpenses();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchRecurringExpenses]);

  // Delete recurring expense
  const deleteRecurringExpense = useCallback(async (recurringId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.expense.deleteRecurring(recurringId);
      await fetchRecurringExpenses();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchRecurringExpenses]);

  // Process recurring expense (create instance)
  const processRecurringExpense = useCallback(async (recurringId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.expense.processRecurring(recurringId);
      await fetchExpenses();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchExpenses]);

  // Upload receipt
  const uploadReceipt = useCallback(async (expenseId, receiptData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.expense.uploadReceipt(expenseId, receiptData);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get receipts for expense
  const fetchReceipts = useCallback(async (expenseId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.expense.getReceipts(expenseId);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete receipt
  const deleteReceipt = useCallback(async (receiptId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.expense.deleteReceipt(receiptId);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get expense summary
  const fetchExpenseSummary = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.expense.getSummary(filters);
      setExpenseSummary(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get expenses by category
  const fetchExpensesByCategory = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.expense.getByCategory(filters);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get vendor expenses
  const fetchVendorExpenses = useCallback(async (vendorId, filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.expense.getVendorExpenses(vendorId, filters);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Export expenses
  const exportExpenses = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.expense.export(filters);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchExpenses();
    fetchCategories();
    fetchExpenseSummary();
  }, [fetchExpenses, fetchCategories, fetchExpenseSummary]);

  return {
    // State
    expenses,
    categories,
    recurringExpenses,
    expenseSummary,
    loading,
    error,

    // Expense operations
    fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    approveExpense,
    rejectExpense,

    // Category operations
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,

    // Recurring expense operations
    fetchRecurringExpenses,
    createRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    processRecurringExpense,

    // Receipt operations
    uploadReceipt,
    fetchReceipts,
    deleteReceipt,

    // Summary and reports
    fetchExpenseSummary,
    fetchExpensesByCategory,
    fetchVendorExpenses,
    exportExpenses
  };
};

export default useExpense;
