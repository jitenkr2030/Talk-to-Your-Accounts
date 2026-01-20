import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Mic,
  MicOff,
  Settings,
  X,
  ChevronDown,
  ChevronUp,
  Command,
  Clock,
  CheckCircle,
  AlertCircle,
  Volume2,
  VolumeX,
  Download,
  Activity,
  Sparkles
} from 'lucide-react';
import { useVoice, useVoiceStatus, useVoiceTranscript, useVoiceCommand, useVoiceSettings, useVoiceError } from './VoiceContext';

// Audio Visualizer Component
function AudioVisualizer({ level, isActive }) {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const bars = 5;
    const barWidth = 4;
    const gap = 3;
    
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (!isActive) {
        // Draw idle state
        ctx.fillStyle = '#3B82F6';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 8, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      
      // Draw animated bars
      for (let i = 0; i < bars; i++) {
        const height = Math.max(4, level * 50 * (0.5 + i * 0.15));
        const x = 8 + i * (barWidth + gap);
        const y = (canvas.height - height) / 2;
        
        // Gradient color based on height
        const hue = 200 + (level * 60);
        ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
        
        // Rounded bars
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, height, 2);
        ctx.fill();
      }
      
      requestAnimationFrame(draw);
    }
    
    draw();
  }, [level, isActive]);
  
  return (
    <canvas 
      ref={canvasRef} 
      width={50} 
      height={24} 
      className="flex-shrink-0"
    />
  );
}

// Command Display Component
function CommandDisplay({ transcript, partialTranscript, status }) {
  if (status === 'IDLE' && !transcript) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
          <Mic className="w-6 h-6 text-blue-400" />
        </div>
        <p className="text-sm text-slate-400">Click to speak</p>
        <p className="text-xs text-slate-500 mt-1">Press ⌘+⇧+V to start</p>
      </div>
    );
  }
  
  if (status === 'PROCESSING') {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-2 animate-pulse">
          <Activity className="w-6 h-6 text-amber-400" />
        </div>
        <p className="text-sm text-amber-400">Processing...</p>
      </div>
    );
  }
  
  if (partialTranscript) {
    return (
      <div className="p-3 bg-slate-800/50 rounded-lg">
        <p className="text-sm text-blue-400 animate-pulse">{partialTranscript}</p>
        <p className="text-xs text-slate-500 mt-1">Listening...</p>
      </div>
    );
  }
  
  if (transcript) {
    return (
      <div className="p-3 bg-slate-800/50 rounded-lg">
        <p className="text-sm text-white">"{transcript}"</p>
        <p className="text-xs text-emerald-400 mt-1">Command recognized</p>
      </div>
    );
  }
  
  return null;
}

