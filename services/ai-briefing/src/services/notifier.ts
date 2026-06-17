import {
  Briefing,
  DeliveryStatus,
  NotificationChannel,
  EmailPayload,
  WhatsAppPayload,
  SlackPayload,
  SlackBlock,
  SlackAttachment
} from '../types';

export class Notifier {
  private emailConfigured: boolean;
  private whatsappConfigured: boolean;
  private slackConfigured: boolean;

  constructor() {
    this.emailConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER);
    this.whatsappConfigured = !!(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN);
    this.slackConfigured = !!(process.env.SLACK_WEBHOOK_URL || process.env.SLACK_BOT_TOKEN);
  }

  async sendBriefing(
    briefing: Briefing,
    channels: ('email' | 'whatsapp' | 'slack')[],
    recipients?: {
      emails?: string[];
      phones?: string[];
      slackChannels?: string[];
    }
  ): Promise<DeliveryStatus[]> {
    const results: DeliveryStatus[] = [];

    for (const channel of channels) {
      const status: DeliveryStatus = {
        channel,
        status: 'pending'
      };

      try {
        switch (channel) {
          case 'email':
            await this.sendEmail(briefing, recipients?.emails);
            break;
          case 'whatsapp':
            await this.sendWhatsApp(briefing, recipients?.phones);
            break;
          case 'slack':
            await this.sendSlack(briefing, recipients?.slackChannels);
            break;
        }

        status.status = 'sent';
        status.sentAt = new Date();
        status.deliveredAt = new Date();

      } catch (error) {
        status.status = 'failed';
        status.error = error instanceof Error ? error.message : 'Unknown error';
      }

      results.push(status);
    }

    return results;
  }

  async sendTest(
    channel: 'email' | 'whatsapp' | 'slack',
    message: string,
    tenantId: string
  ): Promise<void> {
    switch (channel) {
      case 'email':
        await this.sendTestEmail(message, tenantId);
        break;
      case 'whatsapp':
        await this.sendTestWhatsApp(message, tenantId);
        break;
      case 'slack':
        await this.sendTestSlack(message, tenantId);
        break;
    }
  }

  private async sendEmail(briefing: Briefing, recipients?: string[]): Promise<void> {
    if (!this.emailConfigured) {
      console.log('Email not configured, skipping email notification');
      console.log('Would send email with:', {
        to: recipients || ['executive@example.com'],
        subject: briefing.summary.headline
      });
      return;
    }

    const payload: EmailPayload = {
      to: recipients || ['executive@example.com'],
      subject: briefing.summary.headline,
      html: this.generateEmailHtml(briefing),
      text: this.generateEmailText(briefing)
    };

    // In production, integrate with actual email service (SendGrid, Resend, etc.)
    console.log('Sending email:', payload);
  }

  private async sendTestEmail(message: string, tenantId: string): Promise<void> {
    if (!this.emailConfigured) {
      console.log('Email not configured, test notification logged');
      console.log(`Test email for tenant ${tenantId}:`, message);
      return;
    }

    console.log('Sending test email:', {
      to: 'test@example.com',
      subject: 'AI Briefing Service - Test Notification',
      message
    });
  }

  private async sendWhatsApp(briefing: Briefing, phones?: string[]): Promise<void> {
    if (!this.whatsappConfigured) {
      console.log('WhatsApp not configured, skipping WhatsApp notification');
      console.log('Would send WhatsApp with:', {
        to: phones || ['+1234567890'],
        preview: briefing.summary.headline
      });
      return;
    }

    const payload: WhatsAppPayload = {
      to: phones || ['+1234567890'],
      message: this.generateWhatsAppMessage(briefing),
      priority: briefing.riskAnalysis.riskLevel === 'critical' ? 'high' : 'normal'
    };

    // In production, integrate with WhatsApp Business API
    console.log('Sending WhatsApp:', payload);
  }

  private async sendTestWhatsApp(message: string, tenantId: string): Promise<void> {
    if (!this.whatsappConfigured) {
      console.log('WhatsApp not configured, test notification logged');
      console.log(`Test WhatsApp for tenant ${tenantId}:`, message);
      return;
    }

    console.log('Sending test WhatsApp:', {
      to: '+1234567890',
      message
    });
  }

  private async sendSlack(briefing: Briefing, channels?: string[]): Promise<void> {
    if (!this.slackConfigured) {
      console.log('Slack not configured, skipping Slack notification');
      console.log('Would send Slack to:', channels || ['#executives']);
      return;
    }

    const payload: SlackPayload = {
      channel: channels?.[0] || '#executives',
      text: briefing.summary.headline,
      blocks: this.generateSlackBlocks(briefing),
      attachments: this.generateSlackAttachments(briefing)
    };

    // In production, use Slack Webhook or API
    if (process.env.SLACK_WEBHOOK_URL) {
      const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.statusText}`);
      }
    } else {
      console.log('Sending Slack message:', payload);
    }
  }

  private async sendTestSlack(message: string, tenantId: string): Promise<void> {
    if (!this.slackConfigured) {
      console.log('Slack not configured, test notification logged');
      console.log(`Test Slack for tenant ${tenantId}:`, message);
      return;
    }

    const payload = {
      channel: '#test',
      text: `Test notification for tenant ${tenantId}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Test Notification*\n${message}`
          }
        }
      ]
    };

    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
  }

  private generateEmailHtml(briefing: Briefing): string {
    const riskColor = this.getRiskColor(briefing.riskAnalysis.riskLevel);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: #1a1a2e; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .date { font-size: 14px; opacity: 0.8; }
    .section { padding: 20px; border: 1px solid #ddd; border-top: none; }
    .section h2 { color: #1a1a2e; border-bottom: 2px solid #4361ee; padding-bottom: 10px; }
    .risk-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; color: white; font-weight: bold; }
    .highlight { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0; }
    .metrics { display: flex; gap: 20px; flex-wrap: wrap; }
    .metric { background: #e9ecef; padding: 15px; border-radius: 8px; min-width: 150px; }
    .metric-value { font-size: 24px; font-weight: bold; color: #1a1a2e; }
    .metric-label { font-size: 12px; color: #666; }
    .recommendation { background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 10px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Daily Executive Briefing</h1>
      <div class="date">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>

    <div class="section">
      <h2>Executive Summary</h2>
      <p><strong>${briefing.summary.headline}</strong></p>
      <p>${briefing.summary.executiveSummary}</p>

      <div class="highlight">
        <strong>Risk Level:</strong>
        <span class="risk-badge" style="background-color: ${riskColor}">
          ${briefing.riskAnalysis.riskLevel.toUpperCase()}
        </span>
        <span style="margin-left: 10px;">Score: ${briefing.riskAnalysis.overallRiskScore}/100</span>
      </div>
    </div>

    <div class="section">
      <h2>Key Highlights</h2>
      <ul>
        ${briefing.summary.keyHighlights.map(h => `<li>${h}</li>`).join('')}
      </ul>
    </div>

    <div class="section">
      <h2>Business Metrics</h2>
      <div class="metrics">
        <div class="metric">
          <div class="metric-value">$${(briefing.metrics.revenue.value / 1000).toFixed(0)}K</div>
          <div class="metric-label">Revenue ${briefing.metrics.revenue.change > 0 ? '+' : ''}${briefing.metrics.revenue.change}%</div>
        </div>
        <div class="metric">
          <div class="metric-value">${briefing.metrics.customers.value.toLocaleString()}</div>
          <div class="metric-label">Customers ${briefing.metrics.customers.change > 0 ? '+' : ''}${briefing.metrics.customers.change}%</div>
        </div>
        <div class="metric">
          <div class="metric-value">${briefing.metrics.operations.value}%</div>
          <div class="metric-label">Operational Efficiency</div>
        </div>
      </div>
    </div>

    ${briefing.recommendations.length > 0 ? `
    <div class="section">
      <h2>AI Recommendations</h2>
      ${briefing.recommendations.slice(0, 3).map(rec => `
        <div class="recommendation">
          <strong>${rec.title}</strong>
          <p>${rec.description}</p>
          <small>Priority: ${rec.priority.toUpperCase()} | Expected Impact: ${rec.expectedImpact}</small>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${briefing.alerts.length > 0 && briefing.alerts[0].critical > 0 ? `
    <div class="section" style="border-color: #dc3545;">
      <h2 style="color: #dc3545;">Alerts</h2>
      <p><strong>${briefing.alerts[0].critical} Critical</strong> and <strong>${briefing.alerts[0].warnings} Warning</strong> alerts require attention.</p>
    </div>
    ` : ''}

    <div class="footer">
      <p>AI Briefing Service | Generated at ${new Date().toLocaleTimeString()}</p>
      <p>Confidence: ${(briefing.metadata.confidence * 100).toFixed(0)}% | Processing time: ${briefing.metadata.processingTime}ms</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  private generateEmailText(briefing: Briefing): string {
    return `
DAILY EXECUTIVE BRIEFING
${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

HEADLINE
${briefing.summary.headline}

EXECUTIVE SUMMARY
${briefing.summary.executiveSummary}

RISK LEVEL: ${briefing.riskAnalysis.riskLevel.toUpperCase()} (${briefing.riskAnalysis.overallRiskScore}/100)

KEY HIGHLIGHTS
${briefing.summary.keyHighlights.map(h => `- ${h}`).join('\n')}

BUSINESS METRICS
- Revenue: $${(briefing.metrics.revenue.value / 1000).toFixed(0)}K (${briefing.metrics.revenue.change > 0 ? '+' : ''}${briefing.metrics.revenue.change}%)
- Customers: ${briefing.metrics.customers.value.toLocaleString()} (${briefing.metrics.customers.change > 0 ? '+' : ''}${briefing.metrics.customers.change}%)
- Operational Efficiency: ${briefing.metrics.operations.value}%

${briefing.recommendations.length > 0 ? 'TOP RECOMMENDATIONS\n' + briefing.recommendations.slice(0, 3).map(rec => `
[${rec.priority.toUpperCase()}] ${rec.title}
${rec.description}
Expected Impact: ${rec.expectedImpact}
`).join('\n') : ''}

${briefing.alerts.length > 0 && briefing.alerts[0].critical > 0 ? `
ALERTS
${briefing.alerts[0].critical} Critical | ${briefing.alerts[0].warnings} Warning
` : ''}

---
AI Briefing Service | Confidence: ${(briefing.metadata.confidence * 100).toFixed(0)}%
    `.trim();
  }

  private generateWhatsAppMessage(briefing: Briefing): string {
    const riskEmoji = briefing.riskAnalysis.riskLevel === 'critical' ? '🔴' :
                      briefing.riskAnalysis.riskLevel === 'high' ? '🟠' :
                      briefing.riskAnalysis.riskLevel === 'medium' ? '🟡' : '🟢';

    let message = `*Daily Briefing - ${new Date().toLocaleDateString()}*\n\n`;
    message += `${riskEmoji} Risk: ${briefing.riskAnalysis.riskLevel.toUpperCase()}\n\n`;
    message += `*${briefing.summary.headline}*\n\n`;

    if (briefing.summary.keyHighlights.length > 0) {
      message += `Highlights:\n`;
      briefing.summary.keyHighlights.slice(0, 3).forEach(h => {
        message += `• ${h}\n`;
      });
    }

    message += `\nRevenue: $${(briefing.metrics.revenue.value / 1000).toFixed(0)}K `;
    message += `(${briefing.metrics.revenue.change > 0 ? '+' : ''}${briefing.metrics.revenue.change}%)\n`;

    if (briefing.recommendations.length > 0) {
      message += `\nTop Action: ${briefing.recommendations[0].title}`;
    }

    return message;
  }

  private generateSlackBlocks(briefing: Briefing): SlackBlock[] {
    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `Daily Briefing - ${new Date().toLocaleDateString()}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${briefing.summary.headline}*`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: this.getRiskBadgeSlack(briefing.riskAnalysis.riskLevel, briefing.riskAnalysis.overallRiskScore)
        }
      }
    ];

    // Key highlights
    if (briefing.summary.keyHighlights.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Highlights*\n${briefing.summary.keyHighlights.slice(0, 3).map(h => `• ${h}`).join('\n')}`
        }
      });
    }

    // Metrics
    blocks.push({
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Revenue*\n$${(briefing.metrics.revenue.value / 1000).toFixed(0)}K (${briefing.metrics.revenue.change > 0 ? '+' : ''}${briefing.metrics.revenue.change}%)`
        },
        {
          type: 'mrkdwn',
          text: `*Customers*\n${briefing.metrics.customers.value.toLocaleString()} (${briefing.metrics.customers.change > 0 ? '+' : ''}${briefing.metrics.customers.change}%)`
        }
      ]
    });

    // Recommendations
    if (briefing.recommendations.length > 0) {
      blocks.push({
        type: 'divider'
      });
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Top Recommendation*\n${briefing.recommendations[0].title}\n${briefing.recommendations[0].description.substring(0, 150)}...`
        }
      });
    }

    // Footer
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Generated by AI Briefing Service | Confidence: ${(briefing.metadata.confidence * 100).toFixed(0)}%`
        }
      ]
    });

    return blocks;
  }

  private generateSlackAttachments(briefing: Briefing): SlackAttachment[] {
    const attachments: SlackAttachment[] = [];

    if (briefing.alerts.length > 0 && (briefing.alerts[0].critical > 0 || briefing.alerts[0].warnings > 0)) {
      attachments.push({
        color: '#dc3545',
        title: 'Alerts Require Attention',
        text: `${briefing.alerts[0].critical} Critical | ${briefing.alerts[0].warnings} Warnings`,
        fields: Object.entries(briefing.alerts[0].byCategory).map(([category, count]) => ({
          title: category,
          value: count.toString(),
          short: true
        }))
      });
    }

    return attachments;
  }

  private getRiskColor(level: string): string {
    const colors: Record<string, string> = {
      critical: '#dc3545',
      high: '#fd7e14',
      medium: '#ffc107',
      low: '#28a745'
    };
    return colors[level] || '#6c757d';
  }

  private getRiskBadgeSlack(level: string, score: number): string {
    const emoji = level === 'critical' ? ':red_circle:' :
                  level === 'high' ? ':orange_circle:' :
                  level === 'medium' ? ':yellow_circle:' : ':green_circle:';
    return `${emoji} *Risk Level:* ${level.toUpperCase()} (${score}/100)`;
  }
}
