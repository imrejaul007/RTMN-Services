/**
 * Nexha Package Registry — Package service
 *
 * In-memory package registry. Supports npm-style semver resolution.
 */

import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import type {
  Package,
  PackageKind,
  PackageScope,
  IndustryVertical,
  PackageListResult,
  PublishInput,
  PackageVersion,
  Resolution
} from '../types/index.js';

/** Semver comparison result */
type SemverOrder = -1 | 0 | 1;

function compareSemver(a: string, b: string): SemverOrder {
  const [am = '0', amn = '0', ap = '0'] = a.split('.');
  const [bm = '0', bmn = '0', bp = '0'] = b.split('.');
  for (const [x, y] of [[am, bm], [amn, bmn], [ap, bp]] as const) {
    const xi = parseInt(x, 10);
    const yi = parseInt(y, 10);
    if (xi < yi) return -1;
    if (xi > yi) return 1;
  }
  return 0;
}

function satisfiesRange(version: string, range: string): boolean {
  // Handle exact versions
  if (!range.startsWith('^') && !range.startsWith('~') && !range.startsWith('>=') && !range.startsWith('>')) {
    if (range.startsWith('=')) {
      return version === range.trim();
    }
    return version === range;
  }
  // ^major.minor.patch — compatible with major
  if (range.startsWith('^')) {
    const base = range.slice(1);
    const [bm = '0', bmn = '0', bp = '0'] = base.split('.');
    const [vm, vmn, vpp] = version.split('.');
    if (vm !== bm) return false;
    if (parseInt(vmn) < parseInt(bmn)) return false;
    if (parseInt(vmn) > parseInt(bmn)) return true;
    return parseInt(vpp || '0') >= parseInt(bp);
  }
  // ~major.minor.patch — compatible with minor
  if (range.startsWith('~')) {
    const base = range.slice(1);
    const [bm = '0', bmn = '0'] = base.split('.');
    const [vm, vmn] = version.split('.');
    if (vm !== bm) return false;
    return parseInt(vmn) >= parseInt(bmn);
  }
  return version === range;
}

class PackageRegistryService {
  /** Primary: packageId -> Package */
  private packages = new Map<string, Package>();

  /** Secondary: scopeName -> version -> Package[] (for multi-version) */
  private versions = new Map<string, Map<string, Package>>();

  /** Secondary: publisherNexhaId -> Package[] */
  private publishers = new Map<string, Set<string>>();

  constructor() {
    this._doSeed();
  }

  /** Publish a new package (or a new version of an existing package). */
  publish(
    publisherNexhaId: string,
    publisherCorpId: string,
    publisherName: string,
    input: PublishInput
  ): Package {
    const now = new Date().toISOString();
    const scopeName = input.name.startsWith('@') ? input.name : `@nexha/${input.name}`;
    const id = `pkg-${uuidv4()}`;

    const pkg: Package = {
      id,
      name: input.name,
      scopeName,
      version: input.version,
      distTag: input.version,
      displayName: input.displayName,
      tagline: input.tagline,
      description: input.description,
      kind: input.kind,
      publisherNexhaId,
      publisherCorpId,
      publisherName,
      industries: input.industries,
      tags: input.tags,
      dependencies: input.dependencies ?? {},
      nexhaOsVersion: input.nexhaOsVersion ?? '>=1.0.0',
      ports: input.ports,
      scope: input.scope ?? 'public',
      status: 'published',
      downloads: 0,
      stars: 0,
      starredBy: [],
      dist: input.dist,
      envVars: input.envVars,
      readme: input.readme,
      changelog: input.changelog,
      publishedAt: now,
      updatedAt: now
    };

    this.packages.set(id, pkg);

    // Track version
    if (!this.versions.has(scopeName)) {
      this.versions.set(scopeName, new Map());
    }
    this.versions.get(scopeName)!.set(pkg.version, pkg);

    // Track publisher
    if (!this.publishers.has(publisherNexhaId)) {
      this.publishers.set(publisherNexhaId, new Set());
    }
    this.publishers.get(publisherNexhaId)!.add(id);

    return pkg;
  }

  /** Get a package by ID. */
  get(id: string): Package | null {
    return this.packages.get(id) ?? null;
  }

  /** Get a package by scopeName + version. */
  getByScope(scopeName: string, version?: string): Package | null {
    const versionMap = this.versions.get(scopeName);
    if (!versionMap) return null;
    if (version) return versionMap.get(version) ?? null;
    // Return latest (greatest semver)
    const versions = Array.from(versionMap.keys()).sort(compareSemver).reverse();
    return versionMap.get(versions[0]) ?? null;
  }

