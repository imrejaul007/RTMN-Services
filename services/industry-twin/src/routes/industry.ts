import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { IndustryProfile, IndustryType } from '../models/IndustryProfile';

const router = Router();

// Validation schemas
const createIndustryProfileSchema = z.object({
  tenantId: z.string().min(1),
  industryType: z.enum(['restaurant', 'hotel', 'healthcare', 'retail', 'manufacturing', 'fintech']),
  name: z.string().min(1),
  description: z.string().min(1),
  commonIssues: z.array(z.object({
    category: z.string(),
    description: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    solutions: z.array(z.string()).optional(),
    preventionTips: z.array(z.string()).optional()
  })).optional(),
  bestPractices: z.array(z.object({
    category: z.string(),
    title: z.string(),
    description: z.string(),
    implementationSteps: z.array(z.string()).optional(),
    expectedOutcome: z.string().optional(),
    keyMetrics: z.array(z.string()).optional()
  })).optional(),
  kpis: z.array(z.object({
    name: z.string(),
    description: z.string(),
    formula: z.string(),
    benchmark: z.number().optional(),
    unit: z.enum(['percentage', 'currency', 'count', 'days', 'hours']).optional(),
    category: z.enum(['efficiency', 'quality', 'growth', 'financial', 'customer']).optional()
  })).optional(),
  techRecommendations: z.array(z.object({
    category: z.string(),
    tools: z.array(z.string()),
    description: z.string().optional(),
    priority: z.enum(['essential', 'recommended', 'optional']).optional()
  })).optional(),
  maturityLevel: z.enum(['emerging', 'developing', 'established', 'advanced']).optional(),
  trends: z.array(z.string()).optional()
});

const updateIndustryProfileSchema = createIndustryProfileSchema.partial();

// Get all industry profiles for a tenant
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const profiles = await IndustryProfile.findByTenant(tenantId);

    res.json({
      success: true,
      data: profiles,
      count: profiles.length
    });
  } catch (error) {
    console.error('Error fetching industry profiles:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get industry profile by type
router.get('/:industryType', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { industryType } = req.params;

    if (!['restaurant', 'hotel', 'healthcare', 'retail', 'manufacturing', 'fintech'].includes(industryType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid industry type'
      });
    }

    const profile = await IndustryProfile.findByTenantAndType(tenantId, industryType as IndustryType);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Industry profile not found'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error fetching industry profile:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Create industry profile
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const validationResult = createIndustryProfileSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validationResult.error.errors
      });
    }

    const data = validationResult.data;

    // Check if profile already exists
    const existingProfile = await IndustryProfile.findByTenantAndType(tenantId, data.industryType);
    if (existingProfile) {
      return res.status(409).json({
        success: false,
        error: 'Industry profile already exists for this tenant and type'
      });
    }

    const profile = new IndustryProfile({
      tenantId,
      ...data
    });

    await profile.save();

    res.status(201).json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error creating industry profile:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update industry profile
router.put('/:industryType', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { industryType } = req.params;

    const validationResult = updateIndustryProfileSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validationResult.error.errors
      });
    }

    const profile = await IndustryProfile.findOneAndUpdate(
      { tenantId, industryType },
      { $set: validationResult.data },
      { new: true, runValidators: true }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Industry profile not found'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error updating industry profile:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get critical issues for an industry
router.get('/:industryType/issues', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { industryType } = req.params;

    const profile = await IndustryProfile.findByTenantAndType(tenantId, industryType as IndustryType);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Industry profile not found'
      });
    }

    const criticalIssues = profile.getCriticalIssues();

    res.json({
      success: true,
      data: criticalIssues,
      count: criticalIssues.length
    });
  } catch (error) {
    console.error('Error fetching critical issues:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get KPIs by category
router.get('/:industryType/kpis/:category', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { industryType, category } = req.params;

    const validCategories = ['efficiency', 'quality', 'growth', 'financial', 'customer'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid KPI category'
      });
    }

    const profile = await IndustryProfile.findByTenantAndType(tenantId, industryType as IndustryType);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Industry profile not found'
      });
    }

    const kpis = profile.getKpisByCategory(category as any);

    res.json({
      success: true,
      data: kpis,
      count: kpis.length
    });
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get supported industry types
router.get('/types/list', (req: Request, res: Response) => {
  const industryTypes = [
    { type: 'restaurant', name: 'Restaurant', icon: 'utensils' },
    { type: 'hotel', name: 'Hotel & Hospitality', icon: 'hotel' },
    { type: 'healthcare', name: 'Healthcare', icon: 'heart-pulse' },
    { type: 'retail', name: 'Retail', icon: 'shopping-bag' },
    { type: 'manufacturing', name: 'Manufacturing', icon: 'industry' },
    { type: 'fintech', name: 'Financial Technology', icon: 'landmark' }
  ];

  res.json({
    success: true,
    data: industryTypes
  });
});

export default router;
