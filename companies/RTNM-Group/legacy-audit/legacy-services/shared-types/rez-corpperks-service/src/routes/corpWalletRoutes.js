/**
 * CorpPerks Dual Wallet System
 * Personal Wallet + Corporate Wallet for employees
 */

const express = require('express');
const router = express.Router();

// ============ DATA STORES ============

// Personal Wallets (employee's own money)
const personalWallets = new Map();

// Corporate Wallets (company loaded benefits)
const corporateWallets = new Map(); // company wallets
const employeeCorporateWallets = new Map(); // employee corporate wallets

// All transactions
const transactions = [];

// ============ DEMO DATA ============

// Personal wallet (employee's own money)
personalWallets.set('E001', {
  walletId: 'PW001',
  employeeId: 'E001',
  type: 'personal',
  balance: 5000,
  totalToppedUp: 10000,
  totalSpent: 5000,
  currency: 'INR',
  status: 'active',
  benefits: {
    rezCashbackRate: 2, // 2% cashback at ReZ merchants
    rezCoinsRate: 1, // 1 ReZ Coin per ₹100
    maxMonthlyCashback: 200,
  },
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
});

// Corporate wallet (company loaded benefits)
corporateWallets.set('C001', {
  walletId: 'CW001',
  companyId: 'C001',
  companyName: 'TechCorp India',
  balance: 475000, // Total company budget
  totalAllocated: 25000,
  currency: 'INR',
  status: 'active',
  createdAt: '2025-01-01T00:00:00Z',
});

// Employee corporate wallet (allocated from company)
employeeCorporateWallets.set('E001', {
  walletId: 'ECW001',
  employeeId: 'E001',
  companyId: 'C001',
  companyName: 'TechCorp India',
  type: 'corporate',
  wallets: {
    meal: {
      balance: 1500,
      allocated: 2000,
      spent: 500,
      monthlyLimit: 2000,
      resetDay: 1,
      expiry: 'monthly',
      categories: ['food', 'dining', 'groceries', 'restaurant'],
      merchantTypes: ['restaurant', 'food', 'grocery', 'cafe'],
      status: 'active',
    },
    travel: {
      balance: 8000,
      allocated: 10000,
      spent: 2000,
      monthlyLimit: 10000,
      resetDay: 1,
      expiry: 'monthly',
      categories: ['travel', 'hotel', 'transport'],
      merchantTypes: ['hotel', 'travel', 'cab', 'flight', 'train'],
      status: 'active',
    },
    wellness: {
      balance: 3000,
      allocated: 3000,
      spent: 0,
      monthlyLimit: 3000,
      resetDay: 1,
      expiry: 'monthly',
      categories: ['health', 'fitness', 'medical'],
      merchantTypes: ['gym', 'health', 'spa', 'pharmacy'],
      status: 'active',
    },
    gift: {
      balance: 2500,
      allocated: 2500,
      spent: 0,
      monthlyLimit: null,
      expiry: 'yearly',
      categories: ['gift', 'shopping'],
      merchantTypes: ['all'],
      status: 'active',
    },
  },
  // Enhanced ReZ benefits from corporate
  benefits: {
    rezDiscountRate: 10, // 10% off at ReZ merchants
    rezCashbackRate: 5, // 5% cashback at ReZ
    rezCoinsRate: 2, // 2 ReZ Coins per ₹100
    maxMonthlyCashback: 500,
    maxMonthlyDiscount: 1000,
  },
  status: 'active',
  createdAt: '2025-01-15T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
});

// ============ HELPER FUNCTIONS ============

