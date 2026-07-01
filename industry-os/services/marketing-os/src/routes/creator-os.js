/**
 * CreatorOS Routes
 * Phase 4: Creator Marketplace, Twins, Contracts, Payments, UGC
 * Date: July 2, 2026
 */

const express = require('express');
const router = express.Router();
const { creatorOS } = require('../modules/creator-os');
const logger = require('../config/logger');

// ============================================
// CREATOR MANAGEMENT
// ============================================

// Register creator
router.post('/creators', async (req, res) => {
  try {
    const result = await creatorOS.registerCreator(req.body);
    res.status(result.success ? 201 : 500).json(result);
  } catch (error) {
    logger.error('Creator registration error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get creators (with filters)
router.get('/creators', async (req, res) => {
  try {
    const { category, minFollowers, maxRate, platform, verified, page, limit } = req.query;
    const result = await creatorOS.getCreators({
      category, minFollowers, maxRate, platform, verified, page, limit
    });
    res.json(result);
  } catch (error) {
    logger.error('Get creators error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single creator
router.get('/creators/:id', async (req, res) => {
  try {
    const result = await creatorOS.getCreator(req.params.id);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    logger.error('Get creator error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update creator
router.patch('/creators/:id', async (req, res) => {
  try {
    const result = await creatorOS.updateCreator(req.params.id, req.body);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    logger.error('Update creator error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get creator twin
router.get('/creators/:id/twin', async (req, res) => {
  try {
    const result = await creatorOS.getCreatorTwin(req.params.id);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    logger.error('Get creator twin error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get creator stats
router.get('/creators/:id/stats', async (req, res) => {
  try {
    const result = await creatorOS.getCreatorStats(req.params.id);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    logger.error('Get creator stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get creator earnings
router.get('/creators/:id/earnings', async (req, res) => {
  try {
    const result = await creatorOS.getCreatorEarnings(req.params.id);
    res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    logger.error('Get creator earnings error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// CAMPAIGN MANAGEMENT
// ============================================

// Create creator campaign
router.post('/creator-campaigns', async (req, res) => {
  try {
    const result = await creatorOS.createCampaign(req.body);
    res.status(result.success ? 201 : 500).json(result);
  } catch (error) {
    logger.error('Create campaign error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get creator campaigns
router.get('/creator-campaigns', async (req, res) => {
  try {
    const { creatorOS } = require('../modules/creator-os');
    const { CreatorCampaign } = require('../modules/creator-os');
    const campaigns = await CreatorCampaign.find()
      .sort('-createdAt')
      .limit(50);
    res.json({ success: true, data: campaigns });
  } catch (error) {
    logger.error('Get campaigns error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single campaign
router.get('/creator-campaigns/:id', async (req, res) => {
  try {
    const { CreatorCampaign } = require('../modules/creator-os');
    const campaign = await CreatorCampaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    res.json({ success: true, data: campaign });
  } catch (error) {
    logger.error('Get campaign error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Match creators to campaign
router.post('/creator-campaigns/:id/match', async (req, res) => {
  try {
    const result = await creatorOS.matchCreatorsToCampaign(req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('Match creators error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get campaign matched creators
router.get('/creator-campaigns/:id/creators', async (req, res) => {
  try {
    const result = await creatorOS.matchCreatorsToCampaign(req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('Get matched creators error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get campaign analytics
router.get('/creator-campaigns/:id/analytics', async (req, res) => {
  try {
    const result = await creatorOS.getCampaignAnalytics(req.params.id);
    res.json(result);
  } catch (error) {
    logger.error('Get campaign analytics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// CONTRACT MANAGEMENT
// ============================================

// Create contract
router.post('/contracts', async (req, res) => {
  try {
    const { campaignId, creatorId, terms } = req.body;
    const result = await creatorOS.createContract(campaignId, creatorId, terms);
    res.status(result.success ? 201 : 500).json(result);
  } catch (error) {
    logger.error('Create contract error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get contracts
router.get('/contracts', async (req, res) => {
  try {
    const { creatorId, campaignId, status } = req.query;
    const { Contract } = require('../modules/creator-os');
    const query = {};
    if (creatorId) query.creatorId = creatorId;
    if (campaignId) query.campaignId = campaignId;
    if (status) query.status = status;

    const contracts = await Contract.find(query)
      .sort('-createdAt')
      .limit(50);
    res.json({ success: true, data: contracts });
  } catch (error) {
    logger.error('Get contracts error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single contract
router.get('/contracts/:id', async (req, res) => {
  try {
    const { Contract } = require('../modules/creator-os');
    const contract = await Contract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }
    res.json({ success: true, data: contract });
  } catch (error) {
    logger.error('Get contract error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sign contract
router.post('/contracts/:id/sign', async (req, res) => {
  try {
    const { signer, signature } = req.body;
    const result = await creatorOS.signContract(req.params.id, signer, signature);
    res.json(result);
  } catch (error) {
    logger.error('Sign contract error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Submit deliverable
router.post('/contracts/:id/deliverables', async (req, res) => {
  try {
    const result = await creatorOS.submitDeliverable(req.params.id, req.body);
    res.status(result.success ? 201 : 500).json(result);
  } catch (error) {
    logger.error('Submit deliverable error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// UGC MANAGEMENT
// ============================================

// Get UGC
router.get('/ugc', async (req, res) => {
  try {
    const { creatorId, campaignId, status, page = 1, limit = 20 } = req.query;
    const { UGC } = require('../modules/creator-os');
    const query = {};
    if (creatorId) query.creatorId = creatorId;
    if (campaignId) query.campaignId = campaignId;
    if (status) query.status = status;

    const ugcs = await UGC.find(query)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await UGC.countDocuments(query);

    res.json({ success: true, data: ugcs, total, page: parseInt(page) });
  } catch (error) {
    logger.error('Get UGC error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Approve UGC
router.post('/ugc/:id/approve', async (req, res) => {
  try {
    const { feedback } = req.body;
    const result = await creatorOS.approveDeliverable(req.params.id, feedback);
    res.json(result);
  } catch (error) {
    logger.error('Approve UGC error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// PAYMENT MANAGEMENT
// ============================================

// Process payment
router.post('/creator-payments', async (req, res) => {
  try {
    const { contractId, milestoneId } = req.body;
    const result = await creatorOS.processPayment(contractId, milestoneId);
    res.status(result.success ? 201 : 500).json(result);
  } catch (error) {
    logger.error('Process payment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get creator payments
router.get('/creator-payments/:creatorId', async (req, res) => {
  try {
    const { Payment } = require('../modules/creator-os');
    const payments = await Payment.find({ creatorId: req.params.creatorId })
      .sort('-createdAt')
      .limit(50);
    res.json({ success: true, data: payments });
  } catch (error) {
    logger.error('Get payments error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get pending payouts
router.get('/creator-payments/pending/:creatorId', async (req, res) => {
  try {
    const { Payment } = require('../modules/creator-os');
    const pending = await Payment.find({
      creatorId: req.params.creatorId,
      status: 'processing'
    });
    res.json({ success: true, data: pending });
  } catch (error) {
    logger.error('Get pending payouts error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
