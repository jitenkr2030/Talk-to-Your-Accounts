/**
 * Integrity Engine
 * Duplicate detection, data validation, and error prevention
 */

class IntegrityEngine {
  constructor(database) {
    this.db = database;
    this.DUPLICATE_THRESHOLD = 0.85; // 85% similarity threshold
    this.DATE_RANGE_DAYS = 3; // Check transactions within 3 days
    this.AMOUNT_TOLERANCE = 0.01; // 1 paisa tolerance for amount comparison
  }

  /**
   * Check for potential duplicate transactions before saving
   * @param {Object} transactionData - Transaction data to check
   * @returns {Object} Duplicate check result with matches
   */
  async checkDuplicates(transactionData) {
    const matches = [];

    try {
      // 1. Exact match check (same date, amount, party, type)
      const exactMatch = this.checkExactMatch(transactionData);
      if (exactMatch) matches.push(exactMatch);

      // 2. Near match check (similar date range, same amount, similar description)
      const nearMatches = this.checkNearMatches(transactionData);
      matches.push(...nearMatches);

      // 3. Pattern check (frequent small variations)
      const patternMatches = this.checkPatternMatches(transactionData);
      matches.push(...patternMatches);

      // 4. GST invoice number check (if provided)
      if (transactionData.gst_invoice_number) {
        const gstMatch = this.checkGSTInvoiceNumber(transactionData.gst_invoice_number);
        if (gstMatch) matches.push(gstMatch);
      }

      // Deduplicate by transaction ID
      const uniqueMatches = matches.reduce((acc, match) => {
        if (!acc.find(m => m.transactionId === match.transactionId)) {
          acc.push(match);
        }
        return acc;
      }, []);

      // Calculate overall duplicate confidence
      const hasHighConfidence = uniqueMatches.some(m => m.confidence >= 0.9);
      const hasMediumConfidence = uniqueMatches.some(m => m.confidence >= 0.7);

      return {
        hasDuplicates: uniqueMatches.length > 0,
        matches: uniqueMatches,
        needsReview: hasHighConfidence || (uniqueMatches.length > 0 && !hasMediumConfidence),
        recommendation: this.getRecommendation(uniqueMatches)
      };
    } catch (error) {
      console.error('Duplicate check error:', error);
      return {
        hasDuplicates: false,
        matches: [],
        needsReview: false,
        recommendation: 'ERROR'
      };
    }
  }

  /**
   * Check for exact duplicate
   * @param {Object} data - Transaction data
   * @returns {Object|null} Match or null
   */
  checkExactMatch(data) {
    const stmt = this.db.prepare(`
      SELECT id, voucher_no, date, party_name, total_amount, voucher_type
      FROM transactions
      WHERE voucher_type = ?
        AND date = ?
        AND ABS(total_amount - ?) < ?
        AND (party_id = ? OR (? = 1 AND party_name = ?))
        AND is_cancelled = 0
        AND is_active = 1
      LIMIT 1
    `);

    const partyId = data.party_id || 0;
    const hasPartyId = partyId > 0;

    const match = stmt.get(
      data.voucher_type,
      data.date,
      data.total_amount || data.grand_total || 0,
      this.AMOUNT_TOLERANCE,
      partyId,
      hasPartyId ? 0 : 1,
      hasPartyId ? '' : data.party_name
    );

    if (match) {
      return {
        transactionId: match.id,
        voucherNumber: match.voucher_no,
        date: match.date,
        amount: match.total_amount,
        confidence: 1.0,
        matchType: 'EXACT',
        reasons: [
          `Same transaction type (${match.voucher_type})`,
          `Same date (${match.date})`,
          `Same amount (₹${match.total_amount})`,
          `Same party (${match.party_name})`
        ],
        suggestion: 'This appears to be an exact duplicate'
      };
    }
    return null;
  }

