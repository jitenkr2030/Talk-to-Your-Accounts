import React, { useState, useEffect, useCallback } from 'react';
import useEinvoice from '../../hooks/useEinvoice';

/**
 * EInvoiceDashboard Component
 * 
 * Main dashboard for managing e-invoices and e-waybills
 * Provides tabs for Dashboard, Pending Invoices, History, and Settings
 */
const EInvoiceDashboard = () => {
  const {
    loading,
    error,
    einvoiceList,
    config,
    generateEinvoice,
    generateEwaybill,
    getEinvoice,
    listEinvoices,
    getPendingInvoices,
    getConfig,
    saveConfig,
    cancelEinvoice,
    clearError
  } = useEinvoice();

  const [activeTab, setActiveTab] = useState('pending');
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filterDate, setFilterDate] = useState({
    startDate: '',
    endDate: ''
  });

  // Load pending invoices on mount
  useEffect(() => {
    loadPendingInvoices();
    loadConfig();
  }, []);

  // Load pending invoices when tab changes or filters change
  useEffect(() => {
    if (activeTab === 'pending') {
      loadPendingInvoices();
    }
  }, [activeTab, filterDate]);

  // Load pending invoices
  const loadPendingInvoices = async () => {
    try {
      const filters = {};
      if (filterDate.startDate) filters.startDate = filterDate.startDate;
      if (filterDate.endDate) filters.endDate = filterDate.endDate;
      
      const result = await getPendingInvoices(filters);
      setPendingInvoices(result || []);
    } catch (err) {
      console.error('Failed to load pending invoices:', err);
    }
  };

  // Load configuration
  const loadConfig = async () => {
    try {
      await getConfig();
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  };

  // Handle e-invoice generation
  const handleGenerateEinvoice = async (transactionId) => {
    try {
      await generateEinvoice(transactionId);
      await loadPendingInvoices();
      if (activeTab === 'generated') {
        await listEinvoices();
      }
    } catch (err) {
      console.error('Failed to generate e-invoice:', err);
    }
  };

  // Handle view details
  const handleViewDetails = async (transactionId) => {
    try {
      const result = await getEinvoice(transactionId);
      setSelectedInvoice(result);
      setShowDetails(true);
    } catch (err) {
      console.error('Failed to get e-invoice:', err);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  // Tab configuration
  const tabs = [
    { id: 'pending', label: 'Pending', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'generated', label: 'Generated', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">E-Invoice Management</h1>
            <p className="text-cyan-100 text-sm">Generate and manage GST e-invoices</p>
          </div>
          <div className="text-right text-white">
            <p className="text-sm opacity-80">Mode</p>
            <p className="font-semibold">{config?.mode === 'sandbox' ? 'Sandbox' : 'Production'}</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 mx-6 mt-4 px-4 py-3 flex items-center justify-between rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
          <button onClick={clearError} className="text-red-500 hover:text-red-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 mt-4">
        <div className="flex px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setShowDetails(false);
              }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-cyan-500 text-cyan-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
              {tab.id === 'pending' && pendingInvoices.length > 0 && (
                <span className="bg-cyan-100 text-cyan-700 text-xs px-2 py-0.5 rounded-full">
                  {pendingInvoices.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Pending Tab */}
        {activeTab === 'pending' && (
          <div>
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600">From:</label>
                  <input
                    type="date"
                    value={filterDate.startDate}
                    onChange={(e) => setFilterDate({ ...filterDate, startDate: e.target.value })}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-600">To:</label>
                  <input
                    type="date"
                    value={filterDate.endDate}
                    onChange={(e) => setFilterDate({ ...filterDate, endDate: e.target.value })}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                  />
                </div>
                <button
                  onClick={loadPendingInvoices}
                  className="ml-auto px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Pending Invoices List */}
            {pendingInvoices.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">All Caught Up!</h3>
                <p className="text-slate-500">No pending invoices to process</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Party</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">GSTIN</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                      <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {pendingInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-800">{invoice.voucher_no}</div>
                          <div className="text-xs text-slate-500">{invoice.description || 'Sales Voucher'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatDate(invoice.date)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-800">{invoice.party_name || 'Unknown Party'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs px-2 py-1 rounded ${
                            invoice.party_gstin ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {invoice.party_gstin || 'B2C'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-slate-800">
                          {formatCurrency(invoice.total_amount)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleGenerateEinvoice(invoice.id)}
                              disabled={loading}
                              className="px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs rounded-lg font-medium hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              {loading ? 'Generating...' : 'Generate E-Invoice'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Generated Tab */}
        {activeTab === 'generated' && (
          <GeneratedInvoicesList 
            listEinvoices={listEinvoices} 
            einvoiceList={einvoiceList}
            loading={loading}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getStatusColor={getStatusColor}
            onViewDetails={handleViewDetails}
          />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <SettingsPanel 
            config={config} 
            saveConfig={saveConfig} 
            loading={loading}
          />
        )}
      </div>

      {/* E-Invoice Details Modal */}
      {showDetails && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <EInvoiceDetails 
              einvoice={selectedInvoice} 
              onClose={() => setShowDetails(false)}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              getStatusColor={getStatusColor}
              cancelEinvoice={cancelEinvoice}
              generateEwaybill={generateEwaybill}
              loading={loading}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Generated Invoices List Component
 */
const GeneratedInvoicesList = ({ listEinvoices, einvoiceList, loading, formatCurrency, formatDate, getStatusColor, onViewDetails }) => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const result = await listEinvoices({});
      setHistory(result || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">No E-Invoices Generated</h3>
        <p className="text-slate-500">Generated e-invoices will appear here</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">IRN</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Party</th>
            <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
            <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
            <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {history.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4">
                <div className="font-medium text-slate-800">{item.voucher_no}</div>
                <div className="text-xs text-slate-500">{formatDate(item.date)}</div>
              </td>
              <td className="px-6 py-4">
                <div className="font-mono text-xs text-slate-600 truncate max-w-[120px]">
                  {item.irn || '-'}
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-slate-800">
                {item.party_name || 'Unknown'}
              </td>
              <td className="px-6 py-4 text-right font-medium text-slate-800">
                {formatCurrency(item.total_amount)}
              </td>
              <td className="px-6 py-4 text-center">
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => onViewDetails(item.transaction_id)}
                    className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs rounded-lg font-medium hover:bg-slate-200 transition-colors"
                  >
                    View
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Settings Panel Component
 */
const SettingsPanel = ({ config, saveConfig, loading }) => {
  const [formData, setFormData] = useState({
    gstin: '',
    legal_name: '',
    trade_name: '',
    address: '',
    state: '',
    pincode: '',
    email: '',
    phone: '',
    mode: 'sandbox',
    ewaybill_enabled: false
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        gstin: config.gstin || '',
        legal_name: config.legal_name || '',
        trade_name: config.trade_name || '',
        address: config.address || '',
        state: config.state || '',
        pincode: config.pincode || '',
        email: config.email || '',
        phone: config.phone || '',
        mode: config.mode || 'sandbox',
        ewaybill_enabled: !!config.ewaybill_enabled
      });
    }
  }, [config]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveConfig(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save config:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-6">E-Invoice Configuration</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* GSTIN */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Your GSTIN <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="gstin"
              value={formData.gstin}
              onChange={handleChange}
              placeholder="29AAAAA0000A1Z5"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Business Names */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Legal Name</label>
              <input
                type="text"
                name="legal_name"
                value={formData.legal_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Trade Name</label>
              <input
                type="text"
                name="trade_name"
                value={formData.trade_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* State and Pincode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pincode</label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Mode and Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">API Mode</label>
              <select
                name="mode"
                value={formData.mode}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="sandbox">Sandbox (Testing)</option>
                <option value="production">Production (Live)</option>
              </select>
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="ewaybill_enabled"
                  checked={formData.ewaybill_enabled}
                  onChange={handleChange}
                  className="w-4 h-4 text-cyan-600 border-slate-300 rounded focus:ring-cyan-500"
                />
                <span className="text-sm text-slate-700">Enable E-Waybill Generation</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
            {saved && (
              <p className="text-green-600 text-sm text-center mt-2">Configuration saved successfully!</p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * E-Invoice Details Component (Modal Content)
 */
const EInvoiceDetails = ({ einvoice, onClose, formatCurrency, formatDate, getStatusColor, cancelEinvoice, generateEwaybill, loading }) => {
  const [showEwaybillModal, setShowEwaybillModal] = useState(false);
  const [transportDetails, setTransportDetails] = useState({
    transporter_name: '',
    transporter_gstin: '',
    vehicle_number: '',
    vehicle_type: 'Regular',
    distance: 0
  });

  const handleCancel = async () => {
    const reason = prompt('Enter reason for cancellation:');
    if (reason) {
      try {
        await cancelEinvoice(einvoice.transaction_id, reason);
      } catch (err) {
        console.error('Failed to cancel:', err);
      }
    }
  };

  const handleGenerateEwaybill = async () => {
    try {
      await generateEwaybill(einvoice.transaction_id, transportDetails);
      setShowEwaybillModal(false);
    } catch (err) {
      console.error('Failed to generate e-waybill:', err);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">E-Invoice Details</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Status Banner */}
        <div className={`px-4 py-3 rounded-lg flex items-center justify-between ${getStatusColor(einvoice.status)}`}>
          <div className="flex items-center gap-2">
            <span className="font-semibold capitalize">{einvoice.status}</span>
            {einvoice.status === 'success' && (
              <span className="text-sm">E-Invoice generated successfully</span>
            )}
          </div>
          {einvoice.status === 'success' && einvoice.status !== 'cancelled' && (
            <button
              onClick={handleCancel}
              className="text-sm underline hover:no-underline"
            >
              Cancel
            </button>
          )}
        </div>

        {/* IRN Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-500 mb-1">Invoice Reference Number (IRN)</p>
            <p className="font-mono text-lg font-semibold text-slate-800">{einvoice.irn || '-'}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-500 mb-1">Acknowledgment Number</p>
            <p className="font-mono text-lg font-semibold text-slate-800">{einvoice.ack_no || '-'}</p>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-500 mb-1">Acknowledgment Date</p>
            <p className="text-slate-800">{formatDate(einvoice.ack_date)}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-500 mb-1">Invoice Number</p>
            <p className="text-slate-800">{einvoice.invoice_no}</p>
          </div>
        </div>

        {/* QR Code */}
        {einvoice.signed_qr_code && (
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm text-slate-500 mb-2">Digital QR Code</p>
            <div className="bg-white border border-slate-200 rounded-lg p-3 inline-block">
              <p className="font-mono text-xs text-slate-600 break-all max-w-md">
                {einvoice.signed_qr_code.substring(0, 100)}...
              </p>
            </div>
          </div>
        )}

        {/* E-Waybill Section */}
        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">E-Waybill</h3>
          
          {einvoice.ewb_no ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-green-600 mb-1">E-Waybill Number</p>
                  <p className="font-mono text-lg font-semibold text-green-800">{einvoice.ewb_no}</p>
                </div>
                <div>
                  <p className="text-sm text-green-600 mb-1">Valid Until</p>
                  <p className="text-green-800">{formatDate(einvoice.ewb_valid_until)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-slate-500 mb-4">Generate e-waybill for transportation</p>
              <button
                onClick={() => setShowEwaybillModal(true)}
                disabled={einvoice.status !== 'success'}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Generate E-Waybill
              </button>
            </div>
          )}
        </div>
      </div>

      {/* E-Waybill Modal */}
      {showEwaybillModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Generate E-Waybill</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Transporter Name</label>
                <input
                  type="text"
                  value={transportDetails.transporter_name}
                  onChange={(e) => setTransportDetails({ ...transportDetails, transporter_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Transporter GSTIN</label>
                <input
                  type="text"
                  value={transportDetails.transporter_gstin}
                  onChange={(e) => setTransportDetails({ ...transportDetails, transporter_gstin: e.target.value })}
                  placeholder="29AAAAA0000A1Z5"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Number</label>
                <input
                  type="text"
                  value={transportDetails.vehicle_number}
                  onChange={(e) => setTransportDetails({ ...transportDetails, vehicle_number: e.target.value })}
                  placeholder="KA01AB1234"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Distance (km)</label>
                <input
                  type="number"
                  value={transportDetails.distance}
                  onChange={(e) => setTransportDetails({ ...transportDetails, distance: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowEwaybillModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateEwaybill}
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EInvoiceDashboard;
