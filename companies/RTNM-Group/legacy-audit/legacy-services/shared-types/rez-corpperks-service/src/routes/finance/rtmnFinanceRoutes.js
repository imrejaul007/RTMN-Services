/**
 * RTMN Finance Routes
 * Corporate Wallet, BNPL, Expense Cards
 */

const express = require('express');
const router = express.Router();

// In-memory stores
const walletsStore = new Map();
const cardsStore = new Map();
const transactionsStore = [];

// Initialize demo wallet
walletsStore.set('C001', {
  walletId: 'W001',
  companyId: 'C001',
  companyName: 'TechCorp India',
  balance: 500000,
  availableLimit: 500000,
  usedAmount: 0,
  currency: 'INR',
  status: 'active',
  type: 'corporate',
  createdAt: '2025-01-01T00:00:00Z',
});

// Initialize demo cards
cardsStore.set('C001', [
  {
    cardId: 'CARD001',
    cardNumber: '4000 1234 5678 9012',
    cardNumberLast4: '9012',
    cardType: 'virtual',
    status: 'active',
    limit: 100000,
    usedAmount: 25000,
    expiryMonth: '12',
    expiryYear: '2028',
    cardholderName: 'John Doe',
    dailyLimit: 25000,
    monthlyLimit: 100000,
  },
  {
    cardId: 'CARD002',
    cardNumber: '4000 1234 5678 9034',
    cardNumberLast4: '9034',
    cardType: 'physical',
    status: 'active',
    limit: 50000,
    usedAmount: 12000,
    expiryMonth: '12',
    expiryYear: '2027',
    cardholderName: 'Jane Smith',
    dailyLimit: 15000,
    monthlyLimit: 50000,
  },
]);

// Auth middleware
const requireAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};

// ============ CORPORATE WALLET ============

// GET /api/finance/wallet/:companyId
router.get('/wallet/:companyId', (req, res) => {
  const wallet = walletsStore.get(req.params.companyId);
  if (!wallet) {
    return res.status(404).json({ success: false, message: 'Wallet not found' });
  }
  res.json({ success: true, data: wallet });
});

// POST /api/finance/wallet/:companyId/topup
router.post('/wallet/:companyId/topup', requireAuth, (req, res) => {
  const { amount, paymentMethod } = req.body;
  const wallet = walletsStore.get(req.params.companyId);

  if (!wallet) {
    return res.status(404).json({ success: false, message: 'Wallet not found' });
  }

  wallet.balance += amount;
  wallet.availableLimit += amount;

  const transaction = {
    id: `TX${Date.now()}`,
    type: 'topup',
    amount,
    balance: wallet.balance,
    paymentMethod,
    status: 'completed',
    createdAt: new Date().toISOString(),
  };
  transactionsStore.push(transaction);

  res.json({ success: true, data: { wallet, transaction } });
});

// POST /api/finance/wallet/:companyId/withdraw
router.post('/wallet/:companyId/withdraw', requireAuth, (req, res) => {
  const { amount, destination } = req.body;
  const wallet = walletsStore.get(req.params.companyId);

  if (!wallet) {
    return res.status(404).json({ success: false, message: 'Wallet not found' });
  }

  if (wallet.balance < amount) {
    return res.status(400).json({ success: false, message: 'Insufficient balance' });
  }

  wallet.balance -= amount;

  const transaction = {
    id: `TX${Date.now()}`,
    type: 'withdraw',
    amount,
    balance: wallet.balance,
    destination,
    status: 'completed',
    createdAt: new Date().toISOString(),
  };
  transactionsStore.push(transaction);

  res.json({ success: true, data: { wallet, transaction } });
});

