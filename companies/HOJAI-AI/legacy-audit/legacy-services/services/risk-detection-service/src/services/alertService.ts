import {
  RiskAlert,
  IRiskAlert,
  RiskCarePlan,
  IRiskCarePlan,
  RiskLevel,
  AlertPriority,
  AlertStatus
} from '../models/risk';
import { logger } from '../utils/logger';
import axios from 'axios';

interface RiskAlertInput {
  type: string;
  score?: number;
  indicators?: Array<{
    parameter: string;
    severity: string;
    value: number;
  }>;
  recommendations?: string[];
  concernType?: string;
  vulnerabilities?: Array<{
    category: string;
    severity: string;
  }>;
  immediateActions?: string[];
  vitals?: Record<string, number | string>;
  metadata?: Record<string, unknown>;
}

interface CarePlanInput {
  goals?: {
    shortTerm?: string[];
    longTerm?: string[];
  };
  interventions?: Array<{
    description: string;
    frequency: string;
    responsible: string;
    startDate: Date;
    endDate?: Date;
  }>;
  monitoringPlan?: {
    frequency: string;
    indicators: string[];
    nextReview: Date;
  };
}

export class AlertService {
  private readonly notificationEndpoints: Record<string, string> = {
    slack: process.env.SLACK_WEBHOOK_URL || '',
    pagerduty: process.env.PAGERDUTY_API_KEY || '',
    email: process.env.SMTP_HOST || '',
    sms: process.env.SMS_GATEWAY_URL || ''
  };

  /**
   * Send risk alert for a patient
   */
  async sendRiskAlert(
    patientId: string,
    riskType: 'fall' | 'wound' | 'deterioration' | 'safeguarding',
    level: RiskLevel,
    alertData: RiskAlertInput = {}
  ): Promise<IRiskAlert> {
    logger.info(`Sending ${riskType} risk alert for patient ${patientId}, level: ${level}`);

    // Determine priority based on risk level
    const priority = this.determinePriority(level);

    // Generate alert message
    const { title, message } = this.generateAlertContent(patientId, riskType, level, alertData);

    // Determine recipients based on risk type and level
    const recipients = this.determineRecipients(riskType, level);

    // Create alert record
    const alert = new RiskAlert({
      patientId,
      riskType,
      riskLevel: level,
      priority,
      status: AlertStatus.PENDING,
      title,
      message,
      recommendations: alertData.recommendations || [],
      recipients,
      escalationCount: 0,
      expiresAt: this.calculateExpiryTime(level)
    });

    await alert.save();

    // Send notifications
    await this.notifyCareTeam(patientId, {
      alertId: alert._id.toString(),
      riskType,
      priority,
      title,
      message,
      recommendations: alertData.recommendations || [],
      metadata: alertData.metadata
    });

    // Mark alert as sent
    alert.status = AlertStatus.SENT;
    alert.sentAt = new Date();
    await alert.save();

    logger.info(`Risk alert sent for patient ${patientId}. Alert ID: ${alert._id}`);

    return alert;
  }

