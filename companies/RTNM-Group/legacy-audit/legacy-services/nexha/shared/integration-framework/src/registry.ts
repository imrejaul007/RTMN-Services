/**
 * Partner Registry - Central registry for all partner integrations
 *
 * Manages partner connections, event routing, and handler registration.
 */

import type {
  PartnerConnection,
  PartnerCategory,
  IntegrationStatus,
  ConnectorConfig,
} from './types';

// ============================================================================
// Types
// ============================================================================

export interface RegistryOptions {
  /** Database connection for storing connections */
  db?: PartnerDatabase;
  /** Event bus for publishing events */
  eventBus?: EventBus;
}

export interface PartnerDatabase {
  save(connection: PartnerConnection): Promise<void>;
  findById(id: string): Promise<PartnerConnection | null>;
  findByPartnerId(partnerId: string): Promise<PartnerConnection[]>;
  findByCategory(category: PartnerCategory): Promise<PartnerConnection[]>;
  findByStatus(status: IntegrationStatus): Promise<PartnerConnection[]>;
  update(id: string, updates: Partial<PartnerConnection>): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface EventBus {
  publish<T>(topic: string, event: T): Promise<void>;
  subscribe<T>(topic: string, handler: (event: T) => Promise<void>): Promise<void>;
}

// ============================================================================
// Partner Registry
// ============================================================================

export class PartnerRegistry {
  private connections: Map<string, PartnerConnection> = new Map();
  private webhookPaths: Map<string, ConnectorConfig> = new Map();
  private db?: PartnerDatabase;
  private eventBus?: EventBus;

  constructor(options: RegistryOptions = {}) {
    this.db = options.db;
    this.eventBus = options.eventBus;
  }

  // --------------------------------------------------------------------------
  // Connection Management
  // --------------------------------------------------------------------------

  /**
   * Register a new partner connection
   */
  async register(config: ConnectorConfig, credentials: {
    webhookSecret?: string;
    apiKey?: string;
    apiSecret?: string;
  }): Promise<PartnerConnection> {
    const connection: PartnerConnection = {
      id: crypto.randomUUID(),
      partnerId: config.id,
      partnerName: config.partnerName,
      category: config.category,
      integrationType: config.id,
      webhookUrl: config.webhookPath,
      webhookSecret: credentials.webhookSecret,
      apiKey: credentials.apiKey,
      apiSecret: credentials.apiSecret,
      status: 'pending',
      metadata: { config },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.connections.set(connection.id, connection);
    this.webhookPaths.set(config.webhookPath, config);

    if (this.db) {
      await this.db.save(connection);
    }

    return connection;
  }

  /**
   * Get connection by ID
   */
  async getConnection(id: string): Promise<PartnerConnection | null> {
    // Check memory first
    const cached = this.connections.get(id);
    if (cached) return cached;

    // Fall back to database
    if (this.db) {
      return this.db.findById(id);
    }

    return null;
  }

  /**
   * Get all connections for a partner
   */
  async getConnectionsByPartnerId(partnerId: string): Promise<PartnerConnection[]> {
    if (this.db) {
      return this.db.findByPartnerId(partnerId);
    }
    return Array.from(this.connections.values()).filter(c => c.partnerId === partnerId);
  }

  /**
   * Get all connections by category
   */
  async getConnectionsByCategory(category: PartnerCategory): Promise<PartnerConnection[]> {
    if (this.db) {
      return this.db.findByCategory(category);
    }
    return Array.from(this.connections.values()).filter(c => c.category === category);
  }

  /**
   * Update connection status
   */
  async updateStatus(id: string, status: IntegrationStatus, error?: string): Promise<void> {
    const connection = await this.getConnection(id);
    if (!connection) throw new Error(`Connection not found: ${id}`);

    connection.status = status;
    connection.lastError = error;
    connection.updatedAt = new Date();

    this.connections.set(id, connection);

    if (this.db) {
      await this.db.update(id, connection);
    }
  }

  /**
   * Update last sync timestamp
   */
  async updateLastSync(id: string): Promise<void> {
    const connection = await this.getConnection(id);
    if (!connection) throw new Error(`Connection not found: ${id}`);

    connection.lastSyncAt = new Date();
    connection.lastError = undefined;
    connection.updatedAt = new Date();

    this.connections.set(id, connection);

    if (this.db) {
      await this.db.update(id, { lastSyncAt: connection.lastSyncAt, lastError: undefined });
    }
  }

  /**
   * Get connector config by webhook path
   */
  getConnectorByPath(path: string): ConnectorConfig | undefined {
    return this.webhookPaths.get(path);
  }

  /**
   * Get all active connections
   */
  async getActiveConnections(): Promise<PartnerConnection[]> {
    if (this.db) {
      return this.db.findByStatus('active');
    }
    return Array.from(this.connections.values()).filter(c => c.status === 'active');
  }

  /**
   * Deactivate connection
   */
  async deactivate(id: string): Promise<void> {
    await this.updateStatus(id, 'inactive');
  }

  /**
   * Reactivate connection
   */
  async reactivate(id: string): Promise<void> {
    await this.updateStatus(id, 'active');
  }

  /**
   * Delete connection
   */
  async delete(id: string): Promise<void> {
    const connection = await this.getConnection(id);
    if (!connection) throw new Error(`Connection not found: ${id}`);

    this.connections.delete(id);
    this.webhookPaths.delete(connection.webhookUrl || '');

    if (this.db) {
      await this.db.delete(id);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalRegistry: PartnerRegistry | null = null;

export function getPartnerRegistry(options?: RegistryOptions): PartnerRegistry {
  if (!globalRegistry) {
    globalRegistry = new PartnerRegistry(options);
  }
  return globalRegistry;
}

export function setPartnerRegistry(registry: PartnerRegistry): void {
  globalRegistry = registry;
}
