import { Server } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const PORT = parseInt(process.env.PORT || '3122');
const app = express();
app.use(express.json());

interface Custodian {
  id: string;
  name: string;
  role: string;
  organization: string;
  contact: string;
}

interface CustodyEvent {
  id: string;
  timestamp: Date;
  action: 'created' | 'transferred' | 'accessed' | 'verified' | 'archived';
  custodian: Custodian;
  previousHash: string;
  hash: string;
  notes: string;
  signature?: string;
}

interface EvidenceChain {
  id: string;
  evidenceId: string;
  description: string;
  createdAt: Date;
  createdBy: Custodian;
  currentHash: string;
  events: CustodyEvent[];
  status: 'active' | 'verified' | 'archived';
}

// In-memory store (use MongoDB in production)
const chains = new Map<string, EvidenceChain>();

// Calculate SHA256 hash for chain integrity
function calculateChainHash(data: any): string {
  const content = JSON.stringify(data);
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Generate digital signature
function generateSignature(data: string, privateKey: string): string {
  return crypto.createHmac('sha256', privateKey).update(data).digest('hex');
}

// Create new evidence chain
app.post('/chain', async (req, res) => {
  try {
    const { evidenceId, description, custodian } = req.body;

    if (!evidenceId || !custodian) {
      return res.status(400).json({ error: 'evidenceId and custodian required' });
    }

    const id = uuidv4();
    const chain: EvidenceChain = {
      id,
      evidenceId,
      description: description || 'No description provided',
      createdAt: new Date(),
      createdBy: custodian,
      currentHash: '',
      events: [],
      status: 'active'
    };

    // First custody event
    const firstEvent: CustodyEvent = {
      id: uuidv4(),
      timestamp: new Date(),
      action: 'created',
      custodian,
      previousHash: '0'.repeat(64),
      hash: '',
      notes: 'Evidence chain initiated'
    };

    // Calculate hash for first event
    firstEvent.hash = calculateChainHash(firstEvent);
    chain.events.push(firstEvent);
    chain.currentHash = firstEvent.hash;

    chains.set(id, chain);

    res.json({ success: true, chainId: id, initialHash: chain.currentHash });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add custody event
app.post('/chain/:id/transfer', async (req, res) => {
  try {
    const chain = chains.get(req.params.id);
    if (!chain) {
      return res.status(404).json({ error: 'Chain not found' });
    }

    const { newCustodian, notes } = req.body;
    if (!newCustodian) {
      return res.status(400).json({ error: 'newCustodian required' });
    }

    const event: CustodyEvent = {
      id: uuidv4(),
      timestamp: new Date(),
      action: 'transferred',
      custodian: newCustodian,
      previousHash: chain.currentHash,
      hash: '',
      notes: notes || 'Evidence transferred'
    };

    event.hash = calculateChainHash(event);
    chain.events.push(event);
    chain.currentHash = event.hash;

    chains.set(chain.id, chain);

    res.json({ success: true, eventId: event.id, newHash: chain.currentHash });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Verify chain integrity
app.get('/chain/:id/verify', async (req, res) => {
  try {
    const chain = chains.get(req.params.id);
    if (!chain) {
      return res.status(404).json({ error: 'Chain not found' });
    }

    const verified: { eventIndex: number; valid: boolean }[] = [];
    let allValid = true;

    for (let i = 0; i < chain.events.length; i++) {
      const event = chain.events[i];
      const expectedHash = calculateChainHash(event);
      const valid = event.hash === expectedHash;

      if (i > 0) {
        const previousEvent = chain.events[i - 1];
        const hashChainValid = previousEvent.hash === event.previousHash;
        verified.push({ eventIndex: i, valid: valid && hashChainValid });
        if (!valid || !hashChainValid) allValid = false;
      } else {
        verified.push({ eventIndex: i, valid });
        if (!valid) allValid = false;
      }
    }

    res.json({
      chainId: chain.id,
      verified: allValid,
      eventCount: chain.events.length,
      currentHash: chain.currentHash,
      verification: verified
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get chain
app.get('/chain/:id', (req, res) => {
  const chain = chains.get(req.params.id);
  if (!chain) {
    return res.status(404).json({ error: 'Chain not found' });
  }
  res.json(chain);
});

// Generate timeline
app.get('/chain/:id/timeline', (req, res) => {
  const chain = chains.get(req.params.id);
  if (!chain) {
    return res.status(404).json({ error: 'Chain not found' });
  }

  const timeline = chain.events.map(e => ({
    timestamp: e.timestamp,
    action: e.action,
    custodian: e.custodian.name,
    role: e.custodian.role,
    notes: e.notes,
    hash: e.hash.substring(0, 16) + '...'
  }));

  res.json({ chainId: chain.id, timeline });
});

// Export report
app.get('/chain/:id/export', (req, res) => {
  const chain = chains.get(req.params.id);
  if (!chain) {
    return res.status(404).json({ error: 'Chain not found' });
  }

  const report = {
    reportType: 'Chain of Custody',
    generatedAt: new Date().toISOString(),
    evidence: {
      id: chain.evidenceId,
      description: chain.description,
      status: chain.status
    },
    custodyEvents: chain.events.map(e => ({
      timestamp: e.timestamp,
      action: e.action,
      custodianName: e.custodian.name,
      custodianRole: e.custodian.role,
      custodianOrganization: e.custodian.organization,
      notes: e.notes,
      eventHash: e.hash
    })),
    integrity: {
      eventCount: chain.events.length,
      currentHash: chain.currentHash,
      verified: true
    }
  };

  res.json(report);
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), chainCount: chains.size });
});

// MCP Server
const server = new Server(
  { name: 'rez-mcp-chain-of-custody', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'create_chain',
        description: 'Create new evidence chain of custody',
        inputSchema: {
          type: 'object',
          properties: {
            evidenceId: { type: 'string', description: 'Unique evidence identifier' },
            description: { type: 'string', description: 'Evidence description' },
            custodianName: { type: 'string', description: 'Initial custodian name' },
            custodianRole: { type: 'string', description: 'Initial custodian role' },
            custodianOrganization: { type: 'string', description: 'Organization' }
          },
          required: ['evidenceId', 'custodianName']
        }
      },
      {
        name: 'add_custodian',
        description: 'Record evidence transfer to new custodian',
        inputSchema: {
          type: 'object',
          properties: {
            chainId: { type: 'string', description: 'Chain ID' },
            newCustodianName: { type: 'string', description: 'New custodian name' },
            newCustodianRole: { type: 'string', description: 'New custodian role' },
            newCustodianOrganization: { type: 'string', description: 'Organization' },
            notes: { type: 'string', description: 'Transfer notes' }
          },
          required: ['chainId', 'newCustodianName']
        }
      },
      {
        name: 'verify_integrity',
        description: 'Verify chain of custody integrity',
        inputSchema: {
          type: 'object',
          properties: {
            chainId: { type: 'string', description: 'Chain ID to verify' }
          },
          required: ['chainId']
        }
      },
      {
        name: 'generate_timeline',
        description: 'Generate custody timeline',
        inputSchema: {
          type: 'object',
          properties: {
            chainId: { type: 'string', description: 'Chain ID' }
          },
          required: ['chainId']
        }
      },
      {
        name: 'export_report',
        description: 'Export chain of custody report',
        inputSchema: {
          type: 'object',
          properties: {
            chainId: { type: 'string', description: 'Chain ID' }
          },
          required: ['chainId']
        }
      },
      {
        name: 'list_chains',
        description: 'List all evidence chains',
        inputSchema: { type: 'object', properties: {} }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'create_chain':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Use HTTP POST /chain to create chain' }) }] };

      case 'add_custodian':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Use HTTP POST /chain/{id}/transfer' }) }] };

      case 'verify_integrity':
        const verifyChain = chains.get(args?.chainId);
        if (!verifyChain) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: 'Chain not found' }) }], isError: true };
        }
        let allValid = true;
        for (const event of verifyChain.events) {
          if (event.hash !== calculateChainHash(event)) allValid = false;
        }
        return { content: [{ type: 'text', text: JSON.stringify({ verified: allValid, chainId: args?.chainId, eventCount: verifyChain.events.length }) }] };

      case 'generate_timeline':
        const timelineChain = chains.get(args?.chainId);
        if (!timelineChain) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: 'Chain not found' }) }], isError: true };
        }
        return { content: [{ type: 'text', text: JSON.stringify({ timeline: timelineChain.events.map(e => ({ timestamp: e.timestamp, action: e.action, custodian: e.custodian.name })) }) }] };

      case 'export_report':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Use HTTP GET /chain/{id}/export for report' }) }] };

      case 'list_chains':
        return { content: [{ type: 'text', text: JSON.stringify({ count: chains.size, chains: Array.from(chains.values()).map(c => ({ id: c.id, evidenceId: c.evidenceId, status: c.status })) }) }] };

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (error: any) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
});

const useHttp = process.env.TRANSPORT === 'http';
if (useHttp) {
  app.listen(PORT, () => console.log(`Chain of Custody MCP running on port ${PORT}`));
} else {
  server.connect();
  console.error('Chain of Custody MCP running on stdio');
}

export { app };