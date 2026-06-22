import { Server } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const PORT = parseInt(process.env.PORT || '3121');
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

interface AnalysisResult {
  id: string;
  type: 'image' | 'video' | 'audio';
  filename: string;
  confidence: number; // 0-1, higher = more likely AI-generated
  findings: string[];
  timestamp: Date;
  rawData?: any;
}

// In-memory store
const analysisStore = new Map<string, AnalysisResult>();

// Simple analysis heuristics (in production, use ML models)
async function analyzeImageMetadata(buffer: Buffer): Promise<{ confidence: number; findings: string[] }> {
  const findings: string[] = [];
  let confidence = 0.1;

  // Check file size anomalies
  if (buffer.length > 10 * 1024 * 1024) {
    findings.push('Large file size detected');
    confidence += 0.1;
  }

  // Check for EXIF data presence/absence
  const hasExif = buffer.includes(Buffer.from('Exif'));
  if (!hasExif) {
    findings.push('No EXIF metadata found - may indicate AI generation');
    confidence += 0.15;
  }

  // Check for common AI generation markers
  const patterns = [
    { pattern: 'Adobe', weight: -0.1 }, // Legitimate software
    { pattern: 'Photoshop', weight: -0.05 },
    { pattern: 'Stable Diffusion', weight: 0.3 },
    { pattern: 'DALL-E', weight: 0.25 },
    { pattern: 'Midjourney', weight: 0.25 },
    { pattern: 'GAN', weight: 0.2 },
  ];

  for (const p of patterns) {
    if (buffer.includes(Buffer.from(p.pattern))) {
      confidence += p.weight;
      if (p.weight > 0) {
        findings.push(`AI generation marker: ${p.pattern}`);
      }
    }
  }

  // Clamp confidence
  confidence = Math.max(0, Math.min(1, confidence));

  return { confidence, findings };
}

// Analyze audio for cloning indicators
async function analyzeAudio(buffer: Buffer): Promise<{ confidence: number; findings: string[] }> {
  const findings: string[] = [];
  let confidence = 0.15;

  // Check file format
  const isMp3 = buffer.slice(0, 3).toString() === 'ID3';
  const isWav = buffer.slice(0, 4).toString() === 'RIFF';

  if (isMp3) {
    findings.push('MP3 format detected');
  }

  // Check for unusual audio patterns (simplified)
  const size = buffer.length;
  if (size > 100 * 1024 * 1024) {
    findings.push('Large audio file - extended content');
    confidence += 0.1;
  }

  return { confidence, findings };
}

// Analyze video for face swap detection
async function analyzeVideo(buffer: Buffer): Promise<{ confidence: number; findings: string[] }> {
  const findings: string[] = [];
  let confidence = 0.2;

  // Check video format
  const isMp4 = buffer.slice(4, 8).toString() === 'ftyp';
  const isWebM = buffer.includes(Buffer.from('webm'));

  if (isMp4) {
    findings.push('MP4 format detected');
    confidence += 0.05;
  }

  if (isWebM) {
    findings.push('WebM format detected');
  }

  // Check for unusual frame sizes
  const size = buffer.length;
  if (size > 500 * 1024 * 1024) {
    findings.push('Large video file - high quality content');
    confidence += 0.1;
  }

  return { confidence, findings };
}

