import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import rateLimit from 'express-rate-limit';

import { inboxRoutes } from './routes';

const app = express();
const PORT = process.env.PORT || 4870;
const httpServer = createServer(app);

// Socket.IO for real-time
const io = new SocketIO(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true
  }
});

// ============ MIDDLEWARE ============

app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 900000,
  max: 100,
  message: { success: false, error: 'Too many requests' }
});
app.use('/api/', limiter);

// ============ HEALTH ============

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'hojai-unified-inbox',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

app.get('/health/ready', async (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'ready', mongodb: mongoStatus });
});

// ============ ROUTES ============

app.use('/api', inboxRoutes);

// ============ SOCKET.IO ============

// Agent presence
const agentSockets = new Map(); // agentId -> socketId

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Agent login
  socket.on('agent:login', ({ agentId, tenantId }) => {
    socket.join(`tenant:${tenantId}`);
    socket.join(`agent:${agentId}`);
    agentSockets.set(agentId, socket.id);
    socket.emit('agent:logged_in', { success: true });
    console.log(`Agent ${agentId} logged in`);
  });

  // Join conversation
  socket.on('conversation:join', ({ conversationId, tenantId }) => {
    socket.join(`conversation:${conversationId}`);
    socket.to(`conversation:${conversationId}`).emit('conversation:user_joined', {
      conversationId,
      socketId: socket.id
    });
  });

  // Leave conversation
  socket.on('conversation:leave', ({ conversationId }) => {
    socket.leave(`conversation:${conversationId}`);
  });

  // Typing indicator
  socket.on('typing:start', ({ conversationId, agentId }) => {
    socket.to(`conversation:${conversationId}`).emit('typing:started', { agentId });
  });

  socket.on('typing:stop', ({ conversationId, agentId }) => {
    socket.to(`conversation:${conversationId}`).emit('typing:stopped', { agentId });
  });

  // New message
  socket.on('message:new', (data) => {
    io.to(`conversation:${data.conversationId}`).emit('message:received', data);

    // Notify assigned agent
    if (data.agentId) {
      io.to(`agent:${data.agentId}`).emit('notification:new_message', {
        conversationId: data.conversationId
      });
    }
  });

  // Conversation assigned
  socket.on('conversation:assigned', (data) => {
    io.to(`conversation:${data.conversationId}`).emit('conversation:assigned', data);
    if (data.agentId) {
      io.to(`agent:${data.agentId}`).emit('notification:new_assignment', {
        conversationId: data.conversationId
      });
    }
  });

  // Agent status change
  socket.on('agent:status', ({ agentId, status }) => {
    io.emit('agent:status_changed', { agentId, status });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Clean up agent socket
    for (const [agentId, socketId] of agentSockets.entries()) {
      if (socketId === socket.id) {
        agentSockets.delete(agentId);
        break;
      }
    }
  });
});

// ============ ERROR HANDLING ============

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// ============ SERVER ============

async function startServer() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai_unified_inbox';
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    httpServer.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║          HOJAI UNIFIED INBOX - Contact Center         ║
╠════════════════════════════════════════════════════════════╣
║  Port:     ${PORT}                                          ║
║  WebSocket: ws://localhost:${PORT}                           ║
║  Health:   http://localhost:${PORT}/health                    ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await mongoose.connection.close();
  process.exit(0);
});

startServer();

export { io };
export default app;
