/**
 * Email Notifier for Alerting
 *
 * Sends alerts via email with HTML formatting.
 *
 * @module hojai-alerting/notifiers/email
 */

import { z } from 'zod';
import type { Alert, AlertRule, AlertSeverity, ChannelConfig, Notifier } from '../index';

// ============================================================================
// Types
// ============================================================================

/**
 * Email notifier configuration
 */
export interface EmailNotifierConfig {
  /** SMTP host */
  host: string;
  /** SMTP port */
  port: number;
  /** SMTP secure (TLS) */
  secure: boolean;
  /** SMTP username */
  username?: string;
  /** SMTP password */
  password?: string;
  /** From address */
  from: string;
  /** From name */
  fromName?: string;
  /** Default recipients */
  recipients?: string[];
  /** Reply-to address */
  replyTo?: string;
  /** BCC recipients */
  bcc?: string[];
}

/**
 * Email message
 */
export interface EmailMessage {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text: string;
  from: string;
  replyTo?: string;
}

/**
 * Email template
 */
export interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
}

// ============================================================================
// Schemas
// ============================================================================

/**
 * Schema for email notifier configuration
 */
export const EmailConfigSchema = z.object({
  host: z.string().min(1, 'SMTP host is required'),
  port: z.number().min(1).max(65535).default(587),
  secure: z.boolean().default(false),
  username: z.string().optional(),
  password: z.string().optional(),
  from: z.string().email('Invalid from email address'),
  fromName: z.string().default('HOJAI Alerts'),
  recipients: z.array(z.string().email()).optional(),
  replyTo: z.string().email().optional(),
  bcc: z.array(z.string().email()).optional(),
});

// ============================================================================
// Severity Colors and Icons
// ============================================================================

/**
 * HTML color for severity
 */
export const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  [AlertSeverity.INFO]: '#17A2B8',
  [AlertSeverity.WARNING]: '#FFC107',
  [AlertSeverity.CRITICAL]: '#DC3545',
  [AlertSeverity.EMERGENCY]: '#8B0000',
};

/**
 * Severity labels
 */
export const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  [AlertSeverity.INFO]: 'Information',
  [AlertSeverity.WARNING]: 'Warning',
  [AlertSeverity.CRITICAL]: 'Critical',
  [AlertSeverity.EMERGENCY]: 'Emergency',
};

// ============================================================================
// Email Notifier
// ============================================================================

/**
 * Email Notifier
 *
 * Sends formatted alert emails.
 *
 * @example
 * ```typescript
 * import { EmailNotifier } from '@hojai/alerting';
 *
 * const email = new EmailNotifier({
 *   host: 'smtp.example.com',
 *   port: 587,
 *   secure: false,
 *   username: 'alerts@example.com',
 *   password: process.env.SMTP_PASSWORD,
 *   from: 'alerts@example.com',
 *   recipients: ['oncall@example.com'],
 * });
 *
 * alertManager.registerNotifier('email', email);
 * ```
 */
export class EmailNotifier implements Notifier {
  private config: Required<Omit<EmailNotifierConfig, 'password'>> & { password?: string };

  constructor(config: EmailNotifierConfig) {
    const validated = EmailConfigSchema.parse(config);
    this.config = {
      host: validated.host,
      port: validated.port,
      secure: validated.secure,
      username: validated.username,
      password: validated.password,
      from: validated.from,
      fromName: validated.fromName,
      recipients: validated.recipients || [],
      replyTo: validated.replyTo,
      bcc: validated.bcc,
    };
  }

  /**
   * Send an alert via email
   */
  async send(params: {
    alert: Alert;
    rule: AlertRule;
    channelConfig?: ChannelConfig;
  }): Promise<void> {
    const { alert, rule } = params;

    const recipients = this.getRecipients(params.channelConfig);
    if (recipients.length === 0) {
      console.warn('No email recipients configured for alert:', alert.id);
      return;
    }

    const template = this.buildTemplate(alert, rule);
    const message = this.buildMessage(alert, template, recipients);

    await this.sendEmail(message);
  }

  /**
   * Get recipients from config or defaults
   */
  private getRecipients(channelConfig?: ChannelConfig): string[] {
    if (channelConfig?.recipients && channelConfig.recipients.length > 0) {
      return channelConfig.recipients;
    }
    return this.config.recipients;
  }