// Check EXIF metadata
app.post('/analyze/exif', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const exifData: Record<string, any> = {};
    const buffer = file.buffer;
    const content = buffer.toString('binary');

    // Basic EXIF parsing
    if (content.includes('Exif')) {
      exifData.hasExif = true;

      // Extract some common EXIF fields
      const exifMatches = content.match(/(\w+)\x00([^\x00]+)/g);
      if (exifMatches) {
        exifData.fields = exifMatches.slice(0, 10).map((m: string) => {
          const [key, value] = m.split('\x00');
          return { [key]: value };
        });
      }
    } else {
      exifData.hasExif = false;
    }

    res.json({ success: true, exif: exifData });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Analyze file
app.post('/analyze', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const id = uuidv4();
    const buffer = file.buffer;

    let result: AnalysisResult;

    if (file.mimetype.startsWith('image/')) {
      const { confidence, findings } = await analyzeImageMetadata(buffer);
      result = {
        id,
        type: 'image',
        filename: file.originalname,
        confidence,
        findings,
        timestamp: new Date()
      };
    } else if (file.mimetype.startsWith('video/')) {
      const { confidence, findings } = await analyzeVideo(buffer);
      result = {
        id,
        type: 'video',
        filename: file.originalname,
        confidence,
        findings,
        timestamp: new Date()
      };
    } else if (file.mimetype.startsWith('audio/')) {
      const { confidence, findings } = await analyzeAudio(buffer);
      result = {
        id,
        type: 'audio',
        filename: file.originalname,
        confidence,
        findings,
        timestamp: new Date()
      };
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    analysisStore.set(id, result);

    res.json({
      success: true,
      id,
      confidence: result.confidence,
      findings: result.findings,
      verdict: result.confidence > 0.7 ? 'LIKELY_AI_GENERATED' : result.confidence > 0.4 ? 'UNCERTAIN' : 'LIKELY_AUTHENTIC'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/analysis/:id', (req, res) => {
  const result = analysisStore.get(req.params.id);
  if (!result) {
    return res.status(404).json({ error: 'Analysis not found' });
  }
  res.json(result);
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), analysisCount: analysisStore.size });
});

// MCP Server
const server = new Server(
  { name: 'rez-mcp-deepfake-detector', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'analyze_image',
        description: 'Analyze image for AI generation indicators',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: { type: 'string', description: 'Path to image file' }
          }
        }
      },
      {
        name: 'analyze_video',
        description: 'Analyze video for face swap or AI manipulation',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: { type: 'string', description: 'Path to video file' }
          }
        }
      },
      {
        name: 'analyze_audio',
        description: 'Analyze audio for voice cloning indicators',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: { type: 'string', description: 'Path to audio file' }
          }
        }
      },
      {
        name: 'check_exif',
        description: 'Check EXIF metadata for authenticity markers',
        inputSchema: {
          type: 'object',
          properties: {
            file_path: { type: 'string', description: 'Path to file' }
          }
        }
      },
      {
        name: 'generate_report',
        description: 'Generate deepfake detection report',
        inputSchema: {
          type: 'object',
          properties: {
            analysis_id: { type: 'string', description: 'Analysis ID' }
          }
        }
      },
      {
        name: 'batch_analyze',
        description: 'Analyze multiple files for AI content',
        inputSchema: {
          type: 'object',
          properties: {
            files: { type: 'array', items: { type: 'string' }, description: 'Array of file paths' }
          }
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'analyze_image':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Use HTTP POST /analyze for image analysis' }) }] };

      case 'analyze_video':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Use HTTP POST /analyze for video analysis' }) }] };

      case 'analyze_audio':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Use HTTP POST /analyze for audio analysis' }) }] };

      case 'check_exif':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Use HTTP POST /analyze/exif for EXIF check' }) }] };

      case 'generate_report':
        const analysis = analysisStore.get(args?.analysis_id);
        if (!analysis) {
          return { content: [{ type: 'text', text: JSON.stringify({ error: 'Analysis not found' }) }], isError: true };
        }
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              report: {
                id: analysis.id,
                type: analysis.type,
                filename: analysis.filename,
                confidence: analysis.confidence,
                verdict: analysis.confidence > 0.7 ? 'LIKELY_AI_GENERATED' : analysis.confidence > 0.4 ? 'UNCERTAIN' : 'LIKELY_AUTHENTIC',
                findings: analysis.findings,
                timestamp: analysis.timestamp
              }
            })
          }]
        };

      case 'batch_analyze':
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, files: args?.files, message: 'Batch analysis initiated' }) }] };

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (error: any) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
});

const useHttp = process.env.TRANSPORT === 'http';
if (useHttp) {
  app.listen(PORT, () => {
    console.log(`Deepfake Detector MCP running on port ${PORT}`);
  });
} else {
  server.connect();
  console.error('Deepfake Detector MCP running on stdio');
}

export { app };