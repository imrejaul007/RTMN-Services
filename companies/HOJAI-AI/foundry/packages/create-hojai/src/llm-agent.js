#!/usr/bin/env node
/**
 * LLM-Powered Agent Generator
 *
 * Generates agent strategies from natural language prompts using LLM.
 * Used by: npx hojai add agent <name> --from-llm
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import kleur from 'kleur';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// LLM Provider (supports OpenAI, Anthropic, local models)
const LLM_CONFIG = {
  provider: process.env.HOJAI_LLM_PROVIDER || 'openai',
  apiKey: process.env.HOJAI_LLM_API_KEY || process.env.OPENAI_API_KEY,
  model: process.env.HOJAI_LLM_MODEL || 'gpt-4',
  endpoint: process.env.HOJAI_LLM_ENDPOINT || null,
};

// Agent type definitions for context
const AGENT_TYPES = [
  'ceo', 'sales', 'procurement', 'finance', 'support', 'marketing',
  'logistics', 'inventory', 'hr', 'operations', 'customer', 'kitchen',
  'delivery', 'dispatch', 'fleet', 'workforce', 'quality', 'compliance'
];

// System prompt for agent generation
const SYSTEM_PROMPT = `You are HOJAI Agent Strategist — an AI that generates agent strategies for AI-native businesses.

Given a natural language description of an agent, generate a complete agent strategy file.

Respond ONLY with valid JSON in this exact format:
{
  "name": "AgentName",
  "description": "Brief description of what this agent does",
  "type": "sales|procurement|finance|support|marketing|logistics|ceo|operations|...",
  "capabilities": ["capability1", "capability2", ...],
  "triggers": ["trigger1", "trigger2", ...],
  "actions": ["action1", "action2", ...],
  "strategy": "Detailed strategy function description",
  "tools": ["tool1", "tool2", ...],
  "memory": ["memory_type1", "memory_type2", ...],
  "confidence": 0.85,
  "examples": ["example_input1", "example_input2"]
}

Rules:
- name: PascalCase, 2-40 chars
- description: 1-2 sentences
- type: MUST be one of the agent types
- capabilities: 3-8 specific capabilities
- triggers: What activates this agent (events, messages, schedules)
- actions: What the agent does when triggered
- strategy: Detailed explanation of the agent's approach
- tools: External tools/APIs the agent uses
- memory: What types of memory to use
- confidence: 0.0-1.0, how confident the agent is
- examples: 2-3 example inputs/outputs`;

const SYSTEM_PROMPT_V2 = `You are HOJAI Agent Strategist v2 — generating agent strategies for AI-native businesses.

Given a natural language description of an agent, generate a complete agent strategy file.

Respond ONLY with valid JSON in this exact format:
{
  "name": "AgentName",
  "description": "Brief description",
  "role": "What the agent does",
  "personality": ["trait1", "trait2"],
  "goals": ["goal1", "goal2"],
  "capabilities": ["capability1", "capability2"],
  "workflow": {
    "trigger": "What starts this agent",
    "input": "What data it receives",
    "process": "Step-by-step process",
    "output": "What it produces",
    "followup": "What happens next"
  },
  "tools": {
    "apis": ["api1", "api2"],
    "services": ["service1", "service2"],
    "databases": ["db1", "db2"]
  },
  "memory": {
    "shortTerm": "Working memory needs",
    "longTerm": "Persistent memory needs",
    "episodic": "Experience memory needs"
  },
  "metrics": ["metric1", "metric2"],
  "safety": ["rule1", "rule2"],
  "confidence": 0.85
}`;

/**
 * Call LLM with prompt
 */
async function callLLM(prompt, options = {}) {
  const { provider, apiKey, model, endpoint } = LLM_CONFIG;

  if (!apiKey && provider !== 'mock') {
    console.log(kleur.yellow('⚠ No LLM API key found. Using mock generation.'));
    console.log(kleur.gray('  Set HOJAI_LLM_API_KEY or OPENAI_API_KEY to enable LLM generation.'));
    return generateMockAgent(prompt);
  }

  try {
    if (provider === 'openai' || provider === 'mock') {
      return await callOpenAI(prompt, { apiKey, model, endpoint });
    } else if (provider === 'anthropic') {
      return await callAnthropic(prompt, { apiKey, model });
    } else if (provider === 'ollama') {
      return await callOllama(prompt, { endpoint: endpoint || 'http://localhost:11434' });
    }
  } catch (error) {
    console.log(kleur.yellow(`⚠ LLM call failed: ${error.message}`));
    console.log(kleur.gray('  Falling back to mock generation.'));
  }

  return generateMockAgent(prompt);
}

