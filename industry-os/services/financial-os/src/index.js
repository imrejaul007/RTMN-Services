/**
 * Financial OS - Complete Banking & Financial Services Platform
 *
 * Port: 5220
 * Industry: Financial Services / Banking
 *
 * Features:
 * - Customer/Account Management
 * - Account Types (savings, current, fixed deposit)
 * - Transactions (deposits, withdrawals, transfers)
 * - Loan Management
 * - Card Management (credit, debit)
 * - Insurance Products
 * - Investment Products
 * - Compliance & KYC
 * - Analytics
 * - RTMN Layer Integration
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const crypto = require('crypto');
const winston = require('winston');

const app = express();
const PORT = process.env.PORT || 5220;

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// ============================================
// IN-MEMORY DATA STORES
// ============================================

// Auth stores (per service)
const authUsers = new Map();
const authSessions = new Map();

// Financial Data Stores
const customers = new Map();
const accounts = new Map();
const transactions = new Map();
const loans = new Map();
const cards = new Map();
const insurancePolicies = new Map();
const investments = new Map();
const kycRecords = new Map();
const beneficiaries = new Map();

// ============================================
// SAMPLE DATA
// ============================================

function initSampleData() {
  // Sample Customers
  const sampleCustomers = [
    {
      customerId: 'CUST001',
      name: 'Rajesh Kumar',
      email: 'rajesh.kumar@email.com',
      phone: '+91-9876543210',
      dateOfBirth: '1985-03-15',
      address: { line1: '123 MG Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
      occupation: 'Software Engineer',
      monthlyIncome: 150000,
      kycStatus: 'VERIFIED',
      kycVerifiedAt: '2026-01-15T10:00:00Z',
      riskProfile: 'LOW',
      status: 'ACTIVE',
      createdAt: '2025-06-01T09:00:00Z'
    },
    {
      customerId: 'CUST002',
      name: 'Priya Sharma',
      email: 'priya.sharma@email.com',
      phone: '+91-9876543211',
      dateOfBirth: '1990-07-22',
      address: { line1: '456 Park Street', city: 'Delhi', state: 'Delhi', pincode: '110001' },
      occupation: 'Doctor',
      monthlyIncome: 250000,
      kycStatus: 'VERIFIED',
      kycVerifiedAt: '2026-02-10T14:30:00Z',
      riskProfile: 'LOW',
      status: 'ACTIVE',
      createdAt: '2025-08-15T11:00:00Z'
    },
    {
      customerId: 'CUST003',
      name: 'Amit Patel',
      email: 'amit.patel@email.com',
      phone: '+91-9876543212',
      dateOfBirth: '1982-11-08',
      address: { line1: '789 Brigade Road', city: 'Bangalore', state: 'Karnataka', pincode: '560001' },
      occupation: 'Business Owner',
      monthlyIncome: 500000,
      kycStatus: 'VERIFIED',
      kycVerifiedAt: '2026-01-20T09:15:00Z',
      riskProfile: 'MEDIUM',
      status: 'ACTIVE',
      createdAt: '2025-03-10T08:00:00Z'
    },
    {
      customerId: 'CUST004',
      name: 'Sneha Gupta',
      email: 'sneha.gupta@email.com',
      phone: '+91-9876543213',
      dateOfBirth: '1995-04-30',
      address: { line1: '321 Model Town', city: 'Chandigarh', state: 'Punjab', pincode: '160001' },
      occupation: 'Teacher',
      monthlyIncome: 65000,
      kycStatus: 'PENDING',
      kycVerifiedAt: null,
      riskProfile: 'LOW',
      status: 'ACTIVE',
      createdAt: '2026-05-01T10:00:00Z'
    },
    {
      customerId: 'CUST005',
      name: 'Vikram Singh',
      email: 'vikram.singh@email.com',
      phone: '+91-9876543214',
      dateOfBirth: '1978-09-12',
      address: { line1: '555 Lake View', city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
      occupation: 'Retired Government Officer',
      monthlyIncome: 80000,
      kycStatus: 'VERIFIED',
      kycVerifiedAt: '2025-12-01T16:00:00Z',
      riskProfile: 'LOW',
      status: 'ACTIVE',
      createdAt: '2024-06-15T14:00:00Z'
    }
  ];

  sampleCustomers.forEach(c => customers.set(c.customerId, c));

  // Sample Accounts
  const sampleAccounts = [
    {
      accountId: 'ACC001',
      customerId: 'CUST001',
      accountType: 'SAVINGS',
      accountNumber: '1234567890',
      balance: 250000,
      currency: 'INR',
      branch: 'Mumbai Main Branch',
      ifscCode: 'SBIN0001234',
      status: 'ACTIVE',
      interestRate: 3.5,
      minBalance: 5000,
      overdraftLimit: 0,
      createdAt: '2025-06-01T09:30:00Z'
    },
    {
      accountId: 'ACC002',
      customerId: 'CUST002',
      accountType: 'CURRENT',
      accountNumber: '1234567891',
      balance: 850000,
      currency: 'INR',
      branch: 'Delhi Central',
      ifscCode: 'SBIN0005678',
      status: 'ACTIVE',
      interestRate: 0,
      minBalance: 25000,
      overdraftLimit: 100000,
      createdAt: '2025-08-15T11:30:00Z'
    },
    {
      accountId: 'ACC003',
      customerId: 'CUST003',
      accountType: 'SAVINGS',
      accountNumber: '1234567892',
      balance: 1250000,
      currency: 'INR',
      branch: 'Bangalore Tech Park',
      ifscCode: 'SBIN0009012',
      status: 'ACTIVE',
      interestRate: 4.0,
      minBalance: 10000,
      overdraftLimit: 50000,
      createdAt: '2025-03-10T08:30:00Z'
    },
    {
      accountId: 'ACC004',
      customerId: 'CUST005',
      accountType: 'FIXED_DEPOSIT',
      accountNumber: '1234567893',
      balance: 500000,
      currency: 'INR',
      branch: 'Jaipur Main',
      ifscCode: 'SBIN0003456',
      status: 'ACTIVE',
      interestRate: 6.5,
      minBalance: 0,
      overdraftLimit: 0,
      tenureMonths: 12,
      maturityDate: '2026-06-15T14:00:00Z',
      createdAt: '2025-06-15T14:00:00Z'
    }
  ];

  sampleAccounts.forEach(a => accounts.set(a.accountId, a));

  // Sample Loans
  const sampleLoans = [
    {
      loanId: 'LOAN001',
      customerId: 'CUST001',
      accountId: 'ACC001',
      loanType: 'HOME_LOAN',
      principal: 5000000,
      interestRate: 8.5,
      tenureMonths: 240,
      emi: 43491,
      outstanding: 4850000,
      status: 'ACTIVE',
      startDate: '2025-06-15',
      nextEmiDate: '2026-06-15',
      loanAccountNumber: 'HL1234567890',
      processingStatus: 'DISBURSED',
      createdAt: '2025-06-15T10:00:00Z'
    },
    {
      loanId: 'LOAN002',
      customerId: 'CUST002',
      accountId: 'ACC002',
      loanType: 'PERSONAL_LOAN',
      principal: 500000,
      interestRate: 12,
      tenureMonths: 36,
      emi: 16607,
      outstanding: 450000,
      status: 'ACTIVE',
      startDate: '2026-01-01',
      nextEmiDate: '2026-07-01',
      loanAccountNumber: 'PL1234567891',
      processingStatus: 'DISBURSED',
      createdAt: '2026-01-01T09:00:00Z'
    },
    {
      loanId: 'LOAN003',
      customerId: 'CUST003',
      accountId: 'ACC003',
      loanType: 'BUSINESS_LOAN',
      principal: 2000000,
      interestRate: 14,
      tenureMonths: 48,
      emi: 52723,
      outstanding: 1900000,
      status: 'ACTIVE',
      startDate: '2025-10-01',
      nextEmiDate: '2026-06-01',
      loanAccountNumber: 'BL1234567892',
      processingStatus: 'DISBURSED',
      createdAt: '2025-10-01T11:00:00Z'
    }
  ];

  sampleLoans.forEach(l => loans.set(l.loanId, l));

  // Sample Transactions
  const sampleTransactions = [
    {
      transactionId: 'TXN001',
      accountId: 'ACC001',
      type: 'CREDIT',
      amount: 50000,
      balance: 250000,
      description: 'Salary Credit',
      category: 'INCOME',
      reference: 'SALARY_JUNE2026',
      status: 'COMPLETED',
      timestamp: '2026-06-01T09:00:00Z'
    },
    {
      transactionId: 'TXN002',
      accountId: 'ACC001',
      type: 'DEBIT',
      amount: 15000,
      balance: 235000,
      description: 'Shopping - Amazon',
      category: 'SHOPPING',
      reference: 'AMZ_TXN_12345',
      status: 'COMPLETED',
      timestamp: '2026-06-05T14:30:00Z'
    },
    {
      transactionId: 'TXN003',
      accountId: 'ACC002',
      type: 'DEBIT',
      amount: 85000,
      balance: 765000,
      description: 'Equipment Purchase',
      category: 'BUSINESS',
      reference: 'EQUIP_INV_789',
      status: 'COMPLETED',
      timestamp: '2026-06-10T11:15:00Z'
    },
    {
      transactionId: 'TXN004',
      accountId: 'ACC003',
      type: 'CREDIT',
      amount: 200000,
      balance: 1450000,
      description: 'Business Receipt',
      category: 'INCOME',
      reference: 'RECEIPT_INV_456',
      status: 'COMPLETED',
      timestamp: '2026-06-12T16:45:00Z'
    },
    {
      transactionId: 'TXN005',
      accountId: 'ACC001',
      type: 'TRANSFER',
      amount: 25000,
      balance: 210000,
      description: 'Fund Transfer to ACC003',
      category: 'TRANSFER',
      reference: 'RTGS_789012345',
      toAccountId: 'ACC003',
      status: 'COMPLETED',
      timestamp: '2026-06-14T10:00:00Z'
    }
  ];

  sampleTransactions.forEach(t => transactions.set(t.transactionId, t));

  // Sample Cards
  const sampleCards = [
    {
      cardId: 'CARD001',
      customerId: 'CUST001',
      accountId: 'ACC001',
      cardType: 'DEBIT',
      cardNumber: 'XXXX-XXXX-XXXX-1234',
      expiryMonth: 12,
      expiryYear: 2028,
      cvv: 'XXX',
      status: 'ACTIVE',
      dailyLimit: 50000,
      usedToday: 15000,
      cardNetwork: 'VISA'
    },
    {
      cardId: 'CARD002',
      customerId: 'CUST002',
      accountId: 'ACC002',
      cardType: 'CREDIT',
      cardNumber: 'XXXX-XXXX-XXXX-5678',
      expiryMonth: 6,
      expiryYear: 2029,
      cvv: 'XXX',
      status: 'ACTIVE',
      creditLimit: 500000,
      availableCredit: 425000,
      cardNetwork: 'MASTERCARD'
    },
    {
      cardId: 'CARD003',
      customerId: 'CUST003',
      accountId: 'ACC003',
      cardType: 'DEBIT',
      cardNumber: 'XXXX-XXXX-XXXX-9012',
      expiryMonth: 9,
      expiryYear: 2027,
      cvv: 'XXX',
      status: 'ACTIVE',
      dailyLimit: 100000,
      usedToday: 0,
      cardNetwork: 'RUPAY'
    }
  ];

  sampleCards.forEach(c => cards.set(c.cardId, c));

  // Sample Insurance Policies
  const sampleInsurance = [
    {
      policyId: 'INS001',
      customerId: 'CUST001',
      policyType: 'TERM_LIFE',
      provider: 'HDFC Life',
      sumAssured: 10000000,
      premium: 12000,
      premiumFrequency: 'YEARLY',
      startDate: '2025-01-01',
      endDate: '2045-01-01',
      status: 'ACTIVE',
      beneficiaryName: 'Meena Kumar',
      relationship: 'SPOUSE'
    },
    {
      policyId: 'INS002',
      customerId: 'CUST002',
      policyType: 'HEALTH_INSURANCE',
      provider: 'ICICI Lombard',
      sumAssured: 500000,
      premium: 25000,
      premiumFrequency: 'YEARLY',
      startDate: '2026-01-01',
      endDate: '2027-01-01',
      status: 'ACTIVE',
      beneficiaryName: 'Self',
      relationship: 'SELF'
    }
  ];

  sampleInsurance.forEach(i => insurancePolicies.set(i.policyId, i));

  // Sample Investments
  const sampleInvestments = [
    {
      investmentId: 'INV001',
      customerId: 'CUST001',
      productType: 'MUTUAL_FUND',
      fundName: 'HDFC Top 100 Fund',
      amount: 100000,
      currentValue: 125000,
      units: 250,
      nav: 500,
      purchaseDate: '2025-06-01',
      status: 'ACTIVE',
      returns: 25
    },
    {
      investmentId: 'INV002',
      customerId: 'CUST003',
      productType: 'FIXED_DEPOSIT',
      fundName: 'SB FD - 1 Year',
      amount: 1000000,
      currentValue: 1065000,
      purchaseDate: '2025-06-15',
      maturityDate: '2026-06-15',
      status: 'ACTIVE',
      returns: 6.5
    }
  ];

  sampleInvestments.forEach(i => investments.set(i.investmentId, i));

  // Sample Beneficiaries
  const sampleBeneficiaries = [
    {
      beneficiaryId: 'BEN001',
      customerId: 'CUST001',
      name: 'Meena Kumar',
      accountNumber: '9876543210',
      bankName: 'ICICI Bank',
      ifscCode: 'ICIC0001234',
      relationship: 'SPOUSE',
      status: 'VERIFIED'
    },
    {
      beneficiaryId: 'BEN002',
      customerId: 'CUST001',
      name: 'Raj Kumar',
      accountNumber: '9876543211',
      bankName: 'HDFC Bank',
      ifscCode: 'HDFC0001234',
      relationship: 'BROTHER',
      status: 'VERIFIED'
    }
  ];

  sampleBeneficiaries.forEach(b => beneficiaries.set(b.beneficiaryId, b));

  logger.info('Sample financial data initialized');
}

// ============================================
// AUTH MIDDLEWARE
// ============================================

function requireAuth(req, res, next) {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId || !authSessions.has(sessionId)) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Valid session required' });
  }
  req.session = authSessions.get(sessionId);
  next();
}

function optionalAuth(req, res, next) {
  const sessionId = req.headers['x-session-id'];
  if (sessionId && authSessions.has(sessionId)) {
    req.session = authSessions.get(sessionId);
  }
  next();
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateId(prefix) {
  return `${prefix}${Date.now().toString(36)}${crypto.randomBytes(2).toString('hex')}`;
}

function maskAccountNumber(accountNumber) {
  return accountNumber.slice(0, 4) + 'XXXX' + accountNumber.slice(-4);
}

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Financial OS',
    port: PORT,
    timestamp: new Date().toISOString(),
    stats: {
      customers: customers.size,
      accounts: accounts.size,
      transactions: transactions.size,
      loans: loans.size,
      cards: cards.size,
      insurancePolicies: insurancePolicies.size,
      investments: investments.size
    }
  });
});

// ============================================
// AUTH ENDPOINTS
// ============================================

// Register
app.post('/api/auth/register', (req, res) => {
  const { email, password, name, phone } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  // Check if user exists
  const existingUser = Array.from(authUsers.values()).find(u => u.email === email);
  if (existingUser) {
    return res.status(409).json({ error: 'User already exists' });
  }

  const userId = generateId('USR');
  const user = {
    userId,
    email,
    passwordHash: crypto.createHash('sha256').update(password).digest('hex'),
    name: name || email.split('@')[0],
    phone,
    createdAt: new Date().toISOString()
  };

  authUsers.set(userId, user);

  // Auto-login
  const sessionId = generateId('SES');
  authSessions.set(sessionId, { userId, email, createdAt: new Date().toISOString() });

  res.status(201).json({
    message: 'Registration successful',
    userId,
    sessionId,
    email
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  const user = Array.from(authUsers.values()).find(
    u => u.email === email && u.passwordHash === passwordHash
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const sessionId = generateId('SES');
  authSessions.set(sessionId, {
    userId: user.userId,
    email: user.email,
    createdAt: new Date().toISOString()
  });

  res.json({
    message: 'Login successful',
    sessionId,
    userId: user.userId,
    email: user.email
  });
});

// Logout
app.post('/api/auth/logout', requireAuth, (req, res) => {
  authSessions.delete(req.headers['x-session-id']);
  res.json({ message: 'Logged out successfully' });
});

// ============================================
// RTMN LAYER INTEGRATION
// ============================================

app.get('/api/rtmn/layers', (req, res) => {
  res.json({
    service: 'Financial OS',
    port: PORT,
    layers: [
      { id: 1, name: 'Intelligence', endpoint: '/api/ai' },
      { id: 2, name: 'Customer Growth', endpoint: '/api/crm' },
      { id: 3, name: 'Commerce', endpoint: '/api/commerce' },
      { id: 4, name: 'Financial', endpoint: '/api/financial', active: true },
      { id: 5, name: 'Workforce', endpoint: '/api/hr' },
      { id: 6, name: 'Legal & Trust', endpoint: '/api/compliance' },
      { id: 7, name: 'Property', endpoint: '/api/property' },
      { id: 8, name: 'Health', endpoint: '/api/health' },
      { id: 9, name: 'Mobility', endpoint: '/api/mobility' },
      { id: 10, name: 'Identity', endpoint: '/api/identity' },
      { id: 11, name: 'Memory', endpoint: '/api/memory' },
      { id: 12, name: 'Twins', endpoint: '/api/twins' },
      { id: 13, name: 'Automation', endpoint: '/api/automation' },
      { id: 14, name: 'Autonomous', endpoint: '/api/autonomous' },
      { id: 15, name: 'Network', endpoint: '/api/network' }
    ]
  });
});

// ============================================
// CUSTOMER MANAGEMENT
// ============================================

app.get('/api/customers', optionalAuth, (req, res) => {
  const allCustomers = Array.from(customers.values()).map(c => ({
    ...c,
    accountCount: Array.from(accounts.values()).filter(a => a.customerId === c.customerId).length
  }));
  res.json({ customers: allCustomers, total: allCustomers.length });
});

app.get('/api/customers/:customerId', optionalAuth, (req, res) => {
  const customer = customers.get(req.params.customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  // Include related data
  const customerAccounts = Array.from(accounts.values()).filter(a => a.customerId === customer.customerId);
  const customerLoans = Array.from(loans.values()).filter(l => l.customerId === customer.customerId);
  const customerCards = Array.from(cards.values()).filter(c => c.customerId === customer.customerId);
  const customerInvestments = Array.from(investments.values()).filter(i => i.customerId === customer.customerId);

  res.json({
    ...customer,
    accounts: customerAccounts,
    loans: customerLoans,
    cards: customerCards,
    investments: customerInvestments,
    totalBalance: customerAccounts.reduce((sum, a) => sum + a.balance, 0),
    totalLoanOutstanding: customerLoans.reduce((sum, l) => sum + l.outstanding, 0)
  });
});

app.post('/api/customers', optionalAuth, (req, res) => {
  const { name, email, phone, address, dateOfBirth, occupation, monthlyIncome } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email required' });
  }

  const customerId = generateId('CUST');
  const customer = {
    customerId,
    name,
    email,
    phone: phone || null,
    dateOfBirth: dateOfBirth || null,
    address: address || {},
    occupation: occupation || null,
    monthlyIncome: monthlyIncome || 0,
    kycStatus: 'PENDING',
    kycVerifiedAt: null,
    riskProfile: 'LOW',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  };

  customers.set(customerId, customer);
  res.status(201).json(customer);
});

app.put('/api/customers/:customerId', requireAuth, (req, res) => {
  const customer = customers.get(req.params.customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const updates = req.body;
  const allowedUpdates = ['name', 'phone', 'address', 'occupation', 'monthlyIncome'];
  allowedUpdates.forEach(field => {
    if (updates[field] !== undefined) {
      customer[field] = updates[field];
    }
  });

  res.json(customer);
});

// ============================================
// ACCOUNT MANAGEMENT
// ============================================

app.get('/api/accounts', optionalAuth, (req, res) => {
  const { customerId, type } = req.query;
  let allAccounts = Array.from(accounts.values());

  if (customerId) {
    allAccounts = allAccounts.filter(a => a.customerId === customerId);
  }
  if (type) {
    allAccounts = allAccounts.filter(a => a.accountType === type);
  }

  // Mask account numbers
  const maskedAccounts = allAccounts.map(a => ({
    ...a,
    accountNumber: maskAccountNumber(a.accountNumber)
  }));

  res.json({ accounts: maskedAccounts, total: maskedAccounts.length });
});

app.get('/api/accounts/:accountId', optionalAuth, (req, res) => {
  const account = accounts.get(req.params.accountId);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  // Get transactions for this account
  const accountTransactions = Array.from(transactions.values())
    .filter(t => t.accountId === account.accountId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);

  res.json({
    ...account,
    accountNumber: maskAccountNumber(account.accountNumber),
    recentTransactions: accountTransactions,
    transactionCount: Array.from(transactions.values()).filter(t => t.accountId === account.accountId).length
  });
});

app.post('/api/accounts', requireAuth, (req, res) => {
  const { customerId, accountType, initialDeposit, branch, ifscCode } = req.body;

  if (!customerId || !accountType) {
    return res.status(400).json({ error: 'Customer ID and account type required' });
  }

  const customer = customers.get(customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const accountId = generateId('ACC');
  const accountNumber = Date.now().toString().slice(-10);

  const interestRates = {
    SAVINGS: 3.5,
    CURRENT: 0,
    FIXED_DEPOSIT: 6.5,
    RECURRING_DEPOSIT: 5.5
  };

  const account = {
    accountId,
    customerId,
    accountType,
    accountNumber,
    balance: initialDeposit || 0,
    currency: 'INR',
    branch: branch || 'Main Branch',
    ifscCode: ifscCode || 'SBIN0000001',
    status: 'ACTIVE',
    interestRate: interestRates[accountType] || 0,
    minBalance: accountType === 'SAVINGS' ? 5000 : accountType === 'CURRENT' ? 25000 : 0,
    overdraftLimit: accountType === 'CURRENT' ? 100000 : 0,
    createdAt: new Date().toISOString()
  };

  accounts.set(accountId, account);

  // Create initial deposit transaction if provided
  if (initialDeposit && initialDeposit > 0) {
    const txnId = generateId('TXN');
    transactions.set(txnId, {
      transactionId: txnId,
      accountId,
      type: 'CREDIT',
      amount: initialDeposit,
      balance: initialDeposit,
      description: 'Initial Deposit',
      category: 'DEPOSIT',
      reference: `INIT_${accountId}`,
      status: 'COMPLETED',
      timestamp: new Date().toISOString()
    });
  }

  res.status(201).json({
    ...account,
    accountNumber: maskAccountNumber(account.accountNumber)
  });
});

app.put('/api/accounts/:accountId', requireAuth, (req, res) => {
  const account = accounts.get(req.params.accountId);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  const updates = req.body;
  const allowedUpdates = ['status', 'overdraftLimit'];
  allowedUpdates.forEach(field => {
    if (updates[field] !== undefined) {
      account[field] = updates[field];
    }
  });

  res.json(account);
});

// ============================================
// TRANSACTIONS
// ============================================

app.get('/api/transactions', optionalAuth, (req, res) => {
  const { accountId, type, category, limit = 50 } = req.query;
  let allTransactions = Array.from(transactions.values());

  if (accountId) {
    allTransactions = allTransactions.filter(t => t.accountId === accountId);
  }
  if (type) {
    allTransactions = allTransactions.filter(t => t.type === type);
  }
  if (category) {
    allTransactions = allTransactions.filter(t => t.category === category);
  }

  // Sort by timestamp descending
  allTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  allTransactions = allTransactions.slice(0, parseInt(limit));

  res.json({ transactions: allTransactions, total: Array.from(transactions.values()).length });
});

app.get('/api/transactions/:transactionId', optionalAuth, (req, res) => {
  const transaction = transactions.get(req.params.transactionId);
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  res.json(transaction);
});

// Deposit
app.post('/api/transactions/deposit', requireAuth, (req, res) => {
  const { accountId, amount, description } = req.body;

  if (!accountId || !amount) {
    return res.status(400).json({ error: 'Account ID and amount required' });
  }

  const account = accounts.get(accountId);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  const transactionId = generateId('TXN');
  const newBalance = account.balance + parseFloat(amount);

  const transaction = {
    transactionId,
    accountId,
    type: 'CREDIT',
    amount: parseFloat(amount),
    balance: newBalance,
    description: description || 'Deposit',
    category: 'DEPOSIT',
    reference: `DEP_${transactionId}`,
    status: 'COMPLETED',
    timestamp: new Date().toISOString()
  };

  transactions.set(transactionId, transaction);
  account.balance = newBalance;

  res.status(201).json(transaction);
});

// Withdraw
app.post('/api/transactions/withdraw', requireAuth, (req, res) => {
  const { accountId, amount, description } = req.body;

  if (!accountId || !amount) {
    return res.status(400).json({ error: 'Account ID and amount required' });
  }

  const account = accounts.get(accountId);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  const withdrawalAmount = parseFloat(amount);
  const availableBalance = account.balance + account.overdraftLimit;

  if (withdrawalAmount > availableBalance) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  const transactionId = generateId('TXN');
  const newBalance = account.balance - withdrawalAmount;

  const transaction = {
    transactionId,
    accountId,
    type: 'DEBIT',
    amount: withdrawalAmount,
    balance: newBalance,
    description: description || 'Withdrawal',
    category: 'WITHDRAWAL',
    reference: `WDL_${transactionId}`,
    status: 'COMPLETED',
    timestamp: new Date().toISOString()
  };

  transactions.set(transactionId, transaction);
  account.balance = newBalance;

  res.status(201).json(transaction);
});

// Transfer
app.post('/api/transactions/transfer', requireAuth, (req, res) => {
  const { fromAccountId, toAccountId, amount, description } = req.body;

  if (!fromAccountId || !toAccountId || !amount) {
    return res.status(400).json({ error: 'From account, to account, and amount required' });
  }

  const fromAccount = accounts.get(fromAccountId);
  const toAccount = accounts.get(toAccountId);

  if (!fromAccount || !toAccount) {
    return res.status(404).json({ error: 'Account not found' });
  }

  const transferAmount = parseFloat(amount);

  if (transferAmount > fromAccount.balance) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  const debitTxnId = generateId('TXN');
  const creditTxnId = generateId('TXN');
  const reference = `TRF_${debitTxnId}`;

  // Debit from source
  const debitTransaction = {
    transactionId: debitTxnId,
    accountId: fromAccountId,
    type: 'DEBIT',
    amount: transferAmount,
    balance: fromAccount.balance - transferAmount,
    description: description || `Transfer to ${maskAccountNumber(toAccount.accountNumber)}`,
    category: 'TRANSFER',
    reference,
    toAccountId,
    status: 'COMPLETED',
    timestamp: new Date().toISOString()
  };

  // Credit to destination
  const creditTransaction = {
    transactionId: creditTxnId,
    accountId: toAccountId,
    type: 'CREDIT',
    amount: transferAmount,
    balance: toAccount.balance + transferAmount,
    description: description || `Transfer from ${maskAccountNumber(fromAccount.accountNumber)}`,
    category: 'TRANSFER',
    reference,
    fromAccountId,
    status: 'COMPLETED',
    timestamp: new Date().toISOString()
  };

  transactions.set(debitTxnId, debitTransaction);
  transactions.set(creditTxnId, creditTransaction);
  fromAccount.balance -= transferAmount;
  toAccount.balance += transferAmount;

  res.status(201).json({
    message: 'Transfer successful',
    debitTransaction,
    creditTransaction
  });
});

// ============================================
// LOAN MANAGEMENT
// ============================================

app.get('/api/loans', optionalAuth, (req, res) => {
  const { customerId, status } = req.query;
  let allLoans = Array.from(loans.values());

  if (customerId) {
    allLoans = allLoans.filter(l => l.customerId === customerId);
  }
  if (status) {
    allLoans = allLoans.filter(l => l.status === status);
  }

  res.json({ loans: allLoans, total: allLoans.length });
});

app.get('/api/loans/:loanId', optionalAuth, (req, res) => {
  const loan = loans.get(req.params.loanId);
  if (!loan) {
    return res.status(404).json({ error: 'Loan not found' });
  }

  // Calculate payment history
  const loanTransactions = Array.from(transactions.values())
    .filter(t => t.reference && t.reference.includes('LOAN') && t.reference.includes(loan.loanId))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({
    ...loan,
    paymentHistory: loanTransactions,
    totalPaid: loanTransactions.reduce((sum, t) => sum + t.amount, 0),
    remainingTenure: Math.ceil(loan.outstanding / loan.emi)
  });
});

app.post('/api/loans', requireAuth, (req, res) => {
  const { customerId, accountId, loanType, principal, interestRate, tenureMonths } = req.body;

  if (!customerId || !loanType || !principal) {
    return res.status(400).json({ error: 'Customer ID, loan type, and principal required' });
  }

  const customer = customers.get(customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const loanId = generateId('LOAN');
  const rate = interestRate || 12;
  const tenure = tenureMonths || 12;
  const monthlyRate = rate / 12 / 100;

  // EMI calculation
  const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, tenure) / (Math.pow(1 + monthlyRate, tenure) - 1);

  const loan = {
    loanId,
    customerId,
    accountId: accountId || null,
    loanType,
    principal: parseFloat(principal),
    interestRate: rate,
    tenureMonths: tenure,
    emi: Math.round(emi),
    outstanding: parseFloat(principal),
    status: 'ACTIVE',
    startDate: new Date().toISOString().split('T')[0],
    nextEmiDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    loanAccountNumber: `LOAN${Date.now().toString().slice(-10)}`,
    processingStatus: 'DISBURSED',
    createdAt: new Date().toISOString()
  };

  loans.set(loanId, loan);

  res.status(201).json(loan);
});

app.post('/api/loans/:loanId/emi', requireAuth, (req, res) => {
  const loan = loans.get(req.params.loanId);
  if (!loan) {
    return res.status(404).json({ error: 'Loan not found' });
  }

  if (loan.outstanding <= 0) {
    return res.status(400).json({ error: 'Loan already fully repaid' });
  }

  const emiAmount = Math.min(loan.emi, loan.outstanding);
  const interestPortion = loan.outstanding * (loan.interestRate / 12 / 100);
  const principalPortion = emiAmount - interestPortion;

  const transactionId = generateId('TXN');
  const transaction = {
    transactionId,
    accountId: loan.accountId,
    type: 'DEBIT',
    amount: emiAmount,
    balance: 0,
    description: `EMI Payment - ${loan.loanType}`,
    category: 'LOAN_PAYMENT',
    reference: `LOAN_${loan.loanId}_${transactionId}`,
    status: 'COMPLETED',
    timestamp: new Date().toISOString()
  };

  transactions.set(transactionId, transaction);
  loan.outstanding = Math.max(0, loan.outstanding - principalPortion);

  if (loan.outstanding <= 0) {
    loan.status = 'CLOSED';
  }

  loan.nextEmiDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  res.json({
    message: 'EMI payment successful',
    loan,
    payment: {
      emiAmount,
      principalPortion: Math.round(principalPortion),
      interestPortion: Math.round(interestPortion),
      transactionId
    }
  });
});

// ============================================
// CARD MANAGEMENT
// ============================================

app.get('/api/cards', optionalAuth, (req, res) => {
  const { customerId, type } = req.query;
  let allCards = Array.from(cards.values());

  if (customerId) {
    allCards = allCards.filter(c => c.customerId === customerId);
  }
  if (type) {
    allCards = allCards.filter(c => c.cardType === type);
  }

  res.json({ cards: allCards, total: allCards.length });
});

app.get('/api/cards/:cardId', optionalAuth, (req, res) => {
  const card = cards.get(req.params.cardId);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }
  res.json(card);
});

app.post('/api/cards', requireAuth, (req, res) => {
  const { customerId, accountId, cardType, cardNetwork } = req.body;

  if (!customerId || !accountId) {
    return res.status(400).json({ error: 'Customer ID and account ID required' });
  }

  const customer = customers.get(customerId);
  const account = accounts.get(accountId);

  if (!customer || !account) {
    return res.status(404).json({ error: 'Customer or account not found' });
  }

  const cardId = generateId('CARD');
  const cardNumber = `${Date.now()}${Math.floor(Math.random() * 10000)}`.slice(-16);

  const card = {
    cardId,
    customerId,
    accountId,
    cardType: cardType || 'DEBIT',
    cardNumber: maskAccountNumber(cardNumber),
    lastFour: cardNumber.slice(-4),
    expiryMonth: new Date().getMonth() + 1,
    expiryYear: new Date().getFullYear() + 5,
    cvv: 'XXX',
    status: 'ACTIVE',
    dailyLimit: cardType === 'CREDIT' ? 0 : 50000,
    usedToday: 0,
    cardNetwork: cardNetwork || 'VISA',
    createdAt: new Date().toISOString()
  };

  if (cardType === 'CREDIT') {
    card.creditLimit = customer.monthlyIncome * 3;
    card.availableCredit = card.creditLimit;
  }

  cards.set(cardId, card);
  res.status(201).json(card);
});

app.put('/api/cards/:cardId', requireAuth, (req, res) => {
  const card = cards.get(req.params.cardId);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }

  const { status, dailyLimit } = req.body;
  if (status) card.status = status;
  if (dailyLimit) card.dailyLimit = dailyLimit;

  res.json(card);
});

// ============================================
// INSURANCE PRODUCTS
// ============================================

app.get('/api/insurance', optionalAuth, (req, res) => {
  const { customerId, status } = req.query;
  let allPolicies = Array.from(insurancePolicies.values());

  if (customerId) {
    allPolicies = allPolicies.filter(p => p.customerId === customerId);
  }
  if (status) {
    allPolicies = allPolicies.filter(p => p.status === status);
  }

  res.json({ policies: allPolicies, total: allPolicies.length });
});

app.get('/api/insurance/:policyId', optionalAuth, (req, res) => {
  const policy = insurancePolicies.get(req.params.policyId);
  if (!policy) {
    return res.status(404).json({ error: 'Policy not found' });
  }
  res.json(policy);
});

app.post('/api/insurance', requireAuth, (req, res) => {
  const { customerId, policyType, provider, sumAssured, premium, premiumFrequency, beneficiaryName, relationship } = req.body;

  if (!customerId || !policyType || !sumAssured) {
    return res.status(400).json({ error: 'Customer ID, policy type, and sum assured required' });
  }

  const policyId = generateId('INS');
  const policy = {
    policyId,
    customerId,
    policyType,
    provider: provider || 'Default Insurance',
    sumAssured: parseFloat(sumAssured),
    premium: parseFloat(premium) || 0,
    premiumFrequency: premiumFrequency || 'YEARLY',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'ACTIVE',
    beneficiaryName: beneficiaryName || null,
    relationship: relationship || null,
    createdAt: new Date().toISOString()
  };

  insurancePolicies.set(policyId, policy);
  res.status(201).json(policy);
});

// ============================================
// INVESTMENT PRODUCTS
// ============================================

app.get('/api/investments', optionalAuth, (req, res) => {
  const { customerId, productType } = req.query;
  let allInvestments = Array.from(investments.values());

  if (customerId) {
    allInvestments = allInvestments.filter(i => i.customerId === customerId);
  }
  if (productType) {
    allInvestments = allInvestments.filter(i => i.productType === productType);
  }

  res.json({ investments: allInvestments, total: allInvestments.length });
});

app.get('/api/investments/:investmentId', optionalAuth, (req, res) => {
  const investment = investments.get(req.params.investmentId);
  if (!investment) {
    return res.status(404).json({ error: 'Investment not found' });
  }
  res.json(investment);
});

app.post('/api/investments', requireAuth, (req, res) => {
  const { customerId, productType, fundName, amount, nav } = req.body;

  if (!customerId || !productType || !amount) {
    return res.status(400).json({ error: 'Customer ID, product type, and amount required' });
  }

  const investmentId = generateId('INV');
  const purchaseAmount = parseFloat(amount);
  const navValue = parseFloat(nav) || 1;
  const units = productType === 'MUTUAL_FUND' ? purchaseAmount / navValue : 1;

  const investment = {
    investmentId,
    customerId,
    productType,
    fundName: fundName || productType,
    amount: purchaseAmount,
    currentValue: purchaseAmount,
    units: Math.round(units * 100) / 100,
    nav: navValue,
    purchaseDate: new Date().toISOString().split('T')[0],
    maturityDate: productType === 'FIXED_DEPOSIT'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : null,
    status: 'ACTIVE',
    returns: 0
  };

  investments.set(investmentId, investment);
  res.status(201).json(investment);
});

// ============================================
// COMPLIANCE & KYC
// ============================================

app.get('/api/kyc', optionalAuth, (req, res) => {
  const { customerId, status } = req.query;
  let allKyc = Array.from(kycRecords.values());

  if (customerId) {
    allKyc = allKyc.filter(k => k.customerId === customerId);
  }
  if (status) {
    allKyc = allKyc.filter(k => k.status === status);
  }

  res.json({ kycRecords: allKyc, total: allKyc.length });
});

app.post('/api/kyc/verify', requireAuth, (req, res) => {
  const { customerId, documentType, documentNumber, verified } = req.body;

  if (!customerId) {
    return res.status(400).json({ error: 'Customer ID required' });
  }

  const customer = customers.get(customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const kycId = generateId('KYC');
  const kycRecord = {
    kycId,
    customerId,
    documentType: documentType || 'AADHAR',
    documentNumber,
    status: verified ? 'VERIFIED' : 'PENDING',
    verifiedAt: verified ? new Date().toISOString() : null,
    verifiedBy: verified ? req.session.userId : null,
    createdAt: new Date().toISOString()
  };

  kycRecords.set(kycId, kycRecord);

  if (verified) {
    customer.kycStatus = 'VERIFIED';
    customer.kycVerifiedAt = new Date().toISOString();
  }

  res.status(201).json({
    kycRecord,
    customerKycStatus: customer.kycStatus
  });
});

// ============================================
// BENEFICIARIES
// ============================================

app.get('/api/beneficiaries', requireAuth, (req, res) => {
  const { customerId } = req.query;
  let allBeneficiaries = Array.from(beneficiaries.values());

  if (customerId) {
    allBeneficiaries = allBeneficiaries.filter(b => b.customerId === customerId);
  }

  res.json({ beneficiaries: allBeneficiaries, total: allBeneficiaries.length });
});

app.post('/api/beneficiaries', requireAuth, (req, res) => {
  const { customerId, name, accountNumber, bankName, ifscCode, relationship } = req.body;

  if (!customerId || !name || !accountNumber) {
    return res.status(400).json({ error: 'Customer ID, name, and account number required' });
  }

  const beneficiaryId = generateId('BEN');
  const beneficiary = {
    beneficiaryId,
    customerId,
    name,
    accountNumber,
    bankName: bankName || 'Unknown',
    ifscCode: ifscCode || 'UNKNOWN',
    relationship: relationship || 'OTHER',
    status: 'VERIFIED',
    createdAt: new Date().toISOString()
  };

  beneficiaries.set(beneficiaryId, beneficiary);
  res.status(201).json(beneficiary);
});

// ============================================
// ANALYTICS & REPORTING
// ============================================

app.get('/api/analytics/summary', optionalAuth, (req, res) => {
  const allAccounts = Array.from(accounts.values());
  const allTransactions = Array.from(transactions.values());
  const allLoans = Array.from(loans.values());
  const allInvestments = Array.from(investments.values());

  // Calculate totals
  const totalDeposits = allAccounts.reduce((sum, a) => sum + a.balance, 0);
  const totalLoanOutstanding = allLoans.filter(l => l.status === 'ACTIVE').reduce((sum, l) => sum + l.outstanding, 0);
  const totalInvestments = allInvestments.reduce((sum, i) => sum + i.currentValue, 0);

  // Transaction summary
  const creditTxn = allTransactions.filter(t => t.type === 'CREDIT');
  const debitTxn = allTransactions.filter(t => t.type === 'DEBIT');
  const totalCredits = creditTxn.reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = debitTxn.reduce((sum, t) => sum + t.amount, 0);

  // Category breakdown
  const categoryBreakdown = {};
  allTransactions.forEach(t => {
    categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount;
  });

  res.json({
    summary: {
      totalCustomers: customers.size,
      totalAccounts: allAccounts.length,
      totalDeposits: Math.round(totalDeposits),
      totalLoanOutstanding: Math.round(totalLoanOutstanding),
      totalInvestments: Math.round(totalInvestments),
      totalAssets: Math.round(totalDeposits + totalInvestments),
      totalLiabilities: Math.round(totalLoanOutstanding)
    },
    transactions: {
      totalCredits: Math.round(totalCredits),
      totalDebits: Math.round(totalDebits),
      netFlow: Math.round(totalCredits - totalDebits),
      creditCount: creditTxn.length,
      debitCount: debitTxn.length,
      categoryBreakdown
    },
    loans: {
      activeLoans: allLoans.filter(l => l.status === 'ACTIVE').length,
      closedLoans: allLoans.filter(l => l.status === 'CLOSED').length,
      totalDisbursed: allLoans.reduce((sum, l) => sum + l.principal, 0)
    },
    accounts: {
      savings: allAccounts.filter(a => a.accountType === 'SAVINGS').length,
      current: allAccounts.filter(a => a.accountType === 'CURRENT').length,
      fixedDeposit: allAccounts.filter(a => a.accountType === 'FIXED_DEPOSIT').length
    }
  });
});

app.get('/api/analytics/customer/:customerId', optionalAuth, (req, res) => {
  const customer = customers.get(req.params.customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const customerAccounts = Array.from(accounts.values()).filter(a => a.customerId === customer.customerId);
  const customerTransactions = Array.from(transactions.values())
    .filter(t => customerAccounts.some(a => a.accountId === t.accountId));
  const customerLoans = Array.from(loans.values()).filter(l => l.customerId === customer.customerId);
  const customerInvestments = Array.from(investments.values()).filter(i => i.customerId === customer.customerId);

  const totalBalance = customerAccounts.reduce((sum, a) => sum + a.balance, 0);
  const totalLoanOutstanding = customerLoans.reduce((sum, l) => sum + l.outstanding, 0);

  // Monthly spending
  const monthlySpending = {};
  customerTransactions
    .filter(t => t.type === 'DEBIT')
    .forEach(t => {
      const month = t.timestamp.slice(0, 7);
      monthlySpending[month] = (monthlySpending[month] || 0) + t.amount;
    });

  // Income vs Expenses
  const credits = customerTransactions.filter(t => t.type === 'CREDIT').reduce((sum, t) => sum + t.amount, 0);
  const debits = customerTransactions.filter(t => t.type === 'DEBIT').reduce((sum, t) => sum + t.amount, 0);

  res.json({
    customerId: customer.customerId,
    name: customer.name,
    kycStatus: customer.kycStatus,
    netWorth: Math.round(totalBalance + customerInvestments.reduce((sum, i) => sum + i.currentValue, 0) - totalLoanOutstanding),
    accounts: {
      count: customerAccounts.length,
      totalBalance: Math.round(totalBalance)
    },
    loans: {
      count: customerLoans.length,
      totalOutstanding: Math.round(totalLoanOutstanding)
    },
    investments: {
      count: customerInvestments.length,
      totalValue: Math.round(customerInvestments.reduce((sum, i) => sum + i.currentValue, 0))
    },
    transactions: {
      totalCredits: Math.round(credits),
      totalDebits: Math.round(debits),
      netFlow: Math.round(credits - debits)
    },
    monthlySpending,
    savingsRate: credits > 0 ? Math.round((1 - debits / credits) * 100) : 0
  });
});

// ============================================
// DIGITAL TWINS INTEGRATION (RTMN Layer 12)
// ============================================

app.get('/api/twins/account/:accountId', optionalAuth, (req, res) => {
  const account = accounts.get(req.params.accountId);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  const accountTransactions = Array.from(transactions.values())
    .filter(t => t.accountId === account.accountId);

  res.json({
    twinType: 'AccountTwin',
    entityId: account.accountId,
    data: {
      ...account,
      accountNumber: maskAccountNumber(account.accountNumber)
    },
    insights: {
      avgMonthlyCredits: calculateAverage(accountTransactions.filter(t => t.type === 'CREDIT')),
      avgMonthlyDebits: calculateAverage(accountTransactions.filter(t => t.type === 'DEBIT')),
      transactionFrequency: accountTransactions.length,
      riskScore: calculateRiskScore(account)
    },
    relationships: {
      customer: account.customerId,
      transactions: accountTransactions.map(t => t.transactionId)
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/twins/customer/:customerId', optionalAuth, (req, res) => {
  const customer = customers.get(req.params.customerId);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const customerAccounts = Array.from(accounts.values()).filter(a => a.customerId === customer.customerId);
  const customerLoans = Array.from(loans.values()).filter(l => l.customerId === customer.customerId);

  res.json({
    twinType: 'CustomerFinancialTwin',
    entityId: customer.customerId,
    data: {
      customerId: customer.customerId,
      name: customer.name,
      kycStatus: customer.kycStatus,
      riskProfile: customer.riskProfile
    },
    financials: {
      totalBalance: customerAccounts.reduce((sum, a) => sum + a.balance, 0),
      totalInvestments: Array.from(investments.values())
        .filter(i => i.customerId === customer.customerId)
        .reduce((sum, i) => sum + i.currentValue, 0),
      totalLoanOutstanding: customerLoans.reduce((sum, l) => sum + l.outstanding, 0),
      monthlyIncome: customer.monthlyIncome
    },
    accounts: customerAccounts.map(a => ({
      accountId: a.accountId,
      type: a.accountType,
      balance: a.balance
    })),
    trustScore: calculateTrustScore(customer),
    timestamp: new Date().toISOString()
  });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateAverage(transactions) {
  if (transactions.length === 0) return 0;
  return Math.round(transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length);
}

function calculateRiskScore(account) {
  let score = 50; // Base score

  if (account.balance > 1000000) score += 20;
  else if (account.balance > 100000) score += 10;

  if (account.overdraftLimit > 0) score -= 10;

  return Math.min(100, Math.max(0, score));
}

function calculateTrustScore(customer) {
  let score = 50;

  if (customer.kycStatus === 'VERIFIED') score += 30;
  else if (customer.kycStatus === 'PENDING') score += 10;

  if (customer.riskProfile === 'LOW') score += 20;
  else if (customer.riskProfile === 'MEDIUM') score += 10;

  // Years as customer
  const createdAt = new Date(customer.createdAt);
  const years = (Date.now() - createdAt) / (365 * 24 * 60 * 60 * 1000);
  score += Math.min(20, Math.floor(years * 5));

  return Math.min(100, Math.max(0, score));
}

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method
  });
});

// ============================================
// START SERVER
// ============================================

initSampleData();

app.listen(PORT, () => {
  logger.info(`Financial OS started on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`RTMN Layer integration: http://localhost:${PORT}/api/rtmn/layers`);
});
