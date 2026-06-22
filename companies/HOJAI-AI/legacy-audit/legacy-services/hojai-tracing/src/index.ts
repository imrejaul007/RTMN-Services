/**
 * HOJAI Tracing - Distributed Tracing with OpenTelemetry
 *
 * Provides end-to-end observability for AI operations including
 * LLM calls, vector operations, and agent executions.
 *
 * @module @hojai/tracing
 * @version 1.0.0
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_TENANT_ID,
} from '@opentelemetry/semantic-conventions';
import {
  trace,
  SpanKind,
  SpanStatusCode,
  context,
  Span,
  SpanAttributes,
  Tracer,
} from '@opentelemetry/api';

// Re-export types for consumers
export { Span, SpanKind, SpanStatusCode, Tracer };

/**
 * Configuration options for the tracing SDK
 */
export interface TracingConfig {
  /** Service name displayed in traces */
  serviceName?: string;
  /** Service version */
  serviceVersion?: string;
  /** Tenant ID for multi-tenant deployments */
  tenantId?: string;
  /** Exporter type: 'jaeger' | 'zipkin' | 'otlp' | 'console' */
  exporter?: 'jaeger' | 'zipkin' | 'otlp' | 'console';
  /** Exporter endpoint URL */
  exporterEndpoint?: string;
  /** Enable development logging */
  devMode?: boolean;
  /** Enable specific instrumentations */
  instrumentations?: {
    http?: boolean;
    express?: boolean;
    mongodb?: boolean;
    llm?: boolean;
    vector?: boolean;
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<TracingConfig> = {
  serviceName: 'hojai',
  serviceVersion: '1.0.0',
  tenantId: process.env.TENANT_ID || 'default',
  exporter: (process.env.TRACING_EXPORTER as TracingConfig['exporter']) || 'console',
  exporterEndpoint: process.env.TRACING_ENDPOINT || 'http://localhost:4318/v1/traces',
  devMode: process.env.NODE_ENV !== 'production',
  instrumentations: {
    http: true,
    express: true,
    mongodb: true,
    llm: true,
    vector: true,
  },
};

/**
 * Create the OpenTelemetry resource with service metadata
 */
function createResource(config: Required<TracingConfig>): Resource {
  return new Resource({
    [SEMRESATTRS_SERVICE_NAME]: config.serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: config.serviceVersion,
    'hojai.tenant.id': config.tenantId,
    'hojai.environment': process.env.NODE_ENV || 'development',
  });
}

/**
 * Create the appropriate trace exporter based on configuration
 */
function createExporter(config: Required<TracingConfig>) {
  switch (config.exporter) {
    case 'jaeger':
      return new JaegerExporter({
        endpoint: config.exporterEndpoint,
      });
    case 'zipkin':
      return new ZipkinExporter({
        url: config.exporterEndpoint,
      });
    case 'otlp':
      return new OTLPTraceExporter({
        url: config.exporterEndpoint,
      });
    case 'console':
    default:
      // Console exporter for development - uses SDK's built-in
      return undefined;
  }
}

/**
 * Create auto-instrumentations based on configuration
 */
function createInstrumentations(config: Required<TracingConfig>) {
  const instrumentations = getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-http': {
      enabled: config.instrumentations.http,
    },
    '@opentelemetry/instrumentation-express': {
      enabled: config.instrumentations.express,
    },
    '@opentelemetry/instrumentation-mongodb': {
      enabled: config.instrumentations.mongodb,
    },
  });

  return instrumentations;
}

/**
 * HOJAI Tracing SDK
 *
 * Initialize once at application startup:
 * ```typescript
 * import { initTracing } from '@hojai/tracing';
 *
 * const sdk = initTracing({
 *   serviceName: 'my-service',
 *   exporter: 'jaeger',
 *   exporterEndpoint: 'http://jaeger:14268/api/traces',
 * });
 *
 * // Shutdown on process exit
 * process.on('SIGTERM', () => sdk.shutdown());
 * ```
 */
export class HojaiTracingSDK {
  private sdk: NodeSDK | null = null;
  private tracer: Tracer;
  private config: Required<TracingConfig>;