// GET /api/finance/wallet/:companyId/transactions
router.get('/wallet/:companyId/transactions', (req, res) => {
  const { page, limit, type } = req.query;
  let transactions = transactionsStore.filter(tx => tx.companyId === req.params.companyId);

  if (type) {
    transactions = transactions.filter(tx => tx.type === type);
  }

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  const start = (pageNum - 1) * limitNum;

  res.json({
    success: true,
    data: transactions.slice(start, start + limitNum),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: transactions.length,
      pages: Math.ceil(transactions.length / limitNum),
    },
  });
});

// ============ EXPENSE CARDS ============

// GET /api/finance/cards/:companyId
router.get('/cards/:companyId', (req, res) => {
  const cards = cardsStore.get(req.params.companyId) || [];
  res.json({ success: true, data: cards });
});

// POST /api/finance/cards
router.post('/cards', requireAuth, (req, res) => {
  const { companyId, employeeId, employeeName, cardType, limit } = req.body;

  const cards = cardsStore.get(companyId) || [];

  const card = {
    cardId: `CARD${Date.now()}`,
    cardNumber: `${Math.floor(4000 + Math.random() * 1000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
    cardNumberLast4: String(Math.floor(1000 + Math.random() * 9000)),
    cardType: cardType || 'virtual',
    status: 'active',
    limit: limit || 50000,
    usedAmount: 0,
    expiryMonth: String(new Date().getMonth() + 1).padStart(2, '0'),
    expiryYear: String(new Date().getFullYear() + 2),
    cardholderName: employeeName,
    employeeId,
    dailyLimit: Math.floor((limit || 50000) * 0.25),
    monthlyLimit: limit || 50000,
    createdAt: new Date().toISOString(),
  };

  cards.push(card);
  cardsStore.set(companyId, cards);

  res.status(201).json({ success: true, data: card });
});

// GET /api/finance/cards/:cardId
router.get('/cards/:cardId', (req, res) => {
  for (const [companyId, cards] of cardsStore) {
    const card = cards.find(c => c.cardId === req.params.cardId);
    if (card) {
      return res.json({ success: true, data: card });
    }
  }
  return res.status(404).json({ success: false, message: 'Card not found' });
});

// PUT /api/finance/cards/:cardId
router.put('/cards/:cardId', requireAuth, (req, res) => {
  const { dailyLimit, monthlyLimit, status } = req.body;

  for (const [companyId, cards] of cardsStore) {
    const card = cards.find(c => c.cardId === req.params.cardId);
    if (card) {
      if (dailyLimit) card.dailyLimit = dailyLimit;
      if (monthlyLimit) card.monthlyLimit = monthlyLimit;
      if (status) card.status = status;
      return res.json({ success: true, data: card });
    }
  }
  return res.status(404).json({ success: false, message: 'Card not found' });
});

// POST /api/finance/cards/:cardId/freeze
router.post('/cards/:cardId/freeze', requireAuth, (req, res) => {
  for (const [companyId, cards] of cardsStore) {
    const card = cards.find(c => c.cardId === req.params.cardId);
    if (card) {
      card.status = 'frozen';
      return res.json({ success: true, data: card });
    }
  }
  return res.status(404).json({ success: false, message: 'Card not found' });
});

// POST /api/finance/cards/:cardId/unfreeze
router.post('/cards/:cardId/unfreeze', requireAuth, (req, res) => {
  for (const [companyId, cards] of cardsStore) {
    const card = cards.find(c => c.cardId === req.params.cardId);
    if (card) {
      card.status = 'active';
      return res.json({ success: true, data: card });
    }
  }
  return res.status(404).json({ success: false, message: 'Card not found' });
});

// DELETE /api/finance/cards/:cardId
router.delete('/cards/:cardId', requireAuth, (req, res) => {
  for (const [companyId, cards] of cardsStore) {
    const idx = cards.findIndex(c => c.cardId === req.params.cardId);
    if (idx !== -1) {
      cards.splice(idx, 1);
      cardsStore.set(companyId, cards);
      return res.json({ success: true, message: 'Card deleted' });
    }
  }
  return res.status(404).json({ success: false, message: 'Card not found' });
});

// ============ BNPL ============

// GET /api/finance/bnpl/:companyId
router.get('/bnpl/:companyId', (req, res) => {
  res.json({
    success: true,
    data: {
      companyId: req.params.companyId,
      status: 'active',
      creditLimit: 1000000,
      usedCredit: 125000,
      availableCredit: 875000,
      nextDueDate: '2026-05-15',
      minDueAmount: 12500,
      totalDueAmount: 125000,
      interestRate: 18,
      gracePeriod: 15,
    },
  });
});

// POST /api/finance/bnpl/:companyId/charge
router.post('/bnpl/:companyId/charge', requireAuth, (req, res) => {
  const { amount, description, merchantId, employeeId } = req.body;

  res.json({
    success: true,
    data: {
      transactionId: `BNPL${Date.now()}`,
      companyId: req.params.companyId,
      amount,
      description,
      merchantId,
      employeeId,
      status: 'approved',
      emiOptions: [
        { tenure: 3, monthlyAmount: Math.ceil(amount / 3) },
        { tenure: 6, monthlyAmount: Math.ceil(amount / 6) },
        { tenure: 12, monthlyAmount: Math.ceil(amount / 12) },
      ],
      createdAt: new Date().toISOString(),
    },
  });
});

// GET /api/finance/bnpl/:companyId/statements
router.get('/bnpl/:companyId/statements', (req, res) => {
  const { from, to } = req.query;

  res.json({
    success: true,
    data: {
      statements: [
        {
          period: 'April 2026',
          openingBalance: 100000,
          charges: 125000,
          payments: 100000,
          closingBalance: 125000,
          dueDate: '2026-05-15',
          minDue: 12500,
          status: 'pending',
        },
      ],
    },
  });
});

// POST /api/finance/bnpl/:companyId/pay
router.post('/bnpl/:companyId/pay', requireAuth, (req, res) => {
  const { amount, paymentMethod } = req.body;

  res.json({
    success: true,
    data: {
      paymentId: `PAY${Date.now()}`,
      companyId: req.params.companyId,
      amount,
      paymentMethod,
      status: 'completed',
      transactionRef: `RTMN${Date.now()}`,
      paidAt: new Date().toISOString(),
    },
  });
});

// ============ SPEND ANALYTICS ============

// GET /api/finance/analytics/:companyId
router.get('/analytics/:companyId', (req, res) => {
  res.json({
    success: true,
    data: {
      totalSpend: 485000,
      monthlySpend: [
        { month: 'Jan', amount: 120000 },
        { month: 'Feb', amount: 95000 },
        { month: 'Mar', amount: 135000 },
        { month: 'Apr', amount: 135000 },
      ],
      categoryBreakdown: [
        { category: 'Travel', amount: 200000, percentage: 41 },
        { category: 'Meals', amount: 120000, percentage: 25 },
        { category: 'Hotels', amount: 100000, percentage: 21 },
        { category: 'Gifts', amount: 45000, percentage: 9 },
        { category: 'Other', amount: 20000, percentage: 4 },
      ],
      topEmployees: [
        { employeeId: 'E001', name: 'John Doe', spent: 45000 },
        { employeeId: 'E002', name: 'Jane Smith', spent: 38000 },
        { employeeId: 'E003', name: 'Bob Wilson', spent: 32000 },
      ],
      savings: {
        totalSavings: 85000,
        gstSavings: 45000,
        negotiatedDiscounts: 40000,
      },
    },
  });
});

// GET /api/finance/limits/:companyId
router.get('/limits/:companyId', (req, res) => {
  res.json({
    success: true,
    data: {
      monthly: { limit: 1000000, used: 485000, remaining: 515000 },
      quarterly: { limit: 3000000, used: 850000, remaining: 2150000 },
      yearly: { limit: 12000000, used: 3500000, remaining: 8500000 },
    },
  });
});

module.exports = router;
