import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';

// Voice Context State
const initialState = {
  // Status
  status: 'IDLE', // IDLE, LISTENING, PROCESSING, ERROR
  isListening: false,
  isEnabled: true,
  
  // Transcript
  transcript: '',
  partialTranscript: '',
  
  // Command
  lastCommand: null,
  pendingCommand: null,
  commandHistory: [],
  
  // Settings
  settings: {
    language: 'en',
    hotkey: 'CommandOrControl+Shift+V',
    autoPunctuation: true,
    partialResults: true,
    noiseThreshold: 0.02
  },
  
  // Models
  models: [],
  currentModel: null,
  downloadingModel: null,
  downloadProgress: 0,
  
  // Dictionary
  dictionary: [],
  dictionaryCategories: [],
  
  // Audio
  audioLevel: 0,
  isSilent: true,
  
  // Error
  error: null,
  
  // Initialization
  isInitialized: false,
  isLoading: true
};

// Action Types
const ACTION_TYPES = {
  SET_LOADING: 'SET_LOADING',
  SET_INITIALIZED: 'SET_INITIALIZED',
  SET_STATUS: 'SET_STATUS',
  SET_LISTENING: 'SET_LISTENING',
  SET_ENABLED: 'SET_ENABLED',
  SET_TRANSCRIPT: 'SET_TRANSCRIPT',
  SET_PARTIAL_TRANSCRIPT: 'SET_PARTIAL_TRANSCRIPT',
  SET_LAST_COMMAND: 'SET_LAST_COMMAND',
  SET_PENDING_COMMAND: 'SET_PENDING_COMMAND',
  ADD_TO_HISTORY: 'ADD_TO_HISTORY',
  CLEAR_HISTORY: 'CLEAR_HISTORY',
  SET_SETTINGS: 'SET_SETTINGS',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  SET_MODELS: 'SET_MODELS',
  SET_CURRENT_MODEL: 'SET_CURRENT_MODEL',
  SET_DOWNLOADING_MODEL: 'SET_DOWNLOADING_MODEL',
  SET_DOWNLOAD_PROGRESS: 'SET_DOWNLOAD_PROGRESS',
  SET_DICTIONARY: 'SET_DICTIONARY',
  SET_DICTIONARY_CATEGORIES: 'SET_DICTIONARY_CATEGORIES',
  ADD_DICTIONARY_TERM: 'ADD_DICTIONARY_TERM',
  REMOVE_DICTIONARY_TERM: 'REMOVE_DICTIONARY_TERM',
  SET_AUDIO_LEVEL: 'SET_AUDIO_LEVEL',
  SET_SILENT: 'SET_SILENT',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Reducer
function voiceReducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.SET_LOADING:
      return { ...state, isLoading: action.payload };
      
    case ACTION_TYPES.SET_INITIALIZED:
      return { ...state, isInitialized: action.payload, isLoading: false };
      
    case ACTION_TYPES.SET_STATUS:
      return { ...state, status: action.payload };
      
    case ACTION_TYPES.SET_LISTENING:
      return { ...state, isListening: action.payload, status: action.payload ? 'LISTENING' : state.status };
      
    case ACTION_TYPES.SET_ENABLED:
      return { ...state, isEnabled: action.payload };
      
    case ACTION_TYPES.SET_TRANSCRIPT:
      return { ...state, transcript: action.payload };
      
    case ACTION_TYPES.SET_PARTIAL_TRANSCRIPT:
      return { ...state, partialTranscript: action.payload };
      
    case ACTION_TYPES.SET_LAST_COMMAND:
      return { ...state, lastCommand: action.payload };
      
    case ACTION_TYPES.SET_PENDING_COMMAND:
      return { ...state, pendingCommand: action.payload };
      
    case ACTION_TYPES.ADD_TO_HISTORY:
      return { 
        ...state, 
        commandHistory: [action.payload, ...state.commandHistory].slice(0, 50) 
      };
      
    case ACTION_TYPES.CLEAR_HISTORY:
      return { ...state, commandHistory: [] };
      
    case ACTION_TYPES.SET_SETTINGS:
      return { ...state, settings: action.payload };
      
    case ACTION_TYPES.UPDATE_SETTINGS:
      return { 
        ...state, 
        settings: { ...state.settings, ...action.payload }
      };
      
    case ACTION_TYPES.SET_MODELS:
      return { ...state, models: action.payload };
      
    case ACTION_TYPES.SET_CURRENT_MODEL:
      return { ...state, currentModel: action.payload };
      
    case ACTION_TYPES.SET_DOWNLOADING_MODEL:
      return { ...state, downloadingModel: action.payload };
      
    case ACTION_TYPES.SET_DOWNLOAD_PROGRESS:
      return { ...state, downloadProgress: action.payload };
      
    case ACTION_TYPES.SET_DICTIONARY:
      return { ...state, dictionary: action.payload };
      
    case ACTION_TYPES.SET_DICTIONARY_CATEGORIES:
      return { ...state, dictionaryCategories: action.payload };
      
    case ACTION_TYPES.ADD_DICTIONARY_TERM:
      return { 
        ...state, 
        dictionary: [...state.dictionary, action.payload] 
      };
      
    case ACTION_TYPES.REMOVE_DICTIONARY_TERM:
      return { 
        ...state, 
        dictionary: state.dictionary.filter(term => term.id !== action.payload) 
      };
      
    case ACTION_TYPES.SET_AUDIO_LEVEL:
      return { ...state, audioLevel: action.payload };
      
    case ACTION_TYPES.SET_SILENT:
      return { ...state, isSilent: action.payload };
      
    case ACTION_TYPES.SET_ERROR:
      return { ...state, error: action.payload, status: 'ERROR' };
      
    case ACTION_TYPES.CLEAR_ERROR:
      return { ...state, error: null, status: 'IDLE' };
      
    default:
      return state;
  }
}

