/**
 * Guest Supplier Service
 *
 * Allows suppliers to join the NeXha network without GST documentation.
 * Generates temporary IDs (GST-XXXXXXXX format), tracks WhatsApp OTP
 * verification, and supports conversion to a full Supplier when the
 * supplier later submits their GSTIN/PAN.
 */

import { GuestSupplier, IGuestSupplier, GuestStatus } from '../models/guest-supplier.model';
import { Supplier } from '../models/supplier.model';
import { generateGuestId, generateOtp, generatePromoCode } from '../utils/id-generator';
import { isValidPhone, isValidPincode, normalizePhone } from '../utils/validators';
import { logger } from '../config/logger';
import { sendOtp } from './whatsapp.service';
import bcrypt from 'bcryptjs';

// OTP codes are stored hashed in the DB (B-REG-7 fix). Bcrypt cost 8 is
// deliberately lower than the password cost factor (12) because OTPs are
// short-lived (10 min TTL) — but hashing still prevents DB-leak exposure.
const OTP_BCRYPT_ROUNDS = 8;

const DEFAULT_VALIDITY_DAYS = Number(process.env.GUEST_DEFAULT_VALIDITY_DAYS) || 30;
const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

export interface GuestOnboardInput {
  businessName: string;
  ownerName: string;
  phone: string;
  whatsapp?: string;            // defaults to phone
  email?: string;
  city: string;
  state: string;
  pincode: string;
  categories?: string[];
  promoCode?: string;           // referral promo code (validated upstream)
  referredBy?: string;          // corpId of referring supplier
}

export interface OtpVerificationResult {
  success: boolean;
  message: string;
  guest?: IGuestSupplier;
}

export class GuestSupplierService {
  /**
   * Register a new guest supplier and trigger an OTP to their WhatsApp number.
   * No GST/PAN required at this stage.
   */
  static async onboard(input: GuestOnboardInput): Promise<IGuestSupplier> {
    if (!isValidPhone(input.phone)) {
      throw new Error('Invalid phone number');
    }
    if (!isValidPincode(input.pincode)) {
      throw new Error('Invalid pincode');
    }
    if (!input.businessName?.trim() || !input.ownerName?.trim()) {
      throw new Error('businessName and ownerName are required');
    }

    const phone = normalizePhone(input.phone);
    const whatsapp = input.whatsapp ? normalizePhone(input.whatsapp) : phone;

    // Reuse an existing active guest for this phone rather than duplicating
    const existing = await GuestSupplier.findOne({
      phone,
      status: { $in: ['otp_pending', 'active'] },
    });
    if (existing) {
      logger.info('Guest supplier already exists for phone; resending OTP', {
        guestId: existing.guestId,
      });
      await this.resendOtp(existing.guestId);
      return existing;
    }

    const guestId = generateGuestId();
    const otp = generateOtp(6);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + DEFAULT_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
    const otpExpiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000);
    // Hash the OTP before storing (B-REG-7 fix). WhatsApp sends the plaintext.
    const otpHash = await bcrypt.hash(otp, OTP_BCRYPT_ROUNDS);

    const guest = await GuestSupplier.create({
      guestId,
      businessName: input.businessName.trim(),
      ownerName: input.ownerName.trim(),
      phone,
      whatsapp,
      email: input.email?.toLowerCase().trim(),
      city: input.city.trim(),
      state: input.state.trim(),
      pincode: input.pincode.trim(),
      categories: input.categories || [],
      status: 'otp_pending' as GuestStatus,
      otpHistory: [
        {
          code: otpHash,
          sentAt: now,
          expiresAt: otpExpiresAt,
          attempts: 0,
        },
      ],
      promoCode: generatePromoCode(),
      referredBy: input.referredBy,
      expiresAt,
    });

    // Dispatch OTP via WhatsApp (falls back to console log in dev)
    const whatsappResult = await sendOtp({ phone: whatsapp, otp, guestId });
    if (!whatsappResult.success) {
      logger.warn('WhatsApp OTP dispatch failed, falling back to console', {
        guestId,
        error: whatsappResult.error,
      });
    }

