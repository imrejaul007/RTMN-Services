/**
 * HOJAI Studio - Email Service
 * Transactional and marketing emails
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}
const PORT = 4770;
app.use(express.json());

const templates = new Map();
const emails = [];
const campaigns = [];

// Default templates
const DEFAULT_TEMPLATES = {
  welcome: { name: 'Welcome', subject: 'Welcome to {{appName}}!', html: '<h1>Welcome!</h1><p>Hello {{name}}, welcome to {{appName}}.</p>' },
  verify: { name: 'Verify Email', subject: 'Verify your email', html: '<p>Your verification code is: <strong>{{code}}</strong></p>' },
  reset: { name: 'Password Reset', subject: 'Reset your password', html: '<p>Click <a href="{{link}}">here</a> to reset your password.</p>' },
  invoice: { name: 'Invoice', subject: 'Invoice #{{invoiceId}}', html: '<h1>Invoice #{{invoiceId}}</h1><p>Amount: ₹{{amount}}</p>' }
};

Object.entries(DEFAULT_TEMPLATES).forEach(([key, t]) => templates.set(key, { key, ...t }));

// REST API - Templates
app.get('/api/templates', (req, res) => res.json(Array.from(templates.values())));

app.post('/api/templates', requireInternal, (req, res) => {
  const { key, name, subject, html, text } = req.body;
  const template = { id: uuidv4(), key, name, subject, html, text };
  templates.set(key, template);
  res.json(template);
});

// REST API - Send Email
app.post('/api/send', requireInternal, (req, res) => {
  const { to, templateKey, subject, variables = {}, from = 'noreply@hojai.app', projectId } = req.body;

  const template = templates.get(templateKey);
  const finalSubject = interpolate(template?.subject || subject, variables);
  const html = interpolate(template?.html || '', variables);

  const email = {
    id: uuidv4(),
    projectId,
    to, from, subject: finalSubject,
    html, template: templateKey,
    status: 'sent',
    sentAt: new Date().toISOString()
  };

  emails.push(email);
  res.json(email);
});

// REST API - Batch Send
app.post('/api/send/batch', requireInternal, (req, res) => {
  const { to, templateKey, variables, projectId } = req.body;
  const campaignId = uuidv4();

  const results = to.map(email => ({
    campaignId,
    to: email,
    status: 'queued',
    emailId: null
  }));

  campaigns.push({ id: campaignId, total: to.length, sent: 0, status: 'running', createdAt: new Date().toISOString() });

  // Simulate send
  setTimeout(() => {
    results.forEach(r => { r.status = 'sent'; r.emailId = uuidv4(); emails.push({ id: r.emailId, to: r.to, status: 'sent' }); });
    const camp = campaigns.find(c => c.id === campaignId);
    if (camp) { camp.sent = to.length; camp.status = 'completed'; }
  }, 1000);

  res.json({ campaignId, total: to.length, status: 'processing' });
});

// REST API - Campaigns
app.get('/api/campaigns', (req, res) => {
  const { projectId } = req.query;
  let list = campaigns;
  if (projectId) list = list.filter(c => c.projectId === projectId);
  res.json(list);
});

// REST API - Email Logs
app.get('/api/emails', (req, res) => {
  const { projectId, status, limit = 100 } = req.query;
  let list = emails;
  if (projectId) list = list.filter(e => e.projectId === projectId);
  if (status) list = list.filter(e => e.status === status);
  res.json(list.slice(-parseInt(limit)));
});

// REST API - Analytics
app.get('/api/analytics/:projectId', (req, res) => {
  const projectEmails = emails.filter(e => e.projectId === req.params.projectId);
  res.json({
    total: projectEmails.length,
    sent: projectEmails.filter(e => e.status === 'sent').length,
    delivered: projectEmails.filter(e => e.status === 'delivered').length,
    opened: Math.round(projectEmails.length * 0.4),
    clicked: Math.round(projectEmails.length * 0.15),
    bounced: Math.round(projectEmails.length * 0.02)
  });
});

function interpolate(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || '');
}

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'email-service', templates: templates.size }));
app.listen(PORT, () => console.log(`Email Service running on port ${PORT}`));
