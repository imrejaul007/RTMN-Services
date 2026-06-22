import express from 'express';
import { merchantService } from '../services/merchantService.js';
import { verifyApiKey } from '../middleware/apiAuth.js';

const router = express.Router();

// All routes require API key authentication
router.use(verifyApiKey);

// ============================================================================
// MERCHANT
// ============================================================================

// Get current merchant
router.get('/merchant', async (req, res) => {
  try {
    const merchant = await merchantService.getMerchantByTenantId(req.tenantId);
    if (!merchant) {
      return res.status(404).json({ success: false, error: 'Merchant not found' });
    }
    res.json({ success: true, data: merchant });
  } catch (error) {
    console.error('[Merchant Routes] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Update merchant
router.patch('/merchant', async (req, res) => {
  try {
    const merchant = await merchantService.updateMerchant(req.tenantId, req.body);
    if (!merchant) {
      return res.status(404).json({ success: false, error: 'Merchant not found' });
    }
    res.json({ success: true, data: merchant });
  } catch (error) {
    console.error('[Merchant Routes] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await merchantService.getStats(req.tenantId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('[Merchant Routes] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// KNOWLEDGE BASE
// ============================================================================

// Get all knowledge base items
router.get('/knowledge', async (req, res) => {
  try {
    const merchant = await merchantService.getMerchantByTenantId(req.tenantId);
    if (!merchant) {
      return res.status(404).json({ success: false, error: 'Merchant not found' });
    }

    const items = await merchantService.getKnowledgeBase(merchant.id);
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('[Merchant Routes] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Add knowledge base item
router.post('/knowledge', async (req, res) => {
  try {
    const merchant = await merchantService.getMerchantByTenantId(req.tenantId);
    if (!merchant) {
      return res.status(404).json({ success: false, error: 'Merchant not found' });
    }

    const item = await merchantService.addKnowledgeItem({
      tenantId: req.tenantId,
      merchantId: merchant.id,
      category: req.body.category || 'general',
      question: req.body.question,
      answer: req.body.answer,
      keywords: req.body.keywords || [],
      intents: req.body.intents || []
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error('[Merchant Routes] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Update knowledge base item
router.patch('/knowledge/:id', async (req, res) => {
  try {
    const item = await merchantService.updateKnowledgeItem(req.params.id, req.tenantId, req.body);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Knowledge item not found' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('[Merchant Routes] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Delete knowledge base item
router.delete('/knowledge/:id', async (req, res) => {
  try {
    const deleted = await merchantService.deleteKnowledgeItem(req.params.id, req.tenantId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Knowledge item not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[Merchant Routes] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Search knowledge base
router.get('/knowledge/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
    }

    const merchant = await merchantService.getMerchantByTenantId(req.tenantId);
    if (!merchant) {
      return res.status(404).json({ success: false, error: 'Merchant not found' });
    }

    const items = await merchantService.searchKnowledge(merchant.id, q);
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('[Merchant Routes] Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