const calculateReZBenefits = (wallet, amount, isReZMerchant, walletType) => {
  if (!isReZMerchant) {
    return {
      discount: 0,
      discountLabel: null,
      cashback: 0,
      cashbackLabel: null,
      coinsEarned: 0,
      coinsLabel: null,
      totalSavings: 0,
    };
  }

  // Corporate wallet has better benefits
  const isCorporate = walletType === 'corporate';
  const discountRate = isCorporate ? (wallet.benefits?.rezDiscountRate || 0) : 0;
  const cashbackRate = wallet.benefits?.rezCashbackRate || 2;
  const coinsRate = wallet.benefits?.rezCoinsRate || 1;
  const maxCashback = wallet.benefits?.maxMonthlyCashback || 200;

  // Calculate discount (only for corporate)
  const discount = Math.min(
    Math.round(amount * (discountRate / 100)),
    wallet.benefits?.maxMonthlyDiscount || 1000
  );
  const amountAfterDiscount = amount - discount;

  // Cashback on final amount
  const cashback = Math.min(
    Math.round(amountAfterDiscount * (cashbackRate / 100)),
    maxCashback
  );

  // ReZ Coins
  const coinsEarned = Math.floor(amount / 100) * coinsRate;

  return {
    discount,
    discountLabel: discount > 0 ? `${discountRate}% off` : null,
    cashback,
    cashbackLabel: `${cashbackRate}% cashback`,
    coinsEarned,
    coinsLabel: `${coinsRate} ReZ Coins per ₹100`,
    totalSavings: discount + cashback,
    amountAfterDiscount,
  };
};

// Auth middleware
const requireAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};

// ============ PERSONAL WALLET (Employee's Own Money) ============

// GET /api/wallet/personal/:employeeId
router.get('/personal/:employeeId', (req, res) => {
  const wallet = personalWallets.get(req.params.employeeId);
  if (!wallet) {
    return res.status(404).json({ success: false, message: 'Personal wallet not found' });
  }
  res.json({ success: true, data: wallet });
});

// POST /api/wallet/personal/:employeeId/topup
router.post('/personal/:employeeId/topup', (req, res) => {
  const { amount, paymentMethod, upiId } = req.body;
  const wallet = personalWallets.get(req.params.employeeId);

  if (!wallet) {
    return res.status(404).json({ success: false, message: 'Personal wallet not found' });
  }

  wallet.balance += amount;
  wallet.totalToppedUp += amount;
  wallet.updatedAt = new Date().toISOString();

  const transaction = {
    id: `TX${Date.now()}`,
    walletType: 'personal',
    walletId: wallet.walletId,
    employeeId: req.params.employeeId,
    type: 'topup',
    amount,
    balanceAfter: wallet.balance,
    paymentMethod,
    upiId,
    status: 'completed',
    createdAt: new Date().toISOString(),
  };
  transactions.push(transaction);

  res.json({
    success: true,
    data: {
      wallet,
      transaction,
    },
  });
});

// POST /api/wallet/personal/:employeeId/spend
router.post('/personal/:employeeId/spend', (req, res) => {
  const { amount, merchantId, merchantType, merchantName, isReZMerchant, description } = req.body;
  const wallet = personalWallets.get(req.params.employeeId);

  if (!wallet) {
    return res.status(404).json({ success: false, message: 'Personal wallet not found' });
  }

  if (wallet.balance < amount) {
    return res.status(400).json({
      success: false,
      message: 'Insufficient balance',
      available: wallet.balance,
    });
  }

  const benefits = calculateReZBenefits(wallet, amount, isReZMerchant, 'personal');
  const finalAmount = amount - benefits.discount;

  wallet.balance -= finalAmount;
  wallet.totalSpent += finalAmount;
  wallet.updatedAt = new Date().toISOString();

  const transaction = {
    id: `TX${Date.now()}`,
    walletType: 'personal',
    walletId: wallet.walletId,
    employeeId: req.params.employeeId,
    type: 'spend',
    originalAmount: amount,
    discount: benefits.discount,
    finalAmount,
    cashback: benefits.cashback,
    coinsEarned: benefits.coinsEarned,
    merchantId,
    merchantType,
    merchantName,
    isReZMerchant,
    description,
    balanceAfter: wallet.balance,
    status: 'completed',
    createdAt: new Date().toISOString(),
  };
  transactions.push(transaction);

  res.json({
    success: true,
    data: {
      transaction,
      summary: {
        originalAmount: amount,
        discount: benefits.discountLabel ? `${benefits.discountLabel}: -₹${benefits.discount}` : null,
        youPay: finalAmount,
        cashbackEarned: benefits.cashback > 0 ? `₹${benefits.cashback} cashback` : null,
        coinsEarned: benefits.coinsEarned > 0 ? `${benefits.coinsEarned} ReZ Coins` : null,
        balanceRemaining: wallet.balance,
      },
    },
  });
});

