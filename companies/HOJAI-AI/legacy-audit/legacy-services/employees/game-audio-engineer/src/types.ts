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
    engine?: 'unity' | 'unreal' | 'godot';
    middleware?: 'fmod' | 'wwise' | 'native';
    context?: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  message: string;
  agent: string;
  timestamp: number;
}

export interface AudioEvent {
  id: string;
  name: string;
  path: string;
  category: string;
  type: 'sfx' | 'music' | 'voice' | 'ambience';
  platform?: string;
  parameters?: AudioParameter[];
}

export interface AudioParameter {
  name: string;
  type: 'float' | 'int' | 'bool';
  min: number;
  max: number;
  default: number;
  description: string;
}

export interface AudioBudget {
  platform: string;
  voiceCount: {
    max: number;
    virtual: number;
  };
  memory: {
    category: string;
    budgetMB: number;
    format: string;
    policy: string;
  }[];
  cpuBudgetMs: number;
}

export interface MusicState {
  name: string;
  intensity: number;
  layers: string[];
  transitionTime: number;
  loop: boolean;
}

export interface SpatialAudioConfig {
  minDistance: number;
  maxDistance: number;
  rolloff: 'linear' | 'logarithmic';
  occlusionEnabled: boolean;
  reverbZone?: 'outdoor' | 'indoor' | 'cave' | 'metal';
}
