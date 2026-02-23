/**
 * useGSTR React Hook
 * 
 * Provides GST return functionality for the frontend application.
 */

import { useState, useCallback } from 'react';

const useGSTR = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [gstr1Data, setGstr1Data] = useState(null);
  const [gstr3bData, setGstr3bData] = useState(null);
  const [itcData, setItcData] = useState(null);
  const [liabilitySummary, setLiabilitySummary] = useState(null);

  // Get GSTR-1 data
  const getGSTR1 = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.gst.getGstr1(filters);
      setGstr1Data(result);
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get GSTR-3B data
  const getGSTR3B = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.gst.getGstr3b(filters);
      setGstr3bData(result);
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Export GSTR-1 JSON
  const exportGSTR1JSON = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.gst.exportGstr1Json(filters);
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Export GSTR-3B JSON
  const exportGSTR3BJSON = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.gst.exportGstr3bJson(filters);
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get ITC Reconciliation
  const getITCReconciliation = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.gst.getItcReconciliation(filters);
      setItcData(result);
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get GST Liability Summary
  const getLiabilitySummary = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.gst.getLiabilitySummary(filters);
      setLiabilitySummary(result);
      return result;
    } catch (err) {
      const errorMessage = err.message || 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Download JSON file
  const downloadJSON = useCallback((data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  return {
    // State
    loading,
    error,
    gstr1Data,
    gstr3bData,
    itcData,
    liabilitySummary,
    
    // Actions
    getGSTR1,
    getGSTR3B,
    exportGSTR1JSON,
    exportGSTR3BJSON,
    getITCReconciliation,
    getLiabilitySummary,
    downloadJSON,
    
    // Helpers
    clearError: () => setError(null)
  };
};

export default useGSTR;