  /**
   * Notify care team via configured channels
   */
  async notifyCareTeam(patientId: string, alert: {
    alertId: string;
    riskType: string;
    priority: AlertPriority;
    title: string;
    message: string;
    recommendations: string[];
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const notifications = [];

    // Send to Slack if configured
    if (this.notificationEndpoints.slack) {
      notifications.push(this.sendSlackNotification(patientId, alert));
    }

    // Send to PagerDuty if configured
    if (this.notificationEndpoints.pagerduty) {
      notifications.push(this.sendPagerDutyAlert(patientId, alert));
    }

    // Send email if configured
    if (this.notificationEndpoints.email) {
      notifications.push(this.sendEmailNotification(patientId, alert));
    }

    // Send SMS for critical alerts
    if (this.notificationEndpoints.sms && alert.priority === AlertPriority.CRITICAL) {
      notifications.push(this.sendSMSNotification(patientId, alert));
    }

    await Promise.allSettled(notifications);
  }

  /**
   * Create risk care plan for a patient
   */
  async createRiskCarePlan(
    patientId: string,
    riskType: 'fall' | 'wound' | 'deterioration' | 'safeguarding',
    riskLevel: RiskLevel,
    input: CarePlanInput = {}
  ): Promise<IRiskCarePlan> {
    logger.info(`Creating care plan for patient ${patientId}, risk type: ${riskType}`);

    // Generate default goals based on risk type
    const goals = input.goals || this.generateDefaultGoals(riskType);

    // Generate default interventions based on risk level
    const interventions = input.interventions || this.generateDefaultInterventions(riskType, riskLevel);

    // Generate default monitoring plan
    const monitoringPlan = input.monitoringPlan || this.generateDefaultMonitoringPlan(riskType, riskLevel);

    const carePlan = new RiskCarePlan({
      patientId,
      riskType,
      riskLevel,
      goals,
      interventions,
      monitoringPlan,
      reviewHistory: [],
      status: 'active'
    });

    await carePlan.save();

    logger.info(`Care plan created for patient ${patientId}. Plan ID: ${carePlan._id}`);

    return carePlan;
  }

  /**
   * Get alerts for a patient
   */
  async getPatientAlerts(
    patientId: string,
    riskType?: 'fall' | 'wound' | 'deterioration' | 'safeguarding',
    status?: AlertStatus,
    limit = 20
  ): Promise<IRiskAlert[]> {
    const query: Record<string, unknown> = { patientId };
    if (riskType) query.riskType = riskType;
    if (status) query.status = status;

    return RiskAlert.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get active alerts (pending or sent, not resolved)
   */
  async getActiveAlerts(riskType?: string): Promise<IRiskAlert[]> {
    const query: Record<string, unknown> = {
      status: { $in: [AlertStatus.PENDING, AlertStatus.SENT, AlertStatus.ACKNOWLEDGED] }
    };
    if (riskType) query.riskType = riskType;

    return RiskAlert.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .lean();
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    await RiskAlert.findByIdAndUpdate(alertId, {
      status: AlertStatus.ACKNOWLEDGED,
      acknowledgedBy,
      acknowledgedAt: new Date()
    });

    logger.info(`Alert ${alertId} acknowledged by ${acknowledgedBy}`);
  }

  /**
   * Respond to an alert
   */
  async respondToAlert(
    alertId: string,
    response: string,
    respondedBy: string
  ): Promise<void> {
    await RiskAlert.findByIdAndUpdate(alertId, {
      status: AlertStatus.RESPONDED,
      response,
      respondedBy,
      respondedAt: new Date()
    });

    logger.info(`Alert ${alertId} responded to by ${respondedBy}`);
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolvedBy: string): Promise<void> {
    await RiskAlert.findByIdAndUpdate(alertId, {
      status: AlertStatus.RESOLVED
    });

    logger.info(`Alert ${alertId} resolved by ${resolvedBy}`);
  }

  /**
   * Escalate an alert
   */
  async escalateAlert(alertId: string): Promise<void> {
    const alert = await RiskAlert.findById(alertId);
    if (!alert) return;

    const escalationTime = new Date();
    escalationTime.setMinutes(escalationTime.getMinutes() + 15); // Escalate every 15 minutes

    await RiskAlert.findByIdAndUpdate(alertId, {
      escalationCount: alert.escalationCount + 1,
      lastEscalationAt: new Date(),
      recipients: this.getEscalatedRecipients(alert.riskType, alert.escalationCount + 1)
    });

    // Re-notify escalated recipients
    await this.notifyCareTeam(alert.patientId, {
      alertId: alert._id.toString(),
      riskType: alert.riskType,
      priority: this.increasePriority(alert.priority),
      title: `[ESCALATED] ${alert.title}`,
      message: alert.message,
      recommendations: alert.recommendations,
      metadata: { escalationNumber: alert.escalationCount + 1 }
    });

    logger.warn(`Alert ${alertId} escalated to level ${alert.escalationCount + 1}`);
  }

  /**
   * Get care plan for a patient
   */
  async getPatientCarePlan(
    patientId: string,
    riskType?: string
  ): Promise<IRiskCarePlan | null> {
    const query: Record<string, unknown> = { patientId, status: 'active' };
    if (riskType) query.riskType = riskType;

    return RiskCarePlan.findOne(query).lean();
  }

  /**
   * Update care plan
   */
  async updateCarePlan(
    carePlanId: string,
    updates: Partial<IRiskCarePlan>
  ): Promise<void> {
    await RiskCarePlan.findByIdAndUpdate(carePlanId, updates);
    logger.info(`Care plan ${carePlanId} updated`);
  }

  /**
   * Review care plan
   */
  async reviewCarePlan(
    carePlanId: string,
    reviewedBy: string,
    changes: string,
    outcome: string
  ): Promise<void> {
    const carePlan = await RiskCarePlan.findById(carePlanId);
    if (!carePlan) return;

    carePlan.reviewHistory.push({
      date: new Date(),
      reviewedBy,
      changes,
      outcome
    });

    carePlan.monitoringPlan.nextReview = new Date();
    carePlan.monitoringPlan.nextReview.setDate(
      carePlan.monitoringPlan.nextReview.getDate() + 30
    );

    await carePlan.save();
    logger.info(`Care plan ${carePlanId} reviewed by ${reviewedBy}`);
  }

  /**
   * Complete care plan
   */
  async completeCarePlan(carePlanId: string): Promise<void> {
    await RiskCarePlan.findByIdAndUpdate(carePlanId, { status: 'completed' });
    logger.info(`Care plan ${carePlanId} completed`);
  }

  /**
   * Get alert statistics
   */
  async getAlertStatistics(): Promise<{
    totalAlerts: number;
    activeAlerts: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    averageResponseTime: number;
  }> {
    const totalAlerts = await RiskAlert.countDocuments();
    const activeAlerts = await RiskAlert.countDocuments({
      status: { $in: [AlertStatus.PENDING, AlertStatus.SENT, AlertStatus.ACKNOWLEDGED] }
    });

    const aggregations = await RiskAlert.aggregate([
      {
        $facet: {
          byType: [{ $group: { _id: '$riskType', count: { $sum: 1 } } }],
          byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }]
        }
      }
    ]);

    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    if (aggregations[0]) {
      aggregations[0].byType.forEach((item: { _id: string; count: number }) => {
        byType[item._id] = item.count;
      });
      aggregations[0].byPriority.forEach((item: { _id: string; count: number }) => {
        byPriority[item._id] = item.count;
      });
    }

    return {
      totalAlerts,
      activeAlerts,
      byType,
      byPriority,
      averageResponseTime: 0 // Would need actual response time calculation
    };
  }

