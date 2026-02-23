import { useState, useEffect, useCallback } from 'react';

const useEwaybill = () => {
  const [ewaybills, setEwaybills] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    cancelled: 0,
    expired: 0,
    generatedToday: 0,
    expiringSoon: 0
  });
  const [hsnCodes, setHsnCodes] = useState([]);
  const [stateCodes, setStateCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all E-Way Bills
  const fetchEwaybills = useCallback(async (filters = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await window.api.ewaybill.getAll(filters);
      setEwaybills(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to fetch E-Way Bills');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    try {
      const data = await window.api.ewaybill.getStats();
      setStats(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to fetch stats');
      throw err;
    }
  }, []);

  // Fetch HSN codes
  const fetchHsnCodes = useCallback(async () => {
    try {
      const data = await window.api.ewaybill.getHsnCodes();
      setHsnCodes(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to fetch HSN codes');
      throw err;
    }
  }, []);

  // Fetch state codes
  const fetchStateCodes = useCallback(async () => {
    try {
      const data = await window.api.ewaybill.getStateCodes();
      setStateCodes(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to fetch state codes');
      throw err;
    }
  }, []);

  // Create E-Way Bill
  const createEwaybill = useCallback(async (ewaybillData) => {
    setIsLoading(true);
    setError(null);
    try {
      const newEwaybill = await window.api.ewaybill.create(ewaybillData);
      setEwaybills(prev => [newEwaybill, ...prev]);
      return newEwaybill;
    } catch (err) {
      setError(err.message || 'Failed to create E-Way Bill');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get E-Way Bill by ID
  const getEwaybillById = useCallback(async (id) => {
    setIsLoading(true);
    setError(null);
    try {
      const ewaybill = await window.api.ewaybill.getById(id);
      return ewaybill;
    } catch (err) {
      setError(err.message || 'Failed to fetch E-Way Bill');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get E-Way Bill by number
  const getEwaybillByNumber = useCallback(async (ewbNo) => {
    setIsLoading(true);
    setError(null);
    try {
      const ewaybill = await window.api.ewaybill.getByNumber(ewbNo);
      return ewaybill;
    } catch (err) {
      setError(err.message || 'Failed to fetch E-Way Bill');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update E-Way Bill
  const updateEwaybill = useCallback(async (id, updates) => {
    setIsLoading(true);
    setError(null);
    try {
      const updated = await window.api.ewaybill.update(id, updates);
      setEwaybills(prev => prev.map(ewb => ewb.id === id ? updated : ewb));
      return updated;
    } catch (err) {
      setError(err.message || 'Failed to update E-Way Bill');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cancel E-Way Bill
  const cancelEwaybill = useCallback(async (id, reason) => {
    setIsLoading(true);
    setError(null);
    try {
      const cancelled = await window.api.ewaybill.cancel(id, reason);
      setEwaybills(prev => prev.map(ewb => ewb.id === id ? cancelled : ewb));
      return cancelled;
    } catch (err) {
      setError(err.message || 'Failed to cancel E-Way Bill');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update vehicle details
  const updateVehicle = useCallback(async (id, vehicleData) => {
    setIsLoading(true);
    setError(null);
    try {
      const updated = await window.api.ewaybill.updateVehicle(id, vehicleData);
      setEwaybills(prev => prev.map(ewb => ewb.id === id ? updated : ewb));
      return updated;
    } catch (err) {
      setError(err.message || 'Failed to update vehicle');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Generate JSON for GST Portal
  const generateJson = useCallback(async (id) => {
    setIsLoading(true);
    setError(null);
    try {
      const jsonData = await window.api.ewaybill.generateJson(id);
      return jsonData;
    } catch (err) {
      setError(err.message || 'Failed to generate JSON');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Export JSON to file
  const exportJson = useCallback(async (id, filename = 'ewaybill.json') => {
    try {
      const jsonData = await generateJson(id);
      const jsonString = JSON.stringify(jsonData, null, 2);
      
      // Create blob and download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return jsonData;
    } catch (err) {
      setError(err.message || 'Failed to export JSON');
      throw err;
    }
  }, [generateJson]);

  // Calculate tax amounts
  const calculateTax = useCallback((items, fromGstin, toGstin) => {
    const isInterstate = fromGstin && toGstin && fromGstin.substring(0, 2) !== toGstin.substring(0, 2);
    
    let totalTaxableValue = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    
    items.forEach(item => {
      const taxableValue = parseFloat(item.taxableValue) || 0;
      const taxRate = parseFloat(item.taxRate) || 0;
      
      totalTaxableValue += taxableValue;
      
      if (isInterstate) {
        totalIgst += (taxableValue * taxRate / 100);
      } else {
        totalCgst += (taxableValue * taxRate / 200);
        totalSgst += (taxableValue * taxRate / 200);
      }
    });
    
    return {
      totalTaxableValue: totalTaxableValue.toFixed(2),
      totalCgst: totalCgst.toFixed(2),
      totalSgst: totalSgst.toFixed(2),
      totalIgst: totalIgst.toFixed(2),
      totalValue: (totalTaxableValue + totalCgst + totalSgst + totalIgst).toFixed(2),
      isInterstate
    };
  }, []);

  // Validate GSTIN
  const validateGstin = useCallback((gstin) => {
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin);
  }, []);

  // Validate vehicle number
  const validateVehicleNumber = useCallback((vehicleNo) => {
    const vehicleRegex = /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/;
    return vehicleRegex.test(vehicleNo);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize data
  useEffect(() => {
    fetchStats();
    fetchHsnCodes();
    fetchStateCodes();
  }, [fetchStats, fetchHsnCodes, fetchStateCodes]);

  return {
    // State
    ewaybills,
    stats,
    hsnCodes,
    stateCodes,
    isLoading,
    error,
    
    // Functions
    fetchEwaybills,
    fetchStats,
    fetchHsnCodes,
    fetchStateCodes,
    createEwaybill,
    getEwaybillById,
    getEwaybillByNumber,
    updateEwaybill,
    cancelEwaybill,
    updateVehicle,
    generateJson,
    exportJson,
    
    // Helpers
    calculateTax,
    validateGstin,
    validateVehicleNumber,
    clearError
  };
};

export default useEwaybill;
