/**
 * @hojai/nexha SDK
 *
 * Client for the Nexha federation network. Wraps 13 nexha-* services
 * into a single ergonomic TypeScript client. Built on top of @hojai/foundation.
 *
 * @example
 * ```ts
 * import { Nexha } from '@hojai/nexha';
 *
 * const nexha = new Nexha({ apiKey, baseUrl });
 *
 * // 1. Discover a supplier
 * const suppliers = await nexha.supplier.search({
 *   category: 'textiles',
 *   capability: 'cotton-tshirts',
 *   country: 'IN'
 * });
 *
 * // 2. Get a market price comparison
 * const compare = await nexha.pricing.compare('cotton-tshirt-m');
 *
 * // 3. Book warehouse slot + create shipment
 * const slots = await nexha.warehouse.listSlots('wh-1', { minCapacityKg: 1000 });
 * const booking = await nexha.warehouse.createBooking({
 *   warehouseId: 'wh-1', slotId: slots[0].id, customerId: 'b-maya', weightKg: 500
 * });
 * const shipment = await nexha.distribution.createShipment({
 *   origin: { name: 'Maya Warehouse', address: '...' },
 *   destination: { name: 'Buyer DC', address: '...' }
 * });
 *
 * // 4. Get trade finance for the order
 * const loan = await nexha.tradeFinance.createLoan({
 *   entityId: 'b-maya',
 *   offerId: 'offer-1',
 *   amount: { amount: 50000, currency: 'USD' }
 * });
 *
 * // 5. Aggregate tenant health
 * const summary = await nexha.tenant.getSummary('b-maya');
 * ```
 */

import type { HojaiConfig } from './foundation-config.js';
import { resolveConfig } from './foundation-config.js';
import { DirectoryClient } from './directory.js';
import { SupplierClient } from './supplier.js';
import { DistributionClient } from './distribution.js';
import { WarehouseClient } from './warehouse.js';
import { PricingClient } from './pricing.js';
import { TradeFinanceClient } from './trade-finance.js';
import { CommerceClient } from './commerce.js';
import { MissionClient } from './mission.js';
import { PartnerClient } from './partner.js';
import { AcpClient } from './acp.js';
import { HooksClient } from './hooks.js';
import { ProvisioningClient } from './provisioning.js';
import { TenantClient } from './tenant.js';

export type { HojaiConfig } from './foundation-config.js';
export { resolveConfig } from './foundation-config.js';
export { DirectoryClient } from './directory.js';
export { SupplierClient } from './supplier.js';
export { DistributionClient } from './distribution.js';
export { WarehouseClient } from './warehouse.js';
export { PricingClient } from './pricing.js';
export { TradeFinanceClient } from './trade-finance.js';
export { CommerceClient } from './commerce.js';
export { MissionClient } from './mission.js';
export { PartnerClient } from './partner.js';
export { AcpClient } from './acp.js';
export { HooksClient } from './hooks.js';
export { ProvisioningClient } from './provisioning.js';
export { TenantClient } from './tenant.js';

// ── Re-export all public types ─────────────────────────────
export type {
  Company, CompanyInput, DirectoryAgent, AgentInput
} from './directory.js';

export type {
  Supplier, SupplierInput
} from './supplier.js';

export type {
  Shipment, ShipmentInput, ShipmentStatus, Quote, QuoteRequest
} from './distribution.js';

export type {
  Warehouse, Slot, Booking, BookingInput, Bin, Transfer
} from './warehouse.js';

export type {
  Product, ProductInput, PricePoint, PriceInput,
  CompareResult, BatchCompareInput, PriceAlert, PriceAlertInput,
  DynamicPriceRequest, DynamicPriceResult
} from './pricing.js';

export type {
  Entity, EntityInput, CreditOffer, CreditOfferInput,
  Loan, LoanInput, Repayment, Dispute, FXQuote
} from './trade-finance.js';

export type {
  Order, OrderInput, OrderStatus, Payment, PaymentInput,
  PaymentStatus, Return, ReturnInput, ReturnStatus
} from './commerce.js';

export type {
  Mission, MissionInput, MissionStatus,
  Subtask, SubtaskStatus, MissionTemplate
} from './mission.js';

export type {
  Partner, RelationshipType,
  Interaction, InteractionInput,
  RecommendRequest, RecommendResult
} from './partner.js';

export type {
  Negotiation, NegotiationStatus,
  CreateNegotiationInput, NegotiationMessage, SendMessageInput
} from './acp.js';

export type {
  Subscription, SubscriptionInput, Delivery,
  SignRequest, SignResult, VerifyRequest, VerifyResult
} from './hooks.js';

export type {
  Plan, PlanInput, PlanStatus, PlanResource,
  PlanTransition, PlanEvent
} from './provisioning.js';

export type {
  SummarySource, TenantSummary, UpstreamHealth
} from './tenant.js';

/**
 * Main Nexha client (facade over all 13 sub-clients)
 */
export class Nexha {
  public readonly directory: DirectoryClient;
  public readonly supplier: SupplierClient;
  public readonly distribution: DistributionClient;
  public readonly warehouse: WarehouseClient;
  public readonly pricing: PricingClient;
  public readonly tradeFinance: TradeFinanceClient;
  public readonly commerce: CommerceClient;
  public readonly mission: MissionClient;
  public readonly partner: PartnerClient;
  public readonly acp: AcpClient;
  public readonly hooks: HooksClient;
  public readonly provisioning: ProvisioningClient;
  public readonly tenant: TenantClient;
  public readonly config: ReturnType<typeof resolveConfig>;

  constructor(config: HojaiConfig) {
    this.config = resolveConfig(config);
    this.directory = new DirectoryClient(this.config);
    this.supplier = new SupplierClient(this.config);
    this.distribution = new DistributionClient(this.config);
    this.warehouse = new WarehouseClient(this.config);
    this.pricing = new PricingClient(this.config);
    this.tradeFinance = new TradeFinanceClient(this.config);
    this.commerce = new CommerceClient(this.config);
    this.mission = new MissionClient(this.config);
    this.partner = new PartnerClient(this.config);
    this.acp = new AcpClient(this.config);
    this.hooks = new HooksClient(this.config);
    this.provisioning = new ProvisioningClient(this.config);
    this.tenant = new TenantClient(this.config);
  }
}

export default Nexha;

// ── Resilience Exports ───────────────────────────────────────────────

export { NexhaError, NexhaAuthError, NexhaInvalidKeyError, NexhaInsufficientScopeError, NexhaRateLimitError, NexhaNotFoundError, NexhaValidationError, NexhaServerError, NexhaTimeoutError, NexhaConnectionError, NexhaCircuitOpenError, NexhaConfigError, NexhaAbortError } from './errors.js';
export type { RetryOptions } from './retry.js';
export { withRetry, calculateDelay, retryConfig } from './retry.js';
export { CircuitBreaker } from './circuit-breaker.js';
export { isRetryable, isAuthError, getErrorMessage, parseRetryAfter } from './errors.js';