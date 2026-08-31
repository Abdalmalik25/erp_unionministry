/**
 * Performance Monitor Middleware — Phase 5
 * Tracks response time, throughput, and request metrics in real-time
 * Provides /metrics/perf endpoint for observability
 */

const PERF_METRICS = {
  requests: {
    total: 0,
    byStatus: {},
    byMethod: {},
    byRoute: {},
    byHour: Array(24).fill(0),
    last24h: [],
  },
  responseTime: {
    samples: [],          // last 1000 response times in ms
    buckets: {            // histogram buckets (ms)
      lt_10: 0,
      lt_50: 0,
      lt_100: 0,
      lt_250: 0,
      lt_500: 0,
      lt_1000: 0,
      lt_5000: 0,
      gte_5000: 0,
    },
    sum: 0,
    count: 0,
  },
  slowQueries: [],        // requests > 1000ms
  errors: {
    total: 0,
    byType: {},
    recent: [],
  },
  startedAt: new Date().toISOString(),
  lastResetAt: new Date().toISOString(),
};

const MAX_SAMPLES = 1000;
const SLOW_THRESHOLD_MS = 1000;
const ERROR_RATE_WINDOW = 100;

/**
 * Response time histogram bucket assignment
 */
function bucketize(ms) {
  if (ms < 10) return 'lt_10';
  if (ms < 50) return 'lt_50';
  if (ms < 100) return 'lt_100';
  if (ms < 250) return 'lt_250';
  if (ms < 500) return 'lt_500';
  if (ms < 1000) return 'lt_1000';
  if (ms < 5000) return 'lt_5000';
  return 'gte_5000';
}

/**
 * Sanitize route template from req.route.path or req.url
 */
function getRouteTemplate(req) {
  if (req.route?.path) {
    return `${req.baseUrl || ''}${req.route.path}`;
  }
  if (req.baseUrl) return req.baseUrl;
  // Strip query string and trailing slash
  const url = (req.url || '').split('?')[0].replace(/\/+$/, '') || '/';
  return url.length > 80 ? url.substring(0, 80) + '…' : url;
}

/**
 * Performance monitoring middleware
 * Records response time, status code, route, and method
 */
export function performanceMonitorMiddleware(req, res, next) {
  const startNs = process.hrtime.bigint();
  const startTs = Date.now();
  const method = req.method || 'UNKNOWN';
  const route = getRouteTemplate(req);

  // Track request
  PERF_METRICS.requests.total += 1;
  PERF_METRICS.requests.byMethod[method] = (PERF_METRICS.requests.byMethod[method] || 0) + 1;
  PERF_METRICS.requests.byRoute[route] = (PERF_METRICS.requests.byRoute[route] || 0) + 1;

  const hour = new Date().getHours();
  PERF_METRICS.requests.byHour[hour] += 1;

  // Hook into response finish
  res.on('finish', () => {
    const durMs = Number(process.hrtime.bigint() - startNs) / 1e6;
    const status = res.statusCode;

    // Status code tracking
    PERF_METRICS.requests.byStatus[status] = (PERF_METRICS.requests.byStatus[status] || 0) + 1;

    // Response time tracking
    PERF_METRICS.responseTime.sum += durMs;
    PERF_METRICS.responseTime.count += 1;
    PERF_METRICS.responseTime.samples.push(durMs);
    if (PERF_METRICS.responseTime.samples.length > MAX_SAMPLES) {
      PERF_METRICS.responseTime.samples.shift();
    }
    const bucket = bucketize(durMs);
    PERF_METRICS.responseTime.buckets[bucket] += 1;

    // Slow query log
    if (durMs >= SLOW_THRESHOLD_MS) {
      const entry = {
        ts: new Date().toISOString(),
        method,
        route,
        status,
        durationMs: Math.round(durMs * 100) / 100,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: (req.get('user-agent') || '').substring(0, 120),
      };
      PERF_METRICS.slowQueries.unshift(entry);
      if (PERF_METRICS.slowQueries.length > 100) PERF_METRICS.slowQueries.pop();
    }

    // Error tracking
    if (status >= 500) {
      PERF_METRICS.errors.total += 1;
      const errType = status >= 500 ? 'server_error' : 'client_error';
      PERF_METRICS.errors.byType[errType] = (PERF_METRICS.errors.byType[errType] || 0) + 1;
      PERF_METRICS.errors.recent.unshift({
        ts: new Date().toISOString(),
        method,
        route,
        status,
        durationMs: Math.round(durMs * 100) / 100,
      });
      if (PERF_METRICS.errors.recent.length > 50) PERF_METRICS.errors.recent.pop();
    }

    // Add observability header
    res.setHeader('X-Response-Time', `${durMs.toFixed(2)}ms`);

    // Push to last24h rolling window (sample at most 1 per minute)
    const nowMin = Math.floor(Date.now() / 60000);
    const last = PERF_METRICS.requests.last24h[PERF_METRICS.requests.last24h.length - 1];
    if (!last || last.min !== nowMin) {
      PERF_METRICS.requests.last24h.push({ min: nowMin, count: 1, sumMs: durMs });
      if (PERF_METRICS.requests.last24h.length > 1440) {
        PERF_METRICS.requests.last24h.shift();
      }
    } else {
      last.count += 1;
      last.sumMs += durMs;
    }

    // Suppress unused var lint
    void startTs;
  });

  next();
}

