/**
 * Executive Assistant - AI-Powered Chat Endpoint
 * Version: 1.0.0 | Date: June 2, 2026
 * Purpose: Real LLM-powered conversational assistant
 */

import express, { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { BaseAgent } from './core/src/BaseAgent.js';
import { calendarTools } from './tools/calendar.js';
import { emailTools } from './tools/email.js';
import { taskTools } from './tools/tasks.js';
import { memoryTools } from './tools/memory.js';

// ============================================================================
// Agent Instance
// ============================================================================

const ASSISTANT_PROMPT = `You are Alex, an expert Executive Assistant powered by advanced AI.

You have access to powerful tools for calendar, email, task, and memory management.

Your personality:
- Professional and efficient
- Proactive in suggesting follow-ups
- Excellent at organizing complex schedules
- Remember previous conversations and context

When helping users:
1. Always confirm details before taking action on important requests
2. Suggest relevant follow-up actions
3. Maintain a calendar-aware perspective
4. Remember personal preferences using the memory tools
5. Be concise but thorough

You can help with:
- Scheduling meetings and appointments
- Drafting and sending emails
- Managing tasks and to-do lists
- Remembering important information
- Finding information from your memory
- Providing recommendations based on past interactions

Always be helpful, professional, and efficient.`;

// Create agent instance with all tools
const assistantAgent = new BaseAgent({
  name: 'Executive Assistant - Alex',
  description: 'AI-powered executive assistant for calendar, email, tasks, and memory',
  systemPrompt: ASSISTANT_PROMPT,
  llmProvider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.7,
  maxTokens: 4096,
  tools: [
    ...calendarTools,
    ...emailTools,
    ...taskTools,
    ...memoryTools,
  ],
  memoryEnabled: true,
});

// ============================================================================
// Types
// ============================================================================

interface ChatRequest {
  message: string;
  context?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
}

interface ChatResponse {
  success: boolean;
  data?: {
    content: string;
    toolCalls?: {
      name: string;
      arguments: Record<string, unknown>;
      result: unknown;
    }[];
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
  meta: {
    requestId: string;
    timestamp: string;
    agent: string;
  };
}

// ============================================================================
// Session Management
// ============================================================================

interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  lastActivity: Date;
  messageCount: number;
}

// Simple in-memory session store (use Redis in production)
const sessions: Map<string, Session> = new Map();

function getOrCreateSession(sessionId: string | undefined, userId: string): Session {
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!;
    session.lastActivity = new Date();
    return session;
  }

  const session: Session = {
    id: sessionId || uuid(),
    userId,
    createdAt: new Date(),
    lastActivity: new Date(),
    messageCount: 0,
  };
  sessions.set(session.id, session);
  return session;
}

// ============================================================================
// Router
// ============================================================================

const router = express.Router();

// ============================================================================
// Endpoints
// ============================================================================

/**
 * POST /api/ai/chat
 * Main chat endpoint for conversational AI
 */
router.post('/chat', async (req: Request, res: Response, next: NextFunction) => {
  const requestId = uuid();
  const startTime = Date.now();

  try {
    const { message, context, userId = 'anonymous', sessionId }: ChatRequest = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Message is required and must be a string',
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          agent: 'executive-assistant',
        },
      } as ChatResponse);
    }

    // Get or create session
    const session = getOrCreateSession(sessionId, userId);
    session.messageCount++;

    // Add user context
    const enrichedContext = {
      ...context,
      userId,
      sessionId: session.id,
      messageCount: session.messageCount,
    };

    // Send message to agent
    const response = await assistantAgent.chat(message, enrichedContext);

    const responseTime = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      data: {
        content: response.content,
        toolCalls: response.toolCalls?.map(tc => ({
          name: tc.name,
          arguments: tc.arguments,
          result: tc.result,
        })),
        usage: response.usage,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        agent: 'executive-assistant',
        sessionId: session.id,
        responseTimeMs: responseTime,
      },
    } as ChatResponse);
  } catch (error) {
    console.error(`[AI Assistant] Error:`, error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AGENT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to process message',
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        agent: 'executive-assistant',
      },
    } as ChatResponse);
  }
});

/**
 * POST /api/ai/clear
 * Clear conversation history
 */
router.post('/clear', async (req: Request, res: Response) => {
  const requestId = uuid();

  try {
    assistantAgent.clearHistory();

    return res.status(200).json({
      success: true,
      data: {
        message: 'Conversation history cleared',
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        agent: 'executive-assistant',
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'CLEAR_ERROR',
        message: error instanceof Error ? error.message : 'Failed to clear history',
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        agent: 'executive-assistant',
      },
    });
  }
});

/**
 * POST /api/ai/remember
 * Save a fact to memory
 */
router.post('/remember', async (req: Request, res: Response) => {
  const requestId = uuid();

  try {
    const { content, type = 'fact', category, importance = 'medium', tags } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Content is required',
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          agent: 'executive-assistant',
        },
      });
    }

    assistantAgent.remember(content, type, { category, importance, tags });

    return res.status(200).json({
      success: true,
      data: {
        message: `Saved to memory: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        agent: 'executive-assistant',
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'MEMORY_ERROR',
        message: error instanceof Error ? error.message : 'Failed to save memory',
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        agent: 'executive-assistant',
      },
    });
  }
});

/**
 * GET /api/ai/recall
 * Recall memories by query
 */
router.get('/recall', async (req: Request, res: Response) => {
  const requestId = uuid();

  try {
    const { q, limit = 10 } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Query parameter (q) is required',
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          agent: 'executive-assistant',
        },
      });
    }

    const memories = assistantAgent.recall(q);
    const limited = memories.slice(0, Number(limit));

    return res.status(200).json({
      success: true,
      data: {
        query: q,
        memories: limited.map(m => ({
          id: m.id,
          type: m.type,
          content: m.content,
          category: m.category,
          createdAt: m.createdAt,
        })),
        count: limited.length,
        total: memories.length,
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        agent: 'executive-assistant',
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'RECALL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to recall memories',
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
        agent: 'executive-assistant',
      },
    });
  }
});

/**
 * GET /api/ai/tools
 * List available tools
 */
router.get('/tools', async (_req: Request, res: Response) => {
  const requestId = uuid();

  return res.status(200).json({
    success: true,
    data: {
      tools: assistantAgent.getToolNames(),
      count: assistantAgent.hasTools() ? assistantAgent.getToolNames().length : 0,
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
      agent: 'executive-assistant',
    },
  });
});

/**
 * GET /api/ai/memory-context
 * Get current memory context
 */
router.get('/memory-context', async (_req: Request, res: Response) => {
  const requestId = uuid();

  return res.status(200).json({
    success: true,
    data: {
      context: assistantAgent.getMemoryContext(),
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
      agent: 'executive-assistant',
    },
  });
});

export default router;
export { assistantAgent };
