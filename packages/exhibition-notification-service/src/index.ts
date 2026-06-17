import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 5047;

app.use(cors());
app.use(express.json());

// Mock notification templates
const templates = {
  'session-starting': {
    id: 'session-starting',
    subject: 'Your Session Starts in 15 Minutes',
    body: 'Hi {{name}}, your session "{{session}}" at {{location}} starts in 15 minutes. See you there!',
    channels: ['push', 'whatsapp', 'email']
  },
  'speaker-change': {
    id: 'speaker-change',
    subject: 'Speaker Update for {{session}}',
    body: 'Hi {{name}}, the speaker for "{{session}}" has been updated to {{newSpeaker}}. See you at {{location}}!',
    channels: ['push', 'whatsapp', 'email']
  },
  'networking-match': {
    id: 'networking-match',
    subject: 'You Have a New Networking Match!',
    body: 'Hi {{name}}, we found a great match for you! {{matchName}} from {{matchCompany}} wants to connect.',
    channels: ['push', 'whatsapp']
  },
  'booth-available': {
    id: 'booth-available',
    subject: 'Your Preferred Booth is Available',
    body: 'Hi {{name}}, {{boothName}} is now available for a demo. Would you like to schedule a visit?',
    channels: ['push']
  },
  'event-reminder': {
    id: 'event-reminder',
    subject: 'Exhibition Tomorrow - Don\'t Miss Out!',
    body: 'Hi {{name}}, we\'re excited to see you tomorrow at {{eventName}}! Here\'s your QR code for quick check-in.',
    channels: ['push', 'whatsapp', 'email']
  }
};

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'exhibition-notification-service',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Send notification
app.post('/api/notifications/send', (req: Request, res: Response) => {
  const { userId, channel, templateId, data, priority } = req.body;

  const notification = {
    id: uuidv4(),
    userId,
    channel,
    templateId,
    data,
    priority: priority || 'normal',
    status: 'sent',
    sentAt: new Date().toISOString()
  };

  res.json({
    success: true,
    data: notification,
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

// Batch send
app.post('/api/notifications/batch', (req: Request, res: Response) => {
  const { notifications } = req.body;

  const results = notifications.map((n: any) => ({
    id: uuidv4(),
    userId: n.userId,
    channel: n.channel,
    status: 'sent',
    sentAt: new Date().toISOString()
  }));

  res.json({
    success: true,
    data: {
      total: notifications.length,
      sent: results.length,
      failed: 0,
      results
    },
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

// Get notification templates
app.get('/api/notifications/templates', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: Object.values(templates),
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

// Get user notifications
app.get('/api/notifications/user/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const { limit = 20, unreadOnly } = req.query;

  const notifications = Array.from({ length: Number(limit) }, (_, i) => ({
    id: uuidv4(),
    userId,
    channel: ['push', 'whatsapp', 'email'][i % 3],
    title: ['Session Starting', 'Speaker Update', 'Networking Match'][i % 3],
    body: 'Sample notification message',
    status: unreadOnly === 'true' ? 'unread' : (i % 2 === 0 ? 'read' : 'unread'),
    createdAt: new Date(Date.now() - i * 3600000).toISOString()
  }));

  res.json({
    success: true,
    data: {
      notifications,
      unreadCount: notifications.filter((n: any) => n.status === 'unread').length
    },
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

// Mark notification as read
app.patch('/api/notifications/:notificationId/read', (req: Request, res: Response) => {
  const { notificationId } = req.params;

  res.json({
    success: true,
    data: {
      id: notificationId,
      status: 'read',
      readAt: new Date().toISOString()
    },
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

// Push notifications
app.post('/api/notifications/push', (req: Request, res: Response) => {
  const { userId, title, body, data, badge } = req.body;

  res.json({
    success: true,
    data: {
      id: uuidv4(),
      userId,
      channel: 'push',
      title,
      body,
      data,
      badge,
      status: 'delivered',
      sentAt: new Date().toISOString()
    },
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

// WhatsApp notifications
app.post('/api/notifications/whatsapp', (req: Request, res: Response) => {
  const { phone, templateName, variables } = req.body;

  res.json({
    success: true,
    data: {
      id: uuidv4(),
      phone,
      channel: 'whatsapp',
      templateName,
      variables,
      status: 'delivered',
      sentAt: new Date().toISOString()
    },
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

// Email notifications
app.post('/api/notifications/email', (req: Request, res: Response) => {
  const { to, subject, body, html } = req.body;

  res.json({
    success: true,
    data: {
      id: uuidv4(),
      to,
      channel: 'email',
      subject,
      status: 'sent',
      sentAt: new Date().toISOString()
    },
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

// Notification preferences
app.get('/api/notifications/preferences/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;

  res.json({
    success: true,
    data: {
      userId,
      channels: {
        push: { enabled: true, quietHours: false },
        whatsapp: { enabled: true, quietHours: false },
        email: { enabled: true, quietHours: true, quietHoursStart: '22:00', quietHoursEnd: '08:00' }
      },
      categories: {
        sessions: { enabled: true, channels: ['push', 'whatsapp'] },
        networking: { enabled: true, channels: ['push', 'email'] },
        promotions: { enabled: false, channels: ['email'] },
        system: { enabled: true, channels: ['push', 'email'] }
      }
    },
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

// Update notification preferences
app.put('/api/notifications/preferences/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const preferences = req.body;

  res.json({
    success: true,
    data: {
      userId,
      preferences,
      updatedAt: new Date().toISOString()
    },
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

// Stats
app.get('/api/notifications/stats', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      today: {
        push: { sent: 4521, delivered: 4489, failed: 32 },
        whatsapp: { sent: 1234, delivered: 1220, failed: 14 },
        email: { sent: 856, delivered: 842, failed: 14, opened: 423 }
      },
      thisWeek: {
        push: { sent: 28456, delivered: 28234, failed: 222 },
        whatsapp: { sent: 8765, delivered: 8654, failed: 111 },
        email: { sent: 5234, delivered: 5145, failed: 89, opened: 2567 }
      },
      engagement: {
        pushOpenRate: 0.72,
        whatsappReadRate: 0.89,
        emailOpenRate: 0.49
      }
    },
    meta: { timestamp: new Date().toISOString(), requestId: uuidv4() }
  });
});

app.listen(PORT, () => {
  console.log(`Exhibition Notification Service running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});
