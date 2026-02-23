/**
 * Payment Gateway Hook
 * 
 * React hook for managing payment gateway operations.
 * Provides functions for gateway config, payments, and refunds.
 */

import { useState, useCallback } from 'react';

const usePaymentGateway = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [gateways, setGateways] = useState([]);
  const [activeGateway, setActiveGateway] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [webhookLogs, setWebhookLogs] = useState([]);

  // Save gateway configuration
  const saveConfig = useCallback(async (configData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.payment.saveConfig(configData);
      if (result.success) {
        await getConfig();
      }
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get gateway configuration
  const getConfig = useCallback(async (gatewayName = null) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.payment.getConfig(gatewayName);
      setGateways(result || []);
      return result;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get active gateway
  const getActiveGateway = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.payment.getActiveGateway();
      setActiveGateway(result);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Set gateway status
  const setGatewayStatus = useCallback(async (gatewayId, isActive) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.payment.setStatus(gatewayId, isActive);
      if (result.success) {
        await getConfig();
        await getActiveGateway();
      }
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [getConfig, getActiveGateway]);

  // Create payment link
  const createPaymentLink = useCallback(async (invoiceId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.payment.createLink(invoiceId);
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get payment link
  const getPaymentLink = useCallback(async (token) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.payment.getLink(token);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Initiate payment
  const initiatePayment = useCallback(async (paymentData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.payment.initiate(paymentData);
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Update payment status
  const updatePaymentStatus = useCallback(async (paymentId, status, gatewayResponse = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.payment.updateStatus(paymentId, status, gatewayResponse);
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get payment transaction
  const getPaymentTransaction = useCallback(async (paymentId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.payment.getTransaction(paymentId);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get invoice payments
  const getInvoicePayments = useCallback(async (invoiceId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.payment.getInvoicePayments(invoiceId);
      return result;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get payment transactions
  const getTransactions = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.payment.getTransactions(filters);
      setTransactions(result || []);
      return result;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get payment summary
  const getPaymentSummary = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.payment.getSummary(filters);
      setPaymentSummary(result);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Process refund
  const processRefund = useCallback(async (paymentId, amount, reason) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.payment.processRefund(paymentId, amount, reason);
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get refunds
  const getRefunds = useCallback(async (paymentId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.payment.getRefunds(paymentId);
      return result;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get webhook logs
  const getWebhookLogs = useCallback(async (limit = 50) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.payment.getWebhookLogs(limit);
      setWebhookLogs(result || []);
      return result;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Test gateway connection
  const testConnection = useCallback(async (gatewayId) => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.payment.testConnection(gatewayId);
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
    gateways,
    activeGateway,
    transactions,
    paymentSummary,
    webhookLogs,
    
    // Functions
    saveConfig,
    getConfig,
    getActiveGateway,
    setGatewayStatus,
    createPaymentLink,
    getPaymentLink,
    initiatePayment,
    updatePaymentStatus,
    getPaymentTransaction,
    getInvoicePayments,
    getTransactions,
    getPaymentSummary,
    processRefund,
    getRefunds,
    getWebhookLogs,
    testConnection,
    clearError
  };
};

export default usePaymentGateway;
