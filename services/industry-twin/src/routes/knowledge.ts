import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { DomainKnowledge, KnowledgeCategory } from '../models/DomainKnowledge';
import { IndustryType } from '../models/IndustryProfile';

const router = Router();

// Validation schemas
const createKnowledgeSchema = z.object({
  industryType: z.enum(['restaurant', 'hotel', 'healthcare', 'retail', 'manufacturing', 'fintech']),
  category: z.enum(['operations', 'customer_service', 'marketing', 'finance', 'hr', 'technology', 'compliance', 'strategy']),
  title: z.string().min(1),
  description: z.string().min(1),
  concepts: z.array(z.object({
    term: z.string(),
    definition: z.string(),
    examples: z.array(z.string()).optional(),
    relatedTerms: z.array(z.string()).optional(),
    importance: z.enum(['basic', 'intermediate', 'advanced']).optional()
  })).optional(),
  terminology: z.array(z.object({
    term: z.string(),
    industrySpecific: z.boolean().optional(),
    definition: z.string(),
    usage: z.string().optional(),
    synonyms: z.array(z.string()).optional()
  })).optional(),
  workflows: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    steps: z.array(z.object({
      order: z.number(),
      name: z.string(),
      description: z.string().optional(),
      duration: z.string().optional(),
      responsible: z.string().optional()
    })).optional(),
    inputs: z.array(z.string()).optional(),
    outputs: z.array(z.string()).optional(),
    failurePoints: z.array(z.string()).optional()
  })).optional(),
  keyMetrics: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    targetValue: z.string().optional()
  })).optional(),
  tools: z.array(z.object({
    name: z.string(),
    purpose: z.string().optional(),
    alternatives: z.array(z.string()).optional()
  })).optional(),
  resources: z.array(z.object({
    title: z.string(),
    type: z.enum(['article', 'video', 'course', 'template']).optional(),
    url: z.string().optional(),
    description: z.string().optional()
  })).optional(),
  tags: z.array(z.string()).optional()
});

// Get all domain knowledge for an industry
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { industryType, category } = req.query;

    let query: any = { tenantId };

    if (industryType) {
      query.industryType = industryType;
    }

    if (category) {
      query.category = category;
    }

    const knowledge = await DomainKnowledge.find(query);

    res.json({
      success: true,
      data: knowledge,
      count: knowledge.length
    });
  } catch (error) {
    console.error('Error fetching domain knowledge:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get domain knowledge by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { id } = req.params;

    const knowledge = await DomainKnowledge.findOne({ _id: id, tenantId });

    if (!knowledge) {
      return res.status(404).json({
        success: false,
        error: 'Domain knowledge not found'
      });
    }

    res.json({
      success: true,
      data: knowledge
    });
  } catch (error) {
    console.error('Error fetching domain knowledge:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get domain knowledge by category
router.get('/category/:industryType/:category', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { industryType, category } = req.params;

    const knowledge = await DomainKnowledge.findByCategory(
      tenantId,
      industryType as IndustryType,
      category as KnowledgeCategory
    );

    res.json({
      success: true,
      data: knowledge,
      count: knowledge.length
    });
  } catch (error) {
    console.error('Error fetching domain knowledge by category:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Search domain knowledge
router.get('/search/:industryType', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { industryType } = req.params;
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Search query (q) is required'
      });
    }

    const knowledge = await DomainKnowledge.searchByTerm(
      tenantId,
      industryType as IndustryType,
      q
    );

    res.json({
      success: true,
      data: knowledge,
      count: knowledge.length,
      query: q
    });
  } catch (error) {
    console.error('Error searching domain knowledge:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Create domain knowledge
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const validationResult = createKnowledgeSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validationResult.error.errors
      });
    }

    const knowledge = new DomainKnowledge({
      tenantId,
      ...validationResult.data
    });

    await knowledge.save();

    res.status(201).json({
      success: true,
      data: knowledge
    });
  } catch (error) {
    console.error('Error creating domain knowledge:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update domain knowledge
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { id } = req.params;

    const validationResult = createKnowledgeSchema.partial().safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validationResult.error.errors
      });
    }

    const knowledge = await DomainKnowledge.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: validationResult.data },
      { new: true, runValidators: true }
    );

    if (!knowledge) {
      return res.status(404).json({
        success: false,
        error: 'Domain knowledge not found'
      });
    }

    res.json({
      success: true,
      data: knowledge
    });
  } catch (error) {
    console.error('Error updating domain knowledge:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Delete domain knowledge
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { id } = req.params;

    const result = await DomainKnowledge.deleteOne({ _id: id, tenantId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Domain knowledge not found'
      });
    }

    res.json({
      success: true,
      message: 'Domain knowledge deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting domain knowledge:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get knowledge categories
router.get('/meta/categories', (req: Request, res: Response) => {
  const categories = [
    { id: 'operations', name: 'Operations', description: 'Day-to-day operational processes' },
    { id: 'customer_service', name: 'Customer Service', description: 'Customer interaction and support' },
    { id: 'marketing', name: 'Marketing', description: 'Marketing strategies and campaigns' },
    { id: 'finance', name: 'Finance', description: 'Financial management and accounting' },
    { id: 'hr', name: 'Human Resources', description: 'Employee management and policies' },
    { id: 'technology', name: 'Technology', description: 'Tech stack and digital tools' },
    { id: 'compliance', name: 'Compliance', description: 'Regulatory and legal requirements' },
    { id: 'strategy', name: 'Strategy', description: 'Business strategy and planning' }
  ];

  res.json({
    success: true,
    data: categories
  });
});

export default router;
