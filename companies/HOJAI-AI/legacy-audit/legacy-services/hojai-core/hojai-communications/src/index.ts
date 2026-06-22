import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';

import { commRoutes } from './routes';

const app = express();
const PORT = process.env.PORT || 4570;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

const limiter = rateLimit({ windowMs: 900000, max: 100 });
app.use('/api/', limiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'hojai-communications', version: '1.0.0' });
});

app.get('/health/live', (req, res) => res.json({ status: 'alive' }));
app.get('/health/ready', async (req, res) => {
  const mongo = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'ready', mongodb: mongo });
});

// Channels
app.get('/api/channels', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'whatsapp', name: 'WhatsApp', icon: '📱' },
      { id: 'sms', name: 'SMS', icon: '💬' },
      { id: 'email', name: 'Email', icon: '📧' },
      { id: 'push', name: 'Push Notification', icon: '🔔' },
      { id: 'voice', name: 'Voice', icon: '📞' },
      { id: 'instagram', name: 'Instagram', icon: '📸' },
      { id: 'telegram', name: 'Telegram', icon: '✈️' }
    ]
  });
});

// Templates categories
app.get('/api/categories', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'welcome', name: 'Welcome' },
      { id: 'onboarding', name: 'Onboarding' },
      { id: 'transaction', name: 'Transactional' },
      { id: 'marketing', name: 'Marketing' },
      { id: 'notification', name: 'Notification' },
      { id: 'reminder', name: 'Reminder' },
      { id: 'alert', name: 'Alert' },
      { id: 'survey', name: 'Survey' },
      { id: 'feedback', name: 'Feedback' },
      { id: 'promotional', name: 'Promotional' }
    ]
  });
});

app.use('/api/communications', commRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(err.statusCode || 500).json({ success: false, error: err.message });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

async function start() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai_communications';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║         HOJAI COMMUNICATIONS - Multi-channel Platform  ║
╠════════════════════════════════════════════════════════════╣
║  Port:     ${PORT}                                          ║
║  Health:   http://localhost:${PORT}/health                    ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
}

start();

export default app;
