/**
 * @hojai/twin SDK — TwinOS (11+ specialized twins + the central Hub).
 *
 * @example
 * ```ts
 * import { Twin } from '@hojai/twin';
 *
 * const t = new Twin({ apiKey, baseUrl: 'https://api.hojai.ai' });
 *
 * // 1. Generic twin CRUD via the Hub
 * const twins = await t.hub.list({ type: 'customer' });
 * const newTwin = await t.hub.create({ type: 'product', name: 'Cotton t-shirt' });
 * await t.hub.setState(newTwin.id, { inStock: true });
 *
 * // 2. Specialized: customer twin
 * const cust = await t.customer.createCustomer({ corpId: 'c-1', name: 'Alice' });
 * await t.customer.recordEvent(cust.id, { type: 'purchase', properties: { sku: 'tee-1' }, occurredAt: new Date().toISOString() });
 * const ltv = await t.customer.getLtv(cust.id);
 *
 * // 3. Specialized: order twin
 * const order = await t.order.createOrder({ customerId: 'c-1', lines: [{ productId: 'p-1', name: 'Tee', quantity: 2, unitPrice: { amount: 2000, currency: 'USD' } }] });
 * await t.order.transitionStatus(order.id, 'shipped');
 *
 * // 4. Voice twin
 * const recording = await t.voice.synthesize({ voiceProfileId: 'v-1', text: 'Welcome to HOJAI' });
 * const transcript = await t.voice.transcribe({ audioUrl: recording.audioUrl, language: 'en' });
 * ```
 */

import type { HojaiConfig } from './foundation-config.js';
import { resolveConfig } from './foundation-config.js';
import { TwinHubClient } from './hub.js';
import { CustomerTwinClient, type CustomerTwin, type CustomerSegment, type CustomerEvent } from './customer.js';
import { OrderTwinClient, type OrderTwin, type Shipment, type Return, type OrderStatus, type OrderLine } from './order.js';
import { EmployeeTwinClient, type EmployeeTwin, type PerformanceReview } from './employee.js';
import { VoiceTwinClient, type VoiceProfile, type Recording, type TranscribeResult } from './voice.js';
import { TWIN_PORTS, type TwinRecord, type TwinRelationship, type TwinStats, type TwinCategory, type Money } from './types.js';

export type { HojaiConfig } from './foundation-config.js';
export { resolveConfig } from './foundation-config.js';
export { TwinHubClient } from './hub.js';
export { CustomerTwinClient, type CustomerTwin, type CustomerSegment, type CustomerEvent } from './customer.js';
export { OrderTwinClient, type OrderTwin, type Shipment, type Return, type OrderStatus, type OrderLine } from './order.js';
export { EmployeeTwinClient, type EmployeeTwin, type PerformanceReview } from './employee.js';
export { VoiceTwinClient, type VoiceProfile, type Recording, type TranscribeResult } from './voice.js';
export { TWIN_PORTS, type TwinRecord, type TwinRelationship, type TwinStats, type TwinCategory, type Money } from './types.js';

/**
 * Main Twin SDK client (facade).
 *
 * 5 sub-clients: hub (generic), customer, order, employee, voice.
 * The Hub is the unified entry point for any twin type; the 4 specialized
 * clients expose rich domain methods for the most-used twins.
 */
export class Twin {
  public readonly hub: TwinHubClient;
  public readonly customer: CustomerTwinClient;
  public readonly order: OrderTwinClient;
  public readonly employee: EmployeeTwinClient;
  public readonly voice: VoiceTwinClient;
  public readonly config: ReturnType<typeof resolveConfig>;

  constructor(config: HojaiConfig) {
    const resolved = resolveConfig(config);
    this.config = resolved;
    this.hub = new TwinHubClient(resolved);
    this.customer = new CustomerTwinClient(resolved);
    this.order = new OrderTwinClient(resolved);
    this.employee = new EmployeeTwinClient(resolved);
    this.voice = new VoiceTwinClient(resolved);
  }
}

export default Twin;
