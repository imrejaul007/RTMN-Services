/**
 * k6 Load Test - HOJAI SkillNet
 * Performance testing under load
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 200 },   // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['avg<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4530';
const TENANT_ID = __ENV.TENANT_ID || 'load-test-tenant';

export default function () {
  const vu = __VU;
  const iter = __ITER;

  // Health check (low frequency)
  if (iter % 10 === 0) {
    http.get(`${BASE_URL}/health`);
  }

  // Predictions - Most intensive operation
  const churnPayload = JSON.stringify({
    userId: `user-${vu}`,
    features: {
      daysSinceActivity: Math.floor(Math.random() * 90),
      engagementScore: Math.random(),
      totalOrders: Math.floor(Math.random() * 50),
    },
  });

  const churn = http.post(`${BASE_URL}/predictions/churn`, churnPayload, {
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
  });
  check(churn, { 'churn prediction': (r) => r.status === 201 });

  // LTV prediction
  const ltvPayload = JSON.stringify({
    userId: `user-${vu}`,
    features: {
      avgOrderValue: Math.random() * 500,
      orderFrequency: Math.random() * 10,
      customerAge: Math.floor(Math.random() * 365),
    },
  });

  const ltv = http.post(`${BASE_URL}/predictions/ltv`, ltvPayload, {
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
  });
  check(ltv, { 'ltv prediction': (r) => r.status === 201 });

  // Intent prediction
  const intentPayload = JSON.stringify({
    userId: `user-${vu}`,
    features: {
      cartValue: Math.random() * 1000,
      pageViews: Math.floor(Math.random() * 50),
    },
  });

  const intent = http.post(`${BASE_URL}/predictions/intent`, intentPayload, {
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
  });
  check(intent, { 'intent prediction': (r) => r.status === 201 });

  // Get predictions (read-heavy)
  http.get(`${BASE_URL}/predictions?limit=20`, {
    headers: { 'X-Tenant-Id': TENANT_ID },
  });

  // Product recommendation
  const recPayload = JSON.stringify({ userId: `user-${vu}` });
  http.post(`${BASE_URL}/recommendations/product`, recPayload, {
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
  });

  // Publish event
  const eventPayload = JSON.stringify({
    type: `test.event.${vu}`,
    source: 'k6-load-test',
    data: { vu, iter, timestamp: Date.now() },
  });

  http.post(`${BASE_URL}/events`, eventPayload, {
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
  });

  // Get events
  http.get(`${BASE_URL}/events?limit=50`, {
    headers: { 'X-Tenant-Id': TENANT_ID },
  });

  // Create insight
  const insightPayload = JSON.stringify({
    type: 'anomaly',
    title: `Load Test Insight ${vu}-${iter}`,
    severity: iter % 4 === 0 ? 'high' : 'medium',
    data: { vu, iter },
  });

  http.post(`${BASE_URL}/insights`, insightPayload, {
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
  });

  // Think time between requests
  sleep(Math.random() * 2 + 0.5);
}