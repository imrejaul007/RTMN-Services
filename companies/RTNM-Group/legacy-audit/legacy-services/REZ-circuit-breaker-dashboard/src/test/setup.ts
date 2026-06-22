// Test setup file
// Configure test environment

process.env.NODE_ENV = 'test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.PORT = '4028';
process.env.LOG_LEVEL = 'error';
