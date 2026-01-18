// Voice Feedback Component
// Displays real-time feedback for voice command processing
// Shows parsed command, results, and error states

import React from 'react';

const VoiceFeedback = ({ parsedCommand, result, error, isProcessing }) => {
  if (!parsedCommand) return null;

  const { intent, entities, normalizedTranscript, language } = parsedCommand;

  // Get intent display name
  const getIntentDisplayName = (intent) => {
    const intentNames = {
      reconcile_single: 'Reconcile Transaction',
      reconcile_batch: 'Reconcile All',
      reconcile_by_party: 'Reconcile by Party',
      reconcile_by_date: 'Reconcile by Date',
      view_unreconciled: 'View Unreconciled',
      view_reconciled: 'View Reconciled',
      query_summary: 'Query Summary',
      query_status: 'Query Status',
      compare_balance: 'Compare Balance',
      show_difference: 'Show Difference',
      mark_reconciled: 'Mark Reconciled',
      un_reconcile: 'Unreconcile',
      match_transaction: 'Match Transaction',
      flag_transaction: 'Flag Transaction',
      unknown: 'Unknown Command'
    };
    return intentNames[intent] || intent;
  };

  // Get entity display
  const getEntityDisplay = () => {
    const displays = [];
    
    if (entities.amount) {
      displays.push({ label: 'Amount', value: `₹${entities.amount.toLocaleString()}` });
    }
    if (entities.party) {
      displays.push({ label: 'Party', value: entities.party });
    }
    if (entities.transactionId) {
      displays.push({ label: 'Transaction ID', value: entities.transactionId });
    }
    if (entities.reference) {
      displays.push({ label: 'Reference', value: entities.reference });
    }
    if (entities.date) {
      const dateValue = typeof entities.date === 'object' 
        ? entities.date.type 
        : entities.date;
      displays.push({ label: 'Date', value: dateValue });
    }

    return displays;
  };

  const entityDisplays = getEntityDisplay();

  return (
    <div className="voice-feedback">
      {/* Header */}
      <div className="feedback-header">
        <h4>Command Analysis</h4>
        <span className={`processing-indicator ${isProcessing ? 'active' : ''}`}>
          {isProcessing ? 'Processing...' : 'Completed'}
        </span>
      </div>

      {/* Normalized Transcript */}
      <div className="transcript-section">
        <span className="label">Heard:</span>
        <p className="normalized-transcript">"{normalizedTranscript}"</p>
      </div>

      {/* Detected Intent */}
      <div className="intent-section">
        <span className="label">Detected Action:</span>
        <div className="intent-badge">
          {getIntentDisplayName(intent)}
        </div>
      </div>

      {/* Extracted Entities */}
      {entityDisplays.length > 0 && (
        <div className="entities-section">
          <span className="label">Extracted Information:</span>
          <div className="entities-grid">
            {entityDisplays.map((entity, index) => (
              <div key={index} className="entity-item">
                <span className="entity-label">{entity.label}</span>
                <span className="entity-value">{entity.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fuzzy Match Warning */}
      {entities.fuzzyMatch && entities.fuzzyMatch.score > 0.3 && (
        <div className="fuzzy-match-warning">
          <span className="warning-icon">⚠️</span>
          <span>Party match confidence: {((1 - entities.fuzzyMatch.score) * 100).toFixed(0)}%</span>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`result-section ${result.success ? 'success' : 'error'}`}>
          <span className="label">Result:</span>
          <div className="result-content">
            {result.success ? (
              <>
                <span className="result-icon">✓</span>
                <span>{result.data?.message || 'Operation completed successfully'}</span>
              </>
            ) : (
              <>
                <span className="result-icon">✗</span>
                <span>{result.data?.error || 'Operation failed'}</span>
              </>
            )}
          </div>
          
          {/* Result Details */}
          {result.data && result.data.count !== undefined && (
            <div className="result-details">
              <span>{result.data.count} transactions processed</span>
              {result.data.amount !== undefined && (
                <span>Total: ₹{result.data.amount.toLocaleString()}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="error-section">
          <span className="label">Error:</span>
          <p className="error-message">{error.message}</p>
        </div>
      )}

      {/* Language Badge */}
      <div className="language-badge">
        Detected: {language === 'english' ? 'English' : language === 'hindi' ? 'Hindi' : 'Hinglish'}
      </div>
    </div>
  );
};

export default VoiceFeedback;