  // ==================== PRIVATE METHODS ====================

  private determinePriority(level: RiskLevel): AlertPriority {
    switch (level) {
      case RiskLevel.VERY_HIGH:
        return AlertPriority.CRITICAL;
      case RiskLevel.HIGH:
        return AlertPriority.URGENT;
      case RiskLevel.MODERATE:
        return AlertPriority.HIGH;
      default:
        return AlertPriority.MEDIUM;
    }
  }

  private generateAlertContent(
    patientId: string,
    riskType: string,
    level: RiskLevel,
    alertData: RiskAlertInput
  ): { title: string; message: string } {
    const levelLabel = level.toUpperCase().replace('_', ' ');
    let title = `${levelLabel} ${riskType.toUpperCase()} RISK ALERT - Patient ${patientId}`;
    let message = '';

    switch (riskType) {
      case 'fall':
        message = `Fall risk assessment indicates ${levelLabel} risk for patient ${patientId}.`;
        if (alertData.score !== undefined) {
          message += ` Assessment score: ${alertData.score}.`;
        }
        break;
      case 'wound':
        message = `Wound deterioration risk identified for patient ${patientId}.`;
        if (alertData.indicators) {
          const concerning = alertData.indicators.filter(i => i.severity !== 'normal');
          if (concerning.length > 0) {
            message += ` Concerning indicators: ${concerning.map(i => i.parameter).join(', ')}.`;
          }
        }
        break;
      case 'deterioration':
        message = `Clinical deterioration detected for patient ${patientId}.`;
        if (alertData.type) {
          message += ` Type: ${alertData.type}.`;
        }
        if (alertData.score !== undefined) {
          message += ` NEWS score: ${alertData.score}.`;
        }
        break;
      case 'safeguarding':
        message = `Safeguarding concern identified for patient ${patientId}.`;
        if (alertData.concernType) {
          message += ` Concern type: ${alertData.concernType.replace(/_/g, ' ')}.`;
        }
        break;
    }

    if (alertData.immediateActions && alertData.immediateActions.length > 0) {
      message += `\n\nImmediate actions required:\n${alertData.immediateActions.map(a => `- ${a}`).join('\n')}`;
    }

    if (alertData.recommendations && alertData.recommendations.length > 0) {
      message += `\n\nRecommendations:\n${alertData.recommendations.slice(0, 3).map(r => `- ${r}`).join('\n')}`;
    }

    return { title, message };
  }

