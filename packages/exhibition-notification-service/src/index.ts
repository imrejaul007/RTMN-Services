/**
 * Exhibition Notification Service
 * Port 5047
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

dotenv.config();

const PORT = process.env.PORT || 5047;
const SERVICE_NAME = 'exhibition-notification-service';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })],
});

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

interface Notification {
  id: string;
  type: 'push' | 'email' | 'sms' | 'whatsapp';
  channel: 'expo' | 'whatsapp' | 'smtp' | 'twilio';
  recipient_id: string;
  recipient_type: 'attendee' | 'exhibitor' | 'organizer' | 'staff';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sent_at?: string;
  error?: string;
  created_at: string;
}

interface Template {
  id: string;
  name: string;
  type: 'push' | 'email' | 'sms' | 'whatsapp';
  title: string;
  body: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
}

const notifications = new Map<string, Notification>();
const templates = new Map<string, Template>();

// Default templates
const defaultTemplates = [
  { name: 'ticket_confirmation', type: 'whatsapp', title: 'Ticket Confirmed!', body: 'Hi {{name}}, your ticket for {{exhibition_name}} is confirmed!', variables: ['name', 'exhibition_name'], is_active: true },
  { name: 'lead_alert', type: 'whatsapp', title: 'Hot Lead!', body: 'You captured a {{intent_level}} lead: {{lead_name}}. Follow up now!', variables: ['intent_level', 'lead_name'], is_active: true },
  { name: 'session_reminder', type: 'push', title: 'Session Starting Soon', body: '{{session_name}} starts in {{minutes}} minutes.', variables: ['session_name', 'minutes'], is_active: true },
  { name: 'mission_complete', type: 'push', title: 'Mission Complete!', body: 'You completed "{{mission_name}}" and earned {{coins}} coins!', variables: ['mission_name', 'coins'], is_active: true },
];

defaultTemplates.forEach(t => {
  const template: Template = { id: `TPL-${uuidv4().substring(0, 8).toUpperCase()}`, ...t, created_at: new Date().toISOString() };
  templates.set(template.id, template);
});

app.get('/health', (_req, res) => res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', timestamp: new Date().toISOString() });
app.get('/health/live', (_req, res) => res.json({ status: 'alive' });
app.get('/health/ready', (_req, res) => res.json({ status: 'ready' });

app.post('/api/notifications/send', async (req, res) => {
  const { type, channel, recipient_id, recipient_type, title, body } = req.body;
  if (!type || !channel || !recipient_id || !title || !body) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
  }

  const notification: Notification = {
    id: `NOTIF-${uuidv4().substring(0, 8).toUpperCase()}`,
    type, channel, recipient_id, recipient_type: recipient_type || 'attendee', title, body,
    status: 'pending', created_at: new Date().toISOString(),
  };

  // Simulate sending
  await new Promise(r => setTimeout(r, 100));
  notification.status = 'sent';
  notification.sent_at = new Date().toISOString();

  notifications.set(notification.id, notification);
  logger.info('Notification sent', { id: notification.id, type, channel });

  res.status(201).json({ success: true, data: notification });
});

app.get('/api/notifications/recipient/:recipientId', (req, res) => {
  const results = Array.from(notifications.values()).filter(n => n.recipient_id === req.params.recipientId);
  results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json({ success: true, data: { notifications: results, total: results.length } });
});

app.get('/api/templates', (req, res) => {
  const { type } = req.query;
  let results = Array.from(templates.values());
  if (type) results = results.filter(t => t.type === type);
  res.json({ success: true, data: results });
});

app.post('/api/templates/:id/render', (req, res) => {
  const template = templates.get(req.params.id);
  if (!template) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } });

  const { variables } = req.body;
  let renderedTitle = template.title;
  let renderedBody = template.body;

  for (const [key, value] of Object.entries(variables || {})) {
    renderedTitle = renderedTitle.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    renderedBody = renderedBody.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }

  res.json({ success: true, data: { title: renderedTitle, body: renderedBody } });
});

app.listen(PORT, () => logger.info(`Notification Service started on port ${PORT}`);;
export default app;
