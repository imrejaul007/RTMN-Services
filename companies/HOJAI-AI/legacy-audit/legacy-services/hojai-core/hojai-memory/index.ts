/**
 * Hojai Memory Platform - Enhanced
 *
 * PORT: 4520
 *
 * Enhanced with:
 * - Context Engine (current situation understanding)
 * - Timeline Engine (temporal memory)
 * - Semantic Memory (long-term knowledge)
 * - Working Memory (short-term context)
 */

import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { tenantMiddleware } from '../../shared/middleware/tenant';
import { createLogger } from '../../shared/utils/logger';
import { createResponse, createErrorResponse } from '../../shared/types';

const logger = createLogger('hojai-memory');

// ============================================
// MEMORY TYPES
// ============================================

/**
 * Memory types
 */
export type MemoryType =
  | 'preference'      // Customer preferences
  | 'history'        // Past interactions
  | 'context'        // Current situation
  | 'intent'         // Predicted intent
  | 'sop'           // Standard procedures
  | 'knowledge'      // Business knowledge
  | 'fact'          // Factual knowledge
  | 'preference';    // Preferences

/**
 * Memory source
 */
export type MemorySource =
  | 'explicit'       // User provided
  | 'implicit'       // Behavior observed
  | 'conversation'   // Chat analysis
  | 'behavior'       // Action analysis
  | 'ai_extracted'   // AI generated
  | 'manual';        // Manually added

/**
 * Memory entity
 */
export interface Memory {
  id: string;
  tenant_id: string;

  // Scope
  scope_type: 'customer' | 'merchant' | 'business';
  scope_id: string;

  // Content
  type: MemoryType;
  key: string;
  value: string;

  // Metadata
  source: MemorySource;
  confidence: number; // 0-1
  importance: number; // 0-1
  tags: string[];

  // Usage tracking
  usage_count: number;
  last_used_at?: string;

  // Validation
  expires_at?: string;
  verified: boolean;
  verified_by?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============================================
// CONTEXT ENGINE
// ============================================

/**
 * Context types
 */
export type ContextType =
  | 'session'          // Current conversation session
  | 'task'             // Current task being performed
  | 'goal'            // User's goal
  | 'constraint'       // User's constraints
  | 'preference'       // Session preferences
  | 'emotional';       // Emotional state

/**
 * Context entry
 */
export interface ContextEntry {
  id: string;
  tenant_id: string;
  customer_id: string;

  type: ContextType;
  value: string;
  confidence: number;

  // Session tracking
  session_id: string;
  expires_at: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Customer context (snapshot of current state)
 */
export interface CustomerContext {
  customer_id: string;
  tenant_id: string;

  // Active context
  active_intent?: string;
  active_task?: string;
  active_goal?: string;

  // Emotional state
  emotional_state?: 'positive' | 'neutral' | 'negative';
  sentiment_score?: number;

  // Recent context entries
  recent_entries: ContextEntry[];

  // Session info
  current_session_id?: string;
  session_started_at?: string;

  // Computed
  context_summary?: string;
  last_updated: string;
}

/**
 * Context Engine
 */
class ContextEngine {
  private contexts: Map<string, ContextEntry[]> = new Map(); // customer_id → contexts

