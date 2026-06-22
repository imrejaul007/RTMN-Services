// ============================================================================
// SUTAR Discovery Engine - Main Entry Point
// ============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import {
  Entity,
  EntityCategory,
  AgentCapability,
  TrustLevel,
  RankingCriteria,
  SearchRequest,
  SearchResult,
  SearchFacets,
  DiscoverRequest,
  DiscoverResult,
  MatchRequest,
  MatchResult,
  MatchedEntity,
  RankRequest,
  RankResult,
  RankedEntity,
  SuggestRequest,
  SuggestResult,
  Suggestion,
  ApiResponse,
  Location,
  PriceRange,
  AgentNetworkAgent,
  TrustProfile,
} from './types/index.js';

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  port: parseInt(process.env.PORT || '4256'),
  environment: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  agentNetworkUrl: process.env.AGENT_NETWORK_URL || 'http://localhost:4155',
  trustEngineUrl: process.env.TRUST_ENGINE_URL || 'http://localhost:4180',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  searchDebounceMs: 300,
  maxResultsPerPage: 100,
  defaultPageSize: 20,
};

// ============================================================================
// Express App Setup
// ============================================================================

const app = express();
const START_TIME = Date.now();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'] }));
app.use(express.json({ limit: '1mb' }));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: CONFIG.rateLimitWindowMs,
  max: CONFIG.rateLimitMax,
  message: { success: false, error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Request ID Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('X-Request-ID', requestId);
  (req as any).requestId = requestId;
  next();
});

// Request Logging Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      requestId: (req as any).requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
      userAgent: req.headers['user-agent'],
    };
    console.log(JSON.stringify(logEntry));
  });
  next();
});

// ============================================================================
// Utility Functions
// ============================================================================

const apiResponse = <T>(success: boolean, data?: T, error?: string, requestId?: string): ApiResponse<T> => ({
  success,
  data,
  error,
  timestamp: new Date().toISOString(),
  requestId,
});

function generateEntityId(): string {
  return `entity-${uuidv4()}`;
}

function calculateRelevanceScore(entity: Entity, query: string): number {
  if (!query) return 50;
  const queryLower = query.toLowerCase();
  const nameMatch = entity.name.toLowerCase().includes(queryLower) ? 30 : 0;
  const descMatch = entity.description.toLowerCase().includes(queryLower) ? 20 : 0;
  const tagMatch = entity.tags.some(t => t.toLowerCase().includes(queryLower)) ? 15 : 0;
  const skillMatch = entity.skills.some(s => s.toLowerCase().includes(queryLower)) ? 10 : 0;
  const capMatch = entity.capabilities.some(c => c.toLowerCase().includes(queryLower)) ? 5 : 0;
  return Math.min(100, nameMatch + descMatch + tagMatch + skillMatch + capMatch);
}

function calculateMatchScore(entity: Entity, req: MatchRequest): MatchedEntity {
  let capabilityMatch = 0;
  let skillMatch = 0;
  let priceMatch = 0;
  let locationMatch = 0;
  let reason = '';

  // Capability matching
  const requiredMatched = req.requiredCapabilities.filter(c => entity.capabilities.includes(c));
  capabilityMatch = (requiredMatched.length / req.requiredCapabilities.length) * 100;

  if (requiredMatched.length > 0) {
    reason += `Matches ${requiredMatched.length}/${req.requiredCapabilities.length} required capabilities`;
  }

  // Skill matching
  if (req.skills && req.skills.length > 0) {
    const matchedSkills = req.skills.filter(s => entity.skills.includes(s));
    skillMatch = (matchedSkills.length / req.skills.length) * 100;
    if (matchedSkills.length > 0) {
      reason += `, ${matchedSkills.length} skills`;
    }
  }

  // Price matching
  if (req.maxPrice && entity.hourlyRate) {
    priceMatch = entity.hourlyRate <= req.maxPrice ? 100 : Math.max(0, 100 - ((entity.hourlyRate - req.maxPrice) / req.maxPrice) * 100);
  } else {
    priceMatch = 50; // Neutral if no price constraint
  }

  // Location matching
  if (req.location && entity.location) {
    const locScore = [];
    if (req.location.country && entity.location.country === req.location.country) locScore.push(1);
    if (req.location.region && entity.location.region === req.location.region) locScore.push(1);
    if (req.location.city && entity.location.city === req.location.city) locScore.push(1);
    locationMatch = locScore.length > 0 ? (locScore.length / 3) * 100 : 0;
  } else {
    locationMatch = 50; // Neutral if no location constraint
  }

  // Calculate overall match score
  const totalScore = Math.min(100, Math.round(
    (capabilityMatch * 0.4) +
    (skillMatch * 0.2) +
    (priceMatch * 0.2) +
    (locationMatch * 0.1) +
    (entity.trustScore * 0.1)
  ));

  return {
    ...entity,
    matchScore: totalScore,
    capabilityMatch,
    skillMatch,
    priceMatch,
    locationMatch,
    reason,
  };
}

function calculateRankingScore(entity: Entity, criteria: RankingCriteria[], weights?: Partial<Record<RankingCriteria, number>>): Record<RankingCriteria, number> {
  const scores: Record<RankingCriteria, number> = {
    trust: entity.trustScore,
    rating: entity.rating * 20, // Normalize 0-5 to 0-100
    price: entity.hourlyRate ? Math.max(0, 100 - entity.hourlyRate) : 50, // Lower price = higher score
    relevance: entity.metadata?.relevanceScore as number || 50,
    activity: Math.min(100, (entity.completedTasks / 100) * 100), // Activity based on completed tasks
  };
  return scores;
}