// Main Voice Widget Component
export default function VoiceWidget({ 
  position = 'bottom-right',
  showSettings = true,
  compact = false,
  onNavigate 
}) {
  const { state, actions } = useVoice();
  const { status, isListening, isEnabled, isInitialized, isLoading } = useVoiceStatus();
  const { transcript, partialTranscript, audioLevel, isSilent } = useVoiceTranscript();
  const { pendingCommand, confirmCommand, dismissCommand } = useVoiceCommand();
  const { error, clearError } = useVoiceError();
  
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Handle pending command confirmation
  useEffect(() => {
    if (pendingCommand && pendingCommand.requiresConfirmation) {
      setShowConfirmDialog(true);
    }
  }, [pendingCommand]);
  
  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        actions.toggleListening();
      }
      if (e.key === 'Escape') {
        if (isListening) {
          actions.cancelRecording();
        } else if (showConfirmDialog) {
          setShowConfirmDialog(false);
          dismissCommand();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListening, showConfirmDialog, actions, dismissCommand]);
  
  // Position styles
  const positionStyles = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };
  
  // Status colors
  const statusColors = {
    IDLE: 'bg-slate-700 hover:bg-slate-600 border-slate-600',
    LISTENING: 'bg-red-500 animate-pulse shadow-lg shadow-red-500/30 border-red-400',
    PROCESSING: 'bg-amber-500 shadow-lg shadow-amber-500/30 border-amber-400',
    ERROR: 'bg-red-600 shadow-lg shadow-red-500/30 border-red-500'
  };
  
  const statusIconColors = {
    IDLE: 'text-blue-400',
    LISTENING: 'text-white',
    PROCESSING: 'text-white',
    ERROR: 'text-white'
  };
  
  // Handle command confirmation
  const handleConfirm = async () => {
    setShowConfirmDialog(false);
    await confirmCommand(pendingCommand);
  };
  
  const handleDismiss = () => {
    setShowConfirmDialog(false);
    dismissCommand();
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className={`fixed ${positionStyles[position]} z-50`}>
        <div className="bg-slate-800 rounded-full p-3 shadow-lg border border-slate-700">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }
  
  // Not initialized or disabled
  if (!isInitialized || !isEnabled) {
    return (
      <div className={`fixed ${positionStyles[position]} z-50`}>
        <div className="bg-slate-800/90 backdrop-blur rounded-xl p-4 shadow-lg border border-slate-700">
          <div className="flex items-center gap-3">
            <MicOff className="w-5 h-5 text-slate-500" />
            <div>
              <p className="text-sm text-white font-medium">Voice Disabled</p>
              <p className="text-xs text-slate-500">Enable in settings</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div className={`fixed ${positionStyles[position]} z-50 transition-all duration-300`}>
        {/* Expanded Content */}
        {isExpanded && (
          <div className="absolute bottom-16 right-0 w-80 bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700 overflow-hidden mb-2">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-white">Voice Commands</span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 text-slate-400 hover:text-white rounded transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            
            {/* Command Display */}
            <div className="p-4">
              <CommandDisplay 
                transcript={transcript}
                partialTranscript={partialTranscript}
                status={status}
              />
              
              {/* Audio Visualizer */}
              {isListening && (
                <div className="mt-4 p-3 bg-slate-800/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AudioVisualizer level={audioLevel} isActive={isListening && !isSilent} />
                    <div className="flex-1">
                      <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-75"
                          style={{ width: `${Math.min(audioLevel * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Quick Actions */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  { label: 'Add Expense', icon: '➖', action: 'add expense' },
                  { label: 'Add Income', icon: '➕', action: 'add income' },
                  { label: 'Show Report', icon: '📊', action: 'show report' },
                  { label: 'Check Balance', icon: '💰', action: 'check balance' }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => actions.toggleListening()}
                    className="flex items-center gap-2 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
                  >
                    <span>{item.icon}</span>
                    <span className="text-slate-300">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-4 py-2 bg-slate-800/30 border-t border-slate-700">
              <p className="text-xs text-slate-500 text-center">
                Try: "Add expense 500 for groceries"
              </p>
            </div>
          </div>
        )}
        
        {/* Main Widget Button */}
        <div className="flex items-center gap-2">
          {/* Toggle Button */}
          <button
            onClick={() => isExpanded ? actions.toggleListening() : setIsExpanded(true)}
            className={`relative flex items-center justify-center w-14 h-14 rounded-full border-2 transition-all duration-200 ${statusColors[status]}`}
          >
            {isListening ? (
              <>
                <div className="absolute inset-0 rounded-full animate-ping bg-red-500/30" />
                <Mic className={`w-6 h-6 ${statusIconColors[status]}`} />
              </>
            ) : (
              <Mic className={`w-6 h-6 ${statusIconColors[status]}`} />
            )}
            
            {/* Status indicator */}
            <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
              isListening ? 'bg-red-500 animate-pulse' : 
              status === 'PROCESSING' ? 'bg-amber-500 animate-pulse' :
              'bg-green-500'
            }`} />
          </button>
          
          {/* Settings Button */}
          {showSettings && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-full border border-slate-700 transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              {!compact && <span className="text-sm text-slate-300">Voice</span>}
            </button>
          )}
        </div>
      </div>
      
      {/* Confirmation Dialog */}
      {showConfirmDialog && pendingCommand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Confirm Voice Command</h3>
            </div>
            
            <div className="p-4">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-4">
                <p className="text-white font-medium">"{pendingCommand.rawText}"</p>
                <p className="text-xs text-blue-400 mt-1">
                  Intent: {pendingCommand.intent?.replace(/_/g, ' ')}
                </p>
              </div>
              
              {/* Extracted entities */}
              {pendingCommand.entities?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 uppercase">Detected Information</p>
                  <div className="flex flex-wrap gap-2">
                    {pendingCommand.entities.map((entity, idx) => (
                      <span 
                        key={idx}
                        className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300"
                      >
                        {entity.type}: {entity.value}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <p className="text-sm text-slate-400 mt-4">
                {pendingCommand.suggestedResponse}
              </p>
            </div>
            
            <div className="flex gap-3 p-4 border-t border-slate-700 bg-slate-800/50">
              <button
                onClick={handleDismiss}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-24 right-6 z-50">
          <div className="flex items-center gap-3 px-4 py-3 bg-red-500/90 backdrop-blur rounded-lg shadow-lg text-white">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">{error}</p>
            <button onClick={clearError} className="ml-2 p-1 hover:bg-red-400/30 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Compact version for sidebar or header
export function VoiceButton({ onClick, isListening }) {
  return (
    <button
      onClick={onClick}
      className={`relative p-2 rounded-lg transition-all ${
        isListening 
          ? 'bg-red-500 text-white animate-pulse' 
          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
      }`}
    >
      {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
      
      {isListening && (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
      )}
    </button>
  );
}
