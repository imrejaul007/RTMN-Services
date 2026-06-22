/**
 * HOJAI Merchant Bridge - Main Index
 * Connects Hojai AI to REZ Merchant platform
 */
export * from './types.js';
export { MerchantBridgeService, merchantBridge } from './merchantService.js';
export { OrderBridgeService, orderBridge } from './orderService.js';
export { BookingBridgeService, bookingBridge } from './bookingService.js';
export { InventoryBridgeService, inventoryBridge } from './inventoryService.js';

/**
 * Usage Example:
 *
 * ```typescript
 * import { merchantBridge, orderBridge, bookingBridge } from '@hojai/merchant-bridge';
 *
 * // Get merchant context for AI
 * const context = await merchantBridge.getMerchantContext(merchantId);
 *
 * // Create order from WhatsApp
 * const order = await orderBridge.create({
 *   merchantId,
 *   customerId,
 *   items: [{ menuItemId: '123', quantity: 2 }],
 *   type: 'pickup'
 * });
 *
 * // Create booking
 * const booking = await bookingBridge.create({
 *   merchantId,
 *   customerId,
 *   date: '2026-05-29',
 *   time: '14:00',
 *   guests: 4
 * });
 * ```
 */


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hojai-merchant-bridge',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe
app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready' });
});
