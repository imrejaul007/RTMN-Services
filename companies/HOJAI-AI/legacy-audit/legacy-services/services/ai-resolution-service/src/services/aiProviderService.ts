import axios, { AxiosError } from 'axios';
import { logger } from '../utils/logger';

interface AIProviderConfig {
  provider: 'openai' | 'anthropic' | 'custom';
  apiKey: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason?: string;
}

interface ParsedStep {
  stepNumber: number;
  type: string;
  title: string;
  description: string;
  estimatedTime: number;
  conditions?: string[];
  agentAction?: {
    action: string;
    description: string;
    instructions: string;
    tools?: string[];
    expectedOutcome: string;
    estimatedTime: number;
    preRequisites?: string[];
  };
  customerAction?: {
    action: string;
    description: string;
    instructions: string[];
    expectedTime: number;
    canSkip: boolean;
  };
}

class AIProviderService {
  private config: AIProviderConfig;
  private fallbackMode: boolean = false;

  constructor() {
    this.config = {
      provider: (process.env.AI_PROVIDER as AIProviderConfig['provider']) || 'openai',
      apiKey: process.env.AI_API_KEY || '',
      baseUrl: process.env.AI_BASE_URL,
      model: process.env.AI_MODEL || 'gpt-4-turbo-preview',
      temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2000', 10)
    };

    if (!this.config.apiKey) {
      logger.warn('AI_API_KEY not configured, running in fallback mode');
      this.fallbackMode = true;
    }
  }