function calculateTotalRankingScore(scores: Record<RankingCriteria, number>, criteria: RankingCriteria[], weights?: Partial<Record<RankingCriteria, number>>): number {
  if (!criteria.length) return 50;
  const defaultWeights: Record<RankingCriteria, number> = {
    trust: 0.3,
    rating: 0.25,
    price: 0.2,
    relevance: 0.15,
    activity: 0.1,
  };
  const w = weights ? { ...defaultWeights, ...weights } : defaultWeights;
  return criteria.reduce((sum, c) => sum + (scores[c] * (w[c] || 0)), 0);
}

function filterByLocation(entities: Entity[], location?: Partial<Location>): Entity[] {
  if (!location) return entities;
  return entities.filter(e => {
    if (!e.location) return true;
    if (location.country && e.location.country !== location.country) return false;
    if (location.region && e.location.region !== location.region) return false;
    if (location.city && e.location.city !== location.city) return false;
    return true;
  });
}

function filterByPriceRange(entities: Entity[], priceRange?: PriceRange): Entity[] {
  if (!priceRange) return entities;
  return entities.filter(e => {
    if (e.hourlyRate) {
      return e.hourlyRate >= priceRange.min && e.hourlyRate <= priceRange.max;
    }
    if (e.priceRange) {
      return e.priceRange.min >= priceRange.min && e.priceRange.max <= priceRange.max;
    }
    return true;
  });
}

function filterByTrustLevel(entities: Entity[], trustLevels?: TrustLevel[]): Entity[] {
  if (!trustLevels || trustLevels.length === 0) return entities;
  return entities.filter(e => trustLevels.includes(e.trustLevel));
}

function filterByRating(entities: Entity[], minRating?: number): Entity[] {
  if (!minRating) return entities;
  return entities.filter(e => e.rating >= minRating);
}

function filterByCapabilities(entities: Entity[], capabilities?: AgentCapability[]): Entity[] {
  if (!capabilities || capabilities.length === 0) return entities;
  return entities.filter(e => capabilities.every(c => e.capabilities.includes(c)));
}

function filterByCategories(entities: Entity[], categories?: EntityCategory[]): Entity[] {
  if (!categories || categories.length === 0) return entities;
  return entities.filter(e => categories.includes(e.type));
}

function buildFacets(entities: Entity[]): SearchFacets {
  const facets: SearchFacets = {
    categories: {},
    capabilities: {},
    locations: {},
    priceRanges: {},
    trustLevels: {},
  };

  entities.forEach(e => {
    facets.categories[e.type] = (facets.categories[e.type] || 0) + 1;
    e.capabilities.forEach(c => { facets.capabilities[c] = (facets.capabilities[c] || 0) + 1; });
    if (e.location?.country) facets.locations[e.location.country] = (facets.locations[e.location.country] || 0) + 1;
    facets.trustLevels[e.trustLevel] = (facets.trustLevels[e.trustLevel] || 0) + 1;
    if (e.hourlyRate) {
      const range = e.hourlyRate < 50 ? 'budget' : e.hourlyRate < 150 ? 'mid-range' : e.hourlyRate < 500 ? 'premium' : 'enterprise';
      facets.priceRanges[range] = (facets.priceRanges[range] || 0) + 1;
    }
  });

  return facets;
}

// ============================================================================
// In-Memory Entity Store (for demo - replace with actual database)
// ============================================================================

const entityStore = new Map<string, Entity>();

