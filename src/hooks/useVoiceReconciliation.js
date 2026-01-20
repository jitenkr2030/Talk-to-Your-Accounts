// useVoiceReconciliation Hook
// Custom React hook for voice-controlled reconciliation operations
// Integrates speech recognition, NLP parsing, and IPC communication

import { useState, useCallback, useEffect, useRef } from 'react';
import { voiceManager } from '../services/voiceManager';
import { reconciliationVoiceParser, RECONCILIATION_INTENTS } from '../services/reconciliationVoiceParser';

// State management for voice reconciliation
const initialState = {
  isListening: false,
  isProcessing: false,
  transcript: '',
  interimTranscript: '',
  parsedCommand: null,
  result: null,
  error: null,
  audioLevel: 0,
  lastCommandTime: null,
  commandHistory: []
};

export function useVoiceReconciliation(options = {}) {
  const [state, setState] = useState(initialState);
  const [parties, setParties] = useState([]);
  const recognitionRef = useRef(null);
  const processingTimeoutRef = useRef(null);

  // Initialize parties cache for fuzzy matching
  useEffect(() => {
    const loadParties = async () => {
      try {
        if (window.api?.parties) {
          const response = await window.api.parties.getAll({ 
            include_inactive: false 
          });
          if (response.success) {
            const partyList = response.data || [];
            setParties(partyList);
            reconciliationVoiceParser.setParties(partyList);
          }
        }
      } catch (error) {
        console.error('Failed to load parties for voice matching:', error);
      }
    };

    loadParties();
  }, []);

  // Setup voice manager callbacks
  useEffect(() => {
    if (!voiceManager.isRecognitionSupported()) {
      setState(prev => ({
        ...prev,
        error: { code: 'not-supported', message: 'Speech recognition is not supported in this browser' }
      }));
      return;
    }

    // Set up listening callbacks
    voiceManager.onListeningStart(() => {
      setState(prev => ({ ...prev, isListening: true, error: null }));
    });

    voiceManager.onListeningEnd(() => {
      setState(prev => ({ ...prev, isListening: false }));
    });

    voiceManager.onInterimResult((transcript) => {
      setState(prev => ({ ...prev, interimTranscript: transcript }));
    });

    return () => {
      voiceManager.stopListening();
    };
  }, []);

  /**
   * Start listening for voice commands
   */
  const startListening = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await voiceManager.listen({
        lang: options.lang || 'en-IN',
        continuous: false,
        interimResults: true
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: { 
          code: error.code || 'unknown', 
          message: voiceManager.getErrorMessage(error.code || error.message) 
        }
      }));
    }
  }, [options.lang]);

  /**
   * Stop listening
   */
  const stopListening = useCallback(() => {
    voiceManager.stopListening();
  }, []);

  /**
   * Process a voice command
   */
  const processCommand = useCallback(async (transcript) => {
    // Clear any existing timeout
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }

    setState(prev => ({
      ...prev,
      transcript,
      interimTranscript: '',
      isProcessing: true,
      parsedCommand: null,
      result: null,
      error: null
    }));

    try {
      // Parse the command using NLP
      const parsed = reconciliationVoiceParser.parse(transcript, options.language || 'english');
      
      setState(prev => ({
        ...prev,
        parsedCommand: parsed
      }));

      // Validate the parsed command
      const validation = reconciliationVoiceParser.validate(parsed);
      if (!validation.isValid) {
        const errorMessage = validation.errors.join('; ');
        await voiceManager.speak(errorMessage, { rate: 0.9 });
        
        setState(prev => ({
          ...prev,
          isProcessing: false,
          error: { code: 'validation', message: errorMessage }
        }));

        return {
          success: false,
          error: errorMessage,
          parsed
        };
      }

      // Execute the command based on intent
      const result = await executeReconciliationCommand(parsed, options);

      // Generate and speak feedback
      const feedback = reconciliationVoiceParser.generateFeedback(result, options.language || 'english');
      await voiceManager.speak(feedback, { rate: 0.95 });

      // Update state with result
      setState(prev => ({
        ...prev,
        isProcessing: false,
        result,
        commandHistory: [
          ...prev.commandHistory.slice(-49),
          {
            transcript,
            parsed,
            result,
            timestamp: new Date().toISOString()
          }
        ],
        lastCommandTime: new Date().toISOString()
      }));

      // Call completion callback if provided
      if (options.onCommandComplete) {
        options.onCommandComplete({ parsed, result, feedback });
      }

      return { success: true, parsed, result, feedback };

    } catch (error) {
      console.error('Error processing voice command:', error);
      
      const errorMessage = error.message || 'An error occurred while processing the command';
      await voiceManager.announceError(errorMessage);

      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: { code: 'execution', message: errorMessage }
      }));

      return { success: false, error: errorMessage };
    }
  }, [options.language, options.onCommandComplete]);

  /**
   * Clear current state
   */
  const clearState = useCallback(() => {
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }
    setState(initialState);
  }, []);

  /**
   * Get reconciliation statistics
   */
  const getStatistics = useCallback(async (period = 'today') => {
    try {
      if (!window.api?.reconciliation) {
        throw new Error('Electron IPC not available');
      }

      const response = await window.api.reconciliation.getStatistics({ period });
      return response;
    } catch (error) {
      console.error('Failed to get reconciliation statistics:', error);
      throw error;
    }
  }, []);

  /**
   * Get unreconciled transactions
   */
  const getUnreconciled = useCallback(async (filters = {}) => {
    try {
      if (!window.api?.reconciliation) {
        throw new Error('Electron IPC not available');
      }

      const response = await window.api.reconciliation.getUnreconciled(filters);
      return response;
    } catch (error) {
      console.error('Failed to get unreconciled transactions:', error);
      throw error;
    }
  }, []);

  /**
   * Force refresh parties cache
   */
  const refreshParties = useCallback(async () => {
    try {
      if (window.api?.parties) {
        const response = await window.api.parties.getAll({ 
          include_inactive: false 
        });
        if (response.success) {
          const partyList = response.data || [];
          setParties(partyList);
          reconciliationVoiceParser.setParties(partyList);
        }
      }
    } catch (error) {
      console.error('Failed to refresh parties:', error);
    }
  }, []);

  return {
    ...state,
    parties,
    startListening,
    stopListening,
    processCommand,
    clearState,
    getStatistics,
    getUnreconciled,
    refreshParties,
    isSupported: voiceManager.isRecognitionSupported(),
    isSpeaking: voiceManager.getSpeakingStatus()
  };
}