  /**
   * Set context entry
   */
  async setContext(
    tenantId: string,
    customerId: string,
    sessionId: string,
    type: ContextType,
    value: string,
    confidence: number = 0.8
  ): Promise<ContextEntry> {
    const now = new Date().toISOString();

    // Session expires in 30 minutes
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const entry: ContextEntry = {
      id: `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenant_id: tenantId,
      customer_id: customerId,
      type,
      value,
      confidence,
      session_id: sessionId,
      expires_at: expiresAt,
      created_at: now,
      updated_at: now
    };

    // Store context
    const key = `${tenantId}:${customerId}`;
    const existing = this.contexts.get(key) || [];

    // Remove old entries of same type
    const filtered = existing.filter(e => e.type !== type || e.session_id !== sessionId);
    filtered.push(entry);

    this.contexts.set(key, filtered);

    logger.info('context_set', { tenantId, customerId, type, sessionId });

    return entry;
  }

  /**
   * Get current context for customer
   */
  async getContext(
    tenantId: string,
    customerId: string,
    sessionId?: string
  ): Promise<CustomerContext> {
    const key = `${tenantId}:${customerId}`;
    const entries = this.contexts.get(key) || [];
    const now = new Date();

    // Filter valid entries
    const validEntries = entries.filter(e => {
      if (e.session_id !== sessionId && sessionId) return false;
      if (e.expires_at && new Date(e.expires_at) < now) return false;
      return true;
    });

    // Build context
    const intentEntries = validEntries.filter(e => e.type === 'intent');
    const taskEntries = validEntries.filter(e => e.type === 'task');
    const goalEntries = validEntries.filter(e => e.type === 'goal');
    const emotionEntries = validEntries.filter(e => e.type === 'emotional');

    const context: CustomerContext = {
      customer_id: customerId,
      tenant_id: tenantId,
      active_intent: intentEntries[0]?.value,
      active_task: taskEntries[0]?.value,
      active_goal: goalEntries[0]?.value,
      emotional_state: emotionEntries[0]?.value as 'positive' | 'neutral' | 'negative',
      sentiment_score: emotionEntries[0]?.confidence,
      recent_entries: validEntries.slice(0, 10),
      current_session_id: sessionId,
      last_updated: new Date().toISOString()
    };

    return context;
  }

  /**
   * Clear session context
   */
  async clearSession(
    tenantId: string,
    customerId: string,
    sessionId: string
  ): Promise<void> {
    const key = `${tenantId}:${customerId}`;
    const existing = this.contexts.get(key) || [];

    const filtered = existing.filter(e => e.session_id !== sessionId);
    this.contexts.set(key, filtered);

    logger.info('session_context_cleared', { tenantId, customerId, sessionId });
  }

  /**
   * Summarize context for AI
   */
  async summarizeForAI(
    tenantId: string,
    customerId: string,
    sessionId: string
  ): Promise<string> {
    const context = await this.getContext(tenantId, customerId, sessionId);

    const parts: string[] = [];

    if (context.active_intent) {
      parts.push(`Current intent: ${context.active_intent}`);
    }
    if (context.active_task) {
      parts.push(`Current task: ${context.active_task}`);
    }
    if (context.active_goal) {
      parts.push(`User goal: ${context.active_goal}`);
    }
    if (context.emotional_state) {
      parts.push(`Emotional state: ${context.emotional_state}`);
    }

    if (parts.length === 0) {
      return 'No active context.';
    }

    return parts.join('. ');
  }
}

// ============================================
// TIMELINE ENGINE
// ============================================

/**
 * Timeline event
 */
export interface TimelineEvent {
  id: string;
  tenant_id: string;
  customer_id: string;

  // Event classification
  type: string;              // e.g., 'order_placed', 'support_ticket'
  category: TimelineCategory;
  title: string;
  description?: string;

  // Relationships
  related_entity_type?: string;
  related_entity_id?: string;

  // Value
  value?: number;            // Order value, savings, etc.
  currency?: string;

  // Impact
  impact: 'positive' | 'negative' | 'neutral';

  // Metadata
  metadata: Record<string, unknown>;

  // Timestamps
  occurred_at: string;
  created_at: string;
}

export type TimelineCategory =
  | 'commerce'
  | 'support'
  | 'engagement'
  | 'communication'
  | 'loyalty'
  | 'feedback';

/**
 * Timeline summary
 */
export interface TimelineSummary {
  customer_id: string;
  tenant_id: string;

  // Stats
  total_events: number;
  first_event_date?: string;
  last_event_date?: string;

  // Categories
  events_by_category: Record<TimelineCategory, number>;

  // Recent events
  recent_events: TimelineEvent[];

  // Highlights
  highlights: TimelineHighlight[];
}

export interface TimelineHighlight {
  type: 'milestone' | 'achievement' | 'concern';
  title: string;
  description: string;
  date: string;
}

/**
 * Timeline Engine
 */
class TimelineEngine {
  private events: Map<string, TimelineEvent[]> = new Map(); // customer_id → events

  /**
   * Add event to timeline
   */
  async addEvent(
    tenantId: string,
    customerId: string,
    event: Omit<TimelineEvent, 'id' | 'tenant_id' | 'customer_id' | 'created_at'>
  ): Promise<TimelineEvent> {
    const now = new Date().toISOString();

    const timelineEvent: TimelineEvent = {
      ...event,
      id: `tl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenant_id: tenantId,
      customer_id: customerId,
      created_at: now
    };

    // Store event
    const key = `${tenantId}:${customerId}`;
    const existing = this.events.get(key) || [];
    existing.push(timelineEvent);

    // Keep last 1000 events
    if (existing.length > 1000) {
      existing.sort((a, b) =>
        new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
      );
      existing.splice(1000);
    }

    this.events.set(key, existing);

    logger.info('timeline_event_added', {
      tenantId,
      customerId,
      type: event.type
    });

    return timelineEvent;
  }

