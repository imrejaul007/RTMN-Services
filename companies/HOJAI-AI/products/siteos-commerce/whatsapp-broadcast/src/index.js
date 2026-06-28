/**
 * HOJAI SiteOS WhatsApp Broadcast Service
 * Port: 5483
 * Campaign builder, audiences, sequences, analytics
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const app = express();
const PORT = process.env.PORT || 5483;
const STORAGE_PATH = process.env.STORAGE_PATH || '/tmp';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// API Key Authentication
const requireAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  req.companyId = req.headers['x-company-id'] || 'default';
  next();
};

// Storage helpers
const getFile = (companyId, type) => `${STORAGE_PATH}/wa-broadcast-${type}-${companyId}.json`;
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

// Personalization tokens
const PERSONALIZATION_TOKENS = {
  '{{firstName}}': 'First Name',
  '{{lastName}}': 'Last Name',
  '{{name}}': 'Full Name',
  '{{email}}': 'Email',
  '{{phone}}': 'Phone',
  '{{company}}': 'Company',
  '{{product}}': 'Product Name',
  '{{orderId}}': 'Order ID',
  '{{amount}}': 'Amount',
  '{{date}}': 'Date',
};

const applyPersonalization = (template, data) => {
  let message = template;
  Object.entries(PERSONALIZATION_TOKENS).forEach(([token, _]) => {
    message = message.replace(new RegExp(token.replace(/[{}]/g, '\\$&'), 'g'), data[token.replace(/[{}]/g, '')] || token);
  });
  return message;
};

// WhatsApp API Integration (mock - replace with actual WhatsApp API)
const sendWhatsAppMessage = async (phone, message) => {
  console.log(`[WhatsApp] Sending to ${phone}: ${message.substring(0, 50)}...`);
  // In production, integrate with WhatsApp Business API
  return { success: true, messageId: uuidv4() };
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'whatsapp-broadcast', port: PORT });
});

// =====================
// AUDIENCES
// =====================

// List audiences
app.get('/api/audiences', requireAuth, (req, res) => {
  const audiences = loadData(req.companyId, 'audiences');
  res.json({ audiences });
});

// Create audience
app.post('/api/audiences', requireAuth, (req, res) => {
  const { name, description, filters } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const audience = {
    audienceId: uuidv4(),
    companyId: req.companyId,
    name,
    description: description || '',
    filters: filters || [],
    contactCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const audiences = loadData(req.companyId, 'audiences');
  audiences.push(audience);
  saveData(req.companyId, 'audiences', audiences);

  res.json({ success: true, audience });
});

// Get audience
app.get('/api/audiences/:id', requireAuth, (req, res) => {
  const audiences = loadData(req.companyId, 'audiences');
  const audience = audiences.find(a => a.audienceId === req.params.id);
  if (!audience) {
    return res.status(404).json({ error: 'Audience not found' });
  }
  res.json({ audience });
});

// Update audience
app.put('/api/audiences/:id', requireAuth, (req, res) => {
  const audiences = loadData(req.companyId, 'audiences');
  const index = audiences.findIndex(a => a.audienceId === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Audience not found' });
  }

  audiences[index] = {
    ...audiences[index],
    ...req.body,
    audienceId: req.params.id,
    updatedAt: new Date().toISOString(),
  };
  saveData(req.companyId, 'audiences', audiences);
  res.json({ success: true, audience: audiences[index] });
});

// Delete audience
app.delete('/api/audiences/:id', requireAuth, (req, res) => {
  let audiences = loadData(req.companyId, 'audiences');
  const index = audiences.findIndex(a => a.audienceId === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Audience not found' });
  }
  audiences = audiences.filter(a => a.audienceId !== req.params.id);
  saveData(req.companyId, 'audiences', audiences);
  res.json({ success: true });
});

// =====================
// TEMPLATES
// =====================

// List templates
app.get('/api/templates', requireAuth, (req, res) => {
  const templates = loadData(req.companyId, 'templates');
  res.json({ templates });
});

// Create template
app.post('/api/templates', requireAuth, (req, res) => {
  const { name, content, category, variables } = req.body;
  if (!name || !content) {
    return res.status(400).json({ error: 'Name and content are required' });
  }

  const template = {
    templateId: uuidv4(),
    companyId: req.companyId,
    name,
    content,
    category: category || 'marketing',
    variables: variables || [],
    status: 'draft',
    usageCount: 0,
    createdAt: new Date().toISOString(),
  };

  const templates = loadData(req.companyId, 'templates');
  templates.push(template);
  saveData(req.companyId, 'templates', templates);

  res.json({ success: true, template });
});

// Get template
app.get('/api/templates/:id', requireAuth, (req, res) => {
  const templates = loadData(req.companyId, 'templates');
  const template = templates.find(t => t.templateId === req.params.id);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  res.json({ template });
});

// Update template
app.put('/api/templates/:id', requireAuth, (req, res) => {
  const templates = loadData(req.companyId, 'templates');
  const index = templates.findIndex(t => t.templateId === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Template not found' });
  }

  templates[index] = {
    ...templates[index],
    ...req.body,
    templateId: req.params.id,
  };
  saveData(req.companyId, 'templates', templates);
  res.json({ success: true, template: templates[index] });
});

// Delete template
app.delete('/api/templates/:id', requireAuth, (req, res) => {
  let templates = loadData(req.companyId, 'templates');
  const index = templates.findIndex(t => t.templateId === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Template not found' });
  }
  templates = templates.filter(t => t.templateId !== req.params.id);
  saveData(req.companyId, 'templates', templates);
  res.json({ success: true });
});

// =====================
// CAMPAIGNS
// =====================

// List campaigns
app.get('/api/campaigns', requireAuth, (req, res) => {
  const campaigns = loadData(req.companyId, 'campaigns');
  const { status, audienceId } = req.query;
  let filtered = campaigns;

  if (status) {
    filtered = filtered.filter(c => c.status === status);
  }
  if (audienceId) {
    filtered = filtered.filter(c => c.audienceId === audienceId);
  }

  res.json({ campaigns: filtered });
});

// Create campaign
app.post('/api/campaigns', requireAuth, (req, res) => {
  const { name, audienceId, message, schedule, abTest } = req.body;

  if (!name || !message) {
    return res.status(400).json({ error: 'Name and message are required' });
  }

  const campaign = {
    campaignId: uuidv4(),
    companyId: req.companyId,
    name,
    description: req.body.description || '',
    audienceId,
    message: {
      type: message.type || 'text',
      content: message.content,
      mediaUrl: message.mediaUrl,
    },
    schedule: {
      type: schedule?.type || 'immediate',
      sendAt: schedule?.sendAt || null,
      timezone: schedule?.timezone || 'Asia/Kolkata',
    },
    abTest: abTest ? {
      enabled: true,
      variantMessage: abTest.variantMessage,
      splitPercentage: abTest.splitPercentage || 50,
    } : null,
    stats: {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      converted: 0,
      failed: 0,
      optOuts: 0,
    },
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const campaigns = loadData(req.companyId, 'campaigns');
  campaigns.push(campaign);
  saveData(req.companyId, 'campaigns', campaigns);

  res.json({ success: true, campaign });
});

// Get campaign
app.get('/api/campaigns/:id', requireAuth, (req, res) => {
  const campaigns = loadData(req.companyId, 'campaigns');
  const campaign = campaigns.find(c => c.campaignId === req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  res.json({ campaign });
});

// Update campaign
app.put('/api/campaigns/:id', requireAuth, (req, res) => {
  const campaigns = loadData(req.companyId, 'campaigns');
  const index = campaigns.findIndex(c => c.campaignId === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  if (campaigns[index].status === 'sending') {
    return res.status(400).json({ error: 'Cannot update campaign while sending' });
  }

  campaigns[index] = {
    ...campaigns[index],
    ...req.body,
    campaignId: req.params.id,
    updatedAt: new Date().toISOString(),
  };
  saveData(req.companyId, 'campaigns', campaigns);
  res.json({ success: true, campaign: campaigns[index] });
});

// Delete campaign
app.delete('/api/campaigns/:id', requireAuth, (req, res) => {
  let campaigns = loadData(req.companyId, 'campaigns');
  const index = campaigns.findIndex(c => c.campaignId === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  campaigns = campaigns.filter(c => c.campaignId !== req.params.id);
  saveData(req.companyId, 'campaigns', campaigns);
  res.json({ success: true });
});

// Send campaign (immediate)
app.post('/api/campaigns/:id/send', requireAuth, async (req, res) => {
  const campaigns = loadData(req.companyId, 'campaigns');
  const index = campaigns.findIndex(c => c.campaignId === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  if (campaigns[index].status === 'sending') {
    return res.status(400).json({ error: 'Campaign already sending' });
  }

  const campaign = campaigns[index];
  const contacts = loadData(req.companyId, 'contacts')
    .filter(c => !c.unsubscribed);

  // Simulate sending (in production, this would be async)
  campaign.status = 'sending';
  campaign.stats.sent = contacts.length;
  campaign.stats.delivered = Math.floor(contacts.length * 0.95);
  campaign.stats.failed = Math.floor(contacts.length * 0.05);
  campaign.sentAt = new Date().toISOString();
  campaign.status = 'completed';

  campaigns[index] = campaign;
  saveData(req.companyId, 'campaigns', campaigns);

  res.json({ success: true, campaign });
});

// Schedule campaign
app.post('/api/campaigns/:id/schedule', requireAuth, (req, res) => {
  const { sendAt, timezone } = req.body;
  if (!sendAt) {
    return res.status(400).json({ error: 'sendAt is required' });
  }

  const campaigns = loadData(req.companyId, 'campaigns');
  const index = campaigns.findIndex(c => c.campaignId === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  campaigns[index].schedule.type = 'scheduled';
  campaigns[index].schedule.sendAt = sendAt;
  campaigns[index].schedule.timezone = timezone || 'Asia/Kolkata';
  campaigns[index].status = 'scheduled';
  saveData(req.companyId, 'campaigns', campaigns);

  res.json({ success: true, campaign: campaigns[index] });
});

// Get campaign stats
app.get('/api/campaigns/:id/stats', requireAuth, (req, res) => {
  const campaigns = loadData(req.companyId, 'campaigns');
  const campaign = campaigns.find(c => c.campaignId === req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const stats = campaign.stats;
  const deliveredRate = stats.sent > 0 ? (stats.delivered / stats.sent * 100).toFixed(1) : 0;
  const openRate = stats.delivered > 0 ? (stats.opened / stats.delivered * 100).toFixed(1) : 0;
  const clickRate = stats.opened > 0 ? (stats.clicked / stats.opened * 100).toFixed(1) : 0;
  const conversionRate = stats.clicked > 0 ? (stats.converted / stats.clicked * 100).toFixed(1) : 0;

  res.json({
    stats: campaign.stats,
    rates: {
      deliveryRate: deliveredRate,
      openRate,
      clickRate,
      conversionRate,
    },
  });
});

// =====================
// SEQUENCES (Drip Campaigns)
// =====================

// List sequences
app.get('/api/sequences', requireAuth, (req, res) => {
  const sequences = loadData(req.companyId, 'sequences');
  res.json({ sequences });
});

// Create sequence
app.post('/api/sequences', requireAuth, (req, res) => {
  const { name, trigger, steps } = req.body;
  if (!name || !trigger || !steps) {
    return res.status(400).json({ error: 'Name, trigger, and steps are required' });
  }

  const sequence = {
    sequenceId: uuidv4(),
    companyId: req.companyId,
    name,
    trigger: {
      type: trigger.type,
      conditions: trigger.conditions || [],
    },
    steps: steps.map((step, i) => ({
      stepId: uuidv4(),
      order: i + 1,
      delay: step.delay || 0, // minutes
      channel: step.channel || 'whatsapp',
      message: step.message,
      action: step.action || null,
    })),
    status: 'draft',
    enrolledCount: 0,
    completedCount: 0,
    createdAt: new Date().toISOString(),
  };

  const sequences = loadData(req.companyId, 'sequences');
  sequences.push(sequence);
  saveData(req.companyId, 'sequences', sequences);

  res.json({ success: true, sequence });
});

// Get sequence
app.get('/api/sequences/:id', requireAuth, (req, res) => {
  const sequences = loadData(req.companyId, 'sequences');
  const sequence = sequences.find(s => s.sequenceId === req.params.id);
  if (!sequence) {
    return res.status(404).json({ error: 'Sequence not found' });
  }
  res.json({ sequence });
});

// Update sequence
app.put('/api/sequences/:id', requireAuth, (req, res) => {
  const sequences = loadData(req.companyId, 'sequences');
  const index = sequences.findIndex(s => s.sequenceId === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Sequence not found' });
  }

  sequences[index] = {
    ...sequences[index],
    ...req.body,
    sequenceId: req.params.id,
  };
  saveData(req.companyId, 'sequences', sequences);
  res.json({ success: true, sequence: sequences[index] });
});

// Delete sequence
app.delete('/api/sequences/:id', requireAuth, (req, res) => {
  let sequences = loadData(req.companyId, 'sequences');
  sequences = sequences.filter(s => s.sequenceId !== req.params.id);
  saveData(req.companyId, 'sequences', sequences);
  res.json({ success: true });
});

// Activate sequence
app.post('/api/sequences/:id/activate', requireAuth, (req, res) => {
  const sequences = loadData(req.companyId, 'sequences');
  const index = sequences.findIndex(s => s.sequenceId === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Sequence not found' });
  }

  sequences[index].status = 'active';
  saveData(req.companyId, 'sequences', sequences);
  res.json({ success: true, sequence: sequences[index] });
});

// =====================
// CONTACTS
// =====================

// List contacts
app.get('/api/contacts', requireAuth, (req, res) => {
  const contacts = loadData(req.companyId, 'contacts');
  const { page = 1, limit = 50, search } = req.query;
  let filtered = contacts;

  if (search) {
    const s = search.toLowerCase();
    filtered = contacts.filter(c =>
      c.name.toLowerCase().includes(s) ||
      c.phone.includes(s) ||
      c.email.toLowerCase().includes(s)
    );
  }

  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + Number(limit));

  res.json({
    contacts: paginated,
    total: filtered.length,
    page: Number(page),
    limit: Number(limit),
  });
});

// Add contact
app.post('/api/contacts', requireAuth, (req, res) => {
  const { name, phone, email, tags } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  const contact = {
    contactId: uuidv4(),
    companyId: req.companyId,
    name,
    phone,
    email: email || '',
    tags: tags || [],
    segments: [],
    unsubscribed: false,
    source: 'api',
    lastMessageAt: null,
    createdAt: new Date().toISOString(),
  };

  const contacts = loadData(req.companyId, 'contacts');
  contacts.push(contact);
  saveData(req.companyId, 'contacts', contacts);

  res.json({ success: true, contact });
});

// Opt-out contact
app.post('/api/contacts/:id/unsubscribe', requireAuth, (req, res) => {
  const contacts = loadData(req.companyId, 'contacts');
  const index = contacts.findIndex(c => c.contactId === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Contact not found' });
  }

  contacts[index].unsubscribed = true;
  contacts[index].unsubscribedAt = new Date().toISOString();
  saveData(req.companyId, 'contacts', contacts);
  res.json({ success: true });
});

// =====================
// BROADCAST STATS
// =====================

// Get overall broadcast stats
app.get('/api/stats', requireAuth, (req, res) => {
  const campaigns = loadData(req.companyId, 'campaigns');
  const contacts = loadData(req.companyId, 'contacts');

  const totalSent = campaigns.reduce((sum, c) => sum + c.stats.sent, 0);
  const totalDelivered = campaigns.reduce((sum, c) => sum + c.stats.delivered, 0);
  const totalOpened = campaigns.reduce((sum, c) => sum + c.stats.opened, 0);
  const totalClicked = campaigns.reduce((sum, c) => sum + c.stats.clicked, 0);
  const totalConverted = campaigns.reduce((sum, c) => sum + c.stats.converted, 0);

  res.json({
    totalContacts: contacts.filter(c => !c.unsubscribed).length,
    totalCampaigns: campaigns.length,
    totalSent,
    totalDelivered,
    totalOpened,
    totalClicked,
    totalConverted,
    avgOpenRate: totalDelivered > 0 ? ((totalOpened / totalDelivered) * 100).toFixed(1) : 0,
    avgClickRate: totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : 0,
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`WhatsApp Broadcast Service running on port ${PORT}`);
});

export default app;
