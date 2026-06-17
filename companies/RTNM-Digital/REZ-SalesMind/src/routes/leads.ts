/**
 * Leads Routes - Lead management and enrichment
 */
import { Router } from 'express';
import { writeLimiter } from '../middleware/rateLimit.js';
import { isValidLeadId, isValidEmail, sanitizeString } from '../middleware/validation.js';

export const leadRoutes = (
    intelligenceEngine: {
        getCRMClient: () => {
            getLeads: (filters: Record<string, string>) => Promise<{ data: unknown[]; error: string | null }>;
            getLead: (leadId: string) => Promise<{ data: unknown; error: string | null }>;
            createLead: (leadData: Record<string, unknown>) => Promise<{ data: unknown; error: string | null }>;
            updateLeadStage: (leadId: string, stage: string) => Promise<{ success: boolean; error: string | null }>;
        };
    },
    hojaiClient: {
        enrichLead: (leadId: string) => Promise<unknown>;
        scoreLead: (leadData: unknown) => Promise<{ score: number; factors: string[]; recommendations: string[] }>;
    }
) => {
    const router = Router();

    // Get all leads — FIXED: pagination added, writeLimiter applied
    router.get('/', writeLimiter, async (req, res) => {
        try {
            const stage = String(req.query.stage || '');
            const owner = String(req.query.owner || '');
            const page = String(req.query.page || '1');
            const limit = String(req.query.limit || '50');
            // Enforce max limit to prevent unbounded responses
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
            const skip = (pageNum - 1) * limitNum;

            const result = await intelligenceEngine.getCRMClient().getLeads({ stage, owner });
            const allLeads = result.data || [];
            // Apply pagination in-memory (upstream should paginate at DB level)
            const paginatedLeads = allLeads.slice(skip, skip + limitNum);

            res.json({
                leads: paginatedLeads,
                count: paginatedLeads.length,
                total: allLeads.length,
                page: pageNum,
                limit: limitNum,
                error: result.error
            });
        } catch (error) {
            console.error('Error fetching leads:', error);
            res.status(500).json({ error: 'Failed to fetch leads', details: 'Unknown error' });
        }
    });

    // Get lead by ID
    router.get('/:leadId', async (req, res) => {
        try {
            const { leadId } = req.params;
            if (!isValidLeadId(leadId)) {
                return res.status(400).json({ error: 'Invalid leadId format' });
            }
            const result = await intelligenceEngine.getCRMClient().getLead(leadId);
            if (!result.data) {
                return res.status(404).json({ error: 'Lead not found', details: result.error });
            }
            res.json(result.data);
        } catch (error) {
            console.error('Error fetching lead:', error);
            res.status(500).json({ error: 'Failed to fetch lead', details: error instanceof Error ? error.message : 'Unknown error' });
        }
    });

    // Create new lead — FIXED: validate body, apply writeLimiter, sanitize inputs
    router.post('/', writeLimiter, async (req, res) => {
        try {
            const body = req.body as Record<string, unknown>;
            // FIXED: validate required fields and sanitize
            if (!body.email && !body.phone) {
                return res.status(400).json({ error: 'Email or phone is required' });
            }
            if (body.email && !isValidEmail(body.email as string)) {
                return res.status(400).json({ error: 'Invalid email format' });
            }
            const leadData = {
                name: sanitizeString(body.name),
                email: body.email ? sanitizeString(body.email) : undefined,
                phone: body.phone ? sanitizeString(body.phone) : undefined,
                company: sanitizeString(body.company),
                title: sanitizeString(body.title),
                source: sanitizeString(body.source),
            };
            const result = await intelligenceEngine.getCRMClient().createLead(leadData);
            if (!result.data) {
                return res.status(500).json({ error: 'Failed to create lead', details: result.error });
            }
            res.status(201).json(result.data);
        } catch (error) {
            console.error('Error creating lead:', error);
            res.status(500).json({ error: 'Failed to create lead', details: error instanceof Error ? error.message : 'Unknown error' });
        }
    });

    // Update lead stage — FIXED: writeLimiter applied
    router.patch('/:leadId/stage', writeLimiter, async (req, res) => {
        try {
            const leadId = String(req.params.leadId || '');
            const { stage } = req.body as { stage?: string };
            if (!isValidLeadId(leadId)) {
                return res.status(400).json({ error: 'Invalid leadId format' });
            }
            if (!stage || typeof stage !== 'string') {
                return res.status(400).json({ error: 'stage is required and must be a string' });
            }
            const result = await intelligenceEngine.getCRMClient().updateLeadStage(leadId, stage);
            if (!result.success) {
                return res.status(500).json({ error: 'Failed to update lead stage', details: result.error });
            }
            res.json({ success: true, leadId, stage });
        } catch (error) {
            console.error('Error updating lead stage:', error);
            res.status(500).json({ error: 'Failed to update lead stage', details: error instanceof Error ? error.message : 'Unknown error' });
        }
    });

    // Enrich lead with AI
    router.post('/:leadId/enrich', writeLimiter, async (req, res) => {
        try {
            const leadId = String(req.params.leadId || '');
            if (!isValidLeadId(leadId)) {
                return res.status(400).json({ error: 'Invalid leadId format' });
            }
            const enriched = await hojaiClient.enrichLead(leadId);
            res.json({
                leadId,
                enriched: enriched ? true : false,
                data: enriched,
                isMockData: !enriched // Indicate if mock data was returned
            });
        } catch (error) {
            console.error('Error enriching lead:', error);
            res.status(500).json({ error: 'Failed to enrich lead' });
        }
    });

    // Score lead with AI
    router.post('/:leadId/score', writeLimiter, async (req, res) => {
        try {
            const leadId = String(req.params.leadId || '');
            if (!isValidLeadId(leadId)) {
                return res.status(400).json({ error: 'Invalid leadId format' });
            }
            const result = await intelligenceEngine.getCRMClient().getLead(leadId);
            if (!result.data) {
                return res.status(404).json({ error: 'Lead not found', details: result.error });
            }
            const scoring = await hojaiClient.scoreLead(result.data);
            res.json({
                leadId,
                score: scoring.score,
                factors: scoring.factors,
                recommendations: scoring.recommendations
            });
        } catch (error) {
            console.error('Error scoring lead:', error);
            res.status(500).json({ error: 'Failed to score lead', details: error instanceof Error ? error.message : 'Unknown error' });
        }
    });

    return router;
};
