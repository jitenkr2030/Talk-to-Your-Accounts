import React, { useState, useEffect, useCallback } from 'react';
import {
  Building,
  Upload,
  RefreshCw,
  CheckCircle,
  XCircle,
  Link,
  FileText,
  DollarSign,
  Calendar,
  ChevronRight,
  Filter,
  Download
} from 'lucide-react';
import reconciliationService from '../../services/reconciliation';

const ReconciliationPanel = () => {
  const [statements, setStatements] = useState([]);
  const [unreconciledTxns, setUnreconciledTxns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('statements');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [stmts, unreconciled] = await Promise.all([
        reconciliationService.getStatements(),
        reconciliationService.getUnreconciledTransactions()
      ]);
      setStatements(stmts);
      setUnreconciledTxns(unreconciled);
      setStats(reconciliationService.getReconciliationStats());
    } catch (error) {
      console.error('Failed to fetch reconciliation data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleProcessStatement = async (id) => {
    try {
      await reconciliationService.processStatement(id);
      await fetchData();
      if (selectedStatement?.id === id) {
        const updated = await reconciliationService.getStatement(id);
        setSelectedStatement(updated);
      }
    } catch (error) {
      console.error('Failed to process statement:', error);
    }
  };

  const handleReconcile = async (transactionId, bankTxnId) => {
    try {
      await reconciliationService.reconcileTransaction(transactionId, bankTxnId);
      await fetchData();
    } catch (error) {
      console.error('Failed to reconcile:', error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For demo, create a mock statement
    // In production, parse the file and extract transactions
    try {
      const bankName = prompt('Enter bank name (e.g., HDFC, SBI, ICICI):');
      if (!bankName) return;

      const statement = await reconciliationService.createStatement({
        bank_name: bankName,
        account_number: 'XXXX-XXXX-1234',
        statement_period: `${new Date().toISOString().slice(0, 7)}`,
        file_path: file.path,
        created_by: 'system'
      });

      await fetchData();
      setActiveTab('statements');
    } catch (error) {
      console.error('Failed to upload statement:', error);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'processed':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-xs">
            <CheckCircle size={12} />
            Reconciled
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full text-xs">
            <RefreshCw size={12} className="animate-spin" />
            Processing
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-500/10 text-slate-400 rounded-full text-xs">
            <FileText size={12} />
            {status}
          </span>
        );
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Building size={20} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Bank Reconciliation</h2>
            <p className="text-xs text-slate-400">
              Auto-match bank statements with transactions
            </p>
          </div>
        </div>
        <label className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium text-sm cursor-pointer transition-colors">
          <Upload size={16} />
          Upload Statement
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-5 gap-px bg-slate-800">
          <div className="bg-slate-900 p-3 text-center">
            <div className="text-xl font-bold text-white">{stats.totalStatements}</div>
            <div className="text-xs text-slate-400">Statements</div>
          </div>
          <div className="bg-slate-900 p-3 text-center">
            <div className="text-xl font-bold text-emerald-400">{stats.matchedTransactions}</div>
            <div className="text-xs text-slate-400">Matched</div>
          </div>
          <div className="bg-slate-900 p-3 text-center">
            <div className="text-xl font-bold text-amber-400">{stats.unmatchedTransactions}</div>
            <div className="text-xs text-slate-400">Unmatched</div>
          </div>
          <div className="bg-slate-900 p-3 text-center">
            <div className="text-xl font-bold text-blue-400">{stats.processedStatements}</div>
            <div className="text-xs text-slate-400">Processed</div>
          </div>
          <div className="bg-slate-900 p-3 text-center">
            <div className="text-xl font-bold text-purple-400">{stats.matchRate}%</div>
            <div className="text-xs text-slate-400">Match Rate</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {['statements', 'unreconciled'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/5'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab === 'statements' ? 'Bank Statements' : `Unreconciled (${unreconciledTxns.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {activeTab === 'statements' ? (
          statements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <FileText size={48} className="mb-4 text-slate-600" />
              <p className="text-lg font-medium text-slate-400">No bank statements</p>
              <p className="text-sm text-slate-500 mt-1">Upload a bank statement to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {statements.map(statement => (
                <div
                  key={statement.id}
                  className={`p-4 hover:bg-slate-800/50 cursor-pointer transition-colors ${
                    selectedStatement?.id === statement.id ? 'bg-slate-800/50' : ''
                  }`}
                  onClick={() => setSelectedStatement(statement)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-800 rounded-lg">
                        <Building size={18} className="text-slate-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">{statement.bank_name}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>{statement.account_number || 'N/A'}</span>
                          <span>•</span>
                          <span>{statement.statement_period || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-xs text-slate-400">
                        <div>{statement.total_transactions} txns</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <CheckCircle size={10} className="text-emerald-400" />
                          <span>{statement.matched_count}</span>
                          <XCircle size={10} className="text-amber-400 ml-2" />
                          <span>{statement.unmatched_count}</span>
                        </div>
                      </div>
                      {getStatusBadge(statement.status)}
                      <ChevronRight size={16} className="text-slate-500" />
                    </div>
                  </div>

                  {/* Selected Statement Details */}
                  {selectedStatement?.id === statement.id && (
                    <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-white">Statement Transactions</h4>
                        {statement.status === 'pending' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProcessStatement(statement.id);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm"
                          >
                            <RefreshCw size={14} />
                            Auto-Match
                          </button>
                        )}
                      </div>
                      {statement.transactions?.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="text-xs text-slate-500 border-b border-slate-700">
                              <tr>
                                <th className="text-left py-2">Date</th>
                                <th className="text-left py-2">Description</th>
                                <th className="text-right py-2">Amount</th>
                                <th className="text-center py-2">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                              {statement.transactions.map(txn => (
                                <tr key={txn.id} className="text-slate-300">
                                  <td className="py-2">{txn.date}</td>
                                  <td className="py-2 truncate max-w-xs">{txn.description}</td>
                                  <td className="py-2 text-right font-medium">
                                    <span className={txn.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}>
                                      {txn.type === 'credit' ? '+' : '-'}{formatAmount(txn.amount)}
                                    </span>
                                  </td>
                                  <td className="py-2 text-center">
                                    {txn.matched ? (
                                      <span className="text-emerald-400 text-xs">Matched</span>
                                    ) : (
                                      <span className="text-slate-500 text-xs">Pending</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 text-center py-4">
                          No transactions in this statement
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : unreconciledTxns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <CheckCircle size={48} className="mb-4 text-emerald-500/50" />
            <p className="text-lg font-medium text-slate-400">All caught up!</p>
            <p className="text-sm text-slate-500 mt-1">No unreconciled transactions</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {unreconciledTxns.map(txn => (
              <div key={txn.id} className="p-4 hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-lg">
                      <DollarSign size={18} className="text-slate-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{txn.voucher_no}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{txn.party_name || 'No party'}</span>
                        <span>•</span>
                        <span>{txn.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-medium text-white">{formatAmount(txn.total_amount)}</div>
                      <div className="text-xs text-slate-400">{txn.payment_status}</div>
                    </div>
                    <button
                      onClick={() => handleReconcile(txn.id, null)}
                      className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors"
                      title="Manual reconciliation"
                    >
                      <Link size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-t border-slate-700">
        <span className="text-xs text-slate-400">
          {statements.length} bank statements uploaded
        </span>
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
          <Download size={14} />
          Export Report
        </button>
      </div>
    </div>
  );
};

export default ReconciliationPanel;
