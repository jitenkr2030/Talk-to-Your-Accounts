import React, { useState } from 'react';
import {
  Download,
  Upload,
  Shield,
  Database,
  FileJson,
  FileType,
  FileText,
  Cloud,
  Lock,
  Key,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Settings,
  ChevronRight,
  FolderOpen,
  Save,
  Eye,
  EyeOff,
  Info
} from 'lucide-react';
import EncryptedExportModal from '../components/EncryptedExportModal';

const DataManagementPage = () => {
  const [showExportModal, setShowExportModal] = useState(false);
  const [activeTab, setActiveTab] = useState('export');
  const [lastBackup, setLastBackup] = useState(null);
  const [backupInProgress, setBackupInProgress] = useState(false);

  const handleBackup = async () => {
    setBackupInProgress(true);
    try {
      const result = await window.api.dataManagement.backup();
      if (result.success) {
        setLastBackup(new Date().toISOString());
      }
    } catch (error) {
      console.error('Backup failed:', error);
    } finally {
      setBackupInProgress(false);
    }
  };

  const handleExportComplete = (result) => {
    console.log('Export completed:', result);
  };

  const tabs = [
    { id: 'export', label: 'Export Data', icon: Download },
    { id: 'backup', label: 'Backup/Restore', icon: Database },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Data Management</h1>
          <p className="text-slate-400 mt-1">Export, backup, and secure your accounting data</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'export' && (
          <div className="grid grid-cols-2 gap-6">
            {/* Secure Export Card */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-lg">
                    <Shield size={28} className="text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Secure Encrypted Export</h2>
                    <p className="text-sm text-slate-400">AES-256 encrypted data export for secure sharing</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3 p-4 bg-slate-800/50 rounded-lg">
                  <Lock size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-white">Password Protected</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Your exported data is encrypted with AES-256-CBC encryption. Only someone with the password can access the data.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-slate-800/50 rounded-lg">
                  <FileJson size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-white">Multiple Formats</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Export to JSON, CSV, or PDF formats based on your needs.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-slate-800/50 rounded-lg">
                  <Key size={20} className="text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-white">No Password Recovery</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      Make sure to remember your password! We cannot recover encrypted data if the password is lost.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowExportModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
                >
                  <Download size={20} />
                  Start Secure Export
                </button>
              </div>
            </div>

            {/* Standard Export */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <Download size={28} className="text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Standard Export</h2>
                    <p className="text-sm text-slate-400">Quick export without encryption</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-400">
                  Export your data in standard formats for use in other applications or for local archiving.
                </p>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { format: 'json', icon: FileJson, color: 'text-blue-400', label: 'JSON' },
                    { format: 'csv', icon: FileType, color: 'text-green-400', label: 'CSV' },
                    { format: 'xlsx', icon: FileText, color: 'text-emerald-400', label: 'Excel' }
                  ].map(opt => (
                    <button
                      key={opt.format}
                      className="flex flex-col items-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                    >
                      <opt.icon size={24} className={opt.color} />
                      <span className="text-sm text-white">{opt.label}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={async () => {
                    const data = await window.api.dataManagement.export();
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  <Download size={20} />
                  Export All Data (JSON)
                </button>
              </div>
            </div>

            {/* Import Section */}
            <div className="col-span-2 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-500/10 rounded-lg">
                    <Upload size={28} className="text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Import Data</h2>
                    <p className="text-sm text-slate-400">Restore data from previous exports</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
                  <div className="flex items-center gap-4">
                    <FolderOpen size={32} className="text-slate-500" />
                    <div>
                      <p className="text-sm text-white">Drop a backup file here or click to browse</p>
                      <p className="text-xs text-slate-500 mt-1">Supports JSON files exported from this application</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors">
                    Browse Files
                  </button>
                </div>

                <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
                  <AlertTriangle size={20} className="text-amber-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-amber-400">Warning</h4>
                    <p className="text-sm text-amber-400/70 mt-1">
                      Importing data will merge with existing records. Some duplicates may be skipped. Make sure to backup your current data before importing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="grid grid-cols-2 gap-6">
            {/* Database Backup */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/10 rounded-lg">
                    <Database size={28} className="text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Database Backup</h2>
                    <p className="text-sm text-slate-400">Create a complete backup of your database</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="p-4 bg-slate-800/50 rounded-lg mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Last Backup</p>
                      <p className="text-white font-medium">
                        {lastBackup ? new Date(lastBackup).toLocaleString() : 'Never'}
                      </p>
                    </div>
                    {lastBackup && <CheckCircle size={20} className="text-emerald-400" />}
                  </div>
                </div>

                <button
                  onClick={handleBackup}
                  disabled={backupInProgress}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                >
                  {backupInProgress ? (
                    <>
                      <RefreshCw size={20} className="animate-spin" />
                      Backing Up...
                    </>
                  ) : (
                    <>
                      <Database size={20} />
                      Create Backup
                    </>
                  )}
                </button>

                <p className="text-xs text-slate-500 mt-3 text-center">
                  Backup will be saved to your Documents folder
                </p>
              </div>
            </div>

            {/* Cloud Backup Info */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <Cloud size={28} className="text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Cloud Backup</h2>
                    <p className="text-sm text-slate-400">Coming soon</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="p-4 bg-slate-800 rounded-full mb-4">
                    <Cloud size={40} className="text-slate-600" />
                  </div>
                  <h3 className="font-medium text-white">Cloud Sync Coming Soon</h3>
                  <p className="text-sm text-slate-400 mt-2 max-w-xs">
                    Automatically backup your data to secure cloud storage and access from multiple devices.
                  </p>
                </div>

                <button className="w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg font-medium transition-colors" disabled>
                  <Cloud size={20} className="inline mr-2" />
                  Notify When Available
                </button>
              </div>
            </div>

            {/* Restore */}
            <div className="col-span-2 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-500/10 rounded-lg">
                    <RefreshCw size={28} className="text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Restore Database</h2>
                    <p className="text-sm text-slate-400">Restore from a previous backup file</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
                  <div className="flex items-center gap-4">
                    <Database size={32} className="text-slate-500" />
                    <div>
                      <p className="text-sm text-white">Select a database backup file (.db)</p>
                      <p className="text-xs text-slate-500 mt-1">
                        This will replace your current database. Make sure to backup first!
                      </p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors">
                    Select File
                  </button>
                </div>

                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                  <AlertTriangle size={20} className="text-red-400 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-red-400">Danger Zone</h4>
                    <p className="text-sm text-red-400/70 mt-1">
                      Restoring a backup will permanently replace all current data. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden max-w-2xl">
            <div className="p-6 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">Export Settings</h2>
              <p className="text-sm text-slate-400">Configure default export options</p>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Default Export Format</label>
                <select className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500">
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="xlsx">Excel (XLSX)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Date Format in Exports</label>
                <select className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500">
                  <option value="iso">ISO (YYYY-MM-DD)</option>
                  <option value="in">Indian (DD/MM/YYYY)</option>
                  <option value="us">US (MM/DD/YYYY)</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-white">Include audit logs in export</p>
                  <p className="text-xs text-slate-400 mt-1">Add activity history to backup files</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-white">Auto-backup on exit</p>
                  <p className="text-xs text-slate-400 mt-1">Automatically create backup when closing app</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <button className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors">
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Export Modal */}
      <EncryptedExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExportComplete={handleExportComplete}
      />
    </div>
  );
};

export default DataManagementPage;
