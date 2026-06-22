/**
 * Pilot Zod schema validation layer for critical API responses.
 *
 * BUG-036 / BUG-060: zod was listed in package.json but zero service files
 * used it for runtime validation. A backend field rename would silently break
 * the UI with no warning. This module adds schema validation to the 3 highest-
 * impact API surfaces (Merchants, Orders, Users) plus a reusable paginated
 * wrapper.
 *
 * Pattern: try { schema.parse(data) } catch { logger.error(...); throw Error(...) }
 *
 * Extend these schemas as backend fields change. The inferred TypeScript types
 * (via z.infer<>) replace the hand-written interface types for validated shapes.
 */

import { z } from 'zod';

// ============================================================
// Shared / reusable primitives
// ============================================================

/** ISO-8601 date-time string */
export const isoDateSchema = z.string().datetime({ message: 'Invalid ISO-8601 datetime' });

export const paginationSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

/** Reusable paginated response wrapper. Accepts the data array schema. */
export function paginatedSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema,
    pagination: paginationSchema,
  });
}

// ============================================================
// Merchant schemas  (services/api/merchants.ts)
// ============================================================

const storeSchema = z.object({
  _id: z.string(),
  name: z.string(),
  status: z.string(),
  isProgramMerchant: z.boolean().optional(),
  baseCashbackPercent: z.number().optional(),
  estimatedPrepMinutes: z.number().optional(),
});

const bankDetailsSchema = z.object({
  accountNumber: z.string(),
  ifscCode: z.string(),
  accountHolderName: z.string(),
  isVerified: z.boolean(),
});

const documentSchema = z.object({
  type: z.string(),
  url: z.string().url({ message: 'Document URL must be a valid URL' }),
  status: z.string(),
});

