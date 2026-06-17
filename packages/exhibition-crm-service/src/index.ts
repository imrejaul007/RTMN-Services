import express from 'express';

const app = express();
const PORT = 5058;

app.use(express.json());

// Mock data
const deals = [
  { id: '1', company: 'TechCorp', value: 50000, stage: 'negotiation', probability: 75, contact: 'John Doe', lastActivity: '2026-06-15' },
  { id: '2', company: 'InnovateCo', value: 25000, stage: 'proposal', probability: 50, contact: 'Jane Smith', lastActivity: '2026-06-14' },
  { id: '3', company: 'StartupX', value: 10000, stage: 'qualified', probability: 25, contact: 'Bob Wilson', lastActivity: '2026-06-13' },
  { id: '4', company: 'EnterpriseInc', value: 100000, stage: 'closed_won', probability: 100, contact: 'Alice Brown', lastActivity: '2026-06-10' },
];

const contacts = [
  { id: '1', name: 'John Doe', company: 'TechCorp', email: 'john@techcorp.com', role: 'CTO', dealIds: ['1'] },
  { id: '2', name: 'Jane Smith', company: 'InnovateCo', email: 'jane@innovateco.com', role: 'VP Sales', dealIds: ['2'] },
  { id: '3', name: 'Bob Wilson', company: 'StartupX', email: 'bob@startupx.com', role: 'Founder', dealIds: ['3'] },
];

const activities = [
  { id: '1', dealId: '1', type: 'meeting', description: 'Initial demo call', date: '2026-06-15', user: 'sales_rep_1' },
  { id: '2', dealId: '2', type: 'email', description: 'Sent proposal', date: '2026-06-14', user: 'sales_rep_2' },
  { id: '3', dealId: '1', type: 'call', description: 'Follow-up discussion', date: '2026-06-16', user: 'sales_rep_1' },
];

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'exhibition-crm-service', port: PORT });
});

// Get all deals
app.get('/api/deals', (req, res) => {
  const { stage } = req.query;
  const filtered = stage ? deals.filter(d => d.stage === stage) : deals;
  res.json({ success: true, data: filtered });
});

// Get deal by ID
app.get('/api/deals/:id', (req, res) => {
  const deal = deals.find(d => d.id === req.params.id);
  if (!deal) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Deal not found' } });
  }
  res.json({ success: true, data: deal });
});

// Create deal
app.post('/api/deals', (req, res) => {
  const newDeal = {
    id: String(deals.length + 1),
    ...req.body,
    lastActivity: new Date().toISOString().split('T')[0],
  };
  deals.push(newDeal);
  res.status(201).json({ success: true, data: newDeal });
});

// Update deal
app.patch('/api/deals/:id', (req, res) => {
  const index = deals.findIndex(d => d.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Deal not found' } });
  }
  deals[index] = { ...deals[index], ...req.body };
  res.json({ success: true, data: deals[index] });
});

// Get contacts
app.get('/api/contacts', (req, res) => {
  res.json({ success: true, data: contacts });
});

// Get contact by ID
app.get('/api/contacts/:id', (req, res) => {
  const contact = contacts.find(c => c.id === req.params.id);
  if (!contact) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Contact not found' } });
  }
  res.json({ success: true, data: contact });
});

// Create contact
app.post('/api/contacts', (req, res) => {
  const newContact = {
    id: String(contacts.length + 1),
    ...req.body,
    dealIds: [],
  };
  contacts.push(newContact);
  res.status(201).json({ success: true, data: newContact });
});

// Get activities
app.get('/api/activities', (req, res) => {
  const { dealId } = req.query;
  const filtered = dealId ? activities.filter(a => a.dealId === dealId) : activities;
  res.json({ success: true, data: filtered });
});

// Create activity
app.post('/api/activities', (req, res) => {
  const newActivity = {
    id: String(activities.length + 1),
    date: new Date().toISOString().split('T')[0],
    ...req.body,
  };
  activities.push(newActivity);
  res.status(201).json({ success: true, data: newActivity });
});

// Pipeline analytics
app.get('/api/analytics/pipeline', (req, res) => {
  const stages = ['qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
  const pipeline = stages.map(stage => ({
    stage,
    count: deals.filter(d => d.stage === stage).length,
    value: deals.filter(d => d.stage === stage).reduce((sum, d) => sum + d.value, 0),
  }));
  res.json({ success: true, data: pipeline });
});

// Overall analytics
app.get('/api/analytics', (req, res) => {
  const analytics = {
    totalDeals: deals.length,
    totalValue: deals.reduce((sum, d) => sum + d.value, 0),
    weightedValue: deals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0),
    closedWon: deals.filter(d => d.stage === 'closed_won').length,
    closedWonValue: deals.filter(d => d.stage === 'closed_won').reduce((sum, d) => sum + d.value, 0),
    totalContacts: contacts.length,
    conversionRate: '18.5%',
    averageDealSize: Math.round(deals.reduce((sum, d) => sum + d.value, 0) / deals.length),
  };
  res.json({ success: true, data: analytics });
});

app.listen(PORT, () => {
  console.log(`Exhibition CRM Service running on port ${PORT}`);
});

export default app;
