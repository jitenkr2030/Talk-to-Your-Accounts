// Audio Recorder Service - Handles microphone stream and audio capture
// Captures audio from the microphone and prepares it for transcription

import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';
import os from 'os';
import {
  VoiceStatus,
  TranscriptionResult
} from '../../shared/types/voice';

export interface AudioConfig {
  sampleRate: number;
  channels: number;
  bitDepth: number;
  bufferSize: number;
  silenceThreshold: number;
  silenceDuration: number;
}

export interface RecordingSession {
  id: string;
  startTime: Date;
  audioChunks: Float32Array[];
  isActive: boolean;
}

export class AudioRecorder extends EventEmitter {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private currentSession: RecordingSession | null = null;
  private silenceTimer: NodeJS.Timeout | null = null;
  private isListening: boolean = false;
  private audioQueue: Buffer[] = [];
  private config: AudioConfig;

  constructor() {
    super();
    this.config = {
      sampleRate: 16000,
      channels: 1,
      bitDepth: 16,
      bufferSize: 4096,
      silenceThreshold: 0.02,
      silenceDuration: 1500, // ms before auto-stop
    };
  }

  async initialize(): Promise<void> {
    try {
      // Request microphone permission
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      // Create audio context
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate
      });

      // Create analyser for silence detection
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      // Connect stream to analyser
      const source = this.audioContext.createMediaStreamSource(this.stream);
      source.connect(this.analyser);

      this.emit('initialized');
      console.log('[AudioRecorder] Initialized successfully');
    } catch (error) {
      console.error('[AudioRecorder] Initialization failed:', error);
      throw error;
    }
  }

  async startListening(): Promise<void> {
    if (this.isListening) {
      console.warn('[AudioRecorder] Already listening');
      return;
    }

    if (!this.stream || !this.audioContext) {
      await this.initialize();
    }

    this.isListening = true;
    this.currentSession = {
      id: `session_${Date.now()}`,
      startTime: new Date(),
      audioChunks: [],
      isActive: true
    };

    // Set up MediaRecorder
    this.mediaRecorder = new MediaRecorder(this.stream!, {
      mimeType: this.getSupportedMimeType()
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.handleAudioData(event.data);
      }
    };

    this.mediaRecorder.start(100); // Collect data every 100ms
    this.startSilenceDetection();

    this.emit('listeningStarted', { sessionId: this.currentSession.id });
    console.log('[AudioRecorder] Started listening');
  }

  private handleAudioData(data: Blob): void {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const float32Array = this.convertToFloat32(arrayBuffer);
      
      if (this.currentSession) {
        this.currentSession.audioChunks.push(float32Array);
      }

      // Emit audio data for visualization
      this.emit('audioData', {
        data: float32Array,
        timestamp: Date.now()
      });
    };
    reader.readAsArrayBuffer(data);
  }

  private convertToFloat32(arrayBuffer: ArrayBuffer): Float32Array {
    const int16Array = new Int16Array(arrayBuffer);
    const float32Array = new Float32Array(int16Array.length);
    
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }
    
    return float32Array;
  }

  private startSilenceDetection(): void {
    const bufferLength = this.analyser!.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let silenceStartTime: number | null = null;

    const checkSilence = () => {
      if (!this.isListening) return;

      this.analyser!.getByteTimeDomainData(dataArray);
      
      // Calculate RMS
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / bufferLength);

      if (rms < this.config.silenceThreshold) {
        if (!silenceStartTime) {
          silenceStartTime = Date.now();
        } else if (Date.now() - silenceStartTime > this.config.silenceDuration) {
          // Auto-stop after silence duration
          this.stopListening();
          return;
        }
      } else {
        silenceStartTime = null;
      }

      // Emit silence status for UI
      this.emit('audioLevel', { level: rms, isSilent: rms < this.config.silenceThreshold });

      if (this.isListening) {
        requestAnimationFrame(checkSilence);
      }
    };

    checkSilence();
  }

  async stopListening(): Promise<Float32Array | null> {
    if (!this.isListening) {
      return null;
    }

    this.isListening = false;

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // Combine all audio chunks
    let result: Float32Array | null = null;
    if (this.currentSession) {
      this.currentSession.isActive = false;
      
      const totalLength = this.currentSession.audioChunks.reduce(
        (sum, chunk) => sum + chunk.length, 0
      );
      
      if (totalLength > 0) {
        result = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of this.currentSession.audioChunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
      }

      this.emit('listeningStopped', {
        sessionId: this.currentSession.id,
        duration: Date.now() - this.currentSession.startTime.getTime(),
        audioData: result
      });
    }

    this.currentSession = null;
    console.log('[AudioRecorder] Stopped listening');
    return result;
  }

  async saveAudio(audioData: Float32Array, filename?: string): Promise<string> {
    const tempDir = path.join(os.tmpdir(), 'talk-to-accounts', 'audio');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const outputPath = filename 
      ? path.join(tempDir, filename)
      : path.join(tempDir, `recording_${Date.now()}.wav`);

    // Convert Float32 to WAV format
    const wavBuffer = this.createWavFile(audioData);
    fs.writeFileSync(outputPath, wavBuffer);

    console.log('[AudioRecorder] Audio saved to:', outputPath);
    return outputPath;
  }

  private createWavFile(audioData: Float32Array): Buffer {
    const numChannels = this.config.channels;
    const bytesPerSample = this.config.bitDepth / 8;
    const sampleRate = this.config.sampleRate;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = audioData.length * bytesPerSample;
    const bufferSize = 44 + dataSize;

    const buffer = Buffer.alloc(bufferSize);
    let offset = 0;

    // RIFF header
    buffer.write('RIFF', offset); offset += 4;
    buffer.writeUInt32LE(bufferSize - 8, offset); offset += 4;
    buffer.write('WAVE', offset); offset += 4;

    // fmt chunk
    buffer.write('fmt ', offset); offset += 4;
    buffer.writeUInt32LE(16, offset); offset += 4; // Chunk size
    buffer.writeUInt16LE(1, offset); offset += 2; // Audio format (PCM)
    buffer.writeUInt16LE(numChannels, offset); offset += 2;
    buffer.writeUInt32LE(sampleRate, offset); offset += 4;
    buffer.writeUInt32LE(byteRate, offset); offset += 4;
    buffer.writeUInt16LE(blockAlign, offset); offset += 2;
    buffer.writeUInt16LE(this.config.bitDepth, offset); offset += 2;

    // data chunk
    buffer.write('data', offset); offset += 4;
    buffer.writeUInt32LE(dataSize, offset); offset += 4;

    // Write audio data
    for (let i = 0; i < audioData.length; i++) {
      const sample = Math.max(-1, Math.min(1, audioData[i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      buffer.writeInt16LE(Math.floor(intSample), offset);
      offset += 2;
    }

    return buffer;
  }

  getAudioLevel(): number {
    if (!this.analyser) return 0;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const normalized = (dataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }

    return Math.sqrt(sum / bufferLength);
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm';
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  async getAudioDuration(audioData: Float32Array): Promise<number> {
    return audioData.length / this.config.sampleRate;
  }

  async cleanup(): Promise<void> {
    await this.stopListening();
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.mediaRecorder = null;
    
    console.log('[AudioRecorder] Cleaned up');
  }
}

export const audioRecorder = new AudioRecorder();
