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
    gameType?: string;
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

export interface GameDesignDocument {
  id: string;
  name: string;
  version: string;
  gameType: string;
  genre: string;
  designPillars: string[];
  coreLoop: CoreGameplayLoop;
  mechanics: Mechanic[];
  economy?: EconomyDesign;
  onboarding: OnboardingFlow;
  createdAt: string;
  updatedAt: string;
}

export interface CoreGameplayLoop {
  momentToMoment: LoopPhase;
  sessionLoop: LoopPhase;
  longTermLoop: LoopPhase;
}

export interface LoopPhase {
  duration: string;
  action: string;
  feedback: string;
  reward: string;
  tension?: string;
  resolution?: string;
  progression?: string;
}

export interface Mechanic {
  id: string;
  name: string;
  purpose: string;
  playerFantasy: string;
  input: string;
  output: string;
  successCondition: string;
  failureState: string;
  edgeCases: string[];
  tuningLevers: TuningLever[];
  dependencies: string[];
}

export interface TuningLever {
  name: string;
  type: 'range' | 'toggle' | 'curve';
  min?: number;
  max?: number;
  default: number;
  current: number;
}

export interface EconomyDesign {
  currencies: Currency[];
  sources: EconomySource[];
  sinks: EconomySink[];
  tuningNotes: string;
}

export interface Currency {
  id: string;
  name: string;
  displayName: string;
  icon?: string;
  exchangeRate?: number;
}

export interface EconomySource {
  mechanic: string;
  amount: number;
  frequency: string;
  conditions: string[];
}

export interface EconomySink {
  mechanic: string;
  cost: number;
  frequency: string;
  conditions: string[];
}

export interface OnboardingFlow {
  phases: OnboardingPhase[];
  completionCriteria: string[];
}

export interface OnboardingPhase {
  phase: number;
  duration: string;
  goal: string;
  steps: string[];
  metrics: {
    expectedCompletionRate: number;
    expectedTimeMinutes: number;
  };
}