  /**
   * Get timeline for customer
   */
  async getTimeline(
    tenantId: string,
    customerId: string,
    options?: {
      category?: TimelineCategory;
      limit?: number;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<TimelineEvent[]> {
    const key = `${tenantId}:${customerId}`;
    let events = this.events.get(key) || [];

    // Filter by category
    if (options?.category) {
      events = events.filter(e => e.category === options.category);
    }

    // Filter by date range
    if (options?.startDate) {
      events = events.filter(e => e.occurred_at >= options.startDate!);
    }
    if (options?.endDate) {
      events = events.filter(e => e.occurred_at <= options.endDate!);
    }

    // Sort by date
    events.sort((a, b) =>
      new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
    );

    // Limit
    if (options?.limit) {
      events = events.slice(0, options.limit);
    }

    return events;
  }

  /**
   * Get timeline summary
   */
  async getSummary(
    tenantId: string,
    customerId: string
  ): Promise<TimelineSummary> {
    const events = await this.getTimeline(tenantId, customerId);

    // Count by category
    const eventsByCategory: Record<TimelineCategory, number> = {
      commerce: 0,
      support: 0,
      engagement: 0,
      communication: 0,
      loyalty: 0,
      feedback: 0
    };

    for (const event of events) {
      eventsByCategory[event.category]++;
    }

    // Generate highlights
    const highlights: TimelineHighlight[] = [];
    const positiveEvents = events.filter(e => e.impact === 'positive');
    const negativeEvents = events.filter(e => e.impact === 'negative');

    // First order milestone
    const firstOrder = events.find(e => e.type === 'order_placed');
    if (firstOrder) {
      highlights.push({
        type: 'milestone',
        title: 'First Purchase',
        description: `Made first purchase on ${new Date(firstOrder.occurred_at).toLocaleDateString()}`,
        date: firstOrder.occurred_at
      });
    }

    // High-value order
    const highValue = events
      .filter(e => e.value && e.value > 5000)
      .sort((a, b) => (b.value || 0) - (a.value || 0))[0];
    if (highValue) {
      highlights.push({
        type: 'achievement',
        title: 'High-Value Purchase',
        description: `₹${highValue.value} order placed`,
        date: highValue.occurred_at
      });
    }

    // Support concern
    if (negativeEvents.length > 2) {
      highlights.push({
        type: 'concern',
        title: 'Multiple Support Tickets',
        description: `${negativeEvents.length} support interactions in recent history`,
        date: negativeEvents[0].occurred_at
      });
    }

    return {
      customer_id: customerId,
      tenant_id: tenantId,
      total_events: events.length,
      first_event_date: events[events.length - 1]?.occurred_at,
      last_event_date: events[0]?.occurred_at,
      events_by_category: eventsByCategory,
      recent_events: events.slice(0, 10),
      highlights
    };
  }

  /**
   * Get events by type
   */
  async getEventsByType(
    tenantId: string,
    customerId: string,
    type: string
  ): Promise<TimelineEvent[]> {
    const events = await this.getTimeline(tenantId, customerId);
    return events.filter(e => e.type === type);
  }
}

// ============================================
// MEMORY ENGINE (existing + enhanced)
// ============================================

/**
 * Memory Engine
 */
class MemoryEngine {
  private memories: Map<string, Memory[]> = new Map();
  private contextEngine: ContextEngine;
  private timelineEngine: TimelineEngine;

  constructor() {
    this.contextEngine = new ContextEngine();
    this.timelineEngine = new TimelineEngine();
  }

  // ========== MEMORY OPERATIONS ==========

  /**
   * Store memory
   */
  async store(
    tenantId: string,
    scopeType: 'customer' | 'merchant' | 'business',
    scopeId: string,
    type: MemoryType,
    key: string,
    value: string,
    options?: {
      source?: MemorySource;
      confidence?: number;
      importance?: number;
      tags?: string[];
      expiresAt?: string;
    }
  ): Promise<Memory> {
    const now = new Date().toISOString();

    const memory: Memory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tenant_id: tenantId,
      scope_type: scopeType,
      scope_id: scopeId,
      type,
      key,
      value,
      source: options?.source || 'explicit',
      confidence: options?.confidence ?? 0.8,
      importance: options?.importance ?? 0.5,
      tags: options?.tags || [],
      usage_count: 0,
      expires_at: options?.expiresAt,
      verified: false,
      created_at: now,
      updated_at: now
    };

    // Store memory
    const memKey = `${tenantId}:${scopeType}:${scopeId}`;
    const existing = this.memories.get(memKey) || [];

    // Update if same key exists
    const existingIndex = existing.findIndex(m => m.key === key && m.type === type);
    if (existingIndex >= 0) {
      existing[existingIndex] = {
        ...existing[existingIndex],
        value,
        updated_at: now,
        usage_count: existing[existingIndex].usage_count + 1
      };
      this.memories.set(memKey, existing);
      return existing[existingIndex];
    }

    existing.push(memory);
    this.memories.set(memKey, existing);

    logger.info('memory_stored', { tenantId, scopeType, scopeId, type, key });

    return memory;
  }

  /**
   * Get memories for scope
   */
  async get(
    tenantId: string,
    scopeType: 'customer' | 'merchant' | 'business',
    scopeId: string,
    options?: { type?: MemoryType; key?: string }
  ): Promise<Memory[]> {
    const memKey = `${tenantId}:${scopeType}:${scopeId}`;
    let memories = this.memories.get(memKey) || [];

    if (options?.type) {
      memories = memories.filter(m => m.type === options.type);
    }
    if (options?.key) {
      memories = memories.filter(m => m.key === options.key);
    }

    // Sort by importance then by date
    memories.sort((a, b) => {
      if (b.importance !== a.importance) {
        return b.importance - a.importance;
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    return memories;
  }

  /**
   * Search memories
   */
  async search(
    tenantId: string,
    scopeType: 'customer' | 'merchant' | 'business',
    scopeId: string,
    query: string
  ): Promise<Memory[]> {
    const memories = await this.get(tenantId, scopeType, scopeId);
    const lowerQuery = query.toLowerCase();

    return memories.filter(m =>
      m.key.toLowerCase().includes(lowerQuery) ||
      m.value.toLowerCase().includes(lowerQuery) ||
      m.tags.some(t => t.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Delete memory
   */
  async delete(
    tenantId: string,
    scopeType: 'customer' | 'merchant' | 'business',
    scopeId: string,
    memoryId: string
  ): Promise<boolean> {
    const memKey = `${tenantId}:${scopeType}:${scopeId}`;
    const existing = this.memories.get(memKey) || [];

    const index = existing.findIndex(m => m.id === memoryId);
    if (index < 0) return false;

    existing.splice(index, 1);
    this.memories.set(memKey, existing);

    return true;
  }
}

// ============================================
// MAIN PLATFORM
// ============================================

export class HojaiMemoryPlatform {
  private memoryEngine: MemoryEngine;
  private contextEngine: ContextEngine;
  private timelineEngine: TimelineEngine;

  constructor() {
    this.memoryEngine = new MemoryEngine();
    this.contextEngine = new ContextEngine();
    this.timelineEngine = new TimelineEngine();
  }

  // ========== MEMORY ==========

  async store(tenantId: string, scopeType: 'customer' | 'merchant' | 'business', scopeId: string, type: MemoryType, key: string, value: string, options?: any) {
    return this.memoryEngine.store(tenantId, scopeType, scopeId, type, key, value, options);
  }

  async get(tenantId: string, scopeType: 'customer' | 'merchant' | 'business', scopeId: string, options?: any) {
    return this.memoryEngine.get(tenantId, scopeType, scopeId, options);
  }

  async search(tenantId: string, scopeType: 'customer' | 'merchant' | 'business', scopeId: string, query: string) {
    return this.memoryEngine.search(tenantId, scopeType, scopeId, query);
  }

  async delete(tenantId: string, scopeType: 'customer' | 'merchant' | 'business', scopeId: string, memoryId: string) {
    return this.memoryEngine.delete(tenantId, scopeType, scopeId, memoryId);
  }

  // ========== CONTEXT ==========

  async setContext(tenantId: string, customerId: string, sessionId: string, type: ContextType, value: string, confidence?: number) {
    return this.contextEngine.setContext(tenantId, customerId, sessionId, type, value, confidence);
  }

  async getContext(tenantId: string, customerId: string, sessionId?: string) {
    return this.contextEngine.getContext(tenantId, customerId, sessionId);
  }

  async clearSession(tenantId: string, customerId: string, sessionId: string) {
    return this.contextEngine.clearSession(tenantId, customerId, sessionId);
  }

  async summarizeContext(tenantId: string, customerId: string, sessionId: string) {
    return this.contextEngine.summarizeForAI(tenantId, customerId, sessionId);
  }

  // ========== TIMELINE ==========

  async addTimelineEvent(tenantId: string, customerId: string, event: any) {
    return this.timelineEngine.addEvent(tenantId, customerId, event);
  }

  async getTimeline(tenantId: string, customerId: string, options?: any) {
    return this.timelineEngine.getTimeline(tenantId, customerId, options);
  }

  async getTimelineSummary(tenantId: string, customerId: string) {
    return this.timelineEngine.getSummary(tenantId, customerId);
  }
}

// ============================================
// EXPRESS ROUTES
// ============================================

export function createMemoryRoutes(platform: HojaiMemoryPlatform) {
  const router = express.Router();

  // ========== MEMORY ==========

  router.post('/memory', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const { scope_type, scope_id, type, key, value, source, confidence, tags } = req.body;
      const tenantId = req.tenantContext!.tenant_id;

      const memory = await platform.store(tenantId, scope_type, scope_id, type, key, value, { source, confidence, tags });
      res.json(createResponse(memory, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('STORE_ERROR', error.message));
    }
  });

  router.get('/memory/:scopeType/:scopeId', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const { scopeType, scopeId } = req.params;
      const { type, key } = req.query;
      const tenantId = req.tenantContext!.tenant_id;

      const memories = await platform.get(tenantId, scopeType, scopeId, { type, key });
      res.json(createResponse(memories, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('GET_ERROR', error.message));
    }
  });

  router.get('/memory/:scopeType/:scopeId/search', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const { scopeType, scopeId } = req.params;
      const { q } = req.query;
      const tenantId = req.tenantContext!.tenant_id;

      const memories = await platform.search(tenantId, scopeType, scopeId, q as string);
      res.json(createResponse(memories, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('SEARCH_ERROR', error.message));
    }
  });

  router.delete('/memory/:scopeType/:scopeId/:memoryId', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const { scopeType, scopeId, memoryId } = req.params;
      const tenantId = req.tenantContext!.tenant_id;

      const deleted = await platform.delete(tenantId, scopeType, scopeId, memoryId);
      res.json(createResponse({ deleted }, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('DELETE_ERROR', error.message));
    }
  });

  // ========== CONTEXT ==========

  router.post('/context', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const { customer_id, session_id, type, value, confidence } = req.body;
      const tenantId = req.tenantContext!.tenant_id;

      const context = await platform.setContext(tenantId, customer_id, session_id, type, value, confidence);
      res.json(createResponse(context, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('CONTEXT_ERROR', error.message));
    }
  });

  router.get('/context/:customerId', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const { session_id } = req.query;
      const tenantId = req.tenantContext!.tenant_id;

      const context = await platform.getContext(tenantId, customerId, session_id as string);
      res.json(createResponse(context, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('GET_ERROR', error.message));
    }
  });

  router.get('/context/:customerId/summary', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const { session_id } = req.query;
      const tenantId = req.tenantContext!.tenant_id;

      const summary = await platform.summarizeContext(tenantId, customerId, session_id as string);
      res.json(createResponse({ summary }, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('SUMMARY_ERROR', error.message));
    }
  });

