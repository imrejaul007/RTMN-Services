// Jest test setup file
import mongoose from 'mongoose';
import { config } from '../config';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rtnm-billing-test';

// Increase Jest timeout for MongoDB operations
jest.setTimeout(30000);

// Mock logger to reduce noise during tests
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  logStream: {
    write: jest.fn(),
  },
}));

// Global teardown
afterAll(async () => {
  // Clean up MongoDB connection
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});