/**
 * REZ Forensics Gateway
 * Unified interface for all forensics MCP servers
 * Port: 5100
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '5100', 10);

// MCP Server URLs
const MCP_SERVICES = {
  evidence: process.env.MCP_EVIDENCE_URL || 'http://localhost:3120',
  deepfake: process.env.MCP_DEEPFAKE_URL || 'http://localhost:3121',
  custody: process.env.MCP_CUSTODY_URL || 'http://localhost:3122',
  forensics: process.env.MCP_FORENSICS_URL || 'http://localhost:3123',
  social: process.env.MCP_SOCIAL_URL || 'http://localhost:3130',
  financial: process.env.MCP_FINANCIAL_URL || 'http://localhost:3131',
  location: process.env.MCP_LOCATION_URL || 'http://localhost:3132',
  reports: process.env.MCP_REPORTS_URL || 'http://localhost:3133',
};

// Auth service
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4002';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'mcp-internal-token';

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Auth middleware
async function authMiddleware(req: Request, res: Response, next: Function) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  try {
    const response = await axios.get(`${AUTH_SERVICE_URL}/api/v1/auth/validate`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    (req as any).user = response.data;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Health endpoint
app.get('/health', async (req, res) => {
  const services: any = {};
  const results = await Promise.allSettled(
    Object.entries(MCP_SERVICES).map(async ([name, url]) => {
      const response = await axios.get(`${url}/health`, { timeout: 2000 });
      services[name] = { status: 'healthy', url };
    })
  );

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const names = Object.keys(MCP_SERVICES);
      services[names[index]] = { status: 'unreachable' };
    }
  });

  res.json({
    status: 'healthy',
    gateway: 'forensics-gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services
  });
});

// Forward to MCP services
app.post('/api/mcp/:service', async (req: Request, res: Response) => {
  const { service } = req.params;
  const serviceUrl = MCP_SERVICES[service as keyof typeof MCP_SERVICES];

  if (!serviceUrl) {
    return res.status(404).json({ error: `Service ${service} not found` });
  }

  try {
    const response = await axios.post(serviceUrl + req.path.replace(`/api/mcp/${service}`, ''), req.body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': INTERNAL_SERVICE_TOKEN
      },
      timeout: 30000
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.get('/api/mcp/:service/*', async (req: Request, res: Response) => {
  const { service } = req.params;
  const serviceUrl = MCP_SERVICES[service as keyof typeof MCP_SERVICES];

  if (!serviceUrl) {
    return res.status(404).json({ error: `Service ${service} not found` });
  }

  try {
    const path = req.params[0] ? '/' + req.params[0] : '';
    const response = await axios.get(serviceUrl + path, {
      headers: { 'X-Internal-Token': INTERNAL_SERVICE_TOKEN },
      timeout: 10000
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Investigation workflow - orchestrate multiple MCPs
app.post('/api/investigation', async (req: Request, res: Response) => {
  const { evidenceType, data, options } = req.body;

  try {
    const investigationId = uuidv4();
    const results: any = {};

    // Step 1: Evidence ingestion
    if (evidenceType === 'whatsapp' || evidenceType === 'email') {
      const evidenceResponse = await axios.post(`${MCP_SERVICES.evidence}/evidence/${evidenceType}`, data, {
        headers: { 'X-Internal-Token': INTERNAL_SERVICE_TOKEN }
      });
      results.evidence = evidenceResponse.data;
    }

    // Step 2: Deepfake detection (if applicable)
    if (options?.deepfakeCheck && data.file) {
      const deepfakeResponse = await axios.post(`${MCP_SERVICES.deepfake}/analyze`, data.file, {
        headers: { 'X-Internal-Token': INTERNAL_SERVICE_TOKEN }
      });
      results.deepfake = deepfakeResponse.data;
    }

    // Step 3: Chain of custody
    if (options?.createChain) {
      const custodyResponse = await axios.post(`${MCP_SERVICES.custody}/chain`, {
        evidenceId: results.evidence?.id || investigationId,
        description: `Investigation ${investigationId}`,
        custodian: { name: options.custodianName || 'System', role: 'Investigator', organization: 'RTMZ' }
      }, {
        headers: { 'X-Internal-Token': INTERNAL_SERVICE_TOKEN }
      });
      results.custody = custodyResponse.data;
    }

    // Step 4: Financial analysis (if applicable)
    if (options?.financialAnalysis && data.transactions) {
      const financialResponse = await axios.post(`${MCP_SERVICES.financial}/detect/anomalies`, {
        transactions: data.transactions
      }, {
        headers: { 'X-Internal-Token': INTERNAL_SERVICE_TOKEN }
      });
      results.financial = financialResponse.data;
    }

    // Step 5: Social intelligence (if applicable)
    if (options?.socialAnalysis && data.contacts) {
      const socialResponse = await axios.post(`${MCP_SERVICES.social}/network`, {
        subjectId: options.subjectId,
        contacts: data.contacts
      }, {
        headers: { 'X-Internal-Token': INTERNAL_SERVICE_TOKEN }
      });
      results.social = socialResponse.data;
    }

    // Step 6: Location intelligence (if applicable)
    if (options?.locationAnalysis && data.gpsPoints) {
      const locationResponse = await axios.post(`${MCP_SERVICES.location}/analyze/gps`, {
        subjectId: options.subjectId,
        points: data.gpsPoints
      }, {
        headers: { 'X-Internal-Token': INTERNAL_SERVICE_TOKEN }
      });
      results.location = locationResponse.data;
    }

    res.json({
      success: true,
      investigationId,
      results
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generate comprehensive report
app.post('/api/report/generate', async (req: Request, res: Response) => {
  const { caseId, investigationId, findings, exhibits, timeline } = req.body;

  try {
    // Create report
    const reportResponse = await axios.post(`${MCP_SERVICES.reports}/findings`, {
      caseId,
      findings
    }, {
      headers: { 'X-Internal-Token': INTERNAL_SERVICE_TOKEN }
    });

    const reportId = reportResponse.data.reportId;

    // Add exhibits
    if (exhibits?.length) {
      for (const exhibit of exhibits) {
        await axios.post(`${MCP_SERVICES.reports}/report/${reportId}/exhibit`, exhibit, {
          headers: { 'X-Internal-Token': INTERNAL_SERVICE_TOKEN }
        });
      }
    }

    // Add timeline
    if (timeline?.length) {
      await axios.post(`${MCP_SERVICES.reports}/report/${reportId}/timeline`, { events: timeline }, {
        headers: { 'X-Internal-Token': INTERNAL_SERVICE_TOKEN }
      });
    }

    // Add expert declaration
    await axios.post(`${MCP_SERVICES.reports}/report/${reportId}/declaration`, {
      declaration: 'I declare that the information provided in this report is true and accurate to the best of my knowledge and belief.',
      expertName: 'RTMZ AI System',
      expertCredentials: 'Automated Forensic Analysis System'
    }, {
      headers: { 'X-Internal-Token': INTERNAL_SERVICE_TOKEN }
    });

    // Get full report
    const fullReport = await axios.get(`${MCP_SERVICES.reports}/report/${reportId}`, {
      headers: { 'X-Internal-Token': INTERNAL_SERVICE_TOKEN }
    });

    res.json({ success: true, report: fullReport.data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all forensics MCP status
app.get('/api/status', async (req, res) => {
  const status = await Promise.all(
    Object.entries(MCP_SERVICES).map(async ([name, url]) => {
      try {
        const response = await axios.get(`${url}/health`, { timeout: 2000 });
        return { name, status: 'healthy', url, data: response.data };
      } catch (error) {
        return { name, status: 'unreachable', url };
      }
    })
  );

  res.json({ timestamp: new Date().toISOString(), services: status });
});

// Prometheus metrics endpoint
app.get('/metrics', (req, res) => {
  const uptimeSeconds = process.uptime();
  const memUsage = process.memoryUsage();

  const metrics = `
# HELP forensics_gateway_uptime_seconds Gateway uptime in seconds
# TYPE forensics_gateway_uptime_seconds gauge
forensics_gateway_uptime_seconds ${uptimeSeconds}

# HELP forensics_gateway_memory_heap_used_bytes Heap memory used
# TYPE forensics_gateway_memory_heap_used_bytes gauge
forensics_gateway_memory_heap_used_bytes ${memUsage.heapUsed}

# HELP forensics_gateway_memory_heap_total_bytes Total heap memory
# TYPE forensics_gateway_memory_heap_total_bytes gauge
forensics_gateway_memory_heap_total_bytes ${memUsage.heapTotal}

# HELP forensics_gateway_info Gateway info
# TYPE forensics_gateway_info gauge
forensics_gateway_info{version="1.0.0"} 1

# HELP forensics_gateway_mcp_connected Number of connected MCP services
# TYPE forensics_gateway_mcp_connected gauge
forensics_gateway_mcp_connected 8
`.trim();

  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});

// API tools listing
app.get('/api/tools', (req, res) => {
  res.json({
    tools: [
      { name: 'evidence', description: 'Evidence Ingestion', endpoint: MCP_SERVICES.evidence, capabilities: ['whatsapp', 'email', 'cctv'], mcpPort: 3120 },
      { name: 'deepfake', description: 'Deepfake Detection', endpoint: MCP_SERVICES.deepfake, capabilities: ['image', 'video', 'audio'], mcpPort: 3121 },
      { name: 'custody', description: 'Chain of Custody', endpoint: MCP_SERVICES.custody, capabilities: ['legal', 'tracking'], mcpPort: 3122 },
      { name: 'forensics', description: 'Digital Forensics', endpoint: MCP_SERVICES.forensics, capabilities: ['disk', 'mobile', 'ram'], mcpPort: 3123 },
      { name: 'social', description: 'Social Intelligence', endpoint: MCP_SERVICES.social, capabilities: ['osint', 'networks'], mcpPort: 3130 },
      { name: 'financial', description: 'Financial Forensics', endpoint: MCP_SERVICES.financial, capabilities: ['invoice', 'fraud'], mcpPort: 3131 },
      { name: 'location', description: 'Location Intelligence', endpoint: MCP_SERVICES.location, capabilities: ['gps', 'cell', 'ip'], mcpPort: 3132 },
      { name: 'reports', description: 'Expert Reports', endpoint: MCP_SERVICES.reports, capabilities: ['court', 'pdf'], mcpPort: 3133 }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║         REZ Forensics Gateway                             ║
╠════════════════════════════════════════════════════════════╣
║  Port:      ${PORT.toString().padEnd(40)}║
║  Status:    Running                                      ║
╠════════════════════════════════════════════════════════════╣
║  Connected MCPs:                                        ║
║    - Evidence Ingestion:     ${MCP_SERVICES.evidence.replace('http://', '').padEnd(20)}║
║    - Deepfake Detector:      ${MCP_SERVICES.deepfake.replace('http://', '').padEnd(20)}║
║    - Chain of Custody:      ${MCP_SERVICES.custody.replace('http://', '').padEnd(20)}║
║    - Digital Forensics:     ${MCP_SERVICES.forensics.replace('http://', '').padEnd(20)}║
║    - Social Intelligence:    ${MCP_SERVICES.social.replace('http://', '').padEnd(20)}║
║    - Financial Forensics:   ${MCP_SERVICES.financial.replace('http://', '').padEnd(20)}║
║    - Location Intelligence: ${MCP_SERVICES.location.replace('http://', '').padEnd(20)}║
║    - Expert Reports:        ${MCP_SERVICES.reports.replace('http://', '').padEnd(20)}║
╚════════════════════════════════════════════════════════════╝
  `);
});

export { app };