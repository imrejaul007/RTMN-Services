/**
 * Test setup for KnowledgeOS Persistent Graph Store
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '4750';
process.env.PGHOST = 'localhost';
process.env.PGDATABASE = 'test_knowledge_graph';