/**
 * Execute reconciliation command based on parsed intent
 */
async function executeReconciliationCommand(parsed, options) {
  if (!window.api?.reconciliation) {
    throw new Error('Electron IPC not available');
  }

  const { intent, entities } = parsed;

  switch (intent) {
    case RECONCILIATION_INTENTS.RECONCILE_SINGLE:
      return await reconcileSingleTransaction(entities, options);

    case RECONCILIATION_INTENTS.RECONCILE_BATCH:
      return await reconcileAllTransactions(entities, options);

    case RECONCILIATION_INTENTS.RECONCILE_BY_PARTY:
      return await reconcileByParty(entities, options);

    case RECONCILIATION_INTENTS.RECONCILE_BY_DATE:
      return await reconcileByDate(entities, options);

    case RECONCILIATION_INTENTS.MARK_RECONCILED:
      return await markAsReconciled(entities.transactionId);

    case RECONCILIATION_INTENTS.UNRECONCILE:
      return await unreconcileTransaction(entities.transactionId);

    case RECONCILIATION_INTENTS.VIEW_UNRECONCILED:
      return await getUnreconciledTransactions(entities);

    case RECONCILIATION_INTENTS.VIEW_RECONCILED:
      return await getReconciledTransactions(entities);

    case RECONCILIATION_INTENTS.QUERY_SUMMARY:
      return await getReconciliationSummary(entities);

    case RECONCILIATION_INTENTS.QUERY_STATUS:
      return await getReconciliationStatus(entities);

    case RECONCILIATION_INTENTS.COMPARE_BALANCE:
      return await compareBalances(entities);

    case RECONCILIATION_INTENTS.SHOW_DIFFERENCE:
      return await showDifference(entities);

    case RECONCILIATION_INTENTS.MATCH_TRANSACTION:
      return await matchTransaction(entities);

    case RECONCILIATION_INTENTS.FLAG_TRANSACTION:
      return await flagTransaction(entities.transactionId);

    default:
      throw new Error('Unknown reconciliation command');
  }
}

// Individual command execution functions

