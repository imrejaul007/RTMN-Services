/**
 * Ecosystem Routes - Connect to all RTNM services
 * FIXED: writeLimiter on write routes, body size limits, text length validation
 */
import { Router } from 'express';
import axios from 'axios';
import { prospectingConnector, communicationConnector, intelligenceConnector, identityConnector, crmConnector } from '../services/ecosystemConnector.js';
import { aiSalesAgent } from '../services/salesWorkflow.js';
import { validateRequest } from '../middleware/validation.js';
import { writeLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Helper for health checks with timeout
async function checkHealth(url: string): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    try {
        const response = await axios.get(url, { signal: controller.signal });
        clearTimeout(timeout);
        return response.status === 200;
    } catch {
        clearTimeout(timeout);
        return false;
    }
}

// Helper to sanitize search input
function sanitizeSearchQuery(q: string): string {
    if (!q || typeof q !== 'string') return '';
    return q.trim().substring(0, 200); // Cap length and trim
}

// Helper to validate email format
function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// PROSPECTING
router.get('/prospecting/search',
    validateRequest([{ param: 'queryParams', fields: ['q'] }]),
    async (req, res) => {
        try {
            let { q } = req.query as { q?: string };
            q = sanitizeSearchQuery(q || '');
            if (q.length === 0) {
                return res.status(400).json({ error: 'Search query is required' });
            }
            const results = await prospectingConnector.searchProspects(q);
            res.json({ results, count: results.length });
        } catch (error) {
            console.error('Search failed:', error);
            res.status(500).json({ error: 'Search failed' });
        }
    }
);

// COMMUNICATION — FIXED: body size limits, email validation, writeLimiter
router.post('/communication/email',
    writeLimiter,
    async (req, res) => {
        try {
            const { to, subject, body } = req.body as { to?: string; subject?: string; body?: string };
            // Validate required fields
            if (!to || !subject || !body) {
                return res.status(400).json({ error: 'to, subject, and body are required' });
            }
            // Validate email format
            if (!isValidEmail(to)) {
                return res.status(400).json({ error: 'Invalid email address for "to" field' });
            }
            // Cap body size to prevent DoS
            const safeBody = typeof body === 'string' ? body.substring(0, 50000) : '';
            const safeSubject = typeof subject === 'string' ? subject.substring(0, 500) : '';
            const sent = await communicationConnector.sendEmail(to, safeSubject, safeBody);
            res.json({ success: sent });
        } catch (error) {
            console.error('Email failed:', error);
            res.status(500).json({ error: 'Email failed' });
        }
    }
);

router.post('/communication/sms',
    writeLimiter,
    async (req, res) => {
        try {
            const { to, message } = req.body as { to?: string; message?: string };
            if (!to || !message) {
                return res.status(400).json({ error: 'to and message are required' });
            }
            // Cap message size
            const safeMessage = typeof message === 'string' ? message.substring(0, 1600) : '';
            const sent = await communicationConnector.sendSMS(to, safeMessage);
            res.json({ success: sent });
        } catch (error) {
            console.error('SMS failed:', error);
            res.status(500).json({ error: 'SMS failed' });
        }
    }
);

router.post('/communication/call',
    writeLimiter,
    async (req, res) => {
        try {
            const { phone } = req.body as { phone?: string };
            if (!phone) {
                return res.status(400).json({ error: 'phone is required' });
            }
            const result = await communicationConnector.makeCall(phone);
            res.json({ success: result });
        } catch (error) {
            console.error('Call failed:', error);
            res.status(500).json({ error: 'Call failed' });
        }
    }
);

// MARKET INTELLIGENCE
router.get('/intelligence/market-signals', async (req, res) => {
    try {
        const { industry } = req.query as { industry?: string };
        if (!industry || typeof industry !== 'string' || industry.trim().length === 0) {
            return res.status(400).json({ error: 'industry query parameter is required' });
        }
        const signals = await intelligenceConnector.getMarketSignals(industry.trim().substring(0, 100));
        res.json({ signals, count: signals.length });
    } catch (error) {
        console.error('Market signals failed:', error);
        res.status(500).json({ error: 'Market signals failed' });
    }
});

// IDENTITY
router.get('/identity/profile/:personId', async (req, res) => {
    try {
        const { personId } = req.params;
        if (!personId || typeof personId !== 'string') {
            return res.status(400).json({ error: 'personId is required' });
        }
        const profile = await identityConnector.getUnifiedProfile(personId.substring(0, 128));
        res.json(profile || {});
    } catch (error) {
        console.error('Profile failed:', error);
        res.status(500).json({ error: 'Profile failed' });
    }
});

router.get('/identity/conversation-history', async (req, res) => {
    try {
        const { clientId, leadId } = req.query as { clientId?: string; leadId?: string };
        if (!clientId || !leadId) {
            return res.status(400).json({ error: 'clientId and leadId query parameters are required' });
        }
        const history = await identityConnector.getConversationHistory(
            sanitizeSearchQuery(clientId),
            sanitizeSearchQuery(leadId)
        );
        res.json({ history });
    } catch (error) {
        console.error('History failed:', error);
        res.status(500).json({ error: 'History failed' });
    }
});

// CRM
router.get('/crm/leads', async (req, res) => {
    try {
        const result = await crmConnector.getLeads(req.query as Record<string, string>);
        res.json({ leads: result.data, count: result.data.length, error: result.error });
    } catch (error) {
        console.error('Leads failed:', error);
        res.status(500).json({ error: 'Leads failed' });
    }
});

