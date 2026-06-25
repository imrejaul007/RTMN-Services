/**
 * patcher.js — Generate targeted patches for blueprint updates
 */

import { categorizeChanges, countChanges } from './diff.js';

/**
 * Generate minimal patches for a blueprint update
 */
export function generatePatch(oldBlueprint, newBlueprint, changes) {
  const patches = [];
  const categorized = categorizeChanges(changes);

  // Config changes
  if (categorized.config.length > 0) {
    patches.push(generateConfigPatch(oldBlueprint, newBlueprint, categorized.config));
  }

  // Agent changes
  if (categorized.agents.length > 0) {
    patches.push(...generateAgentPatches(oldBlueprint, newBlueprint, categorized.agents));
  }

  // Integration changes
  if (categorized.integrations.length > 0) {
    patches.push(...generateIntegrationPatches(oldBlueprint, newBlueprint, categorized.integrations));
  }

  // Workflow changes
  if (categorized.workflows.length > 0) {
    patches.push(...generateWorkflowPatches(oldBlueprint, newBlueprint, categorized.workflows));
  }

  // UI changes
  if (categorized.ui.length > 0) {
    patches.push(...generateUIPatches(oldBlueprint, newBlueprint, categorized.ui));
  }

  // Other changes
  if (categorized.other.length > 0) {
    patches.push({
      path: 'blueprint.json',
      operation: 'merge',
      description: `Update ${categorized.other.length} additional field(s)`,
      content: extractValues(categorized.other, newBlueprint)
    });
  }

  return patches;
}

/**
 * Generate full regeneration patch when surgical update isn't feasible
 */
export function generateFullRegeneration(blueprint) {
  return [{
    path: 'blueprint.json',
    operation: 'replace',
    description: 'Full blueprint regeneration (structural changes detected)',
    content: {
      version: blueprint.version || '2.0',
      config: blueprint.config,
      agents: blueprint.agents,
      integrations: blueprint.integrations,
      workflows: blueprint.workflows,
      ui: blueprint.ui,
      metadata: {
        ...blueprint.metadata,
        regeneratedAt: new Date().toISOString(),
        reason: 'structural_changes'
      }
    }
  }];
}

// ---------------------------------------------------------------------------
// Specific Patch Generators
// ---------------------------------------------------------------------------

function generateConfigPatch(oldBlueprint, newBlueprint, changes) {
  const configChanges = {};
  for (const change of changes) {
    const key = change.path.replace('config.', '');
    configChanges[key] = newBlueprint.config?.[key];
  }

  return {
    path: 'blueprint.json',
    operation: 'replace',
    description: `Update config: ${Object.keys(configChanges).join(', ')}`,
    content: { config: newBlueprint.config },
    section: 'config'
  };
}

function generateAgentPatches(oldBlueprint, newBlueprint, changes) {
  const patches = [];
  const oldAgents = oldBlueprint.agents || [];
  const newAgents = newBlueprint.agents || [];

  // Find added agents
  const oldIds = new Set(oldAgents.map(a => a.id || a.name));
  const addedAgents = newAgents.filter(a => !oldIds.has(a.id || a.name));
  if (addedAgents.length > 0) {
    patches.push({
      path: 'apps/backend/src/agents/',
      operation: 'add',
      description: `Add ${addedAgents.length} agent(s): ${addedAgents.map(a => a.name).join(', ')}`,
      content: addedAgents.map(a => generateAgentFile(a)),
      type: 'agent'
    });
  }

  // Find removed agents
  const newIds = new Set(newAgents.map(a => a.id || a.name));
  const removedAgents = oldAgents.filter(a => !newIds.has(a.id || a.name));
  if (removedAgents.length > 0) {
    patches.push({
      path: 'apps/backend/src/agents/',
      operation: 'remove',
      description: `Remove ${removedAgents.length} agent(s): ${removedAgents.map(a => a.name).join(', ')}`,
      content: removedAgents.map(a => a.name),
      type: 'agent'
    });
  }

  // Find modified agents
  for (const newAgent of newAgents) {
    const oldAgent = oldAgents.find(a => (a.id || a.name) === (newAgent.id || newAgent.name));
    if (oldAgent) {
      const agentChanges = changes.filter(c =>
        c.path.startsWith(`agents.`) &&
        (c.path.includes(newAgent.name) || c.path.includes(newAgent.id))
      );
      if (agentChanges.length > 0) {
        patches.push({
          path: `apps/backend/src/agents/${toKebabCase(newAgent.name)}.js`,
          operation: 'replace',
          description: `Update agent: ${newAgent.name}`,
          content: generateAgentFile(newAgent),
          changes: agentChanges,
          type: 'agent'
        });
      }
    }
  }

  return patches;
}

