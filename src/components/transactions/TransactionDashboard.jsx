/**
 * Transaction Dashboard Component
 * 
 * Provides comprehensive transaction management interface including:
 * - Transaction list with filtering and search
 * - Transaction details view
 * - Payment tracking
 * - Transaction reports
 */

import { useState, useEffect, useCallback } from 'react';
import useAppStore from '../../stores/appStore';

const TransactionDashboard = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('list');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  
  const {
    transactions,
    parties,
    loadTransactions,
    addTransaction
  } = useAppStore();

  // Load transactions on mount
  useEffect(() => {
    loadTransactions({});
  }, []);

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    // Status filter
    if (filterStatus !== 'all' && t.payment_status !== filterStatus) {
      return false;
    }
    
    // Type filter
    if (filterType !== 'all' && t.voucher_type !== filterType) {
      return false;
    }
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const party = parties.find(p => p.id === t.party_id);
      return (
        (t.invoice_number && t.invoice_number.toLowerCase().includes(search)) ||
        (party && party.name.toLowerCase().includes(search)) ||
        (t.notes && t.notes.toLowerCase().includes(search))
      );
    }
    
    // Date range filter
    if (dateRange.start && t.date < dateRange.start) {
      return false;
    }
    if (dateRange.end && t.date > dateRange.end) {
      return false;
    }
    
    return true;
  });

  // Calculate summary
  const summary = {
    total: filteredTransactions.length,
    sales: filteredTransactions.filter(t => t.voucher_type === 'sale').reduce((sum, t) => sum + (t.total_amount || 0), 0),
    purchases: filteredTransactions.filter(t => t.voucher_type === 'purchase').reduce((sum, t) => sum + (t.total_amount || 0), 0),
    paid: filteredTransactions.filter(t => t.payment_status === 'paid').reduce((sum, t) => sum + (t.paid_amount || 0), 0),
    pending: filteredTransactions.filter(t => t.payment_status !== 'paid').reduce((sum, t) => sum + ((t.total_amount || 0) - (t.paid_amount || 0)), 0)
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Get party name
  const getPartyName = (partyId) => {
    const party = parties.find(p => p.id === partyId);
    return party ? party.name : 'Unknown';
  };

  // Render list tab
  const renderList = () => (
    <div className="transactions-list">
      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Search transactions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
        />
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
        >
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="unpaid">Unpaid</option>
        </select>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
        >
          <option value="all">All Types</option>
          <option value="sale">Sales</option>
          <option value="purchase">Purchases</option>
          <option value="receipt">Receipts</option>
          <option value="payment">Payments</option>
        </select>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Total Transactions</p>
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{summary.total}</p>
        </div>
        
        <div className="card" style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb', borderLeft: '4px solid #10b981' }}>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Total Sales</p>
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(summary.sales)}</p>
        </div>
        
        <div className="card" style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb', borderLeft: '4px solid #f59e0b' }}>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Total Purchases</p>
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(summary.purchases)}</p>
        </div>
        
        <div className="card" style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb', borderLeft: '4px solid #3b82f6' }}>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Pending Amount</p>
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>{formatCurrency(summary.pending)}</p>
        </div>
      </div>

      {/* Transactions Table */}
      {filteredTransactions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <p>No transactions found.</p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Invoice #</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Type</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Party</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Amount</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Paid</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.slice(0, 50).map((transaction) => (
              <tr 
                key={transaction.id} 
                style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }}
                onClick={() => setSelectedTransaction(transaction)}
              >
                <td style={{ padding: '0.75rem' }}>{transaction.date || 'N/A'}</td>
                <td style={{ padding: '0.75rem' }}>{transaction.invoice_number || transaction.id}</td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px',
                    background: transaction.voucher_type === 'sale' ? '#dcfce7' : 
                               transaction.voucher_type === 'purchase' ? '#dbeafe' : '#fef3c7',
                    color: transaction.voucher_type === 'sale' ? '#166534' : 
                           transaction.voucher_type === 'purchase' ? '#1e40af' : '#92400e',
                    fontSize: '0.875rem'
                  }}>
                    {transaction.voucher_type}
                  </span>
                </td>
                <td style={{ padding: '0.75rem' }}>{getPartyName(transaction.party_id)}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '500' }}>
                  {formatCurrency(transaction.total_amount)}
                </td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                  {formatCurrency(transaction.paid_amount || 0)}
                </td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px',
                    background: transaction.payment_status === 'paid' ? '#dcfce7' : 
                               transaction.payment_status === 'partial' ? '#fef3c7' : '#fee2e2',
                    color: transaction.payment_status === 'paid' ? '#166534' : 
                           transaction.payment_status === 'partial' ? '#92400e' : '#991b1b',
                    fontSize: '0.875rem'
                  }}>
                    {transaction.payment_status || 'unpaid'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
      {filteredTransactions.length > 50 && (
        <p style={{ textAlign: 'center', padding: '1rem', color: '#6b7280' }}>
          Showing 50 of {filteredTransactions.length} transactions
        </p>
      )}
    </div>
  );

  // Render detail view
  const renderDetail = () => {
    if (!selectedTransaction) {
      return (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <p>Select a transaction to view details</p>
          <button 
            onClick={() => setSelectedTransaction(null)}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Back to List
          </button>
        </div>
      );
    }

    const party = parties.find(p => p.id === selectedTransaction.party_id);

    return (
      <div className="transaction-detail">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3>Transaction Details</h3>
          <button 
            onClick={() => setSelectedTransaction(null)}
            style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Back to List
          </button>
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {/* Header Info */}
          <div className="card" style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Invoice Number</p>
                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>{selectedTransaction.invoice_number || selectedTransaction.id}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Date</p>
                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>{selectedTransaction.date || 'N/A'}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Type</p>
                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', textTransform: 'capitalize' }}>{selectedTransaction.voucher_type}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Status</p>
                <span style={{ 
                  padding: '0.25rem 0.75rem', 
                  borderRadius: '4px',
                  background: selectedTransaction.payment_status === 'paid' ? '#dcfce7' : 
                             selectedTransaction.payment_status === 'partial' ? '#fef3c7' : '#fee2e2',
                  color: selectedTransaction.payment_status === 'paid' ? '#166534' : 
                         selectedTransaction.payment_status === 'partial' ? '#92400e' : '#991b1b'
                }}>
                  {selectedTransaction.payment_status || 'unpaid'}
                </span>
              </div>
            </div>
          </div>

          {/* Party Info */}
          <div className="card" style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 1rem 0' }}>Party Information</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Name</p>
                <p style={{ margin: 0, fontWeight: '500' }}>{party?.name || 'Unknown'}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>GSTIN</p>
                <p style={{ margin: 0, fontWeight: '500' }}>{party?.gstin || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="card" style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 1rem 0' }}>Financial Summary</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Total Amount</p>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(selectedTransaction.total_amount)}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Paid Amount</p>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(selectedTransaction.paid_amount || 0)}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Balance Due</p>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>
                  {formatCurrency((selectedTransaction.total_amount || 0) - (selectedTransaction.paid_amount || 0))}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Tax Amount</p>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(selectedTransaction.tax_amount || 0)}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {selectedTransaction.notes && (
            <div className="card" style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <h4 style={{ margin: '0 0 1rem 0' }}>Notes</h4>
              <p style={{ margin: 0, color: '#6b7280' }}>{selectedTransaction.notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>Transactions</h2>
        <p style={{ margin: 0, color: '#6b7280' }}>
          View and manage all your business transactions
        </p>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        borderBottom: '2px solid #e5e7eb', 
        marginBottom: '2rem' 
      }}>
        <button
          onClick={() => setActiveTab('list')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'list' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'list' ? '#3b82f6' : '#6b7280',
            cursor: 'pointer',
            fontWeight: activeTab === 'list' ? '600' : '400'
          }}
        >
          Transaction List
        </button>
        <button
          onClick={() => setActiveTab('detail')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'detail' ? '2px solid #3b82f6' : '2px solid transparent',
            color: activeTab === 'detail' ? '#3b82f6' : '#6b7280',
            cursor: 'pointer',
            fontWeight: activeTab === 'detail' ? '600' : '400'
          }}
        >
          Transaction Details
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'list' && renderList()}
      {activeTab === 'detail' && renderDetail()}
    </div>
  );
};

export default TransactionDashboard;
