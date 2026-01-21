// OCR Service for Invoice Scanning
// Handles image preprocessing, text extraction, and data parsing using Tesseract.js

import Tesseract from 'tesseract.js';

class OCRService {
  constructor() {
    this.supportedFormats = ['image/jpeg', 'image/png', 'image/bmp', 'image/tiff'];
    this.minImageWidth = 500;
    this.minImageHeight = 300;
    this.worker = null;
    this.initialized = false;
  }

  // Initialize Tesseract worker
  async initialize() {
    if (this.initialized) return;

    try {
      // For Electron renderer process, use createWorker with proper options
      this.worker = await Tesseract.createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${(m.progress * 100).toFixed(0)}%`);
          }
        }
      });
      this.initialized = true;
      console.log('Tesseract OCR initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Tesseract:', error);
      // Don't throw, allow fallback to non-worker mode
      this.initialized = false;
    }
  }

  // Process an invoice image and extract structured data
  async processInvoice(imagePathOrData) {
    try {
      // Ensure worker is initialized
      await this.initialize();

      let imagePath = imagePathOrData;

      // If we receive base64 data URL, handle it
      if (typeof imagePathOrData === 'string' && imagePathOrData.startsWith('data:')) {
        // For base64, we'll use the data URL directly
        imagePath = imagePathOrData;
      }

      // Preprocess the image (basic preprocessing)
      const preprocessedPath = await this.preprocessImage(imagePath);

      // Perform OCR
      const startTime = Date.now();
      const ocrResult = await this.performOCR(preprocessedPath);
      const processingTime = Date.now() - startTime;

      // Parse the extracted text into structured data
      const parsedData = this.parseInvoiceText(ocrResult.text, ocrResult.blocks);

      // Calculate overall confidence
      const overallConfidence = this.calculateOverallConfidence(parsedData, ocrResult.confidence);

      return {
        success: true,
        header: parsedData.header,
        lines: parsedData.lines,
        confidence: overallConfidence,
        rawText: ocrResult.text,
        processingTime
      };
    } catch (error) {
      console.error('OCR Processing Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to process invoice. Please try again.',
        header: null,
        lines: [],
        confidence: 0
      };
    }
  }

  // Preprocess image for better OCR results
  async preprocessImage(imagePath) {
    // For now, return original path
    // In production, you would use canvas or a library like sharp for:
    // - Grayscale conversion
    // - Contrast enhancement
    // - Noise reduction
    // - Deskewing
    // - Region of interest detection
    
    return imagePath;
  }

  // Perform OCR using Tesseract.js
  async performOCR(imagePath) {
    const startTime = Date.now();

    try {
      // If worker is not initialized, try to initialize now
      if (!this.worker) {
        await this.initialize();
      }

      // If worker is available, use it
      if (this.worker) {
        // Use Tesseract to recognize text
        const result = await this.worker.recognize(imagePath);

        const text = result.data.text;

        // Parse blocks from Tesseract output
        const blocks = this.parseTextBlocks(result.data);

        // Calculate average confidence
        const words = result.data.words || [];
        const confidence = words.length > 0
          ? words.reduce((sum, word) => sum + word.confidence, 0) / words.length
          : 0;

        const processingTime = Date.now() - startTime;

        return {
          text,
          blocks,
          confidence,
          processingTime
        };
      } else {
        // Fallback: Use Tesseract.recognize directly without persistent worker
        console.log('Using fallback OCR method without persistent worker');
        const result = await Tesseract.recognize(imagePath, 'eng', {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${(m.progress * 100).toFixed(0)}%`);
            }
          }
        });

        const text = result.data.text;
        const blocks = this.parseTextBlocks(result.data);

        const words = result.data.words || [];
        const confidence = words.length > 0
          ? words.reduce((sum, word) => sum + word.confidence, 0) / words.length
          : 0;

        const processingTime = Date.now() - startTime;

        return {
          text,
          blocks,
          confidence,
          processingTime
        };
      }
    } catch (error) {
      console.error('Tesseract execution error:', error);
      throw error;
    }
  }

  // Parse Tesseract blocks into our format
  parseTextBlocks(data) {
    const blocks = [];
    
    // Process paragraphs
    if (data.paragraphs) {
      for (const paragraph of data.paragraphs) {
        const text = paragraph.text.trim();
        if (text) {
          blocks.push({
            text,
            type: this.detectLineType(text),
            confidence: paragraph.confidence
          });
        }
      }
    }
    
    // If no paragraphs, process lines
    if (blocks.length === 0 && data.lines) {
      for (const line of data.lines) {
        const text = line.text.trim();
        if (text) {
          blocks.push({
            text,
            type: this.detectLineType(text),
            confidence: line.confidence
          });
        }
      }
    }
    
    return blocks;
  }

  // Detect the type of a line
  detectLineType(line) {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('invoice') || lowerLine.includes('bill') || lowerLine.includes('inv')) {
      if (lowerLine.includes('number') || lowerLine.includes('no') || lowerLine.includes('#')) {
        return 'invoice_number';
      }
    }
    
    if (lowerLine.includes('date') || lowerLine.includes('dated')) {
      return 'date';
    }
    
    if (lowerLine.includes('gstin') || lowerLine.includes('gst')) {
      return 'gstin';
    }
    
    if (lowerLine.includes('total') || lowerLine.includes('amount') || lowerLine.includes('sum')) {
      return 'total';
    }
    
    if (/^\d+\s+\w+/.test(line) || /\d+\s*[xX]\s*\d+/.test(line)) {
      return 'line_item';
    }
    
    return 'text';
  }

  // Parse extracted text into structured invoice data
  parseInvoiceText(text, blocks) {
    const header = {
      invoice_number: null,
      invoice_date: null,
      due_date: null,
      party_name: null,
      party_gstin: null,
      party_address: null,
      party_phone: null,
      vendor_name: null,
      vendor_gstin: null,
      subtotal: 0,
      total_gst: 0,
      total_amount: 0,
      tax_type: 'GST'
    };

    const lines = [];
    let isInLineItems = false;

    // Patterns for extraction
    const patterns = {
      invoiceNumber: /(?:invoice|inv|bill|receipt)[\s#]*[:.]?\s*([A-Z0-9\-\/]+)/i,
      date: /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/,
      gstin: /([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1})/i,
      vendorName: /(?:from|sold by|vendor|supplier)[\s:]+([A-Za-z\s]+?)(?:\n|$)/i,
      partyName: /(?:to|bill to|ship to|customer)[\s:]+([A-Za-z\s]+?)(?:\n|$)/i,
      totalAmount: /(?:total|grand total|amount payable|net amount|total payable)[\s:]*₹?\s*([\d,]+\.?\d*)/i,
      gstAmount: /(?:gst|tax|total tax|sgst|cgst|igst)[\s:]*₹?\s*([\d,]+\.?\d*)/i
    };

    // Extract header information
    for (const block of blocks) {
      const blockText = block.text;

      // Invoice number
      if (!header.invoice_number) {
        const invoiceMatch = blockText.match(patterns.invoiceNumber);
        if (invoiceMatch) {
          header.invoice_number = invoiceMatch[1].trim();
        }
      }

      // Date
      if (!header.invoice_date) {
        const dateMatch = blockText.match(patterns.date);
        if (dateMatch) {
          header.invoice_date = this.normalizeDate(dateMatch[0]);
        }
      }

      // GSTIN
      const gstinMatch = blockText.match(patterns.gstin);
      if (gstinMatch && !header.party_gstin) {
        header.party_gstin = gstinMatch[1];
      }

      // Vendor name
      if (!header.vendor_name) {
        const vendorMatch = blockText.match(patterns.vendorName);
        if (vendorMatch) {
          header.vendor_name = vendorMatch[1].trim();
        }
      }

      // Party name
      if (!header.party_name) {
        const partyMatch = blockText.match(patterns.partyName);
        if (partyMatch) {
          header.party_name = partyMatch[1].trim();
        }
      }

      // Total amount
      if (header.total_amount === 0) {
        const totalMatch = blockText.match(patterns.totalAmount);
        if (totalMatch) {
          header.total_amount = parseFloat(totalMatch[1].replace(/,/g, ''));
        }
      }

      // GST amount
      if (header.total_gst === 0) {
        const gstMatch = blockText.match(patterns.gstAmount);
        if (gstMatch) {
          header.total_gst = parseFloat(gstMatch[1].replace(/,/g, ''));
        }
      }

      // Detect line items
      if (this.isLineItemStart(blockText)) {
        isInLineItems = true;
      }

      if (isInLineItems && this.isLineItem(blockText)) {
        const lineItem = this.parseLineItem(blockText, lines.length);
        if (lineItem) {
          lines.push(lineItem);
        }
      }

      // End of line items
      if (isInLineItems && this.isLineItemEnd(blockText)) {
        isInLineItems = false;
      }
    }

    // Calculate subtotal from line items
    header.subtotal = lines.reduce((sum, line) => sum + line.amount, 0);

    // If total not found, calculate from line items
    if (header.total_amount === 0 && lines.length > 0) {
      header.total_amount = lines.reduce((sum, line) => sum + line.total_amount, 0);
    }

    // If GST not found, calculate from line items
    if (header.total_gst === 0 && lines.length > 0) {
      header.total_gst = lines.reduce((sum, line) => sum + line.cgst_amount + line.sgst_amount + line.igst_amount, 0);
    }

    // Remove duplicate detection
    if (header.vendor_name === header.party_name) {
      header.vendor_name = null;
    }

    return { header, lines };
  }

  // Check if a line marks the start of line items
  isLineItemStart(line) {
    const indicators = [
      'item', 'description', 'qty', 'quantity', 'rate', 'price', 'amount',
      'items', 'particulars', 'product', 'code', 'hsn', 'sac'
    ];
    return indicators.some(ind => line.toLowerCase().includes(ind));
  }

  // Check if a line is a line item
  isLineItem(line) {
    // Pattern: quantity, rate, amount OR description with numbers
    const lineItemPatterns = [
      /^\d+\s+\d+\s+[\d,]+\.?\d*/,  // "2 5 100"
      /^\d+\s*[xX*]\s*\d+.*[\d,]+\.?\d*/,  // "2x5 100"
      /^[A-Za-z\s]+\d+[\d,]*\.?\d+/,  // "Product 2 100"
      /\d+\s+\w+\s+\d+\.?\d*\s+\d+\.?\d*/  // "1 ABC 50.00 50.00"
    ];

    return lineItemPatterns.some(pattern => pattern.test(line.trim()));
  }

  // Check if a line marks the end of line items
  isLineItemEnd(line) {
    const endIndicators = [
      'subtotal', 'sub total', 'total', 'grand total', 'tax', 'gst',
      'round off', 'roundoff', 'amount payable', 'net amount'
    ];
    return endIndicators.some(ind => line.toLowerCase().includes(ind));
  }

  // Parse a single line item
  parseLineItem(line, itemNumber) {
    try {
      const cleanedLine = line.trim();
      let quantity = 1;
      let rate = 0;
      let amount = 0;
      let description = cleanedLine;
      let gstRate = 0;

      // Pattern 1: "2 x 5 = 100" or "2*5 100"
      let match = cleanedLine.match(/(\d+\.?\d*)\s*[xX*]\s*(\d+\.?\d*)\s*[=]*\s*(\d+\.?\d*)/);
      if (match) {
        quantity = parseFloat(match[1]);
        rate = parseFloat(match[2]);
        amount = parseFloat(match[3]);
        description = cleanedLine.replace(match[0], '').trim();
      }

      // Pattern 2: "2 5 100" (qty rate amount)
      if (!match) {
        match = cleanedLine.match(/^(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)/);
        if (match) {
          quantity = parseFloat(match[1]);
          rate = parseFloat(match[2]);
          amount = parseFloat(match[3]);
          description = cleanedLine.replace(match[0], '').trim();
        }
      }

      // Pattern 3: "Description 2 @ 100" or "Description 2 100"
      if (!match) {
        match = cleanedLine.match(/^(.+?)\s+(\d+\.?\d*)\s*[xX@]\s*(\d+\.?\d*)/i);
        if (match) {
          description = match[1].trim();
          quantity = parseFloat(match[2]);
          rate = parseFloat(match[3]);
          amount = quantity * rate;
        }
      }

      // Pattern 4: Extract from end of line
      if (!match) {
        match = cleanedLine.match(/(.+?)\s+(\d+\.?\d*)\s*$/);
        if (match) {
          description = match[1].trim();
          amount = parseFloat(match[2]);
          if (amount > 0 && amount < 100000) {
            rate = amount;
            amount = rate;
          } else {
            rate = amount;
            amount = amount;
          }
        }
      }

      // Calculate GST (assuming 18% if not specified)
      const taxableAmount = amount;
      gstRate = this.estimateGSTRate(taxableAmount);
      const gstAmount = (taxableAmount * gstRate) / 100;

      return {
        item_number: itemNumber,
        description: description || 'Item',
        quantity,
        unit: 'pcs',
        rate,
        amount: taxableAmount,
        gst_rate: gstRate,
        cgst_amount: gstAmount / 2,
        sgst_amount: gstAmount / 2,
        igst_amount: 0,
        total_amount: taxableAmount + gstAmount,
        confidence: this.calculateLineConfidence(line)
      };
    } catch (error) {
      console.error('Error parsing line item:', error);
      return null;
    }
  }

  // Estimate GST rate based on amount
  estimateGSTRate(amount) {
    // Common GST rates in India
    if (amount <= 1000) return 0;
    if (amount <= 10000) return 5;
    if (amount <= 20000) return 12;
    if (amount <= 50000) return 18;
    return 28;
  }

  // Normalize date format
  normalizeDate(dateStr) {
    try {
      const parts = dateStr.split(/[\/\-\.]/);
      if (parts.length !== 3) return dateStr;

      let day, month, year;

      if (parts[0].length === 4) {
        // YYYY-MM-DD
        year = parts[0];
        month = parts[1];
        day = parts[2];
      } else {
        // DD-MM-YYYY or MM-DD-YYYY
        day = parts[0];
        month = parts[1];
        year = parts[2];

        // Handle 2-digit year
        if (year.length === 2) {
          year = '20' + year;
        }
      }

      // Validate month
      const monthNum = parseInt(month);
      if (monthNum < 1 || monthNum > 12) {
        // Try swapping day and month
        const temp = day;
        day = month;
        month = temp;
      }

      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } catch (error) {
      return dateStr;
    }
  }

  // Calculate confidence for a line
  calculateLineConfidence(line) {
    let confidence = 100;

    // Reduce confidence for lines with unusual formatting
    if (!/\d/.test(line)) confidence -= 30; // No numbers
    if (/[?|~]/.test(line)) confidence -= 20; // Uncertain characters
    if (line.length < 3) confidence -= 20; // Too short

    return Math.max(0, confidence);
  }

  // Calculate overall confidence
  calculateOverallConfidence(parsedData, ocrConfidence) {
    let confidence = ocrConfidence || 70;

    // Adjust for data completeness
    if (parsedData.header.invoice_number) confidence += 5;
    else confidence -= 10;

    if (parsedData.header.invoice_date) confidence += 5;
    else confidence -= 5;

    if (parsedData.header.total_amount > 0) confidence += 5;
    else confidence -= 10;

    if (parsedData.lines.length > 0) {
      confidence += Math.min(10, parsedData.lines.length * 2);
    }

    return Math.min(100, Math.max(0, confidence));
  }

  // Terminate the worker when done
  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.initialized = false;
    }
  }
}

// Export singleton instance
const ocrService = new OCRService();

export default ocrService;