  async callOpenAI(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    if (this.fallbackMode) {
      return this.generateFallbackResponse(prompt, systemPrompt);
    }

    const messages: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.config.model,
          messages,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`
          },
          timeout: 30000
        }
      );

      const choice = response.data.choices[0];
      const usage = response.data.usage;

      logger.debug('OpenAI API call successful', {
        model: this.config.model,
        tokens: usage?.total_tokens
      });

      return {
        content: choice.message.content,
        usage: usage
          ? {
              promptTokens: usage.prompt_tokens,
              completionTokens: usage.completion_tokens,
              totalTokens: usage.total_tokens
            }
          : undefined,
        model: this.config.model,
        finishReason: choice.finish_reason
      };
    } catch (error) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        logger.error('OpenAI API error', {
          status: axiosError.response.status,
          data: axiosError.response.data
        });

        if (axiosError.response.status === 429) {
          logger.warn('Rate limited by OpenAI, using fallback');
          return this.generateFallbackResponse(prompt, systemPrompt);
        }
      }

      logger.error('OpenAI API call failed, using fallback', {
        error: axiosError.message
      });

      return this.generateFallbackResponse(prompt, systemPrompt);
    }
  }

  async generatePlanText(issue: {
    title: string;
    description: string;
    category: string;
    priority: string;
    context?: Record<string, unknown>;
  }): Promise<string> {
    const systemPrompt = `You are an expert customer support resolution planner. Your role is to generate structured, actionable resolution plans for customer issues.

Guidelines:
1. Analyze the issue thoroughly to understand root cause
2. Generate clear, sequential steps that are easy to follow
3. Include both agent actions and customer actions where applicable
4. Estimate realistic time for each step
5. Define measurable success criteria
6. Consider escalation if the issue is complex or high-priority
7. Format your response as structured text that can be parsed

Response Format:
- Start with a brief issue analysis
- List steps in clear numbered order
- For each step include: type, title, description, estimated time
- End with success criteria
- Include any relevant escalation triggers`;

    const issuePrompt = `Analyze and create a resolution plan for the following issue:

Issue Title: ${issue.title}
Issue Description: ${issue.description}
Category: ${issue.category}
Priority: ${issue.priority}
${issue.context ? `Context: ${JSON.stringify(issue.context, null, 2)}` : ''}

Please generate a comprehensive resolution plan following the guidelines provided.`;

    const response = await this.callOpenAI(issuePrompt, systemPrompt);
    return response.content;
  }

  async extractSteps(text: string): Promise<ParsedStep[]> {
    const steps: ParsedStep[] = [];

    // Simple parsing logic - in production, this would use more sophisticated NLP
    const lines = text.split('\n');
    let currentStep: Partial<ParsedStep> | null = null;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Match step patterns
      const stepMatch = trimmedLine.match(/^(\d+)[.)]\s*(.+)/);
      if (stepMatch) {
        if (currentStep && currentStep.title) {
          steps.push(currentStep as ParsedStep);
        }

        currentStep = {
          stepNumber: parseInt(stepMatch[1], 10),
          title: stepMatch[2],
          description: '',
          estimatedTime: 5,
          type: 'agent_action'
        };
      } else if (currentStep) {
        // Append description
        if (currentStep.description) {
          currentStep.description += ' ' + trimmedLine;
        } else {
          currentStep.description = trimmedLine;
        }

        // Detect step type
        if (trimmedLine.toLowerCase().includes('customer') && trimmedLine.toLowerCase().includes('action')) {
          currentStep.type = 'customer_action';
          currentStep.customerAction = {
            action: currentStep.title || '',
            description: currentStep.description || '',
            instructions: [currentStep.description || ''],
            expectedTime: currentStep.estimatedTime || 5,
            canSkip: false
          };
          delete currentStep.agentAction;
        } else if (trimmedLine.toLowerCase().includes('wait') || trimmedLine.toLowerCase().includes('delay')) {
          currentStep.type = 'wait';
        } else if (trimmedLine.toLowerCase().includes('escalat')) {
          currentStep.type = 'escalation';
        } else {
          currentStep.type = 'agent_action';
          currentStep.agentAction = {
            action: currentStep.title || '',
            description: currentStep.description || '',
            instructions: currentStep.description || '',
            expectedOutcome: 'Issue resolved',
            estimatedTime: currentStep.estimatedTime || 5
          };
          delete currentStep.customerAction;
        }

        // Extract time estimate
        const timeMatch = trimmedLine.match(/(\d+)\s*(minutes?|mins?|hours?)/i);
        if (timeMatch) {
          const value = parseInt(timeMatch[1], 10);
          currentStep.estimatedTime = timeMatch[2].toLowerCase().startsWith('hour')
            ? value * 60
            : value;
        }

        // Extract conditions
        if (trimmedLine.toLowerCase().includes('if ') || trimmedLine.toLowerCase().includes('when ')) {
          if (!currentStep.conditions) {
            currentStep.conditions = [];
          }
          currentStep.conditions.push(trimmedLine);
        }
      }
    }

    // Add last step
    if (currentStep && currentStep.title) {
      steps.push(currentStep as ParsedStep);
    }

    // If no steps were parsed, create a default step
    if (steps.length === 0) {
      steps.push({
        stepNumber: 1,
        type: 'agent_action',
        title: 'Initial Assessment',
        description: text.substring(0, 500),
        estimatedTime: 10,
        agentAction: {
          action: 'Initial Assessment',
          description: text.substring(0, 500),
          instructions: text.substring(0, 500),
          expectedOutcome: 'Understand the issue',
          estimatedTime: 10
        }
      });
    }

    return steps;
  }

  async improvePlan(plan: {
    steps: Array<{
      title: string;
      description: string;
      type: string;
      estimatedTime: number;
    }>;
    successCriteria?: string[];
  }): Promise<{
    improvedSteps: typeof plan.steps;
    improvements: string[];
  }> {
    const improvements: string[] = [];

    // Analyze and improve the plan
    const improvedSteps = plan.steps.map((step, index) => {
      const stepImprovements: string[] = [];

      // Check for clarity
      if (step.description.length < 20) {
        stepImprovements.push('Description could be more detailed');
      }

      // Check for time estimation
      if (step.estimatedTime === 0) {
        stepImprovements.push('Time estimate missing - added default');
      }

      // Check for sequential logic
      if (index > 0 && plan.steps[index - 1].type === 'customer_action' && step.type === 'agent_action') {
        stepImprovements.push('Consider adding a wait step between customer and agent actions');
      }

      if (stepImprovements.length > 0) {
        improvements.push(`Step ${index + 1} (${step.title}): ${stepImprovements.join(', ')}`);
      }

      return {
        ...step,
        estimatedTime: step.estimatedTime || 5
      };
    });

    // Add general improvements
    if (improvements.length === 0) {
      improvements.push('Plan structure is solid. Consider adding verification steps.');
    }

    return {
      improvedSteps,
      improvements
    };
  }

  private generateFallbackResponse(prompt: string, systemPrompt?: string): AIResponse {
    logger.info('Generating fallback response (rule-based)');

    // Generate a structured fallback plan based on the issue content
    const fallbackPlan = this.generateRuleBasedPlan(prompt, systemPrompt);

    return {
      content: fallbackPlan,
      model: 'fallback-rule-based',
      finishReason: 'stop'
    };
  }

  private generateRuleBasedPlan(prompt: string, systemPrompt?: string): string {
    // Extract key information from the prompt
    const issueMatch = prompt.match(/Issue Title:\s*(.+)/);
    const categoryMatch = prompt.match(/Category:\s*(.+)/);
    const priorityMatch = prompt.match(/Priority:\s*(.+)/);

    const issueTitle = issueMatch ? issueMatch[1].trim() : 'Unknown Issue';
    const category = categoryMatch ? categoryMatch[1].trim() : 'general';
    const priority = priorityMatch ? priorityMatch[1].trim() : 'medium';

    // Generate category-specific steps
    let steps = '';
    let stepNumber = 1;

    switch (category.toLowerCase()) {
      case 'technical':
        steps = this.generateTechnicalSteps(issueTitle, stepNumber);
        break;
      case 'billing':
        steps = this.generateBillingSteps(issueTitle, stepNumber);
        break;
      case 'account':
        steps = this.generateAccountSteps(issueTitle, stepNumber);
        break;
      default:
        steps = this.generateGenericSteps(issueTitle, stepNumber);
    }

    // Add escalation for high priority
    const escalationNote = priority.toLowerCase() === 'critical' || priority.toLowerCase() === 'high'
      ? '\n\n⚠️ ESCALATION TRIGGER: Due to high priority, recommend L2 Specialist involvement.\n'
      : '';

    return `Issue Analysis:
- Issue identified: ${issueTitle}
- Category: ${category}
- Priority: ${priority}
- Recommended approach: ${this.getRecommendedApproach(category)}

Resolution Plan:
${steps}

Success Criteria:
1. Customer confirms issue is resolved
2. All system verifications pass
3. No recurrence within 24 hours${escalationNote}`;
  }

  private generateTechnicalSteps(issue: string, startStep: number): string {
    return `${startStep}. Initial Assessment (5 minutes)
   - Review the technical issue details
   - Check system logs and error messages
   - Identify affected components

${startStep + 1}. Reproduce the Issue (10 minutes)
   - Attempt to replicate the reported behavior
   - Document reproduction steps
   - Capture screenshots/logs if applicable

${startStep + 2}. Root Cause Analysis (15 minutes)
   - Analyze error patterns
   - Check related system components
   - Identify potential causes

${startStep + 3}. Implement Fix (Variable)
   - Apply the appropriate solution
   - Test the fix in a safe environment
   - Verify fix effectiveness

${startStep + 4}. Verification & Documentation (10 minutes)
   - Confirm issue is resolved
   - Document the resolution
   - Update knowledge base if needed`;
  }

  private generateBillingSteps(issue: string, startStep: number): string {
    return `${startStep}. Billing Review (5 minutes)
   - Review customer's billing history
   - Check for any discrepancies
   - Verify payment status

${startStep + 1}. Transaction Analysis (10 minutes)
   - Review specific transactions
   - Check for errors in charges
   - Verify refund eligibility

${startStep + 2}. Customer Communication (10 minutes)
   - Explain findings to customer
   - Provide clear explanation of charges
   - Offer resolution options

${startStep + 3}. Apply Resolution (Variable)
   - Process refund if applicable
   - Adjust billing if needed
   - Send confirmation to customer

${startStep + 4}. Verification (5 minutes)
   - Confirm resolution in billing system
   - Verify customer notification sent
   - Document the resolution`;
  }

  private generateAccountSteps(issue: string, startStep: number): string {
    return `${startStep}. Account Verification (5 minutes)
   - Verify customer identity
   - Review account status
   - Check for security flags

${startStep + 1}. Issue Assessment (5 minutes)
   - Understand the account issue
   - Check recent account activity
   - Identify required changes

${startStep + 2}. Implement Changes (10 minutes)
   - Apply necessary updates
   - Verify changes are correct
   - Ensure security is maintained

${startStep + 3}. Customer Confirmation (5 minutes)
   - Confirm changes with customer
   - Explain what was modified
   - Provide updated credentials if needed

${startStep + 4}. Final Verification (5 minutes)
   - Test account functionality
   - Verify email notifications
   - Document all changes made`;
  }

  private generateGenericSteps(issue: string, startStep: number): string {
    return `${startStep}. Issue Intake (5 minutes)
   - Gather complete issue details
   - Document customer concerns
   - Assess urgency level

${startStep + 1}. Investigation (10 minutes)
   - Research similar past issues
   - Check knowledge base
   - Identify potential solutions

${startStep + 2}. Resolution Planning (5 minutes)
   - Determine best approach
   - Prepare customer communication
   - Plan verification steps

${startStep + 3}. Execute Resolution (Variable)
   - Implement the solution
   - Keep customer informed
   - Address any questions

${startStep + 4}. Follow-up & Close (5 minutes)
   - Verify issue resolution
   - Document the solution
   - Close the ticket`;
  }

  private getRecommendedApproach(category: string): string {
    const approaches: Record<string, string> = {
      technical: 'Technical investigation with systematic debugging',
      billing: 'Financial review with transaction verification',
      account: 'Security-focused account verification',
      product: 'Feature investigation with product team coordination',
      shipping: 'Logistics review with carrier coordination',
      refund: 'Policy verification with refund processing',
      complaint: 'Empathetic response with solution-focused resolution',
      general: 'Standard troubleshooting approach'
    };

    return approaches[category.toLowerCase()] || approaches.general;
  }
}

export const aiProviderService = new AIProviderService();
export { AIProviderService };