  /**
   * Check for near matches within date range
   * @param {Object} data - Transaction data
   * @returns {Array} Array of potential matches
   */
  checkNearMatches(data) {
    const matches = [];
    const startDate = this.addDays(data.date, -this.DATE_RANGE_DAYS);
    const endDate = this.addDays(data.date, this.DATE_RANGE_DAYS);

    const stmt = this.db.prepare(`
      SELECT id, voucher_no, date, party_name, total_amount, voucher_type, narration
      FROM transactions
      WHERE voucher_type = ?
        AND date BETWEEN ? AND ?
        AND ABS(total_amount - ?) < ? * 1.1
        AND is_cancelled = 0
        AND is_active = 1
        AND id NOT IN (SELECT id FROM transactions WHERE date = ? AND party_name = ? AND ABS(total_amount - ?) < ?)
      ORDER BY ABS(total_amount - ?) ASC
      LIMIT 5
    `);

    const amount = data.total_amount || data.grand_total || 0;
    const dbMatches = stmt.all(
      data.voucher_type,
      startDate,
      endDate,
      amount,
      amount,
      data.date,
      data.party_name,
      amount,
      this.AMOUNT_TOLERANCE,
      amount
    );

    dbMatches.forEach(match => {
      const descriptionSimilarity = this.calculateTextSimilarity(
        (data.narration || '').toLowerCase(),
        (match.narration || '').toLowerCase()
      );

      const dateDiff = Math.abs(this.dateDiff(match.date, data.date));
      const amountDiff = Math.abs(match.total_amount - amount);
      const amountPercentDiff = amount > 0 ? amountDiff / amount : 0;

      // Calculate confidence based on factors
      let confidence = 0;
      let reasons = [];

      if (amountPercentDiff < 0.01) {
        confidence += 0.4;
        reasons.push('Same amount');
      } else if (amountPercentDiff < 0.05) {
        confidence += 0.25;
        reasons.push(`Similar amount (${(amountPercentDiff * 100).toFixed(1)}% difference)`);
      }

      if (dateDiff === 0) {
        confidence += 0.3;
        reasons.push('Same date');
      } else if (dateDiff <= 1) {
        confidence += 0.2;
        reasons.push(`Adjacent date (${dateDiff} day difference)`);
      } else {
        confidence += 0.1 * (1 - dateDiff / this.DATE_RANGE_DAYS);
        reasons.push(`Within ${this.DATE_RANGE_DAYS} days`);
      }

      if (descriptionSimilarity > 0.7) {
        confidence += 0.3 * descriptionSimilarity;
        reasons.push(`Similar description (${(descriptionSimilarity * 100).toFixed(0)}% match)`);
      }

      confidence = Math.min(confidence, 0.99);

      if (confidence >= 0.6) {
        matches.push({
          transactionId: match.id,
          voucherNumber: match.voucher_no,
          date: match.date,
          amount: match.total_amount,
          confidence,
          matchType: 'NEAR',
          reasons,
          suggestion: `Consider reviewing - ${confidence >= 0.8 ? 'high' : 'moderate'} similarity detected`
        });
      }
    });

    return matches;
  }

