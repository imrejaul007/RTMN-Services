/**
 * SUTAR OS Integration Hub
 * Central hub that connects all RTNM services
 */

import { rabtul, RABTULClient } from '../hojai-shared/src/rabtul-client';
import { rezIdentity, REZIdentityClient } from '../hojai-shared/src/rez-identity-client';
import { skillnet, SkillNetClient } from '../hojai-shared/src/skillnet-client';
import { industryAI, IndustryAIClient } from '../hojai-shared/src/industry-ai-client';

// Type definitions for the integration hub
export interface UserContext {
  userId: string;
  profile?: any;
  preCallResearch?: any;
  skills?: any[];
  auth?: any;
  query: string;
  timestamp: string;
  industry?: string;
}

export interface ProcessedResult {
  result: any;
  industryExpertise?: any;
  source: string;
  context: UserContext;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  balance?: number;
  notificationId?: string;
}

export class SUTARIntegrationHub {
  private rabtulClient: RABTULClient;
  private identityClient: REZIdentityClient;
  private skillnetClient: SkillNetClient;
  private industryClient: IndustryAIClient;

  constructor() {
    this.rabtulClient = rabtul;
    this.identityClient = rezIdentity;
    this.skillnetClient = skillnet;
    this.industryClient = industryAI;
  }

  /**
   * Get complete user context before processing
   * Combines profile, pre-call research, skills, and authentication
   */
  async prepareContext(userId: string, query: string): Promise<UserContext> {
    try {
      // 1. Get user profile from REZ Identity Hub
      const profile = await this.identityClient.getUserProfile(userId);

      // 2. Get pre-call research (25 data sources)
      const preCallResearch = await this.identityClient.getPreCallResearch(userId);

      // 3. Get relevant skills from SkillNet
      const skillsResult = await this.skillnetClient.getSkills();
      const skills = skillsResult.skills || [];

      // 4. Verify user authentication (if profile has token)
      let auth = { valid: false };
      if ('token' in profile && profile.token) {
        auth = await this.rabtulClient.verifyToken(profile.token);
      }

      return {
        userId,
        profile,
        preCallResearch,
        skills,
        auth,
        query,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error preparing context:', error);
      return {
        userId,
        query,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Process query with industry expertise
   * Routes through SkillNet with industry context
   */
  async processWithIndustryExpertise(
    userId: string,
    query: string,
    industry?: string
  ): Promise<ProcessedResult> {
    // 1. Prepare base context
    const context = await this.prepareContext(userId, query);

    // 2. Get industry-specific context if provided
    let industryContext = null;
    if (industry) {
      industryContext = await this.industryClient.getIndustryContext(industry);
      context.industry = industry;
    }

    // 3. Execute goal with SkillNet
    const result = await this.skillnetClient.executeGoal(query, {
      ...context,
      industry: industryContext
    });

    return {
      result,
      industryExpertise: industryContext,
      source: 'SUTAR OS + HOJAI AI',
      context
    };
  }

  /**
   * Execute action with payment verification
   * Checks balance, processes payment, and sends notification
   */
  async executeWithPayment(
    userId: string,
    action: string,
    amount: number
  ): Promise<PaymentResult> {
    try {
      // 1. Verify user balance
      const balanceResult = await this.rabtulClient.getBalance(userId);
      const balance = balanceResult.amount || 0;

      if (balance < amount) {
        return {
          success: false,
          balance
        };
      }

      // 2. Process payment
      const paymentResult = await this.rabtulClient.processPayment({
        userId,
        amount,
        action,
        currency: 'INR'
      });

      if (!paymentResult.success) {
        return {
          success: false,
          balance
        };
      }

      // 3. Send notification
      const notificationResult = await this.rabtulClient.sendNotification({
        userId,
        type: 'payment',
        title: 'Payment Successful',
        message: `Payment of ₹${amount} processed for ${action}`,
        channels: ['push', 'email']
      });

      return {
        success: true,
        transactionId: paymentResult.transactionId,
        balance: balance - amount,
        notificationId: notificationResult.notificationId
      };
    } catch (error) {
      console.error('Payment execution error:', error);
      return {
        success: false
      };
    }
  }

  /**
   * Process with full RTNM ecosystem integration
   * Combines authentication, identity, skills, and industry expertise
   */
  async processFull(userId: string, query: string, industry?: string): Promise<ProcessedResult> {
    const context = await this.prepareContext(userId, query);

    let industryContext = null;
    if (industry) {
      industryContext = await this.industryClient.getIndustryContext(industry);
    }

    // Execute with all context
    const result = await this.skillnetClient.executeGoal(query, {
      ...context,
      industry: industryContext
    });

    return {
      result,
      industryExpertise: industryContext,
      source: 'SUTAR OS Full Integration',
      context
    };
  }

  /**
   * Health check for all connected services
   */
  async healthCheck(): Promise<{
    status: string;
    services: {
      rabtul: boolean;
      identityHub: boolean;
      skillnet: boolean;
      industryAI: boolean;
    };
  }> {
    const [rabtulHealth, identityHealth, skillnetHealth, industryHealth] = await Promise.all([
      this.rabtulClient.healthCheck().catch(() => ({ overall: false })),
      this.identityClient.healthCheck().catch(() => ({ healthy: false })),
      this.skillnetClient.healthCheck().catch(() => ({ healthy: false })),
      this.industryClient.healthCheck().catch(() => ({ healthy: {}, total: 0, available: 0 }))
    ]);

    const allHealthy =
      rabtulHealth.overall &&
      identityHealth.healthy &&
      skillnetHealth.healthy;

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      services: {
        rabtul: rabtulHealth.overall || false,
        identityHub: identityHealth.healthy || false,
        skillnet: skillnetHealth.healthy || false,
        industryAI: Object.values(industryHealth.healthy || {}).some(v => v) || false
      }
    };
  }
}

export const sutarHub = new SUTARIntegrationHub();
export default sutarHub;