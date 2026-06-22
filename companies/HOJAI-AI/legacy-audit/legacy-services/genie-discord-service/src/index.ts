/**
 * GENIE Discord Service - Discord Server Integration for Personal AI
 * Port: 4714
 *
 * Integrates Discord servers with personal memory for AI context.
 * Tracks messages, channels, and provides conversation summaries.
 */

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose, { Schema, model } from 'mongoose';
import rateLimit from 'express-rate-limit';
import { createLogger } from './utils/logger.js';
import { tenantMiddleware, TenantRequest } from './middleware/tenant.js';
import { Client, GatewayIntentBits, TextChannel, Collection, ChannelType, WebhookClient } from 'discord.js';
import { v4 as uuidv4 } from 'uuid';

const SERVICE_NAME = 'genie-discord-service';
const SERVICE_VERSION = '1.0.0';
const PORT = parseInt(process.env.PORT || '4714', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/genie-discord';
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || '';
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';
const logger = createLogger(SERVICE_NAME);

const app = express();

// Discord Client
const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

let botReady = false;

// Middleware
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } } }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(rateLimit({ windowMs: 60000, max: 100, message: { success: false, error: { code: 'RATE_LIMIT' } } }));
app.use(express.json({ limit: '10mb' }));
app.use(compression());
app.use(tenantMiddleware());

// ============================================================================
// DATABASE MODELS
// ============================================================================

const DiscordServerSchema = new Schema({
  serverId: { type: String, required: true, unique: true },
  name: String,
  icon: String,
  description: String,
  memberCount: Number,
  ownerId: String,
  joinedAt: Date,
  userId: String,
  tenantId: String,
  syncedAt: { type: Date, default: Date.now },
});

const DiscordChannelSchema = new Schema({
  channelId: { type: String, required: true, unique: true },
  serverId: String,
  name: String,
  type: String,
  topic: String,
  parentId: String,
  position: Number,
  messageCount: { type: Number, default: 0 },
  userId: String,
  tenantId: String,
  syncedAt: { type: Date, default: Date.now },
});

const DiscordMessageSchema = new Schema({
  messageId: { type: String, required: true, unique: true },
  channelId: String,
  serverId: String,
  authorId: String,
  authorName: String,
  content: String,
  timestamp: Date,
  editedAt: Date,
  attachments: [String],
  embeds: Number,
  reactions: mongoose.Schema.Types.Mixed,
  userId: String,
  tenantId: String,
  indexedAt: { type: Date, default: Date.now },
});

const DiscordSyncSchema = new Schema({
  serverId: String,
  userId: String,
  tenantId: String,
  lastSyncTime: Date,
  channelsProcessed: { type: Number, default: 0 },
  messagesProcessed: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'syncing', 'completed', 'failed'], default: 'pending' },
  error: String,
});

const DiscordWebhookSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  tenantId: String,
  webhookUrl: String,
  channelId: String,
  serverId: String,
  createdAt: { type: Date, default: Date.now },
  lastUsed: Date,
});

export const DiscordServer = model('DiscordServer', DiscordServerSchema);
export const DiscordChannel = model('DiscordChannel', DiscordChannelSchema);
export const DiscordMessage = model('DiscordMessage', DiscordMessageSchema);
export const DiscordSync = model('DiscordSync', DiscordSyncSchema);
export const DiscordWebhook = model('DiscordWebhook', DiscordWebhookSchema);

// ============================================================================
// DISCORD SERVICE
// ============================================================================

class DiscordService {
  private client: typeof discord;
  private webhooks: Collection<string, WebhookClient> = new Collection();

  constructor() {
    this.client = discord;
  }

  isReady(): boolean {
    return botReady;
  }

  async initialize(token: string): Promise<void> {
    if (!token) {
      logger.warn('discord_bot_token_not_configured');
      return;
    }

    this.client.on('ready', () => {
      botReady = true;
      logger.info('discord_bot_ready', { user: this.client.user?.tag });
    });

    this.client.on('messageCreate', async (message) => {
      // Ignore bot messages
      if (message.author.bot) return;

      // Index message to MongoDB
      try {
        await this.indexMessage(message);
      } catch (error) {
        logger.error('message_index_failed', { error, messageId: message.id });
      }
    });

    this.client.on('error', (error) => {
      logger.error('discord_error', { error: error.message });
    });

    await this.client.login(token);
  }

  async indexMessage(message: any): Promise<void> {
    const messageDoc = new DiscordMessage({
      messageId: message.id,
      channelId: message.channelId,
      serverId: message.guildId,
      authorId: message.author.id,
      authorName: message.author.username,
      content: message.content,
      timestamp: message.createdAt,
      editedAt: message.editedAt,
      attachments: message.attachments?.map((a: any) => a.url) || [],
      embeds: message.embeds?.length || 0,
      reactions: message.reactions?.cache?.map((r: any) => ({
        emoji: r.emoji.name,
        count: r.count,
      })) || [],
    });

    await messageDoc.save();

    // Update channel message count
    await DiscordChannel.updateOne(
      { channelId: message.channelId },
      { $inc: { messageCount: 1 } }
    );
  }

