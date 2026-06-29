import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4997;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Audit log
const auditLog = [];

// Log a trust decision
function logDecision(decision) {
  const entry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    ...decision
  };
  auditLog.push(entry);
  return entry;
}

// Query audit log
function queryLog(filters = {}) {
  let results = [...auditLog];

  if (filters.entityId) {
    results = results.filter(e => e.entityId === filters.entityId);
  }
  if (filters.action) {
    results = results.filter(e => e.action === filters.action);
  }
  if (filters.trustScore !== undefined) {
    results = results.filter(e => e.trustScore >= filters.trustScore);
  }
  if (filters.startDate) {
    results = results.filter(e => new Date(e.timestamp) >= new Date(filters.startDate));
  }
  if (filters.endDate) {
    results = results.filter(e => new Date(e.timestamp) <= new Date(filters.endDate));
  }

  return results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// POST /audit/log - Log a trust decision
app.post('/audit/log', (req, res) => {
  const { entityId, action, trustScore, details, metadata } = req.body;

  if (!entityId || !action) {
    return res.status(400).json({ error: 'entityId and action are required' });
  }

  const entry = logDecision({ entityId, action, trustScore, details, metadata });

  res.json({ success: true, entry });
});

// POST /audit/log/batch - Batch log
app.post('/audit/log/batch', (req, res) => {
  const { decisions } = req.body;

  if (!decisions || !Array.isArray(decisions)) {
    return res.status(400).json({ error: 'Decisions array is required' });
  }

  const entries = decisions.map(d => logDecision(d));

  res.json({ success: true, entries, count: entries.length });
});

// GET /audit/query - Query audit log
app.get('/audit/query', (req, res) => {
  const { entityId, action, trustScore, startDate, endDate, limit } = req.query;

  const filters = {
    entityId,
    action,
    trustScore: trustScore ? parseFloat(trustScore) : undefined,
    startDate,
    endDate
  };

  const results = queryLog(filters);

  res.json({
    results: results.slice(0, parseInt(limit) || 100),
    total: results.length
  });
});

// GET /audit/entity/:id - Get entity audit history
app.get('/audit/entity/:id', (req, res) => {
  const { id } = req.params;
  const { action, limit } = req.query;

  const filters = { entityId: id };
  if (action) filters.action = action;

  const results = queryLog(filters);

  res.json({
    entityId: id,
    entries: results.slice(0, parseInt(limit) || 50),
    total: results.length
  });
});

// GET /audit/summary - Get audit summary
app.get('/audit/summary', (req, res) => {
  const actionCounts = {};
  let totalTrust = 0;
  let trustEntries = 0;

  for (const entry of auditLog) {
    actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
    if (entry.trustScore !== undefined) {
      totalTrust += entry.trustScore;
      trustEntries++;
    }
  }

  res.json({
    totalEntries: auditLog.length,
    actionCounts,
    avgTrustScore: trustEntries > 0 ? totalTrust / trustEntries : null,
    latestEntry: auditLog[auditLog.length - 1]?.timestamp
  });
});

// GET /audit/export - Export audit log
app.get('/audit/export', (req, res) => {
  const { format, startDate, endDate } = req.query;

  const filters = { startDate, endDate };
  const results = queryLog(filters);

  if (format === 'csv') {
    const headers = 'id,timestamp,entityId,action,trustScore\n';
    const rows = results.map(e =>
      `${e.id},${e.timestamp},${e.entityId},${e.action},${e.trustScore || ''}`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment.csv');
    return res.send(headers + rows);
  }

  res.json({ entries: results });
});

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'trust-audit-trail', port: PORT, entries: auditLog.length });
});

app.listen(PORT, () => {
  console.log(`Trust Audit Trail running on port ${PORT}`);
});

export default app;
