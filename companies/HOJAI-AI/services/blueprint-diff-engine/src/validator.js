/**
 * validator.js — Blueprint validation
 */

/**
 * Validate a blueprint structure
 * @param {Object} blueprint
 * @returns {string[]} Array of error messages (empty if valid)
 */
export function validateBlueprint(blueprint) {
  const errors = [];

  if (!blueprint) {
    errors.push('Blueprint is required');
    return errors;
  }

  // Validate config
  if (!blueprint.config) {
    errors.push('Blueprint config is required');
  } else {
    if (!blueprint.config.name) {
      errors.push('Blueprint config.name is required');
    }
    if (!blueprint.config.type) {
      errors.push('Blueprint config.type is required');
    }
    if (blueprint.config.name && !isValidName(blueprint.config.name)) {
      errors.push('Blueprint config.name must be lowercase with hyphens');
    }
  }

  // Validate agents array
  if (blueprint.agents) {
    if (!Array.isArray(blueprint.agents)) {
      errors.push('Blueprint agents must be an array');
    } else {
      blueprint.agents.forEach((agent, i) => {
        if (!agent.name) {
          errors.push(`Agent ${i}: name is required`);
        }
        if (agent.capabilities && !Array.isArray(agent.capabilities)) {
          errors.push(`Agent ${i}: capabilities must be an array`);
        }
      });
    }
  }

  // Validate integrations
  if (blueprint.integrations) {
    if (!Array.isArray(blueprint.integrations)) {
      errors.push('Blueprint integrations must be an array');
    }
  }

  // Validate workflows
  if (blueprint.workflows) {
    if (!Array.isArray(blueprint.workflows)) {
      errors.push('Blueprint workflows must be an array');
    }
  }

  return errors;
}

/**
 * Validate that a blueprint is suitable for diffing
 */
export function canDiff(blueprintA, blueprintB) {
  if (!blueprintA || !blueprintB) return false;
  if (!blueprintA.config || !blueprintB.config) return false;
  return true;
}

/**
 * Check if a name is valid (lowercase with hyphens)
 */
function isValidName(name) {
  return /^[a-z][a-z0-9-]*$/.test(name);
}
