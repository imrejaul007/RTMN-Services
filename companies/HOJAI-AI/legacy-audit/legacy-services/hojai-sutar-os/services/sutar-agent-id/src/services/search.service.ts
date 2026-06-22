/**
 * SUTAR Agent ID Service - Search Service
 * Agent search and filtering capabilities
 */

import { Agent, AgentType, AgentStatus, AgentSearchRequest, PaginatedResponse } from "../types/index.js";
import { agentService } from "./agent.service.js";
import { storageService } from "./storage.service.js";

export interface SearchResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  searchTime: number;
  query?: string;
}

export interface SearchFilters {
  query?: string;
  type?: AgentType;
  status?: AgentStatus;
  tags?: string[];
  capabilities?: string[];
  parentAgentId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  verified?: boolean;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: "name" | "createdAt" | "updatedAt" | "status";
  sortOrder?: "asc" | "desc";
  fuzzy?: boolean;
  highlight?: boolean;
  includeInactive?: boolean;
}

export interface SearchHighlight {
  field: string;
  fragments: string[];
}

export interface SearchSuggestion {
  text: string;
  score: number;
  type: "tag" | "capability" | "name";
}

export class SearchService {
  private searchIndex: Map<string, Set<string>> = new Map(); // word -> agent IDs
  private readonly MIN_SCORE = 0.3;
  private readonly MAX_RESULTS = 100;

  constructor() {
    // Rebuild index periodically
    setInterval(() => this.rebuildIndex(), 300000); // Every 5 minutes
  }

  // ============================================================================
  // Search Methods
  // ============================================================================

