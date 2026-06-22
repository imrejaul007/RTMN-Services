// Feature Store (4164) — central ML feature registry
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet()); app.use(cors()); app.use(compression());
app.use(express.json({ limit: '2mb' })); app.use(morgan('tiny'));

const PORT = process.env.PORT || 4164;
const SERVICE = 'feature-store';

const features = new Map();   // id -> { id, name, type, owner, version, description }
const values = new Map();     // key (entity_id::feature_name) -> { value, ts }
const entityIdx = new Map();  // entity_id -> [feature_names]

const ok = (d) => ({ ok: true, ...d });
const fail = (m, c = 400) => ({ ok: false, error: m });

function seed() {
  const fs = [
    { name: 'customer_lifetime_value', type: 'float', owner: 'sales-os', description: 'LTV in USD' },
    { name: 'customer_churn_score', type: 'float', owner: 'customer-success-os', description: '0-1 churn probability' },
    { name: 'order_total_30d', type: 'float', owner: 'restaurant-os', description: 'Sum of orders in last 30 days' },
    { name: 'product_rating_avg', type: 'float', owner: 'retail-os', description: 'Average rating 0-5' },
    { name: 'last_purchase_days_ago', type: 'int', owner: 'sales-os', description: 'Days since last purchase' },
    { name: 'campaign_clicks_7d', type: 'int', owner: 'marketing-os', description: 'Clicks in last 7 days' },
    { name: 'support_tickets_open', type: 'int', owner: 'support-copilot', description: 'Open ticket count' },
    { name: 'nps_score', type: 'int', owner: 'customer-success-os', description: 'NPS 0-10' },
    { name: 'avg_session_minutes', type: 'float', owner: 'analytics-os', description: 'Average session duration' },
    { name: 'cart_abandon_count', type: 'int', owner: 'commerce', description: 'Carts abandoned in 30d' },
    { name: 'has_active_subscription', type: 'bool', owner: 'subscription-os', description: 'True if subscription active' },
    { name: 'referral_count', type: 'int', owner: 'sales-os', description: 'Number of successful referrals' }
  ];
  fs.forEach(f => { const id = uuid(); features.set(id, { id, version: 1, ...f, created_at: new Date().toISOString() }); });

  // Sample values
  ['cust-001', 'cust-002', 'cust-003'].forEach((eid, i) => {
    fs.slice(0, 5).forEach(f => {
      const k = `${eid}::${f.name}`;
      values.set(k, { entity_id: eid, feature_name: f.name, value: f.type === 'float' ? Math.random() * 100 : Math.floor(Math.random() * 10), ts: new Date().toISOString() });
    });
  });
}

app.get('/health', (_q, r) => r.json(ok({ service: SERVICE, port: PORT, status: 'healthy', features: features.size, values: values.size })));
app.get('/ready', (_q, r) => r.json(ok({ ready: true })));

app.post('/api/features', (req, res) => {
  const { name, type, owner } = req.body || {};
  if (!name || !type || !owner) return res.status(400).json(fail('name, type, owner required'));
  const id = uuid();
  const f = { id, name, type, owner, version: 1, created_at: new Date().toISOString() };
  features.set(id, f);
  res.status(201).json(ok({ feature: f }));
});
app.get('/api/features', (req, res) => {
  const { owner, type } = req.query;
  let list = [...features.values()];
  if (owner) list = list.filter(f => f.owner === owner);
  if (type) list = list.filter(f => f.type === type);
  res.json(ok({ features: list, count: list.length }));
});
app.get('/api/features/:id', (req, res) => {
  const f = features.get(req.params.id);
  if (!f) return res.status(404).json(fail('not found'));
  res.json(ok({ feature: f }));
});

// Online serving: get feature value for entity
app.get('/api/online/:entity_id/:feature_name', (req, res) => {
  const k = `${req.params.entity_id}::${req.params.feature_name}`;
  const v = values.get(k);
  if (!v) return res.status(404).json(fail('value not found'));
  res.json(ok({ value: v }));
});

// Get all features for an entity
app.get('/api/online/:entity_id', (req, res) => {
  const eid = req.params.entity_id;
  const list = [...values.values()].filter(v => v.entity_id === eid);
  res.json(ok({ entity_id: eid, values: list, count: list.length }));
});

// Set feature value
app.put('/api/online/:entity_id/:feature_name', (req, res) => {
  const { value } = req.body || {};
  if (value == null) return res.status(400).json(fail('value required'));
  const k = `${req.params.entity_id}::${req.params.feature_name}`;
  const v = { entity_id: req.params.entity_id, feature_name: req.params.feature_name, value, ts: new Date().toISOString() };
  values.set(k, v);
  res.json(ok({ value: v }));
});

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));