export const MerchantSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  businessName: z.string(),
  businessType: z.string(),
  email: z.string().email({ message: 'Merchant email must be valid' }),
  phoneNumber: z.string(),
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']),
  verificationStatus: z.enum(['pending', 'verified', 'rejected']),
  stores: z.array(storeSchema),
  bankDetails: bankDetailsSchema.optional(),
  documents: z.array(documentSchema).optional(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

/** Inferred TypeScript type — use this instead of hand-written interfaces for validated shapes. */
export type ValidatedMerchant = z.infer<typeof MerchantSchema>;

export const MerchantListItemSchema = MerchantSchema.omit({
  // Omit heavy nested fields from list items to keep payload lean during validation
  bankDetails: true,
  documents: true,
});

export const MerchantsListResponseSchema = z.object({
  merchants: z.array(MerchantListItemSchema),
  pagination: paginationSchema,
});

export type ValidatedMerchantsListResponse = z.infer<typeof MerchantsListResponseSchema>;

/** Wallet balance block shared by MerchantWallet and MerchantWalletSummary */
const walletBalanceSchema = z.object({
  total: z.number(),
  available: z.number(),
  pending: z.number(),
  withdrawn: z.number(),
  held: z.number().optional(),
});

export const MerchantWalletSchema = z.object({
  _id: z.string(),
  merchant: z.string(),
  balance: walletBalanceSchema.extend({ withdrawn: z.number() }),
  statistics: z.object({
    totalSales: z.number(),
    totalPlatformFees: z.number(),
    netSales: z.number(),
    totalOrders: z.number(),
    averageOrderValue: z.number(),
    totalRefunds: z.number(),
    totalWithdrawals: z.number(),
  }),
  bankDetails: z.object({
    accountNumber: z.string(),
    ifscCode: z.string(),
    accountHolderName: z.string(),
    bankName: z.string(),
    isVerified: z.boolean(),
  }).optional(),
  isActive: z.boolean(),
  createdAt: isoDateSchema,
});

export type ValidatedMerchantWallet = z.infer<typeof MerchantWalletSchema>;

export const WithdrawalRequestSchema = z.object({
  _id: z.string(),
  merchantId: z.string(),
  amount: z.number(),
  status: z.enum(['pending', 'approved', 'rejected', 'completed']),
  bankDetails: z.object({
    accountNumber: z.string(),
    ifscCode: z.string(),
    accountHolderName: z.string(),
    bankName: z.string(),
  }),
  requestedAt: isoDateSchema,
  processedAt: isoDateSchema.optional(),
  processedBy: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export type ValidatedWithdrawalRequest = z.infer<typeof WithdrawalRequestSchema>;

// ============================================================
// Order schemas  (services/api/orders.ts)
// ============================================================

const orderUserSchema = z.object({
  _id: z.string(),
  profile: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  }).optional(),
  phoneNumber: z.string(),
  email: z.string().optional(),
});

const orderStoreSchema = z.object({
  _id: z.string(),
  name: z.string(),
  merchantId: z.string(),
});

const orderItemProductSchema = z.object({
  _id: z.string(),
  name: z.string(),
});

const orderItemSchema = z.object({
  product: orderItemProductSchema,
  variant: z.object({ name: z.string() }).optional(),
  quantity: z.number().int().min(0),
  price: z.number(),
  total: z.number(),
});

const orderTotalsSchema = z.object({
  subtotal: z.number(),
  tax: z.number(),
  delivery: z.number(),
  discount: z.number(),
  lockFeeDiscount: z.number().optional(),
  cashback: z.number(),
  total: z.number(),
  paidAmount: z.number().optional(),
  refundAmount: z.number().optional(),
  platformFee: z.number(),
  merchantPayout: z.number(),
  snapshotCashbackRate: z.number().optional(),
});

const orderPaymentCoinsSchema = z.object({
  rezCoins: z.number().optional(),
  promoCoins: z.number().optional(),
  storePromoCoins: z.number().optional(),
  totalCoinsValue: z.number().optional(),
});

const orderPaymentSchema = z.object({
  method: z.string(),
  status: z.string(),
  coinsUsed: orderPaymentCoinsSchema.optional(),
});

const orderFulfillmentDetailsSchema = z.object({
  storeAddress: z.string().optional(),
  tableNumber: z.string().optional(),
  vehicleInfo: z.string().optional(),
  estimatedReadyTime: isoDateSchema.optional(),
  pickupInstructions: z.string().optional(),
});

export const OrderSchema = z.object({
  _id: z.string(),
  orderNumber: z.string(),
  user: orderUserSchema,
  store: orderStoreSchema,
  items: z.array(orderItemSchema),
  totals: orderTotalsSchema,
  payment: orderPaymentSchema.optional(),
  status: z.enum([
    'placed',
    'confirmed',
    'preparing',
    'ready',
    'dispatched',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'cancelling',
    'returned',
    'refunded',
  ]),
  paymentStatus: z.enum([
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled',
    'expired',
    'refund_initiated',
    'refund_processing',
    'refund_failed',
    'partially_refunded',
    'refunded',
  ]),
  paymentMethod: z.string(),
  fulfillmentType: z.enum(['delivery', 'pickup', 'drive_thru', 'dine_in']).optional(),
  deliveryType: z.string().optional(),
  fulfillmentDetails: orderFulfillmentDetailsSchema.optional(),
  stateVersion: z.number().optional(),
  flags: z.array(z.string()).optional(),
  postPaymentProcessed: z.boolean().optional(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export type ValidatedOrder = z.infer<typeof OrderSchema>;

export const OrderListItemSchema = OrderSchema.omit({
  // Omit heavy nested fields from list items
  items: true,
  fulfillmentDetails: true,
});

export const OrdersListResponseSchema = z.object({
  orders: z.array(OrderListItemSchema),
  pagination: paginationSchema,
});

export type ValidatedOrdersListResponse = z.infer<typeof OrdersListResponseSchema>;

export const OrderStatsSchema = z.object({
  total: z.number(),
  today: z.number(),
  thisWeek: z.number(),
  thisMonth: z.number(),
  byStatus: z.object({
    pending: z.number(),
    confirmed: z.number(),
    preparing: z.number(),
    ready: z.number(),
    out_for_delivery: z.number(),
    delivered: z.number(),
    cancelled: z.number(),
    refunded: z.number(),
  }),
  revenue: z.object({
    today: z.number(),
    thisWeek: z.number(),
    thisMonth: z.number(),
    totalPlatformFees: z.number(),
  }),
});

export type ValidatedOrderStats = z.infer<typeof OrderStatsSchema>;

// ============================================================
// User schemas  (services/api/users.ts)
// ============================================================

const userProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar: z.string().optional(),
});

const userStatsSchema = z.object({
  lifetimeCoinsEarned: z.number().optional(),
  coinsRedeemed: z.number().optional(),
  totalCheckIns: z.number().optional(),
  currentStreak: z.number().optional(),
  lastActive: isoDateSchema.optional(),
});

const achievementSchema = z.object({
  _id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  unlockedAt: isoDateSchema,
});

export const UserSchema = z.object({
  _id: z.string(),
  phoneNumber: z.string(),
  email: z.string().optional(),
  profile: userProfileSchema.optional(),
  role: z.enum(['user', 'consumer', 'merchant', 'admin', 'support', 'operator', 'super_admin']),
  status: z.enum(['active', 'suspended']).optional(),
  isSuspended: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean(),
  lastLogin: isoDateSchema.optional(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  coinBalance: z.number().optional(),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum', 'diamond']).optional(),
  segment: z.enum([
    'normal',
    'verified_student',
    'verified_employee',
    'verified_defence',
    'verified_healthcare',
    'verified_teacher',
    'verified_senior',
    'verified_government',
    'verified_differentlyAbled',
  ]).optional(),
  featureLevel: z.number().optional(),
  verificationStatus: z.enum(['none', 'provisional', 'pending', 'verified']).optional(),
  isFlagged: z.boolean().optional(),
  flagReason: z.string().optional(),
  stats: userStatsSchema.optional(),
  achievements: z.array(achievementSchema).optional(),
});

export type ValidatedUser = z.infer<typeof UserSchema>;

export const UserListItemSchema = UserSchema.omit({
  // Omit heavy nested fields from list items
  achievements: true,
  stats: true,
});

export const UsersListResponseSchema = z.object({
  users: z.array(UserListItemSchema),
  pagination: paginationSchema,
});

export type ValidatedUsersListResponse = z.infer<typeof UsersListResponseSchema>;

const coinTypeSchema = z.enum(['promo', 'branded', 'prive', 'cashback', 'referral', 'rez']);

export const UserWalletSchema = z.object({
  _id: z.string(),
  user: z.string(),
  balance: z.object({
    total: z.number(),
    available: z.number(),
    pending: z.number(),
    cashback: z.number(),
  }),
  coins: z
    .array(
      z.object({
        type: coinTypeSchema,
        amount: z.number(),
        isActive: z.boolean(),
        expiryDate: isoDateSchema.optional(),
      })
    )
    .optional(),
  brandedCoins: z
    .array(
      z.object({
        merchantId: z.string(),
        merchantName: z.string(),
        amount: z.number(),
        isActive: z.boolean(),
      })
    )
    .optional(),
  currency: z.string(),
  statistics: z
    .object({
      totalEarned: z.number(),
      totalSpent: z.number(),
      totalCashback: z.number(),
      totalRefunds: z.number(),
    })
    .optional(),
  isFrozen: z.boolean(),
  frozenReason: z.string().optional(),
  lastTransactionAt: isoDateSchema.optional(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export type ValidatedUserWallet = z.infer<typeof UserWalletSchema>;

const fraudFlagCoinVelocitySchema = z.object({
  flaggedAt: isoDateSchema.optional(),
  zScore: z.number().optional(),
  earnedLast24h: z.number().optional(),
  cleared: z.boolean().optional(),
  clearedAt: isoDateSchema.optional(),
});

const fraudFlagsSchema = z.object({
  coinVelocity: fraudFlagCoinVelocitySchema.optional(),
});

export const FraudFlaggedUserSchema = z.object({
  _id: z.string(),
  name: z.string().optional(),
  email: z.string().optional(),
  phoneNumber: z.string().optional(),
  earnedLast24h: z.number().optional(),
  zScore: z.number().optional(),
  flaggedAt: isoDateSchema.optional(),
  fraudFlags: fraudFlagsSchema.optional(),
  isSuspended: z.boolean().optional(),
  status: z.enum(['active', 'suspended']).optional(),
  reviewStatus: z.enum(['pending', 'cleared']).optional(),
  clearedAt: isoDateSchema.optional(),
});

export type ValidatedFraudFlaggedUser = z.infer<typeof FraudFlaggedUserSchema>;

export const FraudQueueSummarySchema = z.object({
  all: z.number(),
  pending: z.number(),
  cleared: z.number(),
  suspended: z.number(),
});

export const FraudQueueResponseSchema = z.object({
  users: z.array(FraudFlaggedUserSchema),
  summary: FraudQueueSummarySchema,
});

export type ValidatedFraudQueueResponse = z.infer<typeof FraudQueueResponseSchema>;

// ============================================================
// Validation helper — use this in service files
// ============================================================

/**
 * Validate a parsed response against a Zod schema.
 * Logs the validation error and re-throws as a plain Error so callers
 * can catch it without importing zod.
 *
 * @param schema   - Zod schema to validate against
 * @param data     - Raw response data from the API
 * @param context  - Human-readable label for the log (e.g. "MerchantsService.getMerchants")
 */
export function validateResponse<T extends z.ZodType>(
  schema: T,
  data: unknown,
  context: string
): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    // Use the existing logger so it integrates with the app's telemetry
    const { logger } = require('../logger');
    logger.error(`[ZodValidation] ${context} failed: ${issues}`, {
      errors: result.error.issues.map((i) => ({
        path: i.path,
        message: i.message,
        code: i.code,
      })),
    });
    throw new Error(`[ZodValidation] ${context}: response shape mismatch — ${issues}`);
  }
  return result.data;
}
