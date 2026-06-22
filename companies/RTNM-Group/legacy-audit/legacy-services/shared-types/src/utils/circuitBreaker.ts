/**
 * Circuit Breaker Implementation
 * Prevents cascading failures by stopping calls to failing services
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

export interface CircuitBreakerStats {
  failures: number;
  successes: number;
  state: CircuitState;
  lastFailure: Date | null;
  nextAttempt: Date | null;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private lastFailure: Date | null = null;
  private nextAttempt: Date | null = null;

  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeout: number;
  private readonly resetTimeout: number;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.successThreshold = options.successThreshold ?? 2;
    this.timeout = options.timeout ?? 60000;
    this.resetTimeout = options.resetTimeout ?? 30000;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error(`Circuit breaker is OPEN. Next attempt at ${this.nextAttempt?.toISOString()}`);
      }
    }

    try {
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Circuit breaker timeout'));
      }, this.timeout);

      fn()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeoutId));
    });
  }

  private onSuccess(): void {
    this.failures = 0;
    this.successes++;

    if (this.state === 'HALF_OPEN') {
      if (this.successes >= this.successThreshold) {
        this.state = 'CLOSED';
        this.successes = 0;
        this.nextAttempt = null;
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.successes = 0;
    this.lastFailure = new Date();

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.scheduleReset();
    } else if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.scheduleReset();
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.nextAttempt) return false;
    return new Date() >= this.nextAttempt;
  }

  private scheduleReset(): void {
    this.nextAttempt = new Date(Date.now() + this.resetTimeout);
  }

  getStats(): CircuitBreakerStats {
    return {
      failures: this.failures,
      successes: this.successes,
      state: this.state,
      lastFailure: this.lastFailure,
      nextAttempt: this.nextAttempt,
    };
  }

  isOpen(): boolean {
    return this.state === 'OPEN';
  }

  isClosed(): boolean {
    return this.state === 'CLOSED';
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastFailure = null;
    this.nextAttempt = null;
  }
}

// Singleton registry for managing circuit breakers per service
export class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry;
  private breakers = new Map<string, CircuitBreaker>();

  static getInstance(): CircuitBreakerRegistry {
    if (!CircuitBreakerRegistry.instance) {
      CircuitBreakerRegistry.instance = new CircuitBreakerRegistry();
    }
    return CircuitBreakerRegistry.instance;
  }

  get(name: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(options));
    }
    return this.breakers.get(name)!;
  }

  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    this.breakers.forEach((breaker, name) => {
      stats[name] = breaker.getStats();
    });
    return stats;
  }
}

// Decorator for automatic circuit breaker on functions
export function withCircuitBreaker(breaker: CircuitBreaker) {
  return function <T extends (...args: unknown[]) => Promise<unknown>>(
    target: T,
    context: ClassMethodDecoratorContext
  ): T {
    return async function (this: unknown, ...args: Parameters<T>): Promise<ReturnType<T>> {
      return breaker.execute(() => target.apply(this, args)) as Promise<ReturnType<T>>;
    } as T;
  };
}
