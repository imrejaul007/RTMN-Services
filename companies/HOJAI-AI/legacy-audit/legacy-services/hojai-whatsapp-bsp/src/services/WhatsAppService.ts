import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { SendMessage, WhatsAppMessageType } from '../types';

export class WhatsAppService {
  private api: AxiosInstance;
  private phoneNumberId: string;
  private accessToken: string;

  constructor() {
    const version = process.env.WHATSAPP_API_VERSION || 'v18.0';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';

    this.api = axios.create({
      baseURL: `https://graph.facebook.com/${version}`,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Send text message
   */
  async sendText(to: string, body: string): Promise<{ messageId: string }> {
    return this.send({
      to,
      type: 'text',
      text: { body }
    });
  }

  /**
   * Send image
   */
  async sendImage(to: string, imageUrl: string, caption?: string): Promise<{ messageId: string }> {
    return this.send({
      to,
      type: 'image',
      image: { link: imageUrl, caption }
    });
  }

  /**
   * Send video
   */
  async sendVideo(to: string, videoUrl: string, caption?: string): Promise<{ messageId: string }> {
    return this.send({
      to,
      type: 'video',
      video: { link: videoUrl, caption }
    });
  }

  /**
   * Send audio
   */
  async sendAudio(to: string, audioUrl: string): Promise<{ messageId: string }> {
    return this.send({
      to,
      type: 'audio',
      audio: { link: audioUrl }
    });
  }

  /**
   * Send document
   */
  async sendDocument(
    to: string,
    documentUrl: string,
    filename: string,
    caption?: string
  ): Promise<{ messageId: string }> {
    return this.send({
      to,
      type: 'document',
      document: { link: documentUrl, filename, caption }
    });
  }

  /**
   * Send location
   */
  async sendLocation(
    to: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string
  ): Promise<{ messageId: string }> {
    return this.send({
      to,
      type: 'location',
      location: { latitude, longitude, name, address }
    });
  }

  /**
   * Send interactive buttons
   */
  async sendButtons(
    to: string,
    body: string,
    buttons: Array<{ id: string; title: string }>,
    header?: string
  ): Promise<{ messageId: string }> {
    return this.send({
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        header: header ? { type: 'text', text: header } : undefined,
        body: { text: body },
        action: {
          buttons: buttons.map((btn) => ({
            type: 'reply',
            reply: { id: btn.id, title: btn.title }
          }))
        }
      }
    });
  }

  /**
   * Send interactive list
   */
  async sendList(
    to: string,
    body: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>
    }>,
    header?: string
  ): Promise<{ messageId: string }> {
    return this.send({
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: header ? { type: 'text', text: header } : undefined,
        body: { text: body },
        footer: { text: '' },
        action: {
          button: buttonText,
          sections: sections.map((section) => ({
            title: section.title,
            rows: section.rows.map((row) => ({
              id: row.id,
              title: row.title,
              description: row.description
            }))
          }))
        }
      }
    });
  }

  /**
   * Send template message
   */
  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string = 'en',
    components?: any[]
  ): Promise<{ messageId: string }> {
    return this.send({
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components
      }
    });
  }

  /**
   * Generic send method
   */
  async send(message: SendMessage): Promise<{ messageId: string }> {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: message.to,
        [message.type]: message[message.type]
      };

      // Remove undefined values
      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) delete payload[key];
      });

      const response = await this.api.post(`/${this.phoneNumberId}/messages`, payload);

      return {
        messageId: response.data.messages[0].id
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`WhatsApp send failed: ${errorMessage}`);
    }
  }

  /**
   * Upload media
   */
  async uploadMedia(
    url: string,
    type: 'image' | 'video' | 'audio' | 'document' | 'sticker'
  ): Promise<{ mediaId: string }> {
    try {
      const mimeTypes: Record<string, string> = {
        image: 'image/jpeg',
        video: 'video/mp4',
        audio: 'audio/mp4',
        document: 'application/pdf',
        sticker: 'image/png'
      };

      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);

      const formData = new URLSearchParams();
      formData.append('messaging_product', 'whatsapp');
      formData.append('file_length', String(buffer.length));
      formData.append('file_name', `media_${uuidv4()}`);
      formData.append('type', mimeTypes[type]);

      const uploadResponse = await this.api.post(
        `/${this.phoneNumberId}/media`,
        buffer,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': mimeTypes[type]
          }
        }
      );

      return {
        mediaId: uploadResponse.data.id
      };
    } catch (error: any) {
      throw new Error(`Media upload failed: ${error.message}`);
    }
  }

  /**
   * Download media
   */
  async downloadMedia(mediaId: string): Promise<Buffer> {
    try {
      const response = await this.api.get(`/${mediaId}`);
      const url = response.data.url;

      const downloadResponse = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        responseType: 'arraybuffer'
      });

      return Buffer.from(downloadResponse.data);
    } catch (error: any) {
      throw new Error(`Media download failed: ${error.message}`);
    }
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageId: string): Promise<{
    status: string;
    timestamp: string;
  }> {
    try {
      const response = await this.api.get(`/${messageId}`);
      return {
        status: response.data.status,
        timestamp: response.data.timestamp
      };
    } catch (error: any) {
      throw new Error(`Failed to get message status: ${error.message}`);
    }
  }

  /**
   * Create template
   */
  async createTemplate(data: {
    name: string;
    language: string;
    category: string;
    components: any[];
  }): Promise<{ id: string; status: string }> {
    try {
      const response = await this.api.post(
        `${process.env.WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`,
        {
          name: data.name,
          language: data.language,
          category: data.category,
          components: data.components
        }
      );

      return {
        id: response.data.id,
        status: response.data.status
      };
    } catch (error: any) {
      throw new Error(`Template creation failed: ${error.message}`);
    }
  }

  /**
   * Get templates
   */
  async getTemplates(): Promise<any[]> {
    try {
      const response = await this.api.get(
        `${process.env.WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates`
      );
      return response.data.data;
    } catch (error: any) {
      throw new Error(`Failed to get templates: ${error.message}`);
    }
  }

  /**
   * Verify webhook
   */
  verifyWebhook(mode: string, token: string, challenge: string): boolean {
    const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN;
    return mode === 'subscribe' && token === verifyToken;
  }

  /**
   * Mark as delivered/read
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      await this.api.post(`/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      });
    } catch (error: any) {
      console.error('Failed to mark as read:', error.message);
    }
  }
}

export const whatsAppService = new WhatsAppService();
