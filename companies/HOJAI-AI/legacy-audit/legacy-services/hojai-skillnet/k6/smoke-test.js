/**
 * k6 Smoke Test - HOJAI SkillNet
 * Basic functionality test with low load
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 5 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4530';
const TENANT_ID = __ENV.TENANT_ID || 'test-tenant-123';

export default function () {
  // Health check
  const health = http.get(`${BASE_URL}/health`);
  check(health, {
    'health endpoint works': (r) => r.status === 200,
    'health returns healthy status': (r) => JSON.parse(r.body).status === 'healthy',
  });

  // Liveness probe
  const live = http.get(`${BASE_URL}/health/live`);
  check(live, {
    'liveness probe works': (r) => r.status === 200,
  });

  // Readiness probe
  const ready = http.get(`${BASE_URL}/health/ready`);
  check(ready, {
    'readiness probe works': (r) => r.status === 200,
  });

  // Metrics endpoint
  const metrics = http.get(`${BASE_URL}/metrics`);
  check(metrics, {
    'metrics endpoint works': (r) => r.status === 200,
    'metrics contains hojai metrics': (r) => r.body.includes('hojai'),
  });

  // Create churn prediction
  const churnPayload = JSON.stringify({
    userId: `user-${__VU}-${__ITER}`,
    features: {
      daysSinceActivity: Math.floor(Math.random() * 60),
      engagementScore: Math.random(),
      totalOrders: Math.floor(Math.random() * 20),
    },
  });

  const churn = http.post(`${BASE_URL}/predictions/churn`, churnPayload, {
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
  });
  check(churn, {
    'create churn prediction works': (r) => r.status === 201,
    'prediction has score': (r) => JSON.parse(r.body).data?.prediction?.score !== undefined,
  });

  // Get predictions
  const predictions = http.get(`${BASE_URL}/predictions`, {
    headers: { 'X-Tenant-Id': TENANT_ID },
  });
  check(predictions, {
    'get predictions works': (r) => r.status === 200,
    'predictions is array': (r) => Array.isArray(JSON.parse(r.body).data?.predictions),
  });

  // Publish event
  const eventPayload = JSON.stringify({
    type: 'test.event',
    source: 'k6-smoke-test',
    data: { testId: `test-${__VU}-${__ITER}`, timestamp: Date.now() },
  });

  const event = http.post(`${BASE_URL}/events`, eventPayload, {
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
  });
  check(event, {
    'publish event works': (r) => r.status === 201,
  });

  // Create insight
  const insightPayload = JSON.stringify({
    type: 'trend',
    title: `Test Insight ${__VU}-${__ITER}`,
    description: 'Automated smoke test insight',
    severity: 'low',
  });

  const insight = http.post(`${BASE_URL}/insights`, insightPayload, {
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
  });
  check(insight, {
    'create insight works': (r) => r.status === 201,
  });

  sleep(1);
}