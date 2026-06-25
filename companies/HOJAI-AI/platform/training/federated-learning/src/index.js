/**
 * HOJAI AI Federated Learning (port 4779) — STUB
 *
 * Coordinates distributed model training across clients without sharing raw data.
 *
 * Workflow:
 *   1. Create a Federation (group of clients + config)
 *   2. Clients join the federation
 *   3. Server initiates rounds (local training → weight upload → aggregation)
 *   4. Aggregated weights distributed back to clients
 *   5. Repeat for N rounds
 *
 * Storage: file-backed JSON (atomic temp+rename writes)
 * Auth:    X-Internal-Token header
 *
 * In production would integrate with:
 *   - Flower (flwr) for real FL protocol
 *   - PySyft / OpenMined for privacy-preserving computation
 *   - Differential privacy (OpenDP)
 *   - Secure aggregation (multi-party computation)
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '4779', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'federated-learning-internal-token';

const FEDS_FILE = path.join(DATA_DIR, 'federations.json');
const ROUNDS_FILE = path.join(DATA_DIR, 'rounds.json');
const CLIENTS_FILE = path.join(DATA_DIR, 'clients.json');

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FEDS_FILE)) fs.writeFileSync(FEDS_FILE, JSON.stringify({ data: {} }));
  if (!fs.existsSync(ROUNDS_FILE)) fs.writeFileSync(ROUNDS_FILE, JSON.stringify({ data: {} }));
  if (!fs.existsSync(CLIENTS_FILE)) fs.writeFileSync(CLIENTS_FILE, JSON.stringify({ data: {} }));
}
function load(file) { ensureDir(); try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return { data: {} }; } }
function save(file, d) { const tmp = file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, file); }
const loadFeds = () => load(FEDS_FILE);
const saveFeds = (d) => save(FEDS_FILE, d);
const loadRounds = () => load(ROUNDS_FILE);
const saveRounds = (d) => save(ROUNDS_FILE, d);
const loadClients = () => load(CLIENTS_FILE);
const saveClients = (d) => save(CLIENTS_FILE, d);

const AGGREGATION_STRATEGIES = ['fedavg', 'fedprox', 'fednova', 'scaffold', 'fedopt'];
const MODEL_ARCHITECTURES = ['llama-3-8b', 'llama-3-70b', 'mistral-7b', 'mixtral-8x7b', 'qwen-2-7b', 'phi-3-mini', 'gemma-2-9b', 'custom'];

// Stub weight: deterministic bytes derived from round + client IDs
function stubWeights(roundId, clientId, seed) {
  const h = crypto.createHash('sha256');
  h.update(`${roundId}:${clientId}:${seed}`);
  return h.digest('base64').slice(0, 32);
}

// Stub aggregation: simple FedAvg (weighted average of client weights)
function aggregateWeightsStub(contributions, strategy) {
  if (!contributions || contributions.length === 0) return null;
  if (contributions.length === 1) return contributions[0].weights;
  // All clients weighted equally in this stub
  return contributions[0].weights; // Return first as "aggregated" (real impl would combine)
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'federated-learning', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // ── Federations ──────────────────────────────────────────────────
  app.post('/api/federations', requireInternal, (req, res) => {
    const { name, description, minClients = 2, maxClients = 100, modelArchitecture, aggregationStrategy = 'fedavg', totalRounds = 10, minClientsPerRound = 2, privacyBudget = null } = req.body || {};
    if (!name) return res.status(400).json({ error: 'validation', message: 'name required' });
    if (aggregationStrategy && !AGGREGATION_STRATEGIES.includes(aggregationStrategy)) {
      return res.status(400).json({ error: 'validation', message: `aggregationStrategy must be one of: ${AGGREGATION_STRATEGIES.join(', ')}` });
    }
    if (modelArchitecture && !MODEL_ARCHITECTURES.includes(modelArchitecture)) {
      return res.status(400).json({ error: 'validation', message: `modelArchitecture must be one of: ${MODEL_ARCHITECTURES.join(', ')}` });
    }
    const data = loadFeds();
    const id = newId('fed');
    data.data[id] = {
      id, name, description: description || '',
      minClients, maxClients, modelArchitecture: modelArchitecture || 'llama-3-8b',
      aggregationStrategy, totalRounds, minClientsPerRound,
      privacyBudget,
      status: 'active',
      createdAt: nowIso(),
      currentRound: 0,
      completedRounds: 0,
    };
    saveFeds(data);
    res.status(201).json(data.data[id]);
  });

  app.get('/api/federations', (_req, res) => {
    const data = loadFeds();
    res.json({ federations: Object.values(data.data), total: Object.keys(data.data).length });
  });

  app.get('/api/federations/:id', (req, res) => {
    const data = loadFeds();
    const fed = data.data[req.params.id];
    if (!fed) return res.status(404).json({ error: 'not_found' });
    res.json({ federation: fed });
  });

  app.post('/api/federations/:id/start', requireInternal, (req, res) => {
    const data = loadFeds();
    const fed = data.data[req.params.id];
    if (!fed) return res.status(404).json({ error: 'not_found' });
    if (fed.status !== 'active') return res.status(409).json({ error: 'invalid_state', message: `federation is ${fed.status}` });
    fed.currentRound = 1;
    fed.status = 'training';
    saveFeds(data);
    res.json({ federation: fed, message: `started at round 1 of ${fed.totalRounds}` });
  });

  app.post('/api/federations/:id/pause', requireInternal, (req, res) => {
    const data = loadFeds();
    const fed = data.data[req.params.id];
    if (!fed) return res.status(404).json({ error: 'not_found' });
    if (fed.status !== 'training') return res.status(409).json({ error: 'invalid_state', message: `federation is ${fed.status}` });
    fed.status = 'paused';
    saveFeds(data);
    res.json({ federation: fed });
  });

  app.delete('/api/federations/:id', requireInternal, (req, res) => {
    const data = loadFeds();
    if (!data.data[req.params.id]) return res.status(404).json({ error: 'not_found' });
    delete data.data[req.params.id];
    saveFeds(data);
    res.json({ deleted: req.params.id });
  });

  // ── Clients ──────────────────────────────────────────────────────
  app.post('/api/clients', requireInternal, (req, res) => {
    const { federationId, name, organization, capabilities = {} } = req.body || {};
    if (!federationId) return res.status(400).json({ error: 'validation', message: 'federationId required' });
    if (!name) return res.status(400).json({ error: 'validation', message: 'name required' });
    const feds = loadFeds();
    if (!feds.data[federationId]) return res.status(404).json({ error: 'not_found', message: 'federation not found' });
    const clients = loadClients();
    const id = newId('flc');
    clients.data[id] = {
      id, federationId, name, organization: organization || '',
      capabilities,
      status: 'registered',
      enrolledAt: nowIso(),
      lastSeen: nowIso(),
      roundsParticipated: 0,
    };
    saveClients(clients);
    res.status(201).json(clients.data[id]);
  });

  app.get('/api/clients', (req, res) => {
    const { federationId, status } = req.query;
    const data = loadClients();
    let list = Object.values(data.data);
    if (federationId) list = list.filter((c) => c.federationId === federationId);
    if (status) list = list.filter((c) => c.status === status);
    res.json({ clients: list, total: list.length });
  });

  app.get('/api/clients/:id', (req, res) => {
    const data = loadClients();
    const c = data.data[req.params.id];
    if (!c) return res.status(404).json({ error: 'not_found' });
    res.json({ client: c });
  });

  app.post('/api/clients/:id/heartbeat', requireInternal, (req, res) => {
    const data = loadClients();
    const c = data.data[req.params.id];
    if (!c) return res.status(404).json({ error: 'not_found' });
    c.lastSeen = nowIso();
    c.status = req.body.status || c.status;
    saveClients(data);
    res.json({ client: c });
  });

  // ── Rounds ───────────────────────────────────────────────────────
  app.get('/api/rounds', (req, res) => {
    const { federationId } = req.query;
    const data = loadRounds();
    let list = Object.values(data.data);
    if (federationId) list = list.filter((r) => r.federationId === federationId);
    list.sort((a, b) => b.roundNumber - a.roundNumber);
    res.json({ rounds: list, total: list.length });
  });

  // NOTE: /submit MUST be before /:id to avoid Express capturing "submit" as an :id
  // ── Client participation (weight submission) ─────────────────────
  app.post('/api/rounds/:roundId/submit', requireInternal, (req, res) => {
    const { federationId, clientId, weights, numSamples, metrics } = req.body || {};
    if (!federationId || !clientId || !weights) {
      return res.status(400).json({ error: 'validation', message: `federationId=${federationId} clientId=${clientId} weights=${!!weights}`, detail: req.body });
    }

    const feds = loadFeds();
    const fed = feds.data[federationId];
    if (!fed) return res.status(404).json({ error: 'not_found', message: `federation ${federationId} not found, have: ${Object.keys(feds.data).slice(0,3).join(',')}` });

    // Find current active round
    const roundsData = loadRounds();
    const currentRound = Object.values(roundsData.data)
      .filter((r) => r.federationId === federationId && r.status === 'active')
      .sort((a, b) => b.roundNumber - a.roundNumber)[0];

    if (!currentRound) {
      // No active round — create one if federation is training
      if (fed.status !== 'training') return res.status(409).json({ error: 'no_active_round', message: 'federation is not training' });
      if (fed.currentRound > fed.totalRounds) {
        fed.status = 'completed';
        saveFeds(feds);
        return res.status(409).json({ error: 'training_complete', message: 'all rounds completed' });
      }
      const roundId = newId('round');
      roundsData.data[roundId] = {
        id: roundId,
        federationId,
        roundNumber: fed.currentRound,
        status: 'active',
        contributions: [],
        aggregatedWeights: null,
        createdAt: nowIso(),
        completedAt: null,
      };
      currentRound = roundsData.data[roundId];
      saveRounds(roundsData); // persist before processing contributions
    }

    // Record contribution
    currentRound.contributions.push({
      clientId,
      weights,
      numSamples: numSamples || 1,
      metrics: metrics || {},
      submittedAt: nowIso(),
    });

    // Update client
    const clientsData = loadClients();
    const client = clientsData.data[clientId];
    if (client) {
      client.lastSeen = nowIso();
      client.roundsParticipated++;
    }
    saveClients(clientsData);

    // Check if we have enough contributions to complete the round
    const minNeeded = fed.minClientsPerRound || 2;
    if (currentRound.contributions.length >= minNeeded) {
      currentRound.aggregatedWeights = aggregateWeightsStub(currentRound.contributions, fed.aggregationStrategy);
      currentRound.status = 'completed';
      currentRound.completedAt = nowIso();
      fed.currentRound++;
      fed.completedRounds++;
      if (fed.currentRound > fed.totalRounds) fed.status = 'completed';
    }
    saveRounds(roundsData); // persist with contributions
    saveFeds(feds);

    res.status(201).json({
      contributionId: `${clientId}-r${currentRound.roundNumber}`,
      round: { id: currentRound.id, roundNumber: currentRound.roundNumber, status: currentRound.status },
      contributionsNeeded: Math.max(0, minNeeded - currentRound.contributions.length),
    });
  });

  app.get('/api/rounds/:id', (req, res) => {
    const data = loadRounds();
    const r = data.data[req.params.id];
    if (!r) return res.status(404).json({ error: 'not_found' });
    res.json({ round: r });
  });

  // ── Aggregated weights download ─────────────────────────────────
  app.get('/api/federations/:id/weights', (req, res) => {
    const feds = loadFeds();
    const fed = feds.data[req.params.id];
    if (!fed) return res.status(404).json({ error: 'not_found' });

    const roundsData = loadRounds();
    const completedRounds = Object.values(roundsData.data)
      .filter((r) => r.federationId === req.params.id && r.status === 'completed')
      .sort((a, b) => b.roundNumber - a.roundNumber);

    if (completedRounds.length === 0) return res.status(404).json({ error: 'no_weights', message: 'no completed rounds yet' });

    const latest = completedRounds[0];
    res.json({
      federationId: req.params.id,
      roundNumber: latest.roundNumber,
      weights: latest.aggregatedWeights,
      totalContributions: latest.contributions.length,
      strategy: fed.aggregationStrategy,
    });
  });

  // ── Stats ──────────────────────────────────────────────────────
  app.get('/api/stats', (req, res) => {
    const feds = loadFeds();
    const clients = loadClients();
    const rounds = loadRounds();
    const activeFeds = Object.values(feds.data).filter((f) => f.status === 'training').length;
    const totalClients = Object.keys(clients.data).length;
    const completedRounds = Object.values(rounds.data).filter((r) => r.status === 'completed').length;
    res.json({
      totalFederations: Object.keys(feds.data).length,
      activeFederations: activeFeds,
      totalClients,
      totalRounds: Object.keys(rounds.data).length,
      completedRounds,
    });
  });

  // ── Catalogs ─────────────────────────────────────────────────────
  app.get('/api/strategies', (_req, res) => res.json({
    strategies: [
      { id: 'fedavg',    name: 'Federated Averaging', description: 'Simple weighted average of client model updates', suitableFor: ['heterogeneous data', 'large clients'] },
      { id: 'fedprox',   name: 'FedProx', description: 'Adds proximal term to handle heterogeneous local training', suitableFor: ['non-iid data', 'varying compute'] },
      { id: 'fednova',   name: 'FedNova', description: 'Normalizes contributions accounting for varied local epochs', suitableFor: ['different training lengths'] },
      { id: 'scaffold',  name: 'SCAFFOLD', description: 'Uses control variates to correct client drift', suitableFor: ['highly non-iid data', 'strong privacy'] },
      { id: 'fedopt',    name: 'FedOpt', description: 'Adaptive federated optimization using server-side optimizers', suitableFor: ['unstable aggregation', 'adaptive learning'] },
    ],
  }));

  app.get('/api/architectures', (_req, res) => res.json({ architectures: MODEL_ARCHITECTURES }));

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`federated-learning listening on ${PORT}`));
}

module.exports = { createApp };
