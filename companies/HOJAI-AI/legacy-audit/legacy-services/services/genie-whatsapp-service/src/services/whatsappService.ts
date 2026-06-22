/**
 * GENIE WhatsApp Service - Business Logic
 * Version: 1.0.0 | Date: June 13, 2026
 */

import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger.js';
import {
  WhatsAppMessage,
  WhatsAppChat,
  WhatsAppStatus,
} from '../types.js';

const logger = createLogger('whatsapp-service');

// In-memory storage
const messages = new Map<string, WhatsAppMessage>();
const chats = new Map<string, WhatsAppChat>();
const statuses = new Map<string, WhatsAppStatus>();

export async function getChats(userId: string): Promise<WhatsAppChat[]> {
  logger.info('get_chats', { userId });
  return Array.from(chats.values())
    .filter(c => c.user_id === userId)
    .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
}

export async function getChat(chatId: string, userId: string): Promise<WhatsAppChat | null> {
  const chat = chats.get(chatId);
  if (!chat || chat.user_id !== userId) return null;
  return chat;
}

export async function createChat(
  userId: string,
  input: { name: string; phone: string; is_group?: boolean; participants?: { phone: string; name: string }[] }
): Promise<WhatsAppChat> {
  const chat: WhatsAppChat = {
    id: uuidv4(),
    user_id: userId,
    name: input.name,
    phone: input.phone,
    is_group: input.is_group || false,
    participants: input.participants?.map(p => ({
      user_id: uuidv4(),
      name: p.name,
      phone: p.phone,
      is_admin: true,
    })),
    unread_count: 0,
    last_message_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  chats.set(chat.id, chat);
  logger.info('chat_created', { chatId: chat.id, userId });

  return chat;
}

export async function getMessages(
  userId: string,
  chatId: string,
  query: { page?: number; pageSize?: number; before?: string }
): Promise<{ messages: WhatsAppMessage[]; total: number }> {
  const chat = chats.get(chatId);
  if (!chat || chat.user_id !== userId) {
    return { messages: [], total: 0 };
  }

  let chatMessages = Array.from(messages.values())
    .filter(m => m.chat_id === chatId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (query.before) {
    chatMessages = chatMessages.filter(m => new Date(m.timestamp) < new Date(query.before!));
  }

  const total = chatMessages.length;
  const page = query.page || 1;
  const pageSize = query.pageSize || 50;
  const start = (page - 1) * pageSize;
  const paginated = chatMessages.slice(start, start + pageSize);

  return { messages: paginated, total };
}

export async function sendMessage(
  userId: string,
  chatId: string,
  input: {
    to: string;
    type: WhatsAppMessage['type'];
    content: string;
    media_url?: string;
    caption?: string;
  }
): Promise<WhatsAppMessage> {
  const chat = chats.get(chatId);
  if (!chat || chat.user_id !== userId) {
    throw new Error('Chat not found');
  }

  const message: WhatsAppMessage = {
    id: uuidv4(),
    user_id: userId,
    chat_id: chatId,
    from: chat.phone,
    to: input.to,
    type: input.type,
    content: input.content,
    media_url: input.media_url,
    caption: input.caption,
    read: true,
    delivered: false,
    timestamp: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  messages.set(message.id, message);

  // Update chat
  chat.last_message_at = message.timestamp;
  chat.updated_at = new Date().toISOString();
  chats.set(chatId, chat);

  logger.info('message_sent', { messageId: message.id, userId, chatId });

  return message;
}

export async function markAsRead(chatId: string, userId: string): Promise<boolean> {
  const chat = chats.get(chatId);
  if (!chat || chat.user_id !== userId) return false;

  chat.unread_count = 0;
  chat.updated_at = new Date().toISOString();
  chats.set(chatId, chat);

  // Mark all messages as read
  messages.forEach((msg, id) => {
    if (msg.chat_id === chatId && !msg.read) {
      msg.read = true;
      messages.set(id, msg);
    }
  });

  logger.info('chat_marked_read', { chatId, userId });
  return true;
}

export async function getStatuses(userId: string): Promise<WhatsAppStatus[]> {
  return Array.from(statuses.values())
    .filter(s => s.user_id === userId)
    .sort((a, b) => new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime());
}

export async function postStatus(
  userId: string,
  input: { content: string; media_url?: string; expires_hours?: number }
): Promise<WhatsAppStatus> {
  const status: WhatsAppStatus = {
    id: uuidv4(),
    user_id: userId,
    posted_by: userId,
    content: input.content,
    media_url: input.media_url,
    views: 0,
    posted_at: new Date().toISOString(),
    expires_at: input.expires_hours
      ? new Date(Date.now() + input.expires_hours * 60 * 60 * 1000).toISOString()
      : undefined,
  };

  statuses.set(status.id, status);
  logger.info('status_posted', { statusId: status.id, userId });

  return status;
}

export async function deleteChat(chatId: string, userId: string): Promise<boolean> {
  const chat = chats.get(chatId);
  if (!chat || chat.user_id !== userId) return false;

  chats.delete(chatId);
  logger.info('chat_deleted', { chatId, userId });

  return true;
}

export async function archiveChat(chatId: string, userId: string): Promise<boolean> {
  const chat = chats.get(chatId);
  if (!chat || chat.user_id !== userId) return false;

  chat.updated_at = new Date().toISOString();
  chats.set(chatId, chat);

  logger.info('chat_archived', { chatId, userId });
  return true;
}
