// Voice Manager Service for Text-to-Speech and Speech Recognition
// Handles voice interactions for the Talk to Your Accounts application
// Supports English, Hindi, and Hinglish with visual feedback

class VoiceManager {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.voices = [];
    this.isListening = false;
    this.isSpeaking = false;
    this.onResult = null;
    this.onError = null;
    this.onStart = null;
    this.onEnd = null;
    this.onAudioLevel = null;
    this.audioContext = null;
    this.analyser = null;
    this.stream = null;

    this.initVoices();
    this.initRecognition();
    this.setupEventListeners();
  }

  initVoices() {
    if (this.synthesis) {
      this.voices = this.synthesis.getVoices();
      if (this.voices.length === 0) {
        this.synthesis.onvoiceschanged = () => {
          this.voices = this.synthesis.getVoices();
          console.log('Available voices:', this.voices.length);
        };
      }
    }
  }

  initRecognition() {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognitionAPI();
    
    // Default settings
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-IN';
    this.recognition.maxAlternatives = 3;

    // Event handlers
    this.recognition.onstart = () => {
      this.isListening = true;
      if (this.onStart) this.onStart();
      this.startAudioMonitoring();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onEnd) this.onEnd();
      this.stopAudioMonitoring();
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

      // Report interim results for visual feedback
      if (this.onInterimResult && interimTranscript) {
        this.onInterimResult(interimTranscript);
      }

      // Report final result
      if (finalTranscript && this.onResult) {
        this.onResult(finalTranscript);
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      this.stopAudioMonitoring();
      
      if (this.onError) {
        this.onError({
          type: event.error,
          message: this.getErrorMessage(event.error)
        });
      }
    };

    // Handle no speech detected
    this.recognition.onnomatch = () => {
      if (this.onError) {
        this.onError({
          type: 'no-match',
          message: 'Speech not recognized. Please try again.'
        });
      }
    };
  }

  setupEventListeners() {
    // Handle page visibility for speech synthesis
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isSpeaking) {
        this.stopSpeaking();
      }
    });

    // Handle audio competition
    document.addEventListener('play', () => {
      if (this.isSpeaking) {
        this.synthesis.pause();
      }
    });

    document.addEventListener('pause', () => {
      if (this.isSpeaking) {
        this.synthesis.resume();
      }
    });
  }

  // Start audio monitoring for visual feedback
  startAudioMonitoring() {
    try {
      if (this.recognition && 'webkitAudioContext' in window) {
        // Get audio stream from recognition if possible
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        
        // Monitor audio levels periodically
        this.audioLevelInterval = setInterval(() => {
          if (this.analyser && this.onAudioLevel) {
            const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            this.onAudioLevel(average / 255);
          }
        }, 100);
      }
    } catch (e) {
      console.warn('Audio monitoring not available:', e);
    }
  }

  stopAudioMonitoring() {
    if (this.audioLevelInterval) {
      clearInterval(this.audioLevelInterval);
      this.audioLevelInterval = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
  }

  // Start listening for speech
  async listen(options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        const error = new Error('Speech recognition not supported');
        if (this.onError) {
          this.onError({ type: 'not-supported', message: error.message });
        }
        reject(error);
        return;
      }

      // Configure recognition
      this.recognition.lang = options.lang || 'en-IN';
      this.recognition.continuous = options.continuous || false;
      this.recognition.interimResults = options.interimResults !== false;

      // Set up result handler
      this.onResult = (transcript) => {
        this.onResult = null;
        this.onInterimResult = null;
        resolve(transcript);
      };

      // Set up error handler
      this.onError = (error) => {
        this.onResult = null;
        this.onInterimResult = null;
        this.onError = null;
        reject(new Error(error.message));
      };

      // Set up interim result handler
      if (options.onInterimResult) {
        this.onInterimResult = options.onInterimResult;
      }

      try {
        this.recognition.start();
      } catch (error) {
        this.onError = null;
        reject(error);
      }
    });
  }

  // Start continuous listening mode
  startContinuousListening() {
    if (!this.recognition) {
      console.warn('Speech recognition not supported');
      return false;
    }

    this.recognition.continuous = true;
    this.recognition.interimResults = true;

    try {
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Failed to start continuous listening:', error);
      return false;
    }
  }

  // Stop listening
  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
      this.isListening = false;
      this.stopAudioMonitoring();
    }
  }

  // Text-to-Speech with language detection
  speak(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        console.warn('Speech synthesis not supported');
        if (options.onEnd) options.onEnd();
        resolve();
        return;
      }

      // Cancel any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      // Detect language from text
      const language = this.detectTextLanguage(text);
      
      // Select appropriate voice
      const voice = this.selectVoice(language, options.preferredVoice);
      if (voice) {
        utterance.voice = voice;
      }

      // Set language
      utterance.lang = this.getLangCode(language);
      utterance.rate = options.rate || 0.9;
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume !== undefined ? options.volume : 1;

      this.isSpeaking = true;

      utterance.onstart = () => {
        this.isSpeaking = true;
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        if (options.onEnd) options.onEnd();
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        this.isSpeaking = false;
        if (options.onEnd) options.onEnd();
        if (options.onError) options.onError(event.error);
        reject(new Error(event.error));
      };

      this.synthesis.speak(utterance);
    });
  }

  // Stop speaking
  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.isSpeaking = false;
    }
  }

  // Pause speaking
  pauseSpeaking() {
    if (this.synthesis) {
      this.synthesis.pause();
    }
  }

  // Resume speaking
  resumeSpeaking() {
    if (this.synthesis) {
      this.synthesis.resume();
    }
  }

  // Detect language from text
  detectTextLanguage(text) {
    const hindiPattern = /[\u0900-\u097F]/;
    const englishPattern = /^[a-zA-Z\s\d\s.,!?]+$/;
    
    if (hindiPattern.test(text)) {
      return 'hindi';
    }
    
    // Check for Hinglish indicators
    const hinglishWords = /\b(aap|main|mujhe|apna|ka|ki|ko|se|from|to|the|hai|hain|tha|thi|tho|kaun|kya|kaise|kitna|bhot|zyada|kum|achha|bas|bhai|dost|ji)\b/i;
    if (hinglishWords.test(text)) {
      return 'hinglish';
    }
    
    if (englishPattern.test(text)) {
      return 'english';
    }
    
    return 'english'; // Default
  }

  // Select appropriate voice
  selectVoice(language, preferredVoice) {
    if (!this.voices.length) {
      this.voices = this.synthesis.getVoices();
    }

    // If preferred voice specified
    if (preferredVoice) {
      const voice = this.voices.find(v => v.name === preferredVoice);
      if (voice) return voice;
    }

    // Language-based voice selection
    const langPrefix = {
      'hindi': 'hi',
      'hinglish': 'en-IN',
      'english': 'en'
    }[language] || 'en';

    // Prefer local voices
    const localVoice = this.voices.find(v => 
      v.lang === `${langPrefix}-IN` || v.lang.startsWith(langPrefix)
    );
    if (localVoice) return localVoice;

    // Fall back to any voice with matching language
    return this.voices.find(v => v.lang.startsWith(langPrefix)) || null;
  }

  // Get language code for speech synthesis
  getLangCode(language) {
    const codes = {
      'hindi': 'hi-IN',
      'hinglish': 'en-IN',
      'english': 'en-IN'
    };
    return codes[language] || 'en-IN';
  }

  // Get user-friendly error message
  getErrorMessage(errorType) {
    const errorMessages = {
      'no-speech': 'No speech detected. Please speak clearly and try again.',
      'audio-capture': 'No microphone found. Please check your microphone settings.',
      'not-allowed': 'Microphone access denied. Please allow microphone access.',
      'network': 'Network error. Please check your internet connection.',
      'aborted': 'Speech recognition aborted.',
      'language-not-supported': 'The selected language is not supported.',
      'service-not-allowed': 'Speech recognition service not allowed.',
      'bad-grammar': 'Grammar error.',
      'too-many-requests': 'Too many requests. Please wait and try again.',
      'not-supported': 'Speech recognition is not supported in this browser.'
    };
    
    return errorMessages[errorType] || 'An error occurred. Please try again.';
  }

  // Check if speech recognition is supported
  isRecognitionSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  // Check if speech synthesis is supported
  isSynthesisSupported() {
    return !!window.speechSynthesis;
  }

  // Check if voice manager is fully supported
  isSupported() {
    return this.isRecognitionSupported() && this.isSynthesisSupported();
  }

  // Get available voices
  getAvailableVoices() {
    if (!this.voices.length) {
      this.voices = this.synthesis.getVoices();
    }
    return this.voices.map(v => ({
      name: v.name,
      lang: v.lang,
      localService: v.localService,
      default: v.default
    }));
  }

  // Get current listening status
  getListeningStatus() {
    return this.isListening;
  }

  // Get current speaking status
  getSpeakingStatus() {
    return this.isSpeaking;
  }

  // Set listening callback
  onListeningStart(callback) {
    this.onStart = callback;
  }

  onListeningEnd(callback) {
    this.onEnd = callback;
  }

  onInterimResult(callback) {
    this.onInterimResult = callback;
  }

  onAudioLevelChange(callback) {
    this.onAudioLevel = callback;
  }

  // Quick speak functions for common responses
  async acknowledge(options = {}) {
    const acknowledgments = {
      english: ['Okay', 'Got it', 'Sure', 'Understood'],
      hindi: ['ठीक है', 'समझ गया', 'हाँ', 'जी'],
      hinglish: ['Okay', 'Samjha', 'Haan', 'Ji']
    };
    
    const language = options.language || 'english';
    const response = acknowledgments[language][Math.floor(Math.random() * acknowledgments[language].length)];
    
    await this.speak(response, { rate: 1.1 });
  }

  async confirm(options = {}) {
    const confirmations = {
      english: ['Confirming now', 'Recording your entry', 'Saving transaction'],
      hindi: ['पुष्टि कर रहा हूँ', 'Entry दर्ज कर रहा हूँ', 'Transaction सहेज रहा हूँ'],
      hinglish: ['Confirm kar raha hoon', 'Entry darj kar raha hoon', 'Transaction save kar raha hoon']
    };
    
    const language = options.language || 'english';
    const response = confirmations[language][Math.floor(Math.random() * confirmations[language].length)];
    
    await this.speak(response, { rate: 0.9 });
  }

  async askForClarification(options = {}) {
    const questions = {
      english: [
        'Could you please repeat that?',
        'I didn\'t catch that. Can you say it again?',
        'Please speak a bit more clearly.'
      ],
      hindi: [
        'क्या आप दोहरा सकते हैं?',
        'समझ नहीं आया। कृपया फिर से बताएं।',
        'कृपया धीरे बोलें।'
      ],
      hinglish: [
        'Kya aap dohra sakte hain?',
        'Samajh nahi aaya. Kripya fir se batayein.',
        'Kripya dhire bolen.'
      ]
    };
    
    const language = options.language || 'english';
    const question = questions[language][Math.floor(Math.random() * questions[language].length)];
    
    await this.speak(question, { rate: 0.9 });
  }

  async announceError(error, options = {}) {
    const errorMessages = {
      english: [
        'I\'m sorry, there was an error.',
        'Something went wrong. Please try again.',
        'I couldn\'t process that. Let me try again.'
      ],
      hindi: [
        'मुझे खेद है, एक त्रुटि हुई।',
        'कुछ गलत हो गया। कृपया पुनः प्रयास करें।',
        'मैं उसको संसाधित नहीं कर सका।'
      ],
      hinglish: [
        'Mujhe khed hai, ek error hui.',
        'Kuch galat ho gaya. Kripya fir se try karein.',
        'Main usko process nahi kar saka.'
      ]
    };
    
    const language = options.language || 'english';
    const message = errorMessages[language][Math.floor(Math.random() * errorMessages[language].length)];
    
    await this.speak(message, { rate: 0.9 });
  }

  // Cleanup
  destroy() {
    this.stopListening();
    this.stopSpeaking();
    this.stopAudioMonitoring();
    this.onResult = null;
    this.onError = null;
    this.onStart = null;
    this.onEnd = null;
    this.onInterimResult = null;
    this.onAudioLevel = null;
  }
}

// Export singleton instance
export const voiceManager = new VoiceManager();

// Export class for testing
export default VoiceManager;
