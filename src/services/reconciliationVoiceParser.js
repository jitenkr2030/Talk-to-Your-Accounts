// Reconciliation Voice Parser Service
// Specialized NLP for bank and party ledger reconciliation voice commands
// Supports English, Hindi, and Hinglish with accounting-specific patterns

import Fuse from 'fuse.js';

// Intent types for reconciliation operations
export const RECONCILIATION_INTENTS = {
  RECONCILE_SINGLE: 'reconcile_single',
  RECONCILE_BATCH: 'reconcile_batch',
  RECONCILE_BY_PARTY: 'reconcile_by_party',
  RECONCILE_BY_DATE: 'reconcile_by_date',
  VIEW_UNRECONCILED: 'view_unreconciled',
  VIEW_RECONCILED: 'view_reconciled',
  QUERY_STATUS: 'query_status',
  QUERY_SUMMARY: 'query_summary',
  COMPARE_BALANCE: 'compare_balance',
  MARK_RECONCILED: 'mark_reconciled',
  UNRECONCILE: 'unreconcile',
  MATCH_TRANSACTION: 'match_transaction',
  FLAG_TRANSACTION: 'flag_transaction',
  SHOW_DIFFERENCE: 'show_difference',
  UNKNOWN: 'unknown'
};

// Status feedback messages
const feedbackMessages = {
  success: {
    english: {
      reconcile_single: 'Successfully reconciled {amount} with {party}',
      reconcile_batch: 'Reconciled {count} transactions totaling {amount}',
      reconcile_by_party: 'All transactions with {party} have been reconciled',
      reconcile_by_date: 'Reconciled all transactions for {date}',
      un reconcile: 'Transaction {id} has been marked as unreconciled',
      mark_reconciled: 'Transaction {id} marked as reconciled',
      flag_transaction: 'Transaction {id} flagged for manual review'
    },
    hindi: {
      reconcile_single: '{amount} का {party} के साथ सफलतापूर्वक मिलान किया',
      reconcile_batch: '{count} लेनदेन का कुल {amount} मिलान किया',
      reconcile_by_party: '{party} के सभी लेनदेन मिला लिए गए हैं',
      reconcile_by_date: '{date} के सभी लेनदेन मिला लिए गए हैं',
      un reconcile: 'लेनदेन {id} को अनमिला चिह्नित किया गया',
      mark_reconciled: 'लेनदेन {id} को मिला चिह्नित किया गया',
      flag_transaction: 'लेनदेन {id} को मैन्युअल समीक्षा के लिए फ्लैग किया गया'
    },
    hinglish: {
      reconcile_single: '{amount} ka {party} ke saath successful reconcile kiya',
      reconcile_batch: '{count} transactions totaling {amount} reconcile kiye',
      reconcile_by_party: '{party} ke saare transactions reconcile ho gaye',
      reconcile_by_date: '{date} ke saare transactions reconcile ho gaye',
      un reconcile: 'Transaction {id} ko unreconcile mark kiya',
      mark_reconciled: 'Transaction {id} ko reconciled mark kiya',
      flag_transaction: 'Transaction {id} ko manual review ke liye flag kiya'
    }
  },
  error: {
    english: {
      no_amount: 'Could not identify the amount. Please specify the transaction amount.',
      no_party: 'Could not identify the party. Please specify the party name.',
      no_match: 'No matching transaction found for the specified criteria.',
      multiple_matches: 'Multiple transactions match. Please be more specific.',
      already_reconciled: 'This transaction is already reconciled.',
      not_reconciled: 'Could not reconcile. Please check the transaction details.'
    },
    hindi: {
      no_amount: 'राशि पहचानी नहीं जा सकी। कृपया लेनदेन की राशि बताएं।',
      no_party: 'पार्टी पहचानी नहीं जा सकी। कृपया पार्टी का नाम बताएं।',
      no_match: 'निर्दिष्ट मानदंडों के लिए कोई मेल खाने वाला लेनदेन नहीं मिला।',
      multiple_matches: 'कई लेनदेन मेल खाते हैं। कृपया अधिक विशिष्ट हों।',
      already_reconciled: 'यह लेनदेन पहले से मिला हुआ है।',
      not_reconciled: 'मिलान नहीं हो सका। कृपया लेनदेन की जांच करें।'
    },
    hinglish: {
      no_amount: 'Amount identify nahi ho saka. Transaction amount batayein.',
      no_party: 'Party identify nahi ho saki. Party ka naam batayein.',
      no_match: 'Specified criteria ke liye koi matching transaction nahi mila.',
      multiple_matches: 'Multiple transactions match karte hain. More specific hon.',
      already_reconciled: 'Ye transaction pehle se reconciled hai.',
      not_reconciled: 'Reconcile nahi ho saka. Transaction details check karein.'
    }
  }
};

