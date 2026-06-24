/**
 * CorpID Module
 *
 * Universal identity for companies, users, agents, and devices.
 * Every entity in HOJAI has a CorpID. CorpIDs can be verified, linked,
 * and resolved to entities.
 */

import type { HojaiConfig } from './config.js';
import { request } from './utils.js';

export type CorpIDType = 'company' | 'user' | 'agent' | 'device' | 'service';
export type CorpIDStatus = 'pending' | 'verified' | 'suspended' | 'revoked';

export interface CorpIDMetadata {
  name?: string;
  email?: string;
  country?: string;
  taxId?: string;
  kybStatus?: CorpIDStatus;
  industry?: string;
  [key: string]: unknown;
}

export interface CorpID {
  id: string;
  type: CorpIDType;
  status: CorpIDStatus;
  metadata: CorpIDMetadata;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
  linkedIds?: string[];
}

export interface CreateCorpIDRequest {
  type: CorpIDType;
  metadata: CorpIDMetadata;
  parentId?: string;
}

export interface VerifyCorpIDRequest {
  verificationType: 'kyb' | 'kyc' | 'email' | 'phone' | 'gov_id';
  evidence: Record<string, unknown>;
}

/**
 * CorpID client
 */
export class CorpIDClient {
  constructor(private config: HojaiConfig) {}

  /**
   * Create a new CorpID
   */
  async create(input: CreateCorpIDRequest): Promise<CorpID> {
    return request<CorpID>(this.config, 'POST', '/api/v1/corp-id', input);
  }

  /**
   * Get a CorpID by id
   */
  async get(id: string): Promise<CorpID> {
    return request<CorpID>(this.config, 'GET', `/api/v1/corp-id/${encodeURIComponent(id)}`);
  }

  /**
   * Verify a CorpID
   */
  async verify(id: string, input: VerifyCorpIDRequest): Promise<CorpID> {
    return request<CorpID>(this.config, 'POST', `/api/v1/corp-id/${encodeURIComponent(id)}/verify`, input);
  }

  /**
   * Link two CorpIDs together
   */
  async link(id: string, otherId: string, relationship: string): Promise<CorpID> {
    return request<CorpID>(this.config, 'POST', `/api/v1/corp-id/${encodeURIComponent(id)}/link`, { otherId, relationship });
  }

  /**
   * Search CorpIDs by type + filters
   */
  async search(type: CorpIDType, filters: CorpIDMetadata = {}): Promise<CorpID[]> {
    return request<CorpID[]>(this.config, 'POST', '/api/v1/corp-id/search', { type, filters });
  }
}
