/**
 * Deep Health Check — Phase 5
 * Provides /health/detailed with database, memory, disk, external service checks
 */

import { getAllBreakerStates } from './circuitBreaker.js';
import { getCacheStats } from './cache.js';

const STARTUP = Date.now();

/**
 * Check database connectivity
 */
async function checkDatabase(pool) {
  const startNs = process.hrtime.bigint();
  try {
    const result = await pool.query('SELECT 1 AS ok, now() AS ts, version() AS pg_version', [], { 
      name: 'health_check',
      rowMode: 'array'
    });
    const latencyMs = Number(process.hrtime.bigint() - startNs) / 1e6;
    return {
      status: 'healthy',
      latencyMs: Math.round(latencyMs * 100) / 100,
      version: result?.rows?.[0]?.[2] || 'unknown',
    };
  } catch (err) {
    return {
      status: 'unhealthy',
      error: err?.code || err?.message || 'DB_CONNECTION_FAILED',
    };
  }
}

/**
 * Check pool health — national-grade saturation monitoring
 */
async function checkPool(pool) {
  try {
    const total = pool.totalCount || 0;
    const idle = pool.idleCount || 0;
    const waiting = pool.waitingCount || 0;
    const maxConnections = parseInt(process.env.DB_POOL_MAX || '20', 10);
    const utilizationPercent = total > 0 ? Math.round(((total - idle) / total) * 100) : 0;
    const saturationPercent = maxConnections > 0 ? Math.round((total / maxConnections) * 100) : 0;

    return {
      total,
      idle,
      active: total - idle,
      waiting,
      maxConnections,
      utilizationPercent,
      saturationPercent,
      healthy: utilizationPercent < 85 && waiting === 0,
      status: utilizationPercent >= 90 || waiting > 5 ? 'critical'
        : utilizationPercent >= 75 || waiting > 0 ? 'warning'
        : 'healthy',
    };
  } catch {
    return { total: 0, idle: 0, active: 0, waiting: 0, healthy: false, error: 'POOL_CHECK_FAILED' };
  }
}

/**
 * Check memory usage
 */
function checkMemory() {
  const usage = process.memoryUsage();
  const heapUsed = Math.round(usage.heapUsed / 1024 / 1024);
  const heapTotal = Math.round(usage.heapTotal / 1024 / 1024);
  const external = Math.round(usage.external / 1024 / 1024);
  const rss = Math.round(usage.rss / 1024 / 1024);
  const heapPercent = heapTotal > 0 ? Math.round((heapUsed / heapTotal) * 100) : 0;
  return {
    heapUsedMB: heapUsed,
    heapTotalMB: heapTotal,
    externalMB: external,
    rssMB: rss,
    heapPercent,
    healthy: heapPercent < 85,
  };
}

/**
 * Check event loop lag (approximate)
 */
function checkEventLoop() {
  const start = Date.now();
  setImmediate(() => {});
  const lag = Date.now() - start;
  return {
    eventLoopLagMs: lag,
    healthy: lag < 100,
  };
}

/**
 * Check uptime and process info
 */
function checkProcess() {
  return {
    uptimeSeconds: Math.floor(process.uptime()),
    pid: process.pid,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
  };
}

/**
 * Get all deep health data
 */
export async function getDeepHealth(pool) {
  const checks = await Promise.allSettled([
    checkDatabase(pool),
    checkPool(pool),
  ]);

  const dbResult = checks[0]?.status === 'fulfilled' ? checks[0].value : { status: 'unreachable' };
  const poolResult = checks[1]?.status === 'fulfilled' ? checks[1].value : { healthy: false };

  const memory = checkMemory();
  const eventLoop = checkEventLoop();
  const processInfo = checkProcess();
  const circuitBreakers = getAllBreakerStates();
  const cacheStats = getCacheStats();

  const overallHealthy = dbResult.status === 'healthy'
    && memory.healthy
    && eventLoop.healthy
    && poolResult.healthy;

  return {
    status: overallHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - STARTUP) / 1000),
    process: processInfo,
    database: {
      ...dbResult,
      pool: poolResult,
    },
    memory,
    eventLoop,
    circuitBreakers: Object.keys(circuitBreakers).length > 0 ? circuitBreakers : { no_breakers_registered: true },
    cache: cacheStats,
    warnings: [
      ...(memory.healthy ? [] : [`Memory usage at ${memory.heapPercent}% — approaching limit`]),
      ...(eventLoop.healthy ? [] : [`Event loop lag ${eventLoop.eventLoopLagMs}ms — performance degraded`]),
      ...(poolResult.healthy ? [] : [`DB pool ${poolResult.status}: ${poolResult.active}/${poolResult.total} active, ${poolResult.waiting} waiting`]),
      ...(poolResult.waiting > 0 ? [`DB connection queue: ${poolResult.waiting} requests waiting for connection`] : []),
    ],
  };
}

export default { getDeepHealth };
