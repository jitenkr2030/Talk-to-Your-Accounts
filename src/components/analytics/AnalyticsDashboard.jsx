import React, { useState } from 'react';
import useAnalytics from '../../hooks/useAnalytics';

const AnalyticsDashboard = () => {
  const {
    analyticsData,
    cashFlow,
    sales,
    expenses,
    anomalies,
    insights,
    isLoading,
    error,
    generateAnalytics,
    clearCache,
    updateFilters,
    clearError
  } = useAnalytics();

  const [activeTab, setActiveTab] = useState('overview');

  const handleRefresh = async () => {
    await generateAnalytics();
  };

  const handleClearCache = async () => {
    if (window.confirm('Are you sure you want to clear the analytics cache?')) {
      await clearCache();
      await generateAnalytics();
    }
  };

  const getInsightBadgeClass = (type) => {
    const classes = {
      positive: 'bg-green-100 text-green-800 border-green-200',
      warning: 'bg-red-100 text-red-800 border-red-200',
      caution: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return classes[type] || 'bg-gray-100 text-gray-800';
  };

  const getAnomalyBadgeClass = (severity) => {
    const classes = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800'
    };
    return classes[severity] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">AI Financial Analytics</h1>
          <p className="text-gray-500 mt-1">AI-powered insights and predictions for your business</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClearCache}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Clear Cache
          </button>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Analyzing...' : 'Refresh Analysis'}
          </button>
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

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'cashflow', label: 'Cash Flow' },
            { id: 'sales', label: 'Sales Prediction' },
            { id: 'expenses', label: 'Expenses' },
            { id: 'anomalies', label: 'Anomalies' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Analyzing your financial data...</p>
          </div>
        </div>
      )}

      {/* Overview Tab */}
      {!isLoading && activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm text-gray-500 mb-1">Current Balance</div>
              <div className="text-3xl font-bold text-gray-800">
                ₹{cashFlow?.summary?.currentBalance || '0'}
              </div>
              <div className="text-sm text-green-600 mt-2">
                +{cashFlow?.summary?.avgDailyIncome || '0'} avg daily income
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm text-gray-500 mb-1">Projected Balance (30 days)</div>
              <div className="text-3xl font-bold text-gray-800">
                ₹{cashFlow?.summary?.projected30Day || '0'}
              </div>
              <div className="text-sm text-gray-600 mt-2">
                Based on current trends
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm text-gray-500 mb-1">Predicted Sales (Next Month)</div>
              <div className="text-3xl font-bold text-gray-800">
                ₹{sales?.predictions?.[0]?.predictedSales || '0'}
              </div>
              <div className="text-sm text-gray-600 mt-2">
                {sales?.predictions?.[0]?.growthRate || '0'}% growth expected
              </div>
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">AI Insights</h2>
            <div className="space-y-3">
              {insights?.map((insight, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getInsightBadgeClass(insight.type)}`}
                >
                  <div className="font-medium">{insight.title}</div>
                  <div className="text-sm mt-1">{insight.message}</div>
                </div>
              ))}
              {!insights || insights.length === 0 && (
                <p className="text-gray-500">No insights available. Add more transaction data to get AI-powered insights.</p>
              )}
            </div>
          </div>

          {/* Anomaly Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Recent Anomalies</h2>
              <span className="text-sm text-gray-500">{anomalies?.length || 0} detected</span>
            </div>
            <div className="space-y-2">
              {anomalies?.slice(0, 5).map((anomaly) => (
                <div key={anomaly.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-800">₹{anomaly.amount}</div>
                    <div className="text-sm text-gray-500">{anomaly.party} - {anomaly.date}</div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getAnomalyBadgeClass(anomaly.severity)}`}>
                    {anomaly.severity}
                  </span>
                </div>
              ))}
              {(!anomalies || anomalies.length === 0) && (
                <p className="text-gray-500">No anomalies detected. Your transactions look normal!</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cash Flow Tab */}
      {!isLoading && activeTab === 'cashflow' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Current Balance</div>
              <div className="text-xl font-bold text-gray-800">₹{cashFlow?.summary?.currentBalance || '0'}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Projected (30 days)</div>
              <div className="text-xl font-bold text-gray-800">₹{cashFlow?.summary?.projected30Day || '0'}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Avg Daily Income</div>
              <div className="text-xl font-bold text-green-600">₹{cashFlow?.summary?.avgDailyIncome || '0'}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Avg Daily Expense</div>
              <div className="text-xl font-bold text-red-600">₹{cashFlow?.summary?.avgDailyExpense || '0'}</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Cash Flow Projection</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cashFlow?.forecast?.slice(0, 15).map((item, index) => (
                    <tr key={index} className={item.type === 'forecast' ? 'bg-blue-50' : ''}>
                      <td className="px-4 py-2 text-sm text-gray-800">{item.date}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${item.type === 'forecast' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                          {item.type === 'forecast' ? 'Projected' : 'Actual'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-800 text-right font-medium">
                        ₹{item.projectedBalance || item.actualBalance}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500 text-right">
                        {item.confidence ? `${item.confidence}%` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sales Tab */}
      {!isLoading && activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Total Sales</div>
              <div className="text-xl font-bold text-green-600">₹{sales?.summary?.totalSales || '0'}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Average Monthly</div>
              <div className="text-xl font-bold text-gray-800">₹{sales?.summary?.avgMonthly || '0'}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Trend</div>
              <div className="text-xl font-bold">
                <span className={`capitalize ${sales?.summary?.trend === 'increasing' ? 'text-green-600' : sales?.summary?.trend === 'decreasing' ? 'text-red-600' : 'text-gray-600'}`}>
                  {sales?.summary?.trend || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Historical Sales</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sales?.historical?.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-gray-800">{item.month}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 text-right font-medium">₹{item.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Sales Predictions</h2>
            <div className="space-y-3">
              {sales?.predictions?.map((prediction, index) => (
                <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-800">{prediction.month}</div>
                      <div className="text-sm text-gray-600">Expected: ₹{prediction.predictedSales}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${parseFloat(prediction.growthRate) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {prediction.growthRate}%
                      </div>
                      <div className="text-xs text-gray-500">Confidence: {prediction.confidence}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Expenses Tab */}
      {!isLoading && activeTab === 'expenses' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Total Expenses</div>
              <div className="text-xl font-bold text-red-600">₹{expenses?.summary?.totalExpenses || '0'}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Average Monthly</div>
              <div className="text-xl font-bold text-gray-800">₹{expenses?.summary?.avgMonthly || '0'}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Trend</div>
              <div className="text-xl font-bold capitalize">
                <span className={expenses?.summary?.trend === 'increasing' ? 'text-red-600' : expenses?.summary?.trend === 'decreasing' ? 'text-green-600' : 'text-gray-600'}>
                  {expenses?.summary?.trend || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Top Categories (Predicted)</h2>
            <div className="space-y-3">
              {expenses?.summary?.topCategories?.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-gray-800">{category.category}</div>
                  <div className="text-red-600 font-medium">₹{category.predicted}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Category Predictions</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Predicted</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Average</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Recurring</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Object.entries(expenses?.byCategory || {}).map(([category, data], index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-gray-800 font-medium">{category}</td>
                      <td className="px-4 py-2 text-sm text-gray-800 text-right">₹{data.predicted}</td>
                      <td className="px-4 py-2 text-sm text-gray-500 text-right">₹{data.average}</td>
                      <td className="px-4 py-2 text-center">
                        {data.isRecurring ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Yes</span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Anomalies Tab */}
      {!isLoading && activeTab === 'anomalies' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Detected Anomalies</h2>
            <p className="text-gray-500 mb-4">
              These transactions have amounts significantly different from your normal spending patterns.
            </p>
            <div className="space-y-3">
              {anomalies?.map((anomaly) => (
                <div key={anomaly.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-gray-800">₹{anomaly.amount}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getAnomalyBadgeClass(anomaly.severity)}`}>
                          {anomaly.severity}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">{anomaly.party}</div>
                      <div className="text-sm text-gray-500">{anomaly.date} • {anomaly.voucherType}</div>
                      <div className="text-sm text-gray-600 mt-2">{anomaly.description}</div>
                    </div>
                  </div>
                </div>
              ))}
              {(!anomalies || anomalies.length === 0) && (
                <div className="text-center py-12 text-gray-500">
                  No anomalies detected. Your transaction patterns look normal!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
