/**
 * Backup Service
 * Handles data backup, restore, and recovery operations
 */

class BackupService {
  constructor(database, appPath) {
    this.db = database;
    this.appPath = appPath;
    this.backupDir = null;
    this.autoBackupEnabled = true;
    this.autoBackupInterval = 24 * 60 * 60 * 1000; // 24 hours
    this.maxBackupCount = 10;
    this.compressionLevel = 6; // 0-9 for gzip
  }

  /**
   * Configure backup settings
   * @param {Object} settings - Backup settings
   */
  configure(settings = {}) {
    if (settings.backupDir) this.backupDir = settings.backupDir;
    if (typeof settings.autoBackupEnabled === 'boolean') this.autoBackupEnabled = settings.autoBackupEnabled;
    if (settings.autoBackupInterval) this.autoBackupInterval = settings.autoBackupInterval;
    if (settings.maxBackupCount) this.maxBackupCount = settings.maxBackupCount;
    if (settings.compressionLevel) this.compressionLevel = settings.compressionLevel;
  }

  /**
   * Get backup settings
   * @returns {Object} Current settings
   */
  getSettings() {
    return {
      backupDir: this.backupDir,
      autoBackupEnabled: this.autoBackupEnabled,
      autoBackupInterval: this.autoBackupInterval,
      maxBackupCount: this.maxBackupCount,
      compressionLevel: this.compressionLevel
    };
  }

