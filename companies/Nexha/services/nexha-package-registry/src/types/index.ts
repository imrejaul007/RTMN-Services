/**
 * Nexha Package Registry — Type definitions
 *
 * A "package" is a deployable bundle of capabilities, agent templates,
 * and configurations that a Nexha can install to extend its workforce.
 *
 * Think: npm for autonomous businesses.
 */

/** Package types */
export type PackageKind = 'capability-bundle' | 'agent-template' | 'industry-pack' | 'workflow-template' | 'integration';

/** Installation scope */
export type PackageScope = 'public' | 'verified' | 'private';

/** Package lifecycle status */
export type PackageStatus = 'draft' | 'published' | 'deprecated' | 'removed';

/** Supported industries */
export type IndustryVertical =
  | 'restaurant' | 'hotel' | 'healthcare' | 'retail' | 'legal'
  | 'education' | 'agriculture' | 'automotive' | 'beauty' | 'fashion'
  | 'fitness' | 'gaming' | 'government' | 'home-services' | 'manufacturing'
  | 'non-profit' | 'professional' | 'sports' | 'travel' | 'entertainment'
  | 'construction' | 'financial' | 'real-estate' | 'transport';

/** A Nexha package manifest */
export interface Package {
  id: string;
  /** npm-style scoped name: @industry/restaurant-procurement */
  name: string;
  /** @nexha/restaurant-procurement */
  scopeName: string;
  /** Semantic version */
  version: string;
  /** Unique version tag for this install: major.minor.patch-githash */
  distTag?: string;
  /** Human-readable title */
  displayName: string;
  /** One-liner */
  tagline: string;
  /** Full description (markdown OK) */
  description: string;
  kind: PackageKind;
  /** Which Nexha published this */
  publisherNexhaId: string;
  /** CorpID of the publisher */
  publisherCorpId: string;
  /** Publisher display name */
  publisherName: string;
  /** Industries this applies to */
  industries: IndustryVertical[];
  /** Capability tags this package addresses */
  tags: string[];
  /** Dependencies on other packages (by scopeName) */
  dependencies: Record<string, string>;
  /** Supported Nexha OS versions */
  nexhaOsVersion: string;
  /** Port numbers this package exposes (for routing) */
  ports?: number[];
  /** Who can install */
  scope: PackageScope;
  /** Lifecycle status */
  status: PackageStatus;
  /** Download count */
  downloads: number;
  /** Star count */
  stars: number;
  /** Starred by Nexha IDs */
  starredBy: string[];
  /** npm-style tarball URL or IPFS CID */
  dist: {
    tarball: string;
    size: number;
    checksum: string;
  };
  /** Required environment variables */
  envVars?: Array<{ name: string; description: string; required: boolean; default?: string }>;
  /** README content */
  readme?: string;
  /** Changelog entries keyed by version */
  changelog?: Record<string, string>;
  /** Publish timestamp */
  publishedAt: string;
  updatedAt: string;
}

/** New package publish input */
export interface PublishInput {
  name: string;
  version: string;
  displayName: string;
  tagline: string;
  description: string;
  kind: PackageKind;
  industries: IndustryVertical[];
  tags: string[];
  dependencies?: Record<string, string>;
  nexhaOsVersion?: string;
  ports?: number[];
  scope?: PackageScope;
  dist: { tarball: string; size: number; checksum: string };
  envVars?: Array<{ name: string; description: string; required: boolean; default?: string }>;
  readme?: string;
  changelog?: Record<string, string>;
}

/** Package version listing */
export interface PackageVersion {
  version: string;
  publishedAt: string;
  changelog?: string;
  dist: Package['dist'];
}

/** Search / list response */
export interface PackageListResult {
  packages: Package[];
  total: number;
  page: number;
  perPage: number;
}

/** Health response */
export interface HealthResponse {
  status: 'healthy' | 'degraded';
  service: string;
  version: string;
  port: number;
  packages: number;
  publishers: number;
  timestamp: string;
}

/** Package resolution (what a Nexha installs) */
export interface Resolution {
  scopeName: string;
  version: string;        // resolved version
  resolvedFrom: string;   // what the user asked for (tag, range, or exact)
  dist: Package['dist'];
}
