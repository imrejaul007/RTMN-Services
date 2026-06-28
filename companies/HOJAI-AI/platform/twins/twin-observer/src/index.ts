import { requireAuth } from '@rtmn/shared/auth';
/**
 * Twin Observer Service
 * Port: 4747
 *
 * Central observation service that captures events from various sources
 * and routes them to appropriate twin services for learning.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4747', 10);
const VERSION = '1.0.0';

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as any).requestId = req.headers['x-request-id'] as string || uuidv4();
  next();
});

morgan.token('request-id', (req: Request) => (req as any).requestId);
app.use(morgan(':request-id :method :url :status :response-time ms'));

// Types
interface ObservedEvent {
  id: string;
  employeeId: string;
  source: string;
  type: string;
  timestamp: string;
  data: any;
  processed: boolean;
}

interface Subscription {
  id: string;
  employeeId: string;
  twinId?: string;
  sources: string[];
  enabled: boolean;
}

// Storage
const events = new Map<string, ObservedEvent[]>();
const subscriptions = new Map<string, Subscription>();

// Twin service endpoints
const TWIN_SERVICES = {
  communication: process.env.COMMUNICATION_TWIN_URL || 'http://localhost:4743',
  workflow: process.env.WORKFLOW_TWIN_URL || 'http://localhost:4741',
  decision: process.env.DECISION_TWIN_URL || 'http://localhost:4742',
  relationship: process.env.RELATIONSHIP_TWIN_URL || 'http://localhost:4744',
  behavioral: process.env.BEHAVIORAL_TWIN_URL || 'http://localhost:4746',
  knowledge: process.env.KNOWLEDGE_TWIN_URL || 'http://localhost:4739',
  reputation: process.env.REPUTATION_TWIN_URL || 'http://localhost:4745',
};

function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${uuidv4().slice(0, 8)}`;
}

interface ApiError extends Error { statusCode?: number; code?: string; }
const errorHandler = (err: ApiError, _req: Request, res: Response, _next: NextFunction): void => {
  res.status(err.statusCode || 500).json({ success: false, error: { code: err.code || 'INTERNAL_ERROR', message: err.message } });
};

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'twin-observer', version: VERSION, timestamp: new Date().toISOString(), stats: { events: events.size, subscriptions: subscriptions.size } });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, service: 'twin-observer', timestamp: new Date().toISOString() });
});

/**
 * Subscribe to events for an employee
 */
app.post('/api/observer/subscribe',requireAuth,  (req: Request, res: Response) => {
  try {
    const { employeeId, twinId, sources } = req.body;

    if (!employeeId) {
      const err: ApiError = new Error('employeeId is required'); err.statusCode = 400; throw err;
    }

    const sub: Subscription = {
      id: generateId('sub'),
      employeeId,
      twinId,
      sources: sources || ['all'],
      enabled: true
    };

    subscriptions.set(sub.id, sub);
    res.status(201).json({ success: true, data: sub });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'SUB_ERROR', message: error.message } });
  }
});

/**
 * Get subscriptions for an employee
 */
app.get('/api/observer/subscriptions/:employeeId', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const empSubs = Array.from(subscriptions.values()).filter(s => s.employeeId === employeeId);

  res.json({ success: true, data: { subscriptions: empSubs, total: empSubs.length } });
});

/**
 * Ingest a single event
 */
app.post('/api/observer/events',requireAuth,  (req: Request, res: Response) => {
  try {
    const { employeeId, source, type, data } = req.body;

    if (!employeeId || !source) {
      const err: ApiError = new Error('employeeId and source are required'); err.statusCode = 400; throw err;
    }

    const event: ObservedEvent = {
      id: generateId('event'),
      employeeId,
      source,
      type: type || 'generic',
      timestamp: new Date().toISOString(),
      data: data || {},
      processed: false
    };

    const empEvents = events.get(employeeId) || [];
    empEvents.push(event);
    if (empEvents.length > 10000) empEvents.shift(); // Keep last 10k events
    events.set(employeeId, empEvents);

    // Route to appropriate twin
    routeToTwin(event);

    res.status(201).json({ success: true, data: { eventId: event.id, event } });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'INGEST_ERROR', message: error.message } });
  }
});

