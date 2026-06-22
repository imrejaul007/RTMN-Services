/**
 * GENIE Slack Service - Business Logic
 */
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger.js';
const logger = createLogger('slack-service');

const channels = new Map<string, any>();
const messages = new Map<string, any>();

export async function getChannels(userId: string) {
  logger.info('get_channels', { userId });
  return Array.from(channels.values()).filter(c => c.user_id === userId);
}

export async function getChannel(channelId: string, userId: string) {
  const channel = channels.get(channelId);
  if (!channel || channel.user_id !== userId) return null;
  return channel;
}

export async function createChannel(userId: string, input: { name: string; type?: string }) {
  const channel = {
    id: uuidv4(), user_id: userId, name: input.name,
    type: input.type || 'public', member_count: 1, is_archived: false,
    created_at: new Date().toISOString()
  };
  channels.set(channel.id, channel);
  logger.info('channel_created', { channelId: channel.id, userId });
  return channel;
}

export async function getMessages(channelId: string, userId: string, limit = 50) {
  return Array.from(messages.values())
    .filter(m => m.channel_id === channelId && m.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

export async function sendMessage(channelId: string, userId: string, text: string) {
  const message = {
    id: uuidv4(), user_id: userId, channel_id: channelId,
    text, created_at: new Date().toISOString(), ts: Date.now().toString()
  };
  messages.set(message.id, message);
  logger.info('message_sent', { messageId: message.id, userId });
  return message;
}

export async function searchMessages(userId: string, query: string) {
  const q = query.toLowerCase();
  return Array.from(messages.values())
    .filter(m => m.user_id === userId && m.text.toLowerCase().includes(q));
}
