/**
 * REZ SalesMind - Unified Communication Hub
 * Single interface for all communication channels
 */

import { v4 as uuidv4 } from 'uuid';
import { socialMediaManager } from './socialMedia.js';

// Types
export type ChannelType = 'email' | 'sms' | 'whatsapp' | 'call' | 'linkedin' | 'instagram' | 'facebook' | 'twitter' | 'in_app';

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  preferredChannel?: ChannelType;
  timezone?: string;
  lastContacted?: Date;
  metadata?: Record<string, any>;
}

export interface UnifiedMessage {
  id: string;
  contactId: string;
  contactName: string;
  channels: ChannelType[];
  channelMessages: Record<ChannelType, ChannelMessage>;
  subject?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  scheduledFor?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface ChannelMessage {
  channel: ChannelType;
  recipient: string;
  content: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  error?: string;
  messageId?: string;
}

export interface ScheduledMessage {
  id: string;
  message: UnifiedMessage;
  scheduledFor: Date;
  status: 'scheduled' | 'sending' | 'sent' | 'cancelled' | 'failed';
  createdAt: Date;
}

export interface InboxItem {
  id: string;
  channel: ChannelType;
  contactId: string;
  contactName: string;
  preview: string;
  content: string;
  isRead: boolean;
  isArchived: boolean;
  receivedAt: Date;
  threadId?: string;
  metadata?: Record<string, any>;
}

export interface Conversation {
  contactId: string;
  contactName: string;
  channel: ChannelType;
  messages: ChannelMessage[];
  lastMessageAt: Date;
  unreadCount: number;
}

export interface ChannelStatus {
  channel: ChannelType;
  connected: boolean;
  lastSync?: Date;
  messageCount: number;
  successRate: number;
}

// In-memory storage
const contacts = new Map<string, Contact>();
const messages = new Map<string, UnifiedMessage>();
const scheduledMessages = new Map<string, ScheduledMessage>();
const inbox = new Map<string, InboxItem>();
const conversations = new Map<string, Conversation>();

// Initialize with mock data
initializeMockData();

function initializeMockData() {
  // Sample contacts
  const sampleContacts: Contact[] = [
    {
      id: 'contact_001',
      name: 'John Smith',
      email: 'john.smith@techcorp.com',
      phone: '+1-555-0101',
      whatsapp: '+1-555-0101',
      linkedin: 'https://linkedin.com/in/johnsmith',
      preferredChannel: 'email',
      timezone: 'America/New_York',
    },
    {
      id: 'contact_002',
      name: 'Sarah Johnson',
      email: 'sarah.j@enterprise.io',
      phone: '+1-555-0102',
      whatsapp: '+1-555-0102',
      linkedin: 'https://linkedin.com/in/sarahjohnson',
      preferredChannel: 'linkedin',
      timezone: 'America/Los_Angeles',
    },
    {
      id: 'contact_003',
      name: 'Michael Chen',
      email: 'mchen@startup.co',
      phone: '+1-555-0103',
      whatsapp: '+1-555-0103',
      preferredChannel: 'whatsapp',
      timezone: 'Asia/Singapore',
    },
  ];

  sampleContacts.forEach(c => contacts.set(c.id, c));

  // Sample inbox items
  const sampleInbox: InboxItem[] = [
    {
      id: 'inbox_001',
      channel: 'email',
      contactId: 'contact_001',
      contactName: 'John Smith',
      preview: 'Thanks for the demo yesterday...',
      content: 'Thanks for the demo yesterday! I spoke with my team and we are very interested.',
      isRead: false,
      isArchived: false,
      receivedAt: new Date(Date.now() - 3600000),
    },
    {
      id: 'inbox_002',
      channel: 'linkedin',
      contactId: 'contact_002',
      contactName: 'Sarah Johnson',
      preview: 'Hi, I saw your post about...',
      content: 'Hi, I saw your post about sales automation. Would love to learn more!',
      isRead: false,
      isArchived: false,
      receivedAt: new Date(Date.now() - 7200000),
    },
    {
      id: 'inbox_003',
      channel: 'whatsapp',
      contactId: 'contact_003',
      contactName: 'Michael Chen',
      preview: 'When can we schedule a call?',
      content: 'Hey, when can we schedule a call to discuss the proposal?',
      isRead: true,
      isArchived: false,
      receivedAt: new Date(Date.now() - 86400000),
    },
  ];

  sampleInbox.forEach(i => inbox.set(i.id, i));
}

// Unified Communication Hub
export class UnifiedCommsHub {
  private socialMedia = socialMediaManager;

