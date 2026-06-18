const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 4870;

app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory storage
const notifications = new Map();
const templates = new Map();
const subscriptions = new Map();
const channels = new Map();

// Channel statuses
const channelStatuses = {
  email: { status: 'active', lastTest: new Date().toISOString() },
  sms: { status: 'active', lastTest: new Date().toISOString() },
  push: { status: 'active', lastTest: new Date().toISOString() },
  inapp: { status: 'active', lastTest: new Date().toISOString() },
  slack: { status: 'active', lastTest: new Date().toISOString() },
  webhook: { status: 'active', lastTest: new Date().toISOString() }
};

// Initialize with sample templates
const sampleTemplates = [
  {
    id: 'tmpl-1',
    name: 'Welcome Email',
    type: 'email',
    subject: 'Welcome to RTMN Platform',
    body: `Dear {{name}},

Welcome to RTMN Platform! We're excited to have you on board.

Your account has been created with the following details:
- Email: {{email}}
- Role: {{role}}

Get started by visiting our knowledge base.

Best regards,
RTMN Team`,
    variables: ['name', 'email', 'role'],
    status: 'active',
    createdAt: new Date('2025-01-01').toISOString()
  },
  {
    id: 'tmpl-2',
    name: 'Password Reset',
    type: 'email',
    subject: 'Reset Your Password',
    body: `Hi {{name}},

You requested a password reset. Click the link below to reset your password:

{{resetLink}}

This link expires in 24 hours.

If you didn't request this, please ignore this email.`,
    variables: ['name', 'resetLink'],
    status: 'active',
    createdAt: new Date('2025-01-01').toISOString()
  },
  {
    id: 'tmpl-3',
    name: 'Deal Won',
    type: 'inapp',
    subject: 'Deal Closed!',
    body: `🎉 Congratulations! You've closed the deal with {{customer}}.

Deal Value: {{amount}}
Expected Close: {{closeDate}}

This win has been added to your pipeline.`,
    variables: ['customer', 'amount', 'closeDate'],
    status: 'active',
    createdAt: new Date('2025-01-15').toISOString()
  },
  {
    id: 'tmpl-4',
    name: 'Ticket Assigned',
    type: 'inapp',
    subject: 'New Ticket Assigned',
    body: `A new ticket has been assigned to you.

Ticket: #{{ticketId}}
Subject: {{subject}}
Priority: {{priority}}
Customer: {{customer}}`,
    variables: ['ticketId', 'subject', 'priority', 'customer'],
    status: 'active',
    createdAt: new Date('2025-02-01').toISOString()
  },
  {
    id: 'tmpl-5',
    name: 'Meeting Reminder',
    type: 'sms',
    body: `Reminder: You have a meeting "{{title}}" in {{time}}.

Join: {{meetingLink}}`,
    variables: ['title', 'time', 'meetingLink'],
    status: 'active',
    createdAt: new Date('2025-02-15').toISOString()
  }
];

sampleTemplates.forEach(t => templates.set(t.id, t));

// Sample subscriptions
const sampleSubscriptions = [
  { id: 'sub-1', userId: 'user-1', userName: 'John Doe', email: 'john@example.com', channels: ['email', 'inapp'], preferences: { marketing: true, product: true, weekly: true }, status: 'active' },
  { id: 'sub-2', userId: 'user-2', userName: 'Jane Smith', email: 'jane@example.com', channels: ['email', 'sms', 'inapp'], preferences: { marketing: false, product: true, weekly: false }, status: 'active' },
  { id: 'sub-3', userId: 'user-3', userName: 'Bob Wilson', email: 'bob@example.com', phone: '+1234567890', channels: ['push', 'inapp'], preferences: { marketing: true, product: false, weekly: true }, status: 'active' }
];

sampleSubscriptions.forEach(s => subscriptions.set(s.id, s));

// ==================== NOTIFICATIONS API ====================