    return guest;
  }

  /**
   * Resend a fresh OTP for an existing pending guest.
   */
  static async resendOtp(guestId: string): Promise<IGuestSupplier> {
    const guest = await GuestSupplier.findOne({ guestId });
    if (!guest) throw new Error(`Guest supplier not found: ${guestId}`);
    if (guest.status === 'converted') {
      throw new Error('Guest already converted to a full supplier');
    }
    if (guest.status === 'expired' || guest.status === 'revoked') {
      throw new Error(`Guest is ${guest.status} and cannot be reactivated`);
    }

    const otp = generateOtp(6);
    const now = new Date();
    const otpExpiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000);
    const otpHash = await bcrypt.hash(otp, OTP_BCRYPT_ROUNDS);

    guest.otpHistory.push({
      code: otpHash,
      sentAt: now,
      expiresAt: otpExpiresAt,
      attempts: 0,
    });
    await guest.save();

    const whatsappResult = await sendOtp({ phone: guest.whatsapp, otp, guestId });
    if (!whatsappResult.success) {
      logger.warn('WhatsApp OTP resend failed', { guestId, error: whatsappResult.error });
    }
    return guest;
  }

  /**
   * Verify the OTP and flip the guest to `active` so they can receive RFQs.
   */
  static async verifyOtp(guestId: string, code: string): Promise<OtpVerificationResult> {
    const guest = await GuestSupplier.findOne({ guestId });
    if (!guest) return { success: false, message: 'Guest not found' };
    if (guest.status === 'active') return { success: true, message: 'Already active', guest };
    if (guest.status === 'converted') {
      return { success: false, message: 'Guest already converted' };
    }

    const latestOtp = guest.otpHistory[guest.otpHistory.length - 1];
    if (!latestOtp) {
      return { success: false, message: 'No OTP issued' };
    }
    if (latestOtp.verifiedAt) {
      return { success: false, message: 'OTP already used' };
    }
    if (latestOtp.expiresAt < new Date()) {
      return { success: false, message: 'OTP expired; request a new one' };
    }
    if (latestOtp.attempts >= OTP_MAX_ATTEMPTS) {
      return { success: false, message: 'Too many failed attempts; request a new OTP' };
    }
    // Compare using bcrypt (timing-safe + handles the stored hash). Closes B-REG-7 and B-REG-8.
    const codeMatches = await bcrypt.compare(code, latestOtp.code);
    if (!codeMatches) {
      latestOtp.attempts += 1;
      await guest.save();
      return {
        success: false,
        message: `Invalid OTP (${OTP_MAX_ATTEMPTS - latestOtp.attempts} attempts left)`,
      };
    }

    latestOtp.verifiedAt = new Date();
    guest.status = 'active';
    await guest.save();
    return { success: true, message: 'OTP verified', guest };
  }

  /**
   * Convert a verified guest into a full Supplier record once they provide
   * GSTIN/PAN. Returns the new corpId.
   */
  static async convertToSupplier(
    guestId: string,
    corpId: string,
    documents: { gstin?: string; pan?: string; fssai?: string; msme?: string }
  ): Promise<{ corpId: string; guest: IGuestSupplier }> {
    const guest = await GuestSupplier.findOne({ guestId });
    if (!guest) throw new Error('Guest not found');
    if (guest.status !== 'active') {
      throw new Error(`Cannot convert guest in status ${guest.status}`);
    }

    const supplier = await Supplier.create({
      corpId,
      businessName: guest.businessName,
      legalName: guest.businessName,
      email: guest.email || `${guest.phone}@guest.nexha.local`,
      phone: guest.phone,
      whatsapp: guest.whatsapp,
      status: 'verified',
      tier: 'bronze',
      categories: guest.categories,
      address: {
        line1: 'Onboarded via guest flow',
        city: guest.city,
        state: guest.state,
        pincode: guest.pincode,
        country: 'India',
      },
      documents: Object.entries(documents)
        .filter(([, v]) => !!v)
        .map(([type, number]) => ({ type, number, verified: true, verifiedAt: new Date() })),
      isGuest: false,
      reputation: {
        overallScore: 50,
        deliveryScore: 50,
        qualityScore: 50,
        paymentScore: 50,
        responseScore: 50,
        totalRatings: 0,
        totalDeals: 0,
        totalDisputes: 0,
      },
    });

    guest.status = 'converted';
    guest.convertedToCorpId = corpId;
    guest.dealsCompleted = supplier.reputation.totalDeals;
    await guest.save();

    return { corpId, guest };
  }

  /**
   * Get a guest supplier by id (without exposing OTP history to callers).
   */
  static async getById(guestId: string): Promise<IGuestSupplier | null> {
    return GuestSupplier.findOne({ guestId });
  }

  /**
   * List active guests (used by Seller Agent service for inbound RFQ routing).
   */
  static async listActive(filter: { city?: string; state?: string; category?: string; limit?: number } = {}): Promise<IGuestSupplier[]> {
    const query: Record<string, unknown> = { status: 'active', expiresAt: { $gt: new Date() } };
    if (filter.city) query.city = new RegExp(`^${filter.city}$`, 'i');
    if (filter.state) query.state = new RegExp(`^${filter.state}$`, 'i');
    if (filter.category) query.categories = filter.category;
    return GuestSupplier.find(query).limit(filter.limit || 50).sort({ createdAt: -1 });
  }

  /**
   * Bump counters when a guest is involved in RFQ/quote/deal lifecycle.
   * These counters feed the reputation pipeline once the guest is converted.
   */
  static async recordEvent(
    guestId: string,
    event: 'rfq_received' | 'quote_submitted' | 'deal_completed'
  ): Promise<void> {
    const field = event === 'rfq_received'
      ? 'rfqsReceived'
      : event === 'quote_submitted'
        ? 'quotesSubmitted'
        : 'dealsCompleted';
    await GuestSupplier.updateOne({ guestId }, { $inc: { [field]: 1 } });
  }
}
