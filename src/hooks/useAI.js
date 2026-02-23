/**
 * AI Hook
 * Provides state management and API calls for AI-powered features
 */

import { useState, useEffect, useCallback } from 'react';

const useAI = () => {
  const [insights, setInsights] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [salesPrediction, setSalesPrediction] = useState(null);
  const [expensePrediction, setExpensePrediction] = useState(null);
  const [workingCapital, setWorkingCapital] = useState(null);
  const [categorizationSuggestions, setCategorizationSuggestions] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize AI service
  const initialize = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.ai.initialize();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get AI insights
  const getInsights = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.ai.getInsights();
      setInsights(data);
      setAnomalies(data.anomalies || []);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get cash flow forecast
  const getForecast = useCallback(async (days = 30) => {
    try {
      setLoading(true);
      const data = await window.api.ai.getForecast(days);
      setForecast(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get sales prediction
  const getSalesPrediction = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.ai.getSalesPrediction();
      setSalesPrediction(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get expense prediction
  const getExpensePrediction = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.ai.getExpensePrediction();
      setExpensePrediction(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get working capital analysis
  const getWorkingCapital = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.ai.getWorkingCapital();
      setWorkingCapital(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-categorize transactions
  const autoCategorize = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.ai.autoCategorize();
      setCategorizationSuggestions(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Apply category suggestion
  const applyCategory = useCallback(async (transactionId, category) => {
    try {
      setLoading(true);
      await window.api.ai.applyCategory(transactionId, category);
      // Remove the applied suggestion
      setCategorizationSuggestions(prev => 
        prev.filter(s => s.transactionId !== transactionId)
      );
      return { success: true };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Dismiss categorization suggestion
  const dismissSuggestion = useCallback(async (transactionId) => {
    setCategorizationSuggestions(prev => 
      prev.filter(s => s.transactionId !== transactionId)
    );
  }, []);

  // Detect anomalies
  const detectAnomalies = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.ai.detectAnomalies();
      setAnomalies(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Dismiss anomaly
  const dismissAnomaly = useCallback(async (anomalyId) => {
    setAnomalies(prev => 
      prev.filter(a => a.transactionId !== anomalyId && a.id !== anomalyId)
    );
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await initialize();
        await Promise.all([
          getInsights(),
          getForecast(30),
          getSalesPrediction(),
          getExpensePrediction(),
          getWorkingCapital(),
          autoCategorize(),
          detectAnomalies()
        ]);
      } catch (err) {
        console.error('Error loading initial AI data:', err);
      }
    };
    
    loadInitialData();
  }, [initialize, getInsights, getForecast, getSalesPrediction, getExpensePrediction, getWorkingCapital, autoCategorize, detectAnomalies]);

  return {
    // State
    insights,
    forecast,
    salesPrediction,
    expensePrediction,
    workingCapital,
    categorizationSuggestions,
    anomalies,
    loading,
    error,
    
    // Actions
    initialize,
    getInsights,
    getForecast,
    getSalesPrediction,
    getExpensePrediction,
    getWorkingCapital,
    autoCategorize,
    applyCategory,
    dismissSuggestion,
    detectAnomalies,
    dismissAnomaly,
    clearError
  };
};

export default useAI;
