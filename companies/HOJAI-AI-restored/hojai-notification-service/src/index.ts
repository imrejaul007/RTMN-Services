import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import { notificationRoutes } from './routes/notification';
import { templateRoutes } from './routes/template';
import { Notification } from './models/Notification';
import { Template } from './models/Template';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4880;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/notifications', notificationRoutes);
app.use('/api/templates', templateRoutes);

// Health check
app.get('/health', async (_req: Request, res: Response) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
      status: 'healthy',
      service: 'hojai-notification-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: dbStatus
    });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: String(error) });
  }
});

// API Info
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    service: 'HOJAI Notification Service',
    version: '1.0.0',
    description: 'Multi-channel notification service (Email, SMS)',
    endpoints: {
      notifications: '/api/notifications',
      templates: '/api/templates',
      health: '/health'
    }
  });
});

// Database connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-notifications';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully');

    // Create indexes
    await Notification.createIndexes();
    await Template.createIndexes();

    // Seed default templates
    await seedDefaultTemplates();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Seed default templates
const seedDefaultTemplates = async () => {
  const defaultTemplates = [
    {
      name: 'welcome_email',
      channel: 'email',
      subject: 'Welcome to HOJAI AI!',
      body: 'Hello {{name}}, Welcome to HOJAI AI! We are excited to have you on board.',
      variables: ['name']
    },
    {
      name: 'welcome_sms',
      channel: 'sms',
      subject: '',
      body: 'Hello {{name}}, Welcome to HOJAI AI!',
      variables: ['name']
    },
    {
      name: 'order_confirmation',
      channel: 'email',
      subject: 'Order Confirmed - {{orderId}}',
      body: 'Your order {{orderId}} has been confirmed. Total: {{amount}}',
      variables: ['orderId', 'amount']
    },
    {
      name: 'password_reset',
      channel: 'email',
      subject: 'Reset Your Password',
      body: 'Click here to reset your password: {{resetLink}}. This link expires in {{expiry}} minutes.',
      variables: ['resetLink', 'expiry']
    },
    {
      name: 'appointment_reminder',
      channel: 'sms',
      subject: '',
      body: 'Reminder: You have an appointment on {{date}} at {{time}}.',
      variables: ['date', 'time']
    }
  ];

  for (const template of defaultTemplates) {
    await Template.findOneAndUpdate(
      { name: template.name, channel: template.channel },
      template,
      { upsert: true, new: true }
    );
  }
  console.log('Default templates seeded');
};

// Start server
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║     HOJAI NOTIFICATION SERVICE                              ║
║     Port: ${PORT}                                            ║
║     Status: Running                                         ║
╚════════════════════════════════════════════════════════════╝
    `);
  });
};

startServer().catch(console.error);
