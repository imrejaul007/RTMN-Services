/**
 * Agent Framework Bridge Service (Port 5375)
 * Phase 6 - Agent Framework Compatibility for FlowOS
 *
 * Provides adapters for:
 * - LangGraph: StateGraph, CompiledGraph
 * - CrewAI: Crew, Agent, Task
 * - AutoGen: ConversableAgent, GroupChat
 *
 * Enables seamless import/export between FlowOS and these frameworks.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = parseInt(process.env.PORT, 10) || 5375;
const SERVICE_NAME = 'agent-framework-bridge';

// ============================================================================
// FRAMEWORK DEFINITIONS
// ============================================================================

const FRAMEWORKS = {
  LANGGRAPH: 'langgraph',
  CREWAI: 'crewai',
  AUTOGEN: 'autogen'
};

const AGENT_TYPES = {
  REACT: 'react',
  PLAN_EXECUTE: 'plan_execute',
  SUPERVISOR: 'supervisor',
  LEGISLATOR: 'legislator',
  TOOL_CALLER: 'tool_caller',
  CODE: 'code'
};

const TASK_TYPES = {
  RESEARCH: 'research',
  WRITING: 'writing',
  CODE: 'code',
  CRITIQUE: 'critique',
  SUBQUERY: 'subquery'
};

const TOOL_TYPES = {
  FUNCTION: 'function',
  RETRIEVER: 'retriever',
  PIPELINE: 'pipeline'
};

// ============================================================================
// CONVERSION HELPERS
// ============================================================================

/**
 * Convert FlowOS workflow to LangGraph StateGraph
 */
function toLangGraph(workflow) {
  const nodes = {};
  const edges = [];

  // Create nodes from workflow
  workflow.nodes.forEach(node => {
    const nodeType = getLangGraphNodeType(node.type);

    nodes[node.id] = {
      id: node.id,
      name: node.data?.label || node.id,
      type: nodeType,
      config: {
        ...node.data,
        tool_limit: node.data?.toolLimit || 5
      }
    };
  });

  // Create edges
  workflow.edges.forEach(edge => {
    edges.push({
      source: edge.source,
      target: edge.target,
      condition: edge.condition || null
    });
  });

  return {
    framework: FRAMEWORKS.LANGGRAPH,
    version: '0.1.0',
    state: workflow.stateSchema || { messages: [] },
    nodes,
    edges,
    generatedAt: Date.now()
  };
}

/**
 * Convert FlowOS workflow to CrewAI format
 */
function toCrewAI(workflow) {
  const agents = [];
  const tasks = [];
  const agentMap = new Map();

  // Create agents from nodes
  workflow.nodes
    .filter(n => n.type === 'human_task' || n.type === 'service_task')
    .forEach((node, index) => {
      const agentId = `agent_${index}`;
      agentMap.set(node.id, agentId);

      agents.push({
        id: agentId,
        role: node.data?.role || node.data?.label || `${node.type} agent`,
        goal: node.data?.goal || `Execute ${node.data?.label || node.id}`,
        backstory: node.data?.backstory || `An AI agent specializing in ${node.data?.label || node.type}`,
        verbose: node.data?.verbose || true,
        allow_delegation: node.data?.allowDelegation || false,
        tools: node.data?.tools || []
      });
    });

  // Create tasks from nodes
  workflow.nodes
    .filter(n => n.type === 'service_task')
    .forEach((node, index) => {
      const agentId = agentMap.get(node.id);

      tasks.push({
        id: `task_${index}`,
        description: node.data?.description || node.data?.label || `Task ${index}`,
        expected_output: node.data?.expectedOutput || 'Complete the assigned task',
        agent: agentId,
        async_execution: node.data?.async || false
      });
    });

  return {
    framework: FRAMEWORKS.CREWAI,
    version: '0.1.0',
    agents,
    tasks,
    process: workflow.process || 'sequential',
    config: {
      verbose: true,
      memory: workflow.memory || false
    },
    generatedAt: Date.now()
  };
}

