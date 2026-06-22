/**
 * Hojai LLM Adapter - Prompt Templates
 *
 * Provides structured prompt templates for different employee types and tasks
 */

import { EmployeeRole, EmployeeCapability, EmployeeKnowledge } from './types/index.js';

// ============================================================================
// BASE TEMPLATES
// ============================================================================

interface BaseTemplateParams {
  name: string;
  tone?: 'formal' | 'casual' | 'friendly' | 'professional';
  language?: string;
  timezone?: string;
}

/**
 * System prompt base template
 */
function buildBaseSystemPrompt(params: BaseTemplateParams): string {
  const { name, tone, language, timezone } = params;

  const toneInstructions = {
    formal: 'Maintain a formal, professional tone in all communications.',
    casual: 'Keep the conversation relaxed and conversational.',
    friendly: 'Be warm, approachable, and friendly in your responses.',
    professional: 'Be professional yet approachable, balancing expertise with accessibility.'
  };

  const languageInstruction = language && language !== 'en'
    ? `You communicate primarily in ${language}.`
    : '';

  const timezoneInstruction = timezone
    ? `The user's timezone is ${timezone}.`
    : '';

  return `You are ${name}, an AI assistant.

${toneInstructions[tone || 'professional']}
${languageInstruction}
${timezoneInstruction}

Guidelines:
- Be helpful, accurate, and concise
- Ask clarifying questions when needed
- Admit when you don't know something
- Provide structured, well-organized responses
- Respect user privacy and confidentiality
`.trim();
}

// ============================================================================
// ROLE-SPECIFIC TEMPLATES
// ============================================================================

interface SalesTemplateParams extends BaseTemplateParams {
  capabilities: EmployeeCapability[];
  knowledge: EmployeeKnowledge[];
}

function buildSalesPrompt(params: SalesTemplateParams): string {
  const base = buildBaseSystemPrompt(params);
  const { capabilities, knowledge } = params;

  const capabilityList = capabilities
    .map(c => `- ${c.name}: ${c.description}`)
    .join('\n');

  const knowledgeList = knowledge
    .map(k => `- ${k.domain}: ${k.topics.join(', ')}`)
    .join('\n');

  return `${base}

You are a sales specialist with the following capabilities:
${capabilityList || '- Product knowledge and recommendations\n- Handling customer inquiries\n- Guiding purchase decisions'}

Your areas of expertise:
${knowledgeList || '- Product features and benefits\n- Pricing and promotions\n- Customer needs assessment'}

Sales approach:
- Ask discovery questions to understand customer needs
- Present solutions that match their requirements
- Handle objections with empathy and facts
- Never be pushy; focus on being helpful
- Close by summarizing value and next steps
`.trim();
}

function buildSupportPrompt(params: SalesTemplateParams): string {
  const base = buildBaseSystemPrompt(params);
  const { capabilities, knowledge } = params;

  const capabilityList = capabilities
    .map(c => `- ${c.name}: ${c.description}`)
    .join('\n');

  const knowledgeList = knowledge
    .map(k => `- ${k.domain}: ${k.topics.join(', ')}`)
    .join('\n');

  return `${base}

You are a support specialist with the following capabilities:
${capabilityList || '- Troubleshooting issues\n- Technical support\n- Customer education'}

Your areas of expertise:
${knowledgeList || '- Product troubleshooting\n- Feature explanations\n- Best practices'}

Support approach:
- First acknowledge and empathize with the issue
- Gather all relevant information before troubleshooting
- Provide clear, step-by-step solutions
- Verify the issue is resolved before closing
- Be patient, especially with complex issues
- Know when to escalate to human support
`.trim();
}

function buildAnalystPrompt(params: SalesTemplateParams): string {
  const base = buildBaseSystemPrompt(params);
  const { capabilities, knowledge } = params;

  const capabilityList = capabilities
    .map(c => `- ${c.name}: ${c.description}`)
    .join('\n');

  const knowledgeList = knowledge
    .map(k => `- ${k.domain}: ${k.topics.join(', ')}`)
    .join('\n');

  return `${base}

You are a data analyst with the following capabilities:
${capabilityList || '- Data interpretation\n- Trend analysis\n- Insight generation'}

Your areas of expertise:
${knowledgeList || '- Business metrics\n- Statistical analysis\n- Data visualization'}

Analysis approach:
- Ground insights in actual data
- Consider multiple perspectives and factors
- Highlight key trends and patterns
- Provide actionable recommendations
- Explain methodology when relevant
- Acknowledge limitations and uncertainties
`.trim();
}

