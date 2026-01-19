import api from '../utils/api';

/**
 * Voice Command Service
 * Handles voice recognition and text-to-speech functionality
 */
class VoiceCommandService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.synthesis = window.speechSynthesis;
    this.supported = this.checkSupport();
    this.commands = this.initializeCommands();
    this.onResult = null;
    this.onError = null;
    this.onStart = null;
    this.onEnd = null;
  }

  /**
   * Check if speech recognition is supported
   */
  checkSupport() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  /**
   * Initialize command patterns
   */
  initializeCommands() {
    return {
      // Transaction commands
      'create sale': { action: 'navigate', target: '/transactions/sale', params: {} },
      'new sale': { action: 'navigate', target: '/transactions/sale', params: {} },
      'create purchase': { action: 'navigate', target: '/transactions/purchase', params: {} },
      'new purchase': { action: 'navigate', target: '/transactions/purchase', params: {} },
      'add expense': { action: 'navigate', target: '/expenses/new', params: {} },
      'new expense': { action: 'navigate', target: '/expenses/new', params: {} },

      // Navigation commands
      'show dashboard': { action: 'navigate', target: '/', params: {} },
      'go to dashboard': { action: 'navigate', target: '/', params: {} },
      'show parties': { action: 'navigate', target: '/parties', params: {} },
      'show products': { action: 'navigate', target: '/products', params: {} },
      'show reports': { action: 'navigate', target: '/reports', params: {} },
      'show settings': { action: 'navigate', target: '/settings', params: {} },

      // Search commands
      'search party': { action: 'search', target: 'parties', params: {} },
      'search product': { action: 'search', target: 'products', params: {} },

      // Action commands
      'save': { action: 'action', target: 'save', params: {} },
      'cancel': { action: 'action', target: 'cancel', params: {} },
      'delete': { action: 'action', target: 'delete', params: {} },
      'print': { action: 'action', target: 'print', params: {} },

      // Report commands
      'sales report': { action: 'report', target: 'sales', params: {} },
      'purchase report': { action: 'report', target: 'purchase', params: {} },
      'gst report': { action: 'report', target: 'gst', params: {} },
      'profit loss': { action: 'report', target: 'profitLoss', params: {} },
      'show audit': { action: 'report', target: 'audit', params: {} },

      // Voice feedback commands
      'what is my cash flow': { action: 'query', target: 'cashFlow', params: {} },
      'total sales today': { action: 'query', target: 'todaySales', params: {} },
      'pending payments': { action: 'query', target: 'pendingPayments', params: {} }
    };
  }

  /**
   * Initialize speech recognition
   */
  initializeRecognition(options = {}) {
    if (!this.supported) {
      throw new Error('Speech recognition not supported in this browser');
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    this.recognition.continuous = options.continuous || false;
    this.recognition.interimResults = options.interimResults || true;
    this.recognition.interimResults = options.lang || 'en-IN';

    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onStart) this.onStart();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onEnd) this.onEnd();
    };

    this.recognition.onresult = (event) => {
      const results = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          results.push({
            transcript: event.results[i][0].transcript,
            confidence: event.results[i][0].confidence
          });
        }
      }

      if (results.length > 0 && this.onResult) {
        const best = results.reduce((a, b) => a.confidence > b.confidence ? a : b);
        this.onResult(best.transcript, best.confidence);
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (this.onError) this.onError(event.error);

      // Log error to server
      this.logCommand(null, null, event.error, event.error);
    };

    return this.recognition;
  }

  /**
   * Start listening for voice commands
   */
  start(options = {}) {
    return new Promise((resolve, reject) => {
      try {
        if (!this.recognition) {
          this.initializeRecognition(options);
        }

        this.recognition.start();
        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop listening
   */
  stop() {
    if (this.recognition) {
      this.recognition.stop();
    }
    this.isListening = false;
  }

  /**
   * Process a voice command
   */
  async processCommand(transcript, confidence) {
    const normalizedTranscript = transcript.toLowerCase().trim();
    let matchedCommand = null;
    let action = null;
    let params = {};

    // Try to match with known commands
    for (const [pattern, command] of Object.entries(this.commands)) {
      if (normalizedTranscript.includes(pattern)) {
        matchedCommand = pattern;
        action = command;
        break;
      }
    }

    // If no exact match, try partial matching
    if (!matchedCommand) {
      action = this.parseNaturalLanguage(normalizedTranscript);
    }

    // Log the command
    const logData = await this.logCommand(
      matchedCommand || normalizedTranscript,
      transcript,
      null,
      null,
      null,
      action
    );

    return {
      success: !!action,
      original: transcript,
      normalized: normalizedTranscript,
      matched: matchedCommand,
      action,
      logId: logData?.id
    };
  }

  /**
   * Parse natural language into structured command
   */
  parseNaturalLanguage(transcript) {
    const action = { action: 'unknown', target: transcript, params: {} };

    // Detect transaction keywords
    if (transcript.includes('sale') || transcript.includes('sell')) {
      action.action = 'navigate';
      action.target = '/transactions/sale';
    } else if (transcript.includes('purchase') || transcript.includes('buy')) {
      action.action = 'navigate';
      action.target = '/transactions/purchase';
    } else if (transcript.includes('expense') || transcript.includes('spending')) {
      action.action = 'navigate';
      action.target = '/expenses/new';
    } else if (transcript.includes('report')) {
      action.action = 'navigate';
      if (transcript.includes('sale')) action.target = '/reports/sales';
      else if (transcript.includes('gst')) action.target = '/reports/gst';
      else action.target = '/reports';
    } else if (transcript.includes('party') || transcript.includes('customer')) {
      action.action = 'navigate';
      action.target = '/parties';
    } else if (transcript.includes('product') || transcript.includes('item')) {
      action.action = 'navigate';
      action.target = '/products';
    } else if (transcript.includes('dashboard') || transcript.includes('home')) {
      action.action = 'navigate';
      action.target = '/';
    }

    // Extract numbers for potential use
    const numbers = transcript.match(/\d+/g);
    if (numbers) {
      action.params.numbers = numbers.map(Number);
    }

    return action;
  }

  /**
   * Log voice command to database
   */
  async logCommand(command, transcript, errorMessage, durationMs, language = 'en-IN') {
    try {
      const id = await api.voice.log({
        command,
        transcript,
        success: !errorMessage,
        error_message: errorMessage,
        duration_ms: durationMs,
        language
      });

      return { id };
    } catch (error) {
      console.error('Failed to log voice command:', error);
      return null;
    }
  }

  /**
   * Get voice command statistics
   */
  async getStats() {
    try {
      return await api.voice.getStats();
    } catch (error) {
      console.error('Failed to fetch voice stats:', error);
      throw error;
    }
  }

  /**
   * Get recent voice command logs
   */
  async getLogs(filters = {}) {
    try {
      return await api.voice.getLogs(filters);
    } catch (error) {
      console.error('Failed to fetch voice logs:', error);
      throw error;
    }
  }

  /**
   * Text-to-speech - speak the given text
   */
  speak(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Cancel any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options.lang || 'en-IN';
      utterance.rate = options.rate || 1;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 1;

      // Try to find a good Indian English voice
      const voices = this.synthesis.getVoices();
      const preferredVoice = voices.find(v =>
        v.lang.startsWith('en') &&
        (v.name.includes('India') || v.name.includes('Google') || v.name.includes('Microsoft'))
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(e);

      this.synthesis.speak(utterance);
    });
  }

  /**
   * Stop speaking
   */
  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  /**
   * Check if speaking is currently active
   */
  isSpeaking() {
    return this.synthesis ? this.synthesis.speaking : false;
  }

  /**
   * Get available voices
   */
  getVoices() {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices();
  }

  /**
   * Preload voices (needed for some browsers)
   */
  preloadVoices() {
    return new Promise((resolve) => {
      if (!this.synthesis) {
        resolve([]);
        return;
      }

      let voices = this.synthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
        return;
      }

      const onvoiceschanged = () => {
        voices = this.synthesis.getVoices();
        this.synthesis.removeEventListener('voiceschanged', onvoiceschanged);
        resolve(voices);
      };

      this.synthesis.addEventListener('voiceschanged', onvoiceschanged);

      // Fallback timeout
      setTimeout(() => {
        this.synthesis.removeEventListener('voiceschanged', onvoiceschanged);
        resolve(this.synthesis.getVoices());
      }, 1000);
    });
  }
}

export default new VoiceCommandService();
