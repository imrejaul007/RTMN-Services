/**
 * GENIE Personal OS Gateway - Orchestrator Service
 * Version: 1.0.0 | Date: June 1, 2026
 * Purpose: Unified orchestrator that coordinates all GENIE services
 */

import axios, { AxiosInstance } from 'axios';
import { createLogger } from '../utils/logger.js';
import {
  SERVICE_URLS,
  PersonalContext,
  UnifiedQuery,
  UnifiedResponse,
  DailyBriefing,
  AICompanionRequest,
  AICompanionResponse,
  PersonalTimeline,
  TimelineEvent,
  MemoryContext,
  RelationshipContext,
  PatternContext,
  HouseholdContext,
  AIInsight,
  ActivityItem,
  CreateMemoryInput,
} from '../types.js';

const logger = createLogger('orchestrator');

// ============================================================================
// HTTP Client Factory
// ============================================================================

function createClient(baseURL: string): AxiosInstance {
  return axios.create({
    baseURL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ============================================================================
// Orchestrator Service
// ============================================================================

export class GenieOrchestratorService {
  private clients: Record<string, AxiosInstance>;

  constructor() {
    this.clients = {
      memory: createClient(SERVICE_URLS.memory),
      relationship: createClient(SERVICE_URLS.relationship),
      briefing: createClient(SERVICE_URLS.briefing),
      household: createClient(SERVICE_URLS.household),
      auth: createClient(SERVICE_URLS.auth),
      intent: createClient(SERVICE_URLS.intent),
      humanContext: createClient(SERVICE_URLS.humanContext),
      lifePattern: createClient(SERVICE_URLS.lifePattern),
    };
  }

  private getHeaders(tenantId: string, userId: string) {
    return {
      'X-Tenant-Id': tenantId,
      'X-User-Id': userId,
    };
  }

  // ============================================================================
  // Get Personal Context
  // ============================================================================

  async getPersonalContext(tenantId: string, userId: string): Promise<PersonalContext> {
    const headers = this.getHeaders(tenantId, userId);

    logger.info('fetching_personal_context', { tenantId, userId });

    // Fetch from multiple services in parallel
    const [memoryResult, relationshipResult, patternResult, householdResult] = await Promise.allSettled([
      this.fetchMemoryContext(tenantId, userId),
      this.fetchRelationshipContext(tenantId, userId),
      this.fetchPatternContext(tenantId, userId),
      this.fetchHouseholdContext(tenantId, userId),
    ]);

    const memories = memoryResult.status === 'fulfilled' ? memoryResult.value : { recent_memories: [], memory_count: 0, top_tags: [] };
    const relationships = relationshipResult.status === 'fulfilled' ? relationshipResult.value : { top_contacts: [], relationship_insights: [] };
    const patterns = patternResult.status === 'fulfilled' ? patternResult.value : { daily_routine: [], weekly_patterns: [], life_events: [] };
    const household = householdResult.status === 'fulfilled' ? householdResult.value : undefined;

    // Get recent activity from intent service
    const recentActivity = await this.fetchRecentActivity(tenantId, userId);

    // Generate AI insights
    const aiInsights = this.generateInsights(memories, relationships, patterns);

    return {
      user_id: userId,
      tenant_id: tenantId,
      memories,
      relationships,
      household,
      patterns,
      recent_activity: recentActivity,
      ai_insights: aiInsights,
      pending_actions: [],
    };
  }

  private async fetchMemoryContext(tenantId: string, userId: string): Promise<MemoryContext> {
    try {
      const response = await this.clients.memory.get('/api/memories/stats', { headers: this.getHeaders(tenantId, userId) });
      const timelineResponse = await this.clients.memory.get('/api/memories/timeline', {
        headers: this.getHeaders(tenantId, userId),
        params: { limit: 10 }
      });

      return {
        recent_memories: timelineResponse.data?.data || [],
        memory_count: response.data?.data?.total_memories || 0,
        top_tags: response.data?.data?.top_tags || [],
      };
    } catch (error) {
      logger.warn('memory_context_fetch_failed', { error: error instanceof Error ? error.message : 'Unknown' });
      return { recent_memories: [], memory_count: 0, top_tags: [] };
    }
  }

  private async fetchRelationshipContext(tenantId: string, userId: string): Promise<RelationshipContext> {
    try {
      const response = await this.clients.relationship.get(`/api/relationships/top`, {
        headers: this.getHeaders(tenantId, userId),
        params: { limit: 10 }
      });

      return {
        top_contacts: response.data?.data || [],
        relationship_insights: [],
      };
    } catch (error) {
      logger.warn('relationship_context_fetch_failed', { error: error instanceof Error ? error.message : 'Unknown' });
      return { top_contacts: [], relationship_insights: [] };
    }
  }

  private async fetchPatternContext(tenantId: string, userId: string): Promise<PatternContext> {
    try {
      const response = await this.clients.lifePattern.get(`/api/patterns/current`, {
        headers: this.getHeaders(tenantId, userId),
        params: { user_id: userId }
      });

      return {
        daily_routine: response.data?.data?.daily_routine || [],
        weekly_patterns: response.data?.data?.weekly_patterns || [],
        life_events: response.data?.data?.life_events || [],
      };
    } catch (error) {
      logger.warn('pattern_context_fetch_failed', { error: error instanceof Error ? error.message : 'Unknown' });
      return { daily_routine: [], weekly_patterns: [], life_events: [] };
    }
  }

  private async fetchHouseholdContext(tenantId: string, userId: string): Promise<HouseholdContext | undefined> {
    try {
      const response = await this.clients.household.get('/api/households', {
        headers: this.getHeaders(tenantId, userId)
      });

      if (response.data?.data?.length > 0) {
        const household = response.data.data[0];
        return {
          id: household.id,
          name: household.name,
          member_count: household.stats?.member_count || 1,
          active_tasks: household.stats?.task_count || 0,
          upcoming_events: [],
        };
      }
      return undefined;
    } catch (error) {
      logger.warn('household_context_fetch_failed', { error: error instanceof Error ? error.message : 'Unknown' });
      return undefined;
    }
  }

  private async fetchRecentActivity(tenantId: string, userId: string): Promise<ActivityItem[]> {
    try {
      const response = await this.clients.intent.get('/api/intent/activity', {
        headers: this.getHeaders(tenantId, userId),
        params: { user_id: userId, limit: 20 }
      });
      return response.data?.data || [];
    } catch (error) {
      return [];
    }
  }

  private generateInsights(memories: MemoryContext, relationships: RelationshipContext, patterns: PatternContext): AIInsight[] {
    const insights: AIInsight[] = [];

    // Memory insights
    if (memories.memory_count > 0) {
      insights.push({
        type: 'reminder',
        title: 'Memory Growth',
        description: `You have ${memories.memory_count} memories stored. Keep talking to Genie to build your personal knowledge base.`,
        priority: 'low',
      });
    }

    // Relationship insights
    if (relationships.top_contacts.length > 0) {
      const leastContact = relationships.top_contacts[relationships.top_contacts.length - 1];
      if (leastContact) {
        insights.push({
          type: 'suggestion',
          title: 'Stay Connected',
          description: `You haven't interacted with ${leastContact.name} in a while. Consider reaching out!`,
          priority: 'medium',
          action: {
            type: 'remind_contact',
            data: { contact_id: leastContact.id },
          },
        });
      }
    }

    // Pattern insights
    if (patterns.daily_routine.length > 0) {
      insights.push({
        type: 'prediction',
        title: 'Your Day Ahead',
        description: 'Based on your patterns, here\'s what your day typically looks like.',
        priority: 'low',
      });
    }

    return insights;
  }

  // ============================================================================
  // Unified Search
  // ============================================================================

  async unifiedSearch(tenantId: string, userId: string, query: UnifiedQuery): Promise<UnifiedResponse> {
    const headers = this.getHeaders(tenantId, userId);
    const servicesToQuery = query.context === 'all'
      ? ['memory', 'relationship', 'household']
      : [query.context || 'memory'];

    logger.info('unified_search', { tenantId, userId, query: query.query, services: servicesToQuery });

    const results = await Promise.allSettled(
      servicesToQuery.map(service => this.searchService(service as string, headers, query.query, query.limit || 20))
    );

    const successfulResults = results
      .filter((r): r is PromiseFulfilledResult<{ service: string; data: unknown[] }> => r.status === 'fulfilled')
      .map(r => r.value);

    const allData = successfulResults.flatMap(r => r.data);
    const confidence = successfulResults.length / servicesToQuery.length;

    // Generate answer from results
    const answer = this.generateAnswer(query.query, allData);

    return {
      answer,
      sources: successfulResults,
      confidence,
      suggested_actions: this.suggestActions(query.query, allData),
    };
  }

  private async searchService(service: string, headers: Record<string, string>, query: string, limit: number): Promise<{ service: string; data: unknown[] }> {
    try {
      const endpoints: Record<string, string> = {
        memory: '/api/memories/search',
        relationship: '/api/relationships/search',
        household: '/api/households/search',
      };

      const response = await this.clients[service].post(
        endpoints[service],
        { query, limit },
        { headers }
      );

      return { service, data: response.data?.data || [] };
    } catch (error) {
      logger.warn('service_search_failed', { service, error: error instanceof Error ? error.message : 'Unknown' });
      return { service, data: [] };
    }
  }

  private generateAnswer(query: string, results: unknown[]): string {
    if (results.length === 0) {
      return `I couldn't find anything related to "${query}" in your personal context. Try asking me to remember something specific or create a new memory about it.`;
    }

    return `Based on your personal context, here are ${results.length} relevant items for "${query}":\n\n` +
      results.slice(0, 5).map((r: any, i) => `${i + 1}. ${r.content || r.title || r.name || 'Item'}`).join('\n');
  }

  private suggestActions(query: string, results: unknown[]): Array<{ action: string; description: string }> {
    const actions: Array<{ action: string; description: string }> = [];

    if (results.length === 0) {
      actions.push({ action: 'create_memory', description: 'Create a new memory about this topic' });
    }

    if (query.toLowerCase().includes('remember')) {
      actions.push({ action: 'remember_more', description: 'Recall more memories about this' });
    }

    return actions;
  }

  // ============================================================================
  // AI Companion
  // ============================================================================

  async processAICompanionMessage(tenantId: string, userId: string, request: AICompanionRequest): Promise<AICompanionResponse> {
    const headers = this.getHeaders(tenantId, userId);
    const context = await this.getPersonalContext(tenantId, userId);

    logger.info('ai_companion_message', { tenantId, userId, channel: request.channel, messageLength: request.message.length });

    // Determine what to do based on message intent
    const message = request.message.toLowerCase();

    let responseMessage = '';
    const actionsPerformed: Array<{ type: string; result: unknown }> = [];
    let memoryLearned = false;
    const contextUsed: string[] = [];

    // Handle different intents
    if (message.includes('remember') || message.includes('recall')) {
      contextUsed.push('memory');
      responseMessage = await this.handleMemoryRequest(tenantId, userId, request.message, context);
    } else if (message.includes('who') && (message.includes('talk') || message.includes('contact') || message.includes('meet'))) {
      contextUsed.push('relationship');
      responseMessage = await this.handleRelationshipRequest(tenantId, userId, request.message, context);
    } else if (message.includes('household') || message.includes('family') || message.includes('home')) {
      contextUsed.push('household');
      responseMessage = await this.handleHouseholdRequest(tenantId, userId, request.message, context);
    } else if (message.includes('schedule') || message.includes('calendar') || message.includes('event')) {
      contextUsed.push('schedule');
      responseMessage = await this.handleScheduleRequest(tenantId, userId, context);
    } else if (message.includes('remember this') || message.includes('save this')) {
      // Store as memory
      const memoryContent = request.message.replace(/remember this|save this/gi, '').trim();
      await this.createMemory(tenantId, userId, memoryContent);
      actionsPerformed.push({ type: 'memory_created', result: { content: memoryContent } });
      memoryLearned = true;
      responseMessage = "Got it! I've stored that in your memory. You can ask me to remember it anytime.";
    } else {
      // General conversation with context
      responseMessage = this.generateContextualResponse(request.message, context);
    }

    return {
      message: responseMessage,
      context_used: contextUsed,
      actions_performed: actionsPerformed,
      suggested_follow_ups: this.generateFollowUps(request.message, context),
      memory_learned: memoryLearned,
    };
  }

  private async handleMemoryRequest(tenantId: string, userId: string, message: string, context: PersonalContext): Promise<string> {
    const searchTerm = message.replace(/remember|recall|what do i know about/gi, '').trim();

    if (!searchTerm) {
      return `You have ${context.memories.memory_count} memories stored. What would you like me to remember?`;
    }

    const results = await this.unifiedSearch(tenantId, userId, { query: searchTerm, context: 'memory' });
    return results.answer;
  }

  private async handleRelationshipRequest(tenantId: string, userId: string, message: string, context: PersonalContext): Promise<string> {
    if (context.relationships.top_contacts.length === 0) {
      return "I don't have any relationship data yet. Connect your contacts to get started!";
    }

    const importantContacts = context.relationships.top_contacts.slice(0, 5);
    return `Your most important contacts are:\n\n${importantContacts.map((c, i) => `${i + 1}. ${c.name} - Last contact: ${c.last_interaction}`).join('\n')}`;
  }

  private async handleHouseholdRequest(tenantId: string, userId: string, message: string, context: PersonalContext): Promise<string> {
    if (!context.household) {
      return "You don't have a household set up yet. Would you like to create one to share with family or roommates?";
    }

    return `Your household "${context.household.name}" has ${context.household.member_count} members. You have ${context.household.active_tasks} active tasks.`;
  }

  private async handleScheduleRequest(tenantId: string, userId: string, context: PersonalContext): Promise<string> {
    if (context.patterns.daily_routine.length === 0) {
      return "I don't have enough data about your schedule yet. Keep using Genie to learn your patterns!";
    }

    return `Based on your patterns, here's your typical day:\n\n${context.patterns.daily_routine.map(p => `• ${p.time}: ${p.activity}`).join('\n')}`;
  }

  private generateContextualResponse(message: string, context: PersonalContext): string {
    const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];
    const isGreeting = greetings.some(g => message.toLowerCase().includes(g));

    if (isGreeting) {
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      return `${greeting}! I'm Genie, your personal AI. You have ${context.memories.memory_count} memories stored and ${context.relationships.top_contacts.length} relationships tracked. How can I help you today?`;
    }

    // Default response with context
    let response = "I'm here to help! Here's what I know about you:\n\n";
    response += `• ${context.memories.memory_count} memories stored\n`;
    response += `• ${context.relationships.top_contacts.length} relationships tracked\n`;
    if (context.household) {
      response += `• Household: ${context.household.name}\n`;
    }

    return response;
  }

  private generateFollowUps(message: string, context: PersonalContext): string[] {
    const followUps: string[] = [];

    if (context.memories.memory_count < 5) {
      followUps.push("Tell me something to remember");
    }

    if (context.relationships.top_contacts.length > 0) {
      followUps.push("Who should I remind you to contact?");
    }

    if (!context.household) {
      followUps.push("Want to set up a household?");
    }

    return followUps.slice(0, 3);
  }

  // ============================================================================
  // Create Memory
  // ============================================================================

  async createMemory(tenantId: string, userId: string, input: CreateMemoryInput): Promise<unknown> {
    try {
      const response = await this.clients.memory.post('/api/memories', input, {
        headers: this.getHeaders(tenantId, userId),
      });
      logger.info('memory_created', { tenantId, userId });
      return response.data?.data;
    } catch (error) {
      logger.error('memory_creation_failed', { error: error instanceof Error ? error.message : 'Unknown' });
      throw error;
    }
  }

  // ============================================================================
  // Daily Briefing
  // ============================================================================

  async getDailyBriefing(tenantId: string, userId: string): Promise<DailyBriefing> {
    const context = await this.getPersonalContext(tenantId, userId);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    return {
      date: new Date().toISOString(),
      greeting: `${greeting}! Here's your daily briefing.`,
      summary: {
        events_today: context.patterns.daily_routine.length,
        tasks_pending: context.household?.active_tasks || 0,
        messages_unread: 0,
        memories_learned: context.recent_activity.filter(a => a.type === 'memory_created').length,
      },
      schedule: context.patterns.daily_routine.map(r => ({ time: r.time, event: r.activity })),
      tasks: [],
      insights: context.ai_insights.slice(0, 3),
    };
  }

  // ============================================================================
  // Personal Timeline
  // ============================================================================

  async getPersonalTimeline(tenantId: string, userId: string, startDate?: string, endDate?: string): Promise<PersonalTimeline> {
    const headers = this.getHeaders(tenantId, userId);

    // Fetch from multiple sources
    const results = await Promise.allSettled([
      this.clients.memory.get('/api/memories/timeline', { headers, params: { limit: 100, start_date: startDate, end_date: endDate } }),
      this.clients.household.get('/api/households', { headers }),
      this.clients.lifePattern.get('/api/patterns/events', { headers, params: { user_id: userId, start_date: startDate, end_date: endDate } }),
    ]);

    const events: TimelineEvent[] = [];

    // Process memories
    if (results[0].status === 'fulfilled') {
      const memories = results[0].value.data?.data || [];
      memories.forEach((m: any) => {
        events.push({
          id: m.id,
          date: m.created_at,
          type: 'memory',
          title: m.summary || m.content?.substring(0, 50) || 'Memory',
          description: m.content,
          importance: m.importance || 'medium',
          tags: m.tags || [],
        });
      });
    }

    // Sort by date
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Get top categories
    const categoryCount: Record<string, number> = {};
    events.forEach(e => {
      categoryCount[e.type] = (categoryCount[e.type] || 0) + 1;
    });
    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type]) => type);

    return {
      events: events.slice(0, 100),
      summary: {
        total_events: events.length,
        period: startDate && endDate ? `${startDate} to ${endDate}` : 'All time',
        top_categories: topCategories,
      },
    };
  }
}

// Singleton
let instance: GenieOrchestratorService | null = null;

export function getOrchestratorService(): GenieOrchestratorService {
  if (!instance) {
    instance = new GenieOrchestratorService();
  }
  return instance;
}
