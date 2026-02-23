/**
 * Currency Dashboard Component
 * Multi-currency management interface with exchange rates, conversions, and transaction tracking
 */

import { useState, useEffect } from 'react';
import useCurrency from '../../hooks/useCurrency';

const CurrencyDashboard = () => {
  const {
    currencies,
    exchangeRates,
    transactions,
    settings,
    loading,
    error,
    fetchCurrencies,
    fetchExchangeRates,
    convertCurrency,
    recordTransaction,
    fetchTransactions,
    deleteTransaction,
    getConsolidatedReport,
    fetchSettings,
    updateSettings,
    fetchLiveRates,
    clearError
  } = useCurrency();

  const [activeTab, setActiveTab] = useState('overview');
  const [conversionForm, setConversionForm] = useState({
    amount: '',
    fromCurrency: 'USD',
    toCurrency: 'INR'
  });
  const [conversionResult, setConversionResult] = useState(null);
  const [transactionForm, setTransactionForm] = useState({
    type: 'expense',
    description: '',
    amount: '',
    currency: 'USD',
    category: '',
    reference: ''
  });
  const [reportData, setReportData] = useState(null);
  const [reportFilters, setReportFilters] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    baseCurrency: 'INR'
  });

  // Handle currency conversion
  const handleConvert = async (e) => {
    e.preventDefault();
    try {
      const result = await convertCurrency(
        parseFloat(conversionForm.amount),
        conversionForm.fromCurrency,
        conversionForm.toCurrency
      );
      setConversionResult(result);
    } catch (err) {
      console.error('Conversion error:', err);
    }
  };

  // Handle recording a transaction
  const handleRecordTransaction = async (e) => {
    e.preventDefault();
    try {
      await recordTransaction({
        ...transactionForm,
        amount: parseFloat(transactionForm.amount),
        date: new Date().toISOString()
      });
      setTransactionForm({
        type: 'expense',
        description: '',
        amount: '',
        currency: 'USD',
        category: '',
        reference: ''
      });
      alert('Transaction recorded successfully!');
    } catch (err) {
      console.error('Error recording transaction:', err);
    }
  };

  // Handle generating consolidated report
  const handleGenerateReport = async (e) => {
    e.preventDefault();
    try {
      const report = await getConsolidatedReport(
        reportFilters.startDate,
        reportFilters.endDate,
        reportFilters.baseCurrency
      );
      setReportData(report);
    } catch (err) {
      console.error('Error generating report:', err);
    }
  };

  // Handle updating base currency
  const handleBaseCurrencyChange = async (baseCurrency) => {
    try {
      await updateSettings({ baseCurrency });
      alert('Base currency updated successfully!');
    } catch (err) {
      console.error('Error updating base currency:', err);
    }
  };

  // Handle fetching live rates
  const handleFetchLiveRates = async () => {
    try {
      await fetchLiveRates();
      alert('Exchange rates updated successfully!');
    } catch (err) {
      console.error('Error fetching live rates:', err);
    }
  };

  // Format currency amount
  const formatCurrency = (amount, currencyCode) => {
    const currency = currencies.find(c => c.code === currencyCode);
    const symbol = currency?.symbol || currencyCode;
    return `${symbol} ${amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Tab navigation items
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'convert', label: 'Convert' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'rates', label: 'Exchange Rates' },
    { id: 'report', label: 'Reports' },
    { id: 'settings', label: 'Settings' }
  ];

  if (loading && !currencies.length) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Multi-Currency Management</h1>
        <p className="text-slate-400">Manage multiple currencies, exchange rates, and track international transactions</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400">{error}</p>
          <button onClick={clearError} className="text-sm text-red-300 hover:underline mt-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-700 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Base Currency Card */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-slate-400 text-sm mb-2">Base Currency</h3>
            <p className="text-3xl font-bold text-white">{settings?.baseCurrency || 'INR'}</p>
          </div>

          {/* Total Currencies Card */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-slate-400 text-sm mb-2">Supported Currencies</h3>
            <p className="text-3xl font-bold text-white">{currencies.length}</p>
          </div>

          {/* Exchange Rates Card */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-slate-400 text-sm mb-2">Last Updated</h3>
            <p className="text-lg font-medium text-white">
              {exchangeRates?.lastUpdated
                ? new Date(exchangeRates.lastUpdated).toLocaleString()
                : 'N/A'}
            </p>
          </div>

          {/* Transactions Card */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-slate-400 text-sm mb-2">Total Transactions</h3>
            <p className="text-3xl font-bold text-white">{transactions.length}</p>
          </div>

          {/* Quick Stats */}
          <div className="col-span-full bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Exchange Rates (Base: INR)</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(exchangeRates?.rates || {}).map(([code, rate]) => (
                <div key={code} className="bg-slate-700/50 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">{code}</p>
                  <p className="text-white font-semibold">{rate.toFixed(4)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Convert Tab */}
      {activeTab === 'convert' && (
        <div className="max-w-2xl">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6">Currency Converter</h2>
            
            <form onSubmit={handleConvert} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={conversionForm.amount}
                  onChange={(e) => setConversionForm({ ...conversionForm, amount: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter amount"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">From</label>
                  <select
                    value={conversionForm.fromCurrency}
                    onChange={(e) => setConversionForm({ ...conversionForm, fromCurrency: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {currencies.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.code} - {curr.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">To</label>
                  <select
                    value={conversionForm.toCurrency}
                    onChange={(e) => setConversionForm({ ...conversionForm, toCurrency: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {currencies.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.code} - {curr.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Convert
              </button>
            </form>

            {conversionResult && (
              <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-slate-400 text-sm">Conversion Result</p>
                <p className="text-2xl font-bold text-green-400 mt-1">
                  {formatCurrency(conversionResult.to.amount, conversionResult.to.currency)}
                </p>
                <p className="text-slate-400 text-sm mt-2">
                  Rate: 1 {conversionResult.from.currency} = {conversionResult.rate.toFixed(4)} {conversionResult.to.currency}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          {/* Record New Transaction */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6">Record Transaction</h2>
            
            <form onSubmit={handleRecordTransaction} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Type</label>
                  <select
                    value={transactionForm.type}
                    onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">Currency</label>
                  <select
                    value={transactionForm.currency}
                    onChange={(e) => setTransactionForm({ ...transactionForm, currency: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {currencies.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.code} - {curr.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">Description</label>
                <input
                  type="text"
                  value={transactionForm.description}
                  onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter description"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={transactionForm.amount}
                    onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter amount"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">Category</label>
                  <input
                    type="text"
                    value={transactionForm.category}
                    onChange={(e) => setTransactionForm({ ...transactionForm, category: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Sales, Travel"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Record Transaction
              </button>
            </form>
          </div>

          {/* Transaction List */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6">Recent Transactions</h2>
            
            {transactions.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No transactions recorded yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left text-slate-400 text-sm py-3 px-4">Date</th>
                      <th className="text-left text-slate-400 text-sm py-3 px-4">Description</th>
                      <th className="text-left text-slate-400 text-sm py-3 px-4">Type</th>
                      <th className="text-right text-slate-400 text-sm py-3 px-4">Amount</th>
                      <th className="text-right text-slate-400 text-sm py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 20).map((txn) => (
                      <tr key={txn.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        <td className="py-3 px-4 text-white">
                          {new Date(txn.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-white">{txn.description}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            txn.type === 'income' ? 'bg-green-500/20 text-green-400' :
                            txn.type === 'expense' ? 'bg-red-500/20 text-red-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {txn.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-white">
                          {formatCurrency(txn.amount, txn.currency)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => deleteTransaction(txn.id)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exchange Rates Tab */}
      {activeTab === 'rates' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">Exchange Rates</h2>
            <button
              onClick={handleFetchLiveRates}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Update Rates
            </button>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <p className="text-slate-400 text-sm mb-4">
              Last Updated: {exchangeRates?.lastUpdated ? new Date(exchangeRates.lastUpdated).toLocaleString() : 'N/A'}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currencies.map((curr) => (
                <div key={curr.code} className="bg-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-semibold">{curr.code}</span>
                    <span className="text-2xl">{curr.symbol}</span>
                  </div>
                  <p className="text-slate-400 text-sm">{curr.name}</p>
                  <p className="text-white text-lg mt-2">
                    {exchangeRates?.rates?.[curr.code]?.toFixed(4) || 'N/A'}
                  </p>
                  <p className="text-slate-500 text-xs">per INR</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6">Consolidated Report</h2>
            
            <form onSubmit={handleGenerateReport} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Start Date</label>
                  <input
                    type="date"
                    value={reportFilters.startDate}
                    onChange={(e) => setReportFilters({ ...reportFilters, startDate: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">End Date</label>
                  <input
                    type="date"
                    value={reportFilters.endDate}
                    onChange={(e) => setReportFilters({ ...reportFilters, endDate: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">Base Currency</label>
                  <select
                    value={reportFilters.baseCurrency}
                    onChange={(e) => setReportFilters({ ...reportFilters, baseCurrency: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {currencies.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Generate Report
              </button>
            </form>
          </div>

          {reportData && (
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Report Summary</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">Total Income</p>
                  <p className="text-2xl font-bold text-green-400">
                    {formatCurrency(reportData.summary.totalIncome, reportData.baseCurrency)}
                  </p>
                </div>
                
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">Total Expense</p>
                  <p className="text-2xl font-bold text-red-400">
                    {formatCurrency(reportData.summary.totalExpense, reportData.baseCurrency)}
                  </p>
                </div>
                
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-slate-400 text-sm">Net Balance</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {formatCurrency(reportData.summary.netBalance, reportData.baseCurrency)}
                  </p>
                </div>
              </div>

              <h4 className="text-white font-semibold mb-3">By Currency</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left text-slate-400 text-sm py-2 px-4">Currency</th>
                      <th className="text-right text-slate-400 text-sm py-2 px-4">Income</th>
                      <th className="text-right text-slate-400 text-sm py-2 px-4">Expense</th>
                      <th className="text-right text-slate-400 text-sm py-2 px-4">Balance</th>
                      <th className="text-right text-slate-400 text-sm py-2 px-4">Transactions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(reportData.summary.byCurrency).map(([code, data]) => (
                      <tr key={code} className="border-b border-slate-700/50">
                        <td className="py-2 px-4 text-white font-medium">{code}</td>
                        <td className="py-2 px-4 text-right text-green-400">
                          {formatCurrency(data.income, code)}
                        </td>
                        <td className="py-2 px-4 text-right text-red-400">
                          {formatCurrency(data.expense, code)}
                        </td>
                        <td className="py-2 px-4 text-right text-white">
                          {formatCurrency(data.balance, code)}
                        </td>
                        <td className="py-2 px-4 text-right text-slate-400">
                          {data.transactionCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6">Currency Settings</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Base Currency</label>
                <select
                  value={settings?.baseCurrency || 'INR'}
                  onChange={(e) => handleBaseCurrencyChange(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {currencies.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.code} - {curr.name}
                    </option>
                  ))}
                </select>
                <p className="text-slate-500 text-sm mt-2">
                  All consolidated reports will be calculated in this currency
                </p>
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">Auto-Update Rates</label>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="autoUpdate"
                    checked={settings?.autoUpdateRates || false}
                    onChange={(e) => updateSettings({ autoUpdateRates: e.target.checked })}
                    className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="autoUpdate" className="text-white">
                    Automatically update exchange rates
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencyDashboard;
