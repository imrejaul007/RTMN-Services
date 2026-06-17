import axios, { AxiosInstance } from 'axios';

export interface ConnectorConfig {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  baseUrl?: string;
  webhookSecret?: string;
  [key: string]: any;
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errors: { record?: string; error: string }[];
  data?: any;
}

export interface EntityData {
  id?: string | number;
  externalId?: string;
  [key: string]: any;
}

export abstract class BaseConnector {
  protected client: AxiosInstance | null = null;
  protected config: ConnectorConfig;
  protected name: string;

  constructor(name: string, config: ConnectorConfig = {}) {
    this.name = name;
    this.config = config;
    this.initializeClient();
  }

  protected abstract initializeClient(): void;

  abstract testConnection(): Promise<{ success: boolean; error?: string }>;

  abstract fetch(entityType: string, options?: any): Promise<EntityData[]>;

  abstract push(entityType: string, data: EntityData[]): Promise<SyncResult>;

  abstract getEntityTypes(): string[];

  protected async makeRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: any,
    options?: any
  ): Promise<T> {
    if (!this.client) {
      throw new Error(`${this.name} connector not initialized`);
    }

    try {
      const response = await this.client.request({
        method,
        url: endpoint,
        data,
        ...options
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`API Error: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  protected handleError(error: any, defaultMessage: string): { success: boolean; error: string } {
    if (axios.isAxiosError(error)) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: defaultMessage };
  }

  async sync(entityType: string, direction: 'push' | 'pull' | 'bidirectional'): Promise<SyncResult> {
    if (direction === 'pull') {
      const data = await this.fetch(entityType);
      return {
        success: true,
        recordsProcessed: data.length,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: 0,
        errors: [],
        data
      };
    } else if (direction === 'push') {
      return await this.push(entityType, []);
    } else {
      // Bidirectional
      const pulled = await this.fetch(entityType);
      const pushed = await this.push(entityType, pulled);
      return pushed;
    }
  }

  getWebhookHandler?(event: string, payload: any): Promise<any>;
}