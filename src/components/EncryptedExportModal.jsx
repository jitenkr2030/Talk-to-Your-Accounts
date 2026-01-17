import React, { useState, useCallback } from 'react';
import {
  Lock,
  Unlock,
  Download,
  FileText,
  FileJson,
  FileType,
  Calendar,
  Check,
  X,
  Eye,
  EyeOff,
  AlertTriangle,
  Shield,
  ChevronRight,
  RefreshCw,
  Info
} from 'lucide-react';
import encryptedExportService from '../services/encryptedExport';

const EncryptedExportModal = ({ isOpen, onClose, onExportComplete }) => {
  const [step, setStep] = useState(1);
  const [dataTypes, setDataTypes] = useState({
    transactions: true,
    parties: true,
    products: true,
    expenses: false,
    gst_returns: false,
    payments: false
  });
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [format, setFormat] = useState('json');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ status: '', percent: 0 });
  const [error, setError] = useState(null);
  const [passwordValidation, setPasswordValidation] = useState({ isValid: true, errors: [], strength: 0 });

  const exportTypes = encryptedExportService.getExportDataTypes();

  const handlePasswordChange = useCallback((value) => {
    setPassword(value);
    setPasswordValidation(encryptedExportService.validatePassword(value));
  }, []);

  const handleDataTypeToggle = (typeId) => {
    setDataTypes(prev => ({
      ...prev,
      [typeId]: !prev[typeId]
    }));
  };

  const handleSelectAll = () => {
    const allSelected = Object.values(dataTypes).every(v => v);
    setDataTypes({
      transactions: !allSelected,
      parties: !allSelected,
      products: !allSelected,
      expenses: !allSelected,
      gst_returns: !allSelected,
      payments: !allSelected
    });
  };

  const canProceed = () => {
    if (step === 1) {
      return Object.values(dataTypes).some(v => v);
    }
    if (step === 2) {
      return dateRange.startDate && dateRange.endDate;
    }
    if (step === 3) {
      return passwordValidation.isValid && password === confirmPassword;
    }
    return false;
  };

  const handleExport = async () => {
    setLoading(true);
    setProgress({ status: 'Preparing data...', percent: 10 });

    try {
      // Prepare export data
      const selectedTypes = Object.entries(dataTypes)
        .filter(([_, selected]) => selected)
        .map(([type]) => type);

      const prepResult = await encryptedExportService.prepareExportData({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        dataTypes: selectedTypes
      });

      if (!prepResult.success) {
        throw new Error(prepResult.error);
      }

      setProgress({ status: 'Encrypting data...', percent: 50 });

      // Generate filename
      const filename = encryptedExportService.generateFilename(
        selectedTypes.length === 6 ? 'full' : 'partial',
        format,
        dateRange
      );

      // Export with encryption
      const result = await encryptedExportService.exportEncrypted(prepResult.data, {
        format,
        password,
        filename
      });

      if (result.canceled) {
        setLoading(false);
        return;
      }

      if (!result.success) {
        throw new Error(result.error);
      }

      setProgress({ status: 'Export complete!', percent: 100 });

      setTimeout(() => {
        setLoading(false);
        onExportComplete?.(result);
        handleClose();
      }, 1500);

    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  const handleClose = () => {
    setStep(1);
    setDataTypes({
      transactions: true,
      parties: true,
      products: true,
      expenses: false,
      gst_returns: false,
      payments: false
    });
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setProgress({ status: '', percent: 0 });
    onClose();
  };

  const getStrengthColor = (strength) => {
    if (strength < 40) return 'bg-red-500';
    if (strength < 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStrengthLabel = (strength) => {
    if (strength < 40) return 'Weak';
    if (strength < 70) return 'Medium';
    return 'Strong';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Shield size={24} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Secure Export</h2>
              <p className="text-xs text-slate-400">AES-256 encrypted data export</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Progress Bar */}
        {loading && (
          <div className="px-6 py-2 bg-slate-800/50">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>{progress.status}</span>
              <span>{progress.percent}%</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
            <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-400">Export failed</p>
              <p className="text-xs text-red-400/70 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 px-6 py-4">
          {[1, 2, 3, 4].map((s) => (
            <React.Fragment key={s}>
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  step >= s
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {step > s ? <Check size={16} /> : s}
              </div>
              {s < 4 && (
                <div
                  className={`w-16 h-0.5 ${
                    step > s ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Step 1: Data Selection */}
          {step === 1 && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Select Data to Export</h3>

              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-emerald-400 hover:text-emerald-300"
                >
                  {Object.values(dataTypes).every(v => v) ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="space-y-2">
                {exportTypes.map(type => (
                  <label
                    key={type.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      dataTypes[type.id]
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={dataTypes[type.id]}
                      onChange={() => handleDataTypeToggle(type.id)}
                      className="hidden"
                    />
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      dataTypes[type.id]
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-slate-600'
                    }`}>
                      {dataTypes[type.id] && <Check size={14} className="text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{type.name}</p>
                      <p className="text-xs text-slate-400">{type.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Date Range */}
          {step === 2 && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Select Date Range</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">End Date</label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                <p className="text-xs text-slate-400">Quick Select:</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    { label: 'This Month', getDates: () => ({ start: new Date().toISOString().slice(0, 8) + '01', end: new Date().toISOString().split('T')[0] }) },
                    { label: 'This Quarter', getDates: () => {
                      const now = new Date();
                      const quarter = Math.floor(now.getMonth() / 3);
                      return { start: new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] };
                    }},
                    { label: 'This Year', getDates: () => ({ start: new Date().getFullYear() + '-01-01', end: new Date().toISOString().split('T')[0] }) },
                    { label: 'Last Year', getDates: () => ({ start: (new Date().getFullYear() - 1) + '-01-01', end: (new Date().getFullYear() - 1) + '-12-31' }) }
                  ].map(preset => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        const dates = preset.getDates();
                        setDateRange({ startDate: dates.start, endDate: dates.end });
                      }}
                      className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Format & Password */}
          {step === 3 && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Security Settings</h3>

              {/* Format Selection */}
              <div className="mb-6">
                <label className="block text-sm text-slate-400 mb-2">Export Format</label>
                <div className="flex gap-2">
                  {[
                    { id: 'json', label: 'JSON', icon: FileJson },
                    { id: 'csv', label: 'CSV', icon: FileType },
                    { id: 'pdf', label: 'PDF', icon: FileText }
                  ].map(fmt => (
                    <button
                      key={fmt.id}
                      onClick={() => setFormat(fmt.id)}
                      className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                        format === fmt.id
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <fmt.icon size={18} />
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Encryption Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      placeholder="Enter strong password"
                      className="w-full pl-10 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Password Strength */}
                  {password && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-400">Password Strength</span>
                        <span className={
                          passwordValidation.strength < 40 ? 'text-red-400' :
                          passwordValidation.strength < 70 ? 'text-amber-400' : 'text-emerald-400'
                        }>
                          {getStrengthLabel(passwordValidation.strength)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${getStrengthColor(passwordValidation.strength)}`}
                          style={{ width: `${passwordValidation.strength}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Password Errors */}
                {passwordValidation.errors.length > 0 && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-xs text-red-400 mb-1">Password must:</p>
                    <ul className="text-xs text-red-400/70 list-disc list-inside">
                      {passwordValidation.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      className={`w-full pl-10 pr-10 py-2 bg-slate-800 border rounded-lg text-white placeholder-slate-500 focus:outline-none ${
                        confirmPassword && password !== confirmPassword
                          ? 'border-red-500'
                          : 'border-slate-700 focus:border-emerald-500'
                      }`}
                    />
                    {confirmPassword && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {password === confirmPassword ? (
                          <Check size={18} className="text-emerald-400" />
                        ) : (
                          <X size={18} className="text-red-400" />
                        )}
                      </div>
                    )}
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
                  )}
                </div>
              </div>

              {/* Security Notice */}
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-400">
                  Make sure to remember your password! Encrypted data cannot be recovered without it.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Confirm Export</h3>

              <div className="p-4 bg-slate-800/50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Data Types</span>
                  <span className="text-sm text-white">
                    {Object.entries(dataTypes).filter(([_, v]) => v).length} selected
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Date Range</span>
                  <span className="text-sm text-white">
                    {dateRange.startDate} to {dateRange.endDate}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Format</span>
                  <span className="text-sm text-white uppercase">{format}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Encryption</span>
                  <span className="text-sm text-emerald-400 flex items-center gap-1">
                    <Shield size={14} />
                    AES-256
                  </span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                <p className="text-xs text-slate-400 mb-2">Selected Data:</p>
                <div className="flex flex-wrap gap-2">
                  {exportTypes.filter(t => dataTypes[t.id]).map(t => (
                    <span key={t.id} className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded">
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-t border-slate-700">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                Continue
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleExport}
                disabled={loading || password !== confirmPassword || !passwordValidation.isValid}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Export Securely
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EncryptedExportModal;
