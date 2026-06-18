/**
 * RAZO Channel Bridge
 * Multi-channel messaging: WhatsApp, Telegram, SMS, Email
 */

const axios = require('axios');

class ChannelBridge {
  constructor(logger) {
    this.logger = logger;
    this.channels = {
      whatsapp: this.initWhatsApp(),
      telegram: this.initTelegram(),
      sms: this.initSMS(),
      email: this.initEmail()
    };
    this.messageQueue = [];
  }

  async initWhatsApp() {
    // WhatsApp Business API integration
    return {
      enabled: !!process.env.WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
      apiVersion: 'v18.0'
    };
  }

  async initTelegram() {
    return {
      enabled: !!process.env.TELEGRAM_BOT_TOKEN,
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      apiUrl: 'https://api.telegram.org'
    };
  }

  async initSMS() {
    return {
      enabled: !!process.env.SMS_API_KEY,
      provider: process.env.SMS_PROVIDER || 'twilio',
      apiKey: process.env.SMS_API_KEY,
      senderId: process.env.SMS_SENDER_ID
    };
  }

  async initEmail() {
    return {
      enabled: !!process.env.SMTP_HOST,
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    };
  }

  /**
   * Send message via specified channel
   */
  async sendMessage({ channel, to, message, options = {} }) {
    this.logger.info(`Sending message via ${channel}`, { to: to.substring(0, 10) + '...' });

    try {
      switch (channel.toLowerCase()) {
        case 'whatsapp':
          return await this.sendWhatsApp(to, message, options);
        case 'telegram':
          return await this.sendTelegram(to, message, options);
        case 'sms':
          return await this.sendSMS(to, message);
        case 'email':
          return await this.sendEmail(to, message, options);
        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send ${channel} message`, { error: error.message });
      throw error;
    }
  }

  /**
   * Send WhatsApp message via Meta Business API
   */
  async sendWhatsApp(phoneNumber, message, options = {}) {
    if (!this.channels.whatsapp.enabled) {
      throw new Error('WhatsApp not configured');
    }

    const url = `https://graph.facebook.com/${this.channels.whatsapp.apiVersion}/${this.channels.whatsapp.phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to: this.formatPhoneNumber(phoneNumber),
      type: 'text',
      text: { body: message }
    };

    // Handle media messages
    if (options.mediaUrl) {
      payload.type = 'image';
      payload.image = { link: options.mediaUrl, caption: message };
    }

    // Handle template messages
    if (options.template) {
      payload.type = 'template';
      payload.template = {
        name: options.template.name,
        language: { code: options.template.language || 'en' },
        components: options.template.components || []
      };
    }

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Authorization': `Bearer ${this.channels.whatsapp.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      this.logger.info('WhatsApp message sent', { messageId: response.data.messages?.[0]?.id });
      return { success: true, messageId: response.data.messages?.[0]?.id, channel: 'whatsapp' };
    } catch (error) {
      this.logger.error('WhatsApp API error', { error: error.response?.data || error.message });
      throw error;
    }
  }

  /**
   * Send Telegram message
   */
  async sendTelegram(chatId, message, options = {}) {
    if (!this.channels.telegram.enabled) {
      throw new Error('Telegram not configured');
    }

    const url = `https://api.telegram.org/bot${this.channels.telegram.botToken}/sendMessage`;

    const payload = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    };

    // Add keyboard if provided
    if (options.replyMarkup) {
      payload.reply_markup = options.replyMarkup;
    }

    // Handle reply keyboard
    if (options.keyboard) {
      payload.reply_markup = {
        keyboard: options.keyboard.map(row =>
          row.map(btn => ({ text: btn }))
        ),
        resize_keyboard: true,
        one_time_keyboard: options.oneTime || false
      };
    }

    try {
      const response = await axios.post(url, payload);
      this.logger.info('Telegram message sent', { messageId: response.data.result?.message_id });
      return { success: true, messageId: response.data.result?.message_id, channel: 'telegram' };
    } catch (error) {
      this.logger.error('Telegram API error', { error: error.message });
      throw error;
    }
  }

  /**
   * Send SMS via Twilio
   */
  async sendSMS(phoneNumber, message) {
    if (!this.channels.sms.enabled) {
      // Fallback to console for development
      this.logger.info('SMS (dev mode)', { to: phoneNumber, message: message.substring(0, 50) });
      return { success: true, messageId: `dev_${Date.now()}`, channel: 'sms' };
    }

    if (this.channels.sms.provider === 'twilio') {
      return await this.sendTwilioSMS(phoneNumber, message);
    }

    throw new Error(`Unsupported SMS provider: ${this.channels.sms.provider}`);
  }

  async sendTwilioSMS(phoneNumber, message) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;

    const formData = new URLSearchParams();
    formData.append('To', this.formatPhoneNumber(phoneNumber));
    formData.append('From', this.channels.sms.senderId);
    formData.append('Body', message);

    try {
      const response = await axios.post(url, formData, {
        auth: {
          username: process.env.TWILIO_ACCOUNT_SID,
          password: process.env.TWILIO_AUTH_TOKEN
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.logger.info('SMS sent via Twilio', { messageId: response.data.sid });
      return { success: true, messageId: response.data.sid, channel: 'sms' };
    } catch (error) {
      this.logger.error('Twilio SMS error', { error: error.message });
      throw error;
    }
  }

  /**
   * Send Email
   */
  async sendEmail(to, message, options = {}) {
    if (!this.channels.email.enabled) {
      // Fallback to console for development
      this.logger.info('Email (dev mode)', { to, subject: options.subject || 'RAZO Message' });
      return { success: true, messageId: `dev_${Date.now()}`, channel: 'email' };
    }

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: this.channels.email.host,
      port: this.channels.email.port,
      secure: this.channels.email.port === 465,
      auth: {
        user: this.channels.email.user,
        pass: this.channels.email.pass
      }
    });

    const mailOptions = {
      from: options.from || this.channels.email.user,
      to: to,
      subject: options.subject || 'Message from RAZO',
      html: message.includes('<') ? message : `<p>${message}</p>`,
      text: message
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      this.logger.info('Email sent', { messageId: info.messageId });
      return { success: true, messageId: info.messageId, channel: 'email' };
    } catch (error) {
      this.logger.error('Email error', { error: error.message });
      throw error;
    }
  }

  /**
   * Broadcast message to multiple recipients
   */
  async broadcast({ channel, recipients, message, options = {} }) {
    const results = [];

    for (const recipient of recipients) {
      try {
        const result = await this.sendMessage({
          channel,
          to: recipient,
          message,
          options
        });
        results.push({ recipient, ...result });
      } catch (error) {
        results.push({ recipient, success: false, error: error.message });
      }
    }

    return {
      success: true,
      total: recipients.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Format phone number to E.164 format
   */
  formatPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return cleaned;
    }
    if (cleaned.length === 10) {
      return `91${cleaned}`;
    }
    return cleaned;
  }

  /**
   * Verify WhatsApp webhook
   */
  verifyWhatsAppWebhook(mode, token, challenge) {
    if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_TOKEN) {
      return challenge;
    }
    return false;
  }

  /**
   * Get channel status
   */
  getChannelStatus() {
    return {
      whatsapp: { enabled: this.channels.whatsapp.enabled },
      telegram: { enabled: this.channels.telegram.enabled },
      sms: { enabled: this.channels.sms.enabled },
      email: { enabled: this.channels.email.enabled }
    };
  }

  /**
   * Disconnect all channels
   */
  disconnect() {
    this.logger.info('Disconnecting all channels');
    // Add cleanup logic for each channel
  }
}

module.exports = ChannelBridge;
