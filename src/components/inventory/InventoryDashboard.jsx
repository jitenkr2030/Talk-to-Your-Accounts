/**
 * Inventory Dashboard Component
 * 
 * Provides a comprehensive interface for inventory management including:
 * - Stock overview and summary
 * - Batch/Lot tracking
 * - Serial number management
 * - Stock movements
 * - Low stock alerts
 * - Expiring stock alerts
 * - Inventory valuation
 */

import { useState, useEffect, useCallback } from 'react';
import useInventory from '../../hooks/useInventory';

const InventoryDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  
  const {
    loading,
    error,
    inventorySummary,
    batches,
    movements,
    lowStockProducts,
    expiringBatches,
    valuation,
    getInventorySummary,
    getProductBatches,
    getMovementHistory,
    getLowStockProducts,
    getExpiringBatches,
    getInventoryValuation,
    addBatch,
    transferStock,
    adjustInventory,
    clearError
  } = useInventory();

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    await Promise.all([
      getInventorySummary(),
      getLowStockProducts(),
      getExpiringBatches(),
      getInventoryValuation()
    ]);
  };

  // Render overview tab
  const renderOverview = () => (
    <div className="inventory-overview">
      {/* Summary Cards */}
      <div className="summary-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', opacity: 0.9 }}>Total Products</h3>
          <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{inventorySummary?.totalProducts || 0}</p>
        </div>
        
        <div className="card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', opacity: 0.9 }}>Total Stock Value</h3>
          <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>₹{valuation?.totalValue?.toLocaleString('en-IN') || '0'}</p>
        </div>
        
        <div className="card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', opacity: 0.9 }}>Low Stock Items</h3>
          <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{lowStockProducts.length}</p>
        </div>
        
        <div className="card" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', opacity: 0.9 }}>Expiring Soon</h3>
          <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{expiringBatches.length}</p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="alert-section" style={{ marginBottom: '2rem' }}>
          <div className="card" style={{ borderLeft: '4px solid #f59e0b', padding: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#f59e0b' }}>Low Stock Alert</h4>
            <p style={{ margin: 0, color: '#6b7280' }}>
              {lowStockProducts.length} products are running low on stock and need to be reordered.
            </p>
          </div>
        </div>
      )}

      {/* Expiring Soon Alert */}
      {expiringBatches.length > 0 && (
        <div className="alert-section" style={{ marginBottom: '2rem' }}>
          <div className="card" style={{ borderLeft: '4px solid #ef4444', padding: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#ef4444' }}>Expiring Stock Alert</h4>
            <p style={{ margin: 0, color: '#6b7280' }}>
              {expiringBatches.length} batches are expiring within the next 30 days.
            </p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setShowAddBatchModal(true)}
          style={{ 
            padding: '0.75rem 1.5rem', 
            background: '#3b82f6', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          + Add Batch
        </button>
        <button 
          onClick={() => setShowTransferModal(true)}
          style={{ 
            padding: '0.75rem 1.5rem', 
            background: '#10b981', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Transfer Stock
        </button>
        <button 
          onClick={() => setShowAdjustmentModal(true)}
          style={{ 
            padding: '0.75rem 1.5rem', 
            background: '#8b5cf6', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Stock Adjustment
        </button>
      </div>
    </div>
  );

  // Render batches tab
  const renderBatches = () => (
    <div className="batches-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Batch/Lot Tracking</h3>
        <button 
          onClick={() => setShowAddBatchModal(true)}
          style={{ 
            padding: '0.5rem 1rem', 
            background: '#3b82f6', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px', 
            cursor: 'pointer'
          }}
        >
          + Add Batch
        </button>
      </div>
      
      {batches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <p>No batches found. Add your first batch to start tracking inventory.</p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Batch No.</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Product</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Quantity</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Remaining</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Expiry Date</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Location</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <tr key={batch.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem' }}>{batch.batch_number || 'N/A'}</td>
                <td style={{ padding: '0.75rem' }}>{batch.product_name || 'Unknown'}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>{batch.quantity || 0}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>{batch.remaining_quantity || 0}</td>
                <td style={{ padding: '0.75rem' }}>{batch.expiry_date || 'N/A'}</td>
                <td style={{ padding: '0.75rem' }}>{batch.location || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  // Render movements tab
  const renderMovements = () => (
    <div className="movements-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Stock Movement History</h3>
        <button 
          onClick={() => getMovementHistory({})}
          style={{ 
            padding: '0.5rem 1rem', 
            background: '#6b7280', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px', 
            cursor: 'pointer'
          }}
        >
          Refresh
        </button>
      </div>
      
      {movements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <p>No stock movements recorded yet.</p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Date</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Type</th>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>Product</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Quantity</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Rate</th>
              <th style={{ padding: '0.75rem', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((movement) => (
              <tr key={movement.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem' }}>{new Date(movement.created_at).toLocaleDateString()}</td>
                <td style={{ padding: '0.75rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px',
                    background: movement.movement_type === 'purchase' ? '#dcfce7' : 
                               movement.movement_type === 'sale' ? '#dbeafe' : '#fef3c7',
                    color: movement.movement_type === 'purchase' ? '#166534' : 
                           movement.movement_type === 'sale' ? '#1e40af' : '#92400e'
                  }}>
                    {movement.movement_type}
                  </span>
                </td>
                <td style={{ padding: '0.75rem' }}>{movement.product_name || 'Unknown'}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>{movement.quantity}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>₹{movement.rate?.toFixed(2) || '0.00'}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>₹{movement.amount?.toFixed(2) || '0.00'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  // Render valuation tab
  const renderValuation = () => (
    <div className="valuation-view">
      <h3>Inventory Valuation</h3>
      
      {valuation ? (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 1rem 0' }}>Summary</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Total Value</p>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>₹{valuation.totalValue?.toLocaleString('en-IN') || '0'}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Total Items</p>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{valuation.totalItems || 0}</p>
              </div>
            </div>
          </div>
          
          {valuation.byCategory && valuation.byCategory.length > 0 && (
            <div className="card" style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <h4 style={{ margin: '0 0 1rem 0' }}>By Category</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Category</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Items</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {valuation.byCategory.map((cat, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.5rem' }}>{cat.category || 'Uncategorized'}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>{cat.itemCount || 0}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>₹{cat.value?.toLocaleString('en-IN') || '0'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <p>No valuation data available.</p>
        </div>
      )}
    </div>
  );

  // Render alerts tab
  const renderAlerts = () => (
    <div className="alerts-view">
      <h3>Inventory Alerts</h3>
      
      <div style={{ display: 'grid', gap: '2rem' }}>
        {/* Low Stock Section */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#f59e0b' }}>Low Stock Products</h4>
          {lowStockProducts.length === 0 ? (
            <p style={{ color: '#6b7280' }}>All products are well-stocked.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Product</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Current Stock</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Minimum Level</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map((product, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.5rem' }}>{product.name || 'Unknown'}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', color: '#ef4444' }}>{product.current_stock || 0}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{product.minimum_stock || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Expiring Soon Section */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h4 style={{ margin: '0 0 1rem 0', color: '#ef4444' }}>Expiring Soon (Next 30 Days)</h4>
          {expiringBatches.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No batches expiring soon.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Batch</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Product</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Quantity</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Expiry Date</th>
                </tr>
              </thead>
              <tbody>
                {expiringBatches.map((batch, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.5rem' }}>{batch.batch_number || 'N/A'}</td>
                    <td style={{ padding: '0.5rem' }}>{batch.product_name || 'Unknown'}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{batch.remaining_quantity || 0}</td>
                    <td style={{ padding: '0.5rem', color: '#ef4444' }}>{batch.expiry_date || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="inventory-dashboard" style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>Inventory Management</h2>
        <p style={{ margin: 0, color: '#6b7280' }}>
          Track stock, manage batches, and monitor inventory health
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
          { id: 'overview', label: 'Overview' },
          { id: 'batches', label: 'Batches' },
          { id: 'movements', label: 'Movements' },
          { id: 'valuation', label: 'Valuation' },
          { id: 'alerts', label: 'Alerts' }
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
            <p>Loading inventory data...</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'batches' && renderBatches()}
            {activeTab === 'movements' && renderMovements()}
            {activeTab === 'valuation' && renderValuation()}
            {activeTab === 'alerts' && renderAlerts()}
          </>
        )}
      </div>

      {/* Add Batch Modal */}
      {showAddBatchModal && (
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
            <h3 style={{ margin: '0 0 1.5rem 0' }}>Add New Batch</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const batchData = {
                product_id: parseInt(formData.get('product_id')),
                batch_number: formData.get('batch_number'),
                manufacturing_date: formData.get('manufacturing_date'),
                expiry_date: formData.get('expiry_date'),
                quantity: parseInt(formData.get('quantity')),
                unit_cost: parseFloat(formData.get('unit_cost')),
                location: formData.get('location')
              };
              const result = await addBatch(batchData);
              if (result.success) {
                setShowAddBatchModal(false);
                loadDashboardData();
              }
            }}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <input name="product_id" placeholder="Product ID" required style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                <input name="batch_number" placeholder="Batch Number" style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <input name="manufacturing_date" type="date" placeholder="Manufacturing Date" style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                  <input name="expiry_date" type="date" placeholder="Expiry Date" style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <input name="quantity" type="number" placeholder="Quantity" required style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                  <input name="unit_cost" type="number" step="0.01" placeholder="Unit Cost" style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>
                <input name="location" placeholder="Location" style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  Add Batch
                </button>
                <button type="button" onClick={() => setShowAddBatchModal(false)} style={{ flex: 1, padding: '0.75rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Stock Modal */}
      {showTransferModal && (
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
            <h3 style={{ margin: '0 0 1.5rem 0' }}>Transfer Stock</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const transferData = {
                product_id: parseInt(formData.get('product_id')),
                from_batch_id: parseInt(formData.get('from_batch_id')),
                to_location: formData.get('to_location'),
                quantity: parseInt(formData.get('quantity'))
              };
              const result = await transferStock(transferData);
              if (result.success) {
                setShowTransferModal(false);
                loadDashboardData();
              }
            }}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <input name="product_id" type="number" placeholder="Product ID" required style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                <input name="from_batch_id" type="number" placeholder="From Batch ID" required style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                <input name="to_location" placeholder="To Location" required style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                <input name="quantity" type="number" placeholder="Quantity" required style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  Transfer
                </button>
                <button type="button" onClick={() => setShowTransferModal(false)} style={{ flex: 1, padding: '0.75rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustmentModal && (
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
            <h3 style={{ margin: '0 0 1.5rem 0' }}>Stock Adjustment</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const adjustmentData = {
                product_id: parseInt(formData.get('product_id')),
                batch_id: formData.get('batch_id') ? parseInt(formData.get('batch_id')) : null,
                adjustment_type: formData.get('adjustment_type'),
                quantity: parseInt(formData.get('quantity')),
                reason: formData.get('reason')
              };
              const result = await adjustInventory(adjustmentData);
              if (result.success) {
                setShowAdjustmentModal(false);
                loadDashboardData();
              }
            }}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <input name="product_id" type="number" placeholder="Product ID" required style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                <input name="batch_id" type="number" placeholder="Batch ID (optional)" style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                <select name="adjustment_type" required style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                  <option value="">Select Adjustment Type</option>
                  <option value="stock_in">Stock In</option>
                  <option value="stock_out">Stock Out</option>
                  <option value="damage">Damage</option>
                  <option value="expiry">Expiry</option>
                  <option value="correction">Correction</option>
                </select>
                <input name="quantity" type="number" placeholder="Quantity" required style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                <textarea name="reason" placeholder="Reason for adjustment" rows="3" style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}></textarea>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" style={{ flex: 1, padding: '0.75rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  Adjust
                </button>
                <button type="button" onClick={() => setShowAdjustmentModal(false)} style={{ flex: 1, padding: '0.75rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
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

export default InventoryDashboard;
