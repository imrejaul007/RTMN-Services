/**
 * HOJAI Prospect Context SDK
 * ============================
 * One line to get full prospect context for ANY AI agent
 *
 * Usage:
 *   import { createProspectContext } from '@hojai/prospect-context-sdk';
 *
 *   const context = await createProspectContext({
 *     prospectId: 'prospect-123',
 *     agentType: 'sales-agent',
 *   });
 */

export interface ProspectIdentity {
  prospectId: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  location?: string;
}

export interface ProspectContext {
  isNew: boolean;
  prospectId: string;
  identity: ProspectIdentity;
  recentHistory: string;
  keyInsights: string[];
  agentMemory: any[];
  engagement: { score: number; nextAction?: string; lastEngaged?: Date };
  preferences?: any;
  contextSummary: string;
}

export interface ContextUpdate {
  interaction?: {
    source: string;
    type: string;
    summary: string;
    sentiment?: string;
    outcome?: string;
    metadata?: any;
  };
  context?: {
    interests?: string[];
    painPoints?: string[];
    budget?: string;
    timeline?: string;
    lastConversation?: string;
    preferences?: any;
  };
  engagement?: {
    score?: number;
    nextAction?: string;
    nextActionDate?: Date;
  };
  tags?: string[];
  agentMemory?: {
    agentId: string;
    agentType: string;
    summary: string;
    learnings?: string[];
  };
}

export interface ProspectContextOptions {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
}

export function createProspectContext(options: ProspectContextOptions = {}) {
  const baseUrl = options.baseUrl || process.env.HOJAI_PROSPECT_CONTEXT_URL || 'http://localhost:4550';
  const apiKey = options.apiKey || process.env.HOJAI_API_KEY;
  const timeout = options.timeout || 30000;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  async function getContext(prospectId: string, agentType?: string): Promise<ProspectContext> {
    const url = agentType
      ? `${baseUrl}/api/prospect/${prospectId}/agent-context/${agentType}`
      : `${baseUrl}/api/prospect/${prospectId}/context`;

    const response = await fetch(url, {
      headers: { ...headers, 'X-Agent-Id': agentType || 'unknown' },
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          isNew: true, prospectId, identity: { prospectId },
          recentHistory: '', keyInsights: [], agentMemory: [],
          engagement: { score: 0 },
          contextSummary: 'New prospect - no history available',
        };
      }
      throw new Error(`Context fetch failed: ${response.status}`);
    }
    return response.json();
  }

  async function updateContext(prospectId: string, updates: ContextUpdate, agentId?: string): Promise<{ success: boolean }> {
    const response = await fetch(`${baseUrl}/api/prospect/${prospectId}/context`, {
      method: 'POST',
      headers: { ...headers, 'X-Agent-Id': agentId || 'sdk' },
      body: JSON.stringify(updates),
      signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok) throw new Error(`Context update failed: ${response.status}`);
    return response.json();
  }

  async function searchProspects(query: any): Promise<any[]> {
    const params = new URLSearchParams();
    if (query.name) params.set('name', query.name);
    if (query.email) params.set('email', query.email);
    if (query.company) params.set('company', query.company);
    if (query.tags) params.set('tags', query.tags.join(','));
    if (query.minEngagement) params.set('minEngagement', query.minEngagement.toString());
    if (query.limit) params.set('limit', query.limit.toString());

    const response = await fetch(`${baseUrl}/api/prospects/search?${params}`, {
      headers, signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok) throw new Error(`Prospect search failed: ${response.status}`);
    return response.json();
  }

  async function recordInteraction(prospectId: string, interaction: ContextUpdate['interaction'], agentId?: string): Promise<{ success: boolean }> {
    return updateContext(prospectId, { interaction }, agentId);
  }

  function subscribeToUpdates(prospectId: string, callback: (data: any) => void): () => void {
    const eventSource = new EventSource(`${baseUrl}/api/prospect/${prospectId}/events`);
    eventSource.onmessage = (event) => callback(JSON.parse(event.data));
    eventSource.onerror = () => eventSource.close();
    return () => eventSource.close();
  }

  return { getContext, updateContext, searchProspects, recordInteraction, subscribeToUpdates };
}

export default createProspectContext;