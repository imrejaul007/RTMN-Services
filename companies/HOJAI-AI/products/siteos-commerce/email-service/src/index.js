/**
 * HOJAI SiteOS Email Service
 * Port: 5486
 * SMTP email sending with templates and delivery tracking
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const app = express();
const PORT = process.env.PORT || 5486;
const STORAGE_PATH = process.env.STORAGE_PATH || '/tmp';

app.use(helmet());
app.use(cors());
app.use(express.json());

const requireAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers.authorization?.replace('Bearer ', '');
  if (!apiKey) return res.status(401).json({ error: 'API key required' });
  req.companyId = req.headers['x-company-id'] || 'default';
  next();
};

const getFile = (companyId, type) => `${STORAGE_PATH}/email-${type}-${companyId}.json`;
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

// SMTP Config (mock for dev)
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
  port: process.env.SMTP_PORT || 587,
  user: process.env.SMTP_USER || 'mock',
  pass: process.env.SMTP_PASS || 'mock',
  from: process.env.SMTP_FROM || 'noreply@hojai.ai'
};

// Mock email sending
const sendEmail = async (to, subject, html, from) => {
  console.log(`[Email] To: ${to}, Subject: ${subject}`);
  return {
    messageId: `msg_${uuidv4().substring(0, 8)}`,
    accepted: [to],
    rejected: [],
    queued: true
  };
};

// Personalization tokens
const PERSONALIZE = (template, data) => {
  let text = template;
  Object.entries(data).forEach(([key, val]) => {
    text = text.replace(new RegExp(`{{${key}}}`, 'g'), val);
  });
  return text;
};

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'email-service', port: PORT });
});

// =====================
// EMAIL TEMPLATES
// =====================

app.get('/api/templates', requireAuth, (req, res) => {
  const templates = loadData(req.companyId, 'templates');
  res.json({ templates });
});

app.post('/api/templates', requireAuth, (req, res) => {
  const { name, subject, html, text, variables } = req.body;
  if (!name || !subject || !html) {
    return res.status(400).json({ error: 'name, subject, html required' });
  }

  const template = {
    templateId: uuidv4(),
    companyId: req.companyId,
    name,
    subject,
    html,
    text: text || '',
    variables: variables || [],
    createdAt: new Date().toISOString()
  };

  const templates = loadData(req.companyId, 'templates');
  templates.push(template);
  saveData(req.companyId, 'templates', templates);
  res.json({ success: true, template });
});

app.put('/api/templates/:id', requireAuth, (req, res) => {
  const templates = loadData(req.companyId, 'templates');
  const index = templates.findIndex(t => t.templateId === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Template not found' });

  templates[index] = { ...templates[index], ...req.body, templateId: req.params.id };
  saveData(req.companyId, 'templates', templates);
  res.json({ success: true, template: templates[index] });
});

app.delete('/api/templates/:id', requireAuth, (req, res) => {
  let templates = loadData(req.companyId, 'templates');
  templates = templates.filter(t => t.templateId !== req.params.id);
  saveData(req.companyId, 'templates', templates);
  res.json({ success: true });
});

// =====================
// SEND EMAIL
// =====================

app.post('/api/email/send', requireAuth, async (req, res) => {
  const { to, subject, html, text, templateId, data, from, replyTo, attachments } = req.body;

  if (!to || !subject) {
    return res.status(400).json({ error: 'to and subject required' });
  }

  let finalHtml = html;
  let finalText = text;
  let finalSubject = subject;

  // Use template if provided
  if (templateId) {
    const templates = loadData(req.companyId, 'templates');
    const template = templates.find(t => t.templateId === templateId);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    finalHtml = html || PERSONALIZE(template.html, data || {});
    finalText = text || (template.text ? PERSONALIZE(template.text, data || {}) : '');
    finalSubject = subject || PERSONALIZE(template.subject, data || {});
  } else if (data) {
    finalHtml = html ? PERSONALIZE(html, data) : '';
    finalSubject = PERSONALIZE(subject, data);
  }

  try {
    const result = await sendEmail(to, finalSubject, finalHtml, from || SMTP_CONFIG.from);

    const email = {
      emailId: uuidv4(),
      companyId: req.companyId,
      messageId: result.messageId,
      to: Array.isArray(to) ? to : [to],
      from: from || SMTP_CONFIG.from,
      subject: finalSubject,
      html: finalHtml,
      status: 'queued',
      templateId: templateId || null,
      sentAt: new Date().toISOString(),
      deliveredAt: null,
      openedAt: null,
      clickedAt: null,
      bouncedAt: null,
      unsubscribedAt: null
    };

    const emails = loadData(req.companyId, 'emails');
    emails.push(email);
    saveData(req.companyId, 'emails', emails);

    res.json({ success: true, email });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send email', details: err.message });
  }
});

// =====================
// BULK SEND
// =====================

app.post('/api/email/bulk', requireAuth, async (req, res) => {
  const { recipients, templateId, data, subject } = req.body;

  if (!recipients || !Array.isArray(recipients)) {
    return res.status(400).json({ error: 'recipients array required' });
  }

  const results = { sent: 0, failed: 0, emails: [] };

  for (const recipient of recipients) {
    try {
      const emailData = { ...data, ...recipient.data };
      const emailRes = await fetch(`http://localhost:${PORT}/api/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': req.headers['x-api-key'],
          'X-Company-Id': req.companyId
        },
        body: JSON.stringify({
          to: recipient.email,
          templateId,
          subject,
          data: emailData
        })
      }).then(r => r.json());

      if (emailRes.success) {
        results.sent++;
        results.emails.push(emailRes.email);
      } else {
        results.failed++;
      }
    } catch {
      results.failed++;
    }
  }

  res.json({ success: true, results });
});

// =====================
// WEBHOOK (delivery tracking)
// =====================

app.post('/api/email/webhook', async (req, res) => {
  const { messageId, event, email } = req.body;
  if (!messageId || !event) return res.status(400).json({ error: 'messageId and event required' });

  const companies = loadData('global', 'emails');
  const index = companies.findIndex(e => e.messageId === messageId);

  if (index !== -1) {
    const events = ['delivered', 'opened', 'clicked', 'bounced', 'unsubscribed'];
    if (events.includes(event)) {
      companies[index].status = event;
      companies[index][`${event}At`] = new Date().toISOString();
      saveData('global', 'emails', companies);
    }
  }

  res.json({ received: true });
});

// =====================
// STATS
// =====================

app.get('/api/email/stats', requireAuth, (req, res) => {
  const emails = loadData(req.companyId, 'emails');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today - 7 * 24 * 60 * 60 * 1000);

  const thisWeek = emails.filter(e => new Date(e.sentAt) >= weekAgo);
  const sent = emails.length;
  const delivered = emails.filter(e => e.status === 'delivered').length;
  const opened = emails.filter(e => e.status === 'opened').length;
  const clicked = emails.filter(e => e.status === 'clicked').length;
  const bounced = emails.filter(e => e.status === 'bounced').length;

  res.json({
    total: sent,
    delivered,
    opened,
    clicked,
    bounced,
    thisWeek: thisWeek.length,
    deliveryRate: sent > 0 ? ((delivered / sent) * 100).toFixed(1) : 0,
    openRate: delivered > 0 ? ((opened / delivered) * 100).toFixed(1) : 0,
    clickRate: opened > 0 ? ((clicked / opened) * 100).toFixed(1) : 0
  });
});

app.get('/api/email/history', requireAuth, (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const emails = loadData(req.companyId, 'emails');
  const sorted = emails.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  const start = (page - 1) * limit;
  res.json({ emails: sorted.slice(start, start + Number(limit)), total: emails.length });
});

// =====================
// CONFIG
// =====================

app.get('/api/config', requireAuth, (req, res) => {
  res.json({
    smtp: {
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      from: SMTP_CONFIG.from
    }
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Email Service running on port ${PORT}`);
});

export default app;