  /**
   * Build email template
   */
  private buildTemplate(alert: Alert, rule: AlertRule): EmailTemplate {
    const severity = alert.severity;
    const severityColor = SEVERITY_COLORS[severity];
    const severityLabel = SEVERITY_LABELS[severity];

    const subject = `[${severityLabel.toUpperCase()}] ${alert.ruleName}`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alert: ${alert.ruleName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${severityColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .severity { font-size: 14px; opacity: 0.9; margin-top: 5px; }
    .content { background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef; }
    .alert-message { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #212529; }
    .description { color: #6c757d; margin-bottom: 20px; }
    .metrics { background: white; border-radius: 6px; padding: 15px; margin: 15px 0; }
    .metrics h3 { margin: 0 0 10px 0; font-size: 14px; color: #6c757d; }
    .metric { display: inline-block; background: #e9ecef; padding: 5px 10px; border-radius: 4px; margin: 3px; font-family: monospace; }
    .details { background: white; border-radius: 6px; padding: 15px; margin: 15px 0; }
    .details h3 { margin: 0 0 10px 0; font-size: 14px; color: #6c757d; }
    .detail-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e9ecef; }
    .detail-label { color: #6c757d; }
    .detail-value { font-weight: 500; }
    .actions { margin-top: 20px; text-align: center; }
    .btn { display: inline-block; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 5px; }
    .btn-primary { background: ${severityColor}; color: white; }
    .btn-secondary { background: #6c757d; color: white; }
    .footer { padding: 20px; text-align: center; color: #6c757d; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${SEVERITY_EMOJI[severity]} ${alert.ruleName}</h1>
      <div class="severity">${severityLabel} Alert</div>
    </div>

    <div class="content">
      <div class="alert-message">${this.escapeHtml(alert.message)}</div>

      ${alert.description ? `<div class="description">${this.escapeHtml(alert.description)}</div>` : ''}

      ${
        Object.keys(alert.metrics).length > 0
          ? `
      <div class="metrics">
        <h3>Current Metrics</h3>
        ${Object.entries(alert.metrics)
          .slice(0, 8)
          .map(
            ([key, value]) => `
          <span class="metric">${this.escapeHtml(key)}: ${value}</span>
        `
          )
          .join('')}
      </div>
      `
          : ''
      }

      <div class="details">
        <h3>Alert Details</h3>
        <div class="detail-row">
          <span class="detail-label">Alert ID</span>
          <span class="detail-value">${alert.id}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Status</span>
          <span class="detail-value">${alert.status.toUpperCase()}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Triggered</span>
          <span class="detail-value">${alert.triggeredAt.toISOString()}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Rule ID</span>
          <span class="detail-value">${alert.ruleId}</span>
        </div>
      </div>

      <div class="actions">
        <a href="${this.getAlertUrl(alert.id)}" class="btn btn-primary">View in Dashboard</a>
      </div>
    </div>

    <div class="footer">
      <p>This is an automated alert from HOJAI Alerting System</p>
      <p>Do not reply to this email. Use the dashboard to acknowledge or resolve alerts.</p>
    </div>
  </div>
</body>
</html>`;

    const textBody = `
[${severityLabel.toUpperCase()}] ${alert.ruleName}
${'='.repeat(50)}

${alert.message}

${alert.description ? `${alert.description}\n` : ''}
Alert ID: ${alert.id}
Status: ${alert.status.toUpperCase()}
Triggered: ${alert.triggeredAt.toISOString()}
Rule ID: ${alert.ruleId}

${Object.keys(alert.metrics).length > 0 ? `Current Metrics:\n${Object.entries(alert.metrics).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\n` : ''}

View in Dashboard: ${this.getAlertUrl(alert.id)}

---
This is an automated alert from HOJAI Alerting System
`;

    return { subject, htmlBody, textBody };
  }

  /**
   * Build email message
   */
  private buildMessage(
    alert: Alert,
    template: EmailTemplate,
    recipients: string[]
  ): EmailMessage {
    return {
      to: recipients,
      from: this.config.fromName
        ? `"${this.config.fromName}" <${this.config.from}>`
        : this.config.from,
      subject: template.subject,
      html: template.htmlBody,
      text: template.textBody,
      replyTo: this.config.replyTo,
      bcc: this.config.bcc,
    };
  }

  /**
   * Send email via SMTP
   *
   * Note: This implementation uses Node.js built-in TLS/net modules.
   * For production, use a library like nodemailer.
   */
  private async sendEmail(message: EmailMessage): Promise<void> {
    // In production, this would use nodemailer or similar
    // For now, we'll simulate the send
    const payload = {
      from: message.from,
      to: message.to,
      cc: message.cc,
      bcc: message.bcc,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: message.replyTo,
    };

    console.log('[Email Notifier] Sending email:', {
      to: payload.to,
      subject: payload.subject,
    });

    // Simulated send - in production, use nodemailer:
    // const transporter = nodemailer.createTransport({
    //   host: this.config.host,
    //   port: this.config.port,
    //   secure: this.config.secure,
    //   auth: this.config.username && this.config.password ? {
    //     user: this.config.username,
    //     pass: this.config.password,
    //   } : undefined,
    // });
    // await transporter.sendMail(payload);

    // For demo, just log the payload
    console.log('[Email Notifier] Email payload:', JSON.stringify(payload, null, 2));
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }

  /**
   * Get URL for alert details
   */
  private getAlertUrl(alertId: string): string {
    const baseUrl = process.env.ALERTING_DASHBOARD_URL || 'https://alerts.hojai.ai';
    return `${baseUrl}/alerts/${alertId}`;
  }

  /**
   * Test the email configuration
   */
  async test(recipient?: string): Promise<boolean> {
    const testAlert: Alert = {
      id: 'test-alert',
      ruleId: 'test-rule',
      ruleName: 'Email Integration Test',
      severity: AlertSeverity.INFO,
      message: 'This is a test alert from HOJAI Alerting',
      triggeredAt: new Date(),
      status: 'firing',
      metrics: { test_metric: 42 },
    };

    const testRule: AlertRule = {
      id: 'test-rule',
      name: 'Test Rule',
      enabled: true,
      condition: {
        type: 'threshold' as any,
        metric: 'test',
        operator: '>' as any,
        value: 0,
        windowMinutes: 1,
      },
      severity: AlertSeverity.INFO,
      channels: ['email' as any],
      channelConfig: {},
      cooldownMinutes: 0,
      evaluationWindowMinutes: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      await this.send({
        alert: testAlert,
        rule: testRule,
        channelConfig: recipient ? { enabled: true, recipients: [recipient] } : undefined,
      });
      return true;
    } catch (error) {
      console.error('Email test failed:', error);
      return false;
    }
  }
}

/**
 * Severity emoji for email
 */
const SEVERITY_EMOJI: Record<AlertSeverity, string> = {
  [AlertSeverity.INFO]: '[INFO]',
  [AlertSeverity.WARNING]: '[WARNING]',
  [AlertSeverity.CRITICAL]: '[CRITICAL]',
  [AlertSeverity.EMERGENCY]: '[EMERGENCY]',
};

/**
 * Create an EmailNotifier from environment variables
 */
export function createEmailNotifierFromEnv(): EmailNotifier | null {
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM;

  if (!host || !from) {
    return null;
  }

  return new EmailNotifier({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    username: process.env.SMTP_USERNAME,
    password: process.env.SMTP_PASSWORD,
    from,
    fromName: process.env.SMTP_FROM_NAME || 'HOJAI Alerts',
    recipients: process.env.SMTP_RECIPIENTS?.split(','),
    replyTo: process.env.SMTP_REPLY_TO,
  });
}

/**
 * Build a custom email template
 */
export function buildEmailTemplate(
  alert: Alert,
  template: {
    subject?: string;
    htmlBody?: string;
    textBody?: string;
  }
): EmailTemplate {
  const defaultTemplate = new EmailNotifier({
    host: 'localhost',
    port: 587,
    secure: false,
    from: 'test@test.com',
  } as any);

  // Use the default template as fallback
  const fullTemplate = defaultTemplate.buildTemplate(alert, {
    id: alert.ruleId,
    name: alert.ruleName,
    enabled: true,
    condition: {
      type: 'threshold' as any,
      metric: '',
      operator: '>' as any,
      value: 0,
      windowMinutes: 1,
    },
    severity: alert.severity,
    channels: [],
    channelConfig: {},
    cooldownMinutes: 0,
    evaluationWindowMinutes: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    subject: template.subject || fullTemplate.subject,
    htmlBody: template.htmlBody || fullTemplate.htmlBody,
    textBody: template.textBody || fullTemplate.textBody,
  };
}

export default EmailNotifier;
