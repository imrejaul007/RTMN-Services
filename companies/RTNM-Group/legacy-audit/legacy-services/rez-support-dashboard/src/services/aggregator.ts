import { config, logger } from '../config/index.js';
import { Conversation, IConversation } from '../models/Conversation.js';
import { ChannelType, ConversationCreateInput, Message } from '../types/index.js';

interface ExternalTicket {
  id: string;
  customerId: string;
  customerName: string;
  status: string;
  priority: string;
  messages: Array<{
    id: string;
    content: string;
    sender: string;
    senderName?: string;
    timestamp: string;
  }>;
}

export class AggregatorService {
  private baseHeaders: Record<string, string>;

  constructor() {
    this.baseHeaders = {
      'X-Internal-Token': config.INTERNAL_SERVICE_TOKEN,
      'Content-Type': 'application/json',
    };
  }

  async fetchFromSupportCopilot(): Promise<ExternalTicket[]> {
    try {
      const response = await fetch(`${config.SUPPORT_COPILOT_URL}/api/tickets`, {
        headers: this.baseHeaders,
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.tickets || [];
    } catch (error) {
      logger.warn('Failed to fetch from Support Copilot', { error });
      return [];
    }
  }

  async fetchFromSupportAgent(): Promise<ExternalTicket[]> {
    try {
      const response = await fetch(`${config.SUPPORT_AGENT_URL}/api/v1/support/tickets`, {
        headers: this.baseHeaders,
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.tickets || [];
    } catch (error) {
      logger.warn('Failed to fetch from Support Agent', { error });
      return [];
    }
  }

  async fetchFromWhatsApp(): Promise<ExternalTicket[]> {
    try {
      const response = await fetch(`${config.WHATSAPP_COMMERCE_URL}/api/conversations`, {
        headers: this.baseHeaders,
      });
      if (!response.ok) return [];
      const data = await response.json();
      return (data.conversations || []).map((c: Record<string, unknown>) => ({
        ...c,
        channel: 'whatsapp',
      }));
    } catch (error) {
      logger.warn('Failed to fetch from WhatsApp', { error });
      return [];
    }
  }

  async fetchFromInstagram(): Promise<ExternalTicket[]> {
    try {
      const response = await fetch(`${config.INSTAGRAM_BRIDGE_URL}/api/dm/conversations`, {
        headers: this.baseHeaders,
      });
      if (!response.ok) return [];
      const data = await response.json();
      return (data.conversations || []).map((c: Record<string, unknown>) => ({
        ...c,
        channel: 'instagram',
      }));
    } catch (error) {
      logger.warn('Failed to fetch from Instagram', { error });
      return [];
    }
  }

  async syncAllConversations(): Promise<{ synced: number; errors: number }> {
    const results = await Promise.allSettled([
      this.fetchFromSupportCopilot(),
      this.fetchFromSupportAgent(),
      this.fetchFromWhatsApp(),
      this.fetchFromInstagram(),
    ]);

    const allTickets: Array<ExternalTicket & { channel: ChannelType }> = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const sources: ChannelType[] = ['web', 'chat', 'whatsapp', 'instagram'];
        result.value.forEach(ticket => {
          allTickets.push({ ...ticket, channel: sources[index] || 'web' });
        });
      }
    });

    let synced = 0;
    let errors = 0;

    for (const ticket of allTickets) {
      try {
        await this.syncConversation(ticket);
        synced++;
      } catch (error) {
        errors++;
        logger.error('Failed to sync conversation', { ticketId: ticket.id, error });
      }
    }

    return { synced, errors };
  }

  private async syncConversation(ticket: ExternalTicket & { channel: ChannelType }): Promise<void> {
    const sourceService = this.getSourceService(ticket.channel);

    const existing = await Conversation.findOne({
      sourceService,
      sourceConversationId: ticket.id,
    });

    if (existing) {
      existing.status = this.mapStatus(ticket.status);
      existing.priority = this.mapPriority(ticket.priority);
      existing.messages = ticket.messages.map(m => ({
        ...m,
        sender: m.sender as 'customer' | 'agent' | 'system' | 'bot',
        timestamp: new Date(m.timestamp),
        read: true,
      }));
      await existing.save();
    } else {
      const conversation = new Conversation({
        channel: ticket.channel,
        customerId: ticket.customerId,
        customerName: ticket.customerName,
        status: this.mapStatus(ticket.status),
        priority: this.mapPriority(ticket.priority),
        messages: ticket.messages.map(m => ({
          ...m,
          sender: m.sender as 'customer' | 'agent' | 'system' | 'bot',
          timestamp: new Date(m.timestamp),
          read: true,
        })),
        sourceService,
        sourceConversationId: ticket.id,
      });
      await conversation.save();
    }
  }

  private getSourceService(channel: ChannelType): string {
    const map: Record<ChannelType, string> = {
      whatsapp: 'whatsapp-commerce',
      email: 'support-copilot',
      instagram: 'instagram-bridge',
      web: 'support-agent',
      chat: 'support-agent',
    };
    return map[channel] || 'unknown';
  }

  private mapStatus(status: string): 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed' {
    const map: Record<string, 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed'> = {
      open: 'open',
      'in-progress': 'in_progress',
      'in progress': 'in_progress',
      pending: 'pending',
      resolved: 'resolved',
      closed: 'closed',
    };
    return map[status.toLowerCase()] || 'open';
  }

  private mapPriority(priority: string): 'low' | 'medium' | 'high' | 'urgent' {
    const map: Record<string, 'low' | 'medium' | 'high' | 'urgent'> = {
      low: 'low',
      medium: 'medium',
      high: 'high',
      urgent: 'urgent',
      critical: 'urgent',
    };
    return map[priority.toLowerCase()] || 'medium';
  }
}
