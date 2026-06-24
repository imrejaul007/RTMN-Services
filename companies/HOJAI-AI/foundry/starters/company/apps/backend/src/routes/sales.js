/**
 * /api/sales/* — Sales routes
 */

import express from 'express';
import * as sales from '../services/sales.service.js';

const router = express.Router();

router.use(express.json());

router.get('/leads', (req, res) => {
  res.json({ leads: sales.listLeads({
    status: req.query.status,
    source: req.query.source
  })});
});

router.get('/leads/:id', (req, res) => {
  const l = sales.getLead(req.params.id);
  if (!l) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'lead not found' } });
  res.json(l);
});

router.post('/leads', (req, res, next) => {
  try { res.status(201).json(sales.createLead(req.body || {})); }
  catch (e) { next(Object.assign(e, { status: 400 })); }
});

router.post('/leads/:id/qualify', (req, res, next) => {
  try {
    const l = sales.qualifyLead(req.params.id, req.body || {});
    if (!l) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'lead not found' } });
    res.json(l);
  } catch (e) { next(Object.assign(e, { status: 400 })); }
});

router.get('/deals', (req, res) => {
  res.json({ deals: sales.listDeals({
    stage: req.query.stage,
    leadId: req.query.leadId
  })});
});

router.post('/deals', (req, res, next) => {
  try { res.status(201).json(sales.createDeal(req.body || {})); }
  catch (e) { next(Object.assign(e, { status: 400 })); }
});

router.post('/deals/:id/stage', (req, res, next) => {
  try {
    const d = sales.advanceDealStage(req.params.id, req.body?.stage);
    if (!d) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'deal not found' } });
    res.json(d);
  } catch (e) { next(Object.assign(e, { status: 400 })); }
});

export default router;
