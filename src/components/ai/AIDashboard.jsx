/**
 * AI Dashboard Component
 * Main UI for AI-powered features including predictions, categorization, and anomaly detection
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Check, 
  X, 
  RefreshCw, 
  Brain,
  Target,
  Shield,
  Sparkles,
  ArrowRight,
  DollarSign,
  Activity,
  Zap
} from 'lucide-react';
import useAI from '../../hooks/useAI';

const AIDashboard = () => {
  const {
    insights,
    forecast,
    salesPrediction,
    expensePrediction,
    workingCapital,
    categorizationSuggestions,
    anomalies,
    loading,
    error,
    getInsights,
    getForecast,
    getSalesPrediction,
    getExpensePrediction,
    getWorkingCapital,
    applyCategory,
    dismissSuggestion,
    detectAnomalies,
    dismissAnomaly,
    clearError
  } = useAI();

  const [activeTab, setActiveTab] = useState('overview');
  const [forecastDays, setForecastDays] = useState(30);

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
      case 'high':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'medium':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'low':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default:
        return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }
  };

  // Get anomaly type icon
  const getAnomalyIcon = (type) => {
    switch (type) {
      case 'duplicate':
        return <Copy size={16} />;
      case 'unusual_amount':
        return <AlertTriangle size={16} />;
      case 'price_variation':
        return <TrendingUp size={16} />;
      default:
        return <Shield size={16} />;
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    try {
      await getInsights();
      await getForecast(forecastDays);
      await detectAnomalies();
    } catch (err) {
      console.error('Failed to refresh:', err);
    }
  };

  // Handle apply category
  const handleApplyCategory = async (transactionId, category) => {
    try {
      await applyCategory(transactionId, category);
    } catch (err) {
      console.error('Failed to apply category:', err);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <Brain size={24} className="text-purple-400" />
          <div>
            <h1 className="text-xl font-semibold text-white">AI Insights</h1>
            <p className="text-sm text-slate-400">Intelligent predictions and anomaly detection</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={forecastDays}
            onChange={(e) => setForecastDays(Number(e.target.value))}
            className="px-3 py-2 bg-slate-700 text-white text-sm rounded-lg border border-slate-600 focus:outline-none focus:border-purple-500"
          >
            <option value={7}>7 Days</option>
            <option value={30}>30 Days</option>
            <option value={90}>90 Days</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={clearError} className="text-red-400 hover:text-red-300">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center gap-1 px-6 py-3 bg-slate-800/50 border-b border-slate-700">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Sparkles size={16} className="inline-block mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('predictions')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'predictions'
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Target size={16} className="inline-block mr-2" />
              Predictions
            </button>
            <button
              onClick={() => setActiveTab('categorization')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'categorization'
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Brain size={16} className="inline-block mr-2" />
              Smart Categorization
              {categorizationSuggestions.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-amber-500 text-white rounded-full">
                  {categorizationSuggestions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('anomalies')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'anomalies'
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Shield size={16} className="inline-block mr-2" />
              Anomalies
              {anomalies.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {anomalies.length}
                </span>
              )}
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'overview' ? (
              // Overview Tab
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Cash Flow Forecast */}
                  <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={20} className="text-blue-400" />
                        <span className="text-slate-400 text-sm">Cash Flow Trend</span>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        forecast?.trend === 'positive' ? 'bg-green-500/20 text-green-400' :
                        forecast?.trend === 'negative' ? 'bg-red-500/20 text-red-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {forecast?.trend || 'N/A'}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {forecast?.averageDailyChange ? formatCurrency(forecast.averageDailyChange) + '/day' : 'N/A'}
                    </div>
                  </div>

                  {/* Sales Prediction */}
                  <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Target size={20} className="text-purple-400" />
                        <span className="text-slate-400 text-sm">Next Month Sales</span>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        salesPrediction?.trend === 'increasing' ? 'bg-green-500/20 text-green-400' :
                        salesPrediction?.trend === 'decreasing' ? 'bg-red-500/20 text-red-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {salesPrediction?.trend || 'N/A'}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {salesPrediction?.predictedAmount ? formatCurrency(salesPrediction.predictedAmount) : 'N/A'}
                    </div>
                  </div>

                  {/* Working Capital */}
                  <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <DollarSign size={20} className="text-green-400" />
                        <span className="text-slate-400 text-sm">Working Capital</span>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        workingCapital?.health === 'good' ? 'bg-green-500/20 text-green-400' :
                        workingCapital?.health === 'moderate' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {workingCapital?.health || 'N/A'}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {workingCapital?.workingCapital ? formatCurrency(workingCapital.workingCapital) : 'N/A'}
                    </div>
                  </div>

                  {/* Anomalies */}
                  <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Shield size={20} className="text-red-400" />
                        <span className="text-slate-400 text-sm">Active Anomalies</span>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {anomalies.length}
                    </div>
                  </div>
                </div>

                {/* Working Capital Details */}
                {workingCapital && (
                  <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                    <h3 className="text-lg font-semibold text-white mb-4">Working Capital Analysis</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <div className="text-slate-400 text-sm">Current Assets</div>
                        <div className="text-xl font-bold text-white">{formatCurrency(workingCapital.currentAssets)}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-sm">Current Liabilities</div>
                        <div className="text-xl font-bold text-white">{formatCurrency(workingCapital.currentLiabilities)}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-sm">Current Ratio</div>
                        <div className="text-xl font-bold text-white">{workingCapital.currentRatio}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-sm">Quick Ratio</div>
                        <div className="text-xl font-bold text-white">{workingCapital.quickRatio}</div>
                      </div>
                    </div>
                    {workingCapital.recommendations && workingCapital.recommendations.length > 0 && (
                      <div className="space-y-2">
                        {workingCapital.recommendations.map((rec, idx) => (
                          <div key={idx} className={`p-3 rounded-lg flex items-center gap-2 ${
                            rec.type === 'warning' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' :
                            rec.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' :
                            'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                          }`}>
                            {rec.type === 'warning' ? <AlertTriangle size={16} /> : 
                             rec.type === 'success' ? <Check size={16} /> : <Info size={16} />}
                            {rec.message}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Recent Anomalies */}
                {anomalies.length > 0 && (
                  <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                    <h3 className="text-lg font-semibold text-white mb-4">Recent Anomalies</h3>
                    <div className="space-y-3">
                      {anomalies.slice(0, 5).map((anomaly, idx) => (
                        <div key={idx} className={`p-3 rounded-lg border ${getSeverityColor(anomaly.severity)}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getAnomalyIcon(anomaly.type)}
                              <span className="font-medium">{anomaly.message}</span>
                            </div>
                            <button 
                              onClick={() => dismissAnomaly(anomaly.transactionId || anomaly.id)}
                              className="text-slate-400 hover:text-white"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === 'predictions' ? (
              // Predictions Tab
              <div className="space-y-6">
                {/* Cash Flow Forecast Chart */}
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Cash Flow Forecast</h3>
                  {forecast && forecast.forecast ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-blue-500 rounded"></span>
                          Historical
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-purple-500 rounded border-dashed border-2 border-purple-500"></span>
                          Predicted
                        </span>
                      </div>
                      <div className="h-64 overflow-y-auto">
                        {forecast.forecast.slice(0, 14).map((day, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                            <div className="flex items-center gap-3">
                              <span className="text-slate-400">{day.date}</span>
                              <span className="text-purple-400 text-sm">Predicted</span>
                            </div>
                            <div className="text-right">
                              <div className="text-white font-medium">{formatCurrency(day.predictedBalance)}</div>
                              <div className="text-xs text-slate-500">
                                Range: {formatCurrency(day.confidenceLow)} - {formatCurrency(day.confidenceHigh)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400">No forecast data available</p>
                  )}
                </div>

                {/* Sales & Expense Predictions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                    <h3 className="text-lg font-semibold text-white mb-4">Sales Prediction</h3>
                    {salesPrediction ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Predicted Amount</span>
                          <span className="text-2xl font-bold text-white">{formatCurrency(salesPrediction.predictedAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Growth Rate</span>
                          <span className={`font-medium ${
                            salesPrediction.growthRate > 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {salesPrediction.growthRate > 0 ? '+' : ''}{salesPrediction.growthRate}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Trend</span>
                          <span className="px-2 py-1 text-xs rounded bg-purple-500/20 text-purple-400">
                            {salesPrediction.trend}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-400">No prediction available</p>
                    )}
                  </div>

                  <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                    <h3 className="text-lg font-semibold text-white mb-4">Expense Prediction</h3>
                    {expensePrediction ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Predicted Amount</span>
                          <span className="text-2xl font-bold text-white">{formatCurrency(expensePrediction.predictedAmount)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-sm">Top Categories</span>
                          <div className="mt-2 space-y-1">
                            {expensePrediction.topCategories?.map((cat, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="text-slate-300">{cat.category}</span>
                                <span className="text-white">{formatCurrency(cat.total)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-400">No prediction available</p>
                    )}
                  </div>
                </div>
              </div>
            ) : activeTab === 'categorization' ? (
              // Categorization Tab
              <div className="space-y-6">
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Smart Categorization Suggestions</h3>
                  {categorizationSuggestions.length > 0 ? (
                    <div className="space-y-3">
                      {categorizationSuggestions.map((suggestion, idx) => (
                        <div key={idx} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-slate-400 text-sm">Transaction #{suggestion.transactionId}</span>
                                <span className="px-2 py-0.5 text-xs rounded bg-amber-500/20 text-amber-400">
                                  {suggestion.confidence}% confidence
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-300">{suggestion.currentCategory}</span>
                                <ArrowRight size={14} className="text-slate-500" />
                                <span className="text-green-400 font-medium">{suggestion.suggestedCategory}</span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">{suggestion.reason}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleApplyCategory(suggestion.transactionId, suggestion.suggestedCategory)}
                                className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                                title="Accept"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => dismissSuggestion(suggestion.transactionId)}
                                className="p-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                                title="Dismiss"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Brain size={48} className="text-slate-500 mx-auto mb-4" />
                      <p className="text-slate-400">No categorization suggestions</p>
                      <p className="text-sm text-slate-500">All transactions are properly categorized!</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Anomalies Tab
              <div className="space-y-6">
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Detected Anomalies</h3>
                  {anomalies.length > 0 ? (
                    <div className="space-y-3">
                      {anomalies.map((anomaly, idx) => (
                        <div key={idx} className={`p-4 rounded-lg border ${getSeverityColor(anomaly.severity)}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5">
                                {getAnomalyIcon(anomaly.type)}
                              </div>
                              <div>
                                <div className="font-medium text-white">{anomaly.message}</div>
                                {anomaly.details && (
                                  <div className="mt-2 text-sm text-slate-400">
                                    {Object.entries(anomaly.details).map(([key, value]) => (
                                      <div key={key} className="flex gap-2">
                                        <span className="capitalize">{key}:</span>
                                        <span>{typeof value === 'number' ? formatCurrency(value) : value}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => dismissAnomaly(anomaly.transactionId || anomaly.id)}
                              className="text-slate-400 hover:text-white"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Shield size={48} className="text-green-500 mx-auto mb-4" />
                      <p className="text-slate-400">No anomalies detected</p>
                      <p className="text-sm text-slate-500">Your transactions look normal!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper component for Copy icon (not imported)
const Copy = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

// Helper component for Info icon
const Info = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

export default AIDashboard;
