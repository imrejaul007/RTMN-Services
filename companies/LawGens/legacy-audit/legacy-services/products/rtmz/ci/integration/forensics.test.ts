/**
 * Forensics MCP Integration Tests
 * Tests all 8 forensics MCPs via the Forensics Gateway
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

const FORENSICS_GATEWAY_URL = process.env.FORENSICS_GATEWAY_URL || 'http://localhost:5100';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4002';

// Test utilities
async function getAuthToken(): Promise<string> {
  const response = await fetch(`${AUTH_SERVICE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@rez.ai',
      password: 'test-password'
    })
  });
  const data = await response.json();
  return data.accessToken;
}

async function healthCheck(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) });
    return response.ok;
  } catch {
    return false;
  }
}

describe('Forensics Gateway Health', () => {
  test('Gateway is healthy', async () => {
    const healthy = await healthCheck(FORENSICS_GATEWAY_URL);
    expect(healthy).toBe(true);
  });
});

describe('Forensics MCPs Health', () => {
  const mcpPorts = [
    { name: 'Evidence Ingestion', port: 3120 },
    { name: 'Deepfake Detector', port: 3121 },
    { name: 'Chain of Custody', port: 3122 },
    { name: 'Digital Forensics', port: 3123 },
    { name: 'Social Intelligence', port: 3130 },
    { name: 'Financial Forensics', port: 3131 },
    { name: 'Location Intelligence', port: 3132 },
    { name: 'Expert Reports', port: 3133 },
  ];

  test.each(mcpPorts)('$name (port $port) is healthy', async ({ port }) => {
    const healthy = await healthCheck(`http://localhost:${port}`);
    expect(healthy).toBe(true);
  });
});

describe('Investigation Workflow', () => {
  let investigationId: string;

  test('Create investigation', async () => {
    const response = await fetch(`${FORENSICS_GATEWAY_URL}/api/investigation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify({
        title: 'Test Investigation',
        query: 'test@example.com',
        type: 'evidence',
        priority: 'medium'
      })
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.investigationId).toBeDefined();
    investigationId = data.investigationId;
  });

  test('Get investigation by ID', async () => {
    const response = await fetch(`${FORENSICS_GATEWAY_URL}/api/investigation/${investigationId}`, {
      headers: {
        'Authorization': `Bearer ${await getAuthToken()}`
      }
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.id || data.investigationId).toBeDefined();
  });

  test('List investigations', async () => {
    const response = await fetch(`${FORENSICS_GATEWAY_URL}/api/investigations?page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${await getAuthToken()}`
      }
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data.items || data)).toBe(true);
  });
});

describe('Evidence Management', () => {
  test('Ingest evidence', async () => {
    const response = await fetch(`${FORENSICS_GATEWAY_URL}/api/evidence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify({
        type: 'document',
        filename: 'test-document.pdf',
        fileData: Buffer.from('test content').toString('base64'),
        source: 'manual-upload',
        metadata: { uploadedBy: 'integration-test' }
      })
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.id || data.evidenceId).toBeDefined();
  });

  test('Verify evidence hash', async () => {
    const testHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    const response = await fetch(`${FORENSICS_GATEWAY_URL}/api/evidence/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify({ hash: testHash })
    });

    expect([200, 404]).toContain(response.status); // 404 if not found is valid
  });
});

describe('Deepfake Detection', () => {
  test('Analyze image for deepfake', async () => {
    const response = await fetch(`${FORENSICS_GATEWAY_URL}/api/deepfake/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify({
        fileId: 'test-file-123',
        fileType: 'image',
        analysisType: 'image'
      })
    });

    // May return 200 with results or 400 if no valid file
    expect([200, 400]).toContain(response.status);
  });
});

describe('Chain of Custody', () => {
  test('Create custody chain', async () => {
    const response = await fetch(`${FORENSICS_GATEWAY_URL}/api/custody/chain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify({
        evidenceId: 'test-evidence-001'
      })
    });

    expect([201, 400]).toContain(response.status); // 400 if evidence not found
  });

  test('Transfer custody', async () => {
    const response = await fetch(`${FORENSICS_GATEWAY_URL}/api/custody/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify({
        evidenceId: 'test-evidence-001',
        fromCustodian: 'investigator-a',
        toCustodian: 'investigator-b',
        purpose: 'analysis'
      })
    });

    expect([201, 400]).toContain(response.status);
  });
});

describe('Financial Forensics', () => {
  test('Analyze financials', async () => {
    const response = await fetch(`${FORENSICS_GATEWAY_URL}/api/financial/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify({
        caseId: 'test-case-001',
        analysisType: 'fraud',
        transactionData: {
          transactions: []
        }
      })
    });

    expect([200, 400]).toContain(response.status);
  });
});

describe('Social Intelligence', () => {
  test('Lookup social profile', async () => {
    const response = await fetch(`${FORENSICS_GATEWAY_URL}/api/social/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify({
        identifier: 'testuser@example.com'
      })
    });

    expect([200, 400, 404]).toContain(response.status);
  });

  test('Analyze social connections', async () => {
    const response = await fetch(`${FORENSICS_GATEWAY_URL}/api/social/connections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify({
        identifier: 'testuser@example.com'
      })
    });

    expect([200, 400, 404]).toContain(response.status);
  });
});

describe('Location Intelligence', () => {
  test('Lookup IP location', async () => {
    const response = await fetch(`${FORENSICS_GATEWAY_URL}/api/location/lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify({
        type: 'ip',
        identifier: '8.8.8.8'
      })
    });

    expect([200, 400]).toContain(response.status);
  });
});

describe('Forensics Tools', () => {
  test('List available tools', async () => {
    const response = await fetch(`${FORENSICS_GATEWAY_URL}/api/tools`, {
      headers: {
        'Authorization': `Bearer ${await getAuthToken()}`
      }
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data.tools)).toBe(true);
    expect(data.tools.length).toBeGreaterThanOrEqual(8);
  });
});

describe('Report Generation', () => {
  test('Generate expert report', async () => {
    const response = await fetch(`${FORENSICS_GATEWAY_URL}/api/report/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify({
        investigationId: 'test-investigation-001',
        type: 'preliminary',
        format: 'pdf'
      })
    });

    // 404 if investigation not found is expected in test
    expect([200, 201, 404]).toContain(response.status);
  });
});
