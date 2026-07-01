/**
 * Bank Integration - Connect to HDFC, ICICI, SBI, Axis, Yes Bank
 *
 * Features:
 * - Account balance fetch
 * - Statement import
 * - Payment initiation
 * - Auto-reconciliation
 */

// Bank configurations
const BANKS = {
  hdfc: {
    name: 'HDFC Bank',
    code: 'HDFC',
    apiEndpoint: process.env.HDFC_API_URL || 'https://api.hdfcbank.com',
    accountType: 'corporate'
  },
  icici: {
    name: 'ICICI Bank',
    code: 'ICICI',
    apiEndpoint: process.env.ICICI_API_URL || 'https://api.icicibank.com',
    accountType: 'corporate'
  },
  sbi: {
    name: 'State Bank of India',
    code: 'SBI',
    apiEndpoint: process.env.SBI_API_URL || 'https://api.onlinesbi.com',
    accountType: 'corporate'
  },
  axis: {
    name: 'Axis Bank',
    code: 'AXIS',
    apiEndpoint: process.env.AXIS_API_URL || 'https://api.axisbank.com',
    accountType: 'corporate'
  },
  yes: {
    name: 'Yes Bank',
    code: 'YES',
    apiEndpoint: process.env.YES_API_URL || 'https://api.yesbank.com',
    accountType: 'corporate'
  }
};

/**
 * Fetch account balance from a bank
 */
async function getBalance(bankCode, accountNumber) {
  const bank = BANKS[bankCode.toLowerCase()];
  if (!bank) {
    return { error: `Unknown bank: ${bankCode}` };
  }

  // In production, would call bank's API
  // For now, return mock data
  return {
    bank: bank.name,
    accountNumber,
    balance: Math.floor(Math.random() * 10000000),
    availableBalance: Math.floor(Math.random() * 9000000),
    currency: 'INR',
    lastUpdated: new Date().toISOString(),
    type: bank.accountType
  };
}

/**
 * Fetch bank statement
 */
async function getStatement(bankCode, accountNumber, fromDate, toDate) {
  const bank = BANKS[bankCode.toLowerCase()];
  if (!bank) {
    return { error: `Unknown bank: ${bankCode}` };
  }

  // Generate mock transactions
  const transactions = generateMockTransactions(accountNumber, fromDate, toDate);

  return {
    bank: bank.name,
    accountNumber,
    fromDate,
    toDate,
    openingBalance: Math.floor(Math.random() * 5000000),
    closingBalance: Math.floor(Math.random() * 5000000),
    totalCredits: transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0),
    totalDebits: transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0),
    transactionCount: transactions.length,
    transactions
  };
}

/**
 * Generate mock transactions for testing
 */
function generateMockTransactions(accountNumber, fromDate, toDate) {
  const transactions = [];
  const start = new Date(fromDate);
  const end = new Date(toDate);
  const days = Math.ceil((end - start) / (24 * 60 * 60 * 1000));

  const merchants = [
    'Tata Motors Finance',
    'Infosys Technologies',
    'Reliance Retail',
    'Amazon Seller',
    'Flipkart Internet',
    'Swiggy Limited',
    'Zomato Foods',
    'Myntra Designs',
    'Paytm Restaurant',
    'Uber India'
  ];

  const purposes = [
    'NEFT Received',
    'RTGS Received',
    'IMPS Received',
    'Vendor Payment',
    'Salary Credit',
    'AWS Services',
    'Google Cloud',
    'Microsoft Azure',
    'Rent Payment',
    'Utility Bill'
  ];

  for (let i = 0; i < Math.min(days * 3, 100); i++) {
    const date = new Date(start.getTime() + Math.random() * (end - start));
    const isCredit = Math.random() > 0.4;
    const amount = Math.floor(1000 + Math.random() * 500000);

    transactions.push({
      id: `TXN${Date.now().toString().slice(-10)}${i}`,
      date: date.toISOString(),
      valueDate: date.toISOString(),
      type: isCredit ? 'credit' : 'debit',
      amount,
      balance: Math.floor(Math.random() * 10000000),
      narration: purposes[Math.floor(Math.random() * purposes.length)],
      reference: `REF${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      category: categorizeTransaction(purposes[Math.floor(Math.random() * purposes.length)])
    });
  }

  return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Categorize transaction based on narration
 */
function categorizeTransaction(narration) {
  const lower = narration.toLowerCase();

  if (lower.includes('salary')) return 'payroll';
  if (lower.includes('rent')) return 'rent';
  if (lower.includes('aws') || lower.includes('google') || lower.includes('azure') || lower.includes('microsoft')) return 'software';
  if (lower.includes('neft') || lower.includes('rtgs') || lower.includes('imps')) return 'bank_transfer';
  if (lower.includes('vendor')) return 'vendor_payment';
  if (lower.includes('refund')) return 'refund';
  if (lower.includes('interest')) return 'interest';

  return 'other';
}

/**
 * Import bank statement (CSV format)
 */
async function importStatement(bankCode, csvData) {
  const bank = BANKS[bankCode.toLowerCase()];
  if (!bank) {
    return { error: `Unknown bank: ${bankCode}` };
  }

  // Parse CSV based on bank format
  const transactions = parseCSV(bankCode, csvData);

  return {
    bank: bank.name,
    imported: transactions.length,
    transactions,
    summary: {
      totalCredits: transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0),
      totalDebits: transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0)
    }
  };
}

/**
 * Parse CSV based on bank format
 */
function parseCSV(bankCode, csvData) {
  const lines = csvData.split('\n').filter(l => l.trim());
  const transactions = [];

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim().replace(/"/g, ''));

    // Format varies by bank - simplified generic parser
    if (parts.length >= 4) {
      transactions.push({
        id: `IMP${i}`,
        date: parts[0],
        narration: parts[1] || parts[2],
        type: parts[3].toLowerCase().includes('dr') ? 'debit' : 'credit',
        amount: parseFloat(parts[parts.length - 1].replace(/[^0-9.]/g, '')) || 0,
        balance: 0
      });
    }
  }

  return transactions;
}

/**
 * Reconcile transactions with accounting records
 */
async function reconcile(transactions, accountingRecords) {
  const reconciled = [];
  const unreconciled = [];

  for (const txn of transactions) {
    const match = accountingRecords.find(r =>
      r.reference === txn.reference ||
      (Math.abs(r.amount - txn.amount) < 1 &&
       Math.abs(new Date(r.date) - new Date(txn.date)) < 3)
    );

    if (match) {
      reconciled.push({
        transaction: txn,
        accountingRecord: match,
        status: 'matched'
      });
    } else {
      unreconciled.push({
        transaction: txn,
        suggestedMatch: null,
        status: 'unmatched'
      });
    }
  }

  return {
    reconciled: reconciled.length,
    unmatched: unreconciled.length,
    matchRate: transactions.length > 0
      ? (reconciled.length / transactions.length * 100).toFixed(1) + '%'
      : '0%',
    reconciled,
    unmatched: unreconciled.slice(0, 20) // Limit unmatched list
  };
}

/**
 * Health check for all banks
 */
async function healthCheck() {
  const results = {};

  for (const [code, bank] of Object.entries(BANKS)) {
    // In production, would ping bank's API
    results[code] = {
      name: bank.name,
      healthy: true, // Mock always healthy
      lastChecked: new Date().toISOString()
    };
  }

  return results;
}

module.exports = {
  BANKS,
  getBalance,
  getStatement,
  importStatement,
  reconcile,
  healthCheck,
  categorizeTransaction
};
