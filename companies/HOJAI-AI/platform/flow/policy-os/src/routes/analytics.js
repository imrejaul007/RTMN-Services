/**
 * PolicyOS — Analytics & Audit Routes
 *
 * Analytics: per-policy metrics, time-series, denial reasons.
 * Audit: event log, JSONL export.
 */

export function registerAnalyticsRoutes(app, {
  evalMetrics,
  customAuth,
}) {

  app.get('/api/analytics/overview', customAuth, async (req, res) => {
    const all = Array.from(evalMetrics.values());
    const totalEvaluations = all.reduce((s, m) => s + (m.total || 0), 0);
    const totalAllows = all.reduce((s, m) => s + (m.allows || 0), 0);
    const totalDenies = all.reduce((s, m) => s + (m.denies || 0), 0);
    res.json({
      policies: all.length,
      evaluations: totalEvaluations,
      allows: totalAllows,
      denies: totalDenies,
      allowRate: totalEvaluations ? Number((totalAllows / totalEvaluations).toFixed(4)) : 0,
    });
  });

  app.get('/api/analytics/policies/:id', customAuth, async (req, res) => {
    const m = await evalMetrics.get(req.params.id);
    if (!m) return res.status(404).json({ error: 'no metrics for this policy' });
    res.json(m);
  });

  app.get('/api/analytics/policies', customAuth, async (req, res) => {
    const all = Array.from(evalMetrics.values());
    const top = all
      .map((m) => ({
        policyId: m.policyId,
        total: m.total || 0,
        allows: m.allows || 0,
        denies: m.denies || 0,
        allowRate: m.total ? Number((m.allows / m.total).toFixed(4)) : 0,
        lastEvaluatedAt: m.lastEvaluatedAt || null,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 25);
    res.json({ count: top.length, policies: top });
  });

  app.get('/api/analytics/denial-reasons', customAuth, async (req, res) => {
    const all = Array.from(evalMetrics.values());
    const reasons = {};
    for (const m of all) {
      for (const [r, n] of Object.entries(m.byReason || {})) {
        reasons[r] = (reasons[r] || 0) + n;
      }
    }
    const arr = Object.entries(reasons).map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count).slice(0, 20);
    res.json({ count: arr.length, reasons: arr });
  });

  app.get('/api/analytics/timeseries', customAuth, async (req, res) => {
    const days = Math.min(parseInt(req.query.days || '7', 10), 30);
    const all = Array.from(evalMetrics.values());
    const byDay = {};
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    for (const m of all) {
      for (const [d, n] of Object.entries(m.byDay || {})) {
        if (d >= cutoff) byDay[d] = (byDay[d] || 0) + n;
      }
    }
    const series = Object.keys(byDay).sort().map((d) => ({ day: d, evaluations: byDay[d] }));
    res.json({ days, series });
  });
}

export function registerAuditRoutes(app, { audit, customAuth }) {
  app.get('/api/audit', customAuth, (req, res) => {
    const { policyId, userId, action, type, from, to } = req.query;
    let result = audit.slice();
    if (policyId) result = result.filter((e) => e.policyId === policyId);
    if (userId) result = result.filter((e) => e.actor === userId);
    if (action) result = result.filter((e) => e.details && e.details.action === action);
    if (type) result = result.filter((e) => e.type === type);
    if (from) result = result.filter((e) => e.timestamp >= from);
    if (to) result = result.filter((e) => e.timestamp <= to);
    res.json({ count: result.length, entries: result });
  });

  app.get('/api/audit/export', customAuth, (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="policy-os-audit-${Date.now()}.json"`);
    res.send(JSON.stringify({ exportedAt: new Date().toISOString(), count: audit.length, entries: audit }, null, 2));
  });
}
