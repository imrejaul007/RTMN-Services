/**
 * Exhibition Analytics Service
 * Port 5046
 *
 * Real-time Metrics, Heatmaps, ROI, Dashboards
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

dotenv.config();

const PORT = process.env.PORT || 5046;
const SERVICE_NAME = 'exhibition-analytics-service';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })],
});

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// ============================================
// DATA MODELS
// ============================================

interface ExhibitionMetrics {
  exhibition_id: string;
  total_visitors: number;
  current_inside: number;
  peak_visitors: number;
  peak_hour: string;
  total_checkins: number;
  total_checkouts: number;
  avg_time_spent_minutes: number;
  unique_booths_visited: number;
  leads_captured: number;
  sessions_attended: number;
  connections_made: number;
  coins_earned: number;
  conversions: number;
  nps_score?: number;
  last_updated: string;
}

interface BoothMetrics {
  booth_id: string;
  exhibitor_id: string;
  exhibition_id: string;
  zone_id: string;
  zone_name: string;
  booth_number: string;
  visitors_count: number;
  visitors_today: number;
  peak_hour: string;
  avg_dwell_time_seconds: number;
  leads_captured: number;
  hot_leads: number;
  demo_bookings: number;
  badge_scans: number;
  manual_entries: number;
  heatmap_value: number; // 0-100
  rank: number;
  last_updated: string;
}

interface ZoneMetrics {
  zone_id: string;
  zone_name: string;
  exhibition_id: string;
  visitors_count: number;
  current_density: number; // 0-100
  avg_dwell_time: number;
  booth_count: number;
  top_booth_ids: string[];
  last_updated: string;
}

interface SessionMetrics {
  session_id: string;
  exhibition_id: string;
  title: string;
  registered_count: number;
  attended_count: number;
  no_show_count: number;
  avg_rating?: number;
  capacity_utilization: number; // percentage
  last_updated: string;
}

// Stores
const exhibitionMetrics = new Map<string, ExhibitionMetrics>();
const boothMetrics = new Map<string, BoothMetrics>();
const zoneMetrics = new Map<string, ZoneMetrics>();
const sessionMetrics = new Map<string, SessionMetrics>();
const hourlyData = new Map<string, { hour: string; visitors: number; checkins: number; checkouts: number }[]>();

// ============================================
// HEALTH
// ============================================

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: {
      exhibitions_tracked: exhibitionMetrics.size,
      booths_tracked: boothMetrics.size,
      zones_tracked: zoneMetrics.size,
    },
  });
});

app.get('/health/live', (_req, res) => res.json({ status: 'alive' }));
app.get('/health/ready', (_req, res) => res.json({ status: 'ready' }));

// ============================================
// EXHIBITION METRICS
// ============================================

app.get('/api/exhibitions/:id/metrics', (req, res) => {
  const metrics = exhibitionMetrics.get(req.params.id);

  if (!metrics) {
    // Return default metrics
    return res.json({
      success: true,
      data: {
        exhibition_id: req.params.id,
        total_visitors: 0,
        current_inside: 0,
        peak_visitors: 0,
        peak_hour: '10:00',
        total_checkins: 0,
        total_checkouts: 0,
        avg_time_spent_minutes: 0,
        unique_booths_visited: 0,
        leads_captured: 0,
        sessions_attended: 0,
        connections_made: 0,
        coins_earned: 0,
        conversions: 0,
        last_updated: new Date().toISOString(),
      },
    });
  }

  res.json({ success: true, data: metrics });
});

app.post('/api/exhibitions/:id/metrics', (req, res) => {
  const metrics: ExhibitionMetrics = {
    exhibition_id: req.params.id,
    total_visitors: req.body.total_visitors || 0,
    current_inside: req.body.current_inside || 0,
    peak_visitors: req.body.peak_visitors || 0,
    peak_hour: req.body.peak_hour || '10:00',
    total_checkins: req.body.total_checkins || 0,
    total_checkouts: req.body.total_checkouts || 0,
    avg_time_spent_minutes: req.body.avg_time_spent_minutes || 0,
    unique_booths_visited: req.body.unique_booths_visited || 0,
    leads_captured: req.body.leads_captured || 0,
    sessions_attended: req.body.sessions_attended || 0,
    connections_made: req.body.connections_made || 0,
    coins_earned: req.body.coins_earned || 0,
    conversions: req.body.conversions || 0,
    nps_score: req.body.nps_score,
    last_updated: new Date().toISOString(),
  };

  exhibitionMetrics.set(req.params.id, metrics);
  res.status(201).json({ success: true, data: metrics });
});

app.patch('/api/exhibitions/:id/metrics', (req, res) => {
  const existing = exhibitionMetrics.get(req.params.id);
  const metrics = { ...existing, ...req.body, last_updated: new Date().toISOString() };
  exhibitionMetrics.set(req.params.id, metrics);
  res.json({ success: true, data: metrics });
});

// Record check-in
app.post('/api/exhibitions/:id/checkin', (req, res) => {
  let metrics = exhibitionMetrics.get(req.params.id);
  if (!metrics) {
    metrics = {
      exhibition_id: req.params.id,
      total_visitors: 0, current_inside: 0, peak_visitors: 0, peak_hour: '10:00',
      total_checkins: 0, total_checkouts: 0, avg_time_spent_minutes: 0,
      unique_booths_visited: 0, leads_captured: 0, sessions_attended: 0,
      connections_made: 0, coins_earned: 0, conversions: 0, last_updated: new Date().toISOString(),
    };
  }

  metrics.total_visitors++;
  metrics.current_inside++;
  metrics.total_checkins++;

  if (metrics.current_inside > metrics.peak_visitors) {
    metrics.peak_visitors = metrics.current_inside;
    metrics.peak_hour = new Date().toLocaleTimeString('en-US', { hour: '2-digit', hour12: false });
  }

  metrics.last_updated = new Date().toISOString();
  exhibitionMetrics.set(req.params.id, metrics);

  res.json({ success: true, data: metrics });
});

// Record check-out
app.post('/api/exhibitions/:id/checkout', (req, res) => {
  const metrics = exhibitionMetrics.get(req.params.id);
  if (!metrics) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Exhibition not found' } });

  if (metrics.current_inside > 0) metrics.current_inside--;
  metrics.total_checkouts++;
  metrics.last_updated = new Date().toISOString();

  exhibitionMetrics.set(req.params.id, metrics);
  res.json({ success: true, data: metrics });
});

// ============================================
// BOOTH METRICS
// ============================================

app.get('/api/booths/metrics', (req, res) => {
  const { exhibition_id, zone_id } = req.query;
  let results = Array.from(boothMetrics.values());

  if (exhibition_id) results = results.filter(b => b.exhibition_id === exhibition_id);
  if (zone_id) results = results.filter(b => b.zone_id === zone_id);

  // Sort by visitors
  results.sort((a, b) => b.visitors_count - a.visitors_count);

  // Assign ranks
  results.forEach((b, i) => b.rank = i + 1);

  res.json({ success: true, data: { booths: results, total: results.length } });
});

app.get('/api/booths/:boothId/metrics', (req, res) => {
  const metrics = boothMetrics.get(req.params.boothId);
  if (!metrics) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Booth not found' } });
  res.json({ success: true, data: metrics });
});

app.post('/api/booths/:boothId/metrics', (req, res) => {
  const metrics: BoothMetrics = {
    booth_id: req.params.boothId,
    exhibitor_id: req.body.exhibitor_id || '',
    exhibition_id: req.body.exhibition_id || '',
    zone_id: req.body.zone_id || '',
    zone_name: req.body.zone_name || '',
    booth_number: req.body.booth_number || '',
    visitors_count: req.body.visitors_count || 0,
    visitors_today: req.body.visitors_today || 0,
    peak_hour: req.body.peak_hour || '10:00',
    avg_dwell_time_seconds: req.body.avg_dwell_time_seconds || 0,
    leads_captured: req.body.leads_captured || 0,
    hot_leads: req.body.hot_leads || 0,
    demo_bookings: req.body.demo_bookings || 0,
    badge_scans: req.body.badge_scans || 0,
    manual_entries: req.body.manual_entries || 0,
    heatmap_value: req.body.heatmap_value || 0,
    rank: 0,
    last_updated: new Date().toISOString(),
  };

  boothMetrics.set(req.params.boothId, metrics);
  res.status(201).json({ success: true, data: metrics });
});

// Record booth visit
app.post('/api/booths/:boothId/visit', (req, res) => {
  let metrics = boothMetrics.get(req.params.boothId);
  if (!metrics) {
    metrics = {
      booth_id: req.params.boothId,
      exhibitor_id: req.body.exhibitor_id || '',
      exhibition_id: req.body.exhibition_id || '',
      zone_id: req.body.zone_id || '',
      zone_name: req.body.zone_name || '',
      booth_number: req.body.booth_number || '',
      visitors_count: 0, visitors_today: 0, peak_hour: '10:00',
      avg_dwell_time_seconds: 0, leads_captured: 0, hot_leads: 0,
      demo_bookings: 0, badge_scans: 0, manual_entries: 0, heatmap_value: 0, rank: 0,
      last_updated: new Date().toISOString(),
    };
  }

  metrics.visitors_count++;
  metrics.visitors_today++;
  metrics.last_updated = new Date().toISOString();

  // Update heatmap value (simple algorithm)
  const maxVisitors = Math.max(...Array.from(boothMetrics.values()).map(b => b.visitors_count), 1);
  metrics.heatmap_value = Math.min(100, Math.round((metrics.visitors_count / maxVisitors) * 100));

  boothMetrics.set(req.params.boothId, metrics);
  res.json({ success: true, data: metrics });
});

// Record lead capture
app.post('/api/booths/:boothId/lead', (req, res) => {
  let metrics = boothMetrics.get(req.params.boothId);
  if (!metrics) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Booth not found' } });

  metrics.leads_captured++;
  if (req.body.is_hot) metrics.hot_leads++;
  if (req.body.is_badge_scan) metrics.badge_scans++;
  else metrics.manual_entries++;
  metrics.last_updated = new Date().toISOString();

  boothMetrics.set(req.params.boothId, metrics);
  res.json({ success: true, data: metrics });
});

// ============================================
// ZONE METRICS (HEATMAP)
// ============================================

app.get('/api/zones/metrics', (req, res) => {
  const { exhibition_id } = req.query;
  let results = Array.from(zoneMetrics.values());

  if (exhibition_id) results = results.filter(z => z.exhibition_id === exhibition_id);

  res.json({ success: true, data: { zones: results, total: results.length } });
});

app.post('/api/zones/:zoneId/metrics', (req, res) => {
  const metrics: ZoneMetrics = {
    zone_id: req.params.zoneId,
    zone_name: req.body.zone_name || '',
    exhibition_id: req.body.exhibition_id || '',
    visitors_count: req.body.visitors_count || 0,
    current_density: req.body.current_density || 0,
    avg_dwell_time: req.body.avg_dwell_time || 0,
    booth_count: req.body.booth_count || 0,
    top_booth_ids: req.body.top_booth_ids || [],
    last_updated: new Date().toISOString(),
  };

  zoneMetrics.set(req.params.zoneId, metrics);
  res.status(201).json({ success: true, data: metrics });
});

// ============================================
// SESSION METRICS
// ============================================

app.get('/api/sessions/metrics', (req, res) => {
  const { exhibition_id } = req.query;
  let results = Array.from(sessionMetrics.values());

  if (exhibition_id) results = results.filter(s => s.exhibition_id === exhibition_id);

  results.sort((a, b) => b.attended_count - a.attended_count);

  res.json({ success: true, data: { sessions: results, total: results.length } });
});

app.post('/api/sessions/:sessionId/metrics', (req, res) => {
  const metrics: SessionMetrics = {
    session_id: req.params.sessionId,
    exhibition_id: req.body.exhibition_id || '',
    title: req.body.title || '',
    registered_count: req.body.registered_count || 0,
    attended_count: req.body.attended_count || 0,
    no_show_count: req.body.no_show_count || 0,
    avg_rating: req.body.avg_rating,
    capacity_utilization: req.body.registered_count ? Math.round((req.body.attended_count / req.body.registered_count) * 100) : 0,
    last_updated: new Date().toISOString(),
  };

  sessionMetrics.set(req.params.sessionId, metrics);
  res.status(201).json({ success: true, data: metrics });
});

// ============================================
// REAL-TIME DASHBOARD
// ============================================

app.get('/api/exhibitions/:id/dashboard', (req, res) => {
  const metrics = exhibitionMetrics.get(req.params.id) || {
    exhibition_id: req.params.id,
    total_visitors: 0, current_inside: 0, peak_visitors: 0, peak_hour: '10:00',
    total_checkins: 0, total_checkouts: 0, avg_time_spent_minutes: 0,
    unique_booths_visited: 0, leads_captured: 0, sessions_attended: 0,
    connections_made: 0, coins_earned: 0, conversions: 0, last_updated: new Date().toISOString(),
  };

  const booths = Array.from(boothMetrics.values())
    .filter(b => b.exhibition_id === req.params.id)
    .sort((a, b) => b.visitors_count - a.visitors_count)
    .slice(0, 10)
    .map((b, i) => ({ ...b, rank: i + 1 }));

  const zones = Array.from(zoneMetrics.values())
    .filter(z => z.exhibition_id === req.params.id);

  res.json({
    success: true,
    data: {
      overview: metrics,
      top_booths: booths,
      zones: zones,
      stats: {
        visitors_per_hour: metrics.total_checkins / Math.max(1, Math.floor((Date.now() - new Date(metrics.last_updated).getTime()) / 3600000)),
        conversion_rate: metrics.total_visitors > 0 ? Math.round((metrics.conversions / metrics.total_visitors) * 100) : 0,
        avg_leads_per_booth: booths.length > 0 ? Math.round(booths.reduce((sum, b) => sum + b.leads_captured, 0) / booths.length) : 0,
      },
    },
  });
});

// ============================================
// ROI CALCULATIONS
// ============================================

app.get('/api/exhibitions/:id/roi', (req, res) => {
  const metrics = exhibitionMetrics.get(req.params.id);

  // Mock ROI calculation
  const ticketRevenue = (metrics?.total_visitors || 0) * 200; // Avg ticket price
  const boothRevenue = (metrics?.leads_captured || 0) * 5000; // Avg deal value
  const totalRevenue = ticketRevenue + boothRevenue;

  const costs = {
    venue: 500000,
    marketing: 200000,
    staff: 150000,
    logistics: 100000,
    total: 950000,
  };

  const roi = costs.total > 0 ? Math.round(((totalRevenue - costs.total) / costs.total) * 100) : 0;

  res.json({
    success: true,
    data: {
      exhibition_id: req.params.id,
      revenue: {
        ticket_sales: ticketRevenue,
        lead_value: boothRevenue,
        total: totalRevenue,
      },
      costs,
      roi_percentage: roi,
      break_even_visitors: Math.ceil(costs.total / 200),
      projected_profit: totalRevenue - costs.total,
    },
  });
});

// ============================================
// EXPORTER ANALYTICS
// ============================================

app.get('/api/exhibitors/:exhibitorId/roi', (req, res) => {
  const exhibitorBooths = Array.from(boothMetrics.values())
    .filter(b => b.exhibitor_id === req.params.exhibitorId);

  const totalVisitors = exhibitorBooths.reduce((sum, b) => sum + b.visitors_count, 0);
  const totalLeads = exhibitorBooths.reduce((sum, b) => sum + b.leads_captured, 0);
  const totalHotLeads = exhibitorBooths.reduce((sum, b) => sum + b.hot_leads, 0);

  const avgDealValue = 50000; // Assumed
  const conversionRate = 0.05; // 5% conversion assumed
  const estimatedRevenue = totalHotLeads * avgDealValue * conversionRate;
  const boothCost = exhibitorBooths.length * 50000; // Per booth cost

  res.json({
    success: true,
    data: {
      exhibitor_id: req.params.exhibitorId,
      booth_count: exhibitorBooths.length,
      total_visitors: totalVisitors,
      leads_captured: totalLeads,
      hot_leads: totalHotLeads,
      estimated_revenue: Math.round(estimatedRevenue),
      booth_cost: boothCost,
      roi_percentage: boothCost > 0 ? Math.round(((estimatedRevenue - boothCost) / boothCost) * 100) : 0,
      lead_quality_score: totalLeads > 0 ? Math.round((totalHotLeads / totalLeads) * 100) : 0,
    },
  });
});

// ============================================
// START
// ============================================

app.listen(PORT, () => {
  logger.info(`📊 Exhibition Analytics Service started on port ${PORT}`);
});

export default app;