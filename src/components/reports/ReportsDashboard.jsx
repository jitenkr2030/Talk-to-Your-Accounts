/**
 * Reports Dashboard Component
 * 
 * Provides comprehensive financial reports and analytics including:
 * - Dashboard Summary
 * - Sales Reports
 * - Profit & Loss
 * - Balance Sheet
 * - Cash Flow
 * - Outstanding Aging
 * - Expense Summary
 */

import { useState, useEffect } from 'react';
import useReports from '../../hooks/useReports';

const ReportsDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  const {
    loading,
    error,
    dashboardSummary,
    salesReport,
    pnlReport,
    balanceSheet,
    cashFlow,
    outstanding,
    expenseSummary,
    getDashboardSummary,
    generateSalesReport,
    generatePNLReport,
    generateBalanceSheetReport,
    generateCashFlowReport,
    generateOutstandingReport,
    generateExpenseReport,
    clearError
  } = useReports();

  // Load initial data
  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab, dateRange]);

  const loadTabData = async (tab) => {
    switch (tab) {
      case 'dashboard':
        await getDashboardSummary();
        break;
      case 'sales':
        await generateSalesReport(dateRange);
        break;
      case 'pnl':
        await generatePNLReport(dateRange);
        break;
      case 'balance':
        await generateBalanceSheetReport(dateRange.endDate);
        break;
      case 'cashflow':
        await generateCashFlowReport(dateRange);
        break;
      case 'outstanding':
        await generateOutstandingReport();
        break;
      case 'expenses':
        await generateExpenseReport(dateRange);
        break;
      default:
        break;
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '₹0';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Render dashboard overview
  const renderDashboard = () => (
    <div className="dashboard-overview">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', opacity: 0.9 }}>Total Sales (This Month)</h3>
          <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{formatCurrency(dashboardSummary?.sales?.total_sales)}</p>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', opacity: 0.8 }}>{dashboardSummary?.sales?.transaction_count || 0} transactions</p>
        </div>
        
        <div className="card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', opacity: 0.9 }}>Outstanding Receivables</h3>
          <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{formatCurrency(dashboardSummary?.outstanding?.total_outstanding)}</p>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', opacity: 0.8 }}>{dashboardSummary?.outstanding?.total_invoices || 0} invoices</p>
        </div>
        
        <div className="card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', opacity: 0.9 }}>Total Expenses (This Month)</h3>
          <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{formatCurrency(dashboardSummary?.expenses?.total_expenses)}</p>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', opacity: 0.8 }}>{dashboardSummary?.expenses?.transaction_count || 0} expenses</p>
        </div>
        
        <div className="card" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', padding: '1.5rem', borderRadius: '12px', color: 'white' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', opacity: 0.9 }}>GST Collected</h3>
          <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>{formatCurrency(dashboardSummary?.sales?.total_gst)}</p>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', opacity: 0.8 }}>This month</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h4 style={{ margin: '0 0 1rem 0' }}>Sales Performance</h4>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Paid Amount</span>
              <span style={{ fontWeight: '600' }}>{formatCurrency(dashboardSummary?.sales?.paid_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Pending Amount</span>
              <span style={{ fontWeight: '600', color: '#f59e0b' }}>{formatCurrency(dashboardSummary?.sales?.pending_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>Avg. Transaction</span>
              <span style={{ fontWeight: '600' }}>{formatCurrency(dashboardSummary?.sales?.average_transaction)}</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h4 style={{ margin: '0 0 1rem 0' }}>Outstanding Aging</h4>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>0-30 Days</span>
              <span style={{ fontWeight: '600' }}>{formatCurrency(dashboardSummary?.outstanding?.byAge?.['0-30'])}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>31-60 Days</span>
              <span style={{ fontWeight: '600' }}>{formatCurrency(dashboardSummary?.outstanding?.byAge?.['31-60'])}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>61-90 Days</span>
              <span style={{ fontWeight: '600', color: '#f59e0b' }}>{formatCurrency(dashboardSummary?.outstanding?.byAge?.['61-90'])}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#6b7280' }}>90+ Days</span>
              <span style={{ fontWeight: '600', color: '#ef4444' }}>{formatCurrency(dashboardSummary?.outstanding?.byAge?.['90+'])}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render sales report
  const renderSalesReport = () => (
    <div className="sales-report">
      <h3>Sales Report</h3>
      {salesReport ? (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 1rem 0' }}>Summary</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Total Sales</p>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(salesReport.summary?.total_sales)}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Taxable Amount</p>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(salesReport.summary?.taxable_amount)}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>GST Collected</p>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(salesReport.summary?.total_gst)}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Transactions</p>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{salesReport.summary?.transaction_count}</p>
              </div>
            </div>
          </div>

          {salesReport.salesByParty && salesReport.salesByParty.length > 0 && (
            <div className="card" style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <h4 style={{ margin: '0 0 1rem 0' }}>Top Customers</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Customer</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {salesReport.salesByParty.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.5rem' }}>{item.party_name || 'Unknown'}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <p style={{ color: '#6b7280' }}>No sales data available for the selected period.</p>
      )}
    </div>
  );

  // Render P&L Report
  const renderPNL = () => (
    <div className="pnl-report">
      <h3>Profit & Loss Report</h3>
      {pnlReport ? (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 1rem 0' }}>Income</h4>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span>Sales Revenue</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(pnlReport.income?.sales)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '2px solid #e5e7eb' }}>
                <span style={{ fontWeight: '600' }}>Total Income</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(pnlReport.income?.total)}</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 1rem 0' }}>Expenses</h4>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span>Cost of Goods Sold</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(pnlReport.expenses?.cogs)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span>Operating Expenses</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(pnlReport.expenses?.operating)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '2px solid #e5e7eb' }}>
                <span style={{ fontWeight: '600' }}>Total Expenses</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(pnlReport.expenses?.total)}</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', borderRadius: '8px', background: pnlReport.netProfit >= 0 ? '#dcfce7' : '#fef2f2' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0 }}>Net {pnlReport.netProfit >= 0 ? 'Profit' : 'Loss'}</h4>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: pnlReport.netProfit >= 0 ? '#166534' : '#dc2626' }}>
                {formatCurrency(Math.abs(pnlReport.netProfit))}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <p style={{ color: '#6b7280' }}>No P&L data available for the selected period.</p>
      )}
    </div>
  );

  // Render Balance Sheet
  const renderBalanceSheet = () => (
    <div className="balance-sheet">
      <h3>Balance Sheet</h3>
      {balanceSheet ? (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 1rem 0' }}>Assets</h4>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span>Current Assets</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(balanceSheet.assets?.current)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span>Fixed Assets</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(balanceSheet.assets?.fixed)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '2px solid #e5e7eb' }}>
                <span style={{ fontWeight: '600' }}>Total Assets</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(balanceSheet.assets?.total)}</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 1rem 0' }}>Liabilities & Equity</h4>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span>Current Liabilities</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(balanceSheet.liabilities?.current)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span>Long-term Liabilities</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(balanceSheet.liabilities?.longTerm)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span>Equity</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(balanceSheet.equity)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '2px solid #e5e7eb' }}>
                <span style={{ fontWeight: '600' }}>Total Liabilities & Equity</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(balanceSheet.liabilities?.total + balanceSheet.equity)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p style={{ color: '#6b7280' }}>No balance sheet data available.</p>
      )}
    </div>
  );

  // Render Outstanding Aging
  const renderOutstanding = () => (
    <div className="outstanding-report">
      <h3>Outstanding Receivables</h3>
      {outstanding ? (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 1rem 0' }}>Summary</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Total Outstanding</p>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>{formatCurrency(outstanding.total_outstanding)}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Total Invoices</p>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{outstanding.total_invoices}</p>
              </div>
            </div>
          </div>

          {outstanding.byParty && outstanding.byParty.length > 0 && (
            <div className="card" style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <h4 style={{ margin: '0 0 1rem 0' }}>Outstanding by Customer</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Customer</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Age</th>
                  </tr>
                </thead>
                <tbody>
                  {outstanding.byParty.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.5rem' }}>{item.party_name || 'Unknown'}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>{formatCurrency(item.total)}</td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>{item.aging_days} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <p style={{ color: '#6b7280' }}>No outstanding receivables data available.</p>
      )}
    </div>
  );

  // Render Expense Summary
  const renderExpenses = () => (
    <div className="expense-report">
      <h3>Expense Summary</h3>
      {expenseSummary ? (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h4 style={{ margin: '0 0 1rem 0' }}>Summary</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Total Expenses</p>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(expenseSummary.total_expenses)}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Transactions</p>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{expenseSummary.transaction_count}</p>
              </div>
              <div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Average Expense</p>
                <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{formatCurrency(expenseSummary.average_expense)}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p style={{ color: '#6b7280' }}>No expense data available for the selected period.</p>
      )}
    </div>
  );

  // Date range picker
  const renderDateRangePicker = () => (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
      <label style={{ fontSize: '0.875rem', color: '#6b7280' }}>From:</label>
      <input 
        type="date" 
        value={dateRange.startDate}
        onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
        style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
      />
      <label style={{ fontSize: '0.875rem', color: '#6b7280' }}>To:</label>
      <input 
        type="date" 
        value={dateRange.endDate}
        onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
        style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
      />
    </div>
  );

  return (
    <div className="reports-dashboard" style={{ padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>Reports & Analytics</h2>
        <p style={{ margin: 0, color: '#6b7280' }}>
          Financial insights and business intelligence
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
        marginBottom: '2rem',
        overflowX: 'auto'
      }}>
        {[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'sales', label: 'Sales' },
          { id: 'pnl', label: 'Profit & Loss' },
          { id: 'balance', label: 'Balance Sheet' },
          { id: 'outstanding', label: 'Outstanding' },
          { id: 'expenses', label: 'Expenses' }
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
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date Range Picker (except for dashboard) */}
      {activeTab !== 'dashboard' && renderDateRangePicker()}

      {/* Tab Content */}
      <div className="tab-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p>Loading report data...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'sales' && renderSalesReport()}
            {activeTab === 'pnl' && renderPNL()}
            {activeTab === 'balance' && renderBalanceSheet()}
            {activeTab === 'outstanding' && renderOutstanding()}
            {activeTab === 'expenses' && renderExpenses()}
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsDashboard;
