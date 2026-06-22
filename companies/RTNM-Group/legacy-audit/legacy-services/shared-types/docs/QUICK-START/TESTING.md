# Quick Start - Testing Guide

> **Comprehensive testing for all QR systems**

---

## Overview

This guide covers testing strategies for:
- Unit tests
- Integration tests
- End-to-end tests
- Health checks
- Performance testing

---

## Testing Setup

### Install Dependencies

```bash
# Install test dependencies
npm install --save-dev jest @testing-library/react @playwright/test

# Install types
npm install --save-dev @types/jest @types/node
```

### Configuration

Create `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
};
```

---

## Unit Tests

### Example: QR Token Validation

```typescript
// src/__tests__/qr-token.test.ts
import { validateQRToken, createQRToken } from '../lib/qr-token';

describe('QR Token', () => {
  const roomId = 'ROOM-101';
  const token = createQRToken(roomId);

  test('creates valid token', () => {
    expect(token).toBeDefined();
    expect(token.type).toBe('room');
    expect(token.roomId).toBe(roomId);
  });

  test('validates token successfully', () => {
    const result = validateQRToken(token);
    expect(result.valid).toBe(true);
  });

  test('detects expired token', () => {
    const expiredToken = {
      ...token,
      validUntil: Date.now() - 1000,
    };
    const result = validateQRToken(expiredToken);
    expect(result.valid).toBe(false);
  });
});
```

### Example: Service Request

```typescript
// src/__tests__/service-request.test.ts
import { createServiceRequest, calculateETA } from '../lib/services';

describe('Service Request', () => {
  test('creates request with correct data', () => {
    const request = createServiceRequest({
      roomId: 'ROOM-101',
      serviceType: 'housekeeping',
      description: 'Extra towels',
      priority: 'normal',
    });

    expect(request.id).toBeDefined();
    expect(request.status).toBe('pending');
    expect(request.estimatedTime).toBe('30 mins');
  });

  test('calculates ETA based on priority', () => {
    const normalETA = calculateETA('housekeeping', 'normal');
    const urgentETA = calculateETA('housekeeping', 'urgent');

    expect(urgentETA).toBeLessThan(normalETA);
  });
});
```

### Example: Cart Calculation

```typescript
// src/__tests__/cart.test.ts
import { calculateCartTotal, applyDiscount } from '../lib/cart';

describe('Cart', () => {
  test('calculates subtotal correctly', () => {
    const items = [
      { price: 299, quantity: 2 },
      { price: 499, quantity: 1 },
    ];

    const subtotal = calculateCartTotal(items);
    expect(subtotal).toBe(299 * 2 + 499); // 1097
  });

  test('applies discount correctly', () => {
    const subtotal = 1000;
    const discount = applyDiscount(subtotal, 10); // 10%

    expect(discount).toBe(900);
  });

  test('calculates tax', () => {
    const subtotal = 1000;
    const taxRate = 0.18;
    const tax = subtotal * taxRate;

    expect(tax).toBe(180);
  });
});
```

---

## Integration Tests

### Run Integration Tests

```bash
# Run all integration tests
npx tsx scripts/test-qr-integration.ts

# Run specific flow
npx tsx scripts/test-qr-integration.ts --test=room
npx tsx scripts/test-qr-integration.ts --test=menu
npx tsx scripts/test-qr-integration.ts --test=reznow
npx tsx scripts/test-qr-integration.ts --test=ads
```

### Example Integration Test

```typescript
// src/__tests__/integration/room-flow.test.ts
import { test, expect } from '@playwright/test';

test.describe('Room QR Flow', () => {
  test('complete checkout flow', async ({ page }) => {
    // 1. Scan QR
    await page.goto('/room/scan');
    await page.getByTestId('qr-input').fill('ROOM-101');
    await page.getByRole('button', { name: 'Scan' }).click();

    // 2. Verify authentication
    await expect(page.getByText('Welcome to Room 101')).toBeVisible();

    // 3. Request service
    await page.getByRole('button', { name: 'Housekeeping' }).click();
    await page.getByLabel('Description').fill('Extra towels');
    await page.getByRole('button', { name: 'Submit' }).click();

    // 4. Verify request
    await expect(page.getByText('Request submitted')).toBeVisible();

    // 5. Add charge
    await page.getByRole('button', { name: 'Add Charge' }).click();
    await page.getByLabel('Item').fill('Minibar - Beer');
    await page.getByLabel('Amount').fill('150');
    await page.getByRole('button', { name: 'Add' }).click();

    // 6. Checkout
    await page.getByRole('button', { name: 'Checkout' }).click();
    await page.getByRole('button', { name: 'Pay with Wallet' }).click();

    // 7. Verify completion
    await expect(page.getByText('Checkout Complete')).toBeVisible();
    await expect(page.getByText('Invoice')).toBeVisible();
  });
});
```

