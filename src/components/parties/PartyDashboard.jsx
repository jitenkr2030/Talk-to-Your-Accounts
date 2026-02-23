/**
 * Party Dashboard Component
 * 
 * Provides comprehensive party (customer/vendor) management interface including:
 * - Party list with filtering
 * - Party details and history
 * - Add/Edit party functionality
 * - Party balance tracking
 */

import { useState, useEffect, useCallback } from 'react';
import useAppStore from '../../stores/appStore';

const PartyDashboard = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('list');
  const [selectedParty, setSelectedParty] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  const {
    parties,
    transactions,
    loadParties,
    addParty
  } = useAppStore();

  // Load parties on mount
  useEffect(() => {
    loadParties();
  }, []);

  // Filter parties
  const filteredParties = parties.filter(p => {
    // Type filter
    if (filterType !== 'all' && p.party_type !== filterType) {
      return false;
    }
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        (p.name && p.name.toLowerCase().includes(search)) ||
        (p.gstin && p.gstin.toLowerCase().includes(search)) ||
        (p.phone && p.phone.includes(search)) ||
        (p.email && p.email.toLowerCase().includes(search))
      );
    }
    
    return true;
  });

  // Calculate party statistics
  const getPartyStats = useCallback((partyId) => {
    const partyTransactions = transactions.filter(t => t.party_id === partyId);
    
    const sales = partyTransactions
      .filter(t => t.voucher_type === 'sale')
      .reduce((sum, t) => sum + (t.total_amount || 0), 0);
    
    const purchases = partyTransactions
      .filter(t => t.voucher_type === 'purchase')
      .reduce((sum, t) => sum + (t.total_amount || 0), 0);
    
    const paid = partyTransactions
      .reduce((sum, t) => sum + (t.paid_amount || 0), 0);
    
    const outstanding = (sales + purchases) - paid;
    
    return {
      transactionCount: partyTransactions.length,
      sales,
      purchases,
      paid,
      outstanding
    };
  }, [transactions]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Render list tab
  const renderList = () => (
    <div className="parties-list">
      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search parties..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '6px', minWidth: '250px' }}
        />
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
        >
          <option value="all">All Types</option>
          <option value="customer">Customers</option>
          <option value="vendor">Vendors</option>
          <option value="both">Both</option>
        </select>
        
        <button
          onClick={() => setShowAddModal(true)}
          style={{ 
            padding: '0.5rem 1rem', 
            background: '#3b82f6', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Party
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Total Parties</p>
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{filteredParties.length}</p>
        </div>
        
        <div className="card" style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb', borderLeft: '4px solid #10b981' }}>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Customers</p>
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>
            {filteredParties.filter(p => p.party_type === 'customer' || p.party_type === 'both').length}
          </p>
        </div>
        
        <div className="card" style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb', borderLeft: '4px solid #f59e0b' }}>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Vendors</p>
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>
            {filteredParties.filter(p => p.party_type === 'vendor' || p.party_type === 'both').length}
          </p>
        </div>
        
        <div className="card" style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb', borderLeft: '4px solid #ef4444' }}>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Total Outstanding</p>
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>
            {formatCurrency(filteredParties.reduce((sum, p) => sum + getPartyStats(p.id).outstanding, 0))}
          </p>
        </div>
      </div>

      {/* Parties Table */}
      {filteredParties.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <p>No parties found.</p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Type</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>GSTIN</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Phone</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Transactions</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {filteredParties.map((party) => {
              const stats = getPartyStats(party.id);
              return (
                <tr 
                  key={party.id} 
                  style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }}
                  onClick={() => setSelectedParty(party)}
                >
                  <td style={{ padding: '0.75rem' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: '500' }}>{party.name}</p>
                      {party.email && <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>{party.email}</p>}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px',
                      background: party.party_type === 'customer' ? '#dcfce7' : 
                                 party.party_type === 'vendor' ? '#dbeafe' : '#fef3c7',
                      color: party.party_type === 'customer' ? '#166534' : 
                             party.party_type === 'vendor' ? '#1e40af' : '#92400e',
                      fontSize: '0.875rem',
                      textTransform: 'capitalize'
                    }}>
                      {party.party_type || 'customer'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace' }}>{party.gstin || 'N/A'}</td>
                  <td style={{ padding: '0.75rem' }}>{party.phone || 'N/A'}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>{stats.transactionCount}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '500', color: stats.outstanding > 0 ? '#ef4444' : '#10b981' }}>
                    {formatCurrency(stats.outstanding)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  // Render detail view
  const renderDetail = () => {
    if (!selectedParty) {
      return (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <p>Select a party to view details</p>
          <button 
            onClick={() => setSelectedParty(null)}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Back to List
          </button>
        </div>
      );
    }

    const stats = getPartyStats(selectedParty.id);
    const partyTransactions = transactions.filter(t => t.party_id === selectedParty.id).slice(0, 10);

    return (
      <div className="party-detail">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3>Party Details</h3>
          <button 
            onClick={() => setSelectedParty(null)}
            style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Back to List
          </button>
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          {/* Basic Info */}
          <div className="card" style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 1rem 0' }}>Basic Information</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Party Name</p>
                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>{selectedParty.name}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Party Type</p>
                <span style={{ 
                  padding: '0.25rem 0.75rem', 
                  borderRadius: '4px',
                  background: selectedParty.party_type === 'customer' ? '#dcfce7' : 
                             selectedParty.party_type === 'vendor' ? '#dbeafe' : '#fef3c7',
                  color: selectedParty.party_type === 'customer' ? '#166534' : 
                         selectedParty.party_type === 'vendor' ? '#1e40af' : '#92400e',
                  textTransform: 'capitalize'
                }}>
                  {selectedParty.party_type || 'customer'}
                </span>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>GSTIN</p>
                <p style={{ margin: 0, fontWeight: '500', fontFamily: 'monospace' }}>{selectedParty.gstin || 'N/A'}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Phone</p>
                <p style={{ margin: 0, fontWeight: '500' }}>{selectedParty.phone || 'N/A'}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Email</p>
                <p style={{ margin: 0, fontWeight: '500' }}>{selectedParty.email || 'N/A'}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Address</p>
                <p style={{ margin: 0, fontWeight: '500' }}>{selectedParty.address || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="card" style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 1rem 0' }}>Financial Summary</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Transactions</p>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.transactionCount}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Total Sales</p>
                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(stats.sales)}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Total Purchases</p>
                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#f59e0b' }}>{formatCurrency(stats.purchases)}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Outstanding</p>
                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: stats.outstanding > 0 ? '#ef4444' : '#10b981' }}>
                  {formatCurrency(stats.outstanding)}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="card" style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 1rem 0' }}>Recent Transactions</h4>
            {partyTransactions.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No transactions found.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Type</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {partyTransactions.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.5rem' }}>{t.date || 'N/A'}</td>
                      <td style={{ padding: '0.5rem', textTransform: 'capitalize' }}>{t.voucher_type}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '500' }}>{formatCurrency(t.total_amount)}</td>
                      <td style={{ padding: '0.5rem' }}>
                        <span style={{ 
                          padding: '0.125rem 0.5rem', 
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          background: t.payment_status === 'paid' ? '#dcfce7' : '#fee2e2',
                          color: t.payment_status === 'paid' ? '#166534' : '#991b1b'
                        }}>
                          {t.payment_status || 'unpaid'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render add/edit modal
  const renderAddModal = () => (
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
        width: '500px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <h3 style={{ margin: '0 0 1.5rem 0' }}>Add New Party</h3>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const partyData = {
            name: formData.get('name'),
            party_type: formData.get('party_type'),
            gstin: formData.get('gstin'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            address: formData.get('address'),
            state: formData.get('state'),
            pincode: formData.get('pincode')
          };
          
          await addParty(partyData);
          setShowAddModal(false);
          loadParties();
        }}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Party Name *</label>
              <input name="name" required style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Party Type *</label>
              <select name="party_type" required style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                <option value="customer">Customer</option>
                <option value="vendor">Vendor</option>
                <option value="both">Both</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>GSTIN</label>
              <input name="gstin" style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Phone</label>
                <input name="phone" style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Email</label>
                <input name="email" type="email" style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Address</label>
              <textarea name="address" rows="2" style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}></textarea>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>State</label>
                <input name="state" style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>Pincode</label>
                <input name="pincode" style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="submit" style={{ flex: 1, padding: '0.75rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Add Party
            </button>
            <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '0.75rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>Parties</h2>
        <p style={{ margin: 0, color: '#6b7280' }}>
          Manage your customers and vendors
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
          Party List
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
          Party Details
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'list' && renderList()}
      {activeTab === 'detail' && renderDetail()}

      {/* Add Modal */}
      {showAddModal && renderAddModal()}
    </div>
  );
};

export default PartyDashboard;