// Seed with sample entities
function seedEntities(): void {
  const sampleEntities: Entity[] = [
    {
      id: 'entity-001',
      name: 'DataFlow Agent',
      type: 'agent',
      description: 'Advanced data processing and analysis agent with ML capabilities',
      capabilities: ['reasoning', 'analysis', 'execution'],
      skills: ['Python', 'Machine Learning', 'Data Engineering'],
      category: 'data',
      tags: ['data', 'ml', 'analytics'],
      status: 'active',
      location: { country: 'US', region: 'California', city: 'San Francisco', timezone: 'PST' },
      trustLevel: 'verified',
      trustScore: 95,
      rating: 4.8,
      reviewCount: 234,
      priceRange: { min: 50, max: 200, currency: 'USD', unit: 'hourly' },
      hourlyRate: 150,
      completedTasks: 1250,
      successRate: 98.5,
      responseTime: 120,
      metadata: { specialty: 'data-processing' },
      registeredAt: '2024-01-15T10:00:00Z',
      lastActive: '2024-06-12T08:30:00Z',
      verifiedAt: '2024-02-01T00:00:00Z',
    },
    {
      id: 'entity-002',
      name: 'CodeMaster Pro',
      type: 'agent',
      description: 'Full-stack development agent specializing in modern web applications',
      capabilities: ['creation', 'execution', 'reasoning'],
      skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
      category: 'development',
      tags: ['web', 'fullstack', 'development'],
      status: 'active',
      location: { country: 'US', region: 'New York', city: 'New York', timezone: 'EST' },
      trustLevel: 'trusted',
      trustScore: 88,
      rating: 4.6,
      reviewCount: 189,
      priceRange: { min: 75, max: 250, currency: 'USD', unit: 'hourly' },
      hourlyRate: 175,
      completedTasks: 890,
      successRate: 96.2,
      responseTime: 90,
      metadata: { specialty: 'web-development' },
      registeredAt: '2024-02-20T14:30:00Z',
      lastActive: '2024-06-12T09:15:00Z',
    },
    {
      id: 'entity-003',
      name: 'LegalResearch AI',
      type: 'agent',
      description: 'Legal research and document analysis agent for law firms',
      capabilities: ['reasoning', 'analysis', 'communication'],
      skills: ['Legal Research', 'Contract Analysis', 'Case Law'],
      category: 'legal',
      tags: ['legal', 'research', 'compliance'],
      status: 'active',
      location: { country: 'UK', region: 'England', city: 'London', timezone: 'GMT' },
      trustLevel: 'verified',
      trustScore: 92,
      rating: 4.9,
      reviewCount: 156,
      priceRange: { min: 100, max: 300, currency: 'USD', unit: 'hourly' },
      hourlyRate: 220,
      completedTasks: 567,
      successRate: 99.1,
      responseTime: 180,
      metadata: { specialty: 'legal-research' },
      registeredAt: '2024-03-10T09:00:00Z',
      lastActive: '2024-06-11T16:45:00Z',
      verifiedAt: '2024-03-25T00:00:00Z',
    },
    {
      id: 'entity-004',
      name: 'Marketing Automation Hub',
      type: 'service',
      description: 'Automated marketing campaigns and customer engagement platform',
      capabilities: ['automation', 'analysis', 'communication'],
      skills: ['Campaign Management', 'Email Marketing', 'CRM Integration'],
      category: 'marketing',
      tags: ['marketing', 'automation', 'crm'],
      status: 'active',
      location: { country: 'US', region: 'Texas', city: 'Austin', timezone: 'CST' },
      trustLevel: 'trusted',
      trustScore: 85,
      rating: 4.5,
      reviewCount: 312,
      priceRange: { min: 500, max: 2000, currency: 'USD', unit: 'monthly' },
      subscriptionPrice: 1200,
      completedTasks: 2340,
      successRate: 94.8,
      responseTime: 60,
      metadata: { type: 'saas' },
      registeredAt: '2024-01-05T11:00:00Z',
      lastActive: '2024-06-12T07:00:00Z',
    },
    {
      id: 'entity-005',
      name: 'CloudArchitect Solution',
      type: 'provider',
      description: 'Enterprise cloud infrastructure design and migration services',
      capabilities: ['reasoning', 'execution', 'analysis', 'coordination'],
      skills: ['AWS', 'Azure', 'GCP', 'Kubernetes', 'Terraform'],
      category: 'infrastructure',
      tags: ['cloud', 'devops', 'infrastructure'],
      status: 'active',
      location: { country: 'US', region: 'Washington', city: 'Seattle', timezone: 'PST' },
      trustLevel: 'verified',
      trustScore: 97,
      rating: 4.9,
      reviewCount: 445,
      priceRange: { min: 200, max: 1000, currency: 'USD', unit: 'hourly' },
      hourlyRate: 350,
      completedTasks: 1890,
      successRate: 99.5,
      responseTime: 45,
      metadata: { tier: 'enterprise' },
      registeredAt: '2023-11-20T08:00:00Z',
      lastActive: '2024-06-12T10:00:00Z',
      verifiedAt: '2023-12-15T00:00:00Z',
    },
    {
      id: 'entity-006',
      name: 'ContentCreator Studio',
      type: 'agent',
      description: 'AI-powered content creation for marketing and social media',
      capabilities: ['creation', 'communication', 'analysis'],
      skills: ['Copywriting', 'SEO', 'Social Media', 'Video Production'],
      category: 'content',
      tags: ['content', 'marketing', 'creative'],
      status: 'active',
      location: { country: 'CA', region: 'Ontario', city: 'Toronto', timezone: 'EST' },
      trustLevel: 'standard',
      trustScore: 78,
      rating: 4.3,
      reviewCount: 98,
      priceRange: { min: 40, max: 150, currency: 'USD', unit: 'hourly' },
      hourlyRate: 85,
      completedTasks: 456,
      successRate: 91.2,
      responseTime: 240,
      metadata: { specialty: 'content-creation' },
      registeredAt: '2024-04-01T13:00:00Z',
      lastActive: '2024-06-10T14:30:00Z',
    },
    {
      id: 'entity-007',
      name: 'SecurityAudit Pro',
      type: 'service',
      description: 'Comprehensive security auditing and penetration testing service',
      capabilities: ['analysis', 'execution', 'reasoning'],
      skills: ['Penetration Testing', 'Vulnerability Assessment', 'Compliance'],
      category: 'security',
      tags: ['security', 'audit', 'compliance'],
      status: 'active',
      location: { country: 'DE', region: 'Bavaria', city: 'Munich', timezone: 'CET' },
      trustLevel: 'verified',
      trustScore: 96,
      rating: 4.8,
      reviewCount: 178,
      priceRange: { min: 150, max: 500, currency: 'USD', unit: 'hourly' },
      hourlyRate: 280,
      completedTasks: 678,
      successRate: 98.9,
      responseTime: 30,
      metadata: { certifications: ['CISSP', 'CEH'] },
      registeredAt: '2024-02-15T10:30:00Z',
      lastActive: '2024-06-12T06:00:00Z',
      verifiedAt: '2024-03-01T00:00:00Z',
    },
    {
      id: 'entity-008',
      name: 'CustomerSupport Agent',
      type: 'agent',
      description: '24/7 customer support agent with multi-language capabilities',
      capabilities: ['communication', 'coordination', 'automation'],
      skills: ['Multi-language Support', 'Ticket Management', 'FAQ Automation'],
      category: 'support',
      tags: ['support', 'customer-service', 'automation'],
      status: 'active',
      location: { country: 'PH', region: 'Metro Manila', city: 'Manila', timezone: 'PHT' },
      trustLevel: 'trusted',
      trustScore: 82,
      rating: 4.4,
      reviewCount: 567,
      priceRange: { min: 20, max: 80, currency: 'USD', unit: 'hourly' },
      hourlyRate: 45,
      completedTasks: 3456,
      successRate: 93.7,
      responseTime: 15,
      metadata: { languages: ['English', 'Spanish', 'Mandarin', 'Japanese'] },
      registeredAt: '2024-01-20T09:00:00Z',
      lastActive: '2024-06-12T10:30:00Z',
    },
  ];

  sampleEntities.forEach(e => entityStore.set(e.id, e));
  console.log(`[SEED] Loaded ${sampleEntities.length} sample entities`);
}

