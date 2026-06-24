/**
 * @hojai/commerce SDK
 *
 * Client for the RABTUL commerce ecosystem. Wraps 9 rez-* services
 * (wallet, payment, catalog, booking, cashback, gift-card, invoice,
 * bill-payments, loyalty) into a single ergonomic client.
 * Built on top of @hojai/foundation.
 *
 * @example
 * ```ts
 * import { Commerce } from '@hojai/commerce';
 *
 * const commerce = new Commerce({ apiKey, baseUrl });
 *
 * // 1. Get user wallet
 * const wallet = await commerce.wallet.get('user-123');
 *
 * // 2. Create Razorpay order
 * const order = await commerce.payment.create({
 *   orderId: 'ord-1',
 *   userId: 'user-123',
 *   amount: 50000,
 *   method: 'upi'
 * });
 *
 * // 3. Verify payment
 * await commerce.payment.verify({
 *   razorpayOrderId: order.id,
 *   razorpayPaymentId: 'pay-xyz',
 *   razorpaySignature: 'sig'
 * });
 *
 * // 4. Credit cashback
 * await commerce.cashback.accrue({
 *   userId: 'user-123',
 *   amount: 500,
 *   source: 'order:ord-1'
 * });
 *
 * // 5. Issue gift card
 * const giftCard = await commerce.giftCard.create({
 *   initialBalance: 1000,
 *   currency: 'INR',
 *   issuedTo: 'user-123'
 * });
 *
 * // 6. Generate invoice
 * const invoice = await commerce.invoice.create({
 *   customerId: 'cust-1',
 *   customerName: 'Maya Collective',
 *   issueDate: '2026-06-24',
 *   dueDate: '2026-07-24',
 *   currency: 'INR',
 *   lineItems: [{ description: 'Consulting', quantity: 1, unitPrice: 50000 }]
 * });
 * await commerce.invoice.send(invoice.id);
 * ```
 */

import type { HojaiConfig } from './foundation-config.js';
import { resolveConfig } from './foundation-config.js';
import { WalletClient } from './wallet.js';
import { PaymentClient } from './payment.js';
import { CatalogClient } from './catalog.js';
import { BookingClient } from './booking.js';
import { CashbackClient } from './cashback.js';
import { GiftCardClient } from './gift-card.js';
import { InvoiceClient } from './invoice.js';
import { BillPaymentsClient } from './bill-payments.js';
import { LoyaltyClient } from './loyalty.js';

export type { HojaiConfig } from './foundation-config.js';
export { resolveConfig } from './foundation-config.js';
export { WalletClient } from './wallet.js';
export { PaymentClient } from './payment.js';
export { CatalogClient } from './catalog.js';
export { BookingClient } from './booking.js';
export { CashbackClient } from './cashback.js';
export { GiftCardClient } from './gift-card.js';
export { InvoiceClient } from './invoice.js';
export { BillPaymentsClient } from './bill-payments.js';
export { LoyaltyClient } from './loyalty.js';

// ── Re-export all public types ─────────────────────────────
export type {
  Wallet, WalletTier, WalletStatus, Transaction,
  CreditScore, MerchantWallet, Payout, SavingsGoal
} from './wallet.js';

export type {
  Payment, PaymentMethod, PaymentStatus,
  CreatePaymentInput, RazorpayOrder, Refund, VerifyPaymentInput, WebhookEvent
} from './payment.js';

export type {
  Product, ProductInput, Category, Inventory
} from './catalog.js';

export type {
  Booking, BookingInput, BookingStatus, AvailabilityResult, AvailabilityQuery
} from './booking.js';

export type {
  CashbackEntry, CashbackBalance, CashbackRate, CashbackStatus,
  AccrualRequest, RedemptionRequest
} from './cashback.js';

export type {
  GiftCard, GiftCardStatus, GiftCardInput, GiftCardTransaction
} from './gift-card.js';

export type {
  Invoice, InvoiceInput, InvoiceStatus, InvoicePayment, GstReport
} from './invoice.js';

export type {
  Biller, BillerCategory, FetchedBill,
  BillPaymentInput, BillPayment, BillRefund, BillFetchInput
} from './bill-payments.js';

export type {
  TierInfo, LoyaltyTier, UpgradePreview, LoyaltyBalance,
  LoyaltyTransaction, EarnRequest, BatchEarnRequest,
  LoyaltySummary, SubscribeRequest
} from './loyalty.js';

/**
 * Main Commerce client (facade over 9 sub-clients)
 */
export class Commerce {
  public readonly wallet: WalletClient;
  public readonly payment: PaymentClient;
  public readonly catalog: CatalogClient;
  public readonly booking: BookingClient;
  public readonly cashback: CashbackClient;
  public readonly giftCard: GiftCardClient;
  public readonly invoice: InvoiceClient;
  public readonly billPayments: BillPaymentsClient;
  public readonly loyalty: LoyaltyClient;
  public readonly config: ReturnType<typeof resolveConfig>;

  constructor(config: HojaiConfig) {
    this.config = resolveConfig(config);
    this.wallet = new WalletClient(this.config);
    this.payment = new PaymentClient(this.config);
    this.catalog = new CatalogClient(this.config);
    this.booking = new BookingClient(this.config);
    this.cashback = new CashbackClient(this.config);
    this.giftCard = new GiftCardClient(this.config);
    this.invoice = new InvoiceClient(this.config);
    this.billPayments = new BillPaymentsClient(this.config);
    this.loyalty = new LoyaltyClient(this.config);
  }
}

export default Commerce;