  /** List versions of a package. */
  listVersions(scopeName: string): PackageVersion[] {
    const versionMap = this.versions.get(scopeName);
    if (!versionMap) return [];
    return Array.from(versionMap.values())
      .sort((a, b) => compareSemver(b.version, a.version))
      .map((p) => ({
        version: p.version,
        publishedAt: p.publishedAt,
        changelog: p.changelog?.[p.version],
        dist: p.dist
      }));
  }

  /** Update a package (metadata only — version bumps go through publish). */
  update(id: string, patch: Partial<Omit<Package, 'id' | 'scopeName' | 'publisherNexhaId' | 'publisherCorpId' | 'publishedAt'>>): Package | null {
    const existing = this.packages.get(id);
    if (!existing) return null;
    const updated: Package = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.packages.set(id, updated);
    // Sync to version map
    const vm = this.versions.get(existing.scopeName);
    if (vm) vm.set(existing.version, updated);
    return updated;
  }

  /** Deprecate a package. */
  deprecate(id: string, reason: string): Package | null {
    return this.update(id, { status: 'deprecated' });
  }

  /** Delete a package (soft delete — marks removed). */
  remove(id: string): boolean {
    const pkg = this.packages.get(id);
    if (!pkg) return false;
    // Don't actually remove — mark removed
    pkg.status = 'removed';
    return true;
  }

  /** List packages with filtering and pagination. */
  list(opts: {
    query?: string;
    kind?: PackageKind;
    industry?: IndustryVertical;
    publisherNexhaId?: string;
    scope?: PackageScope;
    tags?: string[];
    sort?: 'downloads' | 'stars' | 'recent' | 'name';
    page?: number;
    perPage?: number;
  }): PackageListResult {
    const { query, kind, industry, publisherNexhaId, scope, tags, sort = 'recent', page = 1, perPage = 20 } = opts;

    let candidates = Array.from(this.packages.values()).filter((p) => {
      if (p.status === 'removed' || p.status === 'draft') return false;
      if (kind && p.kind !== kind) return false;
      if (industry && !p.industries.includes(industry)) return false;
      if (publisherNexhaId && p.publisherNexhaId !== publisherNexhaId) return false;
      if (scope && p.scope !== scope) return false;
      if (tags && tags.length > 0) {
        if (!tags.every((t) => p.tags.includes(t))) return false;
      }
      if (query) {
        const q = query.toLowerCase();
        if (!p.name.toLowerCase().includes(q) &&
            !p.displayName.toLowerCase().includes(q) &&
            !p.description.toLowerCase().includes(q) &&
            !p.tags.some((t) => t.toLowerCase().includes(q))) {
          return false;
        }
      }
      return true;
    });

    // Sort
    if (sort === 'downloads') candidates.sort((a, b) => b.downloads - a.downloads);
    else if (sort === 'stars') candidates.sort((a, b) => b.stars - a.stars);
    else if (sort === 'recent') candidates.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    else candidates.sort((a, b) => a.displayName.localeCompare(b.displayName));

    const total = candidates.length;
    const start = (page - 1) * perPage;
    return {
      packages: candidates.slice(start, start + perPage),
      total,
      page,
      perPage
    };
  }

  /** Search packages (free-text + tag + industry). */
  search(q: string, opts?: { kind?: PackageKind; industry?: IndustryVertical; limit?: number }): Package[] {
    const result = this.list({
      query: q,
      kind: opts?.kind,
      industry: opts?.industry,
      sort: 'downloads',
      perPage: opts?.limit ?? 10
    });
    return result.packages;
  }

  /** Resolve a package + version (npm-style semver). */
  resolve(scopeName: string, requestedVersion: string): Resolution | null {
    const versionMap = this.versions.get(scopeName);
    if (!versionMap || versionMap.size === 0) return null;

    // 'latest' tag → highest version
    if (requestedVersion === 'latest') {
      const versions = Array.from(versionMap.keys()).sort(compareSemver).reverse();
      const latest = versionMap.get(versions[0]);
      if (!latest) return null;
      return { scopeName, version: latest.version, resolvedFrom: 'latest', dist: latest.dist };
    }

    // Exact version
    if (!requestedVersion.includes('^') && !requestedVersion.includes('~')) {
      const exact = versionMap.get(requestedVersion);
      if (!exact) return null;
      return { scopeName, version: requestedVersion, resolvedFrom: requestedVersion, dist: exact.dist };
    }

    // Semver range
    const allVersions = Array.from(versionMap.keys()).sort(compareSemver).reverse();
    for (const v of allVersions) {
      if (satisfiesRange(v, requestedVersion)) {
        const pkg = versionMap.get(v)!;
        return { scopeName, version: v, resolvedFrom: requestedVersion, dist: pkg.dist };
      }
    }

    return null;
  }

