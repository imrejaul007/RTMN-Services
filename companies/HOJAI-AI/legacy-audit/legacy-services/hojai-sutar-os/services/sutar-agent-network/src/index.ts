// ============================================================================
// SUTAR Agent Network - Main Entry Point (Expanded)
// ============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

// Types
import {
  Agent,
  AgentStatus,
  AgentCapability,
  AgentProfile,
  ApiResponse,
  MarketplaceListing,
  Team,
  Task,
  PerformanceMetrics,
  Message,
  MessageThread,
  Notification,
  Certification,
  AgentCertification,
  Capability,
  SkillMatchRequest,
  TaskRoutingRequest,
  MarketplaceListingRequest,
  TeamCreateRequest,
} from './types/index.js';

// Services
import { agentProfileService } from './services/AgentProfileService.js';
import { capabilityRegistryService } from './services/CapabilityRegistryService.js';
import { skillMatchingService } from './services/SkillMatchingService.js';
import { teamService } from './services/TeamService.js';
import { performanceTrackingService } from './services/PerformanceTrackingService.js';
import { marketplaceService } from './services/MarketplaceService.js';
import { certificationService } from './services/CertificationService.js';
import { communicationService } from './services/CommunicationService.js';
import { taskRoutingService } from './services/TaskRoutingService.js';
import { decisionEngineIntegrationService } from './services/DecisionEngineIntegrationService.js';

// ============================================================================
// APP SETUP
// ============================================================================

const agents = new Map<string, Agent>();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4155;
const START_TIME = Date.now();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'] }));
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, error: 'Too many requests' },
});
app.use('/api/', limiter);

app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('X-Request-ID', requestId);
  (req as any).requestId = requestId;
  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000 || res.statusCode >= 400) {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          method: req.method,
          path: req.path,
          status: res.statusCode,
          duration,
        })
      );
    }
  });
  next();
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const apiResponse = <T>(
  success: boolean,
  data?: T,
  error?: string,
  requestId?: string
): ApiResponse<T> => ({
  success,
  data,
  error,
  timestamp: new Date().toISOString(),
  requestId,
});

const paginatedResponse = <T>(
  items: T[],
  total: number,
  limit: number,
  offset: number,
  requestId?: string
) => ({
  success: true,
  data: {
    items,
    total,
    limit,
    offset,
    hasMore: offset + items.length < total,
  },
  timestamp: new Date().toISOString(),
  requestId,
});

// ============================================================================
// HEALTH ENDPOINTS
// ============================================================================

app.get('/health', (_req: Request, res: Response) => {
  res.json(
    apiResponse(true, {
      status: 'healthy',
      service: 'sutar-agent-network',
      version: '2.0.0',
      uptime: Math.floor((Date.now() - START_TIME) / 1000),
      features: [
        'agent-profiles',
        'capability-registry',
        'skill-matching',
        'team-collaboration',
        'performance-tracking',
        'marketplace',
        'certification',
        'communication',
        'task-routing',
        'decision-engine',
      ],
    })
  );
});

app.get('/health/ready', (_req: Request, res: Response) => {
  res.json(
    apiResponse(true, {
      ready: true,
      services: {
        agents: agents.size,
        profiles: agentProfileService.getProfileCount(),
        teams: teamService.getAllTeams().length,
        tasks: taskRoutingService.getAllTasks().length,
      },
    })
  );
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json(apiResponse(true, { alive: true }));
});

// ============================================================================
// AGENT MANAGEMENT ENDPOINTS (Existing + Expanded)
// ============================================================================

