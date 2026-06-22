import axios from 'axios';
import { v4 as uuid } from 'uuid';
import { WebSocketServer, WebSocket } from 'ws';
import {
  WhatsAppWebhookPayload,
  WhatsAppOutboundMessage,
  Source,
  MessageDirection,
  MessageType
} from './types/index.js';
import { messageRouter } from './services/messageRouter.js';
import { conversationManager } from './services/conversationManager.js';
import { employeeRegistry } from './services/employeeRegistry.js';

// ============================================================================
// CONFIG
// ============================================================================

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const WHATSAPP_WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'hojai-verify-token';
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';

// ============================================================================
// WHATSAPP BRIDGE
// ============================================================================

interface WhatsAppSession {
  connected: boolean;
  connectedAt?: Date;
  phoneNumberId: string;
  webhooks: Set<string>;
}

interface WhatsAppClient {
  tenantId: string;
  session: WhatsAppSession;
  ws?: WebSocket;
}

class WhatsAppBridge {
  private clients: Map<string, WhatsAppClient> = new Map();
  private messageHandlers: Map<string, (message: unknown) => Promise<void>> = new Map();
  private statusHandlers: Map<string, (status: unknown) => Promise<void>> = new Map();
  private wsServer?: WebSocketServer;

  /**
   * Start WhatsApp integration for a tenant
   */
  async connect(tenantId: string): Promise<void> {
    if (this.clients.has(tenantId)) {
      console.log(`[WhatsAppBridge] Tenant ${tenantId} already connected`);
      return;
    }

    const client: WhatsAppClient = {
      tenantId,
      session: {
        connected: false,
        phoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
        webhooks: new Set()
      }
    };

    this.clients.set(tenantId, client);

    // Verify WhatsApp credentials
    if (WHATSAPP_ACCESS_TOKEN) {
      try {
        await this.verifyCredentials();
        client.session.connected = true;
        client.session.connectedAt = new Date();
        console.log(`[WhatsAppBridge] Connected tenant ${tenantId}`);
      } catch (error) {
        console.error(`[WhatsAppBridge] Failed to verify WhatsApp credentials:`, error);
      }
    } else {
      console.warn(`[WhatsAppBridge] No WhatsApp access token configured - running in demo mode`);
      client.session.connected = true;
      client.session.connectedAt = new Date();
    }
  }

  /**
   * Disconnect WhatsApp for a tenant
   */
  async disconnect(tenantId: string): Promise<void> {
    const client = this.clients.get(tenantId);
    if (!client) return;

    if (client.ws) {
      client.ws.close();
    }

    this.clients.delete(tenantId);
    console.log(`[WhatsAppBridge] Disconnected tenant ${tenantId}`);
  }

