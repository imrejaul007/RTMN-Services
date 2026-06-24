/**
 * @hojai/payment — Unified Payment SDK for the HOJAI AI / RABTUL ecosystem.
 *
 * Wraps four payment services + cross-service settlement/webhook surface:
 *  - rez-payment-service           (Razorpay + UPI + card + netbanking)
 *  - rez-bill-payments-service     (BBPS bill pay: electricity, gas, etc.)
 *  - REZ-sepa-payment-service      (SEPA / SEPA Instant / SEPA Direct Debit — EUR)
 *  - REZ-payment-gateway           (cross-rail orchestration + multi-currency)
 *  - Settlement aggregator         (cross-rail settlements + reconciliation)
 *  - Webhook config + delivery log (config, retries, signature helper)
 *
 * Sub-clients (top-level subpath exports):
 *  - .pay         PayClient         (rez-payment-service)
 *  - .bill        BillClient        (rez-bill-payments-service)
 *  - .sepa        SepaClient        (REZ-sepa-payment-service)
 *  - .gateway     GatewayClient     (REZ-payment-gateway)
 *  - .settlement  SettlementClient  (cross-rail settlements)
 *  - .webhook     WebhookClient     (endpoints + delivery log)
 *
 * Usage:
 *   import { Payment } from '@hojai/payment';
 *   const payment = new Payment({ apiKey: 'sk_...', baseUrl: 'https://hub.example.com' });
 *   const p = await payment.pay.initiate({ orderId: 'o-1', amount: 499, paymentMethod: 'upi' });
 *   const bill = await payment.bill.fetchBill({ providerId: '...', consumerNumber: '...' });
 */

import type { HojaiConfig } from './foundation-config.js';
import { resolveConfig } from './foundation-config.js';
import { PayClient } from './pay.js';
import { BillClient } from './bill.js';
import { SepaClient } from './sepa.js';
import { GatewayClient } from './gateway.js';
import { SettlementClient } from './settlement.js';
import { WebhookClient } from './webhook.js';

// Re-exports for subpath consumers
export { PayClient } from './pay.js';
export { BillClient } from './bill.js';
export { SepaClient } from './sepa.js';
export { GatewayClient } from './gateway.js';
export { SettlementClient } from './settlement.js';
export { WebhookClient } from './webhook.js';
export { DEFAULT_CONFIG } from './foundation-config.js';
export { request, sleep, backoff, HttpError, buildUrl } from './utils.js';

export class PaymentClient {
  readonly pay: PayClient;
  readonly bill: BillClient;
  readonly sepa: SepaClient;
  readonly gateway: GatewayClient;
  readonly settlement: SettlementClient;
  readonly webhook: WebhookClient;
  readonly config: ReturnType<typeof resolveConfig>;

  constructor(config: HojaiConfig) {
    const resolved = resolveConfig(config);
    this.config = resolved;
    this.pay = new PayClient(resolved);
    this.bill = new BillClient(resolved);
    this.sepa = new SepaClient(resolved);
    this.gateway = new GatewayClient(resolved);
    this.settlement = new SettlementClient(resolved);
    this.webhook = new WebhookClient(resolved);
  }
}

/**
 * Backwards-compatible alias — many users expect `Payment` as the
 * default-export name, even though that conflicts with the global DOM
 * `Payment` type.
 */
export const Payment = PaymentClient;
export default PaymentClient;

// Type re-exports for ergonomic tree-shaking
export type { HojaiConfig } from './foundation-config.js';
export type ResolvedHojaiConfig = ReturnType<typeof resolveConfig>;
export type {
  PaymentMethod,
  PaymentPurpose,
  PaymentStatus,
  Payment as PaymentRecord,
  InitiatePaymentRequest,
  CapturePaymentRequest,
  RefundRequest,
  RazorpayOrder,
  RazorpayConfig
} from './pay.js';
export type {
  BillCategory,
  BillStatus,
  BillProvider,
  FetchedBill,
  BillPayment,
  PayBillRequest
} from './bill.js';
export type {
  SepaScheme,
  SepaStatus,
  SepaBeneficiary,
  SepaTransfer,
  CreateSepaTransferRequest,
  SepaMandate
} from './sepa.js';
export type {
  GatewayRail,
  GatewayStatus,
  Currency,
  GatewayPayment,
  CreateGatewayPaymentRequest,
  GatewayRefund
} from './gateway.js';
export type {
  SettlementRail,
  SettlementStatus,
  Settlement,
  ReconciliationReport
} from './settlement.js';
export type {
  WebhookEventType,
  WebhookEndpoint,
  WebhookDelivery,
  VerifySignatureResult
} from './webhook.js';
