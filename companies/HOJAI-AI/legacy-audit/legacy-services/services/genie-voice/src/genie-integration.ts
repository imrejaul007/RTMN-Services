/**
 * Genie Integration Hub
 * Connects Genie to all RTNM services for industry expertise
 */

import { RABTULClient } from '../../hojai-shared/src/rabtul-client';
import { SkillNetClient } from '../../hojai-shared/src/skillnet-client';
import { IndustryAIClient } from '../../hojai-shared/src/industry-ai-client';

// Memory service configuration
const MEMORY_SERVICE_URL = process.env.GENIE_MEMORY_SERVICE_URL || 'http://localhost:4520';

export interface GenieMemory {
  recentInteractions: {
    command: string;
    response: string;
    timestamp: string;
  }[];
  preferences: Record<string, any>;
  relationships: Record<string, string>;
  industryFocus?: string;
}

export interface GenieCommand {
  command: string;
  userId: string;
  context?: any;
  timestamp: string;
}

export interface GenieResult {
  response: string;
  actions?: any[];
  memory?: GenieMemory;
  industryContext?: any;
  skillUsed?: string;
}

export class GenieIntegration {
  private rabtulClient: RABTULClient;
  private skillnetClient: SkillNetClient;
  private industryClient: IndustryAIClient;

  constructor() {
    this.rabtulClient = new RABTULClient();
    this.skillnetClient = new SkillNetClient();
    this.industryClient = new IndustryAIClient();
  }

  /**
   * Process Genie command with full context
   */
  async processCommand(command: string, userId: string): Promise<GenieResult> {
    try {
      // 1. Get user context from memory
      const memory = await this.getMemory(userId);

      // 2. Detect industry from command
      const industry = this.detectIndustry(command);
      let industryContext = null;

      if (industry) {
        industryContext = await this.industryClient.getIndustryContext(industry);
      }

      // 3. Get relevant skills
      const skillsResult = await this.skillnetClient.getSkills(industry || undefined);
      const skills = skillsResult.skills || [];

      // 4. Execute goal with context
      const result = await this.skillnetClient.executeGoal(command, {
        memory,
        industryContext,
        skills,
        userId
      });

      // 5. Update memory
      await this.updateMemory(userId, command, result);

      return {
        response: this.formatResponse(result),
        actions: result.steps || [],
        memory,
        industryContext,
        skillUsed: result.skillUsed
      };
    } catch (error) {
      console.error('Genie command processing error:', error);
      return {
        response: 'I encountered an error processing your request. Please try again.',
        actions: [],
        memory: await this.getMemory(userId)
      };
    }
  }

  /**
   * Get user memory from memory service
   */
  async getMemory(userId: string): Promise<GenieMemory> {
    try {
      const response = await fetch(`${MEMORY_SERVICE_URL}/api/memory/${userId}`);
      if (response.ok) {
        const data = await response.json();
        return data.memory || this.getDefaultMemory();
      }
    } catch (error) {
      console.error('Memory fetch error:', error);
    }
    return this.getDefaultMemory();
  }

  /**
   * Update user memory after command
   */
  async updateMemory(userId: string, command: string, result: any): Promise<void> {
    try {
      const memory = await this.getMemory(userId);

      // Add interaction to recent
      memory.recentInteractions.unshift({
        command,
        response: this.formatResponse(result),
        timestamp: new Date().toISOString()
      });

      // Keep only last 10 interactions
      memory.recentInteractions = memory.recentInteractions.slice(0, 10);

      // Save to memory service
      await fetch(`${MEMORY_SERVICE_URL}/api/memory/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memory })
      });
    } catch (error) {
      console.error('Memory update error:', error);
    }
  }

  /**
   * Detect industry from command
   */
  detectIndustry(command: string): string | null {
    const industries = [
      'healthcare',
      'legal',
      'finance',
      'real estate',
      'restaurant',
      'hotel',
      'retail',
      'manufacturing',
      'logistics',
      'education'
    ];

    const lower = command.toLowerCase();
    for (const industry of industries) {
      if (lower.includes(industry)) {
        return industry.replace(' ', '');
      }
    }
    return null;
  }

  /**
   * Format result into response string
   */
  private formatResponse(result: any): string {
    if (typeof result === 'string') {
      return result;
    }

    if (result.response) {
      return result.response;
    }

    if (result.steps && result.steps.length > 0) {
      return result.steps.map((s: any, i: number) => `${i + 1}. ${s.action}`).join('\n');
    }

    return 'I processed your request successfully.';
  }

  /**
   * Process voice command
   */
  async processVoiceCommand(audioData: string, userId: string): Promise<GenieResult> {
    // Convert audio to text (simplified - would use actual STT in production)
    const command = await this.audioToText(audioData);
    return this.processCommand(command, userId);
  }

  /**
   * Audio to text conversion (placeholder)
   */
  private async audioToText(audioData: string): Promise<string> {
    // This would integrate with actual STT service
    return audioData;
  }

  /**
   * Get industry insights for user
   */
  async getIndustryInsights(userId: string, industry: string): Promise<any> {
    const memory = await this.getMemory(userId);
    const context = await this.industryClient.getIndustryContext(industry);

    return {
      industry,
      context,
      userPreferences: memory.preferences,
      recentInteractions: memory.recentInteractions.slice(0, 5)
    };
  }

  /**
   * Execute action with payment
   */
  async executeWithPayment(
    userId: string,
    action: string,
    amount: number
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const balanceResult = await this.rabtulClient.getBalance(userId);

      if (balanceResult.amount < amount) {
        return {
          success: false,
          error: 'Insufficient balance'
        };
      }

      const paymentResult = await this.rabtulClient.processPayment({
        userId,
        amount,
        action,
        currency: 'INR'
      });

      if (paymentResult.success) {
        await this.rabtulClient.sendNotification({
          userId,
          type: 'payment',
          message: `Payment of ₹${amount} for ${action}`
        });
      }

      return paymentResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed'
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: string;
    services: {
      memory: boolean;
      skillnet: boolean;
      industry: boolean;
      rabtul: boolean;
    };
  }> {
    const [skillnetHealth, industryHealth] = await Promise.all([
      this.skillnetClient.healthCheck().catch(() => ({ healthy: false })),
      this.industryClient.healthCheck().catch(() => ({ healthy: {}, total: 0 }))
    ]);

    return {
      status: skillnetHealth.healthy ? 'healthy' : 'degraded',
      services: {
        memory: true, // Would check actual memory service
        skillnet: skillnetHealth.healthy,
        industry: Object.values(industryHealth.healthy || {}).some(v => v),
        rabtul: true // Would check actual RABTUL services
      }
    };
  }
}

export const genieIntegration = new GenieIntegration();
export default genieIntegration;