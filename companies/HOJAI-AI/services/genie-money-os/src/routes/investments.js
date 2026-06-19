const express = require('express');
const router = express.Router();

// In-memory investment data
const portfolios = new Map();
const holdings = new Map();
const transactions = new Map();

// Investment asset types
const assetTypes = [
  { id: 'stocks', name: 'Stocks', icon: '📈', description: 'Individual company stocks' },
  { id: 'etfs', name: 'ETFs', icon: '📊', description: 'Exchange-traded funds' },
  { id: 'mutual-funds', name: 'Mutual Funds', icon: '🏦', description: 'Actively managed funds' },
  { id: 'bonds', name: 'Bonds', icon: '📜', description: 'Fixed income securities' },
  { id: 'crypto', name: 'Cryptocurrency', icon: '₿', description: 'Digital assets' },
  { id: 'real-estate', name: 'Real Estate', icon: '🏠', description: 'Property investments' },
  { id: 'retirement', name: 'Retirement (401k/IRA)', icon: '🏖️', description: 'Tax-advantaged accounts' },
  { id: 'cash', name: 'Cash/Money Market', icon: '💵', description: 'Savings and money market' }
];

// Get portfolio summary
router.get('/:userId/portfolio', (req, res) => {
  const { userId } = req.params;

  const userHoldings = holdings.get(userId) || [];
  const userTransactions = transactions.get(userId) || [];

  // Calculate totals
  const totalValue = userHoldings.reduce((sum, h) => sum + (h.currentValue || h.value), 0);
  const totalCost = userHoldings.reduce((sum, h) => sum + h.costBasis, 0);
  const totalGain = totalValue - totalCost;
  const totalReturn = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  // Group by asset type
  const byType = {};
  userHoldings.forEach(h => {
    if (!byType[h.type]) byType[h.type] = { value: 0, gain: 0 };
    byType[h.type].value += h.currentValue || h.value;
    byType[h.type].gain += (h.currentValue || h.value) - h.costBasis;
  });

  // Calculate allocation
  const allocation = Object.entries(byType).map(([type, data]) => ({
    type,
    value: Math.round(data.value * 100) / 100,
    percent: totalValue > 0 ? Math.round((data.value / totalValue) * 100) : 0,
    gain: Math.round(data.gain * 100) / 100
  }));

  res.json({
    success: true,
    data: {
      totalValue: Math.round(totalValue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      totalGain: Math.round(totalGain * 100) / 100,
      totalReturn: Math.round(totalReturn * 100) / 100,
      allocation,
      holdings: userHoldings.length,
      transactions: userTransactions.length
    }
  });
});

// Add holding
router.post('/:userId/holdings', (req, res) => {
  const { userId } = req.params;
  const { symbol, name, shares, price, type, purchaseDate, account } = req.body;

  if (!symbol || shares === undefined || price === undefined) {
    return res.status(400).json({
      success: false,
      error: 'symbol, shares, and price are required'
    });
  }

  const holding = {
    id: `holding-${Date.now()}`,
    userId,
    symbol: symbol.toUpperCase(),
    name: name || symbol.toUpperCase(),
    shares,
    purchasePrice: price,
    currentValue: shares * price,
    costBasis: shares * price,
    type: type || 'stocks',
    purchaseDate: purchaseDate || new Date().toISOString(),
    account: account || 'brokerage',
    lastUpdated: new Date().toISOString()
  };

  if (!holdings.has(userId)) {
    holdings.set(userId, []);
  }
  holdings.get(userId).push(holding);

  res.json({
    success: true,
    message: `Added ${shares} shares of ${symbol.toUpperCase()}`,
    data: {
      holding,
      portfolioValue: calculatePortfolioValue(holdings.get(userId))
    }
  });
});

// Get holdings
router.get('/:userId/holdings', (req, res) => {
  const { userId } = req.params;
  const { type, account } = req.query;

  let userHoldings = holdings.get(userId) || [];

  if (type) {
    userHoldings = userHoldings.filter(h => h.type === type);
  }

  if (account) {
    userHoldings = userHoldings.filter(h => h.account === account);
  }

  // Calculate gains for each holding
  const withGains = userHoldings.map(h => ({
    ...h,
    gain: h.currentValue - h.costBasis,
    returnPercent: h.costBasis > 0 ? ((h.currentValue - h.costBasis) / h.costBasis) * 100 : 0
  }));

  res.json({
    success: true,
    data: {
      holdings: withGains,
      totalValue: withGains.reduce((sum, h) => sum + h.currentValue, 0),
      totalGain: withGains.reduce((sum, h) => sum + h.gain, 0)
    }
  });
});

// Update holding price (simulate market update)
router.put('/:userId/holdings/:holdingId', (req, res) => {
  const { userId, holdingId } = req.params;
  const { currentPrice } = req.body;

  const userHoldings = holdings.get(userId) || [];
  const holding = userHoldings.find(h => h.id === holdingId);

  if (!holding) {
    return res.status(404).json({
      success: false,
      error: 'Holding not found'
    });
  }

  holding.currentValue = holding.shares * currentPrice;
  holding.lastUpdated = new Date().toISOString();

  res.json({
    success: true,
    data: {
      symbol: holding.symbol,
      shares: holding.shares,
      currentPrice,
      currentValue: holding.currentValue,
      gain: holding.currentValue - holding.costBasis,
      returnPercent: ((holding.currentValue - holding.costBasis) / holding.costBasis) * 100
    }
  });
});

// Add transaction
router.post('/:userId/transactions', (req, res) => {
  const { userId } = req.params;
  const { symbol, type, shares, price, date, fees } = req.body;

  if (!symbol || !type || shares === undefined || price === undefined) {
    return res.status(400).json({
      success: false,
      error: 'symbol, type, shares, and price are required'
    });
  }

  const transaction = {
    id: `txn-${Date.now()}`,
    userId,
    symbol: symbol.toUpperCase(),
    type, // buy, sell, dividend, split
    shares,
    price,
    total: shares * price,
    fees: fees || 0,
    date: date || new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  if (!transactions.has(userId)) {
    transactions.set(userId, []);
  }
  transactions.get(userId).push(transaction);

  res.json({
    success: true,
    message: `${type} transaction recorded`,
    data: {
      transaction,
      netAmount: type === 'buy' ? -(transaction.total + transaction.fees) :
                 type === 'sell' ? transaction.total - transaction.fees : 0
    }
  });
});

// Get transactions
router.get('/:userId/transactions', (req, res) => {
  const { userId } = req.params;
  const { limit = 50, symbol } = req.query;

  let userTransactions = transactions.get(userId) || [];

  if (symbol) {
    userTransactions = userTransactions.filter(t => t.symbol === symbol.toUpperCase());
  }

  userTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json({
    success: true,
    data: {
      transactions: userTransactions.slice(0, parseInt(limit)),
      total: userTransactions.length
    }
  });
});

// Get performance metrics
router.get('/:userId/performance', (req, res) => {
  const { userId } = req.params;
  const { period = '1y' } = req.query;

  const userHoldings = holdings.get(userId) || [];

  // Calculate performance metrics
  const totalValue = userHoldings.reduce((sum, h) => sum + (h.currentValue || h.value), 0);
  const totalCost = userHoldings.reduce((sum, h) => sum + h.costBasis, 0);

  // Simulated historical performance
  const periods = {
    '1m': 0.5,
    '3m': 1.5,
    '6m': 3.0,
    '1y': 8.5,
    'ytd': 5.2,
    'all': totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0
  };

  res.json({
    success: true,
    data: {
      totalValue: Math.round(totalValue * 100) / 100,
      totalReturn: totalCost > 0 ? Math.round(((totalValue - totalCost) / totalCost) * 100 * 100) / 100 : 0,
      periodReturns: periods,
      benchmarkComparison: {
        '1y': { portfolio: periods['1y'], sp500: 12.5, difference: periods['1y'] - 12.5 }
      }
    }
  });
});

// Get investment recommendations
router.get('/:userId/recommendations', (req, res) => {
  const { userId } = req.params;
  const { riskTolerance = 'moderate', goal = 'growth' } = req.query;

  // Generate recommendations based on risk tolerance
  const allocations = {
    aggressive: [
      { type: 'stocks', percent: 80, description: 'Growth stocks for long-term returns' },
      { type: 'crypto', percent: 10, description: 'High-risk, high-reward allocation' },
      { type: 'bonds', percent: 10, description: 'Slight stabilization' }
    ],
    moderate: [
      { type: 'stocks', percent: 60, description: 'Diversified stock exposure' },
      { type: 'etfs', percent: 20, description: 'Broad market coverage' },
      { type: 'bonds', percent: 15, description: 'Fixed income stability' },
      { type: 'cash', percent: 5, description: 'Emergency liquidity' }
    ],
    conservative: [
      { type: 'bonds', percent: 50, description: 'Government and corporate bonds' },
      { type: 'etfs', percent: 25, description: 'Dividend ETFs for stability' },
      { type: 'cash', percent: 15, description: 'High-yield savings' },
      { type: 'stocks', percent: 10, description: 'Small growth allocation' }
    ]
  };

  const recommended = allocations[riskTolerance] || allocations.moderate;

  const suggestions = [
    { type: 'Index Fund', suggestion: 'VOO (Vanguard S&P 500)', reason: 'Low fees, broad market exposure', suitableFor: ['all'] },
    { type: 'International', suggestion: 'VXUS (Total International)', reason: 'Geographic diversification', suitableFor: ['moderate', 'aggressive'] },
    { type: 'Bond ETF', suggestion: 'BND (Vanguard Total Bond)', reason: 'Fixed income stability', suitableFor: ['moderate', 'conservative'] },
    { type: 'REIT', suggestion: 'VNQ (Vanguard Real Estate)', reason: 'Real estate exposure, dividends', suitableFor: ['moderate', 'aggressive'] }
  ];

  res.json({
    success: true,
    data: {
      riskTolerance,
      goal,
      recommendedAllocation: recommended,
      fundSuggestions: suggestions.filter(s => s.suitableFor.includes(riskTolerance)),
      tips: generateInvestmentTips(riskTolerance, goal)
    }
  });
});

// Get retirement projection
router.post('/:userId/retirement', (req, res) => {
  const { userId } = req.params;
  const { currentAge, retirementAge, currentSavings, monthlyContribution, expectedReturn } = req.body;

  if (!currentAge || !retirementAge || !currentSavings) {
    return res.status(400).json({
      success: false,
      error: 'currentAge, retirementAge, and currentSavings are required'
    });
  }

  const yearsToRetirement = retirementAge - currentAge;
  const monthlyRate = (expectedReturn || 7) / 100 / 12;
  const months = yearsToRetirement * 12;

  let balance = currentSavings;
  const yearlyBalances = [];

  for (let m = 0; m <= months; m++) {
    if (m > 0) {
      balance = balance * (1 + monthlyRate) + (monthlyContribution || 0);
    }

    if (m % 12 === 0) {
      yearlyBalances.push({
        year: m / 12,
        age: currentAge + m / 12,
        balance: Math.round(balance)
      });
    }
  }

  // Calculate monthly retirement income
  const retirementBalance = yearlyBalances[yearlyBalances.length - 1]?.balance || currentSavings;
  const retirementYears = 30; // Assume 30 years in retirement
  const monthlyIncome = Math.round((retirementBalance * 0.04) / 12); // 4% withdrawal rule

  res.json({
    success: true,
    data: {
      currentAge,
      retirementAge,
      yearsToRetirement,
      monthlyContribution: monthlyContribution || 0,
      expectedReturn: expectedReturn || 7,
      retirementBalance: Math.round(retirementBalance),
      monthlyRetirementIncome: monthlyIncome,
      yearlyBalances,
      milestones: {
        oneMil: yearlyBalances.find(b => b.balance >= 1000000)?.age || 'Not projected',
        halfMil: yearlyBalances.find(b => b.balance >= 500000)?.age || 'Not projected'
      }
    }
  });
});

// Get asset types
router.get('/asset-types', (req, res) => {
  res.json({
    success: true,
    data: assetTypes
  });
});

// Helper functions
function calculatePortfolioValue(holdings) {
  return holdings.reduce((sum, h) => sum + (h.currentValue || h.value), 0);
}

function generateInvestmentTips(riskTolerance, goal) {
  const tips = [];

  if (riskTolerance === 'aggressive') {
    tips.push('Your portfolio has high growth potential but also high volatility');
    tips.push('Be prepared for significant short-term fluctuations');
    tips.push('Consider rebalancing annually to maintain your target allocation');
  } else if (riskTolerance === 'conservative') {
    tips.push('Focus on capital preservation while still growing wealth');
    tips.push('Consider increasing stock allocation as you get closer to retirement');
    tips.push('Ensure you have adequate emergency funds before investing');
  } else {
    tips.push('A balanced approach helps weather market volatility');
    tips.push('Review and rebalance your portfolio quarterly');
    tips.push('Max out tax-advantaged accounts before taxable brokerage');
  }

  if (goal === 'retirement') {
    tips.push('Max out 401k and IRA contributions');
    tips.push('Consider Roth options for tax-free growth');
  } else if (goal === 'house') {
    tips.push('Keep home savings in liquid, low-risk investments');
    tips.push('Consider I-bonds for inflation protection');
  }

  return tips;
}

module.exports = router;