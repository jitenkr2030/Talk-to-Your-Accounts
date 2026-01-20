// Services Index
// Export all service modules for easy importing

// Voice Services
const voiceServices = require('./voice/index.js');

// Dictionary Service
const { dictionaryService } = require('./voice/DictionaryService.js');

// Export all voice-related services
module.exports = {
  // Voice Module
  voiceService: voiceServices.voiceService,
  audioRecorder: voiceServices.audioRecorder,
  transcriber: voiceServices.transcriber,
  commandParser: voiceServices.commandParser,
  
  // Types (for reference)
  VoiceService: voiceServices.VoiceService,
  AudioRecorder: voiceServices.AudioRecorder,
  Transcriber: voiceServices.Transcriber,
  CommandParser: voiceServices.CommandParser,
  
  // Dictionary
  dictionaryService,
  
  // IPC Handlers
  ...require('./voice/VoiceIPCHandlers.js')
};
