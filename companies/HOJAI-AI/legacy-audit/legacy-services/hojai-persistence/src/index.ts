/**
 * HOJAI Persistence Package
 *
 * MongoDB-based persistence layer for HOJAI AI services.
 * Provides repositories for agents, memory, workflows, and audit logging.
 *
 * @example
 * ```typescript
 * import { createConnection, AgentRepository, MemoryRepository } from '@hojai/persistence';
 *
 * // Connect to MongoDB
 * const connection = await createConnection('mongodb://localhost:27017/hojai');
 *
 * // Create repositories
 * const agentRepo = new AgentRepository(connection.db);
 * const memoryRepo = new MemoryRepository(connection.db);
 *
 * // Use repositories
 * const agent = await agentRepo.create({ name: 'My Agent', type: 'assistant' });
 * await memoryRepo.addMemory({ type: 'fact', content: 'User prefers email' });
 *
 * // Cleanup
 * await connection.close();
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * MongoDB connection configuration
 */
export interface MongoDBConfig {
  /** MongoDB connection URI */
  uri: string;
  /** Database name */
  database?: string;
  /** Connection options */
  options?: {
    maxPoolSize?: number;
    minPoolSize?: number;
    maxIdleTimeMS?: number;
    serverSelectionTimeoutMS?: number;
    socketTimeoutMS?: number;
  };
}

/**
 * MongoDB connection result
 */
export interface MongoDBConnection {
  /** MongoDB client */
  client: import('mongodb').MongoClient;
  /** Database instance */
  db: import('mongodb').Db;
  /** Connection URI (without credentials) */
  uri: string;
  /** Close the connection */
  close: () => Promise<void>;
}

/**
 * Base document interface
 */
export interface BaseDocument {
  _id?: import('mongodb').ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

// ============================================================================
// CONNECTION
// ============================================================================

const connections = new Map<string, MongoDBConnection>();

/**
 * Create a MongoDB connection
 */
export async function createConnection(config: MongoDBConfig): Promise<MongoDBConnection> {
  const { MongoClient } = await import('mongodb');

  const uri = config.uri;
  const database = config.database || 'hojai';

  // Check for existing connection
  const existing = connections.get(uri);
  if (existing) {
    return existing;
  }

  const client = new MongoClient(uri, {
    maxPoolSize: config.options?.maxPoolSize || 10,
    minPoolSize: config.options?.minPoolSize || 1,
    maxIdleTimeMS: config.options?.maxIdleTimeMS || 30000,
    serverSelectionTimeoutMS: config.options?.serverSelectionTimeoutMS || 30000,
    socketTimeoutMS: config.options?.socketTimeoutMS || 45000,
  });

  await client.connect();
  const db = client.db(database);

  const connection: MongoDBConnection = {
    client,
    db,
    uri: maskUri(uri),
    close: async () => {
      await client.close();
      connections.delete(uri);
    },
  };

  connections.set(uri, connection);
  return connection;
}

/**
 * Get an existing connection
 */
export function getConnection(uri: string): MongoDBConnection | undefined {
  return connections.get(uri);
}

/**
 * Close all connections
 */
export async function closeAllConnections(): Promise<void> {
  const closePromises = Array.from(connections.values()).map((conn) => conn.close());
  await Promise.all(closePromises);
}

/**
 * Mask URI for logging (hide credentials)
 */
function maskUri(uri: string): string {
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
}

/**
 * Create connection from environment variables
 */
export async function createConnectionFromEnv(): Promise<MongoDBConnection> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is required');
  }
  return createConnection({
    uri,
    database: process.env.MONGODB_DATABASE || 'hojai',
  });
}

// ============================================================================
// COLLECTION NAMES
// ============================================================================

/**
 * Collection names used by HOJAI
 */
export const COLLECTIONS = {
  AGENTS: 'agents',
  AGENT_EXECUTIONS: 'agent_executions',
  MEMORIES: 'memories',
  MEMORY_SESSIONS: 'memory_sessions',
  WORKFLOWS: 'workflows',
  WORKFLOW_EXECUTIONS: 'workflow_executions',
  AUDIT_LOGS: 'audit_logs',
  TENANTS: 'tenants',
  EMPLOYEES: 'employees',
} as const;

/**
 * Create standard indexes for a collection
 */
export async function createStandardIndexes(
  db: import('mongodb').Db,
  collectionName: string,
  indexes: Array<{
    key: Record<string, 1 | -1 | 'text'>;
    options?: Partial<import('mongodb').IndexOptions>;
  }>
): Promise<void> {
  const collection = db.collection(collectionName);

  for (const index of indexes) {
    await collection.createIndex(index.key, {
      background: true,
      ...index.options,
    });
  }
}

// ============================================================================
// COMMON UTILITIES
// ============================================================================

/**
 * Convert string ID to ObjectId
 */
export function toObjectId(id: string): import('mongodb').ObjectId {
  return new import('mongodb').ObjectId(id);
}

/**
 * Check if string is valid ObjectId
 */
export function isValidObjectId(id: string): boolean {
  return import('mongodb').ObjectId.isValid(id) && new import('mongodb').ObjectId(id).toString() === id;
}

/**
 * Paginate query results
 */
export async function paginate<T>(
  collection: import('mongodb').Collection<T>,
  query: import('mongodb').Filter<T>,
  options: PaginationOptions = {}
): Promise<PaginatedResult<T>> {
  const { page = 1, limit = 20, sort } = options;

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    collection
      .find(query)
      .sort(sort || { createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collection.countDocuments(query),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total,
  };
}

/**
 * Generate timestamps for documents
 */
export function generateTimestamps(): { createdAt: Date; updatedAt: Date } {
  const now = new Date();
  return { createdAt: now, updatedAt: now };
}

/**
 * Update timestamp helper
 */
export function updateTimestamp(): { updatedAt: Date } {
  return { updatedAt: new Date() };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { AgentRepository } from './repositories/agentRepository.js';
export { MemoryRepository } from './repositories/memoryRepository.js';

export default {
  createConnection,
  createConnectionFromEnv,
  getConnection,
  closeAllConnections,
  COLLECTIONS,
  createStandardIndexes,
  toObjectId,
  isValidObjectId,
  paginate,
  generateTimestamps,
  updateTimestamp,
};


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hojai-persistence',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe (for Kubernetes)
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe (for Kubernetes)
app.get('/health/ready', async (req, res) => {
  try {
    // Add readiness checks here (DB connection, etc.)
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});
