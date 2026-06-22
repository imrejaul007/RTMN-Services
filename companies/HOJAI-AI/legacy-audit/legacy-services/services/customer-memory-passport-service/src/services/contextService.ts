import {
  CustomerMemoryPassportModel,
  IMemoryEntry,
  IInteraction,
  ICompanyContext,
  SentimentLabel,
  MemoryType,
  InteractionType,
} from '../models/passport.js';
import { logger } from '../utils/logger.js';

export interface ConversationContext {
  customerId: string;
  companyId?: string;
  summary: string;
  recentMemories: IMemoryEntry[];
  recentInteractions: IInteraction[];
  preferences: Record<string, unknown>;
  sentiment: {
    current: SentimentLabel;
    score: number;
    trend: 'improving' | 'stable' | 'declining';
    history: Array<{ date: Date; score: number; label: SentimentLabel }>;
  };
  keyFacts: string[];
  activeIssues: IMemoryEntry[];
  healthScore: number;
  engagementScore: number;
  churnRisk: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export interface PreferenceSummary {
  channel?: string;
  language?: string;
  communicationStyle?: string;
  timezone?: string;
  interests: string[];
  dislikes: string[];
  specialRequirements: string[];
  byCompany: Record<string, Record<string, unknown>>;
}

export interface SentimentHistoryEntry {
  date: Date;
  score: number;
  label: SentimentLabel;
  source?: string;
  interaction?: string;
}

export interface PatternDetection {
  type: 'recurring_issue' | 'preference' | 'behavior' | 'sentiment_trend' | 'channel_preference';
  description: string;
  evidence: string[];
  frequency: number;
  impact: 'positive' | 'negative' | 'neutral';
  detectedAt: Date;
}

class ContextService {
  async getContextForCompany(
    customerId: string,
    companyId: string
  ): Promise<ICompanyContext | null> {
    const passport = await CustomerMemoryPassportModel.findOne({ customerId });
    if (!passport) {
      return null;
    }

    const companyContext = passport.linkedCompanies.find(
      (c) => c.companyId === companyId
    );

    if (!companyContext) {
      logger.debug('Company context not found', { customerId, companyId });
      return null;
    }

    return companyContext;
  }

  async buildConversationContext(
    customerId: string,
    companyId?: string,
    options: {
      includeMemories?: number;
      includeInteractions?: number;
      includePreferences?: boolean;
      includeSentiment?: boolean;
      includePatterns?: boolean;
    } = {}
  ): Promise<ConversationContext> {
    const passport = await CustomerMemoryPassportModel.findOne({ customerId });
    if (!passport) {
      throw new Error(`Passport not found for customer: ${customerId}`);
    }

    const {
      includeMemories = 10,
      includeInteractions = 5,
      includePreferences = true,
      includeSentiment = true,
      includePatterns = false,
    } = options;

    const recentMemories = passport.memories
      .filter((m) => !m.isDeleted && (!companyId || this.isMemoryRelevantToCompany(m, companyId)))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, includeMemories);

    const recentInteractions = passport.interactions
      .filter((i) => !companyId || i.companyId === companyId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, includeInteractions);

    const preferences = includePreferences
      ? await this.getPreferences(customerId, companyId)
      : {};

    let sentimentContext = {
      current: SentimentLabel.NEUTRAL as SentimentLabel,
      score: 0,
      trend: 'stable' as 'improving' | 'stable' | 'declining',
      history: [] as Array<{ date: Date; score: number; label: SentimentLabel }>,
    };

    if (includeSentiment) {
      sentimentContext = await this.getSentimentAnalysis(customerId, companyId);
    }

    const keyFacts = this.extractKeyFacts(recentMemories);

    const activeIssues = recentMemories.filter(
      (m) =>
        m.type === MemoryType.COMPLAINT ||
        m.type === MemoryType.SUPPORT ||
        (m.importance === 'high' || m.importance === 'critical')
    );

