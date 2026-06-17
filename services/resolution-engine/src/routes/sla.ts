import { Router, Request, Response } from 'express';
import { resolutionStore } from '../models/Resolution';

const router = Router();

// Get SLA dashboard
router.get('/dashboard', (req: Request, res: Response) => {
  const resolutions = Array.from(resolutionStore.values());
  const now = new Date();

  const activeResolutions = resolutions.filter(r =>
    !['resolved', 'closed'].includes(r.status)
  );

  const slaMetrics = {
    total: activeResolutions.length,
    atRisk: 0,
    breached: 0,
    healthy: 0,
    byPriority: {
      critical: { total: 0, breached: 0, atRisk: 0 },
      high: { total: 0, breached: 0, atRisk: 0 },
      medium: { total: 0, breached: 0, atRisk: 0 },
      low: { total: 0, breached: 0, atRisk: 0 }
    }
  };

  activeResolutions.forEach(r => {
    const slaDeadline = r.slaResolutionDeadline;
    const hoursRemaining = (slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (r.slaBreached) {
      slaMetrics.breached++;
      slaMetrics.byPriority[r.priority].breached++;
    } else if (hoursRemaining <= 0) {
      r.slaBreached = true;
      r.slaBreachTime = now;
      slaMetrics.breached++;
      slaMetrics.byPriority[r.priority].breached++;
    } else if (hoursRemaining <= r.slaConfig[r.priority as keyof typeof r.slaConfig] * 0.25) {
      slaMetrics.atRisk++;
      slaMetrics.byPriority[r.priority].atRisk++;
    } else {
      slaMetrics.healthy++;
    }

    slaMetrics.byPriority[r.priority].total++;
  });

  // Get top SLA breaches
  const topBreaches = activeResolutions
    .filter(r => r.slaBreached)
    .sort((a, b) => {
      const aBreach = a.slaBreachTime?.getTime() || 0;
      const bBreach = b.slaBreachTime?.getTime() || 0;
      return bBreach - aBreach;
    })
    .slice(0, 10)
    .map(r => ({
      id: r.id,
      ticketId: r.ticketId,
      title: r.title,
      priority: r.priority,
      breachedAt: r.slaBreachTime,
      hoursBreached: r.slaBreachTime
        ? Math.round((now.getTime() - r.slaBreachTime.getTime()) / (1000 * 60 * 60) * 10) / 10
        : 0
    }));

  res.json({ metrics: slaMetrics, topBreaches });
});

// Get SLA status for a resolution
router.get('/:id/status', (req: Request, res: Response) => {
  const resolution = resolutionStore.get(req.params.id);
  if (!resolution) {
    return res.status(404).json({ error: 'Resolution not found' });
  }

  const now = new Date();
  const slaDeadline = resolution.slaResolutionDeadline;
  const responseDeadline = resolution.slaResponseDeadline;

  const status = {
    resolutionId: resolution.id,
    ticketId: resolution.ticketId,
    priority: resolution.priority,
    status: resolution.status,
    slaBreached: resolution.slaBreached,
    response: {
      deadline: responseDeadline,
      remaining: Math.max(0, responseDeadline.getTime() - now.getTime()),
      remainingHours: Math.max(0, Math.round((responseDeadline.getTime() - now.getTime()) / (1000 * 60 * 60) * 10) / 10),
      breached: now > responseDeadline && !['resolved', 'closed', 'auto_resolved'].includes(resolution.status)
    },
    resolution: {
      deadline: slaDeadline,
      remaining: Math.max(0, slaDeadline.getTime() - now.getTime()),
      remainingHours: Math.max(0, Math.round((slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60) * 10) / 10),
      breached: resolution.slaBreached
    },
    breachTime: resolution.slaBreachTime,
    resolutionTime: resolution.resolvedAt
      ? Math.round((resolution.resolvedAt.getTime() - resolution.createdAt.getTime()) / (1000 * 60 * 60) * 10) / 10
      : null
  };

  res.json(status);
});

// Update SLA configuration
router.patch('/config', (req: Request, res: Response) => {
  const { slaConfig } = req.body;

  if (!slaConfig) {
    return res.status(400).json({ error: 'slaConfig is required' });
  }

  // Update SLA config for all resolutions (this would typically be done differently in production)
  const resolutions = Array.from(resolutionStore.values());
  const now = new Date();

  resolutions.forEach(r => {
    if (!['resolved', 'closed'].includes(r.status)) {
      r.slaConfig = { ...r.slaConfig, ...slaConfig };
      const slaHours = r.slaConfig[r.priority as keyof typeof r.slaConfig] || 24;
      r.slaResolutionDeadline = new Date(r.createdAt.getTime() + slaHours * 60 * 60 * 1000);
    }
  });

  res.json({ message: 'SLA config updated', config: slaConfig });
});

// Get SLA reports
router.get('/reports', (req: Request, res: Response) => {
  const { startDate, endDate, priority } = req.query;
  const resolutions = Array.from(resolutionStore.values());

  let filtered = resolutions.filter(r => r.resolvedAt);

  if (startDate) {
    const start = new Date(startDate as string);
    filtered = filtered.filter(r => new Date(r.createdAt) >= start);
  }
  if (endDate) {
    const end = new Date(endDate as string);
    filtered = filtered.filter(r => new Date(r.createdAt) <= end);
  }
  if (priority) {
    filtered = filtered.filter(r => r.priority === priority);
  }

  // Calculate metrics
  const totalResolved = filtered.length;
  const slaBreached = filtered.filter(r => r.slaBreached).length;
  const avgResolutionTime = totalResolved > 0
    ? filtered.reduce((sum, r) => {
        const time = r.resolvedAt
          ? new Date(r.resolvedAt).getTime() - new Date(r.createdAt).getTime()
          : 0;
        return sum + time;
      }, 0) / totalResolved / (1000 * 60 * 60)
    : 0;

  const byPriority = {
    critical: { total: 0, breached: 0, avgTime: 0 },
    high: { total: 0, breached: 0, avgTime: 0 },
    medium: { total: 0, breached: 0, avgTime: 0 },
    low: { total: 0, breached: 0, avgTime: 0 }
  };

  ['critical', 'high', 'medium', 'low'].forEach(p => {
    const pResolutions = filtered.filter(r => r.priority === p);
    byPriority[p as keyof typeof byPriority].total = pResolutions.length;
    byPriority[p as keyof typeof byPriority].breached = pResolutions.filter(r => r.slaBreached).length;
    if (pResolutions.length > 0) {
      byPriority[p as keyof typeof byPriority].avgTime = pResolutions.reduce((sum, r) => {
        const time = r.resolvedAt
          ? new Date(r.resolvedAt).getTime() - new Date(r.createdAt).getTime()
          : 0;
        return sum + time;
      }, 0) / pResolutions.length / (1000 * 60 * 60);
    }
  });

  res.json({
    report: {
      period: { startDate, endDate },
      totalResolved,
      slaBreachRate: totalResolved > 0 ? Math.round(slaBreached / totalResolved * 10000) / 100 : 0,
      avgResolutionTimeHours: Math.round(avgResolutionTime * 10) / 10,
      byPriority
    }
  });
});

export default router;