async function callOpenAI(prompt, { apiKey, model, endpoint }) {
  const url = endpoint || 'https://api.openai.com/v1/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'gpt-4',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_V2 },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content in response');
  }

  return parseJSONResponse(content);
}

async function callAnthropic(prompt, { apiKey, model }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model || 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      system: SYSTEM_PROMPT_V2,
      messages: [
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    throw new Error('No content in response');
  }

  return parseJSONResponse(content);
}

async function callOllama(prompt, { endpoint }) {
  const response = await fetch(`${endpoint}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3',
      prompt: `${SYSTEM_PROMPT_V2}\n\nUser request: ${prompt}`,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`);
  }

  const data = await response.json();
  return parseJSONResponse(data.response);
}

function parseJSONResponse(content) {
  // Try to extract JSON from the response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('No valid JSON found in response');
}

/**
 * Mock agent generation (when no LLM available)
 */
function generateMockAgent(prompt) {
  const name = extractName(prompt);
  const type = inferType(prompt);

  return {
    name: name,
    description: generateDescription(prompt),
    role: `${type} agent`,
    personality: inferPersonality(type),
    goals: inferGoals(type),
    capabilities: inferCapabilities(type),
    workflow: {
      trigger: inferTrigger(type),
      input: 'User message or event data',
      process: `Analyzes input, determines action, executes with ${type} expertise`,
      output: `${type} response or action result`,
      followup: 'Update memory, schedule follow-up if needed'
    },
    tools: inferTools(type),
    memory: {
      shortTerm: 'Current conversation context',
      longTerm: 'User preferences and history',
      episodic: 'Past interactions and outcomes'
    },
    metrics: inferMetrics(type),
    safety: ['Validate input', 'Check permissions', 'Log actions'],
    confidence: 0.75
  };
}

function extractName(prompt) {
  // Try to extract name from prompt
  const patterns = [
    /(?:create|add|build|make|gen(?:erate)?)\s+(?:an?\s+)?(\w+(?:\s+\w+){0,2})\s+(?:agent|team|bot)/i,
    /(?:called|named)\s+['"]?(\w+(?:\s+\w+){0,2})['"]?/i,
    /^(\w+(?:\s+\w+){0,2})\s+(?:agent|team|bot)/i
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match) {
      return match[1].split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
    }
  }

  // Fallback: extract first few words
  const words = prompt.split(/\s+/).slice(0, 3);
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
}

function inferType(prompt) {
  const lower = prompt.toLowerCase();

  if (/sales|sell|buy|purchase|order|quote|rfq/i.test(lower)) return 'sales';
  if (/procure|source|supplier|vendor|purchase/i.test(lower)) return 'procurement';
  if (/finance|money|payment|invoice|billing|account/i.test(lower)) return 'finance';
  if (/support|help|ticket|customer|service/i.test(lower)) return 'support';
  if (/market|social|content|brand|campaign/i.test(lower)) return 'marketing';
  if (/logistic|ship|delivery|track|fleet|dispatch/i.test(lower)) return 'logistics';
  if (/inventory|stock|warehouse|product/i.test(lower)) return 'inventory';
  if (/hr|human|employ|recruit|hire|staff/i.test(lower)) return 'hr';
  if (/operat|process|task|workflow/i.test(lower)) return 'operations';
  if (/kitchen|chef|cook|food|restaurant/i.test(lower)) return 'kitchen';
  if (/quality|qa|check|inspect|test/i.test(lower)) return 'quality';

  return 'operations';
}

function generateDescription(prompt) {
  const type = inferType(prompt);
  const descriptions = {
    sales: 'Handles sales inquiries, quotes, and customer acquisition.',
    procurement: 'Manages supplier relationships and purchase orders.',
    finance: 'Processes payments, invoices, and financial operations.',
    support: 'Provides customer support and resolves issues.',
    marketing: 'Manages marketing campaigns and brand presence.',
    logistics: 'Coordinates shipping, delivery, and fleet operations.',
    inventory: 'Manages product inventory and stock levels.',
    hr: 'Handles human resources and employee management.',
    operations: 'Manages business operations and workflows.',
    kitchen: 'Coordinates kitchen operations and food preparation.',
    quality: 'Ensures quality standards and compliance.',
    compliance: 'Monitors regulatory compliance and risk.'
  };
  return descriptions[type] || 'Specialized AI agent for business operations.';
}

