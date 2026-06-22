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
    type?: 'image' | 'video';
    platform?: string;
    context?: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  message: string;
  inclusivePrompt?: InclusivePrompt;
  negativePrompts?: string[];
  qaChecklist?: string[];
  agent: string;
  timestamp: number;
}

export interface InclusivePrompt {
  subject: string;
  subActions: string;
  context: string;
  camera: string;
  physics: string;
  colorGrade: string;
  exclusions: string;
  fullPrompt: string;
}

export interface QA Checklist {
  check: string;
  passed: boolean;
  notes?: string;
}
