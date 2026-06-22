import mongoose, { Schema, Model } from 'mongoose';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';

// ============================================================================
// MERCHANT MODEL
// ============================================================================

export interface Merchant {
  id?: string;
  _id?: mongoose.Types.ObjectId;
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  businessType: string;
  description: string;
  address: string;
  city: string;
  state: string;
  pincode: string;

  // WhatsApp
  whatsappNumber: string;
  whatsappPhoneId: string;
  whatsappAccessToken: string;

  // AI Configuration
  persona: string;
  greeting: string;
  businessHours: {
    open: string;
    close: string;
  };
  language: string;

  // Features
  features: {
    ordering: boolean;
    booking: boolean;
    payments: boolean;
    feedback: boolean;
  };

  // Subscription
  plan: 'trial' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'inactive';
  subscriptionEndsAt: Date;

  // API Access
  apiKey: string;
  webhookSecret: string;

  // Stats
  stats: {
    totalConversations: number;
    totalMessages: number;
    totalOrders: number;
    totalRevenue: number;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const MerchantSchema = new Schema({
  tenantId: { type: String, required: true, index: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  businessType: { type: String, required: true },
  description: String,
  address: String,
  city: String,
  state: String,
  pincode: String,

  // WhatsApp
  whatsappNumber: String,
  whatsappPhoneId: String,
  whatsappAccessToken: String,

  // AI
  persona: { type: String, default: 'Friendly assistant' },
  greeting: { type: String, default: 'Hello! How can I help you today?' },
  businessHours: {
    open: { type: String, default: '09:00' },
    close: { type: String, default: '21:00' }
  },
  language: { type: String, default: 'en' },

  // Features
  features: {
    ordering: { type: Boolean, default: true },
    booking: { type: Boolean, default: true },
    payments: { type: Boolean, default: false },
    feedback: { type: Boolean, default: true }
  },

  // Subscription
  plan: {
    type: String,
    enum: ['trial', 'starter', 'professional', 'enterprise'],
    default: 'trial'
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'inactive'],
    default: 'active'
  },
  subscriptionEndsAt: Date,

  // API
  apiKey: { type: String, unique: true },
  webhookSecret: { type: String },

  // Stats
  stats: {
    totalConversations: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 }
  }
}, { timestamps: true });

MerchantSchema.virtual('id').get(function() {
  return this._id.toHexString();
});
MerchantSchema.set('toJSON', { virtuals: true });
MerchantSchema.set('toObject', { virtuals: true });

export const MerchantModel = mongoose.model('Merchant', MerchantSchema);

// ============================================================================
// KNOWLEDGE BASE MODEL
// ============================================================================

export interface KnowledgeBaseItem {
  id?: string;
  _id?: mongoose.Types.ObjectId;
  tenantId: string;
  merchantId: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  intents: string[];
  confidence: number;
  usageCount: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeBaseSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  merchantId: { type: String, required: true, index: true },
  category: { type: String, required: true },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  keywords: [String],
  intents: [String],
  confidence: { type: Number, default: 0.9 },
  usageCount: { type: Number, default: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

KnowledgeBaseSchema.virtual('id').get(function() {
  return this._id.toHexString();
});
KnowledgeBaseSchema.set('toJSON', { virtuals: true });
KnowledgeBaseSchema.set('toObject', { virtuals: true });
KnowledgeBaseSchema.index({ merchantId: 1, active: 1 });
KnowledgeBaseSchema.index({ merchantId: 1, keywords: 1 });

export const KnowledgeBaseModel: Model<KnowledgeBaseItem> = mongoose.model('KnowledgeBaseItem', KnowledgeBaseSchema);

// ============================================================================
// MERCHANT SERVICE
// ============================================================================

export class MerchantService {
  /**
   * Generate secure API key
   */
  private generateApiKey(): string {
    return `hojai_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Generate webhook secret
   */
  private generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create new merchant
   */
  async createMerchant(params: {
    name: string;
    email: string;
    phone: string;
    businessType: string;
    whatsappNumber?: string;
    persona?: string;
    city?: string;
  }): Promise<Merchant> {
    const tenantId = uuid();

    const merchant = new MerchantModel({
      tenantId,
      ...params,
      apiKey: this.generateApiKey(),
      webhookSecret: this.generateWebhookSecret(),
      subscriptionEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days trial
    });

    await merchant.save();
    return merchant.toObject() as Merchant;
  }

  /**
   * Get merchant by tenant ID
   */
  async getMerchantByTenantId(tenantId: string): Promise<Merchant | null> {
    const merchant = await MerchantModel.findOne({ tenantId });
    return merchant ? merchant.toObject() as Merchant : null;
  }

  /**
   * Get merchant by API key
   */
  async getMerchantByApiKey(apiKey: string): Promise<Merchant | null> {
    const merchant = await MerchantModel.findOne({ apiKey });
    return merchant ? merchant.toObject() as Merchant : null;
  }

  /**
   * Update merchant
   */
  async updateMerchant(tenantId: string, updates: Partial<Merchant>): Promise<Merchant | null> {
    const merchant = await MerchantModel.findOneAndUpdate(
      { tenantId },
      { $set: updates },
      { new: true }
    );
    return merchant ? merchant.toObject() as Merchant : null;
  }

  /**
   * Get knowledge base for merchant
   */
  async getKnowledgeBase(merchantId: string): Promise<KnowledgeBaseItem[]> {
    const items = await KnowledgeBaseModel.find({
      merchantId,
      active: true
    });
    return items.map(i => i.toObject() as KnowledgeBaseItem);
  }

  /**
   * Add knowledge base item
   */
  async addKnowledgeItem(params: {
    tenantId: string;
    merchantId: string;
    category: string;
    question: string;
    answer: string;
    keywords?: string[];
    intents?: string[];
  }): Promise<KnowledgeBaseItem> {
    const item = new KnowledgeBaseModel(params);
    await item.save();
    return item.toObject() as KnowledgeBaseItem;
  }

  /**
   * Update knowledge base item
   */
  async updateKnowledgeItem(id: string, tenantId: string, updates: Partial<KnowledgeBaseItem>): Promise<KnowledgeBaseItem | null> {
    const item = await KnowledgeBaseModel.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: updates },
      { new: true }
    );
    return item ? item.toObject() as KnowledgeBaseItem : null;
  }

  /**
   * Delete knowledge base item
   */
  async deleteKnowledgeItem(id: string, tenantId: string): Promise<boolean> {
    const result = await KnowledgeBaseModel.deleteOne({ _id: id, tenantId });
    return result.deletedCount > 0;
  }

  /**
   * Search knowledge base
   */
  async searchKnowledge(merchantId: string, query: string): Promise<KnowledgeBaseItem[]> {
    const items = await KnowledgeBaseModel.find({
      merchantId,
      active: true,
      $or: [
        { question: { $regex: query, $options: 'i' } },
        { answer: { $regex: query, $options: 'i' } },
        { keywords: { $in: query.toLowerCase().split(' ') } }
      ]
    });
    return items.map(i => i.toObject() as KnowledgeBaseItem);
  }

  /**
   * Increment usage count
   */
  async incrementUsage(id: string): Promise<void> {
    await KnowledgeBaseModel.updateOne({ _id: id }, { $inc: { usageCount: 1 } });
  }

  /**
   * Get merchant stats
   */
  async getStats(tenantId: string): Promise<Merchant['stats']> {
    const merchant = await MerchantModel.findOne({ tenantId }).select('stats');
    return merchant?.stats as Merchant['stats'];
  }

  /**
   * Update stats
   */
  async updateStats(tenantId: string, stats: Partial<Merchant['stats']>): Promise<void> {
    await MerchantModel.updateOne({ tenantId }, { $inc: stats });
  }

  /**
   * Validate API key
   */
  async validateApiKey(apiKey: string): Promise<Merchant | null> {
    return this.getMerchantByApiKey(apiKey);
  }
}

export const merchantService = new MerchantService();
