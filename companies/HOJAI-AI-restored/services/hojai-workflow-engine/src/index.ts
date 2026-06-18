import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

import { Workflow, IWorkflow } from './models/Workflow';
import { WorkflowInstance, IWorkflowInstance } from './models/WorkflowInstance';
import { workflowExecutor } from './executor';

dotenv.config();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

const app = express();
const PORT = process.env.PORT || 4886;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    service: 'hojai-workflow-engine',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/workflows', async (req: Request, res: Response) => {
  try {
    const { name, description, trigger, steps, variables, createdBy } = req.body;

    if (!name || !steps || !createdBy || !trigger) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const workflow = new Workflow({
      workflowId: `WF-${uuidv4().substring(0, 8).toUpperCase()}`,
      name,
      description,
      trigger,
      steps,
      variables: variables || {},
      createdBy,
    });

    await workflow.save();
    res.status(201).json(workflow);
  } catch (error: any) {
    logger.error('Error creating workflow:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/workflows', async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    const filter: any = {};

    if (status) filter.status = status;
    if (search) {
      filter.$text = { $search: search as string };
    }

    const workflows = await Workflow.find(filter).sort({ createdAt: -1 });
    res.json(workflows);
  } catch (error: any) {
    logger.error('Error fetching workflows:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/workflows/:workflowId', async (req: Request, res: Response) => {
  try {
    const workflow = await Workflow.findOne({ workflowId: req.params.workflowId });
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(workflow);
  } catch (error: any) {
    logger.error('Error fetching workflow:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/workflows/:workflowId', async (req: Request, res: Response) => {
  try {
    const workflow = await Workflow.findOneAndUpdate(
      { workflowId: req.params.workflowId },
      { $set: req.body },
      { new: true }
    );
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(workflow);
  } catch (error: any) {
    logger.error('Error updating workflow:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/workflows/:workflowId', async (req: Request, res: Response) => {
  try {
    const workflow = await Workflow.findOneAndDelete({ workflowId: req.params.workflowId });
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json({ message: 'Workflow deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting workflow:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/workflows/:workflowId/activate', async (req: Request, res: Response) => {
  try {
    const workflow = await Workflow.findOneAndUpdate(
      { workflowId: req.params.workflowId },
      { $set: { status: 'active' } },
      { new: true }
    );
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(workflow);
  } catch (error: any) {
    logger.error('Error activating workflow:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/workflows/:workflowId/pause', async (req: Request, res: Response) => {
  try {
    const workflow = await Workflow.findOneAndUpdate(
      { workflowId: req.params.workflowId },
      { $set: { status: 'paused' } },
      { new: true }
    );
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(workflow);
  } catch (error: any) {
    logger.error('Error pausing workflow:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/instances', async (req: Request, res: Response) => {
  try {
    const { workflowId, trigger, context } = req.body;

    if (!workflowId || !trigger) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const instance = await workflowExecutor.createInstance(workflowId, trigger, context);
    res.status(201).json(instance);
  } catch (error: any) {
    logger.error('Error creating instance:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/instances', async (req: Request, res: Response) => {
  try {
    const { status, workflowId, limit = 50 } = req.query;
    const filter: any = {};

    if (status) filter.status = status;
    if (workflowId) filter.workflowId = workflowId;

    const instances = await WorkflowInstance.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit));
    res.json(instances);
  } catch (error: any) {
    logger.error('Error fetching instances:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/instances/:instanceId', async (req: Request, res: Response) => {
  try {
    const instance = await WorkflowInstance.findOne({ instanceId: req.params.instanceId });
    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }
    res.json(instance);
  } catch (error: any) {
    logger.error('Error fetching instance:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/instances/:instanceId/execute', async (req: Request, res: Response) => {
  try {
    const instance = await workflowExecutor.executeInstance(req.params.instanceId);
    res.json(instance);
  } catch (error: any) {
    logger.error('Error executing instance:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/instances/:instanceId/pause', async (req: Request, res: Response) => {
  try {
    const instance = await workflowExecutor.pauseInstance(req.params.instanceId);
    res.json(instance);
  } catch (error: any) {
    logger.error('Error pausing instance:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/instances/:instanceId/resume', async (req: Request, res: Response) => {
  try {
    const instance = await workflowExecutor.resumeInstance(req.params.instanceId);
    res.json(instance);
  } catch (error: any) {
    logger.error('Error resuming instance:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/instances/:instanceId/cancel', async (req: Request, res: Response) => {
  try {
    const instance = await workflowExecutor.cancelInstance(req.params.instanceId);
    res.json(instance);
  } catch (error: any) {
    logger.error('Error cancelling instance:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/workflows/:workflowId/instances', async (req: Request, res: Response) => {
  try {
    const instances = await WorkflowInstance.find({ workflowId: req.params.workflowId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(instances);
  } catch (error: any) {
    logger.error('Error fetching workflow instances:', error);
    res.status(500).json({ error: error.message });
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const startServer = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-workflow-engine';
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    app.listen(PORT, () => {
      logger.info(`HOJAI Workflow Engine running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
