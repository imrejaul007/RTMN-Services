/**
 * /api/crm/* — Customer Success routes
 */

import express from 'express';
import * as crm from '../services/crm.service.js';

const router = express.Router();

router.use(express.json());

router.get('/customers', (req, res) => {
  res.json({ customers: crm.listCustomers({ healthStatus: req.query.healthStatus })});
});

router.get('/customers/:id', (req, res) => {
  const c = crm.getCustomer(req.params.id);
  if (!c) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'customer not found' } });
  res.json(c);
});

router.post('/customers', (req, res, next) => {
  try { res.status(201).json(crm.createCustomer(req.body || {})); }
  catch (e) { next(Object.assign(e, { status: 400 })); }
});

router.post('/customers/:id/health', (req, res, next) => {
  try {
    const c = crm.updateHealthScore(req.params.id, req.body?.score);
    if (!c) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'customer not found' } });
    res.json(c);
  } catch (e) { next(Object.assign(e, { status: 400 })); }
});

router.get('/nps', (req, res) => {
  res.json({ surveys: crm.listNpsSurveys({
    customerId: req.query.customerId,
    category: req.query.category
  })});
});

router.post('/nps', (req, res, next) => {
  try { res.status(201).json(crm.recordNpsSurvey(req.body || {})); }
  catch (e) { next(Object.assign(e, { status: 400 })); }
});

export default router;
