/**
 * Analytics Routes - Lead analytics and reporting endpoints
 */

import express from 'express';
import { getOverview, getPipeline, getOutreachMetrics, getConversionMetrics, getSourceAnalytics, getTeamPerformance, getTrends, generateReport } from '../services/analyticsService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /analytics/overview
 * Dashboard overview stats
 */
router.get('/overview', async (req, res) => {
  try {
    const result = await getOverview();

    res.json(result);
  } catch (error) {
    logger.error('Overview analytics error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics overview',
      message: error.message
    });
  }
});

/**
 * GET /analytics/pipeline
 * Pipeline analytics
 */
router.get('/pipeline', async (req, res) => {
  try {
    const result = await getPipeline();

    res.json(result);
  } catch (error) {
    logger.error('Pipeline analytics error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get pipeline analytics',
      message: error.message
    });
  }
});

/**
 * GET /analytics/outreach
 * Outreach metrics
 */
router.get('/outreach', async (req, res) => {
  try {
    const result = await getOutreachMetrics();

    res.json(result);
  } catch (error) {
    logger.error('Outreach analytics error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get outreach metrics',
      message: error.message
    });
  }
});

/**
 * GET /analytics/conversion
 * Conversion funnel metrics
 */
router.get('/conversion', async (req, res) => {
  try {
    const result = await getConversionMetrics();

    res.json(result);
  } catch (error) {
    logger.error('Conversion analytics error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get conversion metrics',
      message: error.message
    });
  }
});

/**
 * GET /analytics/sources
 * Lead source analytics
 */
router.get('/sources', async (req, res) => {
  try {
    const result = await getSourceAnalytics();

    res.json(result);
  } catch (error) {
    logger.error('Source analytics error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get source analytics',
      message: error.message
    });
  }
});

/**
 * GET /analytics/team
 * Team performance metrics
 */
router.get('/team', async (req, res) => {
  try {
    const result = await getTeamPerformance();

    res.json(result);
  } catch (error) {
    logger.error('Team analytics error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get team analytics',
      message: error.message
    });
  }
});

/**
 * GET /analytics/trends
 * Time-based trends
 */
router.get('/trends', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const result = await getTrends(period);

    res.json(result);
  } catch (error) {
    logger.error('Trends analytics error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get trends',
      message: error.message
    });
  }
});

/**
 * POST /analytics/report
 * Generate full analytics report
 */
router.post('/report', async (req, res) => {
  try {
    const { type = 'full' } = req.body;
    const result = await generateReport({ type });

    res.json(result);
  } catch (error) {
    logger.error('Report generation error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
      message: error.message
    });
  }
});

export default router;