// ============ CORPORATE WALLET (Company Loaded) ============

// GET /api/wallet/corporate/:companyId (company's view)
router.get('/corporate/:companyId', (req, res) => {
  const wallet = corporateWallets.get(req.params.companyId);
  if (!wallet) {
    return res.status(404).json({ success: false, message: 'Corporate wallet not found' });
  }
  res.json({ success: true, data: wallet });
});

// POST /api/wallet/corporate/:companyId/topup
router.post('/corporate/:companyId/topup', requireAuth, (req, res) => {
  const { amount, paymentMethod } = req.body;
  const wallet = corporateWallets.get(req.params.companyId);

  if (!wallet) {
    return res.status(404).json({ success: false, message: 'Corporate wallet not found' });
  }

  wallet.balance += amount;
  wallet.updatedAt = new Date().toISOString();

  const transaction = {
    id: `TX${Date.now()}`,
    walletType: 'company_corporate',
    walletId: wallet.walletId,
    companyId: req.params.companyId,
    type: 'topup',
    amount,
    balanceAfter: wallet.balance,
    paymentMethod,
    status: 'completed',
    createdAt: new Date().toISOString(),
  };
  transactions.push(transaction);

  res.json({ success: true, data: { wallet, transaction } });
});

// GET /api/wallet/employee-corporate/:employeeId (employee's corporate wallet)
router.get('/employee-corporate/:employeeId', (req, res) => {
  const wallet = employeeCorporateWallets.get(req.params.employeeId);
  if (!wallet) {
    return res.status(404).json({ success: false, message: 'Corporate wallet not found' });
  }

  const totals = Object.entries(wallet.wallets).reduce((acc, [type, data]) => {
    acc.totalBalance += data.balance;
    acc.totalAllocated += data.allocated;
    acc.totalSpent += data.spent;
    return acc;
  }, { totalBalance: 0, totalAllocated: 0, totalSpent: 0 });

  res.json({
    success: true,
    data: {
      ...wallet,
      totals,
    },
  });
});

// GET /api/wallet/employee-corporate/:employeeId/:type
router.get('/employee-corporate/:employeeId/:type', (req, res) => {
  const wallet = employeeCorporateWallets.get(req.params.employeeId);
  if (!wallet) {
    return res.status(404).json({ success: false, message: 'Corporate wallet not found' });
  }

  const walletType = req.params.type;
  if (!wallet.wallets[walletType]) {
    return res.status(404).json({ success: false, message: 'Wallet type not found' });
  }

  res.json({
    success: true,
    data: {
      employeeId: req.params.employeeId,
      type: walletType,
      ...wallet.wallets[walletType],
      benefits: wallet.benefits,
    },
  });
});