  /**
   * Create manual backup
   * @param {string} destinationPath - Optional custom path
   * @returns {Object} Backup result
   */
  async createBackup(destinationPath = null) {
    try {
      const fs = require('fs');
      const path = require('path');
      const crypto = require('crypto');
      const zlib = require('zlib');

      // Determine backup location
      let backupPath = destinationPath;
      if (!backupPath) {
        if (!this.backupDir) {
          const defaultBackupDir = path.join(this.appPath, 'backups');
          if (!fs.existsSync(defaultBackupDir)) {
            fs.mkdirSync(defaultBackupDir, { recursive: true });
          }
          backupPath = defaultBackupDir;
        } else {
          backupPath = this.backupDir;
        }
      }

      // Generate backup filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const dbPath = this.db.dbPath;
      const fileName = `talk-to-accounts-backup-${timestamp}.ttabackup`;
      const fullPath = path.join(backupPath, fileName);

      // Create backup metadata
      const metadata = {
        version: '1.0',
        createdAt: new Date().toISOString(),
        appVersion: this.getAppVersion(),
        databasePath: dbPath,
        fileSize: fs.statSync(dbPath).size,
        checksum: null
      };

      // Read database
      const dbBuffer = fs.readFileSync(dbPath);
      
      // Create compressed backup
      return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(fullPath);
        const gzip = zlib.createGzip({ level: this.compressionLevel });
        
        // Create backup archive
        const backupData = {
          metadata,
          database: dbBuffer.toString('base64')
        };

        const jsonData = JSON.stringify(backupData);
        const compressed = zlib.gzipSync(jsonData, { level: this.compressionLevel });
        
        fs.writeFileSync(fullPath, compressed);

        // Calculate checksum
        const checksum = crypto.createHash('sha256').update(compressed).digest('hex');

        // Update metadata
        metadata.checksum = checksum;
        metadata.compressedSize = compressed.length;
        metadata.originalSize = dbBuffer.length;
        metadata.compressionRatio = ((1 - compressed.length / dbBuffer.length) * 100).toFixed(1);

        // Rewrite file with updated metadata
        backupData.metadata = metadata;
        const updatedJsonData = JSON.stringify(backupData);
        const updatedCompressed = zlib.gzipSync(updatedJsonData, { level: this.compressionLevel });
        fs.writeFileSync(fullPath, updatedCompressed);

        // Log backup creation
        this.logBackupAction('CREATE', fullPath, metadata);

        resolve({
          success: true,
          filePath: fullPath,
          fileName,
          metadata
        });
      });
    } catch (error) {
      console.error('Backup error:', error);
      return {
        success: false,
        error: 'BACKUP_FAILED',
        message: error.message
      };
    }
  }

  /**
   * Restore from backup
   * @param {string} backupPath - Path to backup file
   * @param {Object} options - Restore options
   * @returns {Object} Restore result
   */
  async restoreBackup(backupPath, options = {}) {
    try {
      const fs = require('fs');
      const path = require('path');
      const zlib = require('zlib');

      // Validate backup file
      if (!fs.existsSync(backupPath)) {
        return {
          success: false,
          error: 'FILE_NOT_FOUND',
          message: 'Backup file not found'
        };
      }

      // Check file extension
      if (!backupPath.endsWith('.ttabackup')) {
        return {
          success: false,
          error: 'INVALID_FORMAT',
          message: 'Invalid backup file format'
        };
      }

      // Read and decompress backup
      const compressed = fs.readFileSync(backupPath);
      const decompressed = zlib.gunzipSync(compressed);
      const backupData = JSON.parse(decompressed.toString());

      // Validate checksum
      const crypto = require('crypto');
      const expectedChecksum = backupData.metadata.checksum;
      const actualChecksum = crypto.createHash('sha256').update(compressed).digest('hex');

      if (expectedChecksum !== actualChecksum) {
        return {
          success: false,
          error: 'CHECKSUM_MISMATCH',
          message: 'Backup file is corrupted or modified'
        };
      }

      // Check version compatibility
      if (!this.isVersionCompatible(backupData.metadata.version)) {
        return {
          success: false,
          error: 'VERSION_INCOMPATIBLE',
          message: `Backup version ${backupData.metadata.version} is not compatible with current version`
        };
      }

      // Create pre-restore backup if enabled
      if (options.createSafetyBackup !== false) {
        const safetyResult = await this.createBackup();
        if (!safetyResult.success) {
          return {
            success: false,
            error: 'SAFETY_BACKUP_FAILED',
            message: 'Could not create safety backup before restore'
          };
        }
      }

      // Decode database
      const dbBuffer = Buffer.from(backupData.database, 'base64');
      const currentDbPath = this.db.dbPath;
      const currentDbSize = fs.statSync(currentDbPath).size;

      // Close current database connection
      this.db.db.close();

      // Backup current database
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupCurrentPath = currentDbPath.replace('.db', `-pre-restore-${timestamp}.db`);
      fs.copyFileSync(currentDbPath, backupCurrentPath);

      // Write restored database
      fs.writeFileSync(currentDbPath, dbBuffer);

      // Log restore action
      this.logBackupAction('RESTORE', backupPath, {
        preRestoreBackup: backupCurrentPath,
        originalSize: currentDbSize,
        restoredSize: dbBuffer.length
      });

      // Reinitialize database
      this.db.db = require('better-sqlite3')(currentDbPath);
      this.db.db.pragma('journal_mode = WAL');
      this.db.db.pragma('foreign_keys = ON');

      return {
        success: true,
        restoredFrom: backupData.metadata.createdAt,
        originalSize: currentDbSize,
        restoredSize: dbBuffer.length,
        safetyBackupPath: backupCurrentPath
      };
    } catch (error) {
      console.error('Restore error:', error);
      return {
        success: false,
        error: 'RESTORE_FAILED',
        message: error.message
      };
    }
  }

  /**
   * Get list of available backups
   * @param {string} backupDir - Directory to search
   * @returns {Array} List of backups
   */
  getBackupList(backupDir = null) {
    try {
      const fs = require('fs');
      const path = require('path');

      const searchDir = backupDir || this.backupDir || path.join(this.appPath, 'backups');
      
      if (!fs.existsSync(searchDir)) {
        return [];
      }

      const files = fs.readdirSync(searchDir)
        .filter(f => f.endsWith('.ttabackup'))
        .map(f => {
          const fullPath = path.join(searchDir, f);
          const stats = fs.statSync(fullPath);
          return {
            fileName: f,
            filePath: fullPath,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime
          };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return files;
    } catch (error) {
      console.error('Error getting backup list:', error);
      return [];
    }
  }

  /**
   * Delete backup file
   * @param {string} backupPath - Path to delete
   * @returns {Object} Deletion result
   */
  async deleteBackup(backupPath) {
    try {
      const fs = require('fs');
      
      if (!fs.existsSync(backupPath)) {
        return { success: false, error: 'FILE_NOT_FOUND' };
      }

      fs.unlinkSync(backupPath);
      
      this.logBackupAction('DELETE', backupPath, {});

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up old backups
   * @param {number} keepCount - Number of backups to keep
   * @returns {Object} Cleanup result
   */
  async cleanupOldBackups(keepCount = null) {
    try {
      const count = keepCount || this.maxBackupCount;
      const backups = this.getBackupList();

      if (backups.length <= count) {
        return {
          success: true,
          deleted: 0,
          message: 'No old backups to clean'
        };
      }

      const toDelete = backups.slice(count);
      let deleted = 0;

      for (const backup of toDelete) {
        const result = await this.deleteBackup(backup.filePath);
        if (result.success) deleted++;
      }

      return {
        success: true,
        deleted,
        remaining: backups.length - deleted
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get backup statistics
   * @returns {Object} Backup statistics
   */
  getBackupStats() {
    const backups = this.getBackupList();
    const recentBackups = backups.filter(b => {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return new Date(b.createdAt) > dayAgo;
    });

    const weekBackups = backups.filter(b => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return new Date(b.createdAt) > weekAgo;
    });

    const totalSize = backups.reduce((sum, b) => sum + b.size, 0);

    // Get last backup info
    const lastBackup = backups[0] || null;

    // Calculate storage trend
    const storageTrend = this.calculateStorageTrend(backups);

    return {
      totalBackups: backups.length,
      recentBackups: recentBackups.length,
      weekBackups: weekBackups.length,
      totalStorage: totalSize,
      lastBackup,
      storageTrend,
      autoBackupEnabled: this.autoBackupEnabled,
      autoBackupInterval: this.autoBackupInterval
    };
  }

  /**
   * Calculate storage trend
   */
  calculateStorageTrend(backups) {
    if (backups.length < 2) return 'stable';
    
    const recent = backups.slice(0, 5);
    const sizes = recent.map(b => b.size);
    const avg = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const latest = sizes[0];
    
    const change = ((latest - avg) / avg) * 100;
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  /**
   * Schedule auto backup
   * @param {Function} callback - Callback function
   */
  scheduleAutoBackup(callback) {
    if (!this.autoBackupEnabled) {
      return null;
    }

    const intervalId = setInterval(async () => {
      const result = await this.createBackup();
      callback?.(result);
    }, this.autoBackupInterval);

    return intervalId;
  }

  /**
   * Check and create backup if needed
   * @returns {Object} Backup status
   */
  async checkAndCreateBackup() {
    const backups = this.getBackupList();
    
    if (backups.length === 0) {
      const result = await this.createBackup();
      return { created: true, ...result };
    }

    const lastBackup = backups[0];
    const hoursSinceLastBackup = (Date.now() - new Date(lastBackup.createdAt).getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastBackup >= 24) {
      const result = await this.createBackup();
      return { created: true, ...result };
    }

    return {
      created: false,
      lastBackup: lastBackup.createdAt,
      hoursUntilNext: 24 - hoursSinceLastBackup
    };
  }

  /**
   * Validate backup file
   * @param {string} backupPath - Path to backup
   * @returns {Object} Validation result
   */
  validateBackup(backupPath) {
    try {
      const fs = require('fs');
      const zlib = require('zlib');

      if (!fs.existsSync(backupPath)) {
        return { valid: false, error: 'FILE_NOT_FOUND' };
      }

      const compressed = fs.readFileSync(backupPath);
      const decompressed = zlib.gunzipSync(compressed);
      const backupData = JSON.parse(decompressed.toString());

      // Validate metadata
      if (!backupData.metadata || !backupData.metadata.version) {
        return { valid: false, error: 'INVALID_METADATA' };
      }

      // Validate database
      if (!backupData.database) {
        return { valid: false, error: 'MISSING_DATABASE' };
      }

      // Validate checksum
      const crypto = require('crypto');
      const expectedChecksum = backupData.metadata.checksum;
      const actualChecksum = crypto.createHash('sha256').update(compressed).digest('hex');

      if (expectedChecksum !== actualChecksum) {
        return { valid: false, error: 'CHECKSUM_MISMATCH' };
      }

      // Validate version compatibility
      if (!this.isVersionCompatible(backupData.metadata.version)) {
        return { valid: false, error: 'VERSION_INCOMPATIBLE', version: backupData.metadata.version };
      }

      // Try to decode database
      const dbBuffer = Buffer.from(backupData.database, 'base64');
      
      return {
        valid: true,
        version: backupData.metadata.version,
        createdAt: backupData.metadata.createdAt,
        originalSize: backupData.metadata.fileSize,
        compressedSize: compressed.length,
        checksum: expectedChecksum
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Export data to portable format
   * @param {Object} options - Export options
   * @returns {Object} Export result
   */
  async exportData(options = {}) {
    try {
      const fs = require('fs');
      const path = require('path');
      const zlib = require('zlib');

      const exportData = {
        metadata: {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          appVersion: this.getAppVersion(),
          includeTransactions: options.includeTransactions !== false,
          includeParties: options.includeParties !== false,
          includeProducts: options.includeProducts !== false,
          includeSettings: options.includeSettings !== false
        },
        data: {}
      };

      // Export transactions
      if (exportData.metadata.includeTransactions) {
        exportData.data.transactions = this.db.prepare(`
          SELECT * FROM transactions WHERE is_active = 1 ORDER BY date DESC
        `).all();
      }

      // Export parties
      if (exportData.metadata.includeParties) {
        exportData.data.parties = this.db.prepare(`
          SELECT * FROM parties WHERE is_active = 1
        `).all();
      }

      // Export products
      if (exportData.metadata.includeProducts) {
        exportData.data.products = this.db.prepare(`
          SELECT * FROM products WHERE is_active = 1
        `).all();
      }

      // Export settings
      if (exportData.metadata.includeSettings) {
        exportData.data.settings = this.db.prepare(`SELECT * FROM settings`).all();
        exportData.data.businessInfo = this.db.prepare(`SELECT * FROM business_info`).all();
      }

      // Create export file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `talk-to-accounts-export-${timestamp}.ttaexport`;
      const exportPath = path.join(this.appPath, 'exports', fileName);
      
      const exportsDir = path.dirname(exportPath);
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }

      const jsonData = JSON.stringify(exportData);
      const compressed = zlib.gzipSync(jsonData);
      fs.writeFileSync(exportPath, compressed);

      // Calculate checksum
      const crypto = require('crypto');
      const checksum = crypto.createHash('sha256').update(compressed).digest('hex');

      return {
        success: true,
        filePath: exportPath,
        fileName,
        originalSize: jsonData.length,
        compressedSize: compressed.length,
        checksum,
        recordCounts: {
          transactions: exportData.data.transactions?.length || 0,
          parties: exportData.data.parties?.length || 0,
          products: exportData.data.products?.length || 0
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Log backup action
   */
  logBackupAction(action, filePath, details) {
    try {
      const logEntry = {
        action,
        filePath,
        details,
        timestamp: new Date().toISOString()
      };

      const logPath = path.join(this.appPath, 'backup-logs.json');
      let logs = [];
      
      try {
        if (require('fs').existsSync(logPath)) {
          logs = JSON.parse(require('fs').readFileSync(logPath, 'utf8'));
        }
      } catch (e) {
        logs = [];
      }

      logs.push(logEntry);
      
      // Keep only last 100 entries
      if (logs.length > 100) {
        logs = logs.slice(-100);
      }

      require('fs').writeFileSync(logPath, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error('Error logging backup action:', error);
    }
  }

  /**
   * Get app version
   */
  getAppVersion() {
    try {
      const packageJson = require('../../package.json');
      return packageJson.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  /**
   * Check version compatibility
   */
  isVersionCompatible(version) {
    const [major] = version.split('.').map(Number);
    const [currentMajor] = this.getAppVersion().split('.').map(Number);
    return major === currentMajor;
  }

  /**
   * Get backup logs
   */
  getBackupLogs(limit = 50) {
    try {
      const logPath = require('path').join(this.appPath, 'backup-logs.json');
      const fs = require('fs');
      
      if (!fs.existsSync(logPath)) {
        return [];
      }

      const logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      return logs.slice(-limit).reverse();
    } catch {
      return [];
    }
  }
}

module.exports = BackupService;
