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
    sprintNumber?: number;
    teamSize?: number;
    context?: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  message: string;
  sprintPlan?: SprintPlan;
  prioritization?: PrioritizationResult;
  capacity?: CapacityPlan;
  agent: string;
  timestamp: number;
}

export interface SprintPlan {
  sprintNumber: number;
  goal: string;
  duration: string;
  startDate: string;
  endDate: string;
  capacity: number;
  velocity: VelocityData;
  stories: SprintStory[];
}

export interface VelocityData {
  historicalAvg: number;
  adjustedCapacity: number;
  buffer: number;
}

export interface SprintStory {
  id: string;
  title: string;
  points: number;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  assignee: string;
  dependencies: string[];
}

export interface PrioritizationResult {
  framework: 'RICE' | 'MoSCoW' | 'Kano' | 'ValueEffort';
  items: PrioritizedItem[];
  rationale: string;
}

export interface PrioritizedItem {
  id: string;
  title: string;
  score: number;
  rank: number;
  reach?: number;
  impact?: number;
  confidence?: number;
  effort?: number;
  category?: 'Must-Have' | 'Should-Have' | 'Could-Have' | 'Won\'t-Have';
}

export interface CapacityPlan {
  teamCapacity: number;
  availableDays: number;
  vacation: number;
  meetings: number;
  netCapacity: number;
  buffer: number;
  effectiveCapacity: number;
  assignments: TeamAssignment[];
}

export interface TeamAssignment {
  member: string;
  role: string;
  capacity: number;
  allocation: string;
}
