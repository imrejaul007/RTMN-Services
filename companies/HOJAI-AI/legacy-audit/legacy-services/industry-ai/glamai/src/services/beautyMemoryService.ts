/**
 * Beauty Memory Service
 *
 * Stores and retrieves beauty-specific customer data:
 * - Hair color formulas
 * - Stylist notes
 * - Product reactions
 * - Service history with details
 * - At-home regimen recommendations
 *
 * Built on top of existing MemoryOS infrastructure
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import { createClient, RedisClientType } from 'redis';
import { logger } from '../../../utils/logger.js';

// Types
export interface HairColorFormula {
  color: string;
  brand: string;
  developer: string;
  processingTime: number;
  notes: string;
  imageUrl?: string;
}

export interface StylistNote {
  noteId: string;
  content: string;
  category: 'treatment' | 'preference' | 'allergy' | 'concern' | 'general';
  stylistId: string;
  stylistName: string;
  createdAt: Date;
}

export interface ProductReaction {
  productId: string;
  productName: string;
  reaction: 'loved' | 'liked' | 'neutral' | 'disliked' | 'allergic';
  notes: string;
  date: Date;
}

export interface BeautyMemoryDocument extends Document {
  customerId: string;

  // Beauty Profile
  hairType: 'straight' | 'wavy' | 'curly' | 'coily' | null;
  hairTexture: 'fine' | 'medium' | 'coarse' | null;
  scalpCondition: 'normal' | 'oily' | 'dry' | 'sensitive' | null;
  skinType: 'dry' | 'oily' | 'combination' | 'sensitive' | 'normal' | null;

  // Hair Color History
  hairColorHistory: Array<{
    date: Date;
    color: string;
    formula: HairColorFormula;
    stylistId: string;
    stylistName: string;
    serviceId: string;
    imageUrl?: string;
  }>;

  // Current Color Formula (most recent)
  currentColorFormula: HairColorFormula | null;

  // Stylist Notes
  stylistNotes: StylistNote[];

  // Product Reactions
  productReactions: ProductReaction[];

  // Service Details
  serviceDetails: Array<{
    serviceId: string;
    serviceName: string;
    date: Date;
    stylistId: string;
    stylistName: string;
    products: Array<{ productId: string; productName: string; quantity: number }>;
    notes: string;
    satisfaction: number;
  }>;

  // At-Home Regimen
  atHomeRegimen: Array<{
    productId: string;
    productName: string;
    frequency: string;
    instructions: string;
    startDate: Date;
    endDate?: Date;
  }>;

  // Allergies & Sensitivities
  allergies: string[];
  sensitivities: string[];

  // Last updated
  updatedAt: Date;
}

// Mongoose Schema
const BeautyMemorySchema = new Schema<BeautyMemoryDocument>({
  customerId: { type: String, required: true, unique: true, index: true },

  // Beauty Profile
  hairType: { type: String, enum: ['straight', 'wavy', 'curly', 'coily', null] },
  hairTexture: { type: String, enum: ['fine', 'medium', 'coarse', null] },
  scalpCondition: { type: String, enum: ['normal', 'oily', 'dry', 'sensitive', null] },
  skinType: { type: String, enum: ['dry', 'oily', 'combination', 'sensitive', 'normal', null] },

  // Hair Color History
  hairColorHistory: [{
    date: { type: Date },
    color: { type: String },
    formula: {
      color: String,
      brand: String,
      developer: String,
      processingTime: Number,
      notes: String,
      imageUrl: String
    },
    stylistId: String,
    stylistName: String,
    serviceId: String,
    imageUrl: String
  }],

  // Current Color Formula
  currentColorFormula: {
    color: String,
    brand: String,
    developer: String,
    processingTime: Number,
    notes: String,
    imageUrl: String
  },

  // Stylist Notes
  stylistNotes: [{
    noteId: String,
    content: String,
    category: { type: String, enum: ['treatment', 'preference', 'allergy', 'concern', 'general'] },
    stylistId: String,
    stylistName: String,
    createdAt: { type: Date, default: Date.now }
  }],

  // Product Reactions
  productReactions: [{
    productId: String,
    productName: String,
    reaction: { type: String, enum: ['loved', 'liked', 'neutral', 'disliked', 'allergic'] },
    notes: String,
    date: { type: Date, default: Date.now }
  }],

  // Service Details
  serviceDetails: [{
    serviceId: String,
    serviceName: String,
    date: Date,
    stylistId: String,
    stylistName: String,
    products: [{
      productId: String,
      productName: String,
      quantity: Number
    }],
    notes: String,
    satisfaction: Number
  }],

  // At-Home Regimen
  atHomeRegimen: [{
    productId: String,
    productName: String,
    frequency: String,
    instructions: String,
    startDate: Date,
    endDate: Date
  }],

  // Allergies & Sensitivities
  allergies: [String],
  sensitivities: [String],

  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Service Class
export class BeautyMemoryService {
  private model: Model<BeautyMemoryDocument>;
  private redis: RedisClientType | null = null;
  private mongoose: typeof mongoose;

  constructor() {
    this.mongoose = mongoose;
    this.model = mongoose.models.BeautyMemory || mongoose.model<BeautyMemoryDocument>('BeautyMemory', BeautyMemorySchema);
  }

  async initialize(connections: { mongoose: typeof mongoose; redis: RedisClientType | null }) {
    this.mongoose = connections.mongoose;
    this.redis = connections.redis;

    // Ensure model is registered
    if (!this.mongoose.models.BeautyMemory) {
      this.mongoose.models.BeautyMemory = this.mongoose.model<BeautyMemoryDocument>('BeautyMemory', BeautyMemorySchema);
    }
    this.model = this.mongoose.models.BeautyMemory;

    logger.info('BeautyMemoryService initialized');
  }

  // Get or create customer memory
  private async getOrCreateMemory(customerId: string): Promise<BeautyMemoryDocument> {
    let memory = await this.model.findOne({ customerId });

    if (!memory) {
      memory = await this.model.create({ customerId });
    }

    return memory;
  }

  // Get customer profile
  async getCustomerProfile(customerId: string): Promise<BeautyMemoryDocument | null> {
    // Try cache first
    if (this.redis) {
      const cached = await this.redis.get(`beauty:profile:${customerId}`);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const memory = await this.model.findOne({ customerId });

    // Cache for 5 minutes
    if (this.redis && memory) {
      await this.redis.setEx(`beauty:profile:${customerId}`, 300, JSON.stringify(memory));
    }

    return memory;
  }

  // Update customer profile
  async updateCustomerProfile(customerId: string, data: Partial<BeautyMemoryDocument>): Promise<BeautyMemoryDocument> {
    const memory = await this.getOrCreateMemory(customerId);

    // Update allowed fields
    if (data.hairType) memory.hairType = data.hairType;
    if (data.hairTexture) memory.hairTexture = data.hairTexture;
    if (data.scalpCondition) memory.scalpCondition = data.scalpCondition;
    if (data.skinType) memory.skinType = data.skinType;
    if (data.allergies) memory.allergies = data.allergies;
    if (data.sensitivities) memory.sensitivities = data.sensitivities;

    await memory.save();

    // Invalidate cache
    if (this.redis) {
      await this.redis.del(`beauty:profile:${customerId}`);
    }

    return memory;
  }

  // Record hair color formula
  async recordHairColor(
    customerId: string,
    formula: HairColorFormula,
    stylistId: string,
    stylistName: string,
    date: Date = new Date(),
    serviceId?: string,
    imageUrl?: string
  ): Promise<BeautyMemoryDocument> {
    const memory = await this.getOrCreateMemory(customerId);

    // Add to history
    memory.hairColorHistory.push({
      date,
      color: formula.color,
      formula,
      stylistId,
      stylistName,
      serviceId: serviceId || '',
      imageUrl
    });

    // Update current formula
    memory.currentColorFormula = formula;

    await memory.save();

    // Invalidate cache
    if (this.redis) {
      await this.redis.del(`beauty:profile:${customerId}`);
    }

    logger.info(`Recorded hair color for customer ${customerId}: ${formula.color}`);

    return memory;
  }

  // Add stylist note
  async addStylistNote(
    customerId: string,
    content: string,
    stylistId: string,
    stylistName: string,
    category: StylistNote['category'] = 'general'
  ): Promise<BeautyMemoryDocument> {
    const memory = await this.getOrCreateMemory(customerId);

    memory.stylistNotes.push({
      noteId: `NOTE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      category,
      stylistId,
      stylistName,
      createdAt: new Date()
    });

    // If it's an allergy note, update allergies
    if (category === 'allergy') {
      const existingAllergies = memory.allergies || [];
      if (!existingAllergies.includes(content)) {
        memory.allergies = [...existingAllergies, content];
      }
    }

    await memory.save();

    // Invalidate cache
    if (this.redis) {
      await this.redis.del(`beauty:profile:${customerId}`);
    }

    logger.info(`Added stylist note for customer ${customerId}: [${category}] ${content}`);

    return memory;
  }

  // Record product reaction
  async recordProductReaction(
    customerId: string,
    productId: string,
    productName: string,
    reaction: ProductReaction['reaction'],
    notes: string = ''
  ): Promise<BeautyMemoryDocument> {
    const memory = await this.getOrCreateMemory(customerId);

    memory.productReactions.push({
      productId,
      productName,
      reaction,
      notes,
      date: new Date()
    });

    await memory.save();

    // Invalidate cache
    if (this.redis) {
      await this.redis.del(`beauty:profile:${customerId}`);
    }

    logger.info(`Recorded product reaction for customer ${customerId}: ${productName} - ${reaction}`);

    return memory;
  }

  // Record service details
  async recordServiceDetails(
    customerId: string,
    serviceId: string,
    serviceName: string,
    stylistId: string,
    stylistName: string,
    products: Array<{ productId: string; productName: string; quantity: number }>,
    notes: string = '',
    satisfaction?: number
  ): Promise<BeautyMemoryDocument> {
    const memory = await this.getOrCreateMemory(customerId);

    memory.serviceDetails.push({
      serviceId,
      serviceName,
      date: new Date(),
      stylistId,
      stylistName,
      products,
      notes,
      satisfaction: satisfaction || 0
    });

    await memory.save();

    // Invalidate cache
    if (this.redis) {
      await this.redis.del(`beauty:profile:${customerId}`);
    }

    return memory;
  }

  // Add to at-home regimen
  async addToRegimen(
    customerId: string,
    productId: string,
    productName: string,
    frequency: string,
    instructions: string
  ): Promise<BeautyMemoryDocument> {
    const memory = await this.getOrCreateMemory(customerId);

    memory.atHomeRegimen.push({
      productId,
      productName,
      frequency,
      instructions,
      startDate: new Date()
    });

    await memory.save();

    return memory;
  }

  // Get memory history
  async getMemoryHistory(
    customerId: string,
    type?: string,
    limit: number = 50
  ): Promise<{
    hairColorHistory: BeautyMemoryDocument['hairColorHistory'];
    stylistNotes: BeautyMemoryDocument['stylistNotes'];
    productReactions: BeautyMemoryDocument['productReactions'];
    serviceDetails: BeautyMemoryDocument['serviceDetails'];
    atHomeRegimen: BeautyMemoryDocument['atHomeRegimen'];
  }> {
    const memory = await this.model.findOne({ customerId });

    if (!memory) {
      return {
        hairColorHistory: [],
        stylistNotes: [],
        productReactions: [],
        serviceDetails: [],
        atHomeRegimen: []
      };
    }

    return {
      hairColorHistory: memory.hairColorHistory.slice(-limit),
      stylistNotes: memory.stylistNotes.slice(-limit),
      productReactions: memory.productReactions.slice(-limit),
      serviceDetails: memory.serviceDetails.slice(-limit),
      atHomeRegimen: memory.atHomeRegimen
    };
  }

  // Get recent stylist notes
  async getRecentNotes(customerId: string, limit: number = 10): Promise<StylistNote[]> {
    const memory = await this.model.findOne({ customerId });
    if (!memory) return [];
    return memory.stylistNotes.slice(-limit).reverse();
  }

  // Get hair color formula for reference
  async getHairColorFormula(customerId: string): Promise<HairColorFormula | null> {
    const memory = await this.model.findOne({ customerId });
    return memory?.currentColorFormula || null;
  }

  // Get product preferences (loved/liked products)
  async getProductPreferences(customerId: string): Promise<string[]> {
    const memory = await this.model.findOne({ customerId });
    if (!memory) return [];

    return memory.productReactions
      .filter(pr => pr.reaction === 'loved' || pr.reaction === 'liked')
      .map(pr => pr.productId);
  }

  // Get products to avoid (allergic/disliked)
  async getProductsToAvoid(customerId: string): Promise<string[]> {
    const memory = await this.model.findOne({ customerId });
    if (!memory) return [];

    const reactions = memory.productReactions
      .filter(pr => pr.reaction === 'allergic' || pr.reaction === 'disliked');

    const allergies = memory.allergies || [];

    return [...new Set([...reactions.map(pr => pr.productId), ...allergies])];
  }
}

export const beautyMemoryService = new BeautyMemoryService();
