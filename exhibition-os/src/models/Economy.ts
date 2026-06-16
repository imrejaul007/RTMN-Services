/**
 * Economy Models
 * Coins, Transactions, Rewards
 */

import mongoose, { Schema, Document } from 'mongoose';

// Coin Balance
export interface ICoinBalance extends Document {
  _id: mongoose.Types.ObjectId;
  attendee_id: string;
  exhibition_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  last_updated: Date;
}

const CoinBalanceSchema = new Schema<ICoinBalance>({
  attendee_id: { type: String, required: true, index: true },
  exhibition_id: { type: String, required: true, index: true },
  balance: { type: Number, default: 0 },
  total_earned: { type: Number, default: 0 },
  total_spent: { type: Number, default: 0 },
  last_updated: { type: Date, default: Date.now },
});

CoinBalanceSchema.index({ attendee_id: 1, exhibition_id: 1 }, { unique: true });

export const CoinBalance = mongoose.model<ICoinBalance>('CoinBalance', CoinBalanceSchema);

// Transaction
export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  transaction_id: string;
  attendee_id: string;
  exhibition_id: string;
  amount: number;
  type: 'earned' | 'spent';
  reason: string;
  source: string;
  reference_id?: string;
  created_at: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  transaction_id: { type: String, required: true, unique: true, index: true },
  attendee_id: { type: String, required: true, index: true },
  exhibition_id: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['earned', 'spent'], required: true },
  reason: { type: String, required: true },
  source: { type: String, required: true },
  reference_id: String,
  created_at: { type: Date, default: Date.now },
});

TransactionSchema.index({ attendee_id: 1, created_at: -1 });
TransactionSchema.index({ exhibition_id: 1, type: 1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema);

// Campaign
export interface ICampaign extends Document {
  _id: mongoose.Types.ObjectId;
  campaign_id: string;
  exhibition_id: string;
  name: string;
  description: string;
  type: 'coin_distribution' | 'reward' | 'leaderboard';
  budget: number;
  spent: number;
  coin_value: number;
  max_per_user: number;
  conditions: Record<string, unknown>;
  starts_at: Date;
  ends_at: Date;
  status: 'active' | 'paused' | 'completed';
  created_by: string;
  created_at: Date;
}

const CampaignSchema = new Schema<ICampaign>({
  campaign_id: { type: String, required: true, unique: true, index: true },
  exhibition_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  type: {
    type: String,
    enum: ['coin_distribution', 'reward', 'leaderboard'],
    required: true,
  },
  budget: { type: Number, default: 0 },
  spent: { type: Number, default: 0 },
  coin_value: { type: Number, default: 10 },
  max_per_user: { type: Number, default: 1 },
  conditions: Schema.Types.Mixed,
  starts_at: { type: Date, required: true },
  ends_at: { type: Date, required: true },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed'],
    default: 'active',
    index: true,
  },
  created_by: String,
  created_at: { type: Date, default: Date.now },
});

CampaignSchema.index({ exhibition_id: 1, status: 1 });

export const Campaign = mongoose.model<ICampaign>('Campaign', CampaignSchema);
