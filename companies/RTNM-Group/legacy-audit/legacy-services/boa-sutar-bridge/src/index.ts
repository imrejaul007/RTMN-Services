import express, { Express, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import axios from 'axios';
import { v4 as uuid } from 'uuid';

const app: Express = express();
const PORT = process.env.PORT || 4110;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/boa-sutar-bridge';
const BOA_URL = process.env.BOA_URL || 'http://localhost:4100';
const SUTAR_GOAL_URL = process.env.SUTAR_GOAL_URL || 'http://localhost:4242';
const SERVICE_NAME = 'boa-sutar-bridge';

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json({ limit: '10mb' }));

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', timestamp: new Date().toISOString() });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    await mongoose.connect(MONGODB_URI);
    res.json({ status: 'ready', mongodb: 'connected' });
  } catch {
    res.status(503).json({ status: 'not_ready', mongodb: 'disconnected' });
  }
});

// ============================================
// BRIDGE ENDPOINTS
// ============================================

/**
 * Receive goal from BOA and sync to SUTAR
 */
app.post('/bridge/goal', async (req: Request, res: Response) => {
  try {
    const { goalId, description, targetDate, budget } = req.body;

    console.log(`Syncing goal ${goalId} to SUTAR GoalOS...`);

    // Call SUTAR GoalOS
    const sutarResponse = await axios.post(`${SUTAR_GOAL_URL}/api/goals`, {
      title: description,
      description: `From BOA: ${goalId}`,
      type: 'strategic',
      deadline: targetDate,
      tenantId: req.headers['x-tenant-id']
    }, { timeout: 10000 });

    res.json({
      success: true,
      data: {
        boaGoalId: goalId,
        sutArGoalId: sutarResponse.data?.data?.goalId,
        synced: true,
        syncedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to sync goal:', error);
    res.status(500).json({ success: false, error: 'Failed to sync goal' });
  }
});

/**
 * Get execution status from SUTAR
 */
app.get('/bridge/status/:executionId', async (req: Request, res: Response) => {
  try {
    const { executionId } = req.params;

    // Get status from SUTAR
    const sutarResponse = await axios.get(`${SUTAR_GOAL_URL}/api/goals/${executionId}`, {
      timeout: 5000
    });

    res.json({
      success: true,
      data: {
        executionId,
        progress: sutarResponse.data?.data?.progress || 0,
        status: sutarResponse.data?.data?.status || 'unknown',
        lastSync: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to get status:', error);
    res.status(500).json({ success: false, error: 'Failed to get status' });
  }
});

/**
 * Receive outcome from SUTAR and report to BOA
 */
app.post('/bridge/outcome', async (req: Request, res: Response) => {
  try {
    const { goalId, success, metrics } = req.body;

    console.log(`Reporting outcome for ${goalId} to BOA...`);

    // Report to BOA
    await axios.post(`${BOA_URL}/api/goals/${goalId}/outcome`, {
      success,
      metrics,
      reportedAt: new Date().toISOString()
    }, { timeout: 10000 });

    res.json({
      success: true,
      data: {
        goalId,
        outcomeReported: true,
        reportedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to report outcome:', error);
    res.status(500).json({ success: false, error: 'Failed to report outcome' });
  }
});

/**
 * Sync progress updates
 */
app.post('/bridge/progress', async (req: Request, res: Response) => {
  try {
    const { goalId, progress, status } = req.body;

    // Update BOA with progress
    await axios.post(`${BOA_URL}/api/goals/${goalId}/progress`, {
      progress,
      status,
      updatedAt: new Date().toISOString()
    }, { timeout: 5000 });

    res.json({ success: true, data: { goalId, progressSynced: true } });
  } catch (error) {
    console.error('Failed to sync progress:', error);
    res.status(500).json({ success: false, error: 'Failed to sync progress' });
  }
});

// Service info
app.get('/api/info', (_req: Request, res: Response) => {
  res.json({
    service: SERVICE_NAME,
    version: '1.0.0',
    description: 'BOA-SUTAR Bridge - Goal sync between BOA OS and SUTAR OS',
    endpoints: {
      goal: '/bridge/goal',
      status: '/bridge/status/:executionId',
      outcome: '/bridge/outcome',
      progress: '/bridge/progress'
    }
  });
});

// Error handling
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: err.message });
});

// Start
mongoose.connect(MONGODB_URI).then(() => {
  app.listen(PORT, () => {
    console.log(`BOA-SUTAR Bridge running on port ${PORT}`);
  });
}).catch(err => {
  console.error('MongoDB connection failed:', err);
  process.exit(1);
});

export default app;