// Send notification (creates and sends)
app.post('/api/notifications/send', (req, res) => {
  const { recipientId, recipientName, recipientEmail, channel, templateId, subject, body, data, priority } = req.body;

  if (!channel || (!templateId && !body)) {
    return res.status(400).json({ error: 'Channel and template or body are required' });
  }

  const notification = {
    id: `notif-${uuidv4().slice(0, 8)}`,
    recipientId: recipientId || 'unknown',
    recipientName: recipientName || 'Anonymous',
    recipientEmail: recipientEmail || '',
    channel,
    subject: subject || '',
    body: body || '',
    priority: priority || 'normal',
    status: 'pending',
    sentAt: null,
    deliveredAt: null,
    readAt: null,
    data: data || {},
    createdAt: new Date().toISOString()
  };

  // If template provided, merge variables
  if (templateId && templates.has(templateId)) {
    const template = templates.get(templateId);
    notification.subject = template.subject || notification.subject;
    notification.body = interpolateTemplate(template.body, data || {});
    notification.templateId = templateId;
  }

  notifications.set(notification.id, notification);

  // Simulate sending
  setTimeout(() => {
    notification.status = 'sent';
    notification.sentAt = new Date().toISOString();

    // Simulate delivery
    setTimeout(() => {
      notification.status = 'delivered';
      notification.deliveredAt = new Date().toISOString();
    }, 100);
  }, 50);

  res.status(201).json(notification);
});

// Get all notifications
app.get('/api/notifications', (req, res) => {
  const { recipientId, channel, status, priority, limit = 50, offset = 0 } = req.query;

  let result = Array.from(notifications.values());

  if (recipientId) result = result.filter(n => n.recipientId === recipientId);
  if (channel) result = result.filter(n => n.channel === channel);
  if (status) result = result.filter(n => n.status === status);
  if (priority) result = result.filter(n => n.priority === priority);

  // Sort by createdAt (newest first)
  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = result.length;
  result = result.slice(Number(offset), Number(offset) + Number(limit));

  res.json({ notifications: result, total, limit: Number(limit), offset: Number(offset) });
});

// Get single notification
app.get('/api/notifications/:id', (req, res) => {
  const notification = notifications.get(req.params.id);

  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  res.json(notification);
});

// Mark as read
app.post('/api/notifications/:id/read', (req, res) => {
  const notification = notifications.get(req.params.id);

  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  notification.readAt = new Date().toISOString();

  res.json(notification);
});

// Mark all as read
app.post('/api/notifications/read-all', (req, res) => {
  const { recipientId } = req.body;

  let updated = 0;
  notifications.forEach(n => {
    if ((!recipientId || n.recipientId === recipientId) && !n.readAt) {
      n.readAt = new Date().toISOString();
      updated++;
    }
  });

  res.json({ message: `Marked ${updated} notifications as read` });
});

// Delete notification
app.delete('/api/notifications/:id', (req, res) => {
  if (!notifications.has(req.params.id)) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  notifications.delete(req.params.id);

  res.json({ message: 'Notification deleted successfully' });
});

// ==================== TEMPLATES API ====================

// Get all templates
app.get('/api/templates', (req, res) => {
  const { type, status } = req.query;

  let result = Array.from(templates.values());

  if (type) result = result.filter(t => t.type === type);
  if (status) result = result.filter(t => t.status === status);

  res.json({ templates: result, total: result.length });
});

// Get single template
app.get('/api/templates/:id', (req, res) => {
  const template = templates.get(req.params.id);

  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  res.json(template);
});

// Create template
app.post('/api/templates', (req, res) => {
  const { name, type, subject, body, variables } = req.body;

  if (!name || !type || !body) {
    return res.status(400).json({ error: 'Name, type, and body are required' });
  }

  const template = {
    id: `tmpl-${uuidv4().slice(0, 8)}`,
    name,
    type,
    subject: subject || '',
    body,
    variables: variables || extractVariables(body),
    status: 'active',
    createdAt: new Date().toISOString()
  };

  templates.set(template.id, template);

  res.status(201).json(template);
});

