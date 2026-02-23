import { useState, useEffect, useCallback } from 'react';

const useApiGateway = () => {
  const [config, setConfig] = useState({
    port: 8765,
    rateLimit: 60,
    enabled: false,
    oauth: {}
  });
  const [apiKeys, setApiKeys] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    requestsToday: 0,
    totalRequests: 0,
    activeKeys: 0,
    totalKeys: 0,
    avgResponseTime: 0
  });
  const [endpoints, setEndpoints] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch config
  const fetchConfig = useCallback(async () => {
    try {
      const data = await window.api.apiGateway.getConfig();
      setConfig(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to fetch config');
      throw err;
    }
  }, []);

  // Update config
  const updateConfig = useCallback(async (newConfig) => {
    setIsLoading(true);
    setError(null);
    try {
      const updated = await window.api.apiGateway.updateConfig(newConfig);
      setConfig(updated);
      return updated;
    } catch (err) {
      setError(err.message || 'Failed to update config');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch API keys
  const fetchApiKeys = useCallback(async () => {
    try {
      const data = await window.api.apiGateway.getKeys();
      setApiKeys(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to fetch API keys');
      throw err;
    }
  }, []);

  // Generate API key
  const generateApiKey = useCallback(async (name, permissions = ['read']) => {
    setIsLoading(true);
    setError(null);
    try {
      const newKey = await window.api.apiGateway.generateKey(name, permissions);
      setApiKeys(prev => [...prev, { ...newKey, plainKey: undefined }]);
      return newKey; // Returns plain key only once
    } catch (err) {
      setError(err.message || 'Failed to generate API key');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Revoke API key
  const revokeApiKey = useCallback(async (id) => {
    setIsLoading(true);
    setError(null);
    try {
      await window.api.apiGateway.revokeApiKey(id);
      setApiKeys(prev => prev.map(k => k.id === id ? { ...k, isActive: false } : k));
    } catch (err) {
      setError(err.message || 'Failed to revoke API key');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch webhooks
  const fetchWebhooks = useCallback(async () => {
    try {
      const data = await window.api.apiGateway.getWebhooks();
      setWebhooks(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to fetch webhooks');
      throw err;
    }
  }, []);

  // Create webhook
  const createWebhook = useCallback(async (webhookData) => {
    setIsLoading(true);
    setError(null);
    try {
      const newWebhook = await window.api.apiGateway.createWebhook(webhookData);
      setWebhooks(prev => [...prev, newWebhook]);
      return newWebhook;
    } catch (err) {
      setError(err.message || 'Failed to create webhook');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update webhook
  const updateWebhook = useCallback(async (id, updates) => {
    setIsLoading(true);
    setError(null);
    try {
      const updated = await window.api.apiGateway.updateWebhook(id, updates);
      setWebhooks(prev => prev.map(w => w.id === id ? updated : w));
      return updated;
    } catch (err) {
      setError(err.message || 'Failed to update webhook');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete webhook
  const deleteWebhook = useCallback(async (id) => {
    setIsLoading(true);
    setError(null);
    try {
      await window.api.apiGateway.deleteWebhook(id);
      setWebhooks(prev => prev.filter(w => w.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete webhook');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Test webhook
  const testWebhook = useCallback(async (id) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.api.apiGateway.testWebhook(id);
      return result;
    } catch (err) {
      setError(err.message || 'Failed to test webhook');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async (limit = 50) => {
    try {
      const data = await window.api.apiGateway.getLogs(limit);
      setLogs(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to fetch logs');
      throw err;
    }
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const data = await window.api.apiGateway.getUsageStats();
      setStats(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to fetch stats');
      throw err;
    }
  }, []);

  // Fetch endpoints
  const fetchEndpoints = useCallback(async () => {
    try {
      const data = await window.api.apiGateway.getEndpoints();
      setEndpoints(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to fetch endpoints');
      throw err;
    }
  }, []);

  // OAuth functions
  const saveOAuth = useCallback(async (provider, tokenData) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.api.apiGateway.saveOAuth(provider, tokenData);
      await fetchConfig();
      return result;
    } catch (err) {
      setError(err.message || 'Failed to save OAuth token');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchConfig]);

  const getOAuthStatus = useCallback(async (provider) => {
    try {
      return await window.api.apiGateway.getOAuthStatus(provider);
    } catch (err) {
      setError(err.message || 'Failed to get OAuth status');
      throw err;
    }
  }, []);

  const disconnectOAuth = useCallback(async (provider) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.api.apiGateway.disconnectOAuth(provider);
      await fetchConfig();
      return result;
    } catch (err) {
      setError(err.message || 'Failed to disconnect OAuth');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchConfig]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize data
  useEffect(() => {
    fetchConfig();
    fetchApiKeys();
    fetchWebhooks();
    fetchLogs();
    fetchStats();
    fetchEndpoints();
  }, [fetchConfig, fetchApiKeys, fetchWebhooks, fetchLogs, fetchStats, fetchEndpoints]);

  return {
    // State
    config,
    apiKeys,
    webhooks,
    logs,
    stats,
    endpoints,
    isLoading,
    error,
    
    // Config
    fetchConfig,
    updateConfig,
    
    // API Keys
    fetchApiKeys,
    generateApiKey,
    revokeApiKey,
    
    // Webhooks
    fetchWebhooks,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    testWebhook,
    
    // Logs & Stats
    fetchLogs,
    fetchStats,
    
    // Endpoints
    fetchEndpoints,
    
    // OAuth
    saveOAuth,
    getOAuthStatus,
    disconnectOAuth,
    
    // Helpers
    clearError
  };
};

export default useApiGateway;
