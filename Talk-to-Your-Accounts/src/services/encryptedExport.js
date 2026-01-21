import api from '../utils/api';

/**
 * Encrypted Export Service
 * Handles secure data export with AES-256 encryption
 */
class EncryptedExportService {
  constructor() {
    this.supportedFormats = ['csv', 'json', 'pdf'];
    this.encryptionAlgorithm = 'aes-256-cbc';
  }

  /**
   * Validate password strength
   */
  validatePassword(password) {
    const errors = [];

    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength: this.calculateStrength(password)
    };
  }

  /**
   * Calculate password strength (0-100)
   */
  calculateStrength(password) {
    if (!password) return 0;

    let score = 0;
    const len = password.length;

    // Length scoring
    if (len >= 8) score += 20;
    if (len >= 12) score += 10;
    if (len >= 16) score += 10;

    // Character variety scoring
    if (/[A-Z]/.test(password)) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 15;

    return Math.min(100, score);
  }

  /**
   * Get available data types for export
   */
  getExportDataTypes() {
    return [
      { id: 'transactions', name: 'Transactions', description: 'All sales, purchases, and journal entries', icon: 'FileText' },
      { id: 'parties', name: 'Parties/Ledgers', description: 'Customers, suppliers, and other parties', icon: 'Users' },
      { id: 'products', name: 'Products/Services', description: 'Inventory items and service descriptions', icon: 'Package' },
      { id: 'expenses', name: 'Expenses', description: 'All recorded expenses', icon: 'DollarSign' },
      { id: 'gst_returns', name: 'GST Records', description: 'GST return summaries and details', icon: 'FileText' },
      { id: 'payments', name: 'Payments & Receipts', description: 'All payment and receipt records', icon: 'CreditCard' }
    ];
  }

  /**
   * Prepare export data
   */
  async prepareExportData(options) {
    const { startDate, endDate, dataTypes } = options;
    const data = {};

    try {
      // Fetch data based on selected types
      if (dataTypes.includes('transactions')) {
        const transactions = await api.reports.getSalesReport({ startDate, endDate });
        data.transactions = transactions.transactions;
      }

      if (dataTypes.includes('parties')) {
        data.parties = await api.parties.get();
      }

      if (dataTypes.includes('products')) {
        data.products = await api.products.get();
      }

      if (dataTypes.includes('expenses')) {
        data.expenses = await api.expenses.get({ startDate, endDate });
      }

      if (dataTypes.includes('gst_returns')) {
        data.gstReturns = await api.gstReturns.get();
      }

      if (dataTypes.includes('payments')) {
        data.payments = await api.payments.get({ startDate, endDate });
      }

      // Add metadata
      data._exportMetadata = {
        exportedAt: new Date().toISOString(),
        startDate,
        endDate,
        dataTypes,
        version: '1.0'
      };

      return { success: true, data };
    } catch (error) {
      console.error('Failed to prepare export data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Convert data to specified format
   */
  formatData(data, format) {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);

      case 'csv':
        return this.convertToCSV(data);

      case 'pdf':
        // PDF generation is handled in main process
        return data;

      default:
        return JSON.stringify(data, null, 2);
    }
  }

  /**
   * Convert data object to CSV format
   */
  convertToCSV(data) {
    const csvLines = [];

    for (const [entityType, records] of Object.entries(data)) {
      if (entityType === '_exportMetadata' || !Array.isArray(records) || records.length === 0) {
        continue;
      }

      // Add section header
      csvLines.push(`\n=== ${entityType.toUpperCase()} ===\n`);

      // Get headers from first record
      const headers = Object.keys(records[0]);
      csvLines.push(headers.join(','));

      // Add data rows
      for (const record of records) {
        const row = headers.map(header => {
          const value = record[header];
          // Escape quotes and wrap in quotes if contains comma or quote
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        });
        csvLines.push(row.join(','));
      }
    }

    return csvLines.join('\n');
  }

  /**
   * Request export with encryption
   */
  async exportEncrypted(data, options) {
    const { format, password, filename } = options;

    try {
      const result = await api.dataManagement.exportEncrypted({
        data: this.formatData(data, format),
        format,
        password,
        filename
      });

      return result;
    } catch (error) {
      console.error('Encrypted export failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Quick export - export all data with default settings
   */
  async quickExport(password) {
    try {
      const exportData = await api.dataManagement.export();
      const result = await this.exportEncrypted(exportData, {
        format: 'json',
        password,
        filename: `backup_${new Date().toISOString().split('T')[0]}`
      });

      return result;
    } catch (error) {
      console.error('Quick export failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate suggested filename
   */
  generateFilename(type, format, dateRange) {
    const date = new Date().toISOString().split('T')[0];
    const prefix = type === 'full' ? 'full_backup' : 'export';
    return `${prefix}_${date}.${format}`;
  }

  /**
   * Estimate export size
   */
  estimateSize(data, format) {
    const jsonString = JSON.stringify(data);
    const bytes = new Blob([jsonString]).size;

    // CSV is typically larger than JSON
    // Encrypted data adds overhead
    const multiplier = format === 'csv' ? 1.2 : 1.0;
    const encryptionOverhead = 1.1; // 10% overhead for encryption

    return Math.ceil(bytes * multiplier * encryptionOverhead);
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default new EncryptedExportService();