seedEntities();

// ============================================================================
// Validation Schemas
// ============================================================================

const searchSchema = z.object({
  query: z.string().optional(),
  categories: z.array(z.enum(['agent', 'service', 'product', 'solution', 'provider'])).optional(),
  capabilities: z.array(z.enum(['reasoning', 'execution', 'analysis', 'creation', 'communication', 'coordination', 'automation', 'learning'])).optional(),
  location: z.object({
    country: z.string().optional(),
    region: z.string().optional(),
    city: z.string().optional(),
    timezone: z.string().optional(),
  }).optional(),
  priceRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
    currency: z.string().default('USD'),
    unit: z.enum(['hourly', 'daily', 'monthly', 'per-task', 'subscription']).optional(),
  }).optional(),
  minRating: z.number().min(0).max(5).optional(),
  trustLevel: z.array(z.enum(['verified', 'trusted', 'standard', 'new', 'unverified'])).optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['trust', 'rating', 'price', 'relevance', 'activity']).default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const discoverSchema = z.object({
  category: z.enum(['agent', 'service', 'product', 'solution', 'provider']).optional(),
  capabilities: z.array(z.enum(['reasoning', 'execution', 'analysis', 'creation', 'communication', 'coordination', 'automation', 'learning'])).optional(),
  location: z.object({
    country: z.string().optional(),
    region: z.string().optional(),
    city: z.string().optional(),
  }).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  featured: z.boolean().default(false),
  trending: z.boolean().default(false),
});

const matchSchema = z.object({
  requiredCapabilities: z.array(z.enum(['reasoning', 'execution', 'analysis', 'creation', 'communication', 'coordination', 'automation', 'learning'])).min(1),
  preferredCapabilities: z.array(z.enum(['reasoning', 'execution', 'analysis', 'creation', 'communication', 'coordination', 'automation', 'learning'])).optional(),
  skills: z.array(z.string()).optional(),
  location: z.object({
    country: z.string().optional(),
    region: z.string().optional(),
    city: z.string().optional(),
  }).optional(),
  maxPrice: z.number().min(0).optional(),
  minRating: z.number().min(0).max(5).optional(),
  limit: z.number().min(1).max(50).default(10),
});

const rankSchema = z.object({
  entityIds: z.array(z.string()).min(1),
  criteria: z.array(z.enum(['trust', 'rating', 'price', 'relevance', 'activity'])).min(1),
  weights: z.record(z.enum(['trust', 'rating', 'price', 'relevance', 'activity']), z.number().min(0).max(1)).optional(),
});

const suggestSchema = z.object({
  query: z.string().optional(),
  context: z.string().optional(),
  history: z.array(z.string()).optional(),
  limit: z.number().min(1).max(20).default(10),
  type: z.enum(['search', 'category', 'capability', 'location', 'tag']).default('search'),
});

// ============================================================================
// Agent Network Integration
// ============================================================================

async function fetchAgentsFromNetwork(): Promise<AgentNetworkAgent[]> {
  try {
    const response = await fetch(`${CONFIG.agentNetworkUrl}/api/v1/agents?status=available&limit=100`);
    if (!response.ok) {
      console.warn(`[AGENT-NETWORK] Failed to fetch: ${response.status}`);
      return [];
    }
    const data = await response.json();
    return data.data?.agents || [];
  } catch (error) {
    console.warn(`[AGENT-NETWORK] Connection failed:`, error);
    return [];
  }
}

function convertAgentToEntity(agent: AgentNetworkAgent): Entity {
  return {
    id: agent.id,
    name: agent.name,
    type: 'agent',
    description: agent.description,
    capabilities: agent.capabilities as AgentCapability[],
    skills: agent.skills,
    category: agent.type,
    tags: [agent.type],
    status: agent.status === 'available' ? 'active' : 'inactive',
    trustLevel: 'standard',
    trustScore: agent.rating * 20,
    rating: agent.rating,
    reviewCount: agent.completedTasks,
    hourlyRate: agent.hourlyRate,
    completedTasks: agent.completedTasks,
    successRate: agent.successRate,
    metadata: agent.metadata,
    registeredAt: agent.registeredAt,
    lastActive: agent.lastActive,
  };
}

// ============================================================================
// Trust Engine Integration
// ============================================================================

