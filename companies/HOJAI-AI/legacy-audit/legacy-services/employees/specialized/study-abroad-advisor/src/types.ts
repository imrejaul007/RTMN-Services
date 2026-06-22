// Types for Study Abroad Advisor
export interface AgentConfig {
  name: string;
  port: number;
  category: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
  context?: Record<string, any>;
}

export interface ChatResponse {
  response: string;
  sessionId: string;
  metadata?: Record<string, any>;
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  service: string;
  port: number;
  uptime: number;
}
