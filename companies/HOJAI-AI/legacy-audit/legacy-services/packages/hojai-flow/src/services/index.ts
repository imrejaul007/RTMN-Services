/**
 * Hojai Flow - Main Entry Point
 *
 * Memory Operating System where Voice = Primary Interface
 */

import express, { Request, Response, NextFunction } from 'express';
import { Request as ExpressRequest } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuid } from 'uuid';

// Extend Express Request to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

// Services
import { voiceService, VoiceService, SupportedLanguage } from './voiceService.js';
import { intentService, IntentService, IntentType } from './intentService.js';
import { memoryController, MemoryController } from './memoryController.js';
import { routerService, RouterService } from './routerService.js';
import { vaultService, VaultService } from './vaultService.js';
import { knowledgeEngine, KnowledgeEngine } from './knowledgeEngine.js';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: '10mb' }));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  req.requestId = (req.headers['x-request-id'] as string) || uuid();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'hojai-flow',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// VOICE ROUTES
// ============================================================================

/**
 * POST /api/voice/detect-language
 * Detect language from text
 */
app.post('/api/voice/detect-language', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const language = voiceService.detectLanguage(text);
    res.json({ success: true, language });
  } catch (error) {
    res.status(500).json({ error: 'Failed to detect language' });
  }
});

/**
 * POST /api/voice/transcribe
 * Transcribe audio
 */
app.post('/api/voice/transcribe', async (req: Request, res: Response) => {
  try {
    const { audio, language } = req.body;
    if (!audio) {
      return res.status(400).json({ error: 'Audio is required' });
    }

    const transcript = await voiceService.recognizeSpeech(
      Buffer.from(audio, 'base64'),
      language
    );
    res.json({ success: true, transcript });
  } catch (error) {
    res.status(500).json({ error: 'Failed to transcribe' });
  }
});

/**
 * POST /api/voice/vad
 * Voice Activity Detection
 */
app.post('/api/voice/vad', async (req: Request, res: Response) => {
  try {
    const { audio } = req.body;
    if (!audio) {
      return res.status(400).json({ error: 'Audio is required' });
    }

    const segments = await voiceService.detectVoiceActivity(
      Buffer.from(audio, 'base64')
    );
    res.json({ success: true, segments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to detect voice' });
  }
});

// ============================================================================
// INTENT ROUTES
// ============================================================================

/**
 * POST /api/intent/detect
 * Detect intent from text
 */
app.post('/api/intent/detect', async (req: Request, res: Response) => {
  try {
    const { text, context } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const intent = intentService.detect(text, context);
    res.json({ success: true, intent });
  } catch (error) {
    res.status(500).json({ error: 'Failed to detect intent' });
  }
});

/**
 * POST /api/intent/batch
 * Batch intent detection
 */
app.post('/api/intent/batch', async (req: Request, res: Response) => {
  try {
    const { texts, context } = req.body;
    if (!texts || !Array.isArray(texts)) {
      return res.status(400).json({ error: 'Texts array is required' });
    }

    const intents = intentService.detectBatch(texts, context);
    res.json({ success: true, intents });
  } catch (error) {
    res.status(500).json({ error: 'Failed to detect intents' });
  }
});

/**
 * GET /api/intent/stats
 * Get intent detection stats
 */
app.get('/api/intent/stats', (req: Request, res: Response) => {
  const stats = intentService.getStats();
  res.json({ success: true, stats });
});

// ============================================================================
// MEMORY ROUTES
// ============================================================================

/**
 * POST /api/memory/store
 * Store memory at specified level
 */
app.post('/api/memory/store', async (req: Request, res: Response) => {
  try {
    const { owner, type, data, level, tags, ttl } = req.body;
    if (!owner || !type || !data) {
      return res.status(400).json({ error: 'owner, type, and data are required' });
    }

    const memory = await memoryController.store(owner, type, data, { level, tags, ttl });
    res.json({ success: true, memory });
  } catch (error) {
    res.status(500).json({ error: 'Failed to store memory' });
  }
});

/**
 * POST /api/memory/retrieve
 * Retrieve memory
 */
app.post('/api/memory/retrieve', async (req: Request, res: Response) => {
  try {
    const { owner, query, preferLevel } = req.body;
    if (!owner || !query) {
      return res.status(400).json({ error: 'owner and query are required' });
    }

    const memory = await memoryController.retrieve(owner, query, { preferLevel });
    res.json({ success: true, memory });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve memory' });
  }
});

/**
 * GET /api/memory/context/:userId
 * Get context for user
 */
app.get('/api/memory/context/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const context = await memoryController.getContext(userId);
    res.json({ success: true, context });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get context' });
  }
});

