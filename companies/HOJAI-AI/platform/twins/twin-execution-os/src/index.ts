import { requireAuth } from '@rtmn/shared/auth';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const PORT = parseInt(process.env.PORT || '4737', 10);
const REQUEST_ID_HEADER = 'x-request-id';

interface Task { id: string; employeeId: string; description: string; taskType: string; capability?: string; context: Record<string, any>; priority: number; status: string; confidence: number; autoApprove: boolean; requiresApproval: boolean; retryCount: number; maxRetries: number; scheduledFor?: string; createdAt: string; approvedAt?: string; rejectedAt?: string; cancelledAt?: string; completedAt?: string; rolledBackAt?: string; executionId?: string; result?: any; error?: string; rejectionReason?: string; }

const taskStore: Record<string, Task> = {};
let taskIdCounter = 1;

const SERVICES = { flowOrchestrator: process.env.FLOW_ORCHESTRATOR_URL || 'http://localhost:4244', twinLearningOS: process.env.TWIN_LEARNING_OS_URL || 'http://localhost:4735', twinFeedbackOS: process.env.TWIN_FEEDBACK_OS_URL || 'http://localhost:4736', decisionEngine: process.env.DECISION_ENGINE_URL || 'http://localhost:4240' };

const TOOL_PERMISSIONS: Record<string, { name: string; category: string; risk: string }> = { email: { name: 'Email', category: 'communication', risk: 'medium' }, chat: { name: 'Chat', category: 'communication', risk: 'low' }, calendar: { name: 'Calendar', category: 'communication', risk: 'low' }, sms: { name: 'SMS', category: 'communication', risk: 'medium' }, crm: { name: 'CRM', category: 'data', risk: 'medium' }, contacts: { name: 'Contacts', category: 'data', risk: 'low' }, approval: { name: 'Approvals', category: 'operations', risk: 'high' }, payment: { name: 'Payments', category: 'operations', risk: 'critical' }, refund: { name: 'Refunds', category: 'operations', risk: 'high' }, contract: { name: 'Contracts', category: 'operations', risk: 'high' }, task: { name: 'Task Management', category: 'workflow', risk: 'low' }, document: { name: 'Documents', category: 'workflow', risk: 'low' }, approval_workflow: { name: 'Approval Workflows', category: 'workflow', risk: 'medium' } };

const TASK_PRIORITY: Record<string, number> = { critical: 1, high: 2, normal: 3, low: 4 };
const TASK_STATUS = { pending: 'pending', approved: 'approved', rejected: 'rejected', executing: 'executing', completed: 'completed', failed: 'failed', rolled_back: 'rolled_back', cancelled: 'cancelled' };

const app = express();

app.use((req: Request, _res: Response, next: NextFunction) => { (req as any).requestId = req.headers[REQUEST_ID_HEADER] as string || uuidv4(); next(); });
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], scriptSrc: ["'self'"] } }, hsts: { maxAge: 31536000, includeSubDomains: true } }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
morgan.token('request-id', (req: Request) => (req as any).requestId);
app.use(morgan('combined', { skip: (req: Request) => req.url === '/health' || req.url === '/ready' }));

async function callService(service: keyof typeof SERVICES, path: string, options: RequestInit = {}): Promise<any> {
  const url = `${SERVICES[service]}${path}`;
  try { const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } }); return response.ok ? await response.json() : null; }
  catch (error: any) { console.error(`[Execution] Failed to call ${service}:`, error.message); return null; }
}

function getEmployeePermissions(employeeId: string): Record<string, boolean> { return { email: true, chat: true, calendar: true, crm: true, contacts: true, task: true, document: true, approval: false, payment: false, refund: false, contract: false, approval_workflow: false }; }

function getConfidenceThreshold(taskType: string): number {
  const tool = TOOL_PERMISSIONS[taskType];
  if (!tool) return 95;
  switch (tool.risk) { case 'critical': return 99; case 'high': return 95; case 'medium': return 85; case 'low': return 70; default: return 90; }
}

async function executeTask(task: Task): Promise<{ success: boolean; executionId?: string; result?: any; error?: string }> {
  console.log(`[Execution] Executing task ${task.id}: ${task.description}`);
  try {
    const result = await callService('flowOrchestrator', '/api/executions', { method: 'POST', body: JSON.stringify({ workflowType: task.taskType, input: task.context, metadata: { taskId: task.id, employeeId: task.employeeId, source: 'twin_execution' } }) });
    return { success: true, executionId: result?.executionId, result: result?.data };
  } catch (error: any) { return { success: false, error: error.message }; }
}

