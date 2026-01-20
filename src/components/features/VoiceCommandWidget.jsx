import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Command,
  TrendingUp,
  Clock,
  AlertCircle
} from 'lucide-react';
import voiceCommandService from '../../services/voiceCommand';

const VoiceCommandWidget = ({ isCollapsed = false, onNavigate }) => {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [lastCommand, setLastCommand] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [volumeOn, setVolumeOn] = useState(true);
  const [language, setLanguage] = useState('en-IN');
  const [isExpanded, setIsExpanded] = useState(!isCollapsed);
  const recognitionRef = useRef(null);

  useEffect(() => {
    setSupported(voiceCommandService.supported);

    // Load stats and logs
    loadStats();
    loadRecentLogs();

    // Preload voices
    voiceCommandService.preloadVoices();

    // Set up recognition callbacks
    voiceCommandService.onResult = async (transcript, confidence) => {
      setLastCommand({ transcript, confidence, processing: true });

      const result = await voiceCommandService.processCommand(transcript, confidence);
      setLastCommand({ ...result, processing: false });

      // Execute action if matched
      if (result.action && result.action.action !== 'unknown') {
        await executeAction(result.action);
      }

      // Feedback
      if (volumeOn) {
        if (result.success) {
          await voiceCommandService.speak('Command recognized');
        } else {
          await voiceCommandService.speak('Sorry, I didn\'t understand that');
        }
      }

      loadRecentLogs();
    };

    voiceCommandService.onError = (error) => {
      console.error('Voice error:', error);
      setListening(false);
    };

    return () => {
      if (recognitionRef.current) {
        voiceCommandService.stop();
      }
    };
  }, [volumeOn]);

  const loadStats = async () => {
    try {
      const data = await voiceCommandService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load voice stats:', error);
    }
  };

  const loadRecentLogs = async () => {
    try {
      const logs = await voiceCommandService.getLogs({ limit: 5 });
      setRecentLogs(logs);
    } catch (error) {
      console.error('Failed to load voice logs:', error);
    }
  };

  const executeAction = async (action) => {
    switch (action.action) {
      case 'navigate':
        if (onNavigate) {
          onNavigate(action.target);
        }
        if (volumeOn) {
          await voiceCommandService.speak(`Navigating to ${action.target}`);
        }
        break;
      case 'report':
        if (onNavigate) {
          onNavigate(`/reports/${action.target}`);
        }
        break;
      case 'action':
        // Trigger save, cancel, etc. events
        window.dispatchEvent(new CustomEvent('voice-action', { detail: action.target }));
        break;
      default:
        break;
    }
  };

  const handleToggleListening = async () => {
    if (listening) {
      voiceCommandService.stop();
      setListening(false);
    } else {
      try {
        await voiceCommandService.start({ continuous: false, lang: language });
        setListening(true);
      } catch (error) {
        console.error('Failed to start voice recognition:', error);
        if (volumeOn) {
          await voiceCommandService.speak('Voice recognition not available');
        }
      }
    }
  };

  const handleTestVoice = async () => {
    setSpeaking(true);
    try {
      await voiceCommandService.speak('Voice commands are working correctly. Try saying "show dashboard" or "create sale".');
    } finally {
      setSpeaking(false);
    }
  };

  const commonCommands = [
    { phrase: 'Show dashboard', action: 'Navigate to home' },
    { phrase: 'Create sale', action: 'New sales transaction' },
    { phrase: 'Create purchase', action: 'New purchase transaction' },
    { phrase: 'Add expense', action: 'Record expense' },
    { phrase: 'Show parties', action: 'View customers/suppliers' },
    { phrase: 'Show products', action: 'View inventory' },
    { phrase: 'Sales report', action: 'View sales summary' },
    { phrase: 'GST report', action: 'View GST details' },
    { phrase: 'What is my cash flow', action: 'Query cash status' }
  ];

  if (!supported) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="flex items-center gap-3 text-amber-400">
          <AlertCircle size={20} />
          <div>
            <p className="font-medium">Voice commands not supported</p>
            <p className="text-xs text-slate-400">Your browser doesn't support speech recognition</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-900 rounded-xl border border-slate-800 overflow-hidden transition-all ${isExpanded ? '' : 'w-64'}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg transition-colors ${listening ? 'bg-red-500/20 animate-pulse' : 'bg-emerald-500/10'}`}>
            {listening ? <Mic size={20} className="text-red-400" /> : <Mic size={20} className="text-emerald-400" />}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Voice Commands</h2>
            <p className="text-xs text-slate-400">
              {listening ? 'Listening...' : 'Click to speak'}
            </p>
          </div>
        </div>
        {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </div>

      {isExpanded && (
        <>
          {/* Main Controls */}
          <div className="p-4">
            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={() => setVolumeOn(!volumeOn)}
                className={`p-3 rounded-full transition-colors ${
                  volumeOn ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-800 text-slate-500'
                }`}
              >
                {volumeOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>

              <button
                onClick={handleToggleListening}
                className={`p-6 rounded-full transition-all transform hover:scale-105 ${
                  listening
                    ? 'bg-red-500 shadow-lg shadow-red-500/25'
                    : 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/25'
                }`}
              >
                {listening ? <Mic size={28} className="text-white" /> : <MicOff size={28} className="text-white" />}
              </button>

              <button
                onClick={handleTestVoice}
                disabled={speaking}
                className={`p-3 rounded-full transition-colors ${
                  speaking ? 'bg-slate-700 text-slate-400' : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
              >
                <Command size={20} />
              </button>
            </div>

            {/* Last Command */}
            {lastCommand && (
              <div className={`p-3 rounded-lg mb-4 ${
                lastCommand.processing ? 'bg-amber-500/10 border border-amber-500/20' :
                lastCommand.success ? 'bg-emerald-500/10 border border-emerald-500/20' :
                'bg-red-500/10 border border-red-500/20'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  {lastCommand.processing ? (
                    <Clock size={14} className="text-amber-400" />
                  ) : lastCommand.success ? (
                    <TrendingUp size={14} className="text-emerald-400" />
                  ) : (
                    <AlertCircle size={14} className="text-red-400" />
                  )}
                  <span className={`text-xs font-medium ${
                    lastCommand.processing ? 'text-amber-400' :
                    lastCommand.success ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {lastCommand.processing ? 'Processing...' : lastCommand.success ? 'Success' : 'Not recognized'}
                  </span>
                </div>
                <p className="text-sm text-white">"{lastCommand.original || lastCommand.transcript}"</p>
              </div>
            )}

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-slate-800 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-white">{stats.total_commands}</div>
                  <div className="text-xs text-slate-400">Commands</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-emerald-400">{stats.success_rate}%</div>
                  <div className="text-xs text-slate-400">Success</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold text-blue-400">{stats.by_language?.[0]?.count || 0}</div>
                  <div className="text-xs text-slate-400">This Week</div>
                </div>
              </div>
            )}

            {/* Help Toggle */}
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center justify-between w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
            >
              <span className="flex items-center gap-2 text-slate-300">
                <HelpCircle size={16} />
                Common Commands
              </span>
              {showHelp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {/* Common Commands List */}
            {showHelp && (
              <div className="mt-2 p-3 bg-slate-800/50 rounded-lg max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  {commonCommands.map((cmd, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-white font-medium">"{cmd.phrase}"</span>
                      <span className="text-slate-400 text-xs">{cmd.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent Logs */}
          {recentLogs.length > 0 && (
            <div className="border-t border-slate-800">
              <div className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Recent Commands
              </div>
              <div className="divide-y divide-slate-800">
                {recentLogs.map((log, i) => (
                  <div key={i} className="px-4 py-2 flex items-center justify-between">
                    <span className="text-sm text-slate-300 truncate max-w-[60%]">
                      {log.transcript || log.command}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      log.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {log.success ? 'Success' : 'Failed'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VoiceCommandWidget;
