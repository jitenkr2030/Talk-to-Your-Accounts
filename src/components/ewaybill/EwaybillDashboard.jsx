import React, { useState, useEffect } from 'react';
import useEwaybill from '../../hooks/useEwaybill';

const EwaybillDashboard = () => {
  const {
    ewaybills,
    stats,
    hsnCodes,
    stateCodes,
    isLoading,
    error,
    fetchEwaybills,
    fetchStats,
    createEwaybill,
    cancelEwaybill,
    exportJson,
    calculateTax,
    validateGstin,
    validateVehicleNumber,
    clearError
  } = useEwaybill();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedEwaybill, setSelectedEwaybill] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    supplyType: 'OUTWARD',
    subSupplyType: 'Supply',
    docType: 'Tax Invoice',
    docNo: '',
    docDate: new Date().toISOString().split('T')[0],
    
    // Consignor Details
    consignorName: '',
    consignorGstin: '',
    consignorAddress1: '',
    consignorAddress2: '',
    consignorPlace: '',
    consignorPincode: '',
    
    // Consignee Details
    consigneeName: '',
    consigneeGstin: '',
    consigneeAddress1: '',
    consigneeAddress2: '',
    consigneePlace: '',
    consigneePincode: '',
    
    // Item Details
    items: [{ productName: '', hsnCode: '', quantity: 1, unit: 'NOS', taxableValue: 0, taxRate: 18, cessRate: 0 }],
    
    // Transporter Details
    mode: 'Road',
    vehicleNo: '',
    distance: 0,
    transporterId: '',
    transporterName: '',
    isOdc: false
  });

  useEffect(() => {
    fetchEwaybills();
    fetchStats();
  }, [fetchEwaybills, fetchStats]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productName: '', hsnCode: '', quantity: 1, unit: 'NOS', taxableValue: 0, taxRate: 18, cessRate: 0 }]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, items: newItems }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate GSTINs
    if (formData.consignorGstin && !validateGstin(formData.consignorGstin)) {
      alert('Invalid Consignor GSTIN format');
      return;
    }
    if (formData.consigneeGstin && !validateGstin(formData.consigneeGstin)) {
      alert('Invalid Consignee GSTIN format');
      return;
    }
    if (formData.vehicleNo && !validateVehicleNumber(formData.vehicleNo)) {
      alert('Invalid Vehicle Number format. Expected format: MH12AB1234');
      return;
    }

    try {
      await createEwaybill(formData);
      setShowCreateModal(false);
      resetForm();
      fetchEwaybills();
      fetchStats();
    } catch (err) {
      alert(err.message || 'Failed to create E-Way Bill');
    }
  };

  const resetForm = () => {
    setFormData({
      supplyType: 'OUTWARD',
      subSupplyType: 'Supply',
      docType: 'Tax Invoice',
      docNo: '',
      docDate: new Date().toISOString().split('T')[0],
      consignorName: '',
      consignorGstin: '',
      consignorAddress1: '',
      consignorAddress2: '',
      consignorPlace: '',
      consignorPincode: '',
      consigneeName: '',
      consigneeGstin: '',
      consigneeAddress1: '',
      consigneeAddress2: '',
      consigneePlace: '',
      consigneePincode: '',
      items: [{ productName: '', hsnCode: '', quantity: 1, unit: 'NOS', taxableValue: 0, taxRate: 18, cessRate: 0 }],
      mode: 'Road',
      vehicleNo: '',
      distance: 0,
      transporterId: '',
      transporterName: '',
      isOdc: false
    });
  };

  const handleView = (ewaybill) => {
    setSelectedEwaybill(ewaybill);
    setShowViewModal(true);
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }
    
    try {
      await cancelEwaybill(selectedEwaybill.id, cancelReason);
      setShowCancelModal(false);
      setCancelReason('');
      setSelectedEwaybill(null);
      fetchEwaybills();
      fetchStats();
    } catch (err) {
      alert(err.message || 'Failed to cancel E-Way Bill');
    }
  };

  const handleExport = async (ewaybill) => {
    try {
      await exportJson(ewaybill.id, `EWB_${ewaybill.ewbNo}.json`);
    } catch (err) {
      alert(err.message || 'Failed to export JSON');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      ACTIVE: 'bg-green-100 text-green-800 border-green-200',
      CANCELLED: 'bg-red-100 text-red-800 border-red-200',
      EXPIRED: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  // Calculate totals
  const taxSummary = calculateTax(
    formData.items,
    formData.consignorGstin,
    formData.consigneeGstin
  );

  const filteredEwaybills = ewaybills.filter(ewb => {
    const matchesStatus = filterStatus === 'ALL' || ewb.status === filterStatus;
    const matchesSearch = 
      ewb.ewbNo?.includes(searchTerm) ||
      ewb.consignorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ewb.consigneeName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">E-Way Bill Management</h1>
          <p className="text-gray-500 mt-1">Generate and manage E-Way Bills for goods transportation</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create E-Way Bill
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total</div>
          <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Active</div>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Expiring Soon</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.expiringSoon}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Generated Today</div>
          <div className="text-2xl font-bold text-blue-600">{stats.generatedToday}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Expired</div>
          <div className="text-2xl font-bold text-gray-600">{stats.expired}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Cancelled</div>
          <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
        </div>
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

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by EWB No, Consignor, Consignee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      {/* E-Way Bills Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EWB No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valid Until</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredEwaybills.map((ewb) => (
              <tr key={ewb.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{ewb.ewbNo}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(ewb.generatedDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>{ewb.consignorName}</div>
                  <div className="text-xs text-gray-500">{ewb.consignorPlace}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>{ewb.consigneeName}</div>
                  <div className="text-xs text-gray-500">{ewb.consigneePlace}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ₹{parseFloat(ewb.totalValue || 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusBadge(ewb.status)}`}>
                    {ewb.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(ewb.validUpto).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleView(ewb)} className="text-blue-600 hover:text-blue-900">View</button>
                    <button onClick={() => handleExport(ewb)} className="text-green-600 hover:text-green-900">Export</button>
                    {ewb.status === 'ACTIVE' && (
                      <button 
                        onClick={() => { setSelectedEwaybill(ewb); setShowCancelModal(true); }} 
                        className="text-red-600 hover:text-red-900"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredEwaybills.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No E-Way Bills found. Create your first E-Way Bill to get started.
          </div>
        )}
      </div>

      {/* Create E-Way Bill Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-800">Create E-Way Bill</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              {/* Transaction Details */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Transaction Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supply Type</label>
                    <select name="supplyType" value={formData.supplyType} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="OUTWARD">Outward Supply</option>
                      <option value="INWARD">Inward Supply</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sub Supply Type</label>
                    <select name="subSupplyType" value={formData.subSupplyType} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="Supply">Supply</option>
                      <option value="Export">Export</option>
                      <option value="Import">Import</option>
                      <option value="Job Work">Job Work</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                    <select name="docType" value={formData.docType} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="Tax Invoice">Tax Invoice</option>
                      <option value="Bill of Supply">Bill of Supply</option>
                      <option value="Delivery Challan">Delivery Challan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Document No</label>
                    <input type="text" name="docNo" value={formData.docNo} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </div>
              </div>

              {/* Consignor Details */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Consignor (From)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input type="text" name="consignorName" value={formData.consignorName} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                    <input type="text" name="consignorGstin" value={formData.consignorGstin} onChange={handleInputChange} placeholder="29ABCDE1234F1Z5" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                    <input type="text" name="consignorPincode" value={formData.consignorPincode} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input type="text" name="consignorAddress1" value={formData.consignorAddress1} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Place</label>
                    <input type="text" name="consignorPlace" value={formData.consignorPlace} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </div>
              </div>

              {/* Consignee Details */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Consignee (To)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input type="text" name="consigneeName" value={formData.consigneeName} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                    <input type="text" name="consigneeGstin" value={formData.consigneeGstin} onChange={handleInputChange} placeholder="29ABCDE1234F1Z5" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                    <input type="text" name="consigneePincode" value={formData.consigneePincode} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input type="text" name="consigneeAddress1" value={formData.consigneeAddress1} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Place</label>
                    <input type="text" name="consigneePlace" value={formData.consigneePlace} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                </div>
              </div>

              {/* Item Details */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-semibold text-gray-700">Item Details</h4>
                  <button type="button" onClick={addItem} className="text-sm text-blue-600 hover:text-blue-800">+ Add Item</button>
                </div>
                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-7 gap-2 items-end bg-gray-50 p-3 rounded-lg">
                      <div>
                        <label className="block text-xs text-gray-500">Product</label>
                        <input type="text" value={item.productName} onChange={(e) => handleItemChange(index, 'productName', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">HSN Code</label>
                        <input type="text" value={item.hsnCode} onChange={(e) => handleItemChange(index, 'hsnCode', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" list="hsn-codes" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">Qty</label>
                        <input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">Taxable Value</label>
                        <input type="number" value={item.taxableValue} onChange={(e) => handleItemChange(index, 'taxableValue', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">Tax Rate %</label>
                        <input type="number" value={item.taxRate} onChange={(e) => handleItemChange(index, 'taxRate', e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500">Total</label>
                        <div className="px-2 py-1 text-sm font-medium">₹{((parseFloat(item.taxableValue) || 0) * (1 + (parseFloat(item.taxRate) || 0) / 100)).toFixed(2)}</div>
                      </div>
                      <div>
                        {formData.items.length > 1 && (
                          <button type="button" onClick={() => removeItem(index)} className="text-red-600 hover:text-red-800 text-sm">Remove</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <datalist id="hsn-codes">
                  {hsnCodes.map(hsn => (
                    <option key={hsn.code} value={hsn.code} />
                  ))}
                </datalist>
              </div>

              {/* Transport Details */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Transport Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                    <select name="mode" value={formData.mode} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option value="Road">Road</option>
                      <option value="Rail">Rail</option>
                      <option value="Air">Air</option>
                      <option value="Ship">Ship</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle No</label>
                    <input type="text" name="vehicleNo" value={formData.vehicleNo} onChange={handleInputChange} placeholder="MH12AB1234" className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Distance (km)</label>
                    <input type="number" name="distance" value={formData.distance} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div className="flex items-center mt-6">
                    <input type="checkbox" name="isOdc" id="isOdc" checked={formData.isOdc} onChange={handleInputChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                    <label htmlFor="isOdc" className="ml-2 text-sm text-gray-700">ODC (Over Dimensional Cargo)</label>
                  </div>
                </div>
              </div>

              {/* Tax Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Tax Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Taxable Value:</span>
                    <div className="font-medium">₹{taxSummary.totalTaxableValue}</div>
                  </div>
                  {taxSummary.isInterstate ? (
                    <div>
                      <span className="text-gray-500">IGST:</span>
                      <div className="font-medium">₹{taxSummary.totalIgst}</div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className="text-gray-500">CGST:</span>
                        <div className="font-medium">₹{taxSummary.totalCgst}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">SGST:</span>
                        <div className="font-medium">₹{taxSummary.totalSgst}</div>
                      </div>
                    </>
                  )}
                  <div>
                    <span className="text-gray-500">Total Value:</span>
                    <div className="font-bold text-lg">₹{taxSummary.totalValue}</div>
                  </div>
                </div>
                {taxSummary.isInterstate && (
                  <div className="mt-2 text-xs text-blue-600">Inter-state transaction - IGST applicable</div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowCreateModal(false); resetForm(); }} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Generate E-Way Bill</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View E-Way Bill Modal */}
      {showViewModal && selectedEwaybill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">E-Way Bill Details</h3>
              <button onClick={() => setShowViewModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-500">E-Way Bill Number</div>
                  <div className="text-lg font-bold text-blue-600">{selectedEwaybill.ewbNo}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Status</div>
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusBadge(selectedEwaybill.status)}`}>
                    {selectedEwaybill.status}
                  </span>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">From</div>
                    <div className="font-medium">{selectedEwaybill.consignorName}</div>
                    <div className="text-sm text-gray-600">{selectedEwaybill.consignorGstin}</div>
                    <div className="text-sm text-gray-600">{selectedEwaybill.consignorPlace} - {selectedEwaybill.consignorPincode}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">To</div>
                    <div className="font-medium">{selectedEwaybill.consigneeName}</div>
                    <div className="text-sm text-gray-600">{selectedEwaybill.consigneeGstin}</div>
                    <div className="text-sm text-gray-600">{selectedEwaybill.consigneePlace} - {selectedEwaybill.consigneePincode}</div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Total Value</div>
                    <div className="font-medium">₹{parseFloat(selectedEwaybill.totalValue || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Valid Until</div>
                    <div className="font-medium">{new Date(selectedEwaybill.validUpto).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Distance</div>
                    <div className="font-medium">{selectedEwaybill.distance} km</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowViewModal(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Close</button>
              <button onClick={() => { handleExport(selectedEwaybill); setShowViewModal(false); }} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Export JSON</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel E-Way Bill Modal */}
      {showCancelModal && selectedEwaybill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Cancel E-Way Bill</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to cancel E-Way Bill <span className="font-medium">{selectedEwaybill.ewbNo}</span>?
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Cancellation</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Enter reason for cancellation..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => { setShowCancelModal(false); setCancelReason(''); }} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={handleCancel} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Confirm Cancellation</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EwaybillDashboard;
