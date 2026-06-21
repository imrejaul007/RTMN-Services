/**
 * Supplier Service
 *
 * KYC, profile management, status transitions, and category management
 * for fully verified suppliers. The Supplier is the canonical identity
 * for any party that sells through the NeXha network.
 */

import { Supplier, ISupplier, SupplierStatus, SupplierTier } from '../models/supplier.model';
import { isValidGSTIN, isValidPAN, isValidIFSC, isValidGSTINChecksum, isValidPhone, normalizePhone } from '../utils/validators';
import { logger } from '../config/logger';

export interface SupplierRegistrationInput {
  corpId: string;
  businessName: string;
  legalName: string;
  email: string;
  phone: string;
  whatsapp?: string;
  categories: string[];
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  };
  documents?: Array<{
    type: 'gstin' | 'pan' | 'aadhaar' | 'msme' | 'fssai' | 'trade_license' | 'iso' | 'other';
    number: string;
    documentUrl?: string;
  }>;
  bankDetails?: {
    accountHolder: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
  };
  sutarIdentityId?: string;
  metadata?: Record<string, unknown>;
}

export interface SupplierSearchFilter {
  category?: string;
  city?: string;
  state?: string;
  tier?: SupplierTier;
  minScore?: number;
  status?: SupplierStatus;
  limit?: number;
  skip?: number;
}

export class SupplierService {
  /**
   * Register a new supplier with optional initial documents.
   * Performs format validation of GSTIN/PAN/IFSC.
   * For real KYC, this method would also call the GSTN/UIDAI APIs
   * and store the verification response.
   */
  static async register(input: SupplierRegistrationInput): Promise<ISupplier> {
    if (!input.businessName?.trim() || !input.legalName?.trim()) {
      throw new Error('businessName and legalName are required');
    }
    if (!isValidPhone(input.phone)) {
      throw new Error('Invalid phone');
    }

    // Validate each document at registration time
    const documents = (input.documents || []).map((doc) => {
      let valid = true;
      if (doc.type === 'gstin' && !isValidGSTIN(doc.number)) valid = false;
      if (doc.type === 'pan' && !isValidPAN(doc.number)) valid = false;
      return {
        type: doc.type,
        number: doc.number.toUpperCase(),
        documentUrl: doc.documentUrl,
        verified: valid,
        verifiedAt: valid ? new Date() : undefined,
      };
    });

    // If GSTIN was provided, optionally run the checksum.
    // Phase 4.6: when the checksum fails, also clear verifiedAt (the previous
    // version left a verifiedAt timestamp on a now-unverified doc, which
    // was inconsistent and confusing in downstream queries).
    const gstinDoc = documents.find((d) => d.type === 'gstin');
    if (gstinDoc && gstinDoc.verified && !isValidGSTINChecksum(gstinDoc.number)) {
      gstinDoc.verified = false;
      gstinDoc.verifiedAt = undefined;
      logger.warn('GSTIN checksum failed', { corpId: input.corpId });
    }

    const bank = input.bankDetails
      ? {
          accountHolder: input.bankDetails.accountHolder,
          accountNumber: input.bankDetails.accountNumber,
          ifsc: input.bankDetails.ifsc.toUpperCase(),
          bankName: input.bankDetails.bankName,
          verified: isValidIFSC(input.bankDetails.ifsc),
          verifiedAt: isValidIFSC(input.bankDetails.ifsc) ? new Date() : undefined,
        }
      : undefined;

    const supplier = await Supplier.create({
      corpId: input.corpId,
      businessName: input.businessName.trim(),
      legalName: input.legalName.trim(),
      email: input.email.toLowerCase().trim(),
      phone: normalizePhone(input.phone),
      whatsapp: input.whatsapp ? normalizePhone(input.whatsapp) : undefined,
      status: 'pending',
      tier: 'bronze',
      categories: input.categories,
      address: { ...input.address, country: input.address.country || 'India' },
      documents,
      bankDetails: bank,
      sutarIdentityId: input.sutarIdentityId,
      metadata: input.metadata || {},
    });

    return supplier;
  }

  static async getByCorpId(corpId: string): Promise<ISupplier | null> {
    return Supplier.findOne({ corpId });
  }

  static async search(filter: SupplierSearchFilter): Promise<{ suppliers: ISupplier[]; total: number }> {
    const query: Record<string, unknown> = {};
    if (filter.category) query.categories = filter.category;
    if (filter.city) query['address.city'] = new RegExp(`^${filter.city}$`, 'i');
    if (filter.state) query['address.state'] = new RegExp(`^${filter.state}$`, 'i');
    if (filter.tier) query.tier = filter.tier;
    if (filter.status) query.status = filter.status;
    if (typeof filter.minScore === 'number') {
      query['reputation.overallScore'] = { $gte: filter.minScore };
    }

    const limit = filter.limit && filter.limit > 0 ? Math.min(filter.limit, 100) : 20;
    const skip = filter.skip && filter.skip >= 0 ? filter.skip : 0;

    const [suppliers, total] = await Promise.all([
      Supplier.find(query).sort({ 'reputation.overallScore': -1 }).skip(skip).limit(limit),
      Supplier.countDocuments(query),
    ]);
    return { suppliers, total };
  }

  /**
   * Update supplier status with audit-friendly transitions.
   */
  static async updateStatus(corpId: string, status: SupplierStatus, reason?: string): Promise<ISupplier> {
    const allowed: Record<SupplierStatus, SupplierStatus[]> = {
      pending: ['active', 'suspended', 'blacklisted'],
      active: ['verified', 'suspended', 'blacklisted'],
      verified: ['suspended', 'blacklisted'],
      suspended: ['active', 'blacklisted'],
      blacklisted: [],            // terminal
    };

    const supplier = await Supplier.findOne({ corpId });
    if (!supplier) throw new Error('Supplier not found');

    if (status !== supplier.status && !allowed[supplier.status].includes(status)) {
      throw new Error(`Illegal status transition: ${supplier.status} -> ${status}`);
    }

    supplier.status = status;
    supplier.metadata = {
      ...(supplier.metadata || {}),
      lastStatusChange: { at: new Date(), to: status, reason },
    };
    supplier.lastActiveAt = new Date();
    await supplier.save();
    return supplier;
  }

  static async updateTier(corpId: string, tier: SupplierTier): Promise<ISupplier> {
    const supplier = await Supplier.findOneAndUpdate(
      { corpId },
      { $set: { tier } },
      { new: true }
    );
    if (!supplier) throw new Error('Supplier not found');
    return supplier;
  }

  static async addCategories(corpId: string, categories: string[]): Promise<ISupplier> {
    const supplier = await Supplier.findOneAndUpdate(
      { corpId },
      { $addToSet: { categories: { $each: categories } } },
      { new: true }
    );
    if (!supplier) throw new Error('Supplier not found');
    return supplier;
  }

  static async incrementProductCount(corpId: string, delta: number): Promise<void> {
    await Supplier.updateOne({ corpId }, { $inc: { productCount: delta } });
  }

  static async touchLastActive(corpId: string): Promise<void> {
    await Supplier.updateOne({ corpId }, { $set: { lastActiveAt: new Date() } });
  }
}
