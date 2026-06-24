/**
 * /api/finance/* — Finance routes
 */

import express from 'express';
import * as finance from '../services/finance.service.js';

const router = express.Router();

router.use(express.json());

router.get('/accounts', (req, res) => {
  res.json({ accounts: finance.listAccounts({ type: req.query.type })});
});

router.get('/accounts/:id', (req, res) => {
  const a = finance.getAccount(req.params.id);
  if (!a) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'account not found' } });
  res.json(a);
});

router.post('/accounts', (req, res, next) => {
  try { res.status(201).json(finance.createAccount(req.body || {})); }
  catch (e) { next(Object.assign(e, { status: 400 })); }
});

router.get('/ledger', (req, res) => {
  res.json({ entries: finance.listLedgerEntries({ accountId: req.query.accountId })});
});

router.post('/ledger', (req, res, next) => {
  try { res.status(201).json(finance.postLedgerEntry(req.body || {})); }
  catch (e) { next(Object.assign(e, { status: 400 })); }
});

router.get('/trial-balance', (_req, res) => res.json(finance.getTrialBalance()));

export default router;
