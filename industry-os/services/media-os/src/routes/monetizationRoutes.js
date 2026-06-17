/**
 * Media OS - Monetization Routes
 * Subscriptions, PPV, Revenue, and Advertising
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize, optionalAuth } = require('../middleware');
const { monetizationService } = require('../services/MonetizationService');
const { Plan, Subscription, PPVTransaction, Revenue, Royalty, Sponsorship, ...models } = require('../models');
const logger = require('../config/database');

// ============================================
// SUBSCRIPTION PLANS
// ============================================

// Get all active plans
router.get('/plans', optionalAuth, async (req, res) => {
  try {
    const plans = await Plan.findActive();

    res.json({ success: true, plans, count: plans.length });
  } catch (error) {
    logger.error('Failed to fetch plans', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch plans' });
  }
});

// Get plan by ID
router.get('/plans/:id', optionalAuth, async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }

    res.json({ success: true, plan });
  } catch (error) {
    logger.error('Failed to fetch plan', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch plan' });
  }
});

// Get plan comparison
router.get('/plans-compare', optionalAuth, async (req, res) => {
  try {
    const comparison = await Plan.getPlanComparison();
    res.json({ success: true, comparison });
  } catch (error) {
    logger.error('Failed to fetch comparison', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch comparison' });
  }
});

// ============================================
// SUBSCRIPTIONS
// ============================================

// Get my subscription
router.get('/subscription', authenticate, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      viewerId: req.user.id,
      status: 'active',
    }).populate('viewerId', 'profile.email');

    res.json({ success: true, subscription });
  } catch (error) {
    logger.error('Failed to fetch subscription', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch subscription' });
  }
});

// Create subscription
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const { planId, billingCycle, paymentMethod } = req.body;

    const result = await monetizationService.createSubscription(
      req.user.id,
      planId,
      { billingCycle, paymentMethod }
    );

    if (!result.success && !result.payment?.mock) {
      return res.status(400).json({
        success: false,
        error: 'Payment failed',
        paymentUrl: result.payment?.paymentUrl,
      });
    }

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Subscription failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cancel subscription
router.post('/subscription/cancel', authenticate, async (req, res) => {
  try {
    const { reason, immediate } = req.body;

    const subscription = await Subscription.findOne({
      viewerId: req.user.id,
      status: 'active',
    });

    if (!subscription) {
      return res.status(404).json({ success: false, error: 'No active subscription' });
    }

    const result = await monetizationService.cancelSubscription(
      subscription._id,
      reason,
      immediate
    );

    res.json(result);
  } catch (error) {
    logger.error('Cancellation failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// PPV (PAYPER VIEW)
// ============================================

// Check access to content
router.get('/access/:contentId', authenticate, async (req, res) => {
  try {
    const access = await monetizationService.hasAccess(req.user.id, req.params.contentId);
    res.json({ success: true, access });
  } catch (error) {
    logger.error('Access check failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to check access' });
  }
});

// Purchase/rent content
router.post('/ppv/purchase', authenticate, async (req, res) => {
  try {
    const { contentId, type, options } = req.body;

    const result = await monetizationService.purchaseContent(
      req.user.id,
      contentId,
      type || 'purchase',
      options
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Purchase failed',
      });
    }

    res.json(result);
  } catch (error) {
    logger.error('PPV purchase failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get my PPV purchases
router.get('/ppv/purchases', authenticate, async (req, res) => {
  try {
    const purchases = await PPVTransaction.find({
      viewerId: req.user.id,
      type: 'purchase',
    }).populate('contentId', 'title thumbnail type');

    res.json({ success: true, purchases, count: purchases.length });
  } catch (error) {
    logger.error('Failed to fetch purchases', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch purchases' });
  }
});

// Get my PPV rentals
router.get('/ppv/rentals', authenticate, async (req, res) => {
  try {
    const rentals = await PPVTransaction.findActiveForViewer(req.user.id)
      .populate('contentId', 'title thumbnail type');

    res.json({ success: true, rentals, count: rentals.length });
  } catch (error) {
    logger.error('Failed to fetch rentals', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch rentals' });
  }
});

// Extend rental
router.post('/ppv/rentals/:id/extend', authenticate, async (req, res) => {
  try {
    const { hours } = req.body;

    const rental = await PPVTransaction.findOne({
      _id: req.params.id,
      viewerId: req.user.id,
    });

    if (!rental) {
      return res.status(404).json({ success: false, error: 'Rental not found' });
    }

    if (!rental.canExtend) {
      return res.status(400).json({ success: false, error: 'Cannot extend rental' });
    }

    // Process extension payment
    const result = await monetizationService.processPayment(
      req.user.id,
      hours * 10, // $10 per 24 hours
      'INR',
      { type: 'rental_extension', rentalId: rental._id }
    );

    if (result.success) {
      await rental.extend(hours);
    }

    res.json({ success: result.success, rental });
  } catch (error) {
    logger.error('Rental extension failed', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ADVERTISING
// ============================================

// Get ad for viewer
router.get('/ad/:contentId', authenticate, async (req, res) => {
  try {
    const { slotId, position, duration } = req.query;

    const ad = await monetizationService.getAdForViewer(
      req.user.id,
      req.params.contentId,
      { slotId, position, duration }
    );

    res.json({ success: true, ...ad });
  } catch (error) {
    logger.error('Ad fetch failed', { error: error.message });
    res.json({ success: true, ad: null });
  }
});

// Track ad impression
router.post('/ad/impression', authenticate, async (req, res) => {
  try {
    const { campaignId, contentId, slotId } = req.body;

    const result = await monetizationService.trackImpression(
      campaignId,
      req.user.id,
      contentId,
      slotId
    );

    res.json(result);
  } catch (error) {
    logger.error('Impression tracking failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to track impression' });
  }
});

// Track ad click
router.post('/ad/click', authenticate, async (req, res) => {
  try {
    const { campaignId, contentId } = req.body;

    const result = await monetizationService.trackClick(
      campaignId,
      req.user.id,
      contentId
    );

    res.json(result);
  } catch (error) {
    logger.error('Click tracking failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to track click' });
  }
});

// ============================================
// REVENUE
// ============================================

// Get revenue dashboard
router.get('/revenue', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;

    const dashboard = await monetizationService.getRevenueDashboard(period);

    res.json({ success: true, ...dashboard });
  } catch (error) {
    logger.error('Revenue dashboard failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch revenue' });
  }
});

// Get revenue by period
router.get('/revenue/period', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { type = 'monthly', months = 6 } = req.query;

    const trend = await Revenue.getTrend(type, parseInt(months));

    res.json({ success: true, trend: trend?.[0] || [] });
  } catch (error) {
    logger.error('Revenue trend failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch revenue trend' });
  }
});

// ============================================
// ROYALTIES
// ============================================

// Get royalty agreements
router.get('/royalties', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { status, rightsHolder } = req.query;

    const query = {};
    if (status) query.status = status;
    if (rightsHolder) query['rightsHolder.entityId'] = rightsHolder;

    const royalties = await Royalty.find(query)
      .populate('contentIds', 'title thumbnail')
      .sort('-agreement.startDate');

    res.json({ success: true, royalties, count: royalties.length });
  } catch (error) {
    logger.error('Failed to fetch royalties', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch royalties' });
  }
});

// Get expiring royalties
router.get('/royalties/expiring', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { days = 90 } = req.query;

    const royalties = await Royalty.findExpiring(parseInt(days));

    res.json({ success: true, royalties, count: royalties.length });
  } catch (error) {
    logger.error('Failed to fetch expiring royalties', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch royalties' });
  }
});

// Calculate royalty
router.post('/royalties/calculate', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { licenseId, revenueData } = req.body;

    const royalty = await Royalty.findById(licenseId);
    if (!royalty) {
      return res.status(404).json({ success: false, error: 'Royalty not found' });
    }

    const calculation = await royalty.calculateRoyalty(revenueData);

    res.json({ success: true, calculation });
  } catch (error) {
    logger.error('Royalty calculation failed', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to calculate royalty' });
  }
});

// ============================================
// SPONSORSHIPS
// ============================================

// Get sponsorships
router.get('/sponsorships', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { status, channelId } = req.query;

    let sponsorships;
    if (channelId) {
      sponsorships = await Sponsorship.findByChannel(channelId);
    } else {
      sponsorships = await Sponsorship.find(status ? { status } : {})
        .populate('association.channel', 'name logo')
        .sort('-createdAt');
    }

    res.json({ success: true, sponsorships, count: sponsorships.length });
  } catch (error) {
    logger.error('Failed to fetch sponsorships', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch sponsorships' });
  }
});

// Get active sponsorships
router.get('/sponsorships/active', authenticate, async (req, res) => {
  try {
    const sponsorships = await Sponsorship.findActive()
      .populate('association.channel', 'name logo')
      .populate('association.program', 'title');

    res.json({ success: true, sponsorships, count: sponsorships.length });
  } catch (error) {
    logger.error('Failed to fetch active sponsorships', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to fetch sponsorships' });
  }
});

module.exports = router;
