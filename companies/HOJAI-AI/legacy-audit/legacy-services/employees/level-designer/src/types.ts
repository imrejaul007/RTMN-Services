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
    levelType?: string;
    genre?: string;
    platform?: string;
    context?: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  message: string;
  agent: string;
  timestamp: number;
}

export interface LevelDesignDocument {
  id: string;
  name: string;
  gameType: string;
  pacingArc: string;
  mechanicIntroduced?: string;
  narrativeBeat?: string;
  layoutSpec: LayoutSpecification;
  encounters: Encounter[];
  pacingChart: PacingBeat[];
}

export interface LayoutSpecification {
  shapeLanguage: 'linear' | 'hub' | 'open' | 'labyrinth';
  estimatedPlaytime: string;
  criticalPathLength: string;
  optionalAreas: string[];
}

export interface Encounter {
  id: string;
  type: 'ambush' | 'arena' | 'escort' | 'defense' | 'boss';
  enemyCount: number;
  tacticalOptions: string[];
  fallbackPosition: string;
}

export interface PacingBeat {
  time: string;
  activityType: string;
  tensionLevel: 'low' | 'medium' | 'high';
  notes: string;
}

export interface RoomSpec {
  id: string;
  name: string;
  dimensions: string;
  primaryFunction: 'combat' | 'traversal' | 'story' | 'reward';
  coverObjects: string[];
  lighting: string;
  entryExit: string;
  environmentalStory?: string;
}
