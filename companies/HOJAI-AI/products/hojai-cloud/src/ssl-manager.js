/**
 * HOJAI Cloud v1.2 — SSL Certificate Manager
 *
 * Handles automatic SSL certificate provisioning using Let's Encrypt.
 * For now, we provide the infrastructure to manage SSL certificates.
 *
 * Note: Full Let's Encrypt integration requires:
 * - A valid domain pointed to this server
 * - Port 80 available for ACME challenge
 * - Node support for ACME protocol (using a library like 'greenlock' or 'le-challenge')
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { v4: uuidv4 } = require('uuid');

// Certificate storage directory
const CERT_DIR = process.env.HOJAI_CLOUD_CERT_DIR || path.join(__dirname, '..', '.certs');

/**
 * Certificate record structure
 */
class CertificateRecord {
  constructor(domain, certPath, keyPath, createdAt, expiresAt) {
    this.id = uuidv4();
    this.domain = domain;
    this.certPath = certPath;
    this.keyPath = keyPath;
    this.createdAt = createdAt || new Date().toISOString();
    this.expiresAt = expiresAt;
    this.status = 'active';
  }

  isExpiringSoon(days = 30) {
    if (!this.expiresAt) return false;
    const expiry = new Date(this.expiresAt);
    const now = new Date();
    const daysUntilExpiry = (expiry - now) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry <= days;
  }

  toJSON() {
    return {
      id: this.id,
      domain: this.domain,
      certPath: this.certPath,
      keyPath: this.keyPath,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
      status: this.status
    };
  }
}

// In-memory certificate registry
const certificates = new Map();

/**
 * Initialize certificate storage
 */
function init() {
  if (!fs.existsSync(CERT_DIR)) {
    fs.mkdirSync(CERT_DIR, { recursive: true });
  }

  // Load existing certificates
  const metaPath = path.join(CERT_DIR, 'certificates.json');
  if (fs.existsSync(metaPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      for (const cert of data) {
        certificates.set(cert.domain, new CertificateRecord(
          cert.domain, cert.certPath, cert.keyPath, cert.createdAt, cert.expiresAt
        ));
      }
      console.log(`[hojai-cloud] loaded ${certificates.size} certificate(s)`);
    } catch (err) {
      console.error(`[hojai-cloud] failed to load certificates: ${err.message}`);
    }
  }
}

/**
 * Save certificates to disk
 */
function saveCertificates() {
  const metaPath = path.join(CERT_DIR, 'certificates.json');
  const data = Array.from(certificates.values()).map(c => c.toJSON());
  fs.writeFileSync(metaPath, JSON.stringify(data, null, 2));
}

/**
 * Provision SSL certificate for a domain
 *
 * In production, this would integrate with Let's Encrypt.
 * For now, we simulate the API and provide the infrastructure.
 */
async function provisionCertificate(domain) {
  // Check if certificate already exists
  if (certificates.has(domain)) {
    return certificates.get(domain);
  }

  // For *.hojai.app domains, we can use a wildcard certificate
  if (domain.endsWith('.hojai.app')) {
    return await provisionWildcardCertificate(domain);
  }

  // For custom domains, we would need to verify ownership
  return await provisionCustomDomainCertificate(domain);
}

/**
 * Provision certificate for *.hojai.app wildcard domain
 * In production, this would request a wildcard cert from Let's Encrypt
 */
async function provisionWildcardCertificate(domain) {
  console.log(`[hojai-cloud] provisioning SSL for ${domain}`);

  // Generate self-signed certificate for development
  // In production, replace with Let's Encrypt integration
  const certPath = path.join(CERT_DIR, `${domain}.pem`);
  const keyPath = path.join(CERT_DIR, `${domain}.key`);

  // Create a placeholder for now
  // In production: use 'greenlock' or similar to get real certs
  const cert = new CertificateRecord(
    domain,
    certPath,
    keyPath,
    new Date().toISOString(),
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
  );

  certificates.set(domain, cert);
  saveCertificates();

  return cert;
}

/**
 * Provision certificate for custom domain (requires DNS verification)
 */
async function provisionCustomDomainCertificate(domain) {
  console.log(`[hojai-cloud] provisioning custom domain SSL for ${domain}`);

  const certPath = path.join(CERT_DIR, `${domain}.pem`);
  const keyPath = path.join(CERT_DIR, `${domain}.key`);

  const cert = new CertificateRecord(
    domain,
    certPath,
    keyPath,
    new Date().toISOString(),
    new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
  );

  certificates.set(domain, cert);
  saveCertificates();

  return cert;
}

/**
 * Get certificate for a domain
 */
function getCertificate(domain) {
  return certificates.get(domain) || null;
}

/**
 * List all certificates
 */
function listCertificates() {
  return Array.from(certificates.values()).map(c => c.toJSON());
}

/**
 * Check for expiring certificates
 */
function checkExpiringCertificates(days = 30) {
  const expiring = [];
  for (const cert of certificates.values()) {
    if (cert.isExpiringSoon(days)) {
      expiring.push(cert);
    }
  }
  return expiring;
}

/**
 * Renew a certificate
 */
async function renewCertificate(domain) {
  const existing = certificates.get(domain);
  if (!existing) {
    throw new Error(`Certificate not found for ${domain}`);
  }

  // Re-provision
  const renewed = await provisionCertificate(domain);
  certificates.set(domain, renewed);
  saveCertificates();

  return renewed;
}

/**
 * Revoke/delete a certificate
 */
function revokeCertificate(domain) {
  const cert = certificates.get(domain);
  if (!cert) return false;

  // Delete certificate files
  try {
    if (fs.existsSync(cert.certPath)) fs.unlinkSync(cert.certPath);
    if (fs.existsSync(cert.keyPath)) fs.unlinkSync(cert.keyPath);
  } catch (err) {
    console.error(`[hojai-cloud] failed to delete cert files: ${err.message}`);
  }

  certificates.delete(domain);
  saveCertificates();
  return true;
}

/**
 * Get SSL options for HTTPS server
 */
function getSSLOptions(domain) {
  const cert = certificates.get(domain);
  if (!cert) return null;

  if (!fs.existsSync(cert.certPath) || !fs.existsSync(cert.keyPath)) {
    return null;
  }

  return {
    cert: fs.readFileSync(cert.certPath),
    key: fs.readFileSync(cert.keyPath)
  };
}

module.exports = {
  init,
  provisionCertificate,
  getCertificate,
  listCertificates,
  checkExpiringCertificates,
  renewCertificate,
  revokeCertificate,
  getSSLOptions,
  CERT_DIR
};
