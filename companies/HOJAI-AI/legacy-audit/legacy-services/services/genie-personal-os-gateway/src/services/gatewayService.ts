/**
 * GENIE Personal OS Gateway - Gateway Service
 * Version: 1.0.0 | Date: June 13, 2026
 * Purpose: Orchestrates all Genie services
 */

import axios, { AxiosInstance } from 'axios';
import { createLogger } from '../utils/logger.js';
import {
  PersonalContext,
  UnifiedSearchResult,
  AICompanionRequest,
  AICompanionResponse,
  MemorySummary,
  RelationshipSummary,
  MeetingSummary,
  BriefingSummary,
} from '../types.js';

const logger = createLogger('gateway-service');

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  genieMemory: process.env.GENIE_MEMORY || 'http://localhost:4703',
  genieRelationship: process.env.GENIE_RELATIONSHIP || 'http://localhost:4704',
  genieBriefing: process.env.GENIE_BRIEFING || 'http://localhost:4706',
  genieMeeting: process.env.GENIE_MEETING || 'http://localhost:4713',
  hojaiGateway: process.env.HOJAI_GATEWAY || 'http://localhost:4500',
};

// ============================================================================
// HTTP Clients
// ============================================================================

function createClient(baseURL: string): AxiosInstance {
  return axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      'X-Service': 'genie-gateway',
    },
  });
}

const memoryClient = createClient(CONFIG.genieMemory);
const relationshipClient = createClient(CONFIG.genieRelationship);
const briefingClient = createClient(CONFIG.genieBriefing);
const meetingClient = createClient(CONFIG.genieMeeting);

// ============================================================================
// Context Operations
// ============================================================================

/**
 * Get complete personal context
 */
export async function getPersonalContext(userId: string, tenantId: string): Promise<PersonalContext> {
  logger.info('get_personal_context', { userId, tenantId });

  const headers = {
    'X-User-Id': userId,
    'X-Tenant-Id': tenantId,
  };

  try {
    // Fetch all context in parallel
    const [memoriesRes, relationshipsRes, meetingsRes, briefingsRes] = await Promise.allSettled([
      getMemoriesSummary(userId, headers),
      getRelationshipsSummary(userId, headers),
      getMeetingsSummary(userId, headers),
      getBriefingsSummary(userId, headers),
    ]);

    return {
      user_id: userId,
      memories: memoriesRes.status === 'fulfilled' ? memoriesRes.value : [],
      relationships: relationshipsRes.status === 'fulfilled' ? relationshipsRes.value : [],
      upcoming_meetings: meetingsRes.status === 'fulfilled' ? meetingsRes.value : [],
      recent_briefings: briefingsRes.status === 'fulfilled' ? briefingsRes.value : [],
      preferences: [],
    };
  } catch (error) {
    logger.error('context_fetch_error', { error });
    throw error;
  }
}

/**
 * Get memories summary
 */
async function getMemoriesSummary(userId: string, headers: Record<string, string>): Promise<MemorySummary[]> {
  try {
    const response = await memoryClient.get('/api/memories', {
      params: { page: 1, pageSize: 10 },
      headers,
    });
    const memories = response.data?.data || [];
    return memories.slice(0, 10).map((m: { id: string; content: string; category: string; importance: string; created_at: string }) => ({
      id: m.id,
      content: m.content.substring(0, 100),
      category: m.category,
      importance: m.importance,
      created_at: m.created_at,
    }));
  } catch (error) {
    logger.warn('memory_fetch_failed', { error });
    return [];
  }
}

/**
 * Get relationships summary
 */
async function getRelationshipsSummary(userId: string, headers: Record<string, string>): Promise<RelationshipSummary[]> {
  try {
    const response = await relationshipClient.get('/api/relationships', {
      params: { page: 1, pageSize: 10 },
      headers,
    });
    const relationships = response.data?.data || [];
    return relationships.slice(0, 10).map((r: { id: string; name: string; relationship_type: string; last_interaction?: string; interaction_count: number }) => ({
      id: r.id,
      name: r.name,
      relationship_type: r.relationship_type,
      last_interaction: r.last_interaction,
      interaction_count: r.interaction_count || 0,
    }));
  } catch (error) {
    logger.warn('relationship_fetch_failed', { error });
    return [];
  }
}

