import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Compliance } from '../models/Compliance';
import { IndustryType } from '../models/IndustryProfile';

const router = Router();

// Validation schemas
const createComplianceSchema = z.object({
  industryType: z.enum(['restaurant', 'hotel', 'healthcare', 'retail', 'manufacturing', 'fintech']),
  framework: z.object({
    name: z.string(),
    description: z.string().optional(),
    region: z.string(),
    authority: z.string(),
    lastUpdated: z.date().optional()
  }),
  regulations: z.array(z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    description: z.string().optional(),
    requirements: z.array(z.string()).optional(),
    penalties: z.array(z.string()).optional(),
    effectiveDate: z.date(),
    nextReviewDate: z.date().optional()
  })).optional(),
  requirements: z.array(z.object({
    requirementId: z.string(),
    regulation: z.string(),
    description: z.string(),
    category: z.string(),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annually', 'on_demand']).optional(),
    evidence: z.array(z.string()).optional(),
    owner: z.string().optional(),
    status: z.enum(['compliant', 'non_compliant', 'in_progress', 'not_applicable']).optional(),
    lastAudit: z.date().optional(),
    nextAudit: z.date().optional(),
    riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional()
  })).optional(),
  certifications: z.array(z.object({
    name: z.string(),
    issuedBy: z.string(),
    issuedDate: z.date(),
    expiryDate: z.date(),
    status: z.enum(['active', 'expired', 'pending']).optional()
  })).optional()
});

const updateRequirementSchema = z.object({
  status: z.enum(['compliant', 'non_compliant', 'in_progress', 'not_applicable']),
  evidence: z.array(z.string()).optional(),
  notes: z.string().optional()
});

const addAuditFindingSchema = z.object({
  requirement: z.string(),
  finding: z.string(),
  severity: z.enum(['observation', 'minor', 'major', 'critical']),
  recommendation: z.string().optional(),
  evidence: z.array(z.string()).optional()
});

// Get compliance by industry type
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { industryType } = req.query;

    let query: any = { tenantId };
    if (industryType) {
      query.industryType = industryType;
    }

    const compliance = await Compliance.find(query);

    res.json({
      success: true,
      data: compliance,
      count: compliance.length
    });
  } catch (error) {
    console.error('Error fetching compliance data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get compliance by industry type (specific)
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

    const compliance = await Compliance.findByTenantAndType(tenantId, industryType as IndustryType);

    if (!compliance) {
      return res.status(404).json({
        success: false,
        error: 'Compliance data not found'
      });
    }

    res.json({
      success: true,
      data: compliance
    });
  } catch (error) {
    console.error('Error fetching compliance data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Create compliance record
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const validationResult = createComplianceSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validationResult.error.errors
      });
    }

    // Check if compliance record exists
    const existing = await Compliance.findByTenantAndType(tenantId, validationResult.data.industryType);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Compliance record already exists for this industry type'
      });
    }

    const compliance = new Compliance({
      tenantId,
      ...validationResult.data
    });

    await compliance.save();

    res.status(201).json({
      success: true,
      data: compliance
    });
  } catch (error) {
    console.error('Error creating compliance record:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get compliance score
router.get('/:industryType/score', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { industryType } = req.params;

    const compliance = await Compliance.findByTenantAndType(tenantId, industryType as IndustryType);

    if (!compliance) {
      return res.status(404).json({
        success: false,
        error: 'Compliance data not found'
      });
    }

    res.json({
      success: true,
      data: {
        score: compliance.score,
        complianceRate: compliance.getComplianceRate(),
        lastAssessment: compliance.lastAssessment,
        nextAssessment: compliance.nextAssessment,
        totalRequirements: compliance.requirements.length,
        compliant: compliance.requirements.filter(r => r.status === 'compliant').length,
        nonCompliant: compliance.requirements.filter(r => r.status === 'non_compliant').length,
        inProgress: compliance.requirements.filter(r => r.status === 'in_progress').length
      }
    });
  } catch (error) {
    console.error('Error fetching compliance score:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get critical findings
router.get('/:industryType/critical-findings', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { industryType } = req.params;

    const compliance = await Compliance.findByTenantAndType(tenantId, industryType as IndustryType);

    if (!compliance) {
      return res.status(404).json({
        success: false,
        error: 'Compliance data not found'
      });
    }

    const criticalFindings = compliance.getCriticalFindings();

    res.json({
      success: true,
      data: criticalFindings,
      count: criticalFindings.length
    });
  } catch (error) {
    console.error('Error fetching critical findings:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get expiring certifications
router.get('/:industryType/expiring-certifications', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { industryType } = req.params;

    const compliance = await Compliance.findByTenantAndType(tenantId, industryType as IndustryType);

    if (!compliance) {
      return res.status(404).json({
        success: false,
        error: 'Compliance data not found'
      });
    }

    const expiringCerts = compliance.getExpiringCertifications();

    res.json({
      success: true,
      data: expiringCerts,
      count: expiringCerts.length
    });
  } catch (error) {
    console.error('Error fetching expiring certifications:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update requirement status
router.patch('/:industryType/requirements/:requirementId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { industryType, requirementId } = req.params;

    const validationResult = updateRequirementSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validationResult.error.errors
      });
    }

    const updateData: any = {
      'requirements.$.status': validationResult.data.status
    };

    if (validationResult.data.evidence) {
      updateData['requirements.$.evidence'] = validationResult.data.evidence;
    }

    const compliance = await Compliance.findOneAndUpdate(
      { tenantId, industryType, 'requirements.requirementId': requirementId },
      { $set: updateData },
      { new: true }
    );

    if (!compliance) {
      return res.status(404).json({
        success: false,
        error: 'Compliance or requirement not found'
      });
    }

    res.json({
      success: true,
      data: compliance
    });
  } catch (error) {
    console.error('Error updating requirement:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Add audit finding
router.post('/:industryType/audit-findings', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { industryType } = req.params;

    const validationResult = addAuditFindingSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validationResult.error.errors
      });
    }

    const { v4: uuidv4 } = require('uuid');

    const auditFinding = {
      id: uuidv4(),
      date: new Date(),
      auditor: req.headers['x-user-id'] as string || 'system',
      ...validationResult.data,
      status: 'open' as const
    };

    const compliance = await Compliance.findOneAndUpdate(
      { tenantId, industryType },
      { $push: { auditHistory: auditFinding } },
      { new: true }
    );

    if (!compliance) {
      return res.status(404).json({
        success: false,
        error: 'Compliance data not found'
      });
    }

    res.status(201).json({
      success: true,
      data: auditFinding
    });
  } catch (error) {
    console.error('Error adding audit finding:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get compliance framework templates
router.get('/meta/frameworks', (req: Request, res: Response) => {
  const frameworks = [
    { name: 'HIPAA', industry: 'healthcare', description: 'Health Insurance Portability and Accountability Act' },
    { name: 'PCI-DSS', industry: 'fintech', description: 'Payment Card Industry Data Security Standard' },
    { name: 'FDA', industry: 'healthcare', description: 'Food and Drug Administration regulations' },
    { name: 'OSHA', industry: 'manufacturing', description: 'Occupational Safety and Health Administration' },
    { name: 'ServSafe', industry: 'restaurant', description: 'Food safety certification' },
    { name: 'GDPR', industry: 'fintech', description: 'General Data Protection Regulation' },
    { name: 'SOC 2', industry: 'fintech', description: 'Service Organization Control 2' },
    { name: 'ISO 27001', industry: 'fintech', description: 'Information Security Management' }
  ];

  res.json({
    success: true,
    data: frameworks
  });
});

export default router;