  private determineRecipients(
    riskType: string,
    level: RiskLevel
  ): string[] {
    const recipients: string[] = [];

    // Base recipients for all alerts
    recipients.push('nurse-in-charge');
    recipients.push('ward-manager');

    // Add medical team for high/very high risk
    if (level === RiskLevel.HIGH || level === RiskLevel.VERY_HIGH) {
      recipients.push('medical-team');
      recipients.push('senior-nurse');
    }

    // Type-specific recipients
    switch (riskType) {
      case 'fall':
        recipients.push('physiotherapist');
        break;
      case 'wound':
        recipients.push('tissue-viability-nurse');
        break;
      case 'deterioration':
        recipients.push('rapid-response-team');
        recipients.push('icu-outreach');
        break;
      case 'safeguarding':
        recipients.push('safeguarding-lead');
        recipients.push('social-worker');
        break;
    }

    // Add critical escalation for very high risk
    if (level === RiskLevel.VERY_HIGH) {
      recipients.push('duty-doctor');
      recipients.push('hospital-at-night');
    }

    return [...new Set(recipients)];
  }

  private calculateExpiryTime(level: RiskLevel): Date {
    const expiry = new Date();
    switch (level) {
      case RiskLevel.VERY_HIGH:
        expiry.setMinutes(expiry.getMinutes() + 30);
        break;
      case RiskLevel.HIGH:
        expiry.setHours(expiry.getHours() + 1);
        break;
      case RiskLevel.MODERATE:
        expiry.setHours(expiry.getHours() + 4);
        break;
      default:
        expiry.setHours(expiry.getHours() + 8);
    }
    return expiry;
  }

  private generateDefaultGoals(riskType: string): IRiskCarePlan['goals'] {
    switch (riskType) {
      case 'fall':
        return {
          shortTerm: [
            'Prevent falls in next 7 days',
            'Maintain patient safety',
            'Identify and address immediate risk factors'
          ],
          longTerm: [
            'Reduce fall risk to low over 3 months',
            'Improve mobility and strength',
            'Achieve independence with safe ambulation'
          ]
        };
      case 'wound':
        return {
          shortTerm: [
            'Prevent wound deterioration',
            'Reduce infection risk',
            'Promote wound healing'
          ],
          longTerm: [
            'Complete wound closure',
            'Restore skin integrity',
            'Prevent recurrence'
          ]
        };
      case 'deterioration':
        return {
          shortTerm: [
            'Stabilize vital signs',
            'Prevent further deterioration',
            'Identify and treat underlying cause'
          ],
          longTerm: [
            'Restore baseline function',
            'Prevent readmission',
            'Optimize chronic disease management'
          ]
        };
      case 'safeguarding':
        return {
          shortTerm: [
            'Ensure immediate safety',
            'Address urgent concerns',
            'Complete safeguarding assessment'
          ],
          longTerm: [
            'Achieve sustained safety',
            'Empower patient voice and choice',
            'Build protective factors'
          ]
        };
      default:
        return { shortTerm: [], longTerm: [] };
    }
  }

