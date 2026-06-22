import axios from 'axios';
import { IIncident, ISafeguarding } from '../models/incident';
import { logger } from '../utils/logger';

export interface AlertRecipient {
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  department?: string;
}

export interface AlertMessage {
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  channels: ('email' | 'sms' | 'push' | 'webhook')[];
  metadata?: Record<string, unknown>;
}

export interface FollowUpTask {
  incidentId: string;
  taskId: string;
  title: string;
  description: string;
  assignedTo: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: Date;
}

export class AlertService {
  private notificationServiceUrl: string;
  private smsServiceUrl: string;
  private emailServiceUrl: string;
  private taskServiceUrl: string;
  private webhookUrl: string;

  constructor() {
    this.notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4011';
    this.smsServiceUrl = process.env.SMS_SERVICE_URL || 'http://localhost:4011/sms';
    this.emailServiceUrl = process.env.EMAIL_SERVICE_URL || 'http://localhost:4011/email';
    this.taskServiceUrl = process.env.TASK_SERVICE_URL || 'http://localhost:4011/tasks';
    this.webhookUrl = process.env.WEBHOOK_URL || '';
  }

  /**
   * Trigger incident alert
   */
  async triggerIncidentAlert(incident: IIncident): Promise<void> {
    const priority = this.mapSeverityToPriority(incident.severity);
    const alertMessage = this.buildIncidentAlertMessage(incident, priority);

    // Get appropriate recipients based on severity and type
    const recipients = await this.getIncidentRecipients(incident);

    // Send alerts through all channels
    await Promise.all([
      this.sendEmailAlerts(recipients, alertMessage),
      this.sendPushNotifications(recipients, alertMessage),
      this.sendWebhookAlert(alertMessage, incident),
      this.triggerIncidentDashboardUpdate(incident)
    ]);

    logger.info(`Incident alert triggered: ${incident.incidentId}`, {
      incidentId: incident.incidentId,
      severity: incident.severity,
      priority,
      recipientCount: recipients.length
    });

    // Create follow-up tasks for critical incidents
    if (incident.severity === 'critical' || incident.severity === 'major') {
      await this.createFollowUpTask(incident.incidentId);
    }
  }

