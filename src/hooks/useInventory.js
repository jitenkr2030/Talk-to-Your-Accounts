/**
 * Inventory Hook
 * 
 * React hook for managing inventory operations and state.
 * Provides functions for batch tracking, serial numbers, stock movements, etc.
 */

import { useState, useCallback } from 'react';

const useInventory = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inventorySummary, setInventorySummary] = useState(null);
  const [batches, setBatches] = useState([]);
  const [movements, setMovements] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [expiringBatches, setExpiringBatches] = useState([]);
  const [valuation, setValuation] = useState(null);

  // Add new batch/lot
  const addBatch = useCallback(async (batchData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.inventory.addBatch(batchData);
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get product batches
  const getProductBatches = useCallback(async (productId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.inventory.getBatches(productId);
      setBatches(result || []);
      return result;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Add serial numbers
  const addSerialNumbers = useCallback(async (serialData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.inventory.addSerialNumbers(serialData);
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get product serial numbers
  const getProductSerialNumbers = useCallback(async (productId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.inventory.getSerialNumbers(productId);
      return result;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Record stock movement
  const recordMovement = useCallback(async (movementData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.inventory.recordMovement(movementData);
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get inventory summary
  const getInventorySummary = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.inventory.getSummary(filters);
      const summary = {
        products: result || [],
        totalProducts: result ? result.length : 0
      };
      setInventorySummary(summary);
      return summary;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get movement history
  const getMovementHistory = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.inventory.getMovements(filters);
      setMovements(result || []);
      return result;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get low stock products
  const getLowStockProducts = useCallback(async (threshold = 10) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.inventory.getLowStock(threshold);
      setLowStockProducts(result || []);
      return result;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get expiring batches
  const getExpiringBatches = useCallback(async (daysAhead = 30) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.inventory.getExpiring(daysAhead);
      setExpiringBatches(result || []);
      return result;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get inventory valuation
  const getInventoryValuation = useCallback(async (asOnDate = null) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.inventory.getValuation(asOnDate);
      setValuation(result);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Transfer stock
  const transferStock = useCallback(async (transferData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.inventory.transferStock(transferData);
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Adjust inventory
  const adjustInventory = useCallback(async (adjustmentData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.inventory.adjust(adjustmentData);
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
    inventorySummary,
    batches,
    movements,
    lowStockProducts,
    expiringBatches,
    valuation,
    
    // Functions
    addBatch,
    getProductBatches,
    addSerialNumbers,
    getProductSerialNumbers,
    recordMovement,
    getInventorySummary,
    getMovementHistory,
    getLowStockProducts,
    getExpiringBatches,
    getInventoryValuation,
    transferStock,
    adjustInventory,
    clearError
  };
};

export default useInventory;