/**
 * POST /api/memory/prefetch
 * Prefetch memory based on context
 */
app.post('/api/memory/prefetch', async (req: Request, res: Response) => {
  try {
    const { context } = req.body;
    if (!context) {
      return res.status(400).json({ error: 'context is required' });
    }

    await memoryController.prefetch(context);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to prefetch' });
  }
});

/**
 * GET /api/memory/stats
 * Get memory statistics
 */
app.get('/api/memory/stats', (req: Request, res: Response) => {
  const stats = memoryController.getStats();
  res.json({ success: true, stats });
});

// ============================================================================
// ROUTER ROUTES
// ============================================================================

/**
 * POST /api/route
 * Route request to appropriate handler
 */
app.post('/api/route', async (req: Request, res: Response) => {
  try {
    const { input, context } = req.body;
    if (!input) {
      return res.status(400).json({ error: 'input is required' });
    }

    const route = await routerService.route(input, context);
    res.json({ success: true, route });
  } catch (error) {
    res.status(500).json({ error: 'Failed to route request' });
  }
});

/**
 * GET /api/router/status
 * Get router status
 */
app.get('/api/router/status', (req: Request, res: Response) => {
  const status = routerService.getStatus();
  res.json({ success: true, status });
});

// ============================================================================
// VAULT ROUTES
// ============================================================================

/**
 * POST /api/vault/create
 * Create user vault
 */
app.post('/api/vault/create', async (req: Request, res: Response) => {
  try {
    const { userId, passphrase } = req.body;
    if (!userId || !passphrase) {
      return res.status(400).json({ error: 'userId and passphrase are required' });
    }

    const vault = await vaultService.createVault(userId, passphrase);
    res.json({ success: true, vault });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create vault' });
  }
});

/**
 * POST /api/vault/unlock
 * Unlock vault
 */
app.post('/api/vault/unlock', async (req: Request, res: Response) => {
  try {
    const { userId, passphrase } = req.body;
    if (!userId || !passphrase) {
      return res.status(400).json({ error: 'userId and passphrase are required' });
    }

    const unlocked = await vaultService.unlockVault(userId, passphrase);
    res.json({ success: true, unlocked });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unlock vault' });
  }
});

/**
 * POST /api/vault/store
 * Store encrypted data
 */
app.post('/api/vault/store', async (req: Request, res: Response) => {
  try {
    const { userId, type, data, tags } = req.body;
    if (!userId || !type || !data) {
      return res.status(400).json({ error: 'userId, type, and data are required' });
    }

    const item = await vaultService.store(userId, type, data, { tags });
    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ error: 'Failed to store in vault' });
  }
});

/**
 * POST /api/vault/retrieve
 * Retrieve from vault
 */
app.post('/api/vault/retrieve', async (req: Request, res: Response) => {
  try {
    const { userId, itemId } = req.body;
    if (!userId || !itemId) {
      return res.status(400).json({ error: 'userId and itemId are required' });
    }

    const data = await vaultService.retrieve(userId, itemId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve from vault' });
  }
});

// ============================================================================
// KNOWLEDGE ROUTES
// ============================================================================

/**
 * POST /api/knowledge/index
 * Index a document
 */
app.post('/api/knowledge/index', async (req: Request, res: Response) => {
  try {
    const { content, metadata } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    const document = await knowledgeEngine.indexDocument(content, metadata || {});
    res.json({ success: true, document });
  } catch (error) {
    res.status(500).json({ error: 'Failed to index document' });
  }
});

/**
 * POST /api/knowledge/query
 * Query knowledge base
 */
app.post('/api/knowledge/query', async (req: Request, res: Response) => {
  try {
    const { text, filters, limit } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }

    const results = await knowledgeEngine.query({ text, filters, limit });
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: 'Failed to query knowledge' });
  }
});

