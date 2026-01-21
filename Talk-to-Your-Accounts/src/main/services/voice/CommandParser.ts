// Command Parser Service - Parses transcribed text into accounting commands
// Converts natural language voice input into structured accounting actions

import { EventEmitter } from 'events';
import {
  VoiceIntent,
  ParsedVoiceCommand,
  VoiceEntity,
  TranscriptionResult
} from '../../shared/types/voice';
import { dictionaryService } from '../dictionary/DictionaryService';

export interface ParseResult {
  command: ParsedVoiceCommand;
  requiresConfirmation: boolean;
  suggestedResponse: string;
}

export interface IntentPattern {
  intent: VoiceIntent;
  patterns: RegExp[];
  priority: number;
  examples: string[];
}

export class CommandParser extends EventEmitter {
  private patterns: IntentPattern[];
  private entityExtractors: Map<string, RegExp[]>;

  constructor() {
    super();
    this.setupPatterns();
    this.setupEntityExtractors();
  }

  private setupPatterns(): void {
    this.patterns = [
      // ADD_EXPENSE - High priority
      {
        intent: 'ADD_EXPENSE',
        priority: 10,
        patterns: [
          /add\s+expense/i,
          /add\s+(an|a)\s+expense/i,
          /record\s+expense/i,
          /log\s+expense/i,
          /new\s+expense/i,
          /spent/i,
          /paid\s+for/i,
          /spent\s+(?:Rs\.?|INR|₹)?\s*[\d,]+/i,
          /expense\s+of/i,
          /spent.*on/i,
          /bought/i,
          /purchased/i
        ],
        examples: [
          'Add expense of 500 for groceries',
          'Spent 2000 on fuel',
          'Record expense 500 rupees for office supplies',
          'Paid 150 for lunch'
        ]
      },

      // ADD_INCOME - High priority
      {
        intent: 'ADD_INCOME',
        priority: 10,
        patterns: [
          /add\s+income/i,
          /add\s+(an|a)\s+income/i,
          /record\s+income/i,
          /log\s+income/i,
          /new\s+income/i,
          /received/i,
          /earned/i,
          /income\s+of/i,
          /got\s+paid/i,
          /salary\s+credit/i
        ],
        examples: [
          'Add income of 50000 from salary',
          'Received 10000 from consulting',
          'Record income 5000 as consulting fee',
          'Earned 20000 today'
        ]
      },

      // ADD_TRANSACTION - Medium priority
      {
        intent: 'ADD_TRANSACTION',
        priority: 5,
        patterns: [
          /add\s+transaction/i,
          /new\s+transaction/i,
          /create\s+transaction/i,
          /add\s+entry/i,
          /new\s+entry/i,
          /journal\s+entry/i,
          /make\s+a\s+transaction/i
        ],
        examples: [
          'Add transaction for 1000',
          'Create new transaction',
          'Add entry for electricity bill'
        ]
      },

      // ADD_PARTY - Medium priority
      {
        intent: 'ADD_PARTY',
        priority: 5,
        patterns: [
          /add\s+(?:new\s+)?(party|customer|client|vendor|supplier)/i,
          /create\s+(?:new\s+)?(party|customer|client|vendor|supplier)/i,
          /register\s+(?:new\s+)?(party|customer|client|vendor|supplier)/i
        ],
        examples: [
          'Add new party ABC Corporation',
          'Create vendor for Amazon',
          'Add customer John Doe'
        ]
      },

      // ADD_PRODUCT - Medium priority
      {
        intent: 'ADD_PRODUCT',
        priority: 5,
        patterns: [
          /add\s+(?:new\s+)?(product|item|inventory)/i,
          /create\s+(?:new\s+)?(product|item|inventory)/i,
          /register\s+(?:new\s+)?(product|item|inventory)/i,
          /add\s+(?:new\s+)?service/i
        ],
        examples: [
          'Add new product Widget A',
          'Create item for software license',
          'Add inventory item Laptop'
        ]
      },

      // GENERATE_REPORT - High priority
      {
        intent: 'GENERATE_REPORT',
        priority: 8,
        patterns: [
          /generate\s+(?:a\s+)?report/i,
          /show\s+(?:me\s+)?(?:the\s+)?report/i,
          /view\s+(?:the\s+)?report/i,
          /print\s+(?:the\s+)?report/i,
          /export\s+(?:the\s+)?report/i,
          /(?:give\s+me|show\s+me)\s+(?:a\s+)?(?:daily|weekly|monthly|annual|yearly)\s+report/i,
          /show\s+(?:me\s+)?(?:my\s+)?(?:expense|income|sales)\s+report/i,
          /show\s+(?:me\s+)?balance\s+sheet/i,
          /show\s+(?:me\s+)?profit\s+and\s+loss/i,
          /show\s+(?:me\s+)?cash\s+flow/i,
          /p\s+and\s+l/i,
          /profit\s+(?:and|&)\s+loss/i
        ],
        examples: [
          'Generate monthly report',
          'Show me expense report for last month',
          'View profit and loss statement',
          'Show balance sheet',
          'Give me weekly sales report'
        ]
      },

      // QUERY_BALANCE - High priority
      {
        intent: 'QUERY_BALANCE',
        priority: 8,
        patterns: [
          /what(?:'s|\s+is)?\s+(?:my|the)?\s+balance/i,
          /show\s+(?:my|the)?\s+balance/i,
          /check\s+(?:my|the)?\s+balance/i,
          /tell\s+(?:me\s+)?(?:my|the)?\s+balance/i,
          /(?:how\s+much|what)\s+(?:is\s+)?(?:my|the)?\s+(?:cash|money|funds)/i,
          /total\s+(?:cash|money|balance)/i
        ],
        examples: [
          'What is my balance?',
          'Show me my current balance',
          'How much money do I have?',
          'Check my cash balance'
        ]
      },

      // NAVIGATE - Low priority
      {
        intent: 'NAVIGATE',
        priority: 1,
        patterns: [
          /go\s+to/i,
          /navigate\s+to/i,
          /open/i,
          /show\s+me/i,
          /take\s+me\s+to/i,
          /switch\s+to/i
        ],
        examples: [
          'Go to dashboard',
          'Open transactions page',
          'Show me reports',
          'Take me to settings'
        ]
      }
    ];

    // Sort by priority
    this.patterns.sort((a, b) => b.priority - a.priority);
  }

  private setupEntityExtractors(): void {
    this.entityExtractors = new Map([
      ['AMOUNT', [
        /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{2})?)/i,
        /([\d,]+(?:\.\d{2})?)\s*(?:rupees?|INR|Rs\.?)/i,
        /amount\s+(?:of\s+)?([\d,]+(?:\.\d{2})?)/i,
        /for\s+([\d,]+(?:\.\d{2})?)/i,
        /spent\s+(?:an?\s+)?([\d,]+(?:\.\d{2})?)/i,
        /([\d,]+(?:\.\d{2})?)\s*(?:only)?(?:\s|$)/i
      ]],
      
      ['DATE', [
        /(?:on\s+)?(?:today|yesterday|tomorrow)/i,
        /(?:on\s+)?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
        /(?:on\s+)?(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})/i,
        /(?:on\s+)?(?:this|last|next)\s+(?:week|month|year)/i,
        /(?:on\s+)?(?:last|past)\s+(\d+)\s+(?:days?|weeks?|months?)/i,
        /dated?\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
      ]],
      
      ['DESCRIPTION', [
        /for\s+([a-zA-Z\s]+?)(?:\s+(?:on|at|of|from)|$)/i,
        /spent.*?on\s+([a-zA-Z\s]+?)(?:\s+(?:amount|for|at)|$)/i,
        /on\s+([a-zA-Z\s]+?)(?:\s+(?:amount|for|bill)|$)/i,
        /towards\s+([a-zA-Z\s]+?)(?:\s+(?:for|of)|$)/i,
        /towards\s+([a-zA-Z\s]+?)$/i,
        /description\s+(?:of\s+)?([a-zA-Z\s]+?)(?:\s+amount|$)/i
      ]],
      
      ['CATEGORY', [
        /(?:under|category|of\s+type)\s+([a-zA-Z\s&]+?)(?:\s+(?:of|for)|$)/i,
        /as\s+([a-zA-Z\s&]+?)(?:\s+expense|income)/i,
        /(?:in|category)\s+([a-zA-Z\s&]+?)(?:\s+(?:category|expense|income)|$)/i
      ]],
      
      ['PARTY', [
        /(?:from|to|with|at)\s+([A-Z][a-zA-Z\s&]+?)(?:\s+(?:on|for|amount)|$)/i,
        /(?:paid|received)\s+(?:to|from)\s+([A-Z][a-zA-Z\s&]+?)(?:\s+(?:on|for|amount)|$)/i,
        /(?:vendor|supplier|customer|party)\s+([A-Z][a-zA-Z\s&]+?)(?:\s+(?:on|for|amount)|$)/i
      ]]
    ]);
  }

  async parse(text: string): Promise<ParseResult> {
    if (!text || text.trim().length === 0) {
      return this.createEmptyResult();
    }

    const normalizedText = text.toLowerCase().trim();
    const intent = this.detectIntent(normalizedText);
    const entities = await this.extractEntities(normalizedText);
    
    const command: ParsedVoiceCommand = {
      rawText: text,
      intent,
      entities,
      confidence: this.calculateConfidence(text, intent),
      timestamp: new Date()
    };

    const requiresConfirmation = this.requiresConfirmation(command);
    const suggestedResponse = this.generateResponse(command);

    return {
      command,
      requiresConfirmation,
      suggestedResponse
    };
  }

  private detectIntent(text: string): VoiceIntent {
    for (const pattern of this.patterns) {
      for (const regex of pattern.patterns) {
        if (regex.test(text)) {
          return pattern.intent;
        }
      }
    }
    return 'UNKNOWN';
  }

  private async extractEntities(text: string): Promise<VoiceEntity[]> {
    const entities: VoiceEntity[] = [];

    // Extract amount first
    const amountEntities = this.extractAmount(text);
    entities.push(...amountEntities);

    // Extract date
    const dateEntities = this.extractDate(text);
    entities.push(...dateEntities);

    // Extract description
    const descEntities = this.extractDescription(text);
    entities.push(...descEntities);

    // Extract category
    const catEntities = await this.extractCategory(text);
    entities.push(...catEntities);

    // Extract party from dictionary
    const partyEntities = await this.extractParty(text);
    entities.push(...partyEntities);

    // Deduplicate entities by type (keep highest confidence)
    const uniqueEntities: VoiceEntity[] = [];
    const seenTypes = new Set<string>();
    
    for (const entity of entities) {
      if (!seenTypes.has(entity.type)) {
        seenTypes.add(entity.type);
        uniqueEntities.push(entity);
      }
    }

    return uniqueEntities;
  }

  private extractAmount(text: string): VoiceEntity[] {
    const patterns = this.entityExtractors.get('AMOUNT') || [];
    const entities: VoiceEntity[] = [];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = match[1].replace(/,/g, '');
        entities.push({
          type: 'AMOUNT',
          value: parseFloat(value),
          confidence: 0.9
        });
        break; // Only take first match
      }
    }

    return entities;
  }

  private extractDate(text: string): VoiceEntity[] {
    const patterns = this.entityExtractors.get('DATE') || [];
    const entities: VoiceEntity[] = [];

    const today = new Date();
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let dateValue: string | Date = match[0];
        let confidence = 0.85;

        // Handle relative dates
        if (/today/i.test(match[0])) {
          dateValue = today;
          confidence = 0.95;
        } else if (/yesterday/i.test(match[0])) {
          dateValue = new Date(today);
          dateValue.setDate(dateValue.getDate() - 1);
          confidence = 0.95;
        } else if (/tomorrow/i.test(match[0])) {
          dateValue = new Date(today);
          dateValue.setDate(dateValue.getDate() + 1);
          confidence = 0.95;
        } else if (/last\s+week/i.test(match[0])) {
          dateValue = new Date(today);
          dateValue.setDate(dateValue.getDate() - 7);
          confidence = 0.9;
        } else if (/last\s+month/i.test(match[0])) {
          dateValue = new Date(today);
          dateValue.setMonth(dateValue.getMonth() - 1);
          confidence = 0.9;
        } else {
          // Try to parse date string
          const parsed = new Date(match[1]);
          if (!isNaN(parsed.getTime())) {
            dateValue = parsed;
            confidence = 0.8;
          }
        }

        entities.push({
          type: 'DATE',
          value: dateValue,
          confidence
        });
        break;
      }
    }

    return entities;
  }

  private extractDescription(text: string): VoiceEntity[] {
    const patterns = this.entityExtractors.get('DESCRIPTION') || [];
    const entities: VoiceEntity[] = [];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const description = match[1].trim();
        if (description.length > 2) {
          entities.push({
            type: 'DESCRIPTION',
            value: description,
            confidence: 0.75
          });
          break;
        }
      }
    }

    return entities;
  }

  private async extractCategory(text: string): Promise<VoiceEntity[]> {
    const patterns = this.entityExtractors.get('CATEGORY') || [];
    const entities: VoiceEntity[] = [];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const category = match[1].trim();
        if (category.length > 2) {
          entities.push({
            type: 'CATEGORY',
            value: category,
            confidence: 0.7
          });
          break;
        }
      }
    }

    return entities;
  }

  private async extractParty(text: string): Promise<VoiceEntity[]> {
    const entities: VoiceEntity[] = [];
    
    // Get terms from dictionary
    const termMap = await dictionaryService.getTermMap();
    
    for (const [spoken, mapped] of termMap) {
      if (text.includes(spoken.toLowerCase())) {
        // Check if it's likely a party
        if (/company|corp|ltd|inc|llp|india/i.test(mapped)) {
          entities.push({
            type: 'PARTY',
            value: mapped,
            confidence: 0.85
          });
        }
      }
    }

    return entities;
  }

  private calculateConfidence(text: string, intent: VoiceIntent): number {
    let confidence = 0.5;

    // Boost confidence for longer, more specific commands
    const wordCount = text.split(/\s+/).length;
    confidence += Math.min(wordCount * 0.02, 0.2);

    // Boost for recognized intent patterns
    for (const pattern of this.patterns) {
      if (pattern.intent === intent) {
        for (const regex of pattern.patterns) {
          if (regex.test(text)) {
            confidence += 0.2;
            break;
          }
        }
        break;
      }
    }

    // Boost for presence of amount (for transaction-related intents)
    if (/[\d,]+(?:\.\d{2})?/.test(text) && 
        ['ADD_EXPENSE', 'ADD_INCOME', 'ADD_TRANSACTION'].includes(intent)) {
      confidence += 0.1;
    }

    // Penalize for very short unclear commands
    if (text.length < 5) {
      confidence -= 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  private requiresConfirmation(command: ParsedVoiceCommand): boolean {
    // Always confirm for high-value transactions
    const amountEntity = command.entities.find(e => e.type === 'AMOUNT');
    if (amountEntity && typeof amountEntity.value === 'number') {
      if (amountEntity.value > 10000) {
        return true;
      }
    }

    // Confirm for unknown intents
    if (command.intent === 'UNKNOWN') {
      return true;
    }

    // Confirm if confidence is low
    if (command.confidence < 0.6) {
      return true;
    }

    return false;
  }

  private generateResponse(command: ParsedVoiceCommand): string {
    const amountEntity = command.entities.find(e => e.type === 'AMOUNT');
    const descEntity = command.entities.find(e => e.type === 'DESCRIPTION');
    const dateEntity = command.entities.find(e => e.type === 'DATE');

    switch (command.intent) {
      case 'ADD_EXPENSE':
        return `I'll record an expense of ₹${amountEntity?.value || '?'}${descEntity ? ` for ${descEntity.value}` : ''}${dateEntity ? ` on ${dateEntity.value}` : ''}. Is this correct?`;
      
      case 'ADD_INCOME':
        return `I'll record income of ₹${amountEntity?.value || '?'}${descEntity ? ` from ${descEntity.value}` : ''}${dateEntity ? ` on ${dateEntity.value}` : ''}. Is this correct?`;
      
      case 'ADD_TRANSACTION':
        return `I'll add a transaction for ₹${amountEntity?.value || '?'}${descEntity ? `: ${descEntity.value}` : ''}. Please confirm.`;
      
      case 'GENERATE_REPORT':
        return `I'll generate the report you requested. One moment please.`;
      
      case 'QUERY_BALANCE':
        return `Let me check your current balance.`;
      
      case 'NAVIGATE':
        return `Taking you to ${descEntity?.value || 'the requested page'}.`;
      
      case 'UNKNOWN':
        return `I didn't understand that command. Could you please rephrase?`;
      
      default:
        return `I understand you want to "${command.rawText}". Would you like me to proceed?`;
    }
  }

  private createEmptyResult(): ParseResult {
    const command: ParsedVoiceCommand = {
      rawText: '',
      intent: 'UNKNOWN',
      entities: [],
      confidence: 0,
      timestamp: new Date()
    };

    return {
      command,
      requiresConfirmation: false,
      suggestedResponse: 'I didn\'t catch that. Could you please try again?'
    };
  }

  // Utility methods for getting examples
  getExamplesForIntent(intent: VoiceIntent): string[] {
    const pattern = this.patterns.find(p => p.intent === intent);
    return pattern?.examples || [];
  }

  getAllPatterns(): IntentPattern[] {
    return [...this.patterns];
  }

  // Validation methods
  validateCommand(command: ParsedVoiceCommand): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (command.intent) {
      case 'ADD_EXPENSE':
      case 'ADD_INCOME':
      case 'ADD_TRANSACTION':
        const hasAmount = command.entities.some(e => e.type === 'AMOUNT');
        if (!hasAmount) {
          errors.push('Amount is required for this transaction');
        }
        break;
      
      case 'ADD_PARTY':
        const hasPartyName = command.entities.some(e => e.type === 'PARTY' || e.type === 'DESCRIPTION');
        if (!hasPartyName) {
          errors.push('Party name is required');
        }
        break;
      
      case 'ADD_PRODUCT':
        const hasProductName = command.entities.some(e => e.type === 'PRODUCT' || e.type === 'DESCRIPTION');
        if (!hasProductName) {
          errors.push('Product name is required');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Format entities for display
  formatCommandForDisplay(command: ParsedVoiceCommand): string {
    const parts: string[] = [];
    parts.push(`**Intent:** ${command.intent.replace(/_/g, ' ')}`);
    parts.push(`**Confidence:** ${Math.round(command.confidence * 100)}%`);

    if (command.entities.length > 0) {
      parts.push('**Entities:**');
      for (const entity of command.entities) {
        parts.push(`  - ${entity.type}: ${entity.value} (${Math.round(entity.confidence * 100)}% confidence)`);
      }
    }

    return parts.join('\n');
  }
}

export const commandParser = new CommandParser();