async function fetchTrustProfile(entityId: string): Promise<TrustProfile | null> {
  try {
    const response = await fetch(`${CONFIG.trustEngineUrl}/api/v1/profile/${entityId}`);
    if (!response.ok) {
      console.warn(`[TRUST-ENGINE] Failed to fetch profile for ${entityId}: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.warn(`[TRUST-ENGINE] Connection failed:`, error);
    return null;
  }
}

async function enrichWithTrustData(entities: Entity[]): Promise<Entity[]> {
  const enriched = await Promise.all(
    entities.map(async (entity) => {
      const profile = await fetchTrustProfile(entity.id);
      if (profile) {
        return {
          ...entity,
          trustScore: profile.trustScore,
          trustLevel: profile.trustLevel,
        };
      }
      return entity;
    })
  );
  return enriched;
}

// ============================================================================
// API Routes
// ============================================================================

// Health Endpoints
app.get('/health', (_req: Request, res: Response) => {
  res.json(apiResponse(true, {
    status: 'healthy',
    service: 'sutar-discovery-engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
  }));
});

app.get('/health/ready', (_req: Request, res: Response) => {
  res.json(apiResponse(true, { ready: true, entities: entityStore.size }));
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json(apiResponse(true, { alive: true }));
});

app.get('/health/detailed', async (_req: Request, res: Response) => {
  const dependencies = await Promise.all([
    checkServiceHealth('Agent Network', CONFIG.agentNetworkUrl),
    checkServiceHealth('Trust Engine', CONFIG.trustEngineUrl),
  ]);

  res.json(apiResponse(true, {
    status: 'healthy',
    service: 'sutar-discovery-engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    dependencies,
  }));
});

async function checkServiceHealth(name: string, url: string): Promise<{ name: string; status: 'healthy' | 'unhealthy' | 'unknown'; latency?: number; error?: string }> {
  const start = Date.now();
  try {
    const response = await fetch(`${url}/health`, { method: 'GET', signal: AbortSignal.timeout(3000) });
    const latency = Date.now() - start;
    return { name, status: response.ok ? 'healthy' : 'unhealthy', latency, error: response.ok ? undefined : `HTTP ${response.status}` };
  } catch (error) {
    return { name, status: 'unknown', error: String(error) };
  }
}

// Info Endpoint
app.get('/api/v1/info', (_req: Request, res: Response) => {
  res.json(apiResponse(true, {
    name: 'sutar-discovery-engine',
    description: 'Discovery Engine - Entity search, filtering, and matching',
    version: '1.0.0',
    features: [
      'Entity Search',
      'Category-based Filtering',
      'Capability Matching',
      'Location-based Search',
      'Trust-based Ranking',
      'Price Range Filtering',
      'Rating-based Sorting',
      'Agent Network Integration',
      'Trust Engine Integration',
    ],
    endpoints: [
      'GET /api/v1/search - Search entities',
      'GET /api/v1/discover - Discover entities by category',
      'POST /api/v1/match - Match by capabilities',
      'GET /api/v1/rank - Rank by criteria',
      'GET /api/v1/suggest - Get suggestions',
    ],
  }));
});

// ============================================================================
// 1. Entity Search Endpoint
// ============================================================================

app.get('/api/v1/search', async (req: Request, res: Response) => {
  try {
    const requestId = (req as any).requestId;
    const queryResult = searchSchema.safeParse(req.query);

    if (!queryResult.success) {
      res.status(400).json(apiResponse(false, undefined, queryResult.error.message, requestId));
      return;
    }

    const params = queryResult.data;
    console.log(`[SEARCH] Request ${requestId}:`, JSON.stringify(params));

    // Fetch entities from Agent Network
    const networkAgents = await fetchAgentsFromNetwork();
    let entities = [
      ...Array.from(entityStore.values()),
      ...networkAgents.map(convertAgentToEntity),
    ];

    // Apply filters
    if (params.query) {
      entities = entities.filter(e => {
        const relevance = calculateRelevanceScore(e, params.query!);
        (e as any).relevanceScore = relevance;
        return relevance > 20;
      });
    }

    entities = filterByCategories(entities, params.categories);
    entities = filterByCapabilities(entities, params.capabilities);
    entities = filterByLocation(entities, params.location);
    entities = filterByPriceRange(entities, params.priceRange);
    entities = filterByRating(entities, params.minRating);
    entities = filterByTrustLevel(entities, params.trustLevel);

    if (params.tags && params.tags.length > 0) {
      entities = entities.filter(e => params.tags!.some(t => e.tags.includes(t)));
    }

    // Enrich with trust data
    entities = await enrichWithTrustData(entities);

    // Sort
    const sortMultiplier = params.sortOrder === 'asc' ? 1 : -1;
    entities.sort((a, b) => {
      const aScore = (a as any).relevanceScore || calculateRelevanceScore(a, params.query || '');
      const bScore = (b as any).relevanceScore || calculateRelevanceScore(b, params.query || '');

      switch (params.sortBy) {
        case 'trust':
          return (b.trustScore - a.trustScore) * sortMultiplier;
        case 'rating':
          return (b.rating - a.rating) * sortMultiplier;
        case 'price':
          return ((a.hourlyRate || 0) - (b.hourlyRate || 0)) * sortMultiplier;
        case 'activity':
          return (b.completedTasks - a.completedTasks) * sortMultiplier;
        case 'relevance':
        default:
          return (aScore - bScore) * sortMultiplier;
      }
    });

    const total = entities.length;
    const offset = params.offset || 0;
    const limit = params.limit || CONFIG.defaultPageSize;
    const paginatedEntities = entities.slice(offset, offset + limit);

    const result: SearchResult = {
      entities: paginatedEntities,
      total,
      limit,
      offset,
      query: params.query || '',
      facets: buildFacets(entities),
    };

    console.log(`[SEARCH] Request ${requestId}: Found ${total} entities`);
    res.json(apiResponse(true, result, undefined, requestId));
  } catch (error) {
    const requestId = (req as any).requestId;
    console.error(`[SEARCH] Error:`, error);
    res.status(500).json(apiResponse(false, undefined, String(error), requestId));
  }
});

// ============================================================================
// 2. Category-based Discovery Endpoint
// ============================================================================

app.get('/api/v1/discover', async (req: Request, res: Response) => {
  try {
    const requestId = (req as any).requestId;
    const queryResult = discoverSchema.safeParse(req.query);

    if (!queryResult.success) {
      res.status(400).json(apiResponse(false, undefined, queryResult.error.message, requestId));
      return;
    }

    const params = queryResult.data;
    console.log(`[DISCOVER] Request ${requestId}:`, JSON.stringify(params));

    // Fetch entities from Agent Network
    const networkAgents = await fetchAgentsFromNetwork();
    let entities = [
      ...Array.from(entityStore.values()),
      ...networkAgents.map(convertAgentToEntity),
    ];

    // Filter by category
    if (params.category) {
      entities = entities.filter(e => e.type === params.category);
    }

    // Filter by capabilities
    entities = filterByCapabilities(entities, params.capabilities);

    // Filter by location
    entities = filterByLocation(entities, params.location);

    // Filter active only
    entities = entities.filter(e => e.status === 'active');

    // Sort by trust and rating
    entities.sort((a, b) => {
      const aScore = a.trustScore * 0.6 + a.rating * 20 * 0.4;
      const bScore = b.trustScore * 0.6 + b.rating * 20 * 0.4;
      return bScore - aScore;
    });

    const total = entities.length;
    const offset = params.offset || 0;
    const limit = params.limit || CONFIG.defaultPageSize;
    const paginatedEntities = entities.slice(offset, offset + limit);

    // Get featured (top rated and verified)
    let featured: Entity[] = [];
    let trending: Entity[] = [];

    if (params.featured) {
      featured = entities.filter(e => e.trustLevel === 'verified' || e.trustLevel === 'trusted').slice(0, 5);
    }

    if (params.trending) {
      trending = [...entities].sort((a, b) => b.completedTasks - a.completedTasks).slice(0, 5);
    }

    const result: DiscoverResult = {
      entities: paginatedEntities,
      total,
      category: params.category || 'all',
      featured: params.featured ? featured : undefined,
      trending: params.trending ? trending : undefined,
    };

    console.log(`[DISCOVER] Request ${requestId}: Found ${total} entities in category ${params.category || 'all'}`);
    res.json(apiResponse(true, result, undefined, requestId));
  } catch (error) {
    const requestId = (req as any).requestId;
    console.error(`[DISCOVER] Error:`, error);
    res.status(500).json(apiResponse(false, undefined, String(error), requestId));
  }
});

// ============================================================================
// 3. Capability Matching Endpoint
// ============================================================================

app.post('/api/v1/match', async (req: Request, res: Response) => {
  try {
    const requestId = (req as any).requestId;
    const bodyResult = matchSchema.safeParse(req.body);

    if (!bodyResult.success) {
      res.status(400).json(apiResponse(false, undefined, bodyResult.error.message, requestId));
      return;
    }

    const params = bodyResult.data;
    console.log(`[MATCH] Request ${requestId}:`, JSON.stringify(params));

    // Fetch entities from Agent Network
    const networkAgents = await fetchAgentsFromNetwork();
    let entities = [
      ...Array.from(entityStore.values()),
      ...networkAgents.map(convertAgentToEntity),
    ];

    // Filter active only
    entities = entities.filter(e => e.status === 'active');

    // Filter by required capabilities
    entities = filterByCapabilities(entities, params.requiredCapabilities);

    // Filter by min rating
    entities = filterByRating(entities, params.minRating);

    // Filter by max price
    if (params.maxPrice) {
      entities = entities.filter(e => !e.hourlyRate || e.hourlyRate <= params.maxPrice!);
    }

    // Calculate match scores
    const matchedEntities = entities
      .map(e => calculateMatchScore(e, params))
      .filter(e => e.capabilityMatch >= 100) // Must match all required capabilities
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, params.limit);

    const result: MatchResult = {
      matches: matchedEntities,
      total: matchedEntities.length,
      matchCriteria: {
        requiredCapabilities: params.requiredCapabilities,
        preferredCapabilities: params.preferredCapabilities,
        skills: params.skills,
      },
    };

    console.log(`[MATCH] Request ${requestId}: Found ${matchedEntities.length} matches`);
    res.json(apiResponse(true, result, undefined, requestId));
  } catch (error) {
    const requestId = (req as any).requestId;
    console.error(`[MATCH] Error:`, error);
    res.status(500).json(apiResponse(false, undefined, String(error), requestId));
  }
});

// ============================================================================
// 4. Ranking Endpoint
// ============================================================================

app.get('/api/v1/rank', async (req: Request, res: Response) => {
  try {
    const requestId = (req as any).requestId;
    const queryResult = rankSchema.safeParse(req.query);

    if (!queryResult.success) {
      res.status(400).json(apiResponse(false, undefined, queryResult.error.message, requestId));
      return;
    }

    const params = queryResult.data;
    console.log(`[RANK] Request ${requestId}:`, JSON.stringify(params));

    // Get entities from store
    const entities = params.entityIds
      .map(id => entityStore.get(id))
      .filter((e): e is Entity => e !== undefined);

    if (entities.length === 0) {
      res.status(404).json(apiResponse(false, undefined, 'No entities found', requestId));
      return;
    }

    // Calculate ranking scores
    const rankedEntities: RankedEntity[] = entities.map(e => {
      const scores = calculateRankingScore(e, params.criteria, params.weights);
      const totalScore = calculateTotalRankingScore(scores, params.criteria, params.weights);
      return {
        ...e,
        scores,
        totalScore,
        rank: 0,
      };
    });

    // Sort by total score
    rankedEntities.sort((a, b) => b.totalScore - a.totalScore);

    // Assign ranks
    rankedEntities.forEach((e, index) => {
      e.rank = index + 1;
    });

    const result: RankResult = {
      rankings: rankedEntities,
    };

    console.log(`[RANK] Request ${requestId}: Ranked ${entities.length} entities`);
    res.json(apiResponse(true, result, undefined, requestId));
  } catch (error) {
    const requestId = (req as any).requestId;
    console.error(`[RANK] Error:`, error);
    res.status(500).json(apiResponse(false, undefined, String(error), requestId));
  }
});

// ============================================================================
// 5. Suggestions Endpoint
// ============================================================================

app.get('/api/v1/suggest', async (req: Request, res: Response) => {
  try {
    const requestId = (req as any).requestId;
    const queryResult = suggestSchema.safeParse(req.query);

    if (!queryResult.success) {
      res.status(400).json(apiResponse(false, undefined, queryResult.error.message, requestId));
      return;
    }

    const params = queryResult.data;
    console.log(`[SUGGEST] Request ${requestId}:`, JSON.stringify(params));

    const suggestions: Suggestion[] = [];
    const entities = Array.from(entityStore.values());

    switch (params.type) {
      case 'category': {
        const categories = new Set(entities.map(e => e.type));
        categories.forEach(cat => {
          suggestions.push({
            type: 'category',
            value: cat,
            label: cat.charAt(0).toUpperCase() + cat.slice(1),
            count: entities.filter(e => e.type === cat).length,
          });
        });
        break;
      }
      case 'capability': {
        const capabilities = new Set<string>();
        entities.forEach(e => e.capabilities.forEach(c => capabilities.add(c)));
        capabilities.forEach(cap => {
          suggestions.push({
            type: 'capability',
            value: cap,
            label: cap.charAt(0).toUpperCase() + cap.slice(1),
            count: entities.filter(e => e.capabilities.includes(cap as AgentCapability)).length,
          });
        });
        break;
      }
      case 'location': {
        const locations = new Set<string>();
        entities.forEach(e => { if (e.location?.country) locations.add(e.location.country); });
        locations.forEach(loc => {
          suggestions.push({
            type: 'location',
            value: loc,
            label: loc,
            count: entities.filter(e => e.location?.country === loc).length,
          });
        });
        break;
      }
      case 'tag': {
        const tags = new Set<string>();
        entities.forEach(e => e.tags.forEach(t => tags.add(t)));
        tags.forEach(tag => {
          suggestions.push({
            type: 'tag',
            value: tag,
            label: tag.charAt(0).toUpperCase() + tag.slice(1),
            count: entities.filter(e => e.tags.includes(tag)).length,
          });
        });
        break;
      }
      case 'search':
      default: {
        // Search suggestions based on query
        if (params.query) {
          const queryLower = params.query.toLowerCase();
          const matchedNames = entities
            .filter(e => e.name.toLowerCase().includes(queryLower))
            .slice(0, params.limit)
            .map(e => ({
              type: 'entity' as const,
              value: e.id,
              label: e.name,
              score: calculateRelevanceScore(e, params.query!),
            }));

          const matchedCategories = [...new Set(entities
            .filter(e => e.type.toLowerCase().includes(queryLower))
            .map(e => e.type))]
            .slice(0, 3)
            .map(cat => ({
              type: 'category' as const,
              value: cat,
              label: cat.charAt(0).toUpperCase() + cat.slice(1),
            }));

          const matchedCapabilities = [...new Set(entities
            .flatMap(e => e.capabilities)
            .filter(c => c.toLowerCase().includes(queryLower)))]
            .slice(0, 3)
            .map(cap => ({
              type: 'capability' as const,
              value: cap,
              label: cap.charAt(0).toUpperCase() + cap.slice(1),
            }));

          suggestions.push(...matchedNames, ...matchedCategories, ...matchedCapabilities);
        } else {
          // Return popular entities if no query
          const popular = entities
            .sort((a, b) => b.rating - a.rating)
            .slice(0, params.limit)
            .map(e => ({
              type: 'entity' as const,
              value: e.id,
              label: e.name,
              score: e.rating,
            }));
          suggestions.push(...popular);
        }
        break;
      }
    }

    // Sort by count/score
    suggestions.sort((a, b) => (b.count || 0) - (a.count || 0));

    const result: SuggestResult = {
      suggestions: suggestions.slice(0, params.limit),
      type: params.type,
    };

    console.log(`[SUGGEST] Request ${requestId}: Returned ${suggestions.length} suggestions`);
    res.json(apiResponse(true, result, undefined, requestId));
  } catch (error) {
    const requestId = (req as any).requestId;
    console.error(`[SUGGEST] Error:`, error);
    res.status(500).json(apiResponse(false, undefined, String(error), requestId));
  }
});

// ============================================================================
// Entity Management Endpoints (CRUD)
// ============================================================================

app.post('/api/v1/entities', (req: Request, res: Response) => {
  try {
    const requestId = (req as any).requestId;
    const entity: Entity = {
      id: generateEntityId(),
      ...req.body,
      status: 'pending',
      trustLevel: 'new',
      trustScore: 50,
      rating: 0,
      reviewCount: 0,
      completedTasks: 0,
      successRate: 0,
      metadata: req.body.metadata || {},
      registeredAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };

    entityStore.set(entity.id, entity);
    console.log(`[ENTITY] Created: ${entity.id} - ${entity.name}`);
    res.status(201).json(apiResponse(true, entity, undefined, requestId));
  } catch (error) {
    const requestId = (req as any).requestId;
    console.error(`[ENTITY] Error:`, error);
    res.status(500).json(apiResponse(false, undefined, String(error), requestId));
  }
});

app.get('/api/v1/entities', (req: Request, res: Response) => {
  const { status, category, limit = 50, offset = 0 } = req.query;
  let entities = Array.from(entityStore.values());

  if (status) entities = entities.filter(e => e.status === status);
  if (category) entities = entities.filter(e => e.type === category);

  const total = entities.length;
  const paginated = entities.slice(Number(offset), Number(offset) + Number(limit));

  res.json(apiResponse(true, { entities: paginated, total, limit: Number(limit), offset: Number(offset) }));
});

app.get('/api/v1/entities/:id', (req: Request, res: Response) => {
  const entity = entityStore.get(req.params.id);
  if (!entity) {
    res.status(404).json(apiResponse(false, undefined, 'Entity not found'));
    return;
  }
  res.json(apiResponse(true, entity));
});

app.put('/api/v1/entities/:id', (req: Request, res: Response) => {
  const entity = entityStore.get(req.params.id);
  if (!entity) {
    res.status(404).json(apiResponse(false, undefined, 'Entity not found'));
    return;
  }

  const updated = { ...entity, ...req.body, id: entity.id, lastActive: new Date().toISOString() };
  entityStore.set(entity.id, updated);
  console.log(`[ENTITY] Updated: ${entity.id}`);
  res.json(apiResponse(true, updated));
});

app.delete('/api/v1/entities/:id', (req: Request, res: Response) => {
  const entity = entityStore.get(req.params.id);
  if (!entity) {
    res.status(404).json(apiResponse(false, undefined, 'Entity not found'));
    return;
  }

  entityStore.delete(req.params.id);
  console.log(`[ENTITY] Deleted: ${req.params.id}`);
  res.json(apiResponse(true, { deleted: req.params.id }));
});

// ============================================================================
// Intent/Event Handlers
// ============================================================================

app.post('/api/v1/intent', async (req: Request, res: Response) => {
  try {
    const requestId = (req as any).requestId;
    const { type, payload } = req.body;
    console.log(`[INTENT] ${type}:`, JSON.stringify(payload));

    // Process discovery intents
    if (type === 'discover_entities') {
      const result = await handleDiscoverIntent(payload);
      res.json(apiResponse(true, { intentId: uuidv4(), type, status: 'processed', result }, undefined, requestId));
    } else if (type === 'match_capabilities') {
      const result = await handleMatchIntent(payload);
      res.json(apiResponse(true, { intentId: uuidv4(), type, status: 'processed', result }, undefined, requestId));
    } else {
      res.json(apiResponse(true, { intentId: uuidv4(), type, status: 'received' }, undefined, requestId));
    }
  } catch (error) {
    const requestId = (req as any).requestId;
    console.error(`[INTENT] Error:`, error);
    res.status(400).json(apiResponse(false, undefined, String(error), requestId));
  }
});

app.post('/api/v1/event', async (req: Request, res: Response) => {
  try {
    const requestId = (req as any).requestId;
    const { type, data } = req.body;
    console.log(`[EVENT] ${type}:`, JSON.stringify(data));

    // Emit events for tracking
    if (type === 'entity_viewed') {
      console.log(`[EVENT] Entity viewed: ${data.entityId}`);
    } else if (type === 'entity_selected') {
      console.log(`[EVENT] Entity selected: ${data.entityId}`);
    }

    res.json(apiResponse(true, { eventId: uuidv4(), type, status: 'processed' }, undefined, requestId));
  } catch (error) {
    const requestId = (req as any).requestId;
    console.error(`[EVENT] Error:`, error);
    res.status(400).json(apiResponse(false, undefined, String(error), requestId));
  }
});

// Intent handlers
async function handleDiscoverIntent(payload: any): Promise<DiscoverResult> {
  const req: DiscoverRequest = {
    category: payload.category,
    capabilities: payload.capabilities,
    location: payload.location,
    limit: payload.limit || 20,
    offset: payload.offset || 0,
    featured: payload.featured || false,
    trending: payload.trending || false,
  };

  let entities = Array.from(entityStore.values());

  if (req.category) {
    entities = entities.filter(e => e.type === req.category);
  }

  entities = filterByCapabilities(entities, req.capabilities);
  entities = filterByLocation(entities, req.location);
  entities = entities.filter(e => e.status === 'active');

  const total = entities.length;
  const paginated = entities.slice(req.offset || 0, (req.offset || 0) + (req.limit || 20));

  return {
    entities: paginated,
    total,
    category: req.category || 'all',
  };
}

async function handleMatchIntent(payload: any): Promise<MatchResult> {
  const req: MatchRequest = {
    requiredCapabilities: payload.requiredCapabilities,
    preferredCapabilities: payload.preferredCapabilities,
    skills: payload.skills,
    location: payload.location,
    maxPrice: payload.maxPrice,
    minRating: payload.minRating,
    limit: payload.limit || 10,
  };

  let entities = Array.from(entityStore.values()).filter(e => e.status === 'active');
  entities = filterByCapabilities(entities, req.requiredCapabilities);
  entities = filterByRating(entities, req.minRating);

  if (req.maxPrice) {
    entities = entities.filter(e => !e.hourlyRate || e.hourlyRate <= req.maxPrice!);
  }

  const matches = entities
    .map(e => calculateMatchScore(e, req))
    .filter(e => e.capabilityMatch >= 100)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, req.limit);

  return {
    matches,
    total: matches.length,
    matchCriteria: {
      requiredCapabilities: req.requiredCapabilities,
      preferredCapabilities: req.preferredCapabilities,
      skills: req.skills,
    },
  };
}

// ============================================================================
// Error Handling
// ============================================================================

app.use((_req: Request, res: Response) => {
  res.status(404).json(apiResponse(false, undefined, 'Not found'));
});

app.use((err: Error, _req: Request, res: Response) => {
  console.error('[ERROR]', err);
  res.status(500).json(apiResponse(false, undefined, err.message));
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[SHUTDOWN] SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(CONFIG.port, () => {
  console.log(`\n========================================`);
  console.log(`SUTAR DISCOVERY ENGINE`);
  console.log(`========================================`);
  console.log(`Port: ${CONFIG.port}`);
  console.log(`Environment: ${CONFIG.environment}`);
  console.log(`Agent Network: ${CONFIG.agentNetworkUrl}`);
  console.log(`Trust Engine: ${CONFIG.trustEngineUrl}`);
  console.log(`========================================\n`);
});

export default app;
