import { requireAuth } from '@rtmn/shared/auth';
/**
 * Browser Agent Runtime Service
 * Port: 4751
 *
 * Browser automation for legacy software without APIs.
 * Uses Playwright-style automation to interact with any web interface.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4751', 10);
const VERSION = '1.0.0';

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as any).requestId = req.headers['x-request-id'] as string || uuidv4();
  next();
});

morgan.token('request-id', (req: Request) => (req as any).requestId);
app.use(morgan(':request-id :method :url :status :response-time ms'));

// Types
interface BrowserSession {
  id: string;
  employeeId: string;
  twinId?: string;
  status: 'active' | 'paused' | 'closed';
  startedAt: string;
  actions: BrowserAction[];
}

interface BrowserAction {
  id: string;
  type: 'navigate' | 'click' | 'type' | 'extract' | 'wait' | 'screenshot' | 'scroll' | 'select';
  selector?: string;
  value?: string;
  result?: any;
  timestamp: string;
  duration?: number;
  success: boolean;
  error?: string;
}

interface BrowserTask {
  id: string;
  employeeId: string;
  description: string;
  target: string;
  steps: BrowserStep[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  createdAt: string;
}

interface BrowserStep {
  order: number;
  action: string;
  selector?: string;
  value?: string;
  timeout?: number;
}

// Storage
const sessions = new Map<string, BrowserSession>();
const tasks = new Map<string, BrowserTask>();

function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${uuidv4().slice(0, 8)}`;
}

interface ApiError extends Error { statusCode?: number; code?: string; }
const errorHandler = (err: ApiError, _req: Request, res: Response, _next: NextFunction): void => {
  res.status(err.statusCode || 500).json({ success: false, error: { code: err.code || 'INTERNAL_ERROR', message: err.message } });
};

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'browser-agent',
    version: VERSION,
    timestamp: new Date().toISOString(),
    stats: { sessions: sessions.size, tasks: tasks.size }
  });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, service: 'browser-agent', timestamp: new Date().toISOString() });
});

/**
 * Create a browser session
 */
app.post('/api/browser/sessions',requireAuth,  (req: Request, res: Response) => {
  try {
    const { employeeId, twinId } = req.body;

    if (!employeeId) {
      const err: ApiError = new Error('employeeId is required'); err.statusCode = 400; throw err;
    }

    const session: BrowserSession = {
      id: generateId('session'),
      employeeId,
      twinId,
      status: 'active',
      startedAt: new Date().toISOString(),
      actions: []
    };

    sessions.set(session.id, session);

    res.status(201).json({ success: true, data: { sessionId: session.id, session } });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'SESSION_ERROR', message: error.message } });
  }
});

/**
 * Get session
 */
app.get('/api/browser/sessions/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } });
  }

  res.json({ success: true, data: session });
});

/**
 * Execute action in session
 */
app.post('/api/browser/sessions/:sessionId/actions',requireAuth,  (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { type, selector, value, timeout = 5000 } = req.body;

    const session = sessions.get(sessionId);
    if (!session) {
      const err: ApiError = new Error('Session not found'); err.statusCode = 404; throw err;
    }

    const action: BrowserAction = {
      id: generateId('action'),
      type,
      selector,
      value,
      timestamp: new Date().toISOString(),
      success: true,
      // Note: In production, this would execute actual Playwright automation
      result: { executed: true, action, message: 'Action recorded (automation would execute here)' }
    };

    session.actions.push(action);

    res.json({ success: true, data: action });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'ACTION_ERROR', message: error.message } });
  }
});

/**
 * Create a task
 */
app.post('/api/browser/tasks',requireAuth,  (req: Request, res: Response) => {
  try {
    const { employeeId, description, target, steps } = req.body;

    if (!employeeId || !description) {
      const err: ApiError = new Error('employeeId and description are required'); err.statusCode = 400; throw err;
    }

    const task: BrowserTask = {
      id: generateId('task'),
      employeeId,
      description,
      target: target || '',
      steps: steps || [],
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    tasks.set(task.id, task);

    res.status(201).json({ success: true, data: { taskId: task.id, task } });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'TASK_ERROR', message: error.message } });
  }
});

/**
 * Get task
 */
app.get('/api/browser/tasks/:taskId', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const task = tasks.get(taskId);

  if (!task) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Task not found' } });
  }

  res.json({ success: true, data: task });
});

/**
 * Execute task
 */
app.post('/api/browser/tasks/:taskId/execute',requireAuth,  async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const task = tasks.get(taskId);

    if (!task) {
      const err: ApiError = new Error('Task not found'); err.statusCode = 404; throw err;
    }

    task.status = 'running';

    // In production, this would execute the steps using Playwright
    // For now, simulate execution
    const results = task.steps.map((step, i) => ({
      step: i + 1,
      action: step.action,
      selector: step.selector,
      result: { executed: true, message: `Would execute: ${step.action}` },
      success: true
    }));

    task.status = 'completed';
    task.result = { steps: results, completedAt: new Date().toISOString() };

    res.json({ success: true, data: task });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'EXECUTE_ERROR', message: error.message } });
  }
});

/**
 * Take screenshot
 */
app.post('/api/browser/sessions/:sessionId/screenshot',requireAuth,  (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
      const err: ApiError = new Error('Session not found'); err.statusCode = 404; throw err;
    }

    // In production, this would capture actual screenshot
    const screenshot = {
      id: generateId('screenshot'),
      sessionId,
      data: 'base64_screenshot_data_placeholder',
      timestamp: new Date().toISOString()
    };

    res.json({ success: true, data: screenshot });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'SCREENSHOT_ERROR', message: error.message } });
  }
});

/**
 * Describe page using vision
 */
app.post('/api/browser/vision/describe',requireAuth,  (req: Request, res: Response) => {
  try {
    const { image, question } = req.body;

    // In production, this would use GPT-4 Vision or Claude
    const description = {
      elements: [
        { type: 'button', text: 'Submit', confidence: 95 },
        { type: 'input', label: 'Email', confidence: 90 },
        { type: 'link', text: 'Forgot Password', confidence: 85 }
      ],
      layout: 'form',
      summary: 'Login form with email input, password input, and submit button'
    };

    res.json({ success: true, data: description });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'VISION_ERROR', message: error.message } });
  }
});

/**
 * Close session
 */
app.delete('/api/browser/sessions/:sessionId',requireAuth,  (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Session not found' } });
  }

  session.status = 'closed';
  res.json({ success: true, data: { sessionId, closed: true } });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
});

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║          Browser Agent Runtime - Started                    ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                              ║`);
  console.log(`║  Features: Browser Automation, Vision, Screenshots          ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝`);
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });

export default app;
