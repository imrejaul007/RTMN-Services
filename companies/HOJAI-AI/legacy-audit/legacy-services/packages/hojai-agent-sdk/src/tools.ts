/**
 * HOJAI Agent SDK - Tools
 * Common tools available to all agents
 */

import type { ToolDefinition, ToolResult } from './index.js';

// ============================================================================
// SEARCH TOOLS
// ============================================================================

export const searchCodeTool: ToolDefinition = {
  name: 'searchCode',
  description: 'Search through code repositories for patterns, functions, or files',
  category: 'search',
  parameters: [
    { name: 'query', description: 'Search query or pattern', type: 'string', required: true },
    { name: 'language', description: 'Programming language filter', type: 'string', required: false },
    { name: 'limit', description: 'Maximum results to return', type: 'number', required: false, default: 10 },
  ],
};

export const searchDocumentationTool: ToolDefinition = {
  name: 'searchDocumentation',
  description: 'Search documentation and knowledge bases',
  category: 'search',
  parameters: [
    { name: 'query', description: 'Search query', type: 'string', required: true },
    { name: 'source', description: 'Documentation source (mdn, docs, wiki)', type: 'string', required: false },
  ],
};

export const webSearchTool: ToolDefinition = {
  name: 'webSearch',
  description: 'Search the web for current information',
  category: 'search',
  parameters: [
    { name: 'query', description: 'Web search query', type: 'string', required: true },
    { name: 'limit', description: 'Number of results', type: 'number', required: false, default: 5 },
  ],
};

export const webFetchTool: ToolDefinition = {
  name: 'webFetch',
  description: 'Fetch content from a URL',
  category: 'search',
  parameters: [
    { name: 'url', description: 'URL to fetch', type: 'string', required: true },
    { name: 'prompt', description: 'What to look for in the content', type: 'string', required: false },
  ],
};

// ============================================================================
// CODE TOOLS
// ============================================================================

export const analyzeCodeTool: ToolDefinition = {
  name: 'analyzeCode',
  description: 'Analyze code for complexity, patterns, and potential issues',
  category: 'analysis',
  parameters: [
    { name: 'code', description: 'Code to analyze', type: 'string', required: true },
    { name: 'language', description: 'Programming language', type: 'string', required: true },
  ],
};

export const generateTestsTool: ToolDefinition = {
  name: 'generateTests',
  description: 'Generate unit tests for the given code',
  category: 'generation',
  parameters: [
    { name: 'code', description: 'Code to generate tests for', type: 'string', required: true },
    { name: 'framework', description: 'Testing framework (jest, mocha, vitest)', type: 'string', required: false },
    { name: 'coverage', description: 'Target coverage percentage', type: 'number', required: false, default: 80 },
  ],
};

export const createComponentTool: ToolDefinition = {
  name: 'createComponent',
  description: 'Create a UI component based on specifications',
  category: 'generation',
  parameters: [
    { name: 'name', description: 'Component name', type: 'string', required: true },
    { name: 'framework', description: 'UI framework (react, vue, angular)', type: 'string', required: true },
    { name: 'props', description: 'Component properties interface', type: 'string', required: false },
  ],
};

