import { useState, useEffect, useCallback } from 'react';

const useVendor = () => {
  const [vendors, setVendors] = useState([]);
  const [vendorSummary, setVendorSummary] = useState(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all vendors
  const fetchVendors = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.vendor.getAll(filters);
      setVendors(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch vendor by ID
  const fetchVendorById = useCallback(async (vendorId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.vendor.getById(vendorId);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create vendor
  const createVendor = useCallback(async (vendorData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.vendor.create(vendorData);
      await fetchVendors();
      await fetchVendorSummary();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchVendors, fetchVendorSummary]);

  // Update vendor
  const updateVendor = useCallback(async (vendorId, vendorData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.vendor.update(vendorId, vendorData);
      await fetchVendors();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchVendors]);

  // Delete vendor
  const deleteVendor = useCallback(async (vendorId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.vendor.delete(vendorId);
      await fetchVendors();
      await fetchVendorSummary();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchVendors, fetchVendorSummary]);

  // Add vendor contact
  const addVendorContact = useCallback(async (vendorId, contactData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.vendor.addContact(vendorId, contactData);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete vendor contact
  const deleteVendorContact = useCallback(async (contactId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.vendor.deleteContact(contactId);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch vendor summary
  const fetchVendorSummary = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.vendor.getSummary(filters);
      setVendorSummary(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Export vendors
  const exportVendors = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.vendor.export(filters);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Purchase Order Methods
  // Fetch all purchase orders
  const fetchPurchaseOrders = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.purchaseOrder.getAll(filters);
      setPurchaseOrders(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch purchase order by ID
  const fetchPurchaseOrderById = useCallback(async (poId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.purchaseOrder.getById(poId);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create purchase order
  const createPurchaseOrder = useCallback(async (poData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.purchaseOrder.create(poData);
      await fetchPurchaseOrders();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPurchaseOrders]);

  // Update purchase order
  const updatePurchaseOrder = useCallback(async (poId, poData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.purchaseOrder.update(poId, poData);
      await fetchPurchaseOrders();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPurchaseOrders]);

  // Cancel purchase order
  const cancelPurchaseOrder = useCallback(async (poId, reason) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.purchaseOrder.cancel(poId, reason);
      await fetchPurchaseOrders();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPurchaseOrders]);

  // Receive purchase order items
  const receivePurchaseOrder = useCallback(async (poId, items) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.purchaseOrder.receive(poId, items);
      await fetchPurchaseOrders();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchPurchaseOrders]);

  // Get vendor purchase summary
  const fetchVendorPurchaseSummary = useCallback(async (vendorId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.purchaseOrder.getVendorSummary(vendorId);
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
    fetchVendors();
    fetchVendorSummary();
    fetchPurchaseOrders();
  }, [fetchVendors, fetchVendorSummary, fetchPurchaseOrders]);

  return {
    // State
    vendors,
    vendorSummary,
    purchaseOrders,
    loading,
    error,

    // Vendor operations
    fetchVendors,
    fetchVendorById,
    createVendor,
    updateVendor,
    deleteVendor,
    addVendorContact,
    deleteVendorContact,
    fetchVendorSummary,
    exportVendors,

    // Purchase Order operations
    fetchPurchaseOrders,
    fetchPurchaseOrderById,
    createPurchaseOrder,
    updatePurchaseOrder,
    cancelPurchaseOrder,
    receivePurchaseOrder,
    fetchVendorPurchaseSummary
  };
};

export default useVendor;
