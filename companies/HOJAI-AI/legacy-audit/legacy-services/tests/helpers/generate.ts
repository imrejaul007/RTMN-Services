/**
 * Test Data Generation Helpers
 *
 * Provides utilities for generating test data including:
 * - Fake embeddings
 * - Sample messages
 * - Mock documents
 * - Test fixtures
 *
 * @example
 * ```typescript
 * import { generateEmbedding, generateMessages, generateTestAgent } from './helpers/generate';
 *
 * describe('My Tests', () => {
 *   it('should process embeddings', () => {
 *     const embedding = generateEmbedding();
 *     // Use in test...
 *   });
 * });
 * ```
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Configuration for generating test data
 */
export interface GenerateConfig {
  /** Seed for reproducible random values */
  seed?: number;
  /** Dimension for embeddings */
  dimension?: number;
  /** Prefix for generated IDs */
  prefix?: string;
}

/**
 * Test document structure
 */
export interface TestDocument {
  id: string;
  title: string;
  content: string;
  chunks: string[];
  metadata: Record<string, unknown>;
}

/**
 * Test conversation structure
 */
export interface TestConversation {
  id: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  metadata: Record<string, unknown>;
}

// ============================================================================
// SEEDED RANDOM
// ============================================================================

/**
 * Simple seeded random number generator (Mulberry32)
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a seeded random in range
 */
export function seededRandomInRange(random: () => number, min: number, max: number): number {
  return min + random() * (max - min);
}

/**
 * Generate a seeded random integer in range
 */
export function seededRandomInt(random: () => number, min: number, max: number): number {
  return Math.floor(seededRandomInRange(random, min, max + 1));
}

/**
 * Pick a random element from array (seeded)
 */
export function seededRandomPick<T>(random: () => number, array: T[]): T {
  return array[seededRandomInt(random, 0, array.length - 1)];
}

// ============================================================================
// EMBEDDING GENERATORS
// ============================================================================

/**
 * Generate a random embedding vector
 */
export function generateEmbedding(config: GenerateConfig = {}): number[] {
  const { dimension = 1536, seed } = config;
  const random = seed !== undefined ? createSeededRandom(seed) : Math.random;

  const randomFn = seed !== undefined ? createSeededRandom(seed) : Math.random;

  // Generate random values
  const values = Array.from({ length: dimension }, () => randomFn() * 2 - 1);

  // Normalize to unit vector
  const magnitude = Math.sqrt(values.reduce((sum, val) => sum + val * val, 0));
  return values.map((val) => val / magnitude);
}

/**
 * Generate multiple embeddings
 */
export function generateEmbeddings(count: number, config: GenerateConfig = {}): number[][] {
  const embeddings: number[][] = [];
  const seed = config.seed || Date.now();

  for (let i = 0; i < count; i++) {
    embeddings.push(generateEmbedding({ ...config, seed: seed + i }));
  }

  return embeddings;
}

/**
 * Generate similar embeddings (small perturbation)
 */
export function generateSimilarEmbedding(
  base: number[],
  noiseScale = 0.1,
  seed?: number
): number[] {
  const random = seed !== undefined ? createSeededRandom(seed) : Math.random;

  const perturbed = base.map((val) => val + (random() * 2 - 1) * noiseScale);

  // Renormalize
  const magnitude = Math.sqrt(perturbed.reduce((sum, val) => sum + val * val, 0));
  return perturbed.map((val) => val / magnitude);
}

// ============================================================================
// MESSAGE GENERATORS
// ============================================================================

/**
 * Sample user messages for testing
 */
export const SAMPLE_USER_MESSAGES = [
  'Hello, how are you?',
  'Can you help me with my order?',
  'What is the status of my delivery?',
  'I need to change my shipping address',
  'Do you have this item in stock?',
  'How do I return a product?',
  'What are your business hours?',
  'Can you explain your pricing?',
];

/**
 * Sample assistant responses for testing
 */
export const SAMPLE_ASSISTANT_RESPONSES = [
  "I'm here to help! Let me look into that for you.",
  'Based on our records, I can see that your order is on its way.',
  'I understand your concern. Let me assist you with that.',
  'Great question! Here is what I found...',
  'I have processed your request successfully.',
  'Is there anything else I can help you with?',
];

/**
 * Generate a chat message
 */
