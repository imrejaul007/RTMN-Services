/**
 * Visual Journey Builder - CustomerJourneyOS
 *
 * Drag-and-drop journey orchestration:
 * - Visual workflow builder
 * - Stage designer
 * - Automation nodes
 * - Journey templates
 *
 * Port: 5072
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5072;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// ============================================================
// STORAGE
// ============================================================

const journeys = new Map();
const templates = new Map();
const nodes = new Map();
const edges = new Map();

// Node types
const NODE_TYPES = {
  trigger: {
    name: 'Trigger',
    icon: '⚡',
    color: '#FFD700',
    inputs: [],
    outputs: ['next'],
  },
  condition: {
    name: 'Condition',
    icon: '🔀',
    color: '#9B59B6',
    inputs: ['in'],
    outputs: ['yes', 'no'],
  },
  action: {
    name: 'Action',
    icon: '🎬',
    color: '#3498DB',
    inputs: ['in'],
    outputs: ['next'],
  },
  email: {
    name: 'Email',
    icon: '📧',
    color: '#E74C3C',
    inputs: ['in'],
    outputs: ['next', 'open', 'click', 'bounce'],
  },
  sms: {
    name: 'SMS',
    icon: '💬',
    color: '#2ECC71',
    inputs: ['in'],
    outputs: ['sent', 'failed'],
  },
  whatsapp: {
    name: 'WhatsApp',
    icon: '📱',
    color: '#25D366',
    inputs: ['in'],
    outputs: ['next'],
  },
  delay: {
    name: 'Delay',
    icon: '⏰',
    color: '#95A5A6',
    inputs: ['in'],
    outputs: ['next'],
  },
  wait: {
    name: 'Wait For',
    icon: '⏳',
    color: '#34495E',
    inputs: ['in'],
    outputs: ['done', 'timeout'],
  },
  webhook: {
    name: 'Webhook',
    icon: '🔗',
    color: '#1ABC9C',
    inputs: ['in'],
    outputs: ['success', 'error'],
  },
  ai: {
    name: 'AI Agent',
    icon: '🤖',
    color: '#9B59B6',
    inputs: ['in'],
    outputs: ['next', 'fallback'],
  },
  split: {
    name: 'A/B Split',
    icon: '📊',
    color: '#F39C12',
    inputs: ['in'],
    outputs: ['a', 'b'],
  },
  end: {
    name: 'End',
    icon: '🏁',
    color: '#2C3E50',
    inputs: ['in'],
    outputs: [],
  },
};

// Sample templates
const sampleTemplates = [
  {
    id: uuidv4(),
    name: 'Lead Nurture Sequence',
    description: '6-step nurture sequence for new leads',
    type: 'nurture',
    industry: 'general',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 100, y: 200 }, config: { event: 'lead.created' } },
      { id: 'n2', type: 'delay', position: { x: 250, y: 200 }, config: { days: 1 } },
      { id: 'n3', type: 'email', position: { x: 400, y: 200 }, config: { template: 'intro' } },
      { id: 'n4', type: 'wait', position: { x: 550, y: 200 }, config: { action: 'open' } },
      { id: 'n5', type: 'condition', position: { x: 700, y: 200 }, config: { field: 'opened', operator: 'eq', value: true } },
      { id: 'n6', type: 'email', position: { x: 850, y: 150 }, config: { template: 'followup' } },
      { id: 'n7', type: 'email', position: { x: 850, y: 250 }, config: { template: 'value' } },
      { id: 'n8', type: 'end', position: { x: 1000, y: 200 }, config: {} },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', label: '' },
      { id: 'e2', source: 'n2', target: 'n3', label: '' },
      { id: 'e3', source: 'n3', target: 'n4', label: '' },
      { id: 'e4', source: 'n4', target: 'n5', label: '' },
      { id: 'e5', source: 'n5', target: 'n6', label: 'Yes' },
      { id: 'e6', source: 'n5', target: 'n7', label: 'No' },
      { id: 'e7', source: 'n6', target: 'n8', label: '' },
      { id: 'e8', source: 'n7', target: 'n8', label: '' },
    ],
    stats: { uses: 156, conversions: 45 },
    createdAt: new Date(),
  },
  {
    id: uuidv4(),
    name: 'Onboarding Journey',
    description: '7-day onboarding sequence',
    type: 'onboarding',
    industry: 'saas',
    nodes: [
      { id: 'n1', type: 'trigger', position: { x: 100, y: 200 }, config: { event: 'signup.completed' } },
      { id: 'n2', type: 'email', position: { x: 250, y: 200 }, config: { template: 'welcome' } },
      { id: 'n3', type: 'delay', position: { x: 400, y: 200 }, config: { days: 1 } },
      { id: 'n4', type: 'ai', position: { x: 550, y: 200 }, config: { agent: 'onboarding' } },
      { id: 'n5', type: 'wait', position: { x: 700, y: 200 }, config: { condition: 'first_action' } },
      { id: 'n6', type: 'condition', position: { x: 850, y: 200 }, config: { field: 'action_taken', operator: 'eq', value: true } },
      { id: 'n7', type: 'email', position: { x: 1000, y: 150 }, config: { template: 'success' } },
      { id: 'n8', type: 'email', position: { x: 1000, y: 250 }, config: { template: 'help' } },
      { id: 'n9', type: 'end', position: { x: 1150, y: 200 }, config: {} },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n4', target: 'n5' },
      { id: 'e5', source: 'n5', target: 'n6' },
      { id: 'e6', source: 'n6', target: 'n7', label: 'Yes' },
      { id: 'e7', source: 'n6', target: 'n8', label: 'No' },
      { id: 'e8', source: 'n7', target: 'n9' },
      { id: 'e9', source: 'n8', target: 'n9' },
    ],
    stats: { uses: 234, conversions: 187 },
    createdAt: new Date(),
  },
];

sampleTemplates.forEach(t => templates.set(t.id, t));

// ============================================================
// HEALTH
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Visual Journey Builder',
    version: '1.0.0',
    port: PORT,
    nodeTypes: Object.keys(NODE_TYPES).length,
    templatesCount: templates.size,
    journeysCount: journeys.size,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// NODE TYPES
// ============================================================

app.get('/nodes/types', (req, res) => {
  const types = Object.entries(NODE_TYPES).map(([id, type]) => ({ id, ...type }));
  res.json({ success: true, nodeTypes: types });
});

app.get('/nodes/:type', (req, res) => {
  const type = NODE_TYPES[req.params.type];
  if (!type) return res.status(404).json({ error: 'Node type not found' });
  res.json({ success: true, nodeType: { id: req.params.type, ...type } });
});

// ============================================================
// JOURNEY CRUD
// ============================================================

app.get('/journeys', (req, res) => {
  const { status, type, industry } = req.query;
  let results = Array.from(journeys.values());

  if (status) results = results.filter(j => j.status === status);
  if (type) results = results.filter(j => j.type === type);
  if (industry) results = results.filter(j => j.industry === industry);

  res.json({ success: true, count: results.length, journeys: results });
});

app.get('/journeys/:id', (req, res) => {
  const journey = journeys.get(req.params.id);
  if (!journey) return res.status(404).json({ error: 'Journey not found' });
  res.json({ success: true, journey });
});

app.post('/journeys', (req, res) => {
  const journey = {
    id: uuidv4(),
    name: req.body.name,
    description: req.body.description,
    type: req.body.type || 'custom',
    industry: req.body.industry || 'general',
    status: 'draft',
    nodes: req.body.nodes || [],
    edges: req.body.edges || [],
    config: req.body.config || {},
    stats: { uses: 0, conversions: 0 },
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  journeys.set(journey.id, journey);
  res.status(201).json({ success: true, journey });
});

app.put('/journeys/:id', (req, res) => {
  const journey = journeys.get(req.params.id);
  if (!journey) return res.status(404).json({ error: 'Journey not found' });

  const updated = {
    ...journey,
    ...req.body,
    id: journey.id,
    version: journey.version + 1,
    updatedAt: new Date(),
  };

  journeys.set(journey.id, updated);
  res.json({ success: true, journey: updated });
});

app.delete('/journeys/:id', (req, res) => {
  if (!journeys.has(req.params.id)) {
    return res.status(404).json({ error: 'Journey not found' });
  }
  journeys.delete(req.params.id);
  res.json({ success: true, message: 'Journey deleted' });
});

// ============================================================
// JOURNEY LIFECYCLE
// ============================================================

app.post('/journeys/:id/activate', (req, res) => {
  const journey = journeys.get(req.params.id);
  if (!journey) return res.status(404).json({ error: 'Journey not found' });

  journey.status = 'active';
  journey.activatedAt = new Date();
  journeys.set(journey.id, journey);

  res.json({ success: true, journey });
});

app.post('/journeys/:id/pause', (req, res) => {
  const journey = journeys.get(req.params.id);
  if (!journey) return res.status(404).json({ error: 'Journey not found' });

  journey.status = 'paused';
  journeys.set(journey.id, journey);

  res.json({ success: true, journey });
});

app.post('/journeys/:id/duplicate', (req, res) => {
  const journey = journeys.get(req.params.id);
  if (!journey) return res.status(404).json({ error: 'Journey not found' });

  const duplicate = {
    ...journey,
    id: uuidv4(),
    name: `${journey.name} (Copy)`,
    status: 'draft',
    stats: { uses: 0, conversions: 0 },
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  journeys.set(duplicate.id, duplicate);
  res.status(201).json({ success: true, journey: duplicate });
});

// ============================================================
// TEMPLATES
// ============================================================

app.get('/templates', (req, res) => {
  const { type, industry } = req.query;
  let results = Array.from(templates.values());

  if (type) results = results.filter(t => t.type === type);
  if (industry) results = results.filter(t => t.industry === industry);

  res.json({ success: true, count: results.length, templates: results });
});

app.post('/templates/:id/instantiate', (req, res) => {
  const template = templates.get(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });

  const journey = {
    id: uuidv4(),
    name: req.body.name || template.name,
    description: template.description,
    type: template.type,
    industry: template.industry,
    status: 'draft',
    nodes: JSON.parse(JSON.stringify(template.nodes)),
    edges: JSON.parse(JSON.stringify(template.edges)),
    config: { ...template.config },
    stats: { uses: 0, conversions: 0 },
    templateId: template.id,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  journeys.set(journey.id, journey);
  res.status(201).json({ success: true, journey });
});

// ============================================================
// ANALYTICS
// ============================================================

app.get('/analytics/overview', (req, res) => {
  const allJourneys = Array.from(journeys.values());
  const allTemplates = Array.from(templates.values());

  const activeJourneys = allJourneys.filter(j => j.status === 'active');
  const totalUses = allJourneys.reduce((sum, j) => sum + j.stats.uses, 0);
  const totalConversions = allJourneys.reduce((sum, j) => sum + j.stats.conversions, 0);

  const byType = {};
  allJourneys.forEach(j => {
    byType[j.type] = (byType[j.type] || 0) + 1;
  });

  res.json({
    success: true,
    overview: {
      journeys: {
        total: allJourneys.length,
        active: activeJourneys.length,
        draft: allJourneys.filter(j => j.status === 'draft').length,
      },
      templates: {
        total: allTemplates.length,
        totalUses: allTemplates.reduce((sum, t) => sum + t.stats.uses, 0),
      },
      performance: {
        totalUses,
        totalConversions,
        conversionRate: totalUses > 0 ? ((totalConversions / totalUses) * 100).toFixed(1) + '%' : '0%',
      },
      byType,
    },
  });
});

app.get('/analytics/:id', (req, res) => {
  const journey = journeys.get(req.params.id);
  if (!journey) return res.status(404).json({ error: 'Journey not found' });

  res.json({
    success: true,
    analytics: {
      journey: journey.name,
      status: journey.status,
      stats: journey.stats,
      nodesCount: journey.nodes.length,
      edgesCount: journey.edges.length,
    },
  });
});

// ============================================================
// START
// ============================================================

app.listen(PORT, () => {
  console.log(`Visual Journey Builder - SalesOS v1.0 - Port: ${PORT}`);
});

module.exports = app;