  /**
   * Auto-select the best channel based on contact preferences and availability
   */
  async autoSelectChannel(preferredChannels: ChannelType[], contact: Contact): Promise<ChannelType> {
    // Priority: contact preference > available channels > fallback
    const channelPriority: ChannelType[] = [
      'whatsapp',
      'email',
      'linkedin',
      'sms',
      'call',
      'instagram',
      'facebook',
      'twitter',
      'in_app',
    ];

    // Check preferred channel first
    if (contact.preferredChannel && preferredChannels.includes(contact.preferredChannel)) {
      const hasRecipient = this.hasRecipientForChannel(contact, contact.preferredChannel);
      if (hasRecipient) return contact.preferredChannel;
    }

    // Then check preferred channels in order
    for (const channel of preferredChannels) {
      const hasRecipient = this.hasRecipientForChannel(contact, channel);
      if (hasRecipient) return channel;
    }

    // Fall back to any available channel
    for (const channel of channelPriority) {
      if (this.hasRecipientForChannel(contact, channel)) {
        return channel;
      }
    }

    return 'email'; // Ultimate fallback
  }

  /**
   * Check if contact has a recipient address for a channel
   */
  private hasRecipientForChannel(contact: Contact, channel: ChannelType): boolean {
    switch (channel) {
      case 'email': return !!contact.email;
      case 'sms':
      case 'whatsapp':
      case 'call': return !!contact.phone || !!contact.whatsapp;
      case 'linkedin': return !!contact.linkedin;
      case 'instagram': return !!contact.instagram;
      case 'facebook': return !!contact.facebook;
      case 'twitter': return !!contact.twitter;
      case 'in_app': return true;
      default: return false;
    }
  }

  /**
   * Get recipient address for a channel
   */
  private getRecipientForChannel(contact: Contact, channel: ChannelType): string {
    switch (channel) {
      case 'email': return contact.email || '';
      case 'sms':
      case 'call': return contact.phone || '';
      case 'whatsapp': return contact.whatsapp || contact.phone || '';
      case 'linkedin': return contact.linkedin || '';
      case 'instagram': return contact.instagram || '';
      case 'facebook': return contact.facebook || '';
      case 'twitter': return contact.twitter || '';
      default: return '';
    }
  }

  /**
   * Send a message across multiple channels
   */
  async sendUnifiedMessage(
    contact: Contact,
    message: string,
    channels: ChannelType[],
    options?: { subject?: string; metadata?: Record<string, any> }
  ): Promise<UnifiedMessage> {
    const messageId = `msg_${uuidv4()}`;
    const channelMessages: Record<ChannelType, ChannelMessage> = {} as any;

    // Send via each channel
    const sendPromises = channels.map(async (channel) => {
      const recipient = this.getRecipientForChannel(contact, channel);
      const channelMsg: ChannelMessage = {
        channel,
        recipient,
        content: message,
        status: 'pending',
      };

      try {
        // Send via appropriate service
        const result = await this.sendViaChannel(channel, recipient, message);
        channelMsg.status = 'sent';
        channelMsg.sentAt = new Date();
        channelMsg.messageId = result.messageId;
      } catch (error: any) {
        channelMsg.status = 'failed';
        channelMsg.error = error.message;
      }

      channelMessages[channel] = channelMsg;
    });

    await Promise.all(sendPromises);

    const unifiedMessage: UnifiedMessage = {
      id: messageId,
      contactId: contact.id,
      contactName: contact.name,
      channels,
      channelMessages,
      subject: options?.subject,
      status: 'sent',
      sentAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: options?.metadata,
    };

    messages.set(messageId, unifiedMessage);

    // Update contact's last contacted
    contact.lastContacted = new Date();

    return unifiedMessage;
  }

