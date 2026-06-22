/**
 * CorpPerks Benefits Configuration Routes
 * ReZ Admin + Merchant + Company benefit settings
 */

const express = require('express');
const router = express.Router();

// ============ DATA STORES ============

// ReZ Platform Benefits (set by ReZ Admin)
const platformBenefits = {
  personal: {
    cashbackRate: 2, // 2% cashback
    coinsRate: 1, // 1 ReZ Coin per ₹100
    maxMonthlyCashback: 200,
    defaultDiscount: 0,
  },
  corporate: {
    defaultDiscountRate: 10,
    defaultCashbackRate: 5,
    defaultCoinsRate: 2,
    maxMonthlyDiscount: 1000,
    maxMonthlyCashback: 500,
  },
};

// Merchant Benefits (set by individual merchants)
const merchantBenefits = new Map();

// Company Corporate Benefits (set by company admin)
const companyBenefits = new Map();

// Demo merchant benefits
merchantBenefits.set('REZ_M001', {
  merchantId: 'REZ_M001',
  merchantName: 'Spice Garden Restaurant',
  merchantType: 'restaurant',
  benefits: {
    personal: {
      cashbackRate: 3, // Better than platform
      coinsRate: 2,
    },
    corporate: {
      discountRate: 15, // Custom discount
      cashbackRate: 8,
      coinsRate: 3,
    },
  },
  status: 'active',
  createdAt: '2025-01-01T00:00:00Z',
});

merchantBenefits.set('REZ_M002', {
  merchantId: 'REZ_M002',
  merchantName: 'Taj Hotels',
  merchantType: 'hotel',
  benefits: {
    personal: {
      cashbackRate: 5, // Higher for hotels
      coinsRate: 3,
    },
    corporate: {
      discountRate: 20, // Big discount
      cashbackRate: 10,
      coinsRate: 5,
    },
  },
  status: 'active',
  createdAt: '2025-01-01T00:00:00Z',
});

// Demo company benefits
companyBenefits.set('C001', {
  companyId: 'C001',
  companyName: 'TechCorp India',
  benefits: {
    personal: {
      // Uses platform defaults (or custom)
      cashbackRate: 2,
      coinsRate: 1,
    },
    corporate: {
      discountRate: 12, // Custom corporate rate
      cashbackRate: 6,
      coinsRate: 3,
      maxMonthlyDiscount: 1500, // Custom cap
      maxMonthlyCashback: 750,
    },
  },
  status: 'active',
  createdAt: '2025-01-01T00:00:00Z',
});

// ============ REZ ADMIN ROUTES ============

// GET /api/benefits-config/platform
router.get('/platform', (req, res) => {
  res.json({ success: true, data: platformBenefits });
});

// PUT /api/benefits-config/platform
router.put('/platform', (req, res) => {
  // In production, verify ReZ admin role
  const { personal, corporate } = req.body;

  if (personal) {
    platformBenefits.personal = { ...platformBenefits.personal, ...personal };
  }
  if (corporate) {
    platformBenefits.corporate = { ...platformBenefits.corporate, ...corporate };
  }

  res.json({ success: true, data: platformBenefits });
});

// ============ MERCHANT ROUTES ============

// GET /api/benefits-config/merchant/:merchantId
router.get('/merchant/:merchantId', (req, res) => {
  const benefits = merchantBenefits.get(req.params.merchantId);
  if (!benefits) {
    // Return platform defaults if no custom merchant benefits
    return res.json({
      success: true,
      data: {
        merchantId: req.params.merchantId,
        benefits: platformBenefits,
        isCustom: false,
      },
    });
  }
  res.json({
    success: true,
    data: { ...benefits, isCustom: true },
  });
});