  async syncServer(serverId: string, userId: string, tenantId?: string): Promise<{
    channelsProcessed: number;
    messagesProcessed: number;
  }> {
    const guild = await this.client.guilds.fetch(serverId);
    if (!guild) throw new Error('Server not found');

    // Save server info
    await DiscordServer.findOneAndUpdate(
      { serverId },
      {
        serverId,
        name: guild.name,
        icon: guild.iconURL(),
        description: guild.description,
        memberCount: guild.memberCount,
        ownerId: guild.ownerId,
        joinedAt: guild.joinedAt,
        userId,
        tenantId,
        syncedAt: new Date(),
      },
      { upsert: true }
    );

    let channelsProcessed = 0;
    let messagesProcessed = 0;

    // Sync text channels
    const channels = guild.channels.cache.filter(
      (ch) => ch.type === ChannelType.GuildText
    );

    for (const channel of channels.values()) {
      const textChannel = channel as TextChannel;

      // Save channel info
      await DiscordChannel.findOneAndUpdate(
        { channelId: textChannel.id },
        {
          channelId: textChannel.id,
          serverId,
          name: textChannel.name,
          type: 'text',
          topic: textChannel.topic,
          parentId: textChannel.parentId,
          position: textChannel.position,
          userId,
          tenantId,
          syncedAt: new Date(),
        },
        { upsert: true }
      );

      // Sync last 100 messages
      try {
        const messages = await textChannel.messages.fetch({ limit: 100 });
        for (const message of messages.values()) {
          if (!message.author.bot) {
            await this.indexMessage(message);
            messagesProcessed++;
          }
        }
      } catch (error) {
        logger.error('channel_sync_failed', { channelId: textChannel.id, error });
      }

      channelsProcessed++;
    }

    return { channelsProcessed, messagesProcessed };
  }

  async getWebhook(channelId: string): Promise<WebhookClient | null> {
    let webhook = this.webhooks.get(channelId);
    if (webhook) return webhook;

    try {
      const channel = await this.client.channels.fetch(channelId);
      if (channel.type !== ChannelType.GuildText) return null;

      const webhooks = await channel.fetchWebhooks();
      if (webhooks.size > 0) {
        webhook = webhooks.first()!;
        this.webhooks.set(channelId, webhook);
        return webhook;
      }
    } catch (error) {
      logger.error('webhook_fetch_failed', { error });
    }

    return null;
  }

  async sendMessage(channelId: string, content: string): Promise<boolean> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (channel.type !== ChannelType.GuildText) return false;

      await channel.send(content);
      return true;
    } catch (error) {
      logger.error('send_message_failed', { error });
      return false;
    }
  }

  async destroy(): Promise<void> {
    this.client.destroy();
  }
}

const discordService = new DiscordService();

// ============================================================================
// ROUTES
// ============================================================================

// Get bot info
app.get('/api/discord/bot', (req: Request, res: Response) => {
  if (!botReady) {
    return res.status(503).json({ success: false, error: { code: 'BOT_NOT_READY' } });
  }

  res.json({
    success: true,
    data: {
      bot: discord.user?.tag,
      servers: discord.guilds.cache.size,
    },
  });
});