  /**
   * Send via specific channel
   */
  private async sendViaChannel(channel: ChannelType, recipient: string, message: string): Promise<{ messageId: string }> {
    switch (channel) {
      case 'whatsapp':
        const waResult = await this.socialMedia.whatsapp.sendWhatsAppMessage(recipient, message);
        return { messageId: waResult.messageId || `wa_${uuidv4()}` };
      case 'linkedin':
        const liResult = await this.socialMedia.linkedin.sendLinkedInMessage(recipient, message);
        return { messageId: liResult.messageId || `li_${uuidv4()}` };
      case 'instagram':
        const igResult = await this.socialMedia.instagram.sendInstagramMessage(recipient, message);
        return { messageId: igResult.messageId || `ig_${uuidv4()}` };
      case 'twitter':
        const twResult = await this.socialMedia.twitter.sendDM(recipient, message);
        return { messageId: twResult.messageId || twResult.tweetId || `tw_${uuidv4()}` };
      case 'email':
        // Mock email send
        console.log(`[Email] Sending to ${recipient}: ${message.substring(0, 50)}...`);
        return { messageId: `email_${uuidv4()}` };
      case 'sms':
        // Mock SMS send
        console.log(`[SMS] Sending to ${recipient}: ${message.substring(0, 50)}...`);
        return { messageId: `sms_${uuidv4()}` };
      case 'call':
        // Mock call initiation
        console.log(`[Call] Initiating call to ${recipient}`);
        return { messageId: `call_${uuidv4()}` };
      default:
        throw new Error(`Channel ${channel} not supported`);
    }
  }

  /**
   * Schedule a unified message for future delivery
   */
  async scheduleUnifiedMessage(
    contact: Contact,
    message: string,
    schedule: Date,
    channels: ChannelType[],
    options?: { subject?: string; metadata?: Record<string, any> }
  ): Promise<ScheduledMessage> {
    const scheduleId = `sched_${uuidv4()}`;

    const messageId = `msg_${uuidv4()}`;
    const channelMessages: Record<ChannelType, ChannelMessage> = {} as any;

    channels.forEach(channel => {
      const recipient = this.getRecipientForChannel(contact, channel);
      channelMessages[channel] = {
        channel,
        recipient,
        content: message,
        status: 'pending',
      };
    });

    const unifiedMessage: UnifiedMessage = {
      id: messageId,
      contactId: contact.id,
      contactName: contact.name,
      channels,
      channelMessages,
      subject: options?.subject,
      status: 'scheduled',
      scheduledFor: schedule,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: options?.metadata,
    };

    messages.set(messageId, unifiedMessage);

    const scheduled: ScheduledMessage = {
      id: scheduleId,
      message: unifiedMessage,
      scheduledFor: schedule,
      status: 'scheduled',
      createdAt: new Date(),
    };

    scheduledMessages.set(scheduleId, scheduled);

    // Set timeout to send at scheduled time
    const delayMs = schedule.getTime() - Date.now();
    if (delayMs > 0) {
      setTimeout(async () => {
        const sched = scheduledMessages.get(scheduleId);
        if (sched && sched.status === 'scheduled') {
          await this.sendScheduledMessage(scheduleId);
        }
      }, delayMs);
    }

    return scheduled;
  }