function generateIntegrationPatches(oldBlueprint, newBlueprint, changes) {
  const patches = [];
  const oldIntegrations = oldBlueprint.integrations || [];
  const newIntegrations = newBlueprint.integrations || [];

  // Find added integrations
  const oldNames = new Set(oldIntegrations.map(i => i.name));
  const added = newIntegrations.filter(i => !oldNames.has(i.name));
  if (added.length > 0) {
    patches.push({
      path: 'src/integrations/',
      operation: 'add',
      description: `Add integrations: ${added.map(i => i.name).join(', ')}`,
      content: added,
      type: 'integration'
    });
  }

  // Find removed integrations
  const newNames = new Set(newIntegrations.map(i => i.name));
  const removed = oldIntegrations.filter(i => !newNames.has(i.name));
  if (removed.length > 0) {
    patches.push({
      path: 'src/integrations/',
      operation: 'remove',
      description: `Remove integrations: ${removed.map(i => i.name).join(', ')}`,
      content: removed.map(i => i.name),
      type: 'integration'
    });
  }

  return patches;
}

function generateWorkflowPatches(oldBlueprint, newBlueprint, changes) {
  const patches = [];
  const oldWorkflows = oldBlueprint.workflows || [];
  const newWorkflows = newBlueprint.workflows || [];

  // Similar logic to integrations
  const oldNames = new Set(oldWorkflows.map(w => w.name));
  const added = newWorkflows.filter(w => !oldNames.has(w.name));
  if (added.length > 0) {
    patches.push({
      path: 'src/workflows/',
      operation: 'add',
      description: `Add workflows: ${added.map(w => w.name).join(', ')}`,
      content: added,
      type: 'workflow'
    });
  }

  return patches;
}

function generateUIPatches(oldBlueprint, newBlueprint, changes) {
  const patches = [];

  // UI changes are typically theme, pages, or component changes
  const uiChanges = {};
  for (const change of changes) {
    const key = change.path.replace('ui.', '');
    uiChanges[key] = change.newValue;
  }

  if (Object.keys(uiChanges).length > 0) {
    patches.push({
      path: 'apps/frontend/src/',
      operation: 'merge',
      description: `Update UI: ${Object.keys(uiChanges).join(', ')}`,
      content: uiChanges,
      type: 'ui'
    });
  }

  return patches;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateAgentFile(agent) {
  const nameKebab = toKebabCase(agent.name);
  const capabilities = agent.capabilities || [];

  return {
    filename: `${nameKebab}.js`,
    content: `/**
 * ${agent.name} Agent
 * Generated by Blueprint Diff Engine
 */

export const ${toCamelCase(agent.name)}Agent = {
  name: '${agent.name}',
  role: '${agent.role || 'assistant'}',
  type: '${agent.type || 'system'}',
  capabilities: ${JSON.stringify(capabilities, null, 4)},
  personality: ${JSON.stringify(agent.personality || {}, null, 4)},

  async act(context) {
    // TODO: Implement agent behavior
    return { action: 'respond', message: 'Hello from ${agent.name}' };
  }
};

export default ${toCamelCase(agent.name)}Agent;
`
  };
}

function extractValues(changes, blueprint) {
  const result = {};
  for (const change of changes) {
    const keys = change.path.split('.');
    let value = blueprint;
    for (const key of keys) {
      value = value?.[key];
    }
    if (value !== undefined) {
      result[keys[keys.length - 1]] = value;
    }
  }
  return result;
}

function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function toCamelCase(str) {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '');
}
