// Voice Manager Service for Text-to-Speech and Speech Recognition
// Handles voice interactions for the Talk to Your Accounts application

class VoiceManager {
  constructor() {
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.voices = [];
    this.isListening = false;
    this.onResult = null;
    this.onError = null;
    
    this.initVoices();
    this.initRecognition();
  }

  initVoices() {
    if (this.synthesis) {
      this.voices = this.synthesis.getVoices();
      if (this.voices.length === 0) {
        this.synthesis.onvoiceschanged = () => {
          this.voices = this.synthesis.getVoices();
        };
      }
    }
  }

  initRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-IN';
      
      this.recognition.onstart = () => {
        this.isListening = true;
      };
      
      this.recognition.onend = () => {
        this.isListening = false;
      };
      
      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (this.onResult) {
          this.onResult(transcript);
        }
      };
      
      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
        if (this.onError) {
          this.onError(event.error);
        }
      };
    }
  }

  async listen() {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }
      
      this.onResult = (transcript) => {
        this.onResult = null;
        resolve(transcript);
      };
      
      this.onError = (error) => {
        this.onResult = null;
        this.onError = null;
        reject(new Error(error));
      };
      
      try {
        this.recognition.start();
      } catch (error) {
        reject(error);
      }
    });
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  speak(text, onEnd) {
    if (!this.synthesis) {
      console.warn('Speech synthesis not supported');
      if (onEnd) onEnd();
      return;
    }

    // Cancel any ongoing speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Select Hindi voice if text contains Hindi/Hinglish
    const hasHindi = /[\u0900-\u097F]/.test(text);
    if (hasHindi) {
      const hindiVoice = this.voices.find(v => 
        v.lang.startsWith('hi') || v.lang.includes('Hindi')
      );
      if (hindiVoice) {
        utterance.voice = hindiVoice;
      }
      utterance.lang = 'hi-IN';
    } else {
      utterance.lang = 'en-IN';
    }

    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      if (onEnd) onEnd();
    };

    this.synthesis.speak(utterance);
  }

  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  getListeningStatus() {
    return this.isListening;
  }

  isSupported() {
    return !!(this.recognition || ('webkitSpeechRecognition' in window)) && 
           !!this.synthesis;
  }
}

export const voiceManager = new VoiceManager();
