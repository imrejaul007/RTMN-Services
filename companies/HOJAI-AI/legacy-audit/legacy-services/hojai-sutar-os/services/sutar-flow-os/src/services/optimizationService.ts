/**
 * SUTAR Flow OS - Optimization Service
 * AI-powered workflow optimization and suggestions
 */

import { v4 as uuid } from 'uuid';
import { FlowDefinitionModel, FlowBottleneckModel } from '../models/index.js';
import { IFlowDefinition, IFlowBottleneck } from '../models/index.js';
import { FlowStepType, AISuggestInput, AIOptimizeInput } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('optimization-service');

interface OptimizationSuggestion {
  type: 'reduce_steps' | 'parallelize' | 'error_handling' | 'reorder' | 'cache' | 'general';
  title: string;
  description: string;
  steps: string[];
  estimatedSavings: {
    time: string;
    reliability: string;
  };
  priority: 'high' | 'medium' | 'low';
}

interface FlowOptimization {
  originalSteps: number;
  optimizedSteps: number;
  suggestions: OptimizationSuggestion[];
  estimatedImprovement: {
    timeReduction: string;
    reliabilityImprovement: string;
    complexityReduction: string;
  };
}

export const optimizationService = {
  /**
   * Get AI suggestions for workflow improvement
   */
  async getSuggestions(tenantId: string, input: AISuggestInput): Promise<{
    suggestions: Array<{
      type: string;
      title: string;
      description: string;
      estimatedSavings: string;
      confidence: number;
    }>;
  }> {
    const suggestions: Array<{
      type: string;
      title: string;
      description: string;
      estimatedSavings: string;
      confidence: number;
    }> = [];

    // If flowId provided, analyze the flow
    if (input.flowId) {
      const flow = await FlowDefinitionModel.findOne({ id: input.flowId, tenantId });
      if (flow) {
        suggestions.push(...this.analyzeFlow(flow));
      }
    }

    // If description provided, suggest automation opportunities
    if (input.description) {
      suggestions.push(...this.suggestAutomationOpportunities(input.description));
    }

    // If currentSteps provided, suggest improvements
    if (input.currentSteps && input.currentSteps.length > 0) {
      suggestions.push(...this.suggestStepImprovements(input.currentSteps));
    }

    return { suggestions };
  },

  /**
   * Analyze a flow and provide suggestions
   */
  analyzeFlow(flow: IFlowDefinition): Array<{
    type: string;
    title: string;
    description: string;
    estimatedSavings: string;
    confidence: number;
  }> {
    const suggestions: Array<{
      type: string;
      title: string;
      description: string;
      estimatedSavings: string;
      confidence: number;
    }> = [];

    // Check for missing error handling
    const stepsWithoutRetry = flow.steps.filter(
      s => s.type === FlowStepType.ACTION && (!s.retryPolicy || s.retryPolicy.maxRetries === 0)
    );
    if (stepsWithoutRetry.length > 0) {
      suggestions.push({
        type: 'error_handling',
        title: 'Add retry policies',
        description: `${stepsWithoutRetry.length} action step(s) lack retry policies. Adding retries can improve reliability by up to 40%.`,
        estimatedSavings: '40% reduction in failures',
        confidence: 0.85
      });
    }

    // Check for sequential steps that could be parallelized
    const parallelizablePairs = this.findParallelizableSteps(flow.steps);
    if (parallelizablePairs.length > 0) {
      suggestions.push({
        type: 'parallelization',
        title: 'Parallelize independent steps',
        description: `${parallelizablePairs.length} step pair(s) can run in parallel, reducing total execution time.`,
        estimatedSavings: `Up to ${(parallelizablePairs.length * 20).toFixed(0)}% time reduction`,
        confidence: 0.75
      });
    }

    // Check for redundant transforms
    const transformSteps = flow.steps.filter(s => s.type === FlowStepType.TRANSFORM);
    if (transformSteps.length > 2) {
      suggestions.push({
        type: 'optimization',
        title: 'Consolidate transform steps',
        description: `${transformSteps.length} transform steps found. Consider consolidating into fewer, more efficient transforms.`,
        estimatedSavings: '15% reduction in processing time',
        confidence: 0.7
      });
    }

    // Check for long wait steps
    const longWaits = flow.steps.filter(
      s => s.type === FlowStepType.WAIT && ((s.config as { duration?: number })?.duration || 0) > 60000
    );
    if (longWaits.length > 0) {
      suggestions.push({
        type: 'optimization',
        title: 'Optimize wait durations',
        description: `${longWaits.length} wait step(s) exceed 1 minute. Consider reducing wait times or using event-based triggers.`,
        estimatedSavings: 'Reduced latency',
        confidence: 0.6
      });
    }

    return suggestions;
  },

  /**
   * Suggest automation opportunities based on description
   */
  suggestAutomationOpportunities(description: string): Array<{
    type: string;
    title: string;
    description: string;
    estimatedSavings: string;
    confidence: number;
  }> {
    const suggestions: Array<{
      type: string;
      title: string;
      description: string;
      estimatedSavings: string;
      confidence: number;
    }> = [];

    const lowerDesc = description.toLowerCase();

    // Detect manual processes
    if (lowerDesc.includes('manual') || lowerDesc.includes('hand') || lowerDesc.includes('person')) {
      suggestions.push({
        type: 'automation',
        title: 'Automate manual process',
        description: 'The described process involves manual intervention. Workflow automation can reduce processing time by 80%.',
        estimatedSavings: '80% time reduction',
        confidence: 0.8
      });
    }

    // Detect email notifications
    if (lowerDesc.includes('email') || lowerDesc.includes('notification') || lowerDesc.includes('send')) {
      suggestions.push({
        type: 'notification',
        title: 'Automated notifications',
        description: 'Consider using automated notifications with templates for consistent communication.',
        estimatedSavings: '70% reduction in manual outreach',
        confidence: 0.75
      });
    }

    // Detect data entry
    if (lowerDesc.includes('enter') || lowerDesc.includes('input') || lowerDesc.includes('data')) {
      suggestions.push({
        type: 'data_processing',
        title: 'Automated data entry',
        description: 'Data entry tasks can be automated using form processing or API integrations.',
        estimatedSavings: '90% reduction in data entry time',
        confidence: 0.85
      });
    }

    // Detect approval workflows
    if (lowerDesc.includes('approve') || lowerDesc.includes('review') || lowerDesc.includes('sign')) {
      suggestions.push({
        type: 'approval',
        title: 'Streamline approval workflow',
        description: 'Implement conditional approval routing with escalation policies.',
        estimatedSavings: '60% faster approvals',
        confidence: 0.7
      });
    }

    // Detect reporting
    if (lowerDesc.includes('report') || lowerDesc.includes('generate') || lowerDesc.includes('extract')) {
      suggestions.push({
        type: 'reporting',
        title: 'Automated reporting',
        description: 'Schedule automated report generation with customizable templates.',
        estimatedSavings: '95% reduction in report generation time',
        confidence: 0.8
      });
    }

    return suggestions;
  },

  /**
   * Suggest improvements for steps
   */
  suggestStepImprovements(steps: unknown[]): Array<{
    type: string;
    title: string;
    description: string;
    estimatedSavings: string;
    confidence: number;
  }> {
    const suggestions: Array<{
      type: string;
      title: string;
      description: string;
      estimatedSavings: string;
      confidence: number;
    }> = [];

    // Check for too many steps
    if (steps.length > 10) {
      suggestions.push({
        type: 'optimization',
        title: 'Reduce step count',
        description: `Current flow has ${steps.length} steps. Consider breaking into sub-flows or combining related steps.`,
        estimatedSavings: '30% reduction in complexity',
        confidence: 0.7
      });
    }

    // Check for missing conditions
    const hasConditions = steps.some((s: unknown) =>
      (s as { type?: string }).type === 'condition'
    );
    if (!hasConditions && steps.length > 3) {
      suggestions.push({
        type: 'branching',
        title: 'Add conditional logic',
        description: 'Consider adding conditional branches to handle different scenarios.',
        estimatedSavings: 'Improved error handling',
        confidence: 0.65
      });
    }

    return suggestions;
  },

  /**
   * Find steps that can be parallelized
   */
  findParallelizableSteps(steps: IFlowDefinition['steps']): Array<{ step1: string; step2: string }> {
    const pairs: Array<{ step1: string; step2: string }> = [];

    for (let i = 0; i < steps.length; i++) {
      for (let j = i + 1; j < steps.length; j++) {
        const step1 = steps[i];
        const step2 = steps[j];

        // Check if step1 doesn't depend on step2's output
        const step1DependsOnStep2 = step1.nextSteps.includes(step2.id);

        // Check if step2 doesn't depend on step1's output
        const step2DependsOnStep1 = step2.nextSteps.includes(step1.id);

        if (!step1DependsOnStep2 && !step2DependsOnStep1) {
          // Check if they're not in each other's next steps
          const step1HasStep2Next = step1.nextSteps.includes(step2.id);
          const step2HasStep1Next = step2.nextSteps.includes(step1.id);

          if (!step1HasStep2Next && !step2HasStep1Next) {
            pairs.push({ step1: step1.id, step2: step2.id });
          }
        }
      }
    }

    return pairs;
  },

  /**
   * Optimize a flow
   */
  async optimizeFlow(tenantId: string, input: AIOptimizeInput): Promise<FlowOptimization> {
    const flow = await FlowDefinitionModel.findOne({ id: input.flowId, tenantId });
    if (!flow) {
      throw new Error(`Flow not found: ${input.flowId}`);
    }

    const options = input.options || {
      reduceSteps: true,
      parallelize: true,
      addErrorHandling: true,
      optimizeOrder: true,
      suggestCaching: false
    };

    const suggestions: OptimizationSuggestion[] = [];
    let optimizedSteps = [...flow.steps];

    // Reduce steps
    if (options.reduceSteps) {
      const reducibleGroups = this.findReducibleSteps(optimizedSteps);
      for (const group of reducibleGroups) {
        suggestions.push({
          type: 'reduce_steps',
          title: 'Combine redundant steps',
          description: `Steps "${group.steps.map(s => s.name).join('", "')}" can be combined into a single transform step.`,
          steps: group.steps.map(s => s.id),
          estimatedSavings: {
            time: '20% faster execution',
            reliability: 'Simplified debugging'
          },
          priority: 'high'
        });
      }
    }

    // Add error handling
    if (options.addErrorHandling) {
      const stepsNeedingRetry = optimizedSteps.filter(
        s => s.type === FlowStepType.ACTION && (!s.retryPolicy || s.retryPolicy.maxRetries === 0)
      );

      for (const step of stepsNeedingRetry) {
        suggestions.push({
          type: 'error_handling',
          title: `Add retry policy to "${step.name}"`,
          description: `Action step "${step.name}" would benefit from exponential backoff retry logic.`,
          steps: [step.id],
          estimatedSavings: {
            time: 'Minimal overhead',
            reliability: '40% fewer failures'
          },
          priority: 'high'
        });
      }
    }

    // Parallelize
    if (options.parallelize) {
      const parallelizable = this.findParallelizableSteps(optimizedSteps);
      if (parallelizable.length > 0) {
        suggestions.push({
          type: 'parallelize',
          title: 'Enable parallel execution',
          description: `${parallelizable.length} step pair(s) can execute in parallel, reducing total time.`,
          steps: parallelizable.flatMap(p => [p.step1, p.step2]),
          estimatedSavings: {
            time: `${(parallelizable.length * 15).toFixed(0)}% faster`,
            reliability: 'No impact'
          },
          priority: 'medium'
        });
      }
    }

    // Optimize order
    if (options.optimizeOrder) {
      const ordered = this.optimizeStepOrder(optimizedSteps);
      if (ordered.length !== optimizedSteps.length) {
        suggestions.push({
          type: 'reorder',
          title: 'Optimize execution order',
          description: 'Reorder steps to minimize wait times and optimize resource usage.',
          steps: [],
          estimatedSavings: {
            time: '15% faster',
            reliability: 'Better resource allocation'
          },
          priority: 'medium'
        });
      }
    }

    // Suggest caching
    if (options.suggestCaching) {
      const cacheableSteps = optimizedSteps.filter(
        s => s.type === FlowStepType.ACTION && ((s.config as { url?: string })?.url)
      );
      if (cacheableSteps.length > 0) {
        suggestions.push({
          type: 'cache',
          title: 'Add response caching',
          description: `${cacheableSteps.length} API call(s) can benefit from response caching.`,
          steps: cacheableSteps.map(s => s.id),
          estimatedSavings: {
            time: '50-80% faster for cached responses',
            reliability: 'Reduced API load'
          },
          priority: 'low'
        });
      }
    }

    // Calculate improvements
    const timeReduction = suggestions.reduce((sum, s) => {
      const match = s.estimatedSavings.time.match(/(\d+)%/);
      return sum + (match ? parseInt(match[1]) : 0);
    }, 0);

    const reliabilityImprovement = suggestions
      .filter(s => s.type === 'error_handling')
      .reduce((sum) => sum + 40, 0);

    return {
      originalSteps: flow.steps.length,
      optimizedSteps: optimizedSteps.length,
      suggestions,
      estimatedImprovement: {
        timeReduction: `Up to ${Math.min(timeReduction, 50)}% faster`,
        reliabilityImprovement: `Up to ${Math.min(reliabilityImprovement, 60)}% more reliable`,
        complexityReduction: `${Math.max(0, flow.steps.length - optimizedSteps.length)} steps can be reduced`
      }
    };
  },

  /**
   * Find steps that can be reduced
   */
  findReducibleSteps(steps: IFlowDefinition['steps']): Array<{ steps: IFlowDefinition['steps'] }> {
    const groups: Array<{ steps: IFlowDefinition['steps'] }> = [];

    // Find consecutive transform steps
    for (let i = 0; i < steps.length - 1; i++) {
      if (steps[i].type === FlowStepType.TRANSFORM && steps[i + 1].type === FlowStepType.TRANSFORM) {
        const group: IFlowDefinition['steps'] = [steps[i], steps[i + 1]];
        groups.push({ steps: group });
      }
    }

    return groups;
  },

  /**
   * Optimize step order
   */
  optimizeStepOrder(steps: IFlowDefinition['steps']): IFlowDefinition['steps'] {
    // Simple optimization: move all wait steps to the end
    const nonWaits = steps.filter(s => s.type !== FlowStepType.WAIT);
    const waits = steps.filter(s => s.type === FlowStepType.WAIT);
    return [...nonWaits, ...waits];
  }
};

export default optimizationService;
