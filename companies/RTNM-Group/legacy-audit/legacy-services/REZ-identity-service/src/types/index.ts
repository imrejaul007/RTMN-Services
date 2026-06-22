import { IdentityType, IdentityStatus } from '../models/identity.model';
import { ClusterConfidence } from '../models/cluster.model';

export { IdentityType, IdentityStatus } from '../models/identity.model';
export { ClusterStatus, ClusterConfidence } from '../models/cluster.model';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LinkRequest {
  sourceIdentityId: string;
  targetIdentityId: string;
  linkType: LinkType;
  confidence: ClusterConfidence;
  reason?: string;
  verified?: boolean;
  metadata?: Record<string, unknown>;
}

export enum LinkType {
  EXPLICIT = 'explicit',
  IMPLICIT = 'implicit',
  INFERRED = 'inferred',
  MERGE = 'merge'
}

export interface LinkResult {
  success: boolean;
  clusterId?: string;
  mergedClusterIds?: string[];
  confidence?: ClusterConfidence;
  error?: string;
}

export interface UnlinkRequest {
  identityId: string;
  reason?: string;
  cascade?: boolean;
}

export interface UnlinkResult {
  success: boolean;
  affectedClusters?: string[];
  error?: string;
}

export interface CreateIdentityOptions {
  type: IdentityType;
  identifier: string;
  metadata?: Record<string, unknown>;
  privacySettings?: Record<string, unknown>;
}

export interface UpdateIdentityOptions {
  metadata?: Record<string, unknown>;
  privacySettings?: Record<string, unknown>;
}

export interface IdentityWithCluster {
  identityId: string;
  clusterId: string;
  type: IdentityType;
  identifier: string;
  status: IdentityStatus;
  confidence: ClusterConfidence;
  identityCount: number;
  linkedIdentities: Array<{
    identityId: string;
    type: IdentityType;
    identifier: string;
  }>;
}
