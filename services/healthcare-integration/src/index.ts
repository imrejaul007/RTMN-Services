import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Routes
import patientRoutes from './routes/patient';
import appointmentRoutes from './routes/appointment';
import medicalRoutes from './routes/medical';
import telehealthRoutes from './routes/telehealth';

// Services
import { CustomerOpsBridge } from './services/customerOpsBridge';
import { HealthSync } from './services/healthSync';
import { logger } from './services/logger';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 4965;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();
  req.headers['x-request-id'] = requestId;
  logger.info({
    requestId,
    method: req.method,
    path: req.path,
    query: req.query
  });
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'healthcare-integration',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Service info
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    name: 'Healthcare Integration Service',
    description: 'RisaCare & Healthcare OS to Customer Operations Bridge',
    port: PORT,
    connections: {
      healthcareOS: process.env.HEALTHCARE_OS_URL || 'http://localhost:5020',
      risaCare: process.env.RISACARE_URL || 'http://localhost:7000',
      customerTwin: process.env.CUSTOMER_TWIN_URL || 'http://localhost:3017',
      journeyTwin: process.env.JOURNEY_TWIN_URL || 'http://localhost:3016',
      industryTwin: process.env.INDUSTRY_TWIN_URL || 'http://localhost:4705',
      subscriptionTwin: process.env.SUBSCRIPTION_TWIN_URL || 'http://localhost:3018',
      voiceAI: process.env.VOICE_AI_URL || 'http://localhost:3000'
    },
    integrations: {
      patientToCustomerTwin: true,
      appointmentToJourneyTwin: true,
      medicalToIndustryTwin: true,
      prescriptionToSubscriptionTwin: true,
      telehealthToVoiceAI: true
    }
  });
});

// API Routes
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/medical', medicalRoutes);
app.use('/api/telehealth', telehealthRoutes);

// Initialize services
const customerOpsBridge = new CustomerOpsBridge();
const healthSync = new HealthSync();

// Register with service registry
async function registerService() {
  try {
    const serviceRegistryUrl = process.env.SERVICE_REGISTRY_URL || 'http://localhost:4399';
    await fetch(`${serviceRegistryUrl}/api/services/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'healthcare-integration',
        port: PORT,
        url: `http://localhost:${PORT}`,
        healthCheck: `http://localhost:${PORT}/health`,
        tags: ['healthcare', 'integration', 'risacare', 'customer-ops'],
        metadata: {
          type: 'integration',
          industry: 'healthcare',
          connects: ['risacare', 'healthcare-os', 'customer-twin', 'journey-twin', 'industry-twin']
        }
      })
    });
    logger.info(`Service registered with registry at ${serviceRegistryUrl}`);
  } catch (error) {
    logger.warn('Service registry not available, continuing without registration');
  }
}

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path
  });
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    path: req.path
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Healthcare Integration Service running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`API docs: http://localhost:${PORT}/api/info`);
  registerService();
});

export { app, customerOpsBridge, healthSync };
