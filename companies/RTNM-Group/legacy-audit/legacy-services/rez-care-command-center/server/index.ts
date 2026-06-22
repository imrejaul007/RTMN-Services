/**
 * REZ Care Command Center - Socket.IO Server
 *
 * Real-time updates for the support agent dashboard.
 * Connects the Next.js frontend to the REZ Care service.
 */

import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import express, { Express } from 'express';
import axios from 'axios';

const PORT = process.env.SOCKET_PORT ? parseInt(process.env.SOCKET_PORT) : 3001;
const REZ_CARE_URL = process.env.REZ_CARE_URL || 'http://localhost:4058';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'rez-internal-token';

// ============================================
// SOCKET SERVER
// ============================================

const app: Express = express();
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://admin.rez.money']
      : ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ============================================
// SOCKET EVENT HANDLERS
// ============================================

interface TicketUpdate {
  ticketId: string;
  status: string;
  priority: string;
  assignedAgent?: string;
  message?: string;
  timestamp: string;
}

interface AgentStatus {
  agentId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  currentTicket?: string;
  ticketCount: number;
}

// Track connected agents and their subscriptions
const agentConnections = new Map<string, Set<string>>(); // agentId -> Set<room>
const ticketSubscriptions = new Map<string, Set<string>>(); // ticketId -> Set<socketId>

