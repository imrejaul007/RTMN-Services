import { Router, Request, Response } from 'express';
import { Template } from '../models/Template';

const router = Router();

// Create template
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, channel, subject, body, variables, metadata, isActive } = req.body;

    if (!name || !channel || !body) {
      return res.status(400).json({ error: 'Missing required fields: name, channel, body' });
    }

    const existing = await Template.findOne({ name, channel });
    if (existing) {
      return res.status(409).json({ error: 'Template already exists for this name and channel' });
    }

    const template = new Template({
      name,
      channel,
      subject: subject || '',
      body,
      variables: variables || [],
      metadata: metadata || {},
      isActive: isActive !== undefined ? isActive : true
    });

    await template.save();
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Get all templates
router.get('/', async (req: Request, res: Response) => {
  try {
    const { channel, isActive, search } = req.query;

    const query: any = {};
    if (channel) query.channel = channel;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { body: { $regex: search, $options: 'i' } }
      ];
    }

    const templates = await Template.find(query).sort({ name: 1 });
    res.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get template by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Get template by name
router.get('/name/:name', async (req: Request, res: Response) => {
  try {
    const { channel } = req.query;
    const query: any = { name: req.params.name };
    if (channel) query.channel = channel;

    const template = await Template.findOne(query);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Update template
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, channel, subject, body, variables, metadata, isActive } = req.body;

    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (name) template.name = name;
    if (channel) template.channel = channel;
    if (subject !== undefined) template.subject = subject;
    if (body) template.body = body;
    if (variables) template.variables = variables;
    if (metadata) template.metadata = metadata;
    if (isActive !== undefined) template.isActive = isActive;

    await template.save();
    res.json(template);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Preview template with variables
router.post('/:id/preview', async (req: Request, res: Response) => {
  try {
    const { variables } = req.body;

    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const missing = template.validateVariables(variables || {});
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing variables: ${missing.join(', ')}` });
    }

    const rendered = template.render(variables || {});
    res.json({
      original: { subject: template.subject, body: template.body },
      rendered,
      variables
    });
  } catch (error) {
    console.error('Error previewing template:', error);
    res.status(500).json({ error: 'Failed to preview template' });
  }
});

// Validate template variables
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { variables, required } = req.body;

    if (!required || !Array.isArray(required)) {
      return res.status(400).json({ error: 'Missing required array of variable names' });
    }

    const missing = required.filter(v => !variables || !(v in variables));
    res.json({
      valid: missing.length === 0,
      provided: Object.keys(variables || {}),
      required,
      missing
    });
  } catch (error) {
    console.error('Error validating variables:', error);
    res.status(500).json({ error: 'Failed to validate variables' });
  }
});

// Delete template
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const template = await Template.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ message: 'Template deleted', template });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export { router as templateRoutes };
