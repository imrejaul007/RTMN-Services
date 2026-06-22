/**
 * Conversation Memory Service
 *
 * Silent learning system - stores conversation context per client per lead
 * NOT visible to client frontend, only used internally for pre-call intelligence
 */

import { v4 as uuidv4 } from 'uuid';

// ==================== TYPES ====================

export interface ConversationEntry {
  id: string;
  leadId: string;
  clientId: string;
  channel: 'call' | 'chat' | 'email' | 'meeting' | 'whatsapp';
  direction: 'inbound' | 'outbound';
  timestamp: string;
  duration?: number; // seconds for calls
  summary: string;
  topics: string[]; // extracted topics - INTERNAL ONLY
  sentiment: 'positive' | 'neutral' | 'negative';
  keyPoints: string[]; // INTERNAL ONLY
  actionItems: string[];
  nextFollowUp?: string;
  createdAt: string;
}

export interface LeadIntelligence {
  leadId: string;
  clientId: string;
  totalConversations: number;
  lastConversation?: ConversationEntry;
  topicsDiscussed: string[]; // INTERNAL
  sentimentTrend: 'improving' | 'stable' | 'declining';
  engagementScore: number;
  preferredChannel?: 'call' | 'chat' | 'email' | 'whatsapp';
  bestTimeToContact?: string;
  nextRecommendedAction?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== IN-MEMORY STORAGE ====================
// In production, this would use MongoDB with client isolation

const conversations = new Map<string, ConversationEntry>(); // key: `${clientId}:${leadId}`
const leadIntelligence = new Map<string, LeadIntelligence>(); // key: `${clientId}:${leadId}`

// ==================== SERVICE ====================

export class ConversationMemoryService {
  /**
   * Add a new conversation entry
   * Silently stores for internal use only
   */
  addConversation(
    clientId: string,
    leadId: string,
    data: Omit<ConversationEntry, 'id' | 'clientId' | 'createdAt'>
  ): LeadIntelligence {
    const id = uuidv4();
    const entry: ConversationEntry = {
      ...data,
      id,
      clientId,
      createdAt: new Date().toISOString()
    };

    // Store conversation
    const key = `${clientId}:${leadId}`;
    const existing = conversations.get(key) || [];
    existing.push(entry);
    conversations.set(key, existing);

    // Update lead intelligence
    const intelligence = this.updateIntelligence(clientId, leadId, entry);

    return intelligence;
  }

  /**
   * Update lead intelligence based on conversation
   */
  private updateIntelligence(
    clientId: string,
    leadId: string,
    conversation: ConversationEntry
  ): LeadIntelligence {
    const key = `${clientId}:${leadId}`;
    const convs = conversations.get(key) || [];

    // Calculate topics discussed (union of all topics)
    const allTopics = new Set<string>();
    convs.forEach(c => c.topics.forEach(t => allTopics.add(t)));

    // Calculate sentiment trend
    const recentSentiments = convs.slice(-5).map(c => c.sentiment);
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recentSentiments.length >= 3) {
      const positive = recentSentiments.filter(s => s === 'positive').length;
      const negative = recentSentiments.filter(s => s === 'negative').length;
      if (positive > negative) trend = 'improving';
      else if (negative > positive) trend = 'declining';
    }

    // Calculate engagement score (0-100)
    const engagementScore = this.calculateEngagement(convs);

    // Find preferred channel
    const channelCounts = new Map<string, number>();
    convs.forEach(c => {
      const count = channelCounts.get(c.channel) || 0;
      channelCounts.set(c.channel, count + 1);
    });
    let preferredChannel: string | undefined;
    let maxCount = 0;
    channelCounts.forEach((count, channel) => {
      if (count > maxCount) {
        maxCount = count;
        preferredChannel = channel;
      }
    });