// Get user's servers
app.get('/api/discord/servers', async (req: TenantRequest, res: Response) => {
  try {
    const { userId } = req.tenantContext || {};

    if (!botReady) {
      return res.status(503).json({ success: false, error: { code: 'BOT_NOT_READY' } });
    }

    // Get servers from DB (user's joined servers)
    const servers = await DiscordServer.find({ userId });
    const serverIds = servers.map((s) => s.serverId);

    // Also get from bot
    const botServers = discord.guilds.cache
      .filter((g) => !serverIds.includes(g.id))
      .map((g) => ({
        serverId: g.id,
        name: g.name,
        icon: g.iconURL(),
        memberCount: g.memberCount,
      }));

    res.json({ success: true, data: [...servers, ...botServers] });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Join server
app.post('/api/discord/join/:inviteCode', async (req: TenantRequest, res: Response) => {
  try {
    const { userId } = req.tenantContext || {};
    const { inviteCode } = req.params;

    if (!botReady) {
      return res.status(503).json({ success: false, error: { code: 'BOT_NOT_READY' } });
    }

    const invite = await discord.fetchInvite(inviteCode);
    const guild = invite.guild;

    // Save server
    await DiscordServer.findOneAndUpdate(
      { serverId: guild.id },
      {
        serverId: guild.id,
        name: guild.name,
        icon: guild.iconURL(),
        memberCount: guild.memberCount,
        ownerId: guild.ownerId,
        joinedAt: guild.joinedAt,
        userId,
        syncedAt: new Date(),
      },
      { upsert: true }
    );

    logger.info('server_joined', { userId, serverId: guild.id, serverName: guild.name });
    res.json({ success: true, data: { serverId: guild.id, name: guild.name } });
  } catch (error) {
    logger.error('join_server_failed', { error });
    res.status(400).json({ success: false, error: { code: 'JOIN_FAILED', message: (error as Error).message } });
  }
});

// Sync server
app.post('/api/discord/servers/:serverId/sync', async (req: TenantRequest, res: Response) => {
  try {
    const { userId, tenantId } = req.tenantContext || {};
    const { serverId } = req.params;

    if (!botReady) {
      return res.status(503).json({ success: false, error: { code: 'BOT_NOT_READY' } });
    }

    // Create sync record
    const syncRecord = new DiscordSync({
      serverId,
      userId,
      tenantId,
      status: 'syncing',
    });
    await syncRecord.save();

    const { channelsProcessed, messagesProcessed } = await discordService.syncServer(serverId, userId, tenantId);

    syncRecord.lastSyncTime = new Date();
    syncRecord.channelsProcessed = channelsProcessed;
    syncRecord.messagesProcessed = messagesProcessed;
    syncRecord.status = 'completed';
    await syncRecord.save();

    logger.info('server_synced', { serverId, channelsProcessed, messagesProcessed });
    res.json({ success: true, data: { channelsProcessed, messagesProcessed } });
  } catch (error) {
    logger.error('sync_failed', { error });
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Get channels
app.get('/api/discord/servers/:serverId/channels', async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const channels = await DiscordChannel.find({ serverId });
    res.json({ success: true, data: channels });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Get messages from channel
app.get('/api/discord/channels/:channelId/messages', async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const { limit = 50 } = req.query;

    const messages = await DiscordMessage.find({ channelId })
      .sort({ timestamp: -1 })
      .limit(Number(limit));

    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Search messages
app.get('/api/discord/search', async (req: TenantRequest, res: Response) => {
  try {
    const { userId } = req.tenantContext || {};
    const { q, serverId, channelId } = req.query;

    let query: any = { userId };

    if (serverId) query.serverId = serverId;
    if (channelId) query.channelId = channelId;
    if (q) query.content = { $regex: q, $options: 'i' };

    const messages = await DiscordMessage.find(query)
      .sort({ timestamp: -1 })
      .limit(100);

    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Send message (via bot)
app.post('/api/discord/channels/:channelId/send', async (req: TenantRequest, res: Response) => {
  try {
    const { channelId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_CONTENT' } });
    }

    const sent = await discordService.sendMessage(channelId, content);
    if (!sent) {
      return res.status(400).json({ success: false, error: { code: 'SEND_FAILED' } });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Set up webhook for sending messages
app.post('/api/discord/webhooks', async (req: TenantRequest, res: Response) => {
  try {
    const { userId, tenantId } = req.tenantContext || {};
    const { channelId, webhookUrl } = req.body;

    const webhook = new WebhookClient({ url: webhookUrl });
    await webhook.fetch();

    await DiscordWebhook.findOneAndUpdate(
      { userId },
      {
        userId,
        tenantId,
        webhookUrl,
        channelId,
        lastUsed: new Date(),
      },
      { upsert: true }
    );

    logger.info('webhook_configured', { userId, channelId });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'WEBHOOK_INVALID', message: (error as Error).message } });
  }
});

// Memory context - Get recent conversations for AI
app.get('/api/discord/memory/context', async (req: TenantRequest, res: Response) => {
  try {
    const { userId } = req.tenantContext || {};
    const { limit = 10 } = req.query;

    const messages = await DiscordMessage.aggregate([
      { $match: { userId } },
      { $sort: { timestamp: -1 } },
      { $group: {
        _id: '$channelId',
        serverName: { $first: '$serverId' },
        lastMessage: { $first: '$content' },
        lastAuthor: { $first: '$authorName' },
        lastTime: { $first: '$timestamp' },
        messageCount: { $sum: 1 },
      }},
      { $sort: { lastTime: -1 } },
      { $limit: Number(limit) },
    ]);

    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Health endpoints
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: SERVICE_VERSION });
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  const mongoState = mongoose.connection.readyState;
  res.json({
    status: mongoState === 1 && botReady ? 'ready' : 'not_ready',
    checks: {
      mongodb: mongoState === 1 ? 'connected' : 'disconnected',
      discord: botReady ? 'ready' : 'not_configured',
    }
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('unhandled_error', { error: err.message });
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
});

// ============================================================================
// STARTUP
// ============================================================================

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('mongodb_connected');

    if (DISCORD_BOT_TOKEN) {
      await discordService.initialize(DISCORD_BOT_TOKEN);
    }

    app.listen(PORT, () => {
      console.log(`\n  ╔════════════════════════════════════════════╗`);
      console.log(`  ║   GENIE Discord Service (v${SERVICE_VERSION})      ║`);
      console.log(`  ║   Port: ${PORT}                             ║`);
      console.log(`  ║   Discord: ${botReady ? 'Connected ✓' : 'Not Configured'}      ║`);
      console.log(`  ║   "You don't use Genie. You talk to Genie." ║`);
      console.log(`  ╚════════════════════════════════════════════╝\n`);
    });
  } catch (error) {
    logger.error('start_failed', { error });
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await discordService.destroy();
  await mongoose.connection.close();
  process.exit(0);
});

start();

export default app;