/**
 * Get aggregated performance metrics
 */
export function getPerformanceMetrics() {
  const samples = PERF_METRICS.responseTime.samples;
  const sortedSamples = [...samples].sort((a, b) => a - b);
  const p50 = sortedSamples[Math.floor(sortedSamples.length * 0.5)] || 0;
  const p95 = sortedSamples[Math.floor(sortedSamples.length * 0.95)] || 0;
  const p99 = sortedSamples[Math.floor(sortedSamples.length * 0.99)] || 0;
  const max = sortedSamples[sortedSamples.length - 1] || 0;
  const min = sortedSamples[0] || 0;
  const avg = PERF_METRICS.responseTime.count > 0
    ? PERF_METRICS.responseTime.sum / PERF_METRICS.responseTime.count
    : 0;

  // Top 10 routes by request count
  const topRoutes = Object.entries(PERF_METRICS.requests.byRoute)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([route, count]) => ({ route, count }));

  // Error rate (last 100 requests proxy)
  const recentStatuses = Object.entries(PERF_METRICS.requests.byStatus);
  const errorCount = (PERF_METRICS.requests.byStatus['500'] || 0)
    + (PERF_METRICS.requests.byStatus['502'] || 0)
    + (PERF_METRICS.requests.byStatus['503'] || 0)
    + (PERF_METRICS.requests.byStatus['504'] || 0);
  const errorRate = PERF_METRICS.requests.total > 0
    ? errorCount / PERF_METRICS.requests.total
    : 0;

  // Throughput (req/min from last24h)
  const last5min = PERF_METRICS.requests.last24h.slice(-5);
  const throughput = last5min.reduce((s, x) => s + x.count, 0) / Math.max(1, last5min.length);

  return {
    uptime: {
      startedAt: PERF_METRICS.startedAt,
      lastResetAt: PERF_METRICS.lastResetAt,
      uptimeSeconds: Math.floor((Date.now() - new Date(PERF_METRICS.startedAt).getTime()) / 1000),
    },
    requests: {
      total: PERF_METRICS.requests.total,
      byMethod: { ...PERF_METRICS.requests.byMethod },
      byStatus: { ...PERF_METRICS.requests.byStatus },
      byHour: [...PERF_METRICS.requests.byHour],
      topRoutes,
      throughputPerMin: Math.round(throughput * 100) / 100,
    },
    responseTime: {
      avg: Math.round(avg * 100) / 100,
      p50: Math.round(p50 * 100) / 100,
      p95: Math.round(p95 * 100) / 100,
      p99: Math.round(p99 * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      buckets: { ...PERF_METRICS.responseTime.buckets },
    },
    errors: {
      total: PERF_METRICS.errors.total,
      rate: Math.round(errorRate * 10000) / 100, // percentage with 2 decimals
      byType: { ...PERF_METRICS.errors.byType },
      recent: PERF_METRICS.errors.recent.slice(0, 10),
    },
    slowQueries: PERF_METRICS.slowQueries.slice(0, 20),
    sampleSize: samples.length,
  };
}

/**
 * Reset metrics — useful for testing
 */
export function resetPerformanceMetrics() {
  PERF_METRICS.requests = {
    total: 0,
    byStatus: {},
    byMethod: {},
    byRoute: {},
    byHour: Array(24).fill(0),
    last24h: [],
  };
  PERF_METRICS.responseTime = {
    samples: [],
    buckets: { lt_10: 0, lt_50: 0, lt_100: 0, lt_250: 0, lt_500: 0, lt_1000: 0, lt_5000: 0, gte_5000: 0 },
    sum: 0,
    count: 0,
  };
  PERF_METRICS.slowQueries = [];
  PERF_METRICS.errors = { total: 0, byType: {}, recent: [] };
  PERF_METRICS.lastResetAt = new Date().toISOString();
}

export default {
  performanceMonitorMiddleware,
  getPerformanceMetrics,
  resetPerformanceMetrics,
};
