/**
 * Slack Integration - Sales alerts & notifications
 */

import axios from 'axios';

const SLACK_CONFIG = {
  webhook: process.env.SLACK_WEBHOOK_URL || '',
  botToken: process.env.SLACK_BOT_TOKEN || '',
  channel: process.env.SLACK_CHANNEL || '#sales-alerts',
};

export interface SlackMessage {
  channel?: string;
  text: string;
  blocks?: any[];
  attachments?: any[];
}

export interface SalesAlert {
  type: 'lead_created' | 'deal_won' | 'deal_lost' | 'churn_risk' | 'high_intent' | 'meeting_scheduled';
  leadId: string;
  leadName: string;
  company: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: Record<string, any>;
}

export class SlackClient {
  private client = axios.create({
    baseURL: 'https://slack.com/api',
    headers: { Authorization: `Bearer ${SLACK_CONFIG.botToken}` },
    timeout: 5000,
  });

  /**
   * Send sales alert to Slack channel
   */
  async sendAlert(alert: SalesAlert): Promise<boolean> {
    try {
      const message = this.formatAlert(alert);

      if (SLACK_CONFIG.webhook) {
        await axios.post(SLACK_CONFIG.webhook, message);
        return true;
      }

      await this.client.post('/chat.postMessage', {
        channel: SLACK_CONFIG.channel,
        ...message,
      });
      return true;
    } catch (error) {
      console.error('Slack alert failed:', error);
      return false;
    }
  }

  /**
   * Send direct message to user
   */
  async sendDM(userId: string, message: string): Promise<boolean> {
    try {
      await this.client.post('/chat.postMessage', {
        channel: userId,
        text: message,
      });
      return true;
    } catch (error) {
      console.error('Slack DM failed:', error);
      return false;
    }
  }

  /**
   * Create a Slack channel for a deal
   */
  async createDealChannel(dealId: string, dealTitle: string): Promise<string | null> {
    try {
      const response = await this.client.post('/conversations.create', {
        name: `deal-${dealId.slice(0, 8)}`,
        topic: `Deal: ${dealTitle}`,
      });
      return response.data.channel?.id;
    } catch (error) {
      console.error('Channel creation failed:', error);
      return null;
    }
  }

  /**
   * Invite users to a channel
   */
  async inviteToChannel(channelId: string, userIds: string[]): Promise<boolean> {
    try {
      await this.client.post('/conversations.invite', {
        channel: channelId,
        users: userIds.join(','),
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Schedule a message
   */
  async scheduleMessage(channel: string, text: string, postAt: Date): Promise<boolean> {
    try {
      const unixTime = Math.floor(postAt.getTime() / 1000);
      await this.client.post('/chat.scheduleMessage', {
        channel,
        text,
        post_at: unixTime,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  private formatAlert(alert: SalesAlert): any {
    const emoji = {
      lead_created: '🎯',
      deal_won: '🎉',
      deal_lost: '😔',
      churn_risk: '⚠️',
      high_intent: '🔥',
      meeting_scheduled: '📅',
    }[alert.type];

    const color = {
      low: '#36a64f',
      medium: '#f2c744',
      high: '#ff9800',
      urgent: '#f44336',
    }[alert.priority];

    return {
      text: `${emoji} ${alert.message}`,
      attachments: [
        {
          color,
          fields: [
            { title: 'Lead', value: alert.leadName, short: true },
            { title: 'Company', value: alert.company, short: true },
            { title: 'Priority', value: alert.priority.toUpperCase(), short: true },
          ],
        },
      ],
    };
  }
}
