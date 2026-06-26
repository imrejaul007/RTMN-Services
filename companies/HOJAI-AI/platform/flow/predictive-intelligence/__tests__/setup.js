// Vitest setup file - runs before test files
// Set test environment variables BEFORE any modules are imported
process.env.PREDICTIVE_INTELLIGENCE_NO_LISTEN = '1';
process.env.PREDICTIVE_INTELLIGENCE_REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';
