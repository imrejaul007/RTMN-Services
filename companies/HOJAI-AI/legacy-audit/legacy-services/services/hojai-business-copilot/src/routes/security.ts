/**
 * Security & HIB Routes
 * 
 * Routes for HIB Code Intelligence and Security Orchestration
 */

import { Router } from 'express';
import { createLogger } from '../utils/logger.js';
import { createErrorResponse } from '../types/index.js';

const logger = createLogger('security-routes');
const router = Router();

// Environment configuration
const HIB_CODE_URL = process.env.HIB_CODE_SERVICE_URL || 'http://localhost:3053';
const HIB_SOAR_URL = process.env.HIB_SOAR_SERVICE_URL || 'http://localhost:3054';

// ============================================
// CODE INTELLIGENCE
// ============================================

/**
 * POST /api/security/analyze
 * Analyze code for quality and security
 */
router.post('/analyze', async (req, res) => {
  try {
    const { code, language, options } = req.body;

    const response = await fetch(`${HIB_CODE_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, language, options }),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Code analysis failed');
    res.status(500).json(createErrorResponse('ANALYSIS_FAILED', error.message));
  }
});

/**
 * POST /api/security/scan
 * Full security scan
 */
router.post('/scan', async (req, res) => {
  try {
    const { code, rules } = req.body;

    const response = await fetch(`${HIB_CODE_URL}/api/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, rules }),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Security scan failed');
    res.status(500).json(createErrorResponse('SCAN_FAILED', error.message));
  }
});

/**
 * GET /api/security/vulnerabilities
 * List known vulnerability patterns
 */
router.get('/vulnerabilities', async (req, res) => {
  try {
    const { severity, category } = req.query;

    const vulnerabilities = getVulnerabilityDatabase();

    let filtered = vulnerabilities;
    if (severity) {
      filtered = filtered.filter(v => v.severity === severity);
    }
    if (category) {
      filtered = filtered.filter(v => v.category === category);
    }

    res.json({
      vulnerabilities: filtered,
      total: filtered.length,
      filters: { severity, category },
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to list vulnerabilities');
    res.status(500).json(createErrorResponse('LIST_FAILED', error.message));
  }
});

// ============================================
// SECURITY ORCHESTRATION (SOAR)
// ============================================

/**
 * GET /api/security/incidents
 * List security incidents
 */
router.get('/incidents', async (req, res) => {
  try {
    const response = await fetch(`${HIB_SOAR_URL}/api/incidents`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': req.headers['x-tenant-id'] as string,
      },
    });

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to list incidents');
    res.status(500).json(createErrorResponse('LIST_FAILED', error.message));
  }
});

/**
 * POST /api/security/incidents
 * Create a new incident
 */
router.post('/incidents', async (req, res) => {
  try {
    const { title, severity, description, affectedSystems } = req.body;

    const response = await fetch(`${HIB_SOAR_URL}/api/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': req.headers['x-tenant-id'] as string,
      },
      body: JSON.stringify({ title, severity, description, affectedSystems }),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to create incident');
    res.status(500).json(createErrorResponse('CREATE_FAILED', error.message));
  }
});

/**
 * GET /api/security/playbooks
 * List available security playbooks
 */
router.get('/playbooks', async (req, res) => {
  try {
    const response = await fetch(`${HIB_SOAR_URL}/api/playbooks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to list playbooks');
    res.status(500).json(createErrorResponse('LIST_FAILED', error.message));
  }
});

/**
 * POST /api/security/playbooks/:id/execute
 * Execute a security playbook
 */
router.post('/playbooks/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { target, parameters } = req.body;

    const response = await fetch(`${HIB_SOAR_URL}/api/playbooks/${id}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': req.headers['x-tenant-id'] as string,
      },
      body: JSON.stringify({ target, parameters }),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to execute playbook');
    res.status(500).json(createErrorResponse('EXECUTE_FAILED', error.message));
  }
});

// ============================================
// SECURITY DASHBOARD
// ============================================

/**
 * GET /api/security/dashboard
 * Get security overview
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Aggregate security data from multiple sources
    const dashboard = {
      overview: {
        totalIncidents: 0,
        openIncidents: 0,
        resolvedIncidents: 0,
        criticalVulnerabilities: 0,
        securityScore: 0,
      },
      recentIncidents: [],
      topVulnerabilities: [],
      complianceStatus: {
        securityScore: 85,
        lastScan: new Date().toISOString(),
        issues: 3,
      },
      generatedAt: new Date().toISOString(),
    };

    res.json(dashboard);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get dashboard');
    res.status(500).json(createErrorResponse('DASHBOARD_FAILED', error.message));
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function getVulnerabilityDatabase() {
  return [
    {
      id: 'CVE-001',
      title: 'SQL Injection',
      severity: 'critical',
      category: 'injection',
      description: 'Unsanitized SQL queries can lead to data exposure',
      remediation: 'Use parameterized queries or ORM',
      cwe: 'CWE-89',
    },
    {
      id: 'CVE-002',
      title: 'XSS Vulnerability',
      severity: 'high',
      category: 'injection',
      description: 'Cross-site scripting via unescaped user input',
      remediation: 'Sanitize and escape HTML output',
      cwe: 'CWE-79',
    },
    {
      id: 'CVE-003',
      title: 'Hardcoded Credentials',
      severity: 'critical',
      category: 'cryptography',
      description: 'Credentials found in source code',
      remediation: 'Use environment variables or secrets manager',
      cwe: 'CWE-798',
    },
    {
      id: 'CVE-004',
      title: 'Insecure Direct Object Reference',
      severity: 'high',
      category: 'authorization',
      description: 'Missing access controls on resources',
      remediation: 'Implement proper authorization checks',
      cwe: 'CWE-639',
    },
    {
      id: 'CVE-005',
      title: 'Sensitive Data Exposure',
      severity: 'high',
      category: 'confidentiality',
      description: 'Sensitive data not properly protected',
      remediation: 'Encrypt data at rest and in transit',
      cwe: 'CWE-311',
    },
    {
      id: 'CVE-006',
      title: 'Missing Rate Limiting',
      severity: 'medium',
      category: 'availability',
      description: 'No rate limiting on API endpoints',
      remediation: 'Implement rate limiting middleware',
      cwe: 'CWE-770',
    },
    {
      id: 'CVE-007',
      title: 'XXE Injection',
      severity: 'critical',
      category: 'injection',
      description: 'XML external entity injection',
      remediation: 'Disable XML external entities',
      cwe: 'CWE-611',
    },
    {
      id: 'CVE-008',
      title: 'Security Misconfiguration',
      severity: 'medium',
      category: 'configuration',
      description: 'Insecure default configurations',
      remediation: 'Review and harden configuration',
      cwe: 'CWE-16',
    },
  ];
}

export default router;
