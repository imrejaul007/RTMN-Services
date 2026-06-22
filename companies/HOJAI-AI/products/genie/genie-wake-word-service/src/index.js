/**
 * Genie Wake Word Service
 * Detects "Hey Genie" and "हे जिनी" wake words
 * Port: 4767
 *
 * Endpoints:
 *   GET  /health                  - service health
 *   GET  /api/wake-words          - list configured wake words
 *   POST /api/detect              - detect wake word in audio text
 *   POST /api/detect/batch        - batch detect
 *   GET  /api/detections          - recent detections (paginated)
 *   GET  /api/detections/:id      - get one
 *   GET  /api/models              - list wake-word models
 *   POST /api/models/train        - train (record samples)
 *   GET  /api/models/:id          - get model
 *   POST /api/sensitivity         - update sensitivity
 *   GET  /api/sensitivity         - current sensitivity per language
 *   GET  /api/statistics          - detection stats
 *   GET  /api/clients             - list active ws clients
 *   POST /api/listen/start        - start listening session
 *   POST /api/listen/stop         - stop listening session
 *   POST /api/feedback            - submit false-positive feedback
 *   GET  /api/feedback            - list feedback
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4767;
const SERVICE_NAME = 'genie-wake-word-service';
const SERVICE_VERSION = '1.0.0';

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));

// =================================================================
// CONSTANTS
// =================================================================

const LANGUAGES = ['english', 'hindi', 'spanish', 'arabic', 'french'];
const SESSION_STATUSES = ['active', 'paused', 'stopped'];

// =================================================================
// STORES
// =================================================================

const models = new PersistentMap('models', { serviceName: 'genie-wake-word-service' });
const detections = [];
const clients = new PersistentMap('clients', { serviceName: 'genie-wake-word-service' });
const sessions = new PersistentMap('sessions', { serviceName: 'genie-wake-word-service' });
const feedback = [];
const sensitivity = new PersistentMap('sensitivity', { serviceName: 'genie-wake-word-service' });

// =================================================================
// SEED
// =================================================================

function seed() {
  // Seed wake-word models
  const seedModels = [
    { id: 'm-en-default', name: 'English Default', language: 'english', phrases: ['hey genie', 'hi genie', 'ok genie'], samples: 12450, accuracy: 0.94, trainedAt: '2026-06-01T00:00:00Z' },
    { id: 'm-hi-default', name: 'Hindi Default', language: 'hindi', phrases: ['हे जिनी', 'अरे जिनी', 'भाई जिनी'], samples: 8200, accuracy: 0.91, trainedAt: '2026-06-01T00:00:00Z' },
    { id: 'm-es-default', name: 'Spanish Default', language: 'spanish', phrases: ['oye genie', 'hola genie', 'genie'], samples: 6100, accuracy: 0.88, trainedAt: '2026-06-05T00:00:00Z' },
    { id: 'm-ar-default', name: 'Arabic Default', language: 'arabic', phrases: ['يا جيني', 'جينى'], samples: 4900, accuracy: 0.86, trainedAt: '2026-06-05T00:00:00Z' },
    { id: 'm-fr-default', name: 'French Default', language: 'french', phrases: ['dis genie', 'salut genie'], samples: 3300, accuracy: 0.85, trainedAt: '2026-06-10T00:00:00Z' },
  ];
  seedModels.forEach(m => models.set(m.id, m));

  // Seed sensitivities
  LANGUAGES.forEach(lang => {
    sensitivity.set(lang, lang === 'english' ? 0.75 : lang === 'hindi' ? 0.70 : 0.72);
  });

  // Seed some historical detections
  const seedDetections = [
    { id: uuidv4(), phrase: 'hey genie', language: 'english', modelId: 'm-en-default', confidence: 0.96, source: 'mic-001', timestamp: '2026-06-20T10:00:00Z', context: 'home' },
    { id: uuidv4(), phrase: 'हे जिनी', language: 'hindi', modelId: 'm-hi-default', confidence: 0.92, source: 'mic-002', timestamp: '2026-06-20T10:05:00Z', context: 'mobile' },
    { id: uuidv4(), phrase: 'oye genie', language: 'spanish', modelId: 'm-es-default', confidence: 0.88, source: 'mic-003', timestamp: '2026-06-20T10:10:00Z', context: 'car' },
  ];
  seedDetections.forEach(d => detections.push(d));
}
seed();

// =================================================================
// HELPERS
// =================================================================

function detectWakeWord(text, language) {
  if (!text || !language) return null;
  const model = Array.from(models.values()).find(m => m.language === language);
  if (!model) return null;
  const lower = text.toLowerCase().trim();
  const matched = model.phrases.find(p => lower.includes(p.toLowerCase()));
  if (!matched) return null;
  const sens = sensitivity.get(language) || 0.7;
  const confidence = Math.min(0.99, sens + Math.random() * 0.2);
  return { matched, modelId: model.id, confidence };
}

function recordDetection(detection) {
  const full = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    ...detection,
  };
  detections.push(full);
  return full;
}

// =================================================================
// ENDPOINTS
// =================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    port: PORT,
    counts: {
      models: models.size,
      detections: detections.length,
      activeClients: clients.size,
      activeSessions: Array.from(sessions.values()).filter(s => s.status === 'active').length,
      feedback: feedback.length,
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/wake-words', (req, res) => {
  const all = [];
  for (const m of models.values()) {
    all.push({ language: m.language, phrases: m.phrases, accuracy: m.accuracy });
  }
  res.json({ wakeWords: all, total: all.length });
});

app.post('/api/detect',requireAuth,  (req, res) => {
  const { text, language, source } = req.body;
  if (!text || !language) return res.status(400).json({ error: 'text and language required' });
  const result = detectWakeWord(text, language);
  if (!result) return res.json({ detected: false });
  const det = recordDetection({
    phrase: result.matched,
    language,
    modelId: result.modelId,
    confidence: result.confidence,
    source: source || 'unknown',
    context: 'api',
  });
  res.json({ detected: true, ...det });
});

app.post('/api/detect/batch',requireAuth,  (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items array required' });
  const results = items.map(item => {
    const r = detectWakeWord(item.text, item.language);
    return { input: item, detected: !!r, ...(r || {}) };
  });
  res.json({ results, total: results.length });
});

app.get('/api/detections', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  const filtered = req.query.language ? detections.filter(d => d.language === req.query.language) : detections;
  const page = filtered.slice().reverse().slice(offset, offset + limit);
  res.json({ detections: page, total: filtered.length, limit, offset });
});

app.get('/api/detections/:id', (req, res) => {
  const d = detections.find(x => x.id === req.params.id);
  if (!d) return res.status(404).json({ error: 'Not found' });
  res.json(d);
});

app.get('/api/models', (req, res) => {
  const lang = req.query.language;
  const list = lang ? Array.from(models.values()).filter(m => m.language === lang) : Array.from(models.values());
  res.json({ models: list, total: list.length });
});

app.post('/api/models/train',requireAuth,  (req, res) => {
  const { name, language, phrases } = req.body;
  if (!name || !language || !Array.isArray(phrases)) return res.status(400).json({ error: 'name, language, phrases[] required' });
  const id = 'm-' + uuidv4().slice(0, 8);
  const model = {
    id, name, language, phrases,
    samples: 100,
    accuracy: 0.5 + Math.random() * 0.3,
    trainedAt: new Date().toISOString(),
  };
  models.set(id, model);
  res.status(201).json(model);
});

app.get('/api/models/:id', (req, res) => {
  const m = models.get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Not found' });
  res.json(m);
});

app.post('/api/sensitivity',requireAuth,  (req, res) => {
  const { language, value } = req.body;
  if (!language || typeof value !== 'number') return res.status(400).json({ error: 'language and value required' });
  if (value < 0 || value > 1) return res.status(400).json({ error: 'value must be between 0 and 1' });
  sensitivity.set(language, value);
  res.json({ language, value });
});

app.get('/api/sensitivity', (req, res) => {
  const all = {};
  for (const [k, v] of sensitivity) all[k] = v;
  res.json({ sensitivity: all });
});

app.get('/api/statistics', (req, res) => {
  const byLang = {};
  detections.forEach(d => { byLang[d.language] = (byLang[d.language] || 0) + 1; });
  const avgConfidence = detections.length ? detections.reduce((s, d) => s + d.confidence, 0) / detections.length : 0;
  const falsePositives = feedback.filter(f => f.type === 'false_positive').length;
  res.json({
    totalDetections: detections.length,
    activeClients: clients.size,
    byLanguage: byLang,
    avgConfidence: +avgConfidence.toFixed(3),
    falsePositives,
    lastDetection: detections[detections.length - 1],
  });
});

app.get('/api/clients', (req, res) => {
  const list = Array.from(clients.entries()).map(([id, c]) => ({ id, detections: c.detections, connectedAt: c.connectedAt }));
  res.json({ clients: list, total: list.length });
});

app.post('/api/listen/start',requireAuth,  (req, res) => {
  const { clientId, language } = req.body;
  const id = clientId || uuidv4().slice(0, 8);
  const session = {
    id,
    language: language || 'english',
    status: 'active',
    startedAt: new Date().toISOString(),
    detections: 0,
  };
  sessions.set(id, session);
  res.status(201).json(session);
});

app.post('/api/listen/stop',requireAuth,  (req, res) => {
  const { clientId } = req.body;
  const s = sessions.get(clientId);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  s.status = 'stopped';
  s.stoppedAt = new Date().toISOString();
  res.json(s);
});

app.post('/api/feedback',requireAuth,  (req, res) => {
  const { type, detectionId, note } = req.body;
  if (!type) return res.status(400).json({ error: 'type required' });
  const entry = {
    id: uuidv4(),
    type,
    detectionId,
    note,
    timestamp: new Date().toISOString(),
  };
  feedback.push(entry);
  res.status(201).json(entry);
});

app.get('/api/feedback', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({ feedback: feedback.slice(-limit).reverse(), total: feedback.length });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Genie Wake Word Service v${SERVICE_VERSION}`);
  console.log(`  Listening on :${PORT}`);
  console.log(`  Languages: ${LANGUAGES.join(', ')}`);
  console.log(`  Models: ${models.size} | Detections: ${detections.length}`);
  console.log(`${'='.repeat(60)}\n`);
});
installGracefulShutdown(server);