/**
 * POST /api/knowledge/context
 * Build context pack
 */
app.post('/api/knowledge/context', async (req: Request, res: Response) => {
  try {
    const { text, filters, limit } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }

    const context = await knowledgeEngine.buildContextPack({ text, filters, limit, includeContext: true });
    res.json({ success: true, context });
  } catch (error) {
    res.status(500).json({ error: 'Failed to build context' });
  }
});

/**
 * GET /api/knowledge/stats
 * Get knowledge stats
 */
app.get('/api/knowledge/stats', (req: Request, res: Response) => {
  const stats = knowledgeEngine.getStats();
  res.json({ success: true, stats });
});

// ============================================================================
// PROCESS ROUTE (Combined Flow)
// ============================================================================

/**
 * POST /api/process
 * Complete Hojai Flow processing:
 * Voice → Intent → Memory → Knowledge → Action → Response
 */
app.post('/api/process', async (req: Request, res: Response) => {
  try {
    const { input, context } = req.body;
    if (!input) {
      return res.status(400).json({ error: 'input is required' });
    }

    const startTime = Date.now();

    // Step 1: Process voice (if audio provided)
    let text = typeof input === 'string' ? input : input.transcript || '';
    let language: SupportedLanguage = 'en';

    if (typeof input !== 'string' && input.audio) {
      const audioBuffer = Buffer.from(input.audio, 'base64');
      const detectedLang = voiceService.detectLanguage(text);
      const transcript = await voiceService.recognizeSpeech(audioBuffer, detectedLang);
      text = transcript.text;
      language = detectedLang;
    }

    // Step 2: Detect intent
    const intent = intentService.detect(text, context);

    // Step 3: Get memory context
    const userId = context?.userId as string;
    let memoryContext = null;
    if (userId) {
      memoryContext = await memoryController.getContext(userId);
      // Prefetch based on context
      await memoryController.prefetch({
        userId,
        currentApp: context?.currentApp as string,
        timeOfDay: new Date().getHours() < 12 ? 'morning' : 'afternoon',
      });
    }

    // Step 4: Build knowledge context
    let knowledgeContext = null;
    if (intent.type !== IntentType.DICTATION) {
      knowledgeContext = await knowledgeEngine.buildContextPack({
        text,
        limit: 3,
        includeContext: true,
      });
    }

    // Step 5: Route request
    const route = await routerService.route(text, {
      ...context,
      memory: memoryContext,
      knowledge: knowledgeContext,
    });

    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      result: {
        text,
        language,
        intent,
        memoryContext,
        knowledgeContext,
        route,
        processingTime,
      },
    });
  } catch (error) {
    console.error('Process error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error]', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// Start server
const PORT = process.env.PORT || 4560;

async function start() {
  console.log('[Hojai Flow] Starting Memory OS...');
  console.log('[Hojai Flow] Voice Layer: Ready');
  console.log('[Hojai Flow] Intent Detection: Ready');
  console.log('[Hojai Flow] Memory Controller: Ready');
  console.log('[Hojai Flow] Router: Ready');
  console.log('[Hojai Flow] Vault: Ready');
  console.log('[Hojai Flow] Knowledge Engine: Ready');
  app.listen(PORT, () => {
    console.log(`[Hojai Flow] Running on port ${PORT}`);
    console.log(`[Hojai Flow] Health: http://localhost:${PORT}/health`);
  });
}

start().catch(console.error);

export { app };
export default app;