/**
 * Convert FlowOS workflow to AutoGen format
 */
function toAutoGen(workflow) {
  const agents = [];
  const groupChat = {
    agents: [],
    messages: [],
    max_round: workflow.maxRound || 10
  };

  workflow.nodes
    .filter(n => n.type === 'human_task' || n.type === 'service_task')
    .forEach((node, index) => {
      const agentId = `agent_${index}`;

      const agent = {
        id: agentId,
        name: node.data?.name || node.data?.label || `Agent ${index}`,
        system_message: node.data?.systemMessage || `You are ${node.data?.label || 'an AI agent'}.`,
        llm_config: node.data?.llmConfig || {
          model: 'gpt-4',
          temperature: 0.7
        },
        human_input_mode: node.data?.humanInputMode || 'NEVER',
        max_consecutive_auto_reply: node.data?.maxAutoReply || 10,
        code_execution_config: node.data?.codeExecution ? {
          executor: 'local'
        } : null,
        is_termination_msg: node.data?.terminationMessage || ((x) => x.get('content', '').strip() == 'TERMINATE'),
        tools: node.data?.tools || []
      };

      agents.push(agent);
      groupChat.agents.push(agentId);
    });

  return {
    framework: FRAMEWORKS.AUTOGEN,
    version: '0.1.0',
    agents,
    group_chat: groupChat,
    config: {
      admin_name: workflow.adminName || 'Admin',
      messages: [],
      max_retries_for_this: 3
    },
    generatedAt: Date.now()
  };
}

/**
 * Convert LangGraph StateGraph to FlowOS workflow
 */
function fromLangGraph(langGraphDef) {
  const nodes = [];
  const edges = [];

  // Convert nodes
  Object.entries(langGraphDef.nodes || {}).forEach(([id, node]) => {
    nodes.push({
      id,
      type: getFlowOSNodeType(node.type),
      position: { x: 0, y: 0 },
      data: {
        label: node.name,
        ...node.config
      }
    });
  });

  // Convert edges
  (langGraphDef.edges || []).forEach(edge => {
    edges.push({
      id: `e_${edge.source}_${edge.target}`,
      source: edge.source,
      target: edge.target,
      condition: edge.condition
    });
  });

  return {
    nodes,
    edges,
    stateSchema: langGraphDef.state,
    metadata: {
      source: FRAMEWORKS.LANGGRAPH,
      generatedAt: Date.now()
    }
  };
}

/**
 * Convert CrewAI to FlowOS workflow
 */
function fromCrewAI(crewDef) {
  const nodes = [];
  const edges = [];
  let index = 0;

  // Create trigger
  nodes.push({
    id: 'trigger',
    type: 'trigger',
    position: { x: 100, y: 200 },
    data: { label: 'Crew Start' }
  });

  // Create agent nodes
  crewDef.agents?.forEach((agent, i) => {
    const agentNodeId = `agent_${i}`;
    nodes.push({
      id: agentNodeId,
      type: 'service_task',
      position: { x: 300 + i * 200, y: 200 },
      data: {
        label: agent.role,
        role: agent.role,
        goal: agent.goal,
        backstory: agent.backstory,
        tools: agent.tools
      }
    });

    if (i === 0) {
      edges.push({ id: 'e_trigger_agent', source: 'trigger', target: agentNodeId });
    } else {
      edges.push({ id: `e_agent_${i-1}_${i}`, source: `agent_${i-1}`, target: agentNodeId });
    }

    index++;
  });

  // Create terminal
  nodes.push({
    id: 'terminal',
    type: 'terminal',
    position: { x: 300 + crewDef.agents.length * 200, y: 200 },
    data: { label: 'Crew Complete' }
  });

  if (crewDef.agents?.length > 0) {
    edges.push({
      id: 'e_last_terminal',
      source: `agent_${crewDef.agents.length - 1}`,
      target: 'terminal'
    });
  }

  return {
    nodes,
    edges,
    metadata: {
      source: FRAMEWORKS.CREWAI,
      process: crewDef.process,
      agents: crewDef.agents?.length || 0,
      tasks: crewDef.tasks?.length || 0,
      generatedAt: Date.now()
    }
  };
}

