/**
 * IntelligenceOS Routes
 * Phase 5: Predictive AI, Churn, LTV, Conversion, Trends
 * Date: July 2, 2026
 */

const express = require('express');
const router = express.Router();
const intelligenceOS = require('../modules/intelligence-os');
const logger = require('../config/logger');

// ============================================
// PREDICTION ENDPOINTS
// ============================================

// Predict churn for customer
router.get('/predict/churn/:customerId', async (req, res) => {
  try {
    const result = await intelligenceOS.predictChurn(req.params.customerId);
    res.json(result);
  } catch (error) {
    logger.error('Churn prediction error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Batch predict churn for segment
router.post('/predict/churn/batch', async (req, res) => {
  try {
    const { customerIds } = req.body;
    if (!customerIds || !Array.isArray(customerIds)) {
      return res.status(400).json({ success: false, error: 'customerIds array required' });
    }
    const result = await intelligenceOS.batchPredictChurn(customerIds);
    res.json(result);
  } catch (error) {
    logger.error('Batch churn prediction error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Predict conversion for customer
router.get('/predict/conversion/:customerId', async (req, res) => {
  try {
    const { productId } = req.query;
    const result = await intelligenceOS.predictConversion(req.params.customerId, productId);
    res.json(result);
  } catch (error) {
    logger.error('Conversion prediction error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get next best action
router.get('/next-best-action/:customerId', async (req, res) => {
  try {
    const result = await intelligenceOS.getNextBestAction(req.params.customerId);
    res.json(result);
  } catch (error) {
    logger.error('Next best action error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// SEGMENT ANALYSIS
// ============================================

// Analyze all segments
router.get('/segments', async (req, res) => {
  try {
    const result = await intelligenceOS.analyzeSegments();
    res.json(result);
  } catch (error) {
    logger.error('Segment analysis error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// TREND DETECTION
// ============================================

// Detect trends
router.get('/trends', async (req, res) => {
  try {
    const { category, location, period } = req.query;
    const result = await intelligenceOS.detectTrends({ category, location, period });
    res.json(result);
  } catch (error) {
    logger.error('Trend detection error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
