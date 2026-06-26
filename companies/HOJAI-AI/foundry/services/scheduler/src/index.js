/**
 * HOJAI Studio - Scheduler Service
 * Background job processing
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 4774;
app.use(express.json());

const jobs = new Map(); // jobId -> job
const schedules = []; // cron jobs
const executions = []; // job runs

// REST API - Create Job
app.post('/api/jobs', (req, res) => {
  const { projectId, name, type = 'once', config, handler } = req.body;
  const job = {
    id: uuidv4(),
    projectId,
    name,
    type, // once, recurring, cron
    config: config || {},
    handler,
    status: 'pending',
    nextRun: config?.scheduledAt || null,
    createdAt: new Date().toISOString()
  };
  jobs.set(job.id, job);
  res.json(job);
});

// REST API - Schedule Recurring Job
app.post('/api/schedules', (req, res) => {
  const { projectId, name, cron, handler, enabled = true } = req.body;
  const schedule = {
    id: uuidv4(),
    projectId,
    name,
    cron,
    handler,
    enabled,
    lastRun: null,
    nextRun: calculateNextRun(cron),
    createdAt: new Date().toISOString()
  };
  schedules.push(schedule);
  res.json(schedule);
});

// REST API - Trigger Job
app.post('/api/jobs/:id/trigger', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const execId = uuidv4();
  const execution = {
    id: execId,
    jobId: job.id,
    projectId: job.projectId,
    status: 'running',
    startedAt: new Date().toISOString(),
    result: null
  };
  executions.push(execution);
  jobs.set(job.id, { ...job, lastRun: new Date().toISOString() });

  // Simulate execution
  setTimeout(() => {
    execution.status = 'completed';
    execution.completedAt = new Date().toISOString();
    execution.result = { success: true };
  }, 1000 + Math.random() * 2000);

  res.json({ executionId: execId, status: 'running' });
});

// REST API - Get Job Status
app.get('/api/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

// REST API - List Jobs
app.get('/api/jobs', (req, res) => {
  const { projectId, status } = req.query;
  let list = Array.from(jobs.values());
  if (projectId) list = list.filter(j => j.projectId === projectId);
  if (status) list = list.filter(j => j.status === status);
  res.json(list);
});

// REST API - List Schedules
app.get('/api/schedules', (req, res) => {
  const { projectId, enabled } = req.query;
  let list = schedules;
  if (projectId) list = list.filter(s => s.projectId === projectId);
  if (enabled !== undefined) list = list.filter(s => s.enabled === (enabled === 'true'));
  res.json(list);
});

// REST API - Toggle Schedule
app.post('/api/schedules/:id/toggle', (req, res) => {
  const schedule = schedules.find(s => s.id === req.params.id);
  if (!schedule) return res.status(404).json({ error: 'Not found' });
  schedule.enabled = !schedule.enabled;
  res.json(schedule);
});

// REST API - Execution History
app.get('/api/executions', (req, res) => {
  const { jobId, status, limit = 100 } = req.query;
  let list = executions;
  if (jobId) list = list.filter(e => e.jobId === jobId);
  if (status) list = list.filter(e => e.status === status);
  res.json(list.slice(-parseInt(limit)));
});

// REST API - Delete Job
app.delete('/api/jobs/:id', (req, res) => {
  if (!jobs.has(req.params.id)) return res.status(404).json({ error: 'Job not found' });
  jobs.delete(req.params.id);
  res.json({ deleted: true });
});

function calculateNextRun(cron) {
  // Simplified - in production use cron-parser
  const parts = cron.split(' ');
  const next = new Date();
  if (parts[0] === '*' && parts[1] === '*') next.setMinutes(next.getMinutes() + 1);
  else if (parts[0] !== '*') next.setMinutes(parseInt(parts[0]));
  return next.toISOString();
}

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'scheduler', jobs: jobs.size, schedules: schedules.length }));
app.listen(PORT, () => console.log(`Scheduler running on port ${PORT}`));
