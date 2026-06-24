/**
 * /api/cxo/* — Executive routes
 *
 * v0 has KPIs + strategic pillars. Full surface in @hojai/department.cxo.
 */

import express from 'express';
import { randomUUID } from 'node:crypto';
import store from '../services/store.js';

const router = express.Router();

router.use(express.json());

router.get('/kpis', (_req, res) => res.json({ kpis: [...store.kpis.values()] }));

router.post('/kpis', (req, res) => {
  const { name, value, unit, category } = req.body || {};
  if (!name || value == null) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'name and value required' } });
  const id = randomUUID();
  const k = {
    id, name,
    category: category || 'operational',
    value: Number(value),
    unit: unit || '',
    health: 80,
    trend: 'flat',
    changePercent: 0,
    capturedAt: new Date().toISOString()
  };
  store.kpis.set(id, k);
  res.status(201).json(k);
});

router.get('/pillars', (_req, res) => res.json({ pillars: [...store.pillars.values()] }));

router.post('/pillars', (req, res) => {
  const { name, description } = req.body || {};
  if (!name) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'name required' } });
  const id = randomUUID();
  const p = { id, name, description: description || '', status: 'on-track', progress: 0, initiatives: [], createdAt: new Date().toISOString() };
  store.pillars.set(id, p);
  res.status(201).json(p);
});

router.get('/board-report', (_req, res) => {
  res.json({
    id: 'board-' + Date.now(),
    period: 'current-quarter',
    generatedAt: new Date().toISOString(),
    highlights: {
      wins: ['+12% MRR', 'shipped AI agent', 'hired 3 engineers'],
      concerns: ['rising infra costs', 'churn in segment X'],
      asks: ['approve EU expansion', 'increase marketing budget']
    },
    financials: { revenue: 126000, netIncome: 33000, cash: 410000, runwayMonths: 18 }
  });
});

export default router;
