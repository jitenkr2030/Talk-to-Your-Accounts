// Natural Language Processing Engine for Talk to Your Accounts
// Handles voice/text commands in English, Hindi, and Hinglish

export const nlpengine = {
  process(input, context) {
    const text = input.toLowerCase().trim();
    
    // Detect language
    const language = detectLanguage(text);
    
    // Extract intent
    const intent = extractIntent(text);
    
    // Process based on intent
    switch (intent.type) {
      case 'transaction':
        return processTransaction(text, context, language, intent);
      case 'query':
        return processQuery(text, context, language, intent);
      case 'report':
        return processReport(text, context, language, intent);
      case 'insight':
        return processInsight(text, context, language, intent);
      default:
        return processGeneral(text, context, language);
    }
  }
};

function detectLanguage(text) {
  const hindiWords = ['sold', 'purchase', 'rupees', 'rupiya', 'aaya', 'gaya', 'hai', 'chahiye', 'dikhao', 'kitna', 'kaisa', 'chal', 'raha'];
  const hinglishIndicators = /[a-z]*[\u0900-\u097F]+[a-z]*/;
  
  if (hinglishIndicators.test(text) || hindiWords.some(w => text.includes(w))) {
    return 'hinglish';
  }
  return 'english';
}

function extractIntent(text) {
  // Transaction patterns
  const transactionPatterns = [
    { regex: /sold\s+(?:goods\s+)?worth\s+₹?([\d,]+(?:\.\d{1,2})?)\s*(?:to|for|with)\s+([a-zA-Z\s]+)/i, type: 'sale', key: 'party' },
    { regex: /purchase[sd]?\s+(?:items?\s+)?worth\s+₹?([\d,]+(?:\.\d{1,2})?)/i, type: 'purchase', key: 'amount' },
    { regex: /receive[fd]?\s+₹?([\d,]+(?:\.\d{1,2})?)\s*(?:from|of)?\s*([a-zA-Z\s]+)/i, type: 'payment_received', key: 'party' },
    { regex: /paid?\s+₹?([\d,]+(?:\.\d{1,2})?)\s*(?:for|to)\s+([a-zA-Z\s]+)/i, type: 'payment_made', key: 'expense' },
  ];
  
  for (const pattern of transactionPatterns) {
    const match = text.match(pattern.regex);
    if (match) {
      return { type: 'transaction', subType: pattern.type, match };
    }
  }
  
  // Query patterns
  const queryPatterns = [
    { regex: /(?:how\s+much|sabse|kitna)\s+(?:did\s+I\s+)?sell/i, type: 'sales_query', key: 'sales' },
    { regex: /(?:what|how)\s+(?:is\s+)?(?:my\s+)?(?:profit|kamai|income)/i, type: 'profit_query', key: 'profit' },
    { regex: /(?:how\s+much|cash|balance|kitna\s+paisa)/i, type: 'balance_query', key: 'balance' },
    { regex: /(?:who\s+(?:has|hasn't|is\s+)?paid|kitna\s+bacha|receivable)/i, type: 'outstanding_query', key: 'outstanding' },
  ];
  
  for (const pattern of queryPatterns) {
    if (pattern.regex.test(text)) {
      return { type: 'query', subType: pattern.type, key: pattern.key };
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
  ];
  
  for (const pattern of reportPatterns) {
    if (pattern.regex.test(text)) {
      return { type: 'report', reportType: pattern.type };
    }
  }
  
  // Insight patterns
  const insightPatterns = [
    { regex: /(?:business\s+)?(?:health\s+check|health|kaisa\s+chal|kaisa\s+chal\s+raha)/i, type: 'health' },
    { regex: /(?:smart\s+)?insights?|analysis|trends/i, type: 'insights' },
  ];
  
  for (const pattern of insightPatterns) {
    if (pattern.regex.test(text)) {
      return { type: 'insight', insightType: pattern.type };
    }
  }
  
  return { type: 'general' };
}

function processTransaction(text, context, language, intent) {
  const { subType, match } = intent;
  const amount = parseFloat(match[1].replace(/,/g, ''));
  let party = match[2] ? match[2].trim() : null;
  
  // Extract GST if mentioned
  const gstMatch = text.match(/(\d+)\s*%?\s*gst/i);
  const gstRate = gstMatch ? parseFloat(gstMatch[1]) : 0;
  const gstAmount = (amount * gstRate) / 100;
  const totalAmount = amount + gstAmount;
  
  // Find party in context
  let partyId = null;
  if (party && context.parties) {
    const foundParty = context.parties.find(p => 
      p.name.toLowerCase().includes(party.toLowerCase())
    );
    partyId = foundParty ? foundParty.id : null;
  }
  
  const transaction = {
    type: subType,
    party_id: partyId,
    quantity: 1,
    rate: amount,
    amount,
    gst_rate: gstRate,
    gst_amount: gstAmount,
    total_amount: totalAmount,
    description: text,
    payment_status: 'pending'
  };
  
  let response = '';
  if (language === 'hinglish') {
    response = `Got it! ${subType === 'sale' ? 'Sale' : subType === 'purchase' ? 'Purchase' : 'Transaction'} of ₹${totalAmount.toLocaleString()} recorded.`;
    if (party) response += ` Party: ${party}.`;
  } else {
    response = `I've recorded your ${subType === 'sale' ? 'sale' : subType === 'purchase'} of ₹${totalAmount.toLocaleString()}.`;
    if (party) response += ` Party: ${party}.`;
  }
  
  return {
    action: 'transaction',
    data: transaction,
    response
  };
}

function processQuery(text, context, language, intent) {
  const { subType, key } = intent;
  const period = getPeriod(text);
  
  let response = '';
  let queryType = '';
  
  switch (subType) {
    case 'sales_query':
      queryType = 'sales';
      response = (data) => {
        if (!data || !data.summary) return "No sales data found.";
        const sales = data.summary.total_sales;
        const count = data.summary.transaction_count;
        if (language === 'hinglish') {
          return `Aapne ${formatPeriod(period)} mein ₹${sales.toLocaleString()} ki sales ki ${count} transactions ke saath.`;
        }
        return `You sold ₹${sales.toLocaleString()} across ${count} transactions ${formatPeriod(period)}.`;
      };
      break;
    case 'profit_query':
      queryType = 'profit';
      response = (data) => {
        if (!data) return "No profit data found.";
        const profit = data.net_profit;
        if (profit >= 0) {
          if (language === 'hinglish') {
            return `Mazaak! ${formatPeriod(period)} aapka net profit hai ₹${profit.toLocaleString()}. Badhaiya!`;
          }
          return `Great! Your net profit ${formatPeriod(period)} is ₹${profit.toLocaleString()}.`;
        } else {
          if (language === 'hinglish') {
            return `${formatPeriod(period)} aapka net loss hai ₹${Math.abs(profit).toLocaleString()}.`;
          }
          return `Your net loss ${formatPeriod(period)} is ₹${Math.abs(profit).toLocaleString()}.`;
        }
      };
      break;
    default:
      response = "I can help you check your sales, profits, and other metrics. What would you like to know?";
  }
  
  return {
    action: 'query',
    queryType,
    period,
    response
  };
}

function processReport(text, context, language, intent) {
  const { reportType } = intent;
  
  const reportNames = {
    sales: { en: 'Sales Report', hi: 'Bikri Report' },
    gst: { en: 'GST Report', hi: 'GST Report' },
    profit_loss: { en: 'Profit & Loss Statement', hi: 'Profit and Loss' },
    balance_sheet: { en: 'Balance Sheet', hi: 'Balance Sheet' },
    cash_flow: { en: 'Cash Flow Statement', hi: 'Cash Flow' },
    outstanding_aging: { en: 'Outstanding Aging Report', hi: 'Outstanding Report' },
    expense: { en: 'Expense Summary', hi: 'Kharcha Summary' },
  };
  
  const period = getPeriod(text);
  const reportName = reportNames[reportType]?.en || 'Report';
  
  return {
    action: 'report',
    reportType,
    period,
    response: `Generating ${reportName} for ${formatPeriod(period)}...`
  };
}

function processInsight(text, context, language, intent) {
  return {
    action: 'general',
    response: "Business insights analysis coming soon! This feature will provide AI-powered analysis of your business trends, anomalies, and recommendations."
  };
}

function processGeneral(text, context, language) {
  const greetings = /^(hi|hello|hey|namaste|good\s+morning|good\s+evening)/i;
  const thanks = /^(thank|dhanyawad|shukriya)/i;
  
  if (greetings.test(text)) {
    return {
      action: 'general',
      response: language === 'hinglish' 
        ? "Namaste! Main aapka financial assistant hoon. Aap mujhe apne accounts ke baare mein poochh sakte hain. Jaise ki 'Aaj kitni bikri hui?' ya 'Mujhe profit dikhao'"
        : "Hello! I'm your financial assistant. You can ask me about your accounts like 'How much did I sell today?' or 'Show me my profit'"
    };
  }
  
  if (thanks.test(text)) {
    return {
      action: 'general',
      response: language === 'hinglish'
        ? "Aapka swagat hai! Koi aur sawal hai?"
        : "You're welcome! Is there anything else I can help you with?"
    };
  }
  
  return {
    action: 'general',
    response: language === 'hinglish'
      ? "Mujhe samajh nahi aaya. Kya aap dobara bol sakte hain? Try karein 'Aaj ki sales dikhao' ya 'Profit report chahiye'"
      : "I didn't understand that. Could you please rephrase? Try asking 'Show me today's sales' or 'Generate profit report'"
  };
}

function getPeriod(text) {
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);
  
  if (/today|aaj|aj|hindi/i.test(text)) return today;
  if (/this\s+month|is mahine|is mahine\s+ki/i.test(text)) return thisMonth;
  if (/this\s+year|is saal|is saal\s+ki/i.test(text)) return today.substring(0, 4);
  
  return today;
}

function formatPeriod(period) {
  if (period.length === 10) {
    return 'today';
  } else if (period.length === 7) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    const month = parseInt(period.split('-')[1]);
    return `this ${months[month - 1]}`;
  }
  return 'this period';
}