export function generateMessage(
  role: 'user' | 'assistant' | 'system' = 'user',
  content?: string
) {
  return {
    role,
    content: content || (role === 'user'
      ? SAMPLE_USER_MESSAGES[Math.floor(Math.random() * SAMPLE_USER_MESSAGES.length)]
      : SAMPLE_ASSISTANT_RESPONSES[Math.floor(Math.random() * SAMPLE_ASSISTANT_RESPONSES.length)]),
  };
}

/**
 * Generate a conversation with N messages
 */
export function generateConversation(
  messageCount = 5,
  includeSystem = true,
  config: GenerateConfig = {}
): TestConversation {
  const { prefix = 'conv' } = config;

  const messages: TestConversation['messages'] = [];

  if (includeSystem) {
    messages.push({
      role: 'system',
      content: 'You are a helpful AI assistant.',
    });
  }

  for (let i = 0; i < messageCount; i++) {
    const role = i % 2 === 0 ? 'user' : 'assistant';
    messages.push(generateMessage(role));
  }

  return {
    id: `${prefix}-${uuidv4()}`,
    messages,
    metadata: {
      createdAt: new Date().toISOString(),
      messageCount: messages.length,
    },
  };
}

// ============================================================================
// DOCUMENT GENERATORS
// ============================================================================

/**
 * Sample document content
 */
export const SAMPLE_DOCUMENTS = [
  {
    title: 'Getting Started Guide',
    content: 'Welcome to our platform! This guide will help you get started with basic features. First, create your account. Then, explore the dashboard. You can customize your settings from the profile page.',
  },
  {
    title: 'API Documentation',
    content: 'Our REST API allows you to integrate with our platform. The base URL is api.example.com. Authentication uses Bearer tokens. Endpoints include /users, /orders, and /products. All responses are JSON.',
  },
  {
    title: 'Pricing Information',
    content: 'We offer three pricing tiers. Basic is free with limited features. Pro costs $29/month with advanced features. Enterprise is custom pricing for large organizations. All plans include email support.',
  },
  {
    title: 'Privacy Policy',
    content: 'We respect your privacy. We collect minimal data necessary for service operation. Data is encrypted in transit and at rest. You can request data export or deletion at any time. Contact privacy@example.com.',
  },
  {
    title: 'Terms of Service',
    content: 'By using our service, you agree to these terms. Users must be 18 or older. You are responsible for account security. Prohibited activities include fraud, spam, and illegal content. We may terminate accounts for violations.',
  },
];

/**
 * Generate a test document
 */
export function generateDocument(config: GenerateConfig = {}): TestDocument {
  const { prefix = 'doc' } = config;
  const sample = SAMPLE_DOCUMENTS[Math.floor(Math.random() * SAMPLE_DOCUMENTS.length)];

  // Simple chunking by sentences
  const sentences = sample.content.split('. ').filter(Boolean);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > 100 && chunks.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence;
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return {
    id: `${prefix}-${uuidv4()}`,
    title: sample.title,
    content: sample.content,
    chunks,
    metadata: {
      source: 'test-generator',
      createdAt: new Date().toISOString(),
      wordCount: sample.content.split(/\s+/).length,
    },
  };
}

/**
 * Generate multiple documents
 */
export function generateDocuments(count: number, config: GenerateConfig = {}): TestDocument[] {
  const documents: TestDocument[] = [];
  const seed = config.seed || Date.now();

  for (let i = 0; i < count; i++) {
    documents.push(generateDocument({ ...config, seed: seed + i }));
  }

  return documents;
}

// ============================================================================
// AGENT GENERATORS
// ============================================================================

/**
 * Sample agent names
 */
export const SAMPLE_AGENT_NAMES = [
  'Sales Assistant',
  'Support Agent',
  'Technical Support',
  'Billing Assistant',
  'Product Expert',
];

/**
 * Sample agent system prompts
 */
export const SAMPLE_SYSTEM_PROMPTS = [
  'You are a helpful sales assistant. Be friendly and professional.',
  'You are a technical support agent. Provide accurate troubleshooting guidance.',
  'You are a billing specialist. Be clear and detailed about pricing.',
  'You are a product expert. Help customers find the right products.',
  'You are a customer success manager. Focus on customer satisfaction.',
];

/**
 * Generate a test agent configuration
 */
