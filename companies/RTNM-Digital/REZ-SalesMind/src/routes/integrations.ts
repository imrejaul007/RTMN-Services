/**
 * Integration Routes - Slack, LinkedIn, Gmail, Zoom
 * FIXED: gmail limit cap, Zoom validation, LinkedIn creds check
 */
import { Router } from 'express';
import { SlackClient } from '../services/integrations/slackClient.js';
import { LinkedInClient } from '../services/integrations/linkedinClient.js';
import { GmailClient } from '../services/integrations/gmailClient.js';
import { ZoomClient } from '../services/integrations/zoomClient.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { isValidEmail } from '../middleware/validation.js';

const router = Router();
const slack = new SlackClient();
const linkedin = new LinkedInClient();
const gmail = new GmailClient();
const zoom = new ZoomClient();

router.post('/slack/alert', writeLimiter, async (req, res) => {
    try {
        const alert = req.body as Record<string, unknown>;
        // FIXED: slack.sendAlert now validates the alert object internally
        const sent = await slack.sendAlert(alert);
        res.json({ success: sent });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send Slack alert' });
    }
});

router.post('/linkedin/enrich', writeLimiter, async (req, res) => {
    try {
        // FIXED: check if LinkedIn is configured before attempting
        if (!process.env.LINKEDIN_ACCESS_TOKEN) {
            return res.status(503).json({
                error: 'LinkedIn integration not configured',
                message: 'Set LINKEDIN_ACCESS_TOKEN to use this feature'
            });
        }
        const { email, name, company } = req.body as { email?: string; name?: string; company?: string };
        if (email && !isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        const enrichment = await linkedin.enrichLead({ email, name, company });
        res.json(enrichment);
    } catch (error) {
        res.status(500).json({ error: 'Failed to enrich with LinkedIn' });
    }
});

router.get('/gmail/emails', async (req, res) => {
    try {
        // FIXED: cap limit to prevent DoS
        const { query, limit } = req.query as { query?: string; limit?: string };
        const rawLimit = parseInt(limit || '10') || 10;
        const safeLimit = Math.min(50, Math.max(1, rawLimit)); // Cap at 50 emails per request
        const safeQuery = typeof query === 'string' ? query.substring(0, 500) : '';
        const emails = await gmail.getEmails(safeQuery, safeLimit);
        res.json({ emails, count: emails.length });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch emails' });
    }
});

router.post('/zoom/meeting', writeLimiter, async (req, res) => {
    try {
        // FIXED: check if Zoom is configured
        if (!process.env.ZOOM_ACCOUNT_ID || !process.env.ZOOM_CLIENT_ID) {
            return res.status(503).json({
                error: 'Zoom integration not configured',
                message: 'Set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET to use this feature'
            });
        }
        const { topic, startTime, duration } = req.body as { topic?: string; startTime?: string; duration?: number };
        if (!topic || typeof topic !== 'string') {
            return res.status(400).json({ error: 'topic is required and must be a string' });
        }
        if (!startTime || typeof startTime !== 'string') {
            return res.status(400).json({ error: 'startTime is required and must be an ISO date string' });
        }
        // Validate startTime is a reasonable date
        const parsedDate = new Date(startTime);
        if (isNaN(parsedDate.getTime()) || parsedDate.getTime() < Date.now()) {
            return res.status(400).json({ error: 'startTime must be a valid future date' });
        }
        // Cap duration
        const safeDuration = Math.min(480, Math.max(15, parseInt(String(duration)) || 60));
        const safeTopic = topic.substring(0, 200);
        const meeting = await zoom.createMeeting(safeTopic, parsedDate, safeDuration);
        if (!meeting) {
            return res.status(502).json({ error: 'Failed to create Zoom meeting - check credentials' });
        }
        res.json(meeting);
    } catch (error) {
        console.error('Zoom meeting creation failed:', error);
        res.status(500).json({ error: 'Failed to create meeting' });
    }
});

export default router;
