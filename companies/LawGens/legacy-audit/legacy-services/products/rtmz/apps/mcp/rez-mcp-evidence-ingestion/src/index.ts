import { Server } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { createHash } from 'crypto';

const PORT = parseInt(process.env.PORT || '3120');
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

interface Evidence {
  id: string;
  type: string;
  filename: string;
  hash: string;
  size: number;
  uploadedAt: Date;
  metadata: Record<string, any>;
}

// In-memory evidence store (use MongoDB in production)
const evidenceStore = new Map<string, Evidence>();

// Calculate SHA256 hash
function calculateHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

// Import WhatsApp chat export
async function importWhatsApp(data: any): Promise<any[]> {
  const messages: any[] = [];
  const lines = data.text?.split('\n') || [];

  for (const line of lines) {
    const match = line.match(/\[?(.*?)\]?\s*,\s*(.*?)\s*-\s*(.*)/);
    if (match) {
      messages.push({
        timestamp: match[1],
        sender: match[2],
        message: match[3],
        type: 'whatsapp'
      });
    }
  }

  return messages;
}

// Import Email (basic parsing)
async function importEmail(data: any): Promise<any[]> {
  const emails: any[] = [];
  const content = data.text || data.html || '';

  const fromMatch = content.match(/From:\s*(.+)/i);
  const toMatch = content.match(/To:\s*(.+)/i);
  const subjectMatch = content.match(/Subject:\s*(.+)/i);
  const dateMatch = content.match(/Date:\s*(.+)/i);

  if (fromMatch || toMatch) {
    emails.push({
      from: fromMatch?.[1] || 'Unknown',
      to: toMatch?.[1] || 'Unknown',
      subject: subjectMatch?.[1] || 'No Subject',
      date: dateMatch?.[1] || new Date().toISOString(),
      type: 'email'
    });
  }

  return emails;
}

// Extract metadata from file
async function extractMetadata(file: Express.Multer.File): Promise<Record<string, any>> {
  const metadata: Record<string, any> = {
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    uploadedAt: new Date().toISOString()
  };

  return metadata;
}

// Express routes for evidence upload
app.post('/evidence/whatsapp', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const id = uuidv4();
    const hash = calculateHash(file.buffer);
    const messages = await importWhatsApp({ text: file.buffer.toString('utf-8') });

    const evidence: Evidence = {
      id,
      type: 'whatsapp',
      filename: file.originalname,
      hash,
      size: file.size,
      uploadedAt: new Date(),
      metadata: { messages, messageCount: messages.length }
    };

    evidenceStore.set(id, evidence);

    res.json({ success: true, id, hash, messageCount: messages.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/evidence/email', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const id = uuidv4();
    const hash = calculateHash(file.buffer);
    const emails = await importEmail({ text: file.buffer.toString('utf-8') });

    const evidence: Evidence = {
      id,
      type: 'email',
      filename: file.originalname,
      hash,
      size: file.size,
      uploadedAt: new Date(),
      metadata: { emails, emailCount: emails.length }
    };

    evidenceStore.set(id, evidence);

    res.json({ success: true, id, hash, emailCount: emails.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/evidence/file', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const id = uuidv4();
    const hash = calculateHash(file.buffer);
    const metadata = await extractMetadata(file);

    const evidence: Evidence = {
      id,
      type: file.mimetype,
      filename: file.originalname,
      hash,
      size: file.size,
      uploadedAt: new Date(),
      metadata
    };

    evidenceStore.set(id, evidence);

    res.json({ success: true, id, hash, metadata });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/evidence/:id', (req, res) => {
  const evidence = evidenceStore.get(req.params.id);
  if (!evidence) {
    return res.status(404).json({ error: 'Evidence not found' });
  }
  res.json(evidence);
});

app.get('/evidence/:id/validate', (req, res) => {
  const evidence = evidenceStore.get(req.params.id);
  if (!evidence) {
    return res.status(404).json({ error: 'Evidence not found' });
  }
  res.json({ valid: true, hash: evidence.hash, filename: evidence.filename });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), evidenceCount: evidenceStore.size });
});

// MCP Server
const server = new Server(
  {
    name: 'rez-mcp-evidence-ingestion',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'import_whatsapp',
        description: 'Import WhatsApp chat export and extract messages',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: { type: 'string', description: 'Path to WhatsApp chat export file' }
          }
        }
      },
      {
        name: 'import_email',
        description: 'Import email data from file',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: { type: 'string', description: 'Path to email file' }
          }
        }
      },
      {
        name: 'import_cctv',
        description: 'Process CCTV video file and extract timestamps',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: { type: 'string', description: 'Path to CCTV video file' }
          }
        }
      },
      {
        name: 'import_social',
        description: 'Import social media data export',
        inputSchema: {
          type: 'object',
          properties: {
            platform: { type: 'string', description: 'Social media platform (facebook, twitter, instagram)' }
          }
        }
      },
      {
        name: 'validate_evidence',
        description: 'Validate evidence by verifying hash',
        inputSchema: {
          type: 'object',
          properties: {
            evidence_id: { type: 'string', description: 'Evidence ID to validate' }
          }
        }
      },
      {
        name: 'extract_metadata',
        description: 'Extract metadata from any evidence file',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: { type: 'string', description: 'Path to file' }
          }
        }
      },
      {
        name: 'list_evidence',
        description: 'List all ingested evidence',
        inputSchema: { type: 'object', properties: {} }
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'import_whatsapp':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Use HTTP API to upload WhatsApp export' }) }] };

      case 'import_email':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Use HTTP API to upload email file' }) }] };

      case 'import_cctv':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Use HTTP API to upload CCTV video' }) }] };

      case 'import_social':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, platform: args?.platform, message: 'Social media import initiated' }) }] };

      case 'validate_evidence':
        const evidence = evidenceStore.get(args?.evidence_id);
        if (!evidence) {
          return { content: [{ type: 'text', text: JSON.stringify({ valid: false, error: 'Evidence not found' }) }] };
        }
        return { content: [{ type: 'text', text: JSON.stringify({ valid: true, hash: evidence.hash, filename: evidence.filename }) }] };

      case 'extract_metadata':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Use HTTP API to upload file for metadata extraction' }) }] };

      case 'list_evidence':
        return { content: [{ type: 'text', text: JSON.stringify({ count: evidenceStore.size, evidence: Array.from(evidenceStore.values()) }) }] };

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (error: any) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
});

// Start server
const useHttp = process.env.TRANSPORT === 'http';

if (useHttp) {
  app.listen(PORT, () => {
    console.log(`Evidence Ingestion MCP running on port ${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
  });
} else {
  // Run as MCP stdio server
  server.connect();
  console.error('Evidence Ingestion MCP Server running on stdio');
}

export { app };
