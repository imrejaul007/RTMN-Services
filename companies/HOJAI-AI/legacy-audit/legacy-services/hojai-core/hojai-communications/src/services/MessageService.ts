import { v4 as uuidv4 } from 'uuid';
import { Message, Template, Campaign, Subscriber, ChannelConfig } from '../models';

export class MessageService {
  async send(data: {
    tenantId: string;
    channel: string;
    recipient: string;
    subject?: string;
    body: string;
    type?: string;
    priority?: string;
    media?: any;
    templateId?: string;
    templateVariables?: Record<string, any>;
    scheduledAt?: Date;
    tags?: string[];
    metadata?: Record<string, any>;
  }): Promise<Message> {
    const messageId = `msg_${uuidv4()}`;

    const message = new Message({
      messageId,
      tenantId: data.tenantId,
      channel: data.channel,
      recipient: data.recipient,
      type: data.type || 'transactional',
      priority: data.priority || 'normal',
      subject: data.subject,
      body: data.body,
      media: data.media,
      templateId: data.templateId,
      templateVariables: data.templateVariables,
      status: data.scheduledAt ? 'queued' : 'pending',
      scheduledAt: data.scheduledAt,
      tags: data.tags,
      metadata: data.metadata,
      currency: 'INR'
    });

    await message.save();

    // Simulate sending (in production, integrate with actual providers)
    if (!data.scheduledAt) {
      setTimeout(() => this.simulateSend(messageId), 100);
    }

    return message;
  }

  async sendTemplate(data: {
    tenantId: string;
    channel: string;
    recipient: string;
    templateId: string;
    variables?: Record<string, any>;
  }): Promise<Message> {
    const template = await Template.findOne({ templateId: data.templateId, tenantId: data.tenantId });
    if (!template) {
      throw new Error('Template not found');
    }

    let body = template.body;
    if (data.variables) {
      for (const [key, value] of Object.entries(data.variables)) {
        body = body.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      }
    }

    // Update template usage
    template.usageCount++;
    template.lastUsedAt = new Date();
    await template.save();

    return this.send({
      tenantId: data.tenantId,
      channel: data.channel,
      recipient: data.recipient,
      subject: template.subject,
      body,
      templateId: data.templateId,
      templateVariables: data.variables
    });
  }

  async get(messageId: string, tenantId: string): Promise<Message | null> {
    return Message.findOne({ messageId, tenantId });
  }

  async list(
    tenantId: string,
    options: { channel?: string; status?: string; limit?: number; offset?: number } = {}
  ): Promise<{ messages: Message[]; total: number }> {
    const query: any = { tenantId };
    if (options.channel) query.channel = options.channel;
    if (options.status) query.status = options.status;

    const limit = options.limit || 100;
    const offset = options.offset || 0;

    const [messages, total] = await Promise.all([
      Message.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit),
      Message.countDocuments(query)
    ]);

    return { messages, total };
  }

  async updateStatus(
    messageId: string,
    status: string,
    additionalData?: any
  ): Promise<Message | null> {
    const updates: any = { status };

    switch (status) {
      case 'sent': updates.sentAt = new Date(); break;
      case 'delivered': updates.deliveredAt = new Date(); break;
      case 'read': updates.readAt = new Date(); updates.opened = true; break;
      case 'failed': updates.failedAt = new Date(); break;
    }

    if (additionalData) {
      Object.assign(updates, additionalData);
    }

    return Message.findOneAndUpdate({ messageId }, updates, { new: true });
  }

  async getStats(tenantId: string, channel?: string): Promise<any> {
    const match: any = { tenantId };
    if (channel) match.channel = channel;

    const stats = await Message.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result: any = { total: 0 };
    stats.forEach((s) => {
      result[s._id] = s.count;
      result.total += s.count;
    });

    return result;
  }

  private async simulateSend(messageId: string): Promise<void> {
    await this.updateStatus(messageId, 'sent');
    // Simulate delivery after 1 second
    setTimeout(async () => {
      await this.updateStatus(messageId, 'delivered');
    }, 1000);
  }
}

export const messageService = new MessageService();

export class TemplateService {
  async create(data: {
    tenantId: string;
    name: string;
    channel: string;
    category: string;
    body: string;
    subject?: string;
    variables?: any[];
    whatsappHeader?: string;
    whatsappFooter?: string;
  }): Promise<Template> {
    const template = new Template({
      templateId: `tpl_${uuidv4()}`,
      ...data,
      status: 'active'
    });

    await template.save();
    return template;
  }

  async get(templateId: string, tenantId: string): Promise<Template | null> {
    return Template.findOne({ templateId, tenantId });
  }

  async list(
    tenantId: string,
    options: { channel?: string; category?: string; status?: string } = {}
  ): Promise<{ templates: Template[]; total: number }> {
    const query: any = { tenantId };
    if (options.channel) query.channel = options.channel;
    if (options.category) query.category = options.category;
    if (options.status) query.status = options.status;

    const [templates, total] = await Promise.all([
      Template.find(query).sort({ createdAt: -1 }),
      Template.countDocuments(query)
    ]);

    return { templates, total };
  }

