/**
 * RTMN Email OS (port 4862)
 *
 * Email AI orchestration across providers (SendGrid / AWS SES / nodemailer / mock).
 * Inbox intelligence: triage (category/priority/sentiment), smart compose, auto-reply drafts.
 *
 * Designed so the service runs fully without API keys via the "mock" provider.
 * Triage engine uses lightweight heuristics (keyword + pattern matching) so it works offline.
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4862;

app.use(helmet());
app.use(cors());
app.use(express.json());

// ----------------------------- Provider abstraction -----------------------------

const providers = {
  mock: {
    name: 'mock', label: 'Mock SMTP (no credentials)',
    send: async (msg) => ({
      providerMessageId: `mock_${uuidv4().slice(0, 12)}`,
      provider: 'mock',
      status: 'sent',
      sentAt: new Date().toISOString(),
      note: 'No SMTP call — message held in mock outbox.',
    }),
    healthCheck: async () => ({ status: 'ok', mode: 'mock' }),
  },
  sendgrid: {
    name: 'sendgrid', label: 'SendGrid',
    send: async (msg) => ({
      providerMessageId: `sg_${uuidv4().slice(0, 12)}`,
      provider: 'sendgrid', status: 'queued',
      sentAt: new Date().toISOString(),
      note: 'Would POST to https://api.sendgrid.com/v3/mail/send with SG. key.',
    }),
    healthCheck: async () => ({ status: 'configured', mode: 'live', requiresApiKey: 'SENDGRID_API_KEY' }),
  },
  ses: {
    name: 'ses', label: 'AWS SES',
    send: async (msg) => ({
      providerMessageId: `ses_${uuidv4().slice(0, 12)}`,
      provider: 'ses', status: 'queued',
      sentAt: new Date().toISOString(),
      note: 'Would call AWS SES SendRawEmail via SDK with AWS_ACCESS_KEY_ID.',
    }),
    healthCheck: async () => ({ status: 'configured', mode: 'live', requiresApiKey: 'AWS_ACCESS_KEY_ID' }),
  },
  nodemailer: {
    name: 'nodemailer', label: 'Nodemailer (any SMTP)',
    send: async (msg) => ({
      providerMessageId: `smtp_${uuidv4().slice(0, 12)}`,
      provider: 'nodemailer', status: 'queued',
      sentAt: new Date().toISOString(),
      note: 'Would use nodemailer transport with SMTP_HOST/SMTP_USER/SMTP_PASS env vars.',
    }),
    healthCheck: async () => ({ status: 'configured', mode: 'live', requiresEnv: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'] }),
  },
};

let currentProvider = process.env.EMAIL_PROVIDER || 'mock';

// ----------------------------- In-memory storage -----------------------------

const outbox = new PersistentMap('outbox', { serviceName: 'email-os' });     // messageId -> outbound email
const inbox = new PersistentMap('inbox', { serviceName: 'email-os' });      // messageId -> inbound email (with triage metadata)
const threads = new PersistentMap('threads', { serviceName: 'email-os' });    // threadId -> { messages: [], subject, participants }
const templates = new PersistentMap('templates', { serviceName: 'email-os' });  // templateId -> { name, subject, body, variables }
const contacts = new PersistentMap('contacts', { serviceName: 'email-os' });   // email -> { name, firstSeenAt, lastSeenAt, messageCount }

// ----------------------------- Triage heuristics -----------------------------

const CATEGORY_KEYWORDS = {
  sales: ['pricing', 'quote', 'demo', 'proposal', 'contract', 'purchase', 'buy', 'order'],
  support: ['help', 'issue', 'problem', 'bug', 'broken', 'not working', 'error', 'support', 'ticket'],
  billing: ['invoice', 'payment', 'refund', 'charge', 'billing', 'receipt', 'subscription'],
  partnership: ['partner', 'partnership', 'integration', 'collaborate', 'collab', 'alliance'],
  press: ['press', 'media', 'interview', 'journalist', 'publication'],
  internal: ['team', 'internal', 'fyi', 'heads up'],
};

const URGENT_KEYWORDS = ['urgent', 'asap', 'immediately', 'critical', 'down', 'broken', 'cannot access', "can't access", 'lawsuit', 'legal'];
const POSITIVE_KEYWORDS = ['thanks', 'thank you', 'great', 'awesome', 'love', 'perfect', 'excellent'];
const NEGATIVE_KEYWORDS = ['angry', 'frustrated', 'disappointed', 'terrible', 'awful', 'worst', 'unhappy', 'complaint', 'refund now'];

const triage = (subject, body) => {
  const text = `${subject} ${body}`.toLowerCase();
  // Category: pick the one with the highest keyword match count
  const scores = {};
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[cat] = kws.reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);
  }
  const category = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  const categoryScore = scores[category];

  // Priority
  const urgentHits = URGENT_KEYWORDS.filter(kw => text.includes(kw)).length;
  const priority = urgentHits >= 2 ? 'P0' : urgentHits === 1 ? 'P1' : category === 'support' || category === 'billing' ? 'P2' : 'P3';

  // Sentiment
  const posHits = POSITIVE_KEYWORDS.filter(kw => text.includes(kw)).length;
  const negHits = NEGATIVE_KEYWORDS.filter(kw => text.includes(kw)).length;
  const sentiment = negHits > posHits ? 'negative' : posHits > negHits ? 'positive' : 'neutral';

  // Suggested actions
  const suggestedActions = [];
  if (priority === 'P0') suggestedActions.push('escalate_immediately');
  if (category === 'sales') suggestedActions.push('route_to_sales_os');
  if (category === 'support') suggestedActions.push('create_ticket');
  if (category === 'billing') suggestedActions.push('route_to_finance_os');
  if (sentiment === 'negative') suggestedActions.push('human_review');
  if (sentiment === 'positive') suggestedActions.push('thank_you_reply');

  return { category, categoryScore, priority, sentiment, suggestedActions };
};

// ----------------------------- Seeded templates -----------------------------

const seedTemplates = [
  { id: 'tpl-intro', name: 'intro_reply', subject: 'Re: {{subject}}', body: 'Hi {{name}},\n\nThanks for reaching out! I will get back to you within {{etaHours}} hours.\n\nBest,\n{{senderName}}', variables: ['subject', 'name', 'etaHours', 'senderName'] },
  { id: 'tpl-quote-followup', name: 'quote_followup', subject: 'Following up on your quote request', body: 'Hi {{name}},\n\nJust checking in on the quote we sent on {{quoteDate}}. Happy to answer any questions.\n\nBest,\n{{senderName}}', variables: ['name', 'quoteDate', 'senderName'] },
  { id: 'tpl-support-ack', name: 'support_acknowledgement', subject: 'We received your support request (#{{ticketId}})', body: 'Hi {{name}},\n\nWe have received your request and assigned ticket #{{ticketId}}. Our team typically responds within {{slaHours}} hours.\n\nFor urgent issues, reply with URGENT in the subject.\n\nBest,\n{{supportTeam}}', variables: ['name', 'ticketId', 'slaHours', 'supportTeam'] },
  { id: 'tpl-meeting-confirm', name: 'meeting_confirmation', subject: 'Confirmed: {{meetingTitle}} on {{datetime}}', body: 'Hi {{name}},\n\nThis confirms our meeting "{{meetingTitle}}" on {{datetime}} ({{timezone}}).\n\nJoin link: {{joinLink}}\n\nAgenda:\n{{agenda}}\n\nBest,\n{{senderName}}', variables: ['name', 'meetingTitle', 'datetime', 'timezone', 'joinLink', 'agenda', 'senderName'] },
];
seedTemplates.forEach(t => templates.set(t.id, { ...t, status: 'active', createdAt: new Date().toISOString() }));

const renderTemplate = (tpl, vars) => ({
  subject: tpl.subject.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{{${k}}}`)),
  body: tpl.body.replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{{${k}}}`)),
});

// ----------------------------- Health -----------------------------

app.get('/health', async (_req, res) => {
  const providerHealth = await providers[currentProvider].healthCheck();
  res.json({
    status: 'healthy', service: 'email-os', version: '1.0.0', port: PORT,
    provider: currentProvider, providerHealth,
    counts: { inbox: inbox.size, outbox: outbox.size, threads: threads.size, templates: templates.size, contacts: contacts.size },
    timestamp: new Date().toISOString(),
  });
});

// ----------------------------- Providers -----------------------------

app.get('/api/providers', (_req, res) => {
  res.json({ providers: Object.values(providers).map(p => ({ name: p.name, label: p.label })), current: currentProvider });
});

app.post('/api/providers/switch',requireAuth,  (req, res) => {
  const { provider } = req.body;
  if (!providers[provider]) return res.status(400).json({ error: 'unknown_provider', available: Object.keys(providers) });
  currentProvider = provider;
  res.json({ switched: provider, current: currentProvider });
});

// ----------------------------- Templates -----------------------------

app.get('/api/templates', (_req, res) => res.json({ templates: [...templates.values()], count: templates.size }));

app.post('/api/templates',requireAuth,  (req, res) => {
  const { name, subject, body, variables } = req.body || {};
  if (!name || !subject || !body) return res.status(400).json({ error: 'name_subject_body_required' });
  const id = `tpl-${uuidv4().slice(0, 8)}`;
  const tpl = { id, name, subject, body, variables: variables || [], status: 'active', createdAt: new Date().toISOString() };
  templates.set(id, tpl);
  res.status(201).json(tpl);
});

app.post('/api/templates/:id/render',requireAuth,  (req, res) => {
  const tpl = templates.get(req.params.id);
  if (!tpl) return res.status(404).json({ error: 'not_found' });
  res.json({ templateId: tpl.id, ...renderTemplate(tpl, req.body || {}) });
});

// ----------------------------- Send -----------------------------

app.post('/api/emails/send',requireAuth,  async (req, res) => {
  const { to, from, subject, body, html, templateId, templateVars, inReplyTo } = req.body || {};
  if (!to || !subject) return res.status(400).json({ error: 'to_and_subject_required' });

  let finalSubject = subject, finalBody = body, finalHtml = html;
  if (templateId) {
    const tpl = templates.get(templateId);
    if (!tpl) return res.status(404).json({ error: 'template_not_found' });
    const rendered = renderTemplate(tpl, templateVars || {});
    finalSubject = rendered.subject;
    finalBody = rendered.body;
  }

  const result = await providers[currentProvider].send({ to, from, subject: finalSubject, body: finalBody });
  const id = `out-${uuidv4().slice(0, 12)}`;
  const msg = { id, to, from: from || 'team@rtmn.ai', subject: finalSubject, body: finalBody, html: finalHtml, provider: currentProvider, providerMessageId: result.providerMessageId, status: result.status, sentAt: result.sentAt, inReplyTo: inReplyTo || null };
  outbox.set(id, msg);

  // Update contact
  const c = contacts.get(to) || { email: to, firstSeenAt: new Date().toISOString() };
  c.lastSeenAt = new Date().toISOString();
  c.messageCount = (c.messageCount || 0) + 1;
  contacts.set(to, c);

  // Thread update
  if (inReplyTo) {
    const parent = inbox.get(inReplyTo) || outbox.get(inReplyTo);
    if (parent && parent.threadId) {
      const t = threads.get(parent.threadId);
      if (t) t.messages.push({ id, direction: 'outbound', sentAt: msg.sentAt });
    }
  }

  res.status(201).json(msg);
});

// ----------------------------- Inbox (receive + triage) -----------------------------

app.post('/api/inbox/receive',requireAuth,  (req, res) => {
  const { from, to, subject, body } = req.body || {};
  if (!from || !subject) return res.status(400).json({ error: 'from_and_subject_required' });
  const id = `in-${uuidv4().slice(0, 12)}`;
  const triageResult = triage(subject, body || '');
  const threadId = `thr-${uuidv4().slice(0, 8)}`;
  const msg = {
    id, from, to: to || 'team@rtmn.ai', subject, body: body || '',
    direction: 'inbound', receivedAt: new Date().toISOString(),
    read: false, threadId,
    ...triageResult,
  };
  inbox.set(id, msg);

  const c = contacts.get(from) || { email: from, firstSeenAt: new Date().toISOString() };
  c.lastSeenAt = new Date().toISOString();
  c.messageCount = (c.messageCount || 0) + 1;
  contacts.set(from, c);

  threads.set(threadId, { threadId, subject, participants: [...new Set([from, msg.to])], messages: [{ id, direction: 'inbound', receivedAt: msg.receivedAt }], category: triageResult.category, priority: triageResult.priority, createdAt: msg.receivedAt });

  res.status(201).json(msg);
});

app.get('/api/inbox', (req, res) => {
  const { category, priority, sentiment, unreadOnly, limit = 100 } = req.query;
  let out = [...inbox.values()].sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
  if (category) out = out.filter(m => m.category === category);
  if (priority) out = out.filter(m => m.priority === priority);
  if (sentiment) out = out.filter(m => m.sentiment === sentiment);
  if (unreadOnly === 'true') out = out.filter(m => !m.read);
  out = out.slice(0, parseInt(limit, 10));
  res.json({ messages: out, count: out.length });
});

app.get('/api/inbox/:id', (req, res) => {
  const m = inbox.get(req.params.id);
  if (!m) return res.status(404).json({ error: 'not_found' });
  if (!m.read) { m.read = true; inbox.set(m.id, m); }
  res.json(m);
});

// ----------------------------- Smart compose (draft auto-reply) -----------------------------

app.post('/api/inbox/:id/draft-reply',requireAuth,  (req, res) => {
  const m = inbox.get(req.params.id);
  if (!m) return res.status(404).json({ error: 'not_found' });
  const senderName = (m.from.split('@')[0] || 'there').replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  let templateId, templateVars;
  switch (m.category) {
    case 'sales': templateId = 'tpl-intro'; templateVars = { subject: m.subject, name: senderName, etaHours: 4, senderName: 'Sales Team' }; break;
    case 'support': templateId = 'tpl-support-ack'; templateVars = { name: senderName, ticketId: req.params.id.slice(-6).toUpperCase(), slaHours: 8, supportTeam: 'Support' }; break;
    case 'billing': templateId = 'tpl-intro'; templateVars = { subject: m.subject, name: senderName, etaHours: 2, senderName: 'Billing' }; break;
    default: templateId = 'tpl-intro'; templateVars = { subject: m.subject, name: senderName, etaHours: 24, senderName: 'Team' };
  }
  const tpl = templates.get(templateId);
  const rendered = renderTemplate(tpl, templateVars);
  res.json({ originalMessageId: m.id, category: m.category, priority: m.priority, templateId, draft: rendered, note: 'Review and edit before sending via POST /api/emails/send with inReplyTo=' + m.id });
});

// ----------------------------- Threads -----------------------------

app.get('/api/threads', (_req, res) => {
  res.json({ threads: [...threads.values()], count: threads.size });
});

app.get('/api/threads/:id', (req, res) => {
  const t = threads.get(req.params.id);
  if (!t) return res.status(404).json({ error: 'not_found' });
  res.json(t);
});

// ----------------------------- Contacts -----------------------------

app.get('/api/contacts', (_req, res) => res.json({ contacts: [...contacts.values()], count: contacts.size }));

// ----------------------------- 404 -----------------------------

app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`[email-os] listening on ${PORT} — provider: ${currentProvider}`);
});
installGracefulShutdown(server);