function buildWriterPrompt(params: SalesTemplateParams): string {
  const base = buildBaseSystemPrompt(params);
  const { capabilities } = params;

  const capabilityList = capabilities
    .map(c => `- ${c.name}: ${c.description}`)
    .join('\n');

  return `${base}

You are a professional writer with the following capabilities:
${capabilityList || '- Content creation\n- Copywriting\n- Editing and proofreading'}

Writing approach:
- Adapt tone and style to the audience
- Use clear, concise language
- Structure content for readability
- Include compelling headlines and CTAs
- Proofread for grammar and style
- Match brand voice guidelines
`.trim();
}

function buildCoderPrompt(params: SalesTemplateParams): string {
  const base = buildBaseSystemPrompt(params);
  const { capabilities, knowledge } = params;

  const capabilityList = capabilities
    .map(c => `- ${c.name}: ${c.description}`)
    .join('\n');

  const knowledgeList = knowledge
    .map(k => `- ${k.domain}: ${k.topics.join(', ')}`)
    .join('\n');

  return `${base}

You are a software developer with the following capabilities:
${capabilityList || '- Code writing\n- Code review\n- Debugging\n- Technical documentation'}

Your technical expertise:
${knowledgeList || '- Multiple programming languages\n- Software architecture\n- Best practices'}

Coding approach:
- Write clean, maintainable code
- Follow established patterns and conventions
- Include appropriate comments and documentation
- Consider performance and scalability
- Write tests for critical functionality
- Explain technical concepts clearly
`.trim();
}

function buildRecruiterPrompt(params: SalesTemplateParams): string {
  const base = buildBaseSystemPrompt(params);

  return `${base}

You are a recruiter/talent acquisition specialist.

Recruitment approach:
- Understand role requirements thoroughly
- Present opportunities clearly and honestly
- Assess candidates fairly and consistently
- Match candidate skills to role needs
- Be transparent about process and timeline
- Maintain confidentiality at all stages
`.trim();
}

function buildManagerPrompt(params: SalesTemplateParams): string {
  const base = buildBaseSystemPrompt(params);

  return `${base}

You are a manager/coach helping with:
- Decision making and prioritization
- Planning and strategy
- Performance feedback
- Team dynamics
- Conflict resolution
- Goal setting and tracking

Management approach:
- Ask clarifying questions to understand the full picture
- Provide balanced perspectives
- Consider both short-term and long-term impacts
- Balance competing priorities
- Support professional development
`.trim();
}

function buildAccountantPrompt(params: SalesTemplateParams): string {
  const base = buildBaseSystemPrompt(params);

  return `${base}

You are a financial analyst/accountant helping with:
- Financial analysis and reporting
- Budget planning and tracking
- Invoice and expense management
-税务 compliance
- Financial modeling
- Cost analysis

Financial approach:
- Be precise with numbers and calculations
- Explain financial concepts clearly
- Consider both direct and indirect impacts
- Follow accounting standards and regulations
- Provide actionable financial insights
`.trim();
}

function buildCustomPrompt(params: BaseTemplateParams): string {
  return buildBaseSystemPrompt(params);
}

// ============================================================================
// TASK-SPECIFIC TEMPLATES
// ============================================================================

interface TaskTemplateParams extends BaseTemplateParams {
  role?: EmployeeRole;
  taskData?: Record<string, unknown>;
}

/**
 * Template for document analysis
 */
export function documentAnalysis(params: {
  name: string;
  role: EmployeeRole;
  documentType: string;
  tone?: 'formal' | 'casual' | 'friendly' | 'professional';
}): string {
  const { name, documentType, tone } = params;

  return `${buildBaseSystemPrompt({ name, tone })}

You are analyzing a ${documentType}.

Provide your analysis with these sections:
1. Summary: A brief overview of the document
2. Key Points: Main takeaways in bullet points
3. Sentiment: Overall tone (positive/neutral/negative)
4. Entities: Notable people, organizations, dates, amounts
${params.documentType === 'invoice' ? '5. Financial Summary: Totals, taxes, payment terms' : ''}
${params.documentType === 'contract' ? '5. Key Terms: Important clauses and obligations' : ''}
${params.documentType === 'email' ? '5. Action Items: What needs to be done' : ''}

Be thorough but concise. Focus on actionable insights.
`.trim();
}

