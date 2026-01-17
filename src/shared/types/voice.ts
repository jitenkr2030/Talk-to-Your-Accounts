// Shared Types for Voice Module
// Used by both Main Process and Renderer

export type VoiceStatus = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'ERROR';

export type VoiceIntent = 
  | 'ADD_TRANSACTION'
  | 'ADD_EXPENSE'
  | 'ADD_INCOME'
  | 'ADD_PARTY'
  | 'ADD_PRODUCT'
  | 'GENERATE_REPORT'
  | 'QUERY_BALANCE'
  | 'NAVIGATE'
  | 'UNKNOWN';

export interface VoiceEntity {
  type: 'AMOUNT' | 'DESCRIPTION' | 'PARTY' | 'PRODUCT' | 'DATE' | 'CATEGORY';
  value: string | number;
  confidence: number;
}

export interface ParsedVoiceCommand {
  rawText: string;
  intent: VoiceIntent;
  entities: VoiceEntity[];
  confidence: number;
  timestamp: Date;
}

export interface VoiceSettings {
  enabled: boolean;
  language: string;
  hotkey: string;
  autoPunctuation: boolean;
  partialResults: boolean;
  noiseThreshold: number;
}

export interface DictionaryTerm {
  id: string;
  spoken: string;      // What user says (e.g., "Micky D's")
  mapped: string;      // What it maps to (e.g., "McDonalds")
  category: string;    // e.g., "Food & Dining"
  isActive: boolean;
  createdAt: Date;
}

export interface DictionaryCategory {
  id: string;
  name: string;
  terms: DictionaryTerm[];
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  timestamp: Date;
}

export interface ModelInfo {
  id: string;
  name: string;
  size: string;        // e.g., "40 MB"
  languages: string[];
  accuracy: string;    // e.g., "94%"
  localPath?: string;
  isDownloaded: boolean;
}

export interface VoiceState {
  status: VoiceStatus;
  transcript: string;
  partialTranscript: string;
  lastCommand: ParsedVoiceCommand | null;
  isListening: boolean;
  settings: VoiceSettings;
}

// IPC Channel Types
export const VOICE_CHANNELS = {
  START_LISTENING: 'voice:start',
  STOP_LISTENING: 'voice:stop',
  GET_STATUS: 'voice:status',
  GET_DICTIONARY: 'voice:dictionary',
  ADD_TERM: 'voice:add-term',
  REMOVE_TERM: 'voice:remove-term',
  GET_SETTINGS: 'voice:get-settings',
  SAVE_SETTINGS: 'voice:save-settings',
  DOWNLOAD_MODEL: 'voice:download-model',
  GET_MODELS: 'voice:get-models',
  TRANSCRIPT: 'voice:transcript',
  COMMAND: 'voice:command',
  ERROR: 'voice:error',
} as const;
