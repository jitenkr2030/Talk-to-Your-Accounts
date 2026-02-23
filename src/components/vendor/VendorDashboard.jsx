import { useState, useEffect } from 'react';
import useVendor from '../../hooks/useVendor';

const VendorDashboard = () => {
  const {
    vendors,
    vendorSummary,
    purchaseOrders,
    loading,
    error,
    fetchVendors,
    createVendor,
    updateVendor,
    deleteVendor,
    fetchVendorSummary,
    exportVendors,
    fetchPurchaseOrders
  } = useVendor();

  const [activeTab, setActiveTab] = useState('vendors');
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorForm, setVendorForm] = useState({
    name: '',
    type: 'supplier',
    contact_person: '',
    email: '',
    phone: '',
    mobile: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
    pan: '',
    bank_name: '',
    bank_branch: '',
    bank_account_no: '',
    bank_ifsc: '',
    bank_account_name: '',
    opening_balance: '',
    credit_limit: '',
    credit_days: '',
    is_active: true,
    notes: ''
  });
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    is_active: ''
  });

  useEffect(() => {
    fetchVendorSummary();
  }, [fetchVendorSummary]);

  const handleVendorSubmit = async (e) => {
    e.preventDefault();
    try {
      await createVendor(vendorForm);
      setShowAddVendor(false);
      setVendorForm({
        name: '',
        code: '',
        type: 'supplier',
        contact_person: '',
        email: '',
        phone: '',
        mobile: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        gstin: '',
        pan: '',
        bank_name: '',
        bank_branch: '',
        bank_account_no: '',
        bank_ifsc: '',
        bank_account_name: '',
        opening_balance: '',
        credit_limit: '',
        credit_days: '',
        is_active: true,
        notes: ''
      });
    } catch (err) {
      console.error('Error creating vendor:', err);
    }
  };

  const handleDeleteVendor = async (id) => {
    if (window.confirm('Are you sure you want to delete this vendor?')) {
      try {
        await deleteVendor(id);
      } catch (err) {
        console.error('Error deleting vendor:', err);
      }
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportVendors(filters);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vendors_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting vendors:', err);
    }
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getPOStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'received': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 bg-slate-900 min-h-screen text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Vendor Management</h1>
          <p className="text-slate-400 mt-1">Manage suppliers and purchase orders</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <button
            onClick={() => setShowAddVendor(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Vendor
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {vendorSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 p-4 rounded-lg">
            <p className="text-slate-400 text-sm">Total Vendors</p>
            <p className="text-2xl font-bold text-blue-400">{vendorSummary.total_vendors}</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-lg">
            <p className="text-slate-400 text-sm">Active Vendors</p>
            <p className="text-2xl font-bold text-green-400">{vendorSummary.active_vendors}</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-lg">
            <p className="text-slate-400 text-sm">Total Outstanding</p>
            <p className="text-2xl font-bold text-orange-400">₹{vendorSummary.total_outstanding?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-lg">
            <p className="text-slate-400 text-sm">GST Registered</p>
            <p className="text-2xl font-bold text-purple-400">{vendorSummary.vendors_with_gst}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('vendors')}
          className={`px-4 py-2 rounded-lg ${activeTab === 'vendors' ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'}`}
        >
          Vendors
        </button>
        <button
          onClick={() => setActiveTab('purchase-orders')}
          className={`px-4 py-2 rounded-lg ${activeTab === 'purchase-orders' ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'}`}
        >
          Purchase Orders
        </button>
      </div>

      {/* Filters */}
      {activeTab === 'vendors' && (
        <div className="bg-slate-800 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search by name, code, or GSTIN"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value="">All Types</option>
                <option value="supplier">Supplier</option>
                <option value="contractor">Contractor</option>
                <option value="service">Service Provider</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Status</label>
              <select
                value={filters.is_active}
                onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value="">All Status</option>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => fetchVendors(filters)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Vendors List */}
      {activeTab === 'vendors' && (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Code</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">GSTIN</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Contact</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Opening Balance</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-slate-400">Loading...</td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-slate-400">No vendors found</td>
                </tr>
              ) : (
                vendors.map((vendor) => (
                  <tr key={vendor.id} className="border-t border-slate-700 hover:bg-slate-750">
                    <td className="px-4 py-3 text-sm font-mono">{vendor.code}</td>
                    <td className="px-4 py-3 text-sm font-medium">{vendor.name}</td>
                    <td className="px-4 py-3 text-sm capitalize">{vendor.type}</td>
                    <td className="px-4 py-3 text-sm font-mono">{vendor.gstin || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <div>{vendor.email || '-'}</div>
                      <div className="text-slate-400 text-xs">{vendor.phone || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">₹{parseFloat(vendor.opening_balance || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(vendor.is_active)}`}>
                        {vendor.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => updateVendor(vendor.id, { is_active: !vendor.is_active })}
                          className="p-1 text-blue-400 hover:text-blue-300"
                          title={vendor.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteVendor(vendor.id)}
                          className="p-1 text-red-400 hover:text-red-300"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Purchase Orders List */}
      {activeTab === 'purchase-orders' && (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">PO Number</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Vendor</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Amount</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-400">Loading...</td>
                </tr>
              ) : purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-400">No purchase orders found</td>
                </tr>
              ) : (
                purchaseOrders.map((po) => (
                  <tr key={po.id} className="border-t border-slate-700 hover:bg-slate-750">
                    <td className="px-4 py-3 text-sm font-mono">{po.po_number}</td>
                    <td className="px-4 py-3 text-sm">{po.vendor_name}</td>
                    <td className="px-4 py-3 text-sm">{po.date}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">₹{parseFloat(po.total_amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${getPOStatusColor(po.status)}`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => fetchPurchaseOrderById(po.id)}
                          className="p-1 text-blue-400 hover:text-blue-300"
                          title="View"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Vendor Modal */}
      {showAddVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add New Vendor</h2>
            <form onSubmit={handleVendorSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Vendor Name *</label>
                  <input
                    type="text"
                    value={vendorForm.name}
                    onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Vendor Code</label>
                  <input
                    type="text"
                    value={vendorForm.code}
                    onChange={(e) => setVendorForm({ ...vendorForm, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="Auto-generated if empty"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Type</label>
                  <select
                    value={vendorForm.type}
                    onChange={(e) => setVendorForm({ ...vendorForm, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="supplier">Supplier</option>
                    <option value="contractor">Contractor</option>
                    <option value="service">Service Provider</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={vendorForm.contact_person}
                    onChange={(e) => setVendorForm({ ...vendorForm, contact_person: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={vendorForm.email}
                    onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Phone</label>
                  <input
                    type="text"
                    value={vendorForm.phone}
                    onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-slate-400 mb-1">Address</label>
                  <textarea
                    value={vendorForm.address}
                    onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    rows="2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">City</label>
                  <input
                    type="text"
                    value={vendorForm.city}
                    onChange={(e) => setVendorForm({ ...vendorForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">State</label>
                  <input
                    type="text"
                    value={vendorForm.state}
                    onChange={(e) => setVendorForm({ ...vendorForm, state: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={vendorForm.gstin}
                    onChange={(e) => setVendorForm({ ...vendorForm, gstin: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="15-character GSTIN"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">PAN</label>
                  <input
                    type="text"
                    value={vendorForm.pan}
                    onChange={(e) => setVendorForm({ ...vendorForm, pan: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={vendorForm.bank_name}
                    onChange={(e) => setVendorForm({ ...vendorForm, bank_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Bank Account No.</label>
                  <input
                    type="text"
                    value={vendorForm.bank_account_no}
                    onChange={(e) => setVendorForm({ ...vendorForm, bank_account_no: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={vendorForm.bank_ifsc}
                    onChange={(e) => setVendorForm({ ...vendorForm, bank_ifsc: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    value={vendorForm.credit_limit}
                    onChange={(e) => setVendorForm({ ...vendorForm, credit_limit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Credit Days</label>
                  <input
                    type="number"
                    value={vendorForm.credit_days}
                    onChange={(e) => setVendorForm({ ...vendorForm, credit_days: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    min="0"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-slate-400 mb-1">Notes</label>
                  <textarea
                    value={vendorForm.notes}
                    onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    rows="2"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddVendor(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Add Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
};

export default VendorDashboard;
