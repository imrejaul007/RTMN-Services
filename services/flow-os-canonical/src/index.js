// Flow OS Canonical (4156) — canonical cross-service workflow definitions
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet()); app.use(cors()); app.use(compression());
app.use(express.json({ limit: '2mb' })); app.use(morgan('tiny'));

const PORT = process.env.PORT || 4156;
const SERVICE = 'flow-os-canonical';

const flows = new Map();       // flowId -> canonical workflow
const instantiations = new Map(); // instanceId -> { flow_id, status, current_step, started_at }

const ok = (d) => ({ ok: true, ...d });
const fail = (m, c = 400) => ({ ok: false, error: m });

function seed() {
  const seeds = [
    {
      name: 'checkout',
      description: 'Generic checkout flow across any commerce OS',
      steps: [
        { key: 'cart_review', service: 'cart-twin' },
        { key: 'inventory_check', service: 'inventory-twin' },
        { key: 'payment_charge', service: 'agent-wallets' },
        { key: 'order_create', service: 'order-twin' },
        { key: 'notify', service: 'notification-service' }
      ]
    },
    {
      name: 'onboarding',
      description: 'Generic customer onboarding flow',
      steps: [
        { key: 'identity_verify', service: 'corpid-service' },
        { key: 'profile_create', service: 'customer-twin' },
        { key: 'welcome_notify', service: 'notification-service' }
      ]
    },
    {
      name: 'escalation',
      description: 'Customer support escalation flow',
      steps: [
        { key: 'tier1_diagnose', service: 'agent-copilot' },
        { key: 'tier2_route', service: 'acn-integration' },
        { key: 'human_handoff', service: 'support-copilot' }
      ]
    },
    {
      name: 'lead_routing',
      description: 'Marketing lead qualification + sales assignment',
      steps: [
        { key: 'enrich', service: 'customer-intelligence' },
        { key: 'score', service: 'lead-twin' },
        { key: 'route', service: 'sales-os' }
      ]
    }
  ];
  seeds.forEach(s => {
    const id = uuid();
    flows.set(id, { id, ...s, version: 1, created_at: new Date().toISOString() });
  });
}

app.get('/health', (_q, r) => r.json(ok({ service: SERVICE, port: PORT, status: 'healthy', flows: flows.size })));
app.get('/ready', (_q, r) => r.json(ok({ ready: true })));

app.post('/api/flows', (req, res) => {
  const { name, description, steps } = req.body || {};
  if (!name || !Array.isArray(steps)) return res.status(400).json(fail('name, steps[] required'));
  const id = uuid();
  const flow = { id, name, description: description || '', steps, version: 1, created_at: new Date().toISOString() };
  flows.set(id, flow);
  res.status(201).json(ok({ flow }));
});
app.get('/api/flows', (_q, r) => r.json(ok({ flows: [...flows.values()], count: flows.size })));
app.get('/api/flows/:id', (req, res) => {
  const f = flows.get(req.params.id);
  if (!f) return res.status(404).json(fail('not found'));
  res.json(ok({ flow: f }));
});

// Instantiate a flow = start tracking its execution
app.post('/api/flows/:id/instantiate', (req, res) => {
  const f = flows.get(req.params.id);
  if (!f) return res.status(404).json(fail('not found'));
  const id = uuid();
  const inst = { id, flow_id: f.id, flow_name: f.name, status: 'running', current_step: 0, total_steps: f.steps.length, started_at: new Date().toISOString(), context: req.body || {} };
  instantiations.set(id, inst);
  res.status(201).json(ok({ instantiation: inst }));
});

// Advance step
app.post('/api/instantiations/:id/advance', (req, res) => {
  const inst = instantiations.get(req.params.id);
  if (!inst) return res.status(404).json(fail('not found'));
  if (inst.status !== 'running') return res.status(409).json(fail(`cannot advance: ${inst.status}`));
  const f = flows.get(inst.flow_id);
  if (!f) return res.status(500).json(fail('flow missing'));
  if (inst.current_step >= f.steps.length) { inst.status = 'completed'; return res.json(ok({ instantiation: inst })); }
  const step = f.steps[inst.current_step];
  inst.current_step += 1;
  if (inst.current_step >= f.steps.length) inst.status = 'completed';
  res.json(ok({ instantiation: inst, just_completed: step }));
});

app.get('/api/instantiations', (_q, r) => r.json(ok({ instantiations: [...instantiations.values()], count: instantiations.size })));
app.get('/api/instantiations/:id', (req, res) => {
  const inst = instantiations.get(req.params.id);
  if (!inst) return res.status(404).json(fail('not found'));
  res.json(ok({ instantiation: inst }));
});

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));