// Update template
app.put('/api/templates/:id', (req, res) => {
  const template = templates.get(req.params.id);

  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const { name, type, subject, body, variables, status } = req.body;

  if (name) template.name = name;
  if (type) template.type = type;
  if (subject) template.subject = subject;
  if (body) {
    template.body = body;
    template.variables = variables || extractVariables(body);
  }
  if (variables) template.variables = variables;
  if (status) template.status = status;

  res.json(template);
});

// Delete template
app.delete('/api/templates/:id', (req, res) => {
  if (!templates.has(req.params.id)) {
    return res.status(404).json({ error: 'Template not found' });
  }

  templates.delete(req.params.id);

  res.json({ message: 'Template deleted successfully' });
});

// Preview template with sample data
app.post('/api/templates/:id/preview', (req, res) => {
  const template = templates.get(req.params.id);

  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const { data } = req.body;

  // Generate sample data
  const sampleData = {
    name: 'John Doe',
    email: 'john@example.com',
    resetLink: 'https://rtmn.app/reset/abc123',
    customer: 'Acme Corp',
    amount: '$50,000',
    title: 'Weekly Sync',
    time: '30 minutes'
  };

  const mergedData = { ...sampleData, ...data };

  res.json({
    templateId: template.id,
    preview: {
      subject: interpolateTemplate(template.subject, mergedData),
      body: interpolateTemplate(template.body, mergedData)
    },
    variables: template.variables,
    usedData: mergedData
  });
});

// ==================== SUBSCRIPTIONS API ====================

// Get all subscriptions
app.get('/api/subscriptions', (req, res) => {
  const { userId, status } = req.query;

  let result = Array.from(subscriptions.values());

  if (userId) result = result.filter(s => s.userId === userId);
  if (status) result = result.filter(s => s.status === status);

  res.json({ subscriptions: result, total: result.length });
});

// Get subscription
app.get('/api/subscriptions/:id', (req, res) => {
  const subscription = subscriptions.get(req.params.id);

  if (!subscription) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  res.json(subscription);
});

// Create subscription
app.post('/api/subscriptions', (req, res) => {
  const { userId, userName, email, phone, channels, preferences } = req.body;

  if (!userId || !email) {
    return res.status(400).json({ error: 'UserId and email are required' });
  }

  const subscription = {
    id: `sub-${uuidv4().slice(0, 8)}`,
    userId,
    userName: userName || 'Unknown',
    email,
    phone: phone || '',
    channels: channels || ['email', 'inapp'],
    preferences: preferences || { marketing: true, product: true, weekly: true },
    status: 'active',
    createdAt: new Date().toISOString()
  };

  subscriptions.set(subscription.id, subscription);

  res.status(201).json(subscription);
});

// Update subscription
app.put('/api/subscriptions/:id', (req, res) => {
  const subscription = subscriptions.get(req.params.id);

  if (!subscription) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  const { userName, email, phone, channels, preferences, status } = req.body;

  if (userName) subscription.userName = userName;
  if (email) subscription.email = email;
  if (phone) subscription.phone = phone;
  if (channels) subscription.channels = channels;
  if (preferences) subscription.preferences = preferences;
  if (status) subscription.status = status;

  res.json(subscription);
});

// Delete subscription
app.delete('/api/subscriptions/:id', (req, res) => {
  if (!subscriptions.has(req.params.id)) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  subscriptions.delete(req.params.id);

  res.json({ message: 'Subscription deleted successfully' });
});

// ==================== CHANNELS API ====================

// Get channel statuses
app.get('/api/channels', (req, res) => {
  res.json({ channels: channelStatuses });
});

// Update channel status
app.put('/api/channels/:channel', (req, res) => {
  const { status } = req.body;

  if (!channelStatuses[req.params.channel]) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  channelStatuses[req.params.channel].status = status || 'active';
  channelStatuses[req.params.channel].lastTest = new Date().toISOString();

  res.json(channelStatuses[req.params.channel]);
});