function inferPersonality(type) {
  const personalities = {
    sales: ['Persuasive', 'Energetic', 'Customer-focused'],
    procurement: ['Analytical', 'Cost-conscious', 'Relationship-builder'],
    finance: ['Precise', 'Detail-oriented', 'Risk-aware'],
    support: ['Empathetic', 'Patient', 'Solution-oriented'],
    marketing: ['Creative', 'Trend-aware', 'Engaging'],
    logistics: ['Efficient', 'Problem-solver', 'Time-conscious'],
    inventory: ['Organized', 'Systematic', 'Forecasting-minded'],
    hr: ['Diplomatic', 'Fair', 'People-focused'],
    operations: ['Process-oriented', 'Efficient', 'Problem-solver'],
    kitchen: ['Detail-oriented', 'Time-conscious', 'Quality-focused'],
    quality: ['Thorough', 'Standards-driven', 'Analytical'],
    compliance: ['Vigilant', 'Rule-following', 'Risk-aware']
  };
  return personalities[type] || ['Professional', 'Helpful', 'Efficient'];
}

function inferGoals(type) {
  const goals = {
    sales: ['Increase revenue', 'Close deals faster', 'Improve customer satisfaction'],
    procurement: ['Reduce costs', 'Ensure supply', 'Build supplier relationships'],
    finance: ['Ensure timely payments', 'Minimize fraud', 'Optimize cash flow'],
    support: ['Resolve issues quickly', 'Increase satisfaction', 'Reduce churn'],
    marketing: ['Increase brand awareness', 'Generate leads', 'Drive conversions'],
    logistics: ['Reduce delivery time', 'Optimize routes', 'Minimize costs'],
    inventory: ['Prevent stockouts', 'Reduce waste', 'Optimize levels'],
    hr: ['Improve retention', 'Streamline hiring', 'Enhance engagement'],
    operations: ['Improve efficiency', 'Reduce costs', 'Enhance quality'],
    kitchen: ['Maintain quality', 'Reduce wait times', 'Minimize waste'],
    quality: ['Ensure compliance', 'Reduce defects', 'Improve processes'],
    compliance: ['Maintain compliance', 'Reduce risk', 'Ensure transparency']
  };
  return goals[type] || ['Improve efficiency', 'Reduce costs', 'Enhance quality'];
}

function inferCapabilities(type) {
  const capabilities = {
    sales: ['Lead qualification', 'Quote generation', 'Negotiation', 'Pipeline management', 'Follow-up automation'],
    procurement: ['Supplier discovery', 'Price comparison', 'PO generation', 'Contract management', 'Spend analysis'],
    finance: ['Invoice processing', 'Payment tracking', 'Expense categorization', 'Financial reporting', 'Budget monitoring'],
    support: ['Ticket routing', 'Response generation', 'Issue classification', 'Escalation management', 'Satisfaction tracking'],
    marketing: ['Campaign creation', 'Audience segmentation', 'Content generation', 'Performance tracking', 'A/B testing'],
    logistics: ['Route optimization', 'Shipment tracking', 'Carrier management', 'Delivery scheduling', 'Exception handling'],
    inventory: ['Stock monitoring', 'Reorder alerts', 'Demand forecasting', 'Warehouse coordination', 'Loss prevention'],
    hr: ['Resume screening', 'Interview scheduling', 'Onboarding', 'Leave management', 'Performance tracking'],
    operations: ['Task automation', 'Process optimization', 'Resource allocation', 'Performance monitoring', 'Incident management'],
    kitchen: ['Order management', 'Prep scheduling', 'Quality control', 'Inventory management', 'Staff coordination'],
    quality: ['Defect detection', 'Compliance checking', 'Process auditing', 'Root cause analysis', 'Standard enforcement'],
    compliance: ['Policy monitoring', 'Risk assessment', 'Audit trail', 'Regulatory updates', 'Training tracking']
  };
  return capabilities[type] || ['Data analysis', 'Process automation', 'Reporting', 'Communication'];
}

function inferTrigger(type) {
  const triggers = {
    sales: 'New lead, RFQ, or follow-up reminder',
    procurement: 'Purchase request, low stock alert, or contract renewal',
    finance: 'Invoice received, payment due, or expense report submitted',
    support: 'New ticket, customer message, or satisfaction survey',
    marketing: 'Campaign schedule, new content needed, or audience segment updated',
    logistics: 'Order placed, shipment status change, or delivery exception',
    inventory: 'Low stock alert, reorder point reached, or inventory count due',
    hr: 'New applicant, employee onboarding, or performance review due',
    operations: 'Task assignment, process trigger, or SLA breach warning',
    kitchen: 'New order, prep schedule due, or ingredient low alert',
    quality: 'New submission, audit scheduled, or defect reported',
    compliance: 'Policy violation, audit due, or regulatory change'
  };
  return triggers[type] || 'Event trigger, scheduled time, or user request';
}

