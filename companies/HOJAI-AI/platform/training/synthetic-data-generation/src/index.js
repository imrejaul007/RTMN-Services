/**
 * HOJAI AI Synthetic Data Generation (port 4777) — SELF-CONTAINED
 *
 * Generate labeled training data from:
 *   - topic + persona (template-driven, deterministic seed pool)
 *   - schema (JSON Schema-ish field list)
 *   - seed set (paraphrase existing examples)
 *
 * Storage: file-backed JSON (atomic temp+rename writes)
 * Auth:    X-Internal-Token header
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '4777', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'synthetic-data-gen-internal-token';
const DS_FILE = path.join(DATA_DIR, 'datasets.json');

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DS_FILE)) fs.writeFileSync(DS_FILE, JSON.stringify({ data: {} }));
}
function load() { ensureDir(); try { return JSON.parse(fs.readFileSync(DS_FILE, 'utf8')); } catch (_) { return { data: {} }; } }
function save(d) { const tmp = DS_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, DS_FILE); }

// ─── Template banks ─────────────────────────────────────────────────
const TOPIC_BANK = {
  customer_support: [
    'How do I reset my password?', 'What is your refund policy?', 'How do I track my order?',
    'Can I change my shipping address?', 'How do I cancel my subscription?',
    'Where can I download my invoice?', 'How do I contact a human?',
    'What payment methods do you accept?', 'How do I update my email?', 'Is my data secure?',
  ],
  ecommerce: [
    'Recommend a gift for a 10-year-old who likes science.', 'Difference between Pro and Premium?',
    'Is this jacket true to size?', 'Do you ship internationally?',
    'What is the warranty on this product?', 'Are there any promotions?',
    'How long does shipping take?', 'Can I return this if I don\'t like it?',
    'Is this compatible with iPhone 12?', 'What\'s the most popular color?',
  ],
  healthcare: [
    'What are the side effects of metformin?', 'How often should I get a checkup?',
    'What is a normal blood pressure range?', 'Can I exercise after surgery?',
    'How do I know if I have a food allergy?', 'What vitamins should I take daily?',
    'How much water should I drink per day?', 'When should I see a cardiologist?',
  ],
  finance: [
    'What is a Roth IRA?', 'How do I start investing with $100?',
    'What is the difference between a stock and a bond?',
    'How do I budget my money each month?', 'What is compound interest?',
    'Should I pay off debt or save first?', 'How do I build an emergency fund?',
    'What is a 401(k)?',
  ],
  general: [
    'What is the capital of France?', 'Translate "thank you" to Japanese.',
    'What is the boiling point of water?', 'Who wrote Romeo and Juliet?',
    'What is 15% of 200?', 'Name three primary colors.',
    'What is the largest planet in our solar system?', 'Define photosynthesis.',
    'How many continents are there?', 'What year did WW2 end?',
  ],
};
const COMPLETION_BANK = {
  customer_support: [
    'Go to Settings > Account > Reset Password. You\'ll receive an email within 5 minutes.',
    'We offer a 30-day money-back guarantee on all first-time purchases.',
    'You can track your order from the Orders page in your account dashboard.',
    'Yes, you can update your shipping address up to 24 hours before the package ships.',
    'You can cancel anytime from Settings > Subscription > Manage.',
    'All invoices are available under Account > Billing History.',
    'Type "agent" in the chat to be connected with a human representative.',
    'We accept Visa, Mastercard, Amex, PayPal, and Apple Pay.',
  ],
  ecommerce: [
    'A science kit or robotics starter set would be perfect for a 10-year-old.',
    'Pro includes core features; Premium adds advanced analytics, priority support, and API access.',
    'This jacket runs slightly small — most customers size up for a relaxed fit.',
    'Yes, we ship to 180+ countries. International rates calculated at checkout.',
    'All products include a 1-year manufacturer warranty.',
    'Yes, use code SPRING25 for 25% off select items through May 31.',
    'Standard shipping is 3-5 business days; express is 1-2 business days.',
    'Returns are free within 30 days. Use the prepaid label included in your package.',
  ],
  healthcare: [
    'Common side effects include nausea, diarrhea, and stomach discomfort. Usually improve with time.',
    'Adults should get a checkup at least once a year, more frequently with chronic conditions.',
    'Normal blood pressure is below 120/80 mmHg. Above 130/80 is considered elevated.',
    'Light activity is usually fine after 2-4 weeks. Avoid heavy lifting for 6 weeks.',
    'Common signs include hives, swelling, and digestive issues after eating the trigger food.',
    'Most adults benefit from vitamin D, B12, and omega-3 — but talk to your doctor first.',
    'About 2-3 liters per day is a general guideline, adjusted for activity level and climate.',
    'See a cardiologist for chest pain, palpitations, or if you have a family history of heart disease.',
  ],
  finance: [
    'A Roth IRA is a retirement account where you pay taxes on contributions now and withdraw tax-free in retirement.',
    'Start with a low-cost index fund. Many brokerages let you begin with as little as $1.',
    'A stock represents partial ownership in a company; a bond is a loan to a company or government.',
    'Use the 50/30/20 rule: 50% needs, 30% wants, 20% savings and debt repayment.',
    'Compound interest is interest earned on both the original amount and the accumulated interest.',
    'Build a $1,000 emergency fund first, then focus on high-interest debt, then long-term savings.',
    'Aim for 3-6 months of essential expenses in an easily accessible savings account.',
    'A 401(k) is an employer-sponsored retirement account with potential matching contributions.',
  ],
  general: [
    'Paris.', 'ありがとう (Arigatou).', '100°C or 212°F at sea level.',
    'William Shakespeare.', '30.', 'Red, blue, and yellow.',
    'Jupiter.', 'The process by which plants convert sunlight, water, and CO2 into food and oxygen.',
    'Seven.', '1945.',
  ],
};

function pick(arr, seed) { return arr[Math.abs(seed) % arr.length]; }
function generateRow(domain, idx) {
  const prompts = TOPIC_BANK[domain] || TOPIC_BANK.general;
  const completions = COMPLETION_BANK[domain] || COMPLETION_BANK.general;
  return { prompt: pick(prompts, idx * 7 + 3), completion: pick(completions, idx * 11 + 5) };
}

// ─── Middleware ────────────────────────────────────────────────────
function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

// ─── App ──────────────────────────────────────────────────────────
function createApp() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'synthetic-data-generation', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  app.post('/api/generate', requireInternal, (req, res) => {
    const { domain = 'general', count = 50, persona, schema, seedSet, name, format = 'prompt-completion' } = req.body || {};
    if (count < 1 || count > 10000) return res.status(400).json({ error: 'validation', message: 'count must be 1..10000' });
    if (!TOPIC_BANK[domain] && !schema && !(seedSet && Array.isArray(seedSet) && seedSet.length)) {
      return res.status(400).json({ error: 'validation', message: 'provide domain, schema, or seedSet' });
    }

    let rows = [];
    if (seedSet && Array.isArray(seedSet) && seedSet.length) {
      const targetDomain = Object.keys(TOPIC_BANK).find((d) => TOPIC_BANK[d].includes(seedSet[0]?.prompt)) || 'general';
      for (let i = 0; i < count; i++) {
        const base = seedSet[i % seedSet.length];
        const variation = generateRow(targetDomain, i);
        rows.push({ prompt: base.prompt || variation.prompt, completion: base.completion || variation.completion, source: 'synthetic-from-seed' });
      }
    } else if (schema && typeof schema === 'object') {
      for (let i = 0; i < count; i++) {
        const r = { _index: i };
        for (const [key, type] of Object.entries(schema)) {
          if (type === 'string') r[key] = `value_${i}_${key}`;
          else if (type === 'number') r[key] = i * 1.5;
          else if (type === 'boolean') r[key] = i % 2 === 0;
          else if (type === 'date') r[key] = new Date(Date.now() + i * 86400000).toISOString().slice(0, 10);
          else r[key] = null;
        }
        rows.push(r);
      }
    } else {
      for (let i = 0; i < count; i++) rows.push({ ...generateRow(domain, i), persona: persona || null, source: 'synthetic-from-domain' });
    }

    const id = newId('sdg');
    const data = load();
    data.data[id] = {
      id,
      name: name || `synthetic-${domain}-${count}-${Date.now()}`,
      domain, format, count: rows.length, persona,
      rows,
      createdAt: nowIso(),
    };
    save(data);
    res.status(201).json({
      id, name: data.data[id].name, domain, format,
      rowCount: rows.length, sampleRow: rows[0],
      createdAt: data.data[id].createdAt,
    });
  });

  app.get('/api/datasets', (_req, res) => {
    const data = load();
    const list = Object.values(data.data).map((d) => ({ id: d.id, name: d.name, domain: d.domain, count: d.count, createdAt: d.createdAt }));
    res.json({ datasets: list, total: list.length });
  });

  app.get('/api/datasets/:id', (req, res) => {
    const data = load();
    const ds = data.data[req.params.id];
    if (!ds) return res.status(404).json({ error: 'not_found' });
    res.json({ dataset: { ...ds, sampleRow: ds.rows[0], rowCount: ds.rows.length } });
  });

  app.delete('/api/datasets/:id', requireInternal, (req, res) => {
    const data = load();
    if (!data.data[req.params.id]) return res.status(404).json({ error: 'not_found' });
    delete data.data[req.params.id];
    save(data);
    res.json({ deleted: req.params.id });
  });

  app.get('/api/domains', (_req, res) => res.json({ domains: Object.keys(TOPIC_BANK) }));

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`synthetic-data-generation listening on ${PORT}`));
}

module.exports = { createApp };
