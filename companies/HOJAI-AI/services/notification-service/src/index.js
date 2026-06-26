/**
 * HOJAI Notification Service
 * Email, SMS, Push, WhatsApp notifications
 */

import express from 'express';

const app = express();
const PORT = process.env.PORT || 4550;
app.use(express.json());

// In-memory storage
const notifications = [];
const templates = [
  { id: 'welcome', name: 'Welcome', channel: 'email', subject: 'Welcome to HOJAI!' },
  { id: 'password-reset', name: 'Password Reset', channel: 'email', subject: 'Reset your password' },
  { id: 'order-confirmed', name: 'Order Confirmed', channel: 'email', subject: 'Your order is confirmed' },
  { id: 'alert', name: 'Alert', channel: 'sms', subject: 'Alert from HOJAI' },
];

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'notification-service',
    version: '1.0.0',
    port: PORT,
    sent: notifications.length,
    uptime: process.uptime()
  });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready' });
});

// Send notification
app.post('/api/v1/send', (req, res) => {
  const { userId, channel, template, data = {} } = req.body;
  const notification = {
    id: `notif_${Date.now()}`,
    userId,
    channel: channel || 'email',
    template,
    data,
    status: 'sent',
    sentAt: new Date().toISOString()
  };
  notifications.push(notification);
  res.json({ success: true, notification });
});

// List templates
app.get('/api/v1/templates', (req, res) => {
  res.json({ templates });
});

// Get notification history
app.get('/api/v1/notifications', (req, res) => {
  const { userId, limit = 50 } = req.query;
  let filtered = notifications;
  if (userId) filtered = filtered.filter(n => n.userId === userId);
  res.json({ notifications: filtered.slice(-limit) });
});

// Stats
app.get('/api/v1/stats', (req, res) => {
  res.json({
    total: notifications.length,
    byChannel: notifications.reduce((acc, n) => {
      acc[n.channel] = (acc[n.channel] || 0) + 1;
      return acc;
    }, {})
  });
});

app.use((req, res) => res.status(404).json({ error: 'not_found' }));
app.use((err, req, res) => res.status(500).json({ error: err.message }));

app.listen(PORT, () => console.log(`[notification-service] listening on :${PORT}`));
