/**
 * Test Setup and Teardown
 *
 * This file configures the test environment with:
 * - MongoDB Memory Server for database testing
 * - Global test configuration
 * - Cleanup hooks
 *
 * @example
 * ```typescript
 * // Tests will automatically use this setup
 * import { describe, it, expect, beforeAll, afterAll } from 'vitest';
 *
 * describe('My tests', () => {
 *   beforeAll(async () => {
 *     await setupTests();
 *   });
 *
 *   afterAll(async () => {
 *     await teardownTests();
 *   });
 * });
 * ```
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

// MongoDB Memory Server types (loaded dynamically)
let MongoMemoryServer: typeof import('mongodb-memory-server').MongoMemoryServer | null = null;
let mongoServer: InstanceType<NonNullable<typeof MongoMemoryServer>> | null = null;

// Global test state
interface TestState {
  mongodbUri: string;
  redisUrl: string;
  testStartTime: number;
}

const testState: TestState = {
  mongodbUri: '',
  redisUrl: 'redis://localhost:6379',
  testStartTime: Date.now(),
};

// Extend global scope
declare global {
  // eslint-disable-next-line no-var
  var __TEST_STATE__: TestState;
  // eslint-disable-next-line no-var
  var __MONGO_CLIENT__: import('mongodb').MongoClient | null;
  // eslint-disable-next-line no-var
  var __REDIS_CLIENT__: import('ioredis').default | null;
}

global.__TEST_STATE__ = testState;
global.__MONGO_CLIENT__ = null;
global.__REDIS_CLIENT__ = null;

/**
 * Initialize MongoDB Memory Server
 */
async function setupMongoMemoryServer(): Promise<void> {
  try {
    // Dynamic import for optional dependency
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongoServer = await MongoMemoryServer.create();

    testState.mongodbUri = mongoServer.getUri();

    // Set environment variable for services to use
    process.env.MONGODB_URI = testState.mongodbUri;

    console.log(`[Test Setup] MongoDB Memory Server started at ${testState.mongodbUri}`);
  } catch (error) {
    console.warn('[Test Setup] MongoDB Memory Server not available, skipping setup');
    console.warn('Install with: npm install --save-dev mongodb-memory-server');
    testState.mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
  }
}

/**
 * Connect to MongoDB
 */
async function connectMongoDB(): Promise<void> {
  if (!testState.mongodbUri) {
    console.warn('[Test Setup] No MongoDB URI available');
    return;
  }

  try {
    const { MongoClient } = await import('mongodb');
    const client = new MongoClient(testState.mongodbUri);
    await client.connect();
    global.__MONGO_CLIENT__ = client;
    console.log('[Test Setup] Connected to MongoDB');
  } catch (error) {
    console.warn('[Test Setup] Could not connect to MongoDB:', error);
  }
}

/**
 * Setup Redis mock
 */
function setupRedisMock(): void {
  // Create a mock Redis client for testing
  const mockRedis = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
    mget: vi.fn().mockResolvedValue([]),
    mset: vi.fn().mockResolvedValue('OK'),
    expire: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(-1),
    ping: vi.fn().mockResolvedValue('PONG'),
    quit: vi.fn().mockResolvedValue('OK'),
  };

  global.__REDIS_CLIENT__ = mockRedis as unknown as typeof global.__REDIS_CLIENT__;
  console.log('[Test Setup] Redis mock initialized');
}

/**
 * Setup test environment
 */
export async function setupTests(): Promise<void> {
  console.log('[Test Setup] Initializing test environment...');

  await setupMongoMemoryServer();
  await connectMongoDB();
  setupRedisMock();

  // Suppress console output in tests (optional)
  if (process.env.SUPPRESS_TEST_LOGS === 'true') {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  }

  console.log('[Test Setup] Test environment ready');
}

/**
 * Teardown and cleanup
 */
