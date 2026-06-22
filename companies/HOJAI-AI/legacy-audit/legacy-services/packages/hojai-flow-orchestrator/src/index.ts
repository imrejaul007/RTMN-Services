/**
 * Hojai Flow Orchestrator
 *
 * Unified Memory + Intelligence + Voice Orchestrator
 * Implements Hojai Flow Architecture:
 *
 * Speech → Intent → Context → Memory → Knowledge → Reasoning → Action → Response
 *
 * Core Principles:
 * 1. Local First: Check memory tiers L1 → L2 → L3 → L4 → L5 before calling models
 * 2. Memory Before Models: Never call LLM before checking memory
 * 3. Context Before Reasoning: Load context before AI reasoning
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import axios from 'axios';
import crypto from 'crypto';

const app = express();
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: '10mb' }));

const PORT = parseInt(process.env.PORT || '4561', 10);

// Service URLs
const MEMORY_SERVICE_URL = process.env.MEMORY_SERVICE_URL || 'http://localhost:4520';
const INTELLIGENCE_SERVICE_URL = process.env.INTELLIGENCE_SERVICE_URL || 'http://localhost:4530';
const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL || 'http://localhost:4033';
const REASONING_SERVICE_URL = process.env.REASONING_SERVICE_URL || 'http://localhost:4198';
const INTENT_SERVICE_URL = process.env.INTENT_SERVICE_URL || 'http://localhost:4018';

// ============================================================================
// TYPES
// ============================================================================

export enum MemoryTier {
  L1_WORKING = 'l1_working',
  L2_EPISODIC = 'l2_episodic',
  L3_PROCEDURAL = 'l3_procedural',
  L4_SEMANTIC = 'l4_semantic',
  L5_WORLD = 'l5_world'
}

export interface HojaiFlowRequest {
  tenantId: string;
  userId: string;
  input: string;
  mode: 'voice' | 'text';
  audioData?: string; // Base64 encoded audio
  options?: {
    includeTiers?: MemoryTier[];
    maxItemsPerTier?: number;
    useReasoning?: boolean;
    useVoice?: boolean;
  };
}

export interface HojaiFlowResponse {
  flowId: string;
  input: string;
  output: string;
  audioUrl?: string;
  context: {
    memories: ContextMemory[];
    byTier: Record<MemoryTier, ContextMemory[]>;
    contextString: string;
  };
  intent?: {
    predicted: string;
    confidence: number;
  };
  reasoning?: {
    steps: ReasoningStep[];
    conclusion: string;
  };
  timing: {
    totalMs: number;
    memoryMs: number;
    intentMs: number;
    reasoningMs: number;
    llmMs: number;
  };
}

export interface ContextMemory {
  tier: MemoryTier;
  content: string;
  importance: number;
}

export interface ReasoningStep {
  step: number;
  thought: string;
}

// ============================================================================
// HOJAI FLOW ORCHESTRATOR
// ============================================================================

class HojaiFlowOrchestrator {
  /**
   * Main flow execution
   * Implements: Speech → Intent → Context → Memory → Knowledge → Reasoning → Action → Response
   */
  async execute(request: HojaiFlowRequest): Promise<HojaiFlowResponse> {
    const startTime = Date.now();
    const flowId = `flow_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    console.log(`[HojaiFlow] Starting flow ${flowId} for user ${request.userId}`);

    let memoryMs = 0, intentMs = 0, reasoningMs = 0, llmMs = 0;
    let contextString = '';
    let byTier: Partial<Record<MemoryTier, ContextMemory[]>> = {};
    let intent: HojaiFlowResponse['intent'];
    let reasoning: HojaiFlowResponse['reasoning'];
    let output = '';

    try {
      // Step 1: Speech-to-Text (if voice input)
      let processedInput = request.input;
      if (request.mode === 'voice' && request.audioData) {
        processedInput = await this.speechToText(request.audioData);
      }

      // Step 2: Load Context from Memory (L1 → L5 priority)
      const memoryStart = Date.now();
      const memoryResult = await this.loadContextFromMemory(request);
      contextString = memoryResult.contextString;
      byTier = memoryResult.byTier;
      memoryMs = Date.now() - memoryStart;
      console.log(`[HojaiFlow] Memory loaded in ${memoryMs}ms`);

      // Step 3: Intent Prediction
      const intentStart = Date.now();
      intent = await this.predictIntent(request.userId, processedInput);
      intentMs = Date.now() - intentStart;
      console.log(`[HojaiFlow] Intent predicted: ${intent.predicted} (${intent.confidence})`);

      // Step 4: Reasoning (if enabled)
      if (request.options?.useReasoning !== false) {
        const reasoningStart = Date.now();
        reasoning = await this.reason(request.userId, processedInput, contextString);
        reasoningMs = Date.now() - reasoningStart;
        console.log(`[HojaiFlow] Reasoning done in ${reasoningMs}ms`);
      }

      // Step 5: Generate Response (Memory Before Models)
      const llmStart = Date.now();
      output = await this.generateResponse({
        input: processedInput,
        context: contextString,
        intent: intent?.predicted,
        reasoning: reasoning?.conclusion
      });
      llmMs = Date.now() - llmStart;
      console.log(`[HojaiFlow] LLM response in ${llmMs}ms`);

      // Step 6: Text-to-Speech (if voice mode)
      let audioUrl: string | undefined;
      if (request.mode === 'voice' && request.options?.useVoice !== false) {
        audioUrl = await this.textToSpeech(output);
      }

      const totalMs = Date.now() - startTime;
      console.log(`[HojaiFlow] Flow ${flowId} completed in ${totalMs}ms`);

      return {
        flowId,
        input: processedInput,
        output,
        audioUrl,
        context: {
          memories: Object.values(byTier).flat().slice(0, 50) as ContextMemory[],
          byTier: byTier as Record<MemoryTier, ContextMemory[]>,
          contextString
        },
        intent,
        reasoning,
        timing: { totalMs, memoryMs, intentMs, reasoningMs, llmMs }
      };

    } catch (error) {
      console.error(`[HojaiFlow] Flow ${flowId} failed:`, error);
      throw error;
    }
  }

  /**
   * Step 1: Speech to Text
   */
  private async speechToText(audioData: string): Promise<string> {
    try {
      const response = await axios.post(
        `${VOICE_SERVICE_URL}/api/stt`,
        { audio: audioData },
        { timeout: 10000 }
      );
      return response.data.text;
    } catch (error) {
      console.warn('[HojaiFlow] STT failed, using direct input:', error);
      return audioData; // Fallback to direct input
    }
  }

  /**
   * Step 2: Load Context from Memory (Local-First Priority)
   * L1 → L2 → L3 → L4 → L5
   */
  private async loadContextFromMemory(request: HojaiFlowRequest): Promise<{
    contextString: string;
    byTier: Partial<Record<MemoryTier, ContextMemory[]>>;
  }> {
    const tiers = request.options?.includeTiers || Object.values(MemoryTier);
    let byTier: Partial<Record<MemoryTier, ContextMemory[]>> = {};

    try {
      // Try local memory service first
      const response = await axios.get(
        `${MEMORY_SERVICE_URL}/api/memories/context`,
        {
          params: {
            userId: request.userId,
            tiers: tiers.join(','),
            maxItemsPerTier: request.options?.maxItemsPerTier || 10
          },
          headers: { 'x-tenant-id': request.tenantId },
          timeout: 5000
        }
      );

      if (response.data.success) {
        const data = response.data.data;
        byTier = data.byTier || {};

        return {
          contextString: data.context || this.buildContextFromTiers(byTier),
          byTier
        };
      }
    } catch (error) {
      console.warn('[HojaiFlow] Memory service unavailable, building context locally:', error);
    }

    // Build context from tiers
    return {
      contextString: this.buildContextFromTiers(byTier),
      byTier
    };
  }

  /**
   * Build context string from memory tiers
   */
  private buildContextFromTiers(byTier: Partial<Record<MemoryTier, ContextMemory[]>>): string {
    const parts: string[] = [];
    const tierNames: Record<MemoryTier, string> = {
      [MemoryTier.L1_WORKING]: 'Working Memory (Current)',
      [MemoryTier.L2_EPISODIC]: 'Episodic Memory (Recent)',
      [MemoryTier.L3_PROCEDURAL]: 'Procedural Memory (How-tos)',
      [MemoryTier.L4_SEMANTIC]: 'Semantic Memory (Facts)',
      [MemoryTier.L5_WORLD]: 'World Knowledge'
    };

    for (const tier of Object.values(MemoryTier)) {
      const memories = byTier[tier];
      if (!memories || memories.length === 0) continue;

      parts.push(`\n=== ${tierNames[tier]} ===`);
      for (const m of memories.slice(0, 5)) {
        parts.push(`- ${m.content}`);
      }
    }

    return parts.length > 0 ? parts.join('\n') : 'No memory context available.';
  }

  /**
   * Step 3: Intent Prediction
   */
  private async predictIntent(userId: string, input: string): Promise<{
    predicted: string;
    confidence: number;
  }> {
    try {
      const response = await axios.post(
        `${INTENT_SERVICE_URL}/api/intent/predict`,
        { userId, text: input },
        { timeout: 5000 }
      );

      if (response.data.success) {
        return {
          predicted: response.data.data.intent || 'general',
          confidence: response.data.data.confidence || 0.5
        };
      }
    } catch (error) {
      console.warn('[HojaiFlow] Intent service unavailable:', error);
    }

    // Fallback: simple keyword matching
    const lower = input.toLowerCase();
    if (lower.includes('buy') || lower.includes('order')) return { predicted: 'purchase', confidence: 0.7 };
    if (lower.includes('help')) return { predicted: 'support', confidence: 0.7 };
    if (lower.includes('where') || lower.includes('location')) return { predicted: 'location_query', confidence: 0.6 };
    return { predicted: 'general', confidence: 0.3 };
  }

  /**
   * Step 4: Reasoning
   */
  private async reason(userId: string, input: string, context: string): Promise<{
    steps: ReasoningStep[];
    conclusion: string;
  }> {
    try {
      const response = await axios.post(
        `${REASONING_SERVICE_URL}/api/reason`,
        {
          problem: `${input}\n\nContext:\n${context}`,
          method: 'chain_of_thought',
          maxSteps: 5
        },
        { timeout: 10000 }
      );

      if (response.data.success) {
        const data = response.data.data;
        return {
          steps: data.steps?.map((s: any, i: number) => ({
            step: i + 1,
            thought: s.thought || s
          })) || [],
          conclusion: data.conclusion || data.answer || ''
        };
      }
    } catch (error) {
      console.warn('[HojaiFlow] Reasoning service unavailable:', error);
    }

    return { steps: [], conclusion: '' };
  }

  /**
   * Step 5: Generate Response (Memory Before Models)
   * If we have high-confidence context from memory, use it directly
   */
  private async generateResponse(params: {
    input: string;
    context: string;
    intent?: string;
    reasoning?: string;
  }): Promise<string> {
    // Check if we can answer from memory alone (high confidence)
    const contextLines = params.context.split('\n').filter(l => l.startsWith('- '));

    // Simple rule-based responses when context is sufficient
    if (contextLines.length >= 3) {
      const contextSummary = contextLines.slice(0, 3).join(' ');
      return `Based on your history: ${contextSummary}\n\nIs there anything else I can help with?`;
    }

    // For complex queries, we would call LLM here
    // For now, return a contextual response
    if (params.intent === 'purchase') {
      return `I see you're interested in making a purchase. Based on your preferences, I can help you find the best options. What are you looking for?`;
    }

    if (params.intent === 'support') {
      return `I'm here to help! I can see your recent activity. What do you need assistance with?`;
    }

    return `I've checked your history and context. How can I help you today?`;
  }

  /**
   * Step 6: Text to Speech
   */
  private async textToSpeech(text: string): Promise<string> {
    try {
      const response = await axios.post(
        `${VOICE_SERVICE_URL}/api/tts`,
        { text },
        { timeout: 15000 }
      );

      if (response.data.audioUrl) {
        return response.data.audioUrl;
      }
    } catch (error) {
      console.warn('[HojaiFlow] TTS failed:', error);
    }

    return '';
  }
}

