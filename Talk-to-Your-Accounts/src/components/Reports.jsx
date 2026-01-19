import { useState, useEffect, useCallback } from 'react';
import useAppStore from '../stores/appStore';

const Reports = ({ onClose, onExport, reportEngine, exportManager }) => {
  const [activeTab, setActiveTab] = useState('sales');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Report types configuration
  const reportTypes = [
    { id: 'sales', label: 'Sales Report', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', description: 'Daily, weekly, monthly sales analysis' },
    { id: 'gst', label: 'GST Report', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z', description: 'GSTR-1 and GSTR-3B ready reports' },
    { id: 'profit_loss', label: 'Profit & Loss', icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z', description: 'Income, expenses, and profit analysis' },
    { id: 'balance_sheet', label: 'Balance Sheet', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', description: 'Assets, liabilities, and equity overview' },
    { id: 'cash_flow', label: 'Cash Flow', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', description: 'Cash inflows and outflows' },
    { id: 'outstanding_aging', label: 'Outstanding Aging', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', description: 'Receivables aging analysis' },
    { id: 'expense', label: 'Expense Summary', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', description: 'Category-wise expense breakdown' }
  ];

  // Load report data when tab or date range changes
  useEffect(() => {
    loadReport();
  }, [activeTab, dateRange]);

  const loadReport = async () => {
    setLoading(true);
    try {
      let data = null;
      
      switch (activeTab) {
        case 'sales':
          data = await reportEngine.generateSalesReport(dateRange);
          break;
        case 'gst':
          data = await reportEngine.generateGSTReport(dateRange.startDate.substring(0, 7));
          break;
        case 'profit_loss':
          data = await reportEngine.generateProfitLoss(dateRange);
          break;
        case 'balance_sheet':
          data = await reportEngine.generateBalanceSheet(dateRange.endDate);
          break;
        case 'cash_flow':
          data = await reportEngine.generateCashFlow(dateRange);
          break;
        case 'outstanding_aging':
          data = await reportEngine.generateOutstandingAging();
          break;
        case 'expense':
          data = await reportEngine.generateExpenseSummary(dateRange);
          break;
        default:
          data = await reportEngine.generateSalesReport(dateRange);
      }
      
      setReportData(data);
    } catch (error) {
      console.error('Error loading report:', error);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    if (!reportData) return;
    
    try {
      const result = await exportManager.exportReport(reportData, format, {
        title: reportTypes.find(r => r.id === activeTab)?.label || 'Report'
      });
      
      if (result.action === 'print') {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(result.content);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
      } else {
        exportManager.downloadFile(result);
      }
      
      setShowExportMenu(false);
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num || 0);
  };

  const renderSummaryCards = () => {
    if (!reportData?.summary) return null;

    const summary = reportData.summary;
    const excludeKeys = ['period', 'startDate', 'endDate', 'month', 'as_of_date', 'generatedAt'];
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Object.entries(summary)
          .filter(([key]) => !excludeKeys.includes(key))
          .slice(0, 8)
          .map(([key, value]) => (
            <div key={key} className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-4 border border-cyan-100">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                {key.replace(/_/g, ' ')}
              </p>
              <p className="text-xl font-bold text-slate-800">
                {typeof value === 'number' ? formatCurrency(value) : String(value)}
              </p>
            </div>
          ))}
      </div>
    );
  };

  const renderSalesReport = () => {
    if (!reportData) return null;

    return (
      <div className="space-y-6">
        {renderSummaryCards()}
        
        {/* Sales by Party */}
        {reportData.salesByParty && reportData.salesByParty.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Top Customers</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Customer</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Transactions</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.salesByParty.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-800">{item.name}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatNumber(item.count)}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sales by GST */}
        {reportData.salesByGST && reportData.salesByGST.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Sales by GST Rate</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">GST Rate</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Taxable Amount</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">GST Amount</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Transactions</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.salesByGST.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-800">{item.gst_rate}%</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(item.taxable_amount)}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(item.total_gst)}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatNumber(item.count)}</td>
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

  const renderGSTReport = () => {
    if (!reportData) return null;

    return (
      <div className="space-y-6">
        {renderSummaryCards()}

        {/* GST Summary by Rate */}
        {reportData.salesByGST && reportData.salesByGST.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">GST Summary by Rate</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">GST Rate</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Taxable Amount</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">CGST</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">SGST</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Total GST</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.salesByGST.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-800">{item.gst_rate}%</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(item.taxable_amount)}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(item.cgst)}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(item.sgst)}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">{formatCurrency(item.total_gst)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* B2B vs B2C Summary */}
        {reportData.exportSummary && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <h4 className="font-medium text-blue-800 mb-3">B2B Sales (with GST Number)</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-600">Transactions</span>
                  <span className="font-medium">{formatNumber(reportData.exportSummary.b2b.count)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-600">Taxable Amount</span>
                  <span className="font-medium">{formatCurrency(reportData.exportSummary.b2b.taxable_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-600">Tax Amount</span>
                  <span className="font-medium">{formatCurrency(reportData.exportSummary.b2b.tax_amount)}</span>
                </div>
              </div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <h4 className="font-medium text-green-800 mb-3">B2C Sales (Consumer)</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Transactions</span>
                  <span className="font-medium">{formatNumber(reportData.exportSummary.b2c.count)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Taxable Amount</span>
                  <span className="font-medium">{formatCurrency(reportData.exportSummary.b2c.taxable_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Tax Amount</span>
                  <span className="font-medium">{formatCurrency(reportData.exportSummary.b2c.tax_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderProfitLossReport = () => {
    if (!reportData) return null;

    const { summary } = reportData;

    return (
      <div className="space-y-6">
        {renderSummaryCards()}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Profit & Loss Statement</h3>
          </div>
          <div className="p-6">
            {/* Revenue Section */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">Revenue</h4>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Gross Sales</span>
                  <span className="font-medium">{formatCurrency(summary.total_sales)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Less: GST</span>
                  <span className="text-red-600">-{formatCurrency(summary.sales_gst)}</span>
                </div>
                <div className="flex justify-between py-2 font-semibold">
                  <span className="text-slate-800">Net Sales</span>
                  <span className="text-slate-800">{formatCurrency(summary.net_sales)}</span>
                </div>
              </div>
            </div>

            {/* Cost of Goods Sold */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">Cost of Goods Sold</h4>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Purchases</span>
                  <span className="font-medium">{formatCurrency(summary.total_purchases)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Less: GST</span>
                  <span className="text-red-600">-{formatCurrency(summary.purchases_gst)}</span>
                </div>
                <div className="flex justify-between py-2 font-semibold">
                  <span className="text-slate-800">Net Purchases</span>
                  <span className="text-slate-800">{formatCurrency(summary.net_purchases)}</span>
                </div>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="mb-6 bg-emerald-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-emerald-800">Gross Profit</span>
                <span className="text-xl font-bold text-emerald-800">{formatCurrency(summary.gross_profit)}</span>
              </div>
              <div className="text-sm text-emerald-600 mt-1">Margin: {summary.gross_margin?.toFixed(1)}%</div>
            </div>

            {/* Expenses */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">Operating Expenses</h4>
              <div className="space-y-2">
                {reportData.expenses?.by_category?.map((cat, idx) => (
                  <div key={idx} className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">{cat.category}</span>
                    <span className="font-medium">{formatCurrency(cat.total_amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 font-semibold">
                  <span className="text-slate-800">Total Expenses</span>
                  <span className="text-red-600">-{formatCurrency(summary.total_expenses)}</span>
                </div>
              </div>
            </div>

            {/* Net Profit */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg p-4 text-white">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">Net Profit</span>
                <span className="text-2xl font-bold">{formatCurrency(summary.net_profit)}</span>
              </div>
              <div className="text-white/80 text-sm mt-1">
                Net Margin: {summary.net_margin?.toFixed(1)}% | Sales Growth: {summary.sales_growth?.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBalanceSheet = () => {
    if (!reportData) return null;

    const { assets, liabilities, equity, balance_check } = reportData;

    return (
      <div className="space-y-6">
        {/* Assets */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600">
            <h3 className="font-semibold text-white">Assets</h3>
          </div>
          <div className="p-6">
            {/* Current Assets */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">Current Assets</h4>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Cash in Hand</span>
                  <span className="font-medium">{formatCurrency(assets?.current_assets?.cash_and_bank?.cash_in_hand)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Bank Balance</span>
                  <span className="font-medium">{formatCurrency(assets?.current_assets?.cash_and_bank?.bank_balance)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Accounts Receivable</span>
                  <span className="font-medium">{formatCurrency(assets?.current_assets?.accounts_receivable?.total)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Inventory Value</span>
                  <span className="font-medium">{formatCurrency(assets?.current_assets?.inventory?.value)}</span>
                </div>
                <div className="flex justify-between py-2 font-semibold">
                  <span className="text-slate-800">Total Current Assets</span>
                  <span className="text-slate-800">{formatCurrency(assets?.current_assets?.total_current_assets)}</span>
                </div>
              </div>
            </div>

            {/* Fixed Assets */}
            <div>
              <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">Fixed Assets</h4>
              <div className="flex justify-between py-2 font-semibold">
                <span className="text-slate-800">Total Fixed Assets</span>
                <span className="text-slate-800">{formatCurrency(assets?.fixed_assets?.total)}</span>
              </div>
            </div>

            {/* Total Assets */}
            <div className="mt-4 bg-blue-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-blue-800">Total Assets</span>
                <span className="text-xl font-bold text-blue-800">{formatCurrency(assets?.total_assets)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Liabilities */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-red-500 to-pink-600">
            <h3 className="font-semibold text-white">Liabilities</h3>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Accounts Payable</span>
                <span className="font-medium">{formatCurrency(liabilities?.current_liabilities?.accounts_payable)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">GST Liability</span>
                <span className="font-medium">{formatCurrency(liabilities?.current_liabilities?.gst_liability)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Loans</span>
                <span className="font-medium">{formatCurrency(liabilities?.long_term_liabilities?.loans)}</span>
              </div>
              <div className="flex justify-between py-2 font-semibold">
                <span className="text-slate-800">Total Liabilities</span>
                <span className="text-slate-800">{formatCurrency(liabilities?.total_liabilities)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Equity */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600">
            <h3 className="font-semibold text-white">Equity</h3>
          </div>
          <div className="p-6">
            <div className="flex justify-between py-2 font-semibold">
              <span className="text-slate-800">Total Equity</span>
              <span className="text-slate-800">{formatCurrency(equity?.total)}</span>
            </div>
          </div>
        </div>

        {/* Balance Check */}
        <div className={`rounded-xl p-4 ${balance_check?.balanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            {balance_check?.balanced ? (
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className={`font-medium ${balance_check?.balanced ? 'text-green-800' : 'text-red-800'}`}>
              Balance Check: {balance_check?.balanced ? 'Balanced' : 'Not Balanced'}
            </span>
          </div>
          <div className="text-sm text-slate-600">
            Liabilities + Equity: {formatCurrency(balance_check?.total_liabilities_equity)} | 
            Assets: {formatCurrency(balance_check?.total_assets)}
          </div>
        </div>
      </div>
    );
  };

  const renderCashFlowReport = () => {
    if (!reportData) return null;

    const { summary, operating_activities, investing_activities, financing_activities } = reportData;

    return (
      <div className="space-y-6">
        {renderSummaryCards()}

        {/* Operating Activities */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Operating Activities</h3>
          </div>
          <div className="p-6 space-y-2">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Cash from Customers</span>
              <span className="text-green-600 font-medium">+{formatCurrency(operating_activities?.cash_received_from_customers)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Cash to Suppliers</span>
              <span className="text-red-600 font-medium">-{formatCurrency(operating_activities?.cash_paid_to_suppliers)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Cash for Expenses</span>
              <span className="text-red-600 font-medium">-{formatCurrency(operating_activities?.cash_paid_for_expenses)}</span>
            </div>
            <div className="flex justify-between py-2 font-semibold">
              <span className="text-slate-800">Net from Operating</span>
              <span className={operating_activities?.net >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(operating_activities?.net)}
              </span>
            </div>
          </div>
        </div>

        {/* Investing Activities */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Investing Activities</h3>
          </div>
          <div className="p-6 space-y-2">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Purchase of Assets</span>
              <span className="text-red-600 font-medium">-{formatCurrency(investing_activities?.purchase_of_assets)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Sale of Assets</span>
              <span className="text-green-600 font-medium">+{formatCurrency(investing_activities?.sale_of_assets)}</span>
            </div>
            <div className="flex justify-between py-2 font-semibold">
              <span className="text-slate-800">Net from Investing</span>
              <span className={investing_activities?.net >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(investing_activities?.net)}
              </span>
            </div>
          </div>
        </div>

        {/* Financing Activities */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Financing Activities</h3>
          </div>
          <div className="p-6 space-y-2">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Loan Receipts</span>
              <span className="text-green-600 font-medium">+{formatCurrency(financing_activities?.loan_receipts)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Loan Payments</span>
              <span className="text-red-600 font-medium">-{formatCurrency(financing_activities?.loan_payments)}</span>
            </div>
            <div className="flex justify-between py-2 font-semibold">
              <span className="text-slate-800">Net from Financing</span>
              <span className={financing_activities?.net >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatCurrency(financing_activities?.net)}
              </span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-white/80 text-sm">Opening Cash</div>
              <div className="text-xl font-bold">{formatCurrency(summary?.opening_cash)}</div>
            </div>
            <div>
              <div className="text-white/80 text-sm">Net Change</div>
              <div className="text-xl font-bold">{formatCurrency(summary?.net_change_in_cash)}</div>
            </div>
            <div>
              <div className="text-white/80 text-sm">Closing Cash</div>
              <div className="text-xl font-bold">{formatCurrency(summary?.closing_cash)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderOutstandingAgingReport = () => {
    if (!reportData) return null;

    const { summary, receivables_aging, top_debtors } = reportData;

    return (
      <div className="space-y-6">
        {renderSummaryCards()}

        {/* Aging Buckets */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Receivables Aging</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-5 gap-4">
              {Object.entries(receivables_aging || {}).map(([bucket, data]) => {
                const bucketColors = {
                  '0-30': 'bg-green-100 border-green-200 text-green-800',
                  '31-60': 'bg-yellow-100 border-yellow-200 text-yellow-800',
                  '61-90': 'bg-orange-100 border-orange-200 text-orange-800',
                  '91-180': 'bg-red-100 border-red-200 text-red-800',
                  '180+': 'bg-red-200 border-red-300 text-red-900'
                };
                
                return (
                  <div key={bucket} className={`rounded-lg p-4 border ${bucketColors[bucket] || 'bg-slate-100'}`}>
                    <div className="text-sm font-medium mb-2">{bucket} Days</div>
                    <div className="text-xl font-bold mb-1">{formatCurrency(data.amount)}</div>
                    <div className="text-xs opacity-80">{data.count} invoices</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Debtors */}
        {top_debtors && top_debtors.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Top Debtors</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Party</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Phone</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {top_debtors.map((debtor, idx) => (
                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-800 font-medium">{debtor.party_name}</td>
                      <td className="py-3 px-4 text-slate-600">{debtor.phone || '-'}</td>
                      <td className="py-3 px-4 text-right text-red-600 font-medium">{formatCurrency(debtor.outstanding)}</td>
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

  const renderExpenseSummaryReport = () => {
    if (!reportData) return null;

    return (
      <div className="space-y-6">
        {renderSummaryCards()}

        {/* Expenses by Category */}
        {reportData.by_category && reportData.by_category.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Expenses by Category</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Category</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Count</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Amount</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.by_category.map((cat, idx) => (
                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-800">{cat.category}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatNumber(cat.count)}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">{formatCurrency(cat.total)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-cyan-500 rounded-full"
                              style={{ width: `${cat.percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">{cat.percentage?.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payment Methods */}
        {reportData.by_payment_method && reportData.by_payment_method.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">By Payment Method</h3>
            </div>
            <div className="p-6 grid grid-cols-3 gap-4">
              {reportData.by_payment_method.map((method, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-4 text-center">
                  <div className="text-sm text-slate-500 capitalize mb-1">{method.method}</div>
                  <div className="text-xl font-bold text-slate-800">{formatCurrency(method.total)}</div>
                  <div className="text-xs text-slate-400">{method.count} transactions</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderReportContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="spinner w-10 h-10 border-4 border-cyan-200 border-t-cyan-500 rounded-full animate-spin"></div>
        </div>
      );
    }

    if (!reportData) {
      return (
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500">No report data available</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'sales':
        return renderSalesReport();
      case 'gst':
        return renderGSTReport();
      case 'profit_loss':
        return renderProfitLossReport();
      case 'balance_sheet':
        return renderBalanceSheet();
      case 'cash_flow':
        return renderCashFlowReport();
      case 'outstanding_aging':
        return renderOutstandingAgingReport();
      case 'expense':
        return renderExpenseSummaryReport();
      default:
        return renderSalesReport();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-slate-800">Financial Reports</h2>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-1.5 bg-slate-100 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <span>to</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-1.5 bg-slate-100 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Export Menu */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Export
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-10">
                  {['PDF', 'Excel', 'CSV', 'Print'].map((format) => (
                    <button
                      key={format}
                      onClick={() => handleExport(format.toLowerCase())}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      {format}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r border-slate-200 p-4 overflow-y-auto">
            <nav className="space-y-1">
              {reportTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setActiveTab(type.id)}
                  className={`w-full flex items-start gap-3 px-4 py-3 rounded-lg transition-all text-left ${
                    activeTab === type.id
                      ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={type.icon} />
                  </svg>
                  <div>
                    <div className="font-medium">{type.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{type.description}</div>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          {/* Report Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
            {renderReportContent()}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
          <span>Report generated on {new Date().toLocaleString()}</span>
          <span className="flex items-center gap-4">
            <span>Talk to Your Accounts</span>
            <span>Offline-First Accounting</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default Reports;
