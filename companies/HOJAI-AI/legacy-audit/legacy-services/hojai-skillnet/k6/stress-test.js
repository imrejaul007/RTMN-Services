/**
 * k6 Stress Test - HOJAI SkillNet
 * Breakpoint testing to find system limits
 */

import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 500 },   // Rapid ramp to 500
    { duration: '3m', target: 500 },   // Hold at 500
    { duration: '1m', target: 1000 },  // Double to 1000
    { duration: '3m', target: 1000 },  // Hold at 1000
    { duration: '1m', target: 0 },    // Recovery
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4530';
const TENANT_ID = __ENV.TENANT_ID || 'stress-test-tenant';

export default function () {
  const vu = __VU;

  // Heavy prediction load
  const payload = JSON.stringify({
    userId: `user-${vu}`,
    features: {
      daysSinceActivity: Math.floor(Math.random() * 90),
      engagementScore: Math.random(),
      totalOrders: Math.floor(Math.random() * 50),
      avgOrderValue: Math.random() * 500,
      cartValue: Math.random() * 1000,
    },
  });

  // Churn prediction
  http.post(`${BASE_URL}/predictions/churn`, payload, {
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
  });

  // LTV prediction
  http.post(`${BASE_URL}/predictions/ltv`, payload, {
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
  });

  // Intent prediction
  http.post(`${BASE_URL}/predictions/intent`, payload, {
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
  });

  // Multiple events
  for (let i = 0; i < 3; i++) {
    http.post(`${BASE_URL}/events`, JSON.stringify({
      type: `stress.event.${vu}.${i}`,
      data: { vu, i },
    }), {
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
    });
  }

  // Recommendation
  http.post(`${BASE_URL}/recommendations/product`, JSON.stringify({
    userId: `user-${vu}`,
  }), {
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
  });
}
