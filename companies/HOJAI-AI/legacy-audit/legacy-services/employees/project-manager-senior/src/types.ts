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
    projectSlug?: string;
    specFile?: string;
    context?: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  message: string;
  taskList?: TaskList;
  recommendations?: string[];
  agent: string;
  timestamp: number;
}

export interface TaskList {
  projectName: string;
  specificationSummary: {
    originalRequirements: string[];
    technicalStack: string[];
    targetTimeline: string;
  };
  tasks: DevelopmentTask[];
  qualityRequirements: string[];
  technicalNotes: {
    developmentStack: string;
    specialInstructions: string;
    timelineExpectations: string;
  };
}

export interface DevelopmentTask {
  id: number;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  filesToCreateEdit: string[];
  reference: string;
  estimatedTime: string;
}

export interface LearningPattern {
  pattern: string;
  success: boolean;
  notes: string;
}