---

## Health Checks

### Run Health Checks

```bash
# Full health check
npx tsx scripts/health-check.ts

# Check specific service
curl http://localhost:3001/api/health
curl http://localhost:3002/api/health
```

### Expected Output

```
Overall Status: HEALTHY
Total Services: 10
  Healthy: 10
  Degraded: 0
  Unhealthy: 0

Service Status:
  PASS    ReZ Auth Service       45ms
  PASS    ReZ Wallet Service      32ms
  PASS    ReZ Payment Service     28ms
  PASS    ReZ Merchant Service    35ms
  PASS    ReZ Intent Graph        42ms
  PASS    ReZ Knowledge Base      38ms
  PASS    ReZ Chat Service        31ms
  PASS    Hotel OTA API           55ms
  PASS    StayOwn Service         40ms
  PASS    AdBazaar API            48ms
```

### Cron Setup

```bash
# Add to crontab
*/5 * * * * /usr/bin/npx tsx /path/to/scripts/health-check.ts >> /var/log/health-check.log 2>&1
```

---

## E2E Testing with Playwright

### Setup

```bash
# Install Playwright
npm install --save-dev @playwright/test

# Install browsers
npx playwright install --with-deps
```

### Configuration

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Example E2E Test

```typescript
// e2e/room-qr.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Room QR System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('generates QR and scans', async ({ page }) => {
    // Navigate to room admin
    await page.goto('/room/admin');

    // Generate QR
    await page.getByLabel('Room ID').fill('ROOM-101');
    await page.getByRole('button', { name: 'Generate QR' }).click();

    // Verify QR generated
    await expect(page.getByTestId('qr-code')).toBeVisible();

    // Download QR
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download' }).click(),
    ]);
    expect(download.suggestedFilename()).toContain('ROOM-101');
  });

  test('guest checkout flow', async ({ page }) => {
    // Scan QR
    await page.goto('/room/scan');
    await page.getByTestId('qr-scanner').click();
    await page.getByTestId('camera-permission').click();

    // Simulate scan
    await page.evaluate(() => {
      const event = new CustomEvent('qr-scanned', {
        detail: 'rez://room/ROOM-101?token=test',
      });
      window.dispatchEvent(event);
    });

    // Make service request
    await page.getByRole('button', { name: 'Room Service' }).click();
    await page.getByLabel('Order').fill('Dinner for 2');
    await page.getByRole('button', { name: 'Place Order' }).click();

    // Verify
    await expect(page.getByText('Order placed')).toBeVisible();
  });
});
```

### Run E2E Tests

```bash
# Run all E2E tests
npx playwright test

# Run specific test
npx playwright test e2e/room-qr.spec.ts

# Open UI
npx playwright test --ui

# Debug
npx playwright test --debug
```

---

## Performance Testing

### Load Test with k6

```javascript
// k6/scan-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  const qrSlugs = ['abc123', 'def456', 'ghi789'];
  const slug = qrSlugs[Math.floor(Math.random() * qrSlugs.length)];

  const res = http.post(
    `http://localhost:3002/api/scan/${slug}`,
    JSON.stringify({
      userId: `user-${Math.floor(Math.random() * 1000)}`,
      deviceType: 'mobile',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has response body': (r) => r.body.length > 0,
  });

  sleep(1);
}
```

Run with:
```bash
k6 run k6/scan-load-test.js
```

---

## Test Coverage

### Generate Coverage Report

```bash
# Generate coverage
npm test -- --coverage

# View report
open coverage/lcov-report/index.html
```

### Coverage Targets

| Component | Target |
|------------|--------|
| Core Logic | 90% |
| API Routes | 80% |
| UI Components | 70% |

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci
      - run: npm run type-check
      - run: npm test -- --coverage

      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true

  e2e:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
```

---

## Troubleshooting Tests

### Common Issues

| Issue | Solution |
|-------|----------|
| Tests timeout | Increase timeout in config |
| Database errors | Reset test database |
| Flaky tests | Add retries or wait conditions |
| Coverage low | Add more test cases |

### Debug Tips

```bash
# Run single test
npm test -- --testNamePattern="specific test"

# Debug mode
npm test -- --inspect-brk

# Verbose output
npm test -- --verbose
```

---

## Checklist

Before deploying, verify:

- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Health checks pass
- [ ] E2E tests pass
- [ ] Performance acceptable
- [ ] Coverage targets met
