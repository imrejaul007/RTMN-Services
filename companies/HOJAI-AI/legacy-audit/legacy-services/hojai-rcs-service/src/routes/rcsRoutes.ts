import { Router, Request, Response } from 'express';
import { rcsService } from '../services';

const router = Router();

// ============ MESSAGES ============

// Send text
router.post('/send/text', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { to, text, brandId, brandName } = req.body;

    if (!to || !text) {
      return res.status(400).json({ success: false, error: 'to and text required' });
    }

    const result = await rcsService.sendText(to, text, { tenantId, brandId, brandName });
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send card
router.post('/send/card', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { to, card, brandId, brandName } = req.body;

    if (!to || !card) {
      return res.status(400).json({ success: false, error: 'to and card required' });
    }

    const result = await rcsService.sendCard(to, card, { tenantId, brandId, brandName });
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send carousel
router.post('/send/carousel', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { to, cards, brandId, brandName } = req.body;

    if (!to || !cards || !Array.isArray(cards)) {
      return res.status(400).json({ success: false, error: 'to and cards array required' });
    }

    const result = await rcsService.sendCarousel(to, cards, { tenantId, brandId, brandName });
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send with suggestions
router.post('/send/suggestions', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { to, text, suggestions, brandId, brandName } = req.body;

    if (!to || !text || !suggestions) {
      return res.status(400).json({ success: false, error: 'to, text, and suggestions required' });
    }

    const result = await rcsService.sendWithSuggestions(to, text, suggestions, { tenantId, brandId, brandName });
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List messages
router.get('/messages', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { status, provider, limit, offset } = req.query;

    const result = await rcsService.listMessages(tenantId, {
      status: status as string,
      provider: provider as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get message
router.get('/messages/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const message = await rcsService.getMessage(req.params.id, tenantId);

    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    res.json({ success: true, data: message });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ BRANDS ============

// Create brand
router.post('/brands', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const brand = await rcsService.createBrand({ tenantId, ...req.body });
    res.status(201).json({ success: true, data: brand });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List brands
router.get('/brands', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const brands = await rcsService.listBrands(tenantId);
    res.json({ success: true, data: brands });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get brand
router.get('/brands/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const brand = await rcsService.getBrand(req.params.id, tenantId);

    if (!brand) {
      return res.status(404).json({ success: false, error: 'Brand not found' });
    }

    res.json({ success: true, data: brand });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ CAMPAIGNS ============

// Create campaign
router.post('/campaigns', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const campaign = await rcsService.createCampaign({ tenantId, ...req.body });
    res.status(201).json({ success: true, data: campaign });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List campaigns
router.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const campaigns = await rcsService.listCampaigns(tenantId);
    res.json({ success: true, data: campaigns });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get campaign
router.get('/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const campaign = await rcsService.getCampaign(req.params.id, tenantId);

    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    res.json({ success: true, data: campaign });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start campaign
router.post('/campaigns/:id/start', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const campaign = await rcsService.startCampaign(req.params.id, tenantId);

    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    res.json({ success: true, data: campaign });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ ANALYTICS ============

router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { brandId, provider, startDate, endDate } = req.query;

    const analytics = await rcsService.getAnalytics(tenantId, {
      brandId: brandId as string,
      provider: provider as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    });

    res.json({ success: true, data: analytics });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
