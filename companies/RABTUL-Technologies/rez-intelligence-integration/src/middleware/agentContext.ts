import { Request, Response, NextFunction } from 'express';
import winston from 'winston';

export interface AgentContext {
  requestId: string;
  startTime: number;
  logger: winston.Logger;
  agentRole?: string;
  userId?: string;
  companyId?: string;
  traceId?: string;
}

export interface AgentContextRequest extends Request {
  context?: AgentContext;
}

/**
 * Middleware that enriches every request with an agent context
 * Provides request ID, timing, and logger
 */
export function agentContextMiddleware(logger: winston.Logger) {
  return (req: AgentContextRequest, res: Response, next: NextFunction) => {
    if (!req.context) {
      req.context = {
        requestId: req.headers['x-request-id'] as string || generateRequestId(),
        startTime: Date.now(),
        logger,
        agentRole: req.headers['x-agent-role'] as string,
        userId: req.headers['x-user-id'] as string,
        companyId: req.headers['x-company-id'] as string,
        traceId: req.headers['x-trace-id'] as string
      };
    }
    next();
  };
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
