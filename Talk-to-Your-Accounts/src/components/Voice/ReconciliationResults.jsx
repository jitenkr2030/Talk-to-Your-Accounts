// Reconciliation Results Component
// Displays results from voice reconciliation commands
// Shows transaction lists, summaries, and comparisons

import React from 'react';

const ReconciliationResults = ({ data, intent, onClose }) => {
  // Render different result views based on intent
  const renderResults = () => {
    switch (intent) {
      case 'view_unreconciled':
        return <UnreconciledList data={data} />;
      case 'query_summary':
        return <SummaryView data={data} />;
      case 'query_status':
        return <StatusView data={data} />;
      case 'compare_balance':
      case 'show_difference':
        return <ComparisonView data={data} />;
      case 'reconcile_single':
      case 'reconcile_batch':
      case 'reconcile_by_party':
      case 'reconcile_by_date':
        return <ReconciliationSummary data={data} />;
      default:
        return <GenericView data={data} />;
    }
  };

  return (
    <div className="reconciliation-results">
      <div className="results-header">
        <h4>Results</h4>
        <button className="close-button" onClick={onClose}>×</button>
      </div>
      <div className="results-content">
        {renderResults()}
      </div>
    </div>
  );
};

// Unreconciled Transactions List
const UnreconciledList = ({ data }) => {
  const transactions = data?.transactions || [];
  
  if (transactions.length === 0) {
    return (
      <div className="empty-results">
        <span className="empty-icon">✅</span>
        <p>All transactions are reconciled!</p>
      </div>
    );
  }

  const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <div className="results-list">
      <div className="list-summary">
        <span className="count">{transactions.length} transactions</span>
        <span className="total">Total: ₹{totalAmount.toLocaleString()}</span>
      </div>
      <div className="transaction-items">
        {transactions.slice(0, 10).map((transaction, index) => (
          <div key={index} className="transaction-item">
            <div className="item-main">
              <span className="item-date">{transaction.date}</span>
              <span className="item-party">{transaction.party_name || transaction.reference}</span>
            </div>
            <div className="item-amount">
              ₹{transaction.amount?.toLocaleString()}
            </div>
          </div>
        ))}
        {transactions.length > 10 && (
          <div className="more-items">
            +{transactions.length - 10} more transactions
          </div>
        )}
      </div>
    </div>
  );
};

// Summary View
const SummaryView = ({ data }) => {
  const { reconciled_count = 0, reconciled_amount = 0, unreconciled_count = 0, unreconciled_amount = 0 } = data || {};

  return (
    <div className="summary-view">
      <div className="summary-row reconciled">
        <span className="summary-label">Reconciled Today</span>
        <div className="summary-values">
          <span className="summary-count">{reconciled_count} transactions</span>
          <span className="summary-amount">₹{reconciled_amount.toLocaleString()}</span>
        </div>
      </div>
      <div className="summary-row unreconciled">
        <span className="summary-label">Pending</span>
        <div className="summary-values">
          <span className="summary-count">{unreconciled_count} transactions</span>
          <span className="summary-amount">₹{unreconciled_amount.toLocaleString()}</span>
        </div>
      </div>
      <div className="completion-rate">
        <span>Completion Rate</span>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ 
              width: `${((reconciled_count) / (reconciled_count + unreconciled_count) * 100) || 0}%` 
            }}
          ></div>
        </div>
        <span className="progress-text">
          {((reconciled_count) / (reconciled_count + unreconciled_count) * 100 || 0).toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

// Status View
const StatusView = ({ data }) => {
  const { 
    total_bank = 0, 
    total_ledger = 0, 
    difference = 0,
    reconciled_percentage = 0 
  } = data || {};

  return (
    <div className="status-view">
      <div className="balance-row">
        <span className="balance-label">Bank Balance</span>
        <span className="balance-value">₹{total_bank.toLocaleString()}</span>
      </div>
      <div className="balance-row">
        <span className="balance-label">Party Ledger Total</span>
        <span className="balance-value">₹{total_ledger.toLocaleString()}</span>
      </div>
      <div className={`difference-row ${difference === 0 ? 'matched' : 'mismatched'}`}>
        <span className="difference-label">Difference</span>
        <span className="difference-value">
          {difference === 0 ? 'Perfect Match!' : `₹${Math.abs(difference).toLocaleString()} ${difference > 0 ? 'more in bank' : 'more in ledger'}`}
        </span>
      </div>
      <div className="reconciliation-progress">
        <span>Reconciliation Progress</span>
        <div className="progress-bar">
          <div 
            className="progress-fill reconciled"
            style={{ width: `${reconciled_percentage}%` }}
          ></div>
        </div>
        <span className="progress-text">{reconciled_percentage.toFixed(1)}% Complete</span>
      </div>
    </div>
  );
};

// Comparison View
const ComparisonView = ({ data }) => {
  const { bank_balance = 0, ledger_balance = 0, difference = 0, matched = 0, unmatched = 0 } = data || {};

  return (
    <div className="comparison-view">
      <div className="comparison-grid">
        <div className="comparison-column bank">
          <h5>Bank</h5>
          <div className="balance">₹{bank_balance.toLocaleString()}</div>
          <div className="matched-count">{matched} matched</div>
        </div>
        <div className="comparison-separator">
          <span className={`status-icon ${difference === 0 ? 'matched' : 'mismatched'}`}>
            {difference === 0 ? '✓' : '≠'}
          </span>
        </div>
        <div className="comparison-column ledger">
          <h5>Ledger</h5>
          <div className="balance">₹{ledger_balance.toLocaleString()}</div>
          <div className="matched-count">{unmatched} unmatched</div>
        </div>
      </div>
      {difference !== 0 && (
        <div className="difference-alert">
          <span className="alert-icon">⚠️</span>
          <span>Reconcile {Math.abs(difference).toLocaleString()} to match balances</span>
        </div>
      )}
    </div>
  );
};

// Reconciliation Summary (after batch operations)
const ReconciliationSummary = ({ data }) => {
  const { count = 0, amount = 0, party_name, date, matched = [], unmatched = [] } = data || {};

  return (
    <div className="reconciliation-summary">
      <div className="summary-main">
        <span className="success-icon">✓</span>
        <div className="summary-details">
          <span className="summary-count">{count} transaction{count !== 1 ? 's' : ''} reconciled</span>
          <span className="summary-amount">Total: ₹{amount.toLocaleString()}</span>
        </div>
      </div>
      {party_name && (
        <div className="summary-context">Party: {party_name}</div>
      )}
      {date && (
        <div className="summary-context">Date: {date}</div>
      )}
      {matched.length > 0 && (
        <div className="matched-list">
          <span>Successfully matched:</span>
          {matched.slice(0, 3).map((item, index) => (
            <div key={index} className="matched-item">
              {item.reference || item.id} - ₹{item.amount?.toLocaleString()}
            </div>
          ))}
          {matched.length > 3 && (
            <span className="more">+{matched.length - 3} more</span>
          )}
        </div>
      )}
      {unmatched.length > 0 && (
        <div className="unmatched-alert">
          <span className="alert-icon">⚠️</span>
          <span>{unmatched.length} transaction{unmatched.length !== 1 ? 's' : ''} could not be auto-matched</span>
        </div>
      )}
    </div>
  );
};

// Generic View for unknown data structures
const GenericView = ({ data }) => {
  if (!data) {
    return (
      <div className="empty-results">
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className="generic-view">
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

export default ReconciliationResults;
