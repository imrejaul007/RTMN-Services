import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { templateService } from '../services';

const router = Router();

// Validation schemas
const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.enum(['welcome', 'onboarding', 'support', 'marketing', 'order', 'appointment', 'feedback', 'notification', 'custom']),
  industry: z.enum(['banking', 'healthcare', 'restaurant', 'retail', 'travel', 'hr', 'ecommerce', 'general']).default('general'),
  flows: z.array(z.any()),
  variables: z.array(z.object({
    name: z.string(),
    type: z.string(),
    required: z.boolean().optional(),
    description: z.string().optional(),
    example: z.string().optional()
  })).optional(),
  isPublic: z.boolean().optional()
});

// List templates
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, industry, search, limit, offset } = req.query;

    const result = await templateService.getTemplates({
      category: category as string,
      industry: industry as string,
      search: search as string,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0
    });

    res.json({
      success: true,
      data: {
        templates: result.templates,
        total: result.total,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search templates
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ success: false, error: 'Search query required' });
    }

    const templates = await templateService.searchTemplates(q as string);

    res.json({ success: true, data: templates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get templates by category
router.get('/category/:category', async (req: Request, res: Response) => {
  try {
    const templates = await templateService.getTemplatesByCategory(req.params.category);
    res.json({ success: true, data: templates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get templates by industry
router.get('/industry/:industry', async (req: Request, res: Response) => {
  try {
    const templates = await templateService.getTemplatesByIndustry(req.params.industry);
    res.json({ success: true, data: templates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get template by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const template = await templateService.getTemplateById(req.params.id);

    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create template
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    const validation = CreateTemplateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: validation.error.errors });
    }

    const template = await templateService.createTemplate({
      ...validation.data,
      createdBy: userId
    });

    res.status(201).json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update template
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const template = await templateService.updateTemplate(req.params.id, req.body);

    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete template
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await templateService.deleteTemplate(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    res.json({ success: true, message: 'Template deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Duplicate template
router.post('/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { name } = req.body;

    const template = await templateService.duplicateTemplate(req.params.id, userId, name);

    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    res.status(201).json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create bot from template
router.post('/:id/create-bot', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { botName } = req.body;

    if (!botName) {
      return res.status(400).json({ success: false, error: 'Bot name required' });
    }

    const { botService } = await import('../services');
    const bot = await botService.createFromTemplate(
      req.params.id,
      tenantId,
      userId,
      botName
    );

    if (!bot) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    res.status(201).json({ success: true, data: bot });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
