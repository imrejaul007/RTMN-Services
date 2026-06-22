/**
 * Slack Notifier for Alerting
 *
 * Sends alerts to Slack channels with rich formatting.
 *
 * @module hojai-alerting/notifiers/slack
 */

import { z } from 'zod';
import type { Alert, AlertRule, AlertSeverity, ChannelConfig, Notifier } from '../index';

// ============================================================================
// Types
// ============================================================================

/**
 * Slack notifier configuration
 */
export interface SlackNotifierConfig {
  /** Slack webhook URL */
  webhookUrl: string;
  /** Default channel for alerts */
  defaultChannel?: string;
  /** Bot name displayed in Slack */
  botName?: string;
  /** Bot icon emoji */
  botIcon?: string;
  /** Enable unfurl links */
  unfurlLinks?: boolean;
  /** Enable link unfurling */
  linkUnfurl?: boolean;
}

/**
 * Slack message block types
 */
export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text?: string;
    emoji?: boolean;
    verbatim?: boolean;
  };
  elements?: Array<{
    type: string;
    text?: string;
    url?: string;
    action_id?: string;
  }>;
  accessory?: {
    type: string;
    image_url?: string;
    alt_text?: string;
  };
}

/**
 * Slack message attachment
 */
export interface SlackAttachment {
  color?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: Array<{
    title: string;
    value: string;
    short?: boolean;
  }>;
  footer?: string;
  ts?: number;
  thumb_url?: string;
}

// ============================================================================
// Schemas
// ============================================================================

/**
 * Schema for Slack notifier configuration
 */
export const SlackConfigSchema = z.object({
  webhookUrl: z.string().url('Invalid Slack webhook URL'),
  defaultChannel: z.string().optional(),
  botName: z.string().default('HOJAI Alerts'),
  botIcon: z.string().default(':robot_face:'),
  unfurlLinks: z.boolean().default(false),
  linkUnfurl: z.boolean().default(false),
});

// ============================================================================
// Severity Colors and Icons
// ============================================================================

/**
 * Slack attachment colors by severity
 */
export const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  [AlertSeverity.INFO]: '#17A2B8',     // Blue
  [AlertSeverity.WARNING]: '#FFC107',  // Yellow
  [AlertSeverity.CRITICAL]: '#DC3545', // Red
  [AlertSeverity.EMERGENCY]: '#8B0000', // Dark Red
};

/**
 * Severity emoji mapping
 */
export const SEVERITY_EMOJI: Record<AlertSeverity, string> = {
  [AlertSeverity.INFO]: ':information_source:',
  [AlertSeverity.WARNING]: ':warning:',
  [AlertSeverity.CRITICAL]: ':red_circle:',
  [AlertSeverity.EMERGENCY]: ':fire:',
};

// ============================================================================
// Slack Notifier
// ============================================================================

/**
 * Slack Notifier
 *
 * Sends formatted alert messages to Slack channels.
 *
 * @example
 * ```typescript
 * import { SlackNotifier } from '@hojai/alerting';
 *
 * const slack = new SlackNotifier({
 *   webhookUrl: process.env.SLACK_WEBHOOK_URL!,
 *   botName: 'HOJAI Alerts',
 *   defaultChannel: '#alerts',
 * });
 *
 * alertManager.registerNotifier('slack', slack);
 * ```
 */
export class SlackNotifier implements Notifier {
  private config: Required<SlackNotifierConfig>;

  constructor(config: SlackNotifierConfig) {
    const validated = SlackConfigSchema.parse(config);
    this.config = {
      webhookUrl: validated.webhookUrl,
      defaultChannel: validated.defaultChannel || '#alerts',
      botName: validated.botName,
      botIcon: validated.botIcon,
      unfurlLinks: validated.unfurlLinks,
      linkUnfurl: validated.linkUnfurl,
    };
  }

