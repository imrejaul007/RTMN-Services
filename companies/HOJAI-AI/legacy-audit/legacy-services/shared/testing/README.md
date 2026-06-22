# @rez/testing - Testing Utilities

> Testing utilities for all REZ services

## Features

- ✅ Jest/Vitest configuration
- ✅ Common test utilities
- ✅ Mock factories
- ✅ Database fixtures
- ✅ API testing helpers

## Installation

```bash
npm install -D @rez/testing
```

## Usage

```typescript
import { describe, it, expect, setup, teardown } from '@rez/testing';

// Setup test database
beforeAll(async () => {
  await setup.testDatabase();
});

afterAll(async () => {
  await teardown.testDatabase();
});

// Test with fixtures
it('should create user', async () => {
  const user = await fixtures.createUser();
  expect(user.id).toBeDefined();
});
```

## License

Proprietary - RTNM Digital