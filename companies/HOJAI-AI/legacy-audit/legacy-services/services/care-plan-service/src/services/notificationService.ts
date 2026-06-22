import axios from 'axios';
import { CarePlan, GoalStatus, ICareGoal, ICareIntervention } from '../models/carePlan';
import { logger } from '../utils/logger';

export interface NotificationPayload {
  type: 'goal_update' | 'goal_complete' | 'review_due' | 'intervention_reminder' | 'plan_archived' | 'milestone_achieved';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  recipientIds: string[];
  metadata: Record<string, unknown>;
  channels: ('in_app' | 'email' | 'sms' | 'push')[];
  scheduledAt?: Date;
}

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  errors?: string[];
}

export interface ReviewReminder {
  planId: string;
  planTitle: string;
  patientName: string;
  dueDate: Date;
  daysUntilDue: number;
  recipients: string[];
}

export interface GoalUpdateNotification {
  planId: string;
  planTitle: string;
  patientId: string;
  goalId: string;
  goalDescription: string;
  previousProgress: number;
  newProgress: number;
  updatedBy: string;
  timestamp: Date;
}

export class NotificationService {
  private notificationServiceUrl: string;
  private emailServiceUrl: string;
  private smsServiceUrl: string;

  constructor() {
    // Service URLs - these would be configured via environment variables
    this.notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4011';
    this.emailServiceUrl = process.env.EMAIL_SERVICE_URL || 'http://localhost:4011/email';
    this.smsServiceUrl = process.env.SMS_SERVICE_URL || 'http://localhost:4011/sms';
  }

  /**
   * Send notification when a goal is updated
   */
  async notifyOnGoalUpdate(
    planId: string,
    goal: ICareGoal,
    previousProgress: number,
    updatedBy: string
  ): Promise<NotificationResult> {
    try {
      logger.info('Sending goal update notification', { planId, goalId: goal.goalId });

      const plan = await CarePlan.findOne({ planId });
      if (!plan) {
        logger.warn('Plan not found for notification', { planId });
        return { success: false, errors: ['Plan not found'] };
      }

      const progressChange = goal.completionPercentage - previousProgress;
      let priority: NotificationPayload['priority'] = 'low';

      if (progressChange >= 20) {
        priority = 'high';
      } else if (progressChange >= 10) {
        priority = 'medium';
      }

      // Determine recipients
      const recipients = this.determineRecipients(plan, 'goal_update');

      const payload: NotificationPayload = {
        type: 'goal_update',
        title: `Goal Progress Update: ${plan.title}`,
        message: `${goal.description} is now ${goal.completionPercentage}% complete (${progressChange >= 0 ? '+' : ''}${progressChange}% change). Updated by ${updatedBy}.`,
        priority,
        recipientIds: recipients,
        metadata: {
          planId,
          goalId: goal.goalId,
          patientId: plan.patientId,
          patientName: plan.patientName,
          previousProgress,
          newProgress: goal.completionPercentage,
          progressChange,
          goalStatus: goal.status,
          updatedBy,
        },
        channels: ['in_app'],
      };

      // Add email for significant updates
      if (progressChange >= 20) {
        payload.channels.push('email');
      }

      return await this.sendNotification(payload);
    } catch (error) {
      logger.error('Failed to send goal update notification', { error, planId });
      return { success: false, errors: ['Notification service error'] };
    }
  }

  /**
   * Send notification when a goal is completed
   */
  async notifyOnGoalComplete(goalId: string): Promise<NotificationResult> {
    try {
      logger.info('Sending goal completion notification', { goalId });

      const plan = await CarePlan.findOne({ 'goals.goalId': goalId });
      if (!plan) {
        logger.warn('Plan not found for goal completion notification', { goalId });
        return { success: false, errors: ['Plan not found'] };
      }

      const goal = plan.goals.find((g) => g.goalId === goalId);
      if (!goal) {
        return { success: false, errors: ['Goal not found'] };
      }

      const recipients = this.determineRecipients(plan, 'goal_complete');

      const payload: NotificationPayload = {
        type: 'goal_complete',
        title: `Goal Achieved: ${plan.title}`,
        message: `Congratulations! ${goal.description} has been successfully completed. Achieved on ${new Date().toLocaleDateString()}.`,
        priority: 'high',
        recipientIds: recipients,
        metadata: {
          planId: plan.planId,
          goalId: goal.goalId,
          patientId: plan.patientId,
          patientName: plan.patientName,
          goalDescription: goal.description,
          achievedDate: goal.achievedDate || new Date(),
          completionPercentage: goal.completionPercentage,
        },
        channels: ['in_app', 'email'],
      };

      return await this.sendNotification(payload);
    } catch (error) {
      logger.error('Failed to send goal completion notification', { error, goalId });
      return { success: false, errors: ['Notification service error'] };
    }
  }