  /**
   * Send an alert to Slack
   */
  async send(params: {
    alert: Alert;
    rule: AlertRule;
    channelConfig?: ChannelConfig;
  }): Promise<void> {
    const { alert, rule } = params;
    const channelId = params.channelConfig?.channelId || this.config.defaultChannel;

    const payload = this.buildPayload(alert, rule, channelId);

    const response = await fetch(this.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Slack webhook failed: ${response.status} - ${text}`);
    }
  }

  /**
   * Build Slack message payload
   */
  private buildPayload(
    alert: Alert,
    rule: AlertRule,
    channelId?: string
  ): Record<string, unknown> {
    const severity = this.getSeverityOverride(alert, rule);

    const payload: Record<string, unknown> = {
      username: this.config.botName,
      icon_emoji: this.config.botIcon,
      unfurl_links: this.config.unfurlLinks,
      link_names: this.config.linkUnfurl,
      attachments: [this.buildAttachment(alert, severity)],
      blocks: this.buildBlocks(alert, rule, severity),
    };

    if (channelId && channelId.startsWith('#')) {
      payload.channel = channelId;
    }

    return payload;
  }

  /**
   * Build message blocks
   */
  private buildBlocks(
    alert: Alert,
    rule: AlertRule,
    severity: AlertSeverity
  ): SlackBlock[] {
    const blocks: SlackBlock[] = [];

    // Header with severity emoji
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${SEVERITY_EMOJI[severity]} ${alert.ruleName}`,
        emoji: true,
      },
    });

    // Alert message
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${alert.message}*`,
        verbatim: true,
      },
    });

    // Description if available
    if (alert.description) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: alert.description,
          verbatim: true,
        },
      });
    }

    // Divider
    blocks.push({
      type: 'divider',
    });

    // Context with metrics
    const metricText = Object.entries(alert.metrics)
      .slice(0, 5)
      .map(([key, value]) => `\`${key}\`: ${value}`)
      .join('  |  ');

    if (metricText) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*Metrics*: ${metricText}`,
          },
        ],
      });
    }

    // Triggered timestamp
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Triggered: <!date^${Math.floor(alert.triggeredAt.getTime() / 1000)}^{date_num} {time}|${alert.triggeredAt.toISOString()}>  |  Status: ${alert.status.toUpperCase()}`,
        },
      ],
    });

    // Action buttons
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Acknowledge',
            emoji: true,
          },
          action_id: `acknowledge_${alert.id}`,
          style: 'primary',
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Details',
            emoji: true,
          },
          action_id: `view_${alert.id}`,
          url: this.getAlertUrl(alert.id),
        },
      ],
    });

    return blocks;
  }

  /**
   * Build attachment for fallback
   */
  private buildAttachment(
    alert: Alert,
    severity: AlertSeverity
  ): SlackAttachment {
    const fields = [
      {
        title: 'Severity',
        value: severity.toUpperCase(),
        short: true,
      },
      {
        title: 'Status',
        value: alert.status.toUpperCase(),
        short: true,
      },
      {
        title: 'Triggered',
        value: alert.triggeredAt.toISOString(),
        short: true,
      },
      {
        title: 'Alert ID',
        value: alert.id,
        short: true,
      },
    ];

    // Add relevant metrics as fields
    const relevantMetrics = Object.entries(alert.metrics)
      .slice(0, 4)
      .map(([key, value]) => ({
        title: key,
        value: String(value),
        short: true,
      }));

    return {
      color: SEVERITY_COLORS[severity],
      title: alert.ruleName,
      text: alert.message,
      fields: [...fields, ...relevantMetrics],
      footer: 'HOJAI Alerting',
      ts: Math.floor(alert.triggeredAt.getTime() / 1000),
    };
  }

  /**
   * Get severity with channel override
   */
  private getSeverityOverride(alert: Alert, rule: AlertRule): AlertSeverity {
    const channelConfig = rule.channelConfig?.[
      'slack' as keyof typeof rule.channelConfig
    ] as ChannelConfig | undefined;

    return channelConfig?.severityOverride || alert.severity;
  }

  /**
   * Get URL for alert details (placeholder - would be actual dashboard URL)
   */
  private getAlertUrl(alertId: string): string {
    const baseUrl = process.env.ALERTING_DASHBOARD_URL || 'https://alerts.hojai.ai';
    return `${baseUrl}/alerts/${alertId}`;
  }

  /**
   * Test the Slack connection
   */
  async test(channel?: string): Promise<boolean> {
    const testAlert: Alert = {
      id: 'test-alert',
      ruleId: 'test-rule',
      ruleName: 'Slack Integration Test',
      severity: AlertSeverity.INFO,
      message: 'This is a test message from HOJAI Alerting',
      triggeredAt: new Date(),
      status: 'firing',
      metrics: {},
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
      channels: ['slack' as any],
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
        channelConfig: channel ? { enabled: true, channelId: channel } : undefined,
      });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Build a Slack notification from a template
 */
export function buildSlackMessage(
  alert: Alert,
  template?: string
): Record<string, unknown> {
  if (!template) {
    return {
      text: `${SEVERITY_EMOJI[alert.severity]} ${alert.ruleName}: ${alert.message}`,
    };
  }

  // Simple template replacement
  return {
    text: template
      .replace('{{severity}}', alert.severity)
      .replace('{{ruleName}}', alert.ruleName)
      .replace('{{message}}', alert.message)
      .replace('{{status}}', alert.status)
      .replace('{{alertId}}', alert.id)
      .replace('{{triggeredAt}}', alert.triggeredAt.toISOString()),
  };
}

/**
 * Create a SlackNotifier from environment variables
 */
export function createSlackNotifierFromEnv(): SlackNotifier | null {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    return null;
  }

  return new SlackNotifier({
    webhookUrl,
    defaultChannel: process.env.SLACK_DEFAULT_CHANNEL,
    botName: process.env.SLACK_BOT_NAME || 'HOJAI Alerts',
    botIcon: process.env.SLACK_BOT_ICON || ':robot_face:',
  });
}

export default SlackNotifier;