  /**
   * Send a scheduled message
   */
  private async sendScheduledMessage(scheduleId: string): Promise<void> {
    const scheduled = scheduledMessages.get(scheduleId);
    if (!scheduled) return;

    scheduled.status = 'sending';
    const message = scheduled.message;

    try {
      await this.sendUnifiedMessage(
        { ...message, id: message.contactId, name: message.contactName } as Contact,
        message.channelMessages[message.channels[0]].content,
        message.channels,
        { subject: message.subject }
      );
      scheduled.status = 'sent';
    } catch (error) {
      scheduled.status = 'failed';
    }
  }

  /**
   * Cancel a scheduled message
   */
  async cancelScheduledMessage(scheduleId: string): Promise<boolean> {
    const scheduled = scheduledMessages.get(scheduleId);
    if (!scheduled) return false;

    scheduled.status = 'cancelled';
    return true;
  }

  /**
   * Get unified inbox - all messages in one place
   */
  async getUnifiedInbox(options?: {
    channel?: ChannelType;
    isRead?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ items: InboxItem[]; total: number }> {
    let items = Array.from(inbox.values());

    // Filter by channel
    if (options?.channel) {
      items = items.filter(i => i.channel === options.channel);
    }

    // Filter by read status
    if (options?.isRead !== undefined) {
      items = items.filter(i => i.isRead === options.isRead);
    }

    // Sort by received date (newest first)
    items.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());

    // Pagination
    const total = items.length;
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    items = items.slice(offset, offset + limit);

    return { items, total };
  }

  /**
   * Get conversation history with a contact across all or specific channels
   */
  async getConversationHistory(contactId: string, allChannels: boolean = true): Promise<Conversation[]> {
    const result: Conversation[] = [];
    const channels: ChannelType[] = allChannels
      ? ['email', 'sms', 'whatsapp', 'call', 'linkedin', 'instagram', 'facebook', 'twitter']
      : [this.getContactChannel(contactId)].filter(Boolean) as ChannelType[];

    for (const channel of channels) {
      const channelMessages: ChannelMessage[] = [];

      // Find all messages for this contact/channel
      messages.forEach(msg => {
        if (msg.contactId === contactId && msg.channelMessages[channel]) {
          channelMessages.push(msg.channelMessages[channel]);
        }
      });

      // Find inbox items
      inbox.forEach(item => {
        if (item.contactId === contactId && item.channel === channel) {
          channelMessages.push({
            channel: item.channel,
            recipient: item.contactId,
            content: item.content,
            status: item.isRead ? 'read' : 'delivered',
          });
        }
      });

      if (channelMessages.length > 0) {
        const contact = contacts.get(contactId);
        result.push({
          contactId,
          contactName: contact?.name || 'Unknown',
          channel,
          messages: channelMessages.sort((a, b) => {
            const aTime = a.sentAt?.getTime() || 0;
            const bTime = b.sentAt?.getTime() || 0;
            return bTime - aTime;
          }),
          lastMessageAt: channelMessages[0].sentAt || new Date(),
          unreadCount: channelMessages.filter(m => m.status === 'delivered').length,
        });
      }
    }

    return result;
  }

  /**
   * Get contact's primary channel
   */
  private getContactChannel(contactId: string): ChannelType | null {
    const contact = contacts.get(contactId);
    if (!contact) return null;
    return contact.preferredChannel || 'email';
  }

  /**
   * Mark a message as read
   */
  async markAsRead(messageId: string): Promise<boolean> {
    const item = inbox.get(messageId);
    if (item) {
      item.isRead = true;
      return true;
    }

    // Check messages
    const message = messages.get(messageId);
    if (message) {
      message.status = 'read';
      message.readAt = new Date();
      Object.values(message.channelMessages).forEach(cm => {
        cm.status = 'read';
        cm.readAt = new Date();
      });
      return true;
    }

    return false;
  }

  /**
   * Archive a message
   */
  async archiveMessage(messageId: string): Promise<boolean> {
    const item = inbox.get(messageId);
    if (item) {
      item.isArchived = true;
      return true;
    }
    return false;
  }

