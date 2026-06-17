/**
 * Slack Integration - Sales alerts & notifications
 * FIXED: alert object validation, default priority
 */
import axios from 'axios';

const SLACK_CONFIG = {
    webhook: process.env.SLACK_WEBHOOK_URL || '',
    botToken: process.env.SLACK_BOT_TOKEN || '',
    channel: process.env.SLACK_CHANNEL || '#sales-alerts',
};

export class SlackClient {
    private client = axios.create({
        baseURL: 'https://slack.com/api',
        headers: { Authorization: `Bearer ${SLACK_CONFIG.botToken}` },
        timeout: 5000,
    });

    async sendAlert(alert: unknown): Promise<boolean> {
        try {
            if (!alert || typeof alert !== 'object' || Array.isArray(alert)) {
                console.error('Slack alert failed: invalid alert object');
                return false;
            }
            const safeAlert = this.formatAlert(alert as Record<string, unknown>);
            if (SLACK_CONFIG.webhook) {
                await axios.post(SLACK_CONFIG.webhook, safeAlert);
                return true;
            }
            if (SLACK_CONFIG.botToken) {
                await this.client.post('/chat.postMessage', { channel: SLACK_CONFIG.channel, ...safeAlert });
                return true;
            }
            console.warn('Slack not configured: no webhook or bot token');
            return false;
        } catch (error) {
            console.error('Slack alert failed:', error);
            return false;
        }
    }

    async sendDM(userId: string, message: string): Promise<boolean> {
        try {
            if (!SLACK_CONFIG.botToken) return false;
            await this.client.post('/chat.postMessage', { channel: userId, text: message });
            return true;
        } catch { return false; }
    }

    async createDealChannel(dealId: string, dealTitle: string): Promise<string | null> {
        try {
            if (!SLACK_CONFIG.botToken) return null;
            const response = await this.client.post('/conversations.create', {
                name: `deal-${String(dealId).slice(0, 8)}`,
                topic: `Deal: ${dealTitle}`,
            });
            return response.data.channel?.id || null;
        } catch { return null; }
    }

    async inviteToChannel(channelId: string, userIds: string[]): Promise<boolean> {
        try {
            if (!SLACK_CONFIG.botToken) return false;
            await this.client.post('/conversations.invite', { channel: channelId, users: userIds.join(',') });
            return true;
        } catch { return false; }
    }

    async scheduleMessage(channel: string, text: string, postAt: Date): Promise<boolean> {
        try {
            if (!SLACK_CONFIG.botToken) return false;
            const unixTime = Math.floor(postAt.getTime() / 1000);
            await this.client.post('/chat.scheduleMessage', { channel, text, post_at: unixTime });
            return true;
        } catch { return false; }
    }

    private formatAlert(alert: Record<string, unknown>) {
        const typeEmoji: Record<string, string> = {
            lead_created: '🎯', deal_won: '🎉', deal_lost: '😔', churn_risk: '⚠️', high_intent: '🔥', meeting_scheduled: '📅',
        };
        const priorityColor: Record<string, string> = { low: '#36a64f', medium: '#f2c744', high: '#ff9800', urgent: '#f44336' };
        const emoji = typeEmoji[String(alert.type || '')] || '📢';
        const priority = String(alert.priority || 'medium').toLowerCase();
        const color = priorityColor[priority] || priorityColor['medium'];
        const message = String(alert.message || 'Sales update');
        const leadName = String(alert.leadName || 'N/A');
        const company = String(alert.company || 'N/A');
        return {
            text: `${emoji} ${message}`,
            attachments: [{ color, fields: [
                { title: 'Lead', value: leadName, short: true },
                { title: 'Company', value: company, short: true },
                { title: 'Priority', value: priority.toUpperCase(), short: true },
            ]}],
        };
    }
}
