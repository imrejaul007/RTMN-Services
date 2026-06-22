export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  metadata?: {
    unityVersion?: string;
    renderPipeline?: 'urp' | 'hdrp' | 'built-in';
    context?: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  message: string;
  agent: string;
  timestamp: number;
}

export interface ScriptableObjectVariable {
  name: string;
  type: 'float' | 'int' | 'bool' | 'string';
  defaultValue: any;
  category: string;
}

export interface GameEvent {
  name: string;
  description: string;
  listeners: string[];
  raisedBy: string[];
}

export interface RuntimeSet {
  name: string;
  type: string;
  items: string[];
}
