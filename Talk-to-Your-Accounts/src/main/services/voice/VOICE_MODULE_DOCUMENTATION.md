# Voice Module Documentation

## Overview

The Voice Module is a comprehensive offline speech recognition system designed for the Talk to Your Accounts desktop application. Inspired by the VoiceInk architecture, this module provides complete voice-to-command functionality without requiring internet connectivity, ensuring data privacy and fast response times.

### Key Features

The Voice Module delivers enterprise-grade voice recognition capabilities tailored specifically for accounting workflows. The system operates entirely offline, leveraging local speech recognition models to process voice commands without transmitting sensitive financial data to external servers. This approach ensures complete data privacy while maintaining fast response times typical of local processing.

The module supports a comprehensive range of accounting commands including transaction entry, expense tracking, income recording, report generation, and balance queries. Natural language processing interprets conversational commands like "Add expense of 500 for groceries" or "Show me last month's sales report" without requiring rigid command syntax. The system maintains a custom dictionary of accounting-specific terms, party names, product names, and GST-related terminology to improve recognition accuracy for domain-specific vocabulary.

Real-time audio visualization provides visual feedback during voice input, helping users understand when the system is actively listening and processing their speech. The modular architecture allows individual components to be upgraded or replaced without affecting the entire system, supporting future enhancements such as additional language models or improved transcription engines.

---

## Architecture

### System Architecture

The Voice Module follows a layered service architecture that separates concerns and enables independent scaling of components. At the foundation, the AudioRecorder service handles all microphone interactions, capturing audio streams with optimal sample rates and converting them to formats suitable for transcription. This layer includes silence detection algorithms that automatically terminate recording when users stop speaking, reducing unnecessary processing.

The Transcriber service constitutes the core recognition engine, interfacing with local speech-to-text models to convert audio data into text. The implementation supports multiple model sizes ranging from compact configurations suitable for resource-constrained environments to larger models delivering superior accuracy. Context-aware processing leverages the custom dictionary to improve recognition of accounting terminology, ensuring that terms like "EBITDA" or "GSTR-3B" are correctly transcribed.

The Command Parser interprets transcribed text and converts natural language into structured accounting commands. Pattern-matching algorithms identify user intents, extract relevant entities such as amounts and dates, and validate commands before execution. The parser maintains priority-based pattern matching, ensuring that more specific commands take precedence over general patterns.

The Voice Service orchestrates all components, managing state transitions, handling configuration, and providing a unified interface for the application. This service implements the event-driven architecture, emitting notifications for user interface updates and command execution results.

### Component Interaction