// POST /api/wallet/employee-corporate/:employeeId/allocate
router.post('/employee-corporate/:employeeId/allocate', requireAuth, (req, res) => {
  const { type, amount, description } = req.body;
  const wallet = employeeCorporateWallets.get(req.params.employeeId);

  if (!wallet) {
    return res.status(404).json({ success: false, message: 'Corporate wallet not found' });
  }

  if (!wallet.wallets[type]) {
    return res.status(400).json({ success: false, message: 'Invalid wallet type' });
  }

  // Deduct from company wallet
  const companyWallet = corporateWallets.get(wallet.companyId);
  if (!companyWallet || companyWallet.balance < amount) {
    return res.status(400).json({ success: false, message: 'Insufficient company balance' });
  }

  companyWallet.balance -= amount;
  companyWallet.totalAllocated += amount;

  // Add to employee wallet
  wallet.wallets[type].balance += amount;
  wallet.wallets[type].allocated += amount;

  const transaction = {
    id: `TX${Date.now()}`,
    walletType: 'corporate',
    walletId: wallet.walletId,
    employeeId: req.params.employeeId,
    walletCategory: type,
    type: 'allocation',
    amount,
    balanceAfter: wallet.wallets[type].balance,
    description: description || `${type} allowance from ${wallet.companyName}`,
    status: 'completed',
    createdAt: new Date().toISOString(),
  };
  transactions.push(transaction);

  res.json({
    success: true,
    data: {
      walletType: type,
      allocated: amount,
      balance: wallet.wallets[type].balance,
      transaction,
    },
  });
});

// POST /api/wallet/employee-corporate/:employeeId/spend
router.post('/employee-corporate/:employeeId/spend', (req, res) => {
  const { amount, walletType, merchantId, merchantType, merchantName, isReZMerchant, description } = req.body;
  const wallet = employeeCorporateWallets.get(req.params.employeeId);

  if (!wallet) {
    return res.status(404).json({ success: false, message: 'Corporate wallet not found' });
  }

  if (!wallet.wallets[walletType]) {
    return res.status(400).json({ success: false, message: 'Invalid wallet type' });
  }

  if (wallet.wallets[walletType].balance < amount) {
    return res.status(400).json({
      success: false,
      message: 'Insufficient balance',
      available: wallet.wallets[walletType].balance,
    });
  }

  const benefits = calculateReZBenefits(wallet, amount, isReZMerchant, 'corporate');
  const finalAmount = amount - benefits.discount;

  wallet.wallets[walletType].balance -= finalAmount;
  wallet.wallets[walletType].spent += finalAmount;

  const transaction = {
    id: `TX${Date.now()}`,
    walletType: 'corporate',
    walletId: wallet.walletId,
    employeeId: req.params.employeeId,
    walletCategory: walletType,
    type: 'spend',
    originalAmount: amount,
    discount: benefits.discount,
    finalAmount,
    cashback: benefits.cashback,
    coinsEarned: benefits.coinsEarned,
    merchantId,
    merchantType,
    merchantName,
    isReZMerchant,
    description,
    balanceAfter: wallet.wallets[walletType].balance,
    status: 'completed',
    createdAt: new Date().toISOString(),
  };
  transactions.push(transaction);

  res.json({
    success: true,
    data: {
      transaction,
      summary: {
        originalAmount: amount,
        corporateDiscount: benefits.discountLabel ? `${benefits.discountLabel}: -₹${benefits.discount}` : null,
        youPay: finalAmount,
        cashbackEarned: benefits.cashback > 0 ? `₹${benefits.cashback} cashback` : null,
        coinsEarned: benefits.coinsEarned > 0 ? `${benefits.coinsEarned} ReZ Coins` : null,
        balanceRemaining: wallet.wallets[walletType].balance,
      },
    },
  });
});

// ============ BULK OPERATIONS ============

// POST /api/wallet/bulk-allocate
router.post('/bulk-allocate', requireAuth, (req, res) => {
  const { allocations } = req.body; // [{ employeeId, type, amount }]

  const results = allocations.map(allocation => {
    const wallet = employeeCorporateWallets.get(allocation.employeeId);
    if (!wallet) return { employeeId: allocation.employeeId, status: 'failed', error: 'Wallet not found' };

    const companyWallet = corporateWallets.get(wallet.companyId);
    if (!companyWallet || companyWallet.balance < allocation.amount) {
      return { employeeId: allocation.employeeId, status: 'failed', error: 'Insufficient balance' };
    }

    if (!wallet.wallets[allocation.type]) {
      return { employeeId: allocation.employeeId, status: 'failed', error: 'Invalid wallet type' };
    }

    companyWallet.balance -= allocation.amount;
    companyWallet.totalAllocated += allocation.amount;
    wallet.wallets[allocation.type].balance += allocation.amount;
    wallet.wallets[allocation.type].allocated += allocation.amount;

    return {
      employeeId: allocation.employeeId,
      type: allocation.type,
      amount: allocation.amount,
      status: 'success',
    };
  });

  res.json({
    success: true,
    data: {
      processed: results.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      results,
    },
  });
});

