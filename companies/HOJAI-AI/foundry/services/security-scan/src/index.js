/**
 * HOJAI Studio - Security Scan Service
 * Vulnerability detection for generated apps
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 4748;
app.use(express.json());

const scans = new Map();
const vulnerabilities = [];

// Security checks
const SECURITY_CHECKS = [
  { id: 'sql-injection', category: 'Injection', severity: 'critical', description: 'SQL Injection vulnerability' },
  { id: 'xss', category: 'XSS', severity: 'high', description: 'Cross-Site Scripting vulnerability' },
  { id: 'csrf', category: 'CSRF', severity: 'high', description: 'CSRF vulnerability' },
  { id: 'auth-bypass', category: 'Authentication', severity: 'critical', description: 'Authentication bypass' },
  { id: 'idor', category: 'Authorization', severity: 'high', description: 'Insecure Direct Object Reference' },
  { id: 'sensitive-data', category: 'Data Exposure', severity: 'medium', description: 'Sensitive data exposure' },
  { id: 'weak-crypto', category: 'Cryptography', severity: 'medium', description: 'Weak cryptographic algorithm' },
  { id: 'open-redirect', category: 'Redirect', severity: 'medium', description: 'Open redirect vulnerability' },
  { id: 'xxe', category: 'Injection', severity: 'critical', description: 'XML External Entity vulnerability' },
  { id: 'path-traversal', category: 'File Inclusion', severity: 'high', description: 'Path traversal vulnerability' }
];

// REST API - Scan
app.post('/api/scan', (req, res) => {
  const { projectId, code, language = 'javascript' } = req.body;
  const scanId = uuidv4();

  const scan = {
    id: scanId,
    projectId,
    language,
    status: 'running',
    progress: 0,
    vulnerabilities: [],
    createdAt: new Date().toISOString(),
    completedAt: null,
    summary: null
  };

  scans.set(scanId, scan);
  runSecurityScan(scan, code);

  res.json({ scanId, status: 'started' });
});

app.get('/api/scans/:scanId', (req, res) => {
  const scan = scans.get(req.params.scanId);
  if (!scan) return res.status(404).json({ error: 'Scan not found' });
  res.json(scan);
});

app.get('/api/scans', (req, res) => {
  const { projectId, status } = req.query;
  let list = Array.from(scans.values());
  if (projectId) list = list.filter(s => s.projectId === projectId);
  if (status) list = list.filter(s => s.status === status);
  res.json(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.get('/api/vulnerabilities', (req, res) => {
  const { projectId, severity } = req.query;
  let list = vulnerabilities;
  if (projectId) list = list.filter(v => v.projectId === projectId);
  if (severity) list = list.filter(v => v.severity === severity);
  res.json(list);
});

app.get('/api/checks', (req, res) => res.json(SECURITY_CHECKS));

app.get('/api/summary/:projectId', (req, res) => {
  const projectVulns = vulnerabilities.filter(v => v.projectId === req.params.projectId);
  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  const byCategory = {};

  projectVulns.forEach(v => {
    bySeverity[v.severity]++;
    byCategory[v.category] = (byCategory[v.category] || 0) + 1;
  });

  const score = calculateSecurityScore(projectVulns.length);

  res.json({
    projectId: req.params.projectId,
    totalVulnerabilities: projectVulns.length,
    bySeverity,
    byCategory,
    score,
    grade: getGrade(score),
    lastScan: projectVulns[projectVulns.length - 1]?.createdAt
  });
});

async function runSecurityScan(scan, code) {
  scan.status = 'running';

  for (let i = 0; i < SECURITY_CHECKS.length; i++) {
    const check = SECURITY_CHECKS[i];
    await new Promise(r => setTimeout(r, 150));

    // Simulate detection (in production, actually analyze code)
    const detected = Math.random() > 0.75;

    if (detected) {
      const vuln = {
        id: uuidv4(),
        scanId: scan.id,
        projectId: scan.projectId,
        checkId: check.id,
        category: check.category,
        severity: check.severity,
        description: check.description,
        file: simulateFile(code),
        line: Math.round(Math.random() * 200),
        cwe: `CWE-${200 + Math.round(Math.random() * 100)}`,
        remediation: getRemediation(check.id),
        createdAt: new Date().toISOString()
      };

      scan.vulnerabilities.push(vuln);
      vulnerabilities.push(vuln);
    }

    scan.progress = Math.round(((i + 1) / SECURITY_CHECKS.length) * 100);
  }

  scan.status = 'completed';
  scan.completedAt = new Date().toISOString();
  scan.summary = {
    total: scan.vulnerabilities.length,
    critical: scan.vulnerabilities.filter(v => v.severity === 'critical').length,
    high: scan.vulnerabilities.filter(v => v.severity === 'high').length,
    medium: scan.vulnerabilities.filter(v => v.severity === 'medium').length,
    low: scan.vulnerabilities.filter(v => v.severity === 'low').length
  };
}

function simulateFile(code) {
  const files = ['src/api/users.js', 'src/auth/login.js', 'src/models/user.js', 'src/middleware/auth.js', 'src/utils/crypto.js'];
  return files[Math.floor(Math.random() * files.length)];
}

function getRemediation(checkId) {
  const remediations = {
    'sql-injection': 'Use parameterized queries or ORM. Never concatenate user input into SQL.',
    'xss': 'Sanitize and escape user input. Use Content Security Policy headers.',
    'csrf': 'Implement CSRF tokens and SameSite cookies.',
    'auth-bypass': 'Implement proper authentication and session management.',
    'idor': 'Implement proper authorization checks for all resources.',
    'sensitive-data': 'Encrypt sensitive data at rest and in transit. Remove debug logs.',
    'weak-crypto': 'Use strong algorithms (AES-256, RSA-2048+). Update deprecated functions.',
    'open-redirect': 'Validate and whitelist redirect URLs.',
    'xxe': 'Disable XML external entity processing.',
    'path-traversal': 'Validate and sanitize file paths. Use allowlists.'
  };
  return remediations[checkId] || 'Review and fix the security issue.';
}

function calculateSecurityScore(vulnCount) {
  if (vulnCount === 0) return 100;
  if (vulnCount <= 2) return 90;
  if (vulnCount <= 5) return 75;
  if (vulnCount <= 10) return 60;
  if (vulnCount <= 20) return 40;
  return Math.max(0, 30 - (vulnCount - 20));
}

function getGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'security-scan', scans: scans.size }));
app.listen(PORT, () => console.log(`Security Scan running on port ${PORT}`));
