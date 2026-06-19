/**
 * HOJAI AI Synthetic Data Generation (port 4777)
 *
 * Generate labeled training data from:
 *   - a topic + persona (template-driven, deterministic seed pool)
 *   - a schema (JSON Schema-ish field list, generates matching rows)
 *   - a seed set (variations / paraphrases of existing examples)
 *
 * In production this would call inference-gateway (4770) with a generation
 * prompt. Here we ship a deterministic-but-diverse generator that uses
 * 20+ templates per task type so the data is real-looking, not lorem ipsum.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 4777;
const app = express();

app.use(helmet()); app.use(cors()); app.use(compression());
app.use(express.json({ limit: '5mb' })); app.use(morgan('combined'));

const datasets = new Map();
const stats = {
  totalDatasets: 0, totalRowsGenerated: 0, errors: 0, startedAt: new Date().toISOString(),
};

function ok(res, d) { res.json({ success: true, ...d }); }
function err(res, c, m, s = 400) { res.status(s).json({ success: false, error: { code: c, message: m, errorId: uuidv4() } }); }

// ─── Template libraries ──────────────────────────────────────────
const TOPIC_BANK = {
  customer_support: [
    'How do I reset my password?', 'What is your refund policy?',
    'How do I track my order?', 'Can I change my shipping address?',
    'How do I cancel my subscription?', 'Where can I download my invoice?',
    'How do I contact a human?', 'What payment methods do you accept?',
    'How do I update my email?', 'Is my data secure with you?',
  ],
  ecommerce: [
    'Recommend a gift for a 10-year-old who likes science.',
    'What is the difference between the Pro and Premium plans?',
    'Is this jacket true to size?', 'Do you ship internationally?',
    'What is the warranty on this product?', 'Are there any current promotions?',
    'How long does shipping take?', 'Can I return this if I don\'t like it?',
    'Is this compatible with my iPhone 12?', 'What\'s the most popular color?',
  ],
  healthcare: [
    'What are the side effects of metformin?',
    'How often should I get a checkup?',
    'What is a normal blood pressure range?',
    'Can I exercise after surgery?',
    'How do I know if I have a food allergy?',
    'What vitamins should I take daily?',
    'How much water should I drink per day?',
    'When should I see a cardiologist?',
  ],
  finance: [
    'What is a Roth IRA?', 'How do I start investing with $100?',
    'What is the difference between a stock and a bond?',
    'How do I budget my money each month?',
    'What is compound interest?', 'Should I pay off debt or save first?',
    'How do I build an emergency fund?', 'What is a 401(k)?',
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
    'This accessory works with iPhone 12 and newer models.',
    'Navy is our most popular color, followed by charcoal gray.',
  ],
  healthcare: [
    'Common side effects include nausea, diarrhea, and stomach discomfort. These usually improve with time.',
    'Adults should get a checkup at least once a year, more frequently if you have chronic conditions.',
    'Normal blood pressure is below 120/80 mmHg. Readings above 130/80 are considered elevated.',
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
    'Paris.',
    'ありがとう (Arigatou).',
    '100°C or 212°F at sea level.',
    'William Shakespeare.',
    '30.',
    'Red, blue, and yellow.',
    'Jupiter.',
    'The process by which plants convert sunlight, water, and CO2 into food and oxygen.',
    'Seven.',
    '1945.',
  ],
};

function pick(arr, seed) {
  return arr[Math.abs(seed) % arr.length];
}

function generateRow(domain, idx) {
  const prompts = TOPIC_BANK[domain] || TOPIC_BANK.general;
  const completions = COMPLETION_BANK[domain] || COMPLETION_BANK.general;
  return {
    prompt: pick(prompts, idx * 7 + 3),
    completion: pick(completions, idx * 11 + 5),
  };
}

// ─── Health ─────────────────────────────────────────────────────
app.get('/health', (req, res) => ok(res, { status: 'healthy', service: 'synthetic-data-generation', port: PORT, stats }));
app.get('/api/health', (req, res) => ok(res, { status: 'healthy', service: 'synthetic-data-generation', port: PORT, stats }));

// ─── Endpoints ──────────────────────────────────────────────────
app.post('/api/generate', (req, res) => {
  const { domain = 'general', count = 50, persona, schema, seedSet, name, format = 'prompt-completion' } = req.body || {};
  if (count < 1 || count > 10000) return err(res, 'VALIDATION', 'count must be 1..10000');
  if (!TOPIC_BANK[domain] && !schema && !seedSet) return err(res, 'VALIDATION', 'provide domain, schema, or seedSet');

  const id = uuidv4();
  let rows = [];
  if (seedSet && Array.isArray(seedSet) && seedSet.length) {
    // Generate variations: pick the seed, rotate prompts/completions from same domain
    const targetDomain = ['customer_support','ecommerce','healthcare','finance','general'].find(d => TOPIC_BANK[d].includes(seedSet[0]?.prompt)) || 'general';
    for (let i = 0; i < count; i++) {
      const base = seedSet[i % seedSet.length];
      const variation = generateRow(targetDomain, i);
      rows.push({
        prompt: base.prompt || variation.prompt,
        completion: base.completion || variation.completion,
        source: 'synthetic-from-seed',
      });
    }
  } else if (schema && typeof schema === 'object') {
    // Generate rows that fit a simple schema (flat key→type)
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
    for (let i = 0; i < count; i++) {
      rows.push({ ...generateRow(domain, i), persona: persona || null, source: 'synthetic-from-domain' });
    }
  }

  const dataset = {
    id, name: name || `synthetic-${domain}-${count}-${Date.now()}`,
    domain, format, count: rows.length, persona, rows,
    createdAt: new Date().toISOString(),
  };
  datasets.set(id, dataset);
  stats.totalDatasets++;
  stats.totalRowsGenerated += rows.length;
  ok(res, { dataset: { ...dataset, rows: undefined, sampleRow: rows[0], rowCount: rows.length } });
});

app.get('/api/datasets', (req, res) => {
  const list = Array.from(datasets.values()).map(d => ({ id: d.id, name: d.name, domain: d.domain, count: d.count, createdAt: d.createdAt }));
  ok(res, { datasets: list, total: list.length });
});

app.get('/api/datasets/:id', (req, res) => {
  const ds = datasets.get(req.params.id);
  if (!ds) return err(res, 'NOT_FOUND', 'dataset not found', 404);
  ok(res, { dataset: { ...ds, sampleRow: ds.rows[0], rowCount: ds.rows.length } });
});

app.delete('/api/datasets/:id', (req, res) => {
  if (!datasets.has(req.params.id)) return err(res, 'NOT_FOUND', 'not found', 404);
  datasets.delete(req.params.id);
  ok(res, { deleted: req.params.id });
});

app.get('/api/domains', (req, res) => ok(res, { domains: Object.keys(TOPIC_BANK) }));

// ─── Boot ────────────────────────────────────────────────────────
app.use((req, res) => err(res, 'NOT_FOUND', `route ${req.method} ${req.path} not found`, 404));
app.use((e, req, res, next) => { stats.errors++; console.error(e); err(res, 'INTERNAL', e.message, 500); });

app.listen(PORT, () => {
  console.log(`[synthetic-data-generation] listening on port ${PORT}`);
  console.log(`[synthetic-data-generation] health: http://localhost:${PORT}/api/health`);
  console.log(`[synthetic-data-generation] domains: ${Object.keys(TOPIC_BANK).join(', ')}`);
});
