import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Lead } from '../models/Lead';
import { Activity, ActivityType } from '../models/Activity';
import enrichmentService from '../services/enrichment';

const router = Router();

// Enrichment schemas
const EnrichLeadSchema = z.object({
  enrichLinkedin: z.boolean().optional().default(true),
  enrichCompany: z.boolean().optional().default(true),
  enrichSocial: z.boolean().optional().default(true),
});

const BulkEnrichSchema = z.object({
  leadIds: z.array(z.string()).optional(),
  enrichLinkedin: z.boolean().optional().default(true),
  enrichCompany: z.boolean().optional().default(true),
  enrichSocial: z.boolean().optional().default(true),
});

// Enrich a single lead
router.post('/:leadId/enrich', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { leadId } = req.params;
    const options = EnrichLeadSchema.parse(req.body);

    const lead = await Lead.findOne({
      tenantId,
      leadId,
      isDeleted: false,
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
      });
    }

    const enrichmentResult = await enrichmentService.enrichLead(lead, options);

    // Update lead with enrichment data
    lead.enrichment = enrichmentResult;
    await lead.save();

    // Create activity log for enrichment
    const activity = new Activity({
      tenantId,
      activityId: `ACT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      leadId,
      type: ActivityType.ENRICHMENT,
      description: 'Lead data enriched',
      metadata: {
        enrichedLinkedin: !!enrichmentResult.linkedin,
        enrichedCompany: !!enrichmentResult.companyData,
        enrichedSocial: !!enrichmentResult.socialData,
      },
    });
    await activity.save();

    res.json({
      success: true,
      data: {
        lead: {
          leadId: lead.leadId,
          name: lead.name,
        },
        enrichment: enrichmentResult,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    console.error('Enrich lead error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enrich lead',
    });
  }
});

// Bulk enrich leads
router.post('/enrich/bulk', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { leadIds, ...options } = BulkEnrichSchema.parse(req.body);

    let leads;
    if (leadIds && leadIds.length > 0) {
      leads = await Lead.find({
        tenantId,
        leadId: { $in: leadIds },
        isDeleted: false,
      });
    } else {
      // Enrich all leads without enrichment data
      leads = await Lead.find({
        tenantId,
        isDeleted: false,
        $or: [
          { 'enrichment.linkedin': { $exists: false } },
          { 'enrichment.companyData': { $exists: false } },
          { enrichment: { $eq: {} } },
        ],
      }).limit(100); // Limit bulk operations
    }

    const results = await Promise.allSettled(
      leads.map(async (lead) => {
        try {
          const enrichmentResult = await enrichmentService.enrichLead(lead, options);
          lead.enrichment = enrichmentResult;
          await lead.save();
          return {
            leadId: lead.leadId,
            name: lead.name,
            status: 'success',
            enrichment: enrichmentResult,
          };
        } catch (err) {
          return {
            leadId: lead.leadId,
            name: lead.name,
            status: 'failed',
            error: err instanceof Error ? err.message : 'Unknown error',
          };
        }
      })
    );

    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value.status === 'success').length;
    const failedCount = results.length - successCount;

    res.json({
      success: true,
      data: results.map((r) => (r.status === 'fulfilled' ? r.value : { error: r.reason })),
      summary: {
        total: results.length,
        succeeded: successCount,
        failed: failedCount,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    console.error('Bulk enrich error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk enrich leads',
    });
  }
});

// Get enrichment status for a lead
router.get('/:leadId/enrichment', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { leadId } = req.params;

    const lead = await Lead.findOne({
      tenantId,
      leadId,
      isDeleted: false,
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
      });
    }

    const enrichmentStatus = {
      isEnriched: {
        linkedin: !!lead.enrichment?.linkedin,
        company: !!lead.enrichment?.companyData,
        social: !!lead.enrichment?.socialData,
      },
      data: lead.enrichment,
      lastEnriched: lead.updatedAt,
    };

    res.json({
      success: true,
      data: enrichmentStatus,
    });
  } catch (error) {
    console.error('Get enrichment status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get enrichment status',
    });
  }
});

// Update enrichment data manually
router.put('/:leadId/enrichment', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { leadId } = req.params;
    const { linkedin, companyData, socialData } = req.body;

    const lead = await Lead.findOne({
      tenantId,
      leadId,
      isDeleted: false,
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
      });
    }

    // Update enrichment fields
    if (linkedin) lead.enrichment.linkedin = { ...lead.enrichment.linkedin, ...linkedin };
    if (companyData) lead.enrichment.companyData = { ...lead.enrichment.companyData, ...companyData };
    if (socialData) lead.enrichment.socialData = { ...lead.enrichment.socialData, ...socialData };

    await lead.save();

    // Recalculate score after enrichment
    const { default: scoringService } = await import('../services/scoring');
    const newScore = await scoringService.calculateScore(lead);
    lead.score = newScore;
    await lead.save();

    res.json({
      success: true,
      data: {
        enrichment: lead.enrichment,
        score: newScore,
      },
    });
  } catch (error) {
    console.error('Update enrichment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update enrichment data',
    });
  }
});

// Clear enrichment data for a lead
router.delete('/:leadId/enrichment', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { leadId } = req.params;

    const lead = await Lead.findOneAndUpdate(
      {
        tenantId,
        leadId,
        isDeleted: false,
      },
      {
        enrichment: {
          linkedin: {},
          companyData: {},
          socialData: {},
        },
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
      });
    }

    res.json({
      success: true,
      message: 'Enrichment data cleared successfully',
    });
  } catch (error) {
    console.error('Clear enrichment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear enrichment data',
    });
  }
});

export default router;
