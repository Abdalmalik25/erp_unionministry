// src/app/utils/circuitBreaker.ts
// Circuit Breaker pattern for resilient external service calls
// States: CLOSED (normal) → OPEN (failing) → HALF_OPEN (testing recovery)

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerOptions {
  /** Number of failures before opening the circuit */
  failureThreshold?: number;
  /** Milliseconds before attempting recovery (half-open) */
  resetTimeout?: number;
  /** Service name for logging */
  name?: string;
}

interface CircuitBreakerStats {
  failures: number;
  successes: number;
  state: CircuitState;
  lastFailure: number | null;
  lastSuccess: number | null;
}

const DEFAULT_FAILURE_THRESHOLD = 5;
const DEFAULT_RESET_TIMEOUT = 30_000; // 30 seconds

export class CircuitBreaker {
  private failures = 0;
  private successes = 0;
  private state: CircuitState = 'CLOSED';
  private lastFailure: number | null = null;
  private lastSuccess: number | null = null;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly name: string;
  private halfOpenTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: CircuitBreakerOptions = {}) {
    this.failureThreshold = opts.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;
    this.resetTimeout = opts.resetTimeout ?? DEFAULT_RESET_TIMEOUT;
    this.name = opts.name ?? 'CircuitBreaker';
  }

  get stats(): CircuitBreakerStats {
    return {
      failures: this.failures,
      successes: this.successes,
      state: this.state,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
    };
  }

  get isClosed(): boolean { return this.state === 'CLOSED'; }
  get isOpen(): boolean { return this.state === 'OPEN'; }
  get isHalfOpen(): boolean { return this.state === 'HALF_OPEN'; }

  /** Check if the circuit allows the call to proceed */
  canExecute(): boolean {
    if (this.state === 'CLOSED') return true;
    if (this.state === 'OPEN') {
      // Check if resetTimeout has passed
      if (this.lastFailure && Date.now() - this.lastFailure >= this.resetTimeout) {
        this._toHalfOpen();
        return true;
      }
      return false;
    }
    // HALF_OPEN — allow one test request
    return true;
  }

  /** Execute an async function with circuit breaker protection */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      throw new CircuitOpenError(`Circuit ${this.name} is OPEN — call rejected`);
    }
    try {
      const result = await fn();
      this._recordSuccess();
      return result;
    } catch (err) {
      this._recordFailure();
      throw err;
    }
  }

  /** Manually record a success (useful for fire-and-forget) */
  recordSuccess(): void { this._recordSuccess(); }

  /** Manually record a failure (useful for fire-and-forget) */
  recordFailure(): void { this._recordFailure(); }

  /** Reset the circuit to CLOSED state */
  reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailure = null;
    this.lastSuccess = null;
    if (this.halfOpenTimer) {
      clearTimeout(this.halfOpenTimer);
      this.halfOpenTimer = null;
    }
  }

  private _recordSuccess(): void {
    this.successes++;
    this.lastSuccess = Date.now();
    if (this.state === 'HALF_OPEN') {
      console.warn(`[CircuitBreaker] ${this.name}: recovery succeeded → CLOSED`);
      this.reset();
    }
  }

  private _recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.state === 'HALF_OPEN') {
      console.warn(`[CircuitBreaker] ${this.name}: half-open failure → OPEN`);
      this._toOpen();
    } else if (this.state === 'CLOSED' && this.failures >= this.failureThreshold) {
      console.warn(`[CircuitBreaker] ${this.name}: threshold reached → OPEN`);
      this._toOpen();
    }
  }

  private _toOpen(): void {
    this.state = 'OPEN';
    // Schedule transition to half-open after resetTimeout
    if (this.halfOpenTimer) clearTimeout(this.halfOpenTimer);
    this.halfOpenTimer = setTimeout(() => this._toHalfOpen(), this.resetTimeout);
  }

  private _toHalfOpen(): void {
    this.state = 'HALF_OPEN';
    this.halfOpenTimer = null;
    console.warn(`[CircuitBreaker] ${this.name}: attempting recovery → HALF_OPEN`);
  }
}

export class CircuitOpenError extends Error {
  readonly code = 'CIRCUIT_OPEN';
  constructor(message: string) { super(message); this.name = 'CircuitOpenError'; }
}

// Singleton instances for common external services
export const circuits = {
  database: new CircuitBreaker({ name: 'database', failureThreshold: 3, resetTimeout: 15_000 }),
  supabase: new CircuitBreaker({ name: 'supabase', failureThreshold: 5, resetTimeout: 30_000 }),
  external: new CircuitBreaker({ name: 'external-api', failureThreshold: 5, resetTimeout: 60_000 }),
};