// Create Context
const VoiceContext = createContext(null);

// Provider Component
export function VoiceProvider({ children }) {
  const [state, dispatch] = useReducer(voiceReducer, initialState);
  const cleanupRef = useRef([]);
  
  // Initialize voice module
  useEffect(() => {
    const initVoice = async () => {
      try {
        dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true });
        
        // Check if voice API is available
        if (!window.voiceAPI) {
          throw new Error('Voice API not available');
        }
        
        // Load settings
        const settingsResult = await window.voiceAPI.getSettings();
        if (settingsResult.success) {
          dispatch({ type: ACTION_TYPES.SET_SETTINGS, payload: settingsResult.settings });
        }
        
        // Load models
        const modelsResult = await window.voiceAPI.getModels();
        if (modelsResult.success) {
          dispatch({ type: ACTION_TYPES.SET_MODELS, payload: modelsResult.models });
        }
        
        // Load dictionary
        const dictResult = await window.voiceAPI.getDictionary();
        if (dictResult.success) {
          dispatch({ type: ACTION_TYPES.SET_DICTIONARY, payload: dictResult.terms });
        }
        
        // Load history
        const historyResult = await window.voiceAPI.getHistory();
        if (historyResult.success) {
          dispatch({ type: ACTION_TYPES.ADD_TO_HISTORY, payload: historyResult.history });
        }
        
        // Setup event listeners
        const cleanupFunctions = [];
        
        cleanupFunctions.push(window.voiceAPI.onStatusChange((data) => {
          if (data.state) {
            dispatch({ type: ACTION_TYPES.SET_STATUS, payload: data.state.status });
            dispatch({ type: ACTION_TYPES.SET_LISTENING, payload: data.state.isListening });
          }
        }));
        
        cleanupFunctions.push(window.voiceAPI.onListeningStarted((data) => {
          dispatch({ type: ACTION_TYPES.SET_STATUS, payload: 'LISTENING' });
          dispatch({ type: ACTION_TYPES.SET_LISTENING, payload: true });
          dispatch({ type: ACTION_TYPES.SET_TRANSCRIPT, payload: '' });
          dispatch({ type: ACTION_TYPES.SET_PARTIAL_TRANSCRIPT, payload: '' });
        }));
        
        cleanupFunctions.push(window.voiceAPI.onListeningStopped((data) => {
          dispatch({ type: ACTION_TYPES.SET_LISTENING, payload: false });
        }));
        
        cleanupFunctions.push(window.voiceAPI.onPartialTranscription((data) => {
          dispatch({ type: ACTION_TYPES.SET_PARTIAL_TRANSCRIPT, payload: data.text });
        }));
        
        cleanupFunctions.push(window.voiceAPI.onTranscriptionComplete((data) => {
          dispatch({ type: ACTION_TYPES.SET_TRANSCRIPT, payload: data.text });
          dispatch({ type: ACTION_TYPES.SET_STATUS, payload: 'IDLE' });
        }));
        
        cleanupFunctions.push(window.voiceAPI.onCommandReady((command) => {
          dispatch({ type: ACTION_TYPES.SET_PENDING_COMMAND, payload: command });
          dispatch({ type: ACTION_TYPES.SET_LAST_COMMAND, payload: command });
          dispatch({ type: ACTION_TYPES.ADD_TO_HISTORY, payload: command });
        }));
        
        cleanupFunctions.push(window.voiceAPI.onCommandParsed((command) => {
          dispatch({ type: ACTION_TYPES.SET_LAST_COMMAND, payload: command });
          dispatch({ type: ACTION_TYPES.ADD_TO_HISTORY, payload: command });
        }));
        
        cleanupFunctions.push(window.voiceAPI.onAudioLevel((data) => {
          dispatch({ type: ACTION_TYPES.SET_AUDIO_LEVEL, payload: data.level });
          dispatch({ type: ACTION_TYPES.SET_SILENT, payload: data.isSilent });
        }));
        
        cleanupFunctions.push(window.voiceAPI.onError((error) => {
          dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message || 'Voice error occurred' });
        }));
        
        cleanupFunctions.push(window.voiceAPI.onModelChanged((model) => {
          dispatch({ type: ACTION_TYPES.SET_CURRENT_MODEL, payload: model });
          dispatch({ type: ACTION_TYPES.SET_MODELS, payload: state.models.map(m => 
            m.id === model.id ? { ...m, isDownloaded: true } : m
          )});
        }));
        
        cleanupFunctions.push(window.voiceAPI.onDownloadProgress((data) => {
          dispatch({ type: ACTION_TYPES.SET_DOWNLOAD_PROGRESS, payload: data.progress });
        }));
        
        cleanupFunctions.push(window.voiceAPI.onHistoryUpdated((history) => {
          dispatch({ type: ACTION_TYPES.CLEAR_HISTORY });
          history.forEach(cmd => {
            dispatch({ type: ACTION_TYPES.ADD_TO_HISTORY, payload: cmd });
          });
        }));
        
        // Store cleanup functions
        cleanupRef.current = cleanupFunctions;
        
        dispatch({ type: ACTION_TYPES.SET_INITIALIZED, payload: true });
      } catch (error) {
        // Gracefully handle initialization errors - voice is optional
        console.warn('Voice initialization warning:', error.message);
        dispatch({ type: ACTION_TYPES.SET_ERROR, payload: null }); // Don't set error for optional features
        dispatch({ type: ACTION_TYPES.SET_INITIALIZED, payload: true }); // Mark as initialized anyway
      }
    };
    
    initVoice();
    
    // Cleanup on unmount
    return () => {
      cleanupRef.current.forEach(cleanup => cleanup && cleanup());
    };
  }, []);
  
  // Voice Actions
  const startListening = useCallback(async () => {
    try {
      dispatch({ type: ACTION_TYPES.CLEAR_ERROR });
      const result = await window.voiceAPI.startListening();
      if (!result.success) {
        throw new Error(result.error || 'Failed to start listening');
      }
    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
    }
  }, []);
  
  const stopListening = useCallback(async () => {
    try {
      const result = await window.voiceAPI.stopListening();
      dispatch({ type: ACTION_TYPES.SET_LISTENING, payload: false });
      return result;
    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
      return null;
    }
  }, []);
  
  const toggleListening = useCallback(async () => {
    try {
      if (state.isListening) {
        return await stopListening();
      } else {
        await startListening();
        return true;
      }
    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
      return null;
    }
  }, [state.isListening, startListening, stopListening]);
  
  const cancelRecording = useCallback(async () => {
    try {
      await window.voiceAPI.cancelRecording();
      dispatch({ type: ACTION_TYPES.SET_LISTENING, payload: false });
      dispatch({ type: ACTION_TYPES.SET_PARTIAL_TRANSCRIPT, payload: '' });
      dispatch({ type: ACTION_TYPES.SET_TRANSCRIPT, payload: '' });
    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
    }
  }, []);
  
  const confirmCommand = useCallback(async (command) => {
    try {
      dispatch({ type: ACTION_TYPES.SET_PENDING_COMMAND, payload: null });
      const result = await window.voiceAPI.confirmCommand(command);
      if (result.success) {
        dispatch({ type: ACTION_TYPES.SET_STATUS, payload: 'IDLE' });
      }
      return result;
    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
      return { success: false, error: error.message };
    }
  }, []);
  
  const dismissCommand = useCallback(() => {
    dispatch({ type: ACTION_TYPES.SET_PENDING_COMMAND, payload: null });
  }, []);
  
  const updateSettings = useCallback(async (settings) => {
    try {
      dispatch({ type: ACTION_TYPES.UPDATE_SETTINGS, payload: settings });
      await window.voiceAPI.saveSettings(settings);
    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
    }
  }, []);
  
  const setEnabled = useCallback(async (enabled) => {
    try {
      dispatch({ type: ACTION_TYPES.SET_ENABLED, payload: enabled });
      await window.voiceAPI.setEnabled(enabled);
    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
    }
  }, []);
  
  const setLanguage = useCallback(async (language) => {
    try {
      dispatch({ type: ACTION_TYPES.UPDATE_SETTINGS, payload: { language } });
      await window.voiceAPI.setLanguage(language);
    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
    }
  }, []);
  
  const setModel = useCallback(async (modelId) => {
    try {
      await window.voiceAPI.setModel(modelId);
      dispatch({ type: ACTION_TYPES.SET_CURRENT_MODEL, payload: state.models.find(m => m.id === modelId) });
    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
    }
  }, [state.models]);
  
  const downloadModel = useCallback(async (modelId) => {
    try {
      dispatch({ type: ACTION_TYPES.SET_DOWNLOADING_MODEL, payload: modelId });
      dispatch({ type: ACTION_TYPES.SET_DOWNLOAD_PROGRESS, payload: 0 });
      
      await window.voiceAPI.downloadModel(modelId);
      
      dispatch({ type: ACTION_TYPES.SET_DOWNLOADING_MODEL, payload: null });
      
      // Refresh models list
      const modelsResult = await window.voiceAPI.getModels();
      if (modelsResult.success) {
        dispatch({ type: ACTION_TYPES.SET_MODELS, payload: modelsResult.models });
      }
    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
      dispatch({ type: ACTION_TYPES.SET_DOWNLOADING_MODEL, payload: null });
    }
  }, []);
  
  const addDictionaryTerm = useCallback(async (spoken, mapped, category) => {
    try {
      const result = await window.voiceAPI.addTerm(spoken, mapped, category);
      if (result.success) {
        dispatch({ type: ACTION_TYPES.ADD_DICTIONARY_TERM, payload: result.term });
      }
      return result;
    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
      return { success: false, error: error.message };
    }
  }, []);
  
  const removeDictionaryTerm = useCallback(async (id) => {
    try {
      await window.voiceAPI.removeTerm(id);
      dispatch({ type: ACTION_TYPES.REMOVE_DICTIONARY_TERM, payload: id });
    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
    }
  }, []);
  
  const clearHistory = useCallback(async () => {
    try {
      await window.voiceAPI.clearHistory();
      dispatch({ type: ACTION_TYPES.CLEAR_HISTORY });
    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
    }
  }, []);
  
  const retryLastCommand = useCallback(async () => {
    try {
      await window.voiceAPI.retryLast();
    } catch (error) {
      dispatch({ type: ACTION_TYPES.SET_ERROR, payload: error.message });
    }
  }, []);
  
  const clearError = useCallback(() => {
    dispatch({ type: ACTION_TYPES.CLEAR_ERROR });
  }, []);
  
  // Value object
  const value = {
    state,
    actions: {
      startListening,
      stopListening,
      toggleListening,
      cancelRecording,
      confirmCommand,
      dismissCommand,
      updateSettings,
      setEnabled,
      setLanguage,
      setModel,
      downloadModel,
      addDictionaryTerm,
      removeDictionaryTerm,
      clearHistory,
      retryLastCommand,
      clearError
    }
  };
  
  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  );
}

