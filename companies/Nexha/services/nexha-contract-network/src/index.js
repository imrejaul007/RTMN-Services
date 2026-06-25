'use strict';
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 4289;
const CORPID_URL = process.env.CORPID_URL || 'http://corp-id:4702';
const TRUST_URL = process.env.TRUST_ENGINE_URL || 'http://sutar-trust-engine:4291';

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(rateLimit({ windowMs: 60000, max: 100 }));

// In-memory store (replace with persistent storage in production)
const contracts = new Map();
const contractVersions = new Map();

function log(msg) { console.log(`[${new Date().toISOString()}] [contract-network] ${msg}`); }

// ── Health ───────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'nexha-contract-network', version: '0.1.0' }));

// ── Create contract ─────────────────────────────────────────────────
app.post('/api/v1/contracts', async (req, res) => {
  const { partyA, partyB, terms, type = 'standard', metadata = {} } = req.body;
  if (!partyA || !partyB) {
    return res.status(400).json({ error: 'partyA and partyB are required' });
  }
  const id = `contract-${uuidv4().slice(0, 12)}`;
  const contract = {
    id,
    parties: [partyA, partyB],
    terms,
    type,
    status: 'draft',
    version: 1,
    metadata,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  contracts.set(id, contract);
  log(`Contract created: ${id} (${type})`);
  res.status(201).json({ success: true, data: contract });
});

// ── Get contract ─────────────────────────────────────────────────────
app.get('/api/v1/contracts/:id', (req, res) => {
  const contract = contracts.get(req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  res.json({ success: true, data: contract });
});

// ── List contracts ───────────────────────────────────────────────────
app.get('/api/v1/contracts', (req, res) => {
  const { status, party } = req.query;
  let list = [...contracts.values()];
  if (status) list = list.filter(c => c.status === status);
  if (party) list = list.filter(c => c.parties.includes(party));
  res.json({ success: true, data: list, total: list.length });
});

// ── Update contract ──────────────────────────────────────────────────
app.put('/api/v1/contracts/:id', (req, res) => {
  const contract = contracts.get(req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  if (contract.status === 'executed') {
    return res.status(400).json({ error: 'Cannot modify executed contract — create a new version' });
  }
  const { terms, status } = req.body;
  if (terms) {
    const vid = `${contract.id}-v${contract.version + 1}`;
    contractVersions.set(vid, { ...contract });
    contract.version += 1;
    contract.terms = terms;
  }
  if (status) contract.status = status;
  contract.updatedAt = new Date().toISOString();
  log(`Contract updated: ${contract.id} → v${contract.version}`);
  res.json({ success: true, data: contract });
});

// ── Sign contract ───────────────────────────────────────────────────
app.post('/api/v1/contracts/:id/sign', (req, res) => {
  const contract = contracts.get(req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  const { party, signature } = req.body;
  if (!party) return res.status(400).json({ error: 'party is required' });
  if (!contract.signatures) contract.signatures = {};
  contract.signatures[party] = signature || uuidv4();
  contract.updatedAt = new Date().toISOString();
  const signedCount = Object.keys(contract.signatures).length;
  if (signedCount === contract.parties.length) {
    contract.status = 'executed';
    log(`Contract executed: ${contract.id} — all ${contract.parties.length} parties signed`);
  } else {
    contract.status = 'pending_signature';
    log(`Contract ${contract.id}: ${signedCount}/${contract.parties.length} signatures`);
  }
  res.json({ success: true, data: contract });
});

// ── Terminate contract ───────────────────────────────────────────────
app.post('/api/v1/contracts/:id/terminate', (req, res) => {
  const contract = contracts.get(req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  const { reason = 'terminated_by_party' } = req.body;
  contract.status = 'terminated';
  contract.terminationReason = reason;
  contract.updatedAt = new Date().toISOString();
  log(`Contract terminated: ${contract.id} — ${reason}`);
  res.json({ success: true, data: contract });
});

// ── Contract version history ────────────────────────────────────────
app.get('/api/v1/contracts/:id/versions', (req, res) => {
  const contract = contracts.get(req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  const versions = [contract];
  for (let v = contract.version - 1; v >= 1; v--) {
    const vid = `${contract.id}-v${v}`;
    if (contractVersions.has(vid)) versions.unshift(contractVersions.get(vid));
  }
  res.json({ success: true, data: versions });
});

// ── Stats ───────────────────────────────────────────────────────────
app.get('/api/v1/stats', (_req, res) => {
  const all = [...contracts.values()];
  res.json({
    total: all.length,
    byStatus: {
      draft: all.filter(c => c.status === 'draft').length,
      pending_signature: all.filter(c => c.status === 'pending_signature').length,
      executed: all.filter(c => c.status === 'executed').length,
      terminated: all.filter(c => c.status === 'terminated').length,
    },
  });
});

app.listen(PORT, () => {
  log(`Nexha Contract Network running on port ${PORT}`);
  log(`  CorpID: ${CORPID_URL}`);
  log(`  Trust:  ${TRUST_URL}`);
});
