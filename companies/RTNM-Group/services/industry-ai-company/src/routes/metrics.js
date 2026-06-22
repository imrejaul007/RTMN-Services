import express from 'express';
import { companyRegistry } from '../index.js';

const router = express.Router();

/**
 * GET /api/metrics
 * Get metrics overview
 */
router.get('/', async (req, res) => {
  try {
    const { companyId } = req.query;

    let companies = Array.from(companyRegistry.values());
    if (companyId) {
      companies = companies.filter(c => c.id === companyId);
    }

    const aggregated = {
      totalCompanies: companies.length,
      totalUsers: companies.reduce((sum, c) => sum + (c.metrics?.users || 0), 0),
      totalRequests: companies.reduce((sum, c) => sum + (c.metrics?.requests || 0), 0),
      avgUptime: calculateAvgUptime(companies),
      avgSatisfaction: calculateAvgSatisfaction(companies)
    };

    res.json({
      success: true,
      metrics: aggregated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function calculateAvgUptime(companies) {
  const uptimes = companies.map(c => c.metrics?.uptime || 100);
  return uptimes.length > 0
    ? (uptimes.reduce((a, b) => a + b, 0) / uptimes.length).toFixed(2)
    : 100;
}

function calculateAvgSatisfaction(companies) {
  const scores = companies.map(c => c.metrics?.satisfaction || 0);
  return scores.length > 0
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
    : 0;
}

/**
 * GET /api/metrics/:companyId
 * Get company metrics
 */
router.get('/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = companyRegistry.get(companyId);

    if (!company) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    res.json({
      success: true,
      companyId,
      metrics: company.metrics
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/metrics/:companyId
 * Update company metrics
 */
router.post('/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const updates = req.body;

    const company = companyRegistry.get(companyId);
    if (!company) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    company.metrics = { ...company.metrics, ...updates };
    companyRegistry.set(companyId, company);

    res.json({
      success: true,
      metrics: company.metrics
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
