/**
 * Admin UI Routes
 *
 * Dashboard for managing identities and viewing knowledge graph
 */

import { Router } from 'express';
import { identityService } from '../services/identityService.js';
import { knowledgeGraphService, DATA_SOURCES } from '../models/knowledgeGraph.js';

export const adminRoutes = Router();

/**
 * Admin Dashboard
 * GET /api/admin/dashboard
 */
adminRoutes.get('/admin/dashboard', async (req, res) => {
  const stats = identityService.getStats();
  const sources = Object.entries(DATA_SOURCES).map(([key, config]) => ({
    id: key,
    name: config.name,
    port: config.port,
    syncFrequency: config.syncFrequency,
    status: config.status || 'unknown'
  }));

  res.json({
    success: true,
    data: {
      overview: {
        totalIdentities: stats.total,
        customers: stats.byType.customer,
        merchants: stats.byType.merchant,
        vendors: stats.byType.vendor,
        employees: stats.byType.employee,
        verified: stats.verified,
        unverified: stats.unverified
      },
      dataSources: {
        total: sources.length,
        active: sources.filter(s => s.status === 'active').length,
        sources
      },
      health: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      }
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Identity List
 * GET /api/admin/identities
 */
adminRoutes.get('/admin/identities', (req, res) => {
  const { type, status, search, limit = 50, offset = 0 } = req.query;

  let identities = identityService.getByType(type as any, 1000);

  // Filter by status
  if (status) {
    identities = identities.filter(i => i.status === status);
  }

  // Search
  if (search) {
    identities = identityService.search(search as string, 1000);
  }

  // Paginate
  const total = identities.length;
  const paginated = identities.slice(Number(offset), Number(offset) + Number(limit));

  res.json({
    success: true,
    data: {
      identities: paginated.map(i => ({
        id: i.id,
        primaryPhone: i.primaryPhone,
        primaryEmail: i.primaryEmail,
        status: i.status,
        score: i.identityScore,
        types: getIdentityTypes(i),
        lastActive: i.activity.lastActivity,
        sources: i.activity.totalAppsUsed
      })),
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + paginated.length < total
      }
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Identity Detail
 * GET /api/admin/identities/:id
 */
adminRoutes.get('/admin/identities/:id', (req, res) => {
  const { id } = req.params;

  const identity = identityService.getById(id);

  if (!identity) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Identity not found' }
    });
  }

  res.json({
    success: true,
    data: {
      identity,
      summary: {
        id: identity.id,
        primaryPhone: identity.primaryPhone,
        primaryEmail: identity.primaryEmail,
        status: identity.status,
        score: identity.identityScore,
        types: getIdentityTypes(identity),
        linkedIdentities: identity.linkedIdentities,
        socialProfiles: identity.socialProfiles.length,
        totalFollowers: identity.socialProfiles.reduce((sum, p) => sum + (p.followers || 0), 0),
        activity: identity.activity,
        dataSources: getDataSources(identity)
      }
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Data Quality Report
 * GET /api/admin/quality
 */
adminRoutes.get('/admin/quality', (req, res) => {
  const { type } = req.query;

  let identities = identityService.getByType(type as any, 1000);

  // Calculate quality metrics
  const qualityByType: Record<string, any> = {};

  if (type) {
    qualityByType[type as string] = calculateQualityMetrics(identities);
  } else {
    const types = ['customer', 'merchant', 'vendor', 'employee'];
    for (const t of types) {
      const typeIdentities = identityService.getByType(t as any, 1000);
      qualityByType[t] = calculateQualityMetrics(typeIdentities);
    }
  }

  // Overall quality
  const allIdentities = identityService.getByType('customer', 10000)
    .concat(identityService.getByType('merchant', 10000))
    .concat(identityService.getByType('vendor', 10000))
    .concat(identityService.getByType('employee', 10000));

  res.json({
    success: true,
    data: {
      overall: calculateQualityMetrics(allIdentities),
      byType: qualityByType,
      completenessDistribution: getCompletenessDistribution(allIdentities),
      freshnessDistribution: getFreshnessDistribution(allIdentities),
      recommendations: generateQualityRecommendations(qualityByType)
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Sync Management
 * GET /api/admin/sync
 */
adminRoutes.get('/admin/sync', async (req, res) => {
  const sources = Object.entries(DATA_SOURCES).map(([key, config]) => ({
    id: key,
    name: config.name,
    port: config.port,
    syncFrequency: config.syncFrequency,
    lastSync: config.lastSync,
    status: config.status || 'unknown'
  }));

  res.json({
    success: true,
    data: {
      sources,
      schedules: getSyncSchedules(sources)
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Trigger sync for a source
 * POST /api/admin/sync/:source
 */
adminRoutes.post('/admin/sync/:source', async (req, res) => {
  const { source } = req.params;
  const { userId } = req.body;

  if (!DATA_SOURCES[source]) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_SOURCE', message: 'Unknown data source' }
    });
  }

  // Mark as syncing
  (DATA_SOURCES[source] as any).status = 'syncing';

  // Simulate sync (in production, this would call the actual sync logic)
  setTimeout(() => {
    DATA_SOURCES[source].status = 'active';
    DATA_SOURCES[source].lastSync = new Date().toISOString();
  }, 2000);

  res.json({
    success: true,
    data: {
      source,
      status: 'syncing',
      message: `Sync started for ${source}`,
      userId: userId || 'all'
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Activity Log
 * GET /api/admin/activity
 */
adminRoutes.get('/admin/activity', (req, res) => {
  const { identityId, limit = 50 } = req.query;

  // Mock activity data
  const activities = [
    { id: '1', identityId: 'id_001', action: 'profile.viewed', source: 'admin', timestamp: new Date().toISOString() },
    { id: '2', identityId: 'id_002', action: 'social.added', source: 'social-scraper', timestamp: new Date(Date.now() - 60000).toISOString() },
    { id: '3', identityId: 'id_001', action: 'data.enriched', source: 'rez-consumer', timestamp: new Date(Date.now() - 120000).toISOString() }
  ];

  const filtered = identityId
    ? activities.filter(a => a.identityId === identityId)
    : activities;

  res.json({
    success: true,
    data: {
      activities: filtered.slice(0, Number(limit)),
      count: filtered.length
    },
    timestamp: new Date().toISOString()
  });
});

// ==================== HELPER FUNCTIONS ====================

function getIdentityTypes(identity: any): string[] {
  const types: string[] = [];
  if (identity.customer) types.push('customer');
  if (identity.merchant) types.push('merchant');
  if (identity.vendor) types.push('vendor');
  if (identity.employee) types.push('employee');
  return types;
}

function getDataSources(identity: any): string[] {
  const sources: string[] = [];
  if (identity.customer) sources.push('REZ Consumer');
  if (identity.merchant) sources.push('REZ Merchant');
  if (identity.vendor) sources.push('Nexha');
  if (identity.employee) sources.push('CorpPerks');
  if (identity.socialProfiles?.length > 0) sources.push('Social Media');
  return sources;
}

function calculateQualityMetrics(identities: any[]): {
  total: number;
  avgCompleteness: number;
  avgFreshness: number;
  verifiedRate: number;
  socialPresenceRate: number;
  avgScore: number;
} {
  if (identities.length === 0) {
    return { total: 0, avgCompleteness: 0, avgFreshness: 0, verifiedRate: 0, socialPresenceRate: 0, avgScore: 0 };
  }

  let totalCompleteness = 0;
  let verifiedCount = 0;
  let socialCount = 0;
  let totalScore = 0;

  for (const identity of identities) {
    // Completeness based on available data
    const fields = [
      identity.primaryPhone,
      identity.primaryEmail,
      identity.customer,
      identity.merchant,
      identity.vendor,
      identity.employee
    ].filter(Boolean).length;

    totalCompleteness += (fields / 6) * 100;
    if (identity.status === 'verified') verifiedCount++;
    if (identity.socialProfiles?.length > 0) socialCount++;
    totalScore += identity.identityScore || 0;
  }

  return {
    total: identities.length,
    avgCompleteness: Math.round(totalCompleteness / identities.length),
    avgFreshness: 75, // Mock value
    verifiedRate: Math.round((verifiedCount / identities.length) * 100),
    socialPresenceRate: Math.round((socialCount / identities.length) * 100),
    avgScore: Math.round(totalScore / identities.length)
  };
}

function getCompletenessDistribution(identities: any[]): { range: string; count: number }[] {
  const distribution = [
    { range: '0-20%', count: 0 },
    { range: '21-40%', count: 0 },
    { range: '41-60%', count: 0 },
    { range: '61-80%', count: 0 },
    { range: '81-100%', count: 0 }
  ];

  for (const identity of identities) {
    const completeness = identity.identityScore || 0;
    if (completeness <= 20) distribution[0].count++;
    else if (completeness <= 40) distribution[1].count++;
    else if (completeness <= 60) distribution[2].count++;
    else if (completeness <= 80) distribution[3].count++;
    else distribution[4].count++;
  }

  return distribution;
}

function getFreshnessDistribution(identities: any[]): { status: string; count: number }[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const fresh = identities.filter(i => {
    const lastUpdate = new Date(i.updatedAt).getTime();
    return (now - lastUpdate) < day;
  }).length;

  const stale = identities.filter(i => {
    const lastUpdate = new Date(i.updatedAt).getTime();
    return (now - lastUpdate) > 7 * day;
  }).length;

  return [
    { status: 'fresh', count: fresh },
    { status: 'stale', count: identities.length - fresh - stale },
    { status: 'very_stale', count: stale }
  ];
}

function generateQualityRecommendations(byType: Record<string, any>): string[] {
  const recommendations: string[] = [];

  for (const [type, metrics] of Object.entries(byType)) {
    const m = metrics as any;
    if (m.avgCompleteness < 50) {
      recommendations.push(`${type}: Low data completeness (${m.avgCompleteness}%). Consider enriching from additional sources.`);
    }
    if (m.verifiedRate < 30) {
      recommendations.push(`${type}: Low verification rate (${m.verifiedRate}%). Implement better verification flows.`);
    }
    if (m.socialPresenceRate < 20) {
      recommendations.push(`${type}: Low social media presence (${m.socialPresenceRate}%). Enable social scraping.`);
    }
  }

  return recommendations;
}

function getSyncSchedules(sources: any[]): { frequency: string; count: number; sources: string[] }[] {
  const schedules: Record<string, string[]> = {};

  for (const source of sources) {
    if (!schedules[source.syncFrequency]) {
      schedules[source.syncFrequency] = [];
    }
    schedules[source.syncFrequency].push(source.name);
  }

  return Object.entries(schedules).map(([frequency, names]) => ({
    frequency,
    count: names.length,
    sources: names
  }));
}