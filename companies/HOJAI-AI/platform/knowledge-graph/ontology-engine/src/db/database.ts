/**
 * Database connection and utilities
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;

// Database configuration
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'ontology_engine',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create connection pool
export const pool = new Pool(DB_CONFIG);

// Test connection
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('[OntologyEngine] Database connected:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('[OntologyEngine] Database connection failed:', error);
    return false;
  }
}

// Execute migrations
export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Check if migrations have been run
    const { rows } = await client.query('SELECT name FROM migrations');
    const executedMigrations = new Set(rows.map(r => r.name));

    // Read and execute schema
    const schemaPath = join(dirname(fileURLToPath(import.meta.url)), 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // Split by statements and execute
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      try {
        await client.query(statement);
      } catch (error: unknown) {
        // Ignore "already exists" errors
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('already exists') && !message.includes('duplicate key')) {
          console.error('[OntologyEngine] Migration error:', error);
        }
      }
    }

    console.log('[OntologyEngine] Migrations completed');
  } finally {
    client.release();
  }
}

// Query helper
export async function query<T>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (duration > 100) {
    console.log('[OntologyEngine] Slow query:', { text: text.substring(0, 100), duration, rows: result.rowCount });
  }
  return result;
}

// Transaction helper
export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Close pool
export async function closePool(): Promise<void> {
  await pool.end();
}

export default { pool, query, testConnection, runMigrations, withTransaction, closePool };
