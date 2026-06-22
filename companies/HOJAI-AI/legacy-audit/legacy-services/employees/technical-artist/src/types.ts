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
    platform?: 'pc' | 'console' | 'mobile';
    context?: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  message: string;
  agent: string;
  timestamp: number;
}

export interface AssetBudget {
  type: 'character' | 'prop' | 'environment';
  lodLevels: { lod: number; maxTris: number; textureRes: number }[];
}

export interface ShaderSpec {
  name: string;
  pipeline: 'urp' | 'hdrp' | 'built-in' | 'custom';
  platforms: string[];
  instructionCount?: number;
  textureSamples?: number;
  mobileVariant?: boolean;
}

export interface VFXSpec {
  name: string;
  platform: string;
  maxParticles: number;
  maxOverdrawLayers: number;
  simulationType: 'cpu' | 'gpu';
}

export interface TextureSpec {
  type: 'albedo' | 'normal' | 'roughness' | 'ao' | 'ui';
  pcCompression: string;
  mobileCompression: string;
  consoleCompression: string;
  hasMipmaps: boolean;
}
