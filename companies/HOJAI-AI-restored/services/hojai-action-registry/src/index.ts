import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

import { Action, IAction, ActionCategory } from './models/Action';
import { ActionLog, IActionLog, getActionStats } from './models/ActionLog';

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
const PORT = process.env.PORT || 4887;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    service: 'hojai-action-registry',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/actions', async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      category,
      parameters,
      returnType,
      handler,
      config,
      rateLimit,
      requiredPermissions,
      tags,
      createdBy,
    } = req.body;

    if (!name || !description || !handler || !createdBy) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const action = new Action({
      actionId: `ACT-${uuidv4().substring(0, 8).toUpperCase()}`,
      name,
      description,
      category: category || 'custom',
      parameters: parameters || [],
      returnType: returnType || 'object',
      handler,
      config: config || {},
      rateLimit,
      requiredPermissions: requiredPermissions || [],
      tags: tags || [],
      createdBy,
    });

    await action.save();
    logger.info(`Action registered: ${action.actionId} - ${action.name}`);
    res.status(201).json(action);
  } catch (error: any) {
    logger.error('Error creating action:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/actions', async (req: Request, res: Response) => {
  try {
    const { category, status, search, tags } = req.query;
    const filter: any = {};

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) {
      filter.$text = { $search: search as string };
    }
    if (tags) {
      filter.tags = { $in: (tags as string).split(',') };
    }

    const actions = await Action.find(filter).sort({ usageCount: -1, name: 1 });
    res.json(actions);
  } catch (error: any) {
    logger.error('Error fetching actions:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/actions/categories', (_req: Request, res: Response) => {
  const categories: ActionCategory[] = [
    'data',
    'communication',
    'computation',
    'integration',
    'automation',
    'analysis',
    'custom',
  ];
  res.json(categories);
});

app.get('/api/actions/:actionId', async (req: Request, res: Response) => {
  try {
    const action = await Action.findOne({ actionId: req.params.actionId });
    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }
    res.json(action);
  } catch (error: any) {
    logger.error('Error fetching action:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/actions/:actionId', async (req: Request, res: Response) => {
  try {
    const { version, ...updates } = req.body;

    const action = await Action.findOneAndUpdate(
      { actionId: req.params.actionId },
      { $set: { ...updates, version: version || undefined } },
      { new: true }
    );

    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }
    res.json(action);
  } catch (error: any) {
    logger.error('Error updating action:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/actions/:actionId', async (req: Request, res: Response) => {
  try {
    const action = await Action.findOneAndDelete({ actionId: req.params.actionId });
    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }
    res.json({ message: 'Action deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting action:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/actions/:actionId/deprecate', async (req: Request, res: Response) => {
  try {
    const action = await Action.findOneAndUpdate(
      { actionId: req.params.actionId },
      { $set: { status: 'deprecated' } },
      { new: true }
    );
    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }
    res.json(action);
  } catch (error: any) {
    logger.error('Error deprecating action:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/actions/:actionId/execute', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { actionId } = req.params;
    const { input, agentId, agentName, workflowId, workflowInstanceId, mode = 'sync', metadata = {} } = req.body;

    const action = await Action.findOne({ actionId });
    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }

    if (action.status === 'deprecated') {
      return res.status(400).json({ error: 'Action is deprecated' });
    }

    const validationError = validateInput(input, action.parameters);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    let output: any;
    let status: 'success' | 'failure' | 'partial' = 'success';
    let error: string | undefined;

    try {
      output = await executeActionHandler(action.handler, { ...input, ...action.config });
    } catch (execError: any) {
      status = 'failure';
      error = execError.message;
      output = undefined;
    }

    await Action.updateOne({ actionId }, { $inc: { usageCount: 1 } });

    const duration = Date.now() - startTime;

    const log = new ActionLog({
      logId: `LOG-${uuidv4().substring(0, 8).toUpperCase()}`,
      actionId,
      actionName: action.name,
      agentId,
      agentName,
      workflowId,
      workflowInstanceId,
      status,
      mode,
      input,
      output,
      error,
      duration,
      metadata,
    });

    await log.save();

    res.json({
      success: status === 'success',
      status,
      output,
      error,
      logId: log.logId,
      duration,
    });
  } catch (error: any) {
    logger.error('Error executing action:', error);
    res.status(500).json({ error: error.message });
  }
});

function validateInput(input: any, parameters: any[]): string | null {
  if (!parameters || parameters.length === 0) return null;

  for (const param of parameters) {
    if (param.required && (input === undefined || input[param.name] === undefined)) {
      return `Missing required parameter: ${param.name}`;
    }

    if (input && input[param.name] !== undefined) {
      const value = input[param.name];
      const expectedType = param.type;

      if (expectedType === 'string' && typeof value !== 'string') {
        return `Parameter ${param.name} must be a string`;
      }
      if (expectedType === 'number' && typeof value !== 'number') {
        return `Parameter ${param.name} must be a number`;
      }
      if (expectedType === 'boolean' && typeof value !== 'boolean') {
        return `Parameter ${param.name} must be a boolean`;
      }
      if (expectedType === 'object' && typeof value !== 'object') {
        return `Parameter ${param.name} must be an object`;
      }
      if (expectedType === 'array' && !Array.isArray(value)) {
        return `Parameter ${param.name} must be an array`;
      }
    }
  }

  return null;
}

async function executeActionHandler(handler: string, params: any): Promise<any> {
  switch (handler) {
    case 'http-request':
      return await executeHttpRequest(params);
    case 'data-transform':
      return transformData(params);
    case 'send-notification':
      return sendNotification(params);
    case 'store-data':
      return storeData(params);
    case 'query-database':
      return queryDatabase(params);
    case 'calculate':
      return calculate(params);
    default:
      return { executed: true, handler, params };
  }
}

async function executeHttpRequest(params: any): Promise<any> {
  const { url, method = 'GET', headers = {}, body } = params;

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  return { status: response.status, data };
}

function transformData(params: any): any {
  const { data, mapping } = params;
  const result: any = {};

  for (const [target, source] of Object.entries(mapping || {})) {
    const keys = (source as string).split('.');
    let value = data;
    for (const key of keys) {
      value = value?.[key];
    }
    result[target] = value;
  }

  return result;
}

function sendNotification(params: any): any {
  const { channel, message, recipient } = params;
  logger.info(`Notification sent via ${channel} to ${recipient}: ${message}`);
  return { sent: true, channel, recipient, timestamp: new Date().toISOString() };
}

function storeData(params: any): any {
  const { key, value, storage = 'memory' } = params;
  logger.info(`Data stored: ${key} in ${storage}`);
  return { stored: true, key, storage };
}

function queryDatabase(params: any): any {
  const { collection, query, limit = 10 } = params;
  logger.info(`Querying ${collection}:`, query);
  return { collection, results: [], count: 0 };
}

function calculate(params: any): any {
  const { operation, operands } = params;

  switch (operation) {
    case 'add':
      return { result: operands.reduce((a: number, b: number) => a + b, 0) };
    case 'subtract':
      return { result: operands[0] - operands[1] };
    case 'multiply':
      return { result: operands.reduce((a: number, b: number) => a * b, 1) };
    case 'divide':
      return { result: operands[0] / operands[1] };
    default:
      return { result: null };
  }
}

app.get('/api/logs', async (req: Request, res: Response) => {
  try {
    const { actionId, agentId, workflowId, status, limit = 100, offset = 0 } = req.query;
    const filter: any = {};

    if (actionId) filter.actionId = actionId;
    if (agentId) filter.agentId = agentId;
    if (workflowId) filter.workflowId = workflowId;
    if (status) filter.status = status;

    const logs = await ActionLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit));

    const total = await ActionLog.countDocuments(filter);

    res.json({
      logs,
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error: any) {
    logger.error('Error fetching logs:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/logs/:logId', async (req: Request, res: Response) => {
  try {
    const log = await ActionLog.findOne({ logId: req.params.logId });
    if (!log) {
      return res.status(404).json({ error: 'Log not found' });
    }
    res.json(log);
  } catch (error: any) {
    logger.error('Error fetching log:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', async (req: Request, res: Response) => {
  try {
    const { actionId, startDate, endDate } = req.query;

    const stats = await getActionStats(
      actionId as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json(stats);
  } catch (error: any) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats/summary', async (_req: Request, res: Response) => {
  try {
    const totalActions = await Action.countDocuments({ status: { $ne: 'deprecated' } });
    const totalExecutions = await ActionLog.countDocuments({});

    const successRate = await ActionLog.aggregate([
      {
        $group: {
          _id: null,
          success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          total: { $sum: 1 },
        },
      },
    ]);

    const recentActivity = await ActionLog.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 7 },
    ]);

    res.json({
      totalActions,
      totalExecutions,
      successRate: successRate.length > 0
        ? ((successRate[0].success / successRate[0].total) * 100).toFixed(2)
        : '0',
      recentActivity,
    });
  } catch (error: any) {
    logger.error('Error fetching summary stats:', error);
    res.status(500).json({ error: error.message });
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const startServer = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-action-registry';
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    app.listen(PORT, () => {
      logger.info(`HOJAI Action Registry running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