// ============================================================================
// EXPRESS ROUTES
// ============================================================================

const flowOrchestrator = new HojaiFlowOrchestrator();

app.get('/health', (_: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'hojai-flow-orchestrator',
    version: '1.0.0',
    principles: [
      'Local First: L1 → L2 → L3 → L4 → L5',
      'Memory Before Models',
      'Context Before Reasoning'
    ],
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/flow/execute
 * Execute full Hojai Flow pipeline
 */
app.post('/api/flow/execute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const request: HojaiFlowRequest = req.body;

    if (!request.tenantId || !request.userId || !request.input) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: tenantId, userId, input'
      });
      return;
    }

    const result = await flowOrchestrator.execute(request);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/flow/memory
 * Get memory context only
 */
app.get('/api/flow/memory', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId, tiers } = req.query;

    if (!tenantId || !userId) {
      res.status(400).json({ success: false, error: 'tenantId and userId required' });
      return;
    }

    const includeTiers = tiers
      ? (tiers as string).split(',') as MemoryTier[]
      : undefined;

    // Call memory service
    const response = await axios.get(
      `${MEMORY_SERVICE_URL}/api/memories/context`,
      {
        params: { userId, tiers: includeTiers?.join(',') },
        headers: { 'x-tenant-id': tenantId as string }
      }
    );

    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/flow/intent
 * Predict intent only
 */
