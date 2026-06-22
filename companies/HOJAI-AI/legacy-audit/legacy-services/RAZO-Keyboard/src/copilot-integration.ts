/**
 * CoPilot Integration
 * Connects RAZO Keyboard AI to Genie and RTNM services
 */

import { GenieIntegration } from '../../services/genie-voice/src/genie-integration';

// Service URLs
const GENIE_URL = process.env.GENIE_VOICE_URL || 'http://localhost:4760';

export interface KeyboardInput {
  text: string;
  userId: string;
  app?: string;
  context?: any;
}

export interface CoPilotResult {
  predictions: string[];
  suggestions: CoPilotSuggestion[];
  actions: CoPilotAction[];
  genieResponse?: string;
  mode: 'typing' | 'genie' | 'copilot' | 'action';
}

export interface CoPilotSuggestion {
  type: 'text' | 'deeplink' | 'genie' | 'action';
  text: string;
  icon?: string;
  action?: string;
  confidence: number;
}

export interface CoPilotAction {
  type: 'deeplink' | 'genie' | 'command' | 'payment';
  label: string;
  icon: string;
  data: any;
}

export class CoPilotIntegration {
  private genieIntegration: GenieIntegration;
  private genieUrl: string;

  constructor() {
    this.genieIntegration = new GenieIntegration();
    this.genieUrl = GENIE_URL;
  }

  /**
   * Process keyboard input and determine mode
   */
  async processKeyboardInput(input: string, userId: string): Promise<CoPilotResult> {
    // Check for Genie command
    if (this.isGenieCommand(input)) {
      return this.processGenieMode(input, userId);
    }

    // Check for CoPilot command
    if (this.isCopilotCommand(input)) {
      return this.processCopilotMode(input, userId);
    }

    // Check for action command
    if (this.isActionCommand(input)) {
      return this.processActionMode(input, userId);
    }

    // Default: typing mode with suggestions
    return this.processTypingMode(input, userId);
  }

  /**
   * Check if input is a Genie command
   */
  private isGenieCommand(input: string): boolean {
    const lower = input.toLowerCase();
    return (
      lower.startsWith('hey genie') ||
      lower.startsWith('genie') ||
      lower.startsWith('@genie') ||
      lower.startsWith('/genie')
    );
  }

  /**
   * Check if input is a CoPilot command
   */
  private isCopilotCommand(input: string): boolean {
    const lower = input.toLowerCase();
    return (
      lower.startsWith('hey copilot') ||
      lower.startsWith('copilot') ||
      lower.startsWith('@copilot') ||
      lower.startsWith('/copilot')
    );
  }

  /**
   * Check if input is an action command
   */
  private isActionCommand(input: string): boolean {
    const actionKeywords = [
      'book',
      'order',
      'send',
      'pay',
      'schedule',
      'call',
      'message',
      'create',
      'update',
      'delete'
    ];
    const lower = input.toLowerCase();
    return actionKeywords.some(keyword => lower.startsWith(keyword));
  }