  private generateDefaultInterventions(
    riskType: string,
    level: RiskLevel
  ): IRiskCarePlan['interventions'] {
    const interventions = [];

    // Universal interventions
    interventions.push({
      description: 'Regular risk reassessment',
      frequency: level === RiskLevel.VERY_HIGH ? 'Daily' : 'Weekly',
      responsible: 'Nursing Staff',
      startDate: new Date()
    });

    interventions.push({
      description: 'Patient and family education on risk prevention',
      frequency: 'Ongoing',
      responsible: 'All Clinical Staff',
      startDate: new Date()
    });

    // Type-specific
    switch (riskType) {
      case 'fall':
        interventions.push({
          description: 'Environmental safety assessment',
          frequency: 'Weekly',
          responsible: 'Physiotherapist',
          startDate: new Date()
        });
        if (level === RiskLevel.HIGH || level === RiskLevel.VERY_HIGH) {
          interventions.push({
            description: 'Bed/chair alarm monitoring',
            frequency: 'Continuous',
            responsible: 'Nursing Staff',
            startDate: new Date()
          });
        }
        break;
      case 'wound':
        interventions.push({
          description: 'Wound assessment and documentation',
          frequency: level === RiskLevel.VERY_HIGH ? 'Daily' : 'Twice weekly',
          responsible: 'Wound Care Nurse',
          startDate: new Date()
        });
        break;
      case 'deterioration':
        interventions.push({
          description: 'Vital signs monitoring',
          frequency: level === RiskLevel.VERY_HIGH ? 'Every 4 hours' : 'Every 8 hours',
          responsible: 'Nursing Staff',
          startDate: new Date()
        });
        break;
      case 'safeguarding':
        interventions.push({
          description: 'Multi-agency safeguarding review',
          frequency: level === RiskLevel.VERY_HIGH ? 'Weekly' : 'Monthly',
          responsible: 'Safeguarding Lead',
          startDate: new Date()
        });
        break;
    }

    return interventions;
  }

  private generateDefaultMonitoringPlan(
    riskType: string,
    level: RiskLevel
  ): IRiskCarePlan['monitoringPlan'] {
    const reviewInterval = level === RiskLevel.VERY_HIGH ? 7 :
      level === RiskLevel.HIGH ? 14 : 30;

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + reviewInterval);