/**
 * Convert AutoGen to FlowOS workflow
 */
function fromAutoGen(autoGenDef) {
  const nodes = [];
  const edges = [];

  // Create trigger
  nodes.push({
    id: 'trigger',
    type: 'trigger',
    position: { x: 100, y: 200 },
    data: { label: 'Group Chat Start' }
  });

  // Create agent nodes
  (autoGenDef.agents || []).forEach((agent, i) => {
    nodes.push({
      id: agent.id,
      type: 'service_task',
      position: { x: 300 + i * 200, y: 200 },
      data: {
        label: agent.name,
        systemMessage: agent.system_message,
        llmConfig: agent.llm_config,
        humanInputMode: agent.human_input_mode,
        tools: agent.tools
      }
    });

    if (i === 0) {
      edges.push({ id: 'e_trigger_agent', source: 'trigger', target: agent.id });
    } else {
      edges.push({ id: `e_agent_${i-1}_${i}`, source: autoGenDef.agents[i-1].id, target: agent.id });
    }
  });

  // Create terminal
  nodes.push({
    id: 'terminal',
    type: 'terminal',
    position: { x: 300 + autoGenDef.agents.length * 200, y: 200 },
    data: { label: 'Chat Complete' }
  });

  if (autoGenDef.agents?.length > 0) {
    edges.push({
      id: 'e_last_terminal',
      source: autoGenDef.agents[autoGenDef.agents.length - 1].id,
      target: 'terminal'
    });
  }

  return {
    nodes,
    edges,
    metadata: {
      source: FRAMEWORKS.AUTOGEN,
      groupChat: autoGenDef.group_chat,
      generatedAt: Date.now()
    }
  };
}

// ============================================================================
// TYPE MAPPINGS
// ============================================================================

function getLangGraphNodeType(flowOSType) {
  const map = {
    trigger: 'START',
    terminal: 'END',
    service_task: 'TOOL_CALLER',
    human_task: 'SUPERVISOR',
    condition: 'CONDITIONAL_EDGE',
    parallel: 'PARALLEL'
  };
  return map[flowOSType] || 'TOOL_CALLER';
}

function getFlowOSNodeType(langGraphType) {
  const map = {
    START: 'trigger',
    END: 'terminal',
    TOOL_CALLER: 'service_task',
    SUPERVISOR: 'human_task',
    CONDITIONAL_EDGE: 'condition',
    PARALLEL: 'parallel'
  };
  return map[langGraphType] || 'service_task';
}

// ============================================================================
// EXPRESS APP
// ============================================================================

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan(`[${SERVICE_NAME}] :method :url :status :response-time ms`));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    frameworks: Object.keys(FRAMEWORKS),
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
});

// ============================================================================
// API ENDPOINTS
// ============================================================================

// List supported frameworks
app.get('/api/frameworks', (req, res) => {
  res.json({
    frameworks: Object.values(FRAMEWORKS),
    agentTypes: Object.values(AGENT_TYPES),
    taskTypes: Object.values(TASK_TYPES),
    toolTypes: Object.values(TOOL_TYPES)
  });
});

