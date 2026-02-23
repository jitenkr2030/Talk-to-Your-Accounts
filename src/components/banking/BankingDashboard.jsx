/**
 * Banking Dashboard Component
 * 
 * Provides comprehensive banking integration including:
 * - Bank account management
 * - Transaction feeds
 * - Auto-reconciliation
 * - Manual matching
 * - Reconciliation rules
 */

import { useState, useEffect } from 'react';
import useBanking from '../../hooks/useBanking';

const BankingDashboard = () => {
  const [activeTab, setActiveTab] = useState('accounts');
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  
  const {
    loading,
    error,
    accounts,
    selectedAccount,
    transactions,
    unmatchedTransactions,
    reconciliationSummary,
    rules,
    getAccounts,
    getAccount,
    addAccount,
    deleteAccount,
    getTransactions,
    getUnmatchedTransactions,
    addTransaction,
    autoReconcile,
    matchTransaction,
    unmatchTransaction,
    getReconciliationSummary,
    getRules,
    addRule,
    deleteRule,
    importStatement,
    clearError
  } = useBanking();

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    await Promise.all([
      getAccounts(),
      getReconciliationSummary(),
      getRules()
    ]);
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '₹0';
    return `₹${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN');
  };

  // Render accounts tab
  const renderAccounts = () => (
    <div className="accounts-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>Connected Bank Accounts</h3>
        <button 
          onClick={() => setShowAddAccountModal(true)}
          style={{ 
            padding: '0.5rem 1rem', 
            background: '#3b82f6', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px', 
            cursor: 'pointer'
          }}
        >
          + Add Account
        </button>
      </div>
      
      {accounts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <p>No bank accounts connected yet.</p>
          <button 
            onClick={() => setShowAddAccountModal(true)}
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
            Connect Your First Account
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {accounts.map((account) => (
            <div 
              key={account.id} 
              style={{ 
                background: 'white', 
                padding: '1.5rem', 
                borderRadius: '12px', 
                border: '1px solid #e5e7eb',
                cursor: 'pointer'
              }}
              onClick={() => {
                getAccount(account.id);
                getTransactions({ account_id: account.id });
                setActiveTab('transactions');
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.125rem' }}>{account.bank_name}</h4>
                  <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                    ••••{account.account_number || '••••'}
                  </p>
                </div>
                <span style={{ 
                  padding: '0.25rem 0.5rem', 
                  background: '#dcfce7', 
                  color: '#166534', 
                  borderRadius: '4px',
                  fontSize: '0.75rem'
                }}>
                  Active
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '0.75rem' }}>Balance</p>
                  <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(account.balance)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '0.75rem' }}>Last Synced</p>
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>{formatDate(account.last_synced)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render transactions tab
  const renderTransactions = () => (
    <div className="transactions-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>Bank Transactions</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => {
              getUnmatchedTransactions();
              setActiveTab('reconcile');
            }}
            style={{ 
              padding: '0.5rem 1rem', 
              background: '#f59e0b', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer'
            }}
          >
            Reconcile
          </button>
          <button 
            onClick={() => setShowAddTransactionModal(true)}
            style={{ 
              padding: '0.5rem 1rem', 
              background: '#3b82f6', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer'
            }}
          >
            + Add Transaction
          </button>
        </div>
      </div>
      
      {/* Summary Cards */}
      {reconciliationSummary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Pending</p>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>{reconciliationSummary.pending || 0}</p>
          </div>
          <div className="card" style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Matched</p>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>{reconciliationSummary.matched || 0}</p>
          </div>
          <div className="card" style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Reconciled</p>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>{reconciliationSummary.reconciled || 0}</p>
          </div>
        </div>
      )}
      
      {transactions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <p>No transactions found. Select an account to view transactions.</p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Description</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Type</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn) => (
              <tr key={txn.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem' }}>{formatDate(txn.date)}</td>
                <td style={{ padding: '0.75rem' }}>{txn.description || 'N/A'}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right', color: txn.type === 'credit' ? '#10b981' : '#ef4444' }}>
                  {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                </td>
                <td style={{ padding: '0.75rem' }}>{txn.type}</td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px',
                    background: txn.status === 'reconciled' ? '#dcfce7' : 
                               txn.status === 'matched' ? '#dbeafe' : '#fef3c7',
                    color: txn.status === 'reconciled' ? '#166534' : 
                           txn.status === 'matched' ? '#1e40af' : '#92400e',
                    fontSize: '0.75rem'
                  }}>
                    {txn.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  // Render reconcile tab
  const renderReconcile = () => (
    <div className="reconcile-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>Reconciliation Workbench</h3>
        <button 
          onClick={() => autoReconcile()}
          disabled={loading}
          style={{ 
            padding: '0.5rem 1rem', 
            background: '#10b981', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px', 
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Reconciling...' : 'Auto-Reconcile'}
        </button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Unmatched Transactions */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h4 style={{ margin: '0 0 1rem 0' }}>Unmatched Bank Transactions</h4>
          {unmatchedTransactions.length === 0 ? (
            <p style={{ color: '#6b7280' }}>All transactions are matched!</p>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {unmatchedTransactions.map((txn) => (
                <div 
                  key={txn.id} 
                  style={{ 
                    padding: '0.75rem', 
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>{txn.description || 'N/A'}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>{formatDate(txn.date)}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontWeight: '600', color: txn.type === 'credit' ? '#10b981' : '#ef4444' }}>
                      {formatCurrency(txn.amount)}
                    </p>
                    <button 
                      onClick={() => matchTransaction(txn.id, 1, 'sale')}
                      style={{ 
                        marginTop: '0.25rem',
                        padding: '0.25rem 0.5rem', 
                        background: '#3b82f6', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: 'pointer',
                        fontSize: '0.75rem'
                      }}
                    >
                      Match
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Recent Reconciliations */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h4 style={{ margin: '0 0 1rem 0' }}>Recent Reconciliations</h4>
          {reconciliationSummary?.recent_reconciliations?.length > 0 ? (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {reconciliationSummary.recent_reconciliations.map((rec) => (
                <div 
                  key={rec.id} 
                  style={{ 
                    padding: '0.75rem', 
                    borderBottom: '1px solid #e5e7eb'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>{rec.description || 'N/A'}</p>
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600' }}>{formatCurrency(rec.txn_amount)}</p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>
                      Invoice: {rec.voucher_number || 'N/A'}
                    </p>
                    <button 
                      onClick={() => unmatchTransaction(rec.bank_transaction_id)}
                      style={{ 
                        padding: '0.125rem 0.25rem', 
                        background: '#ef4444', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: 'pointer',
                        fontSize: '0.625rem'
                      }}
                    >
                      Unmatch
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#6b7280' }}>No recent reconciliations.</p>
          )}
        </div>
      </div>
    </div>
  );

  // Render rules tab
  const renderRules = () => (
    <div className="rules-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>Reconciliation Rules</h3>
        <button 
          onClick={() => setShowAddRuleModal(true)}
          style={{ 
            padding: '0.5rem 1rem', 
            background: '#3b82f6', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px', 
            cursor: 'pointer'
          }}
        >
          + Add Rule
        </button>
      </div>
      
      {rules.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <p>No reconciliation rules defined yet.</p>
          <p style={{ fontSize: '0.875rem' }}>Rules help automatically match transactions based on patterns.</p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Pattern</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Match Type</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Category</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem' }}>{rule.name}</td>
                <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{rule.pattern}</td>
                <td style={{ padding: '0.75rem' }}>{rule.match_type}</td>
                <td style={{ padding: '0.75rem' }}>{rule.category || 'N/A'}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                  <button 
                    onClick={() => deleteRule(rule.id)}
                    style={{ 
                      padding: '0.25rem 0.5rem', 
                      background: '#ef4444', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '4px', 
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="banking-dashboard" style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>Banking & Reconciliation</h2>
        <p style={{ margin: 0, color: '#6b7280' }}>
          Connect bank accounts and reconcile transactions automatically
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
          { id: 'accounts', label: 'Accounts' },
          { id: 'transactions', label: 'Transactions' },
          { id: 'reconcile', label: 'Reconcile' },
          { id: 'rules', label: 'Rules' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === 'reconcile') {
                getUnmatchedTransactions();
              }
            }}
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
            {activeTab === 'accounts' && renderAccounts()}
            {activeTab === 'transactions' && renderTransactions()}
            {activeTab === 'reconcile' && renderReconcile()}
            {activeTab === 'rules' && renderRules()}
          </>
        )}
      </div>

      {/* Add Account Modal */}
      {showAddAccountModal && (
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
            <h3 style={{ margin: '0 0 1.5rem 0' }}>Add Bank Account</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const result = await addAccount({
                bank_name: formData.get('bank_name'),
                account_number: formData.get('account_number'),
                account_type: formData.get('account_type'),
                balance: parseFloat(formData.get('balance') || 0),
                currency: formData.get('currency')
              });
              if (result.success) {
                setShowAddAccountModal(false);
              }
            }}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <input name="bank_name" placeholder="Bank Name" required style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                <input name="account_number" placeholder="Account Number" style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <select name="account_type" style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                    <option value="current">Current</option>
                  </select>
                  <input name="currency" placeholder="Currency" defaultValue="INR" style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <input name="balance" type="number" step="0.01" placeholder="Current Balance" defaultValue="0" style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  Add Account
                </button>
                <button type="button" onClick={() => setShowAddAccountModal(false)} style={{ flex: 1, padding: '0.75rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showAddTransactionModal && (
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
            <h3 style={{ margin: '0 0 1.5rem 0' }}>Add Bank Transaction</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const result = await addTransaction({
                account_id: parseInt(formData.get('account_id')),
                date: formData.get('date'),
                description: formData.get('description'),
                amount: parseFloat(formData.get('amount')),
                type: formData.get('type'),
                category: formData.get('category')
              });
              if (result.success) {
                setShowAddTransactionModal(false);
                getTransactions({ account_id: parseInt(formData.get('account_id')) });
              }
            }}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <select name="account_id" required style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                  <option value="">Select Account</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.bank_name}</option>
                  ))}
                </select>
                <input name="date" type="date" required style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                <input name="description" placeholder="Description" required style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <input name="amount" type="number" step="0.01" placeholder="Amount" required style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                  <select name="type" required style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                    <option value="credit">Credit</option>
                    <option value="debit">Debit</option>
                  </select>
                </div>
                <input name="category" placeholder="Category (optional)" style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  Add Transaction
                </button>
                <button type="button" onClick={() => setShowAddTransactionModal(false)} style={{ flex: 1, padding: '0.75rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Rule Modal */}
      {showAddRuleModal && (
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
            <h3 style={{ margin: '0 0 1.5rem 0' }}>Add Reconciliation Rule</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const result = await addRule({
                name: formData.get('name'),
                pattern: formData.get('pattern'),
                match_type: formData.get('match_type'),
                category: formData.get('category')
              });
              if (result.success) {
                setShowAddRuleModal(false);
              }
            }}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <input name="name" placeholder="Rule Name" required style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                <input name="pattern" placeholder="Pattern (e.g., 'STARBUCKS', 'AWS*')" required style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                <select name="match_type" required style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                  <option value="contains">Contains</option>
                  <option value="exact">Exact Match</option>
                  <option value="regex">Regex</option>
                </select>
                <input name="category" placeholder="Category (e.g., 'Travel', 'Software')" style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  Add Rule
                </button>
                <button type="button" onClick={() => setShowAddRuleModal(false)} style={{ flex: 1, padding: '0.75rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
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

export default BankingDashboard;