// Test channel
app.post('/api/channels/:channel/test', (req, res) => {
  const { recipient, testMessage } = req.body;
  const channel = req.params.channel;

  if (!channelStatuses[channel]) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  // Simulate test
  const result = {
    channel,
    recipient: recipient || 'test@example.com',
    message: testMessage || 'This is a test notification',
    status: 'sent',
    sentAt: new Date().toISOString()
  };

  res.json(result);
});

// ==================== STATISTICS API ====================

app.get('/api/statistics', (req, res) => {
  const all = Array.from(notifications.values());

  const stats = {
    total: all.length,
    byChannel: {},
    byStatus: {},
    byPriority: {},
    deliveryRate: 0,
    readRate: 0,
    avgDeliveryTime: 0,
    topTemplates: []
  };

  // Count by channel
  all.forEach(n => {
    stats.byChannel[n.channel] = (stats.byChannel[n.channel] || 0) + 1;
    stats.byStatus[n.status] = (stats.byStatus[n.status] || 0) + 1;
    stats.byPriority[n.priority] = (stats.byPriority[n.priority] || 0) + 1;
  });

  // Calculate rates
  const delivered = all.filter(n => n.status === 'delivered').length;
  const read = all.filter(n => n.readAt).length;

  stats.deliveryRate = all.length > 0 ? (delivered / all.length * 100).toFixed(1) : 0;
  stats.readRate = delivered > 0 ? (read / delivered * 100).toFixed(1) : 0;

  // Calculate avg delivery time
  const withDeliveryTime = all.filter(n => n.sentAt && n.deliveredAt);
  if (withDeliveryTime.length > 0) {
    const totalTime = withDeliveryTime.reduce((sum, n) => {
      return sum + (new Date(n.deliveredAt) - new Date(n.sentAt));
    }, 0);
    stats.avgDeliveryTime = (totalTime / withDeliveryTime.length / 1000).toFixed(2) + 's';
  }

  // Top used templates
  const templateUsage = {};
  all.forEach(n => {
    if (n.templateId) {
      templateUsage[n.templateId] = (templateUsage[n.templateId] || 0) + 1;
    }
  });

  stats.topTemplates = Object.entries(templateUsage)
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  res.json(stats);
});

// ==================== BULK OPERATIONS ====================

// Send bulk notifications
app.post('/api/notifications/bulk', (req, res) => {
  const { notifications: bulkNotifications } = req.body;

  if (!bulkNotifications || !Array.isArray(bulkNotifications)) {
    return res.status(400).json({ error: 'Array of notifications is required' });
  }

  const results = bulkNotifications.map(data => {
    const notification = {
      id: `notif-${uuidv4().slice(0, 8)}`,
      recipientId: data.recipientId || 'unknown',
      recipientName: data.recipientName || 'Anonymous',
      recipientEmail: data.recipientEmail || '',
      channel: data.channel,
      subject: data.subject || '',
      body: data.body || '',
      priority: data.priority || 'normal',
      status: 'pending',
      sentAt: null,
      deliveredAt: null,
      readAt: null,
      data: data.data || {},
      createdAt: new Date().toISOString()
    };

    if (data.templateId && templates.has(data.templateId)) {
      const template = templates.get(data.templateId);
      notification.subject = template.subject || notification.subject;
      notification.body = interpolateTemplate(template.body, data.data || {});
      notification.templateId = data.templateId;
    }

    notifications.set(notification.id, notification);

    // Simulate sending
    setTimeout(() => {
      notification.status = 'sent';
      notification.sentAt = new Date().toISOString();
    }, 50);

    return notification;
  });

  res.status(201).json({
    message: `Queued ${results.length} notifications`,
    notifications: results
  });
});

// Helper function to interpolate template variables
function interpolateTemplate(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}

// Helper function to extract variables from template
function extractVariables(template) {
  const matches = template.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'notification-service',
    port: PORT,
    notifications: notifications.size,
    templates: templates.size,
    subscriptions: subscriptions.size
  });
});

app.listen(PORT, () => {
  console.log('📬 Notification Service running on port ' + PORT);
  console.log('   Templates: ' + templates.size);
  console.log('   Subscriptions: ' + subscriptions.size);
});
