import { requireAuth } from '@rtmn/shared/auth';
/**
 * Notification OS - Multi-channel Notifications
 * Enterprise notification system with preferences
 * Port: 4878
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4878;
const START_TIME = Date.now();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Types
interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  actionUrl?: string;
  channels: ('email' | 'push' | 'sms' | 'webhook')[];
  metadata: Record<string, string>;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
}

interface UserPreferences {
  userId: string;
  channels: ('email' | 'push' | 'sms' | 'webhook')[];
  quietHours: { enabled: boolean; start: string; end: string; timezone: string };
  emailDigest: 'none' | 'daily' | 'weekly';
  pushEnabled: boolean;
  categories: Record<string, { enabled: boolean; email: boolean; push: boolean }>;
  webhookUrl?: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  messageTemplate: string;
  variables: string[];
  createdAt: string;
}

// In-memory storage
const notifications = new Map<string, Notification>();
const preferences = new Map<string, UserPreferences>();
const templates = new Map<string, NotificationTemplate>();

// Seed default templates
const defaultTemplates: NotificationTemplate[] = [
  { id: 'tmpl-1', name: 'Welcome', type: 'info', title: 'Welcome to {{appName}}', messageTemplate: 'Hello {{name}}, welcome aboard!', variables: ['appName', 'name'], createdAt: new Date().toISOString() },
  { id: 'tmpl-2', name: 'Password Reset', type: 'warning', title: 'Password Reset Request', messageTemplate: 'Click here to reset: {{link}}', variables: ['link'], createdAt: new Date().toISOString() },
  { id: 'tmpl-3', name: 'Task Completed', type: 'success', title: 'Task Completed', messageTemplate: 'Your task "{{taskName}}" is done!', variables: ['taskName'], createdAt: new Date().toISOString() },
  { id: 'tmpl-4', name: 'Error Alert', type: 'error', title: 'Error: {{errorType}}', messageTemplate: 'An error occurred: {{errorMessage}}', variables: ['errorType', 'errorMessage'], createdAt: new Date().toISOString() },
];
defaultTemplates.forEach(t => templates.set(t.id, t));

// Validation schemas
const SendNotificationSchema = z.object({
  userId: z.string(),
  type: z.enum(['info', 'warning', 'error', 'success']),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  actionUrl: z.string().url().optional(),
  channels: z.array(z.enum(['email', 'push', 'sms', 'webhook'])).optional(),
  metadata: z.record(z.string()).optional(),
  templateId: z.string().optional(),
  expiresAt: z.string().optional(),
});

const BroadcastSchema = z.object({
  type: z.enum(['info', 'warning', 'error', 'success']),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  userIds: z.array(z.string()).optional(),
  role: z.string().optional(),
  channels: z.array(z.enum(['email', 'push', 'sms', 'webhook'])).optional(),
});

const PreferencesSchema = z.object({
  userId: z.string(),
  channels: z.array(z.enum(['email', 'push', 'sms', 'webhook'])),
  quietHours: z.object({
    enabled: z.boolean(),
    start: z.string(),
    end: z.string(),
    timezone: z.string(),
  }),
  emailDigest: z.enum(['none', 'daily', 'weekly']),
  pushEnabled: z.boolean(),
  categories: z.record(z.object({
    enabled: z.boolean(),
    email: z.boolean(),
    push: z.boolean(),
  })).optional(),
  webhookUrl: z.string().url().optional(),
});

const TemplateSchema = z.object({
  name: z.string(),
  type: z.enum(['info', 'warning', 'error', 'success']),
  title: z.string(),
  messageTemplate: z.string(),
  variables: z.array(z.string()),
});

// Health endpoints
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'notification-os',
    version: '1.0.0',
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    notifications: notifications.size,
    users: preferences.size,
    templates: templates.size,
  });
});

app.get('/ready', (_req: Request, res: Response) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// Send notification
app.post('/api/notifications/send',requireAuth,  (req: Request, res: Response) => {
  try {
    const data = SendNotificationSchema.parse(req.body);
    const id = uuidv4();
    const now = new Date().toISOString();

    // Get user preferences or use defaults
    let userPrefs = preferences.get(data.userId);
    if (!userPrefs) {
      userPrefs = {
        userId: data.userId,
        channels: ['email'],
        quietHours: { enabled: false, start: '22:00', end: '08:00', timezone: 'UTC' },
        emailDigest: 'none',
        pushEnabled: true,
        categories: {},
      };
      preferences.set(data.userId, userPrefs);
    }

    const notification: Notification = {
      id,
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      read: false,
      priority: data.priority || 'normal',
      actionUrl: data.actionUrl,
      channels: data.channels || userPrefs.channels,
      metadata: data.metadata || {},
      createdAt: now,
      expiresAt: data.expiresAt,
    };

    notifications.set(id, notification);

    // Simulate sending via channels
    const sent = notification.channels.map(channel => ({ channel, sent: true }));

    res.status(201).json({
      id,
      status: 'sent',
      channels: sent,
      notification,
    });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: err.issues });
    res.status(500).json({ error: err.message });
  }
});

// Get notifications
app.get('/api/notifications', (req: Request, res: Response) => {
  const { userId, unreadOnly, type, priority, limit = 50, offset = 0 } = req.query as any;

  let results = Array.from(notifications.values());

  if (userId) results = results.filter(n => n.userId === userId);
  if (unreadOnly === 'true') results = results.filter(n => !n.read);
  if (type) results = results.filter(n => n.type === type);
  if (priority) results = results.filter(n => n.priority === priority);

  // Filter expired
  const now = new Date().toISOString();
  results = results.filter(n => !n.expiresAt || n.expiresAt > now);

  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = results.length;
  const unread = results.filter(n => !n.read).length;

  res.json({
    total,
    unread,
    notifications: results.slice(offset, offset + limit),
  });
});

// Get single notification
app.get('/api/notifications/:id', (req: Request, res: Response) => {
  const notification = notifications.get(req.params.id);
  if (!notification) return res.status(404).json({ error: 'Notification not found' });
  res.json(notification);
});

// Mark as read
app.put('/api/notifications/:id/read',requireAuth,  (req: Request, res: Response) => {
  const notification = notifications.get(req.params.id);
  if (!notification) return res.status(404).json({ error: 'Notification not found' });

  notification.read = true;
  notification.readAt = new Date().toISOString();
  res.json(notification);
});

// Mark all as read
app.post('/api/notifications/read-all',requireAuth,  (req: Request, res: Response) => {
  const { userId } = req.body;
  const now = new Date().toISOString();
  let count = 0;

  for (const n of notifications.values()) {
    if (!userId || n.userId === userId) {
      if (!n.read) {
        n.read = true;
        n.readAt = now;
        count++;
      }
    }
  }

  res.json({ success: true, count });
});

// Delete notification
app.delete('/api/notifications/:id',requireAuth,  (req: Request, res: Response) => {
  if (!notifications.has(req.params.id)) return res.status(404).json({ error: 'Notification not found' });
  notifications.delete(req.params.id);
  res.json({ success: true });
});

// User preferences
app.get('/api/notifications/preferences/:userId', (req: Request, res: Response) => {
  let prefs = preferences.get(req.params.userId);
  if (!prefs) {
    prefs = {
      userId: req.params.userId,
      channels: ['email'],
      quietHours: { enabled: false, start: '22:00', end: '08:00', timezone: 'UTC' },
      emailDigest: 'none',
      pushEnabled: true,
      categories: {},
    };
    preferences.set(req.params.userId, prefs);
  }
  res.json(prefs);
});

app.post('/api/notifications/preferences',requireAuth,  (req: Request, res: Response) => {
  try {
    const data = PreferencesSchema.parse(req.body);
    const prefs: UserPreferences = data;
    preferences.set(data.userId, prefs);
    res.json(prefs);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: err.issues });
    res.status(500).json({ error: err.message });
  }
});

// Templates
app.get('/api/notifications/templates', (_req: Request, res: Response) => {
  res.json({ total: templates.size, templates: Array.from(templates.values()) });
});

app.post('/api/notifications/templates',requireAuth,  (req: Request, res: Response) => {
  try {
    const data = TemplateSchema.parse(req.body);
    const id = 'tmpl-' + uuidv4().slice(0, 8);
    const template: NotificationTemplate = { id, ...data, createdAt: new Date().toISOString() };
    templates.set(id, template);
    res.status(201).json(template);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: err.issues });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/templates/:id/send',requireAuth,  (req: Request, res: Response) => {
  const template = templates.get(req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });

  const { userId, variables, priority, actionUrl, channels } = req.body;
  if (!userId || !variables) return res.status(400).json({ error: 'userId and variables required' });

  // Interpolate template
  let title = template.title;
  let message = template.messageTemplate;
  for (const [key, value] of Object.entries(variables)) {
    title = title.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    message = message.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }

  const id = uuidv4();
  const notification: Notification = {
    id,
    userId,
    type: template.type,
    title,
    message,
    read: false,
    priority: priority || 'normal',
    actionUrl,
    channels: channels || ['email'],
    metadata: { templateId: template.id },
    createdAt: new Date().toISOString(),
  };

  notifications.set(id, notification);
  res.status(201).json(notification);
});

// Broadcast
app.post('/api/notifications/broadcast',requireAuth,  (req: Request, res: Response) => {
  try {
    const data = BroadcastSchema.parse(req.body);
    const now = new Date().toISOString();
    const ids: string[] = [];

    const targetUsers = data.userIds || Array.from(preferences.keys());

    for (const userId of targetUsers) {
      const id = uuidv4();
      const notification: Notification = {
        id,
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        read: false,
        priority: data.priority,
        channels: data.channels || ['push'],
        metadata: {},
        createdAt: now,
      };
      notifications.set(id, notification);
      ids.push(id);
    }

    res.json({ success: true, count: ids.length, ids });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation error', details: err.issues });
    res.status(500).json({ error: err.message });
  }
});

// Statistics
app.get('/api/notifications/stats', (req: Request, res: Response) => {
  const { userId } = req.query;
  let all = Array.from(notifications.values());
  if (userId) all = all.filter(n => n.userId === userId);

  const now = new Date().toISOString();
  const active = all.filter(n => !n.expiresAt || n.expiresAt > now);

  res.json({
    total: active.length,
    unread: active.filter(n => !n.read).length,
    byType: {
      info: active.filter(n => n.type === 'info').length,
      warning: active.filter(n => n.type === 'warning').length,
      error: active.filter(n => n.type === 'error').length,
      success: active.filter(n => n.type === 'success').length,
    },
    byPriority: {
      low: active.filter(n => n.priority === 'low').length,
      normal: active.filter(n => n.priority === 'normal').length,
      high: active.filter(n => n.priority === 'high').length,
      urgent: active.filter(n => n.priority === 'urgent').length,
    },
  });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: unknown) => {
  console.error('[notification-os] error:', err);
  res.status(500).json({ error: 'Internal error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`[notification-os] listening on :${PORT}`);
  console.log(`[notification-os] channels: email, push, sms, webhook`);
  console.log(`[notification-os] templates: ${templates.size}`);
});

export default app;
