/**
 * Buyer Service
 *
 * Manages buyer identities, B2B credit lines, and trust statistics
 * that feed the reputation pipeline. Buyers in the NeXha network can
 * be businesses, government entities, NGOs, or institutions.
 */

import { Buyer, IBuyer, BuyerStatus, BuyerType } from '../models/buyer.model';
import { isValidGSTIN, isValidPAN, isValidPhone, normalizePhone } from '../utils/validators';

export interface BuyerRegistrationInput {
  corpId: string;
  businessName: string;
  buyerType?: BuyerType;
  email: string;
  phone: string;
  whatsapp?: string;
  gstin?: string;
  pan?: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  };
  preferredCategories?: string[];
  creditLimit?: number;
  sutarIdentityId?: string;
  metadata?: Record<string, unknown>;
}

export interface BuyerSearchFilter {
  buyerType?: BuyerType;
  city?: string;
  state?: string;
  status?: BuyerStatus;
  category?: string;
  minTotalSpent?: number;
  limit?: number;
  skip?: number;
}

export class BuyerService {
  static async register(input: BuyerRegistrationInput): Promise<IBuyer> {
    if (!input.businessName?.trim()) throw new Error('businessName is required');
    if (!isValidPhone(input.phone)) throw new Error('Invalid phone');
    if (input.gstin && !isValidGSTIN(input.gstin)) {
      throw new Error('Invalid GSTIN format');
    }
    if (input.pan && !isValidPAN(input.pan)) {
      throw new Error('Invalid PAN format');
    }

    const buyer = await Buyer.create({
      corpId: input.corpId,
      businessName: input.businessName.trim(),
      buyerType: input.buyerType || 'business',
      email: input.email.toLowerCase().trim(),
      phone: normalizePhone(input.phone),
      whatsapp: input.whatsapp ? normalizePhone(input.whatsapp) : undefined,
      gstin: input.gstin?.toUpperCase(),
      pan: input.pan?.toUpperCase(),
      address: { ...input.address, country: input.address.country || 'India' },
      preferredCategories: input.preferredCategories || [],
      creditLimit: input.creditLimit || 0,
      creditUsed: 0,
      status: 'pending',
      sutarIdentityId: input.sutarIdentityId,
      metadata: input.metadata || {},
    });
    return buyer;
  }

  static async getByCorpId(corpId: string): Promise<IBuyer | null> {
    return Buyer.findOne({ corpId });
  }

  static async search(filter: BuyerSearchFilter): Promise<{ buyers: IBuyer[]; total: number }> {
    const query: Record<string, unknown> = {};
    if (filter.buyerType) query.buyerType = filter.buyerType;
    if (filter.city) query['address.city'] = new RegExp(`^${filter.city}$`, 'i');
    if (filter.state) query['address.state'] = new RegExp(`^${filter.state}$`, 'i');
    if (filter.status) query.status = filter.status;
    if (filter.category) query.preferredCategories = filter.category;
    if (typeof filter.minTotalSpent === 'number') {
      query['stats.totalSpent'] = { $gte: filter.minTotalSpent };
    }

    const limit = filter.limit && filter.limit > 0 ? Math.min(filter.limit, 100) : 20;
    const skip = filter.skip && filter.skip >= 0 ? filter.skip : 0;
    const [buyers, total] = await Promise.all([
      Buyer.find(query).sort({ 'stats.totalSpent': -1 }).skip(skip).limit(limit),
      Buyer.countDocuments(query),
    ]);
    return { buyers, total };
  }

  static async updateStatus(corpId: string, status: BuyerStatus): Promise<IBuyer> {
    const buyer = await Buyer.findOneAndUpdate(
      { corpId },
      { $set: { status, lastActiveAt: new Date() } },
      { new: true }
    );
    if (!buyer) throw new Error('Buyer not found');
    return buyer;
  }

  /**
   * Update buyer stats after a completed order.
   * Recomputes averages and bumps the lastOrderAt timestamp.
   */
  static async recordOrder(corpId: string, orderValue: number): Promise<IBuyer> {
    const buyer = await Buyer.findOne({ corpId });
    if (!buyer) throw new Error('Buyer not found');

    const newTotal = buyer.stats.totalSpent + orderValue;
    const newCount = buyer.stats.totalOrders + 1;
    buyer.stats.totalOrders = newCount;
    buyer.stats.totalSpent = newTotal;
    buyer.stats.avgOrderValue = newCount > 0 ? newTotal / newCount : 0;
    buyer.stats.lastOrderAt = new Date();
    buyer.lastActiveAt = new Date();
    await buyer.save();
    return buyer;
  }

  /**
   * Update credit utilization. Throws if the new usage would exceed the limit.
   */
  static async updateCreditUsage(corpId: string, delta: number): Promise<IBuyer> {
    const buyer = await Buyer.findOne({ corpId });
    if (!buyer) throw new Error('Buyer not found');
    const newUsage = buyer.creditUsed + delta;
    if (delta > 0 && newUsage > buyer.creditLimit) {
      throw new Error('Credit limit exceeded');
    }
    if (newUsage < 0) {
      throw new Error('Credit usage cannot be negative');
    }
    buyer.creditUsed = newUsage;
    await buyer.save();
    return buyer;
  }

  static async setCreditLimit(corpId: string, limit: number): Promise<IBuyer> {
    if (limit < 0) throw new Error('Credit limit cannot be negative');
    const buyer = await Buyer.findOneAndUpdate(
      { corpId },
      { $set: { creditLimit: limit } },
      { new: true }
    );
    if (!buyer) throw new Error('Buyer not found');
    return buyer;
  }
}
