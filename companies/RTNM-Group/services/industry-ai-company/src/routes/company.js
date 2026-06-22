import express from 'express';
import { companyRegistry, INDUSTRIES, COMPANY_TYPES } from '../index.js';

const router = express.Router();

/**
 * GET /api/companies
 * List all AI companies
 */
router.get('/', async (req, res) => {
  try {
    const { industry, status, type } = req.query;

    let companies = Array.from(companyRegistry.values());

    if (industry) companies = companies.filter(c => c.industry === industry);
    if (status) companies = companies.filter(c => c.status === status);
    if (type) companies = companies.filter(c => c.type === type);

    res.json({
      success: true,
      count: companies.length,
      companies
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/companies/industries
 * List all supported industries
 */
router.get('/industries', async (req, res) => {
  res.json({
    success: true,
    count: INDUSTRIES.length,
    industries: INDUSTRIES
  });
});

/**
 * GET /api/companies/:id
 * Get company details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const company = companyRegistry.get(id);

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    res.json({
      success: true,
      company
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/companies/:id
 * Update company
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const company = companyRegistry.get(id);
    if (!company) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    const updated = { ...company, ...updates, updatedAt: new Date().toISOString() };
    companyRegistry.set(id, updated);

    res.json({
      success: true,
      company: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/companies/:id/structure
 * Get company structure
 */
router.get('/:id/structure', async (req, res) => {
  try {
    const { id } = req.params;
    const company = companyRegistry.get(id);

    if (!company) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    res.json({
      success: true,
      structure: {
        departments: company.departments,
        capabilities: company.capabilities
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