function inferTools(type) {
  const tools = {
    sales: ['CRM API', 'Email', 'Calendar', 'Payment gateway', 'Analytics'],
    procurement: ['Supplier database', 'Price comparison API', 'PO system', 'Contract repository'],
    finance: ['Accounting API', 'Payment processor', 'Expense tracker', 'Invoice system'],
    support: ['Helpdesk API', 'Knowledge base', 'Email', 'Chat API'],
    marketing: ['Social media APIs', 'Email platform', 'Analytics', 'Content management'],
    logistics: ['Shipping APIs', 'GPS tracking', 'Warehouse system', 'Route optimizer'],
    inventory: ['ERP API', 'Barcode scanner', 'Warehouse system', 'Forecasting engine'],
    hr: ['ATS', 'Payroll system', 'Calendar', 'Employee database'],
    operations: ['Project management', 'Workflow engine', 'Analytics', 'Communication tools'],
    kitchen: ['POS system', 'Inventory management', 'Recipe database', 'Order management'],
    quality: ['Inspection tools', 'Compliance database', 'Audit system', 'Reporting tools'],
    compliance: ['Regulatory database', 'Audit system', 'Risk assessment tools', 'Training platform']
  };
  return tools[type] || ['Database', 'API gateway', 'Analytics', 'Communication tools'];
}

function inferMetrics(type) {
  const metrics = {
    sales: ['Conversion rate', 'Average deal size', 'Sales cycle length', 'Customer acquisition cost'],
    procurement: ['Cost savings', 'Supplier performance', 'Order accuracy', 'Lead time'],
    finance: ['Payment accuracy', 'Processing time', 'Cash flow improvement', 'Error rate'],
    support: ['First response time', 'Resolution rate', 'CSAT score', 'Tickets per agent'],
    marketing: ['Reach', 'Engagement rate', 'Conversion rate', 'ROI'],
    logistics: ['Delivery time', 'On-time rate', 'Cost per shipment', 'Exception rate'],
    inventory: ['Stockout rate', 'Turnover rate', 'Accuracy', 'Carrying cost'],
    hr: ['Time to hire', 'Retention rate', 'Employee satisfaction', 'Training completion'],
    operations: ['Process efficiency', 'Cycle time', 'Error rate', 'SLA compliance'],
    kitchen: ['Order accuracy', 'Prep time', 'Waste percentage', 'Customer satisfaction'],
    quality: ['Defect rate', 'Compliance score', 'Audit results', 'Issue resolution time'],
    compliance: ['Violation count', 'Risk score', 'Training completion', 'Audit score']
  };
  return metrics[type] || ['Efficiency', 'Accuracy', 'Satisfaction', 'Cost savings'];
}

/**
 * Generate agent strategy file content
 */
