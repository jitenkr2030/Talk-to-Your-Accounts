import React, { useState, useEffect, useCallback } from 'react';
import { useLeakDetection } from '../../hooks/useLeakDetection';
import { voiceManager } from '../../services/voiceManager';

/**
 * Cash Leak Finder Dashboard Component
 * 
 * An AI-powered forensic auditing tool that detects financial anomalies
 * including inventory leaks, cash mismatches, and potential theft
 */
const CashLeakFinder = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceResponse, setVoiceResponse] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const {
    isLoading,
    error,
    anomalies,
    analysisResults,
    dashboardSummary,
    config,
    runAnalysis,
    getAnomalies,
    resolveAnomaly,
    getDashboardSummary
  } = useLeakDetection();

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'LOW':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get leak type icon
  const getLeakTypeIcon = (type) => {
    switch (type) {
      case 'INVENTORY':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case 'CASH':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'BILLING':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'THEFT_SUSPICION':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
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
      const transcript = await voiceManager.listen({ lang: 'en-IN' });
      setIsListening(false);

      if (transcript) {
        processVoiceCommand(transcript);
      }
    } catch (err) {
      setIsListening(false);
      setVoiceResponse('Sorry, I could not understand. Please try again.');
    }
  }, [isListening]);

  // Process voice commands
  const processVoiceCommand = useCallback(async (command) => {
    const lowerCommand = command.toLowerCase();
    let response = '';

    if (lowerCommand.includes('loss') || lowerCommand.includes('leak')) {
      if (lowerCommand.includes('inventory') || lowerCommand.includes('stock')) {
        setActiveTab('inventory');
        const inventoryLeaks = anomalies.filter(a => a.leak_type === 'INVENTORY');
        response = `I found ${inventoryLeaks.length} inventory-related issues. The total estimated loss is ${formatCurrency(dashboardSummary?.totalLoss || 0)}.`;
      } else if (lowerCommand.includes('cash')) {
        setActiveTab('cash');
        const cashLeaks = anomalies.filter(a => a.leak_type === 'CASH');
        response = `I found ${cashLeaks.length} cash variance issues. Total cash discrepancy is significant.`;
      } else {
        response = `You have ${dashboardSummary?.totalOpen || 0} open issues with total estimated loss of ${formatCurrency(dashboardSummary?.totalLoss || 0)}. Would you like me to show the details?`;
      }
    } else if (lowerCommand.includes('employee') || lowerCommand.includes('staff')) {
      setActiveTab('staff');
      response = `Let me show you staff performance analysis. I've identified ${dashboardSummary?.topStaff?.length || 0} staff members with unusual patterns.`;
    } else if (lowerCommand.includes('this week') || lowerCommand.includes('recent')) {
      await getAnomalies({ startDate: dateRange.startDate, endDate: dateRange.endDate });
      response = `Here are the most recent anomalies from the last 30 days.`;
    } else if (lowerCommand.includes('resolve') || lowerCommand.includes('fix')) {
      if (selectedAnomaly) {
        await resolveAnomaly(selectedAnomaly.id, 'Resolved via voice command');
        response = `I've marked the ${selectedAnomaly.leak_type} issue as resolved.`;
      } else {
        response = 'Please select an anomaly first to resolve it.';
      }
    } else {
      response = `I heard: "${command}". You can ask me about losses, cash issues, inventory leaks, or staff performance.`;
    }

    setVoiceResponse(response);
    
    // Speak the response
    voiceManager.speak(response, { lang: 'en-IN' });
  }, [anomalies, dashboardSummary, selectedAnomaly, dateRange, getAnomalies, resolveAnomaly]);

  // Handle run analysis
  const handleRunAnalysis = useCallback(async () => {
    await runAnalysis({ startDate: dateRange.startDate, endDate: dateRange.endDate });
    await getDashboardSummary();
  }, [runAnalysis, getDashboardSummary, dateRange]);

  // Handle resolve anomaly
  const handleResolve = useCallback(async (id) => {
    const notes = prompt('Enter resolution notes:');
    if (notes !== null) {
      await resolveAnomaly(id, notes);
    }
  }, [resolveAnomaly]);

  // Render dashboard tab
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">Total Estimated Loss</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(dashboardSummary?.totalLoss || 0)}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Open Issues</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{dashboardSummary?.totalOpen || 0}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">High Severity</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{dashboardSummary?.bySeverity?.find(s => s.severity_level === 'HIGH')?.count || 0}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Staff Issues</p>
              <p className="text-3xl font-bold text-slate-800 mt-1">{dashboardSummary?.topStaff?.length || 0}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <button
          onClick={handleRunAnalysis}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:shadow-lg hover:shadow-cyan-500/30 disabled:opacity-50 transition-all"
        >
          {isLoading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
          Run Full Analysis
        </button>

        <button
          onClick={() => getAnomalies({ status: 'OPEN', limit: 50 })}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Data
        </button>
      </div>

      {/* Anomalies by Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { type: 'INVENTORY', label: 'Inventory Leaks', icon: '📦' },
          { type: 'CASH', label: 'Cash Mismatches', icon: '💵' },
          { type: 'BILLING', label: 'Billing Issues', icon: '🧾' },
          { type: 'THEFT_SUSPICION', label: 'Theft Alerts', icon: '🚨' }
        ].map(item => {
          const count = dashboardSummary?.byType?.find(t => t.leak_type === item.type)?.count || 0;
          return (
            <button
              key={item.type}
              onClick={() => getAnomalies({ leak_type: item.type })}
              className="bg-white rounded-xl p-4 border border-slate-200 hover:border-cyan-300 hover:shadow-md transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="text-2xl font-bold text-slate-800">{count}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Recent Anomalies */}
      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">Recent Anomalies</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {anomalies.slice(0, 5).map((anomaly) => (
            <div
              key={anomaly.id}
              onClick={() => setSelectedAnomaly(anomaly)}
              className={`p-4 hover:bg-slate-50 cursor-pointer ${selectedAnomaly?.id === anomaly.id ? 'bg-cyan-50' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getSeverityColor(anomaly.severity_level)}`}>
                  {getLeakTypeIcon(anomaly.leak_type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">{anomaly.leak_type.replace('_', ' ')}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getSeverityColor(anomaly.severity_level)}`}>
                      {anomaly.severity_level}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{anomaly.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                    <span>{formatCurrency(anomaly.estimated_loss_amount)}</span>
                    {anomaly.associated_staff_name && <span>Staff: {anomaly.associated_staff_name}</span>}
                    <span>{new Date(anomaly.detected_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {anomalies.length === 0 && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-slate-800 mb-2">All Clear!</h4>
              <p className="text-slate-500">No anomalies detected. Run analysis to check for issues.</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Staff Issues */}
      {dashboardSummary?.topStaff?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800">Staff with Most Issues</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {dashboardSummary.topStaff.map((staff, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-medium">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{staff.associated_staff_name}</p>
                    <p className="text-sm text-slate-500">{staff.issue_count} issues</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">{formatCurrency(staff.total_loss)}</p>
                    <p className="text-sm text-slate-500">total loss</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render anomalies tab
  const renderAnomalies = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-6">
        <select
          onChange={(e) => getAnomalies({ status: e.target.value })}
          className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700"
        >
          <option value="OPEN">Open Issues</option>
          <option value="RESOLVED">Resolved</option>
          <option value="">All Issues</option>
        </select>

        <select
          onChange={(e) => getAnomalies({ leak_type: e.target.value })}
          className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700"
        >
          <option value="">All Types</option>
          <option value="INVENTORY">Inventory</option>
          <option value="CASH">Cash</option>
          <option value="BILLING">Billing</option>
          <option value="THEFT_SUSPICION">Theft Suspicion</option>
        </select>
      </div>

      <div className="grid gap-4">
        {anomalies.map((anomaly) => (
          <div
            key={anomaly.id}
            className={`bg-white rounded-xl border p-6 ${selectedAnomaly?.id === anomaly.id ? 'border-cyan-500 shadow-md' : 'border-slate-200'}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getSeverityColor(anomaly.severity_level)}`}>
                  {getLeakTypeIcon(anomaly.leak_type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-semibold text-slate-800">{anomaly.leak_type.replace('_', ' ')}</h4>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getSeverityColor(anomaly.severity_level)}`}>
                      {anomaly.severity_level}
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                      {anomaly.status}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-2">{anomaly.description}</p>
                  
                  <div className="flex items-center gap-6 mt-4 text-sm text-slate-500">
                    <span className="font-medium text-red-600">{formatCurrency(anomaly.estimated_loss_amount)}</span>
                    {anomaly.associated_staff_name && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {anomaly.associated_staff_name}
                      </span>
                    )}
                    <span>{new Date(anomaly.detected_at).toLocaleString()}</span>
                    <span>Confidence: {(anomaly.ai_confidence_score * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              {anomaly.status === 'OPEN' && (
                <button
                  onClick={() => handleResolve(anomaly.id)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Resolve
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render analysis results tab
  const renderAnalysis = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Analysis Results</h3>
        
        {analysisResults ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Inventory Leaks */}
            <div className="bg-red-50 rounded-xl p-4">
              <h4 className="font-medium text-red-800 mb-3">Inventory Leaks</h4>
              <p className="text-3xl font-bold text-red-600">{analysisResults.inventoryLeaks?.length || 0}</p>
              <p className="text-sm text-red-600">issues found</p>
              {analysisResults.inventoryLeaks?.slice(0, 3).map((item, idx) => (
                <div key={idx} className="mt-3 text-sm text-red-700">
                  <p>{item.product_name}: {item.variance} units</p>
                  <p className="font-medium">{formatCurrency(item.estimated_loss)}</p>
                </div>
              ))}
            </div>

            {/* Cash Mismatches */}
            <div className="bg-amber-50 rounded-xl p-4">
              <h4 className="font-medium text-amber-800 mb-3">Cash Mismatches</h4>
              <p className="text-3xl font-bold text-amber-600">{analysisResults.cashMismatches?.length || 0}</p>
              <p className="text-sm text-amber-600">issues found</p>
              {analysisResults.cashMismatches?.slice(0, 3).map((item, idx) => (
                <div key={idx} className="mt-3 text-sm text-amber-700">
                  <p>{item.staff_name} on {item.shift_date}</p>
                  <p className="font-medium">{formatCurrency(item.difference)} ({item.variance_percent}%)</p>
                </div>
              ))}
            </div>

            {/* Billing Manipulations */}
            <div className="bg-orange-50 rounded-xl p-4">
              <h4 className="font-medium text-orange-800 mb-3">Billing Manipulations</h4>
              <p className="text-3xl font-bold text-orange-600">{analysisResults.billingManipulations?.length || 0}</p>
              <p className="text-sm text-orange-600">issues found</p>
              {analysisResults.billingManipulations?.slice(0, 3).map((item, idx) => (
                <div key={idx} className="mt-3 text-sm text-orange-700">
                  <p>{item.staff_name}</p>
                  <p className="font-medium">{item.void_count} void transactions</p>
                </div>
              ))}
            </div>

            {/* Staff Anomalies */}
            <div className="bg-purple-50 rounded-xl p-4">
              <h4 className="font-medium text-purple-800 mb-3">Staff Anomalies</h4>
              <p className="text-3xl font-bold text-purple-600">{analysisResults.staffAnomalies?.length || 0}</p>
              <p className="text-sm text-purple-600">issues found</p>
              {analysisResults.staffAnomalies?.slice(0, 3).map((item, idx) => (
                <div key={idx} className="mt-3 text-sm text-purple-700">
                  <p>{item.staff_name}</p>
                  <p className="font-medium">{item.deviation}% below average</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-500">Run analysis to see results</p>
            <button
              onClick={handleRunAnalysis}
              className="mt-4 px-6 py-3 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition-colors"
            >
              Run Analysis Now
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Main render
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Cash Leak Finder</h1>
              <p className="text-slate-500 mt-1">AI-powered forensic auditing to detect hidden business losses</p>
            </div>

            {/* Voice Button */}
            <button
              onClick={handleVoiceInput}
              className={`relative p-4 rounded-full transition-all ${
                isListening 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/30'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              {isListening && (
                <span className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-75"></span>
              )}
            </button>
          </div>

          {/* Voice Response */}
          {voiceResponse && (
            <div className="mt-4 p-4 bg-cyan-50 border border-cyan-200 rounded-xl">
              <p className="text-cyan-800">{voiceResponse}</p>
            </div>
          )}

          {/* Status Banner */}
          <div className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-lg ${
            (dashboardSummary?.totalOpen || 0) > 0 
              ? 'bg-red-50 text-red-700' 
              : 'bg-green-50 text-green-700'
          }`}>
            {(dashboardSummary?.totalOpen || 0) > 0 ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-medium">Leaks Detected - {dashboardSummary.totalOpen} open issues</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">System Secure - No leaks detected</span>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'anomalies', label: 'Anomalies', icon: '🚨' },
            { id: 'analysis', label: 'Analysis', icon: '🔍' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-cyan-500 text-cyan-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'anomalies' && renderAnomalies()}
        {activeTab === 'analysis' && renderAnalysis()}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default CashLeakFinder;
