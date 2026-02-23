/**
 * useEinvoice React Hook
 * 
 * Provides e-invoice functionality for the frontend application.
 */

import { useState, useCallback } from 'react';

const useEinvoice = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [einvoice, setEinvoice] = useState(null);
  const [einvoiceList, setEinvoiceList] = useState([]);
  const [config, setConfig] = useState(null);

  // Generate e-invoice for a transaction
  const generateEinvoice = useCallback(async (transactionId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.einvoice.generate(transactionId);
      if (result.success) {
        return result;
      } else {
        throw new Error(result.error || 'Failed to generate e-invoice');
      }
    } catch (err) {
      const errorMessage = err.message || 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate e-waybill
  const generateEwaybill = useCallback(async (transactionId, transport = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.einvoice.generateEwaybill(transactionId, transport);
      if (result.success) {
        return result;
      } else {
        throw new Error(result.error || 'Failed to generate e-waybill');
      }
    } catch (err) {
      const errorMessage = err.message || 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get e-invoice for a transaction
  const getEinvoice = useCallback(async (transactionId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.einvoice.get(transactionId);
      setEinvoice(result);
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // List all e-invoices
  const listEinvoices = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.einvoice.list(filters);
      setEinvoiceList(result);
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get pending invoices (transactions without e-invoice)
  const getPendingInvoices = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.einvoice.getPending(filters);
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get e-invoice configuration
  const getConfig = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.api.einvoice.getConfig();
      setConfig(result);
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Save e-invoice configuration
  const saveConfig = useCallback(async (configData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.einvoice.saveConfig(configData);
      if (result.success) {
        setConfig(configData);
        return result;
      } else {
        throw new Error(result.error || 'Failed to save configuration');
      }
    } catch (err) {
      const errorMessage = err.message || 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Cancel e-invoice
  const cancelEinvoice = useCallback(async (transactionId, reason) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.einvoice.cancel(transactionId, reason);
      if (result.success) {
        return result;
      } else {
        throw new Error(result.error || 'Failed to cancel e-invoice');
      }
    } catch (err) {
      const errorMessage = err.message || 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Validate GSTIN
  const validateGstin = useCallback(async (gstin) => {
    try {
      return await window.api.einvoice.validateGstin(gstin);
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }, []);

  // Validate HSN code
  const validateHsn = useCallback(async (hsnCode) => {
    try {
      return await window.api.einvoice.validateHsn(hsnCode);
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }, []);

  return {
    // State
    loading,
    error,
    einvoice,
    einvoiceList,
    config,
    
    // Actions
    generateEinvoice,
    generateEwaybill,
    getEinvoice,
    listEinvoices,
    getPendingInvoices,
    getConfig,
    saveConfig,
    cancelEinvoice,
    validateGstin,
    validateHsn,
    
    // Helpers
    clearError: () => setError(null)
  };
};

export default useEinvoice;
