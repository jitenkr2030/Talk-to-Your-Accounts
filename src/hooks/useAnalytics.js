import { useState, useEffect, useCallback } from 'react';

const useAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    fromDate: null,
    toDate: null
  });

  // Generate analytics
  const generateAnalytics = useCallback(async (filterOptions = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const filterParams = { ...filters, ...filterOptions };
      const data = await window.api.analytics.generate(filterParams);
      setAnalyticsData(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to generate analytics');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Get cached analytics
  const getCachedAnalytics = useCallback(async () => {
    try {
      const data = await window.api.analytics.getCached();
      if (data) {
        setAnalyticsData(data);
      }
      return data;
    } catch (err) {
      console.error('Error getting cached analytics:', err);
      return null;
    }
  }, []);

  // Clear cache
  const clearCache = useCallback(async () => {
    setIsLoading(true);
    try {
      await window.api.analytics.clearCache();
      setAnalyticsData(null);
    } catch (err) {
      setError(err.message || 'Failed to clear cache');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get cash flow forecast only
  const getCashFlowForecast = useCallback(async (filterOptions = {}) => {
    try {
      return await window.api.analytics.getCashFlowForecast(filterOptions);
    } catch (err) {
      setError(err.message || 'Failed to get cash flow forecast');
      throw err;
    }
  }, []);

  // Detect anomalies only
  const detectAnomalies = useCallback(async (filterOptions = {}) => {
    try {
      return await window.api.analytics.detectAnomalies(filterOptions);
    } catch (err) {
      setError(err.message || 'Failed to detect anomalies');
      throw err;
    }
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize - try to get cached data first
  useEffect(() => {
    const init = async () => {
      const cached = await getCachedAnalytics();
      if (!cached) {
        // If no cached data, generate new analytics
        await generateAnalytics();
      }
    };
    init();
  }, []);

  return {
    // State
    analyticsData,
    isLoading,
    error,
    filters,
    
    // Data subsets
    cashFlow: analyticsData?.cashFlow,
    sales: analyticsData?.sales,
    expenses: analyticsData?.expenses,
    anomalies: analyticsData?.anomalies,
    insights: analyticsData?.insights,
    
    // Functions
    generateAnalytics,
    getCachedAnalytics,
    clearCache,
    getCashFlowForecast,
    detectAnomalies,
    updateFilters,
    clearError
  };
};

export default useAnalytics;
