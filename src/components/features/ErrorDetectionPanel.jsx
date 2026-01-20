import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import errorDetectionService from '../../services/errorDetection';

const ErrorDetectionPanel = () => {
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [expandedError, setExpandedError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [lastScan, setLastScan] = useState(null);

  const errorTypes = errorDetectionService.getErrorTypes();

  useEffect(() => {
    // Load cached errors on mount
    const cached = errorDetectionService.getCachedErrors();
    if (cached.errors.length > 0) {
      setErrors(cached.errors);
      setLastScan(cached.scannedAt);
      setSummary(errorDetectionService.summarizeErrors(cached.errors));
    }
  }, []);

  const handleScan = useCallback(async () => {
    setScanning(true);
    try {
      const result = await errorDetectionService.scan(selectedTypes);
      if (result.success) {
        setErrors(result.errors);
        setSummary(result.summary);
        setLastScan(result.scannedAt);
      }
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setScanning(false);
    }
  }, [selectedTypes]);

  const handleFixError = async (error) => {
    try {
      await errorDetectionService.fixError(error.type, error.entity_ids[0]);
      setErrors(prev => prev.filter(e => e.id !== error.id));
      setSummary(prev => ({
        ...prev,
        total: prev.total - 1,
        bySeverity: {
          ...prev.bySeverity,
          [error.severity]: Math.max(0, (prev.bySeverity[error.severity] || 0) - 1)
        }
      }));
    } catch (error) {
      console.error('Fix failed:', error);
    }
  };

  const handleExport = (format) => {
    const report = errorDetectionService.exportReport(format);
    const blob = new Blob([report], {
      type: format === 'json' ? 'application/json' : 'text/csv'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-report-${new Date().toISOString().split('T')[0]}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle size={18} className="text-red-400" />;
      case 'medium':
        return <AlertCircle size={18} className="text-amber-400" />;
      case 'low':
        return <Info size={18} className="text-blue-400" />;
      default:
        return <Info size={18} className="text-gray-400" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'medium':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'low':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      default:
        return 'bg-gray-500/10 border-gray-500/30 text-gray-400';
    }
  };

  const formatEntityIds = (ids) => {
    if (!ids || ids.length === 0) return 'N/A';
    if (ids.length === 1) return `#${ids[0]}`;
    return `${ids.length} items`;
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Shield size={20} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Error Detection Engine</h2>
            <p className="text-xs text-slate-400">
              Scan and fix data inconsistencies
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
          >
            <RefreshCw size={16} className={scanning ? 'animate-spin' : ''} />
            {scanning ? 'Scanning...' : 'Run Scan'}
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700">
        <div className="flex items-center gap-2 mb-2">
          <Filter size={14} className="text-slate-400" />
          <span className="text-xs font-medium text-slate-400">Error Types to Scan:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {errorTypes.map(type => (
            <label
              key={type.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                selectedTypes.includes(type.id)
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedTypes.includes(type.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedTypes(prev => [...prev, type.id]);
                  } else {
                    setSelectedTypes(prev => prev.filter(t => t !== type.id));
                  }
                }}
                className="hidden"
              />
              <span className="text-xs font-medium">{type.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-4 gap-px bg-slate-800">
          <div className="bg-slate-900 p-4">
            <div className="text-2xl font-bold text-white">{summary.total}</div>
            <div className="text-xs text-slate-400">Total Issues</div>
          </div>
          <div className="bg-slate-900 p-4">
            <div className="text-2xl font-bold text-red-400">{summary.bySeverity.high || 0}</div>
            <div className="text-xs text-slate-400">High Priority</div>
          </div>
          <div className="bg-slate-900 p-4">
            <div className="text-2xl font-bold text-amber-400">{summary.bySeverity.medium || 0}</div>
            <div className="text-xs text-slate-400">Medium Priority</div>
          </div>
          <div className="bg-slate-900 p-4">
            <div className="text-2xl font-bold text-blue-400">{summary.bySeverity.low || 0}</div>
            <div className="text-xs text-slate-400">Low Priority</div>
          </div>
        </div>
      )}

      {/* Error List */}
      <div className="max-h-96 overflow-y-auto">
        {errors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <CheckCircle size={48} className="mb-4 text-emerald-500/50" />
            <p className="text-lg font-medium text-slate-400">No errors found</p>
            <p className="text-sm text-slate-500 mt-1">
              {lastScan ? `Last scan: ${lastScan.toLocaleString()}` : 'Run a scan to check for issues'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {errors.map((error, index) => (
              <div key={index} className="p-4">
                <div
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${getSeverityColor(error.severity)}`}
                  onClick={() => setExpandedError(expandedError === index ? null : index)}
                >
                  {getSeverityIcon(error.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-white truncate">{error.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 bg-slate-800 rounded-full capitalize">
                          {error.type.replace('_', ' ')}
                        </span>
                        {expandedError === index ? (
                          <ChevronUp size={14} className="text-slate-400" />
                        ) : (
                          <ChevronDown size={14} className="text-slate-400" />
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{error.description}</p>

                    {expandedError === index && (
                      <div className="mt-3 pt-3 border-t border-slate-700">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-slate-500">Affected:</span>
                            <span className="ml-2 text-slate-300">{formatEntityIds(error.entity_ids)}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Type:</span>
                            <span className="ml-2 text-slate-300 capitalize">{error.entity_type}</span>
                          </div>
                        </div>
                        <div className="mt-3 p-2 bg-slate-800/50 rounded-lg">
                          <span className="text-xs text-slate-500 block mb-1">Suggestion:</span>
                          <p className="text-sm text-slate-300">{error.suggestion}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFixError(error);
                          }}
                          className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm transition-colors"
                        >
                          <CheckCircle size={14} />
                          Fix This Issue
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {errors.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-t border-slate-700">
          <span className="text-xs text-slate-400">
            {lastScan && `Last scan: ${lastScan.toLocaleString()}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('json')}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Download size={14} />
              Export JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ErrorDetectionPanel;
