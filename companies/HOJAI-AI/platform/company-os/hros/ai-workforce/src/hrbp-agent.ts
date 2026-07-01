/**
 * HROS AI Workforce - HR Business Partner Agent
 *
 * The AI agent that acts as HR Business Partner for employees
 *
 * Responsibilities:
 * - Employee relations
 * - Policy guidance
 * - Performance support
 * - Career development
 * - Conflict resolution
 * - Employee wellness
 */

export interface HRBPAgent {
  id: string;
  name: string;
  type: 'hrbp';
  level: 'junior' | 'mid' | 'senior' | 'principal';
  specialization: string[];
  employeeIds: string[]; // Employees this agent supports
  expertise: HRBPExpertise;
  actions: HRBPActions;
}

export interface HRBPExpertise {
  employeeRelations: boolean;
  performanceManagement: boolean;
  careerDevelopment: boolean;
  policyCompliance: boolean;
  conflictResolution: boolean;
  wellnessSupport: boolean;
  compensationGuidance: boolean;
  laborLaw: string[]; // Countries/states
}

export interface HRBPActions {
  // Employee Relations
  conduct1on1?: boolean;
  handleGrievance?: boolean;
  mediateConflict?: boolean;
  issueWarning?: boolean;
  conductExit?: boolean;

  // Performance
  initiatePIP?: boolean;
  conductReview?: boolean;
  provideCoaching?: boolean;

  // Development
  careerDiscussion?: boolean;
  createDevelopmentPlan?: boolean;
  recommendTraining?: boolean;

  // Administrative
  policyClarification?: boolean;
  accommodationRequest?: boolean;
  leaveApproval?: boolean;
}

export interface HRBPRequest {
  type: 'consultation' | 'intervention' | 'development' | 'administrative';
  employeeId: string;
  topic: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  context: {
    situation: string;
    history?: string[];
    managerInput?: string;
  };
}

export interface HRBPResponse {
  agentId: string;
  employeeId: string;
  response: {
    analysis: string;
    recommendations: string[];
    actions: {
      immediate: string[];
      shortTerm: string[];
      longTerm: string[];
    };
    resources: {
      policies: string[];
      training: string[];
      contacts: string[];
    };
    escalation?: {
      required: boolean;
      reason?: string;
      escalateTo?: string;
    };
  };
  confidence: number;
  nextSteps: {
    agent?: string; // Other agent to involve
    employee?: string; // What employee should do
    manager?: string; // What manager should do
    hr?: string; // What HR should do
  };
}

// ============================================================
// HRBP AGENT CLASS
// ============================================================

export class HRBPAgentImpl implements HRBPAgent {
  id: string;
  name: string;
  type: 'hrbp' = 'hrbp';
  level: 'junior' | 'mid' | 'senior' | 'principal';
  specialization: string[];
  employeeIds: string[];
  expertise: HRBPExpertise;
  actions: HRBPActions;

  // Memory - conversation history
  private conversationHistory: Map<string, HRBPResponse[]>();

  // Context - employee data
  private employeeContext: Map<string, any>();

  constructor(config: Partial<HRBPAgent> = {}) {
    this.id = config.id || crypto.randomUUID();
    this.name = config.name || 'HRBP Agent';
    this.level = config.level || 'mid';
    this.specialization = config.specialization || ['general'];
    this.employeeIds = config.employeeIds || [];
    this.conversationHistory = new Map();
    this.employeeContext = new Map();

    this.expertise = {
      employeeRelations: true,
      performanceManagement: true,
      careerDevelopment: true,
      policyCompliance: true,
      conflictResolution: true,
      wellnessSupport: true,
      compensationGuidance: true,
      laborLaw: ['IN', 'AE', 'US', 'SG'],
    };

    this.actions = {
      conduct1on1: true,
      handleGrievance: true,
      mediateConflict: true,
      issueWarning: true,
      conductExit: true,
      initiatePIP: this.level !== 'junior',
      conductReview: true,
      provideCoaching: true,
      careerDiscussion: true,
      createDevelopmentPlan: true,
      recommendTraining: true,
      policyClarification: true,
      accommodationRequest: true,
      leaveApproval: true,
    };
  }