/**
 * Get meetings summary
 */
async function getMeetingsSummary(userId: string, headers: Record<string, string>): Promise<MeetingSummary[]> {
  try {
    const response = await meetingClient.get('/api/meetings', {
      params: { page: 1, pageSize: 5 },
      headers,
    });
    const meetings = response.data?.data || [];
    return meetings.map((m: { id: string; title: string; start_time: string; participants?: unknown[] }) => ({
      id: m.id,
      title: m.title,
      start_time: m.start_time,
      participants_count: m.participants?.length || 0,
    }));
  } catch (error) {
    logger.warn('meeting_fetch_failed', { error });
    return [];
  }
}

/**
 * Get briefings summary
 */
async function getBriefingsSummary(userId: string, headers: Record<string, string>): Promise<BriefingSummary[]> {
  try {
    const response = await briefingClient.get('/api/briefings', {
      params: { page: 1, pageSize: 5 },
      headers,
    });
    const briefings = response.data?.data || [];
    return briefings.map((b: { id: string; title: string; created_at: string; type: string }) => ({
      id: b.id,
      title: b.title,
      created_at: b.created_at,
      type: b.type || 'daily',
    }));
  } catch (error) {
    logger.warn('briefing_fetch_failed', { error });
    return [];
  }
}

// ============================================================================
// Search Operations
// ============================================================================

/**
 * Unified search across all services
 */
export async function unifiedSearch(
  userId: string,
  tenantId: string,
  query: string,
  types?: string[]
): Promise<UnifiedSearchResult> {
  logger.info('unified_search', { userId, tenantId, query, types });

  const headers = {
    'X-User-Id': userId,
    'X-Tenant-Id': tenantId,
  };

  const result: UnifiedSearchResult = {
    memories: [],
    relationships: [],
    meetings: [],
    briefings: [],
  };

  const searchTypes = types || ['memories', 'relationships', 'meetings', 'briefings'];

  const promises: Promise<void>[] = [];

  if (searchTypes.includes('memories')) {
    promises.push(
      searchMemories(query, headers).then(r => { result.memories = r; }).catch(() => {})
    );
  }

  if (searchTypes.includes('relationships')) {
    promises.push(
      searchRelationships(query, headers).then(r => { result.relationships = r; }).catch(() => {})
    );
  }

  if (searchTypes.includes('meetings')) {
    promises.push(
      searchMeetings(query, headers).then(r => { result.meetings = r; }).catch(() => {})
    );
  }

  if (searchTypes.includes('briefings')) {
    promises.push(
      searchBriefings(query, headers).then(r => { result.briefings = r; }).catch(() => {})
    );
  }

  await Promise.all(promises);

  return result;
}

async function searchMemories(query: string, headers: Record<string, string>): Promise<MemorySummary[]> {
  try {
    const response = await memoryClient.post('/api/memories/search', { query }, { headers });
    const memories = response.data?.data || [];
    return memories.map((m: { id: string; content: string; category: string; importance: string; created_at: string }) => ({
      id: m.id,
      content: m.content.substring(0, 100),
      category: m.category,
      importance: m.importance,
      created_at: m.created_at,
    }));
  } catch {
    return [];
  }
}

async function searchRelationships(query: string, headers: Record<string, string>): Promise<RelationshipSummary[]> {
  try {
    const response = await relationshipClient.get('/api/relationships', { headers });
    const relationships = response.data?.data || [];
    // Simple filter by name
    return relationships
      .filter((r: { name: string }) => r.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10)
      .map((r: { id: string; name: string; relationship_type: string; interaction_count: number }) => ({
        id: r.id,
        name: r.name,
        relationship_type: r.relationship_type,
        interaction_count: r.interaction_count || 0,
      }));
  } catch {
    return [];
  }
}

