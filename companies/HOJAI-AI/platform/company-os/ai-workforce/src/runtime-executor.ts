/**
 * AI Workforce Runtime Executor
 *
 * This module provides the runtime execution engine for AI workers.
 * It connects to LLM services (Claude, GPT-4, etc.) to execute tasks.
 */

import { AIWorker, Task, TaskResult, WorkerCapability, ExecutionContext } from './types.js';

// LLM Service Configuration
export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'local';
  apiKey?: string;
  baseUrl?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

// Default LLM Configuration
const DEFAULT_CONFIG: LLMConfig = {
  provider: process.env.LLM_PROVIDER as LLMConfig['provider'] || 'anthropic',
  apiKey: process.env.LLM_API_KEY,
  baseUrl: process.env.LLM_BASE_URL,
  model: process.env.LLM_MODEL || 'claude-3-5-sonnet-20241022',
  maxTokens: 4096,
  temperature: 0.7,
};

// ============================================
// AI Worker Executor
// ============================================

export class AIWorkerExecutor {
  private llmConfig: LLMConfig;
  private workerRegistry: Map<string, AIWorker>;
  private executionHistory: Map<string, TaskResult[]>;

  constructor(config: Partial<LLMConfig> = {}) {
    this.llmConfig = { ...DEFAULT_CONFIG, ...config };
    this.workerRegistry = new Map();
    this.executionHistory = new Map();
  }

  /**
   * Register a worker
   */
  registerWorker(worker: AIWorker): void {
    this.workerRegistry.set(worker.id, worker);
    this.executionHistory.set(worker.id, []);
  }

  /**
   * Execute a task with a specific worker
   */
  async executeTask(
    workerId: string,
    task: Task,
    context: ExecutionContext
  ): Promise<TaskResult> {
    const worker = this.workerRegistry.get(workerId);

    if (!worker) {
      return {
        success: false,
        output: null,
        error: `Worker ${workerId} not found`,
        executionTime: 0,
        tokensUsed: 0,
      };
    }

    const startTime = Date.now();

    try {
      // Build the prompt based on worker capabilities and task
      const prompt = this.buildPrompt(worker, task, context);

      // Call LLM
      const response = await this.callLLM(prompt, context);

      // Calculate execution metrics
      const executionTime = Date.now() - startTime;

      const result: TaskResult = {
        success: true,
        output: response,
        error: null,
        executionTime,
        tokensUsed: this.estimateTokens(response),
      };

      // Store execution history
      this.addToHistory(workerId, result);

      return result;
    } catch (error: any) {
      return {
        success: false,
        output: null,
        error: error.message || 'Execution failed',
        executionTime: Date.now() - startTime,
        tokensUsed: 0,
      };
    }
  }

  /**
   * Build a prompt from worker capabilities and task
   */
  private buildPrompt(worker: AIWorker, task: Task, context: ExecutionContext): string {
    const capabilityDescriptions = worker.capabilities
      .map(c => `- ${c}: ${CAPABILITY_DESCRIPTIONS[c as CapabilityKey] || c}`)
      .join('\n');

    return `You are ${worker.name}, a ${worker.level} ${worker.department} worker.

## Your Role
${worker.description}

## Your Capabilities
${capabilityDescriptions}

## Current Task
Type: ${task.type}
Input: ${JSON.stringify(task.input, null, 2)}

## Context
Company: ${context.companyId}
Tenant: ${context.tenantId}
User: ${context.userId}

## Instructions
${task.instructions || 'Complete the task using your capabilities. Return a structured JSON response.'}

## Output Format
Return your response as a JSON object with the following structure:
{
  "result": <your response>,
  "confidence": <0-1>,
  "reasoning": <brief explanation>
}`;
  }

  /**
   * Call the configured LLM
   */
  private async callLLM(prompt: string, context: ExecutionContext): Promise<any> {
    // In production, this would make actual API calls
    // For now, return a mock response structure
    return {
      result: this.generateMockResponse(prompt),
      confidence: 0.85,
      reasoning: 'Response generated based on task analysis',
    };
  }

