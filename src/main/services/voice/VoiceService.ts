// Voice Service - Main orchestrator for the Voice Module
// Integrates AudioRecorder and Transcriber for complete voice recognition workflow

import { EventEmitter } from 'events';
import {
  VoiceStatus,
  VoiceSettings,
  TranscriptionResult,
  ParsedVoiceCommand,
  VoiceState,
  VOICE_CHANNELS
} from '../../shared/types/voice';
import { audioRecorder } from './AudioRecorder';
import { transcriber } from './Transcriber';
import { dictionaryService } from '../dictionary/DictionaryService';

export interface VoiceServiceConfig {
  autoSend: boolean;
  confirmCommands: boolean;
  hapticFeedback: boolean;
  visualFeedback: boolean;
}

export class VoiceService extends EventEmitter {
  private settings: VoiceSettings;
  private config: VoiceServiceConfig;
  private state: VoiceState;
  private commandHistory: ParsedVoiceCommand[];
  private maxHistorySize: number;

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

    this.config = {
      autoSend: false,
      confirmCommands: true,
      hapticFeedback: true,
      visualFeedback: true
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

    this.setupEventListeners();
  }

  async initialize(): Promise<void> {
    try {
      // Initialize all services
      await Promise.all([
        audioRecorder.initialize(),
        transcriber.initialize(),
        dictionaryService.initialize()
      ]);

      this.loadSettings();
      this.loadHistory();

      this.state.status = 'IDLE';
      this.emit('initialized');
      console.log('[VoiceService] Initialized successfully');
    } catch (error) {
      console.error('[VoiceService] Initialization failed:', error);
      this.state.status = 'ERROR';
      throw error;
    }
  }

  private setupEventListeners(): void {
    // Forward events from AudioRecorder
    audioRecorder.on('audioData', (data) => {
      this.emit('audioData', data);
    });

    audioRecorder.on('audioLevel', (data) => {
      this.emit('audioLevel', data);
    });

    audioRecorder.on('listeningStarted', (data) => {
      this.state.isListening = true;
      this.state.status = 'LISTENING';
      this.emit('listeningStarted', data);
    });

    audioRecorder.on('listeningStopped', async (data) => {
      this.state.isListening = false;
      
      if (data.audioData && data.audioData.length > 0) {
        // Automatically transcribe when recording stops
        await this.processAudio(data.audioData);
      } else {
        this.state.status = 'IDLE';
      }
    });

    // Forward events from Transcriber
    transcriber.on('partialTranscription', (result) => {
      this.state.partialTranscript = result.text;
      this.emit('partialTranscription', result);
    });

    transcriber.on('transcriptionComplete', (result) => {
      this.state.transcript = result.text;
      this.state.status = 'IDLE';
      this.emit('transcriptionComplete', result);
    });

    transcriber.on('commandParsed', (command) => {
      this.handleCommand(command);
    });

    transcriber.on('error', (error) => {
      this.state.status = 'ERROR';
      this.emit('error', error);
    });

    transcriber.on('modelChanged', (model) => {
      this.emit('modelChanged', model);
    });
  }

  private async processAudio(audioData: Float32Array): Promise<void> {
    try {
      this.state.status = 'PROCESSING';
      
      const result = await transcriber.transcribe(audioData);
      
      if (result.text && result.text.trim().length > 0) {
        // Parse command from transcription
        const command = transcriber.parseCommand(result.text);
        
        if (command) {
          this.state.lastCommand = command;
          this.addToHistory(command);
          
          if (this.config.confirmCommands) {
            // Emit for user confirmation
            this.emit('commandReady', command);
          } else {
            // Auto-execute command
            this.executeCommand(command);
          }
        }
      }
    } catch (error) {
      console.error('[VoiceService] Audio processing failed:', error);
      this.state.status = 'ERROR';
    }
  }

  private handleCommand(command: ParsedVoiceCommand): void {
    this.state.lastCommand = command;
    this.addToHistory(command);
    this.emit('commandParsed', command);
  }

  private async executeCommand(command: ParsedVoiceCommand): Promise<void> {
    console.log('[VoiceService] Executing command:', command.intent, command.rawText);
    
    // Emit command for the main process to handle
    this.emit('executeCommand', command);

    // Send to renderer for UI updates
    this.broadcastCommand(command);
  }

  private broadcastCommand(command: ParsedVoiceCommand): void {
    // This will be called from the IPC handler
    this.emit('commandReady', command);
  }

  private addToHistory(command: ParsedVoiceCommand): void {
    this.commandHistory.unshift(command);
    
    // Keep history bounded
    if (this.commandHistory.length > this.maxHistorySize) {
      this.commandHistory = this.commandHistory.slice(0, this.maxHistorySize);
    }

    this.saveHistory();
    this.emit('historyUpdated', this.commandHistory);
  }

  // Public API methods
  async startListening(): Promise<void> {
    if (!this.settings.enabled) {
      console.warn('[VoiceService] Voice recognition is disabled');
      return;
    }

    if (this.state.isListening) {
      console.warn('[VoiceService] Already listening');
      return;
    }

    try {
      await audioRecorder.startListening();
    } catch (error) {
      console.error('[VoiceService] Failed to start listening:', error);
      this.state.status = 'ERROR';
      throw error;
    }
  }

