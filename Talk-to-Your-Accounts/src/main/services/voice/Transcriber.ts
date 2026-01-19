// Transcriber Service - Handles speech-to-text transcription using local models
// Uses whisper.cpp or similar local speech recognition model for offline processing

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import {
  VoiceStatus,
  TranscriptionResult,
  ModelInfo,
  VoiceIntent,
  ParsedVoiceCommand,
  VoiceEntity
} from '../../shared/types/voice';
import { dictionaryService } from '../dictionary/DictionaryService';

export interface TranscriberConfig {
  modelPath: string;
  modelSize: string;
  language: string;
  threads: number;
  useGPU: boolean;
  temperature: number;
  beamSize: number;
}

export interface TranscriptionOptions {
  language?: string;
  enableLogger?: boolean;
  prompt?: string; // Context prompt from dictionary
  task?: 'transcribe' | 'translate';
}

export class Transcriber extends EventEmitter {
  private process: ChildProcess | null = null;
  private config: TranscriberConfig;
  private modelPath: string;
  private isTranscribing: boolean = false;
  private currentAudioPath: string | null = null;
  private modelsDirectory: string;
  private status: VoiceStatus = 'IDLE';
  private partialTranscript: string = '';
  private fullTranscript: string = '';
  private supportedModels: ModelInfo[] = [
    {
      id: 'tiny',
      name: 'Whisper Tiny',
      size: '40 MB',
      languages: ['en', 'hi', 'multi'],
      accuracy: '85%',
      isDownloaded: false
    },
    {
      id: 'base',
      name: 'Whisper Base',
      size: '74 MB',
      languages: ['en', 'hi', 'multi'],
      accuracy: '89%',
      isDownloaded: false
    },
    {
      id: 'small',
      name: 'Whisper Small',
      size: '244 MB',
      languages: ['en', 'hi', 'multi'],
      accuracy: '92%',
      isDownloaded: false
    },
    {
      id: 'medium',
      name: 'Whisper Medium',
      size: '769 MB',
      languages: ['en', 'hi', 'multi'],
      accuracy: '95%',
      isDownloaded: false
    }
  ];

  constructor() {
    super();
    this.modelsDirectory = path.join(process.cwd(), 'models', 'whisper');
    this.modelPath = path.join(this.modelsDirectory, 'ggml-base.bin');
    
    this.config = {
      modelPath: this.modelPath,
      modelSize: 'base',
      language: 'en',
      threads: 4,
      useGPU: false,
      temperature: 0.0,
      beamSize: 5
    };
  }

  async initialize(): Promise<void> {
    // Create models directory if it doesn't exist
    if (!fs.existsSync(this.modelsDirectory)) {
      fs.mkdirSync(this.modelsDirectory, { recursive: true });
    }

    // Check for existing models
    await this.checkLocalModels();
    
    // Load last used model config if available
    await this.loadConfig();

    console.log('[Transcriber] Initialized');
    this.emit('initialized');
  }

  private async checkLocalModels(): Promise<void> {
    for (const model of this.supportedModels) {
      const modelPath = path.join(this.modelsDirectory, `ggml-${model.id}.bin`);
      model.isDownloaded = fs.existsSync(modelPath);
      model.localPath = modelPath;
    }

    // Set current model path
    const currentModel = this.supportedModels.find(m => m.id === this.config.modelSize);
    if (currentModel && currentModel.isDownloaded) {
      this.modelPath = currentModel.localPath!;
    }
  }

  private async loadConfig(): Promise<void> {
    const configPath = path.join(process.cwd(), 'data', 'transcriber.json');
    if (fs.existsSync(configPath)) {
      try {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        this.config = { ...this.config, ...configData };
      } catch (error) {
        console.warn('[Transcriber] Failed to load config:', error);
      }
    }
  }

  private async saveConfig(): Promise<void> {
    const configPath = path.join(process.cwd(), 'data', 'transcriber.json');
    const configDir = path.dirname(configPath);
    
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
  }

  async transcribe(audioData: Float32Array): Promise<TranscriptionResult> {
    if (this.isTranscribing) {
      throw new Error('Transcription already in progress');
    }

    this.isTranscribing = true;
    this.status = 'PROCESSING';
    this.partialTranscript = '';
    this.fullTranscript = '';

    try {
      // Save audio to temporary file
      this.currentAudioPath = await this.saveTempAudio(audioData);
      
      // Get context prompt from dictionary
      const contextPrompt = await dictionaryService.getContextPrompt();
      
      // Transcribe using whisper.cpp
      const result = await this.runWhisper(this.currentAudioPath, {
        language: this.config.language,
        prompt: contextPrompt
      });

      this.fullTranscript = result.text;
      
      const transcriptionResult: TranscriptionResult = {
        text: result.text,
        confidence: result.confidence,
        isFinal: true,
        timestamp: new Date()
      };

      this.emit('transcriptionComplete', transcriptionResult);
      
      // Parse command from transcription
      const command = this.parseCommand(result.text);
      if (command) {
        this.emit('commandParsed', command);
      }

      return transcriptionResult;
    } catch (error) {
      console.error('[Transcriber] Transcription error:', error);
      this.status = 'ERROR';
      this.emit('error', error);
      throw error;
    } finally {
      this.isTranscribing = false;
      this.status = 'IDLE';
      
      // Cleanup temporary file
      if (this.currentAudioPath && fs.existsSync(this.currentAudioPath)) {
        fs.unlinkSync(this.currentAudioPath);
        this.currentAudioPath = null;
      }
    }
  }

