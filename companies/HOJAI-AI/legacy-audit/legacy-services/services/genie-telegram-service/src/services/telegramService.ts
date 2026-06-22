/**
 * GENIE Telegram Service - Business Logic
 */
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger.js';
const logger = createLogger('telegram-service');

const chats = new Map<string, any>();
const messages = new Map<string, any>();

export async function getChats(userId: string) {
  logger.info('get_chats', { userId });
  return Array.from(chats.values()).filter(c => c.user_id === userId);
}

export async function getChat(chatId: string, userId: string) {
  const chat = chats.get(chatId);
  if (!chat || chat.user_id !== userId) return null;
  return chat;
}

export async function createChat(userId: string, input: { name: string; type: string; telegram_id: string }) {
  const chat = {
    id: uuidv4(), user_id: userId, name: input.name,
    type: input.type || 'private', telegram_id: input.telegram_id,
    last_message_at: new Date().toISOString(), created_at: new Date().toISOString()
  };
  chats.set(chat.id, chat);
  logger.info('chat_created', { chatId: chat.id, userId });
  return chat;
}

export async function sendMessage(chatId: string, userId: string, text: string) {
  const message = {
    id: uuidv4(), user_id: userId, chat_id: chatId,
    text, type: 'text', from: userId,
    date: new Date().toISOString()
  };
  messages.set(message.id, message);
  logger.info('message_sent', { messageId: message.id, userId });
  return message;
}

export async function getMessages(chatId: string, userId: string, limit = 50) {
  return Array.from(messages.values())
    .filter(m => m.chat_id === chatId && m.user_id === userId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}
