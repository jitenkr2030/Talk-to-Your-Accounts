import { useState, useEffect } from 'react';
import useExpense from '../../hooks/useExpense';

const ExpenseDashboard = () => {
  const {
    expenses,
    categories,
    recurringExpenses,
    expenseSummary,
    loading,
    error,
    fetchExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    approveExpense,
    rejectExpense,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    fetchRecurringExpenses,
    createRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    processRecurringExpense,
    uploadReceipt,
    fetchReceipts,
    fetchExpenseSummary,
    fetchExpensesByCategory,
    exportExpenses
  } = useExpense();

  const [activeTab, setActiveTab] = useState('expenses');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category_id: '',
    amount: '',
    description: '',
    vendor_name: '',
    vendor_gstin: '',
    payment_method: 'cash',
    reference: '',
    is_recurring: false,
    recurring_frequency: 'monthly'
  });
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    budget_limit: '',
    is_active: true
  });
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    category_id: '',
    status: ''
  });

  useEffect(() => {
    fetchCategories();
    fetchRecurringExpenses();
    fetchExpenseSummary();
  }, [fetchCategories, fetchRecurringExpenses, fetchExpenseSummary]);

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      await createExpense(expenseForm);
      setShowAddExpense(false);
      setExpenseForm({
        date: new Date().toISOString().split('T')[0],
        category_id: '',
        amount: '',
        description: '',
        vendor_name: '',
        vendor_gstin: '',
        payment_method: 'cash',
        reference: '',
        is_recurring: false,
        recurring_frequency: 'monthly'
      });
    } catch (err) {
      console.error('Error creating expense:', err);
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      await addCategory(categoryForm);
      setShowAddCategory(false);
      setCategoryForm({
        name: '',
        description: '',
        budget_limit: '',
        is_active: true
      });
    } catch (err) {
      console.error('Error adding category:', err);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteExpense(id);
      } catch (err) {
        console.error('Error deleting expense:', err);
      }
    }
  };

  const handleApproveExpense = async (id) => {
    try {
      await approveExpense(id, { approved_by: 'admin', approved_at: new Date().toISOString() });
    } catch (err) {
      console.error('Error approving expense:', err);
    }
  };

  const handleRejectExpense = async (id) => {
    const reason = prompt('Enter rejection reason:');
    if (reason) {
      try {
        await rejectExpense(id, reason);
      } catch (err) {
        console.error('Error rejecting expense:', err);
      }
    }
  };

  const handleProcessRecurring = async (id) => {
    try {
      await processRecurringExpense(id);
      alert('Recurring expense processed successfully!');
    } catch (err) {
      console.error('Error processing recurring expense:', err);
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportExpenses(filters);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting expenses:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 bg-slate-900 min-h-screen text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Expense Management</h1>
          <p className="text-slate-400 mt-1">Track and manage business expenses</p>
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
            onClick={() => setShowAddCategory(true)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Add Category
          </button>
          <button
            onClick={() => setShowAddExpense(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Expense
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {expenseSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 p-4 rounded-lg">
            <p className="text-slate-400 text-sm">Total Expenses</p>
            <p className="text-2xl font-bold text-red-400">₹{expenseSummary.total_expenses?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-lg">
            <p className="text-slate-400 text-sm">This Month</p>
            <p className="text-2xl font-bold text-orange-400">₹{expenseSummary.this_month?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-lg">
            <p className="text-slate-400 text-sm">Pending Approval</p>
            <p className="text-2xl font-bold text-yellow-400">₹{expenseSummary.pending?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-lg">
            <p className="text-slate-400 text-sm">Categories</p>
            <p className="text-2xl font-bold text-blue-400">{categories.length}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 rounded-lg ${activeTab === 'expenses' ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'}`}
        >
          Expenses
        </button>
        <button
          onClick={() => setActiveTab('recurring')}
          className={`px-4 py-2 rounded-lg ${activeTab === 'recurring' ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'}`}
        >
          Recurring
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 rounded-lg ${activeTab === 'categories' ? 'bg-blue-600' : 'bg-slate-800 hover:bg-slate-700'}`}
        >
          Categories
        </button>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Category</label>
            <select
              value={filters.category_id}
              onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => fetchExpenses(filters)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Apply Filters
          </button>
          <button
            onClick={() => {
              setFilters({ startDate: '', endDate: '', category_id: '', status: '' });
              fetchExpenses({});
            }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Expenses List */}
      {activeTab === 'expenses' && (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Category</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Vendor</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Amount</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-400">Loading...</td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-400">No expenses found</td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="border-t border-slate-700 hover:bg-slate-750">
                    <td className="px-4 py-3 text-sm">{expense.date}</td>
                    <td className="px-4 py-3 text-sm">{expense.category_name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm">{expense.description || '-'}</td>
                    <td className="px-4 py-3 text-sm">{expense.vendor_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">₹{parseFloat(expense.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(expense.status)}`}>
                        {expense.status || 'pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        {expense.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveExpense(expense.id)}
                              className="p-1 text-green-400 hover:text-green-300"
                              title="Approve"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleRejectExpense(expense.id)}
                              className="p-1 text-red-400 hover:text-red-300"
                              title="Reject"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="p-1 text-slate-400 hover:text-slate-300"
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

      {/* Recurring Expenses */}
      {activeTab === 'recurring' && (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Category</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Amount</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Frequency</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Next Due</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-400">Loading...</td>
                </tr>
              ) : recurringExpenses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-400">No recurring expenses found</td>
                </tr>
              ) : (
                recurringExpenses.map((expense) => (
                  <tr key={expense.id} className="border-t border-slate-700 hover:bg-slate-750">
                    <td className="px-4 py-3 text-sm">{expense.category_name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm">{expense.description || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">₹{parseFloat(expense.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-center">{expense.recurring_frequency || 'monthly'}</td>
                    <td className="px-4 py-3 text-sm text-center">{expense.next_due_date || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleProcessRecurring(expense.id)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                        >
                          Process Now
                        </button>
                        <button
                          onClick={() => deleteRecurringExpense(expense.id)}
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

      {/* Categories */}
      {activeTab === 'categories' && (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Budget Limit</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-400">Loading...</td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-400">No categories found</td>
                </tr>
              ) : (
                categories.map((category) => (
                  <tr key={category.id} className="border-t border-slate-700 hover:bg-slate-750">
                    <td className="px-4 py-3 text-sm font-medium">{category.name}</td>
                    <td className="px-4 py-3 text-sm">{category.description || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right">₹{parseFloat(category.budget_limit || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${category.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => updateCategory(category.id, { is_active: !category.is_active })}
                          className="p-1 text-blue-400 hover:text-blue-300"
                          title={category.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteCategory(category.id)}
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

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-lg w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Add New Expense</h2>
            <form onSubmit={handleExpenseSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Category</label>
                  <select
                    value={expenseForm.category_id}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Payment Method</label>
                  <select
                    value={expenseForm.payment_method}
                    onChange={(e) => setExpenseForm({ ...expenseForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="upi">UPI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Vendor Name</label>
                  <input
                    type="text"
                    value={expenseForm.vendor_name}
                    onChange={(e) => setExpenseForm({ ...expenseForm, vendor_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Vendor GSTIN</label>
                  <input
                    type="text"
                    value={expenseForm.vendor_gstin}
                    onChange={(e) => setExpenseForm({ ...expenseForm, vendor_gstin: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-slate-400 mb-1">Description</label>
                  <textarea
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    rows="2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Reference No.</label>
                  <input
                    type="text"
                    value={expenseForm.reference}
                    onChange={(e) => setExpenseForm({ ...expenseForm, reference: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Recurring</label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      checked={expenseForm.is_recurring}
                      onChange={(e) => setExpenseForm({ ...expenseForm, is_recurring: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Make this a recurring expense</span>
                  </div>
                </div>
                {expenseForm.is_recurring && (
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Frequency</label>
                    <select
                      value={expenseForm.recurring_frequency}
                      onChange={(e) => setExpenseForm({ ...expenseForm, recurring_frequency: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Category</h2>
            <form onSubmit={handleCategorySubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Category Name</label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Description</label>
                  <textarea
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    rows="2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Budget Limit (₹)</label>
                  <input
                    type="number"
                    value={categoryForm.budget_limit}
                    onChange={(e) => setCategoryForm({ ...categoryForm, budget_limit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={categoryForm.is_active}
                    onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Active</span>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddCategory(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Add Category
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

export default ExpenseDashboard;