  constructor(config: TracingConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Create tracer immediately (doesn't require SDK init for basic operations)
    this.tracer = trace.getTracer(this.config.serviceName, this.config.serviceVersion);
  }

  /**
   * Initialize the SDK and start collecting traces
   */
  async initialize(): Promise<void> {
    if (this.sdk) {
      console.warn('Tracing SDK already initialized');
      return;
    }

    this.sdk = new NodeSDK({
      resource: createResource(this.config),
      traceExporter: createExporter(this.config),
      instrumentations: createInstrumentations(this.config),
    });

    await this.sdk.start();

    if (this.config.devMode) {
      console.log(`[HOJAI Tracing] Initialized with ${this.config.exporter} exporter`);
      console.log(`[HOJAI Tracing] Service: ${this.config.serviceName} (${this.config.serviceVersion})`);
      console.log(`[HOJAI Tracing] Tenant: ${this.config.tenantId}`);
    }
  }

  /**
   * Shutdown the SDK gracefully
   */
  async shutdown(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown();
      this.sdk = null;
    }
  }

  /**
   * Get the tracer instance
   */
  getTracer(): Tracer {
    return this.tracer;
  }

  /**
   * Create a custom span
   */
  startSpan(
    name: string,
    options?: {
      kind?: SpanKind;
      attributes?: SpanAttributes;
      parent?: Span;
    }
  ): Span {
    return this.tracer.startSpan(name, {
      kind: options?.kind || SpanKind.INTERNAL,
      attributes: options?.attributes,
      parent: options?.parent ? trace.setSpan(context.active(), options.parent) : undefined,
    });
  }

  /**
   * Execute a function within a span context
   */
  async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    options?: {
      kind?: SpanKind;
      attributes?: SpanAttributes;
    }
  ): Promise<T> {
    const span = this.startSpan(name, options);

    try {
      const result = await context.with(trace.setSpan(context.active(), span), () => fn(span));
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      if (error instanceof Error) {
        span.recordException(error);
      }
      throw error;
    } finally {
      span.end();
    }
  }
}

// Singleton instance
let sdkInstance: HojaiTracingSDK | null = null;

/**
 * Initialize the global tracing SDK
 */
export function initTracing(config?: TracingConfig): HojaiTracingSDK {
  if (!sdkInstance) {
    sdkInstance = new HojaiTracingSDK(config);
  }
  return sdkInstance;
}

/**
 * Get the global tracing SDK instance
 */
export function getTracingSDK(): HojaiTracingSDK | null {
  return sdkInstance;
}

/**
 * Get the global tracer
 */
export function getTracer(): Tracer {
  if (sdkInstance) {
    return sdkInstance.getTracer();
  }
  // Return a no-op tracer if SDK not initialized
  return trace.getTracer('hojai-uninitialized');
}

// ============================================================================
// LLM-specific tracing helpers
// ============================================================================

/**
 * Parameters for LLM tracing
 */
export interface LLMTraceParams {
  model: string;
  provider: string;
  operation: 'chat' | 'embed' | 'classify';
  inputTokens?: number;
  streaming?: boolean;
}

/**
 * Response metadata from LLM calls
 */
export interface LLMResponseMetadata {
  outputTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  cost?: number;
  finishReason?: string;
}

/**
 * Create an LLM span with standard attributes
 */
export function createLLMSpan(params: LLMTraceParams): Span {
  const tracer = getTracer();

  return tracer.startSpan(`llm.${params.operation}`, {
    kind: SpanKind.CLIENT,
    attributes: {
      'llm.model': params.model,
      'llm.provider': params.provider,
      'llm.operation': params.operation,
      'llm.streaming': params.streaming ?? false,
      'llm.input_tokens': params.inputTokens ?? 0,
    },
  });
}

/**
 * Execute an LLM call within a traced span
 */
export async function withLLMSpan<T>(
  params: LLMTraceParams,
  fn: () => Promise<{ content: T; metadata?: LLMResponseMetadata }>
): Promise<{ content: T; metadata?: LLMResponseMetadata }> {
  const span = createLLMSpan(params);
  const startTime = Date.now();

  try {
    const result = await context.with(trace.setSpan(context.active(), span), fn);

    const latencyMs = Date.now() - startTime;

    span.setAttributes({
      'llm.output_tokens': result.metadata?.outputTokens ?? 0,
      'llm.total_tokens': result.metadata?.totalTokens ?? 0,
      'llm.latency_ms': latencyMs,
      'llm.cost': result.metadata?.cost ?? 0,
      'llm.finish_reason': result.metadata?.finishReason ?? 'stop',
    });

    span.setStatus({ code: SpanStatusCode.OK });

    return {
      content: result.content,
      metadata: {
        ...result.metadata,
        latencyMs,
      },
    };
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    if (error instanceof Error) {
      span.recordException(error);
    }
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Calculate estimated cost for an LLM call
 *
 * Note: These are approximate rates - update based on actual pricing
 */
const LLM_COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'claude-opus-4': { input: 0.015, output: 0.075 },
  'claude-sonnet-4': { input: 0.003, output: 0.015 },
  'claude-haiku-3': { input: 0.00025, output: 0.00125 },
  'gemini-pro': { input: 0.00125, output: 0.005 },
  'gemini-ultra': { input: 0.0075, output: 0.03 },
};

/**
 * Calculate the cost of an LLM call
 */
export function calculateLLMCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const rates = LLM_COST_PER_1K_TOKENS[model] || { input: 0.01, output: 0.03 };

  return (
    (inputTokens / 1000) * rates.input +
    (outputTokens / 1000) * rates.output
  );
}

