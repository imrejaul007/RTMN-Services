/**
 * Conversation Context - Track entities across messages
 *
 * Features:
 * - Track entities across conversation
 * - Maintain conversation state
 * - Resolve pronouns (it, they, him)
 * - Build conversation history
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CONTEXT_KEY = 'hojai_conversation';

// ============================================================================
// TYPES
// ============================================================================

export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  entities: TrackedEntity[];
  intent: string;
  timestamp: number;
}

export interface TrackedEntity {
  text: string;
  type: string;
  resolved: boolean;
  lastMention: number;
  mentions: number;
}

export interface ConversationState {
  turns: ConversationTurn[];
  trackedEntities: TrackedEntity[];
  topic: string | null;
  lastIntent: string | null;
}

// ============================================================================
// PRONOUN RESOLUTION
// ============================================================================

const PRONOUN_MAP: Record<string, { type: string; gender?: string }> = {
  // He/Him
  'he': { type: 'person', gender: 'male' },
  'him': { type: 'person', gender: 'male' },
  'his': { type: 'person', gender: 'male' },
  'himself': { type: 'person', gender: 'male' },

  // She/Her
  'she': { type: 'person', gender: 'female' },
  'her': { type: 'person', gender: 'female' },
  'hers': { type: 'person', gender: 'female' },
  'herself': { type: 'person', gender: 'female' },

  // They/Them
  'they': { type: 'person', gender: 'neutral' },
  'them': { type: 'person', gender: 'neutral' },
  'their': { type: 'person', gender: 'neutral' },
  'themselves': { type: 'person', gender: 'neutral' },

  // It
  'it': { type: 'thing' },
  'its': { type: 'thing' },
  'itself': { type: 'thing' },

  // This/That
  'this': { type: 'thing' },
  'that': { type: 'thing' },
  'these': { type: 'thing' },
  'those': { type: 'thing' },
};

// ============================================================================
// CONVERSATION CONTEXT
// ============================================================================

class ConversationContext {
  private state: ConversationState = {
    turns: [],
    trackedEntities: [],
    topic: null,
    lastIntent: null,
  };
  private isLoaded = false;

  /**
   * Initialize
   */
  async init(): Promise<void> {
    if (this.isLoaded) return;

    const stored = await AsyncStorage.getItem(CONTEXT_KEY);
    if (stored) {
      this.state = JSON.parse(stored);
    }

    this.isLoaded = true;
    console.log('[Context] Initialized with', this.state.turns.length, 'turns');
  }

  /**
   * Add user turn
   */
  async addUserTurn(
    text: string,
    entities: TrackedEntity[],
    intent: string
  ): Promise<void> {
    await this.init();

    const turn: ConversationTurn = {
      id: Date.now().toString(),
      role: 'user',
      text,
      entities,
      intent,
      timestamp: Date.now(),
    };

    this.state.turns.push(turn);
    this.state.lastIntent = intent;

    // Update tracked entities
    this.updateTrackedEntities(entities);

    // Update topic if needed
    this.updateTopic(text, intent);

    // Keep last 50 turns
    if (this.state.turns.length > 50) {
      this.state.turns = this.state.turns.slice(-50);
    }

    await this.persist();
  }

  /**
   * Add assistant turn
   */
  async addAssistantTurn(text: string): Promise<void> {
    await this.init();

    const turn: ConversationTurn = {
      id: Date.now().toString(),
      role: 'assistant',
      text,
      entities: [],
      intent: this.state.lastIntent || '',
      timestamp: Date.now(),
    };

    this.state.turns.push(turn);
    await this.persist();
  }

  /**
   * Update tracked entities
   */
  private updateTrackedEntities(entities: TrackedEntity[]): void {
    for (const entity of entities) {
      const existing = this.state.trackedEntities.find(
        (e) => e.text.toLowerCase() === entity.text.toLowerCase()
      );

      if (existing) {
        existing.mentions++;
        existing.lastMention = Date.now();
        existing.resolved = true;
      } else {
        this.state.trackedEntities.push({
          ...entity,
          mentions: 1,
          lastMention: Date.now(),
          resolved: true,
        });
      }
    }

    // Mark old entities as unresolved
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const entity of this.state.trackedEntities) {
      if (entity.lastMention < oneHourAgo) {
        entity.resolved = false;
      }
    }

    // Keep last 20 entities
    if (this.state.trackedEntities.length > 20) {
      this.state.trackedEntities = this.state.trackedEntities
        .sort((a, b) => b.lastMention - a.lastMention)
        .slice(0, 20);
    }
  }

  /**
   * Update conversation topic
   */
  private updateTopic(text: string, intent: string): void {
    // Simple topic extraction
    const words = text.toLowerCase().split(/\s+/);

    // Check for topic keywords
    const topicKeywords: Record<string, string> = {
      'meeting': 'meetings',
      'schedule': 'scheduling',
      'email': 'email',
      'message': 'messaging',
      'customer': 'customer',
      'merchant': 'merchant',
      'sale': 'sales',
      'support': 'support',
      'campaign': 'marketing',
      'payment': 'payments',
    };

    for (const [keyword, topic] of Object.entries(topicKeywords)) {
      if (words.includes(keyword)) {
        this.state.topic = topic;
        return;
      }
    }

    // Use intent as topic if no keyword found
    if (!this.state.topic && intent) {
      this.state.topic = intent;
    }
  }

  /**
   * Resolve pronoun to entity
   */
  async resolvePronoun(pronoun: string): Promise<string | null> {
    await this.init();

    const lowerPronoun = pronoun.toLowerCase();
    const pronounInfo = PRONOUN_MAP[lowerPronoun];

    if (!pronounInfo) return null;

    // Find most recent entity of matching type
    const candidates = this.state.trackedEntities
      .filter((e) => e.type === pronounInfo.type && e.resolved)
      .sort((a, b) => b.lastMention - a.lastMention);

    if (candidates.length > 0) {
      return candidates[0].text;
    }

    // Fallback to most recent person
    if (pronounInfo.type === 'person') {
      const persons = this.state.trackedEntities
        .filter((e) => e.resolved)
        .sort((a, b) => b.lastMention - a.lastMention);

      if (persons.length > 0) {
        return persons[0].text;
      }
    }

    return null;
  }

  /**
   * Get context for current message
   */
  async getContext(): Promise<{
    recentEntities: TrackedEntity[];
    topic: string | null;
    lastIntent: string | null;
    conversationSummary: string;
  }> {
    await this.init();

    const recentEntities = this.state.trackedEntities
      .filter((e) => e.resolved)
      .slice(0, 5);

    const conversationSummary = this.state.turns
      .slice(-5)
      .map((t) => `${t.role}: ${t.text.substring(0, 50)}...`)
      .join('\n');

    return {
      recentEntities,
      topic: this.state.topic,
      lastIntent: this.state.lastIntent,
      conversationSummary,
    };
  }

  /**
   * Expand pronouns in text
   */
  async expandPronouns(text: string): Promise<string> {
    let expanded = text;

    for (const pronoun of Object.keys(PRONOUN_MAP)) {
      const regex = new RegExp(`\\b${pronoun}\\b`, 'gi');
      const match = expanded.match(regex);

      if (match) {
        const resolved = await this.resolvePronoun(pronoun);
        if (resolved) {
          expanded = expanded.replace(regex, resolved);
        }
      }
    }

    return expanded;
  }

  /**
   * Check if entity was mentioned
   */
  async wasMentioned(entityText: string): Promise<boolean> {
    await this.init();

    return this.state.trackedEntities.some(
      (e) => e.text.toLowerCase() === entityText.toLowerCase()
    );
  }

  /**
   * Get conversation history
   */
  getHistory(limit: number = 10): ConversationTurn[] {
    return this.state.turns.slice(-limit);
  }

  /**
   * Clear conversation
   */
  async clear(): Promise<void> {
    this.state = {
      turns: [],
      trackedEntities: [],
      topic: null,
      lastIntent: null,
    };
    await AsyncStorage.removeItem(CONTEXT_KEY);
  }

  /**
   * Persist state
   */
  private async persist(): Promise<void> {
    await AsyncStorage.setItem(CONTEXT_KEY, JSON.stringify(this.state));
  }

  /**
   * Get stats
   */
  getStats(): { turns: number; entities: number; topic: string | null } {
    return {
      turns: this.state.turns.length,
      entities: this.state.trackedEntities.length,
      topic: this.state.topic,
    };
  }
}

export const conversationContext = new ConversationContext();
export default conversationContext;
