/**
 * WhatsApp Business API Connector
 * Meta WhatsApp Cloud API integration
 */

const axios = require('axios');
const express = require('express');
const crypto = require('crypto');

class WhatsAppBusinessClient {
  constructor(config) {
    this.phoneNumberId = config.phoneNumberId;
    this.accessToken = config.accessToken;
    this.businessId = config.businessId;
    this.verifyToken = config.verifyToken || 'hojai-verify';
    this.appSecret = config.appSecret;
    this.apiVersion = config.apiVersion || 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}`;
  }

  // Verify webhook
  verifyWebhook(mode, token, challenge) {
    if (mode === 'subscribe' && token === this.verifyToken) {
      return parseInt(challenge);
    }
    return 403;
  }

  // Verify signature
  verifySignature(payload, signature) {
    if (!this.appSecret) return true;

    const expected = crypto
      .createHmac('sha256', this.appSecret)
      .update(payload)
      .digest('hex');

    return signature === `sha256=${expected}`;
  }

  // Send text message
  async sendText({ to, message, previewUrl = false }) {
    try {
      const response = await axios.post(`${this.baseUrl}/messages`, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: {
          preview_url: previewUrl,
          body: message,
        },
      }, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        success: true,
        messageId: response.data.messages[0].id,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  // Send template message
  async sendTemplate({ to, templateName, language = 'en', parameters = [] }) {
    try {
      const components = parameters.length > 0 ? [{
        type: 'body',
        parameters: parameters.map(p => ({ type: 'text', text: p })),
      }] : [];

      const response = await axios.post(`${this.baseUrl}/messages`, {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: language },
          components,
        },
      }, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        success: true,
        messageId: response.data.messages[0].id,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  // Send media (image, video, document)
  async sendMedia({ to, type, mediaUrl, caption }) {
    try {
      const response = await axios.post(`${this.baseUrl}/messages`, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type,
        [type]: {
          link: mediaUrl,
          caption,
        },
      }, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        success: true,
        messageId: response.data.messages[0].id,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Send button message
  async sendButtons({ to, body, buttons, headerText, footerText }) {
    try {
      const action = {
        buttons: buttons.map((b, i) => ({
          type: 'reply',
          reply: {
            id: `btn_${i}`,
            title: b,
          },
        })),
      };

      const interactive = {
        type: 'button',
        body: { text: body },
        action,
      };

      if (headerText) {
        interactive.header = { type: 'text', text: headerText };
      }
      if (footerText) {
        interactive.footer = { text: footerText };
      }

      const response = await axios.post(`${this.baseUrl}/messages`, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive,
      }, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        success: true,
        messageId: response.data.messages[0].id,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Send list message
  async sendList({ to, body, sections, headerText, footerText, buttonText }) {
    try {
      const interactive = {
        type: 'list',
        header: headerText ? { type: 'text', text: headerText } : undefined,
        body: { text: body },
        footer: footerText ? { text: footerText } : undefined,
        action: {
          button: buttonText || 'Menu',
          sections: sections.map(section => ({
            title: section.title,
            rows: section.rows.map((row, i) => ({
              id: `row_${i}`,
              title: row.title,
              description: row.description,
            })),
          })),
        },
      };

      const response = await axios.post(`${this.baseUrl}/messages`, {
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive,
      }, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return { success: true, messageId: response.data.messages[0].id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Mark message as read
  async markAsRead(messageId) {
    try {
      await axios.post(`${this.baseUrl}/messages`, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Upload media
  async uploadMedia(fileBuffer, mimeType, filename) {
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, filename);
      formData.append('messaging_product', 'whatsapp');
      formData.append('type', mimeType);

      const response = await axios.post(
        `${this.baseUrl}/media`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            ...formData.getHeaders(),
          },
        }
      );

      return {
        success: true,
        mediaId: response.data.id,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Create template
  async createTemplate({ name, category, language, body, examples }) {
    try {
      const response = await axios.post(
        `https://graph.facebook.com/${this.apiVersion}/${this.businessId}/message_templates`,
        {
          name,
          category,
          language,
          components: [{
            type: 'BODY',
            text: body,
            example: { body_text: examples },
          }],
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return { success: true, templateId: response.data.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Webhook handlers
  setupWebhooks(app) {
    // Webhook verification
    app.get('/whatsapp/webhook', (req, res) => {
      const result = this.verifyWebhook(
        req.query['hub.mode'],
        req.query['hub.verify_token'],
        req.query['hub.challenge']
      );
      res.status(result === 403 ? 403 : 200).send(result);
    });

    // Receive messages
    app.post('/whatsapp/webhook', (req, res) => {
      const isValid = this.verifySignature(
        JSON.stringify(req.body),
        req.headers['x-hub-signature-256']
      );

      if (!isValid) {
        return res.sendStatus(403);
      }

      // Process messages
      const { entry } = req.body;
      for (const e of entry || []) {
        for (const change of e.changes || []) {
          if (change.field === 'messages') {
            this.handleIncomingMessages(change.value.messages, change.value.contacts);
          }
        }
      }

      res.sendStatus(200);
    });
  }

  handleIncomingMessages(messages, contacts) {
    if (!messages) return;
    for (const msg of messages) {
      console.log('[WhatsApp] Incoming:', msg.from, msg.type);

      // Emit event or call webhook
      if (this.onMessage) {
        this.onMessage(msg, contacts?.find(c => c.wa_id === msg.from));
      }
    }
  }
}

module.exports = WhatsAppBusinessClient;