    const recommendations: string[] = [];
    if (sentimentContext.trend === 'declining') {
      recommendations.push('Consider proactive outreach to address potential concerns');
    }
    if (activeIssues.length > 0) {
      recommendations.push(`Address ${activeIssues.length} active issue(s) for better retention`);
    }
    if (passport.engagementScore < 30) {
      recommendations.push('Increase engagement through personalized recommendations');
    }
    if (passport.churnRisk === 'high' || passport.churnRisk === 'critical') {
      recommendations.push('Priority: Implement retention strategy immediately');
    }

    if (includePatterns) {
      const patterns = await this.detectPatterns(customerId, companyId);
      for (const pattern of patterns) {
        if (pattern.impact === 'negative' && pattern.type === 'recurring_issue') {
          recommendations.push(`Address recurring issue: ${pattern.description}`);
        }
      }
    }

    return {
      customerId,
      companyId,
      summary: this.generateContextSummary(passport, recentInteractions, sentimentContext),
      recentMemories,
      recentInteractions,
      preferences,
      sentiment: sentimentContext,
      keyFacts,
      activeIssues,
      healthScore: passport.healthScore,
      engagementScore: passport.engagementScore,
      churnRisk: passport.churnRisk,
      recommendations,
    };
  }

  async getRecentHistory(
    customerId: string,
    limit: number = 20
  ): Promise<Array<{ date: Date; type: string; summary: string; details?: unknown }>> {
    const passport = await CustomerMemoryPassportModel.findOne({ customerId });
    if (!passport) {
      return [];
    }

    const historyItems: Array<{
      date: Date;
      type: string;
      summary: string;
      details?: unknown;
    }> = [];

    for (const memory of passport.memories.filter((m) => !m.isDeleted)) {
      historyItems.push({
        date: memory.createdAt,
        type: `memory:${memory.type}`,
        summary: memory.summary || memory.title,
        details: {
          id: memory.id,
          importance: memory.importance,
          sentiment: memory.sentiment,
        },
      });
    }

    for (const interaction of passport.interactions) {
      historyItems.push({
        date: interaction.timestamp,
        type: `interaction:${interaction.type}`,
        summary: interaction.summary,
        details: {
          id: interaction.id,
          channel: interaction.channel,
          sentiment: interaction.sentiment,
          outcome: interaction.outcome,
        },
      });
    }

    return historyItems
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limit);
  }

  async getPreferences(
    customerId: string,
    companyId?: string
  ): Promise<PreferenceSummary> {
    const passport = await CustomerMemoryPassportModel.findOne({ customerId });
    if (!passport) {
      return {
        interests: [],
        dislikes: [],
        specialRequirements: [],
        byCompany: {},
      };
    }

    const preferenceMemories = passport.memories.filter(
      (m) => !m.isDeleted && m.type === MemoryType.PREFERENCE
    );

    const interests: string[] = [];
    const dislikes: string[] = [];
    const specialRequirements: string[] = [];
    const channelPreference = new Map<string, number>();
    const languageSet = new Set<string>();
    const communicationStyles = new Map<string, number>();
    const timezoneSet = new Set<string>();
    const byCompany: Record<string, Record<string, unknown>> = {};

    for (const memory of preferenceMemories) {
      const metadata = memory.metadata as Record<string, unknown> || {};
      const content = memory.content.toLowerCase();

      if (memory.title.toLowerCase().includes('interest') ||
          content.includes('likes') || content.includes('enjoys')) {
        interests.push(memory.content);
      }
      if (memory.title.toLowerCase().includes('dislike') ||
          content.includes('dislikes') || content.includes('avoid')) {
        dislikes.push(memory.content);
      }
      if (memory.title.toLowerCase().includes('requirement') ||
          memory.title.toLowerCase().includes('need')) {
        specialRequirements.push(memory.content);
      }
      if (metadata.channel) {
        const count = channelPreference.get(metadata.channel as string) || 0;
        channelPreference.set(metadata.channel as string, count + 1);
      }
      if (metadata.language) {
        languageSet.add(metadata.language as string);
      }
      if (metadata.communicationStyle) {
        const count = communicationStyles.get(metadata.communicationStyle as string) || 0;
        communicationStyles.set(metadata.communicationStyle as string, count + 1);
      }
      if (metadata.timezone) {
        timezoneSet.add(metadata.timezone as string);
      }
      if (metadata.companyId && companyId) {
        if (!byCompany[metadata.companyId as string]) {
          byCompany[metadata.companyId as string] = {};
        }
        byCompany[metadata.companyId as string][memory.title] = memory.content;
      }
    }

    for (const interaction of passport.interactions) {
      const count = channelPreference.get(interaction.channel) || 0;
      channelPreference.set(interaction.channel, count + 1);
      if (interaction.agentId) {
        const count = communicationStyles.get('agent_interaction') || 0;
        communicationStyles.set('agent_interaction', count + 1);
      }
    }

    const preferredChannel = this.getMostFrequent(channelPreference);
    const preferredCommunicationStyle = this.getMostFrequent(communicationStyles);

    return {
      channel: preferredChannel || undefined,
      language: languageSet.size > 0 ? Array.from(languageSet)[0] : undefined,
      communicationStyle: preferredCommunicationStyle || undefined,
      timezone: timezoneSet.size > 0 ? Array.from(timezoneSet)[0] : undefined,
      interests,
      dislikes,
      specialRequirements,
      byCompany,
    };
  }

  async getSentimentHistory(
    customerId: string,
    days: number = 30
  ): Promise<SentimentHistoryEntry[]> {
    const passport = await CustomerMemoryPassportModel.findOne({ customerId });
    if (!passport) {
      return [];
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const sentimentHistory: SentimentHistoryEntry[] = [];

    for (const memory of passport.memories) {
      if (
        !memory.isDeleted &&
        memory.sentiment &&
        memory.createdAt >= cutoffDate
      ) {
        sentimentHistory.push({
          date: memory.createdAt,
          score: memory.sentimentScore || 0,
          label: memory.sentiment,
          source: 'memory',
        });
      }
    }

    for (const interaction of passport.interactions) {
      if (interaction.timestamp >= cutoffDate && interaction.sentiment) {
        sentimentHistory.push({
          date: interaction.timestamp,
          score: interaction.sentimentScore || 0,
          label: interaction.sentiment,
          interaction: interaction.id,
        });
      }
    }

    return sentimentHistory.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  async detectPatterns(
    customerId: string,
    companyId?: string
  ): Promise<PatternDetection[]> {
    const passport = await CustomerMemoryPassportModel.findOne({ customerId });
    if (!passport) {
      return [];
    }

    const patterns: PatternDetection[] = [];
    const memories = passport.memories.filter((m) => !m.isDeleted);
    const interactions = passport.interactions;

    const channelCounts = new Map<string, number>();
    for (const interaction of interactions) {
      if (!companyId || interaction.companyId === companyId) {
        const count = channelCounts.get(interaction.channel) || 0;
        channelCounts.set(interaction.channel, count + 1);
      }
    }

    const preferredChannel = this.getMostFrequent(channelCounts);
    if (preferredChannel && channelCounts.get(preferredChannel)! >= 3) {
      patterns.push({
        type: 'channel_preference',
        description: `Frequently uses ${preferredChannel}`,
        evidence: [`${preferredChannel}: ${channelCounts.get(preferredChannel)} interactions`],
        frequency: channelCounts.get(preferredChannel)!,
        impact: 'neutral',
        detectedAt: new Date(),
      });
    }

    const sentimentHistory = await this.getSentimentHistory(customerId, 30);
    if (sentimentHistory.length >= 3) {
      const scores = sentimentHistory.map((h) => h.score);
      const trend = this.calculateTrend(scores);

      if (trend === 'declining') {
        patterns.push({
          type: 'sentiment_trend',
          description: 'Sentiment has been declining over the past 30 days',
          evidence: sentimentHistory.slice(-3).map(
            (h) => `${h.date.toISOString().split('T')[0]}: ${h.label} (${h.score})`
          ),
          frequency: sentimentHistory.length,
          impact: 'negative',
          detectedAt: new Date(),
        });
      } else if (trend === 'improving') {
        patterns.push({
          type: 'sentiment_trend',
          description: 'Sentiment has been improving over the past 30 days',
          evidence: sentimentHistory.slice(-3).map(
            (h) => `${h.date.toISOString().split('T')[0]}: ${h.label} (${h.score})`
          ),
          frequency: sentimentHistory.length,
          impact: 'positive',
          detectedAt: new Date(),
        });
      }
    }

    const issueKeywords = ['problem', 'issue', 'broken', 'failed', 'error', 'wrong'];
    const issueMemories = memories.filter(
      (m) =>
        m.type === MemoryType.COMPLAINT ||
        m.type === MemoryType.SUPPORT ||
        issueKeywords.some((kw) => m.content.toLowerCase().includes(kw))
    );

    if (issueMemories.length >= 2) {
      const issueGroups = this.groupSimilarContent(issueMemories);
      for (const group of issueGroups) {
        if (group.items.length >= 2) {
          patterns.push({
            type: 'recurring_issue',
            description: `Recurring issue related to: ${group.theme}`,
            evidence: group.items.map((m) => `${m.id}: ${m.title}`),
            frequency: group.items.length,
            impact: 'negative',
            detectedAt: new Date(),
          });
        }
      }
    }

    const preferenceMemories = memories.filter(
      (m) => m.type === MemoryType.PREFERENCE
    );
    if (preferenceMemories.length >= 3) {
      const themes = this.extractThemes(preferenceMemories);
      for (const theme of themes) {
        patterns.push({
          type: 'preference',
          description: `Consistent preference for: ${theme}`,
          evidence: preferenceMemories
            .filter((m) => m.content.toLowerCase().includes(theme.toLowerCase()))
            .map((m) => m.id),
          frequency: preferenceMemories.filter((m) =>
            m.content.toLowerCase().includes(theme.toLowerCase())
          ).length,
          impact: 'positive',
          detectedAt: new Date(),
        });
      }
    }

    return patterns;
  }

  private async getSentimentAnalysis(
    customerId: string,
    companyId?: string
  ): Promise<ConversationContext['sentiment']> {
    const history = await this.getSentimentHistory(customerId, 30);

    if (history.length === 0) {
      return {
        current: SentimentLabel.NEUTRAL,
        score: 0,
        trend: 'stable',
        history: [],
      };
    }

    const recentHistory = history.slice(-5);
    const avgScore =
      recentHistory.reduce((sum, h) => sum + h.score, 0) / recentHistory.length;
    const currentLabel = this.scoreToLabel(avgScore);

    const olderHistory = history.slice(0, Math.floor(history.length / 2));
    const recentHalf = history.slice(Math.floor(history.length / 2));
    const olderAvg = olderHistory.length > 0
      ? olderHistory.reduce((sum, h) => sum + h.score, 0) / olderHistory.length
      : avgScore;
    const recentAvg = recentHalf.length > 0
      ? recentHalf.reduce((sum, h) => sum + h.score, 0) / recentHalf.length
      : avgScore;

    let trend: 'improving' | 'stable' | 'declining';
    if (recentAvg - olderAvg > 0.2) {
      trend = 'improving';
    } else if (olderAvg - recentAvg > 0.2) {
      trend = 'declining';
    } else {
      trend = 'stable';
    }

    return {
      current: currentLabel,
      score: Math.round(avgScore * 100) / 100,
      trend,
      history: recentHistory.map((h) => ({
        date: h.date,
        score: h.score,
        label: h.label,
      })),
    };
  }

  private scoreToLabel(score: number): SentimentLabel {
    if (score >= 0.7) return SentimentLabel.VERY_POSITIVE;
    if (score >= 0.3) return SentimentLabel.POSITIVE;
    if (score >= -0.3) return SentimentLabel.NEUTRAL;
    if (score >= -0.7) return SentimentLabel.NEGATIVE;
    return SentimentLabel.VERY_NEGATIVE;
  }

  private calculateTrend(scores: number[]): 'improving' | 'stable' | 'declining' {
    if (scores.length < 2) return 'stable';

    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (secondAvg - firstAvg > 0.15) return 'improving';
    if (firstAvg - secondAvg > 0.15) return 'declining';
    return 'stable';
  }

  private extractKeyFacts(memories: IMemoryEntry[]): string[] {
    const facts: string[] = [];

    const importantMemories = memories.filter(
      (m) => m.importance === 'high' || m.importance === 'critical'
    );
    for (const memory of importantMemories.slice(0, 5)) {
      facts.push(`${memory.title}: ${memory.summary || memory.content.slice(0, 100)}`);
    }

    return facts;
  }

  private generateContextSummary(
    passport: {
      customerName?: string;
      totalInteractions: number;
      linkedCompanies: ICompanyContext[];
      healthScore: number;
      engagementScore: number;
    },
    recentInteractions: IInteraction[],
    sentiment: { current: SentimentLabel; score: number; trend: string }
  ): string {
    const companyNames = passport.linkedCompanies.map((c) => c.companyName).join(', ') || 'No companies';
    const interactionCount = passport.totalInteractions;
    const recentTypes = [...new Set(recentInteractions.map((i) => i.type))];

    return `Customer ${passport.customerName || 'Unknown'} has interacted across ${passport.linkedCompanies.length} company(ies): ${companyNames}. ` +
      `Total interactions: ${interactionCount}. Recent interaction types: ${recentTypes.join(', ') || 'None'}. ` +
      `Current sentiment: ${sentiment.current} (${sentiment.score}). ` +
      `Health score: ${passport.healthScore}/100. Engagement: ${passport.engagementScore}/100.`;
  }

  private getMostFrequent(map: Map<string, number>): string | undefined {
    let maxCount = 0;
    let mostFrequent: string | undefined;

    for (const [key, count] of map) {
      if (count > maxCount) {
        maxCount = count;
        mostFrequent = key;
      }
    }

    return mostFrequent;
  }

  private isMemoryRelevantToCompany(memory: IMemoryEntry, companyId: string): boolean {
    const metadata = memory.metadata as Record<string, unknown> || {};
    return metadata.companyId === companyId;
  }

  private groupSimilarContent(
    memories: IMemoryEntry[]
  ): Array<{ theme: string; items: IMemoryEntry[] }> {
    const groups: Map<string, IMemoryEntry[]> = new Map();
    const themeKeywords: Record<string, string[]> = {
      'payment': ['payment', 'billing', 'charge', 'refund', 'invoice'],
      'delivery': ['delivery', 'shipping', 'order', 'package'],
      'technical': ['error', 'bug', 'crash', 'technical', 'not working'],
      'account': ['account', 'login', 'password', 'access'],
      'product': ['product', 'quality', 'defective', 'broken'],
    };

    for (const memory of memories) {
      let matched = false;
      const content = memory.content.toLowerCase();

      for (const [theme, keywords] of Object.entries(themeKeywords)) {
        if (keywords.some((kw) => content.includes(kw))) {
          if (!groups.has(theme)) {
            groups.set(theme, []);
          }
          groups.get(theme)!.push(memory);
          matched = true;
          break;
        }
      }

      if (!matched) {
        const shortContent = content.slice(0, 50);
        if (!groups.has(shortContent)) {
          groups.set(shortContent, []);
        }
        groups.get(shortContent)!.push(memory);
      }
    }

    return Array.from(groups.entries()).map(([theme, items]) => ({ theme, items }));
  }

  private extractThemes(memories: IMemoryEntry[]): string[] {
    const themes: string[] = [];
    const themeKeywords: Record<string, string[]> = {
      'organic products': ['organic', 'natural', 'chemical-free'],
      'fast delivery': ['fast', 'quick', 'express'],
      'premium quality': ['premium', 'luxury', 'high-end'],
      'budget-friendly': ['budget', 'affordable', 'cheap', 'value'],
      'eco-friendly': ['eco', 'sustainable', 'recyclable', 'green'],
    };

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      const matches = memories.filter((m) =>
        keywords.some((kw) => m.content.toLowerCase().includes(kw))
      );
      if (matches.length >= 2) {
        themes.push(theme);
      }
    }

    return themes;
  }
}

export const contextService = new ContextService();
