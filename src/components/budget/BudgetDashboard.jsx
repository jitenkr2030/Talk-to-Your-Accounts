import { useState, useEffect } from 'react';
import useBudget from '../../hooks/useBudget';

const BudgetDashboard = () => {
  const {
    budgets,
    budgetSummary,
    budgetAlerts,
    loading,
    error,
    fetchBudgets,
    createBudget,
    updateBudget,
    deleteBudget,
    fetchBudgetSummary,
    fetchBudgetAlerts,
    exportBudgets
  } = useBudget();

  const [showAddBudget, setShowAddBudget] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [budgetForm, setBudgetForm] = useState({
    name: '',
    category_id: '',
    amount: '',
    period_type: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    alert_threshold: 80
  });
  const [filters, setFilters] = useState({
    period_type: '',
    is_active: ''
  });

  useEffect(() => {
    fetchBudgetSummary();
    fetchBudgetAlerts();
  }, [fetchBudgetSummary, fetchBudgetAlerts]);

  const handleBudgetSubmit = async (e) => {
    e.preventDefault();
    try {
      await createBudget(budgetForm);
      setShowAddBudget(false);
      setBudgetForm({
        name: '',
        category_id: '',
        amount: '',
        period_type: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        alert_threshold: 80
      });
    } catch (err) {
      console.error('Error creating budget:', err);
    }
  };

  const handleDeleteBudget = async (id) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        await deleteBudget(id);
      } catch (err) {
        console.error('Error deleting budget:', err);
      }
    }
  };

  const handleToggleActive = async (budget) => {
    try {
      await updateBudget(budget.id, { is_active: !budget.is_active });
    } catch (err) {
      console.error('Error toggling budget status:', err);
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportBudgets(filters);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budgets_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting budgets:', err);
    }
  };

  const getProgressBarColor = (percent) => {
    if (percent >= 100) return 'bg-red-500';
    if (percent >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="p-6 bg-slate-900 min-h-screen text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Budget Management</h1>
          <p className="text-slate-400 mt-1">Plan and track your spending against budgets</p>
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
            onClick={() => setShowAddBudget(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Budget
          </button>
        </div>
      </div>

      {/* Alerts */}
      {budgetAlerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {budgetAlerts.map((alert, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg flex items-center justify-between ${
                alert.severity === 'critical' ? 'bg-red-900/50 border border-red-500' : 'bg-yellow-900/50 border border-yellow-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <svg className={`w-6 h-6 ${alert.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{alert.message}</span>
              </div>
              <button
                onClick={() => fetchBudgetAlerts()}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      {budgetSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 p-4 rounded-lg">
            <p className="text-slate-400 text-sm">Total Budgeted</p>
            <p className="text-2xl font-bold text-blue-400">{formatCurrency(budgetSummary.total_budgeted)}</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-lg">
            <p className="text-slate-400 text-sm">Total Spent</p>
            <p className="text-2xl font-bold text-orange-400">{formatCurrency(budgetSummary.total_spent)}</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-lg">
            <p className="text-slate-400 text-sm">Total Remaining</p>
            <p className={`text-2xl font-bold ${budgetSummary.total_remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(budgetSummary.total_remaining)}
            </p>
          </div>
          <div className="bg-slate-800 p-4 rounded-lg">
            <p className="text-slate-400 text-sm">Active Budgets</p>
            <p className="text-2xl font-bold text-purple-400">{budgetSummary.budgets?.length || 0}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-slate-800 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Period Type</label>
            <select
              value={filters.period_type}
              onChange={(e) => setFilters({ ...filters, period_type: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            >
              <option value="">All Periods</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
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
          <div className="flex items-end">
            <button
              onClick={() => fetchBudgets(filters)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg w-full"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Budget List */}
      <div className="bg-slate-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Budget Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Period</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Budgeted</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Spent</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Remaining</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Progress</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="px-4 py-8 text-center text-slate-400">Loading...</td>
              </tr>
            ) : budgets.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-4 py-8 text-center text-slate-400">
                  No budgets found. Create your first budget to start tracking spending.
                </td>
              </tr>
            ) : (
              budgets.map((budget) => {
                const summary = budgetSummary?.budgets?.find(b => b.id === budget.id) || {};
                const percentUsed = summary.percent_used || 0;
                
                return (
                  <tr key={budget.id} className="border-t border-slate-700 hover:bg-slate-750">
                    <td className="px-4 py-3 text-sm font-medium">{budget.name}</td>
                    <td className="px-4 py-3 text-sm capitalize">{budget.period_type}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(budget.amount)}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(summary.actual_spent || 0)}</td>
                    <td className={`px-4 py-3 text-sm text-right ${summary.remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(summary.remaining || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getProgressBarColor(percentUsed)}`}
                            style={{ width: `${Math.min(percentUsed, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 w-12 text-right">{percentUsed.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${budget.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {budget.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleToggleActive(budget)}
                          className="p-1 text-blue-400 hover:text-blue-300"
                          title={budget.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteBudget(budget.id)}
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
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Budget Modal */}
      {showAddBudget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-lg w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Create New Budget</h2>
            <form onSubmit={handleBudgetSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Budget Name</label>
                  <input
                    type="text"
                    value={budgetForm.name}
                    onChange={(e) => setBudgetForm({ ...budgetForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="e.g., Marketing Expenses"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Budget Amount (₹)</label>
                  <input
                    type="number"
                    value={budgetForm.amount}
                    onChange={(e) => setBudgetForm({ ...budgetForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    placeholder="50000"
                    required
                    min="0"
                    step="100"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Period Type</label>
                  <select
                    value={budgetForm.period_type}
                    onChange={(e) => setBudgetForm({ ...budgetForm, period_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={budgetForm.start_date}
                      onChange={(e) => setBudgetForm({ ...budgetForm, start_date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">End Date (Optional)</label>
                    <input
                      type="date"
                      value={budgetForm.end_date}
                      onChange={(e) => setBudgetForm({ ...budgetForm, end_date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Alert Threshold (%)</label>
                  <input
                    type="number"
                    value={budgetForm.alert_threshold}
                    onChange={(e) => setBudgetForm({ ...budgetForm, alert_threshold: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    min="0"
                    max="100"
                  />
                  <p className="text-xs text-slate-400 mt-1">Get alerts when spending reaches this percentage of budget</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddBudget(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Create Budget
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

export default BudgetDashboard;