interface AppError extends Error { statusCode?: number; }
const errorHandler = (err: AppError, _req: Request, res: Response, _next: NextFunction): void => { console.error(`[Error] ${(_req as any).requestId}:`, { message: err.message }); res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Internal server error' }); };
app.use((_req: Request, res: Response) => { res.status(404).json({ success: false, error: 'Not found' }); });
app.use(errorHandler);

app.get('/health', (_req: Request, res: Response) => {
  const tasks = Object.values(taskStore);
  res.json({ status: 'healthy', service: 'twin-execution-os', version: '1.0.0', timestamp: new Date().toISOString(), stats: { pending: tasks.filter(t => t.status === 'pending').length, executing: tasks.filter(t => t.status === 'executing').length, completed: tasks.filter(t => t.status === 'completed').length, failed: tasks.filter(t => t.status === 'failed').length } });
});

app.get('/ready', (_req: Request, res: Response) => { res.json({ ready: true, service: 'twin-execution-os', timestamp: new Date().toISOString() }); });

app.post('/api/tasks',requireAuth,  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employeeId, description, taskType, capability, context, priority = 'normal', scheduledFor } = req.body;
    if (!employeeId || !description || !taskType) { const e: AppError = new Error('Missing required fields: employeeId, description, taskType'); e.statusCode = 400; throw e; }
    const twinContext = await callService('twinLearningOS', `/api/health/${employeeId}`);
    const confidence = twinContext?.data?.score || 50;
    const threshold = getConfidenceThreshold(taskType);
    const autoApprove = confidence >= threshold;
    const task: Task = { id: `task_${taskIdCounter++}`, employeeId, description, taskType, capability, context: context || {}, priority: TASK_PRIORITY[priority] || 3, status: autoApprove ? TASK_STATUS.approved : TASK_STATUS.pending, confidence, autoApprove, requiresApproval: !autoApprove, retryCount: 0, maxRetries: 3, scheduledFor, createdAt: new Date().toISOString(), approvedAt: autoApprove ? new Date().toISOString() : undefined };
    taskStore[task.id] = task;
    console.log(`[Execution] Task created: ${task.id} (${autoApprove ? 'auto-approved' : 'needs approval'})`);
    if (autoApprove) {
      task.status = TASK_STATUS.executing;
      const result = await executeTask(task);
      if (result.success) { task.status = TASK_STATUS.completed; task.executionId = result.executionId; task.result = result.result; task.completedAt = new Date().toISOString(); }
      else { task.status = TASK_STATUS.failed; task.error = result.error; }
    }
    res.status(201).json({ success: true, data: { taskId: task.id, status: task.status, autoApprove, confidence, threshold, requiresApproval: task.requiresApproval } });
  } catch (err) { next(err); }
});

app.get('/api/tasks/:taskId', (req: Request, res: Response) => {
  const task = taskStore[req.params.taskId];
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
  res.json({ success: true, data: task });
});

app.get('/api/queue/:employeeId', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const { status } = req.query;
  let tasks = Object.values(taskStore).filter(t => t.employeeId === employeeId).sort((a, b) => a.priority - b.priority || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  if (status) tasks = tasks.filter(t => t.status === status);
  res.json({ success: true, data: { employeeId, total: tasks.length, byStatus: { pending: tasks.filter(t => t.status === 'pending').length, approved: tasks.filter(t => t.status === 'approved').length, executing: tasks.filter(t => t.status === 'executing').length, completed: tasks.filter(t => t.status === 'completed').length, failed: tasks.filter(t => t.status === 'failed').length }, tasks } });
});

app.post('/api/tasks/:taskId/approve',requireAuth,  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = taskStore[req.params.taskId];
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
    if (task.status !== 'pending') return res.status(400).json({ success: false, error: `Task cannot be approved (current status: ${task.status})` });
    task.status = TASK_STATUS.approved; task.approvedAt = new Date().toISOString();
    task.status = TASK_STATUS.executing;
    const result = await executeTask(task);
    if (result.success) { task.status = TASK_STATUS.completed; task.executionId = result.executionId; task.result = result.result; task.completedAt = new Date().toISOString(); }
    else { task.status = TASK_STATUS.failed; task.error = result.error; }
    res.json({ success: true, data: { taskId: task.id, status: task.status, result: task.result, error: task.error } });
  } catch (err) { next(err); }
});

