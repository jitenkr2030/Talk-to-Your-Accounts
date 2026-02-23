/**
 * Voice Service - Advanced Voice Features Module
 * Handles multi-language voice recognition, code-mixed commands, and accent adaptation
 */

const fs = require('fs');
const path = require('path');

// Database path for voice settings
const getDbPath = () => {
  const userDataPath = process.env.APPDATA || process.env.HOME || '.';
  return path.join(userDataPath, 'Talk-to-Your-Accounts', 'voice_data.json');
};

// Initialize database structure
const initializeDatabase = () => {
  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  if (!fs.existsSync(dbPath)) {
    const initialData = getDefaultVoiceData();
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
  }
  
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
};

// Get default voice data
const getDefaultVoiceData = () => ({
  settings: {
    primaryLanguage: 'en-IN',
    secondaryLanguage: 'hi-IN',
    codeMixingEnabled: true,
    accentAdaptation: true,
    autoLanguageDetection: true,
    hotkey: 'CommandOrControl+Shift+V',
    audioLevelThreshold: 0.02,
    continuousListening: false,
    punctuationEnabled: true
  },
  supportedLanguages: [
    { code: 'en-IN', name: 'English (India)', script: 'Latin', enabled: true },
    { code: 'hi-IN', name: 'Hindi', script: 'Devanagari', enabled: true },
    { code: 'ta-IN', name: 'Tamil', script: 'Tamil', enabled: true },
    { code: 'te-IN', name: 'Telugu', script: 'Telugu', enabled: true },
    { code: 'mr-IN', name: 'Marathi', script: 'Devanagari', enabled: true },
    { code: 'bn-IN', name: 'Bengali', script: 'Bengali', enabled: true },
    { code: 'gu-IN', name: 'Gujarati', script: 'Gujarati', enabled: true },
    { code: 'kn-IN', name: 'Kannada', script: 'Kannada', enabled: true },
    { code: 'ml-IN', name: 'Malayalam', script: 'Malayalam', enabled: true }
  ],
  accentProfiles: {},
  commandMappings: getDefaultCommandMappings(),
  transcriptionHistory: [],
  customPhrases: []
});

// Get default command mappings for code-mixed commands
const getDefaultCommandMappings = () => [
  // Hindi-English (Hinglish) mappings
  { pattern: 'create.*invoice|invoice.*banao|invoice.*banaye', command: 'CREATE_INVOICE', language: 'hinglish' },
  { pattern: 'show.*balance|balance.*kya.*hai|kitna.*paisa', command: 'SHOW_BALANCE', language: 'hinglish' },
  { pattern: 'add.*party|party.*add.*karo|party.*create.*karo', command: 'ADD_PARTY', language: 'hinglish' },
  { pattern: 'create.*expense|expense.*add.*karo|kharcha.*kar', command: 'CREATE_EXPENSE', language: 'hinglish' },
  { pattern: 'show.*report|report.*dikhao|report.*show.*karo', command: 'SHOW_REPORT', language: 'hinglish' },
  { pattern: 'gst.*return|gst.*file.*karo|gst.*submit', command: 'GST_RETURN', language: 'hinglish' },
  { pattern: 'eway.*bill|eway.*generate.*karo|eway.*create', command: 'EWAY_BILL', language: 'hinglish' },
  { pattern: 'payment.*receive|payment.*lish.*karo|paise.*lesh', command: 'RECEIVE_PAYMENT', language: 'hinglish' },
  { pattern: 'stock.*check|inventory.*dekho|stock.*kitna', command: 'CHECK_STOCK', language: 'hinglish' },
  { pattern: 'purchase.*order|order.*purchase.*karo|buy.*order', command: 'CREATE_PURCHASE', language: 'hinglish' },
  
  // Tamil-English (Tanglish) mappings
  { pattern: 'create.*invoice|invoice.*pannu', command: 'CREATE_INVOICE', language: 'tanglish' },
  { pattern: 'show.*balance|balance.*enna', command: 'SHOW_BALANCE', language: 'tanglish' },
  { pattern: 'add.*customer|customer.*add.*pannu', command: 'ADD_PARTY', language: 'tanglish' },
  
  // Telugu-English mappings
  { pattern: 'create.*invoice|invoice.*cheyyandi', command: 'CREATE_INVOICE', language: 'teluglish' },
  { pattern: 'show.*balance|balance.*emiti', command: 'SHOW_BALANCE', language: 'teluglish' },
  
  // English commands
  { pattern: 'create.*invoice', command: 'CREATE_INVOICE', language: 'en' },
  { pattern: 'show.*balance', command: 'SHOW_BALANCE', language: 'en' },
  { pattern: 'add.*customer', command: 'ADD_PARTY', language: 'en' },
  { pattern: 'add.*expense', command: 'CREATE_EXPENSE', language: 'en' },
  { pattern: 'show.*report', command: 'SHOW_REPORT', language: 'en' },
  { pattern: 'file.*gst.*return', command: 'GST_RETURN', language: 'en' },
  { pattern: 'generate.*eway.*bill', command: 'EWAY_BILL', language: 'en' },
  { pattern: 'receive.*payment', command: 'RECEIVE_PAYMENT', language: 'en' },
  { pattern: 'check.*stock', command: 'CHECK_STOCK', language: 'en' },
  { pattern: 'create.*purchase.*order', command: 'CREATE_PURCHASE', language: 'en' },
  { pattern: 'go.*to.*dashboard', command: 'NAVIGATE_DASHBOARD', language: 'en' },
  { pattern: 'go.*to.*invoices', command: 'NAVIGATE_INVOICES', language: 'en' },
  { pattern: 'go.*to.*expenses', command: 'NAVIGATE_EXPENSES', language: 'en' },
  { pattern: 'go.*to.*inventory', command: 'NAVIGATE_INVENTORY', language: 'en' }
]);

