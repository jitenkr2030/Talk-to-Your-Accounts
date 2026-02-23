/**
 * Reports Hook
 * 
 * React hook for managing reports and analytics operations.
 * Provides functions for generating various financial reports.
 */

import { useState, useCallback } from 'react';

const useReports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [salesReport, setSalesReport] = useState(null);
  const [pnlReport, setPnlReport] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [cashFlow, setCashFlow] = useState(null);
  const [outstanding, setOutstanding] = useState(null);
  const [expenseSummary, setExpenseSummary] = useState(null);

  // Get dashboard summary
  const getDashboardSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.reports.getDashboardSummary();
      setDashboardSummary(result);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate sales report
  const generateSalesReport = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.reports.generateSales(params);
      setSalesReport(result);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate GST report
  const generateGSTReport = useCallback(async (month) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.reports.generateGST(month);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate Profit & Loss report
  const generatePNLReport = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.reports.generatePNL(params);
      setPnlReport(result);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate Balance Sheet
  const generateBalanceSheetReport = useCallback(async (asOfDate = null) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.reports.generateBalanceSheet(asOfDate);
      setBalanceSheet(result);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate Cash Flow report
  const generateCashFlowReport = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.reports.generateCashFlow(params);
      setCashFlow(result);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate Outstanding Aging report
  const generateOutstandingReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.reports.generateOutstanding();
      setOutstanding(result);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate Expense Summary
  const generateExpenseReport = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.reports.generateExpenseSummary(params);
      setExpenseSummary(result);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
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
    dashboardSummary,
    salesReport,
    pnlReport,
    balanceSheet,
    cashFlow,
    outstanding,
    expenseSummary,
    
    // Functions
    getDashboardSummary,
    generateSalesReport,
    generateGSTReport,
    generatePNLReport,
    generateBalanceSheetReport,
    generateCashFlowReport,
    generateOutstandingReport,
    generateExpenseReport,
    clearError
  };
};

export default useReports;
