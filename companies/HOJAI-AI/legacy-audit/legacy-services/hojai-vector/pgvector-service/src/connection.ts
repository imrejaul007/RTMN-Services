/**
 * HOJAI pgvector Service - PostgreSQL Connection Manager
 * Version: 1.0.0 | Date: June 2, 2026
 * Purpose: Manage PostgreSQL connections with pgvector extension support
 */

import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import type { Logger } from './utils/logger.js';

// ============================================================================
// Configuration
// ============================================================================

interface ConnectionConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  maxConnections?: number;
  idleTimeoutMs?: number;
  connectionTimeoutMs?: number;
  ssl?: boolean;
}

// Environment variable helpers
const getEnv = (key: string): string | undefined => process.env[key];
const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = getEnv(key);
  return value ? parseInt(value, 10) : defaultValue;
};

// ============================================================================
// Connection Manager
// ============================================================================

class PGConnectionManager {
  private pool: Pool | null = null;
  private config: ConnectionConfig;
  private logger: Logger;
  private initialized: boolean = false;

  constructor(logger: Logger, config: ConnectionConfig = {}) {
    this.logger = logger;

    // Load configuration from environment or provided config
    this.config = {
      host: config.host || getEnv('PGVECTOR_HOST') || 'localhost',
      port: config.port || getEnvNumber('PGVECTOR_PORT', 5432),
      database: config.database || getEnv('PGVECTOR_DATABASE') || 'postgres',
      user: config.user || getEnv('PGVECTOR_USER') || 'postgres',
      password: config.password || getEnv('PGVECTOR_PASSWORD') || '',
      maxConnections: config.maxConnections || getEnvNumber('PGVECTOR_MAX_CONNECTIONS', 20),
      idleTimeoutMs: config.idleTimeoutMs || getEnvNumber('PGVECTOR_IDLE_TIMEOUT_MS', 30000),
      connectionTimeoutMs: config.connectionTimeoutMs || getEnvNumber('PGVECTOR_CONNECTION_TIMEOUT_MS', 10000),
      ssl: config.ssl || getEnv('PGVECTOR_SSL') === 'true',
    };

    this.logger.info('pgvector_connection_configured', {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      hasPassword: !!this.config.password,
    });
  }

  /**
   * Initialize the connection pool
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('pgvector_already_initialized');
      return;
    }

    const startTime = Date.now();

    try {
      const poolConfig: PoolConfig = {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        max: this.config.maxConnections,
        idleTimeoutMillis: this.config.idleTimeoutMs,
        connectionTimeoutMillis: this.config.connectionTimeoutMs,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
      };

      this.pool = new Pool(poolConfig);

      // Test the connection
      const client = await this.pool.connect();
      const result = await client.query('SELECT version()');
      client.release();

      this.initialized = true;
      const duration = Date.now() - startTime;

      this.logger.info('pgvector_initialized', {
        version: result.rows[0]?.version || 'unknown',
        durationMs: duration,
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
      });

      // Enable pgvector extension
      await this.enablePgvectorExtension();
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('pgvector_init_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: duration,
      });
      throw error;
    }
  }

  /**
   * Enable pgvector extension
   */
  private async enablePgvectorExtension(): Promise<void> {
    try {
      await this.query('CREATE EXTENSION IF NOT EXISTS vector');
      this.logger.info('pgvector_extension_enabled');
    } catch (error) {
      // Extension might already exist or user lacks permissions
      this.logger.warn('pgvector_extension_warning', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Check if the connection is healthy
   */
  async healthCheck(): Promise<boolean> {
    if (!this.pool) {
      return false;
    }

    try {
      const result = await this.query('SELECT 1 as health');
      return result.rows.length > 0;
    } catch (error) {
      this.logger.error('pgvector_health_check_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Execute a query
   */
  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error('PostgreSQL pool not initialized. Call initialize() first.');
    }

    const startTime = Date.now();
    const queryId = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    this.logger.debug('pgvector_query_start', {
      queryId,
      text: text.substring(0, 100),
      paramCount: params?.length || 0,
    });

    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - startTime;

      this.logger.debug('pgvector_query_end', {
        queryId,
        rowCount: result.rowCount,
        durationMs: duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('pgvector_query_error', {
        queryId,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: duration,
      });
      throw error;
    }
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(
    callback: (client: { query: <U extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) => Promise<QueryResult<U>> }) => Promise<T>
  ): Promise<T> {
    if (!this.pool) {
      throw new Error('PostgreSQL pool not initialized. Call initialize() first.');
    }

    const client = await this.pool.connect();
    const startTime = Date.now();

    try {
      await client.query('BEGIN');

      const wrappedClient = {
        query: <U extends QueryResultRow = QueryResultRow>(
          text: string,
          params?: unknown[]
        ): Promise<QueryResult<U>> => client.query<U>(text, params),
      };

      const result = await callback(wrappedClient);

      await client.query('COMMIT');
      const duration = Date.now() - startTime;

      this.logger.debug('pgvector_transaction_commit', {
        durationMs: duration,
      });

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      const duration = Date.now() - startTime;

      this.logger.error('pgvector_transaction_rollback', {
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: duration,
      });

      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  } {
    if (!this.pool) {
      return { totalCount: 0, idleCount: 0, waitingCount: 0 };
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    if (!this.pool) {
      return;
    }

    this.logger.info('pgvector_closing');

    try {
      await this.pool.end();
      this.pool = null;
      this.initialized = false;
      this.logger.info('pgvector_closed');
    } catch (error) {
      this.logger.error('pgvector_close_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let connectionInstance: PGConnectionManager | null = null;
let connectionLogger: Logger | null = null;

export function initializeConnection(logger: Logger, config?: ConnectionConfig): PGConnectionManager {
  connectionLogger = logger;
  connectionInstance = new PGConnectionManager(logger, config);
  return connectionInstance;
}

export function getConnection(): PGConnectionManager {
  if (!connectionInstance) {
    throw new Error('Connection not initialized. Call initializeConnection() first.');
  }
  return connectionInstance;
}

export function getConnectionLogger(): Logger {
  if (!connectionLogger) {
    throw new Error('Connection logger not initialized');
  }
  return connectionLogger;
}

export { PGConnectionManager };
