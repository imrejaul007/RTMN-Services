import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import { CrowdProfile } from './models/CrowdProfile';
import patternsRouter from './routes/patterns';
import insightsRouter from './routes/insights';
import { PatternDetector } from './services/patternDetector';
import { TrendAnalyzer } from './services/trendAnalyzer';
import { OutbreakDetector } from './services/outbreakDetector';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 4983;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Services
const patternDetector = new PatternDetector(logger);
const trendAnalyzer = new TrendAnalyzer(logger);
const outbreakDetector = new OutbreakDetector(logger);

// In-memory storage
const crowdProfiles = new Map<string, CrowdProfile>();
const anomalyAlerts: Array<{
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
}> = [];
const trendHistory: Array<{
  timestamp: Date;
  metrics: {
    totalCrowd: number;
    avgDensity: number;
    peakZones: string[];
    anomalyCount: number;
  };
}> = [];

// Request logging
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'crowd-intelligence',
    version: '1.0.0',
    uptime: process.uptime(),
    metrics: {
      activeProfiles: crowdProfiles.size,
      pendingAlerts: anomalyAlerts.filter(a => !a.resolved).length,
      trendDataPoints: trendHistory.length
    }
  });
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    service: 'crowd-intelligence',
    capabilities: [
      'pattern_detection',
      'trend_analysis',
      'outbreak_detection',
      'anomaly_alerts',
      'crowd_profiling'
    ],
    stats: {
      profilesTracked: crowdProfiles.size,
      activeAlerts: anomalyAlerts.filter(a => !a.resolved).length,
      trendsAnalyzed: trendHistory.length
    }
  });
});

// Crowd profile management
app.post('/api/profiles', (req, res) => {
  const { locationId, zoneId, density, timestamp, attributes } = req.body;

  if (!locationId || density === undefined) {
    return res.status(400).json({ error: 'locationId and density are required' });
  }

  const profile: CrowdProfile = {
    id: uuidv4(),
    locationId,
    zoneId: zoneId || 'default',
    density,
    timestamp: timestamp ? new Date(timestamp) : new Date(),
    attributes: attributes || {},
    activityLevel: density > 0.8 ? 'high' : density > 0.5 ? 'medium' : 'low',
    lastUpdated: new Date()
  };

  crowdProfiles.set(profile.id, profile);

  // Run detection services
  const anomalyResult = patternDetector.detectAnomaly(profile, Array.from(crowdProfiles.values()));
  if (anomalyResult.isAnomaly) {
    const alert = {
      id: uuidv4(),
      type: 'anomaly',
      severity: anomalyResult.severity,
      message: anomalyResult.message,
      timestamp: new Date(),
      resolved: false
    };
    anomalyAlerts.push(alert);
  }

  const outbreakResult = outbreakDetector.checkOutbreak(
    profile,
    Array.from(crowdProfiles.values())
  );
  if (outbreakResult.isOutbreak) {
    const alert = {
      id: uuidv4(),
      type: 'outbreak',
      severity: outbreakResult.severity,
      message: outbreakResult.message,
      timestamp: new Date(),
      resolved: false
    };
    anomalyAlerts.push(alert);
  }

  // Update trend history
  const currentMetrics = calculateCurrentMetrics();
  trendHistory.push({
    timestamp: new Date(),
    metrics: currentMetrics
  });

  // Keep only last 24 hours
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  trendHistory.splice(0, trendHistory.findIndex(t => t.timestamp.getTime() > cutoff));

  logger.info(`Crowd profile created: ${profile.id}`, { locationId, density });

  res.status(201).json({
    profile,
    anomaly: anomalyResult,
    outbreak: outbreakResult
  });
});

app.get('/api/profiles', (req, res) => {
  const { locationId, zoneId, limit } = req.query;
  let profiles = Array.from(crowdProfiles.values());

  if (locationId) {
    profiles = profiles.filter(p => p.locationId === locationId);
  }
  if (zoneId) {
    profiles = profiles.filter(p => p.zoneId === zoneId);
  }

  profiles.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const result = limit ? profiles.slice(0, parseInt(limit as string)) : profiles;

  res.json({ profiles: result, total: profiles.length });
});

app.get('/api/profiles/:id', (req, res) => {
  const profile = crowdProfiles.get(req.params.id);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  res.json(profile);
});

