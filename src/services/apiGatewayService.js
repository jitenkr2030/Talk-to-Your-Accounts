const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// File paths for data storage
const DATA_DIR = path.join(__dirname, '../../data');
const API_KEYS_FILE = path.join(DATA_DIR, 'api-keys.json');
const WEBHOOKS_FILE = path.join(DATA_DIR, 'webhooks.json');
const API_LOGS_FILE = path.join(DATA_DIR, 'api-logs.json');
const API_CONFIG_FILE = path.join(DATA_DIR, 'api-config.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize files if they don't exist
if (!fs.existsSync(API_KEYS_FILE)) {
  fs.writeFileSync(API_KEYS_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(WEBHOOKS_FILE)) {
  fs.writeFileSync(WEBHOOKS_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(API_LOGS_FILE)) {
  fs.writeFileSync(API_LOGS_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(API_CONFIG_FILE)) {
  fs.writeFileSync(API_CONFIG_FILE, JSON.stringify({
    port: 8765,
    rateLimit: 60,
    enabled: false,
    oauth: {}
  }, null, 2));
}

// Helper functions
const readJsonFile = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const writeJsonFile = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Generate secure API key
const generateApiKey = () => {
  return 'tka_' + crypto.randomBytes(24).toString('hex');
};

// Hash API key for storage
const hashApiKey = (key) => {
  return crypto.createHash('sha256').update(key).digest('hex');
};

class ApiGatewayService {
  // Get API configuration
  async getConfig() {
    return readJsonFile(API_CONFIG_FILE);
  }

  // Update API configuration
  async updateConfig(config) {
    const currentConfig = readJsonFile(API_CONFIG_FILE);
    const newConfig = { ...currentConfig, ...config };
    writeJsonFile(API_CONFIG_FILE, newConfig);
    return newConfig;
  }

  // Generate new API key
  async generateApiKey(name, permissions = ['read']) {
    const keys = readJsonFile(API_KEYS_FILE);
    
    const plainKey = generateApiKey();
    const keyHash = hashApiKey(plainKey);
    
    const newKey = {
      id: uuidv4(),
      name,
      keyPrefix: plainKey.substring(0, 8) + '...',
      keyHash,
      permissions,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      requestCount: 0
    };
    
    keys.push(newKey);
    writeJsonFile(API_KEYS_FILE, keys);
    
    // Return plain key only once
    return {
      ...newKey,
      plainKey
    };
  }

  // Get all API keys
  async getApiKeys() {
    const keys = readJsonFile(API_KEYS_FILE);
    // Don't return plain keys
    return keys.map(({ keyHash, ...key }) => key);
  }

  // Revoke API key
  async revokeApiKey(id) {
    const keys = readJsonFile(API_KEYS_FILE);
    const index = keys.findIndex(k => k.id === id);
    
    if (index === -1) {
      throw new Error('API key not found');
    }
    
    keys[index].isActive = false;
    writeJsonFile(API_KEYS_FILE, keys);
    
    return { success: true, message: 'API key revoked successfully' };
  }

  // Validate API key
  async validateApiKey(plainKey) {
    const keys = readJsonFile(API_KEYS_FILE);
    const keyHash = hashApiKey(plainKey);
    
    const key = keys.find(k => k.keyHash === keyHash && k.isActive);
    
    if (!key) {
      return { valid: false };
    }
    
    // Update last used and request count
    key.lastUsedAt = new Date().toISOString();
    key.requestCount = (key.requestCount || 0) + 1;
    writeJsonFile(API_KEYS_FILE, keys);
    
    return {
      valid: true,
      keyId: key.id,
      permissions: key.permissions
    };
  }

  // Create webhook
  async createWebhook(webhookData) {
    const webhooks = readJsonFile(WEBHOOKS_FILE);
    
    const newWebhook = {
      id: uuidv4(),
      name: webhookData.name,
      url: webhookData.url,
      events: webhookData.events || ['transaction.created'],
      isActive: true,
      createdAt: new Date().toISOString(),
      lastTriggeredAt: null,
      failureCount: 0
    };
    
    webhooks.push(newWebhook);
    writeJsonFile(WEBHOOKS_FILE, webhooks);
    
    return newWebhook;
  }

  // Get all webhooks
  async getWebhooks() {
    return readJsonFile(WEBHOOKS_FILE);
  }

  // Update webhook
  async updateWebhook(id, updates) {
    const webhooks = readJsonFile(WEBHOOKS_FILE);
    const index = webhooks.findIndex(w => w.id === id);
    
    if (index === -1) {
      throw new Error('Webhook not found');
    }
    
    webhooks[index] = { ...webhooks[index], ...updates };
    writeJsonFile(WEBHOOKS_FILE, webhooks);
    
    return webhooks[index];
  }

  // Delete webhook
  async deleteWebhook(id) {
    const webhooks = readJsonFile(WEBHOOKS_FILE);
    const filtered = webhooks.filter(w => w.id !== id);
    writeJsonFile(WEBHOOKS_FILE, filtered);
    
    return { success: true, message: 'Webhook deleted successfully' };
  }

  // Test webhook
  async testWebhook(id) {
    const webhooks = readJsonFile(WEBHOOKS_FILE);
    const webhook = webhooks.find(w => w.id === id);
    
    if (!webhook) {
      throw new Error('Webhook not found');
    }
    
    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from Talk-to-Your-Accounts'
      }
    };
    
    try {
      // In production, use axios or node-fetch
      // For now, simulate the test
      console.log('Testing webhook:', webhook.url, testPayload);
      
      return {
        success: true,
        message: 'Test webhook sent successfully',
        payload: testPayload
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send test webhook: ' + error.message
      };
    }
  }

  // Trigger webhook for an event
  async triggerWebhook(event, data) {
    const webhooks = readJsonFile(WEBHOOKS_FILE);
    const activeWebhooks = webhooks.filter(w => w.isActive && w.events.includes(event));
    
    const results = [];
    
    for (const webhook of activeWebhooks) {
      try {
        const payload = {
          event,
          timestamp: new Date().toISOString(),
          data
        };
        
        console.log(`Triggering webhook ${webhook.url} for event ${event}:`, payload);
        
        // Update last triggered
        webhook.lastTriggeredAt = new Date().toISOString();
        webhook.failureCount = 0;
        
        results.push({
          webhookId: webhook.id,
          success: true
        });
      } catch (error) {
        webhook.failureCount = (webhook.failureCount || 0) + 1;
        
        results.push({
          webhookId: webhook.id,
          success: false,
          error: error.message
        });
      }
    }
    
    writeJsonFile(WEBHOOKS_FILE, webhooks);
    
    return results;
  }

  // Log API request
  async logRequest(logData) {
    const logs = readJsonFile(API_LOGS_FILE);
    
    const newLog = {
      id: uuidv4(),
      ...logData,
      timestamp: new Date().toISOString()
    };
    
    // Keep only last 1000 logs
    logs.unshift(newLog);
    if (logs.length > 1000) {
      logs.pop();
    }
    
    writeJsonFile(API_LOGS_FILE, logs);
    
    return newLog;
  }

  // Get API logs
  async getLogs(limit = 50) {
    const logs = readJsonFile(API_LOGS_FILE);
    return logs.slice(0, limit);
  }

  // Get API usage stats
  async getUsageStats() {
    const keys = readJsonFile(API_KEYS_FILE);
    const logs = readJsonFile(API_LOGS_FILE);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const requestsToday = logs.filter(l => new Date(l.timestamp) >= today).length;
    const totalRequests = logs.length;
    
    const activeKeys = keys.filter(k => k.isActive).length;
    const totalKeys = keys.length;
    
    return {
      requestsToday,
      totalRequests,
      activeKeys,
      totalKeys,
      avgResponseTime: logs.reduce((sum, l) => sum + (l.responseTime || 0), 0) / Math.max(logs.length, 1)
    };
  }

  // Get available API endpoints (documentation)
  getApiEndpoints() {
    return [
      {
        category: 'Transactions',
        endpoints: [
          {
            method: 'GET',
            path: '/api/v1/transactions',
            description: 'Get all transactions with optional filters',
            params: [
              { name: 'type', type: 'string', required: false, description: 'Filter by voucher type' },
              { name: 'fromDate', type: 'string', required: false, description: 'Start date (YYYY-MM-DD)' },
              { name: 'toDate', type: 'string', required: false, description: 'End date (YYYY-MM-DD)' },
              { name: 'page', type: 'number', required: false, description: 'Page number' },
              { name: 'limit', type: 'number', required: false, description: 'Items per page (max 100)' }
            ]
          },
          {
            method: 'GET',
            path: '/api/v1/transactions/:id',
            description: 'Get a single transaction by ID'
          },
          {
            method: 'POST',
            path: '/api/v1/transactions',
            description: 'Create a new transaction',
            body: {
              voucherType: 'string (required)',
              date: 'string (YYYY-MM-DD)',
              party: 'string',
              items: 'array',
              totalAmount: 'number'
            }
          }
        ]
      },
      {
        category: 'Parties',
        endpoints: [
          {
            method: 'GET',
            path: '/api/v1/parties',
            description: 'Get all parties (customers/vendors)'
          },
          {
            method: 'GET',
            path: '/api/v1/parties/:id',
            description: 'Get party by ID'
          },
          {
            method: 'POST',
            path: '/api/v1/parties',
            description: 'Create a new party'
          }
        ]
      },
      {
        category: 'Inventory',
        endpoints: [
          {
            method: 'GET',
            path: '/api/v1/products',
            description: 'Get all products'
          },
          {
            method: 'GET',
            path: '/api/v1/products/:id',
            description: 'Get product by ID'
          }
        ]
      },
      {
        category: 'Reports',
        endpoints: [
          {
            method: 'GET',
            path: '/api/v1/reports/balance-sheet',
            description: 'Get balance sheet'
          },
          {
            method: 'GET',
            path: '/api/v1/reports/profit-loss',
            description: 'Get profit & loss statement'
          },
          {
            method: 'GET',
            path: '/api/v1/reports/gst-summary',
            description: 'Get GST summary'
          }
        ]
      },
      {
        category: 'Webhooks',
        endpoints: [
          {
            method: 'POST',
            path: '/api/v1/webhooks/test',
            description: 'Test webhook configuration'
          }
        ]
      }
    ];
  }

  // OAuth management
  async saveOAuthToken(provider, tokenData) {
    const config = readJsonFile(API_CONFIG_FILE);
    
    config.oauth = config.oauth || {};
    config.oauth[provider] = {
      ...tokenData,
      savedAt: new Date().toISOString()
    };
    
    writeJsonFile(API_CONFIG_FILE, config);
    
    return { success: true, message: `OAuth token saved for ${provider}` };
  }

  // Get OAuth status
  async getOAuthStatus(provider) {
    const config = readJsonFile(API_CONFIG_FILE);
    const oauth = config.oauth || {};
    
    return {
      connected: !!oauth[provider],
      savedAt: oauth[provider]?.savedAt
    };
  }

  // Disconnect OAuth
  async disconnectOAuth(provider) {
    const config = readJsonFile(API_CONFIG_FILE);
    
    if (config.oauth && config.oauth[provider]) {
      delete config.oauth[provider];
      writeJsonFile(API_CONFIG_FILE, config);
    }
    
    return { success: true, message: `OAuth disconnected for ${provider}` };
  }
}

module.exports = new ApiGatewayService();
