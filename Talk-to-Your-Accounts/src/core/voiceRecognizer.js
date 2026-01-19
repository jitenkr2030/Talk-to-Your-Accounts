// Voice Recognizer Service
// Handles speech-to-text conversion with multi-language support

class VoiceRecognizer {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.supported = false;
    this.language = 'en-IN';
    
    this.init();
  }

  init() {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognitionAPI) {
      this.recognition = new SpeechRecognitionAPI();
      this.supported = true;
      
      // Default configuration
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-IN';
      this.recognition.maxAlternatives = 3;
      
      this.setupEventHandlers();
    } else {
      console.warn('Speech recognition not supported in this browser');
      this.supported = false;
    }
  }

  setupEventHandlers() {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.isListening = true;
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Trigger callbacks
      if (this.onInterimResult && interimTranscript) {
        this.onInterimResult(interimTranscript);
      }

      if (finalTranscript && this.onResult) {
        this.onResult(finalTranscript);
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      
      if (this.onError) {
        this.onError({
          type: event.error,
          message: this.getErrorMessage(event.error)
        });
      }
    };

    this.recognition.onnomatch = () => {
      if (this.onNoMatch) {
        this.onNoMatch();
      }
    };
  }

  // Start listening
  start(options = {}) {
    if (!this.supported || !this.recognition) {
      return Promise.reject(new Error('Speech recognition not supported'));
    }

    // Configure options
    this.recognition.lang = options.lang || this.language;
    this.recognition.continuous = options.continuous || false;
    this.recognition.interimResults = options.interimResults !== false;

    return new Promise((resolve, reject) => {
      try {
        this.recognition.start();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Stop listening
  stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
      this.isListening = false;
    }
  }

  // Set language
  setLanguage(lang) {
    const langMap = {
      'english': 'en-IN',
      'hindi': 'hi-IN',
      'hinglish': 'hi-IN'
    };
    
    this.language = langMap[lang] || lang;
    
    if (this.recognition) {
      this.recognition.lang = this.language;
    }
  }

  // Get language
  getLanguage() {
    return this.language;
  }

  // Check support
  isSupported() {
    return this.supported;
  }

  // Get error message
  getErrorMessage(errorType) {
    const errorMessages = {
      'no-speech': 'No speech detected. Please speak clearly and try again.',
      'audio-capture': 'No microphone found. Please check your microphone settings.',
      'not-allowed': 'Microphone access denied. Please allow microphone access.',
      'network': 'Network error. Please check your internet connection.',
      'aborted': 'Speech recognition aborted.',
      'language-not-supported': 'The selected language is not supported.',
      'service-not-allowed': 'Speech recognition service not allowed.',
      'too-many-requests': 'Too many requests. Please wait and try again.',
      'not-supported': 'Speech recognition is not supported in this browser.'
    };
    
    return errorMessages[errorType] || 'An error occurred. Please try again.';
  }

  // Event handlers
  onResult(callback) {
    this.onResult = callback;
  }

  onInterimResult(callback) {
    this.onInterimResult = callback;
  }

  onError(callback) {
    this.onError = callback;
  }

  onNoMatch(callback) {
    this.onNoMatch = callback;
  }

  onStart(callback) {
    if (this.recognition) {
      this.recognition.onstart = callback;
    }
  }

  onEnd(callback) {
    if (this.recognition) {
      this.recognition.onend = callback;
    }
  }

  // Get listening status
  getIsListening() {
    return this.isListening;
  }

  // Destroy
  destroy() {
    this.stop();
    this.recognition = null;
    this.supported = false;
  }
}

export const voiceRecognizer = new VoiceRecognizer();
export default VoiceRecognizer;
