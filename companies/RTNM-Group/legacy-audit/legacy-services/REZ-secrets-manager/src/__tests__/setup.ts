// Test setup file
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set default test timeout
jest.setTimeout(10000);

// Mock MongoDB for unit tests
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    connect: jest.fn().mockResolvedValue(true),
    connection: {
      readyState: 1,
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(true)
    }
  };
});

// Global test utilities
global.testUtils = {
  generateRandomName: () => `test-secret-${Date.now()}-${Math.random().toString(36).substring(7)}`,
  generateRandomValue: () => `test-value-${Date.now()}-${Math.random().toString(36).substring(7)}`
};
