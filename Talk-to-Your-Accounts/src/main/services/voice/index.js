// Voice Services Index - JavaScript implementation for Electron main process
// This provides CommonJS exports for the voice services

const EventEmitter = require('events');

// VoiceService implementation
class VoiceService extends EventEmitter {
  constructor() {
    super();
    this.settings = {
      enabled: true,
      language: 'en',
      hotkey: 'CommandOrControl+Shift+V',
      autoPunctuation: true,
      partialResults: true,
      noiseThreshold: 0.02
    };
    this.state = {
      status: 'IDLE',
      transcript: '',
      partialTranscript: '',
      lastCommand: null,
      isListening: false,
      settings: this.settings
    };
    this.commandHistory = [];
    this.maxHistorySize = 50;
    this._initialized = false;
  }

  async initialize() {
    try {
      this._initialized = true;
      this.state.status = 'IDLE';
      this.emit('initialized');
      console.log('[VoiceService] Initialized successfully (JS fallback)');
    } catch (error) {
      console.error('[VoiceService] Initialization failed:', error);
      this.state.status = 'ERROR';
      throw error;
    }
  }

  async startListening() {
    this.state.isListening = true;
    this.state.status = 'LISTENING';
    this.emit('listeningStarted');
    console.log('[VoiceService] Started listening');
    return { success: true };
  }

  async stopListening() {
    this.state.isListening = false;
    this.state.status = 'IDLE';
    this.emit('listeningStopped');
    console.log('[VoiceService] Stopped listening');
    return null;
  }

  toggleListening() {
    if (this.state.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
    return this.state.isListening;
  }

  getState() {
    return this.state;
  }

  getAudioLevel() {
    return 0;
  }

  isListening() {
    return this.state.isListening;
  }

  getSettings() {
    return this.settings;
  }

  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    this.emit('settingsChanged', this.settings);
  }

  setEnabled(enabled) {
    this.settings.enabled = enabled;
    this.emit('enabledChanged', enabled);
  }

  setLanguage(language) {
    this.settings.language = language;
  }

  async getDictionaryTerms() {
    return [];
  }

  async addDictionaryTerm(spoken, mapped, category) {
    return { id: Date.now(), spoken, mapped, category };
  }

  async removeDictionaryTerm(id) {
    return true;
  }

  async updateDictionaryTerm(id, updates) {
    return true;
  }

  async searchDictionaryTerms(query) {
    return [];
  }

  getSupportedModels() {
    return ['vosk-model-en-us-0.21', 'vosk-model-small-en-us-0.15'];
  }

  async setModel(modelId) {
    console.log('[VoiceService] Model changed to:', modelId);
    this.emit('modelChanged', modelId);
  }

  async downloadModel(modelId, onProgress) {
    console.log('[VoiceService] Downloading model:', modelId);
    // Simulate download
    for (let i = 0; i <= 100; i += 10) {
      if (onProgress) onProgress(i);
      await new Promise(r => setTimeout(r, 100));
    }
  }

  getCommandHistory() {
    return this.commandHistory;
  }

  clearHistory() {
    this.commandHistory = [];
  }

  async retryLastCommand() {
    if (this.commandHistory.length > 0) {
      const lastCommand = this.commandHistory[this.commandHistory.length - 1];
      this.emit('executeCommand', lastCommand);
    }
  }

  async confirmAndExecute(command) {
    this.emit('executeCommand', command);
    return true;
  }

  async cleanup() {
    this._initialized = false;
    console.log('[VoiceService] Cleaned up');
  }
}

// CommandParser implementation
class CommandParser extends EventEmitter {
  constructor() {
    super();
    this.patterns = [];
    this.entityExtractors = new Map();
    this.setupPatterns();
    this.setupEntityExtractors();
  }