// PUT /api/benefits-config/merchant/:merchantId
router.put('/merchant/:merchantId', (req, res) => {
  // In production, verify merchant ownership
  const { merchantName, merchantType, benefits } = req.body;

  const existing = merchantBenefits.get(req.params.merchantId) || {};

  merchantBenefits.set(req.params.merchantId, {
    ...existing,
    merchantId: req.params.merchantId,
    merchantName: merchantName || existing.merchantName,
    merchantType: merchantType || existing.merchantType,
    benefits: benefits || existing.benefits,
    status: 'active',
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  res.json({
    success: true,
    data: merchantBenefits.get(req.params.merchantId),
  });
});

// GET /api/benefits-config/merchants (list all)
router.get('/merchants', (req, res) => {
  const merchants = Array.from(merchantBenefits.entries()).map(([id, data]) => data);
  res.json({ success: true, data: merchants });
});

// ============ COMPANY ROUTES ============

// GET /api/benefits-config/company/:companyId
router.get('/company/:companyId', (req, res) => {
  const benefits = companyBenefits.get(req.params.companyId);
  if (!benefits) {
    return res.json({
      success: true,
      data: {
        companyId: req.params.companyId,
        benefits: platformBenefits,
        isCustom: false,
      },
    });
  }
  res.json({ success: true, data: { ...benefits, isCustom: true } });
});

// PUT /api/benefits-config/company/:companyId
router.put('/company/:companyId', (req, res) => {
  // In production, verify company admin role
  const { companyName, benefits } = req.body;

  const existing = companyBenefits.get(req.params.companyId) || {};

  companyBenefits.set(req.params.companyId, {
    ...existing,
    companyId: req.params.companyId,
    companyName: companyName || existing.companyName,
    benefits: benefits || existing.benefits || platformBenefits.corporate,
    status: 'active',
    createdAt: existing.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  res.json({
    success: true,
    data: companyBenefits.get(req.params.companyId),
  });
});

// ============ BENEFITS RESOLUTION ============

// POST /api/benefits-config/resolve
// Resolves the best benefits for a transaction
router.post('/resolve', (req, res) => {
  const { employeeId, companyId, merchantId, walletType, amount } = req.body;

  // Priority: Merchant > Company > Platform

  // 1. Get platform defaults
  const platform = walletType === 'personal' ? platformBenefits.personal : platformBenefits.corporate;

  // 2. Get company benefits (if corporate wallet)
  let company = null;
  if (walletType === 'corporate' && companyBenefits.has(companyId)) {
    company = companyBenefits.get(companyId).benefits.corporate;
  }

  // 3. Get merchant benefits (if available)
  let merchant = null;
  if (merchantBenefits.has(merchantId)) {
    merchant = merchantBenefits.get(merchantId).benefits[walletType];
  }

  // 4. Resolve the best benefits (highest values win)
  const resolved = {
    platform,
    company,
    merchant,
    final: {
      discountRate: merchant?.discountRate || company?.discountRate || platform?.discountRate || 0,
      cashbackRate: merchant?.cashbackRate || company?.cashbackRate || platform?.cashbackRate || 0,
      coinsRate: merchant?.coinsRate || company?.coinsRate || platform?.coinsRate || 0,
      maxMonthlyDiscount: company?.maxMonthlyDiscount || platform?.maxMonthlyDiscount || 0,
      maxMonthlyCashback: company?.maxMonthlyCashback || platform?.maxMonthlyCashback || 0,
    },
  };

  // Calculate actual values
  const discount = Math.min(
    Math.round(amount * (resolved.final.discountRate / 100)),
    resolved.final.maxMonthlyDiscount
  );
  const amountAfterDiscount = amount - discount;
  const cashback = Math.min(
    Math.round(amountAfterDiscount * (resolved.final.cashbackRate / 100)),
    resolved.final.maxMonthlyCashback
  );
  const coins = Math.floor(amount / 100) * resolved.final.coinsRate;

  res.json({
    success: true,
    data: {
      originalAmount: amount,
      discount,
      amountAfterDiscount,
      cashback,
      coins,
      totalSavings: discount + cashback,
      youPay: amountAfterDiscount,
      source: merchant ? 'merchant' : company ? 'company' : 'platform',
      breakdown: {
        platform: { discountRate: platform.discountRate || 0, cashbackRate: platform.cashbackRate || 0 },
        company: company ? { discountRate: company.discountRate || 0, cashbackRate: company.cashbackRate || 0 } : null,
        merchant: merchant ? { discountRate: merchant.discountRate || 0, cashbackRate: merchant.cashbackRate || 0 } : null,
      },
    },
  });
});

// ============ WHO SETS WHAT ============

// GET /api/benefits-config/roles
router.get('/roles', (req, res) => {
  res.json({
    success: true,
    data: {
      roles: [
        {
          role: 'ReZ Admin',
          sets: [
            'Platform default benefits',
            'Personal wallet cashback rate',
            'Platform coins rate',
            'Max monthly caps',
          ],
        },
        {
          role: 'Company Admin',
          sets: [
            'Corporate wallet discount rate',
            'Corporate wallet cashback rate',
            'Corporate coins rate',
            'Max monthly limits',
          ],
        },
        {
          role: 'Merchant',
          sets: [
            'Custom discount rate',
            'Custom cashback rate',
            'Custom coins rate',
            'Special offers',
          ],
        },
      ],
      priority: 'Merchant > Company > ReZ Admin',
      explanation: 'When spending, the highest benefit wins (Merchant > Company > Platform)',
    },
  });
});

module.exports = router;
