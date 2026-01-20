import React, { useState } from 'react';
import {
  Shield,
  Building,
  Mic,
  History,
  Lightbulb,
  Bell,
  LayoutDashboard,
  ChevronRight,
  Zap,
  BarChart3
} from 'lucide-react';
import {
  AlertNotificationCenter,
  ErrorDetectionPanel,
  ReconciliationPanel,
  VoiceCommandWidget,
  AuditLogViewer,
  RecommendationsPanel
} from '../components/features';

const IntelligenceDashboard = () => {
  const [showAlertCenter, setShowAlertCenter] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const features = [
    { id: 'alerts', name: 'Alert Center', icon: Bell, description: 'Real-time notifications & alerts' },
    { id: 'errors', name: 'Error Detection', icon: Shield, description: 'Data quality & anomaly detection' },
    { id: 'reconciliation', name: 'Bank Reconciliation', icon: Building, description: 'Auto-match bank statements' },
    { id: 'voice', name: 'Voice Commands', icon: Mic, description: 'Hands-free operation' },
    { id: 'audit', name: 'Audit Trail', icon: History, description: 'Activity tracking & compliance' },
    { id: 'recommendations', name: 'Smart Insights', icon: Lightbulb, description: 'AI-powered recommendations' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'alerts':
        return <AlertNotificationCenter isOpen={true} onClose={() => setActiveTab('overview')} />;
      case 'errors':
        return <ErrorDetectionPanel />;
      case 'reconciliation':
        return <ReconciliationPanel />;
      case 'voice':
        return <VoiceCommandWidget />;
      case 'audit':
        return <AuditLogViewer />;
      case 'recommendations':
        return <RecommendationsPanel />;
      default:
        return (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(feature => (
              <button
                key={feature.id}
                onClick={() => setActiveTab(feature.id)}
                className="flex items-start gap-4 p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl text-left transition-all group"
              >
                <div className="p-3 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                  <feature.icon size={24} className="text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                    {feature.name}
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">{feature.description}</p>
                </div>
                <ChevronRight size={16} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />
              </button>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Page Header */}
      <div className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Zap size={24} className="text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Intelligence Dashboard</h1>
                <p className="text-sm text-slate-400">
                  Advanced features for smarter business management
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAlertCenter(!showAlertCenter)}
              className="relative p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Bell size={20} className="text-slate-400" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === 'overview'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard size={16} />
              Overview
            </button>
            {features.map(feature => (
              <button
                key={feature.id}
                onClick={() => setActiveTab(feature.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === feature.id
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <feature.icon size={16} />
                {feature.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Active Alerts</span>
                  <Bell size={16} className="text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-white mt-2">12</div>
                <div className="text-xs text-emerald-400 mt-1">3 high priority</div>
              </div>
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Data Issues</span>
                  <Shield size={16} className="text-red-400" />
                </div>
                <div className="text-2xl font-bold text-white mt-2">5</div>
                <div className="text-xs text-amber-400 mt-1">Requires attention</div>
              </div>
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Match Rate</span>
                  <Building size={16} className="text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-white mt-2">94%</div>
                <div className="text-xs text-emerald-400 mt-1">+2% this week</div>
              </div>
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Voice Commands</span>
                  <Mic size={16} className="text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-white mt-2">87%</div>
                <div className="text-xs text-emerald-400 mt-1">Success rate</div>
              </div>
            </div>

            {/* Feature Cards Grid */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">Quick Access</h2>
              {renderContent()}
            </div>

            {/* Two Column Layout for More Details */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Recent Recommendations</h2>
                <RecommendationsPanel />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Voice Command Widget</h2>
                <VoiceCommandWidget />
              </div>
            </div>
          </div>
        )}

        {activeTab !== 'overview' && (
          <div className="max-w-4xl mx-auto">
            {renderContent()}
          </div>
        )}
      </div>

      {/* Alert Notification Center Overlay */}
      {showAlertCenter && (
        <AlertNotificationCenter
          isOpen={showAlertCenter}
          onClose={() => setShowAlertCenter(false)}
        />
      )}
    </div>
  );
};

 IntelligenceDashboard;
