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
    brandId?: string;
    context?: 'professional' | 'casual' | 'error' | 'success';
    contextType?: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  message: string;
  personalityFramework?: PersonalityFramework;
  microInteractions?: MicroInteraction[];
  microcopy?: Microcopy;
  gamification?: GamificationSpec;
  agent: string;
  timestamp: number;
}

export interface PersonalityFramework {
  spectrum: {
    professional: string;
    casual: string;
    error: string;
    success: string;
  };
  taxonomy: {
    subtle: WhimsyType[];
    interactive: WhimsyType[];
    discovery: WhimsyType[];
    contextual: WhimsyType[];
  };
  characterGuidelines: {
    voice: string;
    visual: string;
    interaction: string;
    cultural: string;
  };
}

export interface WhimsyType {
  name: string;
  description: string;
  examples: string[];
  css?: string;
}

export interface MicroInteraction {
  name: string;
  trigger: string;
  animation: string;
  css: string;
}

export interface Microcopy {
  errors: Record<string, string>;
  loading: Record<string, string>;
  success: Record<string, string>;
  empty: Record<string, string>;
  buttons: Record<string, string>;
}

export interface GamificationSpec {
  achievements: Achievement[];
  easterEggs: EasterEgg[];
  celebrations: Celebration[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  celebration: string;
}

export interface EasterEgg {
  trigger: string;
  action: string;
  message: string;
}

export interface Celebration {
  type: string;
  animation: string;
  duration: number;
}
