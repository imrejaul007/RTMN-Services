import express from 'express';
import { companyRegistry } from '../index.js';

const router = express.Router();

/**
 * GET /api/capabilities
 * List all capabilities across companies
 */
router.get('/', async (req, res) => {
  try {
    const { industry, type } = req.query;

    const allCapabilities = [];

    for (const company of companyRegistry.values()) {
      if (industry && company.industry !== industry) continue;

      for (const cap of company.capabilities) {
        if (type && cap.type !== type) continue;

        allCapabilities.push({
          ...cap,
          companyId: company.id,
          companyName: company.name,
          industry: company.industry
        });
      }
    }

    res.json({
      success: true,
      count: allCapabilities.length,
      capabilities: allCapabilities
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/capabilities
 * Add capability to company
 */
router.post('/', async (req, res) => {
  try {
    const { companyId, capability } = req.body;

    const company = companyRegistry.get(companyId);
    if (!company) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    const newCapability = {
      id: `${company.industry}_${capability.name.toLowerCase().replace(/\s+/g, '_')}`,
      ...capability,
      createdAt: new Date().toISOString()
    };

    company.capabilities.push(newCapability);
    companyRegistry.set(companyId, company);

    res.status(201).json({
      success: true,
      capability: newCapability
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/capabilities/:id
 * Get capability details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    for (const company of companyRegistry.values()) {
      const cap = company.capabilities.find(c => c.id === id);
      if (cap) {
        return res.json({
          success: true,
          capability: {
            ...cap,
            companyId: company.id,
            companyName: company.name
          }
        });
      }
    }

    res.status(404).json({
      success: false,
      error: 'Capability not found'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
