/**
 * Integration Routes - Slack, LinkedIn, Gmail, Zoom
 */

import { Router } from 'express';
import { SlackClient, SalesAlert } from '../services/integrations/slackClient.js';
import { LinkedInClient } from '../services/integrations/linkedinClient.js';
import { GmailClient } from '../services/integrations/gmailClient.js';
import { ZoomClient } from '../services/integrations/zoomClient.js';

const router = Router();
const slack = new SlackClient();
const linkedin = new LinkedInClient();
const gmail = new GmailClient();
const zoom = new ZoomClient();

router.post('/slack/alert', async (req, res) => {
  try {
    const alert = req.body as SalesAlert;
    const sent = await slack.sendAlert(alert);
    res.json({ success: sent });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send Slack alert' });
  }
});

router.post('/linkedin/enrich', async (req, res) => {
  try {
    const { email, name, company } = req.body;
    const enrichment = await linkedin.enrichLead({ email, name, company });
    res.json(enrichment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to enrich with LinkedIn' });
  }
});

router.get('/gmail/emails', async (req, res) => {
  try {
    const { query, limit } = req.query;
    const emails = await gmail.getEmails(query as string, parseInt(limit as string) || 10);
    res.json({ emails, count: emails.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

router.post('/zoom/meeting', async (req, res) => {
  try {
    const { topic, startTime, duration } = req.body;
    const meeting = await zoom.createMeeting(topic, new Date(startTime), duration);
    res.json(meeting);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

export default router;