  /** Record a download (called when a Nexha installs a package). */
  recordDownload(id: string): void {
    const pkg = this.packages.get(id);
    if (pkg) pkg.downloads++;
  }

  /** Toggle star. Returns new star count. */
  toggleStar(id: string, nexhaId: string): number {
    const pkg = this.packages.get(id);
    if (!pkg) return 0;
    if (pkg.starredBy.includes(nexhaId)) {
      pkg.starredBy = pkg.starredBy.filter((n) => n !== nexhaId);
      pkg.stars--;
    } else {
      pkg.starredBy.push(nexhaId);
      pkg.stars++;
    }
    return pkg.stars;
  }

  /** Get registry stats. */
  stats(): { totalPackages: number; totalPublishers: number; byKind: Record<PackageKind, number>; byIndustry: Record<IndustryVertical, number> } {
    const pkgs = Array.from(this.packages.values()).filter((p) => p.status !== 'removed');
    const byKind: Record<PackageKind, number> = {
      'capability-bundle': 0, 'agent-template': 0, 'industry-pack': 0,
      'workflow-template': 0, 'integration': 0
    };
    const byIndustry: Record<IndustryVertical, number> = {} as any;
    const publisherSet = new Set<string>();

    for (const p of pkgs) {
      byKind[p.kind]++;
      publisherSet.add(p.publisherNexhaId);
      for (const ind of p.industries) {
        byIndustry[ind] = (byIndustry[ind] ?? 0) + 1;
      }
    }

    return {
      totalPackages: pkgs.length,
      totalPublishers: publisherSet.size,
      byKind,
      byIndustry
    };
  }

  /** Total packages. */
  total(): number {
    return Array.from(this.packages.values()).filter((p) => p.status !== 'removed').length;
  }

  /** Clear (testing only). */
  clear(): void {
    this.packages.clear();
    this.versions.clear();
    this.publishers.clear();
  }

  /** Seed demo packages for the registry. Returns count of seeded packages. */
  seedDemoPackages(): number {
    if (this.packages.size === 0) {
      this._doSeed();
      return 5;
    }
    return 0;
  }