// ============ COMBINED WALLET VIEW ============

// GET /api/wallet/combined/:employeeId (both wallets)
router.get('/combined/:employeeId', (req, res) => {
  const personal = personalWallets.get(req.params.employeeId);
  const corporate = employeeCorporateWallets.get(req.params.employeeId);

  if (!personal || !corporate) {
    return res.status(404).json({ success: false, message: 'Wallets not found' });
  }

  const corporateTotals = Object.entries(corporate.wallets).reduce((acc, [type, data]) => {
    acc.totalBalance += data.balance;
    acc.totalAllocated += data.allocated;
    acc.totalSpent += data.spent;
    return acc;
  }, { totalBalance: 0, totalAllocated: 0, totalSpent: 0 });

  res.json({
    success: true,
    data: {
      personal: {
        walletId: personal.walletId,
        balance: personal.balance,
        benefits: personal.benefits,
      },
      corporate: {
        walletId: corporate.walletId,
        totals: corporateTotals,
        wallets: corporate.wallets,
        benefits: corporate.benefits,
      },
      combinedBalance: personal.balance + corporateTotals.totalBalance,
    },
  });
});

// ============ BENEFITS COMPARISON ============

// POST /api/wallet/compare-benefits
router.post('/compare-benefits', (req, res) => {
  const { employeeId, amount, merchantType, merchantId } = req.body;

  const personal = personalWallets.get(employeeId);
  const corporate = employeeCorporateWallets.get(employeeId);

  if (!personal || !corporate) {
    return res.status(404).json({ success: false, message: 'Wallets not found' });
  }

  const isReZMerchant = merchantId?.startsWith('REZ') || merchantType?.includes('rez');

  const personalBenefits = calculateReZBenefits(personal, amount, isReZMerchant, 'personal');
  const corporateBenefits = calculateReZBenefits(corporate, amount, isReZMerchant, 'corporate');

  res.json({
    success: true,
    data: {
      amount,
      merchantType,
      isReZMerchant,
      personal: {
        discount: personalBenefits.discount,
        youPay: amount - personalBenefits.discount,
        cashback: personalBenefits.cashback,
        coins: personalBenefits.coinsEarned,
        totalSavings: personalBenefits.totalSavings,
      },
      corporate: {
        discount: corporateBenefits.discount,
        youPay: amount - corporateBenefits.discount,
        cashback: corporateBenefits.cashback,
        coins: corporateBenefits.coinsEarned,
        totalSavings: corporateBenefits.totalSavings,
      },
      recommendation: corporateBenefits.totalSavings > personalBenefits.totalSavings
        ? 'Use Corporate Wallet (more benefits)'
        : 'Use Personal Wallet',
    },
  });
});

// ============ TRANSACTIONS ============

// GET /api/wallet/transactions
router.get('/transactions', (req, res) => {
  const { employeeId, walletType, type, page, limit } = req.query;

  let filtered = [...transactions];

  if (employeeId) filtered = filtered.filter(tx => tx.employeeId === employeeId);
  if (walletType) filtered = filtered.filter(tx => tx.walletType === walletType);
  if (type) filtered = filtered.filter(tx => tx.type === type);

  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  const start = (pageNum - 1) * limitNum;

  res.json({
    success: true,
    data: filtered.slice(start, start + limitNum),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: filtered.length,
      pages: Math.ceil(filtered.length / limitNum),
    },
  });
});

module.exports = router;