// Hook
export function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
}

// Selector hooks for specific state slices
export function useVoiceStatus() {
  const { state } = useVoice();
  return {
    status: state.status,
    isListening: state.isListening,
    isEnabled: state.isEnabled,
    isInitialized: state.isInitialized,
    isLoading: state.isLoading
  };
}

export function useVoiceTranscript() {
  const { state } = useVoice();
  return {
    transcript: state.transcript,
    partialTranscript: state.partialTranscript,
    audioLevel: state.audioLevel,
    isSilent: state.isSilent
  };
}

export function useVoiceCommand() {
  const { state, actions } = useVoice();
  return {
    lastCommand: state.lastCommand,
    pendingCommand: state.pendingCommand,
    commandHistory: state.commandHistory,
    confirmCommand: actions.confirmCommand,
    dismissCommand: actions.dismissCommand,
    retryLastCommand: actions.retryLastCommand
  };
}

export function useVoiceSettings() {
  const { state, actions } = useVoice();
  return {
    settings: state.settings,
    models: state.models,
    currentModel: state.currentModel,
    downloadingModel: state.downloadingModel,
    downloadProgress: state.downloadProgress,
    dictionary: state.dictionary,
    updateSettings: actions.updateSettings,
    setEnabled: actions.setEnabled,
    setLanguage: actions.setLanguage,
    setModel: actions.setModel,
    downloadModel: actions.downloadModel
  };
}

export function useVoiceError() {
  const { state, actions } = useVoice();
  return {
    error: state.error,
    clearError: actions.clearError
  };
}

export default VoiceContext;