  /**
   * Process HR request
   */
  async process(request: HRBPRequest): Promise<HRBPResponse> {
    // Analyze the request
    const analysis = this.analyze(request);

    // Generate response
    const response = this.generateResponse(request, analysis);

    // Store in history
    this.addToHistory(request.employeeId, response);

    return response;
  }

  /**
   * Analyze the HR situation
   */
  private analyze(request: HRBPRequest): {
    category: string;
    sentiment: 'positive' | 'neutral' | 'negative' | 'critical';
    rootCause: string[];
    risks: string[];
  } {
    const context = request.context;

    // Simple keyword-based analysis
    const sentiment = this.detectSentiment(context.situation);
    const category = this.categorize(request.topic);
    const risks = this.identifyRisks(request);
    const rootCause = this.identifyRootCause(request);

    return { category, sentiment, rootCause, risks };
  }

  /**
   * Generate HRBP response
   */
  private generateResponse(
    request: HRBPRequest,
    analysis: ReturnType<typeof this.analyze>
  ): HRBPResponse {
    const { category, sentiment, rootCause, risks } = analysis;

    // Generate recommendations based on category
    const recommendations = this.generateRecommendations(category, sentiment, analysis);

    // Determine actions
    const actions = this.determineActions(category, sentiment, analysis);

    // Check if escalation needed
    const escalation = this.checkEscalation(request, analysis);

    return {
      agentId: this.id,
      employeeId: request.employeeId,
      response: {
        analysis: this.createAnalysisNarrative(analysis),
        recommendations,
        actions,
        resources: this.suggestResources(category),
        escalation,
      },
      confidence: this.calculateConfidence(category, sentiment),
      nextSteps: this.suggestNextSteps(request, analysis),
    };
  }

  /**
   * Detect sentiment from text
   */
  private detectSentiment(text: string): 'positive' | 'neutral' | 'negative' | 'critical' {
    const lower = text.toLowerCase();

    // Critical keywords
    if (lower.includes('resign') || lower.includes('lawsuit') ||
        lower.includes('harassment') || lower.includes('fired') ||
        lower.includes('terminated')) {
      return 'critical';
    }

    // Negative keywords
    if (lower.includes('frustrated') || lower.includes('unhappy') ||
        lower.includes('problem') || lower.includes('issue') ||
        lower.includes('struggling') || lower.includes('conflict')) {
      return 'negative';
    }

    // Positive keywords
    if (lower.includes('great') || lower.includes('excellent') ||
        lower.includes('progress') || lower.includes('improving')) {
      return 'positive';
    }

    return 'neutral';
  }

  /**
   * Categorize the HR topic
   */
  private categorize(topic: string): string {
    const lower = topic.toLowerCase();

    if (lower.includes('performance') || lower.includes('review') ||
        lower.includes('pip') || lower.includes('rating')) {
      return 'performance';
    }

    if (lower.includes('leave') || lower.includes('absence') ||
        lower.includes('vacation') || lower.includes('holiday')) {
      return 'leave';
    }

    if (lower.includes('conflict') || lower.includes('mediation') ||
        lower.includes('dispute') || lower.includes('tension')) {
      return 'conflict';
    }

    if (lower.includes('career') || lower.includes('growth') ||
        lower.includes('promotion') || lower.includes('development')) {
      return 'development';
    }

    if (lower.includes('policy') || lower.includes('compliance') ||
        lower.includes('rules') || lower.includes('procedure')) {
      return 'policy';
    }

    if (lower.includes('compensation') || lower.includes('salary') ||
        lower.includes('bonus') || lower.includes('benefits')) {
      return 'compensation';
    }

    if (lower.includes('wellness') || lower.includes('stress') ||
        lower.includes('burnout') || lower.includes('mental')) {
      return 'wellness';
    }

    if (lower.includes('team') || lower.includes('manager') ||
        lower.includes('colleague') || lower.includes('coworker')) {
      return 'relationships';
    }

    return 'general';
  }

