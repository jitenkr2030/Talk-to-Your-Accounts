import { useState, useEffect, useRef, useCallback } from 'react';
import React from 'react';
import useAppStore from './stores/appStore';
import { voiceManager } from './services/voiceManager';
import { nlpEngine } from './core/nlpEngine';
import LoginScreen from './components/Auth/LoginScreen';
import LandingPage from './pages/LandingPage';
import DataManagementPage from './pages/DataManagementPage';
import InvoiceScanner from './pages/InvoiceScanner';
import VoiceReconciliation from './components/Voice/VoiceReconciliation';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error Boundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Application Error</h2>
            <p className="text-slate-600 mb-4">Something went wrong. Please restart the application.</p>
            <p className="text-sm text-slate-500 mb-4">
              {this.state.error?.message || 'Unknown error'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all"
            >
              Restart Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Helper to check if API is available
const isApiAvailable = () => {
  return typeof window !== 'undefined' && 
         window.api && 
         typeof window.api.auth === 'object';
};

const AppContent = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [autoReadReport, setAutoReadReport] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);
  const [language, setLanguage] = useState('english');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isApiReady, setIsApiReady] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Authentication state from store
  const { 
    isAuthenticated,
    currentUser,
    login,
    logout,
    checkAuthStatus,
    set,
    isLoadingAuth,
    businessInfo,
    transactions,
    parties,
    products,
    expenses,
    dashboardSummary,
    salesReport,
    gstReport,
    profitLoss,
    balanceSheet,
    cashFlow,
    outstandingAging,
    expenseSummary,
    healthScore,
    alerts,
    unreadAlertCount,
    loadBusinessInfo,
    loadTransactions,
    loadParties,
    loadProducts,
    loadExpenses,
    loadDashboardSummary,
    loadSalesReport,
    loadGSTReport,
    loadProfitLoss,
    loadBalanceSheet,
    loadCashFlow,
    loadOutstandingAging,
    loadExpenseSummary,
    calculateHealthScore,
    loadAlerts,
    addTransaction,
    addParty,
    addProduct,
    addExpense
  } = useAppStore();

  // Check if API is available
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max (50 * 100ms)
    
    const checkApi = () => {
      attempts++;
      if (isApiAvailable()) {
        setIsApiReady(true);
        console.log('API is ready after', attempts, 'attempts');
      } else if (attempts < maxAttempts) {
        setTimeout(checkApi, 100);
      } else {
        // Fallback: show error and allow app to render anyway
        console.warn('API check timed out, proceeding anyway');
        setIsApiReady(true); // Proceed anyway to show the UI
      }
    };
    
    checkApi();
  }, []);

  // Check authentication status on mount (only after API is ready)
  useEffect(() => {
    if (isApiReady) {
      checkAuthStatus();
    }
  }, [isApiReady]);

  // Initialize app data only when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const initApp = async () => {
        await Promise.all([
          loadBusinessInfo(),
          loadTransactions({}),
          loadParties(),
          loadProducts(),
          loadExpenses({}),
          loadDashboardSummary('month'),
          loadAlerts({}),
          calculateHealthScore('month')
        ]);
      };
      initApp();
    }
  }, [isAuthenticated]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Voice event listeners
  useEffect(() => {
    voiceManager.onAudioLevelChange((level) => setAudioLevel(level));
  }, []);

  const handleLogin = useCallback(async (session) => {
    // Update authentication state with the session
    set({
      isAuthenticated: true,
      currentUser: {
        id: session.userId || session.id,
        username: session.username,
        role: session.role
      },
      sessionToken: session.token
    });
    console.log('Login successful:', session);
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    setMessages([]);
    setActiveView('dashboard');
  }, [logout]);

  // If API is not ready yet, show loading screen
  if (!isApiReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Talk to Your Accounts</h1>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show login screen
  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Initialize app
  useEffect(() => {
    const initApp = async () => {
      await Promise.all([
        loadBusinessInfo(),
        loadTransactions({}),
        loadParties(),
        loadProducts(),
        loadExpenses({}),
        loadDashboardSummary('month'),
        loadAlerts({}),
        calculateHealthScore('month')
      ]);
    };
    initApp();
  }, []);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Voice event listeners
  useEffect(() => {
    voiceManager.onAudioLevelChange((level) => setAudioLevel(level));
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle voice input
  const handleVoiceInput = useCallback(async () => {
    if (isListening) {
      voiceManager.stopListening();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    
    try {
      const transcript = await voiceManager.listen({
        lang: language === 'hindi' ? 'hi-IN' : language === 'hinglish' ? 'hi-IN' : 'en-IN'
      });
      setIsListening(false);
      
      if (transcript) {
        setInput(transcript);
        handleSubmit(null, transcript);
      }
    } catch (error) {
      setIsListening(false);
      addMessage('assistant', 'Could not understand. Please try again.');
    }
  }, [isListening, language]);

  // Handle form submission
  const handleSubmit = async (e, text = input) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;

    const userMessage = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Add loading message
    const loadingMsg = { role: 'assistant', content: 'Processing...', timestamp: new Date(), loading: true };
    setMessages(prev => [...prev, loadingMsg]);

    // Process with NLP engine
    const result = nlpEngine.process(text, { transactions, parties, products, businessInfo, expenses });

    // Remove loading message
    setMessages(prev => prev.slice(0, -1));

    // Handle different actions
    if (result.action === 'transaction' && result.requiresConfirmation) {
      // Show confirmation for transaction
      const confirmMsg = {
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
        type: 'confirmation',
        data: result.data,
        confirmationDetails: result.confirmationDetails
      };
      setMessages(prev => [...prev, confirmMsg]);
    } else if (result.action === 'query' && result.responseBuilder) {
      // Get data and respond
      try {
        const data = await getQueryData(result.queryType, result.period);
        const responseText = result.responseBuilder(data);
        addMessage('assistant', responseText);
        
        if (autoReadReport) {
          speakText(responseText);
        }
      } catch (error) {
        addMessage('assistant', 'Unable to retrieve data. Please try again.');
      }
    } else if (result.action === 'report') {
      // Generate report
      await generateReport(result.reportType, result.period);
    } else if (result.action === 'insight') {
      // Show business insights
      await showBusinessInsights();
    } else {
      addMessage('assistant', result.response);
      
      if (autoReadReport && result.response) {
        speakText(result.response);
      }
    }
  };

  // Add message to chat
  const addMessage = (role, content, type = 'text', data = null) => {
    const msg = { role, content, timestamp: new Date(), type, data };
    setMessages(prev => [...prev, msg]);
  };

  // Get query data
  const getQueryData = async (queryType, period) => {
    const periodValue = period?.value || period || new Date().toISOString().split('T')[0];
    
    switch (queryType) {
      case 'sales':
        return await loadSalesReport({ startDate: periodValue });
      case 'profit':
        return await loadProfitLoss({ startDate: periodValue });
      case 'balance':
        return dashboardSummary;
      case 'outstanding':
        return await loadOutstandingAging();
      case 'expenses':
        return await loadExpenseSummary({ startDate: periodValue });
      case 'gst':
        return await loadGSTReport(periodValue.slice(0, 7));
      case 'cash_flow':
        return await loadCashFlow({ startDate: periodValue });
      default:
        return null;
    }
  };

  // Generate report
  const generateReport = async (reportType, period) => {
    const periodValue = period?.value || period || new Date().toISOString().split('T')[0];
    let reportData = null;
    let reportTitle = '';

    try {
      switch (reportType) {
        case 'sales':
          reportData = await loadSalesReport({ startDate: periodValue });
          reportTitle = 'Sales Report';
          break;
        case 'gst':
          reportData = await loadGSTReport(periodValue.slice(0, 7));
          reportTitle = 'GST Report';
          break;
        case 'profit_loss':
          reportData = await loadProfitLoss({ startDate: periodValue });
          reportTitle = 'Profit & Loss Statement';
          break;
        case 'balance_sheet':
          reportData = await loadBalanceSheet(periodValue);
          reportTitle = 'Balance Sheet';
          break;
        case 'cash_flow':
          reportData = await loadCashFlow({ startDate: periodValue });
          reportTitle = 'Cash Flow Statement';
          break;
        case 'outstanding_aging':
          reportData = await loadOutstandingAging();
          reportTitle = 'Outstanding Aging Report';
          break;
        case 'expense':
          reportData = await loadExpenseSummary({ startDate: periodValue });
          reportTitle = 'Expense Summary';
          break;
        default:
          addMessage('assistant', 'Report type not recognized.');
          return;
      }

      setCurrentReport({ type: reportType, data: reportData, title: reportTitle });
      setShowReports(true);
      
      const response = `Generated ${reportTitle} for ${formatPeriod(periodValue)}`;
      addMessage('assistant', response, 'report', reportData);

      if (autoReadReport) {
        const summary = generateReportSummary(reportType, reportData);
        speakText(summary);
      }
    } catch (error) {
      addMessage('assistant', 'Unable to generate report. Please try again.');
    }
  };

  // Generate report summary for voice
  const generateReportSummary = (reportType, data) => {
    switch (reportType) {
      case 'sales':
        const sales = data?.summary?.total_sales || 0;
        const count = data?.summary?.transaction_count || 0;
        return `Sales report shows total sales of ${formatCurrency(sales)} across ${count} transactions.`;
      case 'gst':
        const collected = data?.summary?.gst_collected || 0;
        const paid = data?.summary?.gst_paid || 0;
        const liability = data?.summary?.net_liability || 0;
        return `GST report: Collected ${formatCurrency(collected)}, Paid ${formatCurrency(paid)}, Net liability ${formatCurrency(liability)}.`;
      case 'profit_loss':
        const profit = data?.net_profit || 0;
        return `Profit and Loss: Net ${profit >= 0 ? 'profit' : 'loss'} of ${formatCurrency(Math.abs(profit))}.`;
      case 'outstanding_aging':
        const total = data?.summary?.total_outstanding || 0;
        return `Outstanding aging shows total receivables of ${formatCurrency(total)}.`;
      default:
        return 'Report generated successfully.';
    }
  };

  // Show business insights
  const showBusinessInsights = async () => {
    try {
      const health = await calculateHealthScore('month');
      setActiveView('insights');
      
      const insights = generateInsights(health);
      addMessage('assistant', insights, 'insights', health);
    } catch (error) {
      addMessage('assistant', 'Unable to generate insights.');
    }
  };

  // Generate insights text
  const generateInsights = (health) => {
    const insights = [];
    const status = health?.status || 'moderate';
    
    insights.push(`Business Health: ${status.charAt(0).toUpperCase() + status.slice(1)}`);
    
    if (health?.scores) {
      if (health.scores.overall >= 80) {
        insights.push('Your business is performing excellently!');
      } else if (health.scores.overall >= 60) {
        insights.push('Business is doing okay but has room for improvement.');
      } else {
        insights.push('Business needs attention in several areas.');
      }
    }

    if (health?.recommendations) {
      insights.push('Recommendations: ' + health.recommendations.slice(0, 2).join('. '));
    }

    return insights.join('\n');
  };

  // Text to speech
  const speakText = (text) => {
    if (!text) return;
    setIsSpeaking(true);
    voiceManager.speak(text, {
      lang: language === 'hindi' ? 'hi-IN' : 'en-IN',
      rate: 0.9
    }).then(() => {
      setIsSpeaking(false);
    }).catch(() => {
      setIsSpeaking(false);
    });
  };

  // Stop speaking
  const stopSpeaking = () => {
    voiceManager.stopSpeaking();
    setIsSpeaking(false);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Format period
  const formatPeriod = (period) => {
    if (!period) return 'this period';
    if (period.length === 10) return 'today';
    if (period.length === 7) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = parseInt(period.split('-')[1]);
      return months[month - 1];
    }
    return 'this period';
  };

  // Quick action handlers
  const handleQuickAction = async (action) => {
    switch (action) {
      case 'new-sale':
        setInput('Sold goods worth ₹ to ');
        break;
      case 'new-purchase':
        setInput('Purchased items worth ₹ from ');
        break;
      case 'add-party':
        setActiveView('parties');
        break;
      case 'add-product':
        setActiveView('inventory');
        break;
      default:
        break;
    }
  };

  // Render sidebar
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

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {[
            { id: 'dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: 'Dashboard' },
            { id: 'chat', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z', label: 'Talk to Accounts' },
            { id: 'voice-reconciliation', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z', label: 'Voice Reconciliation' },
            { id: 'transactions', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', label: 'Transactions' },
            { id: 'parties', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', label: 'Parties' },
            { id: 'inventory', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', label: 'Inventory' },
            { id: 'reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', label: 'Reports' },
            { id: 'insights', icon: 'M13 10V3L4 14h7v7l9-11h-7z', label: 'Smart Insights' },
            { id: 'alerts', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', label: 'Alerts', badge: unreadAlertCount },
            { id: 'data', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4', label: 'Data Management' },
            { id: 'scanner', icon: 'M3 9l3-3h10l-3 3M4 10v6a2 2 0 002 2h12a2 2 0 002-2v-6M4 10V5a2 2 0 012-2h3v5', label: 'Scan Invoice' },
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
                {item.badge > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-slate-700 text-white text-sm rounded px-2 py-1"
          >
            <option value="english">English</option>
            <option value="hindi">हिंदी</option>
            <option value="hinglish">Hinglish</option>
          </select>
        </div>
        
        {/* User Info */}
        <div className="flex items-center gap-3 mb-3 p-2 bg-slate-700/50 rounded-lg">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {currentUser?.username || 'User'}
            </p>
            <p className="text-slate-400 text-xs capitalize">
              {currentUser?.role || 'Editor'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"
            title="Logout"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-yellow-500 animate-pulse' : 'bg-green-500 animate-pulse'}`}></div>
          {isSpeaking ? 'Speaking...' : 'Online & Ready'}
        </div>
      </div>
    </div>
  );

  // Render dashboard
  const renderDashboard = () => {
    const todaySales = transactions
      .filter(t => t.voucher_type === 'sale' && t.date === new Date().toISOString().split('T')[0])
      .reduce((sum, t) => sum + (t.total_amount || 0), 0);

    const pendingPayments = transactions
      .filter(t => t.payment_status !== 'paid')
      .reduce((sum, t) => sum + ((t.total_amount || 0) - (t.paid_amount || 0)), 0);

    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Welcome back!</h1>
          <p className="text-slate-500 mt-1">Here's what's happening with your business today.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: "Today's Sales", value: formatCurrency(todaySales), icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'bg-gradient-to-br from-emerald-500 to-teal-600' },
            { label: 'Pending Payments', value: formatCurrency(pendingPayments), icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'bg-gradient-to-br from-amber-500 to-orange-600' },
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

        {/* Health Score Card */}
        {healthScore && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800">Business Health</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                healthScore.status === 'healthy' ? 'bg-green-100 text-green-800' :
                healthScore.status === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {healthScore.status?.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-8">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle cx="48" cy="48" r="40" stroke="#e2e8f0" strokeWidth="8" fill="none" />
                  <circle cx="48" cy="48" r="40" stroke={healthScore.status === 'healthy' ? '#10b981' : healthScore.status === 'moderate' ? '#f59e0b' : '#ef4444'} strokeWidth="8" fill="none"
                    strokeDasharray={`${healthScore.scores?.overall || 0 * 2.51} 251`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-slate-800">{healthScore.scores?.overall || 0}</span>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-4 gap-4">
                {[
                  { label: 'Cash Flow', value: healthScore.scores?.cash_flow || 0 },
                  { label: 'Credit', value: healthScore.scores?.credit || 0 },
                  { label: 'Expenses', value: healthScore.scores?.expenses || 0 },
                  { label: 'Compliance', value: healthScore.scores?.compliance || 0 },
                ].map((score, idx) => (
                  <div key={idx} className="text-center">
                    <div className="text-2xl font-bold text-slate-800">{score.value}</div>
                    <div className="text-sm text-slate-500">{score.label}</div>
                  </div>
                ))}
              </div>
            </div>
            {healthScore.recommendations && healthScore.recommendations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-600">
                  <strong>Tip:</strong> {healthScore.recommendations[0]}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'New Sale', icon: 'M12 4v16m8-8H4', color: 'bg-emerald-500', action: 'new-sale' },
              { label: 'New Purchase', icon: 'M20 12H4', color: 'bg-blue-500', action: 'new-purchase' },
              { label: 'Add Party', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z', color: 'bg-purple-500', action: 'add-party' },
              { label: 'Add Product', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6', color: 'bg-amber-500', action: 'add-product' },
            ].map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickAction(action.action)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
              >
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

  // Render chat interface
  const renderChatInterface = () => (
    <div className="flex flex-col h-screen">
      {/* Header */}
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
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
            >
              Stop Speaking
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
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
                {["How much did I sell today?", "Show me my profit this month", "Sold goods worth ₹5000 to John", "Generate GST report", "Business health check"].map((example, idx) => (
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
                    <div>
                      <p className="text-slate-800 whitespace-pre-wrap">{msg.content}</p>
                      
                      {/* Confirmation for transactions */}
                      {msg.type === 'confirmation' && msg.confirmationDetails && (
                        <div className="mt-3 p-3 bg-slate-100 rounded-lg">
                          <p className="text-sm font-medium text-slate-700 mb-2">Confirm Transaction:</p>
                          <div className="text-sm text-slate-600 space-y-1">
                            <p>Type: {msg.confirmationDetails.type}</p>
                            <p>Amount: {msg.confirmationDetails.amount}</p>
                            {msg.confirmationDetails.gstRate > 0 && (
                              <p>GST: {msg.confirmationDetails.gstRate}% ({msg.confirmationDetails.gstAmount})</p>
                            )}
                            {msg.confirmationDetails.party && <p>Party: {msg.confirmationDetails.party}</p>}
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button className="px-3 py-1 bg-green-500 text-white rounded text-sm">Confirm</button>
                            <button className="px-3 py-1 bg-slate-300 text-slate-700 rounded text-sm">Edit</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className={`text-xs text-slate-400 mt-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                  {msg.timestamp.toLocaleTimeString()}
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => speakText(msg.content)}
                      className="ml-2 text-cyan-500 hover:text-cyan-600"
                    >
                      🔊
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
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
              style={isListening ? { boxShadow: `0 0 0 ${audioLevel * 10}px rgba(239, 68, 68, ${audioLevel})` } : {}}
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

  // Render reports view
  const renderReports = () => (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Reports</h1>
        <p className="text-slate-500 mt-1">Generate and export comprehensive financial reports.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { type: 'sales', title: 'Sales Report', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', description: 'Daily, weekly, monthly sales analysis' },
          { type: 'gst', title: 'GST Report', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z', description: 'GSTR-1 and GSTR-3B ready reports' },
          { type: 'profit_loss', title: 'Profit & Loss', icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z', description: 'Income, expenses, and profit analysis' },
          { type: 'balance_sheet', title: 'Balance Sheet', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', description: 'Assets, liabilities, and equity overview' },
          { type: 'cash_flow', title: 'Cash Flow', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', description: 'Cash inflows and outflows' },
          { type: 'outstanding_aging', title: 'Outstanding Aging', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', description: 'Receivables aging analysis' },
          { type: 'expense', title: 'Expense Summary', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', description: 'Category-wise expense breakdown' },
        ].map((report, idx) => (
          <button
            key={idx}
            onClick={() => generateReport(report.type, new Date().toISOString().split('T')[0])}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-left hover:shadow-md hover:border-cyan-300 transition-all"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4`}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={report.icon} />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">{report.title}</h3>
            <p className="text-sm text-slate-500">{report.description}</p>
          </button>
        ))}
      </div>

      {/* Report Display */}
      {showReports && currentReport && (
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-800">{currentReport.title}</h2>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200">
                PDF
              </button>
              <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200">
                Excel
              </button>
              <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200">
                Print
              </button>
              <button
                onClick={() => setShowReports(false)}
                className="px-4 py-2 text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
          </div>
          
          {/* Report Content */}
          <div className="overflow-x-auto">
            {currentReport.type === 'sales' && salesReport && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-slate-600 font-medium">Total Sales</th>
                    <th className="text-left py-3 px-4 text-slate-600 font-medium">Transactions</th>
                    <th className="text-left py-3 px-4 text-slate-600 font-medium">GST Collected</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-3 px-4 font-semibold">{formatCurrency(salesReport.summary?.total_sales)}</td>
                    <td className="py-3 px-4">{salesReport.summary?.transaction_count}</td>
                    <td className="py-3 px-4">{formatCurrency(salesReport.summary?.total_gst)}</td>
                  </tr>
                </tbody>
              </table>
            )}
            
            {currentReport.type === 'gst' && gstReport && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-slate-600 font-medium">GST Rate</th>
                    <th className="text-left py-3 px-4 text-slate-600 font-medium">Sales</th>
                    <th className="text-left py-3 px-4 text-slate-600 font-medium">GST</th>
                  </tr>
                </thead>
                <tbody>
                  {gstReport.salesByGST?.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-3 px-4">{item.gst_rate}%</td>
                      <td className="py-3 px-4">{formatCurrency(item.taxable_amount)}</td>
                      <td className="py-3 px-4">{formatCurrency(item.total_gst)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            
            {currentReport.type === 'profit_loss' && profitLoss && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-slate-600 font-medium">Metric</th>
                    <th className="text-left py-3 px-4 text-slate-600 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-3 px-4">Total Sales</td>
                    <td className="py-3 px-4">{formatCurrency(profitLoss.sales?.total_sales)}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-3 px-4">Total Purchases</td>
                    <td className="py-3 px-4">{formatCurrency(profitLoss.purchases?.total_purchases)}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-3 px-4">Gross Profit</td>
                    <td className="py-3 px-4">{formatCurrency(profitLoss.gross_profit)}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-3 px-4">Total Expenses</td>
                    <td className="py-3 px-4">{formatCurrency(profitLoss.total_expenses)}</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="py-3 px-4 font-semibold">Net Profit</td>
                    <td className="py-3 px-4 font-semibold text-green-600">{formatCurrency(profitLoss.net_profit)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Render smart insights
  const renderInsights = () => (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Smart Insights</h1>
        <p className="text-slate-500 mt-1">AI-powered business analysis and recommendations.</p>
      </div>

      {/* Health Score */}
      {healthScore && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Business Health Score</h2>
          <div className="flex items-center gap-6">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="#e2e8f0" strokeWidth="12" fill="none" />
                <circle cx="64" cy="64" r="56" stroke={healthScore.status === 'healthy' ? '#10b981' : healthScore.status === 'moderate' ? '#f59e0b' : '#ef4444'} strokeWidth="12" fill="none"
                  strokeDasharray={`${healthScore.scores?.overall || 0 * 3.52} 352`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-slate-800">{healthScore.scores?.overall || 0}</span>
                <span className="text-sm text-slate-500">out of 100</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  healthScore.status === 'healthy' ? 'bg-green-100 text-green-800' :
                  healthScore.status === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {healthScore.status?.toUpperCase()}
                </span>
              </div>
              <p className="text-slate-600 mb-4">
                {healthScore.status === 'healthy' 
                  ? 'Your business is performing excellently with strong cash flow and healthy receivables.'
                  : healthScore.status === 'moderate'
                    ? 'Your business is doing okay but has room for improvement in some areas.'
                    : 'Your business needs attention in several areas to improve financial health.'}
              </p>
              {healthScore.recommendations && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Recommendations:</h4>
                  <ul className="text-sm text-slate-600 space-y-1">
                    {healthScore.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-cyan-500 mt-1">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Trends</h3>
          <div className="space-y-4">
            {transactions.length > 0 ? (
              <>
                <p className="text-slate-600">
                  <strong>Sales Trend:</strong> Your sales appear stable this month.
                </p>
                <p className="text-slate-600">
                  <strong>Top Customer:</strong> {parties[0]?.name || 'N/A'} with highest transactions.
                </p>
              </>
            ) : (
              <p className="text-slate-500">Add transactions to see trend analysis.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Alerts</h3>
          <div className="space-y-3">
            {alerts.length > 0 ? (
              alerts.slice(0, 5).map((alert, idx) => (
                <div key={idx} className={`p-3 rounded-lg ${
                  alert.severity === 'high' ? 'bg-red-50 border border-red-200' :
                  alert.severity === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-blue-50 border border-blue-200'
                }`}>
                  <p className="text-sm font-medium text-slate-700">{alert.title}</p>
                  <p className="text-xs text-slate-500 mt-1">{alert.message}</p>
                </div>
              ))
            ) : (
              <p className="text-slate-500">No active alerts. Your business is in good shape!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Render alerts view
  const renderAlerts = () => (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Alerts</h1>
          <p className="text-slate-500 mt-1">Stay informed about important business events.</p>
        </div>
        {unreadAlertCount > 0 && (
          <span className="px-4 py-2 bg-red-100 text-red-700 rounded-lg">
            {unreadAlertCount} unread
          </span>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {alerts.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {alerts.map((alert, idx) => (
              <div key={idx} className={`p-4 flex items-start gap-4 ${
                alert.is_read ? 'bg-white' : 'bg-blue-50'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  alert.severity === 'high' ? 'bg-red-100 text-red-600' :
                  alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {alert.severity === 'high' ? '⚠️' : alert.severity === 'medium' ? '⚡' : 'ℹ️'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-slate-800">{alert.title}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      alert.severity === 'high' ? 'bg-red-100 text-red-700' :
                      alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{alert.message}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    {new Date(alert.created_at).toLocaleString()}
                  </p>
                </div>
                <button className="px-3 py-1 text-sm text-slate-600 hover:text-slate-800">
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">All Clear!</h3>
            <p className="text-slate-500">No active alerts. Your business is running smoothly.</p>
          </div>
        )}
      </div>
    </div>
  );

  // Render placeholder for other views
  const renderPlaceholder = (title, message) => (
    <div className="p-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
        <p className="text-slate-500">{message}</p>
      </div>
    </div>
  );

  // Main render
  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <LandingPage onNavigate={setActiveView} />;
      case 'chat':
        return renderChatInterface();
      case 'voice-reconciliation':
        return <VoiceReconciliation onNavigate={setActiveView} />;
      case 'reports':
        return renderReports();
      case 'insights':
        return renderInsights();
      case 'alerts':
        return renderAlerts();
      case 'transactions':
        return renderPlaceholder('Transactions', 'View and filter all transactions here.');
      case 'parties':
        return renderPlaceholder('Parties', 'Manage your customers and vendors here.');
      case 'inventory':
        return renderPlaceholder('Inventory', 'Track your products and stock levels here.');
      case 'data':
        return <DataManagementPage />;
      case 'scanner':
        return <InvoiceScanner onNavigate={setActiveView} />;
      default:
        return renderDashboard();
    }
  };

// App wrapper with Error Boundary
function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
};

export default AppWithErrorBoundary;
