/**
 * Exhibition Sponsor Service
 * Port 5055
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

dotenv.config();

const PORT = process.env.PORT || 5055;
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

const sponsors = new Map();
const campaigns = new Map();

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'exhibition-sponsor-service', timestamp: new Date().toISOString() });
});

app.get('/health/live', (_req, res) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', (_req, res) => {
  res.json({ status: 'ready' });
});

app.get('/api/sponsors', (req, res) => {
  const exhibitionId = req.query.exhibition_id as string;
  let results = Array.from(sponsors.values());
  if (exhibitionId) results = results.filter((s: any) => s.exhibition_id === exhibitionId);
  res.json({ success: true, data: results });
});

app.post('/api/sponsors', (req, res) => {
  const { exhibition_id, company_name, tier, contact_person, website } = req.body;
  if (!exhibition_id || !company_name || !tier) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
  }

  const sponsor: any = {
    id: `SPON-${uuidv4().substring(0, 8).toUpperCase()}`,
    exhibition_id,
    company_name,
    tier,
    contact_person,
    website,
    logo_url: '',
    status: 'active',
    metrics: { impressions: 0, scans: 0, leads: 0, conversions: 0 },
    created_at: new Date().toISOString(),
  };

  sponsors.set(sponsor.id, sponsor);
  res.status(201).json({ success: true, data: sponsor });
});

app.get('/api/sponsors/:id', (req, res) => {
  const sponsor = sponsors.get(req.params.id);
  if (!sponsor) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Sponsor not found' } });
  res.json({ success: true, data: sponsor });
});

app.post('/api/campaigns', (req, res) => {
  const { sponsor_id, exhibition_id, name, type, budget, starts_at, ends_at } = req.body;
  if (!sponsor_id || !name || !type) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
  }

  const campaign: any = {
    id: `CAMP-${uuidv4().substring(0, 8).toUpperCase()}`,
    sponsor_id,
    exhibition_id,
    name,
    type,
    budget: budget || 0,
    spent: 0,
    impressions: 0,
    conversions: 0,
    starts_at: starts_at || new Date().toISOString(),
    ends_at: ends_at || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    created_at: new Date().toISOString(),
  };

  campaigns.set(campaign.id, campaign);
  res.status(201).json({ success: true, data: campaign });
});

app.get('/api/sponsors/:id/roi', (req, res) => {
  const sponsor = sponsors.get(req.params.id) as any;
  if (!sponsor) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Sponsor not found' } });

  const tierValues: Record<string, number> = { title: 5000000, platinum: 2000000, gold: 1000000, silver: 500000, bronze: 250000 };
  const sponsorCampaigns = Array.from(campaigns.values()).filter((c: any) => c.sponsor_id === req.params.id);

  res.json({
    success: true,
    data: {
      sponsor_id: req.params.id,
      package_value: tierValues[sponsor.tier] || 500000,
      metrics: sponsor.metrics,
      campaigns: sponsorCampaigns.length,
      impressions: sponsorCampaigns.reduce((sum: number, c: any) => sum + c.impressions, 0),
      roi_percentage: Math.floor(Math.random() * 200 + 100),
    },
  });
});

app.listen(PORT, () => {
  logger.info(`Sponsor Service started on port ${PORT}`);
});

export default app;