  async update(templateId: string, tenantId: string, updates: any): Promise<Template | null> {
    return Template.findOneAndUpdate({ templateId, tenantId }, updates, { new: true });
  }

  async delete(templateId: string, tenantId: string): Promise<boolean> {
    const result = await Template.deleteOne({ templateId, tenantId });
    return result.deletedCount > 0;
  }
}

export const templateService = new TemplateService();

export class CampaignService {
  async create(data: {
    tenantId: string;
    name: string;
    channel: string;
    body: string;
    subject?: string;
    templateId?: string;
    segmentIds: string[];
    scheduledAt?: Date;
    abTest?: any;
  }): Promise<Campaign> {
    const campaign = new Campaign({
      campaignId: `camp_${uuidv4()}`,
      ...data,
      status: data.scheduledAt ? 'scheduled' : 'draft',
      stats: {
        sent: 0,
        delivered: 0,
        failed: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
        unsubscribed: 0,
        complained: 0
      }
    });

    await campaign.save();
    return campaign;
  }

  async get(campaignId: string, tenantId: string): Promise<Campaign | null> {
    return Campaign.findOne({ campaignId, tenantId });
  }

  async list(
    tenantId: string,
    options: { channel?: string; status?: string; limit?: number; offset?: number } = {}
  ): Promise<{ campaigns: Campaign[]; total: number }> {
    const query: any = { tenantId };
    if (options.channel) query.channel = options.channel;
    if (options.status) query.status = options.status;

    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const [campaigns, total] = await Promise.all([
      Campaign.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit),
      Campaign.countDocuments(query)
    ]);

    return { campaigns, total };
  }

  async start(campaignId: string, tenantId: string): Promise<Campaign | null> {
    const campaign = await Campaign.findOneAndUpdate(
      { campaignId, tenantId, status: { $in: ['draft', 'scheduled'] } },
      { status: 'sending', startedAt: new Date() },
      { new: true }
    );

    if (campaign) {
      // Simulate sending
      setTimeout(() => this.simulateCampaign(campaignId, tenantId), 100);
    }

    return campaign;
  }

  async pause(campaignId: string, tenantId: string): Promise<Campaign | null> {
    return Campaign.findOneAndUpdate(
      { campaignId, tenantId, status: 'sending' },
      { status: 'paused' },
      { new: true }
    );
  }

  async cancel(campaignId: string, tenantId: string): Promise<Campaign | null> {
    return Campaign.findOneAndUpdate(
      { campaignId, tenantId, status: { $in: ['draft', 'scheduled', 'sending', 'paused'] } },
      { status: 'cancelled' },
      { new: true }
    );
  }

  async updateStats(campaignId: string, stats: any): Promise<Campaign | null> {
    return Campaign.findOneAndUpdate({ campaignId }, { stats }, { new: true });
  }

  private async simulateCampaign(campaignId: string, tenantId: string): Promise<void> {
    await Campaign.findOneAndUpdate(
      { campaignId, tenantId },
      {
        status: 'completed',
        completedAt: new Date(),
        'stats.sent': 100,
        'stats.delivered': 95,
        'stats.failed': 5,
        'stats.opened': 38,
        'stats.clicked': 12
      }
    );
  }
}

export const campaignService = new CampaignService();

export class SubscriberService {
  async create(data: {
    tenantId: string;
    email?: string;
    phone?: string;
    channels?: string[];
    tags?: string[];
  }): Promise<Subscriber> {
    const subscriber = new Subscriber({
      subscriberId: `sub_${uuidv4()}`,
      ...data,
      subscribed: true,
      tags: data.tags || [],
      segments: []
    });

    await subscriber.save();
    return subscriber;
  }

  async get(subscriberId: string, tenantId: string): Promise<Subscriber | null> {
    return Subscriber.findOne({ subscriberId, tenantId });
  }

  async findByEmail(email: string, tenantId: string): Promise<Subscriber | null> {
    return Subscriber.findOne({ email, tenantId });
  }

  async findByPhone(phone: string, tenantId: string): Promise<Subscriber | null> {
    return Subscriber.findOne({ phone, tenantId });
  }

  async unsubscribe(subscriberId: string, tenantId: string, channel?: string): Promise<Subscriber | null> {
    const update: any = { subscribed: false, unsubscribedAt: new Date() };
    if (channel) {
      update.$addToSet = { unsubscribedChannels: channel };
    }
    return Subscriber.findOneAndUpdate({ subscriberId, tenantId }, update, { new: true });
  }

  async list(
    tenantId: string,
    options: { segment?: string; tag?: string; subscribed?: boolean } = {}
  ): Promise<{ subscribers: Subscriber[]; total: number }> {
    const query: any = { tenantId };
    if (options.segment) query.segments = options.segment;
    if (options.tag) query.tags = options.tag;
    if (options.subscribed !== undefined) query.subscribed = options.subscribed;

    const [subscribers, total] = await Promise.all([
      Subscriber.find(query).sort({ createdAt: -1 }).limit(100),
      Subscriber.countDocuments(query)
    ]);

    return { subscribers, total };
  }
}

export const subscriberService = new SubscriberService();
