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
    projectId?: string;
    brandId?: string;
    context?: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  message: string;
  agent: string;
  timestamp: number;
}

export interface BrandFoundation {
  purpose: string;
  vision: string;
  mission: string;
  values: Array<{ name: string; definition: string }>;
  personality: Array<{ trait: string; description: string }>;
  promise: string;
}

export interface VisualIdentity {
  logoSystem: {
    primary: string;
    horizontal: string;
    stacked: string;
    icon: string;
  };
  colorSystem: {
    primary: string;
    secondary: string;
    accent: string;
    neutral: string[];
  };
  typography: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface BrandGuidelines {
  foundation: BrandFoundation;
  visualIdentity: VisualIdentity;
  voice: {
    characteristics: Array<{ trait: string; description: string }>;
    tone: Record<string, string>;
    messaging: {
      tagline: string;
      valueProposition: string;
      keyMessages: string[];
    };
  };
  protection: {
    trademarkStrategy: string;
    usageGuidelines: string[];
    monitoringPlan: string;
  };
}
