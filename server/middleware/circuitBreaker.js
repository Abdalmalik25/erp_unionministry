/**
 * Circuit Breaker — Phase 5
 * Protects against cascading failures when external services are unhealthy
 * Implements closed → open → half-open state machine
 */

const DEFAULT_OPTIONS = {
  failureThreshold: 5,         // failures before opening
  successThreshold: 2,         // successes in half-open before closing
  timeout: 30000,              // ms before attempting half-open (30s)
  resetTimeout: 60000,         // ms to fully reset failure count
  monitoringWindow: 60000,     // ms — failures counted in this window
};

const breakers = new Map();

/**
 * Get or create a circuit breaker for a service
 */
export function getBreaker(name, options = {}) {
  if (!breakers.has(name)) {
    breakers.set(name, createBreaker(name, { ...DEFAULT_OPTIONS, ...options }));
  }
  return breakers.get(name);
}

function createBreaker(name, options) {
  return {
    name,
    state: 'CLOSED',           // CLOSED, OPEN, HALF_OPEN
    failures: [],               // timestamps of recent failures
    halfOpenSuccesses: 0,
    openedAt: null,
    options,
    stats: {
      totalCalls: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      totalRejected: 0,
      totalTimeouts: 0,
      lastStateChange: new Date().toISOString(),
    },
  };
}

/**
 * Clean up old failures outside monitoring window
 */
function pruneFailures(breaker) {
  const cutoff = Date.now() - breaker.options.monitoringWindow;
  breaker.failures = breaker.failures.filter(ts => ts > cutoff);
}

/**
 * Transition state
 */
function transitionTo(breaker, newState) {
  const old = breaker.state;
  breaker.state = newState;
  breaker.stats.lastStateChange = new Date().toISOString();
  if (newState === 'OPEN') breaker.openedAt = Date.now();
  if (newState === 'CLOSED') {
    breaker.failures = [];
    breaker.halfOpenSuccesses = 0;
    breaker.openedAt = null;
  }
  if (newState === 'HALF_OPEN') {
    breaker.halfOpenSuccesses = 0;
  }
  // Lightweight observability — do not log noise in production
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[CircuitBreaker:${breaker.name}] ${old} → ${newState}`);
  }
}

/**
 * Execute a function through a circuit breaker
 */
export async function execute(breakerOrName, fn, options = {}) {
  const breaker = typeof breakerOrName === 'string'
    ? getBreaker(breakerOrName, options.breakerOptions)
    : breakerOrName;

  breaker.stats.totalCalls += 1;
  pruneFailures(breaker);

  // Decide whether to allow the call
  if (breaker.state === 'OPEN') {
    // Check if timeout has elapsed — move to half-open
    if (Date.now() - breaker.openedAt >= breaker.options.timeout) {
      transitionTo(breaker, 'HALF_OPEN');
    } else {
      breaker.stats.totalRejected += 1;
      const err = new Error(`Circuit breaker OPEN for "${breaker.name}"`);
      err.code = 'CIRCUIT_OPEN';
      err.breaker = breaker.name;
      throw err;
    }
  }

  try {
    const result = await fn();
    onSuccess(breaker);
    return result;
  } catch (err) {
    onFailure(breaker, err);
    throw err;
  }
}

function onSuccess(breaker) {
  breaker.stats.totalSuccesses += 1;
  if (breaker.state === 'HALF_OPEN') {
    breaker.halfOpenSuccesses += 1;
    if (breaker.halfOpenSuccesses >= breaker.options.successThreshold) {
      transitionTo(breaker, 'CLOSED');
    }
  } else if (breaker.state === 'CLOSED') {
    // Reset consecutive failures in CLOSED state
    breaker.failures = [];
  }
}

function onFailure(breaker, err) {
  breaker.stats.totalFailures += 1;
  if (err?.code === 'ETIMEDOUT' || err?.name === 'TimeoutError') {
    breaker.stats.totalTimeouts += 1;
  }
  breaker.failures.push(Date.now());

  if (breaker.state === 'HALF_OPEN') {
    // Any failure in half-open reopens
    transitionTo(breaker, 'OPEN');
    return;
  }
  if (breaker.state === 'CLOSED'
      && breaker.failures.length >= breaker.options.failureThreshold) {
    transitionTo(breaker, 'OPEN');
  }
}

/**
 * Get all breaker states — for /api/metrics
 */
export function getAllBreakerStates() {
  const out = {};
  for (const [name, b] of breakers.entries()) {
    out[name] = {
      state: b.state,
      failures: b.failures.length,
      halfOpenSuccesses: b.halfOpenSuccesses,
      openedAt: b.openedAt ? new Date(b.openedAt).toISOString() : null,
      options: b.options,
      stats: { ...b.stats },
    };
  }
  return out;
}

/**
 * Manually reset a breaker (admin/ops use)
 */
export function resetBreaker(name) {
  const b = breakers.get(name);
  if (!b) return false;
  transitionTo(b, 'CLOSED');
  return true;
}

export default {
  getBreaker,
  execute,
  getAllBreakerStates,
  resetBreaker,
};