  /**
   * Identify risks
   */
  private identifyRisks(request: HRBPRequest): string[] {
    const risks: string[] = [];
    const { sentiment } = this.analyze(request.context.situation);

    if (sentiment === 'critical') {
      risks.push('Potential turnover risk');
      risks.push('Legal/compliance exposure');
      risks.push('Team impact');
    }

    if (sentiment === 'negative') {
      risks.push('Engagement decline');
      risks.push('Productivity impact');
    }

    if (request.priority === 'urgent') {
      risks.push('Requires immediate attention');
    }

    return risks;
  }

  /**
   * Identify root cause
   */
  private identifyRootCause(request: HRBPRequest): string[] {
    const causes: string[] = [];
    const topic = this.categorize(request.topic);

    // Generic root causes based on category
    switch (topic) {
      case 'performance':
        causes.push('Skill gaps');
        causes.push('Resource constraints');
        causes.push('Goal clarity issues');
        break;
      case 'conflict':
        causes.push('Communication breakdown');
        causes.push('Work style differences');
        causes.push('Unclear expectations');
        break;
      case 'development':
        causes.push('Growth opportunities unclear');
        causes.push('Skill development needs');
        break;
      case 'wellness':
        causes.push('Workload balance');
        causes.push('Personal circumstances');
        break;
      default:
        causes.push('Requires further investigation');
    }

    return causes;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    category: string,
    sentiment: string,
    analysis: any
  ): string[] {
    const recommendations: string[] = [];

    switch (category) {
      case 'performance':
        recommendations.push('Schedule 1:1 with manager');
        recommendations.push('Create performance improvement plan');
        recommendations.push('Provide coaching session');
        if (this.level === 'senior' || this.level === 'principal') {
          recommendations.push('Consider skill assessment');
        }
        break;

      case 'conflict':
        recommendations.push('Mediate conversation between parties');
        recommendations.push('Clarify roles and expectations');
        recommendations.push('Document discussion');
        break;

      case 'development':
        recommendations.push('Conduct career aspirations discussion');
        recommendations.push('Create 90-day development plan');
        recommendations.push('Identify stretch assignments');
        break;

      case 'wellness':
        recommendations.push('Refer to Employee Assistance Program (EAP)');
        recommendations.push('Discuss workload adjustments');
        recommendations.push('Schedule wellness check-in');
        break;

      case 'leave':
        recommendations.push('Review leave policy');
        recommendations.push('Process request per guidelines');
        break;

      default:
        recommendations.push('Schedule initial consultation');
        recommendations.push('Gather more context');
    }

    return recommendations;
  }

  /**
   * Determine actions
   */
  private determineActions(category: string, sentiment: string, analysis: any): {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  } {
    return {
      immediate: sentiment === 'critical'
        ? ['Contact employee within 24 hours', 'Notify manager']
        : ['Acknowledge request within 48 hours'],

      shortTerm: category === 'conflict'
        ? ['Schedule mediation within 1 week', 'Review relevant policies']
        : ['Schedule follow-up meeting', 'Create action plan'],

      longTerm: ['Track outcomes', 'Measure satisfaction', 'Adjust approach based on results'],
    };
  }

  /**
   * Check if escalation needed
   */
  private checkEscalation(request: HRBPRequest, analysis: any): HRBPResponse['response']['escalation'] {
    if (request.priority === 'urgent') {
      return {
        required: true,
        reason: 'Urgent priority requires senior HR attention',
        escalateTo: 'Senior HRBP',
      };
    }

    if (analysis.sentiment === 'critical') {
      return {
        required: true,
        reason: 'Critical situation requires leadership involvement',
        escalateTo: 'HR Director',
      };
    }

    if (this.level === 'junior' &&
        ['performance', 'conflict', 'compensation'].includes(analysis.category)) {
      return {
        required: true,
        reason: 'Requires senior HRBP involvement',
        escalateTo: 'Senior HRBP',
      };
    }

    return { required: false };
  }

  /**
   * Calculate confidence
   */
  private calculateConfidence(category: string, sentiment: string): number {
    let confidence = 70; // Base confidence

    // Increase for clear categories
    if (['performance', 'conflict', 'leave', 'wellness'].includes(category)) {
      confidence += 15;
    }

    // Decrease for critical situations
    if (sentiment === 'critical') {
      confidence -= 20;
    }

    return Math.max(30, Math.min(95, confidence));
  }

