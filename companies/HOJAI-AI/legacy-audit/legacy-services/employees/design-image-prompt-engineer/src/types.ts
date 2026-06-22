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
    platform?: 'midjourney' | 'dalle' | 'stable-diffusion' | 'flux';
    aspectRatio?: string;
    style?: string;
    context?: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  message: string;
  prompt?: GeneratedPrompt;
  agent: string;
  timestamp: number;
}

export interface GeneratedPrompt {
  subject: string;
  environment: string;
  lighting: string;
  technical: string;
  style: string;
  negativePrompt?: string;
  platform: string;
  fullPrompt: string;
}

export interface PromptTemplate {
  genre: 'portrait' | 'product' | 'landscape' | 'fashion' | 'architectural' | 'editorial';
  subject: string;
  environment: string;
  lighting: string;
  camera: string;
  style: string;
}
