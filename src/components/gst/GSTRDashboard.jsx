import React, { useState, useEffect } from 'react';
import useGSTR from '../../hooks/useGSTR';

/**
 * GSTRDashboard Component
 * 
 * Dashboard for managing GST returns (GSTR-1, GSTR-3B)
 */
const GSTRDashboard = () => {
  const {
    loading,
    error,
    gstr1Data,
    gstr3bData,
    itcData,
    liabilitySummary,
    getGSTR1,
    getGSTR3B,
    exportGSTR1JSON,
    exportGSTR3BJSON,
    getITCReconciliation,
    getLiabilitySummary,
    downloadJSON,
    clearError
  } = useGSTR();

  const [activeTab, setActiveTab] = useState('gstr1');
  const [dateRange, setDateRange] = useState({
    startDate: getDefaultStartDate(),
    endDate: getDefaultEndDate()
  });

  // Load data on mount and date change
  useEffect(() => {
    loadAllData();
  }, [dateRange]);

  const loadAllData = async () => {
    try {
      await Promise.all([
        getGSTR1(dateRange),
        getGSTR3B(dateRange),
        getLiabilitySummary(dateRange)
      ]);
    } catch (err) {
      console.error('Failed to load GST data:', err);
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

  // Handle export
  const handleExportGSTR1 = async () => {
    try {
      const data = await exportGSTR1JSON({
        ...dateRange,
        filingPeriod: getFilingPeriod(dateRange.startDate)
      });
      if (data) {
        downloadJSON(data, `GSTR1_${getFilingPeriod(dateRange.startDate)}.json`);
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleExportGSTR3B = async () => {
    try {
      const data = await exportGSTR3BJSON({
        ...dateRange,
        filingPeriod: getFilingPeriod(dateRange.startDate)
      });
      if (data) {
        downloadJSON(data, `GSTR3B_${getFilingPeriod(dateRange.startDate)}.json`);
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // Tabs configuration
  const tabs = [
    { id: 'gstr1', label: 'GSTR-1', description: 'Outward Supplies' },
    { id: 'gstr3b', label: 'GSTR-3B', description: 'Tax Liability' },
    { id: 'itc', label: 'ITC Reconciliation', description: 'Input Tax Credit' },
    { id: 'summary', label: 'Summary', description: 'Tax Overview' }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">GST Returns</h1>
            <p className="text-indigo-100 text-sm">Manage and file your GST returns</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/10 rounded-lg px-4 py-2">
              <p className="text-xs text-indigo-200">Period</p>
              <p className="text-white font-medium">{getFilingPeriod(dateRange.startDate)}</p>
            </div>
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

      {/* Date Filter */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">From:</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">To:</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
          <button
            onClick={loadAllData}
            disabled={loading}
            className="ml-auto px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="flex px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-start px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-xs text-slate-400">{tab.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'gstr1' && (
          <GSTR1View 
            data={gstr1Data} 
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            onExport={handleExportGSTR1}
            loading={loading}
          />
        )}
        {activeTab === 'gstr3b' && (
          <GSTR3BView 
            data={gstr3bData} 
            formatCurrency={formatCurrency}
            onExport={handleExportGSTR3B}
            loading={loading}
          />
        )}
        {activeTab === 'itc' && (
          <ITCView 
            data={itcData} 
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getITCReconciliation={getITCReconciliation}
            dateRange={dateRange}
            loading={loading}
          />
        )}
        {activeTab === 'summary' && (
          <SummaryView 
            data={liabilitySummary} 
            gstr1Data={gstr1Data}
            formatCurrency={formatCurrency}
          />
        )}
      </div>
    </div>
  );
};

/**
 * GSTR-1 View Component
 */
const GSTR1View = ({ data, formatCurrency, formatDate, onExport, loading }) => {
  if (!data) {
    return <div className="text-center py-12 text-slate-500">Loading GSTR-1 data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-500 mb-1">Total Transactions</p>
          <p className="text-2xl font-bold text-slate-800">{data.summary?.total_transactions || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-500 mb-1">E-Invoices Generated</p>
          <p className="text-2xl font-bold text-green-600">{data.summary?.e_invoices_generated || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-500 mb-1">Total Taxable Value</p>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(data.summary?.total_taxable_value)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-500 mb-1">Total Tax Liability</p>
          <p className="text-2xl font-bold text-indigo-600">{formatCurrency(data.summary?.total_liability)}</p>
        </div>
      </div>

      {/* B2B Supplies */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">B2B Supplies (Inter-state & Intra-state)</h3>
          <span className="text-sm text-slate-500">{data.supplies?.b2b?.length || 0} invoices</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Invoice</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Party GSTIN</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Taxable</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">IGST</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">CGST</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">SGST</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase">E-Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.supplies?.b2b?.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-sm font-medium text-slate-800">{item.invoice_no}</td>
                  <td className="px-6 py-3 text-sm text-slate-600">{formatDate(item.invoice_date)}</td>
                  <td className="px-6 py-3 text-sm font-mono text-slate-600">{item.party_gstin}</td>
                  <td className="px-6 py-3 text-sm text-right">{formatCurrency(item.taxable_value)}</td>
                  <td className="px-6 py-3 text-sm text-right">{formatCurrency(item.igst_amount)}</td>
                  <td className="px-6 py-3 text-sm text-right">{formatCurrency(item.cgst_amount)}</td>
                  <td className="px-6 py-3 text-sm text-right">{formatCurrency(item.sgst_amount)}</td>
                  <td className="px-6 py-3 text-center">
                    {item.is_e_invoice ? (
                      <span className="inline-flex px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">Yes</span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">No</span>
                    )}
                  </td>
                </tr>
              ))}
              {(!data.supplies?.b2b || data.supplies.b2b.length === 0) && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">No B2B supplies found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={onExport}
          disabled={loading}
          className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50 transition-all"
        >
          {loading ? 'Exporting...' : 'Export JSON for Portal'}
        </button>
      </div>
    </div>
  );
};

/**
 * GSTR-3B View Component
 */
const GSTR3BView = ({ data, formatCurrency, onExport, loading }) => {
  if (!data) {
    return <div className="text-center py-12 text-slate-500">Loading GSTR-3B data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-500 mb-1">Outward Taxable</p>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(data.summary?.total_outward_taxable)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-500 mb-1">Tax Collected</p>
          <p className="text-2xl font-bold text-indigo-600">{formatCurrency(data.summary?.total_tax_collected)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-500 mb-1">ITC Available</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(data.summary?.total_itc_available)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-500 mb-1">Net Liability</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(data.summary?.total_tax_liability)}</p>
        </div>
      </div>

      {/* Tax Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Outward Supplies */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Outward Supplies</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">IGST</span>
              <span className="font-medium">{formatCurrency(data.outward_supplies?.igst)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">CGST</span>
              <span className="font-medium">{formatCurrency(data.outward_supplies?.cgst)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">SGST</span>
              <span className="font-medium">{formatCurrency(data.outward_supplies?.sgst)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Cess</span>
              <span className="font-medium">{formatCurrency(data.outward_supplies?.cess)}</span>
            </div>
            <div className="border-t border-slate-200 pt-3 flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-semibold text-indigo-600">{formatCurrency(data.summary?.total_tax_collected)}</span>
            </div>
          </div>
        </div>

        {/* ITC Available */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">ITC Available</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">IGST</span>
              <span className="font-medium">{formatCurrency(data.itc_available?.igst)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">CGST</span>
              <span className="font-medium">{formatCurrency(data.itc_available?.cgst)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">SGST</span>
              <span className="font-medium">{formatCurrency(data.itc_available?.sgst)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Cess</span>
              <span className="font-medium">{formatCurrency(data.itc_available?.cess)}</span>
            </div>
            <div className="border-t border-slate-200 pt-3 flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-semibold text-green-600">{formatCurrency(data.summary?.total_itc_available)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Net Liability */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Net Tax Liability</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600 mb-1">IGST</p>
            <p className="text-xl font-bold text-red-700">{formatCurrency(data.net_liability?.igst)}</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600 mb-1">CGST</p>
            <p className="text-xl font-bold text-red-700">{formatCurrency(data.net_liability?.cgst)}</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600 mb-1">SGST</p>
            <p className="text-xl font-bold text-red-700">{formatCurrency(data.net_liability?.sgst)}</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-600 mb-1">Cess</p>
            <p className="text-xl font-bold text-red-700">{formatCurrency(data.net_liability?.cess)}</p>
          </div>
          <div className="text-center p-4 bg-indigo-50 rounded-lg">
            <p className="text-sm text-indigo-600 mb-1">Total</p>
            <p className="text-xl font-bold text-indigo-700">{formatCurrency(data.summary?.total_tax_liability)}</p>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={onExport}
          disabled={loading}
          className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50 transition-all"
        >
          {loading ? 'Exporting...' : 'Export JSON for Portal'}
        </button>
      </div>
    </div>
  );
};

/**
 * ITC Reconciliation View Component
 */
const ITCView = ({ data, formatCurrency, formatDate, getITCReconciliation, dateRange, loading }) => {
  useEffect(() => {
    getITCReconciliation(dateRange);
  }, [dateRange]);

  if (!data) {
    return <div className="text-center py-12 text-slate-500">Loading ITC data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-500 mb-1">Total Transactions</p>
          <p className="text-2xl font-bold text-slate-800">{data.summary?.total_transactions || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-500 mb-1">IGST ITC</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(data.summary?.total_igst_itc)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-500 mb-1">CGST + SGST ITC</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(data.summary?.total_cgst_itc + data.summary?.total_sgst_itc)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-sm text-slate-500 mb-1">Total ITC Available</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(data.summary?.total_itc_available)}</p>
        </div>
      </div>

      {/* ITC Details Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">ITC Claims Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Voucher</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Party</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Taxable</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">IGST ITC</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">CGST ITC</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">SGST ITC</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Total ITC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.details?.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-sm font-medium text-slate-800">{item.voucher_no}</td>
                  <td className="px-6 py-3 text-sm text-slate-600">{formatDate(item.date)}</td>
                  <td className="px-6 py-3 text-sm text-slate-600">{item.party_name}</td>
                  <td className="px-6 py-3 text-sm text-right">{formatCurrency(item.taxable_amount)}</td>
                  <td className="px-6 py-3 text-sm text-right text-green-600">{formatCurrency(item.igst_itc)}</td>
                  <td className="px-6 py-3 text-sm text-right text-green-600">{formatCurrency(item.cgst_itc)}</td>
                  <td className="px-6 py-3 text-sm text-right text-green-600">{formatCurrency(item.sgst_itc)}</td>
                  <td className="px-6 py-3 text-sm text-right font-medium text-green-600">{formatCurrency(item.total_itc)}</td>
                </tr>
              ))}
              {(!data.details || data.details.length === 0) && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">No ITC claims found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/**
 * Summary View Component
 */
const SummaryView = ({ data, gstr1Data, formatCurrency }) => {
  if (!data) {
    return <div className="text-center py-12 text-slate-500">Loading summary...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Liability Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">GST Liability Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500 mb-2">Tax Collected</p>
            <p className="text-2xl font-bold text-indigo-600">{formatCurrency(data.tax_collected?.total)}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500 mb-2">ITC Claimed</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(data.itc_claimed?.total)}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500 mb-2">Net Payable</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(
              data.net_liability?.igst + data.net_liability?.cgst + data.net_liability?.sgst + data.net_liability?.cess
            )}</p>
          </div>
        </div>
      </div>

      {/* Rate-wise Breakdown */}
      {gstr1Data?.tax_rate_breakdown && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800">Tax Rate Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Rate</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Transactions</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Taxable Value</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">IGST</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">CGST</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">SGST</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Total Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {gstr1Data.tax_rate_breakdown?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-sm font-medium text-slate-800">{item.rate}%</td>
                    <td className="px-6 py-3 text-sm text-right">{item.transaction_count}</td>
                    <td className="px-6 py-3 text-sm text-right">{formatCurrency(item.taxable_value)}</td>
                    <td className="px-6 py-3 text-sm text-right">{formatCurrency(item.igst_amount)}</td>
                    <td className="px-6 py-3 text-sm text-right">{formatCurrency(item.cgst_amount)}</td>
                    <td className="px-6 py-3 text-sm text-right">{formatCurrency(item.sgst_amount)}</td>
                    <td className="px-6 py-3 text-sm text-right font-medium">{formatCurrency(item.total_tax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions
function getDefaultStartDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function getDefaultEndDate() {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.toISOString().split('T')[0];
}

function getFilingPeriod(dateStr) {
  if (!dateStr) return '';
  const [, month, year] = dateStr.split('-');
  return `${month}${year}`;
}

export default GSTRDashboard;
