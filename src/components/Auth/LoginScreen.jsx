import { useState, useEffect, useCallback } from 'react';
import { voiceManager } from '../../services/voiceManager';

const LoginScreen = ({ onLogin, onSetupComplete }) => {
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [showUsername, setShowUsername] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', pin: '', role: 'editor' });
  const [isFirstRun, setIsFirstRun] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    // Check if this is first run
    checkFirstRun();
    
    // Listen for audio levels
    voiceManager.onAudioLevelChange((level) => setAudioLevel(level));
  }, []);

  const checkFirstRun = async () => {
    try {
      const result = await window.api.auth?.getUsers?.() || { users: [] };
      if (result.users && result.users.length === 0) {
        setIsFirstRun(true);
        setShowSetup(true);
      } else {
        setUsers(result.users || []);
      }
    } catch (error) {
      // Default to setup mode on error
      setIsFirstRun(true);
      setShowSetup(true);
    }
  };

  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      setShowUsername(false);
    }
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      triggerShake();
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await window.api.auth?.authenticate?.(username, pin) || { success: false, error: 'AUTH_NOT_AVAILABLE' };
      
      if (result.success) {
        // Store session data
        localStorage.setItem('sessionToken', result.session.token);
        localStorage.setItem('currentUser', JSON.stringify(result.session));
        
        // Speak welcome message
        voiceManager.speak(`Welcome back, ${result.session.username}. Login successful.`);
        
        onLogin?.(result.session);
      } else {
        setError(result.message || 'Authentication failed');
        triggerShake();
        
        // Speak error
        if (result.error === 'ACCOUNT_LOCKED') {
          voiceManager.speak('Account is locked. Please try again later.');
        } else {
          voiceManager.speak('Invalid PIN. Please try again.');
        }
      }
    } catch (error) {
      setError('Authentication service unavailable');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDigitPress = (digit) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit);
      setError('');
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleVoiceInput = async () => {
    try {
      const transcript = await voiceManager.listen({ lang: 'en-IN' });
      if (transcript) {
        // Try to extract PIN from voice
        const pinMatch = transcript.match(/\d{4}/);
        if (pinMatch) {
          setPin(pinMatch[0]);
        } else {
          voiceManager.speak('Please say your 4-digit PIN clearly.');
        }
      }
    } catch (error) {
      voiceManager.speak('Could not understand. Please try again.');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    if (newUser.username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    
    if (!/^\d{4}$/.test(newUser.pin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await window.api.auth?.createUser?.(newUser) || { success: false, error: 'SERVICE_UNAVAILABLE' };
      
      if (result.success) {
        voiceManager.speak('User created successfully. Please login.');
        setShowSetup(false);
        setNewUser({ username: '', pin: '', role: 'editor' });
        setUsername(newUser.username);
      } else {
        setError(result.message || 'Failed to create user');
      }
    } catch (error) {
      setError('Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupComplete = async () => {
    if (!newUser.username || !newUser.pin) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await window.api.auth?.createUser?.(newUser) || { success: false, error: 'SERVICE_UNAVAILABLE' };
      
      if (result.success) {
        voiceManager.speak('Setup complete. Your admin account is ready.');
        setShowSetup(false);
        setIsFirstRun(false);
        setUsername(newUser.username);
      } else {
        setError(result.message || 'Setup failed');
      }
    } catch (error) {
      setError('Setup failed');
    } finally {
      setIsLoading(false);
    }
  };

  // PIN Pad Component
  const PinPad = () => (
    <div className="space-y-6">
      <div className="flex justify-center gap-3 mb-6">
        {[0, 1, 2].map((col) => (
          <div key={col} className="flex flex-col gap-3">
            {[1, 2, 3].map((num) => {
              const digit = col * 3 + num;
              return (
                <button
                  key={digit}
                  onClick={() => handleDigitPress(digit.toString())}
                  className="w-16 h-16 text-2xl font-bold bg-slate-100 hover:bg-cyan-100 rounded-xl transition-all active:scale-95 shadow-sm hover:shadow-md"
                  disabled={isLoading}
                >
                  {digit}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-3">
        <button
          onClick={handleVoiceInput}
          className="w-16 h-16 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:scale-95"
          title="Voice input"
        >
          <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>
        <button
          onClick={() => handleDigitPress('0')}
          className="w-16 h-16 text-2xl font-bold bg-slate-100 hover:bg-cyan-100 rounded-xl transition-all active:scale-95 shadow-sm hover:shadow-md"
          disabled={isLoading}
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          className="w-16 h-16 flex items-center justify-center bg-slate-100 hover:bg-red-100 rounded-xl transition-all active:scale-95"
          disabled={isLoading}
        >
          <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
          </svg>
        </button>
      </div>
    </div>
  );

  // Initial Setup Screen
  if (showSetup && isFirstRun) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Welcome to Talk to Your Accounts</h1>
            <p className="text-slate-500">Let's set up your admin account</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
              <input
                type="text"
                value={newUser.username}
                onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Enter username (min 3 characters)"
                minLength={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">4-Digit PIN</label>
              <input
                type="password"
                value={newUser.pin}
                onChange={(e) => setNewUser(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Create 4-digit PIN"
                maxLength={4}
                pattern="\d{4}"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="admin">Admin (Full Access)</option>
                <option value="editor">Editor (Daily Operations)</option>
                <option value="ca_auditor">CA/Auditor (Review Only)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleSetupComplete}
              disabled={isLoading || !newUser.username || !newUser.pin}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Setting up...
                </span>
              ) : (
                'Complete Setup'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className={`relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-fade-in ${shake ? 'animate-shake' : ''}`}>
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Talk to Your Accounts</h1>
          <p className="text-slate-500 text-sm mt-1">Enter your PIN to continue</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2 animate-fade-in">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Username Selection */}
        {showUsername ? (
          <form onSubmit={handleUsernameSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
              <select
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Select user...</option>
                {users.map(user => (
                  <option key={user.id} value={user.username}>{user.username} ({user.role})</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={!username.trim()}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </form>
        ) : (
          <>
            {/* User Info */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">{username.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="font-medium text-slate-800">{username}</p>
                <button 
                  onClick={() => { setShowUsername(true); setPin(''); }}
                  className="text-sm text-cyan-600 hover:text-cyan-700"
                >
                  Change user
                </button>
              </div>
            </div>

            {/* PIN Display */}
            <div className="flex justify-center gap-3 mb-8">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all ${
                    i < pin.length 
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 scale-110' 
                      : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>

            {/* PIN Pad */}
            <PinPad />

            {/* Submit Button */}
            <form onSubmit={handlePinSubmit}>
              <button
                type="submit"
                disabled={pin.length !== 4 || isLoading}
                className="w-full py-3 mt-6 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Verifying...
                  </span>
                ) : (
                  'Login'
                )}
              </button>
            </form>

            {/* Help Text */}
            <p className="text-center text-slate-400 text-sm mt-6">
              Forgot your PIN? Contact your administrator.
            </p>
          </>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            Offline-First Accounting • Secure Local Storage
          </p>
        </div>
      </div>

      {/* CSS for shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default LoginScreen;
