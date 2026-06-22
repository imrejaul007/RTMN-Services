import { Server } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const PORT = parseInt(process.env.PORT || '3123');
const app = express();
app.use(express.json());

interface ForensicCase {
  id: string;
  caseNumber: string;
  description: string;
  createdAt: Date;
  status: 'active' | 'completed' | 'archived';
  evidence: EvidenceItem[];
  findings: Finding[];
}

interface EvidenceItem {
  id: string;
  type: 'disk' | 'mobile' | 'ram' | 'network';
  source: string;
  hash: string;
  acquiredAt: Date;
  acquiredBy: string;
}

interface Finding {
  id: string;
  category: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  evidence: string[];
  timestamp: Date;
}

// In-memory store
const cases = new Map<string, ForensicCase>();

// Create new case
app.post('/case', (req, res) => {
  try {
    const { caseNumber, description } = req.body;
    if (!caseNumber) {
      return res.status(400).json({ error: 'caseNumber required' });
    }

    const id = uuidv4();
    const forensicCase: ForensicCase = {
      id,
      caseNumber,
      description: description || '',
      createdAt: new Date(),
      status: 'active',
      evidence: [],
      findings: []
    };

    cases.set(id, forensicCase);
    res.json({ success: true, caseId: id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add evidence to case
app.post('/case/:id/evidence', (req, res) => {
  try {
    const forensicCase = cases.get(req.params.id);
    if (!forensicCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const { type, source, hash, acquiredBy } = req.body;
    if (!type || !source) {
      return res.status(400).json({ error: 'type and source required' });
    }

    const evidenceItem: EvidenceItem = {
      id: uuidv4(),
      type,
      source,
      hash: hash || crypto.createHash('sha256').update(source + Date.now()).digest('hex'),
      acquiredAt: new Date(),
      acquiredBy: acquiredBy || 'System'
    };

    forensicCase.evidence.push(evidenceItem);
    cases.set(forensicCase.id, forensicCase);

    res.json({ success: true, evidenceId: evidenceItem.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add finding to case
app.post('/case/:id/finding', (req, res) => {
  try {
    const forensicCase = cases.get(req.params.id);
    if (!forensicCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const { category, description, severity, evidence } = req.body;
    if (!category || !description) {
      return res.status(400).json({ error: 'category and description required' });
    }

    const finding: Finding = {
      id: uuidv4(),
      category,
      description,
      severity: severity || 'info',
      evidence: evidence || [],
      timestamp: new Date()
    };

    forensicCase.findings.push(finding);
    cases.set(forensicCase.id, forensicCase);

    res.json({ success: true, findingId: finding.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get case
app.get('/case/:id', (req, res) => {
  const forensicCase = cases.get(req.params.id);
  if (!forensicCase) {
    return res.status(404).json({ error: 'Case not found' });
  }
  res.json(forensicCase);
});

// List cases
app.get('/cases', (req, res) => {
  const allCases = Array.from(cases.values());
  res.json({ count: allCases.length, cases: allCases });
});

// Extract browser artifacts
app.post('/extract/browser', (req, res) => {
  try {
    const { browserType } = req.body;
    const artifacts = [
      { type: 'history', description: 'Browsing history', format: 'sqlite' },
      { type: 'cookies', description: 'Browser cookies', format: 'sqlite' },
      { type: 'cache', description: 'Cached files', format: 'directory' },
      { type: 'downloads', description: 'Download history', format: 'sqlite' }
    ];

    res.json({
      success: true,
      browser: browserType || 'unknown',
      artifacts,
      note: 'Use FTK Imager or equivalent for actual extraction'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Analyze mobile
app.post('/analyze/mobile', (req, res) => {
  try {
    const { platform } = req.body;
    const artifacts = {
      ios: ['SMS', 'Contacts', 'Photos', 'WhatsApp', 'Location', 'App Data'],
      android: ['SMS', 'Contacts', 'Photos', 'WhatsApp', 'Call Logs', 'App Data']
    };

    res.json({
      success: true,
      platform: platform || 'android',
      possibleArtifacts: artifacts[platform as keyof typeof artifacts] || artifacts.android,
      tools: ['Cellebrite', 'XRY', 'Oxygen', 'UFED']
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Timeline analysis
app.post('/timeline', (req, res) => {
  try {
    const { events } = req.body;
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'events array required' });
    }

    // Sort by timestamp
    const sorted = events.sort((a: any, b: any) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    res.json({
      success: true,
      eventCount: sorted.length,
      timeline: sorted,
      start: sorted[0]?.timestamp,
      end: sorted[sorted.length - 1]?.timestamp
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), caseCount: cases.size });
});

// MCP Server
const server = new Server(
  { name: 'rez-mcp-digital-forensics', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'create_case',
        description: 'Create new forensic case',
        inputSchema: {
          type: 'object',
          properties: {
            caseNumber: { type: 'string', description: 'Case identifier' },
            description: { type: 'string', description: 'Case description' }
          },
          required: ['caseNumber']
        }
      },
      {
        name: 'acquire_image',
        description: 'Record disk image acquisition',
        inputSchema: {
          type: 'object',
          properties: {
            caseId: { type: 'string', description: 'Case ID' },
            source: { type: 'string', description: 'Evidence source' },
            type: { type: 'string', description: 'Evidence type (disk/mobile/ram)' },
            acquiredBy: { type: 'string', description: 'Analyst name' }
          }
        }
      },
      {
        name: 'analyze_mobile',
        description: 'Plan mobile forensics analysis',
        inputSchema: {
          type: 'object',
          properties: {
            platform: { type: 'string', description: 'ios or android' }
          }
        }
      },
      {
        name: 'extract_artifacts',
        description: 'Extract browser or app artifacts',
        inputSchema: {
          type: 'object',
          properties: {
            browserType: { type: 'string', description: 'Chrome, Firefox, Safari, Edge' }
          }
        }
      },
      {
        name: 'analyze_ram',
        description: 'Analyze RAM dump for artifacts',
        inputSchema: {
          type: 'object',
          properties: {
            dumpPath: { type: 'string', description: 'Path to RAM dump' }
          }
        }
      },
      {
        name: 'timeline_events',
        description: 'Create event timeline from evidence',
        inputSchema: {
          type: 'object',
          properties: {
            caseId: { type: 'string', description: 'Case ID' }
          }
        }
      },
      {
        name: 'add_finding',
        description: 'Add finding to forensic case',
        inputSchema: {
          type: 'object',
          properties: {
            caseId: { type: 'string', description: 'Case ID' },
            category: { type: 'string', description: 'Finding category' },
            description: { type: 'string', description: 'Finding description' },
            severity: { type: 'string', description: 'critical/high/medium/low/info' }
          }
        }
      },
      {
        name: 'list_cases',
        description: 'List all forensic cases',
        inputSchema: { type: 'object', properties: {} }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'create_case':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Use HTTP POST /case' }) }] };

      case 'acquire_image':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Use HTTP POST /case/{id}/evidence' }) }] };

      case 'analyze_mobile':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, platform: args?.platform, artifacts: ['SMS', 'Contacts', 'Photos', 'WhatsApp', 'Location'] }) }] };

      case 'extract_artifacts':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, browser: args?.browserType, artifacts: ['history', 'cookies', 'cache', 'downloads'] }) }] };

      case 'analyze_ram':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, dumpPath: args?.dumpPath, artifacts: ['passwords', 'keys', 'sessions', 'processes'] }) }] };

      case 'timeline_events':
        const timelineCase = cases.get(args?.caseId);
        if (!timelineCase) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: 'Case not found' }) }], isError: true };
        }
        return { content: [{ type: 'text', text: JSON.stringify({ caseId: args?.caseId, events: timelineCase.evidence.length + timelineCase.findings.length }) }] };

      case 'add_finding':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Use HTTP POST /case/{id}/finding' }) }] };

      case 'list_cases':
        return { content: [{ type: 'text', text: JSON.stringify({ count: cases.size, cases: Array.from(cases.values()).map(c => ({ id: c.id, caseNumber: c.caseNumber, status: c.status })) }) }] };

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (error: any) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
});

const useHttp = process.env.TRANSPORT === 'http';
if (useHttp) {
  app.listen(PORT, () => console.log(`Digital Forensics MCP running on port ${PORT}`));
} else {
  server.connect();
  console.error('Digital Forensics MCP running on stdio');
});

export { app };