/**
 * CRM Services
 * Port: 4774
 * Leads, Deals, Pipeline, Tasks, Contacts
 */
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4774;

const leads = new Map();
const deals = new Map();
const contacts = new Map();
const tasks = new Map();

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'crm-services' }));

// Contacts
app.post('/api/contacts', (req, res) => {
  const contact = { id: uuidv4(), ...req.body, createdAt: new Date().toISOString() };
  contacts.set(contact.id, contact);
  res.status(201).json({ success: true, contact });
});
app.get('/api/contacts', (_, res) => res.json({ success: true, contacts: Array.from(contacts.values()) }));
app.get('/api/contacts/:id', (req, res) => {
  const c = contacts.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Contact not found' });
  res.json({ success: true, contact: c });
});

// Leads
app.post('/api/leads', (req, res) => {
  const lead = { id: uuidv4(), ...req.body, status: 'new', source: req.body.source || 'web', createdAt: new Date().toISOString() };
  leads.set(lead.id, lead);
  res.status(201).json({ success: true, lead });
});
app.get('/api/leads', (req, res) => {
  const { status } = req.query;
  let results = Array.from(leads.values());
  if (status) results = results.filter(l => l.status === status);
  res.json({ success: true, count: results.length, leads: results });
});
app.put('/api/leads/:id', (req, res) => {
  const l = leads.get(req.params.id);
  if (!l) return res.status(404).json({ error: 'Lead not found' });
  const updated = { ...l, ...req.body };
  leads.set(l.id, updated);
  res.json({ success: true, lead: updated });
});

// Deals
app.post('/api/deals', (req, res) => {
  const deal = { id: uuidv4(), ...req.body, stage: 'qualification', value: req.body.value || 0, probability: 20, createdAt: new Date().toISOString() };
  deals.set(deal.id, deal);
  res.status(201).json({ success: true, deal });
});
app.get('/api/deals', (req, res) => res.json({ success: true, deals: Array.from(deals.values()) }));
app.put('/api/deals/:id/stage', (req, res) => {
  const d = deals.get(req.params.id);
  if (!d) return res.status(404).json({ error: 'Deal not found' });
  d.stage = req.body.stage;
  d.probability = { qualification: 20, proposal: 40, negotiation: 60, closed_won: 100, closed_lost: 0 }[d.stage] || 20;
  deals.set(d.id, d);
  res.json({ success: true, deal: d });
});

// Tasks
app.post('/api/tasks', (req, res) => {
  const task = { id: uuidv4(), ...req.body, status: 'pending', createdAt: new Date().toISOString() };
  tasks.set(task.id, task);
  res.status(201).json({ success: true, task });
});
app.get('/api/tasks', (req, res) => {
  const { assignee, status } = req.query;
  let results = Array.from(tasks.values());
  if (assignee) results = results.filter(t => t.assignee === assignee);
  if (status) results = results.filter(t => t.status === status);
  res.json({ success: true, tasks: results });
});

// Pipeline Stats
app.get('/api/pipeline/stats', (_, res) => {
  const allDeals = Array.from(deals.values());
  const stats = {
    totalDeals: allDeals.length,
    totalValue: allDeals.reduce((sum, d) => sum + d.value, 0),
    weightedValue: allDeals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0),
    byStage: {}
  };
  allDeals.forEach(d => {
    stats.byStage[d.stage] = (stats.byStage[d.stage] || 0) + 1;
  });
  res.json({ success: true, stats });
});

app.listen(PORT, () => console.log(`\n📊 CRM Services — PORT ${PORT}\n`));
export default app;
