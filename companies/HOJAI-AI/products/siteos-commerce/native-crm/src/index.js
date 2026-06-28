/**
 * HOJAI SiteOS Native CRM Service
 * Port: 5484
 * Contact management, deal pipeline, tasks
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const app = express();
const PORT = process.env.PORT || 5484;
const STORAGE_PATH = process.env.STORAGE_PATH || '/tmp';

app.use(helmet());
app.use(cors());
app.use(express.json());

const requireAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  if (!apiKey) return res.status(401).json({ error: 'API key required' });
  req.companyId = req.headers['x-company-id'] || 'default';
  next();
};

const getFile = (companyId, type) => `${STORAGE_PATH}/crm-${type}-${companyId}.json`;
const loadData = (companyId, type) => {
  const file = getFile(companyId, type);
  if (existsSync(file)) {
    try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return []; }
  }
  return [];
};
const saveData = (companyId, type, data) => {
  writeFileSync(getFile(companyId, type), JSON.stringify(data, null, 2));
};

// Deal stages
const DEAL_STAGES = {
  qualification: { name: 'Qualification', probability: 10, color: '#94A3B8' },
  discovery: { name: 'Discovery', probability: 25, color: '#3B82F6' },
  proposal: { name: 'Proposal', probability: 50, color: '#F59E0B' },
  negotiation: { name: 'Negotiation', probability: 75, color: '#8B5CF6' },
  closed_won: { name: 'Won', probability: 100, color: '#22C55E' },
  closed_lost: { name: 'Lost', probability: 0, color: '#EF4444' },
};

// Lifecycle stages
const LIFECYCLE_STAGES = ['subscriber', 'lead', 'opportunity', 'customer', 'churned'];

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'native-crm', port: PORT });
});

// =====================
// CONTACTS
// =====================

app.get('/api/contacts', requireAuth, (req, res) => {
  const contacts = loadData(req.companyId, 'contacts');
  const { page = 1, limit = 50, search, stage, tag } = req.query;
  let filtered = contacts;

  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(c =>
      c.firstName.toLowerCase().includes(s) ||
      c.lastName.toLowerCase().includes(s) ||
      c.email.toLowerCase().includes(s) ||
      (c.company && c.company.toLowerCase().includes(s))
    );
  }
  if (stage) filtered = filtered.filter(c => c.lifecycleStage === stage);
  if (tag) filtered = filtered.filter(c => c.tags.includes(tag));

  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + Number(limit));

  res.json({ contacts: paginated, total: filtered.length, page: Number(page), limit: Number(limit) });
});

app.post('/api/contacts', requireAuth, (req, res) => {
  const { firstName, lastName, email, phone, company, position, tags, source, customFields } = req.body;
  if (!firstName || !email) return res.status(400).json({ error: 'firstName and email required' });

  const contact = {
    contactId: uuidv4(),
    companyId: req.companyId,
    firstName,
    lastName: lastName || '',
    email,
    phone: phone || '',
    company: company || '',
    position: position || '',
    tags: tags || [],
    source: source || 'manual',
    lifecycleStage: 'subscriber',
    deals: [],
    tasks: [],
    notes: [],
    customFields: customFields || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const contacts = loadData(req.companyId, 'contacts');
  contacts.push(contact);
  saveData(req.companyId, 'contacts', contacts);
  res.json({ success: true, contact });
});

app.get('/api/contacts/:id', requireAuth, (req, res) => {
  const contacts = loadData(req.companyId, 'contacts');
  const contact = contacts.find(c => c.contactId === req.params.id);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  res.json({ contact });
});

app.put('/api/contacts/:id', requireAuth, (req, res) => {
  const contacts = loadData(req.companyId, 'contacts');
  const index = contacts.findIndex(c => c.contactId === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Contact not found' });

  contacts[index] = { ...contacts[index], ...req.body, contactId: req.params.id, updatedAt: new Date().toISOString() };
  saveData(req.companyId, 'contacts', contacts);
  res.json({ success: true, contact: contacts[index] });
});

app.delete('/api/contacts/:id', requireAuth, (req, res) => {
  let contacts = loadData(req.companyId, 'contacts');
  if (!contacts.find(c => c.contactId === req.params.id)) return res.status(404).json({ error: 'Contact not found' });
  contacts = contacts.filter(c => c.contactId !== req.params.id);
  saveData(req.companyId, 'contacts', contacts);
  res.json({ success: true });
});

app.get('/api/contacts/:id/timeline', requireAuth, (req, res) => {
  const contacts = loadData(req.companyId, 'contacts');
  const contact = contacts.find(c => c.contactId === req.params.id);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  const activities = [
    ...(contact.notes || []).map(n => ({ type: 'note', ...n })),
    ...(contact.deals || []).map(d => ({ type: 'deal', ...d })),
  ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  res.json({ activities });
});

app.post('/api/contacts/:id/notes', requireAuth, (req, res) => {
  const contacts = loadData(req.companyId, 'contacts');
  const index = contacts.findIndex(c => c.contactId === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Contact not found' });

  const note = {
    noteId: uuidv4(),
    content: req.body.content,
    createdAt: new Date().toISOString(),
  };

  contacts[index].notes = contacts[index].notes || [];
  contacts[index].notes.push(note);
  contacts[index].updatedAt = new Date().toISOString();
  saveData(req.companyId, 'contacts', contacts);
  res.json({ success: true, note });
});

app.post('/api/contacts/:id/tags', requireAuth, (req, res) => {
  const contacts = loadData(req.companyId, 'contacts');
  const index = contacts.findIndex(c => c.contactId === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Contact not found' });

  const { tags } = req.body;
  if (!Array.isArray(tags)) return res.status(400).json({ error: 'tags must be array' });

  contacts[index].tags = [...new Set([...contacts[index].tags, ...tags])];
  contacts[index].updatedAt = new Date().toISOString();
  saveData(req.companyId, 'contacts', contacts);
  res.json({ success: true, tags: contacts[index].tags });
});

// =====================
// DEALS
// =====================

app.get('/api/deals', requireAuth, (req, res) => {
  const deals = loadData(req.companyId, 'deals');
  const { stage, owner, contactId } = req.query;
  let filtered = deals;

  if (stage) filtered = filtered.filter(d => d.stage === stage);
  if (owner) filtered = filtered.filter(d => d.owner === owner);
  if (contactId) filtered = filtered.filter(d => d.contactId === contactId);

  res.json({ deals: filtered });
});

app.get('/api/deals/pipeline', requireAuth, (req, res) => {
  const deals = loadData(req.companyId, 'deals');
  const pipeline = {};

  Object.keys(DEAL_STAGES).forEach(stage => {
    const stageDeals = deals.filter(d => d.stage === stage);
    pipeline[stage] = {
      ...DEAL_STAGES[stage],
      deals: stageDeals,
      count: stageDeals.length,
      value: stageDeals.reduce((sum, d) => sum + d.value, 0),
      weightedValue: stageDeals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0),
    };
  });

  res.json({ pipeline });
});

app.post('/api/deals', requireAuth, (req, res) => {
  const { title, value, currency, stage, contactId, contactName, contactEmail, owner, expectedCloseDate, description } = req.body;
  if (!title || !value) return res.status(400).json({ error: 'title and value required' });

  const deal = {
    dealId: uuidv4(),
    companyId: req.companyId,
    title,
    description: description || '',
    value: Number(value),
    currency: currency || 'INR',
    stage: stage || 'qualification',
    probability: DEAL_STAGES[stage || 'qualification'].probability,
    contactId: contactId || '',
    contactName: contactName || '',
    contactEmail: contactEmail || '',
    owner: owner || 'system',
    expectedCloseDate: expectedCloseDate || null,
    activities: [{
      type: 'created',
      description: 'Deal created',
      timestamp: new Date().toISOString(),
    }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const deals = loadData(req.companyId, 'deals');
  deals.push(deal);
  saveData(req.companyId, 'deals', deals);
  res.json({ success: true, deal });
});

app.get('/api/deals/:id', requireAuth, (req, res) => {
  const deals = loadData(req.companyId, 'deals');
  const deal = deals.find(d => d.dealId === req.params.id);
  if (!deal) return res.status(404).json({ error: 'Deal not found' });
  res.json({ deal });
});

app.put('/api/deals/:id', requireAuth, (req, res) => {
  const deals = loadData(req.companyId, 'deals');
  const index = deals.findIndex(d => d.dealId === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Deal not found' });

  const oldStage = deals[index].stage;
  deals[index] = { ...deals[index], ...req.body, dealId: req.params.id, updatedAt: new Date().toISOString() };

  if (req.body.stage && req.body.stage !== oldStage) {
    deals[index].activities = deals[index].activities || [];
    deals[index].activities.push({
      type: 'stage_change',
      description: `Moved from ${DEAL_STAGES[oldStage].name} to ${DEAL_STAGES[req.body.stage].name}`,
      timestamp: new Date().toISOString(),
    });
  }

  saveData(req.companyId, 'deals', deals);
  res.json({ success: true, deal: deals[index] });
});

app.put('/api/deals/:id/stage', requireAuth, (req, res) => {
  const { stage } = req.body;
  if (!stage || !DEAL_STAGES[stage]) return res.status(400).json({ error: 'Invalid stage' });

  const deals = loadData(req.companyId, 'deals');
  const index = deals.findIndex(d => d.dealId === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Deal not found' });

  const oldStage = deals[index].stage;
  deals[index].stage = stage;
  deals[index].probability = DEAL_STAGES[stage].probability;
  deals[index].updatedAt = new Date().toISOString();
  deals[index].activities = deals[index].activities || [];
  deals[index].activities.push({
    type: 'stage_change',
    description: `Moved to ${DEAL_STAGES[stage].name}`,
    from: oldStage,
    to: stage,
    timestamp: new Date().toISOString(),
  });

  saveData(req.companyId, 'deals', deals);
  res.json({ success: true, deal: deals[index] });
});

app.post('/api/deals/:id/activities', requireAuth, (req, res) => {
  const deals = loadData(req.companyId, 'deals');
  const index = deals.findIndex(d => d.dealId === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Deal not found' });

  const activity = {
    activityId: uuidv4(),
    type: req.body.type || 'note',
    description: req.body.description,
    timestamp: new Date().toISOString(),
  };

  deals[index].activities = deals[index].activities || [];
  deals[index].activities.push(activity);
  deals[index].updatedAt = new Date().toISOString();
  saveData(req.companyId, 'deals', deals);
  res.json({ success: true, activity });
});

app.delete('/api/deals/:id', requireAuth, (req, res) => {
  let deals = loadData(req.companyId, 'deals');
  if (!deals.find(d => d.dealId === req.params.id)) return res.status(404).json({ error: 'Deal not found' });
  deals = deals.filter(d => d.dealId !== req.params.id);
  saveData(req.companyId, 'deals', deals);
  res.json({ success: true });
});

// =====================
// TASKS
// =====================

app.get('/api/tasks', requireAuth, (req, res) => {
  const tasks = loadData(req.companyId, 'tasks');
  const { status, owner, contactId, dealId } = req.query;
  let filtered = tasks;

  if (status) filtered = filtered.filter(t => t.status === status);
  if (owner) filtered = filtered.filter(t => t.owner === owner);
  if (contactId) filtered = filtered.filter(t => t.contactId === contactId);
  if (dealId) filtered = filtered.filter(t => t.dealId === dealId);

  res.json({ tasks: filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)) });
});

app.post('/api/tasks', requireAuth, (req, res) => {
  const { title, description, type, contactId, dealId, owner, dueDate, priority } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  const task = {
    taskId: uuidv4(),
    companyId: req.companyId,
    title,
    description: description || '',
    type: type || 'follow_up',
    contactId: contactId || null,
    dealId: dealId || null,
    owner: owner || 'system',
    dueDate: dueDate || new Date().toISOString(),
    priority: priority || 'medium',
    status: 'pending',
    completedAt: null,
    createdAt: new Date().toISOString(),
  };

  const tasks = loadData(req.companyId, 'tasks');
  tasks.push(task);
  saveData(req.companyId, 'tasks', tasks);
  res.json({ success: true, task });
});

app.put('/api/tasks/:id', requireAuth, (req, res) => {
  const tasks = loadData(req.companyId, 'tasks');
  const index = tasks.findIndex(t => t.taskId === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Task not found' });

  if (req.body.status === 'completed' && tasks[index].status !== 'completed') {
    tasks[index].completedAt = new Date().toISOString();
  }

  tasks[index] = { ...tasks[index], ...req.body, taskId: req.params.id };
  saveData(req.companyId, 'tasks', tasks);
  res.json({ success: true, task: tasks[index] });
});

app.delete('/api/tasks/:id', requireAuth, (req, res) => {
  let tasks = loadData(req.companyId, 'tasks');
  if (!tasks.find(t => t.taskId === req.params.id)) return res.status(404).json({ error: 'Task not found' });
  tasks = tasks.filter(t => t.taskId !== req.params.id);
  saveData(req.companyId, 'tasks', tasks);
  res.json({ success: true });
});

// =====================
// ANALYTICS
// =====================

app.get('/api/analytics/summary', requireAuth, (req, res) => {
  const contacts = loadData(req.companyId, 'contacts');
  const deals = loadData(req.companyId, 'deals');
  const tasks = loadData(req.companyId, 'tasks');

  const openDeals = deals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage));
  const wonDeals = deals.filter(d => d.stage === 'closed_won');
  const lostDeals = deals.filter(d => d.stage === 'closed_lost');

  const pipelineValue = openDeals.reduce((sum, d) => sum + d.value, 0);
  const wonValue = wonDeals.reduce((sum, d) => sum + d.value, 0);
  const avgDealSize = wonDeals.length > 0 ? wonValue / wonDeals.length : 0;
  const winRate = (wonDeals.length + lostDeals.length) > 0
    ? (wonDeals.length / (wonDeals.length + lostDeals.length) * 100).toFixed(1)
    : 0;

  res.json({
    contacts: {
      total: contacts.length,
      byStage: LIFECYCLE_STAGES.reduce((acc, s) => {
        acc[s] = contacts.filter(c => c.lifecycleStage === s).length;
        return acc;
      }, {}),
    },
    deals: {
      total: deals.length,
      open: openDeals.length,
      won: wonDeals.length,
      lost: lostDeals.length,
      pipelineValue,
      wonValue,
      avgDealSize: Math.round(avgDealSize),
      winRate,
    },
    tasks: {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      overdue: tasks.filter(t => t.status === 'pending' && new Date(t.dueDate) < new Date()).length,
    },
  });
});

app.get('/api/analytics/pipeline', requireAuth, (req, res) => {
  const deals = loadData(req.companyId, 'deals');

  const stages = Object.keys(DEAL_STAGES).map(stageId => {
    const stageDeals = deals.filter(d => d.stage === stageId);
    return {
      id: stageId,
      name: DEAL_STAGES[stageId].name,
      color: DEAL_STAGES[stageId].color,
      count: stageDeals.length,
      value: stageDeals.reduce((sum, d) => sum + d.value, 0),
      weightedValue: stageDeals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0),
    };
  });

  res.json({ stages });
});

// =====================
// IMPORT/EXPORT
// =====================

app.post('/api/contacts/import', requireAuth, (req, res) => {
  const { contacts } = req.body;
  if (!Array.isArray(contacts)) return res.status(400).json({ error: 'contacts array required' });

  const existing = loadData(req.companyId, 'contacts');
  const imported = [];

  contacts.forEach(c => {
    if (!c.email) return;
    const exists = existing.find(e => e.email === c.email);
    if (!exists) {
      const newContact = {
        contactId: uuidv4(),
        companyId: req.companyId,
        firstName: c.firstName || c.name?.split(' ')[0] || '',
        lastName: c.lastName || c.name?.split(' ').slice(1).join(' ') || '',
        email: c.email,
        phone: c.phone || '',
        company: c.company || '',
        tags: ['imported'],
        source: 'import',
        lifecycleStage: 'subscriber',
        deals: [],
        tasks: [],
        notes: [],
        customFields: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      existing.push(newContact);
      imported.push(newContact);
    }
  });

  saveData(req.companyId, 'contacts', existing);
  res.json({ success: true, imported: imported.length, skipped: contacts.length - imported.length });
});

app.get('/api/contacts/export', requireAuth, (req, res) => {
  const contacts = loadData(req.companyId, 'contacts');
  const csv = [
    'firstName,lastName,email,phone,company,lifecycleStage,tags',
    ...contacts.map(c =>
      `"${c.firstName}","${c.lastName}","${c.email}","${c.phone}","${c.company}","${c.lifecycleStage}","${c.tags.join(';')}"`
    )
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
  res.send(csv);
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Native CRM Service running on port ${PORT}`);
});

export default app;
