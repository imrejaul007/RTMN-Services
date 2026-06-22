// ============================================================================
// SUTAR Agent Network - Communication Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  Message,
  MessageThread,
  MessagePriority,
  MessageStatus,
  Attachment,
  Notification,
} from '../types/index.js';

export class CommunicationService {
  private messages: Map<string, Message> = new Map();
  private threads: Map<string, MessageThread> = new Map();
  private agentMessages: Map<string, Set<string>> = new Map();
  private notifications: Map<string, Notification> = new Map();

  /**
   * Create a new message thread
   */
  createThread(data: {
    participants: string[];
    subject: string;
    initialMessage?: string;
    labels?: string[];
  }): MessageThread {
    const now = new Date().toISOString();
    const thread: MessageThread = {
      id: `thread-${uuidv4()}`,
      participants: data.participants,
      subject: data.subject,
      lastMessage: data.initialMessage,
      lastMessageAt: now,
      unreadCount: Object.fromEntries(data.participants.map(p => [p, 0])),
      createdAt: now,
      updatedAt: now,
      status: 'active',
      labels: data.labels,
      pinned: false,
    };

    this.threads.set(thread.id, thread);
    return thread;
  }

  /**
   * Get thread by ID
   */
  getThread(threadId: string): MessageThread | undefined {
    return this.threads.get(threadId);
  }

  /**
   * Get all threads for a participant
   */
  getThreadsForParticipant(participantId: string, includeArchived: boolean = false): MessageThread[] {
    return Array.from(this.threads.values())
      .filter(t => {
        if (!includeArchived && t.status === 'archived') return false;
        return t.participants.includes(participantId);
      })
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }

  /**
   * Send a message
   */
  sendMessage(data: {
    threadId?: string;
    senderId: string;
    recipientId: string;
    subject: string;
    content: string;
    priority?: MessagePriority;
    attachments?: Omit<Attachment, 'id'>[];
    references?: string[];
    replyTo?: string;
    expiresAt?: string;
  }): Message {
    let threadId = data.threadId;

    // Create thread if not exists
    if (!threadId) {
      const thread = this.createThread({
        participants: [data.senderId, data.recipientId],
        subject: data.subject,
        initialMessage: data.content,
      });
      threadId = thread.id;
    }

    const now = new Date().toISOString();
    const message: Message = {
      id: `msg-${uuidv4()}`,
      threadId: threadId!,
      senderId: data.senderId,
      recipientId: data.recipientId,
      subject: data.subject,
      content: data.content,
      priority: data.priority || 'normal',
      status: 'sent',
      attachments: data.attachments?.map(a => ({ ...a, id: `attach-${uuidv4()}` })),
      references: data.references,
      replyTo: data.replyTo,
      createdAt: now,
      expiresAt: data.expiresAt,
    };

    this.messages.set(message.id, message);

    // Track messages for sender and recipient
    if (!this.agentMessages.has(data.senderId)) {
      this.agentMessages.set(data.senderId, new Set());
    }
    this.agentMessages.get(data.senderId)!.add(message.id);

    if (!this.agentMessages.has(data.recipientId)) {
      this.agentMessages.set(data.recipientId, new Set());
    }
    this.agentMessages.get(data.recipientId)!.add(message.id);

    // Update thread
    const thread = this.threads.get(threadId!);
    if (thread) {
      thread.lastMessage = data.content;
      thread.lastMessageAt = now;
      thread.unreadCount[data.recipientId] = (thread.unreadCount[data.recipientId] || 0) + 1;
      thread.updatedAt = now;
      this.threads.set(threadId!, thread);
    }

    // Create notification for recipient
    this.createNotification({
      recipientId: data.recipientId,
      type: 'message',
      title: `New message: ${data.subject}`,
      content: data.content.substring(0, 100),
      data: { threadId, messageId: message.id, senderId: data.senderId },
    });

    return message;
  }

  /**
   * Get message by ID
   */
  getMessage(messageId: string): Message | undefined {
    return this.messages.get(messageId);
  }