  async search(request: AgentSearchRequest): Promise<SearchResult<Agent>> {
    const startTime = Date.now();

    const {
      query,
      type,
      status,
      tags,
      capabilities,
      createdAfter,
      createdBefore,
      limit = 20,
      offset = 0,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = request;

    // Get all agents
    let agents = await agentService.getAllAgents({
      type,
      status,
      tags,
      capabilities,
    });

    // Apply text search if query provided
    if (query) {
      agents = this.filterByQuery(agents, query);
    }

    // Apply date filters
    if (createdAfter) {
      const afterDate = new Date(createdAfter);
      agents = agents.filter(a => new Date(a.createdAt) >= afterDate);
    }

    if (createdBefore) {
      const beforeDate = new Date(createdBefore);
      agents = agents.filter(a => new Date(a.createdAt) <= beforeDate);
    }

    // Sort agents
    agents = this.sortAgents(agents, sortBy, sortOrder);

    // Calculate pagination
    const total = agents.length;
    const paginatedAgents = agents.slice(offset, offset + limit);

    const searchTime = Date.now() - startTime;
    console.log(`[SearchService] Search completed in ${searchTime}ms, found ${total} results`);

    return {
      items: paginatedAgents,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
      searchTime,
      query,
    };
  }

  async searchByName(name: string, options?: SearchOptions): Promise<SearchResult<Agent>> {
    return this.search({
      query: name,
      limit: options?.limit,
      offset: options?.offset,
      sortBy: options?.sortBy,
      sortOrder: options?.sortOrder,
    });
  }

  async searchByTags(tags: string[], options?: SearchOptions): Promise<SearchResult<Agent>> {
    return this.search({
      tags,
      limit: options?.limit,
      offset: options?.offset,
      sortBy: options?.sortBy,
      sortOrder: options?.sortOrder,
    });
  }

  async searchByCapabilities(capabilities: string[], options?: SearchOptions): Promise<SearchResult<Agent>> {
    return this.search({
      capabilities,
      limit: options?.limit,
      offset: options?.offset,
      sortBy: options?.sortBy,
      sortOrder: options?.sortOrder,
    });
  }

  async searchByMetadata(
    metadataFilters: Record<string, unknown>,
    options?: SearchOptions
  ): Promise<SearchResult<Agent>> {
    const startTime = Date.now();
    let agents = await agentService.getAllAgents();

    // Filter by metadata
    for (const [key, value] of Object.entries(metadataFilters)) {
      agents = agents.filter(agent => {
        const metadataValue = (agent.metadata as unknown as Record<string, unknown>)[key];
        if (Array.isArray(value)) {
          return value.includes(metadataValue);
        }
        return metadataValue === value;
      });
    }

    // Sort and paginate
    const sortBy = options?.sortBy || "createdAt";
    const sortOrder = options?.sortOrder || "desc";
    agents = this.sortAgents(agents, sortBy, sortOrder);

    const total = agents.length;
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    const paginatedAgents = agents.slice(offset, offset + limit);

    return {
      items: paginatedAgents,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
      searchTime: Date.now() - startTime,
    };
  }

  // ============================================================================
  // Fuzzy Search
  // ============================================================================

  async fuzzySearch(query: string, options?: SearchOptions): Promise<SearchResult<Agent>> {
    const startTime = Date.now();
    const agents = await agentService.getAllAgents();

    // Score each agent
    const scoredAgents = agents.map(agent => ({
      agent,
      score: this.calculateFuzzyScore(agent, query),
    }));

    // Filter by minimum score and sort
    const filteredAgents = scoredAgents
      .filter(sa => sa.score >= this.MIN_SCORE)
      .sort((a, b) => b.score - a.score);

    // Paginate
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    const paginatedAgents = filteredAgents.slice(offset, offset + limit).map(sa => sa.agent);

    return {
      items: paginatedAgents,
      total: filteredAgents.length,
      limit,
      offset,
      hasMore: offset + limit < filteredAgents.length,
      searchTime: Date.now() - startTime,
      query,
    };
  }

  private calculateFuzzyScore(agent: Agent, query: string): number {
    const normalizedQuery = query.toLowerCase();
    let score = 0;

    // Name match (highest weight)
    const nameMatch = this.fuzzyMatch(agent.name.toLowerCase(), normalizedQuery);
    score += nameMatch * 0.4;

    // Agent ID match
    const agentIdMatch = this.fuzzyMatch(agent.agentId.toLowerCase(), normalizedQuery);
    score += agentIdMatch * 0.3;

    // Tags match
    for (const tag of agent.metadata.tags) {
      const tagMatch = this.fuzzyMatch(tag.toLowerCase(), normalizedQuery);
      score += tagMatch * 0.1;
    }

    // Capabilities match
    for (const cap of agent.capabilities) {
      const capMatch = this.fuzzyMatch(cap.toLowerCase(), normalizedQuery);
      score += capMatch * 0.1;
    }

    // Description match
    if (agent.metadata.description) {
      const descMatch = this.fuzzyMatch(agent.metadata.description.toLowerCase(), normalizedQuery);
      score += descMatch * 0.1;
    }

    return Math.min(score, 1);
  }

  private fuzzyMatch(text: string, query: string): number {
    // Simple fuzzy matching using Levenshtein distance
    const distance = this.levenshteinDistance(text, query);
    const maxLength = Math.max(text.length, query.length);

    if (maxLength === 0) return 1;

    // Exact match
    if (text.includes(query)) return 1;

    // Substring match
    if (this.substringMatch(text, query)) return 0.8;

    // Fuzzy match based on distance
    const similarity = 1 - distance / maxLength;
    return Math.max(0, similarity);
  }

  private substringMatch(text: string, query: string): boolean {
    // Check if all query characters appear in order
    let textIndex = 0;
    for (const char of query) {
      const foundIndex = text.indexOf(char, textIndex);
      if (foundIndex === -1) return false;
      textIndex = foundIndex + 1;
    }
    return true;
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  // ============================================================================
  // Suggestions and Autocomplete
  // ============================================================================

  async getSuggestions(query: string, limit: number = 5): Promise<SearchSuggestion[]> {
    if (!query || query.length < 2) {
      return [];
    }

    const normalizedQuery = query.toLowerCase();
    const suggestions: SearchSuggestion[] = [];

    const agents = await agentService.getAllAgents();

    // Name suggestions
    for (const agent of agents) {
      if (agent.name.toLowerCase().includes(normalizedQuery)) {
        suggestions.push({
          text: agent.name,
          score: this.fuzzyMatch(agent.name.toLowerCase(), normalizedQuery),
          type: "name",
        });
      }
    }

    // Tag suggestions
    const tagSet = new Set<string>();
    for (const agent of agents) {
      for (const tag of agent.metadata.tags) {
        if (!tagSet.has(tag) && tag.toLowerCase().includes(normalizedQuery)) {
          tagSet.add(tag);
          suggestions.push({
            text: tag,
            score: this.fuzzyMatch(tag.toLowerCase(), normalizedQuery),
            type: "tag",
          });
        }
      }
    }

    // Capability suggestions
    const capSet = new Set<string>();
    for (const agent of agents) {
      for (const cap of agent.capabilities) {
        if (!capSet.has(cap) && cap.toLowerCase().includes(normalizedQuery)) {
          capSet.add(cap);
          suggestions.push({
            text: cap,
            score: this.fuzzyMatch(cap.toLowerCase(), normalizedQuery),
            type: "capability",
          });
        }
      }
    }

    // Sort by score and limit
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // ============================================================================
  // Search Index Management
  // ============================================================================

  async rebuildIndex(): Promise<void> {
    const startTime = Date.now();
    this.searchIndex.clear();

    const agents = await agentService.getAllAgents();

    for (const agent of agents) {
      this.indexAgent(agent);
    }

    console.log(`[SearchService] Index rebuilt in ${Date.now() - startTime}ms, indexed ${agents.length} agents`);
  }

  private indexAgent(agent: Agent): void {
    const words = this.tokenize(`${agent.name} ${agent.agentId} ${agent.metadata.tags.join(" ")} ${agent.capabilities.join(" ")}`);

    for (const word of words) {
      if (!this.searchIndex.has(word)) {
        this.searchIndex.set(word, new Set());
      }
      this.searchIndex.get(word)!.add(agent.id);
    }
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(word => word.length >= 2);
  }

  // ============================================================================
  // Filtering Helpers
  // ============================================================================

  private filterByQuery(agents: Agent[], query: string): Agent[] {
    const normalizedQuery = query.toLowerCase();

    return agents.filter(agent => {
      // Search in name
      if (agent.name.toLowerCase().includes(normalizedQuery)) return true;

      // Search in agent ID
      if (agent.agentId.toLowerCase().includes(normalizedQuery)) return true;

      // Search in tags
      if (agent.metadata.tags.some(tag => tag.toLowerCase().includes(normalizedQuery))) return true;

      // Search in capabilities
      if (agent.capabilities.some(cap => cap.toLowerCase().includes(normalizedQuery))) return true;

      // Search in description
      if (agent.metadata.description?.toLowerCase().includes(normalizedQuery)) return true;

      // Search in email
      if (agent.metadata.email?.toLowerCase().includes(normalizedQuery)) return true;

      return false;
    });
  }

  private sortAgents(agents: Agent[], sortBy: string, sortOrder: "asc" | "desc"): Agent[] {
    const sorted = [...agents].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "updatedAt":
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === "desc" ? -comparison : comparison;
    });

    return sorted;
  }

  // ============================================================================
  // Search Statistics
  // ============================================================================

  getIndexStats(): {
    totalWords: number;
    indexedAgents: number;
    indexSize: number;
  } {
    let indexSize = 0;
    for (const agentIds of this.searchIndex.values()) {
      indexSize += agentIds.size;
    }

    return {
      totalWords: this.searchIndex.size,
      indexedAgents: new Set(
        Array.from(this.searchIndex.values()).flatMap(ids => Array.from(ids))
      ).size,
      indexSize,
    };
  }

  // ============================================================================
  // Aggregate Queries
  // ============================================================================

  async getAggregations(): Promise<{
    byType: Record<AgentType, number>;
    byStatus: Record<AgentStatus, number>;
    topTags: Array<{ tag: string; count: number }>;
    topCapabilities: Array<{ capability: string; count: number }>;
  }> {
    const agents = await agentService.getAllAgents();

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};
    const capCounts: Record<string, number> = {};

    for (const agent of agents) {
      byType[agent.type] = (byType[agent.type] || 0) + 1;
      byStatus[agent.status] = (byStatus[agent.status] || 0) + 1;

      for (const tag of agent.metadata.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }

      for (const cap of agent.capabilities) {
        capCounts[cap] = (capCounts[cap] || 0) + 1;
      }
    }

    return {
      byType: byType as Record<AgentType, number>,
      byStatus: byStatus as Record<AgentStatus, number>,
      topTags: Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topCapabilities: Object.entries(capCounts)
        .map(([capability, count]) => ({ capability, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }
}

// Singleton instance
export const searchService = new SearchService();