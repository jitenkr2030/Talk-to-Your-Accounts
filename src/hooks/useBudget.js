import { useState, useEffect, useCallback } from 'react';

const useBudget = () => {
  const [budgets, setBudgets] = useState([]);
  const [budgetSummary, setBudgetSummary] = useState(null);
  const [budgetAlerts, setBudgetAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all budgets
  const fetchBudgets = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.budget.getAll(filters);
      setBudgets(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch budget by ID
  const fetchBudgetById = useCallback(async (budgetId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.budget.getById(budgetId);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new budget
  const createBudget = useCallback(async (budgetData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.budget.create(budgetData);
      await fetchBudgets();
      await fetchBudgetSummary();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchBudgets, fetchBudgetSummary]);

  // Update budget
  const updateBudget = useCallback(async (budgetId, budgetData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.budget.update(budgetId, budgetData);
      await fetchBudgets();
      await fetchBudgetSummary();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchBudgets, fetchBudgetSummary]);

  // Delete budget
  const deleteBudget = useCallback(async (budgetId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.budget.delete(budgetId);
      await fetchBudgets();
      await fetchBudgetSummary();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchBudgets, fetchBudgetSummary]);

  // Fetch budget summary with actual vs planned
  const fetchBudgetSummary = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.budget.getSummary(filters);
      setBudgetSummary(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update budget variance
  const updateBudgetVariance = useCallback(async (budgetId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.budget.updateVariance(budgetId);
      await fetchBudgetSummary();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchBudgetSummary]);

  // Fetch budget alerts
  const fetchBudgetAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.budget.getAlerts();
      setBudgetAlerts(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Export budgets
  const exportBudgets = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.budget.export(filters);
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
    fetchBudgets();
    fetchBudgetSummary();
    fetchBudgetAlerts();
  }, [fetchBudgets, fetchBudgetSummary, fetchBudgetAlerts]);

  return {
    // State
    budgets,
    budgetSummary,
    budgetAlerts,
    loading,
    error,

    // Operations
    fetchBudgets,
    fetchBudgetById,
    createBudget,
    updateBudget,
    deleteBudget,
    fetchBudgetSummary,
    updateBudgetVariance,
    fetchBudgetAlerts,
    exportBudgets
  };
};

export default useBudget;
