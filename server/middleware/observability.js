// server/middleware/observability.js — Structured logging + metrics + tracing
// TD-020, TD-032, TD-034 payoff

const metrics = {
  requests: 0,
  errors: 0,
  byRoute: new Map(),
  latencies: [],
  latencySum: 0,
};

export function structuredLogger(req, res, next) {
  const start = Date.now();
  const cid = req.audit?.correlationId || req.headers['x-correlation-id'] || `cid-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
  req.correlationId = cid;
  res.setHeader('x-correlation-id', cid);
  res.setHeader('x-request-id', cid);

  const originalSend = res.send;
  res.send = function(body) {
    const dur = Date.now()-start;
    metrics.requests++;
    metrics.latencySum += dur;
    metrics.latencies.push(dur);
    if (metrics.latencies.length>1000) metrics.latencies.shift();
    const key = `${req.method} ${req.path}`;
    metrics.byRoute.set(key, (metrics.byRoute.get(key)||0)+1);
    if (res.statusCode>=400) metrics.errors++;

    const log = {
      timestamp: new Date().toISOString(),
      level: res.statusCode>=500?'error':res.statusCode>=400?'warn':'info',
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: dur,
      correlationId: cid,
      user: req.user?.id || 'anonymous',
      role: req.user?.role,
      ip: req.ip,
    };
    if (res.statusCode>=500) console.error(JSON.stringify(log));
    else if (process.env.LOG_LEVEL==='debug') console.log(JSON.stringify(log));
    return originalSend.call(this, body);
  };
  next();
}

export function metricsEndpoint(_req,res){
  const avg = metrics.latencies.length? Math.round(metrics.latencySum/metrics.latencies.length):0;
  // Optimized p95 — sort only once, reuse sorted copy
  const sorted = [...metrics.latencies].sort((a,b)=>a-b);
  const p95 = sorted[Math.floor(sorted.length*0.95)] || 0;
  const p50 = sorted[Math.floor(sorted.length*0.50)] || 0;
  const p99 = sorted[Math.floor(sorted.length*0.99)] || 0;
  res.json({
    uptime_s: Math.round(process.uptime()),
    requests: metrics.requests,
    errors: metrics.errors,
    error_rate: metrics.requests? +(metrics.errors/metrics.requests).toFixed(4):0,
    avg_latency_ms: avg,
    p50_latency_ms: p50,
    p95_latency_ms: p95,
    p99_latency_ms: p99,
    byRoute: Object.fromEntries(metrics.byRoute),
    timestamp: new Date().toISOString(),
  });
}

export function errorHandler(err, _req, res, _next){
  console.error(JSON.stringify({ level:'error', message: err.message, stack: err.stack?.slice(0,2000), timestamp: new Date().toISOString() }));
  res.status(500).json({ error:'خطأ داخلي — تم تسجيل الحادثة', code:'INTERNAL_ERROR', correlationId: _req.correlationId });
}