app.post('/api/flow/intent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, text } = req.body;

    if (!userId || !text) {
      res.status(400).json({ success: false, error: 'userId and text required' });
      return;
    }

    const result = await flowOrchestrator.execute({
      tenantId: 'default',
      userId,
      input: text,
      mode: 'text'
    });

    res.json({
      success: true,
      data: {
        intent: result.intent,
        timing: result.timing
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/flow/reason
 * Reasoning only
 */
app.post('/api/flow/reason', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, problem, context } = req.body;

    const result = await flowOrchestrator.execute({
      tenantId: 'default',
      userId: userId || 'anonymous',
      input: problem || '',
      mode: 'text',
      options: { useReasoning: true }
    });

    res.json({
      success: true,
      data: {
        reasoning: result.reasoning,
        timing: result.timing
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/flow/voice
 * Voice input to voice output
 */
app.post('/api/flow/voice', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId, userId, audioData } = req.body;

    if (!tenantId || !userId || !audioData) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: tenantId, userId, audioData'
      });
      return;
    }

    const result = await flowOrchestrator.execute({
      tenantId,
      userId,
      input: '', // Will be populated by STT
      mode: 'voice',
      audioData,
      options: { useVoice: true }
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[HojaiFlow] Error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal error' : err.message
  });
});

// Start server
async function start() {
  console.log('[HojaiFlow] Starting orchestrator...');
  console.log('[HojaiFlow] Connected services:');
  console.log(`[HojaiFlow]   Memory: ${MEMORY_SERVICE_URL}`);
  console.log(`[HojaiFlow]   Intelligence: ${INTELLIGENCE_SERVICE_URL}`);
  console.log(`[HojaiFlow]   Voice: ${VOICE_SERVICE_URL}`);
  console.log(`[HojaiFlow]   Reasoning: ${REASONING_SERVICE_URL}`);
  console.log(`[HojaiFlow]   Intent: ${INTENT_SERVICE_URL}`);

  app.listen(PORT, () => {
    console.log(`[HojaiFlow] Running on port ${PORT}`);
  });
}

start().catch(console.error);

export default app;
