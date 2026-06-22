/**
 * GENIE Discord Service - Business Logic
 */
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger.js';
const logger = createLogger('discord-service');

const servers = new Map<string, any>();
const channels = new Map<string, any>();
const messages = new Map<string, any>();

export async function getServers(userId: string) {
  logger.info('get_servers', { userId });
  return Array.from(servers.values()).filter(s => s.user_id === userId);
}

export async function getChannels(serverId: string, userId: string) {
  return Array.from(channels.values()).filter(c => c.server_id === serverId);
}

export async function getMessages(channelId: string, userId: string, limit = 50) {
  return Array.from(messages.values())
    .filter(m => m.channel_id === channelId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

export async function sendMessage(channelId: string, userId: string, content: string) {
  const msg = { id: uuidv4(), user_id: userId, channel_id: channelId, content, author: userId, timestamp: new Date().toISOString() };
  messages.set(msg.id, msg);
  logger.info('message_sent', { messageId: msg.id, userId });
  return msg;
}
