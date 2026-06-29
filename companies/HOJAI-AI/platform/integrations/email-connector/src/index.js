/**
 * HOJAI Email Integration
 * SendGrid + SMTP for transactional emails
 */

const axios = require('axios');

// Email providers
const PROVIDERS = {
  sendgrid: 'https://api.sendgrid.com/v3',
  smtp: null,
};

class EmailClient {
  constructor(config) {
    this.provider = config.provider || 'sendgrid';
    this.apiKey = config.apiKey;
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName || 'HOJAI';
    this.replyTo = config.replyTo;

    if (this.provider === 'sendgrid') {
      this.baseUrl = PROVIDERS.sendgrid;
    }
  }

  // Send email
  async send({ to, subject, html, text, template, templateData, attachments, replyTo, from }) {
    if (this.provider === 'sendgrid') {
      return this.sendSendGrid({ to, subject, html, text, template, templateData, attachments, replyTo, from });
    }
    throw new Error(`Provider ${this.provider} not implemented`);
  }

  async sendSendGrid({ to, subject, html, text, template, templateData, attachments, replyTo, from }) {
    const data = {
      personalizations: Array.isArray(to) ? to.map(email => ({ to: [{ email }])) : [{ to: [{ email: to }],
      from: { email: from || this.fromEmail, name: this.fromName },
      subject,
    };

    if (template) {
      data.template_id = template;
      if (templateData) {
        data.personalizations[0].dynamic_template_data = templateData;
      }
    } else {
      data.content = [
        { type: 'text/plain', value: text || '' },
        { type: 'text/html', value: html || text || '' },
      ];
    }

    if (replyTo || this.replyTo) {
      data.reply_to = { email: replyTo || this.replyTo };
    }

    if (attachments) {
      data.attachments = attachments.map(a => ({
        content: Buffer.from(a.content).toString('base64'),
        filename: a.filename,
        type: a.type,
        disposition: 'attachment',
      }));
    }

    const response = await axios.post(`${this.baseUrl}/mail/send`, data, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    return { messageId: response.headers['x-message-id'] };
  }

  // Batch send (for campaigns)
  async batchSend(campaign) {
    const { name, subject, html, list, templateId } = campaign;

    // Process in batches of 1000
    const BATCH_SIZE = 1000;
    const results = [];

    for (let i = 0; i < list.length; i += BATCH_SIZE) {
      const batch = list.slice(i, i + BATCH_SIZE);
      const result = await this.send({
        to: batch.map(e => e.email),
        subject,
        html,
        template: templateId,
        templateData: { firstName: '{{firstName}}' },
      });
      results.push(result);
    }

    return { batches: results.length, contacts: list.length };
  }

  // Parse incoming email webhook
  parseWebhook(payload) {
    const { from, subject, text, html, attachments } = payload;

    return {
      from: from[0].email,
      fromName: from[0].name,
      subject,
      text: text || '',
      html: html || '',
      attachments: attachments.map(a => ({
        filename: a.filename,
        type: a.type,
        content: a.content,
      })),
      headers: payload.headers,
      timestamp: new Date(payload.timestamp),
    };
  }

  // Build templates
  buildTemplate(template) {
    const templates = {
      'welcome': {
        subject: 'Welcome to {{company}}!',
        html: `<h1>Hi {{firstName}},</h1>
<p>Welcome to {{company}}! We're excited to have you.</p>
<p>Get started: <a href="{{link}}">Click here</a></p>
<p>- The {{company}} Team</p>`,
      },

      'lead-nurture': {
        subject: '{{subject}}',
        html: `<h2>Hi {{firstName}},</h2>
<p>{{message}}</p>
<p>Best,<br>{{senderName}}</p>`,
      },

      'support-ticket': {
        subject: 'Support Ticket #{{ticketId}} - {{status}}',
        html: `<h2>Hi {{customerName}},</h2>
<p>Your ticket <strong>#{{ticketId}}</strong> is now <strong>{{status}}</strong>.</p>
<p>{{response}}</p>
<p>- Support Team</p>`,
      },

      'invoice': {
        subject: 'Invoice #{{invoiceNumber}} - {{amount}}',
        html: `<h2>Invoice {{invoiceNumber}}</h2>
<p>Date: {{date}}</p>
<p>Amount: {{amount}}</p>
<p>Due: {{dueDate}}</p>
<p>Thank you!</p>`,
      },

      'meeting-reminder': {
        subject: 'Reminder: {{title}} in {{time}}',
        html: `<h2>Meeting Reminder</h2>
<p><strong>{{title}}</strong></p>
<p>Time: {{time}}</p>
<p>Join: <a href="{{link}}">{{link}}</a></p>`,
      },

      'weekly-digest': {
        subject: 'Your {{company}} Weekly Digest',
        html: `<h2>Weekly Digest</h2>
{{#each items}}
<h3>{{title}}</h3>
<p>{{summary}}</p>
{{/each}}`,
      },
    };

    return templates[template] || templates['lead-nurture'];
  }
}

module.exports = EmailClient;
