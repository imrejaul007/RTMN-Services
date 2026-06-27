/**
 * HOJAI Deployment Pipeline API
 * Port: 4470
 * Git webhook handler + CI/CD pipeline
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const PORT = 4470;
const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

app.use(helmet(), cors(), express.json());

// Stores
const pipelines = new Map();
const builds = new Map();
const deployments = new Map();

const PipelineStatus = { IDLE: 'idle', BUILDING: 'building', DEPLOYING: 'deploying', SUCCESS: 'success', FAILED: 'failed' };

// Helper
function log(req, res, next) {
  const start = Date.now();
  res.on('finish', () => console.log(`${new Date().toISOString()} ${req.method} ${req.path} ${res.statusCode} ${Date.now()-start}ms`));
  next();
}
app.use(log);

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'deployment-pipeline', version: '1.0.0' }));
app.get('/api/v1', (_, res) => res.json({
  service: 'HOJAI Deployment Pipeline API', version: '1.0.0',
  endpoints: {
    pipelines: ['GET /api/v1/pipelines', 'POST /api/v1/pipelines', 'GET /api/v1/pipelines/:id', 'DELETE /api/v1/pipelines/:id'],
    builds: ['POST /api/v1/builds', 'GET /api/v1/builds', 'GET /api/v1/builds/:id'],
    deploy: ['POST /api/v1/deploy']
  }
}));

// Pipelines
app.get('/api/v1/pipelines', (req, res) => {
  const { orgId, repo } = req.query;
  let result = Array.from(pipelines.values());
  if (orgId) result = result.filter(p => p.orgId === orgId);
  if (repo) result = result.filter(p => p.repo === repo);
  res.json({ success: true, count: result.length, pipelines: result });
});

app.post('/api/v1/pipelines', requireInternal, (req, res) => {
  const { orgId, repo, branch = 'main', buildCommand = 'npm install && npm run build', deployOnSuccess = true } = req.body;
  if (!orgId || !repo) return res.status(400).json({ error: 'orgId and repo are required' });
  const id = uuidv4();
  const pipeline = { id, orgId, repo, branch, buildCommand, deployOnSuccess, status: PipelineStatus.IDLE, createdAt: new Date().toISOString() };
  pipelines.set(id, pipeline);
  res.status(201).json({ success: true, pipeline });
});

app.get('/api/v1/pipelines/:id', (req, res) => {
  const p = pipelines.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Pipeline not found' });
  res.json({ success: true, pipeline: p });
});

app.delete('/api/v1/pipelines/:id', requireInternal, (req, res) => {
  if (!pipelines.has(req.params.id)) return res.status(404).json({ error: 'Pipeline not found' });
  pipelines.delete(req.params.id);
  res.json({ success: true, message: 'Pipeline deleted' });
});

// Builds
app.post('/api/v1/builds', requireInternal, (req, res) => {
  const { pipelineId, commitSha, commitMessage, author, branch } = req.body;
  if (!pipelineId) return res.status(400).json({ error: 'pipelineId is required' });
  const pipeline = pipelines.get(pipelineId);
  if (!pipeline) return res.status(404).json({ error: 'Pipeline not found' });

  const id = uuidv4();
  const build = { id, pipelineId, commitSha, commitMessage, author, branch: branch || pipeline.branch, status: 'queued', logs: [], startedAt: null, finishedAt: null, createdAt: new Date().toISOString() };
  builds.set(id, build);
  pipeline.status = PipelineStatus.BUILDING;
  pipelines.set(pipelineId, pipeline);

  res.status(201).json({ success: true, build });
});

app.get('/api/v1/builds', (req, res) => {
  const { pipelineId, status } = req.query;
  let result = Array.from(builds.values());
  if (pipelineId) result = result.filter(b => b.pipelineId === pipelineId);
  if (status) result = result.filter(b => b.status === status);
  res.json({ success: true, count: result.length, builds: result.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)) });
});

app.get('/api/v1/builds/:id', (req, res) => {
  const b = builds.get(req.params.id);
  if (!b) return res.status(404).json({ error: 'Build not found' });
  res.json({ success: true, build: b });
});

// Webhook endpoint
app.post('/api/v1/webhooks/github', requireInternal, (req, res) => {
  const { action, pull_request, repository, commits } = req.body;
  // Find matching pipeline
  const repo = repository?.full_name;
  const pipeline = Array.from(pipelines.values()).find(p => p.repo === repo);
  if (!pipeline) return res.json({ message: 'No pipeline found for repo' });

  if (action === 'opened' || action === 'synchronize') {
    const pr = pull_request;
    // Create preview build
    const buildId = uuidv4();
    const build = { id: buildId, pipelineId: pipeline.id, type: 'preview', prNumber: pr?.number, prTitle: pr?.title, status: 'queued', branch: pr?.head?.ref, createdAt: new Date().toISOString() };
    builds.set(buildId, build);
    return res.json({ message: 'Preview build triggered', buildId });
  }

  if (action === 'closed' && pull_request?.merged) {
    // Merge to main - full deploy
    const buildId = uuidv4();
    const build = { id: buildId, pipelineId: pipeline.id, type: 'production', commitSha: commits?.[0]?.id, status: 'queued', branch: 'main', createdAt: new Date().toISOString() };
    builds.set(buildId, build);
    return res.json({ message: 'Production deploy triggered', buildId });
  }

  res.json({ message: 'Webhook processed' });
});

app.post('/api/v1/deploy', requireInternal, (req, res) => {
  const { buildId, environment = 'production' } = req.body;
  if (!buildId) return res.status(400).json({ error: 'buildId is required' });
  const build = builds.get(buildId);
  if (!build) return res.status(404).json({ error: 'Build not found' });

  const id = uuidv4();
  const deployment = { id, buildId, environment, status: 'deploying', url: `https://preview-${buildId.slice(0,8)}.hojai.app`, createdAt: new Date().toISOString() };
  deployments.set(id, deployment);

  build.status = 'deployed';
  builds.set(buildId, build);

  res.status(201).json({ success: true, deployment });
});

app.listen(PORT, () => console.log(`\n🎯 HOJAI Deployment Pipeline — PORT ${PORT}\n`));
export default app;
