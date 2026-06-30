/**
 * Promotion Routes — Promotions Engine
 */

import { Router } from 'express';

const router = Router();

// In-memory promotions store
const promotions = [
  {
    id: 'PROMO001',
    code: 'SAVE10',
    type: 'percentage',
    value: 10,
    minOrderValue: 500,
    maxDiscount: 100,
    validUntil: '2026-12-31',
    usageLimit: 1000,
    used: 234,
  },
  {
    id: 'PROMO002',
    code: 'SAVE20',
    type: 'percentage',
    value: 20,
    minOrderValue: 1000,
    maxDiscount: 500,
    validUntil: '2026-12-31',
    usageLimit: 500,
    used: 87,
  },
  {
    id: 'PROMO003',
    code: 'FIRST50',
    type: 'percentage',
    value: 50,
    minOrderValue: 200,
    maxDiscount: 2000,
    validUntil: '2026-12-31',
    usageLimit: 100,
    used: 12,
  },
];

const activeBundles = [
  {
    id: 'BUNDLE001',
    name: 'Combo Pack',
    products: ['PROD001', 'PROD002'],
    bundlePrice: 999,
    savings: 200,
  },
];

// GET /api/promotion
router.get('/', async (req, res) => {
  res.json({
    coupons: promotions,
    bundles: activeBundles,
    flashSales: [
      {
        id: 'FLASH001',
        name: 'Flash Sale',
        endsAt: new Date(Date.now() + 3600000).toISOString(),
        items: ['PROD001', 'PROD003'],
        discount: 30,
      },
    ],
    timestamp: new Date().toISOString(),
  });
});

// POST /api/promotion/validate
router.post('/validate', async (req, res) => {
  const { code, orderValue } = req.body;

  const promo = promotions.find(p => p.code === code);

  if (!promo) {
    return res.status(404).json({
      valid: false,
      error: 'Promo code not found',
    });
  }

  if (orderValue < promo.minOrderValue) {
    return res.json({
      valid: false,
      reason: `Minimum order value of ₹${promo.minOrderValue} required`,
    });
  }

  if (promo.used >= promo.usageLimit) {
    return res.json({
      valid: false,
      reason: 'Promo code usage limit reached',
    });
  }

  const discount = Math.min(orderValue * (promo.value / 100), promo.maxDiscount);

  res.json({
    valid: true,
    promo,
    discount: Math.floor(discount),
    finalValue: Math.floor(orderValue - discount),
    timestamp: new Date().toISOString(),
  });
});

// POST /api/promotion/apply
router.post('/apply', async (req, res) => {
  const { code, orderId } = req.body;

  const promoIndex = promotions.findIndex(p => p.code === code);

  if (promoIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Promo code not found',
    });
  }

  // Increment usage
  promotions[promoIndex].used += 1;

  res.json({
    success: true,
    orderId,
    code,
    appliedAt: new Date().toISOString(),
  });
});

// POST /api/promotion/bundle
router.post('/bundle', async (req, res) => {
  const { bundleId, productIds } = req.body;

  const bundle = activeBundles.find(b => b.id === bundleId);

  if (!bundle) {
    return res.status(404).json({
      success: false,
      error: 'Bundle not found',
    });
  }

  res.json({
    success: true,
    bundle,
    savings: bundle.savings,
    appliedAt: new Date().toISOString(),
  });
});

// POST /api/promotion/create
router.post('/create', async (req, res) => {
  const promo = {
    id: `PROMO${String(promotions.length + 1).padStart(3, '0')}`,
    ...req.body,
    used: 0,
  };

  promotions.push(promo);

  res.status(201).json({
    success: true,
    promotion: promo,
  });
});

export default router;