export function generateTestAgent(config: GenerateConfig = {}): {
  id: string;
  name: string;
  type: string;
  systemPrompt: string;
  tools: string[];
} {
  const { prefix = 'agent' } = config;
  const nameIndex = Math.floor(Math.random() * SAMPLE_AGENT_NAMES.length);

  return {
    id: `${prefix}-${uuidv4()}`,
    name: SAMPLE_AGENT_NAMES[nameIndex],
    type: SAMPLE_AGENT_NAMES[nameIndex].toLowerCase().replace(/\s+/g, '_'),
    systemPrompt: SAMPLE_SYSTEM_PROMPTS[nameIndex],
    tools: ['search', 'retrieve', 'respond'],
  };
}

// ============================================================================
// MEMORY GENERATORS
// ============================================================================

/**
 * Generate test memory entries
 */
export function generateMemoryEntries(count: number, config: GenerateConfig = {}): Array<{
  id: string;
  type: 'interaction' | 'fact' | 'preference' | 'decision';
  content: string;
  importance: number;
  timestamp: Date;
}> {
  const { prefix = 'mem' } = config;
  const types: Array<'interaction' | 'fact' | 'preference' | 'decision'> = [
    'interaction', 'fact', 'preference', 'decision'
  ];

  const contents = [
    'User prefers email communication',
    'Customer has a premium subscription',
    'Previous support case was resolved positively',
    'User asked about enterprise pricing',
    'Customer has billing questions',
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${uuidv4()}`,
    type: types[i % types.length],
    content: contents[i % contents.length],
    importance: Math.random(),
    timestamp: new Date(Date.now() - Math.random() * 86400000 * 7), // Within last 7 days
  }));
}

// ============================================================================
// SEARCH QUERY GENERATORS
// ============================================================================

/**
 * Sample search queries
 */
export const SAMPLE_SEARCH_QUERIES = [
  'how do I reset my password',
  'what is the refund policy',
  'contact customer support',
  'change subscription plan',
  'export data',
  'delete account',
  'business hours',
  'api documentation',
  'pricing tiers',
  'getting started',
];

/**
 * Generate a test search query
 */
export function generateSearchQuery(): string {
  return SAMPLE_SEARCH_QUERIES[Math.floor(Math.random() * SAMPLE_SEARCH_QUERIES.length)];
}

/**
 * Generate multiple search queries
 */
export function generateSearchQueries(count: number): string[] {
  return Array.from({ length: count }, () => generateSearchQuery());
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique test ID
 */
export function generateId(prefix = 'test'): string {
  return `${prefix}-${uuidv4()}`;
}

/**
 * Generate a timestamp for testing
 */
export function generateTimestamp(offsetDays = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date;
}

/**
 * Generate a date range for testing
 */
export function generateDateRange(days = 7): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start, end };
}

/**
 * Create a simple matcher for assertions
 */
export function createPartialMatcher<T>(partial: Partial<T>): (item: T) => boolean {
  return (item: T) => {
    return Object.entries(partial).every(([key, value]) => {
      return item[key as keyof T] === value;
    });
  };
}

/**
 * Generate a test tenant ID
 */
export function generateTenantId(): string {
  return `tenant-${uuidv4()}`;
}

/**
 * Generate a test user ID
 */
export function generateUserId(): string {
  return `user-${uuidv4()}`;
}

/**
 * Generate test metadata
 */
export function generateMetadata(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    source: 'test',
    generatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Seeded random
  createSeededRandom,
  seededRandomInRange,
  seededRandomInt,
  seededRandomPick,

  // Generators
  generateEmbedding,
  generateEmbeddings,
  generateSimilarEmbedding,
  generateMessage,
  generateConversation,
  generateDocument,
  generateDocuments,
  generateTestAgent,
  generateMemoryEntries,
  generateSearchQuery,
  generateSearchQueries,

  // Utilities
  generateId,
  generateTimestamp,
  generateDateRange,
  createPartialMatcher,
  generateTenantId,
  generateUserId,
  generateMetadata,

  // Samples
  SAMPLE_USER_MESSAGES,
  SAMPLE_ASSISTANT_RESPONSES,
  SAMPLE_DOCUMENTS,
  SAMPLE_AGENT_NAMES,
  SAMPLE_SYSTEM_PROMPTS,
  SAMPLE_SEARCH_QUERIES,
};
