/**
 * HOJAI SiteOS SMS Service
 * Port: 5487
 * Multi-provider SMS gateway (Twilio, MSG91, Gupshup)
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const app = express();
const PORT = process.env.PORT || 5487;
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

const getFile = (companyId, type) => `${STORAGE_PATH}/sms-${type}-${companyId}.json`;
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

// Provider configs (mock for dev)
const PROVIDERS = {
  twilio: { sid: process.env.TWILIO_SID || 'mock', token: process.env.TWILIO_TOKEN || 'mock', from: process.env.TWILIO_FROM || '+1234567890' },
  msg91: { authKey: process.env.MSG91_KEY || 'mock', senderId: process.env.MSG91_SENDER || 'HOJAI', templateId: process.env.MSG91_TEMPLATE || '' },
  gupshup: { userId: process.env.GUPSHUP_USER || 'mock', password: process.env.GUPSHUP_PASS || 'mock', sender: process.env.GUPSHUP_SENDER || 'HOJAI' }
};

// Mock SMS sending
const sendSMS = async (to, message, provider = 'twilio') => {
  console.log(`[SMS] Provider: ${provider}, To: ${to}, Message: ${message.substring(0, 50)}...`);
  return { messageId: `sms_${uuidv4().substring(0, 8)}`, status: 'sent', provider };
};

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'sms-service', port: PORT });
});

// Send single SMS
app.post('/api/sms/send', requireAuth, async (req, res) => {
  const { to, message, provider = 'twilio', dltTemplateId } = req.body;
  if (!to || !message) return res.status(400).json({ error: 'to and message required' });

  // India DLT compliance check
  if (to.startsWith('+91') && !dltTemplateId) {
    return res.status(400).json({ error: 'DLT template ID required for India' });
  }

  try {
    const result = await sendSMS(to, message, provider);
    const sms = {
      smsId: uuidv4(),
      companyId: req.companyId,
      messageId: result.messageId,
      to,
      message,
      provider,
      dltTemplateId,
      status: result.status,
      segments: Math.ceil(message.length / 160),
      sentAt: new Date().toISOString()
    };

    const smsList = loadData(req.companyId, 'sms');
    smsList.push(sms);
    saveData(req.companyId, 'sms', smsList);

    res.json({ success: true, sms });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send SMS', details: err.message });
  }
});

// Send bulk SMS
app.post('/api/sms/bulk', requireAuth, async (req, res) => {
  const { recipients, message, provider = 'twilio', dltTemplateId } = req.body;
  if (!recipients || !Array.isArray(recipients) || !message) {
    return res.status(400).json({ error: 'recipients array and message required' });
  }

  const results = { sent: 0, failed: 0 };
  for (const to of recipients) {
    try {
      const result = await sendSMS(to, message, provider);
      if (result.status === 'sent') results.sent++;
      else results.failed++;
    } catch { results.failed++; }
  }

  res.json({ success: true, results, total: recipients.length });
});

// Get SMS status
app.get('/api/sms/status/:messageId', requireAuth, (req, res) => {
  const sms = loadData(req.companyId, 'sms').find(s => s.messageId === req.params.messageId);
  if (!sms) return res.status(404).json({ error: 'SMS not found' });
  res.json({ sms });
});

// SMS history
app.get('/api/sms/history', requireAuth, (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const smsList = loadData(req.companyId, 'sms');
  const sorted = smsList.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  const start = (page - 1) * limit;
  res.json({ sms: sorted.slice(start, start + Number(limit)), total: smsList.length });
});

// Stats
app.get('/api/sms/stats', requireAuth, (req, res) => {
  const smsList = loadData(req.companyId, 'sms');
  const sent = smsList.length;
  const delivered = smsList.filter(s => s.status === 'delivered').length;
  const failed = smsList.filter(s => s.status === 'failed').length;

  res.json({
    total: sent,
    delivered,
    failed,
    deliveryRate: sent > 0 ? ((delivered / sent) * 100).toFixed(1) : 0,
    byProvider: Object.keys(PROVIDERS).reduce((acc, p) => {
      acc[p] = smsList.filter(s => s.provider === p).length;
      return acc;
    }, {})
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`SMS Service running on port ${PORT}`);
});

export default app;
