/**
 * HOJAI Engineering Agent - Chat Routes
 * Embedded Firmware Engineer
 * Version: 1.0.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ChatRequestSchema, ChatResponse } from '../types.js';
import { persona } from '../persona.js';

const router = Router();

const SERVICE_NAME = 'embedded-firmware-engineer';

// Helper to generate request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// Async handler wrapper
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// POST /api/chat - Main chat endpoint
router.post(
  '/chat',
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    const requestId = generateRequestId();

    // Validate request
    const parseResult = ChatRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json<ChatResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          agent: SERVICE_NAME,
        },
      });
      return;
    }

    const { message, context, temperature, maxTokens } = parseResult.data;

    console.log(`[${SERVICE_NAME}] Processing chat request: ${message.substring(0, 100)}...`);

    // Build the response using persona
    // In production, this would call an LLM API
    const responseContent = await generateResponse(message, context, persona);

    const responseTimeMs = Date.now() - startTime;

    res.json<ChatResponse>({
      success: true,
      data: {
        content: responseContent,
        usage: {
          promptTokens: Math.ceil(message.length / 4),
          completionTokens: Math.ceil(responseContent.length / 4),
          totalTokens: Math.ceil((message.length + responseContent.length) / 4),
        },
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        agent: SERVICE_NAME,
        responseTimeMs,
      },
    });
  })
);

// GET /api/chat/persona - Get agent persona
router.get('/chat/persona', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      name: persona.identity.name,
      role: persona.identity.role,
      vibe: persona.vibe,
      emoji: persona.emoji,
    },
    meta: {
      requestId: generateRequestId(),
      timestamp: new Date().toISOString(),
      agent: SERVICE_NAME,
    },
  });
});

// GET /api/chat/system-prompt - Get system prompt
router.get('/chat/system-prompt', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      systemPrompt: persona.systemPrompt,
    },
    meta: {
      requestId: generateRequestId(),
      timestamp: new Date().toISOString(),
      agent: SERVICE_NAME,
    },
  });
});

/**
 * Generate response based on message and persona
 * In production, this would integrate with an LLM API
 */
async function generateResponse(
  message: string,
  context: Record<string, unknown> | undefined,
  personaData: typeof persona
): Promise<string> {
  // This is a placeholder implementation
  // In production, you would call an LLM API here

  const greeting = message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi');
  if (greeting) {
    return `Hello! I'm ${personaData.identity.name}, ${personaData.identity.role}.

${personaData.vibe ? `"${personaData.vibe}"\n\n` : ''}How can I help you with your engineering task today?`;
  }

  // Default response with persona context
  return `${personaData.identity.name} here, ${personaData.identity.role}.

I've received your message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"

${personaData.coreMission?.primary?.[0] ? `My focus is on: ${personaData.coreMission.primary[0]}` : ''}

As an expert in this domain, I'm ready to help you with:
- Technical guidance and best practices
- Code review and optimization
- Architecture and design decisions
- Problem-solving and troubleshooting

What specific aspect can I assist you with?`;
}

export default router;
