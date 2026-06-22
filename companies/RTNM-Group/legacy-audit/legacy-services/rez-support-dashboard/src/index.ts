import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { config, logger } from './config/index.js';
import routes from './routes/index.js';

const app = express();
const httpServer = createServer(app);

// CORS - explicit origins only
const allowedOrigins = config.corsOrigin.split(',').filter(Boolean) || [];
const corsOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  if (!origin) return callback(null, true);
  if (!config.isProduction && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    return callback(null, true);
  }
  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }
  callback(new Error(`Origin ${origin} not allowed by CORS policy`));
};

const io = new SocketServer(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(helmet());
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);

// Socket.io for real-time updates
io.on('connection', (socket) => {
  logger.info('Client connected', { socketId: socket.id });

  socket.on('subscribe', (data: { channel?: string; agentId?: string }) => {
    if (data.channel) {
      socket.join(`channel:${data.channel}`);
    }
    if (data.agentId) {
      socket.join(`agent:${data.agentId}`);
    }
    logger.info('Client subscribed', { socketId: socket.id, ...data });
  });

  socket.on('unsubscribe', (data: { channel?: string; agentId?: string }) => {
    if (data.channel) {
      socket.leave(`channel:${data.channel}`);
    }
    if (data.agentId) {
      socket.leave(`agent:${data.agentId}`);
    }
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
  });
});

// Export io for use in services
export { io };

// Connect to MongoDB and start server
async function start() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    logger.info('Connected to MongoDB');

    httpServer.listen(config.PORT, () => {
      logger.info(`Support Dashboard running on port ${config.PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  try {
    // Close HTTP server
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    logger.info('HTTP server closed');

    // Close Socket.io
    io.close();
    logger.info('Socket.io closed');

    // Close MongoDB connection
    await mongoose.connection.close(false);
    logger.info('MongoDB connection closed');

    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

start();

export default app;
