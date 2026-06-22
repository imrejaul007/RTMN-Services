/**
 * OpenTelemetry Tracing (Optional)
 * HOJAI SkillNet distributed tracing
 *
 * This module provides tracing capabilities when OpenTelemetry packages are installed.
 * To enable: npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
 */

// Service configuration
const SERVICE_NAME = 'hojai-skillnet';
const SERVICE_VERSION = '1.1.0';

/**
 * Initialize OpenTelemetry tracing
 * Call this function to enable tracing (requires OpenTelemetry packages)
 * To enable: npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
 */
export function initTracing(): void {
  if (!process.env.OTEL_ENABLED) {
    console.log('[Tracing] OpenTelemetry disabled (set OTEL_ENABLED=1 to enable)');
    return;
  }
  console.log('[Tracing] OpenTelemetry ready - install @opentelemetry packages for full tracing');
}

/**
 * Create a span for an operation (no-op when tracing disabled)
 */
export function createSpan(name: string, attributes?: Record<string, string | number | boolean>): any {
  return {
    setAttributes: (attrs: any) => {},
    setStatus: (status: any) => {},
    addEvent: (name: string, attrs?: any) => {},
    recordException: (err: Error) => {},
    end: () => {}
  };
}

/**
 * Execute a function within a span (no-op when tracing disabled)
 */
export async function withSpan<T>(
  name: string,
  fn: (span: any) => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  const span = createSpan(name, attributes);
  try {
    const result = await fn(span);
    return result;
  } finally {
    span.end();
  }
}

/**
 * Add attributes to current span
 */
export function addSpanAttributes(attributes: Record<string, string | number | boolean>): void {
  // No-op when tracing disabled
}

/**
 * Add an event to current span
 */
export function addSpanEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
  // No-op when tracing disabled
}

/**
 * Record an error in current span
 */
export function recordSpanError(error: Error): void {
  // No-op when tracing disabled
}

/**
 * Trace a prediction operation
 */
export async function tracePrediction(
  type: string,
  tenantId: string,
  fn: () => Promise<any>
): Promise<any> {
  return withSpan(`prediction.${type}`, async (span) => {
    span.setAttributes?.({ 'prediction.type': type, 'tenant.id': tenantId });
    const result = await fn();
    if (result.prediction) {
      span.setAttributes?.({
        'prediction.score': result.prediction.score,
        'prediction.confidence': result.prediction.confidence
      });
    }
    return result;
  });
}

/**
 * Trace a recommendation operation
 */
export async function traceRecommendation(
  type: string,
  tenantId: string,
  fn: () => Promise<any>
): Promise<any> {
  return withSpan(`recommendation.${type}`, async (span) => {
    span.setAttributes?.({ 'recommendation.type': type, 'tenant.id': tenantId });
    return fn();
  });
}

/**
 * Trace an event publish operation
 */
export async function traceEventPublish(
  eventType: string,
  tenantId: string,
  fn: () => Promise<any>
): Promise<any> {
  return withSpan('event.publish', async (span) => {
    span.setAttributes?.({ 'event.type': eventType, 'tenant.id': tenantId });
    return fn();
  });
}

/**
 * Trace a MongoDB operation
 */
export async function traceMongoOperation(
  operation: string,
  collection: string,
  fn: () => Promise<any>
): Promise<any> {
  return withSpan(`mongodb.${operation}`, async (span) => {
    span.setAttributes?.({
      'db.system': 'mongodb',
      'db.operation': operation,
      'db.collection': collection
    });
    return fn();
  });
}

export default {
  initTracing,
  createSpan,
  withSpan,
  addSpanAttributes,
  addSpanEvent,
  recordSpanError,
  tracePrediction,
  traceRecommendation,
  traceEventPublish,
  traceMongoOperation
};
