import { v4 as uuidv4 } from 'uuid';
import { NextStepModel, ProactiveAlertModel, StepStatus, StepType, ReminderChannel } from '../models/nextStep';
import { logger } from '../utils/logger';
import { reminderService } from './reminderService';

// ============================================
// TYPES
// ============================================

export interface ProactiveEvent {
  eventType: 'appointment' | 'renewal' | 'payment_due' | 'follow_up' | 'check_in' | 'custom';
  title: string;
  description?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  triggerHoursBefore?: number;
  metadata?: Record<string, unknown>;
}

export interface PredictedNextStep {
  predictedTitle: string;
  predictedType: StepType;
  confidence: number;
  reasoning: string;
  suggestedDueDate?: Date;
  suggestedPriority?: 'urgent' | 'high' | 'medium' | 'low';
}

export interface AbandonedAction {
  stepId: string;
  title: string;
  daysSinceLastUpdate: number;
  lastReminderSent?: Date;
  abandonRisk: 'low' | 'medium' | 'high';
  suggestedAction: string;
}

export interface ProactiveAnalysis {
  customerId: string;
  timestamp: Date;
  upcomingItems: Array<{
    stepId: string;
    title: string;
    dueDate: Date;
    priority: string;
    hoursUntilDue: number;
  }>;
  overdueCount: number;
  abandonedActions: AbandonedAction[];
  predictions: PredictedNextStep[];
  suggestedAlerts: string[];
}

// ============================================
// PROACTIVE SERVICE
// ============================================

