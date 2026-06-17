/**
 * Exhibition OS Gateway
 * Main API Gateway for all Exhibition Services
 * Port: 5040
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 5040;

// ============================================
// MIDDLEWARE
// ============================================

app.use(helmet());
app.use(cors());
app.use(express.json());

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).requestId = uuidv4();
  res.setHeader('X-Request-Id', (req as any).requestId);
  next();
});

// Tenant middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).tenantId = req.headers['x-tenant-id'] || 'default';
  next();
});

// Service URLs
const SERVICES = {
  organizer: process.env.EXHIBITION_ORGANIZER_URL || 'http://localhost:5041',
  exhibitor: process.env.EXHIBITION_EXHIBITOR_URL || 'http://localhost:5042',
  attendee: process.env.EXHIBITION_ATTENDEE_URL || 'http://localhost:5043',
  twin: process.env.EXHIBITION_TWIN_URL || 'http://localhost:5044',
  badge: process.env.EXHIBITION_BADGE_URL || 'http://localhost:5045',
  analytics: process.env.EXHIBITION_ANALYTICS_URL || 'http://localhost:5046',
  notification: process.env.EXHIBITION_NOTIFICATION_URL || 'http://localhost:5047',
  payment: process.env.EXHIBITION_PAYMENT_URL || 'http://localhost:5048',
  intelligence: process.env.EXHIBITION_INTELLIGENCE_URL || 'http://localhost:5049',
  economy: process.env.EXHIBITION_ECONOMY_URL || 'http://localhost:5050',
  marketplace: process.env.EXHIBITION_MARKETPLACE_URL || 'http://localhost:5051',
  networking: process.env.EXHIBITION_NETWORKING_URL || 'http://localhost:5052',
  appointment: process.env.EXHIBITION_APPOINTMENT_URL || 'http://localhost:5053',
  passport: process.env.EXHIBITION_PASSPORT_URL || 'http://localhost:5054',
  sponsor: process.env.EXHIBITION_SPONSOR_URL || 'http://localhost:5055',
  venueOps: process.env.EXHIBITION_VENUE_OPS_URL || 'http://localhost:5056',
  staff: process.env.EXHIBITION_STAFF_URL || 'http://localhost:5057',
  crm: process.env.EXHIBITION_CRM_URL || 'http://localhost:5058',
  document: process.env.EXHIBITION_DOCUMENT_URL || 'http://localhost:5059',
  integration: process.env.EXHIBITION_INTEGRATION_URL || 'http://localhost:5060',
  floor: process.env.EXHIBITION_FLOOR_URL || 'http://localhost:5061',
};

// Proxy helper
async function proxy(service: string, path: string, method: string, body?: any, res?: Response) {
  try {
    const url = `${SERVICES[service as keyof typeof SERVICES]}${path}`;
    const response = await axios({
      method,
      url,
      data: body,
      timeout: 5000,
      headers: {
        'X-Tenant-Id': 'default',
        'X-Request-Id': uuidv4(),
      },
    });
    return response.data;
  } catch (error: any) {
    if (res) {
      res.status(500).json({
        success: false,
        error: { code: 'SERVICE_ERROR', message: error.message },
      });
    }
    throw error;
  }
}

// ============================================
// HEALTH CHECKS
// ============================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'exhibition-gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      gateway: 'up',
      organizer: 'unknown',
      exhibitor: 'unknown',
      attendee: 'unknown',
      twin: 'unknown',
      badge: 'unknown',
    },
  });
});

app.get('/health/live', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/health/ready', async (req: Request, res: Response) => {
  const checks = await Promise.allSettled([
    axios.get(`${SERVICES.organizer}/health`, { timeout: 2000 }),
    axios.get(`${SERVICES.exhibitor}/health`, { timeout: 2000 }),
    axios.get(`${SERVICES.attendee}/health`, { timeout: 2000 }),
  ]);

  const ready = checks.filter(c => c.status === 'fulfilled').length >= 2;
  res.json({
    status: ready ? 'ready' : 'not_ready',
    checks: checks.map((c, i) => ({
      service: ['organizer', 'exhibitor', 'attendee'][i],
      status: c.status === 'fulfilled' ? 'up' : 'down',
    })),
  });
});

// ============================================
// EXHIBITIONS API
// ============================================

app.get('/api/exhibitions', async (req: Request, res: Response) => {
  try {
    const data = await proxy('organizer', '/api/exhibitions', 'GET', null, res);
    if (data) res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch exhibitions' } });
  }
});

app.get('/api/exhibitions/:id', async (req: Request, res: Response) => {
  try {
    const data = await proxy('organizer', `/api/exhibitions/${req.params.id}`, 'GET', null, res);
    if (data) res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch exhibition' } });
  }
});

app.post('/api/exhibitions', async (req: Request, res: Response) => {
  try {
    const data = await proxy('organizer', '/api/exhibitions', 'POST', req.body, res);
    if (data) res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to create exhibition' } });
  }
});

app.patch('/api/exhibitions/:id', async (req: Request, res: Response) => {
  try {
    const data = await proxy('organizer', `/api/exhibitions/${req.params.id}`, 'PATCH', req.body, res);
    if (data) res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to update exhibition' } });
  }
});

// ============================================
// EXHIBITORS API
// ============================================

app.get('/api/exhibitions/:id/booths', async (req: Request, res: Response) => {
  try {
    const data = await proxy('exhibitor', `/api/exhibitions/${req.params.id}/booths`, 'GET', null, res);
    if (data) res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch booths' } });
  }
});

app.get('/api/exhibitions/:exhId/booths/:boothId', async (req: Request, res: Response) => {
  try {
    const data = await proxy('exhibitor', `/api/exhibitions/${req.params.exhId}/booths/${req.params.boothId}`, 'GET', null, res);
    if (data) res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch booth' } });
  }
});

// Leads
app.get('/api/leads', async (req: Request, res: Response) => {
  try {
    const data = await proxy('exhibitor', '/api/leads', 'GET', null, res);
    if (data) res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch leads' } });
  }
});

app.post('/api/leads', async (req: Request, res: Response) => {
  try {
    const data = await proxy('exhibitor', '/api/leads', 'POST', req.body, res);
    if (data) res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to create lead' } });
  }
});

// ============================================
// ATTENDEES API
// ============================================

app.post('/api/exhibitions/:id/register', async (req: Request, res: Response) => {
  try {
    const data = await proxy('attendee', `/api/exhibitions/${req.params.id}/register`, 'POST', req.body, res);
    if (data) res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to register' } });
  }
});

app.get('/api/tickets', async (req: Request, res: Response) => {
  try {
    const data = await proxy('attendee', '/api/tickets', 'GET', null, res);
    if (data) res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch tickets' } });
  }
});

app.post('/api/exhibitions/:id/checkin', async (req: Request, res: Response) => {
  try {
    const data = await proxy('attendee', `/api/exhibitions/${req.params.id}/checkin`, 'POST', req.body, res);
    if (data) res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to check in' } });
  }
});

// ============================================
// TWINS API
// ============================================

app.get('/api/twins/:type', async (req: Request, res: Response) => {
  try {
    const data = await proxy('twin', `/api/twins/${req.params.type}`, 'GET', null, res);
    if (data) res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch twin' } });
  }
});

app.get('/api/twins/exhibition/:id', async (req: Request, res: Response) => {
  try {
    const data = await proxy('twin', `/api/twins/exhibition/${req.params.id}`, 'GET', null, res);
    if (data) res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch twin' } });
  }
});

// ============================================
// BADGES API
// ============================================

app.post('/api/badges/scan', async (req: Request, res: Response) => {
  try {
    const data = await proxy('badge', '/api/badges/scan', 'POST', req.body, res);
    if (data) res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to scan badge' } });
  }
});

app.get('/api/badges/:id', async (req: Request, res: Response) => {
  try {
    const data = await proxy('badge', `/api/badges/${req.params.id}`, 'GET', null, res);
    if (data) res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch badge' } });
  }
});

// ============================================
// ANALYTICS API
// ============================================

app.get('/api/analytics/dashboard/:exhibitionId', async (req: Request, res: Response) => {
  try {
    const data = await proxy('analytics', `/api/analytics/dashboard/${req.params.exhibitionId}`, 'GET', null, res);
    if (data) res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch analytics' } });
  }
});

app.get('/api/heatmap/:exhibitionId', async (req: Request, res: Response) => {
  try {
    const data = await proxy('analytics', `/api/heatmap/${req.params.exhibitionId}`, 'GET', null, res);
    if (data) res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch heatmap' } });
  }
});

// ============================================
// PAYMENTS API
// ============================================

app.post('/api/payments/intent', async (req: Request, res: Response) => {
  try {
    const data = await proxy('payment', '/api/payments/intent', 'POST', req.body, res);
    if (data) res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to create payment' } });
  }
});

app.post('/api/payments/:id/confirm', async (req: Request, res: Response) => {
  try {
    const data = await proxy('payment', `/api/payments/${req.params.id}/confirm`, 'POST', req.body, res);
    if (data) res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to confirm payment' } });
  }
});

// ============================================
// AI / INTELLIGENCE API
// ============================================

app.get('/api/genie/exhibitions/:id/briefing', async (req: Request, res: Response) => {
  try {
    const data = await proxy('intelligence', `/api/genie/exhibitions/${req.params.id}/briefing`, 'GET', null, res);
    if (data) res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch briefing' } });
  }
});

app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const data = await proxy('intelligence', '/api/chat', 'POST', req.body, res);
    if (data) res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to process chat' } });
  }
});

// ============================================
// COINS / ECONOMY API
// ============================================

app.get('/api/coins/:attendeeId/:exhibitionId', async (req: Request, res: Response) => {
  try {
    const data = await proxy('economy', `/api/coins/${req.params.attendeeId}/${req.params.exhibitionId}`, 'GET', null, res);
    if (data) res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch balance' } });
  }
});

app.post('/api/coins/earn', async (req: Request, res: Response) => {
  try {
    const data = await proxy('economy', '/api/coins/earn', 'POST', req.body, res);
    if (data) res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to earn coins' } });
  }
});

// ============================================
// SESSIONS API
// ============================================

app.get('/api/exhibitions/:id/sessions', async (req: Request, res: Response) => {
  try {
    const data = await proxy('organizer', `/api/exhibitions/${req.params.id}/sessions`, 'GET', null, res);
    if (data) res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch sessions' } });
  }
});

app.post('/api/sessions/:id/register', async (req: Request, res: Response) => {
  try {
    const data = await proxy('organizer', `/api/sessions/${req.params.id}/register`, 'POST', req.body, res);
    if (data) res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to register for session' } });
  }
});

// ============================================
// APPOINTMENTS API
// ============================================

app.get('/api/appointments', async (req: Request, res: Response) => {
  try {
    const data = await proxy('appointment', '/api/appointments', 'GET', null, res);
    if (data) res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch appointments' } });
  }
});

app.post('/api/appointments', async (req: Request, res: Response) => {
  try {
    const data = await proxy('appointment', '/api/appointments', 'POST', req.body, res);
    if (data) res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to create appointment' } });
  }
});

// ============================================
// NETWORKING API
// ============================================

app.get('/api/connections/:exhibitionId', async (req: Request, res: Response) => {
  try {
    const data = await proxy('networking', `/api/connections/${req.params.exhibitionId}`, 'GET', null, res);
    if (data) res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch connections' } });
  }
});

app.post('/api/connections', async (req: Request, res: Response) => {
  try {
    const data = await proxy('networking', '/api/connections', 'POST', req.body, res);
    if (data) res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to create connection' } });
  }
});

// ============================================
// PASSPORT / MISSIONS API
// ============================================

app.get('/api/passport/:attendeeId/:exhibitionId', async (req: Request, res: Response) => {
  try {
    const data = await proxy('passport', `/api/passport/${req.params.attendeeId}/${req.params.exhibitionId}`, 'GET', null, res);
    if (data) res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch passport' } });
  }
});

app.post('/api/progress/record', async (req: Request, res: Response) => {
  try {
    const data = await proxy('passport', '/api/progress/record', 'POST', req.body, res);
    if (data) res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to record progress' } });
  }
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Gateway Error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'GATEWAY_ERROR',
      message: err.message,
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
});

// ============================================
// START
// ============================================

app.listen(PORT, () => {
  console.log(`✅ Exhibition OS Gateway running on port ${PORT}`);
  console.log(`   Services: ${Object.keys(SERVICES).length} configured`);
});

export default app;
