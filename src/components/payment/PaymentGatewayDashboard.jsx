/**
 * Payment Gateway Dashboard Component
 * 
 * Provides comprehensive payment gateway management including:
 * - Gateway configuration
 * - Payment transactions
 * - Payment links
 * - Refund management
 * - Webhook logs
 */

import { useState, useEffect } from 'react';
import usePaymentGateway from '../../hooks/usePaymentGateway';

const PaymentGatewayDashboard = () => {
  const [activeTab, setActiveTab] = useState('transactions');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  
  const {
    loading,
    error,
    gateways,
    activeGateway,
    transactions,
    paymentSummary,
    webhookLogs,
    getConfig,
    getActiveGateway,
    saveConfig,
    setGatewayStatus,
    getTransactions,
    getPaymentSummary,
    processRefund,
    getWebhookLogs,
    testConnection,
    clearError
  } = usePaymentGateway();

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    await Promise.all([
      getConfig(),
      getActiveGateway(),
      getTransactions({}),
      getPaymentSummary(),
      getWebhookLogs()
    ]);
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '₹0';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-IN');
  };

  // Render transactions tab
  const renderTransactions = () => (
    <div className="transactions-view">
      {/* Summary Cards */}
      {paymentSummary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Total Collected</p>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(paymentSummary.total_collected)}</p>
          </div>
          <div className="card" style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Pending</p>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(paymentSummary.total_pending)}</p>
          </div>
          <div className="card" style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Failed</p>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>{formatCurrency(paymentSummary.total_failed)}</p>
          </div>
          <div className="card" style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Refunded</p>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#6b7280' }}>{formatCurrency(paymentSummary.total_refunded)}</p>
          </div>
        </div>
      )}
      
      {transactions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <p>No payment transactions yet.</p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Invoice</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Payment ID</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Method</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn) => (
              <tr key={txn.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem' }}>{formatDate(txn.created_at)}</td>
                <td style={{ padding: '0.75rem' }}>{txn.voucher_number || 'N/A'}</td>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.75rem' }}>{txn.payment_id}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>{formatCurrency(txn.amount)}</td>
                <td style={{ padding: '0.75rem' }}>{txn.payment_method || 'N/A'}</td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px',
                    background: txn.status === 'succeeded' ? '#dcfce7' : 
                               txn.status === 'pending' ? '#fef3c7' :
                               txn.status === 'failed' ? '#fee2e2' : '#e5e7eb',
                    color: txn.status === 'succeeded' ? '#166534' : 
                           txn.status === 'pending' ? '#92400e' :
                           txn.status === 'failed' ? '#dc2626' : '#374151',
                    fontSize: '0.75rem'
                  }}>
                    {txn.status}
                  </span>
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                  {txn.status === 'succeeded' && (
                    <button 
                      onClick={() => {
                        setSelectedTransaction(txn);
                        setShowRefundModal(true);
                      }}
                      style={{ 
                        padding: '0.25rem 0.5rem', 
                        background: '#6b7280', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                    >
                      Refund
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  // Render settings tab
  const renderSettings = () => (
    <div className="settings-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>Gateway Configuration</h3>
        <button 
          onClick={() => setShowConfigModal(true)}
          style={{ 
            padding: '0.5rem 1rem', 
            background: '#3b82f6', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px', 
            cursor: 'pointer'
          }}
        >
          + Add Gateway
        </button>
      </div>
      
      {gateways.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <p>No payment gateways configured.</p>
          <button 
            onClick={() => setShowConfigModal(true)}
            style={{ 
              marginTop: '1rem',
              padding: '0.5rem 1rem', 
              background: '#3b82f6', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer'
            }}
          >
            Configure Your First Gateway
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {gateways.map((gateway) => (
            <div 
              key={gateway.id} 
              className="card" 
              style={{ 
                padding: '1.5rem', 
                borderRadius: '8px', 
                border: '1px solid #e5e7eb',
                background: gateway.is_default ? '#f0f9ff' : 'white'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h4 style={{ margin: 0 }}>{gateway.gateway_name}</h4>
                    {gateway.is_default && (
                      <span style={{ 
                        padding: '0.125rem 0.5rem', 
                        background: '#3b82f6', 
                        color: 'white', 
                        borderRadius: '4px',
                        fontSize: '0.625rem'
                      }}>
                        DEFAULT
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                    {gateway.merchant_id ? `Merchant ID: ${gateway.merchant_id}` : 'Not configured'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => testConnection(gateway.id)}
                    style={{ 
                      padding: '0.5rem 1rem', 
                      background: '#6b7280', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '6px', 
                      cursor: 'pointer'
                    }}
                  >
                    Test
                  </button>
                  <button 
                    onClick={() => setGatewayStatus(gateway.id, !gateway.is_active)}
                    style={{ 
                      padding: '0.5rem 1rem', 
                      background: gateway.is_active ? '#ef4444' : '#10b981', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '6px', 
                      cursor: 'pointer'
                    }}
                  >
                    {gateway.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render webhooks tab
  const renderWebhooks = () => (
    <div className="webhooks-view">
      <h3>Webhook Logs</h3>
      {webhookLogs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <p>No webhook events received yet.</p>
        </div>
      ) : (
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {webhookLogs.map((log) => (
            <div 
              key={log.id} 
              style={{ 
                padding: '1rem', 
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}
            >
              <div>
                <p style={{ margin: 0, fontWeight: '600' }}>{log.event_type}</p>
                <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.75rem' }}>
                  {log.gateway_name || 'Unknown Gateway'}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ 
                  padding: '0.125rem 0.5rem', 
                  borderRadius: '4px',
                  background: log.signature_valid ? '#dcfce7' : '#fee2e2',
                  color: log.signature_valid ? '#166534' : '#dc2626',
                  fontSize: '0.75rem'
                }}>
                  {log.signature_valid ? 'Valid' : 'Invalid'}
                </span>
                <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.75rem' }}>
                  {formatDate(log.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="payment-dashboard" style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>Payment Gateway</h2>
        <p style={{ margin: 0, color: '#6b7280' }}>
          Manage payment collection and transactions
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ 
          padding: '1rem', 
          background: '#fef2f2', 
          border: '1px solid #ef4444', 
          borderRadius: '8px', 
          marginBottom: '1rem',
          color: '#ef4444'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button onClick={clearError} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}>&times;</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        borderBottom: '2px solid #e5e7eb', 
        marginBottom: '2rem' 
      }}>
        {[
          { id: 'transactions', label: 'Transactions' },
          { id: 'settings', label: 'Gateway Settings' },
          { id: 'webhooks', label: 'Webhook Logs' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? '600' : '400',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p>Loading...</p>
          </div>
        ) : (
          <>
            {activeTab === 'transactions' && renderTransactions()}
            {activeTab === 'settings' && renderSettings()}
            {activeTab === 'webhooks' && renderWebhooks()}
          </>
        )}
      </div>

      {/* Config Modal */}
      {showConfigModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            width: '500px'
          }}>
            <h3 style={{ margin: '0 0 1.5rem 0' }}>Configure Payment Gateway</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const result = await saveConfig({
                gateway_name: formData.get('gateway_name'),
                api_key: formData.get('api_key'),
                api_secret: formData.get('api_secret'),
                webhook_secret: formData.get('webhook_secret'),
                merchant_id: formData.get('merchant_id'),
                is_default: formData.get('is_default') === 'on'
              });
              if (result.success) {
                setShowConfigModal(false);
              }
            }}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <select name="gateway_name" required style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                  <option value="">Select Gateway</option>
                  <option value="razorpay">Razorpay</option>
                  <option value="stripe">Stripe</option>
                  <option value="paypal">PayPal</option>
                </select>
                <input name="api_key" placeholder="API Key" style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                <input name="api_secret" placeholder="API Secret" type="password" style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                <input name="webhook_secret" placeholder="Webhook Secret" style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                <input name="merchant_id" placeholder="Merchant ID (optional)" style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input name="is_default" type="checkbox" />
                  <span>Set as default gateway</span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  Save Configuration
                </button>
                <button type="button" onClick={() => setShowConfigModal(false)} style={{ flex: 1, padding: '0.75rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && selectedTransaction && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            width: '450px'
          }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Process Refund</h3>
            <p style={{ margin: '0 0 1.5rem 0', color: '#6b7280' }}>
              Payment: {selectedTransaction.payment_id}<br />
              Amount: {formatCurrency(selectedTransaction.amount)}
            </p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const result = await processRefund(
                selectedTransaction.payment_id,
                parseFloat(formData.get('amount')),
                formData.get('reason')
              );
              if (result.success) {
                setShowRefundModal(false);
                setSelectedTransaction(null);
                getTransactions({});
              }
            }}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>Refund Amount</label>
                  <input 
                    name="amount" 
                    type="number" 
                    step="0.01" 
                    max={selectedTransaction.amount}
                    defaultValue={selectedTransaction.amount}
                    required 
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>Reason</label>
                  <textarea 
                    name="reason" 
                    rows="3" 
                    placeholder="Reason for refund..."
                    required 
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  ></textarea>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  Process Refund
                </button>
                <button type="button" onClick={() => { setShowRefundModal(false); setSelectedTransaction(null); }} style={{ flex: 1, padding: '0.75rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentGatewayDashboard;
