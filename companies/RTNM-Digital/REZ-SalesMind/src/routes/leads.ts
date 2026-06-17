/**
 * Lead Routes - Lead management endpoints
 */
import { Router, Request, Response } from 'express';
import { REZCRMClient } from '../services/rezCRMClient.js';
import { HojaiAIClient } from '../services/hojaiClient.js';
import { isValidLeadId, isValidEmail, sanitizeString } from '../middleware/validation.js';

const router = Router();

// In-memory lead store
const leads = new Map<string, any>();

// GET /api/leads - List leads
router.get('/', async (req: Request, res: Response) => {
    try {
        const { page = '1', limit = '20', stage } = req.query;
        const pageNum = Math.max(1, parseInt(page as string) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));

        let leadList = Array.from(leads.values());
        if (stage) {
            leadList = leadList.filter(l => l.stage === stage);
        }

        const start = (pageNum - 1) * limitNum;
        const paginatedLeads = leadList.slice(start, start + limitNum);

        res.json({
            leads: paginatedLeads,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: leadList.length,
                totalPages: Math.ceil(leadList.length / limitNum)
            }
        });
    } catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});

// GET /api/leads/:leadId - Get single lead
router.get('/:leadId', async (req: Request, res: Response) => {
    try {
        const { leadId } = req.params;
        if (!isValidLeadId(leadId)) {
            return res.status(400).json({ error: 'Invalid lead ID format' });
        }
        const lead = leads.get(leadId);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        res.json(lead);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch lead' });
    }
});

// POST /api/leads - Create lead
router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, email, company, phone, source } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const lead = {
            id: `lead_${Date.now()}`,
            name: sanitizeString(name),
            email: sanitizeString(email),
            company: company ? sanitizeString(company) : undefined,
            phone: phone ? sanitizeString(phone) : undefined,
            source: source || 'manual',
            stage: 'new',
            score: 50,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        leads.set(lead.id, lead);
        res.status(201).json(lead);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create lead' });
    }
});

// PATCH /api/leads/:leadId/stage - Update lead stage
router.patch('/:leadId/stage', async (req: Request, res: Response) => {
    try {
        const { leadId } = req.params;
        const { stage } = req.body;

        if (!isValidLeadId(leadId)) {
            return res.status(400).json({ error: 'Invalid lead ID format' });
        }

        const validStages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed'];
        if (!stage || !validStages.includes(stage)) {
            return res.status(400).json({ error: `Invalid stage. Must be one of: ${validStages.join(', ')}` });
        }

        const lead = leads.get(leadId);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        lead.stage = stage;
        lead.updatedAt = new Date().toISOString();
        leads.set(leadId, lead);

        res.json({ success: true, lead });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update lead stage' });
    }
});

// POST /api/leads/:leadId/enrich - Enrich lead
router.post('/:leadId/enrich', async (req: Request, res: Response) => {
    try {
        const { leadId } = req.params;
        if (!isValidLeadId(leadId)) {
            return res.status(400).json({ error: 'Invalid lead ID format' });
        }
        const lead = leads.get(leadId);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        // Simulate enrichment
        lead.enriched = true;
        lead.enrichedAt = new Date().toISOString();
        lead.companyData = {
            industry: 'Technology',
            size: '50-200',
            revenue: '$5M-$20M'
        };
        leads.set(leadId, lead);
        res.json({ success: true, lead });
    } catch (error) {
        res.status(500).json({ error: 'Failed to enrich lead' });
    }
});

// POST /api/leads/:leadId/score - Score lead
router.post('/:leadId/score', async (req: Request, res: Response) => {
    try {
        const { leadId } = req.params;
        if (!isValidLeadId(leadId)) {
            return res.status(400).json({ error: 'Invalid lead ID format' });
        }
        const lead = leads.get(leadId);
        if (!lead) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        // Simple scoring
        let score = 50;
        if (lead.company) score += 10;
        if (lead.phone) score += 10;
        if (lead.enriched) score += 20;
        lead.score = Math.min(100, score);
        leads.set(leadId, lead);
        res.json({ success: true, score: lead.score });
    } catch (error) {
        res.status(500).json({ error: 'Failed to score lead' });
    }
});

export { router as leadRoutes };