  setupPatterns() {
    this.patterns = [
      {
        intent: 'ADD_EXPENSE',
        priority: 10,
        patterns: [
          /add\s+expense/i,
          /add\s+(an|a)\s+expense/i,
          /record\s+expense/i,
          /spent/i,
          /spent\s+(?:Rs\.?|INR|₹)?\s*[\d,]+/i,
          /expense\s+of/i
        ],
        examples: ['Add expense of 500 for groceries', 'Spent 2000 on fuel']
      },
      {
        intent: 'ADD_INCOME',
        priority: 10,
        patterns: [
          /add\s+income/i,
          /add\s+(an|a)\s+income/i,
          /record\s+income/i,
          /received/i,
          /earned/i,
          /income\s+of/i
        ],
        examples: ['Add income of 50000', 'Received salary']
      },
      {
        intent: 'ADD_TRANSACTION',
        priority: 5,
        patterns: [
          /add\s+transaction/i,
          /new\s+transaction/i,
          /create\s+transaction/i
        ],
        examples: ['Add transaction', 'Create new transaction']
      },
      {
        intent: 'GENERATE_REPORT',
        priority: 5,
        patterns: [
          /generate\s+report/i,
          /show\s+report/i,
          /create\s+report/i,
          /give\s+me\s+(?:my\s+)?report/i
        ],
        examples: ['Generate sales report', 'Show monthly report']
      },
      {
        intent: 'QUERY_BALANCE',
        priority: 8,
        patterns: [
          /what('s|\s+is)\s+(?:my\s+)?balance/i,
          /show\s+(?:my\s+)?balance/i,
          /check\s+(?:my\s+)?balance/i,
          /total\s+balance/i,
          /current\s+balance/i
        ],
        examples: ['What is my balance?', 'Show current balance']
      },
      {
        intent: 'NAVIGATE',
        priority: 3,
        patterns: [
          /go\s+to/i,
          /open/i,
          /show\s+me/i,
          /navigate\s+to/i
        ],
        examples: ['Go to dashboard', 'Open transactions']
      }
    ];
  }

  setupEntityExtractors() {
    this.entityExtractors.set('AMOUNT', [
      /(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i
    ]);
    this.entityExtractors.set('DATE', [
      /(?:on\s+)?(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      /(?:on\s+)?(today|yesterday|tomorrow)/i
    ]);
    this.entityExtractors.set('DESCRIPTION', [
      /(?:for|on|to)\s+([a-zA-Z\s]+?)(?:\s+(?:of|for|on)|$)/i
    ]);
    this.entityExtractors.set('CATEGORY', [
      /(?:category\s+)?([a-zA-Z]+)/i
    ]);
  }

  async parse(text) {
    let bestMatch = null;
    let highestPriority = -1;

    for (const pattern of this.patterns) {
      for (const regex of pattern.patterns) {
        if (regex.test(text)) {
          if (pattern.priority > highestPriority) {
            highestPriority = pattern.priority;
            bestMatch = {
              intent: pattern.intent,
              entities: this.extractEntities(text),
              rawText: text
            };
          }
        }
      }
    }

    if (bestMatch) {
      return {
        command: bestMatch,
        requiresConfirmation: false,
        suggestedResponse: `I'll help you with "${bestMatch.intent.replace(/_/g, ' ').toLowerCase()}"`
      };
    }

    return {
      command: {
        intent: 'UNKNOWN',
        entities: [],
        rawText: text
      },
      requiresConfirmation: true,
      suggestedResponse: "I didn't understand that command. Please try again."
    };
  }

  extractEntities(text) {
    const entities = [];

    // Extract amount
    const amountMatch = text.match(/(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (amountMatch) {
      entities.push({
        type: 'AMOUNT',
        value: parseFloat(amountMatch[1].replace(/,/g, '')),
        raw: amountMatch[0]
      });
    }

    // Extract date
    const dateMatch = text.match(/(?:on\s+)?(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i) ||
                      text.match(/(?:on\s+)?(today|yesterday|tomorrow)/i);
    if (dateMatch) {
      entities.push({
        type: 'DATE',
        value: dateMatch[1],
        raw: dateMatch[0]
      });
    }

    // Extract description (simplified)
    const descMatch = text.match(/(?:for|on|to)\s+([a-zA-Z\s]+?)(?:\s+(?:of|for|on)|$)/i);
    if (descMatch) {
      entities.push({
        type: 'DESCRIPTION',
        value: descMatch[1].trim(),
        raw: descMatch[0]
      });
    }

    return entities;
  }

  validateCommand(command) {
    return {
      valid: command.intent !== 'UNKNOWN',
      confidence: 0.8,
      suggestions: command.intent === 'UNKNOWN' ? [
        'Try saying "Add expense of 500 for groceries"',
        'Try saying "What is my balance?"'
      ] : []
    };
  }

  getExamplesForIntent(intent) {
    const pattern = this.patterns.find(p => p.intent === intent);
    return pattern ? pattern.examples : [];
  }
}

// AudioRecorder stub
class AudioRecorder extends EventEmitter {
  async initialize() {
    console.log('[AudioRecorder] Initialized');
  }
  start() { return true; }
  stop() { return null; }
  getData() { return null; }
}

// Transcriber stub
class Transcriber extends EventEmitter {
  async initialize() {
    console.log('[Transcriber] Initialized');
  }
  async transcribe(audioData) {
    return { text: '', confidence: 0 };
  }
  parseCommand(text) {
    return null;
  }
}

// Create singleton instances
const audioRecorder = new AudioRecorder();
const transcriber = new Transcriber();
const voiceService = new VoiceService();
const commandParser = new CommandParser();

// Export all services
module.exports = {
  VoiceService,
  VoiceService: VoiceService,
  voiceService,
  CommandParser,
  commandParser,
  audioRecorder,
  transcriber
};