    const intelligence: LeadIntelligence = {
      leadId,
      clientId,
      totalConversations: convs.length,
      lastConversation: conversation,
      topicsDiscussed: Array.from(allTopics),
      sentimentTrend: trend,
      engagementScore,
      preferredChannel: preferredChannel as any,
      nextRecommendedAction: conversation.actionItems[0] || conversation.nextFollowUp,
      createdAt: convs[0]?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    leadIntelligence.set(key, intelligence);
    return intelligence;
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagement(convs: ConversationEntry[]): number {
    if (convs.length === 0) return 0;

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Recency factor (more recent = higher)
    const recentConvs = convs.filter(c => new Date(c.timestamp).getTime() > thirtyDaysAgo);
    const recencyScore = Math.min(recentConvs.length * 10, 50);

    // Frequency factor
    const frequencyScore = Math.min(convs.length * 5, 30);

    // Sentiment factor
    const positiveCount = convs.filter(c => c.sentiment === 'positive').length;
    const sentimentScore = Math.round((positiveCount / convs.length) * 20);

    return Math.min(recencyScore + frequencyScore + sentimentScore, 100);
  }

  /**
   * Get pre-call brief for a lead (INTERNAL USE ONLY)
   * This data is NOT sent to client frontend
   */
  getPreCallBrief(clientId: string, leadId: string): {
    leadId: string;
    lastContact: string;
    daysSinceContact: number;
    sentiment: string;
    topics: string[];
    suggestedApproach: string;
    recommendedActions: string[];
    riskFlags: string[];
  } | null {
    const intelligence = leadIntelligence.get(`${clientId}:${leadId}`);
    if (!intelligence) return null;

    const lastContact = intelligence.lastConversation;
    const daysSince = lastContact
      ? Math.floor((Date.now() - new Date(lastContact.timestamp).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // Generate suggested approach based on topics and sentiment
    let suggestedApproach = 'Follow up professionally';
    if (intelligence.sentimentTrend === 'improving') {
      suggestedApproach = 'Close the deal - momentum is positive';
    } else if (intelligence.sentimentTrend === 'declining') {
      suggestedApproach = 'Address concerns - sentiment declining';
    } else if (daysSince > 14) {
      suggestedApproach = 'Re-engage - cold outreach needed';
    }

    // Risk flags
    const riskFlags: string[] = [];
    if (daysSince > 30) riskFlags.push('Cold lead (>30 days)');
    if (intelligence.sentimentTrend === 'declining') riskFlags.push('Declining sentiment');
    if (intelligence.engagementScore < 30) riskFlags.push('Low engagement');

    return {
      leadId,
      lastContact: lastContact?.timestamp || 'Never',
      daysSinceContact: daysSince,
      sentiment: intelligence.sentimentTrend,
      topics: intelligence.topicsDiscussed.slice(0, 5), // Top 5 topics
      suggestedApproach,
      recommendedActions: lastContact?.actionItems || [],
      riskFlags
    };
  }

  /**
   * Get lead intelligence (INTERNAL USE ONLY)
   */
  getLeadIntelligence(clientId: string, leadId: string): LeadIntelligence | null {
    return leadIntelligence.get(`${clientId}:${leadId}`) || null;
  }

  /**
   * Get all conversations for a lead (INTERNAL USE ONLY)
   */
  getConversations(clientId: string, leadId: string): ConversationEntry[] {
    return conversations.get(`${clientId}:${leadId}`) || [];
  }

  /**
   * Extract topics from conversation text (mock AI extraction)
   */
  extractTopics(text: string): string[] {
    const topics: string[] = [];
    const lowerText = text.toLowerCase();

    // Industry detection
    const industries = [
      'roofing', 'construction', 'pest control', 'restaurant', 'hotel',
      'retail', 'healthcare', 'salon', 'spa', 'gym', 'cafe',
      'bakery', 'clinic', 'pharmacy', 'automotive', 'jewelry'
    ];
    industries.forEach(ind => {
      if (lowerText.includes(ind)) topics.push(ind);
    });

    // Product interest detection
    const products = [
      'pos', 'payment', 'qr', 'loyalty', 'menu', 'kds',
      'inventory', 'crm', 'marketing', 'delivery', ' ordering'
    ];
    products.forEach(prod => {
      if (lowerText.includes(prod)) topics.push(`product:${prod}`);
    });

    // Pain points
    if (lowerText.includes('problem') || lowerText.includes('issue')) topics.push('pain_point');
    if (lowerText.includes('competitor') || lowerText.includes('using')) topics.push('competitor_mentioned');
    if (lowerText.includes('price') || lowerText.includes('cost') || lowerText.includes('budget')) topics.push('pricing_discussion');
    if (lowerText.includes('demo') || lowerText.includes('trial')) topics.push('demo_requested');

    return topics.length > 0 ? topics : ['general'];
  }
}

// ==================== EXPORT ====================

export const conversationMemory = new ConversationMemoryService();
