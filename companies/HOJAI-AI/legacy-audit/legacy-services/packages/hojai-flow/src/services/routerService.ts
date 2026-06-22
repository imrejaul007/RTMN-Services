/**
 * Hojai Flow - Router Service
 *
 * Determines request execution path based on intent:
 * - Dictation Router
 * - Knowledge Router
 * - Workflow Router
 * - Agent Router
 * - Multi-Agent Router
 */

import { IntentType, IntentResult, intentService } from './intentService.js';
import { voiceService, VoiceService } from './voiceService.js';

export interface RouteResult {
  route: RouterType;
  executionPlan: ExecutionStep[];
  estimatedLatency: number;
  confidence: number;
}

export type RouterType = 'DICTATION' | 'KNOWLEDGE' | 'WORKFLOW' | 'AGENT' | 'MULTI_AGENT' | 'UNKNOWN';

export interface ExecutionStep {
  order: number;
  service: string;
  action: string;
  params: Record<string, unknown>;
  dependsOn: number[];
}

export interface RouterConfig {
  enableDictation: boolean;
  enableKnowledge: boolean;
  enableWorkflow: boolean;
  enableAgent: boolean;
  enableMultiAgent: boolean;
  fallbackRoute: RouterType;
}

const DEFAULT_CONFIG: RouterConfig = {
  enableDictation: true,
  enableKnowledge: true,
  enableWorkflow: true,
  enableAgent: true,
  enableMultiAgent: true,
  fallbackRoute: 'UNKNOWN',
};

// Dictation router handlers
const DICTATION_ACTIONS = {
  write_email: { service: 'email', action: 'compose' },
  write_message: { service: 'messaging', action: 'compose' },
  create_note: { service: 'notes', action: 'create' },
  create_document: { service: 'documents', action: 'create' },
};

// Knowledge router handlers
const KNOWLEDGE_ACTIONS = {
  lookup_record: { service: 'crm', action: 'lookup' },
  search: { service: 'search', action: 'query' },
  get_details: { service: 'crm', action: 'get' },
  check_status: { service: 'crm', action: 'status' },
};

// Workflow router handlers
const WORKFLOW_ACTIONS = {
  run_workflow: { service: 'workflow', action: 'execute' },
  create_campaign: { service: 'marketing', action: 'createCampaign' },
  generate_report: { service: 'analytics', action: 'generate' },
  schedule_report: { service: 'analytics', action: 'schedule' },
};

// Agent router handlers
const AGENT_ACTIONS = {
  assign_to_agent: { service: 'agent', action: 'assign' },
  follow_up: { service: 'sales_agent', action: 'followUp' },
  handle_support: { service: 'support_agent', action: 'handle' },
  call_customer: { service: 'voice_agent', action: 'call' },
};

// Multi-agent router handlers
const MULTI_AGENT_ACTIONS = {
  coordinate_team: { service: 'orchestrator', action: 'coordinate' },
  full_review: { service: 'review_agent', action: 'review' },
  hiring_plan: { service: 'hr_agent', action: 'plan' },
  payroll_analysis: { service: 'finance_agent', action: 'analyze' },
};

export class RouterService {
  private config: RouterConfig;

