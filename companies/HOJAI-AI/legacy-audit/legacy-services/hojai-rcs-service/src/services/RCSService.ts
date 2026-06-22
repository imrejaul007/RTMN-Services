import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { RCSMessage, RCSBrand, RCSCampaign } from '../models';

export class RCSService {
  private provider: string;
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.provider = process.env.RCS_PROVIDER || 'jio';
    this.apiKey = process.env.JIO_RCS_API_KEY || '';
    this.apiSecret = process.env.JIO_RCS_API_SECRET || '';
  }

  /**
   * Send RCS text message
   */
  async sendText(to: string, text: string, options: {
    tenantId: string;
    brandId?: string;
    brandName?: string;
    metadata?: Record<string, any>;
  }): Promise<{ messageId: string; providerId: string }> {
    return this.send({
      tenantId: options.tenantId,
      provider: this.provider as any,
      recipient: to,
      type: 'text',
      text,
      brandId: options.brandId,
      brandName: options.brandName,
      metadata: options.metadata
    });
  }

  /**
   * Send RCS card
   */
  async sendCard(to: string, card: {
    title: string;
    description?: string;
    mediaUrl?: string;
    actions: Array<{ id: string; label: string; type: string; value: string }>;
  }, options: {
    tenantId: string;
    brandId?: string;
    brandName?: string;
  }): Promise<{ messageId: string; providerId: string }> {
    return this.send({
      tenantId: options.tenantId,
      provider: this.provider as any,
      recipient: to,
      type: 'card',
      card,
      brandId: options.brandId,
      brandName: options.brandName
    });
  }

  /**
   * Send RCS carousel
   */
  async sendCarousel(to: string, cards: any[], options: {
    tenantId: string;
    brandId?: string;
    brandName?: string;
  }): Promise<{ messageId: string; providerId: string }> {
    return this.send({
      tenantId: options.tenantId,
      provider: this.provider as any,
      recipient: to,
      type: 'carousel',
      carousel: { cards },
      brandId: options.brandId,
      brandName: options.brandName
    });
  }

  /**
   * Send RCS message with suggestions
   */
  async sendWithSuggestions(to: string, text: string, suggestions: Array<{
    type: string;
    label: string;
    value?: string;
  }>, options: {
    tenantId: string;
    brandId?: string;
    brandName?: string;
  }): Promise<{ messageId: string; providerId: string }> {
    return this.send({
      tenantId: options.tenantId,
      provider: this.provider as any,
      recipient: to,
      type: 'text',
      text,
      suggestions,
      brandId: options.brandId,
      brandName: options.brandName
    });
  }

  /**
   * Generic send method
   */
  async send(data: {
    tenantId: string;
    provider: string;
    recipient: string;
    type: string;
    text?: string;
    mediaUrl?: string;
    mediaMimeType?: string;
    card?: any;
    carousel?: any;
    suggestions?: any[];
    location?: any;
    brandId?: string;
    brandName?: string;
    metadata?: Record<string, any>;
  }): Promise<{ messageId: string; providerId: string }> {
    const messageId = `rcs_${uuidv4()}`;

    // Store message
    const message = new RCSMessage({
      messageId,
      tenantId: data.tenantId,
      provider: data.provider,
      recipient: data.recipient,
      type: data.type,
      text: data.text,
      mediaUrl: data.mediaUrl,
      card: data.card,
      carousel: data.carousel,
      suggestions: data.suggestions,
      location: data.location,
      brandId: data.brandId,
      brandName: data.brandName,
      status: 'pending',
      metadata: data.metadata
    });

    await message.save();

    try {
      // Send to provider (simulated for demo)
      const providerId = await this.sendToProvider(data);

      // Update status
      message.status = 'sent';
      message.sentAt = new Date();
      message.providerMessageId = providerId;
      await message.save();

      // Simulate delivery
      setTimeout(async () => {
        await this.updateStatus(messageId, 'delivered');
      }, 1000);

      return { messageId, providerId };
    } catch (error: any) {
      message.status = 'failed';
      message.errorMessage = error.message;
      message.failedAt = new Date();
      await message.save();
      throw error;
    }
  }

  /**
   * Send to RCS provider (Jio/Airtel/Vi)
   */
  private async sendToProvider(data: any): Promise<string> {
    // In production, this would call the actual RCS provider API
    // For now, simulate a successful send
    const providerId = `rcs_${uuidv4()}`;

    console.log(`[RCS] Sending ${data.type} to ${data.recipient} via ${data.provider}`);

    return providerId;
  }

  /**
   * Update message status
   */
  async updateStatus(messageId: string, status: string): Promise<void> {
    const update: any = { status };

    switch (status) {
      case 'delivered':
        update.deliveredAt = new Date();
        break;
      case 'read':
        update.readAt = new Date();
        break;
      case 'failed':
        update.failedAt = new Date();
        break;
    }

    await RCSMessage.findOneAndUpdate({ messageId }, update);
  }

  /**
   * Get message
   */
  async getMessage(messageId: string, tenantId: string): Promise<any> {
    return RCSMessage.findOne({ messageId, tenantId });
  }

  /**
   * List messages
   */
  async listMessages(tenantId: string, options: {
    status?: string;
    provider?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ messages: any[]; total: number }> {
    const query: any = { tenantId };
    if (options.status) query.status = options.status;
    if (options.provider) query.provider = options.provider;

    const limit = options.limit || 100;
    const offset = options.offset || 0;

    const [messages, total] = await Promise.all([
      RCSMessage.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit),
      RCSMessage.countDocuments(query)
    ]);

    return { messages, total };
  }

  // ============ BRANDS ============

  /**
   * Create brand
   */
  async createBrand(data: {
    tenantId: string;
    name: string;
    logoUrl?: string;
    vertical: string;
    website?: string;
  }): Promise<any> {
    const brand = new RCSBrand({
      brandId: `brand_${uuidv4()}`,
      ...data
    });

    await brand.save();
    return brand;
  }

  /**
   * Get brand
   */
  async getBrand(brandId: string, tenantId: string): Promise<any> {
    return RCSBrand.findOne({ brandId, tenantId });
  }

  /**
   * List brands
   */
  async listBrands(tenantId: string): Promise<any[]> {
    return RCSBrand.find({ tenantId, enabled: true });
  }

  // ============ CAMPAIGNS ============

  /**
   * Create campaign
   */
  async createCampaign(data: {
    tenantId: string;
    name: string;
    content: any;
    brandId: string;
    segmentIds: string[];
    scheduledAt?: Date;
  }): Promise<any> {
    const campaign = new RCSCampaign({
      campaignId: `rcsc_${uuidv4()}`,
      ...data,
      recipientCount: 0,
      stats: { sent: 0, delivered: 0, read: 0, failed: 0, clicked: 0 }
    });

    await campaign.save();
    return campaign;
  }

  /**
   * Start campaign
   */
  async startCampaign(campaignId: string, tenantId: string): Promise<any> {
    const campaign = await RCSCampaign.findOneAndUpdate(
      { campaignId, tenantId, status: { $in: ['draft', 'scheduled'] } },
      { status: 'sending', startedAt: new Date() },
      { new: true }
    );

    if (campaign) {
      // Simulate sending
      setTimeout(async () => {
        await this.simulateCampaign(campaignId, tenantId);
      }, 1000);
    }

    return campaign;
  }

  /**
   * Simulate campaign sending
   */
  private async simulateCampaign(campaignId: string, tenantId: string): Promise<void> {
    await RCSCampaign.findOneAndUpdate(
      { campaignId, tenantId },
      {
        status: 'completed',
        completedAt: new Date(),
        'stats.sent': 100,
        'stats.delivered': 95,
        'stats.read': 40,
        'stats.failed': 5
      }
    );
  }

  /**
   * Get campaign
   */
  async getCampaign(campaignId: string, tenantId: string): Promise<any> {
    return RCSCampaign.findOne({ campaignId, tenantId });
  }

  /**
   * List campaigns
   */
  async listCampaigns(tenantId: string): Promise<any[]> {
    return RCSCampaign.find({ tenantId }).sort({ createdAt: -1 });
  }

  // ============ ANALYTICS ============

  /**
   * Get analytics
   */
  async getAnalytics(tenantId: string, options: {
    brandId?: string;
    provider?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<any> {
    const match: any = { tenantId };
    if (options.brandId) match.brandId = options.brandId;
    if (options.provider) match.provider = options.provider;

    const stats = await RCSMessage.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const result: any = { total: 0 };
    stats.forEach((s) => {
      result[s._id] = s.count;
      result.total += s.count;
    });

    return result;
  }
}

export const rcsService = new RCSService();
