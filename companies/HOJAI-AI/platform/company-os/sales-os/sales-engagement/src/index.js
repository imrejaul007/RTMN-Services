/**
 * Sales Engagement Hub - SalesOS
 *
 * Outreach sequences and multi-channel engagement:
 * - Email, LinkedIn, WhatsApp, SMS
 * - Sequence management
 * - AI email generation
 * - Template library
 *
 * Port: 5067
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5067;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// ============================================================
// STORAGE
// ============================================================

const sequences = new Map();
const sentMessages = new Map();
const templates = new Map();

// Default templates
const defaultTemplates = [
  { id: 'intro', name: 'Introduction', type: 'email', goal: 'first_contact', subject: 'Quick question about {{company}}', body: 'Hi {{name}},\n\nI noticed {{company}} is growing rapidly. I\'d love to share how we\'re helping similar companies.\n\nBest' },
  { id: 'followup', name: 'Follow-up', type: 'email', goal: 'follow_up', subject: 'Following up - {{subject}}', body: 'Hi {{name}},\n\nWanted to follow up on my previous message.\n\nBest' },
  { id: 'linkedin-connect', name: 'LinkedIn Connect', type: 'linkedin', goal: 'connection', subject: 'Connection request', body: 'Hi {{name}}, I\'d love to connect and learn more about {{company}}.' },
  { id: 'demo', name: 'Demo Request', type: 'email', goal: 'demo', subject: 'Demo: {{product}} for {{company}}', body: 'Hi {{name}},\n\nI\'d love to show you a quick demo.\n\nBest' },
  { id: 'value', name: 'Value Proposition', type: 'email', goal: 'education', subject: '{{industry}} insights', body: 'Hi {{name}},\n\nHere are some insights for {{industry}} companies.\n\nBest' },
  { id: 'objection', name: 'Objection Handler', type: 'email', goal: 'objection', subject: 'Your question about {{topic}}', body: 'Hi {{name}},\n\nGreat question! Here\'s how we address that...\n\nBest' },
  { id: 'close', name: 'Close Nudge', type: 'email', goal: 'closing', subject: 'Next steps for {{company}}', body: 'Hi {{name}},\n\nReady to move forward?\n\nBest' },
];

defaultTemplates.forEach(t => templates.set(t.id, t));

// Sample sequences
const sampleSequence = {
  id: uuidv4(),
  name: 'Enterprise Outreach',
  type: 'email',
  status: 'active',
  steps: [
    { order: 1, type: 'email', template: 'intro', delayDays: 0 },
    { order: 2, type: 'wait', delayDays: 3 },
    { order: 3, type: 'email', template: 'followup', delayDays: 0 },
    { order: 4, type: 'wait', delayDays: 5 },
    { order: 5, type: 'email', template: 'value', delayDays: 0 },
    { order: 6, type: 'wait', delayDays: 7 },
    { order: 7, type: 'email', template: 'close', delayDays: 0 },
  ],
  stats: { sent: 145, opened: 89, replied: 23, converted: 8 },
  createdAt: new Date(),
};

sequences.set(sampleSequence.id, sampleSequence);

// ============================================================
// HEALTH
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Sales Engagement Hub',
    version: '1.0.0',
    port: PORT,
    sequencesCount: sequences.size,
    messagesCount: sentMessages.size,
    templatesCount: templates.size,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// TEMPLATES
// ============================================================

app.get('/templates', (req, res) => {
  const { type, goal } = req.query;
  let all = Array.from(templates.values());

  if (type) all = all.filter(t => t.type === type);
  if (goal) all = all.filter(t => t.goal === goal);

  res.json({ success: true, count: all.length, templates: all });
});

app.get('/templates/:id', (req, res) => {
  const template = templates.get(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json({ success: true, template });
});

app.post('/templates', (req, res) => {
  const template = {
    id: req.body.id || uuidv4(),
    name: req.body.name,
    type: req.body.type,
    goal: req.body.goal,
    subject: req.body.subject,
    body: req.body.body,
    variables: req.body.variables || extractVariables(req.body.body),
  };
  templates.set(template.id, template);
  res.status(201).json({ success: true, template });
});

app.put('/templates/:id', (req, res) => {
  const template = templates.get(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  const updated = { ...template, ...req.body, id: template.id };
  templates.set(template.id, updated);
  res.json({ success: true, template: updated });
});

// ============================================================
// SEQUENCES
// ============================================================

app.get('/sequences', (req, res) => {
  const { status, type } = req.query;
  let all = Array.from(sequences.values());

  if (status) all = all.filter(s => s.status === status);
  if (type) all = all.filter(s => s.type === type);

  res.json({ success: true, count: all.length, sequences: all });
});

app.get('/sequences/:id', (req, res) => {
  const sequence = sequences.get(req.params.id);
  if (!sequence) return res.status(404).json({ error: 'Sequence not found' });
  res.json({ success: true, sequence });
});

app.post('/sequences', (req, res) => {
  const sequence = {
    id: uuidv4(),
    name: req.body.name,
    type: req.body.type || 'email',
    steps: req.body.steps || [],
    status: 'draft',
    stats: { sent: 0, opened: 0, replied: 0, converted: 0 },
    createdAt: new Date(),
  };
  sequences.set(sequence.id, sequence);
  res.status(201).json({ success: true, sequence });
});

app.put('/sequences/:id', (req, res) => {
  const sequence = sequences.get(req.params.id);
  if (!sequence) return res.status(404).json({ error: 'Sequence not found' });
  const updated = { ...sequence, ...req.body, id: sequence.id };
  sequences.set(sequence.id, updated);
  res.json({ success: true, sequence: updated });
});

app.post('/sequences/:id/activate', (req, res) => {
  const sequence = sequences.get(req.params.id);
  if (!sequence) return res.status(404).json({ error: 'Sequence not found' });
  sequence.status = 'active';
  sequences.set(sequence.id, sequence);
  res.json({ success: true, sequence });
});

app.post('/sequences/:id/pause', (req, res) => {
  const sequence = sequences.get(req.params.id);
  if (!sequence) return res.status(404).json({ error: 'Sequence not found' });
  sequence.status = 'paused';
  sequences.set(sequence.id, sequence);
  res.json({ success: true, sequence });
});

// ============================================================
// SEND MESSAGES
// ============================================================

app.post('/send', async (req, res) => {
  const { sequenceId, recipient, channel, templateId, variables, customSubject, customBody } = req.body;

  const template = templateId ? templates.get(templateId) : null;

  const message = {
    id: uuidv4(),
    sequenceId,
    recipient,
    channel: channel || template?.type || 'email',
    content: customBody || renderTemplate(template?.body || '', variables || {}),
    subject: customSubject || renderTemplate(template?.subject || '', variables || {}),
    status: 'sent',
    sentAt: new Date(),
    metadata: { variables, templateId },
  };

  sentMessages.set(message.id, message);

  // Update sequence stats
  if (sequenceId) {
    const sequence = sequences.get(sequenceId);
    if (sequence) {
      sequence.stats.sent++;
      sequences.set(sequenceId, sequence);
    }
  }

  res.json({ success: true, message });
});

app.post('/send/batch', async (req, res) => {
  const { messages } = req.body;
  const results = [];

  for (const msg of messages) {
    const template = msg.templateId ? templates.get(msg.templateId) : null;
    const message = {
      id: uuidv4(),
      sequenceId: msg.sequenceId,
      recipient: msg.recipient,
      channel: msg.channel || template?.type || 'email',
      content: msg.body || renderTemplate(template?.body || '', msg.variables || {}),
      subject: msg.subject || renderTemplate(template?.subject || '', msg.variables || {}),
      status: 'sent',
      sentAt: new Date(),
    };
    sentMessages.set(message.id, message);
    results.push(message);

    if (msg.sequenceId) {
      const sequence = sequences.get(msg.sequenceId);
      if (sequence) {
        sequence.stats.sent++;
        sequences.set(msg.sequenceId, sequence);
      }
    }
  }

  res.json({ success: true, sent: results.length, messages: results });
});

// ============================================================
// AI EMAIL WRITER
// ============================================================

app.post('/ai/write', async (req, res) => {
  const { context, goal, tone = 'professional', channel = 'email' } = req.body;

  // Placeholder AI generation
  const email = generateEmailContent(context, goal, tone, channel);

  res.json({ success: true, email });
});

function generateEmailContent(context, goal, tone, channel) {
  const { name, company, industry, role, sender } = context;

  const subjects = {
    first_contact: `Quick question about ${company || 'your team'}`,
    follow_up: `Following up - Quick chat?`,
    demo: `Demo: ${context.product || 'our solution'} for ${company}`,
    education: `${industry || 'Industry'} insights for ${company}`,
    objection: `Your question answered`,
    closing: `Next steps for ${company}`,
  };

  const bodies = {
    casual: {
      first_contact: `Hey ${name || 'there'},\n\nHope you're doing well! I noticed ${company} is doing some interesting work. Would love to chat about how we might help.\n\nCheers`,
      follow_up: `Hey ${name || 'there'},\n\nJust wanted to follow up on my earlier message. Happy to jump on a quick call if you're interested.\n\nBest`,
    },
    professional: {
      first_contact: `Hi ${name || 'there'},\n\nI hope this message finds you well. I've been following ${company}'s growth and believe we could add significant value.\n\nWould you be open to a brief conversation?\n\nBest regards`,
      follow_up: `Hi ${name || 'there'},\n\nI wanted to follow up on my previous message regarding ${context.subject || 'how we can help'}.\n\nHappy to share more details at your convenience.\n\nBest regards`,
    },
  };

  return {
    subject: subjects[goal] || 'Quick chat',
    body: (bodies[tone]?.[goal] || bodies.professional.first_contact)
      .replace('{{name}}', name || 'there')
      .replace('{{company}}', company || 'your company')
      .replace('{{industry}}', industry || 'your industry'),
    preview: `...`,
    personalization: extractPersonalization(context),
    tone,
    channel,
  };
}

function extractPersonalization(context) {
  const personalization = [];
  if (context.name) personalization.push({ field: 'name', value: context.name, usage: 'Greeting' });
  if (context.company) personalization.push({ field: 'company', value: context.company, usage: 'Research hook' });
  if (context.industry) personalization.push({ field: 'industry', value: context.industry, usage: 'Industry reference' });
  if (context.role) personalization.push({ field: 'role', value: context.role, usage: 'Title reference' });
  if (context.recentNews) personalization.push({ field: 'recentNews', value: context.recentNews, usage: 'Relevance hook' });
  return personalization;
}

// ============================================================
// MESSAGE TRACKING
// ============================================================

app.get('/messages', (req, res) => {
  const { sequenceId, recipient, status, limit = 100 } = req.query;
  let all = Array.from(sentMessages.values());

  if (sequenceId) all = all.filter(m => m.sequenceId === sequenceId);
  if (recipient) all = all.filter(m => m.recipient === recipient);
  if (status) all = all.filter(m => m.status === status);

  res.json({ success: true, count: all.length, messages: all.slice(0, Number(limit)) });
});

app.post('/messages/:id/open', (req, res) => {
  const message = sentMessages.get(req.params.id);
  if (!message) return res.status(404).json({ error: 'Message not found' });

  message.status = 'opened';
  message.openedAt = new Date();
  sentMessages.set(message.id, message);

  // Update sequence stats
  if (message.sequenceId) {
    const sequence = sequences.get(message.sequenceId);
    if (sequence) {
      sequence.stats.opened++;
      sequences.set(message.sequenceId, sequence);
    }
  }

  res.json({ success: true, message });
});

app.post('/messages/:id/reply', (req, res) => {
  const message = sentMessages.get(req.params.id);
  if (!message) return res.status(404).json({ error: 'Message not found' });

  message.status = 'replied';
  message.repliedAt = new Date();
  sentMessages.set(message.id, message);

  // Update sequence stats
  if (message.sequenceId) {
    const sequence = sequences.get(message.sequenceId);
    if (sequence) {
      sequence.stats.replied++;
      sequences.set(message.sequenceId, sequence);
    }
  }

  res.json({ success: true, message });
});

// ============================================================
// ANALYTICS
// ============================================================

app.get('/analytics/sequences', (req, res) => {
  const all = Array.from(sequences.values()).map(s => ({
    ...s,
    openRate: s.stats.sent > 0 ? ((s.stats.opened / s.stats.sent) * 100).toFixed(1) + '%' : '0%',
    replyRate: s.stats.sent > 0 ? ((s.stats.replied / s.stats.sent) * 100).toFixed(1) + '%' : '0%',
    conversionRate: s.stats.sent > 0 ? ((s.stats.converted / s.stats.sent) * 100).toFixed(1) + '%' : '0%',
  }));

  res.json({ success: true, sequences: all });
});

app.get('/analytics/overview', (req, res) => {
  const all = Array.from(sequences.values());
  const totals = all.reduce((acc, s) => ({
    sent: acc.sent + s.stats.sent,
    opened: acc.opened + s.stats.opened,
    replied: acc.replied + s.stats.replied,
    converted: acc.converted + s.stats.converted,
  }), { sent: 0, opened: 0, replied: 0, converted: 0 });

  res.json({
    success: true,
    overview: {
      ...totals,
      openRate: totals.sent > 0 ? ((totals.opened / totals.sent) * 100).toFixed(1) + '%' : '0%',
      replyRate: totals.sent > 0 ? ((totals.replied / totals.sent) * 100).toFixed(1) + '%' : '0%',
      conversionRate: totals.sent > 0 ? ((totals.converted / totals.sent) * 100).toFixed(1) + '%' : '0%',
    },
  });
});

// ============================================================
// HELPERS
// ============================================================

function renderTemplate(template, variables) {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'gi'), value);
  }
  return result;
}

function extractVariables(text) {
  const matches = text.match(/{{(\w+)}}/g) || [];
  return [...new Set(matches.map(m => m.replace(/{{|}}/g, '')))];
}

// ============================================================
// START
// ============================================================

app.listen(PORT, () => {
  console.log(`╔═══════════════════════════════════════════════════╗`);
  console.log(`║      Sales Engagement Hub - SalesOS v1.0        ║`);
  console.log(`╠═══════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                      ║`);
  console.log(`║  Sequences: ${sequences.size}                                   ║`);
  console.log(`║  Templates: ${templates.size}                                   ║`);
  console.log(`╚═══════════════════════════════════════════════════╝`);
});

module.exports = app;
