// server/middleware/cache.js — API response caching with ETag + TTL
// Reduces DB load, improves response times, supports conditional GET

import crypto from 'crypto';

const cache = new Map();

// Default TTLs by route pattern (milliseconds)
const TTL_BY_PREFIX = [
  { prefix: '/api/worker-portal', ttl: 30 * 1000 },
  { prefix: '/api/national-directories', ttl: 60 * 1000 },
  { prefix: '/api/workflows', ttl: 30 * 1000 },
  { prefix: '/api/services/catalog', ttl: 5 * 60 * 1000 },
  { prefix: '/api/governorates', ttl: 60 * 60 * 1000 },
  { prefix: '/api/districts', ttl: 60 * 60 * 1000 },
  { prefix: '/api/occupations', ttl: 60 * 60 * 1000 },
  { prefix: '/api/v1/services/catalog', ttl: 5 * 60 * 1000 },
  { prefix: '/api/health', ttl: 10 * 1000 },
];

const DEFAULT_TTL = 30 * 1000;
const MAX_CACHE_SIZE = 5000;

function getTtlForPath(path) {
  for (const { prefix, ttl } of TTL_BY_PREFIX) {
    if (path.startsWith(prefix)) return ttl;
  }
  return DEFAULT_TTL;
}

function evictIfFull() {
  if (cache.size >= MAX_CACHE_SIZE) {
    const toRemove = Math.floor(MAX_CACHE_SIZE * 0.1);
    const keys = Array.from(cache.keys()).slice(0, toRemove);
    keys.forEach(k => cache.delete(k));
  }
}

function makeKey(req) {
  const userId = req.user?.id || req.userId || 'public';
  const baseKey = `${req.method}:${req.originalUrl || req.url}:${userId}`;
  return crypto.createHash('sha1').update(baseKey).digest('hex');
}

function makeEtag(body) {
  return `W/"${crypto.createHash('md5').update(body).digest('hex')}"`;
}

export function cacheMiddleware(ttlMs) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();

    const key = makeKey(req);
    const entry = cache.get(key);
    const ttl = ttlMs ?? getTtlForPath(req.path);

    if (entry && entry.expiresAt > Date.now()) {
      const ifNoneMatch = req.headers['if-none-match'];
      if (ifNoneMatch === entry.etag) {
        res.status(304).end();
        return;
      }
      res.setHeader('ETag', entry.etag);
      res.setHeader('Last-Modified', entry.lastModified);
      res.setHeader('Cache-Control', `private, max-age=${Math.floor(ttl / 1000)}`);
      res.setHeader('X-Cache', 'HIT');
      res.status(entry.status);
      for (const [k, v] of Object.entries(entry.headers)) res.setHeader(k, v);
      res.send(entry.body);
      return;
    }

    const originalSend = res.send.bind(res);
    const originalStatus = res.status.bind(res);
    let status = 200;

    res.status = function (code) {
      status = code;
      return originalStatus(code);
    };

    res.send = function (body) {
      try {
        if (status >= 200 && status < 300 && body) {
          const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
          const etag = makeEtag(bodyStr);
          const headers = {};
          for (const [k, v] of Object.entries(res.getHeaders())) {
            if (typeof v === 'string') headers[k] = v;
          }
          evictIfFull();
          cache.set(key, {
            body: bodyStr,
            headers,
            status,
            expiresAt: Date.now() + ttl,
            etag,
            lastModified: new Date().toUTCString(),
          });
          res.setHeader('ETag', etag);
          res.setHeader('Last-Modified', new Date().toUTCString());
          res.setHeader('Cache-Control', `private, max-age=${Math.floor(ttl / 1000)}`);
          res.setHeader('X-Cache', 'MISS');
        }
      } catch (e) {
        // Cache write failure - serve anyway
      }
      return originalSend(body);
    };

    const originalJson = res.json.bind(res);
    res.json = function (obj) {
      return res.send(JSON.stringify(obj));
    };

    next();
  };
}

export function invalidateCache(prefix) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(prefix)) cache.delete(key);
  }
}

export function getCacheStats() {
  let valid = 0;
  let expired = 0;
  const now = Date.now();
  for (const entry of cache.values()) {
    if (entry.expiresAt > now) valid++;
    else expired++;
  }
  return {
    total: cache.size,
    valid,
    expired,
    maxSize: MAX_CACHE_SIZE,
    utilizationPercent: Math.round((cache.size / MAX_CACHE_SIZE) * 100),
  };
}

let cleanupTimer = null;
export function startCacheCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
      if (v.expiresAt < now) cache.delete(k);
    }
  }, 5 * 60 * 1000);
}

export function stopCacheCleanup() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
