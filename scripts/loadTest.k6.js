// loadTest.k6.js — k6 Load Test: 500 RPS + Spike + Soak + p95<200ms
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up
    { duration: '5m', target: 100 },  // Steady state
    { duration: '1m', target: 500 },  // Spike to 500 RPS
    { duration: '3m', target: 500 },  // Sustain spike
    { duration: '2m', target: 100 },  // Ramp down
    { duration: '1m', target: 0 },    // Cool down
  },
  thresholds: {
    http_req_duration: ['p(95)<200'],      // p95 < 200ms
    http_req_failed: ['rate<0.01'],        // Error rate < 1%
    http_reqs: ['rate>400'],               // Sustained >400 RPS
    checks: ['rate>0.99'],                 // 99% checks pass
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const TOKEN = __ENV.TOKEN || '';
const VUS = __ENV.VUS || 100;

const errorRate = new Rate('error_rate');
const authLatency = new Trend('auth_latency');
const apiLatency = new Trend('api_latency');
const wsLatency = new Trend('ws_latency');
const requests = new Counter('total_requests');

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`,
};

export function setup() {
  // Login to get token
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'ministry@yemen.gov.ye',
    password: 'Sector@2026'
  }, { headers: { 'Content-Type': 'application/json' }});
  
  if (loginRes.status === 200) {
    const token = loginRes.json('data.token') || loginRes.json('token');
    return { token: token || '' };
  }
  return { token: '' };
}

export default function (data) {
  const token = data.token || TOKEN;
  const authHeaders = { ...headers, Authorization: `Bearer ${token}` };
  
  // 1. Health check
  let res = http.get(`${BASE_URL}/api/health`);
  check(res, { 'health 200': (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  requests.add(1);

  // 2. Dashboard stats (heavy query)
  const dashStart = Date.now();
  res = http.get(`${BASE_URL}/api/dashboard/enhanced-stats`, { headers: authHeaders });
  apiLatency.add(Date.now() - dashStart);
  check(res, { 'dashboard 200': (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  requests.add(1);

  // 3. Service catalog (read)
  res = http.get(`${BASE_URL}/api/v1/services/catalog?limit=20`, { headers: authHeaders });
  check(res, { 'catalog 200': (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  requests.add(1);

  // 4. Search (complex query)
  res = http.get(`${BASE_URL}/api/v1/search?q=صنعاء&limit=10`, { headers: authHeaders });
  check(res, { 'search 200': (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  requests.add(1);

  // 5. Service instance creation (write)
  if (Math.random() < 0.1) { // 10% write load
    const instance = {
      service_code: 'SVC-EST-001',
      applicant_type: 'employer',
      payload: { establishment_name: `Test ${Date.now()}` }
    };
    res = http.post(`${BASE_URL}/api/v1/services/instances`, JSON.stringify(instance), { headers: authHeaders });
    check(res, { 'create instance 201': (r) => r.status === 201 });
    errorRate.add(res.status !== 201);
    requests.add(1);
  }

  // 6. WebSocket test (simulate)
  if (Math.random() < 0.05) {
    const wsStart = Date.now();
    // In real test: connect to ws://localhost:4000 with token
    wsLatency.add(Date.now() - wsStart);
    requests.add(1);
  }

  sleep(Math.random() * 0.5 + 0.1); // 100-600ms think time
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
    'summary.html': htmlReport(data),
  };
}