  private _doSeed(): void {

    const publishers = [
      { nexhaId: 'nexha-hospo-collective', corpId: 'corp-hospo', name: 'Hospo Collective' },
      { nexhaId: 'nexha-logistics-mumbai', corpId: 'corp-logistics', name: 'Mumbai Logistics Network' },
      { nexhaId: 'nexha-legal-london', corpId: 'corp-legal', name: 'London Legal Tech' },
      { nexhaId: 'nexha-retail-india', corpId: 'corp-retail', name: 'India Retail Alliance' }
    ];

    const seeds: PublishInput[] = [
      {
        name: '@hospo/restaurant-procurement-pack',
        version: '1.2.0',
        displayName: 'Restaurant Procurement Pack',
        tagline: 'AI-powered food & beverage sourcing for restaurants',
        description: 'Complete procurement agent workforce for restaurant chains. Includes supplier discovery, RFQ automation, contract negotiation, and delivery tracking for F&B categories.',
        kind: 'industry-pack',
        industries: ['restaurant'],
        tags: ['procurement', 'restaurant', 'fnb', 'supplier', 'rfq', 'negotiation'],
        dependencies: {},
        nexhaOsVersion: '>=1.0.0',
        scope: 'public',
        dist: { tarball: 'https://packages.nexha.io/hospo/restaurant-procurement-1.2.0.tgz', size: 2450000, checksum: 'sha256:a1b2c3' },
        envVars: [
          { name: 'DEFAULT_CURRENCY', description: 'Default currency for RFQs', required: false, default: 'USD' },
          { name: 'AUTO_NEGOTIATE', description: 'Enable auto-negotiation within policy limits', required: false, default: 'true' }
        ],
        readme: '# Restaurant Procurement Pack\n\nInstall to get AI procurement agents for your restaurant.\n\n## Included\n- Supplier Discovery Agent\n- RFQ Automation Agent\n- Contract Negotiation Agent\n- Delivery Tracking Agent'
      },
      {
        name: '@logistics/same-day-delivery-agent',
        version: '2.0.0',
        displayName: 'Same-Day Delivery Agent',
        tagline: 'Autonomous last-mile delivery coordination agent',
        description: 'AI agent that manages same-day delivery operations: driver assignment, route optimization, live tracking, proof-of-delivery, and exception handling.',
        kind: 'agent-template',
        industries: ['retail', 'restaurant', 'entertainment'],
        tags: ['delivery', 'logistics', 'last-mile', 'tracking', 'routing'],
        dependencies: {},
        nexhaOsVersion: '>=1.0.0',
        ports: [4399],
        scope: 'public',
        dist: { tarball: 'https://packages.nexha.io/logistics/same-day-delivery-2.0.0.tgz', size: 1820000, checksum: 'sha256:d4e5f6' },
        readme: '# Same-Day Delivery Agent\n\nAutonomous delivery coordination.'
      },
      {
        name: '@legal/contract-review-workflow',
        version: '1.0.0',
        displayName: 'AI Contract Review Workflow',
        tagline: 'Multi-agent contract review pipeline',
        description: 'Deploy a 3-agent workflow: Clause Analyzer → Risk Detector → Redline Generator. Handles NDAs, MSAs, SLAs, and employment contracts.',
        kind: 'workflow-template',
        industries: ['legal', 'professional'],
        tags: ['contract', 'legal', 'review', 'nda', 'msa', 'workflow'],
        dependencies: {},
        nexhaOsVersion: '>=1.0.0',
        scope: 'public',
        dist: { tarball: 'https://packages.nexha.io/legal/contract-review-1.0.0.tgz', size: 890000, checksum: 'sha256:789abc' },
        readme: '# AI Contract Review Workflow\n\n3-agent pipeline for contract review.'
      },
      {
        name: '@retail/loyalty-engine',
        version: '1.1.0',
        displayName: 'Retail Loyalty Engine',
        tagline: 'AI-powered customer loyalty and rewards system',
        description: 'Deploy AI-driven loyalty programs with points, tiers, referral bonuses, and personalized offers. Includes customer segmentation and churn prediction.',
        kind: 'capability-bundle',
        industries: ['retail'],
        tags: ['loyalty', 'rewards', 'retail', 'customer', 'tiers', 'referral'],
        dependencies: {},
        nexhaOsVersion: '>=1.0.0',
        scope: 'public',
        dist: { tarball: 'https://packages.nexha.io/retail/loyalty-engine-1.1.0.tgz', size: 3100000, checksum: 'sha256:012def' },
        readme: '# Retail Loyalty Engine\n\nAI-powered loyalty and rewards.'
      },
      {
        name: '@hospo/hotel-checkin-automation',
        version: '1.0.0',
        displayName: 'Hotel Check-in Automation',
        tagline: 'Autonomous pre-arrival and check-in workflow for hotels',
        description: 'AI agent handles guest pre-registration, room assignment optimization, welcome messaging, early check-in requests, and VIP handling.',
        kind: 'workflow-template',
        industries: ['hotel'],
        tags: ['hotel', 'checkin', 'automation', 'guest', 'hospitality', 'vip'],
        dependencies: {},
        nexhaOsVersion: '>=1.0.0',
        scope: 'public',
        dist: { tarball: 'https://packages.nexha.io/hospo/hotel-checkin-1.0.0.tgz', size: 1200000, checksum: 'sha256:345ghi' },
        readme: '# Hotel Check-in Automation\n\nAutonomous guest check-in workflow.'
      }
    ];

    for (let i = 0; i < seeds.length; i++) {
      const pub = publishers[i % publishers.length];
      const seed = seeds[i];
      this.publish(pub.nexhaId, pub.corpId, pub.name, seed);
    }

    // Add some downloads/stars for realism
    const allPkgs = Array.from(this.packages.values());
    allPkgs[0].downloads = 2847; allPkgs[0].stars = 42;
    allPkgs[1].downloads = 1923; allPkgs[1].stars = 31;
    allPkgs[2].downloads = 856; allPkgs[2].stars = 18;
    allPkgs[3].downloads = 1421; allPkgs[3].stars = 27;
    allPkgs[4].downloads = 634; allPkgs[4].stars = 11;
  }
}

const packageRegistryService = new PackageRegistryService();
export default packageRegistryService;
