// Jest test setup
jest.setTimeout(30000);

// Mock environment variables
process.env.PORT = '4808';
process.env.MONGODB_URI = 'mongodb://localhost:27017/customer-graph-360-test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Suppress console during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};