io.on('connection', (socket: Socket) => {
  logger.info([Socket] Client connected: ${socket.id}`);

  // ----------------------------------------
  // AUTHENTICATION
  // ----------------------------------------

  socket.on('authenticate', async (data: { agentId: string; token: string }) => {
    try {
      // Verify token with REZ Care
      const response = await axios.post(
        `${REZ_CARE_URL}/api/internal/agent/verify`,
        { agentId: data.agentId, token: data.token },
        { headers: { 'X-Internal-Token': INTERNAL_TOKEN } }
      );

      if (response.data.valid) {
        socket.data.agentId = data.agentId;
        socket.data.role = response.data.role;

        // Join agent-specific room
        socket.join(`agent:${data.agentId}`);

        // Track connection
        if (!agentConnections.has(data.agentId)) {
          agentConnections.set(data.agentId, new Set());
        }
        agentConnections.get(data.agentId)!.add(socket.id);

        socket.emit('authenticated', { success: true, role: response.data.role });
        logger.info([Socket] Agent authenticated: ${data.agentId}`);

        // Notify others that agent is online
        io.emit('agent:status', {
          agentId: data.agentId,
          status: 'online',
          socketCount: agentConnections.get(data.agentId)!.size,
        });
      } else {
        socket.emit('authenticated', { success: false, error: 'Invalid token' });
      }
    } catch (error) {
      socket.emit('authenticated', { success: false, error: 'Auth failed' });
    }
  });

  // ----------------------------------------
  // TICKET SUBSCRIPTIONS
  // ----------------------------------------

  socket.on('ticket:subscribe', (ticketId: string) => {
    socket.join(`ticket:${ticketId}`);

    if (!ticketSubscriptions.has(ticketId)) {
      ticketSubscriptions.set(ticketId, new Set());
    }
    ticketSubscriptions.get(ticketId)!.add(socket.id);

    logger.info([Socket] Socket ${socket.id} subscribed to ticket ${ticketId}`);
  });

  socket.on('ticket:unsubscribe', (ticketId: string) => {
    socket.leave(`ticket:${ticketId}`);
    ticketSubscriptions.get(ticketId)?.delete(socket.id);
  });

  // ----------------------------------------
  // REAL-TIME TICKET UPDATES
  // ----------------------------------------

  socket.on('ticket:update', async (data: TicketUpdate) => {
    try {
      // Forward to REZ Care for persistence
      await axios.post(
        `${REZ_CARE_URL}/api/internal/tickets/${data.ticketId}/update`,
        data,
        { headers: { 'X-Internal-Token': INTERNAL_TOKEN } }
      );

      // Broadcast to all subscribers
      io.to(`ticket:${data.ticketId}`).emit('ticket:updated', data);

      // Notify assigned agent
      if (data.assignedAgent) {
        io.to(`agent:${data.assignedAgent}`).emit('ticket:assigned', {
          ticketId: data.ticketId,
          status: data.status,
          priority: data.priority,
        });
      }

      logger.info([Socket] Ticket ${data.ticketId} updated`);
    } catch (error) {
      socket.emit('error', { message: 'Failed to update ticket' });
    }
  });

  // ----------------------------------------
  // AGENT STATUS
  // ----------------------------------------

  socket.on('agent:status', async (data: AgentStatus) => {
    const agentId = socket.data.agentId;
    if (!agentId) return;

    // Broadcast status change
    io.emit('agent:status', {
      ...data,
      agentId,
      timestamp: new Date().toISOString(),
    });

    // Update agent roster in REZ Care
    try {
      await axios.post(
        `${REZ_CARE_URL}/api/internal/agent/status`,
        { agentId, ...data },
        { headers: { 'X-Internal-Token': INTERNAL_TOKEN } }
      );
    } catch (error) {
      console.error('[Socket] Failed to update agent status in REZ Care');
    }
  });

  // ----------------------------------------
  // TYPING INDICATORS
  // ----------------------------------------

  socket.on('typing:start', (ticketId: string) => {
    socket.to(`ticket:${ticketId}`).emit('typing:start', {
      ticketId,
      agentId: socket.data.agentId,
    });
  });

  socket.on('typing:stop', (ticketId: string) => {
    socket.to(`ticket:${ticketId}`).emit('typing:stop', {
      ticketId,
      agentId: socket.data.agentId,
    });
  });

  // ----------------------------------------
  // LIVE METRICS
  // ----------------------------------------

  socket.on('metrics:request', async () => {
    try {
      const response = await axios.get(
        `${REZ_CARE_URL}/api/internal/metrics/live`,
        { headers: { 'X-Internal-Token': INTERNAL_TOKEN } }
      );
      socket.emit('metrics:update', response.data);
    } catch (error) {
      socket.emit('metrics:update', getDefaultMetrics());
    }
  });

  // ----------------------------------------
  // DISCONNECT
  // ----------------------------------------

  socket.on('disconnect', () => {
    const agentId = socket.data.agentId;
    logger.info([Socket] Client disconnected: ${socket.id}`);

    if (agentId) {
      const connections = agentConnections.get(agentId);
      if (connections) {
        connections.delete(socket.id);
        if (connections.size === 0) {
          // All connections for this agent are gone
          agentConnections.delete(agentId);
          io.emit('agent:status', {
            agentId,
            status: 'offline',
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // Clean up ticket subscriptions
    ticketSubscriptions.forEach((subscribers, ticketId) => {
      subscribers.delete(socket.id);
      if (subscribers.size === 0) {
        ticketSubscriptions.delete(ticketId);
      }
    });
  });
});

// ============================================
// DEFAULT METRICS (Fallback)
// ============================================

function getDefaultMetrics() {
  return {
    openTickets: 0,
    avgResponseTime: 0,
    csatScore: 0,
    activeAgents: 0,
    queueLength: 0,
    timestamp: new Date().toISOString(),
  };
}

// ============================================
// START SERVER
// ============================================

httpServer.listen(PORT, () => {
  logger.info(
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🎧  REZ CARE COMMAND CENTER - SOCKET SERVER              ║
║                                                              ║
║   Socket.IO running at: http://0.0.0.0:${PORT}                  ║
║   REZ Care backend: ${REZ_CARE_URL}          ║
║                                                              ║
║   Events:                                                    ║
║   • authenticate, ticket:subscribe, ticket:update           ║
║   • agent:status, typing:start/stop, metrics:request        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'rez-care-socket-server',
    connections: io.engine.clientsCount,
    agents: agentConnections.size,
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Socket] SIGTERM received, shutting down...');
  io.close();
  httpServer.close();
  process.exit(0);
});
