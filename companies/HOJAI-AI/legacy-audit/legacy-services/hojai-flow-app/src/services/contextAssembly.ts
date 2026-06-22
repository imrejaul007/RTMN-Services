/**
 * Context Assembly - Load context before user speaks
 *
 * Philosophy: Don't wait for the question. Prepare before the question.
 *
 * When user opens Hojai:
 * 1. Detect current app
 * 2. Load recent conversation
 * 3. Load business context
 * 4. Load relevant memories
 * 5. Prefetch into L1
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const FLOW_SERVICE = process.env.HOJAI_FLOW_URL || 'http://localhost:4580';

interface Context {
  currentApp: string;
  currentUser: string;
  recentConversation: ConversationItem[];
  businessContext: Record<string, unknown>;
  memories: MemoryItem[];
  knowledge: KnowledgeItem[];
}

interface ConversationItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface MemoryItem {
  tier: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  content: string;
  type: string;
  importance: number;
}

interface KnowledgeItem {
  id: string;
  title: string;
  type: string;
  relevance: number;
}

class ContextAssembly {
  private context: Context | null = null;
  private prefetchEnabled = true;

  /**
   * Assemble context for user
   * Called when user opens Hojai overlay
   */
  async assemble(userId: string, currentApp?: string): Promise<Context> {
    console.log('[Context] Assembling context for:', userId);

    // Load all context parts in parallel
    const [conversation, business, memories, knowledge] = await Promise.all([
      this.getRecentConversation(),
      this.getBusinessContext(currentApp),
      this.getMemories(userId, ['L1', 'L2']),
      this.getKnowledge(userId, currentApp),
    ]);

    this.context = {
      currentApp: currentApp || 'unknown',
      currentUser: userId,
      recentConversation: conversation,
      businessContext: business,
      memories,
      knowledge,
    };

    // Cache for L1 access
    await this.cacheContext();

    // Prefetch more if enabled
    if (this.prefetchEnabled) {
      this.prefetch(userId, currentApp);
    }

    return this.context;
  }

  /**
   * Get recent conversation (L1)
   */
  private async getRecentConversation(): Promise<ConversationItem[]> {
    try {
      const stored = await AsyncStorage.getItem('conversation_history');
      if (stored) {
        const history = JSON.parse(stored);
        return history.slice(-10); // Last 10 messages
      }
    } catch (e) {
      console.error('[Context] Failed to get conversation:', e);
    }
    return [];
  }

  /**
   * Get business context based on current app
   */
  private async getBusinessContext(currentApp?: string): Promise<Record<string, unknown>> {
    if (!currentApp) return {};

    try {
      // Load app-specific context
      const contextKey = `business_context_${currentApp}`;
      const stored = await AsyncStorage.getItem(contextKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('[Context] Failed to get business context:', e);
    }
    return {};
  }

  /**
   * Get relevant memories
   */
  private async getMemories(userId: string, tiers: string[]): Promise<MemoryItem[]> {
    try {
      const response = await axios.get(`${FLOW_SERVICE}/api/memory/retrieve`, {
        params: { userId, tiers: tiers.join(',') },
        timeout: 5000,
      });
      return response.data.data || [];
    } catch (e) {
      console.error('[Context] Failed to get memories:', e);
      return [];
    }
  }

  /**
   * Get relevant knowledge
   */
  private async getKnowledge(userId: string, currentApp?: string): Promise<KnowledgeItem[]> {
    if (!currentApp) return [];

    try {
      // Get knowledge relevant to current app
      const response = await axios.post(
        `${FLOW_SERVICE}/api/brain/search`,
        { userId, query: currentApp },
        { timeout: 5000 }
      );
      return response.data.data?.results || [];
    } catch (e) {
      console.error('[Context] Failed to get knowledge:', e);
      return [];
    }
  }

  /**
   * Cache context locally
   */
  private async cacheContext(): Promise<void> {
    if (!this.context) return;

    try {
      await AsyncStorage.setItem('current_context', JSON.stringify(this.context));
    } catch (e) {
      console.error('[Context] Failed to cache:', e);
    }
  }

  /**
   * Get cached context (for L1 speed)
   */
  async getCached(): Promise<Context | null> {
    try {
      const stored = await AsyncStorage.getItem('current_context');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('[Context] Failed to get cached:', e);
    }
    return null;
  }

  /**
   * Predictive prefetch
   * Load more context based on patterns
   */
  async prefetch(userId: string, currentApp?: string): Promise<void> {
    console.log('[Context] Predictive prefetch for:', currentApp);

    // Predict next likely needs based on app
    const predictions = this.predictNeeds(currentApp);

    // Prefetch predicted needs
    for (const need of predictions) {
      if (need.type === 'memory') {
        this.getMemories(userId, [need.tier || 'L2']);
      } else if (need.type === 'knowledge') {
        this.getKnowledge(userId, currentApp);
      }
    }
  }

  /**
   * Predict what user might need
   */
  private predictNeeds(currentApp?: string): Array<{type: string; tier?: string}> {
    const needs: Array<{type: string; tier?: string}> = [];

    if (!currentApp) return needs;

    // App-specific predictions
    switch (currentApp) {
      case 'merchant':
        needs.push(
          { type: 'memory', tier: 'L1' },
          { type: 'knowledge', tier: 'L4' }
        );
        break;
      case 'sales':
        needs.push(
          { type: 'memory', tier: 'L2' },
          { type: 'knowledge' }
        );
        break;
      case 'support':
        needs.push(
          { type: 'knowledge' },
          { type: 'memory', tier: 'L3' }
        );
        break;
    }

    // Always prefetch L3 personal memories
    needs.push({ type: 'memory', tier: 'L3' });

    return needs;
  }

  /**
   * Add to conversation history
   */
  async addToHistory(item: ConversationItem): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('conversation_history');
      const history: ConversationItem[] = stored ? JSON.parse(stored) : [];

      history.push(item);

      // Keep last 100 messages
      const trimmed = history.slice(-100);

      await AsyncStorage.setItem('conversation_history', JSON.stringify(trimmed));

      // Update cached context
      if (this.context) {
        this.context.recentConversation = trimmed.slice(-10);
        await this.cacheContext();
      }
    } catch (e) {
      console.error('[Context] Failed to add to history:', e);
    }
  }

  /**
   * Get current context
   */
  getCurrent(): Context | null {
    return this.context;
  }

  /**
   * Enable/disable prefetch
   */
  setPrefetchEnabled(enabled: boolean): void {
    this.prefetchEnabled = enabled;
  }
}

export const contextAssembly = new ContextAssembly();
export default contextAssembly;