```
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Voice Service (Orchestrator)             │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐   │  │
│  │  │ State Mgmt   │ │ Config       │ │ Event Emitter    │   │  │
│  │  └──────────────┘ └──────────────┘ └──────────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────┐    │
│  │   AudioRecorder  │ │   Transcriber    │ │CommandParser │    │
│  │  ┌────────────┐  │ │  ┌────────────┐  │ │ ┌──────────┐ │    │
│  │  │Mic Stream  │  │ │  │ Whisper.cpp│  │ │ │ Intent   │ │    │
│  │  │Silence Det │  │ │  │ Model Mgmt │  │ │ │Extractors│ │    │
│  │  │WAV Encoder │  │ │  │ Context    │  │ │ │Validator │ │    │
│  │  └────────────┘  │ │  └────────────┘  │ │ └──────────┘ │    │
│  └──────────────────┘ └──────────────────┘ └──────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Dictionary Service (SQLite)                     ││
│  │  ┌─────────────────┐ ┌───────────────────────────────────┐  ││
│  │  │ Custom Terms    │ │ Accounting Vocabulary, Party     │  ││
│  │  │ Management      │ │ Names, GST Terms, Categories      │  ││
│  │  └─────────────────┘ └───────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Services

### AudioRecorder Service

The AudioRecorder service provides complete audio capture functionality optimized for speech recognition applications. It manages the browser's MediaStream API to access microphone input, configuring audio parameters for optimal recognition quality.

#### Configuration Options

```typescript
interface AudioConfig {
  sampleRate: number;      // Default: 16000 Hz
  channels: number;        // Default: 1 (mono)
  bitDepth: number;        // Default: 16 bits
  bufferSize: number;      // Default: 4096 samples
  silenceThreshold: number; // Default: 0.02 (RMS threshold)
  silenceDuration: number;  // Default: 1500 ms
}
```

The sample rate configuration targets 16000 Hz, which provides sufficient audio quality for speech recognition while minimizing processing overhead. Mono channel capture reduces data volume without sacrificing intelligibility. The silence detection algorithm calculates root-mean-square (RMS) values from audio buffers, triggering automatic stop when RMS values remain below the threshold for the specified duration.

#### Methods

```typescript
async initialize(): Promise<void>
```
Initializes the audio recorder by requesting microphone permissions and configuring the audio context. This method must be called before starting audio capture.

```typescript
async startListening(): Promise<void>
```
Begins audio capture from the microphone. The service starts emitting `audioData` events containing audio chunks and `audioLevel` events for visualization.

```typescript
async stopListening(): Promise<Float32Array | null>
```
Stops audio capture and returns the complete audio data as a Float32Array. Returns null if no recording was in progress.

```typescript
async saveAudio(audioData: Float32Array, filename?: string): Promise<string>
```
Saves audio data to a WAV file in the temporary directory. Returns the file path.

```typescript
getAudioLevel(): number
```
Returns the current audio input level as a normalized value between 0 and 1.

```typescript
async cleanup(): Promise<void>
```
Releases all resources including microphone stream and audio context.

#### Events

```typescript
audioRecorder.on('initialized', () => {})
audioRecorder.on('listeningStarted', ({ sessionId }) => {})
audioRecorder.on('listeningStopped', ({ sessionId, duration, audioData }) => {})
audioRecorder.on('audioData', ({ data, timestamp }) => {})
audioRecorder.on('audioLevel', ({ level, isSilent }) => {})
```

---

### Transcriber Service

The Transcriber service handles speech-to-text conversion using local machine learning models. The implementation supports whisper.cpp models with configurable parameters for accuracy and performance trade-offs.

#### Supported Models

| Model | Size | Accuracy | Memory Usage | Best For |
|-------|------|----------|--------------|----------|
| Tiny | 40 MB | 85% | ~512 MB | Low-resource devices |
| Base | 74 MB | 89% | ~1 GB | Balanced performance |
| Small | 244 MB | 92% | ~2 GB | Most users |
| Medium | 769 MB | 95% | ~4 GB | High accuracy needs |

#### Configuration Options

```typescript
interface TranscriberConfig {
  modelPath: string;        // Path to model file
  modelSize: string;        // 'tiny', 'base', 'small', 'medium'
  language: string;         // Default: 'en'
  threads: number;          // CPU threads for processing
  useGPU: boolean;          // GPU acceleration (future)
  temperature: number;      // Sampling temperature (0-1)
  beamSize: number;         // Beam search width
}
```

#### Methods

```typescript
async initialize(): Promise<void>
```
Initializes the transcriber, checks for available models, and loads configuration.

```typescript
async transcribe(audioData: Float32Array): Promise<TranscriptionResult>
```
Processes audio data and returns transcribed text with confidence score. This is the primary transcription method for completed utterances.

```typescript
async transcribeStream(audioData: Float32Array): Promise<void>
```
Processes audio for real-time transcription results. Emits `partialTranscription` events during processing.

```typescript
async setModel(modelId: string): Promise<void>
```
Switches to a different model size. Requires model file to be downloaded.

```typescript
async downloadModel(modelId: string, progressCallback?: (progress: number) => void): Promise<void>
```
Downloads a model from the remote repository. Progress callback receives values from 0 to 100.

```typescript
async cancel(): Promise<void>
```
Cancels ongoing transcription and cleans up resources.

```typescript
getSupportedModels(): ModelInfo[]
```
Returns list of available models with download status and metadata.

#### Transcription Result

```typescript
interface TranscriptionResult {
  text: string;           // Transcribed text
  confidence: number;     // 0-1 confidence score
  isFinal: boolean;       // True for complete results
  timestamp: Date;        // Processing timestamp
}
```

---

### Command Parser Service

The Command Parser transforms natural language text into structured accounting commands. It uses pattern matching to identify user intents and entity extraction to populate command parameters.

#### Supported Intents

| Intent | Description | Example Commands |
|--------|-------------|------------------|
| ADD_EXPENSE | Record a new expense | "Add expense of 500 for groceries" |
| ADD_INCOME | Record income received | "Received 10000 from consulting" |
| ADD_TRANSACTION | Create general transaction | "Add transaction for 5000" |
| ADD_PARTY | Add new party/customer/vendor | "Add new party ABC Corporation" |
| ADD_PRODUCT | Add new product or service | "Add new product Widget A" |
| GENERATE_REPORT | Create or display reports | "Show monthly expense report" |
| QUERY_BALANCE | Check account balance | "What is my current balance?" |
| NAVIGATE | Navigate to application section | "Go to transactions page" |
| UNKNOWN | Unrecognized command | - |

#### Methods

```typescript
async parse(text: string): Promise<ParseResult>
```
Parses natural language text and returns structured command with entities and confidence.

```typescript
getExamplesForIntent(intent: VoiceIntent): string[]
```
Returns example commands for a specific intent to guide users.

```typescript
validateCommand(command: ParsedVoiceCommand): { isValid: boolean; errors: string[] }
```
Validates a parsed command for required fields and data integrity.

```typescript
formatCommandForDisplay(command: ParsedVoiceCommand): string
```
Formats a command for display in user interfaces with markdown formatting.

#### Entity Types

| Entity Type | Description | Examples |
|-------------|-------------|----------|
| AMOUNT | Transaction amount | 500, 1500.50, ₹1000 |
| DATE | Transaction date | today, yesterday, 15/01/2025 |
| DESCRIPTION | Transaction description | groceries, office supplies |
| CATEGORY | Expense/income category | Food, Transport, Salary |
| PARTY | Customer, vendor, or party name | McDonalds, Amazon India |
| PRODUCT | Product or service name | Laptop, Consulting Service |

#### Parse Result

```typescript
interface ParseResult {
  command: ParsedVoiceCommand;      // Parsed command structure
  requiresConfirmation: boolean;    // True for high-value transactions
  suggestedResponse: string;        // Response to show user
}
```

---

### Dictionary Service

The Dictionary Service manages custom vocabulary for improved recognition accuracy. It stores mappings between spoken terms and their canonical forms, enabling the system to correctly interpret domain-specific terminology.

#### Default Categories

| Category | Example Terms |
|----------|---------------|
| Expense Categories | groceries, office supplies, travel, fuel, rent |
| Income Sources | sales, consulting, interest |
| Common Parties | McDonalds India, Amazon India, Flipkart India |
| Common Products | Laptop, Software License, Consultation |
| Accounting Terms | EBITDA, P&L, Balance Sheet, Cash Flow |
| GST/Tax Terms | GST, GSTR-1, GSTR-3B, TDS, ITC |

#### Methods

```typescript
async initialize(): Promise<void>
```
Initializes the SQLite database and seeds default accounting terms.

```typescript
async getAllTerms(): Promise<DictionaryTerm[]>
```
Returns all dictionary terms with metadata.

```typescript
async getTermsByCategory(category: string): Promise<DictionaryTerm[]>
```
Returns terms filtered by category.

```typescript
async addTerm(spoken: string, mapped: string, category: string): Promise<DictionaryTerm>
```
Adds a new custom term to the dictionary.

```typescript
async updateTerm(id: string, updates: Partial<DictionaryTerm>): Promise<void>
```
Updates an existing term.

```typescript
async removeTerm(id: string): Promise<void>
```
Removes a term from the dictionary.

```typescript
async getTermMap(): Promise<Map<string, string>>
```
Returns a map of spoken-to-mapped terms for fast lookup during transcription.

```typescript
async getContextPrompt(): Promise<string>
```
Generates a comma-separated context string for whisper.cpp prompt injection.

```typescript
async searchTerms(query: string): Promise<DictionaryTerm[]>
```
Searches terms by spoken or mapped value.

---

### Voice Service

The Voice Service serves as the orchestrator, integrating all other services and providing a unified interface for the application.

#### State Management

```typescript
interface VoiceState {
  status: VoiceStatus;          // IDLE, LISTENING, PROCESSING, ERROR
  transcript: string;           // Final transcribed text
  partialTranscript: string;    // Current partial transcription
  lastCommand: ParsedVoiceCommand | null;  // Last processed command
  isListening: boolean;         // Current listening state
  settings: VoiceSettings;      // Current configuration
}
```

#### Methods

```typescript
async initialize(): Promise<void>
```
Initializes all voice services in parallel.

```typescript
async startListening(): Promise<void>
```
Begins voice capture and transcription.

```typescript
async stopListening(): Promise<ParsedVoiceCommand | null>
```
Stops voice capture and returns the last parsed command.

```typescript
async toggleListening(): Promise<VoiceState>
```
Toggles between listening and idle states.

```typescript
getState(): VoiceState
```
Returns current voice module state.

```typescript
getSettings(): VoiceSettings
```
Returns current configuration.

```typescript
updateSettings(updates: Partial<VoiceSettings>): void
```
Updates voice settings.

```typescript
setEnabled(enabled: boolean): void
```
Enables or disables voice recognition.

```typescript
async getDictionaryTerms(): Promise<DictionaryTerm[]>
```
Returns dictionary terms.

```typescript
getSupportedModels(): ModelInfo[]
```
Returns available models.

```typescript
async setModel(modelId: string): Promise<void>
```
Changes the active recognition model.

```typescript
getCommandHistory(): ParsedVoiceCommand[]
```
Returns command history.

```typescript
clearHistory(): void
```
Clears command history.

```typescript
async cleanup(): Promise<void>
```
Releases all resources.

#### Events

```typescript
voiceService.on('initialized', () => {})
voiceService.on('listeningStarted', ({ sessionId }) => {})
voiceService.on('listeningStopped', ({ sessionId, duration }) => {})
voiceService.on('transcriptionComplete', (result) => {})
voiceService.on('partialTranscription', (result) => {})
voiceService.on('commandParsed', (command) => {})
voiceService.on('commandReady', (command) => {})
voiceService.on('executeCommand', (command) => {})
voiceService.on('audioLevel', ({ level, isSilent }) => {})
voiceService.on('error', (error) => {})
voiceService.on('modelChanged', (model) => {})
voiceService.on('settingsChanged', (settings) => {})
voiceService.on('historyUpdated', (history) => {})
```

---

## Usage Examples

### Basic Voice Command Processing

```typescript
import { voiceService } from './services/voice';

