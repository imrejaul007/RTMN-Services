/**
 * Chat routes for API Tester
 */

import { Router, Request, Response } from 'express';
import { persona } from '../persona';

export const chatRouter = Router();

// Session store
const sessions = new Map<string, { messages: any[], createdAt: Date }>();

chatRouter.post('/', async (req: Request, res: Response) => {
  const { message, sessionId, context } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Get or create session
  const sid = sessionId || `session-${Date.now()}`;
  if (!sessions.has(sid)) {
    sessions.set(sid, { messages: [], createdAt: new Date() });
  }

  const session = sessions.get(sid)!;

  // Add user message
  session.messages.push({
    role: 'user',
    content: message,
    timestamp: new Date()
  });

  // Build context for response
  const contextStr = context ? JSON.stringify(context) : '';

  // Generate response based on persona
  const response = generateResponse(message, session.messages, persona, contextStr);

  // Add assistant response
  session.messages.push({
    role: 'assistant',
    content: response,
    timestamp: new Date()
  });

  res.json({
    response,
    sessionId: sid,
    metadata: {
      agent: persona.name,
      title: persona.title,
      timestamp: new Date().toISOString()
    }
  });
});

chatRouter.get('/sessions/:sessionId', (req: Request, res: Response) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json({ sessionId: req.params.sessionId, ...session });
});

function generateResponse(
  userMessage: string,
  history: { role: string; content: string }[],
  p: typeof persona,
  context: string
): string {
  const msg = userMessage.toLowerCase();

  // Context-aware response generation based on persona
  // This is a simplified version - in production, this would call an LLM

  if (msg.includes('help') || msg.includes('what can you do')) {
    return `🔌 I'm ${p.title}!

I can help you with:
• Answering questions related to my domain expertise
• Analyzing and providing insights
• Guiding you through workflows
• Providing recommendations

What would you like help with?`;
  }

  if (msg.includes('about') || msg.includes('who are you')) {
    return `🔌 ${p.identity.split('.')[0]}.

${p.mission}`;
  }

  // Default contextual response
  return `I understand you're asking about: "${userMessage}"

As ${p.title}, I can help provide insights and guidance on this topic based on my expertise. Could you provide more details about what specific aspect you'd like to explore?`;
}
