import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { marketplaceService } from '../services';

const router = Router();

// Validation schemas
const CreateAgentSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(10).max(2000),
  industry: z.string(),
  category: z.string(),
  slug: z.string().optional(),
  tagline: z.string().max(200).optional(),
  longDescription: z.string().max(10000).optional(),
  icon: z.string().url().optional(),
  screenshots: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
  capabilities: z.array(z.any()).optional(),
  integrations: z.array(z.any()).optional(),
  pricing: z.array(z.any()).optional(),
  pricingModel: z.enum(['free', 'freemium', 'paid', 'custom']).optional()
});

const InstallAgentSchema = z.object({
  config: z.record(z.any()).optional(),
  tier: z.enum(['free', 'starter', 'professional', 'enterprise']).default('starter')
});

// ============ MARKETPLACE ============

// Get marketplace stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await marketplaceService.getMarketplaceStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search agents
router.get('/agents', async (req: Request, res: Response) => {
  try {
    const {
      q,
      industry,
      category,
      tags,
      pricing_model,
      featured,
      trending,
      limit,
      offset
    } = req.query;

    const result = await marketplaceService.searchAgents({
      query: q as string,
      industry: industry as string,
      category: category as string,
      tags: tags ? (tags as string).split(',') : undefined,
      pricingModel: pricing_model as string,
      featured: featured === 'true' ? true : undefined,
      trending: trending === 'true' ? true : undefined,
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0
    });

    res.json({
      success: true,
      data: {
        agents: result.agents,
        total: result.total,
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get featured agents
router.get('/agents/featured', async (req: Request, res: Response) => {
  try {
    const result = await marketplaceService.searchAgents({ featured: true, limit: 10 });
    res.json({ success: true, data: result.agents });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get trending agents
router.get('/agents/trending', async (req: Request, res: Response) => {
  try {
    const result = await marketplaceService.searchAgents({ trending: true, limit: 10 });
    res.json({ success: true, data: result.agents });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get new agents
router.get('/agents/new', async (req: Request, res: Response) => {
  try {
    const result = await marketplaceService.searchAgents({ limit: 10 });
    res.json({ success: true, data: result.agents });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get agents by industry
router.get('/agents/industry/:industry', async (req: Request, res: Response) => {
  try {
    const result = await marketplaceService.searchAgents({
      industry: req.params.industry,
      limit: 50
    });
    res.json({ success: true, data: result.agents });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get agents by category
router.get('/agents/category/:category', async (req: Request, res: Response) => {
  try {
    const result = await marketplaceService.searchAgents({
      category: req.params.category,
      limit: 50
    });
    res.json({ success: true, data: result.agents });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get agent by slug
router.get('/agents/slug/:slug', async (req: Request, res: Response) => {
  try {
    const agent = await marketplaceService.getAgentBySlug(req.params.slug);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    res.json({ success: true, data: agent });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get agent by ID
router.get('/agents/:id', async (req: Request, res: Response) => {
  try {
    const agent = await marketplaceService.getAgentById(req.params.id);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    res.json({ success: true, data: agent });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create agent (vendor)
router.post('/agents', async (req: Request, res: Response) => {
  try {
    const vendorId = req.headers['x-vendor-id'] as string;
    const vendorName = req.headers['x-vendor-name'] as string;

    if (!vendorId) {
      return res.status(401).json({ success: false, error: 'Vendor ID required' });
    }

    const validation = CreateAgentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.errors });
    }

    const agent = await marketplaceService.createAgent({
      ...validation.data,
      vendorId,
      vendorName: vendorName || 'Unknown'
    });

    res.status(201).json({ success: true, data: agent });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update agent
router.put('/agents/:id', async (req: Request, res: Response) => {
  try {
    const vendorId = req.headers['x-vendor-id'] as string;
    const agent = await marketplaceService.updateAgent(req.params.id, req.body);

    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    res.json({ success: true, data: agent });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete agent
router.delete('/agents/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await marketplaceService.deleteAgent(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    res.json({ success: true, message: 'Agent deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Publish agent
router.post('/agents/:id/publish', async (req: Request, res: Response) => {
  try {
    const agent = await marketplaceService.publishAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    res.json({ success: true, data: agent });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Archive agent
router.post('/agents/:id/archive', async (req: Request, res: Response) => {
  try {
    const agent = await marketplaceService.archiveAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    res.json({ success: true, data: agent });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ INSTALLATIONS ============

// Install agent
router.post('/agents/:id/install', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    if (!tenantId || !userId) {
      return res.status(401).json({ success: false, error: 'Tenant ID and User ID required' });
    }

    const validation = InstallAgentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.errors });
    }

    const instance = await marketplaceService.installAgent(
      req.params.id,
      tenantId,
      userId,
      validation.data.config || {},
      validation.data.tier
    );

    res.status(201).json({ success: true, data: instance });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get tenant installations
router.get('/installations', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { status, limit, offset } = req.query;

    const result = await marketplaceService.getInstancesByTenant(tenantId, {
      status: status as string,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get installation by ID
router.get('/installations/:id', async (req: Request, res: Response) => {
  try {
    const instance = await marketplaceService.getInstance(req.params.id);
    if (!instance) {
      return res.status(404).json({ success: false, error: 'Installation not found' });
    }
    res.json({ success: true, data: instance });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update installation
router.put('/installations/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const instance = await marketplaceService.getInstance(req.params.id);

    if (!instance || instance.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Installation not found' });
    }

    const updated = await marketplaceService.updateInstance(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Uninstall agent
router.delete('/installations/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const instance = await marketplaceService.getInstance(req.params.id);

    if (!instance || instance.tenantId !== tenantId) {
      return res.status(404).json({ success: false, error: 'Installation not found' });
    }

    await marketplaceService.uninstallAgent(req.params.id);
    res.json({ success: true, message: 'Agent uninstalled' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Track usage
router.post('/installations/:id/usage', async (req: Request, res: Response) => {
  try {
    const { type } = req.body;
    if (!['conversations', 'messages', 'apiCalls'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid usage type' });
    }

    await marketplaceService.trackUsage(req.params.id, type);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ REVIEWS ============

// Get agent reviews
router.get('/agents/:id/reviews', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = req.query;
    const result = await marketplaceService.getReviews(req.params.id, {
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add review
router.post('/agents/:id/reviews', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const tenantId = req.headers['x-tenant-id'] as string;
    const { rating, title, comment, pros, cons } = req.body;

    if (!userId || !tenantId) {
      return res.status(401).json({ success: false, error: 'User and Tenant ID required' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be 1-5' });
    }

    const review = await marketplaceService.addReview({
      agentId: req.params.id,
      userId,
      tenantId,
      rating,
      title,
      comment,
      pros,
      cons
    });

    res.status(201).json({ success: true, data: review });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark review helpful
router.post('/reviews/:id/helpful', async (req: Request, res: Response) => {
  try {
    await marketplaceService.markReviewHelpful(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