export function generateAgentStrategy(agentData, name) {
  const camelName = name.replace(/[^a-zA-Z0-9]/g, '');
  const strategyName = `${camelName}Strategy`;

  return `/**
 * ${agentData.name} Agent Strategy
 * Generated by HOJAI Foundry LLM Agent Generator
 *
 * Description: ${agentData.description}
 * Type: ${agentData.role}
 * Confidence: ${(agentData.confidence || 0.75) * 100}%
 */

export const ${strategyName} = {
  name: '${agentData.name}',
  description: '${agentData.description}',
  role: '${agentData.role}',
  type: '${inferTypeFromRole(agentData.role)}',

  personality: ${JSON.stringify(agentData.personality || [], null, 2)},

  goals: ${JSON.stringify(agentData.goals || [], null, 2)},

  capabilities: ${JSON.stringify(agentData.capabilities || [], null, 2)},

  workflow: {
    trigger: '${agentData.workflow?.trigger || 'User request'}',
    input: '${agentData.workflow?.input || 'User message'}',
    process: \`${agentData.workflow?.process || 'Process user request'}\`,
    output: '${agentData.workflow?.output || 'Response'}',
    followup: '${agentData.workflow?.followup || 'Update memory'}'
  },

  tools: {
    apis: ${JSON.stringify(agentData.tools?.apis || [], null, 2)},
    services: ${JSON.stringify(agentData.tools?.services || [], null, 2)},
    databases: ${JSON.stringify(agentData.tools?.databases || [], null, 2)}
  },

  memory: {
    shortTerm: '${agentData.memory?.shortTerm || 'Conversation context'}',
    longTerm: '${agentData.memory?.longTerm || 'User preferences'}',
    episodic: '${agentData.memory?.episodic || 'Past interactions'}'
  },

  metrics: ${JSON.stringify(agentData.metrics || [], null, 2)},

  safety: ${JSON.stringify(agentData.safety || ['Validate input', 'Log actions'], null, 2)},

  confidence: ${agentData.confidence || 0.75},

  async run({ input, context, memory, tools }) {
    // Entry point for the agent
    const startTime = Date.now();

    try {
      // 1. Parse and validate input
      const parsed = this.parseInput(input);

      // 2. Check memory for context
      const relevantMemory = await memory.recall({
        entityId: context.entityId,
        type: 'episodic',
        limit: 5
      });

      // 3. Execute workflow
      const result = await this.executeWorkflow({
        input: parsed,
        context,
        memory: relevantMemory,
        tools
      });

      // 4. Store in memory
      await memory.store({
        type: 'episodic',
        entityId: context.entityId,
        data: { input, result, timestamp: Date.now() }
      });

      // 5. Return result
      return {
        success: true,
        agent: this.name,
        result,
        metrics: {
          duration: Date.now() - startTime,
          confidence: this.confidence
        }
      };

    } catch (error) {
      return {
        success: false,
        agent: this.name,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  },

  parseInput(input) {
    // Parse and validate input
    if (typeof input === 'string') {
      return { text: input, entities: this.extractEntities(input) };
    }
    return input;
  },

  extractEntities(text) {
    // Simple entity extraction (extend with NLP)
    const entities = {
      emails: (text.match(/[\\w.-]+@[\\w.-]+\\.\\w+/g) || []),
      phones: (text.match(/\\+?[\\d\\s-()]{10,}/g) || []),
      urls: (text.match(/https?:\\/\\/[^\\s]+/g) || []),
      currency: (text.match(/\\$[\\d,]+(\\.\\d{2})?/g) || [])
    };
    return entities;
  },

  async executeWorkflow({ input, context, memory, tools }) {
    // Main workflow logic
    // Extend this based on agent type and goals

    const { text, entities } = input;

    // Example workflow steps:
    // 1. Analyze intent
    // 2. Gather required information
    // 3. Execute action
    // 4. Generate response

    return {
      response: \`Processed: \${text}\`,
      entities,
      nextSteps: this.suggestNextSteps(input)
    };
  },

  suggestNextSteps(input) {
    // Suggest follow-up actions
    return [
      { action: 'confirm', description: 'Confirm completion with user' },
      { action: 'escalate', description: 'Escalate if confidence low' }
    ];
  }
};

// Default export for registry
export default ${strategyName};
`;
}

function inferTypeFromRole(role) {
  const lower = (role || '').toLowerCase();
  if (lower.includes('sale')) return 'sales';
  if (lower.includes('procure')) return 'procurement';
  if (lower.includes('financ')) return 'finance';
  if (lower.includes('support')) return 'support';
  if (lower.includes('market')) return 'marketing';
  if (lower.includes('logistic')) return 'logistics';
  if (lower.includes('inventory')) return 'inventory';
  if (lower.includes('hr') || lower.includes('human')) return 'hr';
  if (lower.includes('operat')) return 'operations';
  if (lower.includes('kitchen')) return 'kitchen';
  if (lower.includes('quality')) return 'quality';
  if (lower.includes('complian')) return 'compliance';
  return 'operations';
}

/**
 * Main function: Generate agent from natural language prompt
 */
export async function generateAgentFromPrompt(prompt, options = {}) {
  console.log(kleur.cyan('▸ Generating agent strategy with LLM…'));

  // Call LLM to generate agent data
  const agentData = await callLLM(prompt, options);

  console.log(kleur.green('▸ Generated agent strategy:'));
  console.log(kleur.gray(`  Name: ${agentData.name}`));
  console.log(kleur.gray(`  Type: ${agentData.role}`));
  console.log(kleur.gray(`  Capabilities: ${agentData.capabilities?.length || 0}`));
  console.log(kleur.gray(`  Confidence: ${((agentData.confidence || 0.75) * 100).toFixed(0)}%`));

  return agentData;
}

/**
 * Write agent strategy to file
 */
export async function writeAgentStrategy(targetDir, agentData, agentName) {
  const strategy = generateAgentStrategy(agentData, agentName);

  // Convert agent name to file-friendly format
  const fileName = agentName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.strategy.js';
  const filePath = path.join(targetDir, 'apps', 'backend', 'src', 'agents', 'strategies', fileName);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, strategy, 'utf8');

  console.log(kleur.green(`▸ Wrote strategy to: ${filePath}`));

  return filePath;
}
