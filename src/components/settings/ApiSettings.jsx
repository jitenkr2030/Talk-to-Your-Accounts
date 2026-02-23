import React, { useState, useEffect } from 'react';
import useApiGateway from '../../hooks/useApiGateway';

const ApiSettings = () => {
  const {
    config,
    apiKeys,
    webhooks,
    logs,
    stats,
    endpoints,
    isLoading,
    error,
    updateConfig,
    generateApiKey,
    revokeApiKey,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    testWebhook,
    fetchLogs,
    fetchStats,
    clearError
  } = useApiGateway();

  const [activeTab, setActiveTab] = useState('keys');
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [showNewWebhookModal, setShowNewWebhookModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState(['read']);
  const [newWebhookData, setNewWebhookData] = useState({
    name: '',
    url: '',
    events: ['transaction.created']
  });
  const [newlyCreatedKey, setNewlyCreatedKey] = useState(null);
  const [serverConfig, setServerConfig] = useState(config);

  useEffect(() => {
    setServerConfig(config);
  }, [config]);

  const handleCreateKey = async (e) => {
    e.preventDefault();
    try {
      const key = await generateApiKey(newKeyName, newKeyPermissions);
      setNewlyCreatedKey(key);
      setShowNewKeyModal(false);
      setNewKeyName('');
      setNewKeyPermissions(['read']);
    } catch (err) {
      alert(err.message || 'Failed to create API key');
    }
  };

  const handleCreateWebhook = async (e) => {
    e.preventDefault();
    try {
      await createWebhook(newWebhookData);
      setShowNewWebhookModal(false);
      setNewWebhookData({ name: '', url: '', events: ['transaction.created'] });
    } catch (err) {
      alert(err.message || 'Failed to create webhook');
    }
  };

  const handleRevokeKey = async (id) => {
    if (window.confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      try {
        await revokeApiKey(id);
      } catch (err) {
        alert(err.message || 'Failed to revoke API key');
      }
    }
  };

  const handleDeleteWebhook = async (id) => {
    if (window.confirm('Are you sure you want to delete this webhook?')) {
      try {
        await deleteWebhook(id);
      } catch (err) {
        alert(err.message || 'Failed to delete webhook');
      }
    }
  };

  const handleTestWebhook = async (id) => {
    try {
      const result = await testWebhook(id);
      alert(result.success ? 'Test webhook sent successfully!' : 'Failed to send test webhook');
    } catch (err) {
      alert(err.message || 'Failed to test webhook');
    }
  };

  const handleToggleWebhook = async (webhook) => {
    try {
      await updateWebhook(webhook.id, { isActive: !webhook.isActive });
    } catch (err) {
      alert(err.message || 'Failed to update webhook');
    }
  };

  const handleSaveConfig = async () => {
    try {
      await updateConfig(serverConfig);
      alert('Configuration saved successfully');
    } catch (err) {
      alert(err.message || 'Failed to save configuration');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const getMethodBadgeClass = (method) => {
    const classes = {
      GET: 'bg-green-100 text-green-800',
      POST: 'bg-blue-100 text-blue-800',
      PUT: 'bg-yellow-100 text-yellow-800',
      DELETE: 'bg-red-100 text-red-800'
    };
    return classes[method] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">API & Integrations</h1>
        <p className="text-gray-500 mt-1">Manage API keys, webhooks, and third-party integrations</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-500 hover:text-red-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'keys', label: 'API Keys' },
            { id: 'webhooks', label: 'Webhooks' },
            { id: 'docs', label: 'Documentation' },
            { id: 'logs', label: 'Logs' },
            { id: 'settings', label: 'Settings' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* API Keys Tab */}
      {activeTab === 'keys' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">API Keys</h2>
            <button
              onClick={() => setShowNewKeyModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Generate New Key
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Active Keys</div>
              <div className="text-2xl font-bold text-green-600">{stats.activeKeys}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Requests Today</div>
              <div className="text-2xl font-bold text-blue-600">{stats.requestsToday}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Total Requests</div>
              <div className="text-2xl font-bold text-gray-600">{stats.totalRequests}</div>
            </div>
          </div>

          {/* Keys Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permissions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {apiKeys.map(key => (
                  <tr key={key.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{key.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                      {key.keyPrefix}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {key.permissions?.join(', ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${key.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {key.isActive ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {key.isActive && (
                        <button
                          onClick={() => handleRevokeKey(key.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {apiKeys.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No API keys yet. Generate your first key to get started.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Webhooks</h2>
            <button
              onClick={() => setShowNewWebhookModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Webhook
            </button>
          </div>

          <div className="grid gap-4">
            {webhooks.map(webhook => (
              <div key={webhook.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-800">{webhook.name}</h3>
                    <p className="text-sm text-gray-500 font-mono mt-1">{webhook.url}</p>
                    <div className="flex gap-2 mt-2">
                      {webhook.events.map(event => (
                        <span key={event} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          {event}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={webhook.isActive}
                        onChange={() => handleToggleWebhook(webhook)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                    <button
                      onClick={() => handleTestWebhook(webhook.id)}
                      className="text-blue-600 hover:text-blue-900 text-sm"
                    >
                      Test
                    </button>
                    <button
                      onClick={() => handleDeleteWebhook(webhook.id)}
                      className="text-red-600 hover:text-red-900 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Last triggered: {webhook.lastTriggeredAt ? new Date(webhook.lastTriggeredAt).toLocaleString() : 'Never'}
                </div>
              </div>
            ))}
            {webhooks.length === 0 && (
              <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
                No webhooks configured. Add a webhook to receive real-time notifications.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Documentation Tab */}
      {activeTab === 'docs' && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">API Documentation</h2>
          
          <div className="bg-gray-900 rounded-lg p-6 text-gray-300 font-mono text-sm overflow-auto max-h-[600px]">
            <div className="mb-4">
              <span className="text-green-400"># Talk-to-Your-Accounts API</span>
            </div>
            <div className="mb-4 text-gray-400">
              Base URL: <span className="text-yellow-400">http://localhost:{serverConfig.port}/api/v1</span>
            </div>
            
            {endpoints.map(category => (
              <div key={category.category} className="mb-6">
                <div className="text-blue-400 font-semibold mb-2">## {category.category}</div>
                {category.endpoints.map((endpoint, idx) => (
                  <div key={idx} className="mb-4 pl-4">
                    <div>
                      <span className={`px-2 py-0.5 text-xs rounded mr-2 ${getMethodBadgeClass(endpoint.method)}`}>
                        {endpoint.method}
                      </span>
                      <span className="text-yellow-300">{endpoint.path}</span>
                    </div>
                    <div className="text-gray-400 mt-1 pl-24">{endpoint.description}</div>
                    {endpoint.params && (
                      <div className="pl-24 mt-2">
                        <div className="text-gray-500 text-xs">Parameters:</div>
                        {endpoint.params.map((param, pIdx) => (
                          <div key={pIdx} className="text-gray-400 text-xs">
                            - {param.name} ({param.type}){param.required ? ' *' : ''}: {param.description}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
            
            <div className="mt-6 pt-4 border-t border-gray-700">
              <div className="text-blue-400 font-semibold mb-2">## Authentication</div>
              <div className="text-gray-400">
                All API requests require an API key in the header:<br/>
                <span className="text-yellow-300">x-api-key: YOUR_API_KEY</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">API Request Logs</h2>
            <button
              onClick={() => { fetchLogs(); fetchStats(); }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Refresh
            </button>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-auto max-h-[500px]">
            {logs.map(log => (
              <div key={log.id} className="py-1 border-b border-gray-800 last:border-0">
                <span className={`px-2 py-0.5 text-xs rounded mr-2 ${getMethodBadgeClass(log.method)}`}>
                  {log.method || 'GET'}
                </span>
                <span className="text-yellow-300">{log.path || log.endpoint || '/'}</span>
                <span className="text-gray-500 ml-2">{log.statusCode || 200}</span>
                <span className="text-gray-600 ml-2">{log.responseTime || 0}ms</span>
                <span className="text-gray-600 ml-2">{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No API requests logged yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Server Configuration</h2>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 max-w-xl">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Server Port</label>
                <input
                  type="number"
                  value={serverConfig.port}
                  onChange={(e) => setServerConfig(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Port for the local API server (default: 8765)</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate Limit (requests/min)</label>
                <input
                  type="number"
                  value={serverConfig.rateLimit}
                  onChange={(e) => setServerConfig(prev => ({ ...prev, rateLimit: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Maximum requests per minute per API key</p>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="serverEnabled"
                  checked={serverConfig.enabled}
                  onChange={(e) => setServerConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="serverEnabled" className="ml-2 text-sm text-gray-700">
                  Enable API Server
                </label>
              </div>
              
              <button
                onClick={handleSaveConfig}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mt-4"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Key Modal */}
      {showNewKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Generate New API Key</h3>
            </div>
            <form onSubmit={handleCreateKey} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Key Name</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., Production API"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Permissions</label>
                <div className="space-y-2">
                  {['read', 'write', 'delete'].map(perm => (
                    <label key={perm} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newKeyPermissions.includes(perm)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewKeyPermissions(prev => [...prev, perm]);
                          } else {
                            setNewKeyPermissions(prev => prev.filter(p => p !== perm));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">{perm}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewKeyModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Generate Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Newly Created Key Modal */}
      {newlyCreatedKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">API Key Created</h3>
            </div>
            <div className="p-6">
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mb-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <div className="font-medium">Save this key now!</div>
                    <div className="text-sm">This is the only time you'll see it.</div>
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Your API Key</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newlyCreatedKey.plainKey}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm bg-gray-50"
                  />
                  <button
                    onClick={() => copyToClipboard(newlyCreatedKey.plainKey)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <button
                onClick={() => setNewlyCreatedKey(null)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                I've Saved My Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Webhook Modal */}
      {showNewWebhookModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Add Webhook</h3>
            </div>
            <form onSubmit={handleCreateWebhook} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newWebhookData.name}
                  onChange={(e) => setNewWebhookData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., Slack Notifications"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
                <input
                  type="url"
                  value={newWebhookData.url}
                  onChange={(e) => setNewWebhookData(prev => ({ ...prev, url: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="https://..."
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Events</label>
                <div className="space-y-2">
                  {['transaction.created', 'transaction.updated', 'party.created', 'inventory.low'].map(event => (
                    <label key={event} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newWebhookData.events.includes(event)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewWebhookData(prev => ({ ...prev, events: [...prev.events, event] }));
                          } else {
                            setNewWebhookData(prev => ({ ...prev, events: prev.events.filter(e => e !== event) }));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{event}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewWebhookModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Add Webhook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiSettings;