router.get('/crm/deals', async (req, res) => {
    try {
        const result = await crmConnector.getDeals(req.query as Record<string, string>);
        res.json({ deals: result.data, count: result.data.length, error: result.error });
    } catch (error) {
        console.error('Deals failed:', error);
        res.status(500).json({ error: 'Deals failed' });
    }
});

router.patch('/crm/leads/:leadId/stage',
    writeLimiter,
    async (req, res) => {
        try {
            const { leadId } = req.params;
            const { stage } = req.body as { stage?: string };
            if (!leadId || !stage) {
                return res.status(400).json({ error: 'leadId and stage are required' });
            }
            const result = await crmConnector.updateLeadStage(String(leadId), String(stage));
            res.json({ success: result.success, error: result.error });
        } catch (error) {
            console.error('Stage update failed:', error);
            res.status(500).json({ error: 'Stage update failed' });
        }
    }
);

// AI WORKFLOW — FIXED: writeLimiter applied
router.post('/workflow/run',
    writeLimiter,
    async (req, res) => {
        try {
            const input = req.body as { prospectName?: string; company?: string };
            if (!input.prospectName || !input.company) {
                return res.status(400).json({ error: 'prospectName and company are required' });
            }
            // Sanitize inputs
            const safeInput = {
                prospectName: sanitizeSearchQuery(input.prospectName),
                company: sanitizeSearchQuery(input.company),
                prospectEmail: sanitizeSearchQuery((input as Record<string, string>).prospectEmail || ''),
                phone: sanitizeSearchQuery((input as Record<string, string>).phone || ''),
            };
            const result = await aiSalesAgent.runWorkflow(safeInput);
            res.json(result);
        } catch (error) {
            console.error('Workflow failed:', error);
            res.status(500).json({ error: 'Workflow failed' });
        }
    }
);

router.post('/workflow/outreach-sequence',
    writeLimiter,
    async (req, res) => {
        try {
            const { prospectId, sequenceType } = req.body as { prospectId?: string; sequenceType?: string };
            if (!prospectId || !sequenceType) {
                return res.status(400).json({ error: 'prospectId and sequenceType are required' });
            }
            const result = await aiSalesAgent.executeOutreachSequence(
                sanitizeSearchQuery(prospectId),
                sanitizeSearchQuery(sequenceType)
            );
            res.json(result);
        } catch (error) {
            console.error('Outreach failed:', error);
            res.status(500).json({ error: 'Outreach failed' });
        }
    }
);

// CONVERSATION ANALYSIS — FIXED: text length validation
router.post('/conversation/analyze',
    writeLimiter,
    async (req, res) => {
        try {
            const { text } = req.body as { text?: string };
            if (!text || typeof text !== 'string') {
                return res.status(400).json({ error: 'text is required' });
            }
            // Cap text length to prevent API overload
            const safeText = text.substring(0, 100000);
            const analysis = await aiSalesAgent.analyzeConversation(safeText);
            res.json(analysis);
        } catch (error) {
            console.error('Analysis failed:', error);
            res.status(500).json({ error: 'Analysis failed' });
        }
    }
);

// STATUS — FIXED: removed internal host/port disclosure, use service names only
router.get('/status', async (req, res) => {
    const connectedServices: { name: string; status: string }[] = [];
    const unavailableServices: string[] = [];

    // Check HOJAI services — show names only, not internal URLs
    const hojaiServices = [
        { name: 'HOJAI Web Intelligence' },
        { name: 'HOJAI Merchant Intel' },
        { name: 'HOJAI Lead Service' },
        { name: 'HOJAI Knowledge Graph' },
        { name: 'HOJAI TwinOS' },
        { name: 'Genie Voice' },
        { name: 'REZ Identity Hub' },
        { name: 'REZ CRM Hub' },
        { name: 'AssetMind' },
    ];

    // Parallel health checks with timeouts
    const healthChecks = await Promise.allSettled([
        checkHealth('http://localhost:4595/health'),
        checkHealth('http://localhost:4751/health'),
        checkHealth('http://localhost:4752/health'),
        checkHealth('http://localhost:4786/health'),
        checkHealth('http://localhost:4521/health'),
        checkHealth('http://localhost:4760/health'),
        checkHealth('http://localhost:4702/health'),
        checkHealth('http://localhost:4056/api/health'),
        checkHealth('http://localhost:5200/health'),
    ]);

    hojaiServices.forEach((service, i) => {
        const result = healthChecks[i];
        const status = result.status === 'fulfilled' && result.value ? 'connected' : 'unavailable';
        connectedServices.push({ name: service.name, status });
        if (status === 'unavailable') unavailableServices.push(service.name);
    });

    const connectedCount = connectedServices.filter(s => s.status === 'connected').length;
    const overallStatus = unavailableServices.length === 0 ? 'healthy'
        : unavailableServices.length < connectedServices.length / 2 ? 'degraded'
        : 'unhealthy';

    res.json({
        service: 'REZ SalesMind - Ecosystem Connector',
        version: '2.2.0',
        overallStatus,
        connectedServices,
        summary: {
            total: connectedServices.length,
            connected: connectedCount,
            unavailable: unavailableServices.length
        },
        warnings: unavailableServices.length > 0
            ? `The following services are unavailable: ${unavailableServices.join(', ')}`
            : undefined,
        timestamp: new Date().toISOString(),
    });
});

export default router;
