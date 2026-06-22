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
    deliverable?: 'prd' | 'roadmap' | 'opportunity' | 'gtm' | 'sprint-health';
    phase?: 'discovery' | 'framing' | 'definition' | 'delivery' | 'launch' | 'measurement';
    context?: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  message: string;
  deliverable?: ProductDeliverable;
  prd?: PRD;
  roadmap?: ProductRoadmap;
  opportunity?: OpportunityAssessment;
  gtm?: GTMPlan;
  sprintHealth?: SprintHealth;
  agent: string;
  timestamp: number;
}

export interface ProductDeliverable {
  type: 'prd' | 'roadmap' | 'opportunity' | 'gtm' | 'sprint-health';
  status: 'draft' | 'in-review' | 'approved' | 'in-development' | 'shipped';
  author: string;
  lastUpdated: string;
  version: string;
}

export interface PRD {
  status: string;
  author: string;
  lastUpdated: string;
  version: string;
  stakeholders: string[];
  problemStatement: string;
  evidence: Evidence;
  goals: Goal[];
  nonGoals: string[];
  personas: UserPersona[];
  solutionOverview: string;
  keyDecisions: KeyDecision[];
  technicalConsiderations: TechnicalConsideration;
  launchPlan: LaunchPhase[];
  rollbackCriteria: string;
  appendix: string[];
}

export interface Evidence {
  userResearch?: string;
  behavioralData?: string;
  supportSignal?: string;
  competitiveSignal?: string;
}

export interface Goal {
  goal: string;
  metric: string;
  baseline: string;
  target: string;
  measurementWindow: string;
}

export interface UserPersona {
  name: string;
  context: string;
  stories: UserStory[];
}

export interface UserStory {
  asA: string;
  iWant: string;
  soThat: string;
  acceptanceCriteria: string[];
}

export interface KeyDecision {
  decision: string;
  approach: string;
  tradeOff: string;
}

export interface TechnicalConsideration {
  dependencies: Dependency[];
  knownRisks: Risk[];
  openQuestions: OpenQuestion[];
}

export interface Dependency {
  system: string;
  reason: string;
  owner: string;
  timelineRisk: 'High' | 'Medium' | 'Low';
}

export interface Risk {
  risk: string;
  likelihood: 'High' | 'Medium' | 'Low';
  impact: 'High' | 'Medium' | 'Low';
  mitigation: string;
}

export interface OpenQuestion {
  question: string;
  owner: string;
  deadline: string;
}

export interface LaunchPhase {
  phase: string;
  date: string;
  audience: string;
  successGate: string;
}

export interface ProductRoadmap {
  team: string;
  period: string;
  northStarMetric: {
    metric: string;
    current: string;
    target: string;
  };
  supportingMetrics: Metric[];
  now: RoadmapItem[];
  next: RoadmapItem[];
  later: RoadmapItem[];
  notBuilding: NotBuildingItem[];
}

export interface Metric {
  metric: string;
  current: string;
  target: string;
  trend: 'up' | 'down' | 'stable';
}

export interface RoadmapItem {
  initiative: string;
  problem?: string;
  hypothesis?: string;
  successMetric?: string;
  owner: string;
  status?: string;
  eta?: string;
  confidence?: string;
  blocker?: string;
}

export interface NotBuildingItem {
  request: string;
  source: string;
  reason: string;
  revisitCondition: string;
}

export interface OpportunityAssessment {
  submittedBy: string;
  date: string;
  decisionNeededBy: string;
  whyNow: string;
  userEvidence: UserEvidence;
  businessCase: BusinessCase;
  riceScore: RICEScore;
  options: Option[];
  recommendation: {
    decision: 'Build' | 'Explore further' | 'Defer' | 'Kill';
    rationale: string;
    nextStep: string;
    owner: string;
  };
}

export interface UserEvidence {
  interviews: string[];
  behavioralData: string[];
  supportSignal: string[];
}

export interface BusinessCase {
  revenueImpact: string;
  costImpact: string;
  strategicFit: string;
  marketSizing: string;
}

export interface RICEScore {
  reach: number;
  impact: number;
  confidence: number;
  effort: number;
  score: number;
}

export interface Option {
  name: string;
  pros: string;
  cons: string;
  effort: string;
}

export interface GTMPlan {
  launchDate: string;
  launchTier: '1' | '2' | '3';
  pmOwner: string;
  marketingDRI: string;
  engDRI: string;
  whatWeAreLaunching: string;
  targetAudience: TargetSegment[];
  valueProposition: ValueProposition;
  checklist: GTMChecklist;
  successCriteria: SuccessCriterion[];
  rollbackPlan: string;
}

export interface TargetSegment {
  segment: string;
  size: string;
  whyTheyCare: string;
  channel: string;
}

export interface ValueProposition {
  oneLiner: string;
  messaging: Messaging[];
}

export interface Messaging {
  audience: string;
  painLanguage: string;
  message: string;
  proofPoint: string;
}

export interface GTMChecklist {
  engineering: string[];
  product: string[];
  marketing: string[];
  salesCS: string[];
}

export interface SuccessCriterion {
  timeframe: string;
  metric: string;
  target: string;
  owner: string;
}

export interface SprintHealth {
  sprintNumber: number;
  dates: string;
  velocity: {
    committed: number;
    delivered: number;
    completion: number;
    rollingAvg: number;
  };
  stories: Story[];
  blockers: Blocker[];
  scopeChanges: ScopeChange[];
  risks: Risk[];
}

export interface Story {
  name: string;
  points: number;
  status: 'done' | 'in-review' | 'carried';
  blocker?: string;
}

export interface Blocker {
  blocker: string;
  impact: string;
  owner: string;
  eta: string;
}

export interface ScopeChange {
  request: string;
  source: string;
  decision: 'Accept' | 'Defer';
  rationale: string;
}
