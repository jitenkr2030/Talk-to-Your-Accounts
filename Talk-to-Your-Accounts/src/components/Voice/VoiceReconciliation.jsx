// Voice Reconciliation Component
// Main UI component for voice-controlled bank and party ledger reconciliation
// Provides microphone button, real-time feedback, and command processing

import React, { useState, useEffect, useCallback } from 'react';
import { useVoiceReconciliation } from '../../hooks/useVoiceReconciliation';
import VoiceFeedback from './VoiceFeedback';
import ReconciliationResults from './ReconciliationResults';

const VoiceReconciliation = ({ 
  onNavigate, 
  initialMode = 'reconciliation',
  showQuickActions = true 
}) => {
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);
  const [displayMode, setDisplayMode] = useState('full'); // 'full' | 'compact' | 'minimized'

  const {
    isListening,
    isProcessing,
    transcript,
    interimTranscript,
    parsedCommand,
    result,
    error,
    commandHistory,
    startListening,
    stopListening,
    processCommand,
    clearState,
    getStatistics,
    getUnreconciled,
    isSupported,
    isSpeaking
  } = useVoiceReconciliation({
    language: 'english',
    amountTolerance: 1.00,
    onCommandComplete: ({ result: cmdResult }) => {
      if (cmdResult && cmdResult.data) {
        setResults(cmdResult.data);
        setShowResults(true);
      }
    }
  });

  // Quick action commands
  const quickActions = [
    { 
      label: 'Show Unreconciled', 
      command: 'Show unreconciled transactions',
      icon: '📋'
    },
    { 
      label: 'Reconcile All Today', 
      command: 'Reconcile all transactions for today',
      icon: '✅'
    },
    { 
      label: 'Reconciliation Summary', 
      command: 'How much is reconciled today',
      icon: '📊'
    },
    { 
      label: 'Check Balance', 
      command: 'Compare bank balance with party ledger',
      icon: '⚖️'
    }
  ];

  // Handle quick action click
  const handleQuickAction = useCallback(async (action) => {
    await processCommand(action.command);
  }, [processCommand]);

  // Get microphone status
  const getMicrophoneStatus = () => {
    if (!isSupported) {
      return { status: 'unsupported', text: 'Not Supported', color: 'gray' };
    }
    if (isListening) {
      return { status: 'listening', text: 'Listening...', color: 'red' };
    }
    if (isProcessing) {
      return { status: 'processing', text: 'Processing...', color: 'blue' };
    }
    if (error) {
      return { status: 'error', text: 'Error', color: 'orange' };
    }
    return { status: 'idle', text: 'Tap to Speak', color: 'green' };
  };

  const micStatus = getMicrophoneStatus();

  // Keyboard shortcut (Space to toggle mic)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (isListening) {
          stopListening();
        } else {
          startListening();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isListening, startListening, stopListening]);

  if (!isSupported) {
    return (
      <div className="voice-reconciliation unsupported">
        <div className="unsupported-message">
          <h3>Voice Recognition Not Supported</h3>
          <p>Your browser doesn't support voice recognition. Please use Chrome, Edge, or Safari.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`voice-reconciliation ${displayMode}`}>
      {/* Header */}
      <div className="voice-reconciliation-header">
        <div className="header-title">
          <h2>Voice Reconciliation</h2>
          <p className="header-subtitle">Reconcile bank and party ledgers using voice commands</p>
        </div>
        
        <div className="mic-status-badge" style={{ backgroundColor: micStatus.color }}>
          <span className="status-dot"></span>
          {micStatus.text}
        </div>
      </div>

      {/* Main Voice Input Section */}
      <div className="voice-input-section">
        <button 
          className={`mic-button ${isListening ? 'listening' : ''} ${isProcessing ? 'processing' : ''}`}
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing}
        >
          <div className="mic-icon">
            {isProcessing ? (
              <svg className="spinner" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </div>
          
          {/* Pulsing ring when listening */}
          {isListening && <div className="pulse-ring"></div>}
        </button>

        {/* Transcription Display */}
        <div className="transcription-display">
          {interimTranscript && (
            <p className="interim-transcript">{interimTranscript}</p>
          )}
          {transcript && !interimTranscript && (
            <p className="final-transcript">"{transcript}"</p>
          )}
          {!transcript && !interimTranscript && (
            <p className="placeholder-text">Tap the microphone and speak your command</p>
          )}
        </div>

        {/* Example Commands */}
        <div className="example-commands">
          <h4>Try saying:</h4>
          <div className="command-examples">
            <span className="example">"Reconcile 5000 with ABC Company"</span>
            <span className="example">"Show unreconciled transactions"</span>
            <span className="example">"How much reconciled today"</span>
            <span className="example">"Compare bank balance"</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {showQuickActions && (
        <div className="quick-actions-section">
          <h4>Quick Actions</h4>
          <div className="quick-actions-grid">
            {quickActions.map((action, index) => (
              <button 
                key={index}
                className="quick-action-button"
                onClick={() => handleQuickAction(action)}
                disabled={isProcessing || isListening}
              >
                <span className="action-icon">{action.icon}</span>
                <span className="action-label">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Feedback and Results */}
      {(parsedCommand || error || showResults) && (
        <div className="feedback-section">
          {parsedCommand && (
            <VoiceFeedback 
              parsedCommand={parsedCommand}
              result={result}
              error={error}
              isProcessing={isProcessing}
            />
          )}
          
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <p>{error.message}</p>
            </div>
          )}

          {showResults && result && (
            <ReconciliationResults 
              data={result.data}
              intent={result.intent}
              onClose={() => setShowResults(false)}
            />
          )}
        </div>
      )}

      {/* Command History */}
      {commandHistory.length > 0 && (
        <div className="command-history-section">
          <h4>Recent Commands</h4>
          <div className="command-history-list">
            {commandHistory.slice(-5).reverse().map((cmd, index) => (
              <div key={index} className="history-item">
                <span className="history-transcript">"{cmd.transcript}"</span>
                <span className={`history-result ${cmd.result?.success ? 'success' : 'error'}`}>
                  {cmd.result?.success ? '✓' : '✗'}
                </span>
                <span className="history-time">
                  {new Date(cmd.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard Shortcut Hint */}
      <div className="shortcut-hint">
        <kbd>Space</kbd> to toggle microphone
      </div>
    </div>
  );
};

export default VoiceReconciliation;
