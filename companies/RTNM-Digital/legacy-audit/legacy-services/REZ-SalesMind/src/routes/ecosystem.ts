/**
 * Ecosystem Routes - Connect to all RTNM services
 */

import { Router } from 'express';
import axios, { AxiosError } from 'axios';
import { prospectingConnector, communicationConnector, intelligenceConnector, identityConnector, crmConnector, bookingConnector, conversationIntelConnector } from '../services/ecosystemConnector.js';
import { aiSalesAgent, SalesWorkflowInput } from '../services/salesWorkflow.js';
import { validateRequest } from '../middleware/validation.js';

const router = Router();

// Helper for health checks with timeout
async function checkHealth(url: string): Promise<boolean> {
  try {
    const response = await axios.get(url, { timeout: 2000 });
    return response.status === 200;
  } catch {
    return false;
  }
}

// PROSPECTING
router.get('/prospecting/search', validateRequest([{ param: 'queryParams', fields: ['q'] }]), async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    const results = await prospectingConnector.searchProspects(q);
    res.json({ results, count: results.length });
  } catch (error) {
    console.error('Search failed:', error);
    res.status(500).json({ error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// COMMUNICATION
router.post('/communication/email', async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'to, subject, and body are required' });
    }
    const sent = await communicationConnector.sendEmail(to, subject, body);
    res.json({ success: sent });
  } catch (error) {
    console.error('Email failed:', error);
    res.status(500).json({ error: 'Email failed', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.post('/communication/sms', async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({ error: 'to and message are required' });
    }
    const sent = await communicationConnector.sendSMS(to, message);
    res.json({ success: sent });
  } catch (error) {
    console.error('SMS failed:', error);
    res.status(500).json({ error: 'SMS failed', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.post('/communication/call', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'phone is required' });
    }
    const result = await communicationConnector.makeCall(phone);
    res.json({ success: result });
  } catch (error) {
    console.error('Call failed:', error);
    res.status(500).json({ error: 'Call failed', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// MARKET INTELLIGENCE
router.get('/intelligence/market-signals', async (req, res) => {
  try {
    const { industry } = req.query;
    if (!industry || typeof industry !== 'string') {
      return res.status(400).json({ error: 'industry query parameter is required' });
    }
    const signals = await intelligenceConnector.getMarketSignals(industry);
    res.json({ signals, count: signals.length });
  } catch (error) {
    console.error('Market signals failed:', error);
    res.status(500).json({ error: 'Market signals failed', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// IDENTITY
router.get('/identity/profile/:personId', async (req, res) => {
  try {
    const { personId } = req.params;
    if (!personId) {
      return res.status(400).json({ error: 'personId is required' });
    }
    const profile = await identityConnector.getUnifiedProfile(personId);
    res.json(profile);
  } catch (error) {
    console.error('Profile failed:', error);
    res.status(500).json({ error: 'Profile failed', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.get('/identity/conversation-history', async (req, res) => {
  try {
    const { clientId, leadId } = req.query;
    if (!clientId || !leadId) {
      return res.status(400).json({ error: 'clientId and leadId query parameters are required' });
    }
    const history = await identityConnector.getConversationHistory(clientId as string, leadId as string);
    res.json({ history });
  } catch (error) {
    console.error('History failed:', error);
    res.status(500).json({ error: 'History failed', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// CRM
router.get('/crm/leads', async (req, res) => {
  try {
    const result = await crmConnector.getLeads(req.query as Record<string, string>);
    res.json({ leads: result.data, count: result.data.length, error: result.error });
  } catch (error) {
    console.error('Leads failed:', error);
    res.status(500).json({ error: 'Leads failed', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.get('/crm/deals', async (req, res) => {
  try {
    const result = await crmConnector.getDeals(req.query as Record<string, string>);
    res.json({ deals: result.data, count: result.data.length, error: result.error });
  } catch (error) {
    console.error('Deals failed:', error);
    res.status(500).json({ error: 'Deals failed', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.patch('/crm/leads/:leadId/stage', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { stage } = req.body;
    if (!leadId || !stage) {
      return res.status(400).json({ error: 'leadId and stage are required' });
    }
    const result = await crmConnector.updateLeadStage(leadId, stage);
    res.json({ success: result.success, error: result.error });
  } catch (error) {
    console.error('Stage update failed:', error);
    res.status(500).json({ error: 'Stage update failed', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// AI WORKFLOW
router.post('/workflow/run', async (req, res) => {
  try {
    const input = req.body as SalesWorkflowInput;
    if (!input.prospectName || !input.company) {
      return res.status(400).json({ error: 'prospectName and company are required' });
    }
    const result = await aiSalesAgent.runWorkflow(input);
    res.json(result);
  } catch (error) {
    console.error('Workflow failed:', error);
    res.status(500).json({ error: 'Workflow failed', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.post('/workflow/outreach-sequence', async (req, res) => {
  try {
    const { prospectId, sequenceType } = req.body;
    if (!prospectId || !sequenceType) {
      return res.status(400).json({ error: 'prospectId and sequenceType are required' });
    }
    const result = await aiSalesAgent.executeOutreachSequence(prospectId, sequenceType);
    res.json(result);
  } catch (error) {
    console.error('Outreach failed:', error);
    res.status(500).json({ error: 'Outreach failed', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// CONVERSATION ANALYSIS
router.post('/conversation/analyze', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }
    const analysis = await aiSalesAgent.analyzeConversation(text);
    res.json(analysis);
  } catch (error) {
    console.error('Analysis failed:', error);
    res.status(500).json({ error: 'Analysis failed', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// STATUS - Performs real connectivity checks
router.get('/status', async (req, res) => {
  const connectedServices: Array<{ name: string; port: number; status: 'connected' | 'degraded' | 'unavailable' }> = [];
  const unavailableServices: string[] = [];

  // Check HOJAI services
  const hojaiServices = [
    { name: 'HOJAI Web Intelligence', port: 4595, url: 'http://localhost:4595/health' },
    { name: 'HOJAI Merchant Intel', port: 4751, url: 'http://localhost:4751/health' },
    { name: 'HOJAI Lead Service', port: 4752, url: 'http://localhost:4752/health' },
    { name: 'HOJAI Knowledge Graph', port: 4786, url: 'http://localhost:4786/health' },
    { name: 'HOJAI TwinOS', port: 4521, url: 'http://localhost:4521/health' },
  ];

  for (const service of hojaiServices) {
    const healthy = await checkHealth(service.url);
    connectedServices.push({ ...service, status: healthy ? 'connected' : 'unavailable' });
    if (!healthy) unavailableServices.push(service.name);
  }

  // Check Genie Voice
  const genieHealthy = await checkHealth('http://localhost:4760/health');
  connectedServices.push({ name: 'Genie Voice', port: 4760, status: genieHealthy ? 'connected' : 'unavailable' });
  if (!genieHealthy) unavailableServices.push('Genie Voice');

  // Check REZ Identity Hub (CorpID)
  const identityHealthy = await checkHealth('http://localhost:4702/health');
  connectedServices.push({ name: 'REZ Identity Hub (CorpID)', port: 4702, status: identityHealthy ? 'connected' : 'unavailable' });
  if (!identityHealthy) unavailableServices.push('REZ Identity Hub');

  // Check REZ CRM Hub
  const crmHealthy = await checkHealth('http://localhost:4056/api/health');
  connectedServices.push({ name: 'REZ CRM Hub', port: 4056, status: crmHealthy ? 'connected' : 'unavailable' });
  if (!crmHealthy) unavailableServices.push('REZ CRM Hub');

  // Check AssetMind
  const assetMindHealthy = await checkHealth('http://localhost:5200/health');
  connectedServices.push({ name: 'AssetMind', port: 5200, status: assetMindHealthy ? 'connected' : 'unavailable' });
  if (!assetMindHealthy) unavailableServices.push('AssetMind');

  const connectedCount = connectedServices.filter(s => s.status === 'connected').length;
  const overallStatus = unavailableServices.length === 0 ? 'healthy' : unavailableServices.length < connectedServices.length / 2 ? 'degraded' : 'unhealthy';

  res.json({
    service: 'REZ SalesMind - Ecosystem Connector',
    version: '2.1.0',
    overallStatus,
    connectedServices,
    summary: {
      total: connectedServices.length,
      connected: connectedCount,
      unavailable: unavailableServices.length
    },
    warnings: unavailableServices.length > 0 ? `The following services are unavailable: ${unavailableServices.join(', ')}` : undefined,
    timestamp: new Date().toISOString(),
  });
});

export default router;
