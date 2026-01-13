import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  FileText,
  ArrowUpRight,
  Receipt,
  UserPlus,
  FilePlus,
  Download,
  Upload,
  Shield,
  Zap
} from 'lucide-react';
import useAppStore from '../stores/appStore';
import AlertNotificationCenter from '../components/features/AlertNotificationCenter';

const LandingPage = ({ onNavigate }) => {
  const {
    currentUser,
    transactions,
    parties,
    products,
    expenses,
    unreadAlertCount,
    loadDashboardSummary,
    loadTransactions,
    loadParties,
    loadProducts,
    loadExpenses,
    loadAlerts,
    addMessage
  } = useAppStore();

  const [showAlerts, setShowAlerts] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Load dashboard data
  useEffect(() => {
    loadDashboardSummary('today');
    loadTransactions({ limit: 5 });
    loadParties();
    loadProducts();
    loadAlerts({});
  }, []);

  // Calculate derived metrics
  const todaySales = transactions
    .filter(t => t.voucher_type === 'sale' && t.date === new Date().toISOString().split('T')[0])
    .reduce((sum, t) => sum + (t.total_amount || 0), 0);

  const pendingPayments = transactions
    .filter(t => t.payment_status !== 'paid' && t.voucher_type === 'sale')
    .reduce((sum, t) => sum + (t.total_amount || 0), 0);

  const totalExpenses = expenses
    .filter(e => e.date === new Date().toISOString().split('T')[0])
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const netCashFlow = todaySales - totalExpenses;

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Quick actions
  const quickActions = [
    { id: 'sale', label: 'New Sale', icon: FilePlus, color: 'bg-emerald-500', action: () => addMessage('user', 'Record a new sale transaction') },
    { id: 'purchase', label: 'New Purchase', icon: FilePlus, color: 'bg-blue-500', action: () => addMessage('user', 'Record a new purchase transaction') },
    { id: 'expense', label: 'Add Expense', icon: Receipt, color: 'bg-amber-500', action: () => addMessage('user', 'Add a new expense') },
    { id: 'party', label: 'Add Party', icon: UserPlus, color: 'bg-purple-500', action: () => addMessage('user', 'Add a new party') },
    { id: 'export', label: 'Export Data', icon: Download, color: 'bg-cyan-500', action: () => onNavigate?.('data') },
    { id: 'import', label: 'Import Data', icon: Upload, color: 'bg-indigo-500', action: () => onNavigate?.('data') },
  ];

  // Stat cards data
  const stats = [
    {
      label: "Today's Sales",
      value: formatCurrency(todaySales),
      change: '+12.5%',
      trend: 'up',
      icon: TrendingUp,
      color: 'emerald'
    },
    {
      label: 'Pending Receivables',
      value: formatCurrency(pendingPayments),
      change: '-3.2%',
      trend: 'down',
      icon: Clock,
      color: 'amber'
    },
    {
      label: "Today's Expenses",
      value: formatCurrency(totalExpenses),
      change: '+8.1%',
      trend: 'up',
      icon: TrendingDown,
      color: 'red'
    },
    {
      label: 'Net Cash Flow',
      value: formatCurrency(netCashFlow),
      change: '+15.3%',
      trend: 'up',
      icon: DollarSign,
      color: 'blue'
    }
  ];

  // Recent transactions
  const recentTransactions = transactions.slice(0, 5);

  // AI suggestions
  const aiSuggestions = [
    "Show today's sales report",
    "Record a sale of ₹5,000",
    "Add expense for rent",
    "Show pending payments",
    "Generate GST report"
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Search / AI Command */}
          <div className="flex-1 max-w-2xl">
            <div className={`relative transition-all duration-300 ${searchFocused ? 'scale-105' : ''}`}>
              <svg
                size={20}
                className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                  searchFocused ? 'text-emerald-500' : 'text-slate-400'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Ask me anything... (e.g., 'Show today's sales')"
                className="w-full pl-12 pr-20 py-3 bg-slate-100 border-2 border-transparent rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  className={`p-2 rounded-lg transition-all ${
                    isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Voice Input"
                >
                  <svg size={18} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Quick Suggestions */}
            {aiQuery === '' && (
              <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
                <span className="text-xs text-slate-400 whitespace-nowrap">Try asking:</span>
                {aiSuggestions.slice(0, 4).map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setAiQuery(suggestion)}
                    className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full whitespace-nowrap transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4 ml-6">
            {/* Notifications */}
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <svg size={20} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadAlertCount > 9 ? '9+' : unreadAlertCount}
                </span>
              )}
            </button>

            {/* Settings */}
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <svg size={20} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="p-8 flex-1">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">
            Welcome back, {currentUser?.username || 'there'}! 👋
          </h1>
          <p className="text-slate-500 mt-1">
            Here&apos;s what&apos;s happening with your business today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-${stat.color}-50`}>
                  <stat.icon size={24} className={`text-${stat.color}-500`} />
                </div>
                <span className={`flex items-center gap-1 text-xs font-medium ${
                  stat.trend === 'up' ? 'text-emerald-500' : 'text-red-500'
                }`}>
                  {stat.trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {stat.change}
                </span>
              </div>
              <p className="text-sm text-slate-500 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-6 gap-4">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={action.action}
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className={`p-3 rounded-xl ${action.color} group-hover:scale-110 transition-transform`}>
                  <action.icon size={24} className="text-white" />
                </div>
                <span className="text-sm font-medium text-slate-600">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-3 gap-6">
          {/* Recent Transactions */}
          <div className="col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">Recent Transactions</h2>
              <button className="flex items-center gap-1 text-sm text-emerald-500 hover:text-emerald-600">
                View All
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {recentTransactions.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">No transactions yet</p>
                  <p className="text-sm text-slate-400 mt-1">Start by recording your first transaction</p>
                </div>
              ) : (
                recentTransactions.map((txn, i) => (
                  <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        txn.voucher_type === 'sale' ? 'bg-emerald-50' :
                        txn.voucher_type === 'purchase' ? 'bg-red-50' : 'bg-slate-50'
                      }`}>
                        {txn.voucher_type === 'sale' ? (
                          <ArrowUpRight size={20} className="text-emerald-500" />
                        ) : txn.voucher_type === 'purchase' ? (
                          <TrendingDown size={20} className="text-red-500" />
                        ) : (
                          <FileText size={20} className="text-slate-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{txn.voucher_no}</p>
                        <p className="text-sm text-slate-500">{txn.party_name || 'No party'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-800">
                        {txn.voucher_type === 'sale' ? '+' : txn.voucher_type === 'purchase' ? '-' : ''}
                        {formatCurrency(txn.total_amount)}
                      </p>
                      <p className="text-sm text-slate-500">{txn.date}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Alerts & Insights */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800">Alerts</h2>
              <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-xs font-medium rounded-full">
                {unreadAlertCount} new
              </span>
            </div>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {[
                { type: 'warning', title: 'Low Stock Alert', desc: '5 items running low', time: '2h ago' },
                { type: 'info', title: 'GST Filing Due', desc: 'Return filing due in 3 days', time: '5h ago' },
                { type: 'success', title: 'Payment Received', desc: '₹25,000 from ABC Corp', time: '1d ago' },
                { type: 'warning', title: 'Overdue Payment', desc: '₹15,000 from XYZ Ltd', time: '2d ago' },
              ].map((alert, i) => (
                <div key={i} className="px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      alert.type === 'warning' ? 'bg-amber-50' :
                      alert.type === 'success' ? 'bg-emerald-50' : 'bg-blue-50'
                    }`}>
                      {alert.type === 'warning' ? (
                        <AlertCircle size={16} className="text-amber-500" />
                      ) : alert.type === 'success' ? (
                        <CheckCircle size={16} className="text-emerald-500" />
                      ) : (
                        <svg size={16} className="text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm">{alert.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{alert.desc}</p>
                      <p className="text-xs text-slate-400 mt-1">{alert.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-3 border-t border-slate-100">
              <button className="w-full text-center text-sm text-emerald-500 hover:text-emerald-600 font-medium">
                View All Alerts
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-3 gap-6 mt-6">
          {/* Health Score */}
          <div className="bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={20} className="text-white/80" />
              <span className="text-sm font-medium text-white/80">Business Health Score</span>
            </div>
            <div className="flex items-end gap-4">
              <span className="text-5xl font-bold">85</span>
              <span className="text-lg text-white/80 mb-2">/ 100</span>
            </div>
            <p className="text-sm text-white/80 mt-2">Your business is doing great!</p>
            <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full w-[85%] bg-white rounded-full"></div>
            </div>
          </div>

          {/* Party Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Party Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50 rounded-xl">
                <p className="text-2xl font-bold text-emerald-600">{parties.length || 0}</p>
                <p className="text-sm text-emerald-600/70">Total Parties</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-2xl font-bold text-blue-600">{products.length || 0}</p>
                <p className="text-sm text-blue-600/70">Products</p>
              </div>
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Today&apos;s Expenses</h3>
            <div className="space-y-3">
              {[
                { category: 'Office Supplies', amount: 2500, percent: 35 },
                { category: 'Transportation', amount: 1800, percent: 25 },
                { category: 'Utilities', amount: 1500, percent: 20 },
                { category: 'Others', amount: 1400, percent: 20 },
              ].map((exp, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600">{exp.category}</span>
                    <span className="font-medium text-slate-800">{formatCurrency(exp.amount)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${exp.percent}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Alert Notification Center */}
      <AlertNotificationCenter
        isOpen={showAlerts}
        onClose={() => setShowAlerts(false)}
      />
    </div>
  );
};

export default LandingPage;