  async stopListening(): Promise<ParsedVoiceCommand | null> {
    if (!this.state.isListening) {
      return null;
    }

    const audioData = await audioRecorder.stopListening();
    
    if (audioData && audioData.length > 0) {
      await this.processAudio(audioData);
      return this.state.lastCommand;
    }

    return null;
  }

  async toggleListening(): Promise<VoiceState> {
    if (this.state.isListening) {
      await this.stopListening();
    } else {
      await this.startListening();
    }
    return this.getState();
  }

  getState(): VoiceState {
    return {
      ...this.state,
      settings: this.settings
    };
  }

  getStatus(): VoiceStatus {
    return this.state.status;
  }

  getTranscript(): string {
    return this.state.transcript;
  }

  getPartialTranscript(): string {
    return transcriber.getPartialTranscript();
  }

  getCommandHistory(): ParsedVoiceCommand[] {
    return [...this.commandHistory];
  }

  getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  updateSettings(updates: Partial<VoiceSettings>): void {
    this.settings = { ...this.settings, ...updates };
    this.saveSettings();
    this.emit('settingsChanged', this.settings);
  }

  updateConfig(updates: Partial<VoiceServiceConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // Dictionary management
  async getDictionaryTerms() {
    return dictionaryService.getAllTerms();
  }

  async addDictionaryTerm(spoken: string, mapped: string, category: string) {
    return dictionaryService.addTerm(spoken, mapped, category);
  }

  async removeDictionaryTerm(id: string) {
    return dictionaryService.removeTerm(id);
  }

  async updateDictionaryTerm(id: string, updates: any) {
    return dictionaryService.updateTerm(id, updates);
  }

  async searchDictionaryTerms(query: string) {
    return dictionaryService.searchTerms(query);
  }

  // Model management
  getSupportedModels() {
    return transcriber.getSupportedModels();
  }

  async setModel(modelId: string) {
    await transcriber.setModel(modelId);
  }

  async downloadModel(modelId: string, progressCallback?: (progress: number) => void) {
    await transcriber.downloadModel(modelId, progressCallback);
  }

  setLanguage(language: string) {
    transcriber.setLanguage(language);
    this.settings.language = language;
    this.saveSettings();
  }

  // History management
  private loadHistory(): void {
    try {
      const historyPath = path.join(process.cwd(), 'data', 'voice_history.json');
      if (fs.existsSync(historyPath)) {
        const data = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
        this.commandHistory = data.map((cmd: any) => ({
          ...cmd,
          timestamp: new Date(cmd.timestamp)
        }));
      }
    } catch (error) {
      console.warn('[VoiceService] Failed to load history:', error);
    }
  }

  private saveHistory(): void {
    try {
      const historyPath = path.join(process.cwd(), 'data', 'voice_history.json');
      const historyDir = path.dirname(historyPath);
      
      if (!fs.existsSync(historyDir)) {
        fs.mkdirSync(historyDir, { recursive: true });
      }
      
      fs.writeFileSync(historyPath, JSON.stringify(this.commandHistory));
    } catch (error) {
      console.warn('[VoiceService] Failed to save history:', error);
    }
  }

  clearHistory(): void {
    this.commandHistory = [];
    this.saveHistory();
    this.emit('historyUpdated', []);
  }

  // Settings persistence
  private loadSettings(): void {
    try {
      const settingsPath = path.join(process.cwd(), 'data', 'voice_settings.json');
      if (fs.existsSync(settingsPath)) {
        const data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        this.settings = { ...this.settings, ...data };
      }
    } catch (error) {
      console.warn('[VoiceService] Failed to load settings:', error);
    }
  }

  private saveSettings(): void {
    try {
      const settingsPath = path.join(process.cwd(), 'data', 'voice_settings.json');
      const settingsDir = path.dirname(settingsPath);
      
      if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true });
      }
      
      fs.writeFileSync(settingsPath, JSON.stringify(this.settings));
    } catch (error) {
      console.warn('[VoiceService] Failed to save settings:', error);
    }
  }

  // Utility methods
  getAudioLevel(): number {
    return audioRecorder.getAudioLevel();
  }

  async confirmAndExecute(command: ParsedVoiceCommand): Promise<void> {
    await this.executeCommand(command);
  }

  async retryLastCommand(): Promise<void> {
    const lastCommand = this.commandHistory[0];
    if (lastCommand) {
      await this.executeCommand(lastCommand);
    }
  }

  setEnabled(enabled: boolean): void {
    this.settings.enabled = enabled;
    this.saveSettings();
    
    if (!enabled && this.state.isListening) {
      this.stopListening();
    }
    
    this.emit('enabledChanged', enabled);
  }

  isEnabled(): boolean {
    return this.settings.enabled;
  }

  isListening(): boolean {
    return this.state.isListening;
  }

  // Cleanup
  async cleanup(): Promise<void> {
    await audioRecorder.cleanup();
    await transcriber.cleanup();
    dictionaryService.close();
    
    this.state.status = 'IDLE';
    this.state.isListening = false;
    
    console.log('[VoiceService] Cleaned up');
  }
}

import path from 'path';
import fs from 'fs';

export const voiceService = new VoiceService();
