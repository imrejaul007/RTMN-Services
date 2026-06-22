import { requireAuth } from '@rtmn/shared/auth';
/**
 * Customer Support Service - Tickets and live chat
 * Port: 5390
 *
 * Features:
 * - MongoDB-backed ticket management
 * - Real-time message tracking
 * - SLA monitoring
 * - Agent assignment
 * - Integration with Zendesk/Freshdesk/Intercom
 */

import express, { Request, Response } from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import crypto from 'crypto';

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet()); app.use(cors()); app.use(express.json());
const PORT = parseInt(process.env.PORT || '5390', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/support-service';

// ============================================================================
// TICKET MODEL
// ============================================================================

const TicketSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  type: { type: String, enum: ['campaign', 'billing', 'technical', 'general'], required: true },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['open', 'pending', 'resolved', 'closed'], default: 'open', index: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium', index: true },
  assignedTo: { type: String, index: true },
  messages: [{
    from: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
  }],
  sla: {
    firstResponseDue: Date,
    resolutionDue: Date
  },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const Ticket = mongoose.model('Ticket', TicketSchema);

// ============================================================================
// HEALTH ENDPOINTS
// ============================================================================

app.get('/health', (_, res: Response) => {
  res.json({ status: 'ok', service: 'customer-support-service', timestamp: new Date().toISOString() });
});

app.get('/ready', async (_: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'ready', mongodb: mongoStatus });
});

// ============================================================================
// TICKET ROUTES
// ============================================================================

// List tickets with filters
app.get('/api/tickets', async (req: Request, res: Response) => {
  try {
    const { status, priority, userId, assignedTo } = req.query;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (userId) filter.userId = userId;
    if (assignedTo) filter.assignedTo = assignedTo;

    const tickets = await Ticket.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: tickets });
  } catch (error) {
    logger.error('List tickets error:', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to fetch tickets' });
  }
});

// Get single ticket
app.get('/api/tickets/:id', async (req: Request, res: Response) => {
  try {
    const ticket = await Ticket.findOne({ ticketId: req.params.id });
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }
    res.json({ success: true, data: ticket });
  } catch (error) {
    logger.error('Get ticket error:', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to fetch ticket' });
  }
});

// Create ticket
app.post('/api/tickets',requireAuth,  async (req: Request, res: Response) => {
  try {
    const { userId, type, subject, description, priority, metadata } = req.body;

    if (!userId || !type || !subject || !description) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Calculate SLA based on priority
    const now = new Date();
    const sla = {
      firstResponseDue: new Date(now.getTime() + (priority === 'urgent' ? 1 : priority === 'high' ? 4 : 24) * 60 * 60 * 1000),
      resolutionDue: new Date(now.getTime() + (priority === 'urgent' ? 4 : priority === 'high' ? 24 : 72) * 60 * 60 * 1000)
    };

    const ticket = await Ticket.create({
      ticketId: `TKT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      userId,
      type,
      subject,
      description,
      priority: priority || 'medium',
      status: 'open',
      messages: [{ from: 'customer', message: description, timestamp: now }],
      sla,
      metadata
    });

    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    logger.error('Create ticket error:', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to create ticket' });
  }
});

// Update ticket
app.patch('/api/tickets/:id',requireAuth,  async (req: Request, res: Response) => {
  try {
    const { status, priority, assignedTo } = req.body;
    const update: Record<string, unknown> = {};

    if (status) update.status = status;
    if (priority) update.priority = priority;
    if (assignedTo !== undefined) update.assignedTo = assignedTo;

    const ticket = await Ticket.findOneAndUpdate(
      { ticketId: req.params.id },
      update,
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    res.json({ success: true, data: ticket });
  } catch (error) {
    logger.error('Update ticket error:', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to update ticket' });
  }
});

// Add message to ticket
app.post('/api/tickets/:id/messages',requireAuth,  async (req: Request, res: Response) => {
  try {
    const { from, message } = req.body;

    if (!from || !message) {
      return res.status(400).json({ success: false, error: 'Missing from or message' });
    }

    const ticket = await Ticket.findOneAndUpdate(
      { ticketId: req.params.id },
      { $push: { messages: { from, message, timestamp: new Date() } } },
      { new: true }
    );

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    res.json({ success: true, data: ticket });
  } catch (error) {
    logger.error('Add message error:', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to add message' });
  }
});

// Get SLA breach tickets
app.get('/api/tickets/sla/breach', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const breached = await Ticket.find({
      status: { $in: ['open', 'pending'] },
      $or: [
        { 'sla.firstResponseDue': { $lt: now } },
        { 'sla.resolutionDue': { $lt: now } }
      ]
    }).sort({ 'sla.resolutionDue': 1 });

    res.json({ success: true, data: breached, count: breached.length });
  } catch (error) {
    logger.error('SLA breach query error:', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to fetch SLA breaches' });
  }
});

// Get agent stats
app.get('/api/agents/:agentId/stats', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const stats = await Ticket.aggregate([
      { $match: { assignedTo: agentId } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgResponseTime: { $avg: '$metadata.avgResponseTimeMs' }
      }}
    ]);

    const result = {
      open: 0, pending: 0, resolved: 0, closed: 0,
      total: 0, avgResponseTimeMs: 0
    };

    for (const s of stats) {
      result[s._id as keyof typeof result] = s.count;
      result.total += s.count;
      if (s.avgResponseTime) result.avgResponseTimeMs = s.avgResponseTime;
    }

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Agent stats error:', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: 'Failed to fetch agent stats' });
  }
});

// ============================================================================
// STARTUP
// ============================================================================

async function start() {
  logger.info('[Customer Support] Starting service...');
  await mongoose.connect(MONGODB_URI);
  logger.info('[MongoDB] Connected');
  const server = app.listen(PORT, () => {
    logger.info(`[Customer Support] Running on port ${PORT}`);
  });
  installGracefulShutdown(server);
}

start().catch((err) => {
  logger.error('[Customer Support] Startup failed:', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});

export default app;