/**
 * Batch ingest events
 */
app.post('/api/observer/events/batch',requireAuth,  (req: Request, res: Response) => {
  try {
    const { events: eventList } = req.body;

    if (!Array.isArray(eventList)) {
      const err: ApiError = new Error('events must be an array'); err.statusCode = 400; throw err;
    }

    const created = [];
    for (const e of eventList) {
      const event: ObservedEvent = {
        id: generateId('event'),
        employeeId: e.employeeId,
        source: e.source,
        type: e.type || 'generic',
        timestamp: e.timestamp || new Date().toISOString(),
        data: e.data || {},
        processed: false
      };
      const empEvents = events.get(event.employeeId) || [];
      empEvents.push(event);
      events.set(event.employeeId, empEvents);
      routeToTwin(event);
      created.push(event);
    }

    res.status(201).json({ success: true, data: { created: created.length, events: created } });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'BATCH_ERROR', message: error.message } });
  }
});

/**
 * Route event to appropriate twin service
 */
async function routeToTwin(event: ObservedEvent) {
  try {
    let twinUrl = '';

    switch (event.source) {
      case 'email':
      case 'slack':
      case 'chat':
        twinUrl = TWIN_SERVICES.communication;
        break;
      case 'crm':
      case 'task':
      case 'workflow':
        twinUrl = TWIN_SERVICES.workflow;
        break;
      case 'approval':
      case 'decision':
        twinUrl = TWIN_SERVICES.decision;
        break;
      case 'calendar':
      case 'meeting':
        twinUrl = TWIN_SERVICES.relationship;
        break;
      case 'document':
      case 'code':
        twinUrl = TWIN_SERVICES.knowledge;
        break;
      default:
        // Route based on type
        if (event.type.includes('communicat')) twinUrl = TWIN_SERVICES.communication;
        else if (event.type.includes('workflow')) twinUrl = TWIN_SERVICES.workflow;
        else if (event.type.includes('decision')) twinUrl = TWIN_SERVICES.decision;
    }

    if (twinUrl) {
      // Fire and forget - don't wait for twin processing
      fetch(`${twinUrl}/api/twin/${event.employeeId}/${getTwinEndpoint(event.source)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event }),
      }).catch(() => {}); // Ignore errors
    }
  } catch (err) {
    console.error('[Observer] Failed to route event:', err);
  }
}

function getTwinEndpoint(source: string): string {
  const endpoints: Record<string, string> = {
    email: 'communication/style',
    slack: 'communication/tone',
    chat: 'communication/tone',
    crm: 'workflow/observe',
    task: 'workflow/observe',
    workflow: 'workflow/observe',
    approval: 'decision/capture',
    decision: 'decision/capture',
  };
  return endpoints[source] || 'workflow/observe';
}

/**
 * Get events for an employee
 */
app.get('/api/observer/events/:employeeId', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const { source, limit = 100 } = req.query;

  let empEvents = events.get(employeeId) || [];
  if (source) empEvents = empEvents.filter(e => e.source === source);

  res.json({ success: true, data: { events: empEvents.slice(-Number(limit)), total: empEvents.length } });
});

/**
 * Get observation stats
 */
app.get('/api/observer/stats/:employeeId', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const empEvents = events.get(employeeId) || [];

  const bySource: Record<string, number> = {};
  empEvents.forEach(e => { bySource[e.source] = (bySource[e.source] || 0) + 1; });

  res.json({
    success: true,
    data: {
      employeeId,
      totalEvents: empEvents.length,
      bySource,
      processedEvents: empEvents.filter(e => e.processed).length,
      pendingEvents: empEvents.filter(e => !e.processed).length
    }
  });
});

/**
 * Unsubscribe
 */
app.delete('/api/observer/subscribe/:subscriptionId',requireAuth,  (req: Request, res: Response) => {
  const { subscriptionId } = req.params;
  subscriptions.delete(subscriptionId);
  res.json({ success: true, data: { deleted: subscriptionId } });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
});

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║          Twin Observer Service - Started                    ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                              ║`);
  console.log(`║  Features: Event Ingestion, Routing, Subscriptions        ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝`);
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });

export default app;
