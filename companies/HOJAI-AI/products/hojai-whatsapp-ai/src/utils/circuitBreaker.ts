// ============================================================================
// CIRCUIT BREAKER PATTERN
// ============================================================================

export interface CircuitBreakerConfig {
  /** Service name for logging */
  name: string;
  /** Maximum failures before opening circuit */
  maxFailures?: number;
  /** Time in ms to wait before attempting reset */
  resetTimeout?: number;
  /** Success threshold to close circuit */
  successThreshold?: number;
  /** Callback when circuit opens */
  onOpen?: (name: string) => void;
  /** Callback when circuit closes */
  onClose?: (name: string) => void;
}

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',          // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

/**
 * Circuit breaker implementation
 */
export class CircuitBreaker {
  private name: string;
  private maxFailures: number;
  private resetTimeout: number;
  private successThreshold: number;
  private onOpen?: (name: string) => void;
  private onClose?: (name: string) => void;

  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number = 0;
  private lastAttemptTime: number = 0;

  constructor(config: CircuitBreakerConfig) {
    this.name = config.name;
    this.maxFailures = config.maxFailures || 5;
    this.resetTimeout = config.resetTimeout || 30000; // 30 seconds
    this.successThreshold = config.successThreshold || 3;
    this.onOpen = config.onOpen;
    this.onClose = config.onClose;
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if circuit allows requests
   */
  isRequestAllowed(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      // Check if reset timeout has passed
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = CircuitState.HALF_OPEN;
        this.lastAttemptTime = Date.now();
        console.log(`[CircuitBreaker:${this.name}] HALF_OPEN - testing service`);
        return true;
      }
      return false;
    }

    // HALF_OPEN state - allow limited requests
    return true;
  }

  /**
   * Record successful request
   */
  recordSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      console.log(`[CircuitBreaker:${this.name}] Success ${this.successes}/${this.successThreshold}`);

      if (this.successes >= this.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.successes = 0;
        console.log(`[CircuitBreaker:${this.name}] CLOSED - service recovered`);
        this.onClose?.(this.name);
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success
      this.failures = 0;
    }
  }

  /**
   * Record failed request
   */
  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Immediate failure, go back to OPEN
      this.state = CircuitState.OPEN;
      this.successes = 0;
      console.log(`[CircuitBreaker:${this.name}] OPEN - service still failing`);
    } else if (this.state === CircuitState.CLOSED) {
      if (this.failures >= this.maxFailures) {
        this.state = CircuitState.OPEN;
        console.log(`[CircuitBreaker:${this.name}] OPEN - too many failures (${this.failures})`);
        this.onOpen?.(this.name);
      }
    }
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    if (!this.isRequestAllowed()) {
      console.log(`[CircuitBreaker:${this.name}] Rejected - circuit is OPEN`);

      if (fallback) {
        console.log(`[CircuitBreaker:${this.name}] Executing fallback`);
        return fallback();
      }

      throw new Error(`CircuitBreaker: ${this.name} is OPEN`);
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();

      if (fallback) {
        console.log(`[CircuitBreaker:${this.name}] Executing fallback after failure`);
        return fallback();
      }

      throw error;
    }
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    console.log(`[CircuitBreaker:${this.name}] Reset to CLOSED`);
  }

  /**
   * Get circuit breaker stats
   */
  getStats(): {
    name: string;
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailureTime: number;
  } {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// ============================================================================
// CIRCUIT BREAKER REGISTRY
// ============================================================================

const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create a circuit breaker
 */
export function getCircuitBreaker(name: string, config?: Omit<CircuitBreakerConfig, 'name'>): CircuitBreaker {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, new CircuitBreaker({ name, ...config }));
  }
  return circuitBreakers.get(name)!;
}

/**
 * Get all circuit breaker stats
 */
export function getAllCircuitBreakerStats(): ReturnType<CircuitBreaker['getStats']>[] {
  return Array.from(circuitBreakers.values()).map(cb => cb.getStats());
}

/**
 * Reset all circuit breakers
 */
export function resetAllCircuitBreakers(): void {
  circuitBreakers.forEach(cb => cb.reset());
}

// ============================================================================
// PRE-CONFIGURED CIRCUIT BREAKERS
// ============================================================================

/**
 * Circuit breaker for REZ Bridge service
 */
export const rezBridgeCircuitBreaker = getCircuitBreaker('rez-bridge', {
  maxFailures: 3,
  resetTimeout: 60000, // 1 minute
  successThreshold: 2,
  onOpen: (name) => {
    console.error(`[ALERT] Circuit breaker ${name} opened - REZ Bridge unavailable`);
  }
});

/**
 * Circuit breaker for WhatsApp API
 */
export const whatsappCircuitBreaker = getCircuitBreaker('whatsapp-api', {
  maxFailures: 5,
  resetTimeout: 30000,
  successThreshold: 3,
  onOpen: (name) => {
    console.error(`[ALERT] Circuit breaker ${name} opened - WhatsApp API unavailable`);
  }
});

/**
 * Circuit breaker for OpenAI API
 */
export const openaiCircuitBreaker = getCircuitBreaker('openai-api', {
  maxFailures: 5,
  resetTimeout: 60000,
  successThreshold: 2,
  onOpen: (name) => {
    console.error(`[ALERT] Circuit breaker ${name} opened - OpenAI API unavailable`);
  }
});

/**
 * Circuit breaker for MongoDB
 */
export const mongodbCircuitBreaker = getCircuitBreaker('mongodb', {
  maxFailures: 3,
  resetTimeout: 30000,
  successThreshold: 2,
  onOpen: (name) => {
    console.error(`[ALERT] Circuit breaker ${name} opened - MongoDB unavailable`);
  }
});
