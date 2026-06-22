import axios from 'axios';

/**
 * WhatsApp Business API Service
 *
 * Handles:
 * - Sending messages
 * - Template messages
 * - Media messages
 * - Status updates
 */

export class WhatsAppService {
  private accessToken: string;
  private phoneNumberId: string;
  private apiVersion = 'v18.0';
  private baseUrl = 'https://graph.facebook.com';

  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_ID || '';
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  // ============================================================================
  // SEND MESSAGES
  // ============================================================================

  /**
   * Send text message
   */
  async sendTextMessage(to: string, body: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    if (!this.accessToken) {
      console.warn('[WhatsApp] No access token configured');
      return { success: false, error: 'Not configured' };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { body }
        },
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id
      };
    } catch (error: any) {
      console.error('[WhatsApp] Send failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed to send'
      };
    }
  }

  /**
   * Send template message
   */
  async sendTemplate(to: string, templateName: string, components?: any[]): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    if (!this.accessToken) {
      return { success: false, error: 'Not configured' };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en' },
            components: components || []
          }
        },
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id
      };
    } catch (error: any) {
      console.error('[WhatsApp] Template send failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed to send'
      };
    }
  }

  /**
   * Send interactive buttons message
   */
  async sendButtons(to: string, body: string, buttons: Array<{ type: string; title: string; id?: string; phone_number?: string }>): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    if (!this.accessToken) {
      return { success: false, error: 'Not configured' };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'interactive',
          interactive: {
            type: 'buttons',
            body: { text: body },
            action: {
              buttons: buttons.map(b => ({
                type: b.type,
                title: b.title,
                ...(b.id && { id: b.id }),
                ...(b.phone_number && { phone_number: b.phone_number })
              }))
            }
          }
        },
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed'
      };
    }
  }

  /**
   * Send reply buttons (quick replies)
   */
  async sendReplyButtons(to: string, body: string, buttons: string[]): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    if (!this.accessToken) {
      return { success: false, error: 'Not configured' };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'interactive',
          interactive: {
            type: 'button',
            header: { type: 'text', text: 'Quick Reply' },
            body: { text: body },
            action: {
              buttons: buttons.map((title, i) => ({
                type: 'quick_reply',
                reply: { id: `btn_${i}`, title }
              }))
            }
          }
        },
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed'
      };
    }
  }

  // ============================================================================
  // MEDIA
  // ============================================================================

  /**
   * Send image
   */
  async sendImage(to: string, imageUrl: string, caption?: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    if (!this.accessToken) {
      return { success: false, error: 'Not configured' };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'image',
          image: {
            link: imageUrl,
            caption
          }
        },
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed'
      };
    }
  }

  /**
   * Send document
   */
  async sendDocument(to: string, documentUrl: string, filename: string): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    if (!this.accessToken) {
      return { success: false, error: 'Not configured' };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'document',
          document: {
            link: documentUrl,
            filename
          }
        },
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed'
      };
    }
  }

  // ============================================================================
  // MESSAGE MANAGEMENT
  // ============================================================================

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<boolean> {
    if (!this.accessToken) return false;

    try {
      await axios.post(
        `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        },
        { headers: this.getHeaders() }
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageId: string): Promise<string> {
    if (!this.accessToken) return 'unknown';

    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.apiVersion}/${messageId}`,
        { headers: this.getHeaders() }
      );
      return response.data.status || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  // ============================================================================
  // TEMPLATES
  // ============================================================================

  /**
   * Get templates
   */
  async getTemplates(): Promise<any[]> {
    if (!this.accessToken) return [];

    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/message_templates`,
        { headers: this.getHeaders() }
      );
      return response.data.data || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Create template (requires WhatsApp Business API approval)
   */
  async createTemplate(params: {
    name: string;
    category: string;
    language: string;
    components: any[];
  }): Promise<{ success: boolean; id?: string; error?: string }> {
    if (!this.accessToken) {
      return { success: false, error: 'Not configured' };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/message_templates`,
        params,
        { headers: this.getHeaders() }
      );

      return {
        success: true,
        id: response.data.id
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed'
      };
    }
  }
}

export const whatsappService = new WhatsAppService();