export async function teardownTests(): Promise<void> {
  console.log('[Test Teardown] Cleaning up...');

  // Close MongoDB connection
  if (global.__MONGO_CLIENT__) {
    try {
      await global.__MONGO_CLIENT__.close();
      global.__MONGO_CLIENT__ = null;
      console.log('[Test Teardown] MongoDB connection closed');
    } catch (error) {
      console.error('[Test Teardown] Error closing MongoDB:', error);
    }
  }

  // Stop MongoDB Memory Server
  if (mongoServer) {
    try {
      await mongoServer.stop();
      mongoServer = null;
      console.log('[Test Teardown] MongoDB Memory Server stopped');
    } catch (error) {
      console.error('[Test Teardown] Error stopping MongoDB Memory Server:', error);
    }
  }

  // Restore console mocks
  vi.restoreAllMocks();
}

/**
 * Clean collections before each test
 */
export async function cleanCollections(): Promise<void> {
  if (!global.__MONGO_CLIENT__) {
    return;
  }

  try {
    const db = global.__MONGO_CLIENT__.db('test');
    const collections = await db.listCollections().toArray();

    for (const collection of collections) {
      await db.collection(collection.name).deleteMany({});
    }
  } catch (error) {
    console.warn('[Test Cleanup] Error cleaning collections:', error);
  }
}

/**
 * Clean Redis mock data
 */
export function cleanRedis(): void {
  if (global.__REDIS_CLIENT__) {
    vi.mocked(global.__REDIS_CLIENT__.del).mockResolvedValue(1);
    vi.mocked(global.__REDIS_CLIENT__.keys).mockResolvedValue([]);
  }
}

// ============================================================================
// LIFECYCLE HOOKS
// ============================================================================

beforeAll(async () => {
  await setupTests();
}, 30000); // 30 second timeout for setup

afterAll(async () => {
  await teardownTests();
}, 30000);

beforeEach(() => {
  // Reset test timer
  testState.testStartTime = Date.now();
});

afterEach(async () => {
  // Clean collections after each test
  await cleanCollections();
  cleanRedis();

  // Reset all mocks
  vi.clearAllMocks();
});

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Get test database instance
 */
export function getTestDB(): import('mongodb').Db | null {
  if (!global.__MONGO_CLIENT__) {
    return null;
  }
  return global.__MONGO_CLIENT__.db('test');
}

/**
 * Get test MongoDB URI
 */
export function getMongoUri(): string {
  return testState.mongodbUri;
}

/**
 * Create a test collection with common indexes
 */
export async function createTestCollection(
  name: string,
  indexes?: Array<{
    key: Record<string, 1 | -1 | 'text'>;
    options?: Partial<import('mongodb').IndexOptions>;
  }>
): Promise<import('mongodb').Collection> {
  const db = getTestDB();
  if (!db) {
    throw new Error('Test database not available');
  }

  const collection = db.collection(name);

  if (indexes) {
    for (const index of indexes) {
      await collection.createIndex(index.key, index.options);
    }
  }

  return collection;
}

/**
 * Generate test timeout based on complexity
 */
export function getTestTimeout(type: 'fast' | 'normal' | 'slow'): number {
  switch (type) {
    case 'fast':
      return 5000;
    case 'normal':
      return 10000;
    case 'slow':
      return 30000;
    default:
      return 10000;
  }
}

// ============================================================================
// MOCK HELPERS
// ============================================================================

/**
 * Create a mock fetch function
 */
export function createMockFetch(response: unknown, status = 200): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: vi.fn().mockResolvedValue(response),
    text: vi.fn().mockResolvedValue(JSON.stringify(response)),
    headers: new Map([['content-type', 'application/json']]),
    clone: vi.fn(),
  }) as unknown as typeof fetch;
}

/**
 * Create a mock that resolves after a delay
 */
export function mockAsyncDelay<T>(value: T, delayMs: number): () => Promise<T> {
  return () => new Promise((resolve) => setTimeout(() => resolve(value), delayMs));
}

/**
 * Create a mock that rejects after a delay
 */
export function mockAsyncError<T>(error: Error, delayMs: number): () => Promise<T> {
  return () => new Promise((_, reject) => setTimeout(() => reject(error), delayMs));
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  testState,
  mongoServer,
};

export default {
  setupTests,
  teardownTests,
  cleanCollections,
  cleanRedis,
  getTestDB,
  getMongoUri,
  createTestCollection,
  getTestTimeout,
  createMockFetch,
  mockAsyncDelay,
  mockAsyncError,
};