// ============================================================================
// Vector/Database tracing helpers
// ============================================================================

/**
 * Parameters for vector operations
 */
export interface VectorTraceParams {
  operation: 'insert' | 'search' | 'upsert' | 'delete';
  collection: string;
  dimension?: number;
  topK?: number;
}

/**
 * Create a vector database span
 */
export function createVectorSpan(params: VectorTraceParams): Span {
  const tracer = getTracer();

  return tracer.startSpan(`vector.${params.operation}`, {
    kind: SpanKind.CLIENT,
    attributes: {
      'db.system': 'vector',
      'db.operation': params.operation,
      'db.collection': params.collection,
      'vector.dimension': params.dimension ?? 0,
      'vector.top_k': params.topK ?? 0,
    },
  });
}

/**
 * Execute a vector operation within a traced span
 */
export async function withVectorSpan<T>(
  params: VectorTraceParams,
  fn: () => Promise<T>
): Promise<T> {
  const span = createVectorSpan(params);
  const startTime = Date.now();

  try {
    const result = await context.with(trace.setSpan(context.active(), span), fn);

    span.setAttributes({
      'db.latency_ms': Date.now() - startTime,
    });

    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    if (error instanceof Error) {
      span.recordException(error);
    }
    throw error;
  } finally {
    span.end();
  }
}

// ============================================================================
// Agent tracing helpers
// ============================================================================

/**
 * Parameters for agent tracing
 */
export interface AgentTraceParams {
  agentId: string;
  agentType: string;
  operation: 'execute' | 'plan' | 'reflect' | 'tool_call';
  toolName?: string;
}

/**
 * Create an agent execution span
 */
export function createAgentSpan(params: AgentTraceParams): Span {
  const tracer = getTracer();

  return tracer.startSpan(`agent.${params.operation}`, {
    kind: SpanKind.INTERNAL,
    attributes: {
      'agent.id': params.agentId,
      'agent.type': params.agentType,
      'agent.operation': params.operation,
      'agent.tool_name': params.toolName ?? '',
    },
  });
}

/**
 * Execute an agent operation within a traced span
 */
export async function withAgentSpan<T>(
  params: AgentTraceParams,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  const span = createAgentSpan(params);
  const startTime = Date.now();

  try {
    const result = await context.with(trace.setSpan(context.active(), span), () => fn(span));

    span.setAttributes({
      'agent.latency_ms': Date.now() - startTime,
    });

    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    if (error instanceof Error) {
      span.recordException(error);
    }
    throw error;
  } finally {
    span.end();
  }
}

// ============================================================================
// Express middleware for HTTP tracing
// ============================================================================

/**
 * Create Express middleware for adding trace context to requests
 */
export function tracingMiddleware() {
  return (req: any, res: any, next: any) => {
    const span = getTracer().startSpan(`http ${req.method} ${req.path}`, {
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        'http.target': req.path,
        'http.host': req.get('host'),
        'http.user_agent': req.get('user-agent'),
      },
    });

    // Add span to request for use in route handlers
    req.span = span;

    // Capture response details on finish
    res.on('finish', () => {
      span.setAttributes({
        'http.status_code': res.statusCode,
        'http.response_content_length': res.get('content-length') || 0,
      });

      if (res.statusCode >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${res.statusCode}`,
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      span.end();
    });

    next();
  };
}

export default HojaiTracingSDK;


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hojai-tracing',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe (for Kubernetes)
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe (for Kubernetes)
app.get('/health/ready', async (req, res) => {
  try {
    // Add readiness checks here (DB connection, etc.)
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});