// Convert FlowOS to framework
app.post('/api/convert/:framework', (req, res) => {
  const { framework } = req.params;
  const { workflow } = req.body;

  if (!workflow || !workflow.nodes) {
    return res.status(400).json({ error: 'workflow with nodes is required' });
  }

  try {
    let result;
    switch (framework.toLowerCase()) {
      case FRAMEWORKS.LANGGRAPH:
        result = toLangGraph(workflow);
        break;
      case FRAMEWORKS.CREWAI:
        result = toCrewAI(workflow);
        break;
      case FRAMEWORKS.AUTOGEN:
        result = toAutoGen(workflow);
        break;
      default:
        return res.status(400).json({
          error: 'Unsupported framework',
          supported: Object.values(FRAMEWORKS)
        });
    }

    res.json({
      success: true,
      framework,
      result
    });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Convert framework to FlowOS
app.post('/api/import', (req, res) => {
  const { definition, framework } = req.body;

  if (!definition) {
    return res.status(400).json({ error: 'definition is required' });
  }

  try {
    let result;

    // Auto-detect framework if not specified
    const detected = framework || detectFramework(definition);

    switch (detected.toLowerCase()) {
      case FRAMEWORKS.LANGGRAPH:
        result = fromLangGraph(definition);
        break;
      case FRAMEWORKS.CREWAI:
        result = fromCrewAI(definition);
        break;
      case FRAMEWORKS.AUTOGEN:
        result = fromAutoGen(definition);
        break;
      default:
        return res.status(400).json({
          error: 'Unsupported or unknown framework',
          supported: Object.values(FRAMEWORKS)
        });
    }

    res.json({
      success: true,
      detectedFramework: detected,
      workflow: result
    });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Generate code for framework
app.post('/api/generate/:framework', (req, res) => {
  const { framework } = req.params;
  const { workflow, options } = req.body;

  if (!workflow || !workflow.nodes) {
    return res.status(400).json({ error: 'workflow with nodes is required' });
  }

  try {
    let code;

    switch (framework.toLowerCase()) {
      case FRAMEWORKS.LANGGRAPH:
        code = generateLangGraphCode(workflow, options);
        break;
      case FRAMEWORKS.CREWAI:
        code = generateCrewAICode(workflow, options);
        break;
      case FRAMEWORKS.AUTOGEN:
        code = generateAutoGenCode(workflow, options);
        break;
      default:
        return res.status(400).json({
          error: 'Unsupported framework',
          supported: Object.values(FRAMEWORKS)
        });
    }

    res.json({
      success: true,
      framework,
      code,
      language: options?.language || 'python'
    });

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Detect framework from definition
app.post('/api/detect', (req, res) => {
  const { definition } = req.body;

  if (!definition) {
    return res.status(400).json({ error: 'definition is required' });
  }

  const framework = detectFramework(definition);

  res.json({
    detected: framework,
    confidence: framework ? 1.0 : 0
  });
});

// ============================================================================
// CODE GENERATION
// ============================================================================

function generateLangGraphCode(workflow, options) {
  const imports = ['from langgraph.graph import StateGraph, END', 'from typing import TypedDict, Annotated'];

  const stateDef = workflow.stateSchema ? `class State(TypedDict):\n    messages: list` : '';

  const nodeDefs = workflow.nodes
    .filter(n => n.type !== 'trigger' && n.type !== 'terminal')
    .map(n => `def ${n.id}(state):\n    # ${n.data?.label || n.id}\n    return state`);

  const nodesList = workflow.nodes.map(n => `    "${n.id}"`).join(',\n');

  const edgesList = workflow.edges.map(e =>
    `    ("${e.source}", "${e.target}")`
  ).join(',\n');

  return `"""
LangGraph workflow generated from FlowOS
Generated: ${new Date().toISOString()}
"""

${imports.join('\n')}

${stateDef ? stateDef + '\n\n' : ''}# Define nodes
${nodeDefs.join('\n\n')}

# Build graph
graph = StateGraph(${workflow.stateSchema ? 'State' : 'dict'})
${workflow.nodes.map(n => `graph.add_node("${n.id}", ${n.id})`).join('\n')}

# Add edges
${workflow.edges.map(e => `graph.add_edge("${e.source}", "${e.target}")`).join('\n')}

# Compile
app = graph.compile()

# Run
if __name__ == "__main__":
    result = app.invoke({"messages": []})
    print(result)
`;
}

function generateCrewAICode(workflow, options) {
  const agents = workflow.nodes
    .filter(n => n.type === 'service_task')
    .map((n, i) => {
      const role = n.data?.label || n.id;
      return `agent_${i} = Agent(
    role="${role}",
    goal="Execute ${role} tasks",
    backstory="AI agent for ${role}",
    verbose=True
)`;
    });

  const tasks = workflow.nodes
    .filter(n => n.type === 'service_task')
    .map((n, i) => {
      const label = n.data?.label || n.id;
      return `task_${i} = Task(
    description="${label}",
    expected_output="Completed ${label} task",
    agent=agent_${i}
)`;
    });

  const agentRefs = workflow.nodes
    .filter(n => n.type === 'service_task')
    .map((_, i) => `agent_${i}`).join(', ');

  const taskRefs = workflow.nodes
    .filter(n => n.type === 'service_task')
    .map((_, i) => `task_${i}`).join(', ');

  return `"""
CrewAI workflow generated from FlowOS
Generated: ${new Date().toISOString()}
"""

from crewai import Agent, Task, Crew

# Define agents
${agents.join('\n\n')}

# Define tasks
${tasks.join('\n\n')}

# Create crew
crew = Crew(
    agents=[${agentRefs}],
    tasks=[${taskRefs}],
    process="sequential",
    verbose=True
)

# Execute
if __name__ == "__main__":
    result = crew.kickoff()
    print(result)
`;
}

function generateAutoGenCode(workflow, options) {
  const agents = workflow.nodes
    .filter(n => n.type === 'service_task')
    .map((n, i) => {
      const name = n.data?.label || `Agent${i}`;
      const systemMsg = n.data?.systemMessage || `You are ${name}.`;
      return `agent_${i} = ConversableAgent(
    name="${name}",
    system_message="${systemMsg}",
    llm_config={"model": "gpt-4", "temperature": 0.7},
    human_input_mode="NEVER"
)`;
    });

  const agentRefs = workflow.nodes
    .filter(n => n.type === 'service_task')
    .map((_, i) => `agent_${i}`);

  return `"""
AutoGen workflow generated from FlowOS
Generated: ${new Date().toISOString()}
"""

from autogen import ConversableAgent, GroupChat, GroupChatManager

# Define agents
${agents.join('\n\n')}

# Create group chat
group_chat = GroupChat(
    agents=[${agentRefs.join(', ')}],
    messages=[],
    max_round=10
)

# Create manager
manager = GroupChatManager(
    groupchat=group_chat,
    llm_config={"model": "gpt-4", "temperature": 0.7}
)

# Execute
if __name__ == "__main__":
    chat_result = ${agentRefs[0] || 'agent_0'}.initiate_chat(
        manager,
        message="Start the conversation"
    )
`;
}

// ============================================================================
// FRAMEWORK DETECTION
// ============================================================================

function detectFramework(definition) {
  // LangGraph detection
  if (definition.nodes && definition.edges && definition.state !== undefined) {
    return FRAMEWORKS.LANGGRAPH;
  }

  // CrewAI detection
  if (definition.agents && definition.tasks) {
    return FRAMEWORKS.CREWAI;
  }

  // AutoGen detection
  if (definition.agents && definition.group_chat) {
    return FRAMEWORKS.AUTOGEN;
  }

  return null;
}

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] Agent Framework Bridge started on port ${PORT}`);
  console.log(`[${SERVICE_NAME}] Supported frameworks: ${Object.values(FRAMEWORKS).join(', ')}`);
});

module.exports = {
  FRAMEWORKS,
  AGENT_TYPES,
  TASK_TYPES,
  TOOL_TYPES,
  toLangGraph,
  toCrewAI,
  toAutoGen,
  fromLangGraph,
  fromCrewAI,
  fromAutoGen,
  detectFramework
};