// Save data to database
const saveData = (data) => {
  const dbPath = getDbPath();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

// Get voice settings
const getSettings = () => {
  const data = initializeDatabase();
  return data.settings;
};

// Update voice settings
const updateSettings = (newSettings) => {
  const data = initializeDatabase();
  data.settings = { ...data.settings, ...newSettings };
  saveData(data);
  return data.settings;
};

// Get supported languages
const getSupportedLanguages = () => {
  const data = initializeDatabase();
  return data.supportedLanguages;
};

// Enable/disable language
const setLanguageEnabled = (languageCode, enabled) => {
  const data = initializeDatabase();
  const lang = data.supportedLanguages.find(l => l.code === languageCode);
  if (lang) {
    lang.enabled = enabled;
    saveData(data);
    return data.supportedLanguages;
  }
  throw new Error(`Language ${languageCode} not found`);
};

// Get accent profiles
const getAccentProfiles = () => {
  const data = initializeDatabase();
  return data.accentProfiles;
};

// Save accent profile
const saveAccentProfile = (userId, profileData) => {
  const data = initializeDatabase();
  data.accentProfiles[userId] = {
    ...profileData,
    lastUpdated: new Date().toISOString()
  };
  saveData(data);
  return data.accentProfiles[userId];
};

// Get accent profile for user
const getAccentProfile = (userId) => {
  const data = initializeDatabase();
  return data.accentProfiles[userId] || null;
};

// Process voice command with language detection and code-mixing
const processCommand = (transcript, context = {}) => {
  const data = initializeDatabase();
  const result = {
    originalTranscript: transcript,
    detectedLanguage: 'en',
    confidence: 0,
    command: null,
    entities: {},
    processedText: transcript,
    isCodeMixed: false
  };
  
  // Detect language and code-mixing
  const languageAnalysis = analyzeLanguage(transcript, data.settings);
  result.detectedLanguage = languageAnalysis.detectedLanguage;
  result.isCodeMixed = languageAnalysis.isCodeMixed;
  result.confidence = languageAnalysis.confidence;
  
  // Normalize code-mixed text
  if (result.isCodeMixed) {
    result.processedText = normalizeCodeMixedText(transcript, result.detectedLanguage);
  }
  
  // Extract command from mappings
  const commandMatch = matchCommand(result.processedText, data.commandMappings);
  if (commandMatch) {
    result.command = commandMatch.command;
    result.entities = extractEntities(result.processedText, commandMatch.command);
  }
  
  // Add to history
  data.transcriptionHistory.unshift({
    ...result,
    timestamp: new Date().toISOString(),
    context
  });
  
  // Keep only last 100 transcriptions
  if (data.transcriptionHistory.length > 100) {
    data.transcriptionHistory = data.transcriptionHistory.slice(0, 100);
  }
  
  saveData(data);
  
  return result;
};

// Analyze language of transcript
const analyzeLanguage = (transcript, settings) => {
  const result = {
    detectedLanguage: 'en-IN',
    isCodeMixed: false,
    confidence: 0.9
  };
  
  // Hindi indicators (Devanagari script + common words)
  const hindiIndicators = /[\u0900-\u097F]|ji|hai|kya|ko|se|ka|ki|ke|banao|kar|dikhao|paisa/i;
  // Tamil indicators
  const tamilIndicators = /[\u0B80-\u0BFF]|enna|va|pa|ng|la|nga/i;
  // Telugu indicators
  const teluguIndicators = /[\u0C00-\u0C7F]|emi|cheyyandi|vundi|kaani/i;
  // Bengali indicators
  const bengaliIndicators = /[\u0980-\u09FF]|ki|kono|er|ke|ache/i;
  // Gujarati indicators
  const gujaratiIndicators = /[\u0A80-\u0AFF]|neh|ke|ma|thi|banai/i;
  // Marathi indicators
  const marathiIndicators = /[\u0900-\u097F]|ahes|ka|che|mhanun|i";
  // Kannada indicators
  const kannadaIndicators = /[\u0C80-\u0CFF]|enu|illa|bidide| hogi/i;
  // Malayalam indicators
  const malayalamIndicators = /[\u0D00-\u0D7F]|enn|alla|aan|een/;
  
  const indicators = {
    'hi-IN': hindiIndicators,
    'ta-IN': tamilIndicators,
    'te-IN': teluguIndicators,
    'bn-IN': bengaliIndicators,
    'gu-IN': gujaratiIndicators,
    'mr-IN': marathiIndicators,
    'kn-IN': kannadaIndicators,
    'ml-IN': malayalamIndicators
  };
  
  // Check for code-mixing (mixed scripts)
  let scriptCount = 0;
  if (/[\u0900-\u097F]/.test(transcript)) scriptCount++; // Devanagari
  if (/[\u0B80-\u0BFF]/.test(transcript)) scriptCount++; // Tamil
  if (/[\u0C00-\u0C7F]/.test(transcript)) scriptCount++; // Telugu
  if (/[\u0980-\u09FF]/.test(transcript)) scriptCount++; // Bengali
  if (/[\u0A80-\u0AFF]/.test(transcript)) scriptCount++; // Gujarati
  if (/[\u0C80-\u0CFF]/.test(transcript)) scriptCount++; // Kannada
  if (/[\u0D00-\u0D7F]/.test(transcript)) scriptCount++; // Malayalam
  if (/[a-zA-Z]/.test(transcript)) scriptCount++; // Latin
  
  result.isCodeMixed = scriptCount > 1;
  
  // Detect primary language
  for (const [langCode, pattern] of Object.entries(indicators)) {
    if (pattern.test(transcript)) {
      result.detectedLanguage = langCode;
      result.confidence = 0.85;
      break;
    }
  }
  
  // If no regional language detected, default to English
  if (!Object.keys(indicators).includes(result.detectedLanguage)) {
    result.detectedLanguage = 'en-IN';
    result.confidence = 0.95;
  }
  
  return result;
};

// Normalize code-mixed text
const normalizeCodeMixedText = (transcript, primaryLanguage) => {
  let normalized = transcript;
  
  // Common Hinglish normalizations
  const hinglishReplacements = [
    { pattern: /paisa(s)?/gi, replacement: 'rupees' },
    { pattern: /rupiya/gi, replacement: 'rupees' },
    { pattern: /lakh/gi, replacement: '00000' },
    { pattern: /crore/gi, replacement: '0000000' },
    { pattern: /kar(o|y|na)?/gi, replacement: 'create' },
    { pattern: /banao/gi, replacement: 'create' },
    { pattern: /dikhao/gi, replacement: 'show' },
    { pattern: /dekho/gi, replacement: 'show' },
    { pattern: /kya/gi, replacement: 'what' },
    { pattern: /kitna/gi, replacement: 'how much' },
    { pattern: /hai/gi, replacement: 'is' },
    { pattern: /ke liye/gi, replacement: 'for' },
    { pattern: /add/gi, replacement: 'add' },
    { pattern: /invoice/gi, replacement: 'invoice' },
    { pattern: /bill/gi, replacement: 'invoice' }
  ];
  
  for (const { pattern, replacement } of hinglishReplacements) {
    normalized = normalized.replace(pattern, replacement);
  }
  
  return normalized;
};

// Match command from transcript
const matchCommand = (transcript, mappings) => {
  const lowerTranscript = transcript.toLowerCase();
  
  for (const mapping of mappings) {
    const regex = new RegExp(mapping.pattern, 'i');
    if (regex.test(lowerTranscript)) {
      return mapping;
    }
  }
  
  return null;
};

// Extract entities from transcript
const extractEntities = (transcript, command) => {
  const entities = {};
  
  // Extract amount
  const amountMatch = transcript.match(/(?:rs\.?|rupees?|₹|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i);
  if (amountMatch) {
    entities.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }
  
  // Extract date
  const dateMatch = transcript.match(/(?:today|yesterday|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
  if (dateMatch) {
    entities.date = dateMatch[0];
  }
  
  // Extract party name (typically appears after specific phrases)
  const partyMatch = transcript.match(/(?:for|to|party|company|customer|vendor)\s+([a-zA-Z0-9\s]+?)(?:\s+ka|\s+ki|\s+ke|$)/i);
  if (partyMatch) {
    entities.partyName = partyMatch[1].trim();
  }
  
  // Extract GSTIN
  const gstinMatch = transcript.match(/[0-9]{2}[A-Z]{3}[C,P,F,H,J,A,B]{1}[A-Z]{1}[0-9]{4}[A-Z]{1}[1-9]{1}/i);
  if (gstinMatch) {
    entities.gstin = gstinMatch[0];
  }
  
  return entities;
};

// Get transcription history
const getTranscriptionHistory = (limit = 50) => {
  const data = initializeDatabase();
  return data.transcriptionHistory.slice(0, limit);
};

// Clear transcription history
const clearTranscriptionHistory = () => {
  const data = initializeDatabase();
  data.transcriptionHistory = [];
  saveData(data);
  return { success: true };
};

// Get custom phrases
const getCustomPhrases = () => {
  const data = initializeDatabase();
  return data.customPhrases;
};

// Add custom phrase
const addCustomPhrase = (phrase, command, language = 'en') => {
  const data = initializeDatabase();
  data.customPhrases.push({
    phrase,
    command,
    language,
    addedAt: new Date().toISOString()
  });
  
  // Add to command mappings
  data.commandMappings.unshift({
    pattern: phrase.toLowerCase(),
    command,
    language,
    isCustom: true
  });
  
  saveData(data);
  return data.customPhrases;
};

// Remove custom phrase
const removeCustomPhrase = (index) => {
  const data = initializeDatabase();
  if (data.customPhrases[index]) {
    const removed = data.customPhrases.splice(index, 1)[0];
    
    // Remove from mappings
    const mappingIndex = data.commandMappings.findIndex(m => 
      m.pattern === removed.phrase.toLowerCase() && m.isCustom
    );
    if (mappingIndex > -1) {
      data.commandMappings.splice(mappingIndex, 1);
    }
    
    saveData(data);
  }
  return data.customPhrases;
};

// Simulate speech recognition (in production, integrate with actual STT service)
const recognizeSpeech = async (audioData, config = {}) => {
  // This is a placeholder for actual speech recognition
  // In production, integrate with:
  // - Azure Speech Services
  // - Google Cloud Speech-to-Text
  // - Whisper (OpenAI)
  // - Mozilla DeepSpeech
  
  const settings = getSettings();
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Return mock result based on language setting
  return {
    transcript: '',
    confidence: 0.95,
    language: settings.primaryLanguage,
    duration: 0,
    timestamp: new Date().toISOString()
  };
};

// Export functions
module.exports = {
  initializeDatabase,
  getSettings,
  updateSettings,
  getSupportedLanguages,
  setLanguageEnabled,
  getAccentProfiles,
  saveAccentProfile,
  getAccentProfile,
  processCommand,
  getTranscriptionHistory,
  clearTranscriptionHistory,
  getCustomPhrases,
  addCustomPhrase,
  removeCustomPhrase,
  recognizeSpeech
};