  /**
   * Verify WhatsApp API credentials
   */
  private async verifyCredentials(): Promise<void> {
    const response = await axios.get(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}`,
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`
        }
      }
    );
    console.log('[WhatsAppBridge] Credentials verified:', response.data);
  }

  /**
   * Register a message handler
   */
  onMessage(tenantId: string, handler: (message: unknown) => Promise<void>): void {
    this.messageHandlers.set(tenantId, handler);
  }

  /**
   * Register a status handler
   */
  onStatusUpdate(tenantId: string, handler: (status: unknown) => Promise<void>): void {
    this.statusHandlers.set(tenantId, handler);
  }

  /**
   * Handle incoming webhook from WhatsApp
   */
  async handleWebhook(tenantId: string, payload: WhatsAppWebhookPayload): Promise<void> {
    const client = this.clients.get(tenantId);
    if (!client) {
      console.error(`[WhatsAppBridge] Unknown tenant: ${tenantId}`);
      return;
    }

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        const value = change.value;

        // Handle incoming messages
        if (value.messages && value.messages.length > 0) {
          for (const message of value.messages) {
            const contact = value.contacts && value.contacts.length > 0 ? value.contacts[0] : undefined;
            await this.routeMessage(tenantId, message, contact);
          }
        }

        // Handle message status updates
        if (value.statuses && value.statuses.length > 0) {
          for (const status of value.statuses) {
            await this.handleStatusUpdate(tenantId, status);
          }
        }
      }
    }
  }

  /**
   * Route incoming message to appropriate handler
   */
  private async routeMessage(
    tenantId: string,
    message: NonNullable<WhatsAppWebhookPayload['entry'][0]['changes'][0]['value']['messages']>[0],
    contact?: NonNullable<WhatsAppWebhookPayload['entry'][0]['changes'][0]['value']['contacts']>[0]
  ): Promise<void> {

    const userId = message.from;
    const userName = contact?.profile?.name || 'WhatsApp User';

    // Build message content
    let content: { text: string; mediaUrl?: string } = { text: '' };
    let messageType = MessageType.TEXT;

    switch (message.type) {
      case 'text':
        content = { text: message.text?.body || '' };
        messageType = MessageType.TEXT;
        break;
      case 'image':
        content = {
          text: message.image?.caption || '[Image]',
          mediaUrl: message.image?.id ? `whatsapp:${message.image.id}` : undefined
        };
        messageType = MessageType.IMAGE;
        break;
      case 'location':
        content = {
          text: message.location?.name ? `Location: ${message.location.name}` : '[Location]'
        };
        messageType = MessageType.LOCATION;
        break;
      case 'interactive':
        const buttonReply = message.interactive?.button_reply;
        content = { text: buttonReply?.title || '[Interactive]' };
        messageType = MessageType.INTERACTIVE;
        break;
      default:
        content = { text: `[${message.type}]` };
        messageType = MessageType.TEXT;
    }

    // Process through message router
    const result = await messageRouter.processMessage({
      tenantId,
      userId,
      message: content.text,
      source: Source.WHATSAPP,
      metadata: {
        whatsappMessageId: message.id,
        whatsappTimestamp: message.timestamp,
        originalType: message.type
      }
    });

    if (result.success && result.response) {
      // Send response back via WhatsApp
      await this.sendMessage(tenantId, userId, result.response);
    }

    // Call registered handler
    const handler = this.messageHandlers.get(tenantId);
    if (handler) {
      await handler({
        tenantId,
        userId,
        userName,
        messageId: message.id,
        content: content.text,
        type: message.type,
        timestamp: message.timestamp,
        result
      });
    }
  }

  /**
   * Handle message status updates (sent, delivered, read, failed)
   */
  private async handleStatusUpdate(
    tenantId: string,
    status: NonNullable<WhatsAppWebhookPayload['entry'][0]['changes'][0]['value']['statuses']>[0]
  ): Promise<void> {
    // Find message by external ID and update status
    const message = await conversationManager.findMessageByExternalId(status.id);
    if (message) {
      await conversationManager.updateMessageStatus(message.id, status.status as 'sent' | 'delivered' | 'read' | 'failed');
    }

    // Call registered handler
    const handler = this.statusHandlers.get(tenantId);
    if (handler) {
      await handler({
        tenantId,
        messageId: status.id,
        status: status.status,
        timestamp: status.timestamp,
        recipientId: status.recipient_id
      });
    }
  }

  /**
   * Send a message via WhatsApp
   */
  async sendMessage(tenantId: string, to: string, text: string): Promise<string | null> {
    const client = this.clients.get(tenantId);
    if (!client || !client.session.connected) {
      console.error(`[WhatsAppBridge] Tenant ${tenantId} not connected`);
      return null;
    }

    const messageId = uuid();
    const payload: WhatsAppOutboundMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: text }
    };

    try {
      if (WHATSAPP_ACCESS_TOKEN) {
        // Send via WhatsApp API
        const response = await axios.post(
          `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log(`[WhatsAppBridge] Sent message to ${to}:`, response.data);
        return response.data.messages?.[0]?.id || messageId;
      } else {
        // Demo mode - simulate send
        console.log(`[WhatsAppBridge] [DEMO] Sending to ${to}: ${text}`);
        return messageId;
      }
    } catch (error) {
      console.error(`[WhatsAppBridge] Failed to send message:`, error);
      return null;
    }
  }

  /**
   * Send an interactive message with buttons
   */
  async sendInteractiveMessage(
    tenantId: string,
    to: string,
    header: string,
    body: string,
    buttons: Array<{ id: string; title: string }>,
    footer?: string
  ): Promise<string | null> {
    const payload: WhatsAppOutboundMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        header: { type: 'text', text: header },
        body: { text: body },
        footer: footer ? { text: footer } : undefined,
        action: {
          buttons: buttons.map(btn => ({
            type: 'reply',
            reply: { id: btn.id, title: btn.title.substring(0, 25) }
          }))
        }
      }
    };

    try {
      if (WHATSAPP_ACCESS_TOKEN) {
        const response = await axios.post(
          `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
        return response.data.messages?.[0]?.id || null;
      } else {
        console.log(`[WhatsAppBridge] [DEMO] Sending interactive message to ${to}`);
        return uuid();
      }
    } catch (error) {
      console.error(`[WhatsAppBridge] Failed to send interactive message:`, error);
      return null;
    }
  }

  /**
   * Send a media message
   */
  async sendMediaMessage(
    tenantId: string,
    to: string,
    mediaUrl: string,
    caption?: string,
    type: 'image' | 'video' | 'audio' | 'document' = 'image'
  ): Promise<string | null> {
    const payload: WhatsAppOutboundMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type,
      [type]: { link: mediaUrl, caption }
    } as unknown as WhatsAppOutboundMessage;

    try {
      if (WHATSAPP_ACCESS_TOKEN) {
        const response = await axios.post(
          `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
        return response.data.messages?.[0]?.id || null;
      } else {
        console.log(`[WhatsAppBridge] [DEMO] Sending ${type} to ${to}`);
        return uuid();
      }
    } catch (error) {
      console.error(`[WhatsAppBridge] Failed to send media:`, error);
      return null;
    }
  }

  /**
   * Start WebSocket server for real-time WhatsApp events
   */
  startWebSocketServer(port = 4585): void {
    this.wsServer = new WebSocketServer({ port });

    this.wsServer.on('connection', (ws, req) => {
      const tenantId = new URL(req.url || '', `http://localhost:${port}`).searchParams.get('tenantId');

      if (!tenantId || !this.clients.has(tenantId)) {
        ws.close(4001, 'Invalid tenant');
        return;
      }

      console.log(`[WhatsAppBridge] WebSocket connected for tenant ${tenantId}`);

      const client = this.clients.get(tenantId)!;
      client.ws = ws;

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'send') {
            await this.sendMessage(tenantId, message.to, message.text);
          }
        } catch (error) {
          console.error('[WhatsAppBridge] WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        console.log(`[WhatsAppBridge] WebSocket disconnected for tenant ${tenantId}`);
        client.ws = undefined;
      });

      // Send connection acknowledgment
      ws.send(JSON.stringify({ type: 'connected', tenantId }));
    });

    console.log(`[WhatsAppBridge] WebSocket server running on port ${port}`);
  }

  /**
   * Verify webhook subscription
   */
  verifyWebhook(mode: string, token: string, challenge: string): boolean {
    if (mode === 'subscribe' && token === WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      console.log('[WhatsAppBridge] Webhook verified');
      return true;
    }
    return false;
  }

  /**
   * Get connection status for a tenant
   */
  getStatus(tenantId: string): { connected: boolean; connectedAt?: Date } {
    const client = this.clients.get(tenantId);
    if (!client) {
      return { connected: false };
    }
    return {
      connected: client.session.connected,
      connectedAt: client.session.connectedAt
    };
  }

  /**
   * Get all connected tenants
   */
  getConnectedTenants(): string[] {
    return Array.from(this.clients.keys()).filter(
      tenantId => this.clients.get(tenantId)?.session.connected
    );
  }

  /**
   * Shutdown bridge
   */
  async shutdown(): Promise<void> {
    for (const tenantId of this.clients.keys()) {
      await this.disconnect(tenantId);
    }

    if (this.wsServer) {
      this.wsServer.close();
    }

    console.log('[WhatsAppBridge] Shutdown complete');
  }
}

export const whatsAppBridge = new WhatsAppBridge();