export class ProactiveService {
  private openaiApiKey?: string;
  private useAIPredictions: boolean;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.useAIPredictions = !!this.openaiApiKey;
  }

  /**
   * Analyze upcoming items and generate insights for a customer
   */
  async analyzeUpcoming(customerId: string): Promise<ProactiveAnalysis> {
    try {
      logger.info('Analyzing upcoming items', { customerId });

      const now = new Date();
      const hoursAhead = 72; // 3 days

      // Get upcoming steps
      const upcomingSteps = await NextStepModel.find({
        customerId,
        status: { $in: [StepStatus.PENDING, StepStatus.IN_PROGRESS, StepStatus.OVERDUE] },
        $or: [
          { dueDate: { $gte: now, $lte: new Date(now.getTime() + hoursAhead * 60 * 60 * 1000) } },
          { nextReminderAt: { $gte: now, $lte: new Date(now.getTime() + hoursAhead * 60 * 60 * 1000) } }
        ]
      }).select('stepId title dueDate priority nextReminderAt stepType').sort({ dueDate: 1 });

      // Get overdue count
      const overdueCount = await NextStepModel.countDocuments({
        customerId,
        status: StepStatus.OVERDUE
      });

      // Detect abandoned actions
      const abandonedActions = await this.detectAbandonedActions(customerId);

      // Get AI predictions if enabled
      const predictions = this.useAIPredictions
        ? await this.predictNextSteps(customerId, upcomingSteps.map(s => s.title))
        : [];

      // Generate suggested alerts
      const suggestedAlerts = this.generateSuggestedAlerts(upcomingSteps, overdueCount, abandonedActions);

      const upcomingItems = upcomingSteps.map(step => ({
        stepId: step.stepId,
        title: step.title,
        dueDate: step.dueDate || step.nextReminderAt!,
        priority: step.priority,
        hoursUntilDue: Math.max(0, ((step.dueDate?.getTime() || step.nextReminderAt!.getTime()) - now.getTime()) / (1000 * 60 * 60))
      }));

      return {
        customerId,
        timestamp: new Date(),
        upcomingItems,
        overdueCount,
        abandonedActions,
        predictions,
        suggestedAlerts
      };
    } catch (error) {
      logger.error('Error analyzing upcoming', { error, customerId });
      throw error;
    }
  }

  /**
   * Predict next steps using AI
   */
  async predictNextSteps(
    customerId: string,
    context?: string | string[]
  ): Promise<PredictedNextStep[]> {
    try {
      if (!this.useAIPredictions) {
        return this.ruleBasedPredictions(customerId);
      }

      const { OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey: this.openaiApiKey });

      // Get customer's history for context
      const recentSteps = await NextStepModel.find({
        customerId,
        createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // Last 90 days
      })
        .select('title stepType priority status completedAt')
        .sort({ createdAt: -1 })
        .limit(20);

      const historyText = recentSteps
        .map(s => `- ${s.title} (${s.stepType}, ${s.status})${s.completedAt ? ` - completed ${s.completedAt.toISOString().split('T')[0]}` : ''}`)
        .join('\n');

      const contextText = Array.isArray(context) ? context.join(', ') : context || 'No additional context';

      const systemPrompt = `You are an AI assistant specialized in predicting next actions for customers based on their history and context.

Analyze the customer's history and predict likely next steps they might need to take.
For each prediction, provide:
1. predictedTitle: What the next step might be
2. predictedType: The type of step (followup, reminder, task, meeting, etc.)
3. confidence: 0-1 score
4. reasoning: Why this is likely
5. suggestedDueDate: When this might be due (ISO date string or null)

Be conservative with predictions - only predict steps with confidence > 0.5.
Return 1-5 predictions maximum.`;

      const response = await client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Customer History (last 90 days):\n${historyText}\n\nCurrent Context:\n${contextText}\n\nPredict likely next steps.`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 1500
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return [];

      const parsed = JSON.parse(content);
      const predictions = parsed.predictions || parsed.next_steps || [];

      return predictions.map((p: Record<string, unknown>) => ({
        predictedTitle: p.predictedTitle as string,
        predictedType: (p.predictedType as StepType) || StepType.TASK,
        confidence: (p.confidence as number) || 0.5,
        reasoning: p.reasoning as string || '',
        suggestedDueDate: p.suggestedDueDate ? new Date(p.suggestedDueDate as string) : undefined,
        suggestedPriority: p.suggestedPriority as 'urgent' | 'high' | 'medium' | 'low'
      }));
    } catch (error) {
      logger.error('Error predicting next steps', { error, customerId });
      // Fall back to rule-based predictions
      return this.ruleBasedPredictions(customerId);
    }
  }

  /**
   * Generate a proactive alert for a customer
   */
  async generateProactiveAlert(
    customerId: string,
    event: ProactiveEvent
  ): Promise<{ alertId: string; channels: ReminderChannel[] }> {
    try {
      logger.info('Generating proactive alert', { customerId, eventType: event.eventType });

      // Determine channels based on event type
      const channels = this.determineAlertChannels(event.eventType);

      // Create the alert record
      const alert: IProactiveAlert = {
        alertId: uuidv4(),
        customerId,
        alertType: this.mapEventToAlertType(event.eventType),
        title: event.title,
        message: event.description || `Reminder: ${event.title}`,
        channels,
        deliveryStatus: 'pending',
        metadata: event.metadata,
        createdAt: new Date()
      };

      // Save alert to database
      const savedAlert = await new ProactiveAlertModel(alert).save();

      // Send notifications
      for (const channel of channels) {
        try {
          await this.sendProactiveNotification(savedAlert, channel);
        } catch (error) {
          logger.error('Error sending proactive notification', { error, channel, alertId: savedAlert.alertId });
        }
      }

      return { alertId: savedAlert.alertId, channels };
    } catch (error) {
      logger.error('Error generating proactive alert', { error, customerId });
      throw error;
    }
  }

  /**
   * Detect abandoned actions (steps that haven't been updated in a while)
   */
  async detectAbandonedActions(customerId: string): Promise<AbandonedAction[]> {
    try {
      const abandonedActions: AbandonedAction[] = [];
      const now = new Date();

      // Find steps that haven't been updated in 3+ days
      const inactiveSteps = await NextStepModel.find({
        customerId,
        status: { $in: [StepStatus.PENDING, StepStatus.IN_PROGRESS] },
        updatedAt: { $lt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) }
      })
        .select('stepId title updatedAt lastReminderAt')
        .sort({ updatedAt: 1 })
        .limit(20);

      for (const step of inactiveSteps) {
        const daysSinceUpdate = Math.floor(
          (now.getTime() - step.updatedAt.getTime()) / (24 * 60 * 60 * 1000)
        );

        // Calculate abandon risk
        let abandonRisk: 'low' | 'medium' | 'high' = 'low';
        let suggestedAction = '';

        if (daysSinceUpdate >= 14) {
          abandonRisk = 'high';
          suggestedAction = 'Consider reaching out via phone call';
        } else if (daysSinceUpdate >= 7) {
          abandonRisk = 'medium';
          suggestedAction = 'Send a gentle follow-up message';
        } else if (daysSinceUpdate >= 3) {
          abandonRisk = 'low';
          suggestedAction = 'Send a reminder notification';
        }

        // Check if reminder was already sent recently
        if (step.lastReminderAt) {
          const hoursSinceReminder = (now.getTime() - step.lastReminderAt.getTime()) / (60 * 60 * 1000);
          if (hoursSinceReminder < 24) {
            continue; // Skip if reminder was sent recently
          }
        }

        abandonedActions.push({
          stepId: step.stepId,
          title: step.title,
          daysSinceLastUpdate: daysSinceUpdate,
          lastReminderSent: step.lastReminderAt,
          abandonRisk,
          suggestedAction
        });
      }

      return abandonedActions;
    } catch (error) {
      logger.error('Error detecting abandoned actions', { error, customerId });
      return [];
    }
  }

  /**
   * Send follow-up for a specific action
   */
  async sendFollowUp(
    customerId: string,
    stepId: string,
    customMessage?: string
  ): Promise<{ success: boolean; alertId?: string; error?: string }> {
    try {
      const step = await NextStepModel.findOne({ stepId, customerId });
      if (!step) {
        return { success: false, error: 'Step not found' };
      }

      const alertId = uuidv4();

      // Create follow-up alert
      const alert = {
        alertId,
        customerId,
        stepId,
        alertType: 'follow_up' as const,
        title: `Follow-up: ${step.title}`,
        message: customMessage || this.generateFollowUpMessage(step),
        channels: [ReminderChannel.WHATSAPP, ReminderChannel.PUSH] as ReminderChannel[],
        deliveryStatus: 'pending' as const,
        createdAt: new Date()
      };

      await new ProactiveAlertModel(alert).save();

      // Send notifications
      for (const channel of alert.channels) {
        await this.sendProactiveNotification(alert, channel);
      }

      logger.info('Follow-up sent', { customerId, stepId, alertId });

      return { success: true, alertId };
    } catch (error) {
      logger.error('Error sending follow-up', { error, customerId, stepId });
      return { success: false, error: 'Failed to send follow-up' };
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private async ruleBasedPredictions(customerId: string): Promise<PredictedNextStep[]> {
    const predictions: PredictedNextStep[] = [];

    // Get recent completed steps to identify patterns
    const recentCompleted = await NextStepModel.find({
      customerId,
      status: StepStatus.COMPLETED
    })
      .select('stepType title')
      .sort({ completedAt: -1 })
      .limit(10);

    // Analyze patterns
    const typeFrequencies = new Map<StepType, number>();
    for (const step of recentCompleted) {
      typeFrequencies.set(step.stepType, (typeFrequencies.get(step.stepType) || 0) + 1);
    }

    // Predict based on most common types
    const sortedTypes = Array.from(typeFrequencies.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);

    for (const [stepType] of sortedTypes) {
      const typeNames: Record<StepType, string> = {
        [StepType.FOLLOWUP]: 'Follow up on recent conversation',
        [StepType.MEETING]: 'Schedule a meeting',
        [StepType.CALL]: 'Make a phone call',
        [StepType.EMAIL]: 'Send an email',
        [StepType.REVIEW]: 'Review recent activity',
        [StepType.CHECK_IN]: 'Check in on status',
        [StepType.APPOINTMENT]: 'Schedule appointment',
        [StepType.MEDICATION]: 'Medication reminder',
        [StepType.TASK]: 'Complete pending task',
        [StepType.PAYMENT]: 'Payment reminder',
        [StepType.DOCUMENT]: 'Document action needed',
        [StepType.DEADLINE]: 'Upcoming deadline',
        [StepType.RENEWAL]: 'Renewal reminder',
        [StepType.FEEDBACK]: 'Request feedback',
        [StepType.ONBOARDING]: 'Onboarding step',
        [StepType.CUSTOM]: 'Custom action'
      };

      predictions.push({
        predictedTitle: typeNames[stepType],
        predictedType: stepType,
        confidence: 0.6,
        reasoning: `Based on frequent ${stepType} actions in your history`
      });
    }

    return predictions;
  }

  private generateSuggestedAlerts(
    upcomingItems: Array<{ stepId: string; title: string; hoursUntilDue: number }>,
    overdueCount: number,
    abandonedActions: AbandonedAction[]
  ): string[] {
    const suggestions: string[] = [];

    // Check for urgent upcoming items
    const urgentItems = upcomingItems.filter(i => i.hoursUntilDue <= 2 && i.hoursUntilDue > 0);
    if (urgentItems.length > 0) {
      suggestions.push(`Send immediate reminders for ${urgentItems.length} urgent item(s)`);
    }

    // Check for overdue
    if (overdueCount > 0) {
      suggestions.push(`Urgent: ${overdueCount} item(s) are overdue - send follow-up`);
    }

    // Check for high-risk abandoned
    const highRiskCount = abandonedActions.filter(a => a.abandonRisk === 'high').length;
    if (highRiskCount > 0) {
      suggestions.push(`Consider phone calls for ${highRiskCount} high-risk abandoned action(s)`);
    }

    // Suggest daily digest
    if (upcomingItems.length >= 5) {
      suggestions.push('Consider sending a daily summary digest');
    }

    return suggestions;
  }

  private determineAlertChannels(eventType: string): ReminderChannel[] {
    switch (eventType) {
      case 'appointment':
        return [ReminderChannel.WHATSAPP, ReminderChannel.PUSH, ReminderChannel.SMS];
      case 'payment_due':
        return [ReminderChannel.WHATSAPP, ReminderChannel.SMS, ReminderChannel.EMAIL];
      case 'renewal':
        return [ReminderChannel.EMAIL, ReminderChannel.WHATSAPP, ReminderChannel.PUSH];
      case 'follow_up':
        return [ReminderChannel.WHATSAPP, ReminderChannel.PUSH];
      case 'check_in':
        return [ReminderChannel.PUSH, ReminderChannel.WHATSAPP];
      default:
        return [ReminderChannel.WHATSAPP, ReminderChannel.PUSH];
    }
  }

  private mapEventToAlertType(eventType: string): 'upcoming' | 'overdue' | 'predicted' | 'abandoned' | 'follow_up' {
    switch (eventType) {
      case 'appointment':
      case 'renewal':
      case 'payment_due':
        return 'upcoming';
      case 'follow_up':
        return 'follow_up';
      default:
        return 'predicted';
    }
  }

  private async sendProactiveNotification(
    alert: { alertId: string; title: string; message: string; customerId: string; channels: ReminderChannel[] },
    channel: ReminderChannel
  ): Promise<void> {
    try {
      await reminderService.sendProactiveAlert(alert, channel);

      // Update alert status
      await ProactiveAlertModel.updateOne(
        { alertId: alert.alertId },
        {
          $set: {
            sentAt: new Date(),
            deliveryStatus: 'sent'
          }
        }
      );
    } catch (error) {
      logger.error('Error sending proactive notification', { error, channel, alertId: alert.alertId });
    }
  }

  private generateFollowUpMessage(step: { title: string; stepType: StepType; dueDate?: Date }): string {
    const typeMessages: Record<StepType, string> = {
      [StepType.FOLLOWUP]: "Just checking in on this follow-up",
      [StepType.MEETING]: "Reminder about your upcoming meeting",
      [StepType.APPOINTMENT]: "Your appointment is coming up",
      [StepType.CALL]: "Don't forget to make this call",
      [StepType.EMAIL]: "This email is waiting for your attention",
      [StepType.TASK]: "A quick reminder about this task",
      [StepType.PAYMENT]: "Payment reminder",
      [StepType.MEDICATION]: "Medication reminder",
      [StepType.DOCUMENT]: "Document action needed",
      [StepType.REVIEW]: "Time to review this item",
      [StepType.CHECK_IN]: "Check-in reminder",
      [StepType.DEADLINE]: "Deadline approaching",
      [StepType.RENEWAL]: "Time for renewal",
      [StepType.FEEDBACK]: "We'd appreciate your feedback",
      [StepType.ONBOARDING]: "Next step in your onboarding",
      [StepType.REMINDER]: "Friendly reminder",
      [StepType.CUSTOM]: "Quick check-in"
    };

    const baseMessage = typeMessages[step.stepType] || "Quick reminder";
    return `${baseMessage}: ${step.title}`;
  }
}

// Interface for proactive alert
interface IProactiveAlert {
  alertId: string;
  customerId: string;
  stepId?: string;
  alertType: 'upcoming' | 'overdue' | 'predicted' | 'abandoned' | 'follow_up';
  title: string;
  message: string;
  channels: ReminderChannel[];
  deliveryStatus: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// Export singleton instance
export const proactiveService = new ProactiveService();
