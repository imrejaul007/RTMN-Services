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
    projectId?: string;
    researchType?: 'interview' | 'survey' | 'usability' | 'analytics';
    context?: Record<string, unknown>;
  };
}

export interface ChatResponse {
  id: string;
  message: string;
  researchStudy?: ResearchStudy;
  persona?: UserPersona;
  usabilityTest?: UsabilityTest;
  recommendations?: Recommendation[];
  agent: string;
  timestamp: number;
}

export interface ResearchStudy {
  objectives: {
    primaryQuestions: string[];
    successMetrics: string[];
    businessImpact: string;
  };
  methodology: {
    type: string;
    methods: string[];
    rationale: string;
  };
  participants: {
    criteria: string;
    sampleSize: number;
    recruitment: string;
    screening: string;
  };
  studyProtocol: {
    timeline: string;
    materials: string[];
    dataCollection: string;
    analysisPlan: string;
  };
}

export interface UserPersona {
  name: string;
  demographics: {
    ageRange: string;
    location: string;
    occupation: string;
    techProficiency: string;
    devicePreferences: string[];
  };
  behavioral: {
    usageFrequency: string;
    taskPriorities: string[];
    decisionFactors: string[];
    painPoints: string[];
    motivations: string[];
  };
  goals: {
    primary: string[];
    secondary: string[];
    successCriteria: string;
    informationNeeds: string[];
  };
  context: {
    environment: string;
    timeConstraints: string;
    distractions: string[];
    socialContext: string;
  };
  quotes: string[];
}

export interface UsabilityTest {
  preTest: {
    environment: string;
    technology: string[];
    materials: string[];
    teamRoles: string[];
  };
  sessionStructure: {
    introduction: string;
    baselineQuestions: string;
    tasks: TaskScenario[];
    postTestInterview: string;
  };
  dataCollection: {
    quantitative: string[];
    qualitative: string[];
    systemMetrics: string[];
  };
}

export interface TaskScenario {
  name: string;
  description: string;
  successCriteria: string;
  metrics: string[];
  observationFocus: string[];
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  effort: string;
  successMetric: string;
}