  router.delete('/context/:customerId/session/:sessionId', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const { customerId, sessionId } = req.params;
      const tenantId = req.tenantContext!.tenant_id;

      await platform.clearSession(tenantId, customerId, sessionId);
      res.json(createResponse({ cleared: true }, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('CLEAR_ERROR', error.message));
    }
  });

  // ========== TIMELINE ==========

  router.post('/timeline', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const { customer_id, type, category, title, description, impact, value, metadata } = req.body;
      const tenantId = req.tenantContext!.tenant_id;

      const event = await platform.addTimelineEvent(tenantId, customer_id, {
        type, category, title, description, impact, value, metadata
      });
      res.json(createResponse(event, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('EVENT_ERROR', error.message));
    }
  });

  router.get('/timeline/:customerId', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const { category, limit, start_date, end_date } = req.query;
      const tenantId = req.tenantContext!.tenant_id;

      const events = await platform.getTimeline(tenantId, customerId, {
        category,
        limit: limit ? parseInt(limit as string) : 50,
        startDate: start_date as string,
        endDate: end_date as string
      });
      res.json(createResponse(events, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('GET_ERROR', error.message));
    }
  });

  router.get('/timeline/:customerId/summary', tenantMiddleware(), async (req: Request, res: Response) => {
    try {
      const { customerId } = req.params;
      const tenantId = req.tenantContext!.tenant_id;

      const summary = await platform.getTimelineSummary(tenantId, customerId);
      res.json(createResponse(summary, { tenantId }));
    } catch (error: any) {
      res.status(500).json(createErrorResponse('SUMMARY_ERROR', error.message));
    }
  });

  return router;
}

// ============================================
// BOOTSTRAP
// ============================================

export async function bootstrap(port = 4520) {
  const platform = new HojaiMemoryPlatform();
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
  app.use(express.json({ limit: "10kb" }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'hojai-memory', version: '2.0.0' });
  });

  app.use('/api/memory', createMemoryRoutes(platform));

  app.listen(port, () => {
    logger.info('hojai_memory_platform_enhanced_started', { port });
  });

  return { platform, app };
}

export default { HojaiMemoryPlatform, createMemoryRoutes, bootstrap };
