/**
 * GENIE Discord Service - Genie Integration
 */
import { getDiscordService, GenieDiscordService } from './discordService.js';
import { DiscordServer, DiscordUser, DiscordMessage } from '../models/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('genie-discord-service');

export class GenieDiscordService {
  private discordService: GenieDiscordService;

  constructor() { this.discordService = getDiscordService(); }

  async linkServer(tenantId: string, guildId: string, guildName: string, linkedUserId?: string): Promise<IDiscordServer> {
    const server = await DiscordServer.findOneAndUpdate(
      { tenant_id: tenantId, guild_id: guildId },
      { tenant_id: tenantId, guild_id: guildId, guild_name: guildName, linked_user_id: linkedUserId, linked_at: new Date() },
      { upsert: true, new: true }
    );
    logger.info('server_linked', { tenantId, guildId });
    return server;
  }

  async syncServer(tenantId: string, guildId: string): Promise<{ users: number; channels: number }> {
    const guilds = await this.discordService.getGuilds();
    const guild = guilds.find(g => g.id === guildId);
    if (!guild) throw new Error('Guild not found');

    const members = await this.discordService.getMembers(guildId);
    for (const member of members) {
      await DiscordUser.findOneAndUpdate(
        { tenant_id: tenantId, guild_id: guildId, discord_user_id: member.user.id },
        {
          tenant_id: tenantId, guild_id: guildId, discord_user_id: member.user.id,
          discord_username: member.user.username, display_name: member.displayName,
          avatar_url: member.user.avatarURL() || undefined, roles: member.roles.cache.map(r => r.id),
          is_bot: member.user.bot, last_seen: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    await DiscordServer.updateOne({ tenant_id: tenantId, guild_id: guildId }, { last_sync: new Date() });
    logger.info('server_synced', { tenantId, guildId, users: members.length });
    return { users: members.length, channels: 0 };
  }

  async processMessage(tenantId: string, guildId: string, channelId: string, data: {
    messageId: string; authorId: string; content: string; timestamp: number;
    threadId?: string; embeds?: any[]; attachments?: any[];
  }): Promise<IDiscordMessage> {
    const user = await DiscordUser.findOne({ tenant_id: tenantId, guild_id: guildId, discord_user_id: data.authorId });

    const message = await DiscordMessage.create({
      tenant_id: tenantId, guild_id: guildId, channel_id: channelId,
      discord_message_id: data.messageId, author_id: user?.linked_user_id || 'anonymous',
      content: data.content, embeds: data.embeds, attachments: data.attachments,
      thread_id: data.threadId, is_thread: !!data.threadId,
      direction: 'incoming', timestamp: new Date(data.timestamp),
    });

    if (user) { user.last_seen = new Date(); await user.save(); }
    return message;
  }

  async sendMessage(tenantId: string, guildId: string, channelId: string, content: string): Promise<boolean> {
    const result = await this.discordService.sendMessage(guildId, channelId, content);
    return !!result;
  }

  async getMessages(tenantId: string, guildId: string, channelId: string, limit: number = 50): Promise<IDiscordMessage[]> {
    return DiscordMessage.find({ tenant_id: tenantId, guild_id: guildId, channel_id: channelId })
      .sort({ timestamp: -1 }).limit(limit);
  }

  async searchMessages(tenantId: string, guildId: string, query: string, limit: number = 50): Promise<IDiscordMessage[]> {
    return DiscordMessage.find({
      tenant_id: tenantId, guild_id: guildId, content: { $regex: query, $options: 'i' },
    }).sort({ timestamp: -1 }).limit(limit);
  }

  async getServerStats(tenantId: string, guildId: string): Promise<{ totalMessages: number; totalMembers: number }> {
    const messageCount = await DiscordMessage.countDocuments({ tenant_id: tenantId, guild_id: guildId });
    const memberCount = await DiscordUser.countDocuments({ tenant_id: tenantId, guild_id: guildId });
    return { totalMessages: messageCount, totalMembers: memberCount };
  }
}

let instance: GenieDiscordService | null = null;
export function getGenieDiscordService(): GenieDiscordService {
  if (!instance) instance = new GenieDiscordService();
  return instance;
}