async function reconcileSingleTransaction(entities, options) {
  const response = await window.api.reconciliation.reconcileSingle({
    amount: entities.amount,
    party_id: entities.fuzzyMatch?.id,
    party_name: entities.party,
    transaction_id: entities.transactionId,
    reference: entities.reference,
    tolerance: options.amountTolerance || 1.00
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to reconcile transaction');
  }

  return {
    intent: RECONCILIATION_INTENTS.RECONCILE_SINGLE,
    data: response.data,
    success: true
  };
}

async function reconcileAllTransactions(entities, options) {
  const response = await window.api.reconciliation.reconcileAll({
    party_id: entities.partyId,
    date: entities.date,
    auto_match_only: true
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to reconcile transactions');
  }

  return {
    intent: RECONCILIATION_INTENTS.RECONCILE_BATCH,
    data: response.data,
    success: true
  };
}

async function reconcileByParty(entities, options) {
  const response = await window.api.reconciliation.reconcileByParty({
    party_id: entities.fuzzyMatch?.id,
    party_name: entities.party
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to reconcile transactions for party');
  }

  return {
    intent: RECONCILIATION_INTENTS.RECONCILE_BY_PARTY,
    data: response.data,
    success: true
  };
}

async function reconcileByDate(entities, options) {
  const response = await window.api.reconciliation.reconcileByDate({
    date: entities.date
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to reconcile transactions for date');
  }

  return {
    intent: RECONCILIATION_INTENTS.RECONCILE_BY_DATE,
    data: response.data,
    success: true
  };
}

async function markAsReconciled(transactionId) {
  const response = await window.api.reconciliation.markReconciled({
    transaction_id: transactionId
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to mark transaction as reconciled');
  }

  return {
    intent: RECONCILIATION_INTENTS.MARK_RECONCILED,
    data: { id: transactionId },
    success: true
  };
}

async function unreconcileTransaction(transactionId) {
  const response = await window.api.reconciliation.unreconcile({
    transaction_id: transactionId
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to unreconcile transaction');
  }

  return {
    intent: RECONCILIATION_INTENTS.UNRECONCILE,
    data: { id: transactionId },
    success: true
  };
}

async function getUnreconciledTransactions(entities) {
  const response = await window.api.reconciliation.getUnreconciled({
    party_id: entities.partyId,
    date: entities.date
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to get unreconciled transactions');
  }

  return {
    intent: RECONCILIATION_INTENTS.VIEW_UNRECONCILED,
    data: response.data,
    success: true
  };
}

async function getReconciledTransactions(entities) {
  const response = await window.api.reconciliation.getReconciled({
    party_id: entities.partyId,
    date: entities.date
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to get reconciled transactions');
  }

  return {
    intent: RECONCILIATION_INTENTS.VIEW_RECONCILED,
    data: response.data,
    success: true
  };
}

async function getReconciliationSummary(entities) {
  const response = await window.api.reconciliation.getSummary({
    period: entities.date?.type || 'today'
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to get reconciliation summary');
  }

  return {
    intent: RECONCILIATION_INTENTS.QUERY_SUMMARY,
    data: response.data,
    success: true
  };
}

async function getReconciliationStatus(entities) {
  const response = await window.api.reconciliation.getStatus({});

  if (!response.success) {
    throw new Error(response.error || 'Failed to get reconciliation status');
  }

  return {
    intent: RECONCILIATION_INTENTS.QUERY_STATUS,
    data: response.data,
    success: true
  };
}

async function compareBalances(entities) {
  const response = await window.api.reconciliation.compareBalances({
    party_id: entities.partyId
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to compare balances');
  }

  return {
    intent: RECONCILIATION_INTENTS.COMPARE_BALANCE,
    data: response.data,
    success: true
  };
}

async function showDifference(entities) {
  const response = await window.api.reconciliation.getDifference({
    party_id: entities.partyId,
    date: entities.date
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to calculate difference');
  }

  return {
    intent: RECONCILIATION_INTENTS.SHOW_DIFFERENCE,
    data: response.data,
    success: true
  };
}

async function matchTransaction(entities) {
  const response = await window.api.reconciliation.matchTransaction({
    amount: entities.amount,
    party_id: entities.fuzzyMatch?.id,
    party_name: entities.party,
    reference: entities.reference
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to match transaction');
  }

  return {
    intent: RECONCILIATION_INTENTS.MATCH_TRANSACTION,
    data: response.data,
    success: true
  };
}

async function flagTransaction(transactionId) {
  const response = await window.api.reconciliation.flag({
    transaction_id: transactionId
  });

  if (!response.success) {
    throw new Error(response.error || 'Failed to flag transaction');
  }

  return {
    intent: RECONCILIATION_INTENTS.FLAG_TRANSACTION,
    data: { id: transactionId },
    success: true
  };
}

export default useVoiceReconciliation;