  /**
   * Get messages for a thread
   */
  getMessagesForThread(threadId: string, limit: number = 50, offset: number = 0): Message[] {
    return Array.from(this.messages.values())
      .filter(m => m.threadId === threadId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(offset, offset + limit);
  }

  /**
   * Get messages for an agent
   */
  getMessagesForAgent(agentId: string, status?: MessageStatus): Message[] {
    let messages = Array.from(this.messages.values()).filter(
      m => m.senderId === agentId || m.recipientId === agentId
    );

    if (status) {
      messages = messages.filter(m => m.status === status);
    }

    return messages.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Mark message as read
   */
  markAsRead(messageId: string, agentId: string): Message | undefined {
    const message = this.messages.get(messageId);
    if (!message) {
      return undefined;
    }

    message.status = 'read';
    message.readAt = new Date().toISOString();
    this.messages.set(messageId, message);

    // Update thread unread count
    const thread = this.threads.get(message.threadId);
    if (thread) {
      thread.unreadCount[agentId] = 0;
      this.threads.set(thread.id, thread);
    }

    return message;
  }

  /**
   * Mark all messages in thread as read
   */
  markThreadAsRead(threadId: string, agentId: string): void {
    const messages = Array.from(this.messages.values()).filter(
      m => m.threadId === threadId && m.recipientId === agentId && m.status !== 'read'
    );

    messages.forEach(m => {
      m.status = 'read';
      m.readAt = new Date().toISOString();
      this.messages.set(m.id, m);
    });

    const thread = this.threads.get(threadId);
    if (thread) {
      thread.unreadCount[agentId] = 0;
      this.threads.set(threadId, thread);
    }
  }

  /**
   * Archive message
   */
  archiveMessage(messageId: string): Message | undefined {
    const message = this.messages.get(messageId);
    if (!message) {
      return undefined;
    }

    message.status = 'archived';
    this.messages.set(messageId, message);
    return message;
  }

  /**
   * Archive thread
   */
  archiveThread(threadId: string): MessageThread | undefined {
    const thread = this.threads.get(threadId);
    if (!thread) {
      return undefined;
    }

    thread.status = 'archived';
    thread.updatedAt = new Date().toISOString();
    this.threads.set(threadId, thread);

    // Archive all messages in thread
    Array.from(this.messages.values())
      .filter(m => m.threadId === threadId)
      .forEach(m => {
        m.status = 'archived';
        this.messages.set(m.id, m);
      });

    return thread;
  }

  /**
   * Pin/unpin thread
   */
  togglePinThread(threadId: string): MessageThread | undefined {
    const thread = this.threads.get(threadId);
    if (!thread) {
      return undefined;
    }

    thread.pinned = !thread.pinned;
    thread.updatedAt = new Date().toISOString();
    this.threads.set(threadId, thread);
    return thread;
  }

  /**
   * Add label to thread
   */
  addLabel(threadId: string, label: string): MessageThread | undefined {
    const thread = this.threads.get(threadId);
    if (!thread) {
      return undefined;
    }

    if (!thread.labels) {
      thread.labels = [];
    }
    if (!thread.labels.includes(label)) {
      thread.labels.push(label);
      thread.updatedAt = new Date().toISOString();
      this.threads.set(threadId, thread);
    }

    return thread;
  }

  /**
   * Remove label from thread
   */
  removeLabel(threadId: string, label: string): MessageThread | undefined {
    const thread = this.threads.get(threadId);
    if (!thread) {
      return undefined;
    }

    if (thread.labels) {
      thread.labels = thread.labels.filter(l => l !== label);
      thread.updatedAt = new Date().toISOString();
      this.threads.set(threadId, thread);
    }

    return thread;
  }

  /**
   * Create notification
   */
  createNotification(data: {
    recipientId: string;
    type: Notification['type'];
    title: string;
    content: string;
    data?: Record<string, unknown>;
  }): Notification {
    const notification: Notification = {
      id: `notif-${uuidv4()}`,
      recipientId: data.recipientId,
      type: data.type,
      title: data.title,
      content: data.content,
      data: data.data,
      read: false,
      createdAt: new Date().toISOString(),
    };

    this.notifications.set(notification.id, notification);
    return notification;
  }

  /**
   * Get notifications for agent
   */
  getNotifications(agentId: string, unreadOnly: boolean = false): Notification[] {
    let notifications = Array.from(this.notifications.values()).filter(
      n => n.recipientId === agentId
    );

    if (unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }

    return notifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Mark notification as read
   */
  markNotificationAsRead(notificationId: string): Notification | undefined {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      return undefined;
    }

    notification.read = true;
    this.notifications.set(notificationId, notification);
    return notification;
  }

  /**
   * Mark all notifications as read
   */
  markAllNotificationsAsRead(agentId: string): number {
    let count = 0;
    this.notifications.forEach(n => {
      if (n.recipientId === agentId && !n.read) {
        n.read = true;
        count++;
      }
    });
    return count;
  }

  /**
   * Get unread notification count
   */
  getUnreadCount(agentId: string): number {
    return Array.from(this.notifications.values()).filter(
      n => n.recipientId === agentId && !n.read
    ).length;
  }

  /**
   * Get unread message count
   */
  getUnreadMessageCount(agentId: string): number {
    return Array.from(this.messages.values()).filter(
      m => m.recipientId === agentId && m.status !== 'read'
    ).length;
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string): boolean {
    return this.notifications.delete(notificationId);
  }

  /**
   * Get communication statistics
   */
  getCommunicationStats(agentId: string): {
    totalMessages: number;
    sentMessages: number;
    receivedMessages: number;
    unreadMessages: number;
    unreadNotifications: number;
    activeThreads: number;
    archivedThreads: number;
  } {
    const messages = Array.from(this.messages.values()).filter(
      m => m.senderId === agentId || m.recipientId === agentId
    );
    const threads = this.getThreadsForParticipant(agentId, true);

    return {
      totalMessages: messages.length,
      sentMessages: messages.filter(m => m.senderId === agentId).length,
      receivedMessages: messages.filter(m => m.recipientId === agentId).length,
      unreadMessages: messages.filter(m => m.recipientId === agentId && m.status !== 'read').length,
      unreadNotifications: this.getUnreadCount(agentId),
      activeThreads: threads.filter(t => t.status === 'active').length,
      archivedThreads: threads.filter(t => t.status === 'archived').length,
    };
  }

  /**
   * Search messages
   */
  searchMessages(agentId: string, query: string, limit: number = 20): Message[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.messages.values())
      .filter(
        m =>
          (m.senderId === agentId || m.recipientId === agentId) &&
          (m.content.toLowerCase().includes(lowerQuery) ||
            m.subject.toLowerCase().includes(lowerQuery))
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  /**
   * Delete message
   */
  deleteMessage(messageId: string): boolean {
    return this.messages.delete(messageId);
  }

  /**
   * Delete thread
   */
  deleteThread(threadId: string): boolean {
    // Delete all messages in thread
    Array.from(this.messages.values())
      .filter(m => m.threadId === threadId)
      .forEach(m => this.messages.delete(m.id));

    return this.threads.delete(threadId);
  }

  /**
   * Broadcast message to multiple recipients
   */
  broadcastMessage(
    senderId: string,
    recipientIds: string[],
    subject: string,
    content: string,
    priority: MessagePriority = 'normal'
  ): Message[] {
    return recipientIds.map(recipientId =>
      this.sendMessage({
        senderId,
        recipientId,
        subject,
        content,
        priority,
      })
    );
  }

  /**
   * Export thread data
   */
  exportThread(threadId: string): Record<string, unknown> | undefined {
    const thread = this.threads.get(threadId);
    if (!thread) {
      return undefined;
    }

    const messages = this.getMessagesForThread(threadId);

    return {
      ...thread,
      messages,
      messageCount: messages.length,
      exportDate: new Date().toISOString(),
    };
  }
}

// Singleton instance
export const communicationService = new CommunicationService();
