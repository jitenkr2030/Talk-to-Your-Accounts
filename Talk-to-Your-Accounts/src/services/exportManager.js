/**
 * Export Manager Service
 * Handles exporting reports to various formats (PDF, Excel, CSV, Print)
 */

class ExportManager {
  constructor() {
    this.exportFormats = ['pdf', 'excel', 'csv', 'print'];
  }

  /**
   * Export report to specified format
   * @param {Object} reportData - Report data to export
   * @param {string} format - Export format (pdf, excel, csv, print)
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export result with file path or data URL
   */
  async exportReport(reportData, format, options = {}) {
    switch (format.toLowerCase()) {
      case 'pdf':
        return await this._exportToPDF(reportData, options);
      case 'excel':
        return await this._exportToExcel(reportData, options);
      case 'csv':
        return await this._exportToCSV(reportData, options);
      case 'print':
        return await this._preparePrint(reportData, options);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export to PDF using browser print or jsPDF
   * @param {Object} reportData - Report data
   * @param {Object} options - PDF options
   * @returns {Promise<Object>} Export result
   */
  async _exportToPDF(reportData, options = {}) {
    const {
      title = 'Report',
      orientation = 'portrait',
      includeTimestamp = true,
      includeCompanyHeader = true
    } = options;

    // Generate HTML content for PDF
    const htmlContent = this._generatePDFHTML(reportData, {
      title,
      orientation,
      includeTimestamp,
      includeCompanyHeader
    });

    // For Electron, we can use window.print or jsPDF
    // Returning data that can be used by the renderer
    return {
      success: true,
      format: 'pdf',
      content: htmlContent,
      filename: `${this._sanitizeFilename(title)}_${new Date().toISOString().split('T')[0]}.html`,
      action: 'print'
    };
  }

  /**
   * Export to Excel format (generates CSV that Excel can open)
   * @param {Object} reportData - Report data
   * @param {Object} options - Excel options
   * @returns {Promise<Object>} Export result
   */
  async _exportToExcel(reportData, options = {}) {
    const {
      title = 'Report',
      sheetName = 'Sheet1',
      includeHeaders = true
    } = options;

    // Convert report data to CSV format (which Excel can open)
    const csvContent = this._convertToCSV(reportData, includeHeaders);

    // Generate Excel-compatible blob
    const BOM = '\uFEFF'; // UTF-8 BOM for Excel
    const blob = new Blob([BOM + csvContent], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });

    return {
      success: true,
      format: 'excel',
      data: blob,
      filename: `${this._sanitizeFilename(title)}_${new Date().toISOString().split('T')[0]}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  }

  /**
   * Export to CSV format
   * @param {Object} reportData - Report data
   * @param {Object} options - CSV options
   * @returns {Promise<Object>} Export result
   */
  async _exportToCSV(reportData, options = {}) {
    const {
      title = 'Report',
      includeHeaders = true,
      delimiter = ','
    } = options;

    const csvContent = this._convertToCSV(reportData, includeHeaders, delimiter);

    return {
      success: true,
      format: 'csv',
      data: csvContent,
      filename: `${this._sanitizeFilename(title)}_${new Date().toISOString().split('T')[0]}.csv`,
      contentType: 'text/csv'
    };
  }

  /**
   * Prepare data for printing
   * @param {Object} reportData - Report data
   * @param {Object} options - Print options
   * @returns {Promise<Object>} Print preparation result
   */
  async _preparePrint(reportData, options = {}) {
    const {
      title = 'Report',
      orientation = 'portrait',
      includeTimestamp = true
    } = options;

    const htmlContent = this._generatePrintHTML(reportData, {
      title,
      orientation,
      includeTimestamp
    });

    return {
      success: true,
      format: 'print',
      content: htmlContent,
      action: 'print'
    };
  }

  /**
   * Generate HTML content for PDF export
   */
  _generatePDFHTML(reportData, options) {
    const { title, orientation, includeTimestamp, includeCompanyHeader } = options;
    
    const styles = this._getPrintStyles(orientation);
    const companyHeader = includeCompanyHeader ? this._getCompanyHeader() : '';
    const timestamp = includeTimestamp ? `<p class="timestamp">Generated on: ${new Date().toLocaleString()}</p>` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          ${styles}
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #06b6d4;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 5px;
          }
          .report-title {
            font-size: 20px;
            color: #475569;
            margin-bottom: 10px;
          }
          .timestamp {
            font-size: 12px;
            color: #94a3b8;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #e2e8f0;
            padding: 10px 12px;
            text-align: left;
          }
          th {
            background-color: #f8fafc;
            font-weight: 600;
            color: #334155;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .summary-box {
            background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255,255,255,0.2);
          }
          .summary-row:last-child {
            border-bottom: none;
            font-weight: bold;
            font-size: 18px;
          }
          .section-title {
            font-size: 16px;
            font-weight: 600;
            color: #1e293b;
            margin: 30px 0 15px 0;
            padding-bottom: 8px;
            border-bottom: 1px solid #e2e8f0;
          }
          .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
          }
          .badge-success { background: #dcfce7; color: #166534; }
          .badge-warning { background: #fef3c7; color: #92400e; }
          .badge-danger { background: #fee2e2; color: #991b1b; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        ${companyHeader}
        <div class="header">
          <div class="report-title">${title}</div>
          ${timestamp}
        </div>
        ${this._renderReportContent(reportData)}
      </body>
      </html>
    `;
  }

  /**
   * Generate print-friendly HTML
   */
  _generatePrintHTML(reportData, options) {
    const { title, orientation, includeTimestamp } = options;
    const styles = this._getPrintStyles(orientation);
    const timestamp = includeTimestamp ? `<p class="timestamp">Generated on: ${new Date().toLocaleString()}</p>` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          ${styles}
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            padding: 30px;
            max-width: 900px;
            margin: 0 auto;
          }
          .print-header {
            text-align: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #06b6d4;
          }
          .print-title {
            font-size: 22px;
            font-weight: bold;
            color: #1e293b;
          }
          ${this._getTableStyles()}
        </style>
      </head>
      <body>
        <div class="print-header">
          <div class="print-title">${title}</div>
          ${timestamp}
        </div>
        ${this._renderReportContent(reportData)}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Convert report data to CSV format
   */
  _convertToCSV(reportData, includeHeaders, delimiter = ',') {
    const lines = [];
    
    // Add headers if requested
    if (includeHeaders) {
      lines.push(this._generateCSVHeader(reportData, delimiter));
    }

    // Add data rows
    lines.push(this._generateCSVRow(reportData, delimiter));

    return lines.join('\n');
  }

  /**
   * Generate CSV header based on report type
   */
  _generateCSVHeader(reportData, delimiter) {
    const headers = ['Metric', 'Value', 'Notes'];
    return headers.join(delimiter);
  }

  /**
   * Generate CSV data row
   */
  _generateCSVRow(reportData, delimiter) {
    const summary = reportData.summary || {};
    const rows = [];

    // Add summary data
    Object.entries(summary).forEach(([key, value]) => {
      if (typeof value !== 'object') {
        rows.push([
          this._formatKey(key),
          this._formatValue(value),
          ''
        ].join(delimiter));
      }
    });

    return rows.join('\n');
  }

  /**
   * Render report content as HTML
   */
  _renderReportContent(reportData) {
    const summary = reportData.summary || {};
    const details = reportData.transactions || reportData.expenses || [];
    
    let html = '';

    // Summary section
    if (Object.keys(summary).length > 0) {
      html += '<div class="summary-box">';
      Object.entries(summary).forEach(([key, value]) => {
        if (typeof value !== 'object') {
          const displayValue = this._formatValue(value);
          html += `
            <div class="summary-row">
              <span>${this._formatKey(key)}</span>
              <span>${displayValue}</span>
            </div>
          `;
        }
      });
      html += '</div>';
    }

    // Details section
    if (details.length > 0) {
      html += '<div class="section-title">Details</div>';
      html += this._renderTable(details.slice(0, 50)); // Limit to 50 rows for PDF
    }

    return html;
  }

  /**
   * Render data as HTML table
   */
  _renderTable(data) {
    if (!data || data.length === 0) return '';

    const columns = Object.keys(data[0]);
    
    let html = '<table><thead><tr>';
    columns.forEach(col => {
      html += `<th>${this._formatKey(col)}</th>`;
    });
    html += '</tr></thead><tbody>';

    data.forEach(row => {
      html += '<tr>';
      columns.forEach(col => {
        html += `<td>${this._formatValue(row[col])}</td>`;
      });
      html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
  }

  /**
   * Get print styles
   */
  _getPrintStyles(orientation) {
    const pageWidth = orientation === 'landscape' ? '100%' : '800px';
    
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 12px;
        line-height: 1.5;
        color: #333;
      }
      .page {
        width: ${pageWidth};
        margin: 0 auto;
        padding: 20px;
      }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .font-bold { font-weight: bold; }
      .mb-4 { margin-bottom: 16px; }
      .mt-4 { margin-top: 16px; }
      .p-4 { padding: 16px; }
      .border { border: 1px solid #ddd; }
    `;
  }

  /**
   * Get table styles
   */
  _getTableStyles() {
    return `
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
        font-size: 11px;
      }
      th, td {
        border: 1px solid #ddd;
        padding: 6px 8px;
        text-align: left;
      }
      th {
        background-color: #f5f5f5;
        font-weight: 600;
      }
      tr:nth-child(even) {
        background-color: #fafafa;
      }
    `;
  }

  /**
   * Get company header HTML
   */
  _getCompanyHeader() {
    return `
      <div class="header">
        <div class="company-name">Talk to Your Accounts</div>
        <p style="color: #64748b; font-size: 12px;">Offline-First Accounting Solution</p>
      </div>
    `;
  }

  /**
   * Sanitize filename
   */
  _sanitizeFilename(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 50);
  }

  /**
   * Format key for display
   */
  _formatKey(key) {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^\w/, c => c.toUpperCase())
      .trim();
  }

  /**
   * Format value for display
   */
  _formatValue(value) {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        return value.toLocaleString('en-IN');
      }
      return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  }

  /**
   * Generate export menu options
   */
  getExportOptions() {
    return [
      { id: 'pdf', name: 'Export as PDF', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z', description: 'Save as PDF document' },
      { id: 'excel', name: 'Export as Excel', icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2', description: 'Open in spreadsheet application' },
      { id: 'csv', name: 'Export as CSV', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12', description: 'Download as CSV file' },
      { id: 'print', name: 'Print Report', icon: 'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z', description: 'Print the report' }
    ];
  }

  /**
   * Export transactions to CSV
   */
  async exportTransactions(transactions, options = {}) {
    const { title = 'Transactions_Export', includeHeaders = true } = options;
    
    const headers = ['Date', 'Voucher No', 'Type', 'Party', 'Amount', 'GST', 'Status'];
    const rows = transactions.map(t => [
      t.date,
      t.voucher_number,
      t.voucher_type,
      t.party_name || '',
      t.total_amount || 0,
      t.total_gst || 0,
      t.payment_status
    ]);

    let csv = '';
    if (includeHeaders) {
      csv += headers.join(',') + '\n';
    }
    csv += rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    return {
      success: true,
      format: 'csv',
      data: csv,
      filename: `${this._sanitizeFilename(title)}_${new Date().toISOString().split('T')[0]}.csv`,
      contentType: 'text/csv'
    };
  }

  /**
   * Export party list to CSV
   */
  async exportParties(parties, options = {}) {
    const { title = 'Parties_Export', includeHeaders = true } = options;
    
    const headers = ['Name', 'Type', 'Phone', 'Email', 'GST Number', 'Opening Balance', 'Current Balance'];
    const rows = parties.map(p => [
      p.name,
      p.party_type,
      p.phone || '',
      p.email || '',
      p.gst_number || '',
      p.opening_balance || 0,
      p.current_balance || 0
    ]);

    let csv = '';
    if (includeHeaders) {
      csv += headers.join(',') + '\n';
    }
    csv += rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    return {
      success: true,
      format: 'csv',
      data: csv,
      filename: `${this._sanitizeFilename(title)}_${new Date().toISOString().split('T')[0]}.csv`,
      contentType: 'text/csv'
    };
  }

  /**
   * Export inventory to CSV
   */
  async exportInventory(products, options = {}) {
    const { title = 'Inventory_Export', includeHeaders = true } = options;
    
    const headers = ['Name', 'SKU', 'Category', 'Stock', 'Unit', 'Purchase Price', 'Sales Price', 'Value'];
    const rows = products.map(p => [
      p.name,
      p.sku || '',
      p.category || '',
      p.current_stock || 0,
      p.unit || '',
      p.purchase_price || 0,
      p.sales_price || 0,
      (p.current_stock || 0) * (p.purchase_price || 0)
    ]);

    let csv = '';
    if (includeHeaders) {
      csv += headers.join(',') + '\n';
    }
    csv += rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    return {
      success: true,
      format: 'csv',
      data: csv,
      filename: `${this._sanitizeFilename(title)}_${new Date().toISOString().split('T')[0]}.csv`,
      contentType: 'text/csv'
    };
  }

  /**
   * Download blob file
   */
  downloadFile(result) {
    if (result.data instanceof Blob) {
      const url = URL.createObjectURL(result.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    } else if (typeof result.data === 'string') {
      const blob = new Blob([result.data], { type: result.contentType || 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    }
    return false;
  }
}

export default ExportManager;