    return {
      frequency: level === RiskLevel.VERY_HIGH ? 'Daily' : 'Weekly',
      indicators: this.getMonitoringIndicators(riskType),
      nextReview
    };
  }

  private getMonitoringIndicators(riskType: string): string[] {
    switch (riskType) {
      case 'fall':
        return [
          'Fall incidents',
          'Mobility level',
          'Balance assessment',
          'Medication changes',
          'Environmental hazards'
        ];
      case 'wound':
        return [
          'Wound size and depth',
          'Tissue viability',
          'Infection signs',
          'Exudate amount',
          'Pain levels'
        ];
      case 'deterioration':
        return [
          'NEWS score',
          'Vital signs',
          'Level of consciousness',
          'Urine output',
          'Symptom progression'
        ];
      case 'safeguarding':
        return [
          'Safety assessment',
          'Vulnerability indicators',
          'Protective factors',
          'Service engagement',
          'Risk level changes'
        ];
      default:
        return ['Risk level', 'Clinical indicators'];
    }
  }

  private async sendSlackNotification(
    patientId: string,
    alert: {
      alertId: string;
      riskType: string;
      priority: AlertPriority;
      title: string;
      message: string;
      recommendations: string[];
    }
  ): Promise<void> {
    try {
      const priorityEmoji = {
        [AlertPriority.CRITICAL]: ':rotating_light:',
        [AlertPriority.URGENT]: ':warning:',
        [AlertPriority.HIGH]: ':exclamation:',
        [AlertPriority.MEDIUM]: ':large_yellow_circle:',
        [AlertPriority.LOW]: ':information_source:'
      };

      const payload = {
        text: alert.title,
        attachments: [{
          color: alert.priority === AlertPriority.CRITICAL ? 'danger' :
            alert.priority === AlertPriority.URGENT ? 'warning' : '#439FE0',
          fields: [
            { title: 'Patient', value: patientId, short: true },
            { title: 'Risk Type', value: alert.riskType, short: true },
            { title: 'Priority', value: `${priorityEmoji[alert.priority]} ${alert.priority.toUpperCase()}`, short: true },
            { title: 'Alert ID', value: alert.alertId, short: true }
          ],
          text: alert.message,
          footer: 'Risk Detection Service',
          ts: Math.floor(Date.now() / 1000)
        }]
      };

      await axios.post(this.notificationEndpoints.slack, payload, {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      logger.error('Failed to send Slack notification', { error, patientId });
    }
  }

  private async sendPagerDutyAlert(
    patientId: string,
    alert: {
      alertId: string;
      riskType: string;
      priority: AlertPriority;
      title: string;
      message: string;
    }
  ): Promise<void> {
    try {
      const urgency = alert.priority === AlertPriority.CRITICAL ? 'high' : 'low';

      await axios.post('https://events.pagerduty.com/v2/enqueue', {
        routing_key: this.notificationEndpoints.pagerduty,
        event_action: 'trigger',
        payload: {
          summary: alert.title,
          source: 'Risk Detection Service',
          severity: urgency === 'high' ? 'critical' : 'warning',
          custom_details: {
            patientId,
            riskType: alert.riskType,
            alertId: alert.alertId,
            message: alert.message
          }
        }
      });
    } catch (error) {
      logger.error('Failed to send PagerDuty alert', { error, patientId });
    }
  }

  private async sendEmailNotification(
    patientId: string,
    alert: {
      title: string;
      message: string;
      recommendations: string[];
    }
  ): Promise<void> {
    // Email implementation would go here
    logger.info(`Email notification prepared for patient ${patientId}`, { title: alert.title });
  }

  private async sendSMSNotification(
    patientId: string,
    alert: {
      title: string;
      priority: AlertPriority;
    }
  ): Promise<void> {
    // SMS implementation would go here
    logger.info(`SMS notification prepared for patient ${patientId}`, { title: alert.title });
  }

  private getEscalatedRecipients(riskType: string, escalationLevel: number): string[] {
    const recipients = this.determineRecipients(riskType, RiskLevel.HIGH);

    // Add more senior recipients at higher escalation levels
    if (escalationLevel >= 2) {
      recipients.push('consultant');
    }
    if (escalationLevel >= 3) {
      recipients.push('clinical-director');
      recipients.push('bed-manager');
    }

    return [...new Set(recipients)];
  }

  private increasePriority(priority: AlertPriority): AlertPriority {
    switch (priority) {
      case AlertPriority.LOW:
        return AlertPriority.MEDIUM;
      case AlertPriority.MEDIUM:
        return AlertPriority.HIGH;
      case AlertPriority.HIGH:
        return AlertPriority.URGENT;
      case AlertPriority.URGENT:
      case AlertPriority.CRITICAL:
        return AlertPriority.CRITICAL;
      default:
        return priority;
    }
  }
}

export const alertService = new AlertService();