  constructor(config?: Partial<RouterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Route a request to the appropriate handler
   */
  async route(
    input: string | { transcript: string; audio?: Buffer },
    context?: Record<string, unknown>
  ): Promise<RouteResult> {
    // Extract text from input
    let text: string;
    if (typeof input === 'string') {
      text = input;
    } else {
      text = input.transcript;
      // Process audio if provided
      if (input.audio) {
        await this.processAudio(input.audio);
      }
    }

    // Detect intent
    const intent = intentService.detect(text, context);

    // Map intent to router
    const routerType = this.mapIntentToRouter(intent.type);

    // Generate execution plan
    const executionPlan = this.generateExecutionPlan(routerType, intent, context);

    // Estimate latency
    const estimatedLatency = this.estimateLatency(routerType, executionPlan);

    return {
      route: routerType,
      executionPlan,
      estimatedLatency,
      confidence: intent.confidence,
    };
  }

  /**
   * Map intent type to router type
   */
  private mapIntentToRouter(intentType: IntentType): RouterType {
    switch (intentType) {
      case IntentType.DICTATION:
        return 'DICTATION';
      case IntentType.QUERY:
        return 'KNOWLEDGE';
      case IntentType.ACTION:
        return 'KNOWLEDGE';
      case IntentType.WORKFLOW:
        return 'WORKFLOW';
      case IntentType.AGENT:
        return 'AGENT';
      case IntentType.MULTI_AGENT:
        return 'MULTI_AGENT';
      default:
        return 'UNKNOWN';
    }
  }

  /**
   * Generate execution plan
   */
  private generateExecutionPlan(
    routerType: RouterType,
    intent: IntentResult,
    context?: Record<string, unknown>
  ): ExecutionStep[] {
    const steps: ExecutionStep[] = [];

    switch (routerType) {
      case 'DICTATION':
        steps.push(...this.generateDictationPlan(intent, context));
        break;
      case 'KNOWLEDGE':
        steps.push(...this.generateKnowledgePlan(intent, context));
        break;
      case 'WORKFLOW':
        steps.push(...this.generateWorkflowPlan(intent, context));
        break;
      case 'AGENT':
        steps.push(...this.generateAgentPlan(intent, context));
        break;
      case 'MULTI_AGENT':
        steps.push(...this.generateMultiAgentPlan(intent, context));
        break;
      default:
        steps.push({
          order: 1,
          service: 'clarification',
          action: 'ask',
          params: { originalInput: intent },
          dependsOn: [],
        });
    }

    return steps;
  }

  /**
   * Generate dictation execution plan
   */
  private generateDictationPlan(
    intent: IntentResult,
    context?: Record<string, unknown>
  ): ExecutionStep[] {
    const steps: ExecutionStep[] = [];

    // Step 1: Get user style/preferences
    steps.push({
      order: 1,
      service: 'memory',
      action: 'getStyle',
      params: { userId: context?.userId },
      dependsOn: [],
    });

    // Step 2: Get context (recent conversations, etc.)
    steps.push({
      order: 2,
      service: 'memory',
      action: 'getContext',
      params: { userId: context?.userId },
      dependsOn: [1],
    });

    // Step 3: Open editor with context
    const suggestedAction = intent.suggestedAction || 'create_note';
    const dictationAction = DICTATION_ACTIONS[suggestedAction as keyof typeof DICTATION_ACTIONS];

    steps.push({
      order: 3,
      service: dictationAction?.service || 'notes',
      action: dictationAction?.action || 'create',
      params: { entities: intent.entities },
      dependsOn: [2],
    });

    return steps;
  }

  /**
   * Generate knowledge execution plan
   */
  private generateKnowledgePlan(
    intent: IntentResult,
    context?: Record<string, unknown>
  ): ExecutionStep[] {
    const steps: ExecutionStep[] = [];

    // Step 1: Check memory for relevant context
    steps.push({
      order: 1,
      service: 'memory',
      action: 'retrieve',
      params: {
        userId: context?.userId,
        type: intent.suggestedAction?.includes('customer') ? 'customer' : 'general',
      },
      dependsOn: [],
    });

    // Step 2: Query knowledge base
    steps.push({
      order: 2,
      service: 'knowledge',
      action: 'query',
      params: {
        text: intent.entities,
        filters: context,
      },
      dependsOn: [1],
    });

    // Step 3: Fetch record if needed
    if (intent.suggestedAction === 'lookup_record') {
      steps.push({
        order: 3,
        service: 'crm',
        action: 'lookup',
        params: { entities: intent.entities },
        dependsOn: [2],
      });
    }

    return steps;
  }

  /**
   * Generate workflow execution plan
   */
  private generateWorkflowPlan(
    intent: IntentResult,
    context?: Record<string, unknown>
  ): ExecutionStep[] {
    const steps: ExecutionStep[] = [];

    // Step 1: Find matching workflow
    steps.push({
      order: 1,
      service: 'workflow',
      action: 'find',
      params: { intent: intent.suggestedAction },
      dependsOn: [],
    });

    // Step 2: Prepare input parameters
    steps.push({
      order: 2,
      service: 'workflow',
      action: 'prepareInput',
      params: { entities: intent.entities },
      dependsOn: [1],
    });

    // Step 3: Execute workflow
    const workflowAction = WORKFLOW_ACTIONS[intent.suggestedAction as keyof typeof WORKFLOW_ACTIONS];
    steps.push({
      order: 3,
      service: workflowAction?.service || 'workflow',
      action: workflowAction?.action || 'execute',
      params: { entities: intent.entities },
      dependsOn: [2],
    });

    return steps;
  }

  /**
   * Generate agent execution plan
   */
  private generateAgentPlan(
    intent: IntentResult,
    context?: Record<string, unknown>
  ): ExecutionStep[] {
    const steps: ExecutionStep[] = [];

    // Step 1: Get agent config
    steps.push({
      order: 1,
      service: 'agent',
      action: 'getConfig',
      params: { intent: intent.suggestedAction },
      dependsOn: [],
    });

    // Step 2: Prepare context
    steps.push({
      order: 2,
      service: 'memory',
      action: 'getAgentContext',
      params: { userId: context?.userId },
      dependsOn: [1],
    });

    // Step 3: Assign to agent
    const agentAction = AGENT_ACTIONS[intent.suggestedAction as keyof typeof AGENT_ACTIONS];
    steps.push({
      order: 3,
      service: agentAction?.service || 'agent',
      action: agentAction?.action || 'handle',
      params: {
        entities: intent.entities,
        context: context,
      },
      dependsOn: [2],
    });

    // Step 4: Monitor execution
    steps.push({
      order: 4,
      service: 'agent',
      action: 'monitor',
      params: {},
      dependsOn: [3],
    });

    return steps;
  }

  /**
   * Generate multi-agent execution plan
   */
  private generateMultiAgentPlan(
    intent: IntentResult,
    context?: Record<string, unknown>
  ): ExecutionStep[] {
    const steps: ExecutionStep[] = [];

    // Step 1: Orchestrate agents
    steps.push({
      order: 1,
      service: 'orchestrator',
      action: 'plan',
      params: { intent: intent.suggestedAction },
      dependsOn: [],
    });

    // Step 2: Initialize agent pool
    steps.push({
      order: 2,
      service: 'orchestrator',
      action: 'initAgents',
      params: {},
      dependsOn: [1],
    });

    // Step 3: Execute in parallel
    const multiAction = MULTI_AGENT_ACTIONS[intent.suggestedAction as keyof typeof MULTI_AGENT_ACTIONS];
    steps.push({
      order: 3,
      service: multiAction?.service || 'orchestrator',
      action: multiAction?.action || 'coordinate',
      params: {
        entities: intent.entities,
        agents: ['sales', 'support', 'analytics'],
      },
      dependsOn: [2],
    });

    // Step 4: Aggregate results
    steps.push({
      order: 4,
      service: 'orchestrator',
      action: 'aggregate',
      params: {},
      dependsOn: [3],
    });

    // Step 5: Generate report
    steps.push({
      order: 5,
      service: 'analytics',
      action: 'generateSummary',
      params: {},
      dependsOn: [4],
    });

    return steps;
  }

  /**
   * Process audio input
   */
  private async processAudio(audio: Buffer): Promise<void> {
    // Detect language
    const lang = voiceService.detectLanguage(''); // Would use actual audio
    // Would process audio through ASR
    console.log(`[Router] Processed audio in language: ${lang}`);
  }

  /**
   * Estimate execution latency
   */
  private estimateLatency(routerType: RouterType, steps: ExecutionStep[]): number {
    const baseLatency: Record<RouterType, number> = {
      DICTATION: 50, // Local processing
      KNOWLEDGE: 100, // Single DB query
      WORKFLOW: 200, // Workflow execution
      AGENT: 500, // Agent communication
      MULTI_AGENT: 1000, // Multi-agent coordination
      UNKNOWN: 100,
    };

    // Add latency per step
    const stepLatency = steps.reduce((sum, step) => {
      if (step.service === 'memory') return sum + 10;
      if (step.service === 'knowledge') return sum + 50;
      if (step.service === 'workflow') return sum + 100;
      if (step.service === 'agent') return sum + 200;
      return sum + 50;
    }, 0);

    return baseLatency[routerType] + stepLatency;
  }

  /**
   * Get router status
   */
  getStatus(): {
    enabledRouters: RouterType[];
    config: RouterConfig;
    stats: { routesProcessed: number; avgLatency: number };
  } {
    const enabledRouters: RouterType[] = [];
    if (this.config.enableDictation) enabledRouters.push('DICTATION');
    if (this.config.enableKnowledge) enabledRouters.push('KNOWLEDGE');
    if (this.config.enableWorkflow) enabledRouters.push('WORKFLOW');
    if (this.config.enableAgent) enabledRouters.push('AGENT');
    if (this.config.enableMultiAgent) enabledRouters.push('MULTI_AGENT');

    return {
      enabledRouters,
      config: this.config,
      stats: {
        routesProcessed: 0,
        avgLatency: 0,
      },
    };
  }
}

// Singleton export
export const routerService = new RouterService();

export default routerService;