// Initialize the voice module
await voiceService.initialize();

// Start listening for voice commands
await voiceService.startListening();

// The service will emit events for:
// - transcriptionComplete: When speech is transcribed
// - commandParsed: When intent and entities are extracted
// - commandReady: When a command requires user confirmation

voiceService.on('commandReady', async (command) => {
  console.log('Voice command:', command.rawText);
  console.log('Intent:', command.intent);
  console.log('Entities:', command.entities);
  
  // Execute the command
  await voiceService.confirmAndExecute(command);
});

// Check current state
const state = voiceService.getState();
console.log('Status:', state.status);
console.log('Transcript:', state.transcript);
```

### Dictionary Management

```typescript
import { voiceService } from './services/voice';

// Get all dictionary terms
const terms = await voiceService.getDictionaryTerms();
console.log('Dictionary terms:', terms);

// Add a custom term
const newTerm = await voiceService.addDictionaryTerm(
  'mcdonalds',           // What user says
  'McDonalds India',     // What it maps to
  'cat_parties'          // Category
);

// Search for terms
const results = await voiceService.searchTerms('gst');
console.log('Search results:', results);
```

### Model Management

```typescript
import { voiceService } from './services/voice';

// Get available models
const models = voiceService.getSupportedModels();
console.log('Available models:', models);