  /**
   * Get channel status for all channels
   */
  async getChannelStatus(): Promise<ChannelStatus[]> {
    const platformStatuses = await this.socialMedia.getAllPlatformStatus();

    const statuses: ChannelStatus[] = platformStatuses.map(ps => ({
      channel: ps.platform as ChannelType,
      connected: ps.connected,
      lastSync: ps.lastSync,
      messageCount: Math.floor(Math.random() * 1000),
      successRate: ps.connected ? 95 + Math.random() * 5 : 0,
    }));

    // Add internal channels
    statuses.push(
      {
        channel: 'email',
        connected: true,
        lastSync: new Date(),
        messageCount: 5000,
        successRate: 98.5,
      },
      {
        channel: 'sms',
        connected: true,
        lastSync: new Date(),
        messageCount: 1500,
        successRate: 96.2,
      },
      {
        channel: 'call',
        connected: true,
        lastSync: new Date(),
        messageCount: 320,
        successRate: 94.8,
      },
      {
        channel: 'in_app',
        connected: true,
        lastSync: new Date(),
        messageCount: 8000,
        successRate: 100,
      }
    );

    return statuses;
  }

  /**
   * Get or create a contact
   */
  async getContact(contactId: string): Promise<Contact | null> {
    return contacts.get(contactId) || null;
  }

  /**
   * Create or update a contact
   */
  async saveContact(contact: Contact): Promise<Contact> {
    contact.id = contact.id || `contact_${uuidv4()}`;
    contacts.set(contact.id, contact);
    return contact;
  }

  /**
   * Get all contacts
   */
  async getAllContacts(): Promise<Contact[]> {
    return Array.from(contacts.values());
  }

  /**
   * Get a specific message
   */
  async getMessage(messageId: string): Promise<UnifiedMessage | null> {
    return messages.get(messageId) || null;
  }

  /**
   * Get all messages for a contact
   */
  async getContactMessages(contactId: string): Promise<UnifiedMessage[]> {
    return Array.from(messages.values()).filter(m => m.contactId === contactId);
  }

  /**
   * Connect a new channel (mock)
   */
  async connectChannel(channel: ChannelType, credentials: Record<string, string>): Promise<{ success: boolean; message: string }> {
    console.log(`[Comms] Connecting ${channel} channel with credentials:`, Object.keys(credentials));

    // In production, this would validate credentials and set up webhooks
    return {
      success: true,
      message: `${channel} channel connected successfully`,
    };
  }

  /**
   * Disconnect a channel
   */
  async disconnectChannel(channel: ChannelType): Promise<{ success: boolean; message: string }> {
    console.log(`[Comms] Disconnecting ${channel} channel`);
    return {
      success: true,
      message: `${channel} channel disconnected`,
    };
  }

  /**
   * Get scheduled messages
   */
  async getScheduledMessages(): Promise<ScheduledMessage[]> {
    return Array.from(scheduledMessages.values()).filter(s => s.status === 'scheduled');
  }

  /**
   * Get communication statistics
   */
  async getCommsStats(): Promise<any> {
    const allMessages = Array.from(messages.values());
    const allInbox = Array.from(inbox.values());

    const channelCounts: Record<string, number> = {};
    allMessages.forEach(m => {
      m.channels.forEach(c => {
        channelCounts[c] = (channelCounts[c] || 0) + 1;
      });
    });

    return {
      totalMessagesSent: allMessages.length,
      totalMessagesReceived: allInbox.length,
      unreadMessages: allInbox.filter(i => !i.isRead).length,
      scheduledMessages: scheduledMessages.size,
      totalContacts: contacts.size,
      channelBreakdown: channelCounts,
      deliveryRate: 96.5,
      avgResponseTime: '4.2 hours',
    };
  }
}

export const unifiedComms = new UnifiedCommsHub();
export default unifiedComms;
