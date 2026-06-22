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
    platform?: 'instagram' | 'youtube' | 'tiktok' | 'linkedin' | 'website';
    format?: 'video' | 'image' | 'infographic' | 'interactive';
    context?: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  message: string;
  visualNarrative?: VisualNarrative;
  storyboard?: Storyboard;
  multimediaSpec?: MultimediaSpec;
  platformStrategy?: PlatformStrategy;
  agent: string;
  timestamp: number;
}

export interface VisualNarrative {
  storyArc: {
    beginning: string;
    middle: string;
    end: string;
  };
  protagonist: string;
  conflict: string;
  resolution: string;
  emotionalJourney: string[];
}

export interface Storyboard {
  scenes: StoryboardScene[];
  visualPacing: string;
  totalDuration?: string;
}

export interface StoryboardScene {
  sceneNumber: number;
  description: string;
  visuals: string;
  audio?: string;
  duration?: string;
}

export interface MultimediaSpec {
  type: string;
  contentSpecs: ContentSpec[];
  technicalRequirements: string[];
  accessibility: AccessibilitySpec;
}

export interface ContentSpec {
  element: string;
  description: string;
  placement: string;
}

export interface AccessibilitySpec {
  captions: boolean;
  altText: boolean;
  colorContrast: boolean;
}

export interface PlatformStrategy {
  platforms: PlatformSpec[];
  adaptationNotes: string[];
  crossPlatform: string;
}

export interface PlatformSpec {
  platform: string;
  format: string;
  duration?: string;
  keyFeatures: string[];
  optimizationTips: string[];
}
