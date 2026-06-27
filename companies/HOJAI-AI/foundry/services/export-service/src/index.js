/**
 * HOJAI Studio - Export Service
 * PDF and CSV generation
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

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
const PORT = 4780;
app.use(express.json());

const exports = new Map(); // exportId -> job
const templates = new Map();

// Default templates
templates.set('invoice', {
  name: 'Invoice',
  html: `<html><body><h1>Invoice #{{invoiceId}}</h1><p>Date: {{date}}</p><table><tr><td>{{item}}</td><td>₹{{amount}}</td></tr></table><p><strong>Total: ₹{{total}}</strong></p></body></html>`
});
templates.set('report', {
  name: 'Report',
  html: `<html><body><h1>{{title}}</h1><p>{{content}}</p></body></html>`
});

// REST API - Export to PDF
app.post('/api/export/pdf', requireInternal, (req, res) => {
  const { projectId, templateKey, data, filename } = req.body;
  const exportId = uuidv4();

  const job = {
    id: exportId,
    projectId,
    type: 'pdf',
    template: templateKey,
    status: 'processing',
    progress: 0,
    createdAt: new Date().toISOString()
  };
  exports.set(exportId, job);

  // Simulate PDF generation
  setTimeout(() => { job.progress = 100; job.status = 'completed'; job.downloadUrl = `/api/export/${exportId}/download`; }, 1000);

  res.json({ exportId, status: 'processing' });
});

// REST API - Export to CSV
app.post('/api/export/csv', requireInternal, (req, res) => {
  const { projectId, data, columns, filename } = req.body;
  const exportId = uuidv4();

  const job = {
    id: exportId,
    projectId,
    type: 'csv',
    rows: data?.length || 0,
    columns: columns || [],
    status: 'completed',
    downloadUrl: `/api/export/${exportId}/download`,
    createdAt: new Date().toISOString()
  };
  exports.set(exportId, job);

  res.json({ exportId, status: 'completed', downloadUrl: job.downloadUrl });
});

// REST API - Get Export Status
app.get('/api/export/:id', (req, res) => {
  const job = exports.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json(job);
});

// REST API - Download
app.get('/api/export/:id/download', (req, res) => {
  const job = exports.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  if (job.status !== 'completed') return res.status(400).json({ error: 'Export not ready' });

  if (job.type === 'csv') {
    const header = job.columns.join(',');
    const rows = (job.data || []).map(r => job.columns.map(c => r[c] || '').join(','));
    res.set('Content-Type', 'text/csv');
    res.send([header, ...rows].join('\n'));
  } else {
    res.set('Content-Type', 'text/html');
    res.send('<html><body><h1>PDF Generated</h1><p>This is a placeholder for actual PDF generation.</p></body></html>');
  }
});

// REST API - Templates
app.get('/api/templates', (req, res) => res.json(Array.from(templates.values())));

app.post('/api/templates', requireInternal, (req, res) => {
  const { key, name, html } = req.body;
  templates.set(key, { key, name, html });
  res.json({ key, name });
});

// REST API - Batch Export
app.post('/api/export/batch', requireInternal, (req, res) => {
  const { projectId, exports: exportJobs } = req.body;
  const batchId = uuidv4();

  const results = exportJobs.map(e => ({
    batchId,
    exportId: uuidv4(),
    type: e.type,
    status: 'queued'
  }));

  res.json({ batchId, total: results.length, exports: results });
});

// REST API - History
app.get('/api/exports', (req, res) => {
  const { projectId, status } = req.query;
  let list = Array.from(exports.values());
  if (projectId) list = list.filter(e => e.projectId === projectId);
  if (status) list = list.filter(e => e.status === status);
  res.json(list.slice(-100));
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'export-service', exports: exports.size }));
app.listen(PORT, () => console.log(`Export Service running on port ${PORT}`));
