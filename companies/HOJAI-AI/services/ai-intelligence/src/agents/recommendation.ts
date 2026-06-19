/**
 * HOJAI Intelligence - Recommendation Agent
 * Generates action recommendations based on analysis
 */

import { RecommendationResult, SentimentResult, IntentResult, PredictionResult } from '../types';

// Action templates by scenario
const ACTION_TEMPLATES: Record<string, {
  action: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reasoning: string;
  expectedOutcome: string;
  triggerConditions: (data: { sentiment: SentimentResult; intent: IntentResult; prediction?: PredictionResult }) => boolean;
}> = {
  immediateApology: {
    action: 'Issue immediate apology',
    priority: 'high',
    reasoning: 'Customer has expressed strong negative sentiment',
    expectedOutcome: 'De-escalate emotional state, show empathy',
    triggerConditions: (data) => data.sentiment.score < -0.5,
  },
  supervisorEscalation: {
    action: 'Offer to connect with supervisor',
    priority: 'critical',
    reasoning: 'High escalation probability detected',
    expectedOutcome: 'Prevent complaint escalation to external channels',
    triggerConditions: (data) => data.prediction?.escalationProbability && data.prediction.escalationProbability > 0.7,
  },
  refundOffer: {
    action: 'Offer refund or credit',
    priority: 'high',
    reasoning: 'Refund request with high dissatisfaction',
    expectedOutcome: 'Convert unhappy customer to neutral/satisfied',
    triggerConditions: (data) => data.intent.primaryIntent === 'refund_request' && data.sentiment.score < 0,
  },
 PrioritySupport: {
    action: 'Upgrade to priority support queue',
    priority: 'medium',
    reasoning: 'VIP/Premium customer with issues',
    expectedOutcome: 'Maintain customer relationship',
    triggerConditions: () => false, // Would check customer tier in real implementation
  },
  compensationOffer: {
    action: 'Offer compensation (discount/credit)',
    priority: 'medium',
    reasoning: 'Service failure detected, churn risk elevated',
    expectedOutcome: 'Restore customer satisfaction',
    triggerConditions: (data) => data.prediction?.churnRisk === 'high',
  },
  followUpSchedule: {
    action: 'Schedule follow-up call',
    priority: 'medium',
    reasoning: 'Complex issue requiring resolution verification',
    expectedOutcome: 'Ensure issue resolution and prevent re-escalation',
    triggerConditions: (data) => data.intent.primaryIntent === 'technical_support' && data.sentiment.sentiment === 'negative',
  },
  knowledgeArticle: {
    action: 'Share relevant help article',
    priority: 'low',
    reasoning: 'Customer inquiry that can be self-serviced',
    expectedOutcome: 'Reduce support load, empower customer',
    triggerConditions: (data) => data.intent.primaryIntent === 'general_inquiry' || data.intent.primaryIntent === 'product_inquiry',
  },
  surveyRequest: {
    action: 'Request feedback survey',
    priority: 'low',
    reasoning: 'Positive interaction that should be captured',
    expectedOutcome: 'Generate positive review/testimonial',
    triggerConditions: (data) => data.sentiment.sentiment === 'positive' && data.intent.primaryIntent === 'feedback',
  },
  retentionOffer: {
    action: 'Present retention offer',
    priority: 'critical',
    reasoning: 'High churn risk detected',
    expectedOutcome: 'Prevent customer cancellation',
    triggerConditions: (data) => data.prediction?.churnRisk === 'high',
  },
  acknowledgmentFirst: {
    action: 'Acknowledge customer concern before solution',
    priority: 'high',
    reasoning: 'Customer expressing frustration or confusion',
    expectedOutcome: 'Build rapport, validate customer feelings',
    triggerConditions: (data) => data.sentiment.emotions.some(e => e.emotion === 'frustration' || e.emotion === 'confusion'),
  },
  quickResolution: {
    action: 'Prioritize for quick resolution',
    priority: 'high',
    reasoning: 'Time-sensitive issue detected',
    expectedOutcome: 'Resolve before customer frustration increases',
    triggerConditions: (data) => data.sentiment.emotions.some(e => e.emotion === 'anxiety'),
  },
  crossSellOpportunity: {
    action: 'Present upgrade/subscription options',
    priority: 'low',
    reasoning: 'Satisfied customer showing interest',
    expectedOutcome: 'Increase customer value',
    triggerConditions: (data) => data.sentiment.score > 0.3 && data.intent.primaryIntent === 'product_inquiry',
  },
};