app.post('/api/tasks/:taskId/reject',requireAuth,  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = taskStore[req.params.taskId];
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
    const { reason } = req.body;
    task.status = TASK_STATUS.rejected; task.rejectedAt = new Date().toISOString(); task.rejectionReason = reason;
    await callService('twinFeedbackOS', '/api/feedback', { method: 'POST', body: JSON.stringify({ employeeId: task.employeeId, capability: task.capability, feedbackType: 'reject', twinAction: { id: task.id, description: task.description }, correction: { reason: reason || 'Task rejected' } }) });
    res.json({ success: true, data: { taskId: task.id, status: 'rejected', reason } });
  } catch (err) { next(err); }
});

app.post('/api/tasks/:taskId/cancel',requireAuth,  (req: Request, res: Response) => {
  const task = taskStore[req.params.taskId];
  if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
  if (['completed', 'failed', 'cancelled'].includes(task.status)) return res.status(400).json({ success: false, error: `Cannot cancel task (current status: ${task.status})` });
  task.status = TASK_STATUS.cancelled; task.cancelledAt = new Date().toISOString();
  res.json({ success: true, data: { taskId: task.id, status: 'cancelled' } });
});

app.post('/api/tasks/:taskId/retry',requireAuth,  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = taskStore[req.params.taskId];
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
    if (task.status !== 'failed') return res.status(400).json({ success: false, error: `Cannot retry task (current status: ${task.status})` });
    if (task.retryCount >= task.maxRetries) return res.status(400).json({ success: false, error: 'Max retries exceeded' });
    task.retryCount += 1; task.status = TASK_STATUS.pending;
    const result = await executeTask(task);
    if (result.success) { task.status = TASK_STATUS.completed; task.executionId = result.executionId; task.result = result.result; task.completedAt = new Date().toISOString(); }
    else { task.status = TASK_STATUS.failed; task.error = result.error; }
    res.json({ success: result.success, data: { taskId: task.id, status: task.status, retryCount: task.retryCount, result: task.result, error: task.error } });
  } catch (err) { next(err); }
});

app.post('/api/tasks/:taskId/rollback',requireAuth,  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = taskStore[req.params.taskId];
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
    if (task.status !== 'completed') return res.status(400).json({ success: false, error: `Cannot rollback task (current status: ${task.status})` });
    if (task.executionId) await callService('flowOrchestrator', `/api/executions/${task.executionId}/rollback`, { method: 'POST' });
    task.status = TASK_STATUS.rolled_back; task.rolledBackAt = new Date().toISOString();
    res.json({ success: true, data: { taskId: task.id, status: task.status, rolledBackAt: task.rolledBackAt } });
  } catch (err) { next(err); }
});

app.get('/api/history/:employeeId', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const { days = '7' } = req.query;
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - parseInt(days as string));
  const tasks = Object.values(taskStore).filter(t => t.employeeId === employeeId && new Date(t.createdAt) >= cutoff).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ success: true, data: { employeeId, period: `${days} days`, totalTasks: tasks.length, completed: tasks.filter(t => t.status === 'completed').length, failed: tasks.filter(t => t.status === 'failed').length, tasks } });
});

app.get('/api/permissions/:employeeId', (req: Request, res: Response) => {
  const permissions = getEmployeePermissions(req.params.employeeId);
  res.json({ success: true, data: { employeeId: req.params.employeeId, permissions, availableTools: Object.entries(TOOL_PERMISSIONS).map(([key, tool]) => ({ id: key, ...tool, allowed: permissions[key] || false })) } });
});

let server: any;
const gracefulShutdown = (signal: string) => { console.log(`\n[${signal}] Shutdown signal...`); if (server) { server.close(() => { console.log('[Execution] Server closed'); process.exit(0); }); setTimeout(() => { console.error('[Execution] Forced shutdown'); process.exit(1); }, 30000); } else process.exit(0); };
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

server = app.listen(PORT, () => { console.log(`\n╔═══════════════════════════════════════════════════════════════╗\n║              Twin Execution OS - Started                      ║\n╠═══════════════════════════════════════════════════════════════╣\n║  Port: ${PORT}                                              ║\n║  Features: Task Queue, Auto-Approve, Retry, Rollback         ║\n╚═══════════════════════════════════════════════════════════════╝`); });

export default app;
