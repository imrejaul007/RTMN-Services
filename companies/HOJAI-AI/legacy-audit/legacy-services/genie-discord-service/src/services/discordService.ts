/**
 * GENIE Discord Service - Discord.js Integration
 */
import { Client, GatewayIntentBits, TextBasedChannel, Message, Guild, GuildMember } from 'discord.js';
import { createLogger } from '../utils/logger.js';
import { DiscordServer, DiscordUser, DiscordMessage, IDiscordServer, IDiscordUser, IDiscordMessage } from '../models/index.js';

const logger = createLogger('discord-service');

export class GenieDiscordService {
  private client: Client | null = null;
  private readonly intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ];

  async initialize(token: string): Promise<boolean> {
    try {
      this.client = new Client({ intents: this.intents });
      await this.client.login(token);
      this.client.on('ready', () => logger.info('discord_ready', { user: this.client?.user?.tag }));
      this.client.on('messageCreate', (msg) => this.handleMessage(msg));
      return true;
    } catch (error) {
      logger.error('discord_init_failed', { error });
      return false;
    }
  }

  private async handleMessage(message: Message): Promise<void> {
    if (message.author.bot) return;
    logger.info('message_received', { guildId: message.guildId, channelId: message.channelId, author: message.author.username });
    // Store message logic would go here
  }

  async getGuilds(): Promise<Array<{ id: string; name: string; icon?: string }>> {
    if (!this.client?.user) return [];
    return this.client.guilds.cache.map(g => ({ id: g.id, name: g.name, icon: g.iconURL() || undefined }));
  }

  async getGuild(guildId: string): Promise<Guild | undefined> {
    return this.client?.guilds.cache.get(guildId);
  }

  async getChannel(guildId: string, channelId: string): Promise<TextBasedChannel | undefined> {
    const guild = await this.getGuild(guildId);
    return guild?.channels.cache.get(channelId) as TextBasedChannel | undefined;
  }

  async sendMessage(guildId: string, channelId: string, content: string): Promise<string | null> {
    const channel = await this.getChannel(guildId, channelId);
    if (!channel?.isTextBased()) return null;
    try {
      const msg = await channel.send(content);
      return msg.id;
    } catch (error) {
      logger.error('send_message_failed', { error });
      return null;
    }
  }

  async getMessages(guildId: string, channelId: string, limit: number = 50): Promise<Message[]> {
    const channel = await this.getChannel(guildId, channelId);
    if (!channel?.isTextBased()) return [];
    try {
      return await channel.messages.fetch({ limit });
    } catch (error) {
      logger.error('get_messages_failed', { error });
      return [];
    }
  }

  async getMembers(guildId: string): Promise<GuildMember[]> {
    const guild = await this.getGuild(guildId);
    return guild?.members.cache.map(m => m) || [];
  }

  isReady(): boolean { return this.client?.isReady() || false; }

  async destroy(): Promise<void> {
    await this.client?.destroy();
    this.client = null;
  }
}

let instance: GenieDiscordService | null = null;
export function getDiscordService(): GenieDiscordService {
  if (!instance) instance = new GenieDiscordService();
  return instance;
}
