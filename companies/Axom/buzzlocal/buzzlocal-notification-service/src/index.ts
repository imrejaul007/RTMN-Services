/**
 * BuzzLocal Notification Service
 * Push notifications, alerts, reminders
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4270;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'buzzlocal-notification-service' });
});

// Send notification
app.post('/api/notifications', (req, res) => {
  const { userId, title, body, data } = req.body;
  res.json({
    success: true,
    data: { id: `notif-${Date.now()}`, userId, title, body, sent: true }
  });
});

// Get user notifications
app.get('/api/notifications/:userId', (_req, res) => {
  res.json({
    success: true,
    data: { notifications: [], unread: 0 }
  });
});

app.listen(PORT, () => {
  console.log(`🔔 BuzzLocal Notification Service - Port ${PORT}`);
});

export default app;