class ReconciliationVoiceParser {
  constructor() {
    this.parties = [];
    this.fuse = null;
    this.initFuzzySearch();
  }

  /**
   * Initialize fuzzy search for party names
   */
  initFuzzySearch() {
    this.fuse = new Fuse(this.parties, {
      keys: ['name', 'contact_person', 'phone'],
      threshold: 0.4,
      includeScore: true
    });
  }

  /**
   * Update parties cache for fuzzy matching
   */
  setParties(parties) {
    this.parties = parties || [];
    this.initFuzzySearch();
  }

  /**
   * Parse a voice transcript into structured reconciliation command
   */
  parse(transcript, language = 'english') {
    if (!transcript || typeof transcript !== 'string') {
      return this.createResponse(RECONCILIATION_INTENTS.UNKNOWN, null, 'invalid_input');
    }

    const normalizedTranscript = transcript.toLowerCase().trim();
    const intent = this.extractIntent(normalizedTranscript);
    const entities = this.extractEntities(normalizedTranscript, intent);

    return {
      success: true,
      intent,
      entities,
      originalTranscript: transcript,
      normalizedTranscript,
      language,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Extract intent from transcript
   */
  extractIntent(transcript) {
    // Reconcile intent patterns
    const reconcilePatterns = [
      { regex: /(?:reconcile|match|clear|match\s+up)\s+(?:transaction\s+)?(?:of\s+)?(?:₹|rs\.?|rupees?)?\s*([\d,]+(?:\.\d{1,2})?)/i, intent: RECONCILIATION_INTENTS.RECONCILE_SINGLE },
      { regex: /(?:reconcile|match|clear)\s+(?:all\s+)?(?:transactions?\s+)?(?:of\s+)?([a-zA-Z\s]+)/i, intent: RECONCILIATION_INTENTS.RECONCILE_BY_PARTY },
      { regex: /(?:reconcile|match|clear)\s+(?:all\s+)?(?:for|today|yesterday|this\s+week|this\s+month)/i, intent: RECONCILIATION_INTENTS.RECONCILE_BY_DATE },
      { regex: /(?:reconcile|match|clear)\s+(?:all\s+)?transactions?/i, intent: RECONCILIATION_INTENTS.RECONCILE_BATCH }
    ];

    // View intent patterns
    const viewPatterns = [
      { regex: /(?:show|list|display|view| dikhaye|bataye)\s+(?:all\s+)?(?:unreconciled|pending|baaki|bacha)/i, intent: RECONCILIATION_INTENTS.VIEW_UNRECONCILED },
      { regex: /(?:show|list|display|view| dikhaye)\s+(?:all\s+)?(?:reconciled|done|ho\s+ gaya)/i, intent: RECONCILIATION_INTENTS.VIEW_RECONCILED }
    ];

    // Query intent patterns
    const queryPatterns = [
      { regex: /(?:how\s+much|kitna|kaisa)\s+(?:is\s+)?(?:reconciled|ho\s+gaya|mil\s+gaya)/i, intent: RECONCILIATION_INTENTS.QUERY_SUMMARY },
      { regex: /(?:what\s+(?:is\s+)?)?(?:reconciliation\s+)?status|kitni\s+baaki/i, intent: RECONCILIATION_INTENTS.QUERY_STATUS },
      { regex: /(?:compare|compare\s+kar|compare\s+karein)\s+(?:bank\s+balance|bank\s+ka\s+balance|party\s+ledger)/i, intent: RECONCILIATION_INTENTS.COMPARE_BALANCE },
      { regex: /(?:what\s+(?:is\s+)?(?:the\s+)?)?(?:difference|farak|diff|kitna\s+ka\s+farak)/i, intent: RECONCILIATION_INTENTS.SHOW_DIFFERENCE }
    ];

    // Action intent patterns
    const actionPatterns = [
      { regex: /(?:mark\s+as\s+)?reconciled|done\s+ho\s+gaya|ho\s+gaya/i, intent: RECONCILIATION_INTENTS.MARK_RECONCILED },
      { regex: /(?:unreconcile|undo|unmatch|undo\s+ kar|na\s+ kar)/i, intent: RECONCILIATION_INTENTS.UNRECONCILE },
      { regex: /(?:match\s+(?:bank\s+)?transaction|match\s+karein)\s*(?:of\s+)?(?:₹|rs\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i, intent: RECONCILIATION_INTENTS.MATCH_TRANSACTION },
      { regex: /(?:flag|mark)\s+(?:transaction\s+)?(?:for\s+)?(?:review|manual)/i, intent: RECONCILIATION_INTENTS.FLAG_TRANSACTION }
    ];

    // Check patterns in order of specificity
    for (const patterns of [reconcilePatterns, viewPatterns, queryPatterns, actionPatterns]) {
      for (const pattern of patterns) {
        if (pattern.regex.test(transcript)) {
          return pattern.intent;
        }
      }
    }

    return RECONCILIATION_INTENTS.UNKNOWN;
  }

  /**
   * Extract entities (amount, party, date, transaction ID) from transcript
   */
  extractEntities(transcript, intent) {
    const entities = {
      amount: null,
      party: null,
      partyId: null,
      date: null,
      transactionId: null,
      reference: null,
      fuzzyMatch: null
    };

    // Extract amount
    const amountMatch = transcript.match(/(?:₹|rs\.?|rupees?)?\s*([\d,]+(?:\.\d{1,2})?)/);
    if (amountMatch) {
      entities.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }

    // Extract transaction ID
    const idMatch = transcript.match(/(?:transaction\s+)?(?:id\s+#?|number\s+#?|#)\s*(\d+)/i);
    if (idMatch) {
      entities.transactionId = parseInt(idMatch[1]);
    }

    // Extract reference number
    const refMatch = transcript.match(/(?:reference|invoice|inv|receipt|bill)\s*(?:#|no\.?|number\s+)?\s*([a-zA-Z0-9-]+)/i);
    if (refMatch) {
      entities.reference = refMatch[1];
    }

    // Extract date
    const dateEntities = this.extractDate(transcript);
    if (dateEntities) {
      entities.date = dateEntities;
    }

    // Extract party name (for intents that require it)
    if ([RECONCILIATION_INTENTS.RECONCILE_SINGLE, RECONCILIATION_INTENTS.RECONCILE_BY_PARTY, 
         RECONCILIATION_INTENTS.MATCH_TRANSACTION].includes(intent)) {
      const partyResult = this.extractParty(transcript);
      entities.party = partyResult.name;
      entities.fuzzyMatch = partyResult.fuzzyMatch;
    }

    return entities;
  }

  /**
   * Extract party name from transcript
   */
  extractParty(transcript) {
    // Remove action words and amounts to isolate party name
    const cleanedTranscript = transcript
      .replace(/(?:reconcile|match|clear|match\s+up|with|transaction|id|invoice|reference|bill|receipt)/gi, '')
      .replace(/(?:₹|rs\.?|rupees?)?\s*[\d,]+(?:\.\d{1,2})?/g, '')
      .replace(/\d+/g, '')
      .trim();

    // Fuzzy match against known parties
    if (this.parties.length > 0 && cleanedTranscript.length > 0) {
      const results = this.fuse.search(cleanedTranscript);
      if (results.length > 0) {
        return {
          name: results[0].item.name,
          fuzzyMatch: {
            matchedName: results[0].item.name,
            score: results[0].score,
            id: results[0].item.id
          }
        };
      }
    }

    return {
      name: cleanedTranscript.charAt(0).toUpperCase() + cleanedTranscript.slice(1),
      fuzzyMatch: null
    };
  }

  /**
   * Extract date entities from transcript
   */
  extractDate(transcript) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (/\btoday\b|aaj\b|aj\b/i.test(transcript)) {
      return { type: 'today', value: todayStr };
    }

    if (/\byesterday\b|kal\b/i.test(transcript)) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return { type: 'yesterday', value: yesterday.toISOString().split('T')[0] };
    }

    if (/\bthis\s+week\b|is\s+hafta\b/i.test(transcript)) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { type: 'week', start: weekAgo.toISOString().split('T')[0], end: todayStr };
    }

    if (/\bthis\s+month\b|is\s+mahine\b/i.test(transcript)) {
      return { type: 'month', value: todayStr.substring(0, 7) };
    }

    if (/\blast\s+month\b|pichla\s+mahine\b/i.testTranscript) {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return { type: 'month', value: lastMonth.toISOString().substring(0, 7) };
    }

    // Try to parse explicit dates
    const dateMatch = transcript.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (dateMatch) {
      let year = dateMatch[3];
      if (year.length === 2) {
        year = '20' + year;
      }
      return { type: 'specific', value: `${year}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}` };
    }

    return null;
  }

  /**
   * Generate feedback message based on result
   */
  generateFeedback(result, language = 'english') {
    const category = result.success ? 'success' : 'error';
    const messages = feedbackMessages[category][language] || feedbackMessages[category]['english'];
    const template = messages[result.intent] || messages[Object.keys(messages)[0]];

    if (!template) {
      return result.success 
        ? 'Operation completed successfully' 
        : 'An error occurred during the operation';
    }

    let message = template;
    if (result.data) {
      if (result.data.amount) {
        message = message.replace('{amount}', `₹${result.data.amount.toLocaleString()}`);
      }
      if (result.data.party) {
        message = message.replace('{party}', result.data.party);
      }
      if (result.data.count) {
        message = message.replace('{count}', result.data.count);
      }
      if (result.data.id) {
        message = message.replace('{id}', result.data.id);
      }
      if (result.data.date) {
        message = message.replace('{date}', result.data.date);
      }
    }

    return message;
  }

  /**
   * Create a structured response object
   */
  createResponse(intent, entities, status, data = null) {
    return {
      success: status !== 'error',
      intent,
      entities,
      status,
      data,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate parsed command before execution
   */
  validate(parsedCommand) {
    const errors = [];

    // Validate based on intent
    switch (parsedCommand.intent) {
      case RECONCILIATION_INTENTS.RECONCILE_SINGLE:
        if (!parsedCommand.entities.amount) {
          errors.push('Amount is required for single transaction reconciliation');
        }
        if (!parsedCommand.entities.party && !parsedCommand.entities.transactionId) {
          errors.push('Party name or transaction ID is required');
        }
        break;

      case RECONCILIATION_INTENTS.MARK_RECONCILED:
      case RECONCILIATION_INTENTS.UNRECONCILE:
        if (!parsedCommand.entities.transactionId) {
          errors.push('Transaction ID is required');
        }
        break;

      case RECONCILIATION_INTENTS.MATCH_TRANSACTION:
        if (!parsedCommand.entities.amount) {
          errors.push('Amount is required for transaction matching');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const reconciliationVoiceParser = new ReconciliationVoiceParser();

// Export class for testing
export default ReconciliationVoiceParser;