export const createAPITool: ToolDefinition = {
  name: 'createAPI',
  description: 'Create an API endpoint with proper routing and validation',
  category: 'generation',
  parameters: [
    { name: 'method', description: 'HTTP method (GET, POST, PUT, DELETE)', type: 'string', required: true, enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
    { name: 'path', description: 'API path', type: 'string', required: true },
    { name: 'validation', description: 'Request validation schema', type: 'string', required: false },
  ],
};

export const generateDocsTool: ToolDefinition = {
  name: 'generateDocs',
  description: 'Generate documentation for code',
  category: 'generation',
  parameters: [
    { name: 'code', description: 'Code to document', type: 'string', required: true },
    { name: 'format', description: 'Documentation format (md, jsdoc, tsdoc)', type: 'string', required: false, default: 'md' },
  ],
};

// ============================================================================
// REVIEW TOOLS
// ============================================================================

export const securityScanTool: ToolDefinition = {
  name: 'securityScan',
  description: 'Scan code for security vulnerabilities',
  category: 'review',
  parameters: [
    { name: 'code', description: 'Code to scan', type: 'string', required: true },
    { name: 'rules', description: 'Security rules to check', type: 'array', required: false },
  ],
};

export const performanceAuditTool: ToolDefinition = {
  name: 'performanceAudit',
  description: 'Audit code for performance issues',
  category: 'review',
  parameters: [
    { name: 'code', description: 'Code to audit', type: 'string', required: true },
    { name: 'focus', description: 'Focus area (bundle, runtime, memory)', type: 'string', required: false },
  ],
};

export const accessibilityCheckTool: ToolDefinition = {
  name: 'accessibilityCheck',
  description: 'Check UI components for accessibility issues',
  category: 'review',
  parameters: [
    { name: 'code', description: 'UI code to check', type: 'string', required: true },
    { name: 'standard', description: 'WCAG standard (a, aa, aaa)', type: 'string', required: false, default: 'aa' },
  ],
};

export const codeReviewTool: ToolDefinition = {
  name: 'codeReview',
  description: 'Perform a comprehensive code review',
  category: 'review',
  parameters: [
    { name: 'code', description: 'Code to review', type: 'string', required: true },
    { name: 'language', description: 'Programming language', type: 'string', required: true },
    { name: 'focus', description: 'Review focus areas', type: 'array', required: false },
  ],
};

// ============================================================================
// DATA TOOLS
// ============================================================================

export const analyzeDataTool: ToolDefinition = {
  name: 'analyzeData',
  description: 'Analyze data and generate insights',
  category: 'analysis',
  parameters: [
    { name: 'data', description: 'Data to analyze', type: 'string', required: true },
    { name: 'type', description: 'Data type (csv, json, sql)', type: 'string', required: true },
    { name: 'questions', description: 'Analysis questions', type: 'array', required: false },
  ],
};

export const createVisualizationTool: ToolDefinition = {
  name: 'createVisualization',
  description: 'Create data visualizations',
  category: 'generation',
  parameters: [
    { name: 'data', description: 'Data to visualize', type: 'string', required: true },
    { name: 'type', description: 'Chart type', type: 'string', required: true, enum: ['bar', 'line', 'pie', 'scatter', 'heatmap'] },
    { name: 'title', description: 'Chart title', type: 'string', required: false },
  ],
};

// ============================================================================
// CONTENT TOOLS
// ============================================================================

export const generateContentTool: ToolDefinition = {
  name: 'generateContent',
  description: 'Generate marketing or content copy',
  category: 'generation',
  parameters: [
    { name: 'type', description: 'Content type (blog, social, email, ad)', type: 'string', required: true },
    { name: 'topic', description: 'Content topic', type: 'string', required: true },
    { name: 'tone', description: 'Content tone', type: 'string', required: false },
    { name: 'length', description: 'Target length (short, medium, long)', type: 'string', required: false, default: 'medium' },
  ],
};

export const rewriteContentTool: ToolDefinition = {
  name: 'rewriteContent',
  description: 'Rewrite existing content',
  category: 'generation',
  parameters: [
    { name: 'content', description: 'Content to rewrite', type: 'string', required: true },
    { name: 'style', description: 'Target style', type: 'string', required: false },
    { name: 'audience', description: 'Target audience', type: 'string', required: false },
  ],
};

export const seoOptimizeTool: ToolDefinition = {
  name: 'seoOptimize',
  description: 'Optimize content for search engines',
  category: 'generation',
  parameters: [
    { name: 'content', description: 'Content to optimize', type: 'string', required: true },
    { name: 'keywords', description: 'Target keywords', type: 'array', required: true },
    { name: 'title', description: 'Page title', type: 'string', required: false },
  ],
};

// ============================================================================
// COMMUNICATION TOOLS
// ============================================================================

export const sendEmailTool: ToolDefinition = {
  name: 'sendEmail',
  description: 'Send an email',
  category: 'communication',
  parameters: [
    { name: 'to', description: 'Recipient email', type: 'string', required: true },
    { name: 'subject', description: 'Email subject', type: 'string', required: true },
    { name: 'body', description: 'Email body', type: 'string', required: true },
    { name: 'cc', description: 'CC recipients', type: 'array', required: false },
  ],
};

export const sendSlackTool: ToolDefinition = {
  name: 'sendSlack',
  description: 'Send a Slack message',
  category: 'communication',
  parameters: [
    { name: 'channel', description: 'Slack channel', type: 'string', required: true },
    { name: 'message', description: 'Message to send', type: 'string', required: true },
  ],
};

export const createJiraTicketTool: ToolDefinition = {
  name: 'createJiraTicket',
  description: 'Create a Jira ticket',
  category: 'communication',
  parameters: [
    { name: 'project', description: 'Jira project key', type: 'string', required: true },
    { name: 'title', description: 'Ticket title', type: 'string', required: true },
    { name: 'description', description: 'Ticket description', type: 'string', required: false },
    { name: 'type', description: 'Issue type', type: 'string', required: false, default: 'task' },
  ],
};

export const createGitHubPRTool: ToolDefinition = {
  name: 'createGitHubPR',
  description: 'Create a GitHub pull request',
  category: 'communication',
  parameters: [
    { name: 'title', description: 'PR title', type: 'string', required: true },
    { name: 'body', description: 'PR description', type: 'string', required: false },
    { name: 'base', description: 'Base branch', type: 'string', required: false, default: 'main' },
  ],
};

// ============================================================================
// ALL TOOLS REGISTRY
// ============================================================================

export const allTools: ToolDefinition[] = [
  // Search
  searchCodeTool,
  searchDocumentationTool,
  webSearchTool,
  webFetchTool,

  // Code
  analyzeCodeTool,
  generateTestsTool,
  createComponentTool,
  createAPITool,
  generateDocsTool,

  // Review
  securityScanTool,
  performanceAuditTool,
  accessibilityCheckTool,
  codeReviewTool,

  // Data
  analyzeDataTool,
  createVisualizationTool,

  // Content
  generateContentTool,
  rewriteContentTool,
  seoOptimizeTool,

  // Communication
  sendEmailTool,
  sendSlackTool,
  createJiraTicketTool,
  createGitHubPRTool,
];

/**
 * Get tools by category
 */
export function getToolsByCategory(category: string): ToolDefinition[] {
  return allTools.filter((t) => t.category === category);
}

/**
 * Get tools by name
 */
export function getToolByName(name: string): ToolDefinition | undefined {
  return allTools.find((t) => t.name === name);
}

/**
 * Create a custom tool definition
 */
export function createTool(definition: ToolDefinition): ToolDefinition {
  return definition;
}

/**
 * Execute a tool (stub - actual implementation depends on the tool)
 */
export async function executeTool(tool: ToolDefinition, args: Record<string, unknown>): Promise<ToolResult> {
  // This is a stub - actual tool execution would be handled by the agent runtime
  return {
    success: true,
    data: { tool: tool.name, executed: true, args },
  };
}
