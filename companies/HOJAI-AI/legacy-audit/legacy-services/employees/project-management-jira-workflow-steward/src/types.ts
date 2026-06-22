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
    jiraTicket?: string;
    changeType?: 'feature' | 'bugfix' | 'hotfix' | 'refactor' | 'docs' | 'tests' | 'config' | 'dependencies';
    context?: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  message: string;
  branchName?: string;
  commitMessages?: string[];
  prTemplate?: PRTemplate;
  deliveryPacket?: DeliveryPacket;
  validationHook?: string;
  agent: string;
  timestamp: number;
}

export interface BranchCommitPattern {
  changeType: string;
  branchPattern: string;
  commitPattern: string;
  gitmoji: string;
}

export interface PRTemplate {
  title: string;
  what: string;
  jiraLink: string;
  changeSummary: string[];
  riskReview: RiskReview;
  testing: TestingStatus;
}

export interface RiskReview {
  authTouched: boolean;
  secretHandling: boolean;
  rollbackPlan: string;
}

export interface TestingStatus {
  unitTests: string;
  integrationTests: string;
  manualVerification: string;
}

export interface DeliveryPacket {
  ticket: string;
  outcome: string;
  branch: string;
  commits: string[];
  reviewNotes: ReviewNotes;
}

export interface ReviewNotes {
  riskArea: string;
  securityCheck: string;
  rollback: string;
}

export interface CommitValidationHook {
  script: string;
  branchRegex: string;
  commitRegex: string;
}
