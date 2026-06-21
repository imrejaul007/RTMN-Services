import mongoose, { Schema, Document } from 'mongoose';

export type GuestStatus = 'otp_pending' | 'active' | 'expired' | 'converted' | 'revoked';

export interface GuestOtpRecord {
  code: string;                  // hashed in production
  sentAt: Date;
  expiresAt: Date;
  attempts: number;
  verifiedAt?: Date;
}

export interface IGuestSupplier extends Document {
  guestId: string;               // GST-XXXXXXXX format
  businessName: string;
  ownerName: string;
  phone: string;
  whatsapp: string;
  email?: string;
  city: string;
  state: string;
  pincode: string;
  status: GuestStatus;
  otpHistory: GuestOtpRecord[];
  categories: string[];
  rfqsReceived: number;
  quotesSubmitted: number;
  dealsCompleted: number;
  promoCode?: string;
  referredBy?: string;           // corpId of referring supplier
  convertedToCorpId?: string;    // once they submit GSTIN
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const guestOtpSchema = new Schema<GuestOtpRecord>(
  {
    code: { type: String, required: true },
    sentAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    verifiedAt: Date,
  },
  { _id: false }
);

const guestSupplierSchema = new Schema<IGuestSupplier>(
  {
    guestId: { type: String, required: true, unique: true, index: true },
    businessName: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, index: true },
    whatsapp: { type: String, required: true, index: true },
    email: { type: String, lowercase: true, trim: true },
    city: { type: String, required: true, index: true },
    state: { type: String, required: true, index: true },
    pincode: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['otp_pending', 'active', 'expired', 'converted', 'revoked'],
      default: 'otp_pending',
      index: true,
    },
    otpHistory: [guestOtpSchema],
    categories: { type: [String], default: [] },
    rfqsReceived: { type: Number, default: 0 },
    quotesSubmitted: { type: Number, default: 0 },
    dealsCompleted: { type: Number, default: 0 },
    promoCode: { type: String, sparse: true, index: true },
    referredBy: { type: String, index: true },
    convertedToCorpId: { type: String, index: true },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

guestSupplierSchema.index({ status: 1, expiresAt: 1 });

export const GuestSupplier = mongoose.model<IGuestSupplier>('GuestSupplier', guestSupplierSchema);
