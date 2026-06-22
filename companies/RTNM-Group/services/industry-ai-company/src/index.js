/**
 * RTMN Industry AI Company Framework
 *
 * Packages AI capabilities as companies for each industry.
 * Each industry AI company provides specialized AI services.
 *
 * Port: 3030
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

import companyRoutes from './routes/company.js';
import capabilitiesRoutes from './routes/capabilities.js';
import deploymentRoutes from './routes/deployment.js';
import metricsRoutes from './routes/metrics.js';

const app = express();
const PORT = process.env.PORT || 3030;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Company Structure
export const COMPANY_STRUCTURE = {
  EXECUTIVE: 'executive',
  PRODUCT: 'product',
  ENGINEERING: 'engineering',
  SALES: 'sales',
  OPERATIONS: 'operations',
  SUPPORT: 'support'
};

// AI Company Types
export const COMPANY_TYPES = {
  FULL_SERVICE: 'full_service',
  SPECIALIZED: 'specialized',
  CONSULTING: 'consulting',
  SaaS: 'saas'
};

// Deployment Status
export const DEPLOYMENT_STATUS = {
  PLANNING: 'planning',
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  MAINTENANCE: 'maintenance'
};

// All 24 Industries
export const INDUSTRIES = [
  { id: 'fitness', name: 'Fitness', color: '#10b981' },
  { id: 'gaming', name: 'Gaming', color: '#8b5cf6' },
  { id: 'government', name: 'Government', color: '#6366f1' },
  { id: 'homeServices', name: 'Home Services', color: '#f59e0b' },
  { id: 'manufacturing', name: 'Manufacturing', color: '#ef4444' },
  { id: 'nonprofit', name: 'Nonprofit', color: '#ec4899' },
  { id: 'professional', name: 'Professional', color: '#06b6d4' },
  { id: 'sports', name: 'Sports', color: '#84cc16' },
  { id: 'travel', name: 'Travel', color: '#14b8a6' },
  { id: 'construction', name: 'Construction', color: '#f97316' },
  { id: 'entertainment', name: 'Entertainment', color: '#a855f7' },
  { id: 'financial', name: 'Financial', color: '#22c55e' },
  { id: 'healthcare', name: 'Healthcare', color: '#06b6d4' },
  { id: 'education', name: 'Education', color: '#3b82f6' },
  { id: 'retail', name: 'Retail', color: '#f43f5e' },
  { id: 'technology', name: 'Technology', color: '#0ea5e9' },
  { id: 'food', name: 'Food & Beverage', color: '#eab308' },
  { id: 'automotive', name: 'Automotive', color: '#64748b' },
  { id: 'realestate', name: 'Real Estate', color: '#8b5cf6' },
  { id: 'media', name: 'Media', color: '#ef4444' },
  { id: 'legal', name: 'Legal', color: '#1e40af' },
  { id: 'agriculture', name: 'Agriculture', color: '#22c55e' },
  { id: 'energy', name: 'Energy', color: '#f59e0b' },
  { id: 'logistics', name: 'Logistics', color: '#64748b' }
];

// Company Registry
export const companyRegistry = new Map();

// Initialize default companies for all industries
function initializeCompanies() {
  for (const industry of INDUSTRIES) {
    const companyId = `ai_company_${industry.id}`;

    companyRegistry.set(companyId, {
      id: companyId,
      name: `${industry.name} AI Company`,
      industry: industry.id,
      industryName: industry.name,
      type: COMPANY_TYPES.FULL_SERVICE,
      status: 'active',
      structure: COMPANY_STRUCTURE,
      capabilities: generateDefaultCapabilities(industry.id),
      departments: generateDefaultDepartments(industry.id),
      metrics: {
        users: 0,
        requests: 0,
        uptime: 100,
        satisfaction: 0
      },
      createdAt: new Date().toISOString()
    });
  }

  logger.info(`Initialized ${INDUSTRIES.length} industry AI companies`);
}

function generateDefaultCapabilities(industryId) {
  return [
    { id: `${industryId}_assistant`, name: 'AI Assistant', type: 'chatbot' },
    { id: `${industryId}_analytics`, name: 'Analytics Engine', type: 'analytics' },
    { id: `${industryId}_automation`, name: 'Workflow Automation', type: 'automation' },
    { id: `${industryId}_prediction`, name: 'Predictive Engine', type: 'prediction' }
  ];
}

function generateDefaultDepartments(industryId) {
  return {
    executive: { headcount: 2, focus: ['strategy', 'vision'] },
    product: { headcount: 5, focus: ['roadmap', 'features'] },
    engineering: { headcount: 10, focus: ['development', 'infrastructure'] },
    sales: { headcount: 5, focus: ['acquisition', 'retention'] },
    operations: { headcount: 3, focus: ['efficiency', 'quality'] },
    support: { headcount: 5, focus: ['customer_success', 'documentation'] }
  };
}

initializeCompanies();

export { logger };

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      duration: Date.now() - start,
      status: res.statusCode
    });
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'industry-ai-company',
    version: '1.0.0',
    port: PORT,
    companies: companyRegistry.size,
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'RTMN Industry AI Company Framework',
    version: '1.0.0',
    description: 'Package AI capabilities as companies for each industry',
    port: PORT,
    capabilities: [
      'AI company creation for 24 industries',
      'Capability management',
      'Deployment orchestration',
      'Company metrics'
    ],
    endpoints: [
      'GET /api/companies',
      'GET /api/companies/:id',
      'GET /api/capabilities',
      'POST /api/deployments',
      'GET /api/metrics'
    ]
  });
});

// Routes
app.use('/api/companies', companyRoutes);
app.use('/api/capabilities', capabilitiesRoutes);
app.use('/api/deployments', deploymentRoutes);
app.use('/api/metrics', metricsRoutes);

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  logger.info(`Industry AI Company Framework running on port ${PORT}`);
  logger.info(`${companyRegistry.size} industry companies initialized`);
});

export { app };