// Alerts management
app.get('/api/alerts', (req, res) => {
  const { type, severity, resolved } = req.query;
  let alerts = [...anomalyAlerts];

  if (type) {
    alerts = alerts.filter(a => a.type === type);
  }
  if (severity) {
    alerts = alerts.filter(a => a.severity === severity);
  }
  if (resolved !== undefined) {
    alerts = alerts.filter(a => a.resolved === (resolved === 'true'));
  }

  alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  res.json({
    alerts,
    summary: {
      total: alerts.length,
      active: alerts.filter(a => !a.resolved).length,
      byType: {
        anomaly: alerts.filter(a => a.type === 'anomaly').length,
        outbreak: alerts.filter(a => a.type === 'outbreak').length
      },
      bySeverity: {
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length
      }
    }
  });
});

app.patch('/api/alerts/:id', (req, res) => {
  const alert = anomalyAlerts.find(a => a.id === req.params.id);
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  if (req.body.resolved !== undefined) {
    alert.resolved = req.body.resolved;
    if (req.body.resolved) {
      alert.resolved = true;
      logger.info(`Alert resolved: ${alert.id}`);
    }
  }

  res.json(alert);
});

// Trends endpoint
app.get('/api/trends', (req, res) => {
  const { hours, interval } = req.query;
  const hoursNum = hours ? parseInt(hours as string) : 24;
  const cutoff = Date.now() - hoursNum * 60 * 60 * 1000;

  let trends = trendHistory.filter(t => t.timestamp.getTime() > cutoff);

  if (interval) {
    trends = trendAnalyzer.aggregateByInterval(trends, interval as string);
  }

  const analysis = trendAnalyzer.analyzeTrends(trends);

  res.json({
    trends,
    analysis: {
      ...analysis,
      period: {
        start: trends.length > 0 ? trends[0].timestamp : null,
        end: trends.length > 0 ? trends[trends.length - 1].timestamp : null,
        hours: hoursNum
      }
    }
  });
});

// Analytics endpoint
app.get('/api/analytics', (req, res) => {
  const profiles = Array.from(crowdProfiles.values());
  const currentMetrics = calculateCurrentMetrics();

  res.json({
    current: currentMetrics,
    patterns: patternDetector.getPatternSummary(profiles),
    alerts: {
      active: anomalyAlerts.filter(a => !a.resolved).length,
      critical: anomalyAlerts.filter(a => a.severity === 'critical' && !a.resolved).length
    },
    recommendations: generateRecommendations(currentMetrics, profiles)
  });
});

// Mount routers
app.use('/api/patterns', patternsRouter);
app.use('/api/insights', insightsRouter);

// Helper functions
function calculateCurrentMetrics() {
  const profiles = Array.from(crowdProfiles.values());
  const recentProfiles = profiles.filter(
    p => Date.now() - p.timestamp.getTime() < 300000 // Last 5 minutes
  );

  return {
    totalCrowd: recentProfiles.length,
    avgDensity: recentProfiles.length > 0
      ? recentProfiles.reduce((sum, p) => sum + p.density, 0) / recentProfiles.length
      : 0,
    peakZones: getPeakZones(recentProfiles),
    anomalyCount: anomalyAlerts.filter(a => !a.resolved).length
  };
}

function getPeakZones(profiles: CrowdProfile[]): string[] {
  const zoneDensity = new Map<string, { count: number; totalDensity: number }>();

  for (const profile of profiles) {
    const current = zoneDensity.get(profile.zoneId) || { count: 0, totalDensity: 0 };
    zoneDensity.set(profile.zoneId, {
      count: current.count + 1,
      totalDensity: current.totalDensity + profile.density
    });
  }

  return Array.from(zoneDensity.entries())
    .sort((a, b) => b[1].totalDensity - a[1].totalDensity)
    .slice(0, 5)
    .map(([zone]) => zone);
}

function generateRecommendations(metrics: any, profiles: CrowdProfile[]) {
  const recommendations: string[] = [];

  if (metrics.avgDensity > 0.8) {
    recommendations.push({
      priority: 'high',
      action: 'Consider crowd分流 to reduce congestion',
      reason: 'Average density exceeds 80%'
    });
  }

  if (metrics.anomalyCount > 5) {
    recommendations.push({
      priority: 'high',
      action: 'Review active anomalies for potential safety concerns',
      reason: 'Multiple anomalies detected'
    });
  }

  if (metrics.peakZones.length > 0) {
    recommendations.push({
      priority: 'medium',
      action: `Focus resources on zones: ${metrics.peakZones.join(', ')}`,
      reason: 'These zones have highest crowd density'
    });
  }

  return recommendations;
}

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
server.listen(PORT, () => {
  logger.info(`Crowd Intelligence Service started on port ${PORT}`);
  logger.info('Capabilities: Pattern Detection, Trend Analysis, Outbreak Detection');
});

export { app, server, logger };