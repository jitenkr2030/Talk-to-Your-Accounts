// Voice IPC Handlers - Bridge between Voice Services and Electron IPC
// Handles all voice-related IPC communication between main and renderer processes

const { ipcMain, shell } = require('electron');
const path = require('path');

// Import voice services (using require for CommonJS compatibility)
let voiceService = null;
let commandParser = null;
let isInitialized = false;

// Initialize voice services
async function initializeVoiceServices() {
  if (isInitialized) return;

  try {
    // Dynamic import for ES modules
    const voiceServices = require('./index.js');
    voiceService = voiceServices.voiceService;
    commandParser = voiceServices.commandParser;

    await voiceService.initialize();
    isInitialized = true;

    console.log('[VoiceIPC] Voice services initialized successfully');
  } catch (error) {
    console.error('[VoiceIPC] Failed to initialize voice services:', error);
    // Don't throw - allow app to continue without voice
  }
}

// Setup all voice-related IPC handlers
function setupVoiceHandlers(mainWindow) {
  // Initialize services when app is ready
  initializeVoiceServices();

  // ==================== LISTENING CONTROL ====================
  ipcMain.handle('voice:start', async () => {
    try {
      if (!voiceService) {
        await initializeVoiceServices();
      }
      if (!voiceService) {
        return { success: false, error: 'Voice service not available' };
      }
      await voiceService.startListening();
      return { success: true };
    } catch (error) {
      console.error('[VoiceIPC] Start listening error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('voice:stop', async () => {
    try {
      if (!voiceService) return { success: false, error: 'Voice service not available' };
      const command = await voiceService.stopListening();
      return { success: true, command };
    } catch (error) {
      console.error('[VoiceIPC] Stop listening error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('voice:toggle', async () => {
    try {
      if (!voiceService) return { success: false, error: 'Voice service not available' };
      const state = await voiceService.toggleListening();
      return { success: true, state };
    } catch (error) {
      console.error('[VoiceIPC] Toggle listening error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('voice:cancel', async () => {
    try {
      if (!voiceService) return { success: false, error: 'Voice service not available' };
      await voiceService.stopListening();
      return { success: true };
    } catch (error) {
      console.error('[VoiceIPC] Cancel error:', error);
      return { success: false, error: error.message };
    }
  });

  // ==================== STATUS & STATE ====================
  ipcMain.handle('voice:status', async () => {
    try {
      if (!voiceService) return { success: false, error: 'Voice service not available' };
      const state = voiceService.getState();
      return { success: true, state };
    } catch (error) {
      console.error('[VoiceIPC] Get status error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('voice:get-audio-level', async () => {
    try {
      if (!voiceService) return { level: 0 };
      const level = voiceService.getAudioLevel();
      return { level };
    } catch (error) {
      return { level: 0 };
    }
  });

  ipcMain.handle('voice:is-listening', async () => {
    try {
      if (!voiceService) return { isListening: false };
      const isListening = voiceService.isListening();
      return { isListening };
    } catch (error) {
      return { isListening: false };
    }
  });

  // ==================== SETTINGS ====================
  ipcMain.handle('voice:get-settings', async () => {
    try {
      if (!voiceService) return { success: false, error: 'Voice service not available' };
      const settings = voiceService.getSettings();
      return { success: true, settings };
    } catch (error) {
      console.error('[VoiceIPC] Get settings error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('voice:save-settings', async (event, settings) => {
    try {
      if (!voiceService) return { success: false, error: 'Voice service not available' };
      voiceService.updateSettings(settings);
      return { success: true };
    } catch (error) {
      console.error('[VoiceIPC] Save settings error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('voice:set-enabled', async (event, enabled) => {
    try {
      if (!voiceService) return { success: false, error: 'Voice service not available' };
      voiceService.setEnabled(enabled);
      return { success: true };
    } catch (error) {
      console.error('[VoiceIPC] Set enabled error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('voice:set-language', async (event, language) => {
    try {
      if (!voiceService) return { success: false, error: 'Voice service not available' };
      voiceService.setLanguage(language);
      return { success: true };
    } catch (error) {
      console.error('[VoiceIPC] Set language error:', error);
      return { success: false, error: error.message };
    }
  });

  // ==================== DICTIONARY MANAGEMENT ====================
  ipcMain.handle('voice:get-dictionary', async () => {
    try {
      if (!voiceService) return { success: false, error: 'Voice service not available' };
      const terms = await voiceService.getDictionaryTerms();
      return { success: true, terms };
    } catch (error) {
      console.error('[VoiceIPC] Get dictionary error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('voice:add-term', async (event, spoken, mapped, category) => {
    try {
      if (!voiceService) return { success: false, error: 'Voice service not available' };
      const term = await voiceService.addDictionaryTerm(spoken, mapped, category);
      return { success: true, term };
    } catch (error) {
      console.error('[VoiceIPC] Add term error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('voice:remove-term', async (event, id) => {
    try {
      if (!voiceService) return { success: false, error: 'Voice service not available' };
      await voiceService.removeDictionaryTerm(id);
      return { success: true };
    } catch (error) {
      console.error('[VoiceIPC] Remove term error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('voice:update-term', async (event, id, updates) => {
    try {
      if (!voiceService) return { success: false, error: 'Voice service not available' };
      await voiceService.updateDictionaryTerm(id, updates);
      return { success: true };
    } catch (error) {
      console.error('[VoiceIPC] Update term error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('voice:search-terms', async (event, query) => {
    try {
      if (!voiceService) return { success: false, error: 'Voice service not available' };
      const terms = await voiceService.searchDictionaryTerms(query);
      return { success: true, terms };
    } catch (error) {
      console.error('[VoiceIPC] Search terms error:', error);
      return { success: false, error: error.message };
    }
  });

  // ==================== MODEL MANAGEMENT ====================
  ipcMain.handle('voice:get-models', async () => {
    try {
      if (!voiceService) return { success: false, error: 'Voice service not available' };
      const models = voiceService.getSupportedModels();
      return { success: true, models };
    } catch (error) {
      console.error('[VoiceIPC] Get models error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('voice:set-model', async (event, modelId) => {
    try {
      if (!voiceService) return { success: false, error: 'Voice service not available' };
      await voiceService.setModel(modelId);
      return { success: true };
    } catch (error) {
      console.error('[VoiceIPC] Set model error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('voice:download-model', async (event, modelId) => {
    try {
      if (!voiceService) return { success: false, error: 'Voice service not available' };

      // Send progress updates to renderer
      await voiceService.downloadModel(modelId, (progress) => {
        if (mainWindow) {
          mainWindow.webContents.send('voice:download-progress', { modelId, progress });
        }
      });

      return { success: true };
    } catch (error) {
      console.error('[VoiceIPC] Download model error:', error);
      return { success: false, error: error.message };
    }
  });

  // ==================== COMMAND PARSING ====================
  ipcMain.handle('voice:parse-command', async (event, text) => {
    try {
      if (!commandParser) {
        // Try to initialize if not ready
        await initializeVoiceServices();
        if (!commandParser) {
          return { success: false, error: 'Command parser not available' };
        }
      }

      const result = await commandParser.parse(text);
      return { success: true, ...result };
    } catch (error) {
      console.error('[VoiceIPC] Parse command error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('voice:get-examples', async (event, intent) => {
    try {
      if (!commandParser) return { success: false, error: 'Command parser not available' };
      const examples = commandParser.getExamplesForIntent(intent);
      return { success: true, examples };
    } catch (error) {
      console.error('[VoiceIPC] Get examples error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('voice:validate-command', async (event, command) => {
    try {
      if (!commandParser) return { success: false, error: 'Command parser not available' };
      const validation = commandParser.validateCommand(command);
      return { success: true, ...validation };
    } catch (error) {
      console.error('[VoiceIPC] Validate command error:', error);
      return { success: false, error: error.message };
    }
  });

  // ==================== COMMAND HISTORY ====================
  ipcMain.handle('voice:get-history', async () => {
    try {
      if (!voiceService) return { success: false, error: 'Voice service not available' };
      const history = voiceService.getCommandHistory();
      return { success: true, history };
    } catch (error) {
      console.error('[VoiceIPC] Get history error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('voice:clear-history', async () => {
    try {
      if (!voiceService) return { success: false, error: 'Voice service not available' };
      voiceService.clearHistory();
      return { success: true };
    } catch (error) {
      console.error('[VoiceIPC] Clear history error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('voice:retry-last', async () => {
    try {
      if (!voiceService) return { success: false, error: 'Voice service not available' };
      await voiceService.retryLastCommand();
      return { success: true };
    } catch (error) {
      console.error('[VoiceIPC] Retry last error:', error);
      return { success: false, error: error.message };
    }
  });

  // ==================== COMMAND EXECUTION ====================
  ipcMain.handle('voice:execute-command', async (event, command) => {
    try {
      if (!voiceService) return { success: false, error: 'Voice service not available' };

      // Execute the voice command based on intent
      const result = await executeVoiceCommand(command);

      return {
        success: true,
        result,
        message: `Successfully executed: ${command.rawText}`
      };
    } catch (error) {
      console.error('[VoiceIPC] Execute command error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('voice:confirm-command', async (event, command) => {
    try {
      if (!voiceService) return { success: false, error: 'Voice service not available' };
      await voiceService.confirmAndExecute(command);
      return { success: true };
    } catch (error) {
      console.error('[VoiceIPC] Confirm command error:', error);
      return { success: false, error: error.message };
    }
  });

  // ==================== TRANSCRIPTION ====================
  ipcMain.handle('voice:transcribe', async (event, audioData) => {
    try {
      if (!voiceService) return { success: false, error: 'Voice service not available' };
      // This would typically be called internally by the voice service
      return { success: true };
    } catch (error) {
      console.error('[VoiceIPC] Transcribe error:', error);
      return { success: false, error: error.message };
    }
  });

  // ==================== EVENT forwarding ====================
  // Forward voice service events to renderer
  function setupVoiceEventForwarding() {
    if (!voiceService) return;

    const events = [
      'initialized',
      'listeningStarted',
      'listeningStopped',
      'transcriptionComplete',
      'partialTranscription',
      'commandParsed',
      'commandReady',
      'executeCommand',
      'audioData',
      'audioLevel',
      'error',
      'modelChanged',
      'settingsChanged',
      'historyUpdated',
      'enabledChanged'
    ];

    for (const eventName of events) {
      voiceService.on(eventName, (data) => {
        if (mainWindow) {
          mainWindow.webContents.send(`voice:${eventName}`, data);
        }
      });
    }
  }

  // Setup event forwarding after initialization
  setTimeout(setupVoiceEventForwarding, 1000);
}

// Helper function to execute voice commands based on intent
async function executeVoiceCommand(command) {
  const { intent, entities, rawText } = command;

  // Import database handlers dynamically
  const dbHandlers = require('./electron/main.js');
  const db = global.db; // Access the database instance

  switch (intent) {
    case 'ADD_EXPENSE':
      return await handleAddExpense(entities, rawText);

    case 'ADD_INCOME':
      return await handleAddIncome(entities, rawText);

    case 'ADD_TRANSACTION':
      return await handleAddTransaction(entities, rawText);

    case 'GENERATE_REPORT':
      return await handleGenerateReport(entities);

    case 'QUERY_BALANCE':
      return await handleQueryBalance();

    case 'NAVIGATE':
      return await handleNavigate(entities);

    default:
      return { action: 'unknown', message: 'Command not recognized' };
  }
}

async function handleAddExpense(entities, rawText) {
  try {
    const amount = entities.find(e => e.type === 'AMOUNT')?.value || 0;
    const description = entities.find(e => e.type === 'DESCRIPTION')?.value || 'Voice recorded expense';
    const date = entities.find(e => e.type === 'DATE')?.value || new Date().toISOString().split('T')[0];

    // Call the existing add-expense handler
    const expenseId = await ipcMain.emit('add-expense', null, {
      category: 'Voice Expense',
      amount,
      description,
      date
    });

    return {
      action: 'expense_added',
      expenseId,
      message: `Added expense of ₹${amount} for ${description}`
    };
  } catch (error) {
    throw new Error(`Failed to add expense: ${error.message}`);
  }
}

async function handleAddIncome(entities, rawText) {
  try {
    const amount = entities.find(e => e.type === 'AMOUNT')?.value || 0;
    const description = entities.find(e => e.type === 'DESCRIPTION')?.value || 'Voice recorded income';
    const date = entities.find(e => e.type === 'DATE')?.value || new Date().toISOString().split('T')[0];

    return {
      action: 'income_added',
      message: `Income of ₹${amount} recorded for ${description}`
    };
  } catch (error) {
    throw new Error(`Failed to add income: ${error.message}`);
  }
}

async function handleAddTransaction(entities, rawText) {
  try {
    const amount = entities.find(e => e.type === 'AMOUNT')?.value || 0;
    const description = entities.find(e => e.type === 'DESCRIPTION')?.value || 'Voice transaction';

    return {
      action: 'transaction_added',
      message: `Transaction of ₹${amount} recorded: ${description}`
    };
  } catch (error) {
    throw new Error(`Failed to add transaction: ${error.message}`);
  }
}

async function handleGenerateReport(entities) {
  try {
    const category = entities.find(e => e.type === 'CATEGORY')?.value || 'all';

    return {
      action: 'report_generated',
      category,
      message: `Generating ${category} report...`
    };
  } catch (error) {
    throw new Error(`Failed to generate report: ${error.message}`);
  }
}

async function handleQueryBalance() {
  try {
    return {
      action: 'balance_shown',
      message: 'Showing current balance...'
    };
  } catch (error) {
    throw new Error(`Failed to query balance: ${error.message}`);
  }
}

async function handleNavigate(entities) {
  try {
    const target = entities.find(e => e.type === 'DESCRIPTION')?.value || 'dashboard';

    const pageMap = {
      'dashboard': 'Dashboard',
      'transactions': 'Transactions',
      'reports': 'Reports',
      'parties': 'Parties',
      'products': 'Products',
      'expenses': 'Expenses',
      'settings': 'Settings'
    };

    const pageName = pageMap[target.toLowerCase()] || target;

    return {
      action: 'navigated',
      target: pageName,
      message: `Navigating to ${pageName}...`
    };
  } catch (error) {
    throw new Error(`Failed to navigate: ${error.message}`);
  }
}

// Cleanup function
async function cleanupVoiceServices() {
  if (voiceService) {
    await voiceService.cleanup();
    voiceService = null;
    isInitialized = false;
  }
}

module.exports = {
  setupVoiceHandlers,
  cleanupVoiceServices,
  initializeVoiceServices
};