  /**
   * Generate mock response for testing
   */
  private generateMockResponse(prompt: string): any {
    // Parse the task type from prompt
    const taskMatch = prompt.match(/Type: (\w+)/);
    const taskType = taskMatch?.[1] || 'general';

    const mockResponses: Record<string, any> = {
      'financial_analysis': {
        analysis: 'Revenue growth: 15% YoY, Margin improvement: 2.3%',
        recommendations: ['Optimize operational costs', 'Expand into new markets'],
        riskLevel: 'medium',
      },
      'report_generation': {
        title: 'Financial Report',
        period: 'Q2 2026',
        summary: 'Strong performance across all segments',
        metrics: { revenue: '₹10.5 Cr', profit: '₹2.1 Cr', margin: '20%' },
      },
      'candidate_screening': {
        score: 85,
        recommendation: 'Strong fit',
        strengths: ['5+ years experience', 'Domain expertise', 'Leadership potential'],
        gaps: ['Limited startup experience'],
      },
      'content_generation': {
        title: 'Campaign Draft',
        content: 'Generated marketing content...',
        tone: 'Professional',
        targetAudience: 'Enterprise B2B',
      },
    };

    return mockResponses[taskType] || {
      status: 'completed',
      message: 'Task processed successfully',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Add execution result to history
   */
  private addToHistory(workerId: string, result: TaskResult): void {
    const history = this.executionHistory.get(workerId) || [];
    history.push(result);
    // Keep last 100 executions
    if (history.length > 100) {
      history.shift();
    }
    this.executionHistory.set(workerId, history);
  }

  /**
   * Get execution history for a worker
   */
  getExecutionHistory(workerId: string, limit = 10): TaskResult[] {
    const history = this.executionHistory.get(workerId) || [];
    return history.slice(-limit);
  }

  /**
   * Get worker statistics
   */
  getWorkerStats(workerId: string): {
    totalExecutions: number;
    successRate: number;
    avgExecutionTime: number;
    avgTokensUsed: number;
  } {
    const history = this.executionHistory.get(workerId) || [];

    if (history.length === 0) {
      return { totalExecutions: 0, successRate: 0, avgExecutionTime: 0, avgTokensUsed: 0 };
    }

    const successes = history.filter(r => r.success).length;
    const avgTime = history.reduce((sum, r) => sum + r.executionTime, 0) / history.length;
    const avgTokens = history.reduce((sum, r) => sum + r.tokensUsed, 0) / history.length;

    return {
      totalExecutions: history.length,
      successRate: successes / history.length,
      avgExecutionTime: avgTime,
      avgTokensUsed: avgTokens,
    };
  }
}

// ============================================
// Capability Descriptions
// ============================================

type CapabilityKey =
  | 'financial_planning'
  | 'cash_flow_optimization'
  | 'risk_management'
  | 'candidate_screening'
  | 'content_generation'
  | 'report_generation'
  | 'lead_scoring'
  | 'churn_prediction';

const CAPABILITY_DESCRIPTIONS: Record<CapabilityKey, string> = {
  financial_planning: 'Analyze financial data and create budgets',
  cash_flow_optimization: 'Manage and optimize cash flow',
  risk_management: 'Identify and mitigate financial risks',
  candidate_screening: 'Evaluate job candidates',
  content_generation: 'Generate marketing content',
  report_generation: 'Create detailed reports',
  lead_scoring: 'Score and prioritize sales leads',
  churn_prediction: 'Predict customer churn risk',
};

// ============================================
// Default Executor Instance
// ============================================

let defaultExecutor: AIWorkerExecutor | null = null;

export function getDefaultExecutor(): AIWorkerExecutor {
  if (!defaultExecutor) {
    defaultExecutor = new AIWorkerExecutor();
  }
  return defaultExecutor;
}

// ============================================
// Pre-built Worker Tasks
// ============================================

export const PRESET_TASKS = {
  financialAnalysis: (companyId: string, period: string): Task => ({
    type: 'financial_analysis',
    input: { companyId, period },
    instructions: 'Analyze financial performance and provide insights',
  }),

  candidateScreening: (candidateId: string, jobId: string): Task => ({
    type: 'candidate_screening',
    input: { candidateId, jobId },
    instructions: 'Evaluate candidate suitability for the role',
  }),

  contentGeneration: (topic: string, audience: string): Task => ({
    type: 'content_generation',
    input: { topic, audience },
    instructions: 'Generate engaging content for the specified audience',
  }),

  reportGeneration: (reportType: string, filters: any): Task => ({
    type: 'report_generation',
    input: { reportType, filters },
    instructions: 'Generate a comprehensive report based on the filters',
  }),
};

// ============================================
// Export Types
// ============================================

export type { AIWorker, Task, TaskResult, WorkerCapability, ExecutionContext } from './types.js';
export type { LLMConfig };