// Automation eligibility criteria
const AUTOMATION_ELIGIBLE_INTENTS = [
  'general_inquiry',
  'product_inquiry',
  'status_check',
  'billing_inquiry',
];

const AUTOMATION_INELIGIBLE_CONDITIONS = [
  (data: { sentiment: SentimentResult; intent: IntentResult; prediction?: PredictionResult }) =>
    data.prediction?.escalationProbability && data.prediction.escalationProbability > 0.5,
  (data: { sentiment: SentimentResult; intent: IntentResult; prediction?: PredictionResult }) =>
    data.sentiment.emotions.some(e => e.emotion === 'anger'),
  (data: { sentiment: SentimentResult; intent: IntentResult; prediction?: PredictionResult }) =>
    data.intent.primaryIntent === 'complaint',
];

export class RecommendationAgent {
  /**
   * Generate recommendations based on analysis
   */
  async recommend(
    sentiment: SentimentResult,
    intent: IntentResult,
    prediction?: PredictionResult,
    context?: {
      customerTier?: string;
      timeOfDay?: string;
      channel?: string;
    }
  ): Promise<RecommendationResult> {
    const data = { sentiment, intent, prediction };

    // Evaluate each action template
    const triggeredActions = Object.entries(ACTION_TEMPLATES)
      .filter(([, template]) => template.triggerConditions(data))
      .map(([key, template]) => ({
        action: template.action,
        priority: template.priority,
        reasoning: template.reasoning,
        expectedOutcome: template.expectedOutcome,
        confidence: this.calculateActionConfidence(key, data, context),
      }));

    // Sort by priority and confidence
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    triggeredActions.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });

    // Deduplicate similar actions
    const deduplicated = this.deduplicateActions(triggeredActions);

    // Generate next best actions
    const nextBestActions = this.generateNextBestActions(intent, prediction);

    // Determine automation eligibility
    const automationEligible = this.checkAutomationEligibility(data, context);

    return {
      recommendations: deduplicated,
      nextBestActions,
      automationEligible,
    };
  }

  /**
   * Calculate confidence for a specific action
   */
  private calculateActionConfidence(
    actionKey: string,
    data: { sentiment: SentimentResult; intent: IntentResult; prediction?: PredictionResult },
    context?: { customerTier?: string; timeOfDay?: string; channel?: string }
  ): number {
    let confidence = 0.6; // Base confidence

    // Action-specific adjustments
    switch (actionKey) {
      case 'immediateApology':
        confidence += Math.abs(data.sentiment.score) * 0.2;
        break;
      case 'supervisorEscalation':
        confidence += (data.prediction?.escalationProbability || 0) * 0.25;
        break;
      case 'refundOffer':
        confidence += data.sentiment.score < 0 ? 0.2 : -0.1;
        break;
      case 'retentionOffer':
        confidence += data.prediction?.churnRisk === 'high' ? 0.25 : -0.2;
        break;
      case 'followUpSchedule':
        confidence += data.intent.primaryIntent === 'technical_support' ? 0.15 : 0;
        break;
    }

    // Context adjustments
    if (context?.customerTier === 'vip') {
      confidence += 0.05;
    }

    // Sentiment confidence
    confidence += data.sentiment.confidence * 0.1;

    return Math.min(0.95, Math.max(0.3, confidence));
  }

  /**
   * Deduplicate similar actions
   */
  private deduplicateActions(actions: RecommendationResult['recommendations']): RecommendationResult['recommendations'] {
    const seen = new Set<string>();
    const result: RecommendationResult['recommendations'] = [];

    for (const action of actions) {
      const normalized = action.action.toLowerCase().trim();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        result.push(action);
      }
    }

    return result;
  }

  /**
   * Generate next best actions
   */
  private generateNextBestActions(
    intent: IntentResult,
    prediction?: PredictionResult
  ): string[] {
    const actions: string[] = [];

    // Based on intent
    switch (intent.primaryIntent) {
      case 'complaint':
        actions.push('Listen actively');
        actions.push('Acknowledge the issue');
        actions.push('Propose solution');
        break;
      case 'refund_request':
        actions.push('Verify purchase details');
        actions.push('Check refund eligibility');
        actions.push('Present options');
        break;
      case 'technical_support':
        actions.push('Gather diagnostic information');
        actions.push('Identify root cause');
        actions.push('Provide step-by-step resolution');
        break;
      case 'billing_inquiry':
        actions.push('Retrieve billing history');
        actions.push('Explain charges');
        actions.push('Address concerns');
        break;
      case 'product_inquiry':
        actions.push('Understand requirements');
        actions.push('Present relevant options');
        actions.push('Highlight benefits');
        break;
      case 'status_check':
        actions.push('Check current status');
        actions.push('Provide ETA if available');
        actions.push('Set expectations');
        break;
      case 'general_inquiry':
        actions.push('Provide clear answer');
        actions.push('Offer additional help');
        break;
      default:
        actions.push('Understand need');
        actions.push('Provide assistance');
    }

    // Add prediction-based actions
    if (prediction?.escalationProbability > 0.5) {
      actions.unshift('Prepare escalation path');
    }

    if (prediction?.churnRisk === 'high') {
      actions.unshift('Consider retention offer');
    }

    return [...new Set(actions)].slice(0, 5);
  }

  /**
   * Check if interaction is eligible for automation
   */
  private checkAutomationEligibility(
    data: { sentiment: SentimentResult; intent: IntentResult; prediction?: PredictionResult },
    context?: { customerTier?: string }
  ): boolean {
    // Check if intent is automatable
    const intentEligible = AUTOMATION_ELIGIBLE_INTENTS.includes(data.intent.primaryIntent);

    // Check if any ineligibility conditions are met
    const ineligible = AUTOMATION_INELIGIBLE_CONDITIONS.some(condition => condition(data));

    // VIP customers should not be fully automated
    const vipNotAutomated = context?.customerTier === 'vip';

    return intentEligible && !ineligible && !vipNotAutomated;
  }

  /**
   * Suggest response templates
   */
  suggestResponseTemplates(
    sentiment: SentimentResult,
    intent: IntentResult
  ): Record<string, string> {
    const templates: Record<string, string> = {};

    // Apology templates for negative sentiment
    if (sentiment.sentiment === 'negative' || sentiment.sentiment === 'mixed') {
      templates.apology = "I sincerely apologize for the inconvenience you've experienced. Let me help resolve this for you.";
    }

    // Intent-specific templates
    switch (intent.primaryIntent) {
      case 'complaint':
        templates.acknowledgment = "Thank you for bringing this to our attention. I understand your frustration and I'm committed to making this right.";
        templates.action = "Let me review your case and get back to you with a solution within [timeframe].";
        break;
      case 'refund_request':
        templates.acknowledgment = "I understand you'd like a refund. Let me check the details of your purchase.";
        templates.action = "Based on our policy, [action]. Is there anything else I can help you with?";
        break;
      case 'technical_support':
        templates.acknowledgment = "I'm sorry you're experiencing technical difficulties. Let me help troubleshoot this.";
        templates.action = "Could you please provide [information] so I can better assist you?";
        break;
      case 'billing_inquiry':
        templates.acknowledgment = "I'd be happy to help you with your billing questions.";
        templates.action = "Let me pull up your account details.";
        break;
      case 'general_inquiry':
        templates.acknowledgment = "Great question! Let me provide you with that information.";
        templates.action = "[Information provided]. Is there anything else you'd like to know?";
        break;
    }

    // Closing templates
    templates.closing = "Is there anything else I can help you with today?";

    return templates;
  }
}

export const recommendationAgent = new RecommendationAgent();
