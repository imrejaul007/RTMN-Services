/**
 * Legal AI Service - Industry AI Vertical
 * "AI-Powered Legal Management"
 *
 * Features:
 * - Case Management
 * - Document Generation & Analysis
 * - Contract Lifecycle Management
 * - Compliance Checking
 * - Client Management
 * - Court Calendar Integration
 *
 * @module legal-ai
 * @version 1.0.0
 * @port 4510
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

// Import routes
import caseRoutes from './routes/cases.js';
import clientRoutes from './routes/clients.js';
import documentRoutes from './routes/documents.js';
import contractRoutes from './routes/contracts.js';
import complianceRoutes from './routes/compliance.js';

// Import agents
import { CaseManagerAgent } from './agents/case-manager-agent.js';
import { DocumentAssistantAgent } from './agents/document-assistant-agent.js';
import { ComplianceCheckerAgent } from './agents/compliance-checker-agent.js';

// Import services
import { CaseService } from './services/case-service.js';
import { ClientService } from './services/client-service.js';
import { DocumentService } from './services/document-service.js';
import { ContractService } from './services/contract-service.js';
import { ComplianceService } from './services/compliance-service.js';

// Logger setup
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

const app = express();
const PORT = parseInt(process.env.PORT || '4510', 10);

// ============================================
// MIDDLEWARE
// ============================================

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  }
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: Date.now() - start,
      requestId: req.headers['x-request-id']
    });
  });
  next();
});

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] as string || uuidv4();
  res.setHeader('X-Request-ID', req.headers['x-request-id']);
  next();
});

// ============================================
// SERVICE INSTANCES
// ============================================

const caseService = new CaseService();
const clientService = new ClientService();
const documentService = new DocumentService();
const contractService = new ContractService();
const complianceService = new ComplianceService();

// AI Agents
const caseManagerAgent = new CaseManagerAgent(caseService);
const documentAssistantAgent = new DocumentAssistantAgent(documentService, contractService);
const complianceCheckerAgent = new ComplianceCheckerAgent(complianceService);

// ============================================
// HEALTH ENDPOINTS
// ============================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'legal-ai',
    version: '1.0.0',
    tagline: 'AI-Powered Legal Management',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

app.get('/health/ready', (req: Request, res: Response) => {
  res.json({
    status: 'ready',
    agents: {
      caseManager: true,
      documentAssistant: true,
      complianceChecker: true
    },
    services: {
      cases: true,
      clients: true,
      documents: true,
      contracts: true,
      compliance: true
    },
    timestamp: new Date().toISOString()
  });
});

// ============================================
// AI AGENTS STATUS
// ============================================

app.get('/ai/agents', (req: Request, res: Response) => {
  res.json({
    active: true,
    agents: [
      {
        id: 'case-manager',
        name: 'Case Manager',
        status: 'active',
        capabilities: [
          'Case tracking and management',
          'Deadline monitoring',
          'Court date scheduling',
          'Status updates',
          'Client notifications'
        ]
      },
      {
        id: 'document-assistant',
        name: 'Document Assistant',
        status: 'active',
        capabilities: [
          'Contract drafting',
          'Document review',
          'Clause library',
          'Template generation',
          'Version control'
        ]
      },
      {
        id: 'compliance-checker',
        name: 'Compliance Checker',
        status: 'active',
        capabilities: [
          'Regulatory compliance',
          'Risk assessment',
          'GDPR compliance',
          'KYC verification',
          'Policy review'
        ]
      }
    ],
    endpoints: {
      cases: '/api/ai/cases/*',
      documents: '/api/ai/documents/*',
      compliance: '/api/ai/compliance/*'
    }
  });
});

// AI-powered endpoints
app.post('/ai/cases/analyze', async (req: Request, res: Response) => {
  try {
    const { caseId, action } = req.body;
    const result = await caseManagerAgent.processAction(caseId, action);
    res.json({ success: true, result });
  } catch (error: any) {
    logger.error('Case analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/ai/cases/deadline-alerts', async (req: Request, res: Response) => {
  try {
    const { caseId } = req.body;
    const alerts = await caseManagerAgent.checkDeadlines(caseId);
    res.json({ success: true, alerts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/ai/documents/draft', async (req: Request, res: Response) => {
  try {
    const { type, context } = req.body;
    const document = await documentAssistantAgent.draftDocument(type, context);
    res.json({ success: true, document });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/ai/documents/analyze', async (req: Request, res: Response) => {
  try {
    const { documentId } = req.body;
    const analysis = await documentAssistantAgent.analyzeDocument(documentId);
    res.json({ success: true, analysis });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/ai/compliance/check', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId, regulations } = req.body;
    const result = await complianceCheckerAgent.checkCompliance(entityType, entityId, regulations);
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/ai/compliance/risk-assessment', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.body;
    const assessment = await complianceCheckerAgent.assessRisk(entityType, entityId);
    res.json({ success: true, assessment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API ROUTES
// ============================================

app.use('/api/cases', caseRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/compliance', complianceRoutes);

// ============================================
// ROOT ENDPOINT
// ============================================

app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Legal AI',
    tagline: 'AI-Powered Legal Management',
    version: '1.0.0',
    description: 'Industry AI Vertical for Legal Services',
    port: PORT,
    features: [
      'Case Management',
      'Document Generation',
      'Contract Lifecycle',
      'Compliance Checking',
      'Client Management',
      'AI Agents'
    ],
    agents: [
      { name: 'Case Manager', status: 'active' },
      { name: 'Document Assistant', status: 'active' },
      { name: 'Compliance Checker', status: 'active' }
    ],
    endpoints: [
      'GET /api/cases',
      'GET /api/clients',
      'GET /api/documents',
      'GET /api/contracts',
      'POST /api/compliance/check',
      'GET /ai/agents'
    ]
  });
});

// ============================================
// ERROR HANDLER
// ============================================

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    err,
    method: req.method,
    path: req.path,
    requestId: req.headers['x-request-id']
  }, 'Unhandled error');

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    requestId: req.headers['x-request-id']
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  logger.info(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   LEGAL AI - Industry AI Vertical                                           ║
║   "AI-Powered Legal Management"                                             ║
║                                                                              ║
║   Port: ${PORT}                                                               ║
║                                                                              ║
║   ┌─────────────────────────────────────────────────────────────────────┐    ║
║   │ AI AGENTS                                                            │    ║
║   ├─────────────────────────────────────────────────────────────────────┤    ║
║   │ ✅ Case Manager      - Case tracking, deadlines, court dates          │    ║
║   │ ✅ Document Assistant - Contract drafting, document analysis          │    ║
║   │ ✅ Compliance Checker - Regulatory compliance, risk assessment      │    ║
║   └─────────────────────────────────────────────────────────────────────┘    ║
║                                                                              ║
║   ┌─────────────────────────────────────────────────────────────────────┐    ║
║   │ FEATURES                                                            │    ║
║   ├─────────────────────────────────────────────────────────────────────┤    ║
║   │ • Case Management       • Document Generation    • Contract Lifecycle │    ║
║   │ • Compliance Checking   • Client Management      • Court Calendar     │    ║
║   └─────────────────────────────────────────────────────────────────────┘    ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
