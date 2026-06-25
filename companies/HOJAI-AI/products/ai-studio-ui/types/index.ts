// Question types
export interface Question {
  id: number;
  text: string;
  field: string;
  type: 'text' | 'dropdown' | 'multi-select';
  required: boolean;
  placeholder?: string;
  help?: string;
  options?: QuestionOption[];
  defaultSelection?: string[];
  defaultValue?: string;
}

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
  flag?: string;
  region?: string;
}

// Interview types
export interface Interview {
  id: string;
  interviewId: string;
  state: 'started' | 'in_progress' | 'completed';
  totalQuestions: number;
  currentQuestion: Question;
  progress: {
    current: number;
    total: number;
    percentage?: number;
  };
  message?: string;
}

export interface InterviewState {
  interviewId: string | null;
  idea: string;
  currentQuestionId: number;
  answers: Record<string, any>;
  state: 'idle' | 'active' | 'complete';
  blueprint: CompanyBlueprint | null;
  isLoading: boolean;
  error: string | null;
}

// Blueprint types
export interface CompanyBlueprint {
  id: string;
  interviewId: string;
  createdAt: string;
  status: 'draft' | 'approved' | 'compiled' | 'deployed';
  version: string;
  idea: string;
  config: BlueprintConfig;
  apps: BlueprintApps;
  agents: BlueprintAgent[];
  integrations: string[];
  nextSteps: NextStep[];
  metadata: Record<string, any>;
}

export interface BlueprintConfig {
  name: string;
  slug: string;
  type: string;
  regions: string[];
  languages: string[];
  currency: string;
  marketSize: string;
  commerce: boolean;
  commerceType?: string;
  platforms: string[];
  federation: boolean;
  compliance: string[];
  industries?: string[];
}

export interface BlueprintApps {
  buyerPortal: boolean;
  sellerPortal: boolean;
  adminDashboard: boolean;
  mobileApp: boolean;
}

export interface BlueprintAgent {
  key: string;
  name: string;
  type: string;
  description: string;
  capabilities: string[];
  role: string;
}

export interface NextStep {
  step: number;
  action: string;
  description: string;
  estimatedTime: string;
  icon: string;
}

// Compile types
export interface CompileJob {
  jobId: string;
  projectId: string;
  state: 'pending' | 'compiling' | 'compiling_done' | 'deploying' | 'done' | 'failed';
  progress: number;
  progressMessage: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  deployResult?: DeployResult;
  error?: string;
}

export interface DeployResult {
  projectId: string;
  deploymentId: string;
  url: string;
  status: string;
  port: number;
  deployedAt: string;
}
