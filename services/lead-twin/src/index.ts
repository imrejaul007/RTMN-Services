import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import winston from 'winston';

// Import routes
import leadsRouter from './routes/leads';
import activitiesRouter from './routes/activities';
import enrichmentRouter from './routes/enrichment';

// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Initialize Express app
const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info({
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'lead-twin',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// API Routes
// Leads
app.use('/api/leads', leadsRouter);

// Activities (nested under leads)
app.use('/api/leads', activitiesRouter);

// Enrichment
app.use('/api/leads', enrichmentRouter);

// Get notes for a lead (separate route for notes)
app.get('/api/leads/:leadId/notes', async (req: Request, res: Response) => {
  try {
    const { Note } = await import('./models/Note');
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { leadId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const notes = await Note.find({
      tenantId,
      leadId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Note.countDocuments({
      tenantId,
      leadId,
      isDeleted: false,
    });

    res.json({
      success: true,
      data: notes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notes',
    });
  }
});

// Create note for a lead
app.post('/api/leads/:leadId/notes', async (req: Request, res: Response) => {
  try {
    const { Note } = await import('./models/Note');
    const { Lead } = await import('./models/Lead');
    const { v4: uuidv4 } = await import('uuid');

    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { leadId } = req.params;
    const { content, authorId, authorName, isPrivate, tags } = req.body;

    // Verify lead exists
    const lead = await Lead.findOne({
      tenantId,
      leadId,
      isDeleted: false,
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
      });
    }

    const note = new Note({
      tenantId,
      noteId: `NOTE-${uuidv4()}`,
      leadId,
      content,
      authorId,
      authorName,
      isPrivate: isPrivate || false,
      tags: tags || [],
    });

    await note.save();

    res.status(201).json({
      success: true,
      data: note,
    });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create note',
    });
  }
});

// Update note
app.put('/api/notes/:noteId', async (req: Request, res: Response) => {
  try {
    const { Note } = await import('./models/Note');
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { noteId } = req.params;
    const { content, tags } = req.body;

    const note = await Note.findOneAndUpdate(
      {
        tenantId,
        noteId,
        isDeleted: false,
      },
      {
        content,
        tags,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!note) {
      return res.status(404).json({
        success: false,
        error: 'Note not found',
      });
    }

    res.json({
      success: true,
      data: note,
    });
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update note',
    });
  }
});

// Delete note
app.delete('/api/notes/:noteId', async (req: Request, res: Response) => {
  try {
    const { Note } = await import('./models/Note');
    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const { noteId } = req.params;

    const note = await Note.findOneAndUpdate(
      {
        tenantId,
        noteId,
        isDeleted: false,
      },
      {
        isDeleted: true,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!note) {
      return res.status(404).json({
        success: false,
        error: 'Note not found',
      });
    }

    res.json({
      success: true,
      message: 'Note deleted successfully',
    });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete note',
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// Database connection
const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lead-twin';

  try {
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start server
const PORT = parseInt(process.env.PORT || '4908', 10);

const startServer = async (): Promise<void> => {
  await connectDB();

  app.listen(PORT, () => {
    logger.info(`Lead Twin service running on port ${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    logger.info(`API Base: http://localhost:${PORT}/api`);
  });
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