// Check which model is active
const state = voiceService.getState();
console.log('Current language:', state.settings.language);

// Download a larger model for better accuracy
await voiceService.downloadModel('small', (progress) => {
  console.log(`Downloading: ${progress.toFixed(1)}%`);
});

// Switch to the downloaded model
await voiceService.setModel('small');
```

### Command Parsing Without Voice

```typescript
import { commandParser } from './services/voice';

// Parse text directly
const result = await commandParser.parse(
  'Add expense of 500 rupees for office supplies'
);

console.log('Intent:', result.command.intent);
console.log('Amount:', result.command.entities.find(e => e.type === 'AMOUNT')?.value);
console.log('Description:', result.command.entities.find(e => e.type === 'DESCRIPTION')?.value);
console.log('Confidence:', result.command.confidence);
console.log('Requires confirmation:', result.requiresConfirmation);
```

### Integration with Electron IPC

```javascript
// In main process (main.js)
const { setupVoiceHandlers } = require('./src/main/services/voice/VoiceIPCHandlers');
const { BrowserWindow } = require('electron');

// Create window reference
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadURL('http://localhost:5173');
  
  // Setup voice IPC handlers
  setupVoiceHandlers(mainWindow);
}

// In renderer process (preload.js contextBridge)
contextBridge.exposeInMainWorld('voiceAPI', {
  startListening: () => ipcRenderer.invoke('voice:start'),
  stopListening: () => ipcRenderer.invoke('voice:stop'),
  getStatus: () => ipcRenderer.invoke('voice:status'),
  onTranscript: (callback) => {
    ipcRenderer.on('voice:transcriptionComplete', (e, data) => callback(data));
  },
  onCommand: (callback) => {
    ipcRenderer.on('voice:commandReady', (e, data) => callback(data));
  }
});
```

---

## Configuration

### Voice Settings

```typescript
interface VoiceSettings {
  enabled: boolean;           // Enable/disable voice recognition
  language: string;           // Recognition language code
  hotkey: string;             // Keyboard shortcut
  autoPunctuation: boolean;   // Auto-add punctuation
  partialResults: boolean;    // Show partial transcriptions
  noiseThreshold: number;     // Silence detection threshold
}
```

### Service Configuration

```typescript
interface VoiceServiceConfig {
  autoSend: boolean;          // Auto-execute confirmed commands
  confirmCommands: boolean;   // Require confirmation for high-value transactions
  hapticFeedback: boolean;    // Enable haptic feedback (if supported)
  visualFeedback: boolean;    // Show visual indicators
}
```

### Configuration File Location

Voice module configuration is stored in the application data directory:

- **Settings**: `~/.config/talk-to-accounts/data/voice_settings.json`
- **Dictionary**: `~/.config/talk-to-accounts/data/dictionary.db`
- **Models**: `~/.config/talk-to-accounts/models/whisper/`
- **Command History**: `~/.config/talk-to-accounts/data/voice_history.json`
- **Transcriber Config**: `~/.config/talk-to-accounts/data/transcriber.json`

---

## Error Handling

### Common Errors

| Error Code | Description | Resolution |
|------------|-------------|------------|
| MIC_PERMISSION_DENIED | Microphone access not granted | Request permission in system settings |
| NO_AUDIO_INPUT | No microphone detected | Check hardware connections |
| MODEL_NOT_FOUND | Speech model file missing | Download model using downloadModel() |
| TRANSCRIPTION_TIMEOUT | Processing took too long | Use smaller model or reduce audio length |
| COMMAND_INVALID | Parsed command missing required fields | Re-phrase command with all details |
| DATABASE_ERROR | Dictionary database error | Check file permissions in data directory |

### Error Events

```typescript
voiceService.on('error', (error) => {
  console.error('Voice module error:', error);
  console.error('Error code:', error.code);
  console.error('Error message:', error.message);
  
  // Display user-friendly message
  showNotification('Voice Error', error.message);
});
```

---

## Performance Optimization

### Model Selection Guidelines

For optimal performance on various hardware configurations, consider these recommendations. Systems with limited RAM should use the tiny or base models, which require approximately 512 MB to 1 GB of memory during transcription. These models provide adequate accuracy for basic command recognition while maintaining responsive performance on lower-end hardware.

Standard desktop systems with 8 GB or more of RAM should use the base or small models. The small model offers an excellent balance of accuracy and resource usage, making it suitable for most accounting voice commands. This model typically processes audio at 2-3x real-time speed on modern processors.

High-performance workstations with dedicated GPUs and 16 GB or more RAM can utilize the medium model for maximum accuracy. This model is recommended for users who frequently dictate long transactions or require precise recognition of complex accounting terminology.

### Thread Configuration

The `threads` configuration parameter should be set to the number of available CPU cores minus one to maintain UI responsiveness. For example, an 8-core processor should use 7 threads for transcription.

```typescript
// Auto-configure threads based on CPU
const threads = Math.max(1, require('os').cpus().length - 1);
transcriber.setThreads(threads);
```

---

## API Reference

### VoiceService

```typescript
class VoiceService extends EventEmitter {
  async initialize(): Promise<void>
  async startListening(): Promise<void>
  async stopListening(): Promise<ParsedVoiceCommand | null>
  async toggleListening(): Promise<VoiceState>
  getState(): VoiceState
  getSettings(): VoiceSettings
  updateSettings(updates: Partial<VoiceSettings>): void
  setEnabled(enabled: boolean): void
  isEnabled(): boolean
  isListening(): boolean
  getAudioLevel(): number
  getCommandHistory(): ParsedVoiceCommand[]
  clearHistory(): void
  async getDictionaryTerms(): Promise<DictionaryTerm[]>
  async addDictionaryTerm(spoken: string, mapped: string, category: string): Promise<DictionaryTerm>
  async removeDictionaryTerm(id: string): Promise<void>
  async searchDictionaryTerms(query: string): Promise<DictionaryTerm[]>
  getSupportedModels(): ModelInfo[]
  async setModel(modelId: string): Promise<void>
  async downloadModel(modelId: string, progressCallback?: (progress: number) => void): Promise<void>
  setLanguage(language: string): void
  async confirmAndExecute(command: ParsedVoiceCommand): Promise<void>
  async retryLastCommand(): Promise<void>
  async cleanup(): Promise<void>
}
```

### AudioRecorder

```typescript
class AudioRecorder extends EventEmitter {
  async initialize(): Promise<void>
  async startListening(): Promise<void>
  async stopListening(): Promise<Float32Array | null>
  getAudioLevel(): number
  async saveAudio(audioData: Float32Array, filename?: string): Promise<string>
  isCurrentlyListening(): boolean
  async cleanup(): Promise<void>
}
```

### Transcriber

```typescript
class Transcriber extends EventEmitter {
  async initialize(): Promise<void>
  async transcribe(audioData: Float32Array): Promise<TranscriptionResult>
  async transcribeStream(audioData: Float32Array): Promise<void>
  async setModel(modelId: string): Promise<void>
  async downloadModel(modelId: string, progressCallback?: (progress: number) => void): Promise<void>
  setLanguage(language: string): void
  setThreads(threads: number): void
  async cancel(): Promise<void>
  getStatus(): VoiceStatus
  getSupportedModels(): ModelInfo[]
  async cleanup(): Promise<void>
}
```

### CommandParser

```typescript
class CommandParser extends EventEmitter {
  async parse(text: string): Promise<ParseResult>
  getExamplesForIntent(intent: VoiceIntent): string[]
  getAllPatterns(): IntentPattern[]
  validateCommand(command: ParsedVoiceCommand): { isValid: boolean; errors: string[] }
  formatCommandForDisplay(command: ParsedVoiceCommand): string
}
```

### DictionaryService

```typescript
class DictionaryService {
  async initialize(): Promise<void>
  async getAllTerms(): Promise<DictionaryTerm[]>
  async getTermsByCategory(category: string): Promise<DictionaryTerm[]>
  async getCategories(): Promise<DictionaryCategory[]>
  async addTerm(spoken: string, mapped: string, category: string): Promise<DictionaryTerm>
  async updateTerm(id: string, updates: Partial<DictionaryTerm>): Promise<void>
  async removeTerm(id: string): Promise<void>
  async getTermMap(): Promise<Map<string, string>>
  async getContextPrompt(): Promise<string>
  async searchTerms(query: string): Promise<DictionaryTerm[]>
  close(): void
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-16 | Initial implementation of Voice Module |
| | | AudioRecorder with silence detection |
| | | Transcriber with whisper.cpp support |
| | | CommandParser with accounting intents |
| | | DictionaryService with default terms |
| | | VoiceService orchestrator |
| | | IPC handlers for Electron integration |

---

## License

This Voice Module is part of the Talk to Your Accounts application and is licensed under the same terms as the main application.
