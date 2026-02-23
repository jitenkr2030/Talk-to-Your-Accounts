/**
 * Voice Settings Dashboard Component
 * Advanced voice features management including multi-language support, code-mixed commands, and accent adaptation
 */

import { useState, useEffect } from 'react';
import useVoiceAssistant from '../../hooks/useVoiceAssistant';

const VoiceSettingsDashboard = () => {
  const {
    settings,
    supportedLanguages,
    accentProfiles,
    transcriptionHistory,
    customPhrases,
    loading,
    error,
    updateSettings,
    setLanguageEnabled,
    saveAccentProfile,
    getAccentProfile,
    processCommand,
    clearTranscriptionHistory,
    addCustomPhrase,
    removeCustomPhrase,
    clearError
  } = useVoiceAssistant();

  const [activeTab, setActiveTab] = useState('languages');
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [newPhrase, setNewPhrase] = useState({ phrase: '', command: 'CUSTOM_COMMAND', language: 'en' });

  // Handle testing voice command
  const handleTestCommand = async (e) => {
    e.preventDefault();
    if (!testInput.trim()) return;
    
    try {
      const result = await processCommand(testInput, { page: 'test' });
      setTestResult(result);
    } catch (err) {
      console.error('Error testing command:', err);
    }
  };

  // Handle adding custom phrase
  const handleAddPhrase = async (e) => {
    e.preventDefault();
    if (!newPhrase.phrase.trim()) return;
    
    try {
      await addCustomPhrase(newPhrase.phrase, newPhrase.command, newPhrase.language);
      setNewPhrase({ phrase: '', command: 'CUSTOM_COMMAND', language: 'en' });
      alert('Custom phrase added successfully!');
    } catch (err) {
      console.error('Error adding phrase:', err);
    }
  };

  // Handle clearing history
  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear all transcription history?')) {
      try {
        await clearTranscriptionHistory();
        alert('History cleared successfully!');
      } catch (err) {
        console.error('Error clearing history:', err);
      }
    }
  };

  // Get language name from code
  const getLanguageName = (code) => {
    const lang = supportedLanguages.find(l => l.code === code);
    return lang ? lang.name : code;
  };

  // Get command display name
  const getCommandName = (command) => {
    const commands = {
      'CREATE_INVOICE': 'Create Invoice',
      'SHOW_BALANCE': 'Show Balance',
      'ADD_PARTY': 'Add Party/Customer',
      'CREATE_EXPENSE': 'Create Expense',
      'SHOW_REPORT': 'Show Report',
      'GST_RETURN': 'GST Return',
      'EWAY_BILL': 'E-Way Bill',
      'RECEIVE_PAYMENT': 'Receive Payment',
      'CHECK_STOCK': 'Check Stock',
      'CREATE_PURCHASE': 'Create Purchase Order',
      'NAVIGATE_DASHBOARD': 'Navigate to Dashboard',
      'NAVIGATE_INVOICES': 'Navigate to Invoices',
      'NAVIGATE_EXPENSES': 'Navigate to Expenses',
      'NAVIGATE_INVENTORY': 'Navigate to Inventory',
      'CUSTOM_COMMAND': 'Custom Command'
    };
    return commands[command] || command;
  };

  // Tab navigation items
  const tabs = [
    { id: 'languages', label: 'Languages' },
    { id: 'commands', label: 'Code-Mixed Commands' },
    { id: 'accent', label: 'Accent Profiles' },
    { id: 'custom', label: 'Custom Phrases' },
    { id: 'history', label: 'History' },
    { id: 'test', label: 'Test Voice' }
  ];

  if (loading && !settings) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Voice Features</h1>
        <p className="text-slate-400">Configure multi-language voice recognition, code-mixed commands, and accent adaptation</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400">{error}</p>
          <button onClick={clearError} className="text-sm text-red-300 hover:underline mt-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-700 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Languages Tab */}
      {activeTab === 'languages' && (
        <div className="space-y-6">
          {/* Primary Settings */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6">Language Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Primary Language</label>
                <select
                  value={settings?.primaryLanguage || 'en-IN'}
                  onChange={(e) => updateSettings({ primaryLanguage: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {supportedLanguages.filter(l => l.enabled).map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">Secondary Language</label>
                <select
                  value={settings?.secondaryLanguage || 'hi-IN'}
                  onChange={(e) => updateSettings({ secondaryLanguage: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {supportedLanguages.filter(l => l.enabled).map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="codeMixing"
                  checked={settings?.codeMixingEnabled || false}
                  onChange={(e) => updateSettings({ codeMixingEnabled: e.target.checked })}
                  className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="codeMixing" className="text-white">
                  Enable Code-Mixed Commands (Hinglish, Tanglish, etc.)
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="accentAdaptation"
                  checked={settings?.accentAdaptation || false}
                  onChange={(e) => updateSettings({ accentAdaptation: e.target.checked })}
                  className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="accentAdaptation" className="text-white">
                  Enable Accent Adaptation
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoLanguageDetection"
                  checked={settings?.autoLanguageDetection || false}
                  onChange={(e) => updateSettings({ autoLanguageDetection: e.target.checked })}
                  className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="autoLanguageDetection" className="text-white">
                  Automatic Language Detection
                </label>
              </div>
            </div>
          </div>

          {/* Supported Languages Grid */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6">Supported Languages</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {supportedLanguages.map((lang) => (
                <div key={lang.code} className="bg-slate-700/50 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{lang.name}</p>
                    <p className="text-slate-400 text-sm">{lang.script}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={lang.enabled}
                      onChange={(e) => setLanguageEnabled(lang.code, e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-600 border-slate-500 text-blue-600"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Commands Tab */}
      {activeTab === 'commands' && (
        <div className="space-y-6">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6">Code-Mixed Command Mappings</h2>
            
            <p className="text-slate-400 mb-6">
              The system automatically recognizes and processes commands in multiple languages and their combinations.
              Here's a summary of supported command patterns:
            </p>

            <div className="space-y-4">
              {/* Hindi-English (Hinglish) */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-3">Hindi-English (Hinglish)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between text-slate-300">
                    <span>"Create invoice"</span>
                    <span className="text-blue-400">→ CREATE_INVOICE</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>"Balance kya hai?"</span>
                    <span className="text-blue-400">→ SHOW_BALANCE</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>"Party add karo"</span>
                    <span className="text-blue-400">→ ADD_PARTY</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>"Expense create karo"</span>
                    <span className="text-blue-400">→ CREATE_EXPENSE</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>"GST file karo"</span>
                    <span className="text-blue-400">→ GST_RETURN</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>"E-Way bill generate karo"</span>
                    <span className="text-blue-400">→ EWAY_BILL</span>
                  </div>
                </div>
              </div>

              {/* Tamil-English (Tanglish) */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-3">Tamil-English (Tanglish)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between text-slate-300">
                    <span>"Invoice pannu"</span>
                    <span className="text-blue-400">→ CREATE_INVOICE</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>"Balance enna"</span>
                    <span className="text-blue-400">→ SHOW_BALANCE</span>
                  </div>
                </div>
              </div>

              {/* Telugu-English */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-3">Telugu-English</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between text-slate-300">
                    <span>"Invoice cheyyandi"</span>
                    <span className="text-blue-400">→ CREATE_INVOICE</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>"Balance emiti"</span>
                    <span className="text-blue-400">→ SHOW_BALANCE</span>
                  </div>
                </div>
              </div>

              {/* English */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-3">English</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between text-slate-300">
                    <span>"Create invoice"</span>
                    <span className="text-blue-400">→ CREATE_INVOICE</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>"Show balance"</span>
                    <span className="text-blue-400">→ SHOW_BALANCE</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>"Add expense"</span>
                    <span className="text-blue-400">→ CREATE_EXPENSE</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>"Go to dashboard"</span>
                    <span className="text-blue-400">→ NAVIGATE_DASHBOARD</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accent Profiles Tab */}
      {activeTab === 'accent' && (
        <div className="space-y-6">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6">Accent Adaptation</h2>
            
            <p className="text-slate-400 mb-6">
              Enable accent adaptation to improve recognition accuracy for individual users. 
              The system learns from your voice patterns over time.
            </p>

            {Object.keys(accentProfiles).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400">No accent profiles saved yet.</p>
                <p className="text-slate-500 text-sm mt-2">
                  The system will automatically create profiles as you use voice commands.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(accentProfiles).map(([userId, profile]) => (
                  <div key={userId} className="bg-slate-700/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{profile.userName || userId}</span>
                      <span className="text-green-400 text-sm">Active</span>
                    </div>
                    <p className="text-slate-400 text-sm">
                      Last updated: {new Date(profile.lastUpdated).toLocaleDateString()}
                    </p>
                    <p className="text-slate-400 text-sm">
                      Commands: {profile.commandCount || 0}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-blue-400 text-sm">
                <strong>Tip:</strong> To improve recognition accuracy, speak naturally and use consistent phrasing. 
                The system adapts to your unique pronunciation patterns over time.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Custom Phrases Tab */}
      {activeTab === 'custom' && (
        <div className="space-y-6">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6">Add Custom Phrase</h2>
            
            <form onSubmit={handleAddPhrase} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Custom Phrase</label>
                <input
                  type="text"
                  value={newPhrase.phrase}
                  onChange={(e) => setNewPhrase({ ...newPhrase, phrase: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter custom phrase (e.g., 'my invoice')"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Command</label>
                  <select
                    value={newPhrase.command}
                    onChange={(e) => setNewPhrase({ ...newPhrase, command: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="CREATE_INVOICE">Create Invoice</option>
                    <option value="SHOW_BALANCE">Show Balance</option>
                    <option value="ADD_PARTY">Add Party/Customer</option>
                    <option value="CREATE_EXPENSE">Create Expense</option>
                    <option value="SHOW_REPORT">Show Report</option>
                    <option value="GST_RETURN">GST Return</option>
                    <option value="EWAY_BILL">E-Way Bill</option>
                    <option value="RECEIVE_PAYMENT">Receive Payment</option>
                    <option value="CHECK_STOCK">Check Stock</option>
                    <option value="NAVIGATE_DASHBOARD">Navigate to Dashboard</option>
                    <option value="CUSTOM_COMMAND">Custom Command</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-sm mb-2">Language</label>
                  <select
                    value={newPhrase.language}
                    onChange={(e) => setNewPhrase({ ...newPhrase, language: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="en">English</option>
                    <option value="hinglish">Hinglish</option>
                    <option value="tanglish">Tanglish</option>
                    <option value="teluglish">Teluglish</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Add Custom Phrase
              </button>
            </form>
          </div>

          {/* Custom Phrases List */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6">Custom Phrases</h2>
            
            {customPhrases.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No custom phrases added yet</p>
            ) : (
              <div className="space-y-2">
                {customPhrases.map((phrase, index) => (
                  <div key={index} className="bg-slate-700/50 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <p className="text-white">"{phrase.phrase}"</p>
                      <p className="text-slate-400 text-sm">
                        → {getCommandName(phrase.command)} ({phrase.language})
                      </p>
                    </div>
                    <button
                      onClick={() => removeCustomPhrase(index)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">Transcription History</h2>
            <button
              onClick={handleClearHistory}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Clear History
            </button>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            {transcriptionHistory.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No transcription history yet</p>
            ) : (
              <div className="space-y-3">
                {transcriptionHistory.slice(0, 20).map((item, index) => (
                  <div key={index} className="bg-slate-700/50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-white font-medium">{item.originalTranscript}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.isCodeMixed ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {item.isCodeMixed ? 'Code-Mixed' : item.detectedLanguage}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-slate-400">Detected: </span>
                        <span className="text-white">{getLanguageName(item.detectedLanguage)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Command: </span>
                        <span className="text-green-400">{getCommandName(item.command)}</span>
                      </div>
                      {Object.keys(item.entities).length > 0 && (
                        <div className="col-span-2">
                          <span className="text-slate-400">Entities: </span>
                          <span className="text-slate-300">{JSON.stringify(item.entities)}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-slate-500 text-xs mt-2">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Test Voice Tab */}
      {activeTab === 'test' && (
        <div className="max-w-2xl">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-6">Test Voice Command</h2>
            
            <form onSubmit={handleTestCommand} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Enter Command (or speak)</label>
                <input
                  type="text"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Try: 'Create invoice for 5000 rupees' or 'Invoice create karo 5000 ke liye'"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                Process Command
              </button>
            </form>

            {testResult && (
              <div className="mt-6 space-y-4">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-white font-medium mb-2">Analysis Results</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Original:</span>
                      <span className="text-white">{testResult.originalTranscript}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Detected Language:</span>
                      <span className="text-white">{getLanguageName(testResult.detectedLanguage)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Code-Mixed:</span>
                      <span className={testResult.isCodeMixed ? 'text-purple-400' : 'text-slate-400'}>
                        {testResult.isCodeMixed ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Confidence:</span>
                      <span className="text-white">{(testResult.confidence * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Command:</span>
                      <span className="text-green-400">{getCommandName(testResult.command)}</span>
                    </div>
                    {testResult.processedText !== testResult.originalTranscript && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Normalized:</span>
                        <span className="text-white">{testResult.processedText}</span>
                      </div>
                    )}
                    {Object.keys(testResult.entities).length > 0 && (
                      <div>
                        <span className="text-slate-400">Extracted Entities:</span>
                        <pre className="text-slate-300 text-xs mt-1 bg-slate-800 p-2 rounded overflow-x-auto">
                          {JSON.stringify(testResult.entities, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceSettingsDashboard;