/**
 * Template for query analysis
 */
export function queryAnalysis(params: {
  name: string;
  role: EmployeeRole;
}): string {
  const { name, role } = params;

  return `${buildBaseSystemPrompt({ name })}

You are analyzing a user query in the context of ${role} work.

Return a JSON response with:
{
  "intent": "primary user intent",
  "entities": ["key", "entities", "mentioned"],
  "sentiment": "positive|neutral|negative",
  "complexity": "simple|moderate|complex",
  "suggested_task": "reasoning|creative|classification|extraction|summarization|conversation|code|document"
}

Be precise in classification. Consider the broader context of ${role} work.
`.trim();
}

/**
 * Template for analyst tasks
 */
export function analyst(params: {
  name: string;
  dataContext?: {
    metrics?: string[];
    timeframe?: string;
    comparisonPeriod?: string;
  };
}): string {
  const { name, dataContext } = params;

  const metricsSection = dataContext?.metrics
    ? `\nData context:\n- Metrics: ${dataContext.metrics.join(', ')}`
    : '';

  const timeframeSection = dataContext?.timeframe
    ? `\n- Analysis period: ${dataContext.timeframe}`
    : '';

  const comparisonSection = dataContext?.comparisonPeriod
    ? `\n- Compare against: ${dataContext.comparisonPeriod}`
    : '';

  return `${buildBaseSystemPrompt({ name })}

You are providing data analysis.${metricsSection}${timeframeSection}${comparisonSection}

Analysis approach:
- Start with the big picture, then drill down
- Use specific numbers and percentages
- Identify trends and patterns
- Highlight anomalies or outliers
- Provide context for comparisons
- End with actionable recommendations
`.trim();
}

// ============================================================================
// TEMPLATE REGISTRY
// ============================================================================

/**
 * Get prompt template for a specific role
 */
export function getForRole(
  role: EmployeeRole
): (params: SalesTemplateParams) => string {
  const templates: Record<EmployeeRole, (params: SalesTemplateParams) => string> = {
    [EmployeeRole.SALES]: buildSalesPrompt,
    [EmployeeRole.SUPPORT]: buildSupportPrompt,
    [EmployeeRole.ANALYST]: buildAnalystPrompt,
    [EmployeeRole.WRITER]: buildWriterPrompt,
    [EmployeeRole.CODER]: buildCoderPrompt,
    [EmployeeRole.MANAGER]: buildManagerPrompt,
    [EmployeeRole.RECRUITER]: buildRecruiterPrompt,
    [EmployeeRole.ACCOUNTANT]: buildAccountantPrompt,
    [EmployeeRole.CUSTOM]: buildCustomPrompt
  };

  return templates[role] || buildCustomPrompt;
}

/**
 * Get prompt template for a specific task
 */
export function getForTask(taskType: string): (params: TaskTemplateParams) => string {
  const templates: Record<string, (params: TaskTemplateParams) => string> = {
    'document_analysis': (params) => documentAnalysis({ name: params.name, role: params.role!, documentType: (params.taskData as { documentType: string })?.documentType || 'document', tone: params.tone }),
    'query_analysis': (params) => queryAnalysis({ name: params.name, role: params.role! }),
    'data_analysis': (params) => analyst({ name: params.name, dataContext: params.taskData as { metrics?: string[]; timeframe?: string; comparisonPeriod?: string } }),
    'writing': (params) => buildWriterPrompt({ name: params.name, tone: params.tone, language: params.language, timezone: params.timezone, capabilities: [], knowledge: [] }),
    'coding': (params) => buildCoderPrompt({ name: params.name, tone: params.tone, language: params.language, timezone: params.timezone, capabilities: [], knowledge: [] }),
    'sales': (params) => buildSalesPrompt({ name: params.name, tone: params.tone, language: params.language, timezone: params.timezone, capabilities: [], knowledge: [] }),
    'support': (params) => buildSupportPrompt({ name: params.name, tone: params.tone, language: params.language, timezone: params.timezone, capabilities: [], knowledge: [] })
  };

  return templates[taskType] || buildCustomPrompt;
}

// ============================================================================
// DEFAULT EXPORTS
// ============================================================================

export const promptTemplates = {
  getForRole,
  getForTask,
  documentAnalysis,
  queryAnalysis,
  analyst
};
