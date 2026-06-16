/**
 * Exhibition CRM Service
 * Port 5058
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

dotenv.config();

const PORT = process.env.PORT || 5058;
const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple())
    })
  ]
});

const deals = new Map();

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'exhibition-crm-service', timestamp: new Date().toISOString() });
});

app.get('/health/live', (_req, res) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', (_req, res) => {
  res.json({ status: 'ready' });
});

app.get('/api/deals', (req, res) => {
  const exhibitorId = req.query.exhibitor_id as string;
  const stage = req.query.stage as string;
  let results = Array.from(deals.values());
  if (exhibitorId) results = results.filter((d: any) => d.exhibitor_id === exhibitorId);
  if (stage) results = results.filter((d: any) => d.stage === stage);

  const stages = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
  const pipeline: Record<string, any[]> = {};
  stages.forEach(s => { pipeline[s] = results.filter((d: any) => d.stage === s); });

  res.json({
    success: true,
    data: {
      pipeline,
      total_value: results.reduce((sum: number, d: any) => sum + (d.value || 0), 0)
    }
  });
});

app.post('/api/deals', (req, res) => {
  const { exhibitor_id, lead_id, company_name, contact_name, value } = req.body;
  if (!exhibitor_id || !company_name) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
  }

  const deal: any = {
    id: `DEAL-${uuidv4().substring(0, 8).toUpperCase()}`,
    exhibitor_id,
    lead_id,
    company_name,
    contact_name,
    value: value || 0,
    stage: 'lead',
    probability: 10,
    expected_close: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    activities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  deals.set(deal.id, deal);
  res.status(201).json({ success: true, data: deal });
});

app.patch('/api/deals/:id', (req, res) => {
  const deal = deals.get(req.params.id) as any;
  if (!deal) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Deal not found' } });

  const { stage, value, notes, action } = req.body;
  const probMap: Record<string, number> = { lead: 10, qualified: 25, proposal: 50, negotiation: 75, won: 100, lost: 0 };

  if (action === 'move' && stage) {
    deal.stage = stage;
    deal.probability = probMap[stage] || 10;
  } else {
    if (stage) deal.stage = stage;
  }
  if (value !== undefined) deal.value = value;
  if (notes !== undefined) deal.notes = notes;
  deal.updated_at = new Date().toISOString();
  deals.set(deal.id, deal);

  res.json({ success: true, data: deal });
});

app.post('/api/deals/:id/activities', (req, res) => {
  const deal = deals.get(req.params.id) as any;
  if (!deal) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Deal not found' } });

  const { type, content, outcome } = req.body;
  const activity: any = {
    id: `ACT-${uuidv4().substring(0, 8).toUpperCase()}`,
    type,
    content,
    outcome,
    created_at: new Date().toISOString()
  };

  deal.activities.push(activity);
  deal.updated_at = new Date().toISOString();
  deals.set(deal.id, deal);

  res.status(201).json({ success: true, data: activity });
});

app.get('/api/exhibitors/:exhibitorId/crm-stats', (req, res) => {
  const exhibitorDeals = Array.from(deals.values()).filter((d: any) => d.exhibitor_id === req.params.exhibitorId);
  const wonDeals = exhibitorDeals.filter((d: any) => d.stage === 'won');

  res.json({
    success: true,
    data: {
      total_leads: exhibitorDeals.length,
      total_value: exhibitorDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0),
      won_value: wonDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0),
      conversion_rate: exhibitorDeals.length > 0 ? Math.round((wonDeals.length / exhibitorDeals.length) * 100) : 0,
      avg_deal_size: exhibitorDeals.length > 0 ? Math.round(exhibitorDeals.reduce((sum: number, d: any) => sum + (d.value || 0), 0) / exhibitorDeals.length) : 0,
      pipeline_value: exhibitorDeals.filter((d: any) => !['won', 'lost'].includes(d.stage)).reduce((sum: number, d: any) => sum + (d.value || 0), 0),
    },
  });
});

app.listen(PORT, () => {
  logger.info(`CRM Service started on port ${PORT}`);
});

export default app;