  /**
   * Notify family about incident
   */
  async notifyFamily(incident: IIncident): Promise<{ success: boolean; message: string }> {
    if (!incident.patientId) {
      logger.warn(`Cannot notify family: no patient ID for incident ${incident.incidentId}`);
      return { success: false, message: 'No patient ID associated with incident' };
    }

    const priority = this.mapSeverityToPriority(incident.severity);
    const alertMessage = this.buildFamilyNotificationMessage(incident);

    try {
      // Call notification service to send family notification
      const response = await axios.post(
        `${this.notificationServiceUrl}/notify/family`,
        {
          patientId: incident.patientId,
          incidentId: incident.incidentId,
          message: alertMessage.message,
          priority,
          channels: ['sms', 'email']
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'X-Service': 'incident-management'
          }
        }
      );

      logger.info(`Family notified about incident: ${incident.incidentId}`, {
        incidentId: incident.incidentId,
        patientId: incident.patientId,
        response: response.data
      });

      return { success: true, message: 'Family notified successfully' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to notify family: ${errorMessage}`, {
        incidentId: incident.incidentId,
        patientId: incident.patientId
      });

      return { success: false, message: errorMessage };
    }
  }

  /**
   * Notify management about incident
   */
  async notifyManagement(
    incident: IIncident,
    additionalRecipients?: AlertRecipient[]
  ): Promise<void> {
    const priority = this.mapSeverityToPriority(incident.severity);
    const alertMessage = this.buildManagementAlertMessage(incident, priority);

    // Get management recipients
    const managementRecipients = await this.getManagementRecipients(
      incident.facilityId,
      incident.severity
    );

    // Combine with additional recipients
    const allRecipients = [
      ...managementRecipients,
      ...(additionalRecipients || [])
    ];

    // Remove duplicates
    const uniqueRecipients = allRecipients.filter(
      (recipient, index, self) =>
        index === self.findIndex((r) => r.userId === recipient.userId)
    );

    await Promise.all([
      this.sendEmailAlerts(uniqueRecipients, alertMessage),
      this.sendPushNotifications(uniqueRecipients, alertMessage),
      this.sendWebhookAlert(alertMessage, incident)
    ]);

    logger.info(`Management notified about incident: ${incident.incidentId}`, {
      incidentId: incident.incidentId,
      recipientCount: uniqueRecipients.length
    });
  }

  /**
   * Create follow-up task for incident
   */
  async createFollowUpTask(incidentId: string): Promise<FollowUpTask | null> {
    const task: FollowUpTask = {
      incidentId,
      taskId: `TASK-${Date.now()}-${incidentId.split('-')[1] || '0'}`,
      title: `Follow-up required for incident ${incidentId}`,
      description: `Review and complete follow-up actions for incident ${incidentId}. Ensure all documentation is complete and all parties are informed.`,
      assignedTo: '', // Will be assigned by task service
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      priority: 'high',
      status: 'pending',
      createdAt: new Date()
    };

    try {
      const response = await axios.post(
        this.taskServiceUrl,
        {
          taskId: task.taskId,
          incidentId: task.incidentId,
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          priority: task.priority,
          status: task.status,
          createdAt: task.createdAt
        },
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'X-Service': 'incident-management'
          }
        }
      );

      logger.info(`Follow-up task created for incident: ${incidentId}`, {
        incidentId,
        taskId: task.taskId
      });

      return { ...task, assignedTo: response.data.assignedTo || '' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to create follow-up task: ${errorMessage}`, {
        incidentId
      });

      // Return task object even if creation failed (for local tracking)
      return task;
    }
  }

  /**
   * Trigger safeguarding alert
   */
  async triggerSafeguardingAlert(concern: ISafeguarding): Promise<void> {
    const priority = this.mapRiskLevelToPriority(concern.riskLevel);
    const alertMessage = this.buildSafeguardingAlertMessage(concern, priority);

    // Get safeguarding team recipients
    const recipients = await this.getSafeguardingRecipients(concern);

    // Send immediate notifications
    await Promise.all([
      this.sendEmailAlerts(recipients, alertMessage),
      this.sendSmsAlerts(recipients, alertMessage),
      this.sendPushNotifications(recipients, alertMessage),
      this.sendWebhookAlert(alertMessage, null, concern)
    ]);

    // Escalate to authorities if immediate risk
    if (concern.riskLevel === 'immediate') {
      await this.escalateToAuthorities(concern);
    }

    logger.warn(`Safeguarding alert triggered: ${concern.concernId}`, {
      concernId: concern.concernId,
      riskLevel: concern.riskLevel,
      priority,
      recipientCount: recipients.length
    });
  }

  /**
   * Send daily summary to management
   */
  async sendDailySummary(
    facilityId: string,
    summary: {
      totalIncidents: number;
      criticalIncidents: number;
      openIncidents: number;
      highRiskConcerns: number;
    }
  ): Promise<void> {
    const recipients = await this.getManagementRecipients(facilityId, 'minor');

    const alertMessage: AlertMessage = {
      title: `Daily Incident Summary - ${new Date().toLocaleDateString()}`,
      message: `
        Daily Incident Summary for ${new Date().toLocaleDateString()}

        Total Incidents: ${summary.totalIncidents}
        Critical Incidents: ${summary.criticalIncidents}
        Open Incidents: ${summary.openIncidents}
        High-Risk Safeguarding Concerns: ${summary.highRiskConcerns}

        Please review the dashboard for detailed information.
      `.trim(),
      priority: 'medium',
      channels: ['email']
    };

    await this.sendEmailAlerts(recipients, alertMessage);

    logger.info(`Daily summary sent for facility: ${facilityId}`, {
      facilityId,
      totalIncidents: summary.totalIncidents
    });
  }

  /**
   * Send shift handover alert
   */
  async sendShiftHandoverAlert(
    facilityId: string,
    openIncidents: IIncident[],
    openConcerns: ISafeguarding[]
  ): Promise<void> {
    const alertMessage: AlertMessage = {
      title: `Shift Handover Report - ${new Date().toLocaleString()}`,
      message: `
        SHIFT HANDOVER REPORT
        ====================
        Generated: ${new Date().toLocaleString()}

        OPEN INCIDENTS: ${openIncidents.length}
        ${openIncidents
          .map(
            (inc) => `
        - ${inc.incidentId}: ${inc.title} (${inc.severity})
          Status: ${inc.status}
          Location: ${inc.location.area}
        `
          )
          .join('\n')}

        OPEN SAFEGUARDING CONCERNS: ${openConcerns.length}
        ${openConcerns
          .map(
            (concern) => `
        - ${concern.concernId}: ${concern.concernType} (${concern.riskLevel})
          Status: ${concern.status}
          Person: ${concern.vulnerablePerson.name}
        `
          )
          .join('\n')}

        Please ensure proper handover to incoming shift.
      `.trim(),
      priority: 'high',
      channels: ['email', 'push']
    };

    const recipients = await this.getManagementRecipients(facilityId, 'minor');

    await Promise.all([
      this.sendEmailAlerts(recipients, alertMessage),
      this.sendPushNotifications(recipients, alertMessage)
    ]);

    logger.info(`Shift handover alert sent for facility: ${facilityId}`, {
      facilityId,
      openIncidents: openIncidents.length,
      openConcerns: openConcerns.length
    });
  }

  // ==================== PRIVATE METHODS ====================

  private async getIncidentRecipients(incident: IIncident): Promise<AlertRecipient[]> {
    // In production, this would query a user service
    // For now, return mock recipients based on severity
    const recipients: AlertRecipient[] = [
      {
        userId: 'facility-manager',
        name: 'Facility Manager',
        role: 'facility_manager',
        department: 'management'
      }
    ];

    // Add unit manager for specific incident types
    if (
      incident.type === 'safeguarding' ||
      incident.type === 'aggression' ||
      incident.severity === 'critical'
    ) {
      recipients.push({
        userId: 'safety-officer',
        name: 'Safety Officer',
        role: 'safety_officer',
        department: 'safety'
      });
    }

    // Add clinical lead for medical incidents
    if (
      incident.type === 'medication_error' ||
      incident.type === 'fall' ||
      incident.injuries.length > 0
    ) {
      recipients.push({
        userId: 'clinical-lead',
        name: 'Clinical Lead',
        role: 'clinical_lead',
        department: 'clinical'
      });
    }

    return recipients;
  }

  private async getManagementRecipients(
    facilityId: string,
    severity: string
  ): Promise<AlertRecipient[]> {
    const recipients: AlertRecipient[] = [
      {
        userId: 'facility-manager',
        name: 'Facility Manager',
        role: 'facility_manager',
        department: 'management'
      },
      {
        userId: 'operations-director',
        name: 'Operations Director',
        role: 'operations_director',
        department: 'operations'
      }
    ];

    // Add executive for critical incidents
    if (severity === 'critical') {
      recipients.push({
        userId: 'executive-on-call',
        name: 'Executive On-Call',
        role: 'executive',
        department: 'executive'
      });
    }

    return recipients;
  }

  private async getSafeguardingRecipients(concern: ISafeguarding): Promise<AlertRecipient[]> {
    const recipients: AlertRecipient[] = [
      {
        userId: 'safeguarding-lead',
        name: 'Safeguarding Lead',
        role: 'safeguarding_lead',
        department: 'safeguarding'
      },
      {
        userId: 'safeguarding-manager',
        name: 'Safeguarding Manager',
        role: 'safeguarding_manager',
        department: 'safeguarding'
      }
    ];

    // Add external authorities for immediate risks
    if (concern.riskLevel === 'immediate') {
      recipients.push({
        userId: 'local-authority',
        name: 'Local Authority Safeguarding Team',
        role: 'external_authority',
        email: 'safeguarding@localauthority.gov.uk'
      });
    }

    return recipients;
  }

  private async sendEmailAlerts(
    recipients: AlertRecipient[],
    alertMessage: AlertMessage
  ): Promise<void> {
    if (!alertMessage.channels.includes('email')) return;

    try {
      await axios.post(
        this.emailServiceUrl,
        {
          recipients: recipients
            .filter((r) => r.email)
            .map((r) => ({
              email: r.email,
              name: r.name
            })),
          subject: alertMessage.title,
          body: alertMessage.message,
          priority: alertMessage.priority
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'X-Service': 'incident-management'
          }
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to send email alerts: ${errorMessage}`);
    }
  }

  private async sendSmsAlerts(
    recipients: AlertRecipient[],
    alertMessage: AlertMessage
  ): Promise<void> {
    if (!alertMessage.channels.includes('sms')) return;

    try {
      await axios.post(
        this.smsServiceUrl,
        {
          recipients: recipients
            .filter((r) => r.phone)
            .map((r) => ({
              phone: r.phone,
              name: r.name
            })),
          message: alertMessage.message.substring(0, 160), // SMS length limit
          priority: alertMessage.priority
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'X-Service': 'incident-management'
          }
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to send SMS alerts: ${errorMessage}`);
    }
  }

  private async sendPushNotifications(
    recipients: AlertRecipient[],
    alertMessage: AlertMessage
  ): Promise<void> {
    if (!alertMessage.channels.includes('push')) return;

    try {
      await axios.post(
        `${this.notificationServiceUrl}/push`,
        {
          recipients: recipients.map((r) => r.userId),
          title: alertMessage.title,
          body: alertMessage.message.substring(0, 200),
          priority: alertMessage.priority,
          data: alertMessage.metadata
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'X-Service': 'incident-management'
          }
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to send push notifications: ${errorMessage}`);
    }
  }

  private async sendWebhookAlert(
    alertMessage: AlertMessage,
    incident?: IIncident | null,
    concern?: ISafeguarding | null
  ): Promise<void> {
    if (!this.webhookUrl || !alertMessage.channels.includes('webhook')) return;

    try {
      await axios.post(
        this.webhookUrl,
        {
          alert: alertMessage,
          incident: incident
            ? {
                id: incident.incidentId,
                type: incident.type,
                severity: incident.severity,
                status: incident.status,
                patientId: incident.patientId,
                location: incident.location
              }
            : null,
          safeguarding: concern
            ? {
                id: concern.concernId,
                type: concern.concernType,
                riskLevel: concern.riskLevel,
                status: concern.status,
                vulnerablePersonId: concern.vulnerablePerson.personId
              }
            : null,
          timestamp: new Date().toISOString()
        },
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'X-Service': 'incident-management'
          }
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to send webhook alert: ${errorMessage}`);
    }
  }

  private async triggerIncidentDashboardUpdate(incident: IIncident): Promise<void> {
    try {
      // Publish to internal event system
      await axios.post(
        `${this.notificationServiceUrl}/events/incident-update`,
        {
          type: 'INCIDENT_CREATED',
          incidentId: incident.incidentId,
          severity: incident.severity,
          status: incident.status,
          timestamp: new Date().toISOString()
        },
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'X-Service': 'incident-management'
          }
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to trigger dashboard update: ${errorMessage}`);
    }
  }

  private async escalateToAuthorities(concern: ISafeguarding): Promise<void> {
    try {
      await axios.post(
        `${this.notificationServiceUrl}/escalate/safeguarding`,
        {
          concernId: concern.concernId,
          riskLevel: concern.riskLevel,
          concernType: concern.concernType,
          vulnerablePerson: concern.vulnerablePerson,
          description: concern.description,
          immediateActions: concern.immediateActions,
          timestamp: new Date().toISOString()
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'X-Service': 'incident-management'
          }
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to escalate to authorities: ${errorMessage}`);
    }
  }

  private buildIncidentAlertMessage(
    incident: IIncident,
    priority: AlertMessage['priority']
  ): AlertMessage {
    return {
      title: `[${incident.severity.toUpperCase()}] Incident Reported: ${incident.incidentId}`,
      message: `
        INCIDENT ALERT
        =============
        Incident ID: ${incident.incidentId}
        Type: ${incident.type}
        Severity: ${incident.severity}
        Status: ${incident.status}

        Patient: ${incident.patientName} (${incident.patientId})
        Location: ${incident.location.area}${incident.location.room ? `, Room ${incident.location.room}` : ''}

        Date/Time: ${new Date(incident.incidentDate).toLocaleString()} ${incident.incidentTime}

        Description:
        ${incident.description}

        Reported By: ${incident.reportedBy.name} (${incident.reportedBy.role})

        ${incident.injuries.length > 0 ? `Injuries: ${incident.injuries.length} injury/ies reported` : ''}
        ${incident.witnesses.length > 0 ? `Witnesses: ${incident.witnesses.length} witness/ies recorded` : ''}
      `.trim(),
      priority,
      channels: ['email', 'push', 'webhook'],
      metadata: {
        incidentId: incident.incidentId,
        type: incident.type,
        severity: incident.severity
      }
    };
  }

  private buildFamilyNotificationMessage(incident: IIncident): AlertMessage {
    return {
      title: `Patient Incident Notification`,
      message: `
        Dear Family Member,

        We are writing to inform you that an incident occurred involving your loved one on ${new Date(
          incident.incidentDate
        ).toLocaleDateString()}.

        Incident Type: ${this.formatIncidentType(incident.type)}

        Our care team has addressed the situation and your loved one is receiving appropriate care.
        A member of our staff will contact you shortly to provide more details and answer any questions.

        If you have immediate concerns, please contact us at [Facility Contact Number].

        Thank you for your trust in our care.

        [Facility Name]
      `.trim(),
      priority: 'medium',
      channels: ['email', 'sms']
    };
  }

  private buildManagementAlertMessage(
    incident: IIncident,
    priority: AlertMessage['priority']
  ): AlertMessage {
    return {
      title: `[${priority.toUpperCase()}] Incident Management Alert: ${incident.incidentId}`,
      message: `
        MANAGEMENT ALERT
        ================
        Incident ID: ${incident.incidentId}
        Type: ${incident.type}
        Severity: ${incident.severity}
        Status: ${incident.status}

        Facility: ${incident.facilityName} (${incident.facilityId})

        Patient: ${incident.patientName}
        Location: ${incident.location.area}

        Time: ${new Date(incident.incidentDate).toLocaleString()}

        ${incident.severity === 'critical' || incident.severity === 'major' ? '⚠️ ESCALATION REQUIRED' : ''}

        Reported By: ${incident.reportedBy.name}

        Action Required: ${incident.status === 'reported' ? 'Review and assign investigation' : 'Monitor progress'}

        View full details in the Incident Management System.
      `.trim(),
      priority,
      channels: ['email', 'push']
    };
  }

  private buildSafeguardingAlertMessage(
    concern: ISafeguarding,
    priority: AlertMessage['priority']
  ): AlertMessage {
    return {
      title: `🚨 SAFEGUARDING ALERT: ${concern.concernId}`,
      message: `
        SAFEGUARDING CONCERN - ${concern.riskLevel.toUpperCase()} RISK
        ==========================================================

        Concern ID: ${concern.concernId}
        Type: ${concern.concernType}
        Risk Level: ${concern.riskLevel}
        Status: ${concern.status}

        Vulnerable Person: ${concern.vulnerablePerson.name}
        ${concern.vulnerablePerson.careLocation ? `Location: ${concern.vulnerablePerson.careLocation}` : ''}

        Description:
        ${concern.description}

        Raised By: ${concern.concernRaisedBy.name} (${concern.concernRaisedBy.role})
        Date: ${new Date().toLocaleString()}

        ${concern.riskLevel === 'immediate' || concern.riskLevel === 'high' ? `
        ⚠️ IMMEDIATE ACTION REQUIRED ⚠️

        ${concern.immediateActions.length > 0 ? `Immediate Actions Taken:\n${concern.immediateActions.map((a) => `- ${a.action}`).join('\n')}` : ''}
        ` : ''}

        Please take immediate action as required.
      `.trim(),
      priority,
      channels: ['email', 'sms', 'push', 'webhook'],
      metadata: {
        concernId: concern.concernId,
        riskLevel: concern.riskLevel,
        type: concern.concernType
      }
    };
  }

  private mapSeverityToPriority(severity: string): AlertMessage['priority'] {
    const mapping: Record<string, AlertMessage['priority']> = {
      critical: 'critical',
      major: 'high',
      moderate: 'medium',
      minor: 'low'
    };
    return mapping[severity] || 'medium';
  }

  private mapRiskLevelToPriority(riskLevel: string): AlertMessage['priority'] {
    const mapping: Record<string, AlertMessage['priority']> = {
      immediate: 'critical',
      high: 'high',
      medium: 'medium',
      low: 'low'
    };
    return mapping[riskLevel] || 'medium';
  }

  private formatIncidentType(type: string): string {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

export const alertService = new AlertService();
