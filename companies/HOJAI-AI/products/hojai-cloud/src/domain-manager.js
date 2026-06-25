/**
 * HOJAI Cloud v1.2 — Custom Domain Manager
 *
 * Manages custom domains for deployments.
 * Each deployment can optionally have a custom domain pointing to it.
 */

const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// Domain storage
const DOMAIN_CONFIG_DIR = process.env.HOJAI_CLOUD_DOMAIN_DIR || path.join(__dirname, '..', '.domains');

/**
 * Domain record structure
 */
class DomainRecord {
  constructor({ domain, deploymentId, projectId, sslCertId, status, verifiedAt, createdAt }) {
    this.id = uuidv4();
    this.domain = domain;
    this.deploymentId = deploymentId;
    this.projectId = projectId;
    this.sslCertId = sslCertId || null;
    this.status = status || 'pending'; // pending, verified, active, failed
    this.verifiedAt = verifiedAt || null;
    this.createdAt = createdAt || new Date().toISOString();
    this.dnsRecords = this.generateDNSRecords();
  }

  generateDNSRecords() {
    // Generate the DNS records the user needs to add
    const publicHost = process.env.HOJAI_PUBLIC_HOST || 'hojai.app';
    return {
      type: 'A',
      name: this.domain,
      value: process.env.HOJAI_CLOUD_IP || '127.0.0.1',
      ttl: 3600,
      verification: {
        method: 'DNS',
        record: `_acme-challenge.${this.domain}`,
        type: 'TXT',
        value: `hojai-verify-${this.id.substring(0, 8)}`
      }
    };
  }

  toJSON() {
    return {
      id: this.id,
      domain: this.domain,
      deploymentId: this.deploymentId,
      projectId: this.projectId,
      sslCertId: this.sslCertId,
      status: this.status,
      verifiedAt: this.verifiedAt,
      createdAt: this.createdAt,
      dnsRecords: this.dnsRecords
    };
  }
}

// In-memory domain registry
const domains = new Map(); // domain -> DomainRecord

/**
 * Initialize domain storage
 */
function init() {
  if (!fs.existsSync(DOMAIN_CONFIG_DIR)) {
    fs.mkdirSync(DOMAIN_CONFIG_DIR, { recursive: true });
  }

  // Load existing domains
  const metaPath = path.join(DOMAIN_CONFIG_DIR, 'domains.json');
  if (fs.existsSync(metaPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      for (const d of data) {
        domains.set(d.domain, new DomainRecord(d));
      }
      console.log(`[hojai-cloud] loaded ${domains.size} custom domain(s)`);
    } catch (err) {
      console.error(`[hojai-cloud] failed to load domains: ${err.message}`);
    }
  }
}

/**
 * Save domains to disk
 */
function saveDomains() {
  const metaPath = path.join(DOMAIN_CONFIG_DIR, 'domains.json');
  const data = Array.from(domains.values()).map(d => d.toJSON());
  fs.writeFileSync(metaPath, JSON.stringify(data, null, 2));
}

/**
 * Add a custom domain for a deployment
 */
function addDomain(domain, deploymentId, projectId) {
  // Validate domain format
  if (!isValidDomain(domain)) {
    throw new Error(`Invalid domain format: ${domain}`);
  }

  // Check if domain already exists
  if (domains.has(domain)) {
    throw new Error(`Domain already registered: ${domain}`);
  }

  const record = new DomainRecord({
    domain,
    deploymentId,
    projectId,
    status: 'pending'
  });

  domains.set(domain, record);
  saveDomains();

  console.log(`[hojai-cloud] custom domain added: ${domain} -> deployment ${deploymentId}`);

  return record;
}

/**
 * Verify domain ownership via DNS
 */
function verifyDomain(domain) {
  const record = domains.get(domain);
  if (!record) {
    throw new Error(`Domain not found: ${domain}`);
  }

  if (record.status === 'verified' || record.status === 'active') {
    return record; // Already verified
  }

  // In production, we would check the DNS records here
  // For now, we simulate verification
  record.status = 'verified';
  record.verifiedAt = new Date().toISOString();

  saveDomains();

  console.log(`[hojai-cloud] domain verified: ${domain}`);

  return record;
}

/**
 * Activate domain (provision SSL and enable routing)
 */
function activateDomain(domain, sslCertId) {
  const record = domains.get(domain);
  if (!record) {
    throw new Error(`Domain not found: ${domain}`);
  }

  if (record.status !== 'verified') {
    throw new Error(`Domain must be verified before activation: ${domain}`);
  }

  record.status = 'active';
  record.sslCertId = sslCertId;

  saveDomains();

  console.log(`[hojai-cloud] domain activated: ${domain}`);

  return record;
}

/**
 * Get domain by name
 */
function getDomain(domain) {
  const record = domains.get(domain);
  return record ? record.toJSON() : null;
}

/**
 * Get all domains for a deployment
 */
function getDomainsByDeployment(deploymentId) {
  const result = [];
  for (const record of domains.values()) {
    if (record.deploymentId === deploymentId) {
      result.push(record.toJSON());
    }
  }
  return result;
}

/**
 * Get deployment ID for a domain
 */
function getDeploymentForDomain(domain) {
  const record = domains.get(domain);
  return record ? record.deploymentId : null;
}

/**
 * List all domains
 */
function listDomains() {
  return Array.from(domains.values()).map(d => d.toJSON());
}

/**
 * Remove a custom domain
 */
function removeDomain(domain) {
  const deleted = domains.delete(domain);
  if (deleted) {
    saveDomains();
    console.log(`[hojai-cloud] domain removed: ${domain}`);
  }
  return deleted;
}

/**
 * Validate domain format
 */
function isValidDomain(domain) {
  if (!domain || typeof domain !== 'string') return false;

  // Basic domain validation
  const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9][a-zA-Z0-9-_]+\.[a-zA-Z]{2,11}?$/;
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;

  // Block hojai.app subdomains (they use our built-in routing)
  if (domain.endsWith('.hojai.app') || domain.endsWith('.hojai.ai')) {
    return false;
  }

  return domainRegex.test(domain) || ipRegex.test(domain);
}

module.exports = {
  init,
  addDomain,
  verifyDomain,
  activateDomain,
  getDomain,
  getDomainsByDeployment,
  getDeploymentForDomain,
  listDomains,
  removeDomain,
  isValidDomain
};
