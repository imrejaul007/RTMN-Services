import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
const templates = new Map();

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, category, prompt, variables } = req.body;
    const template = { id: `tmpl_${Date.now()}`, name, description, category, prompt, variables, usageCount: 0, createdAt: new Date() };
    templates.set(template.id, template);
    res.status(201).json(template);
  } catch (error) { logger.error('Error creating template:', error); res.status(500).json({ error: 'Failed to create template' }); }
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.query;
    const all = Array.from(templates.values());
    const filtered = category ? all.filter(t => t.category === category) : all;
    res.json({ templates: filtered, total: filtered.length });
  } catch (error) { logger.error('Error listing templates:', error); res.status(500).json({ error: 'Failed to list templates' }); }
});

router.post('/:id/use', async (req: AuthRequest, res: Response) => {
  try {
    const template = templates.get(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    template.usageCount++;
    res.json({ templateId: template.id, prompt: template.prompt, variables: template.variables });
  } catch (error) { logger.error('Error using template:', error); res.status(500).json({ error: 'Failed to use template' }); }
});

export default router;
