export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  metadata?: Record<string, unknown>;
}

export interface ChatResponse {
  id: string;
  message: string;
  agent: string;
  timestamp: number;
}
