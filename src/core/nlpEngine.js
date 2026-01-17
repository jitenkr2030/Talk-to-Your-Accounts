// Natural Language Processing Engine for Talk to Your Accounts
// Handles voice/text commands in English, Hindi, and Hinglish
// Supports comprehensive conversational accounting features

export const nlpEngine = {
  // Supported languages
  languages: ['english', 'hindi', 'hinglish'],
  
  // Process user input and return structured response
  process(input, context = {}) {
    if (!input || typeof input !== 'string') {
      return {
        success: false,
        action: 'error',
        response: 'I didn\'t catch that. Could you please repeat?'
      };
    }

    const text = input.toLowerCase().trim();
    
    // Detect language
    const language = this.detectLanguage(text);
    
    // Extract intent and entities
    const intent = this.extractIntent(text);
    
    // Process based on intent
    let result;
    switch (intent.type) {
      case 'transaction':
        result = this.processTransaction(text, context, language, intent);
        break;
      case 'query':
        result = this.processQuery(text, context, language, intent);
        break;
      case 'report':
        result = this.processReport(text, context, language, intent);
        break;
      case 'insight':
        result = this.processInsight(text, context, language, intent);
        break;
      case 'alert':
        result = this.processAlert(text, context, language, intent);
        break;
      case 'ca_mode':
        result = this.processCAMode(text, context, language, intent);
        break;
      case 'setting':
        result = this.processSetting(text, context, language, intent);
        break;
      default:
        result = this.processGeneral(text, context, language);
    }

    return {
      ...result,
      language,
      originalInput: input,
      timestamp: new Date().toISOString()
    };
  },

  // Detect language (English, Hindi, or Hinglish)
  detectLanguage(text) {
    const hindiPatterns = /[\u0900-\u097F]/;
    const hinglishIndicators = /\b(aap|main|mujhe|apna|ka|ki|ko|se|from|to|the|hai|hain|tha|thi|tho|kaun|kya|kaise|kitna|bhot|zyada|kum|achha|bas|bhai|dost|ji)\b/i;
    
    if (hindiPatterns.test(text)) {
      return 'hindi';
    }
    
    if (hinglishIndicators.test(text)) {
      return 'hinglish';
    }
    
    return 'english';
  },

  // Extract intent from user input
  extractIntent(text) {
    // Transaction intents
    const transactionPatterns = [
      // Sale patterns
      { regex: /sold\s+(?:goods|items?|products?)?\s*(?:worth|value)?\s*(?:₹|rs\.?|rupees?)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:to|for|with)?\s*([a-zA-Z\s]+)?/i, type: 'sale', key: 'amount' },
      { regex: /bikr[ia]\s+(?:ki|hui)?\s*(?:₹|rs\.?|rupees?)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:ki|hui)?\s*(?:to|for)?\s*([a-zA-Z\s]+)?/i, type: 'sale', key: 'amount' },
      { regex: /sell\s+(?:goods|items?)?\s*(?:worth|value)?\s*(?:₹|rs\.?|rupees?)?\s*([\d,]+(?:\.\d{1,2})?)/i, type: 'sale', key: 'amount' },
      { regex: /becha\s+(?:(?:₹|rs\.?|rupees?)?\s*)?([\d,]+(?:\.\d{1,2})?)\s*(?:ka?|ki?)?\s*(?:saamaan|items?|goods)?\s*(?:to|ko)?\s*([a-zA-Z\s]+)?/i, type: 'sale', key: 'amount' },
      
      // Purchase patterns
      { regex: /purchas[ed]?\s+(?:goods|items?|products?)?\s*(?:worth|value)?\s*(?:₹|rs\.?|rupees?)?\s*([\d,]+(?:\.\d{1,2})?)/i, type: 'purchase', key: 'amount' },
      { regex: /kharid[a]?\s*(?:₹|rs\.?|rupees?)?\s*([\d,]+(?:\.\d{1,2})?)/i, type: 'purchase', key: 'amount' },
      { regex: /khareed[a]?\s*(?:₹|rs\.?|rupees?)?\s*([\d,]+(?:\.\d{1,2})?)/i, type: 'purchase', key: 'amount' },
      
      // Expense patterns
      { regex: /expense\s+(?:of|for)?\s*(?:₹|rs\.?|rupees?)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:on|for)?\s*([a-zA-Z\s]+)/i, type: 'expense', key: 'amount' },
      { regex: /spent\s*(?:₹|rs\.?|rupees?)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:on|for)?\s*([a-zA-Z\s]+)/i, type: 'expense', key: 'amount' },
      { regex: /kharcha\s*(?:₹|rs\.?|rupees?)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:ka?|ki?)?\s*([a-zA-Z\s]+)/i, type: 'expense', key: 'amount' },
      { regex: /daak?\s*(?:ka?|ki?)?\s*(?:₹|rs\.?|rupees?)?\s*([\d,]+(?:\.\d{1,2})?)/i, type: 'expense', key: 'amount' },
      
      // Payment received patterns
      { regex: /receive[fd]?\s+(?:payment|amount|money)?\s*(?:of|from)?\s*(?:₹|rs\.?|rupees?)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:from|of)?\s*([a-zA-Z\s]+)?/i, type: 'receipt', key: 'amount' },
      { regex: /payment\s+receive[fd]?\s*(?:of|from)?\s*(?:₹|rs\.?|rupees?)?\s*([\d,]+(?:\.\d{1,2})?)/i, type: 'receipt', key: 'amount' },
      
      // Payment made patterns
      { regex: /paid\s+(?:payment|amount|money)?\s*(?:of|for|to)?\s*(?:₹|rs\.?|rupees?)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:to|for)?\s*([a-zA-Z\s]+)?/i, type: 'payment', key: 'amount' },
      { regex: /payment\s+made\s*(?:of)?\s*(?:₹|rs\.?|rupees?)?\s*([\d,]+(?:\.\d{1,2})?)/i, type: 'payment', key: 'amount' },
    ];

    for (const pattern of transactionPatterns) {
      const match = text.match(pattern.regex);
      if (match) {
        return { 
          type: 'transaction', 
          subType: pattern.type, 
          match,
          key: pattern.key 
        };
      }
    }

    // Query patterns
    const queryPatterns = [
      // Sales queries
      { regex: /(?:how\s+much|tell\s+me|what\s+is|kitna|kaisa)\s+(?:did\s+I\s+)?sell/i, type: 'sales', key: 'sales' },
      { regex: /(?:today|aj|aaj)\s+(?:ki\s+)?(?:sales|bikri)/i, type: 'sales_today', key: 'sales' },
      { regex: /(?:this\s+month|is\s+mahine|is\s+mahine\s+ki)\s+(?:sales|bikri)/i, type: 'sales_month', key: 'sales' },
      
      // Profit queries
      { regex: /(?:what\s+is|how\s+much|kitna|kaisa)\s+(?:is\s+)?(?:my\s+)?(?:profit|kamai|income|kamai)/i, type: 'profit', key: 'profit' },
      { regex: /(?:kitna|kaisa)\s+(?:hai|he)\s+(?:mera\s+)?profit/i, type: 'profit', key: 'profit' },
      
      // Balance queries
      { regex: /(?:how\s+much|cash|balance|kitna\s+paisa|balance)/i, type: 'balance', key: 'balance' },
      { regex: /(?:kitna|kaisa)\s+(?:hai|he)\s+(?:mera\s+)?(?:cash|balance|paisa)/i, type: 'balance', key: 'balance' },
      
      // Outstanding queries
      { regex: /(?:who\s+(?:has|hasn\'t|is\s+)?paid|kitna\s+bacha|receivable|remaining|due)/i, type: 'outstanding', key: 'outstanding' },
      { regex: /(?:kaun|kis\s+ne)\s+(?:abhi\s+)?(?:nahi[n]?\s+)?diya\s*(?:paisa)?/i, type: 'outstanding', key: 'outstanding' },
      { regex: /kitna\s+(?:bacha|remaining|due)/i, type: 'outstanding', key: 'outstanding' },
      
      // Expense queries
      { regex: /(?:how\s+much|kitna)\s+(?:did\s+I\s+)?(?:spend|spending|kharcha)/i, type: 'expenses', key: 'expenses' },
      { regex: /(?:kitna|kaisa)\s+(?:hai|he)\s+(?:mera\s+)?(?:kharcha|expense)/i, type: 'expenses', key: 'expenses' },
      
      // GST queries
      { regex: /(?:gst|gst\s+(?:collected|payable|liability|filing))/i, type: 'gst', key: 'gst' },
      
      // Cash flow queries
      { regex: /(?:cash\s+flow|paisa\s+ka\s+chal)/i, type: 'cash_flow', key: 'cash_flow' },
    ];

    for (const pattern of queryPatterns) {
      if (pattern.regex.test(text)) {
        return { 
          type: 'query', 
          subType: pattern.type, 
          key: pattern.key 
        };
      }
    }

    // Report patterns
    const reportPatterns = [
      { regex: /(?:show|generate|display|create)\s+(?:me\s+)?(?:my\s+)?sales\s+report/i, type: 'sales' },
      { regex: /(?:show|generate|display|create)\s+(?:me\s+)?(?:my\s+)?gst\s+report/i, type: 'gst' },
      { regex: /(?:profit\s+(?:and\s+)?loss|pl|p&l|p\/l)\s+report/i, type: 'profit_loss' },
      { regex: /(?:balance\s+sheet|balance)/i, type: 'balance_sheet' },
      { regex: /(?:cash\s+flow|cash)/i, type: 'cash_flow' },
      { regex: /(?:outstanding\s+aging|aging|receivables)/i, type: 'outstanding_aging' },
      { regex: /(?:expense\s+summary|expenses)/i, type: 'expense' },
      { regex: /(?:day\s+book|daybook|roznamcha)/i, type: 'day_book' },
      { regex: /(?:ledger|khatabook)/i, type: 'ledger' },
      { regex: /(?:trial\s+balance|trial)/i, type: 'trial_balance' },
    ];

    for (const pattern of reportPatterns) {
      if (pattern.regex.test(text)) {
        return { 
          type: 'report', 
          reportType: pattern.type 
        };
      }
    }

    // Insight patterns
    const insightPatterns = [
      { regex: /(?:business\s+)?(?:health\s+check|health|kaisa\s+chal|kaisa\s+chal\s+raha)/i, type: 'health' },
      { regex: /(?:smart\s+)?insights?|analysis|trends|anomaly|alert/i, type: 'insights' },
      { regex: /(?:suggest|recommendation|tip|advice|raay)/i, type: 'recommendation' },
    ];

    for (const pattern of insightPatterns) {
      if (pattern.regex.test(text)) {
        return { 
          type: 'insight', 
          insightType: pattern.type 
        };
      }
    }

    // Alert patterns
    const alertPatterns = [
      { regex: /(?:show|list|kitna)\s+(?:alert|warning|notice|notification)/i, type: 'show_alerts' },
      { regex: /(?:dismiss|remove|close)\s+(?:alert|warning|notification)/i, type: 'dismiss_alert' },
      { regex: /(?:gst|tax)\s+(?:reminder|due|filing)/i, type: 'gst_reminder' },
    ];

    for (const pattern of alertPatterns) {
      if (pattern.regex.test(text)) {
        return { 
          type: 'alert', 
          alertType: pattern.type 
        };
      }
    }

    // CA Mode patterns
    const caModePatterns = [
      { regex: /(?:ca|chartered\s+accountant|accountant)\s+(?:mode|dashboard|view)/i, type: 'ca_dashboard' },
      { regex: /(?:audit\s+trail|audit\s+log|who\s+did\s+what)/i, type: 'audit_trail' },
      { regex: /(?:multi\s+client|client\s+data|all\s+parties)/i, type: 'client_data' },
      { regex: /(?:export\s+(?:for\s+)?ca|ca\s+export|professional\s+export)/i, type: 'ca_export' },
    ];

    for (const pattern of caModePatterns) {
      if (pattern.regex.test(text)) {
        return { 
          type: 'ca_mode', 
          modeType: pattern.type 
        };
      }
    }

    // Setting patterns
    const settingPatterns = [
      { regex: /(?:change|set|update)\s+(?:language|bhasha)/i, type: 'language' },
      { regex: /(?:business|company)\s+(?:name|details|info)/i, type: 'business_info' },
      { regex: /(?:backup|restore|import|export)\s+(?:data|database)/i, type: 'data_backup' },
    ];

    for (const pattern of settingPatterns) {
      if (pattern.regex.test(text)) {
        return { 
          type: 'setting', 
          settingType: pattern.type 
        };
      }
    }

    return { type: 'general' };
  },

  // Process transaction intent
  processTransaction(text, context, language, intent) {
    const { subType, match } = intent;
    
    // Extract amount
    const amount = parseFloat(match[1].replace(/,/g, ''));
    
    // Extract party name if present
    let party = match[2] ? match[2].trim() : null;
    
    // Extract GST if mentioned
    const gstMatch = text.match(/(\d+)\s*%?\s*gst/i);
    const gstRate = gstMatch ? parseFloat(gstMatch[1]) : 18; // Default 18%
    const gstAmount = (amount * gstRate) / 100;
    const totalAmount = amount + gstAmount;
    
    // Extract quantity if mentioned
    const quantityMatch = text.match(/(?:of\s+)?(\d+)\s*(?:pieces?|pcs?|units?|items?|quantity)?/i);
    const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
    
    // Extract product if mentioned
    const productMatch = text.match(/(?:of|for)?\s*(?:goods?|items?|products?|saamaan|items?)\s*(?:worth|value)?/i);
    let productName = 'General';
    if (text.includes('cement')) productName = 'Cement';
    else if (text.includes('steel')) productName = 'Steel';
    else if (text.includes('brick')) productName = 'Bricks';
    else if (text.includes('paint')) productName = 'Paint';
    else if (text.includes('furniture')) productName = 'Furniture';
    
    // Find party in context
    let partyId = null;
    if (party && context.parties) {
      const foundParty = context.parties.find(p => 
        p.name.toLowerCase().includes(party.toLowerCase())
      );
      partyId = foundParty ? foundParty.id : null;
    }
    
    // Find product in context
    let productId = null;
    if (context.products) {
      const foundProduct = context.products.find(p => 
        p.name.toLowerCase().includes(productName.toLowerCase())
      );
      productId = foundProduct ? foundProduct.id : null;
    }

    const transaction = {
      voucher_type: subType === 'receipt' ? 'receipt' : subType === 'payment' ? 'payment' : subType,
      date: new Date().toISOString().split('T')[0],
      party_id: partyId,
      product_id: productId,
      quantity,
      rate: amount / quantity,
      amount,
      gst_rate: gstRate,
      gst_amount: gstAmount,
      total_amount: totalAmount,
      description: text,
      payment_status: 'pending'
    };

    // Generate response based on language
    let response = '';
    const amountFormatted = `₹${totalAmount.toLocaleString()}`;
    
    if (language === 'hindi') {
      const transactionHindi = {
        'sale': 'बिक्री',
        'purchase': 'खरीद',
        'expense': 'खर्च',
        'receipt': 'प्राप्ति',
        'payment': 'भुगतान'
      };
      response = `ठीक है! ${transactionHindi[subType] || subType} entry: ${amountFormatted} ${party ? `${party} के लिए` : ''}`;
    } else if (language === 'hinglish') {
      response = `Samjha! ${subType === 'sale' ? 'Sale' : subType === 'purchase' ? 'Purchase' : subType} of ${amountFormatted}`;
      if (party) response += ` ${party} ke naam se`;
      response += ' record kar raha hoon.';
    } else {
      response = `Got it! Recording ${subType === 'sale' ? 'sale' : subType === 'purchase' ? 'purchase' : subType} of ${amountFormatted}`;
      if (party) response += ` to ${party}`;
      response += '.';
    }

    return {
      success: true,
      action: 'transaction',
      data: transaction,
      response,
      requiresConfirmation: true,
      confirmationDetails: {
        type: subType,
        amount: amountFormatted,
        party: party,
        gstRate: gstRate,
        gstAmount: `₹${gstAmount.toLocaleString()}`,
        total: amountFormatted,
        quantity
      }
    };
  },

  // Process query intent
  processQuery(text, context, language, intent) {
    const { subType, key } = intent;
    const period = this.getPeriod(text);
    
    let queryType = '';
    let responseBuilder = null;

    switch (subType) {
      case 'sales':
      case 'sales_today':
      case 'sales_month':
        queryType = 'sales';
        responseBuilder = (data) => {
          if (!data || !data.summary) {
            return language === 'hindi' 
              ? 'कोई बिक्री डेटा नहीं मिला।' 
              : language === 'hinglish' 
                ? 'Koi sales data nahi mila.' 
                : 'No sales data found.';
          }
          const sales = data.summary.total_sales || 0;
          const count = data.summary.transaction_count || 0;
          
          if (language === 'hindi') {
            return `इस अवधि में आपने ₹${sales.toLocaleString()} की बिक्री की ${count} transactions के साथ।`;
          } else if (language === 'hinglish') {
            return `Is period mein aapne ₹${sales.toLocaleString()} ki sales ki ${count} transactions ke saath.`;
          }
          return `You sold ₹${sales.toLocaleString()} across ${count} transactions during this period.`;
        };
        break;

      case 'profit':
        queryType = 'profit';
        responseBuilder = (data) => {
          if (!data) {
            return language === 'hindi' 
              ? 'कोई डेटा नहीं मिला।' 
              : language === 'hinglish' 
                ? 'Koi data nahi mila.' 
                : 'No data found.';
          }
          const profit = data.net_profit || 0;
          
          if (profit >= 0) {
            if (language === 'hindi') {
              return `बहुत बढ़िया! इस अवधि में आपका शुद्ध लाभ ₹${profit.toLocaleString()} है।`;
            } else if (language === 'hinglish') {
              return `Badhaiya! Is period mein aapka net profit ₹${profit.toLocaleString()} hai.`;
            }
            return `Great! Your net profit this period is ₹${profit.toLocaleString()}.`;
          } else {
            if (language === 'hindi') {
              return `इस अवधि में आपका शुद्ध हानि ₹${Math.abs(profit).toLocaleString()} है।`;
            } else if (language === 'hinglish') {
              return `Is period mein aapka net loss ₹${Math.abs(profit).toLocaleString()} hai.`;
            }
            return `Your net loss this period is ₹${Math.abs(profit).toLocaleString()}.`;
          }
        };
        break;

      case 'balance':
        queryType = 'balance';
        responseBuilder = (data) => {
          if (!data) {
            return language === 'hindi' 
              ? 'कोई डेटा नहीं मिला।' 
              : 'No data found.';
          }
          const cash = data.cashFlow || 0;
          const receivables = data.pendingReceivables || 0;
          const payables = data.pendingPayables || 0;
          
          if (language === 'hindi') {
            return `कैश: ₹${cash.toLocaleString()}, प्राप्य: ₹${receivables.toLocaleString()}, देय: ₹${payables.toLocaleString()}`;
          } else if (language === 'hinglish') {
            return `Cash: ₹${cash.toLocaleString()}, Receivables: ₹${receivables.toLocaleString()}, Payables: ₹${payables.toLocaleString()}`;
          }
          return `Cash: ₹${cash.toLocaleString()}, Receivables: ₹${receivables.toLocaleString()}, Payables: ₹${payables.toLocaleString()}`;
        };
        break;

      case 'outstanding':
        queryType = 'outstanding';
        responseBuilder = (data) => {
          if (!data || !data.aging) {
            return language === 'hindi' 
              ? 'कोई बकाया नहीं है।' 
              : 'No outstanding amounts.';
          }
          const total = data.summary?.total_outstanding || 0;
          
          if (language === 'hindi') {
            return `कुल बकाया: ₹${total.toLocaleString()}` + 
              (data.aging[0] ? `। सबसे पुराना: ${data.aging[0].party_name} (${data.aging[0].days_overdue} दिन)` : '');
          } else if (language === 'hinglish') {
            return `Total outstanding: ₹${total.toLocaleString()}` + 
              (data.aging[0] ? `. Sabse purana: ${data.aging[0].party_name} (${data.aging[0].days_overdue} din)` : '');
          }
          return `Total outstanding: ₹${total.toLocaleString()}` + 
            (data.aging[0] ? `. Oldest: ${data.aging[0].party_name} (${data.aging[0].days_overdue} days)` : '');
        };
        break;

      case 'expenses':
        queryType = 'expenses';
        responseBuilder = (data) => {
          if (!data || !data.total) {
            return language === 'hindi' 
              ? 'कोई खर्च नहीं हुआ।' 
              : 'No expenses recorded.';
          }
          const total = data.total || 0;
          
          if (language === 'hindi') {
            return `इस अवधि में कुल खर्च: ₹${total.toLocaleString()}`;
          } else if (language === 'hinglish') {
            return `Is period mein total kharcha: ₹${total.toLocaleString()}`;
          }
          return `Total expenses this period: ₹${total.toLocaleString()}`;
        };
        break;

      case 'gst':
        queryType = 'gst';
        responseBuilder = (data) => {
          if (!data) {
            return language === 'hindi' 
              ? 'कोई GST डेटा नहीं मिला।' 
              : 'No GST data found.';
          }
          const collected = data.summary?.gst_collected || 0;
          const paid = data.summary?.gst_paid || 0;
          const liability = data.summary?.net_liability || 0;
          
          if (language === 'hindi') {
            return `GST एकत्रित: ₹${collected.toLocaleString()}, GST भुगतान: ₹${paid.toLocaleString()}, देनदायिक: ₹${liability.toLocaleString()}`;
          } else if (language === 'hinglish') {
            return `GST collected: ₹${collected.toLocaleString()}, GST paid: ₹${paid.toLocaleString()}, Net liability: ₹${liability.toLocaleString()}`;
          }
          return `GST Collected: ₹${collected.toLocaleString()}, GST Paid: ₹${paid.toLocaleString()}, Net Liability: ₹${liability.toLocaleString()}`;
        };
        break;

      case 'cash_flow':
        queryType = 'cash_flow';
        responseBuilder = (data) => {
          if (!data) {
            return language === 'hindi' 
              ? 'कोई कैश फ्लो डेटा नहीं मिला।' 
              : 'No cash flow data found.';
          }
          const inflows = data.summary?.total_inflows || 0;
          const outflows = data.summary?.total_outflows || 0;
          const balance = data.summary?.closing_balance || 0;
          
          if (language === 'hindhi') {
            return `आगमन: ₹${inflows.toLocaleString()}, निकासी: ₹${outflows.toLocaleString()}, शेष: ₹${balance.toLocaleString()}`;
          } else if (language === 'hinglish') {
            return `Inflows: ₹${inflows.toLocaleString()}, Outflows: ₹${outflows.toLocaleString()}, Balance: ₹${balance.toLocaleString()}`;
          }
          return `Inflows: ₹${inflows.toLocaleString()}, Outflows: ₹${outflows.toLocaleString()}, Balance: ₹${balance.toLocaleString()}`;
        };
        break;

      default:
        responseBuilder = () => {
          return language === 'hindi' 
            ? 'मैं आपके accounts के बारे में जानकारी दे सकता हूँ। क्या आप जानना चाहेंगे?' 
            : 'I can help you with your accounts. What would you like to know?';
        };
    }

    return {
      success: true,
      action: 'query',
      queryType,
      period,
      response: typeof responseBuilder === 'function' ? null : responseBuilder,
      responseBuilder
    };
  },

  // Process report intent
  processReport(text, context, language, intent) {
    const { reportType } = intent;
    const period = this.getPeriod(text);
    
    const reportNames = {
      sales: { en: 'Sales Report', hi: 'बिक्री रिपोर्ट', hl: 'Sales Report' },
      gst: { en: 'GST Report', hi: 'GST रिपोर्ट', hl: 'GST Report' },
      profit_loss: { en: 'Profit & Loss Statement', hi: 'लाभ और हानि विवरण', hl: 'Profit & Loss' },
      balance_sheet: { en: 'Balance Sheet', hi: 'आर्थिक चिट्ठा', hl: 'Balance Sheet' },
      cash_flow: { en: 'Cash Flow Statement', hi: 'नकदी प्रवाह विवरण', hl: 'Cash Flow' },
      outstanding_aging: { en: 'Outstanding Aging Report', hi: 'बकाया उम्र रिपोर्ट', hl: 'Outstanding Report' },
      expense: { en: 'Expense Summary', hi: 'खर्च सारांश', hl: 'Kharcha Summary' },
      day_book: { en: 'Day Book', hi: 'रोज़नामचा', hl: 'Day Book' },
      ledger: { en: 'Ledger', hi: 'खाता', hl: 'Ledger' },
      trial_balance: { en: 'Trial Balance', hi: 'तलबालंस', hl: 'Trial Balance' },
    };

    const name = reportNames[reportType] || { en: 'Report', hi: 'रिपोर्ट', hl: 'Report' };
    const reportName = name[language] || name.en;
    
    let response = '';
    if (language === 'hindi') {
      response = `${reportName} बना रहा हूँ ${this.formatPeriodHindi(period)}...`;
    } else if (language === 'hinglish') {
      response = `${reportName} bana raha hoon ${this.formatPeriodHindi(period)} mein...`;
    } else {
      response = `Generating ${reportName} for ${this.formatPeriod(period)}...`;
    }

    return {
      success: true,
      action: 'report',
      reportType,
      period,
      response,
      requiresExport: true
    };
  },

  // Process insight intent
  processInsight(text, context, language, intent) {
    const { insightType } = intent;
    
    if (insightType === 'health') {
      return {
        success: true,
        action: 'insight',
        insightType: 'health',
        response: this.generateHealthResponse(language)
      };
    }
    
    if (insightType === 'recommendation') {
      return {
        success: true,
        action: 'insight',
        insightType: 'recommendation',
        response: this.generateRecommendations(language)
      };
    }

    return {
      success: true,
      action: 'insight',
      insightType: insightType,
      response: language === 'hindi' 
        ? 'स्मार्ट अंतर्दृष्टि विश्लेषण...' 
        : 'Smart insight analysis...'
    };
  },

  // Process alert intent
  processAlert(text, context, language, intent) {
    const { alertType } = intent;
    
    return {
      success: true,
      action: 'alert',
      alertType,
      response: language === 'hindi' 
        ? 'Alerts लोड कर रहा हूँ...' 
        : 'Loading alerts...'
    };
  },

  // Process CA mode intent
  processCAMode(text, context, language, intent) {
    const { modeType } = intent;
    
    return {
      success: true,
      action: 'ca_mode',
      modeType,
      response: language === 'hindi' 
        ? 'CA Mode सक्रिय कर रहा हूँ...' 
        : 'Activating CA Mode...'
    };
  },

  // Process setting intent
  processSetting(text, context, language, intent) {
    const { settingType } = intent;
    
    return {
      success: true,
      action: 'setting',
      settingType,
      response: language === 'hindi' 
        ? 'Settings खोल रहा हूँ...' 
        : 'Opening settings...'
    };
  },

  // Process general/unknown intent
  processGeneral(text, context, language) {
    const greetings = /^(hi|hello|hey|namaste|good\s+morning|good\s+evening|namaskar|dhanyawad|shukriya)/i;
    const thanks = /^(thank|dhanyawad|shukriya|thx|thanks)/i;
    
    if (greetings.test(text)) {
      const responses = {
        hindi: {
          greeting: 'नमस्ते!',
          message: 'मैं आपका वित्तीय सहायक हूँ। आप मुझसे अपने accounts के बारे में पूछ सकते हैं। जैसे: "आज कितनी बिक्री हुई?" या "मेरा profit दिखाओ"'
        },
        hinglish: {
          greeting: 'Namaste!',
          message: 'Main aapka financial assistant hoon. Aap mujhe apne accounts ke baare mein poochh sakte hain. Jaise ki "Aaj kitni bikri hui?" ya "Mera profit dikhao"'
        },
        english: {
          greeting: 'Hello!',
          message: 'I\'m your financial assistant. You can ask me about your accounts like "How much did I sell today?" or "Show me my profit"'
        }
      };
      
      return {
        success: true,
        action: 'greeting',
        response: `${responses[language].greeting} ${responses[language].message}`
      };
    }
    
    if (thanks.test(text)) {
      const responses = {
        hindi: 'आपका स्वागत है! कोई और सवाल हो तो बताइए।',
        hinglish: 'Aapka swagat hai! Koi aur sawal hai toh batayein.',
        english: 'You\'re welcome! Is there anything else I can help you with?'
      };
      
      return {
        success: true,
        action: 'thanks',
        response: responses[language]
      };
    }
    
    const unclearResponses = {
      hindi: 'मुझे समझ नहीं आया। क्या आप दोबारा कह सकते हैं? कोशिश करें "आज की बिक्री दिखाओ" या "Profit report चाहिए"',
      hinglish: 'Mujhe samajh nahi aaya. Kya aap dobara bol sakte hain? Try karein "Aaj ki sales dikhao" ya "Profit report chahiye"',
      english: 'I didn\'t understand that. Could you please rephrase? Try asking "Show me today\'s sales" or "I need a profit report"'
    };
    
    return {
      success: false,
      action: 'unclear',
      response: unclearResponses[language]
    };
  },

  // Generate health response
  generateHealthResponse(language) {
    if (language === 'hindi') {
      return 'व्यापार स्वास्थ्य जांच विश्लेषण कर रहा हूँ... यह आपके cash flow, credit, expenses, और compliance का मूल्यांकन करेगा।';
    } else if (language === 'hinglish') {
      return 'Business health check analysis kar raha hoon... Ye aapke cash flow, credit, expenses, aur compliance ka evaluation karega.';
    }
    return 'Running business health check analysis... This will evaluate your cash flow, credit, expenses, and compliance.';
  },

  // Generate recommendations
  generateRecommendations(language) {
    if (language === 'hindi') {
      return 'सुझाव और सिफारिशें: 1) समय पर GST filing करें 2) receivables को quickly collect करें 3) non-essential expenses कम करें 4) inventory levels monitor करें।';
    } else if (language === 'hinglish') {
      return 'Suggestions & recommendations: 1) Time par GST filing karein 2) Receivables ko quickly collect karein 3) Non-essential expenses kam karein 4) Inventory levels monitor karein.';
    }
    return 'Suggestions & Recommendations: 1) File GST on time 2) Collect receivables promptly 3) Reduce non-essential expenses 4) Monitor inventory levels.';
  },

  // Get period from text
  getPeriod(text) {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);
    const thisYear = today.substring(0, 4);
    
    if (/today|aaj|aj|hindi/i.test(text)) return { type: 'today', value: today };
    if (/this\s+week|is\s+hafta/i.test(text)) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { type: 'week', start: weekAgo.toISOString().split('T')[0], end: today };
    }
    if (/this\s+month|is\s+mahine|is\s+mahine\s+ki/i.test(text)) return { type: 'month', value: thisMonth };
    if (/last\s+month|pichle\s+mahine/i.test(text)) {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return { type: 'month', value: lastMonth.toISOString().substring(0, 7) };
    }
    if (/this\s+year|is\s+saal|is\s+saal\s+ki/i.test(text)) return { type: 'year', value: thisYear };
    
    return { type: 'today', value: today };
  },

  // Format period for display
  formatPeriod(period) {
    if (typeof period === 'object' && period.type) {
      switch (period.type) {
        case 'today': return 'today';
        case 'week': return 'this week';
        case 'month': 
          const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
          const month = parseInt(period.value?.split('-')[1] || new Date().getMonth() + 1);
          return `this ${months[month - 1]}`;
        case 'year': return 'this year';
        default: return 'this period';
      }
    }
    return 'this period';
  },

  // Format period in Hindi
  formatPeriodHindi(period) {
    if (typeof period === 'object' && period.type) {
      switch (period.type) {
        case 'today': return 'आज';
        case 'week': return 'इस हफ्ते';
        case 'month': return 'इस महीने';
        case 'year': return 'इस साल';
        default: return 'इस अवधि';
      }
    }
    return 'इस अवधि';
  },

  // Validate extracted data
  validateTransaction(data) {
    const errors = [];
    
    if (!data.amount || data.amount <= 0) {
      errors.push('Invalid or missing amount');
    }
    
    if (data.gst_rate && (data.gst_rate < 0 || data.gst_rate > 28)) {
      errors.push('Invalid GST rate');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Parse amount from Indian numbering system
  parseIndianAmount(text) {
    // Handle Indian number words
    const numberWords = {
      'ek': 1, 'do': 2, 'teen': 3, 'char': 4, 'paanch': 5, 'chaar': 4,
      'chh': 6, 'saat': 7, 'aath': 8, 'nau': 9, 'das': 10,
      'gyarah': 11, 'barah': 12, 'terah': 13, 'chaudah': 14, 'pandrah': 15,
      'solah': 16, 'satrrah': 17, 'atharah': 18, 'unnis': 19, 'bis': 20,
      'kamm': 21, 'tibba': 21, 'tees': 30, 'chaalis': 40, 'pachas': 50,
      'saath': 60, 'sattar': 70, 'asshi': 80, 'nabbe': 90, 'sau': 100,
      'hazaar': 1000, 'hazār': 1000, 'lakh': 100000, 'lākh': 100000,
      'crore': 10000000, 'karod': 10000000
    };
    
    // Handle "do sau" style combinations
    let processedText = text.toLowerCase();
    
    // Extract numeric amount first
    const numericMatch = processedText.match(/(?:₹|rs\.?|rupees?)?\s*([\d,]+(?:\.\d{1,2})?)/);
    if (numericMatch) {
      return parseFloat(numericMatch[1].replace(/,/g, ''));
    }
    
    // Handle "hazaar" and above
    let amount = 0;
    
    if (processedText.includes('crore') || processedText.includes('karod')) {
      const croreMatch = processedText.match(/(\w+)\s*crore/i) || processedText.match(/(\w+)\s*karod/i);
      if (croreMatch) {
        amount += (numberWords[croreMatch[1]] || parseInt(croreMatch[1]) || 0) * 10000000;
      }
      // Remove processed part
      processedText = processedText.replace(/(\w+)\s*(crore|karod)/gi, '');
    }
    
    if (processedText.includes('lakh') || processedText.includes('lākh')) {
      const lakhMatch = processedText.match(/(\w+)\s*lakh/i) || processedText.match(/(\w+)\s*lākh/i);
      if (lakhMatch) {
        amount += (numberWords[lakhMatch[1]] || parseInt(lakhMatch[1]) || 0) * 100000;
      }
      processedText = processedText.replace(/(\w+)\s*(lakh|lākh)/gi, '');
    }
    
    if (processedText.includes('hazaar') || processedText.includes('hazār')) {
      const hazarMatch = processedText.match(/(\w+)\s*hazaar/i) || processedText.match(/(\w+)\s*hazār/i);
      if (hazarMatch) {
        amount += (numberWords[hazarMatch[1]] || parseInt(hazarMatch[1]) || 0) * 1000;
      }
      processedText = processedText.replace(/(\w+)\s*(hazaar|hazār)/gi, '');
    }
    
    if (processedText.includes('sau')) {
      const sauMatch = processedText.match(/(\w+)\s*sau/i);
      if (sauMatch) {
        amount += (numberWords[sauMatch[1]] || parseInt(sauMatch[1]) || 0) * 100;
      }
      processedText = processedText.replace(/(\w+)\s*sau/gi, '');
    }
    
    // Handle remaining small numbers
    for (const [word, value] of Object.entries(numberWords)) {
      if (processedText.includes(word)) {
        amount += value;
      }
    }
    
    return amount > 0 ? amount : null;
  }
};

export default nlpEngine;
