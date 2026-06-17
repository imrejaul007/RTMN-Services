/**
 * Intelligence Routes - AI company research endpoints
 */

import express from 'express';
import { generateCompanyReport, performResearch, getCompanySignals, getCompetitorAnalysis, getBuyingSignals, getTechnologyInsights } from '../services/intelligenceService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /intelligence/company
 * Generate full company report
 */
router.post('/company', async (req, res) => {
  try {
    const { companyName } = req.body;

    if (!companyName) {
      return res.status(400).json({
        success: false,
        error: 'companyName is required'
      });
    }

    const report = await generateCompanyReport(companyName);

    res.json({
      success: true,
      ...report
    });
  } catch (error) {
    logger.error('Company report error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to generate company report',
      message: error.message
    });
  }
});

/**
 * POST /intelligence/research
 * Perform AI research on company
 */
router.post('/research', async (req, res) => {
  try {
    const { companyName, topics } = req.body;

    if (!companyName) {
      return res.status(400).json({
        success: false,
        error: 'companyName is required'
      });
    }

    const research = await performResearch(companyName, topics);

    res.json({
      success: true,
      ...research
    });
  } catch (error) {
    logger.error('AI research error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Research failed',
      message: error.message
    });
  }
});

/**
 * GET /intelligence/signals/:companyId
 * Get company signals
 */
router.get('/signals/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const result = await getCompanySignals(companyId);

    res.json(result);
  } catch (error) {
    logger.error('Get signals error', { error: error.message, companyId: req.params.companyId });
    res.status(500).json({
      success: false,
      error: 'Failed to get company signals',
      message: error.message
    });
  }
});

/**
 * GET /intelligence/competitors/:companyId
 * Get competitor analysis
 */
router.get('/competitors/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const result = await getCompetitorAnalysis(companyId);

    res.json(result);
  } catch (error) {
    logger.error('Competitor analysis error', { error: error.message, companyId: req.params.companyId });
    res.status(500).json({
      success: false,
      error: 'Failed to get competitor analysis',
      message: error.message
    });
  }
});

/**
 * GET /intelligence/buying-signals/:companyName
 * Get buying signals for company
 */
router.get('/buying-signals/:companyName', async (req, res) => {
  try {
    const { companyName } = req.params;
    const result = await getBuyingSignals(companyName);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Buying signals error', { error: error.message, companyName: req.params.companyName });
    res.status(500).json({
      success: false,
      error: 'Failed to get buying signals',
      message: error.message
    });
  }
});

/**
 * GET /intelligence/technology/:companyName
 * Get technology insights for company
 */
router.get('/technology/:companyName', async (req, res) => {
  try {
    const { companyName } = req.params;
    const result = await getTechnologyInsights(companyName);

    res.json(result);
  } catch (error) {
    logger.error('Technology insights error', { error: error.message, companyName: req.params.companyName });
    res.status(500).json({
      success: false,
      error: 'Failed to get technology insights',
      message: error.message
    });
  }
});

export default router;