  /**
   * Create analysis narrative
   */
  private createAnalysisNarrative(analysis: any): string {
    return `Based on the consultation request:

Category: ${analysis.category}
Sentiment: ${analysis.sentiment}
Priority Risks: ${analysis.risks.join(', ') || 'None identified'}
Root Causes: ${analysis.rootCause.join(', ')}

Assessment: ${this.getAssessmentText(analysis)}`;
  }

  private getAssessmentText(analysis: any): string {
    switch (analysis.sentiment) {
      case 'critical':
        return 'This situation requires immediate attention and potential leadership involvement.';
      case 'negative':
        return 'Employee is expressing concerns that need addressing to prevent escalation.';
      case 'positive':
        return 'Employee is in a positive state - focus on sustaining and leveraging this.';
      default:
        return 'Situation requires standard HR guidance and follow-up.';
    }
  }

  /**
   * Suggest resources
   */
  private suggestResources(category: string): {
    policies: string[];
    training: string[];
    contacts: string[];
  } {
    const resources = {
      policies: ['Employee Handbook', 'Code of Conduct'],
      training: [],
      contacts: ['HR Team', 'Manager'],
    };

    switch (category) {
      case 'performance':
        resources.policies.push('Performance Management Policy');
        resources.training.push('Performance Excellence Training');
        resources.contacts.push('People Manager');
        break;
      case 'conflict':
        resources.policies.push('Grievance Policy');
        resources.training.push('Conflict Resolution Workshop');
        resources.contacts.push('Ombudsperson');
        break;
      case 'wellness':
        resources.policies.push('Wellness Policy');
        resources.training.push('Stress Management');
        resources.contacts.push('EAP Counselor');
        break;
      case 'development':
        resources.training.push('Career Development Program');
        resources.contacts.push('Learning & Development');
        break;
    }

    return resources;
  }

  /**
   * Suggest next steps
   */
  private suggestNextSteps(
    request: HRBPRequest,
    analysis: any
  ): HRBPResponse['nextSteps'] {
    return {
      agent: analysis.escalation?.required ? analysis.escalation.escalateTo : undefined,
      employee: 'Schedule meeting with HRBP',
      manager: 'Prepare context for discussion',
      hr: 'Review case file and prepare guidance',
    };
  }

  /**
   * Add to conversation history
   */
  private addToHistory(employeeId: string, response: HRBPResponse): void {
    if (!this.conversationHistory.has(employeeId)) {
      this.conversationHistory.set(employeeId, []);
    }
    this.conversationHistory.get(employeeId)!.push(response);
  }

  /**
   * Get conversation history
   */
  getHistory(employeeId: string): HRBPResponse[] {
    return this.conversationHistory.get(employeeId) || [];
  }

  /**
   * Assign employees to this agent
   */
  assignEmployees(employeeIds: string[]): void {
    this.employeeIds = [...new Set([...this.employeeIds, ...employeeIds])];
  }

  /**
   * Unassign employees
   */
  unassignEmployees(employeeIds: string[]): void {
    this.employeeIds = this.employeeIds.filter(id => !employeeIds.includes(id));
  }
}

// ============================================================
// EXAMPLE USAGE
// ============================================================

export function createHRBPAgent(config?: Partial<HRBPAgent>): HRBPAgentImpl {
  return new HRBPAgentImpl(config);
}

// Example request
const exampleRequest: HRBPRequest = {
  type: 'consultation',
  employeeId: 'EMP001',
  topic: 'Performance concerns with manager',
  priority: 'high',
  context: {
    situation: 'Employee has expressed frustration about lack of clarity on performance expectations and feels unsupported by manager. Recently missed deadlines.',
    history: ['Previous conversation about workload'],
    managerInput: 'Manager reports declining productivity',
  },
};

// Process
const agent = createHRBPAgent({
  name: 'HRBP Sarah',
  level: 'senior',
  specialization: ['engineering', 'sales'],
});

agent.process(exampleRequest).then(response => {
  console.log('HRBP Response:', JSON.stringify(response, null, 2));
});

export default HRBPAgentImpl;