  /**
   * Check for pattern-based duplicates (frequent similar transactions)
   * @param {Object} data - Transaction data
   * @returns {Array} Pattern matches
   */
  checkPatternMatches(data) {
    const matches = [];
    const amount = data.total_amount || data.grand_total || 0;

    // Check if this might be a recurring pattern
    const recurringStmt = this.db.prepare(`
      SELECT id, voucher_no, date, party_name, total_amount, COUNT(*) as occurrence_count
      FROM transactions
      WHERE party_id = ?
        AND ABS(total_amount - ?) < ?
        AND is_cancelled = 0
        AND is_active = 1
        AND date >= date('now', '-90 days')
      GROUP BY date
      ORDER BY date DESC
      LIMIT 10
    `);

    const partyId = data.party_id || 0;
    if (partyId > 0) {
      const patterns = recurringStmt.all(partyId, amount, amount * 0.1);

      if (patterns.length >= 3) {
        // Calculate interval consistency
        const intervals = [];
        for (let i = 1; i < patterns.length; i++) {
          intervals.push(this.dateDiff(patterns[i-1].date, patterns[i].date));
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const isConsistent = intervals.every(i => Math.abs(i - avgInterval) <= 2);

        if (isConsistent && avgInterval <= 35) {
          matches.push({
            transactionId: patterns[0].id,
            voucherNumber: patterns[0].voucher_no,
            date: patterns[0].date,
            amount: patterns[0].total_amount,
            confidence: 0.75,
            matchType: 'PATTERN',
            reasons: [
              `Similar transaction occurred ${patterns.length} times in last 90 days`,
              `Average interval: ${avgInterval.toFixed(0)} days`,
              'This might be a recurring expense/income'
            ],
            suggestion: 'This appears to be a recurring transaction. Verify if this should be a new entry or part of a series.'
          });
        }
      }
    }

    return matches;
  }

  /**
   * Check GST invoice number for duplicates
   * @param {string} gstInvoiceNumber - GST invoice number
   * @returns {Object|null} Match or null
   */
  checkGSTInvoiceNumber(gstInvoiceNumber) {
    if (!gstInvoiceNumber) return null;

    const stmt = this.db.prepare(`
      SELECT id, voucher_no, date, party_name, total_amount, gst_invoice_number
      FROM transactions
      WHERE gst_invoice_number = ?
        AND is_cancelled = 0
        AND is_active = 1
      LIMIT 1
    `);

    const match = stmt.get(gstInvoiceNumber);

    if (match) {
      return {
        transactionId: match.id,
        voucherNumber: match.voucher_no,
        date: match.date,
        amount: match.total_amount,
        confidence: 0.95,
        matchType: 'GST_INVOICE',
        reasons: [
          `Same GST invoice number: ${gstInvoiceNumber}`,
          'GST invoice numbers should be unique per transaction'
        ],
        suggestion: 'This GST invoice number already exists. Please verify before proceeding.'
      };
    }

    return null;
  }

  /**
   * Validate transaction data
   * @param {Object} data - Transaction data
   * @returns {Object} Validation result
   */
  validateTransaction(data) {
    const errors = [];
    const warnings = [];

    // Required field validation
    if (!data.date) {
      errors.push('Transaction date is required');
    }

    if (!data.voucher_type) {
      errors.push('Transaction type is required');
    }

    const amount = data.total_amount || data.grand_total || 0;
    if (amount <= 0) {
      errors.push('Transaction amount must be greater than zero');
    }

    // Party validation for B2B transactions
    if (data.voucher_type === 'sale' && amount >= 10000) {
      const party = this.db.prepare(`SELECT gstin FROM parties WHERE id = ?`).get(data.party_id);
      if (!party || !party.gstin) {
        warnings.push('B2B sale above ₹10,000 should have party GSTIN for GST compliance');
      }
    }

    // GST validation
    if (data.gst_rate && data.gst_rate > 0) {
      const taxableAmount = data.taxable_amount || 0;
      const expectedGST = taxableAmount * (data.gst_rate / 100);
      const actualGST = (data.cgst_amount || 0) + (data.sgst_amount || 0) + (data.igst_amount || 0);
      
      if (Math.abs(actualGST - expectedGST) > 1) {
        warnings.push(`GST amount mismatch. Expected: ₹${expectedGST.toFixed(2)}, Found: ₹${actualGST.toFixed(2)}`);
      }
    }

    // Due date validation
    if (data.payment_status === 'pending' && !data.due_date) {
      warnings.push('Payment is marked as pending but no due date is set');
    }

    // Reasonableness checks
    if (amount > 1000000) {
      warnings.push('Large transaction amount detected. Please verify the amount is correct.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      canProceed: errors.length === 0
    };
  }

  /**
   * Detect unusual transaction patterns
   * @param {string} partyId - Party ID
   * @param {number} amount - Transaction amount
   * @returns {Object} Anomaly detection result
   */
  detectAnomalies(partyId, amount) {
    const anomalies = [];

    if (!partyId || amount <= 0) {
      return { hasAnomalies: false, anomalies: [] };
    }

    // Get party's average transaction amount
    const avgStmt = this.db.prepare(`
      SELECT AVG(total_amount) as avg_amount, MAX(total_amount) as max_amount, COUNT(*) as tx_count
      FROM transactions
      WHERE party_id = ? AND is_cancelled = 0 AND is_active = 1
    `);
    const stats = avgStmt.get(partyId);

    if (stats.tx_count >= 5) {
      const threshold = stats.avg_amount * 3;
      
      if (amount > threshold) {
        anomalies.push({
          type: 'UNUSUAL_AMOUNT',
          severity: 'warning',
          message: `This amount (₹${amount.toLocaleString()}) is ${(amount / stats.avg_amount).toFixed(1)}x the party's average (₹${stats.avg_amount.toFixed(0)})`,
          recommendation: 'Verify this is not a data entry error'
        });
      }

      if (amount > stats.max_amount * 1.5) {
        anomalies.push({
          type: 'NEW_MAXIMUM',
          severity: 'info',
          message: `This is the highest transaction ever recorded for this party (previous max: ₹${stats.max_amount.toLocaleString()})`,
          recommendation: 'Consider adding a note for this significant transaction'
        });
      }
    }

    // Check for recent spike
    const recentStmt = this.db.prepare(`
      SELECT SUM(total_amount) as recent_total
      FROM transactions
      WHERE party_id = ? 
        AND date >= date('now', '-30 days')
        AND is_cancelled = 0
        AND is_active = 1
    `);
    const recent = recentStmt.get(partyId);

    if (recent && recent.recent_total > 500000) {
      anomalies.push({
        type: 'HIGH_RECENT_VOLUME',
        severity: 'info',
        message: `Total transactions with this party in last 30 days: ₹${recent.recent_total.toLocaleString()}`,
        recommendation: 'Consider reviewing payment terms for this high-volume relationship'
      });
    }

    return {
      hasAnomalies: anomalies.length > 0,
      anomalies
    };
  }

  /**
   * Log duplicate check decision
   * @param {number} transactionId - Transaction ID
   * @param {string} checkType - Type of check
   * @param {Object} decision - Decision details
   */
  logDuplicateDecision(transactionId, checkType, decision) {
    try {
      this.db.prepare(`
        INSERT INTO duplicate_check_log 
        (transaction_id, check_type, matched_fields, similarity_score, decision, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        transactionId,
        checkType,
        JSON.stringify(decision.matchedFields || {}),
        decision.similarityScore || 0,
        decision.action || 'ignored',
        new Date().toISOString()
      );
    } catch (error) {
      console.error('Error logging duplicate decision:', error);
    }
  }

  /**
   * Get data quality metrics
   * @param {Object} options - Query options
   * @returns {Object} Quality metrics
   */
  getQualityMetrics(options = {}) {
    const { startDate, endDate } = options;

    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = 'AND date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // Count potential duplicates
    const duplicateCount = this.db.prepare(`
      SELECT COUNT(DISTINCT transaction_id) as count
      FROM duplicate_check_log
      WHERE created_at BETWEEN ? AND ?
    `).get(
      startDate || '1970-01-01',
      endDate || new Date().toISOString()
    );

    // Count verified duplicates
    const verifiedDuplicates = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM duplicate_check_log
      WHERE decision = 'confirmed_duplicate'
        AND created_at BETWEEN ? AND ?
    `).get(
      startDate || '1970-01-01',
      endDate || new Date().toISOString()
    );

    // Count ignored duplicates
    const ignoredDuplicates = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM duplicate_check_log
      WHERE decision = 'ignored'
        AND created_at BETWEEN ? AND ?
    `).get(
      startDate || '1970-01-01',
      endDate || new Date().toISOString()
    );

    // Recent high-value transactions
    const highValueStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM transactions
      WHERE total_amount >= 100000 ${dateFilter}
        AND is_cancelled = 0
        AND is_active = 1
    `);
    const highValueCount = highValueStmt.get(...params);

    // Missing GST on B2B
    const missingGSTStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM transactions t
      JOIN parties p ON t.party_id = p.id
      WHERE t.total_amount >= 10000
        AND t.gst_rate = 0
        AND p.gstin IS NOT NULL
        AND p.gstin != ''
        ${dateFilter}
        AND t.is_cancelled = 0
        AND t.is_active = 1
    `);
    const missingGSTCount = missingGSTStmt.get(...params);

    return {
      duplicateAlerts: duplicateCount.count || 0,
      confirmedDuplicates: verifiedDuplicates.count || 0,
      ignoredDuplicates: ignoredDuplicates.count || 0,
      highValueTransactions: highValueCount.count || 0,
      missingGSTCompliance: missingGSTCount.count || 0,
      dataQualityScore: this.calculateQualityScore(duplicateCount.count, verifiedDuplicates.count, highValueCount.count, missingGSTCount.count),
      period: { startDate, endDate }
    };
  }

  /**
   * Calculate data quality score
   */
  calculateQualityScore(alerts, confirmed, highValue, missingGST) {
    let score = 100;
    
    // Deduct for duplicate alerts
    score -= Math.min(alerts * 2, 20);
    
    // Deduct for confirmed duplicates (indicates data entry issues)
    score -= Math.min(confirmed * 5, 25);
    
    // Deduct for compliance issues
    score -= Math.min(missingGST * 3, 15);
    
    // Bonus for managing high-value transactions appropriately
    score += Math.min(highValue * 1, 10);

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get recommendation based on matches
   */
  getRecommendation(matches) {
    if (matches.length === 0) {
      return 'CLEAR';
    }

    const highConfidenceMatches = matches.filter(m => m.confidence >= 0.9);
    const mediumConfidenceMatches = matches.filter(m => m.confidence >= 0.7 && m.confidence < 0.9);

    if (highConfidenceMatches.length > 0) {
      return 'BLOCK'; // High confidence duplicate - block and require review
    }

    if (mediumConfidenceMatches.length > 0) {
      return 'WARN'; // Medium confidence - warn and allow proceed with confirmation
    }

    return 'INFO'; // Low confidence - just inform
  }

  /**
   * Calculate text similarity using Levenshtein distance
   */
  calculateTextSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;

    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Levenshtein distance calculation
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Add days to a date string
   */
  addDays(dateStr, days) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  /**
   * Calculate difference between two date strings
   */
  dateDiff(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.abs(Math.ceil((d1 - d2) / (1000 * 60 * 60 * 24)));
  }
}

module.exports = IntegrityEngine;
