/**
 * Voice Assistant Hook
 * Provides state management and API calls for advanced voice features
 */

import { useState, useEffect, useCallback } from 'react';

const useVoiceAssistant = () => {
  const [settings, setSettings] = useState(null);
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [accentProfiles, setAccentProfiles] = useState({});
  const [currentProfile, setCurrentProfile] = useState(null);
  const [transcriptionHistory, setTranscriptionHistory] = useState([]);
  const [customPhrases, setCustomPhrases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize voice service
  const initialize = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.voice.initialize();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.voice.getSettings();
      setSettings(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update settings
  const updateSettings = useCallback(async (newSettings) => {
    try {
      setLoading(true);
      const data = await window.api.voice.updateSettings(newSettings);
      setSettings(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch supported languages
  const fetchSupportedLanguages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.voice.getSupportedLanguages();
      setSupportedLanguages(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Set language enabled
  const setLanguageEnabled = useCallback(async (languageCode, enabled) => {
    try {
      setLoading(true);
      const data = await window.api.voice.setLanguageEnabled(languageCode, enabled);
      setSupportedLanguages(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch accent profiles
  const fetchAccentProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.voice.getAccentProfiles();
      setAccentProfiles(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Save accent profile
  const saveAccentProfile = useCallback(async (userId, profileData) => {
    try {
      setLoading(true);
      const data = await window.api.voice.saveAccentProfile(userId, profileData);
      await fetchAccentProfiles();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchAccentProfiles]);

  // Get accent profile
  const getAccentProfile = useCallback(async (userId) => {
    try {
      setLoading(true);
      const data = await window.api.voice.getAccentProfile(userId);
      setCurrentProfile(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Process voice command
  const processCommand = useCallback(async (transcript, context = {}) => {
    try {
      setLoading(true);
      const data = await window.api.voice.processCommand(transcript, context);
      await fetchTranscriptionHistory();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch transcription history
  const fetchTranscriptionHistory = useCallback(async (limit = 50) => {
    try {
      setLoading(true);
      const data = await window.api.voice.getTranscriptionHistory(limit);
      setTranscriptionHistory(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear transcription history
  const clearTranscriptionHistory = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.voice.clearTranscriptionHistory();
      setTranscriptionHistory([]);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch custom phrases
  const fetchCustomPhrases = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.api.voice.getCustomPhrases();
      setCustomPhrases(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Add custom phrase
  const addCustomPhrase = useCallback(async (phrase, command, language = 'en') => {
    try {
      setLoading(true);
      const data = await window.api.voice.addCustomPhrase(phrase, command, language);
      setCustomPhrases(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Remove custom phrase
  const removeCustomPhrase = useCallback(async (index) => {
    try {
      setLoading(true);
      const data = await window.api.voice.removeCustomPhrase(index);
      setCustomPhrases(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Recognize speech
  const recognizeSpeech = useCallback(async (audioData, config = {}) => {
    try {
      setLoading(true);
      return await window.api.voice.recognizeSpeech(audioData, config);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await initialize();
        await Promise.all([
          fetchSettings(),
          fetchSupportedLanguages(),
          fetchAccentProfiles(),
          fetchTranscriptionHistory(),
          fetchCustomPhrases()
        ]);
      } catch (err) {
        console.error('Error loading initial voice data:', err);
      }
    };
    
    loadInitialData();
  }, [initialize, fetchSettings, fetchSupportedLanguages, fetchAccentProfiles, fetchTranscriptionHistory, fetchCustomPhrases]);

  return {
    // State
    settings,
    supportedLanguages,
    accentProfiles,
    currentProfile,
    transcriptionHistory,
    customPhrases,
    loading,
    error,
    
    // Actions
    initialize,
    fetchSettings,
    updateSettings,
    fetchSupportedLanguages,
    setLanguageEnabled,
    fetchAccentProfiles,
    saveAccentProfile,
    getAccentProfile,
    processCommand,
    fetchTranscriptionHistory,
    clearTranscriptionHistory,
    fetchCustomPhrases,
    addCustomPhrase,
    removeCustomPhrase,
    recognizeSpeech,
    clearError
  };
};

export default useVoiceAssistant;