// Create Agent
app.post('/api/v1/agents', (req: Request, res: Response) => {
  try {
    const { name, type, description, capabilities, skills, hourlyRate, metadata } = req.body;

    if (!name || !type || !capabilities) {
      res.status(400).json(apiResponse(false, undefined, 'Missing required fields: name, type, capabilities'));
      return;
    }

    const agent: Agent = {
      id: `agent-${uuidv4()}`,
      name,
      type,
      description: description || '',
      capabilities,
      skills: skills || [],
      status: 'available',
      rating: 5.0,
      completedTasks: 0,
      successRate: 100,
      hourlyRate,
      metadata: metadata || {},
      registeredAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };

    agents.set(agent.id, agent);

    // Initialize performance metrics
    performanceTrackingService.initializeMetrics(agent.id);

    console.log(`[AGENT] Registered: ${agent.id} - ${agent.name}`);
    res.status(201).json(apiResponse(true, agent, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// List Agents
app.get('/api/v1/agents', (req: Request, res: Response) => {
  const { status, capability, type, minRating, limit = 50, offset = 0 } = req.query;

  let result = Array.from(agents.values());

  if (status) {
    result = result.filter((a) => a.status === status);
  }
  if (capability) {
    result = result.filter((a) => a.capabilities.includes(capability as AgentCapability));
  }
  if (type) {
    result = result.filter((a) => a.type === type);
  }
  if (minRating) {
    result = result.filter((a) => a.rating >= Number(minRating));
  }

  result.sort((a, b) => b.rating - a.rating);

  const total = result.length;
  result = result.slice(Number(offset), Number(offset) + Number(limit));

  res.json(paginatedResponse(result, total, Number(limit), Number(offset), (req as any).requestId));
});

// Get Agent by ID
app.get('/api/v1/agents/:id', (req: Request, res: Response) => {
  const agent = agents.get(req.params.id);
  if (!agent) {
    res.status(404).json(apiResponse(false, undefined, 'Agent not found', (req as any).requestId));
    return;
  }

  // Enrich with additional data
  const enrichedAgent = {
    ...agent,
    profile: agentProfileService.getProfile(agent.id),
    capabilities: capabilityRegistryService.getAgentCapabilities(agent.id),
    metrics: performanceTrackingService.getMetrics(agent.id),
    certifications: certificationService.getAgentCertifications(agent.id),
  };

  res.json(apiResponse(true, enrichedAgent, undefined, (req as any).requestId));
});

// Update Agent Status
app.put('/api/v1/agents/:id/status', (req: Request, res: Response) => {
  const agent = agents.get(req.params.id);
  if (!agent) {
    res.status(404).json(apiResponse(false, undefined, 'Agent not found', (req as any).requestId));
    return;
  }

  const { status } = req.body;
  if (!['available', 'busy', 'offline', 'training'].includes(status)) {
    res.status(400).json(apiResponse(false, undefined, 'Invalid status', (req as any).requestId));
    return;
  }

  agent.status = status;
  agent.lastActive = new Date().toISOString();
  agents.set(agent.id, agent);

  res.json(apiResponse(true, agent, undefined, (req as any).requestId));
});

// ============================================================================
// AGENT PROFILE ENDPOINTS (NEW)
// ============================================================================

// Get Agent Profile
app.get('/api/v1/agents/:id/profile', (req: Request, res: Response) => {
  const agent = agents.get(req.params.id);
  if (!agent) {
    res.status(404).json(apiResponse(false, undefined, 'Agent not found', (req as any).requestId));
    return;
  }

  let profile = agentProfileService.getProfile(agent.id);

  // Create default profile if none exists
  if (!profile) {
    profile = agentProfileService.createProfile(agent.id, {
      displayName: agent.name,
      bio: agent.description,
    });
  }

  // Add completeness score
  const completeness = agentProfileService.getProfileCompleteness(agent.id);

  res.json(
    apiResponse(
      true,
      {
        ...profile,
        completeness,
        agentInfo: {
          id: agent.id,
          type: agent.type,
          rating: agent.rating,
          status: agent.status,
        },
      },
      undefined,
      (req as any).requestId
    )
  );
});

// Update Agent Profile
app.put('/api/v1/agents/:id/profile', (req: Request, res: Response) => {
  const agent = agents.get(req.params.id);
  if (!agent) {
    res.status(404).json(apiResponse(false, undefined, 'Agent not found', (req as any).requestId));
    return;
  }

  const profile = agentProfileService.updateProfile(agent.id, req.body);

  if (!profile) {
    // Create profile if it doesn't exist
    const newProfile = agentProfileService.createProfile(agent.id, req.body);
    res.json(apiResponse(true, newProfile, undefined, (req as any).requestId));
    return;
  }

  res.json(apiResponse(true, profile, undefined, (req as any).requestId));
});

// Search Profiles
app.get('/api/v1/profiles/search', (req: Request, res: Response) => {
  const { location, timezone, languages, specializations, minExperience, maxHourlyRate } = req.query;

  const profiles = agentProfileService.searchProfiles({
    location: location as string,
    timezone: timezone as string,
    languages: languages ? (languages as string).split(',') : undefined,
    specializations: specializations ? (specializations as string).split(',') : undefined,
    minExperience: minExperience ? Number(minExperience) : undefined,
    maxHourlyRate: maxHourlyRate ? Number(maxHourlyRate) : undefined,
  });

  res.json(
    paginatedResponse(
      profiles,
      profiles.length,
      Number(req.query.limit) || 50,
      Number(req.query.offset) || 0,
      (req as any).requestId
    )
  );
});

// ============================================================================
// CAPABILITY REGISTRY ENDPOINTS (NEW)
// ============================================================================

// Get All Capabilities
app.get('/api/v1/capabilities', (_req: Request, res: Response) => {
  const capabilities = capabilityRegistryService.getAllCapabilities();
  res.json(apiResponse(true, { capabilities }));
});

// Get Capability by Name
app.get('/api/v1/capabilities/:name', (req: Request, res: Response) => {
  const capability = capabilityRegistryService.getCapability(req.params.name);
  if (!capability) {
    res.status(404).json(apiResponse(false, undefined, 'Capability not found', (req as any).requestId));
    return;
  }

  const stats = capabilityRegistryService.getCapabilityStats(capability.name);
  res.json(apiResponse(true, { ...capability, stats }, undefined, (req as any).requestId));
});

// Register New Capability
app.post('/api/v1/capabilities', (req: Request, res: Response) => {
  const { name, description, category, level, tags, examples } = req.body;

  if (!name || !description || !category) {
    res.status(400).json(apiResponse(false, undefined, 'Missing required fields', (req as any).requestId));
    return;
  }

  const capability = capabilityRegistryService.registerCapability({
    name,
    description,
    category,
    level: level || 'basic',
    tags: tags || [],
    examples,
  });

  res.status(201).json(apiResponse(true, capability, undefined, (req as any).requestId));
});

// Get Agent Capabilities
app.get('/api/v1/agents/:id/capabilities', (req: Request, res: Response) => {
  const capabilities = capabilityRegistryService.getAgentCapabilities(req.params.id);
  res.json(apiResponse(true, { capabilities }, undefined, (req as any).requestId));
});

// Add Agent Capability
app.post('/api/v1/agents/:id/capabilities', (req: Request, res: Response) => {
  const agent = agents.get(req.params.id);
  if (!agent) {
    res.status(404).json(apiResponse(false, undefined, 'Agent not found', (req as any).requestId));
    return;
  }

  const { capabilityId, proficiencyLevel, experienceMonths, certified, certificationId } = req.body;

  if (!capabilityId || !proficiencyLevel) {
    res.status(400).json(apiResponse(false, undefined, 'Missing required fields', (req as any).requestId));
    return;
  }

  const capability = capabilityRegistryService.registerAgentCapability(req.params.id, capabilityId, {
    proficiencyLevel,
    experienceMonths,
    certified,
    certificationId,
  });

  // Update agent capabilities list
  if (!agent.capabilities.includes(capabilityId as AgentCapability)) {
    agent.capabilities.push(capabilityId as AgentCapability);
    agents.set(agent.id, agent);
  }

  res.status(201).json(apiResponse(true, capability, undefined, (req as any).requestId));
});

// Search Capabilities
app.get('/api/v1/capabilities/search', (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q) {
    res.status(400).json(apiResponse(false, undefined, 'Query parameter required', (req as any).requestId));
    return;
  }

  const capabilities = capabilityRegistryService.searchCapabilities(q as string);
  res.json(apiResponse(true, { capabilities }, undefined, (req as any).requestId));
});

// ============================================================================
// SKILL MATCHING ENDPOINTS (NEW)
// ============================================================================

// Match Agents to Task
app.post('/api/v1/agents/match', (req: Request, res: Response) => {
  const { capabilities, skills, preferredRating, maxHourlyRate, limit = 10 } = req.body;

  const allAgents = Array.from(agents.values());

  const request: SkillMatchRequest = {
    requiredCapabilities: capabilities,
    requiredSkills: skills,
    preferredRating,
    maxHourlyRate,
  };

  const matches = skillMatchingService.matchAgentsToTask(allAgents, request, limit);

  // Record match for analytics
  const requestId = (req as any).requestId;
  skillMatchingService.recordMatch(requestId, matches);

  res.json(
    apiResponse(
      true,
      {
        matches: matches.map((m) => ({
          agent: m.agent,
          score: m.score,
          matchedCapabilities: m.matchedCapabilities,
          matchedSkills: m.matchedSkills,
          reasons: m.reasons,
          confidence: m.confidence,
        })),
        totalMatches: matches.length,
      },
      undefined,
      requestId
    )
  );
});

// Find Best Agent
app.post('/api/v1/agents/match/best', (req: Request, res: Response) => {
  const { capabilities, skills, maxHourlyRate } = req.body;

  const allAgents = Array.from(agents.values());
  const bestMatch = skillMatchingService.findBestAgent(allAgents, {
    requiredCapabilities: capabilities,
    requiredSkills: skills,
    maxHourlyRate,
  });

  if (!bestMatch) {
    res.status(404).json(apiResponse(false, undefined, 'No matching agent found', (req as any).requestId));
    return;
  }

  res.json(apiResponse(true, bestMatch, undefined, (req as any).requestId));
});

// Find Similar Agents
app.get('/api/v1/agents/:id/similar', (req: Request, res: Response) => {
  const agent = agents.get(req.params.id);
  if (!agent) {
    res.status(404).json(apiResponse(false, undefined, 'Agent not found', (req as any).requestId));
    return;
  }

  const allAgents = Array.from(agents.values());
  const similarAgents = skillMatchingService.findSimilarAgents(agent, allAgents, Number(req.query.limit) || 5);

  res.json(apiResponse(true, { similarAgents }, undefined, (req as any).requestId));
});

// Get Match Statistics
app.get('/api/v1/match/statistics', (_req: Request, res: Response) => {
  const stats = skillMatchingService.getMatchStatistics();
  res.json(apiResponse(true, stats));
});

// ============================================================================
// TEAM ENDPOINTS (NEW)
// ============================================================================

// Create Team
app.post('/api/v1/teams', (req: Request, res: Response) => {
  const { name, description, leaderId, projectDescription, requiredCapabilities, requiredSkills, maxTeamSize } =
    req.body;

  if (!name || !leaderId) {
    res.status(400).json(apiResponse(false, undefined, 'Missing required fields: name, leaderId', (req as any).requestId));
    return;
  }

  const team = teamService.createTeam({
    name,
    description: description || '',
    leaderId,
    projectDescription,
    requiredCapabilities: requiredCapabilities || [],
    requiredSkills: requiredSkills || [],
    maxTeamSize: maxTeamSize || 5,
  });

  res.status(201).json(apiResponse(true, team, undefined, (req as any).requestId));
});

// Get Team by ID
app.get('/api/v1/teams/:id', (req: Request, res: Response) => {
  const team = teamService.getTeam(req.params.id);
  if (!team) {
    res.status(404).json(apiResponse(false, undefined, 'Team not found', (req as any).requestId));
    return;
  }

  // Get full team data with memberships
  const memberships = teamService.getTeamMemberships(team.id);
  res.json(apiResponse(true, { ...team, memberships }, undefined, (req as any).requestId));
});

// List Teams
app.get('/api/v1/teams', (req: Request, res: Response) => {
  const { status, agentId } = req.query;
  let teams: Team[];

  if (agentId) {
    teams = teamService.getTeamsForAgent(agentId as string);
  } else if (status) {
    teams = teamService.getTeamsByStatus(status as Team['status']);
  } else {
    teams = teamService.getAllTeams();
  }

  res.json(
    paginatedResponse(
      teams,
      teams.length,
      Number(req.query.limit) || 50,
      Number(req.query.offset) || 0,
      (req as any).requestId
    )
  );
});

// Update Team
app.put('/api/v1/teams/:id', (req: Request, res: Response) => {
  const team = teamService.updateTeam(req.params.id, req.body);
  if (!team) {
    res.status(404).json(apiResponse(false, undefined, 'Team not found', (req as any).requestId));
    return;
  }

  res.json(apiResponse(true, team, undefined, (req as any).requestId));
});

// Add Member to Team
app.post('/api/v1/teams/:id/members', (req: Request, res: Response) => {
  const { agentId, role } = req.body;

  if (!agentId) {
    res.status(400).json(apiResponse(false, undefined, 'agentId required', (req as any).requestId));
    return;
  }

  const membership = teamService.addMember(req.params.id, agentId, role || 'member');
  if (!membership) {
    res.status(400).json(apiResponse(false, undefined, 'Cannot add member (team full or agent already in team)', (req as any).requestId));
    return;
  }

  res.status(201).json(apiResponse(true, membership, undefined, (req as any).requestId));
});

// Remove Member from Team
app.delete('/api/v1/teams/:id/members/:agentId', (req: Request, res: Response) => {
  const success = teamService.removeMember(req.params.id, req.params.agentId);
  if (!success) {
    res.status(400).json(apiResponse(false, undefined, 'Cannot remove member', (req as any).requestId));
    return;
  }

  res.json(apiResponse(true, { removed: true }, undefined, (req as any).requestId));
});

// Activate/Complete/Disband Team
app.post('/api/v1/teams/:id/activate', (req: Request, res: Response) => {
  const team = teamService.activateTeam(req.params.id);
  if (!team) {
    res.status(404).json(apiResponse(false, undefined, 'Team not found', (req as any).requestId));
    return;
  }

  res.json(apiResponse(true, team, undefined, (req as any).requestId));
});

app.post('/api/v1/teams/:id/complete', (req: Request, res: Response) => {
  const team = teamService.completeTeam(req.params.id);
  if (!team) {
    res.status(404).json(apiResponse(false, undefined, 'Team not found', (req as any).requestId));
    return;
  }

  res.json(apiResponse(true, team, undefined, (req as any).requestId));
});

app.post('/api/v1/teams/:id/disband', (req: Request, res: Response) => {
  const success = teamService.disbandTeam(req.params.id);
  if (!success) {
    res.status(404).json(apiResponse(false, undefined, 'Team not found', (req as any).requestId));
    return;
  }

  res.json(apiResponse(true, { disbanded: true }, undefined, (req as any).requestId));
});

// Get Team Statistics
app.get('/api/v1/teams/statistics', (_req: Request, res: Response) => {
  const stats = teamService.getTeamStatistics();
  res.json(apiResponse(true, stats));
});

// ============================================================================
// PERFORMANCE TRACKING ENDPOINTS (NEW)
// ============================================================================

// Get Agent Metrics
app.get('/api/v1/agents/:id/metrics', (req: Request, res: Response) => {
  const agent = agents.get(req.params.id);
  if (!agent) {
    res.status(404).json(apiResponse(false, undefined, 'Agent not found', (req as any).requestId));
    return;
  }

  const performance = performanceTrackingService.getPerformanceSummary(agent.id);
  res.json(apiResponse(true, performance, undefined, (req as any).requestId));
});

// Record Task Completion
app.post('/api/v1/agents/:id/tasks/complete', (req: Request, res: Response) => {
  const { assignmentId, quality, feedback, actualDuration } = req.body;

  const assignment = performanceTrackingService.completeTask(assignmentId, {
    quality: quality || 5,
    feedback,
    actualDuration,
  });

  if (!assignment) {
    res.status(404).json(apiResponse(false, undefined, 'Assignment not found', (req as any).requestId));
    return;
  }

  res.json(apiResponse(true, assignment, undefined, (req as any).requestId));
});

// Get Task Assignments
app.get('/api/v1/agents/:id/assignments', (req: Request, res: Response) => {
  const { status } = req.query;
  const assignments = performanceTrackingService.getTaskAssignments(req.params.id, status as any);

  res.json(
    paginatedResponse(
      assignments,
      assignments.length,
      Number(req.query.limit) || 50,
      Number(req.query.offset) || 0,
      (req as any).requestId
    )
  );
});

// Get Top Performers
app.get('/api/v1/performance/top', (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 10;
  const topPerformers = performanceTrackingService.getTopPerformers(limit);

  // Enrich with agent data
  const enriched = topPerformers.map((p) => {
    const agent = agents.get(p.agentId);
    return {
      ...p,
      agent,
    };
  });

  res.json(apiResponse(true, { topPerformers: enriched }, undefined, (req as any).requestId));
});

// Compare Agents
app.post('/api/v1/performance/compare', (req: Request, res: Response) => {
  const { agentIds } = req.body;

  if (!agentIds || !Array.isArray(agentIds)) {
    res.status(400).json(apiResponse(false, undefined, 'agentIds array required', (req as any).requestId));
    return;
  }

  const comparison = performanceTrackingService.compareAgents(agentIds);
  res.json(apiResponse(true, comparison, undefined, (req as any).requestId));
});

// ============================================================================
// MARKETPLACE ENDPOINTS (NEW)
// ============================================================================

// List in Marketplace
app.post('/api/v1/marketplace/list', (req: Request, res: Response) => {
  const agent = agents.get(req.body.agentId);
  if (!agent) {
    res.status(404).json(apiResponse(false, undefined, 'Agent not found', (req as any).requestId));
    return;
  }

  const listing = marketplaceService.createListing(req.body.agentId, {
    title: req.body.title || `${agent.name} Services`,
    description: req.body.description || agent.description,
    services: req.body.services || [],
    pricing: req.body.pricing || {
      hourlyRate: agent.hourlyRate,
      currency: 'USD',
      negotiable: true,
    },
    availability: req.body.availability || {
      availableNow: agent.status === 'available',
    },
  });

  res.status(201).json(apiResponse(true, listing, undefined, (req as any).requestId));
});

// Browse Marketplace
app.get('/api/v1/marketplace', (req: Request, res: Response) => {
  const { minRating, maxPrice, availability, featured, skills, limit = 50, offset = 0 } = req.query;

  const listings = marketplaceService.getAllListings({
    minRating: minRating ? Number(minRating) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    availability: availability as any,
    featured: featured === 'true',
    skills: skills ? (skills as string).split(',') : undefined,
  });

  const total = listings.length;
  const paginatedListings = listings.slice(Number(offset), Number(offset) + Number(limit));

  res.json(
    paginatedResponse(paginatedListings, total, Number(limit), Number(offset), (req as any).requestId)
  );
});

// Get Marketplace Listing
app.get('/api/v1/marketplace/:id', (req: Request, res: Response) => {
  const listing = marketplaceService.getListing(req.params.id);
  if (!listing) {
    res.status(404).json(apiResponse(false, undefined, 'Listing not found', (req as any).requestId));
    return;
  }

  // Record view
  marketplaceService.recordView(req.params.id);

  // Get agent info
  const agent = agents.get(listing.agentId);

  res.json(
    apiResponse(
      true,
      {
        ...listing,
        agent: agent
          ? {
              id: agent.id,
              name: agent.name,
              rating: agent.rating,
              completedTasks: agent.completedTasks,
            }
          : null,
      },
      undefined,
      (req as any).requestId
    )
  );
});

// Update Marketplace Listing
app.put('/api/v1/marketplace/:id', (req: Request, res: Response) => {
  const listing = marketplaceService.updateListing(req.params.id, req.body);
  if (!listing) {
    res.status(404).json(apiResponse(false, undefined, 'Listing not found', (req as any).requestId));
    return;
  }

  res.json(apiResponse(true, listing, undefined, (req as any).requestId));
});

// Pause/Resume Listing
app.post('/api/v1/marketplace/:id/pause', (req: Request, res: Response) => {
  const listing = marketplaceService.pauseListing(req.params.id);
  if (!listing) {
    res.status(404).json(apiResponse(false, undefined, 'Listing not found', (req as any).requestId));
    return;
  }

  res.json(apiResponse(true, listing, undefined, (req as any).requestId));
});

app.post('/api/v1/marketplace/:id/resume', (req: Request, res: Response) => {
  const listing = marketplaceService.resumeListing(req.params.id);
  if (!listing) {
    res.status(404).json(apiResponse(false, undefined, 'Listing not found', (req as any).requestId));
    return;
  }

  res.json(apiResponse(true, listing, undefined, (req as any).requestId));
});

// Get Featured/Trending Listings
app.get('/api/v1/marketplace/featured', (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 10;
  const listings = marketplaceService.getFeaturedListings(limit);
  res.json(apiResponse(true, { listings }, undefined, (req as any).requestId));
});

app.get('/api/v1/marketplace/trending', (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 10;
  const listings = marketplaceService.getTrendingListings(limit);
  res.json(apiResponse(true, { listings }, undefined, (req as any).requestId));
});

// Search Marketplace
app.get('/api/v1/marketplace/search', (req: Request, res: Response) => {
  const { q, limit = 20 } = req.query;
  if (!q) {
    res.status(400).json(apiResponse(false, undefined, 'Query required', (req as any).requestId));
    return;
  }

  const listings = marketplaceService.searchListings(q as string, Number(limit));
  res.json(apiResponse(true, { listings }, undefined, (req as any).requestId));
});

// Get Marketplace Statistics
app.get('/api/v1/marketplace/statistics', (_req: Request, res: Response) => {
  const stats = marketplaceService.getMarketplaceStats();
  res.json(apiResponse(true, stats));
});

// ============================================================================
// CERTIFICATION ENDPOINTS (NEW)
// ============================================================================

// Get All Certifications
app.get('/api/v1/certifications', (req: Request, res: Response) => {
  const { category, level } = req.query;

  let certifications: Certification[];

  if (category) {
    certifications = certificationService.getCertificationsByCategory(category as string);
  } else if (level) {
    certifications = certificationService.getCertificationsByLevel(level as any);
  } else {
    certifications = certificationService.getAllCertifications();
  }

  res.json(apiResponse(true, { certifications }, undefined, (req as any).requestId));
});

// Certify Agent
app.post('/api/v1/agents/:id/certify', (req: Request, res: Response) => {
  const agent = agents.get(req.params.id);
  if (!agent) {
    res.status(404).json(apiResponse(false, undefined, 'Agent not found', (req as any).requestId));
    return;
  }

  const { certificationId, level, score } = req.body;

  if (!certificationId) {
    res.status(400).json(apiResponse(false, undefined, 'certificationId required', (req as any).requestId));
    return;
  }

  const certification = certificationService.certifyAgent(req.params.id, certificationId, {
    level,
    score,
    verifiedBy: req.body.verifiedBy,
  });

  if (!certification) {
    res.status(404).json(apiResponse(false, undefined, 'Certification not found', (req as any).requestId));
    return;
  }

  // Update profile certifications
  agentProfileService.addCertification(req.params.id, certification.certificationName);

  res.status(201).json(apiResponse(true, certification, undefined, (req as any).requestId));
});

// Get Agent Certifications
app.get('/api/v1/agents/:id/certifications', (req: Request, res: Response) => {
  const certifications = certificationService.getAgentCertifications(req.params.id);
  res.json(apiResponse(true, { certifications }, undefined, (req as any).requestId));
});

// Verify Certification
app.post('/api/v1/agents/:id/certifications/:certificationId/verify', (req: Request, res: Response) => {
  const { verifiedBy } = req.body;

  const certification = certificationService.verifyCertification(req.params.id, req.params.certificationId, verifiedBy);
  if (!certification) {
    res.status(404).json(apiResponse(false, undefined, 'Certification not found', (req as any).requestId));
    return;
  }

  // Update profile verification
  agentProfileService.updateVerificationStatus(req.params.id, { skills: true });

  res.json(apiResponse(true, certification, undefined, (req as any).requestId));
});

// Revoke Certification
app.post('/api/v1/agents/:id/certifications/:certificationId/revoke', (req: Request, res: Response) => {
  const certification = certificationService.revokeCertification(
    req.params.id,
    req.params.certificationId,
    req.body.reason
  );
  if (!certification) {
    res.status(404).json(apiResponse(false, undefined, 'Certification not found', (req as any).requestId));
    return;
  }

  res.json(apiResponse(true, certification, undefined, (req as any).requestId));
});

// Get Certification Statistics
app.get('/api/v1/certifications/statistics', (_req: Request, res: Response) => {
  const stats = certificationService.getCertificationStats();
  res.json(apiResponse(true, stats));
});

// ============================================================================
// COMMUNICATION ENDPOINTS (NEW)
// ============================================================================

// Send Message
app.post('/api/v1/agents/:id/message', (req: Request, res: Response) => {
  const { recipientId, subject, content, priority, attachments } = req.body;

  if (!recipientId || !subject || !content) {
    res.status(400).json(apiResponse(false, undefined, 'recipientId, subject, and content required', (req as any).requestId));
    return;
  }

  const message = communicationService.sendMessage({
    senderId: req.params.id,
    recipientId,
    subject,
    content,
    priority: priority || 'normal',
    attachments,
  });

  res.status(201).json(apiResponse(true, message, undefined, (req as any).requestId));
});

// Create/Get Message Thread
app.post('/api/v1/threads', (req: Request, res: Response) => {
  const { participants, subject, initialMessage, labels } = req.body;

  if (!participants || !Array.isArray(participants) || participants.length < 2 || !subject) {
    res.status(400).json(apiResponse(false, undefined, 'participants array and subject required', (req as any).requestId));
    return;
  }

  const thread = communicationService.createThread({
    participants,
    subject,
    initialMessage,
    labels,
  });

  res.status(201).json(apiResponse(true, thread, undefined, (req as any).requestId));
});

app.get('/api/v1/threads', (req: Request, res: Response) => {
  const { participantId, includeArchived } = req.query;

  if (!participantId) {
    res.status(400).json(apiResponse(false, undefined, 'participantId required', (req as any).requestId));
    return;
  }

  const threads = communicationService.getThreadsForParticipant(
    participantId as string,
    includeArchived === 'true'
  );

  res.json(paginatedResponse(threads, threads.length, Number(req.query.limit) || 50, Number(req.query.offset) || 0));
});

app.get('/api/v1/threads/:id', (req: Request, res: Response) => {
  const thread = communicationService.getThread(req.params.id);
  if (!thread) {
    res.status(404).json(apiResponse(false, undefined, 'Thread not found', (req as any).requestId));
    return;
  }

  const messages = communicationService.getMessagesForThread(
    req.params.id,
    Number(req.query.limit) || 50,
    Number(req.query.offset) || 0
  );

  res.json(apiResponse(true, { ...thread, messages }, undefined, (req as any).requestId));
});

// Get Messages for Agent
app.get('/api/v1/agents/:id/messages', (req: Request, res: Response) => {
  const { status } = req.query;
  const messages = communicationService.getMessagesForAgent(req.params.id, status as any);

  res.json(
    paginatedResponse(messages, messages.length, Number(req.query.limit) || 50, Number(req.query.offset) || 0)
  );
});

// Mark Message as Read
app.post('/api/v1/messages/:id/read', (req: Request, res: Response) => {
  const { agentId } = req.body;
  const message = communicationService.markAsRead(req.params.id, agentId);

  if (!message) {
    res.status(404).json(apiResponse(false, undefined, 'Message not found', (req as any).requestId));
    return;
  }

  res.json(apiResponse(true, message, undefined, (req as any).requestId));
});

// Get Notifications
app.get('/api/v1/agents/:id/notifications', (req: Request, res: Response) => {
  const { unreadOnly } = req.query;
  const notifications = communicationService.getNotifications(req.params.id, unreadOnly === 'true');

  res.json(
    paginatedResponse(notifications, notifications.length, Number(req.query.limit) || 50, Number(req.query.offset) || 0)
  );
});

// Mark Notification as Read
app.post('/api/v1/notifications/:id/read', (req: Request, res: Response) => {
  const notification = communicationService.markNotificationAsRead(req.params.id);
  if (!notification) {
    res.status(404).json(apiResponse(false, undefined, 'Notification not found', (req as any).requestId));
    return;
  }

  res.json(apiResponse(true, notification, undefined, (req as any).requestId));
});

// Get Communication Statistics
app.get('/api/v1/agents/:id/communication/stats', (req: Request, res: Response) => {
  const stats = communicationService.getCommunicationStats(req.params.id);
  res.json(apiResponse(true, stats, undefined, (req as any).requestId));
});

// Search Messages
app.get('/api/v1/messages/search', (req: Request, res: Response) => {
  const { agentId, q, limit = 20 } = req.query;

  if (!agentId || !q) {
    res.status(400).json(apiResponse(false, undefined, 'agentId and q required', (req as any).requestId));
    return;
  }

  const messages = communicationService.searchMessages(agentId as string, q as string, Number(limit));
  res.json(apiResponse(true, { messages }, undefined, (req as any).requestId));
});

// ============================================================================
// TASK ROUTING ENDPOINTS (NEW)
// ============================================================================

// Create Task
app.post('/api/v1/tasks', (req: Request, res: Response) => {
  const {
    title,
    description,
    requirements,
    priority,
    budget,
    deadline,
    estimatedDuration,
    teamRequired,
    maxTeamSize,
  } = req.body;

  if (!title || !description || !requirements) {
    res.status(400).json(apiResponse(false, undefined, 'Missing required fields', (req as any).requestId));
    return;
  }

  const task = taskRoutingService.createTask({
    title,
    description,
    requirements,
    priority: priority || 'medium',
    budget,
    deadline,
    estimatedDuration,
    teamRequired: teamRequired || false,
    maxTeamSize,
  });

  res.status(201).json(apiResponse(true, task, undefined, (req as any).requestId));
});

// Get Task
app.get('/api/v1/tasks/:id', (req: Request, res: Response) => {
  const task = taskRoutingService.getTask(req.params.id);
  if (!task) {
    res.status(404).json(apiResponse(false, undefined, 'Task not found', (req as any).requestId));
    return;
  }

  // Get potential matches
  const matches = taskRoutingService.getTaskMatches(req.params.id);

  res.json(apiResponse(true, { ...task, potentialMatches: matches }, undefined, (req as any).requestId));
});

// List Tasks
app.get('/api/v1/tasks', (req: Request, res: Response) => {
  const { status, priority, agentId } = req.query;
  let tasks: Task[];

  if (agentId) {
    tasks = taskRoutingService.getTasksForAgent(agentId as string);
  } else if (status) {
    tasks = taskRoutingService.getAllTasks(status as Task['status']);
  } else if (priority) {
    tasks = taskRoutingService.getTasksByPriority(priority as any);
  } else {
    tasks = taskRoutingService.getAllTasks();
  }

  res.json(
    paginatedResponse(tasks, tasks.length, Number(req.query.limit) || 50, Number(req.query.offset) || 0)
  );
});

// Find Best Agents for Task
app.post('/api/v1/tasks/:id/find-agents', (req: Request, res: Response) => {
  const task = taskRoutingService.getTask(req.params.id);
  if (!task) {
    res.status(404).json(apiResponse(false, undefined, 'Task not found', (req as any).requestId));
    return;
  }

  const allAgents = Array.from(agents.values());
  const matches = taskRoutingService.findBestAgents(req.params.id, allAgents, Number(req.query.limit) || 5);

  res.json(apiResponse(true, { matches }, undefined, (req as any).requestId));
});

// Assign Task to Agent
app.post('/api/v1/tasks/:id/assign', (req: Request, res: Response) => {
  const { agentId } = req.body;

  if (!agentId) {
    res.status(400).json(apiResponse(false, undefined, 'agentId required', (req as any).requestId));
    return;
  }

  const task = taskRoutingService.assignTaskToAgent(req.params.id, agentId);
  if (!task) {
    res.status(404).json(apiResponse(false, undefined, 'Task or agent not found', (req as any).requestId));
    return;
  }

  res.json(apiResponse(true, task, undefined, (req as any).requestId));
});

// Assign Task to Team
app.post('/api/v1/tasks/:id/assign-team', (req: Request, res: Response) => {
  const { teamId } = req.body;

  if (!teamId) {
    res.status(400).json(apiResponse(false, undefined, 'teamId required', (req as any).requestId));
    return;
  }

  const task = taskRoutingService.assignTaskToTeam(req.params.id, teamId);
  if (!task) {
    res.status(404).json(apiResponse(false, undefined, 'Task not found', (req as any).requestId));
    return;
  }

  res.json(apiResponse(true, task, undefined, (req as any).requestId));
});

// Update Task Status
app.put('/api/v1/tasks/:id/status', (req: Request, res: Response) => {
  const { status } = req.body;
  let task;

  switch (status) {
    case 'in_progress':
      task = taskRoutingService.startTask(req.params.id);
      break;
    case 'completed':
      task = taskRoutingService.completeTask(req.params.id);
      break;
    case 'failed':
      task = taskRoutingService.failTask(req.params.id);
      break;
    case 'cancelled':
      task = taskRoutingService.cancelTask(req.params.id);
      break;
    default:
      res.status(400).json(apiResponse(false, undefined, 'Invalid status', (req as any).requestId));
      return;
  }

  if (!task) {
    res.status(404).json(apiResponse(false, undefined, 'Task not found', (req as any).requestId));
    return;
  }

  res.json(apiResponse(true, task, undefined, (req as any).requestId));
});

// Auto-route Task
app.post('/api/v1/tasks/:id/auto-route', (req: Request, res: Response) => {
  const allAgents = Array.from(agents.values());
  const task = taskRoutingService.autoRouteTask(req.params.id, allAgents);

  if (!task) {
    res.status(400).json(apiResponse(false, undefined, 'Could not auto-route task', (req as any).requestId));
    return;
  }

  res.json(apiResponse(true, task, undefined, (req as any).requestId));
});

// Get Agent Workload
app.get('/api/v1/agents/:id/workload', (req: Request, res: Response) => {
  const workload = taskRoutingService.getAgentWorkload(req.params.id);
  res.json(apiResponse(true, workload, undefined, (req as any).requestId));
});

// Get Task Statistics
app.get('/api/v1/tasks/statistics', (_req: Request, res: Response) => {
  const stats = taskRoutingService.getTaskStatistics();
  res.json(apiResponse(true, stats));
});

// ============================================================================
// DECISION ENGINE INTEGRATION ENDPOINTS (NEW)
// ============================================================================

// Make Decision
app.post('/api/v1/decisions', async (req: Request, res: Response) => {
  const { options, context, constraints } = req.body;

  if (!options || !Array.isArray(options)) {
    res.status(400).json(apiResponse(false, undefined, 'options array required', (req as any).requestId));
    return;
  }

  try {
    const response = await decisionEngineIntegrationService.makeDecision({
      requestId: (req as any).requestId,
      context: context || {},
      options,
      constraints,
    });

    res.json(apiResponse(true, response, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// Select Best Agent (Decision Engine)
app.post('/api/v1/decisions/select-agent', async (req: Request, res: Response) => {
  const { taskId, agentIds } = req.body;

  if (!taskId || !agentIds || !Array.isArray(agentIds)) {
    res.status(400).json(apiResponse(false, undefined, 'taskId and agentIds required', (req as any).requestId));
    return;
  }

  const task = taskRoutingService.getTask(taskId);
  if (!task) {
    res.status(404).json(apiResponse(false, undefined, 'Task not found', (req as any).requestId));
    return;
  }

  const selectedAgents = agentIds.map((id: string) => agents.get(id)).filter((a): a is Agent => a !== undefined);

  if (selectedAgents.length === 0) {
    res.status(400).json(apiResponse(false, undefined, 'No valid agents found', (req as any).requestId));
    return;
  }

  try {
    const result = await decisionEngineIntegrationService.selectBestAgent(task, selectedAgents);

    if (!result) {
      res.status(404).json(apiResponse(false, undefined, 'Could not select agent', (req as any).requestId));
      return;
    }

    res.json(apiResponse(true, result, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// Select Best Team (Decision Engine)
app.post('/api/v1/decisions/select-team', async (req: Request, res: Response) => {
  const { requirements, agentIds, maxTeamSize } = req.body;

  if (!requirements || !agentIds || !Array.isArray(agentIds)) {
    res.status(400).json(apiResponse(false, undefined, 'requirements and agentIds required', (req as any).requestId));
    return;
  }

  const selectedAgents = agentIds.map((id: string) => agents.get(id)).filter((a): a is Agent => a !== undefined);

  try {
    const result = await decisionEngineIntegrationService.selectBestTeam(
      requirements,
      selectedAgents,
      maxTeamSize || 5
    );

    res.json(apiResponse(true, result, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// Evaluate Success Probability
app.post('/api/v1/decisions/evaluate-probability', async (req: Request, res: Response) => {
  const { taskId, agentId } = req.body;

  if (!taskId || !agentId) {
    res.status(400).json(apiResponse(false, undefined, 'taskId and agentId required', (req as any).requestId));
    return;
  }

  const task = taskRoutingService.getTask(taskId);
  const agent = agents.get(agentId);

  if (!task || !agent) {
    res.status(404).json(apiResponse(false, undefined, 'Task or agent not found', (req as any).requestId));
    return;
  }

  try {
    const result = await decisionEngineIntegrationService.evaluateSuccessProbability(task, agent);
    res.json(apiResponse(true, result, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// Get Decision Statistics
app.get('/api/v1/decisions/statistics', (_req: Request, res: Response) => {
  const stats = decisionEngineIntegrationService.getDecisionStatistics();
  res.json(apiResponse(true, stats));
});

// Check Decision Engine Availability
app.get('/api/v1/decisions/health', async (_req: Request, res: Response) => {
  const available = await decisionEngineIntegrationService.isEngineAvailable();
  res.json(
    apiResponse(true, {
      externalEngineAvailable: available,
      usingLocalFallback: !available,
    })
  );
});

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

// Get Service Statistics
app.get('/api/v1/stats', (_req: Request, res: Response) => {
  res.json(
    apiResponse(true, {
      agents: {
        total: agents.size,
        available: Array.from(agents.values()).filter((a) => a.status === 'available').length,
        busy: Array.from(agents.values()).filter((a) => a.status === 'busy').length,
        offline: Array.from(agents.values()).filter((a) => a.status === 'offline').length,
      },
      profiles: agentProfileService.getProfileCount(),
      capabilities: {
        registered: capabilityRegistryService.getRegisteredCapabilityNames().length,
        agentCapabilities: Array.from(agents.values()).reduce(
          (sum, a) => sum + a.capabilities.length,
          0
        ),
      },
      teams: teamService.getTeamStatistics(),
      marketplace: marketplaceService.getMarketplaceStats(),
      certifications: certificationService.getCertificationStats(),
      tasks: taskRoutingService.getTaskStatistics(),
      decisions: decisionEngineIntegrationService.getDecisionStatistics(),
    })
  );
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((_req: Request, res: Response) => {
  res.status(404).json(apiResponse(false, undefined, 'Not found'));
});

app.use((err: Error, _req: Request, res: Response) => {
  console.error('Error:', err);
  res.status(500).json(apiResponse(false, undefined, err.message));
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   SUTAR AGENT NETWORK SERVICE v2.0.0                          ║
║   ─────────────────────────────────────────────                ║
║                                                               ║
║   Port: ${PORT}                                                    ║
║   Status: Running                                              ║
║                                                               ║
║   Features:                                                    ║
║   • Agent Profiles & Management                                ║
║   • Capability Registry                                        ║
║   • Skill Matching Engine                                       ║
║   • Team Collaboration                                          ║
║   • Performance Tracking                                        ║
║   • Agent Marketplace                                          ║
║   • Certification System                                       ║
║   • Agent Communication                                         ║
║   • Task Routing                                               ║
║   • Decision Engine Integration (port 4240)                    ║
║                                                               ║
║   Endpoints:                                                   ║
║   • GET  /health - Health check                                ║
║   • POST /api/v1/agents - Create agent                         ║
║   • GET  /api/v1/agents - List agents                         ║
║   • GET  /api/v1/agents/:id/profile - Get profile             ║
║   • PUT  /api/v1/agents/:id/profile - Update profile          ║
║   • POST /api/v1/agents/:id/capabilities - Add capability     ║
║   • POST /api/v1/agents/match - Match agents to task         ║
║   • POST /api/v1/teams - Create team                          ║
║   • GET  /api/v1/agents/:id/metrics - Performance metrics    ║
║   • POST /api/v1/marketplace/list - List in marketplace     ║
║   • GET  /api/v1/marketplace - Browse marketplace            ║
║   • POST /api/v1/agents/:id/certify - Certify agent          ║
║   • POST /api/v1/agents/:id/message - Send message            ║
║   • POST /api/v1/decisions - Make decision                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
