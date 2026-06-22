// Test setup file
// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '6001';
process.env.MONGODB_URI = 'mongodb://localhost:27017/rtnm_intercompany_graph_test';
process.env.LOG_LEVEL = 'error';

// Global test timeout
jest.setTimeout(10000);

// Suppress console logs during tests
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});