  async transcribeStream(audioData: Float32Array): Promise<void> {
    // For streaming transcription, we'll use partial results
    this.status = 'PROCESSING';
    
    try {
      // Get context prompt
      const contextPrompt = await dictionaryService.getContextPrompt();
      
      // Run quick transcription for partial results
      const result = await this.runWhisperQuick(audioData, {
        language: this.config.language,
        prompt: contextPrompt
      });

      this.partialTranscript = result.text;
      
      const partialResult: TranscriptionResult = {
        text: result.text,
        confidence: result.confidence,
        isFinal: false,
        timestamp: new Date()
      };

      this.emit('partialTranscription', partialResult);
    } catch (error) {
      console.error('[Transcriber] Stream transcription error:', error);
    } finally {
      this.status = 'IDLE';
    }
  }

  private async runWhisper(
    audioPath: string, 
    options: TranscriptionOptions
  ): Promise<{ text: string; confidence: number }> {
    // Check if whisper CLI is available
    const whisperPath = await this.findWhisperExecutable();
    
    if (!whisperPath || !fs.existsSync(this.modelPath)) {
      // Fallback to mock transcription for demo
      return this.mockTranscribe(audioPath);
    }

    return new Promise((resolve, reject) => {
      const args = [
        '-m', this.modelPath,
        '-f', audioPath,
        '-l', options.language || this.config.language,
        '-t', String(this.config.threads),
        '--temperature', String(this.config.temperature),
        '--beam-size', String(this.config.beamSize),
        '--prompt', options.prompt || '',
        '-otxt', '-pp' // Output text with punctuation
      ];

      if (options.task === 'translate') {
        args.push('--translate');
      }

      console.log('[Transcriber] Running whisper with args:', args.join(' '));

      this.process = spawn(whisperPath, args);
      let output = '';
      let errorOutput = '';

      this.process.stdout?.on('data', (data) => {
        output += data.toString();
        console.log('[Transcriber] Output:', data.toString().trim());
      });

      this.process.stderr?.on('data', (data) => {
        errorOutput += data.toString();
        console.log('[Transcriber] Stderr:', data.toString().trim());
      });

      this.process.on('close', (code) => {
        if (code === 0) {
          const text = output.trim();
          const confidence = this.calculateConfidence(text);
          resolve({ text, confidence });
        } else {
          // Fallback to mock
          console.warn('[Transcriber] Whisper failed, using mock');
          resolve(this.mockTranscribe(audioPath));
        }
      });

      this.process.on('error', (error) => {
        console.error('[Transcriber] Process error:', error);
        resolve(this.mockTranscribe(audioPath));
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill();
          resolve(this.mockTranscribe(audioPath));
        }
      }, 30000);
    });
  }

  private async runWhisperQuick(
    audioData: Float32Array,
    options: TranscriptionOptions
  ): Promise<{ text: string; confidence: number }> {
    // Quick transcription for streaming - use smaller model or faster settings
    return this.mockTranscribeFromText('...'); // Placeholder for streaming
  }

  private mockTranscribe(audioPath: string): { text: string; confidence: number } {
    // Mock transcription for demo/testing when whisper is not available
    console.log('[Transcriber] Using mock transcription');
    return {
      text: '',
      confidence: 0
    };
  }

  private mockTranscribeFromText(partial: string): { text: string; confidence: number } {
    return {
      text: partial,
      confidence: 0.85
    };
  }

  private async findWhisperExecutable(): Promise<string | null> {
    // Look for whisper.cpp executable in common locations
    const possiblePaths = [
      path.join(process.cwd(), 'bin', 'whisper'),
      path.join(process.cwd(), 'whisper'),
      '/usr/local/bin/whisper',
      path.join(os.homedir(), '.local', 'bin', 'whisper'),
      path.join(process.resourcesPath, 'whisper', 'whisper')
    ];

    // Also check if using main bundle for Electron
    if (process.type === 'browser') {
      possiblePaths.unshift(
        path.join(process.resourcesPath, 'whisper-cli')
      );
    }

    for (const p of possiblePaths) {
      if (fs.existsSync(p) || fs.existsSync(p + '.exe')) {
        return p;
      }
    }

    // Try to find in PATH
    const pathEnv = process.env.PATH || '';
    const pathDirs = pathEnv.split(path.delimiter);
    
    for (const dir of pathDirs) {
      const fullPath = path.join(dir, 'whisper');
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    return null;
  }

  private async saveTempAudio(audioData: Float32Array): Promise<string> {
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempPath = path.join(tempDir, `audio_${Date.now()}.wav`);
    
    // Convert Float32Array to WAV format
    const wavBuffer = this.createWavBuffer(audioData);
    fs.writeFileSync(tempPath, wavBuffer);
    
    return tempPath;
  }

  private createWavBuffer(audioData: Float32Array): Buffer {
    const sampleRate = 16000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = audioData.length * 2; // 16-bit = 2 bytes
    const bufferSize = 44 + dataSize;

    const buffer = Buffer.alloc(bufferSize);
    let offset = 0;

    // RIFF header
    buffer.write('RIFF', offset); offset += 4;
    buffer.writeUInt32LE(bufferSize - 8, offset); offset += 4;
    buffer.write('WAVE', offset); offset += 4;

    // fmt chunk
    buffer.write('fmt ', offset); offset += 4;
    buffer.writeUInt32LE(16, offset); offset += 4;
    buffer.writeUInt16LE(1, offset); offset += 2;
    buffer.writeUInt16LE(numChannels, offset); offset += 2;
    buffer.writeUInt32LE(sampleRate, offset); offset += 4;
    buffer.writeUInt32LE(byteRate, offset); offset += 4;
    buffer.writeUInt16LE(blockAlign, offset); offset += 2;
    buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;

    // data chunk
    buffer.write('data', offset); offset += 4;
    buffer.writeUInt32LE(dataSize, offset); offset += 4;

    // Write audio samples
    for (let i = 0; i < audioData.length; i++) {
      const sample = Math.max(-1, Math.min(1, audioData[i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      buffer.writeInt16LE(Math.floor(intSample), offset);
      offset += 2;
    }

    return buffer;
  }

  private calculateConfidence(text: string): number {
    if (!text || text.length === 0) return 0;
    
    // Simple confidence calculation based on text characteristics
    let confidence = 0.5; // Base confidence

    // Increase confidence for longer, well-formed sentences
    if (text.length > 10) confidence += 0.1;
    if (text.length > 30) confidence += 0.1;
    if (text.length > 50) confidence += 0.1;

    // Increase confidence for sentences with proper capitalization
    if (text[0] === text[0].toUpperCase()) confidence += 0.05;

    // Increase confidence for sentences ending with punctuation
    if (/[.!?]$/.test(text)) confidence += 0.05;

    // Decrease confidence for very short or unclear transcriptions
    if (text.length < 5) confidence -= 0.1;

    return Math.max(0, Math.min(1, confidence));
  }

  private parseCommand(text: string): ParsedVoiceCommand | null {
    if (!text || text.trim().length === 0) return null;

    const normalizedText = text.toLowerCase().trim();
    const intent = this.detectIntent(normalizedText);
    const entities = this.extractEntities(normalizedText);

    return {
      rawText: text,
      intent,
      entities,
      confidence: this.calculateConfidence(text),
      timestamp: new Date()
    };
  }

  private detectIntent(text: string): VoiceIntent {
    // Intent detection based on keywords
    const patterns: { regex: RegExp; intent: VoiceIntent }[] = [
      { regex: /add.*(expense|spend|purchase|paid)/i, intent: 'ADD_EXPENSE' },
      { regex: /add.*(income|earn|received|salary)/i, intent: 'ADD_INCOME' },
      { regex: /add.*(transaction|entry)/i, intent: 'ADD_TRANSACTION' },
      { regex: /add.*(party|customer|client|vendor)/i, intent: 'ADD_PARTY' },
      { regex: /add.*(product|item|inventory)/i, intent: 'ADD_PRODUCT' },
      { regex: /show.*(report|summary|statement)/i, intent: 'GENERATE_REPORT' },
      { regex: /what.*(balance|cash|money)/i, intent: 'QUERY_BALANCE' },
      { regex: /go.*(to|navigate|open).*(dashboard|transactions|accounts)/i, intent: 'NAVIGATE' }
    ];

    for (const { regex, intent } of patterns) {
      if (regex.test(text)) {
        return intent;
      }
    }

    return 'UNKNOWN';
  }

  private extractEntities(text: string): VoiceEntity[] {
    const entities: VoiceEntity[] = [];

    // Extract amount
    const amountMatch = text.match(/[\d,]+(\.\d{2})?/);
    if (amountMatch) {
      entities.push({
        type: 'AMOUNT',
        value: parseFloat(amountMatch[0].replace(/,/g, '')),
        confidence: 0.9
      });
    }

    // Extract date (simple patterns)
    const datePatterns = [
      /(today|yesterday|tomorrow)/i,
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
      /(\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})/i
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        entities.push({
          type: 'DATE',
          value: match[0],
          confidence: 0.85
        });
        break;
      }
    }

    // Extract description (text between keywords)
    const descPatterns = [
      /for\s+([a-zA-Z\s]+?)(?:\s+on|\s+of|\s*$)/i,
      /spent.*?on\s+([a-zA-Z\s]+?)(?:\s+for|\s+at|\s*$)/i,
      /on\s+([a-zA-Z\s]+?)(?:\s+amount|\s+ rupees|\s*$)/i
    ];

    for (const pattern of descPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        entities.push({
          type: 'DESCRIPTION',
          value: match[1].trim(),
          confidence: 0.7
        });
        break;
      }
    }

    // Try to match dictionary terms for parties/products
    const termMap = dictionaryService.getTermMapSync();
    for (const [spoken, mapped] of termMap) {
      if (text.includes(spoken)) {
        if (mapped.match(/^(McDonald|Amazon|Starbucks|Flipkart)/i)) {
          entities.push({
            type: 'PARTY',
            value: mapped,
            confidence: 0.9
          });
        } else if (mapped.match(/^(GST|TDS|P&L|EBITDA)/i)) {
          entities.push({
            type: 'CATEGORY',
            value: mapped,
            confidence: 0.9
          });
        }
      }
    }

    return entities;
  }

  getStatus(): VoiceStatus {
    return this.status;
  }

  getPartialTranscript(): string {
    return this.partialTranscript;
  }

  getFullTranscript(): string {
    return this.fullTranscript;
  }

  isProcessing(): boolean {
    return this.isTranscribing;
  }

  getSupportedModels(): ModelInfo[] {
    return [...this.supportedModels];
  }

  async setModel(modelId: string): Promise<void> {
    const model = this.supportedModels.find(m => m.id === modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    this.config.modelSize = modelId;
    this.modelPath = model.localPath || path.join(this.modelsDirectory, `ggml-${modelId}.bin`);
    
    await this.saveConfig();
    
    this.emit('modelChanged', model);
    console.log(`[Transcriber] Model changed to ${model.name}`);
  }

  async downloadModel(modelId: string, progressCallback?: (progress: number) => void): Promise<void> {
    const model = this.supportedModels.find(m => m.id === modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Model download URL (from huggingface or whisper.cpp releases)
    const modelUrl = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${modelId}.bin`;
    const outputPath = model.localPath || path.join(this.modelsDirectory, `ggml-${modelId}.bin`);

    console.log(`[Transcriber] Downloading model from ${modelUrl}`);

    // Download with progress
    await this.downloadFile(modelUrl, outputPath, progressCallback);

    model.isDownloaded = true;
    model.localPath = outputPath;
    
    console.log(`[Transcriber] Model downloaded to ${outputPath}`);
  }

  private async downloadFile(
    url: string, 
    outputPath: string, 
    progressCallback?: (progress: number) => void
  ): Promise<void> {
    // Use node-fetch or https module for downloading
    const https = await import('https');
    const fs = await import('fs');

    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(outputPath);
      const request = https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed with status ${response.statusCode}`));
          return;
        }

        const totalSize = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedSize = 0;

        response.on('data', (chunk) => {
          if (progressCallback && totalSize > 0) {
            downloadedSize += chunk.length;
            progressCallback((downloadedSize / totalSize) * 100);
          }
        });

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          resolve();
        });
      });

      request.on('error', (error) => {
        fs.unlinkSync(outputPath);
        reject(error);
      });
    });
  }

  setLanguage(language: string): void {
    this.config.language = language;
    this.saveConfig();
  }

  setThreads(threads: number): void {
    this.config.threads = Math.min(threads, os.cpus().length);
    this.saveConfig();
  }

  async cancel(): Promise<void> {
    if (this.process && !this.process.killed) {
      this.process.kill('SIGTERM');
      this.process = null;
    }

    this.isTranscribing = false;
    this.status = 'IDLE';
    this.partialTranscript = '';
    
    // Cleanup temp file
    if (this.currentAudioPath && fs.existsSync(this.currentAudioPath)) {
      fs.unlinkSync(this.currentAudioPath);
      this.currentAudioPath = null;
    }

    console.log('[Transcriber] Transcription cancelled');
  }

  async cleanup(): Promise<void> {
    await this.cancel();
    
    // Cleanup temp directory
    const tempDir = path.join(process.cwd(), 'temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    console.log('[Transcriber] Cleaned up');
  }
}

import os from 'os';

export const transcriber = new Transcriber();
