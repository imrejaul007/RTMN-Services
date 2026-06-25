/**
 * AgentOS SDK — Custom error classes.
 */

export class AgentOSError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AgentOSError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AgentNotFoundError extends AgentOSError {
  constructor(agentId: string) {
    super(`Agent not found: ${agentId}`, 'AGENT_NOT_FOUND', 404);
  }
}

export class AgentValidationError extends AgentOSError {
  constructor(details: string | string[]) {
    const msgs = Array.isArray(details) ? details.join('; ') : details;
    super(`Validation failed: ${msgs}`, 'VALIDATION_ERROR', 400);
  }
}

export class AgentConflictError extends AgentOSError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

export class AgentLifecycleError extends AgentOSError {
  constructor(agentId: string, action: string, reason?: string) {
    super(
      `Cannot ${action} agent ${agentId}${reason ? `: ${reason}` : ''}`,
      'LIFECYCLE_ERROR',
      422
    );
  }
}

export class AgentTimeoutError extends AgentOSError {
  constructor(agentId: string, timeoutMs: number) {
    super(
      `Agent ${agentId} heartbeat timeout after ${timeoutMs}ms`,
      'TIMEOUT',
      408
    );
  }
}

export class AgentOSConnectionError extends AgentOSError {
  constructor(serviceUrl: string, cause?: Error) {
    super(
      `Cannot connect to AgentOS at ${serviceUrl}`,
      'CONNECTION_ERROR',
      undefined,
      cause?.message
    );
    this.name = 'AgentOSConnectionError';
  }
}