  /**
   * Send review reminder notifications
   */
  async notifyOnReviewDue(planId: string): Promise<NotificationResult> {
    try {
      logger.info('Sending review due notification', { planId });

      const plan = await CarePlan.findOne({ planId });
      if (!plan) {
        logger.warn('Plan not found for review notification', { planId });
        return { success: false, errors: ['Plan not found'] };
      }

      if (!plan.nextReviewDate) {
        return { success: false, errors: ['No review date scheduled'] };
      }

      const daysUntilDue = Math.floor(
        (new Date(plan.nextReviewDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      let priority: NotificationPayload['priority'] = 'medium';
      let message: string;

      if (daysUntilDue < 0) {
        priority = 'urgent';
        message = `Care plan review for ${plan.title} (${plan.patientName}) was due ${Math.abs(daysUntilDue)} days ago. Immediate action required.`;
      } else if (daysUntilDue <= 1) {
        priority = 'high';
        message = `Care plan review for ${plan.title} (${plan.patientName}) is due tomorrow. Please complete the review.`;
      } else {
        priority = 'medium';
        message = `Care plan review for ${plan.title} (${plan.patientName}) is due in ${daysUntilDue} days on ${new Date(plan.nextReviewDate).toLocaleDateString()}.`;
      }

      const recipients = this.determineRecipients(plan, 'review_due');

      const payload: NotificationPayload = {
        type: 'review_due',
        title: `Care Plan Review Due: ${plan.title}`,
        message,
        priority,
        recipientIds: recipients,
        metadata: {
          planId: plan.planId,
          patientId: plan.patientId,
          patientName: plan.patientName,
          nextReviewDate: plan.nextReviewDate,
          daysUntilDue,
        },
        channels: ['in_app'],
      };

      // Add SMS for urgent reviews
      if (priority === 'urgent') {
        payload.channels.push('sms', 'email');
      }

      return await this.sendNotification(payload);
    } catch (error) {
      logger.error('Failed to send review due notification', { error, planId });
      return { success: false, errors: ['Notification service error'] };
    }
  }

  /**
   * Send intervention reminder
   */
  async notifyInterventionReminder(intervention: ICareIntervention, planId: string): Promise<NotificationResult> {
    try {
      logger.info('Sending intervention reminder', { planId, interventionId: intervention.interventionId });

      const plan = await CarePlan.findOne({ planId });
      if (!plan) {
        return { success: false, errors: ['Plan not found'] };
      }

      const payload: NotificationPayload = {
        type: 'intervention_reminder',
        title: `Intervention Reminder: ${intervention.type}`,
        message: `${intervention.description}. Assigned to: ${intervention.assignedTo}. Frequency: ${intervention.frequency}.`,
        priority: 'medium',
        recipientIds: [intervention.assignedTo],
        metadata: {
          planId,
          interventionId: intervention.interventionId,
          interventionType: intervention.type,
          assignedTo: intervention.assignedTo,
          frequency: intervention.frequency,
        },
        channels: ['in_app', 'push'],
      };

      return await this.sendNotification(payload);
    } catch (error) {
      logger.error('Failed to send intervention reminder', { error, planId });
      return { success: false, errors: ['Notification service error'] };
    }
  }

  /**
   * Send milestone achieved notification
   */
  async notifyMilestoneAchieved(
    planId: string,
    goalId: string,
    milestoneTitle: string
  ): Promise<NotificationResult> {
    try {
      logger.info('Sending milestone achieved notification', { planId, goalId, milestoneTitle });

      const plan = await CarePlan.findOne({ planId });
      if (!plan) {
        return { success: false, errors: ['Plan not found'] };
      }

      const recipients = this.determineRecipients(plan, 'goal_update');

      const payload: NotificationPayload = {
        type: 'milestone_achieved',
        title: `Milestone Achieved: ${milestoneTitle}`,
        message: `Great progress! The milestone "${milestoneTitle}" in care plan "${plan.title}" has been achieved.`,
        priority: 'medium',
        recipientIds: recipients,
        metadata: {
          planId,
          goalId,
          milestoneTitle,
          patientName: plan.patientName,
          achievedDate: new Date(),
        },
        channels: ['in_app'],
      };

      return await this.sendNotification(payload);
    } catch (error) {
      logger.error('Failed to send milestone notification', { error, planId });
      return { success: false, errors: ['Notification service error'] };
    }
  }

  /**
   * Get plans due for review and send notifications
   */
  async processReviewReminders(): Promise<{
    processed: number;
    sent: number;
    failed: number;
    reminders: ReviewReminder[];
  }> {
    try {
      logger.info('Processing review reminders');

      const now = new Date();
      const plans = await CarePlan.find({
        status: { $in: ['active', 'on_hold'] },
        nextReviewDate: { $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) }, // Next 7 days
      });

      const reminders: ReviewReminder[] = [];
      let sent = 0;
      let failed = 0;

      for (const plan of plans) {
        if (!plan.nextReviewDate) continue;

        const daysUntilDue = Math.floor(
          (new Date(plan.nextReviewDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Only notify if due within 3 days or overdue
        if (daysUntilDue <= 3) {
          reminders.push({
            planId: plan.planId,
            planTitle: plan.title,
            patientName: plan.patientName,
            dueDate: plan.nextReviewDate,
            daysUntilDue,
            recipients: this.determineRecipients(plan, 'review_due'),
          });

          const result = await this.notifyOnReviewDue(plan.planId);
          if (result.success) {
            sent++;
          } else {
            failed++;
          }
        }
      }

      logger.info('Review reminders processed', { processed: plans.length, sent, failed });

      return {
        processed: plans.length,
        sent,
        failed,
        reminders,
      };
    } catch (error) {
      logger.error('Failed to process review reminders', { error });
      return {
        processed: 0,
        sent: 0,
        failed: 0,
        reminders: [],
      };
    }
  }

  /**
   * Send daily summary to care team
   */
  async sendDailySummary(recipientId: string): Promise<NotificationResult> {
    try {
      logger.info('Sending daily summary', { recipientId });

      const now = new Date();
      const startOfDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get recent updates (would be more complex in production with proper aggregation)
      const plans = await CarePlan.find({
        updatedAt: { $gte: startOfDay },
      }).limit(10);

      const summary = {
        plansUpdated: plans.length,
        goalsCompleted: plans.reduce(
          (sum, p) => sum + p.goals.filter((g) => g.status === GoalStatus.ACHIEVED).length,
          0
        ),
        newInterventions: plans.reduce((sum, p) => sum + p.interventions.filter((i) => i.status === 'in_progress').length, 0),
      };

      const payload: NotificationPayload = {
        type: 'goal_update',
        title: 'Daily Care Plan Summary',
        message: `Yesterday: ${summary.plansUpdated} plans updated, ${summary.goalsCompleted} goals achieved.`,
        priority: 'low',
        recipientIds: [recipientId],
        metadata: {
          ...summary,
          date: now.toISOString().split('T')[0],
        },
        channels: ['in_app', 'email'],
      };

      return await this.sendNotification(payload);
    } catch (error) {
      logger.error('Failed to send daily summary', { error });
      return { success: false, errors: ['Notification service error'] };
    }
  }

  /**
   * Determine recipients based on notification type and plan
   */
  private determineRecipients(plan: any, notificationType: string): string[] {
    const recipients: string[] = [];

    // Always include the creator
    if (plan.createdBy) {
      recipients.push(plan.createdBy);
    }

    // Include updatedBy if present
    if (plan.updatedBy) {
      recipients.push(plan.updatedBy);
    }

    // Include assigned intervention staff
    for (const intervention of plan.interventions) {
      if (intervention.assignedTo && !recipients.includes(intervention.assignedTo)) {
        recipients.push(intervention.assignedTo);
      }
    }

    // Add care team members from metadata if available
    if (plan.metadata?.careTeam) {
      const careTeam = plan.metadata.careTeam as string[];
      recipients.push(...careTeam.filter((id) => !recipients.includes(id)));
    }

    // Add healthcare providers from metadata
    if (plan.metadata?.providers) {
      const providers = plan.metadata.providers as string[];
      recipients.push(...providers.filter((id) => !recipients.includes(id)));
    }

    // Remove duplicates
    return [...new Set(recipients)];
  }

  /**
   * Send notification through appropriate channels
   */
  private async sendNotification(payload: NotificationPayload): Promise<NotificationResult> {
    try {
      const errors: string[] = [];

      // Send to main notification service
      try {
        await axios.post(`${this.notificationServiceUrl}/notifications`, payload, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Name': 'care-plan-service',
          },
        });
      } catch (error) {
        // Log but don't fail - notification service might be temporarily unavailable
        logger.warn('Main notification service unavailable', { error });
      }

      // Send email if requested
      if (payload.channels.includes('email') && payload.recipientIds.length > 0) {
        try {
          await this.sendEmailNotification(payload);
        } catch (error) {
          errors.push(`Email notification failed: ${error}`);
        }
      }

      // Send SMS if requested (for urgent notifications)
      if (payload.channels.includes('sms') && payload.recipientIds.length > 0) {
        try {
          await this.sendSmsNotification(payload);
        } catch (error) {
          errors.push(`SMS notification failed: ${error}`);
        }
      }

      if (errors.length > 0) {
        logger.warn('Some notification channels failed', { errors });
      }

      return {
        success: errors.length === 0,
        notificationId: `N-${Date.now()}`,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      logger.error('Failed to send notification', { error, payload });
      return { success: false, errors: ['Failed to send notification'] };
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(payload: NotificationPayload): Promise<void> {
    const emailPayload = {
      to: payload.recipientIds,
      subject: payload.title,
      body: this.formatEmailBody(payload),
      priority: payload.priority,
      metadata: payload.metadata,
    };

    await axios.post(`${this.emailServiceUrl}/send`, emailPayload, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': 'care-plan-service',
      },
    });
  }

  /**
   * Send SMS notification
   */
  private async sendSmsNotification(payload: NotificationPayload): Promise<void> {
    const smsPayload = {
      to: payload.recipientIds,
      message: `${payload.title}: ${payload.message}`,
      priority: payload.priority,
      metadata: payload.metadata,
    };

    await axios.post(`${this.smsServiceUrl}/send`, smsPayload, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': 'care-plan-service',
      },
    });
  }

  /**
   * Format email body
   */
  private formatEmailBody(payload: NotificationPayload): string {
    const metadata = payload.metadata as Record<string, unknown>;
    let body = `<h2>${payload.title}</h2>`;
    body += `<p>${payload.message}</p>`;

    if (metadata.patientName) {
      body += `<p><strong>Patient:</strong> ${metadata.patientName}</p>`;
    }

    if (metadata.planId) {
      body += `<p><strong>Plan ID:</strong> ${metadata.planId}</p>`;
    }

    body += `<p style="color: #666; font-size: 12px;">
      This is an automated notification from RisaCare.
      <br>
      Sent at: ${new Date().toLocaleString()}
    </p>`;

    return body;
  }

  /**
   * Send plan archived notification
   */
  async notifyOnPlanArchived(planId: string): Promise<NotificationResult> {
    try {
      logger.info('Sending plan archived notification', { planId });

      const plan = await CarePlan.findOne({ planId });
      if (!plan) {
        return { success: false, errors: ['Plan not found'] };
      }

      const recipients = this.determineRecipients(plan, 'plan_archived');

      const payload: NotificationPayload = {
        type: 'plan_archived',
        title: `Care Plan Archived: ${plan.title}`,
        message: `The care plan "${plan.title}" for ${plan.patientName} has been archived.`,
        priority: 'low',
        recipientIds: recipients,
        metadata: {
          planId,
          patientId: plan.patientId,
          patientName: plan.patientName,
          archivedAt: new Date(),
        },
        channels: ['in_app'],
      };

      return await this.sendNotification(payload);
    } catch (error) {
      logger.error('Failed to send archive notification', { error, planId });
      return { success: false, errors: ['Notification service error'] };
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
