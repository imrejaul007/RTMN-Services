/**
 * @rez/webhook-sdk - Webhook Security & Production Infrastructure
 *
 * Features:
 * - HMAC-SHA256 signature verification
 * - Timing-safe comparison
 * - Replay protection with Redis
 * - WebSocket server
 * - RBAC permissions
 * - Prometheus metrics
 * - Health checks
 *
 * @example
 * ```typescript
 * import { verifyWebhookSignature, metrics, RBAC } from '@rez/webhook-sdk';
 *
 * // Verify webhook
 * const verified = verifyWebhookSignature(body, headers, secret);
 *
 * // Track metrics
 * metrics.counter('requests_total', 1, { endpoint: '/api/orders' });
 *
 * // Check permissions
 * RBAC.hasPermission('admin', 'orders', 'create');
 * ```
 */

export * from './verify.js';
export * from './websocket.js';
export * from './rbac.js';
export * from './monitoring.js';
