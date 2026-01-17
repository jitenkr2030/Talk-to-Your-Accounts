import React, { useState, useEffect, useCallback } from 'react';
import {
  Lightbulb,
  Check,
  X,
  ChevronRight,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Package,
  FileText,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import api from '../../utils/api';

const RecommendationsPanel = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [generating, setGenerating] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.recommendations.get({
        unreadOnly: filter === 'unread',
        unappliedOnly: filter === 'unapplied'
      });
      setRecommendations(data);
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const count = await api.recommendations.generate();
      await fetchRecommendations();
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.recommendations.markRead(id);
      setRecommendations(prev => prev.map(r => r.id === id ? { ...r, is_read: 1 } : r));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleApply = async (id) => {
    try {
      await api.recommendations.apply(id);
      setRecommendations(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Failed to apply recommendation:', error);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'cash_flow':
        return <DollarSign size={18} className="text-emerald-400" />;
      case 'collections':
        return <TrendingUp size={18} className="text-amber-400" />;
      case 'stock':
        return <Package size={18} className="text-blue-400" />;
      case 'gst':
        return <FileText size={18} className="text-purple-400" />;
      default:
        return <Lightbulb size={18} className="text-yellow-400" />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'cash_flow':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'collections':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
      case 'stock':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
      case 'gst':
        return 'bg-purple-500/10 border-purple-500/20 text-purple-400';
      default:
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
    }
  };

  const getPriorityLabel = (priority) => {
    if (priority >= 8) return { label: 'Critical', color: 'text-red-400' };
    if (priority >= 6) return { label: 'High', color: 'text-amber-400' };
    if (priority >= 4) return { label: 'Medium', color: 'text-blue-400' };
    return { label: 'Low', color: 'text-slate-400' };
  };

  const unreadCount = recommendations.filter(r => !r.is_read).length;

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Lightbulb size={20} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Smart Recommendations</h2>
            <p className="text-xs text-slate-400">
              AI-powered insights for your business
            </p>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
        >
          <Sparkles size={16} className={generating ? 'animate-spin' : ''} />
          {generating ? 'Analyzing...' : 'Generate New'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-1 px-4 py-2 bg-slate-800/50 border-b border-slate-700">
        {[
          { key: 'all', label: 'All' },
          { key: 'unread', label: 'Unread', count: unreadCount },
          { key: 'unapplied', label: 'To Apply' }
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === f.key
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {f.label}
            {f.count !== undefined && f.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-slate-700 rounded-full">{f.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Recommendations List */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw size={32} className="animate-spin text-emerald-400" />
          </div>
        ) : recommendations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Lightbulb size={48} className="mb-4 text-slate-600" />
            <p className="text-lg font-medium text-slate-400">No recommendations</p>
            <p className="text-sm text-slate-500 mt-1">
              Click "Generate New" to analyze your data
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {recommendations.map(rec => {
              const priority = getPriorityLabel(rec.priority);
              return (
                <div key={rec.id} className="p-4 hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg border ${getCategoryColor(rec.category)}`}>
                      {getCategoryIcon(rec.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-medium text-white ${!rec.is_read ? 'font-semibold' : ''}`}>
                          {rec.title}
                        </h3>
                        {!rec.is_read && (
                          <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mb-2">{rec.description}</p>
                      {rec.actionable && (
                        <div className="p-2 bg-slate-800/50 rounded-lg mb-2">
                          <span className="text-xs text-slate-500 block mb-1">Recommended Action:</span>
                          <p className="text-sm text-slate-300">{rec.actionable}</p>
                        </div>
                      )}
                      {rec.potential_impact && (
                        <p className="text-xs text-emerald-400">
                          Impact: {rec.potential_impact}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 ${priority.color}`}>
                          {priority.label}
                        </span>
                        <span className="text-xs text-slate-500 capitalize">
                          {rec.category.replace('_', ' ')}
                        </span>
                        {!rec.is_applied && (
                          <div className="flex items-center gap-2 ml-auto">
                            <button
                              onClick={() => handleMarkRead(rec.id)}
                              className="text-xs text-slate-400 hover:text-white"
                            >
                              Dismiss
                            </button>
                            <button
                              onClick={() => handleApply(rec.id)}
                              className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded text-xs transition-colors"
                            >
                              <Check size={12} />
                              Apply
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-t border-slate-700">
        <span className="text-xs text-slate-400">
          {recommendations.length} recommendation{recommendations.length !== 1 ? 's' : ''}
        </span>
        <span className="text-xs text-slate-500">
          Powered by AI analysis
        </span>
      </div>
    </div>
  );
};

export default RecommendationsPanel;