  /**
   * Process Genie mode
   */
  private async processGenieMode(input: string, userId: string): Promise<CoPilotResult> {
    try {
      // Route to Genie
      const response = await fetch(`${this.genieUrl}/api/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: input.replace(/^(hey genie|genie|@genie|\/genie)\s*/i, ''),
          userId
        })
      });

      const genieResponse = response.ok ? await response.json() : null;

      return {
        predictions: [],
        suggestions: [],
        actions: [],
        genieResponse: genieResponse?.response || 'Genie processed your request',
        mode: 'genie'
      };
    } catch (error) {
      console.error('Genie routing error:', error);
      return {
        predictions: [],
        suggestions: [],
        actions: [],
        genieResponse: 'Unable to connect to Genie',
        mode: 'genie'
      };
    }
  }

  /**
   * Process CoPilot mode (business tasks)
   */
  private async processCopilotMode(input: string, userId: string): Promise<CoPilotResult> {
    const command = input.replace(/^(hey copilot|copilot|@copilot|\/copilot)\s*/i, '');

    // Get context from Genie memory
    const memory = await this.genieIntegration.getMemory(userId);

    return {
      predictions: [],
      suggestions: this.generateCopilotSuggestions(command),
      actions: [],
      mode: 'copilot'
    };
  }

  /**
   * Process Action mode
   */
  private async processActionMode(input: string, userId: string): Promise<CoPilotResult> {
    const action = this.parseActionCommand(input);

    return {
      predictions: [],
      suggestions: [],
      actions: [
        {
          type: 'action',
          label: action.label,
          icon: action.icon,
          data: action.data
        }
      ],
      mode: 'action'
    };
  }

  /**
   * Process Typing mode with contextual suggestions
   */
  private async processTypingMode(input: string, userId: string): Promise<CoPilotResult> {
    const suggestions = await this.getSmartSuggestions(userId, { text: input });
    const predictions = this.generatePredictions(input);

    return {
      predictions,
      suggestions,
      actions: [],
      mode: 'typing'
    };
  }

  /**
   * Generate typing predictions
   */
  private generatePredictions(input: string): string[] {
    const predictions: string[] = [];
    const lower = input.toLowerCase();

    // Context-aware predictions
    if (lower.endsWith('hi') || lower.endsWith('hello')) {
      predictions.push('Hi there! How can I help you today?');
    }

    if (lower.includes('thank')) {
      predictions.push('Thank you for your patience.');
      predictions.push('Thank you for reaching out.');
    }

    if (lower.includes('meeting')) {
      predictions.push('I will send you the meeting invite.');
      predictions.push('Meeting scheduled for tomorrow at 10 AM.');
    }

    if (lower.includes('report')) {
      predictions.push('Here is your report summary.');
      predictions.push('Report has been generated and emailed.');
    }

    return predictions;
  }

  /**
   * Get smart suggestions based on context
   */
  async getSmartSuggestions(userId: string, context: any): Promise<CoPilotSuggestion[]> {
    const suggestions: CoPilotSuggestion[] = [];
    const text = context.text?.toLowerCase() || '';

    // Deep link suggestions
    if (text.includes('flight')) {
      suggestions.push({
        type: 'deeplink',
        text: 'Search flights',
        icon: '✈️',
        action: 'airzy://flight-search',
        confidence: 0.9
      });
    }

    if (text.includes('hotel')) {
      suggestions.push({
        type: 'deeplink',
        text: 'Book hotel',
        icon: '🏨',
        action: 'stayown://search',
        confidence: 0.9
      });
    }

    if (text.includes('cab') || text.includes('taxi')) {
      suggestions.push({
        type: 'deeplink',
        text: 'Book cab',
        icon: '🚗',
        action: 'khaimove://book',
        confidence: 0.9
      });
    }

    if (text.includes('food') || text.includes('restaurant')) {
      suggestions.push({
        type: 'deeplink',
        text: 'Order food',
        icon: '🍔',
        action: 'nexha://food',
        confidence: 0.85
      });
    }

    // Genie suggestions
    if (text.includes('report') || text.includes('sales')) {
      suggestions.push({
        type: 'genie',
        text: 'Generate report',
        icon: '📊',
        action: 'copilot://report',
        confidence: 0.8
      });
    }

    if (text.includes('birthday')) {
      suggestions.push({
        type: 'genie',
        text: 'Generate birthday message',
        icon: '🎂',
        action: 'birthday:generate',
        confidence: 0.85
      });
    }

    if (text.includes('email') || text.includes('mail')) {
      suggestions.push({
        type: 'genie',
        text: 'Draft email',
        icon: '📧',
        action: 'email:draft',
        confidence: 0.8
      });
    }

    return suggestions;
  }

  /**
   * Generate CoPilot-specific suggestions
   */
  private generateCopilotSuggestions(command: string): CoPilotSuggestion[] {
    const suggestions: CoPilotSuggestion[] = [];
    const lower = command.toLowerCase();

    if (lower.includes('report')) {
      suggestions.push({
        type: 'action',
        text: 'Generate Sales Report',
        icon: '📊',
        action: 'report:sales',
        confidence: 0.9
      });
      suggestions.push({
        type: 'action',
        text: 'Generate Financial Report',
        icon: '💰',
        action: 'report:finance',
        confidence: 0.85
      });
    }

    if (lower.includes('email')) {
      suggestions.push({
        type: 'action',
        text: 'Draft follow-up email',
        icon: '📧',
        action: 'email:followup',
        confidence: 0.85
      });
    }

    if (lower.includes('meeting')) {
      suggestions.push({
        type: 'action',
        text: 'Schedule meeting',
        icon: '📅',
        action: 'meeting:schedule',
        confidence: 0.9
      });
    }

    return suggestions;
  }

  /**
   * Parse action command
   */
  private parseActionCommand(input: string): { label: string; icon: string; data: any } {
    const lower = input.toLowerCase();

    if (lower.startsWith('book')) {
      if (lower.includes('flight')) {
        return { label: 'Book Flight', icon: '✈️', data: { action: 'book_flight' } };
      }
      if (lower.includes('hotel')) {
        return { label: 'Book Hotel', icon: '🏨', data: { action: 'book_hotel' } };
      }
      return { label: 'Book', icon: '📅', data: { action: 'book' } };
    }

    if (lower.startsWith('pay')) {
      return { label: 'Make Payment', icon: '💰', data: { action: 'payment' } };
    }

    if (lower.startsWith('send')) {
      return { label: 'Send', icon: '📤', data: { action: 'send' } };
    }

    return { label: 'Execute', icon: '⚡', data: { action: 'execute' } };
  }

  /**
   * Get keyboard feed (Today's Story)
   */
  async getKeyboardFeed(userId: string): Promise<{
    greeting: string;
    stories: any[];
    quickActions: CoPilotAction[];
  }> {
    const memory = await this.genieIntegration.getMemory(userId);

    return {
      greeting: this.getGreeting(),
      stories: this.generateStories(memory),
      quickActions: this.getQuickActions()
    };
  }

  /**
   * Generate greeting based on time of day
   */
  private getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  /**
   * Generate keyboard stories
   */
  private generateStories(memory: any): any[] {
    const stories = [];

    // Recent interactions
    if (memory.recentInteractions?.length > 0) {
      stories.push({
        type: 'recent',
        title: 'Recent Activity',
        items: memory.recentInteractions.slice(0, 3)
      });
    }

    return stories;
  }

  /**
   * Get quick actions
   */
  private getQuickActions(): CoPilotAction[] {
    return [
      { type: 'deeplink', label: 'Flight', icon: '✈️', data: { action: 'airzy://flight-search' } },
      { type: 'deeplink', label: 'Hotel', icon: '🏨', data: { action: 'stayown://search' } },
      { type: 'deeplink', label: 'Cab', icon: '🚗', data: { action: 'khaimove://book' } },
      { type: 'deeplink', label: 'Pay', icon: '💰', data: { action: 'rezwallet://pay' } },
      { type: 'genie', label: 'Genie', icon: '🤖', data: { action: 'genie://ask' } },
      { type: 'action', label: 'Report', icon: '📊', data: { action: 'copilot://report' } }
    ];
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; genie: boolean }> {
    try {
      const response = await fetch(`${this.genieUrl}/health`);
      return {
        status: response.ok ? 'healthy' : 'degraded',
        genie: response.ok
      };
    } catch {
      return {
        status: 'unavailable',
        genie: false
      };
    }
  }
}

export const copilotIntegration = new CoPilotIntegration();
export default copilotIntegration;