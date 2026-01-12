import { useState, useEffect, useRef } from 'react';
import useAppStore from './stores/appStore';
import { voiceManager } from './services/voiceManager';
import { nlpEngine } from './core/nlpEngine';

const App = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [autoReadReport, setAutoReadReport] = useState(false);
  const messagesEndRef = useRef(null);
  
  const { 
    businessInfo, transactions, parties, products, 
    loadBusinessInfo, loadTransactions, loadParties, loadProducts,
    addTransaction, addParty, addProduct 
  } = useAppStore();

  useEffect(() => {
    loadBusinessInfo();
    loadTransactions({});
    loadParties();
    loadProducts();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleVoiceInput = async () => {
    if (isListening) {
      voiceManager.stopListening();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    const transcript = await voiceManager.listen();
    setIsListening(false);
    
    if (transcript) {
      setInput(transcript);
      handleSubmit(null, transcript);
    }
  };

  const handleSubmit = async (e, text = input) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;

    const userMessage = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    const processingMsg = { role: 'assistant', content: 'Processing...', timestamp: new Date(), loading: true };
    setMessages(prev => [...prev, processingMsg]);

    const result = nlpengine.process(text, { transactions, parties, products, businessInfo });
    
    setMessages(prev => prev.slice(0, -1));

    if (result.action === 'transaction') {
      try {
        await addTransaction(result.data);
        const msg = { role: 'assistant', content: result.response, timestamp: new Date() };
        setMessages(prev => [...prev, msg]);
        
        if (autoReadReport) {
          speakText(result.response);
        }
      } catch (error) {
        const errorMsg = { role: 'assistant', content: 'Error saving transaction. Please try again.', timestamp: new Date() };
        setMessages(prev => [...prev, errorMsg]);
      }
    } else if (result.action === 'query') {
      const data = await getQueryData(result.queryType, result.period);
      const msg = { role: 'assistant', content: result.response(data), timestamp: new Date(), data };
      setMessages(prev => [...prev, msg]);
      
      if (autoReadReport) {
        speakText(result.response(data));
      }
    } else if (result.action === 'report') {
      setShowReports(true);
      const msg = { role: 'assistant', content: result.response, timestamp: new Date(), reportType: result.reportType };
      setMessages(prev => [...prev, msg]);
      
      if (autoReadReport) {
        speakText(result.response);
      }
    } else {
      const msg = { role: 'assistant', content: result.response, timestamp: new Date() };
      setMessages(prev => [...prev, msg]);
      
      if (autoReadReport) {
        speakText(result.response);
      }
    }
  };

  const getQueryData = async (queryType, period) => {
    const { getSalesReport, getProfitLoss } = window.electronAPI;
    switch (queryType) {
      case 'sales': return getSalesReport(period);
      case 'profit': return getProfitLoss(period);
      default: return null;
    }
  };

  const speakText = (text) => {
    setIsSpeaking(true);
    voiceManager.speak(text, () => setIsSpeaking(false));
  };

  const renderSidebar = () => (
    <div className="w-64 bg-gradient-to-b from-slate-800 to-slate-900 text-white flex flex-col min-h-screen">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Talk to Accounts
        </h1>
        <p className="text-xs text-slate-400 mt-1">You talk. Accounts respond.</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {[
            { id: 'dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Dashboard' },
            { id: 'chat', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z', label: 'Talk to Accounts' },
            { id: 'transactions', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', label: 'Transactions' },
            { id: 'parties', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', label: 'Parties' },
            { id: 'inventory', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', label: 'Inventory' },
            { id: 'reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', label: 'Reports' },
            { id: 'insights', icon: 'M13 10V3L4 14h7v7l9-11h-7z', label: 'Smart Insights' },
            { id: 'fraud', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', label: 'Fraud Detection' },
            { id: 'security', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', label: 'Security' },
            { id: 'reconciliation', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', label: 'Reconciliation' },
            { id: 'import', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12', label: 'Import Data' },
          ].map(item => (
            <li key={item.id}>
              <button
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeView === item.id 
                    ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' 
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          Online & Ready
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => {
    const todaySales = transactions
      .filter(t => t.type === 'sale' && t.created_at.startsWith(new Date().toISOString().split('T')[0]))
      .reduce((sum, t) => sum + t.total_amount, 0);
    
    const pendingPayments = transactions
      .filter(t => t.payment_status !== 'paid')
      .reduce((sum, t) => sum + (t.total_amount - (t.paid_amount || 0)), 0);

    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Welcome back!</h1>
          <p className="text-slate-500 mt-1">Here's what's happening with your business today.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: "Today's Sales", value: `₹${todaySales.toLocaleString()}`, icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'bg-gradient-to-br from-emerald-500 to-teal-600' },
            { label: 'Pending Payments', value: `₹${pendingPayments.toLocaleString()}`, icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'bg-gradient-to-br from-amber-500 to-orange-600' },
            { label: 'Total Parties', value: parties.length.toString(), icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', color: 'bg-gradient-to-br from-blue-500 to-indigo-600' },
            { label: 'Products', value: products.length.toString(), icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', color: 'bg-gradient-to-br from-purple-500 to-pink-600' },
          ].map((card, idx) => (
            <div key={idx} className={`${card.color} rounded-2xl p-6 text-white shadow-lg`}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-white/80 text-sm font-medium">{card.label}</span>
                <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                </svg>
              </div>
              <div className="text-3xl font-bold">{card.value}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'New Sale', icon: 'M12 4v16m8-8H4', color: 'bg-emerald-500' },
              { label: 'New Purchase', icon: 'M20 12H4', color: 'bg-blue-500' },
              { label: 'Add Party', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', color: 'bg-purple-500' },
              { label: 'Add Product', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6', color: 'bg-amber-500' },
            ].map((action, idx) => (
              <button key={idx} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className={`${action.color} rounded-full p-3 text-white`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-600">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderChatInterface = () => (
    <div className="flex flex-col h-screen">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Talk to Your Accounts</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={autoReadReport}
              onChange={(e) => setAutoReadReport(e.target.checked)}
              className="rounded text-cyan-500 focus:ring-cyan-500"
            />
            Auto-read report
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">How can I help you today?</h3>
              <p className="text-slate-500 mb-6">Try asking me something like:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl mx-auto text-left">
                {["How much did I sell today?", "Show me my profit this month", "Sold goods worth ₹5000 to John", "Generate GST report"].map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSubmit(null, example)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-cyan-300 transition-colors text-left"
                  >
                    "{example}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-2' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-slate-700">Assistant</span>
                  </div>
                )}
                <div className={`rounded-2xl px-5 py-3 ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-tr-sm' 
                    : 'bg-white border border-slate-200 rounded-tl-sm shadow-sm'
                }`}>
                  {msg.loading ? (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <div key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                        ))}
                      </div>
                      <span className="text-slate-500">Processing...</span>
                    </div>
                  ) : (
                    <p className="text-slate-800 whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                <div className={`text-xs text-slate-400 mt-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-white border-t border-slate-200 p-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleVoiceInput}
              className={`p-3 rounded-full transition-all ${
                isListening 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message or use voice..."
              className="flex-1 px-5 py-3 bg-slate-100 border-0 rounded-full text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSpeaking}
              className="p-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full hover:shadow-lg hover:shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard': return renderDashboard();
      case 'chat': return renderChatInterface();
      default:
        return (
          <div className="p-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Coming Soon</h3>
              <p className="text-slate-500">This module is under development.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {renderSidebar()}
      <main className="flex-1 overflow-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
