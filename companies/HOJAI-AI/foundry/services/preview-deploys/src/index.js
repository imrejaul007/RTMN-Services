/**
 * HOJAI Studio - Preview Deploys Service
 * Shareable preview URLs for every change
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 4744;
app.use(express.json());

const previews = new Map(); // previewId -> preview data
const builds = []; // build history

// REST API - Create Preview
app.post('/api/previews', (req, res) => {
  const { projectId, branch, commitSha, commitMessage, pullRequestId, appName } = req.body;
  const id = uuidv4().slice(0, 8);
  const preview = {
    id,
    projectId,
    branch,
    commitSha: commitSha?.slice(0, 7),
    commitMessage,
    pullRequestId,
    appName: appName || `preview-${id}`,
    url: `https://${id}.preview.hojai.app`,
    status: 'building',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    deployments: []
  };
  previews.set(id, preview);

  // Simulate build process
  simulateBuild(preview);

  res.json(preview);
});

// REST API - Get Preview
app.get('/api/previews/:id', (req, res) => {
  const preview = previews.get(req.params.id);
  if (!preview) return res.status(404).json({ error: 'Preview not found' });
  res.json(preview);
});

// REST API - List Previews
app.get('/api/previews', (req, res) => {
  const { projectId, status } = req.query;
  let list = Array.from(previews.values());
  if (projectId) list = list.filter(p => p.projectId === projectId);
  if (status) list = list.filter(p => p.status === status);
  res.json(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

// REST API - Update Preview Status
app.patch('/api/previews/:id', (req, res) => {
  const preview = previews.get(req.params.id);
  if (!preview) return res.status(404).json({ error: 'Preview not found' });
  Object.assign(preview, req.body);
  res.json(preview);
});

// REST API - Delete Preview
app.delete('/api/previews/:id', (req, res) => {
  if (!previews.has(req.params.id)) return res.status(404).json({ error: 'Preview not found' });
  previews.delete(req.params.id);
  res.json({ deleted: true });
});

// REST API - Add Comment
app.post('/api/previews/:id/comments', (req, res) => {
  const preview = previews.get(req.params.id);
  if (!preview) return res.status(404).json({ error: 'Preview not found' });
  const { userId, userName, text, x, y, screenshot } = req.body;
  const comment = {
    id: uuidv4(),
    userId, userName, text, x, y, screenshot,
    resolved: false,
    createdAt: new Date().toISOString()
  };
  preview.comments = preview.comments || [];
  preview.comments.push(comment);
  res.json(comment);
});

// REST API - Get Comments
app.get('/api/previews/:id/comments', (req, res) => {
  const preview = previews.get(req.params.id);
  if (!preview) return res.status(404).json({ error: 'Preview not found' });
  res.json(preview.comments || []);
});

// REST API - Compare Previews
app.get('/api/previews/:id/compare/:otherId', (req, res) => {
  const preview1 = previews.get(req.params.id);
  const preview2 = previews.get(req.params.otherId);
  if (!preview1 || !preview2) return res.status(404).json({ error: 'Preview not found' });

  res.json({
    previews: [preview1, preview2],
    comparison: {
      branch: preview1.branch !== preview2.branch,
      commitDiff: preview1.commitSha !== preview2.commitSha
    }
  });
});

// REST API - Deployments
app.get('/api/previews/:id/deployments', (req, res) => {
  const preview = previews.get(req.params.id);
  if (!preview) return res.status(404).json({ error: 'Preview not found' });
  res.json(preview.deployments || []);
});

app.post('/api/previews/:id/deploy', (req, res) => {
  const preview = previews.get(req.params.id);
  if (!preview) return res.status(404).json({ error: 'Preview not found' });

  const deployment = {
    id: uuidv4(),
    previewId: preview.id,
    status: 'building',
    createdAt: new Date().toISOString()
  };
  preview.deployments = preview.deployments || [];
  preview.deployments.push(deployment);

  // Simulate redeploy
  setTimeout(() => {
    deployment.status = 'ready';
    deployment.readyAt = new Date().toISOString();
  }, 2000);

  res.json(deployment);
});

// REST API - Share
app.get('/api/previews/:id/share', (req, res) => {
  const preview = previews.get(req.params.id);
  if (!preview) return res.status(404).json({ error: 'Preview not found' });

  res.json({
    url: preview.url,
    embedCode: `<iframe src="${preview.url}" width="100%" height="600" />`,
    markdown: `[Preview](${preview.url})`,
    twitter: `Check out this preview: ${preview.url}`
  });
});

// REST API - Builds
app.get('/api/builds', (req, res) => {
  const { projectId, limit = 50 } = req.query;
  let list = builds;
  if (projectId) list = list.filter(b => b.projectId === projectId);
  res.json(list.slice(-parseInt(limit)));
});

function simulateBuild(preview) {
  preview.status = 'building';
  preview.buildStartedAt = new Date().toISOString();

  setTimeout(() => {
    preview.status = 'ready';
    preview.buildCompletedAt = new Date().toISOString();
    preview.buildDuration = Math.round((new Date() - new Date(preview.buildStartedAt)) / 1000);

    const deployment = {
      id: uuidv4(),
      status: 'ready',
      url: preview.url,
      readyAt: new Date().toISOString()
    };
    preview.deployments = [deployment];
  }, 3000 + Math.random() * 2000);

  builds.push({
    id: uuidv4(),
    projectId: preview.projectId,
    previewId: preview.id,
    branch: preview.branch,
    status: 'building',
    createdAt: new Date().toISOString()
  });
}

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'preview-deploys', previews: previews.size }));
app.listen(PORT, () => console.log(`Preview Deploys running on port ${PORT}`));
