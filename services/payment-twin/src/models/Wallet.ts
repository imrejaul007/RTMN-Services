import mongoose, { Document, Schema } from 'mongoose';

// Wallet Types
export type WalletType = 'customer' | 'merchant' | 'business' | 'escrow';
export type WalletStatus = 'active' | 'inactive' | 'suspended' | 'closed';
export type WalletCurrency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SGD';

// Transaction Record for Wallet History
interface IWalletTransaction {
  transactionId: string;
  type: 'credit' | 'debit';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  referenceType?: 'payment' | 'refund' | 'topup' | 'withdrawal' | 'transfer' | 'fee' | 'cashback';
  referenceId?: string;
  createdAt: Date;
}

// Wallet Document Interface
export interface IWallet extends Document {
  walletId: string;
  tenantId: string;
  customerId: string;
  businessId?: string;

  // Wallet Type
  type: WalletType;

  // Balance
  balance: number;
  availableBalance: number;
  pendingBalance: number;
  lockedBalance: number;
  currency: WalletCurrency;

  // Status
  status: WalletStatus;

  // Limits
  dailyLimit: number;
  monthlyLimit: number;
  perTransactionLimit: number;
  dailySpent: number;
  monthlySpent: number;

  // KYC Status
  kycStatus: 'pending' | 'verified' | 'rejected' | 'not_required';

  // Customer Info
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;

  // Payment Methods
  linkedPaymentMethods?: {
    methodId: string;
    type: 'card' | 'bank_account' | 'upi';
    isDefault: boolean;
    isActive: boolean;
  }[];

  // Transaction History
  transactionHistory: IWalletTransaction[];

  // Metadata
  metadata?: Record<string, unknown>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastTransactionAt?: Date;
  lastTopupAt?: Date;
}

// Wallet Schema
const WalletSchema = new Schema<IWallet>(
  {
    walletId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    businessId: {
      type: String,
      index: true,
    },

    // Wallet Type
    type: {
      type: String,
      enum: ['customer', 'merchant', 'business', 'escrow'],
      default: 'customer',
    },

    // Balance
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    availableBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    pendingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    lockedBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'],
      default: 'INR',
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'closed'],
      default: 'active',
      index: true,
    },

    // Limits
    dailyLimit: {
      type: Number,
      default: 100000, // 1 lakh
    },
    monthlyLimit: {
      type: Number,
      default: 500000, // 5 lakhs
    },
    perTransactionLimit: {
      type: Number,
      default: 50000,
    },
    dailySpent: {
      type: Number,
      default: 0,
    },
    monthlySpent: {
      type: Number,
      default: 0,
    },

    // KYC Status
    kycStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'not_required'],
      default: 'pending',
    },

    // Customer Info
    customerEmail: String,
    customerPhone: String,
    customerName: String,

    // Payment Methods
    linkedPaymentMethods: [{
      methodId: String,
      type: {
        type: String,
        enum: ['card', 'bank_account', 'upi'],
      },
      isDefault: {
        type: Boolean,
        default: false,
      },
      isActive: {
        type: Boolean,
        default: true,
      },
    }],

    // Transaction History (recent, limited)
    transactionHistory: [{
      transactionId: String,
      type: {
        type: String,
        enum: ['credit', 'debit'],
      },
      amount: Number,
      balanceBefore: Number,
      balanceAfter: Number,
      description: String,
      referenceType: {
        type: String,
        enum: ['payment', 'refund', 'topup', 'withdrawal', 'transfer', 'fee', 'cashback'],
      },
      referenceId: String,
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],

    // Metadata
    metadata: {
      type: Schema.Types.Mixed,
    },

    // Timestamps
    lastTransactionAt: Date,
    lastTopupAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound Indexes
WalletSchema.index({ tenantId: 1, status: 1 });
WalletSchema.index({ tenantId: 1, customerId: 1, type: 1 });
WalletSchema.index({ tenantId: 1, businessId: 1 });
WalletSchema.index({ customerId: 1, type: 1 });
WalletSchema.index({ createdAt: -1 });

// Virtual for total balance
WalletSchema.virtual('totalBalance').get(function () {
  return this.balance + this.pendingBalance;
});

// Methods
WalletSchema.methods.addTransaction = function (
  transaction: Omit<IWalletTransaction, 'createdAt'>
): void {
  this.transactionHistory.push({
    ...transaction,
    createdAt: new Date(),
  });
  this.lastTransactionAt = new Date();

  if (transaction.type === 'credit') {
    if (transaction.referenceType === 'topup' || transaction.referenceType === 'refund') {
      this.lastTopupAt = new Date();
    }
  }
};

// Pre-save middleware to reset daily/monthly spent
WalletSchema.pre('save', function (next) {
  const now = new Date();
  const lastUpdate = this.updatedAt ? new Date(this.updatedAt) : now;

  // Reset daily spent if it's a new day
  if (now.getDate() !== lastUpdate.getDate()) {
    this.dailySpent = 0;
  }

  // Reset monthly spent if it's a new month
  if (now.getMonth() !== lastUpdate.getMonth() || now.getFullYear() !== lastUpdate.getFullYear()) {
    this.monthlySpent = 0;
  }

  next();
});

// Static Methods
WalletSchema.statics.generateWalletId = function (tenantId: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `WAL-${tenantId.substring(0, 4).toUpperCase()}-${timestamp}-${random}`;
};

export const Wallet = mongoose.model<IWallet>('Wallet', WalletSchema);
export default Wallet;