async function searchMeetings(query: string, headers: Record<string, string>): Promise<MeetingSummary[]> {
  try {
    const response = await meetingClient.get('/api/meetings', { headers });
    const meetings = response.data?.data || [];
    return meetings
      .filter((m: { title: string }) => m.title.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10)
      .map((m: { id: string; title: string; start_time: string; participants?: unknown[] }) => ({
        id: m.id,
        title: m.title,
        start_time: m.start_time,
        participants_count: m.participants?.length || 0,
      }));
  } catch {
    return [];
  }
}

async function searchBriefings(query: string, headers: Record<string, string>): Promise<BriefingSummary[]> {
  try {
    const response = await briefingClient.get('/api/briefings', { headers });
    const briefings = response.data?.data || [];
    return briefings
      .filter((b: { title: string }) => b.title?.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10)
      .map((b: { id: string; title: string; created_at: string; type: string }) => ({
        id: b.id,
        title: b.title,
        created_at: b.created_at,
        type: b.type || 'daily',
      }));
  } catch {
    return [];
  }
}

// ============================================================================
// Timeline
// ============================================================================

/**
 * Get personal timeline
 */
export async function getPersonalTimeline(userId: string, tenantId: string, limit: number = 50): Promise<unknown[]> {
  logger.info('get_timeline', { userId, tenantId, limit });

  const headers = {
    'X-User-Id': userId,
    'X-Tenant-Id': tenantId,
  };

  const timeline: unknown[] = [];

  try {
    // Get recent memories
    const memoriesRes = await memoryClient.get('/api/memories', {
      params: { page: 1, pageSize: Math.ceil(limit / 2) },
      headers,
    });
    const memories = memoriesRes.data?.data || [];
    memories.forEach((m: { id: string; content: string; created_at: string; category: string }) => {
      timeline.push({
        type: 'memory',
        id: m.id,
        title: m.content.substring(0, 50),
        created_at: m.created_at,
      });
    });
  } catch (error) {
    logger.warn('timeline_memory_failed', { error });
  }

  try {
    // Get recent meetings
    const meetingsRes = await meetingClient.get('/api/meetings', {
      params: { page: 1, pageSize: Math.ceil(limit / 4) },
      headers,
    });
    const meetings = meetingsRes.data?.data || [];
    meetings.forEach((m: { id: string; title: string; start_time: string }) => {
      timeline.push({
        type: 'meeting',
        id: m.id,
        title: m.title,
        created_at: m.start_time,
      });
    });
  } catch (error) {
    logger.warn('timeline_meeting_failed', { error });
  }

  try {
    // Get recent briefings
    const briefingsRes = await briefingClient.get('/api/briefings', {
      params: { page: 1, pageSize: Math.ceil(limit / 4) },
      headers,
    });
    const briefings = briefingsRes.data?.data || [];
    briefings.forEach((b: { id: string; title: string; created_at: string }) => {
      timeline.push({
        type: 'briefing',
        id: b.id,
        title: b.title,
        created_at: b.created_at,
      });
    });
  } catch (error) {
    logger.warn('timeline_briefing_failed', { error });
  }

  // Sort by date descending
  timeline.sort((a: { created_at: string }, b: { created_at: string }) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return timeline.slice(0, limit);
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Check health of all connected services
 */
export async function checkServicesHealth(): Promise<Record<string, boolean>> {
  const services = {
    genieMemory: CONFIG.genieMemory,
    genieRelationship: CONFIG.genieRelationship,
    genieBriefing: CONFIG.genieBriefing,
    genieMeeting: CONFIG.genieMeeting,
  };

  const health: Record<string, boolean> = {};

  await Promise.all(
    Object.entries(services).map(async ([name, url]) => {
      try {
        const response = await axios.get(`${url}/health`, { timeout: 3000 });
        health[name] = response.status === 200;
      } catch {
        health[name] = false;
      }
    })
  );

  return health;
}
