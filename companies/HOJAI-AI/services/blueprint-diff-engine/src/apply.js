/**
 * apply.js — Apply patches to update blueprints
 */

/**
 * Apply a set of patches to a blueprint
 */
export function applyPatch(blueprint, patches) {
  let updated = JSON.parse(JSON.stringify(blueprint));

  for (const patch of patches) {
    updated = applySinglePatch(updated, patch);
  }

  return updated;
}

/**
 * Apply a single patch
 */
function applySinglePatch(blueprint, patch) {
  switch (patch.operation) {
    case 'replace':
      return applyReplace(blueprint, patch);
    case 'add':
      return applyAdd(blueprint, patch);
    case 'remove':
      return applyRemove(blueprint, patch);
    case 'merge':
      return applyMerge(blueprint, patch);
    default:
      throw new Error(`Unknown patch operation: ${patch.operation}`);
  }
}

function applyReplace(blueprint, patch) {
  if (patch.path === 'blueprint.json') {
    return { ...blueprint, ...patch.content };
  }

  // For specific sections
  if (patch.section === 'config') {
    return {
      ...blueprint,
      config: { ...blueprint.config, ...patch.content.config }
    };
  }

  return blueprint;
}

function applyAdd(blueprint, patch) {
  const newBlueprint = JSON.parse(JSON.stringify(blueprint));

  if (patch.type === 'agent' && patch.content) {
    const agents = newBlueprint.agents || [];
    for (const agent of patch.content) {
      if (!agents.find(a => a.name === agent.name)) {
        agents.push(typeof agent === 'object' ? agent : { name: agent });
      }
    }
    newBlueprint.agents = agents;
  }

  if (patch.type === 'integration' && patch.content) {
    const integrations = newBlueprint.integrations || [];
    for (const integration of patch.content) {
      if (!integrations.find(i => i.name === integration.name)) {
        integrations.push(integration);
      }
    }
    newBlueprint.integrations = integrations;
  }

  return newBlueprint;
}

function applyRemove(blueprint, patch) {
  const newBlueprint = JSON.parse(JSON.stringify(blueprint));

  if (patch.type === 'agent' && patch.content) {
    const removeNames = patch.content.map(a => typeof a === 'string' ? a : a.name);
    newBlueprint.agents = (newBlueprint.agents || []).filter(
      a => !removeNames.includes(a.name)
    );
  }

  if (patch.type === 'integration' && patch.content) {
    const removeNames = patch.content.map(i => typeof i === 'string' ? i : i.name);
    newBlueprint.integrations = (newBlueprint.integrations || []).filter(
      i => !removeNames.includes(i.name)
    );
  }

  return newBlueprint;
}

function applyMerge(blueprint, patch) {
  return { ...blueprint, ...patch.content };
}
