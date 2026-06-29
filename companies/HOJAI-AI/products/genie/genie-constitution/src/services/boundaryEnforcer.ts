/**
 * Boundary Enforcer — Check if action violates constitution
 * Spec Part 32: Personal Constitution
 */

import { Constitution, CheckResult, ActionRequest } from '../types/constitution.js';

export async function checkAction(
  constitution: Constitution,
  request: ActionRequest
): Promise<CheckResult> {
  const violatedRules: string[] = [];
  const matchedValues: string[] = [];
  let requiresApproval = false;

  const actionLower = request.action.toLowerCase();

  // Check "never" rules
  for (const rule of constitution.never) {
    if (matchesRule(actionLower, rule.toLowerCase())) {
      violatedRules.push(`NEVER: ${rule}`);
    }
  }

  // Check "requires approval" rules
  for (const rule of constitution.requiresApproval) {
    if (matchesRule(actionLower, rule.toLowerCase())) {
      requiresApproval = true;
    }
  }

  // Check special categories
  if (request.category === 'financial' && (request.amount || 0) > 100000) {
    requiresApproval = true;
  }

  // Check values
  for (const value of constitution.values) {
    if (matchesValue(actionLower, value.name)) {
      matchedValues.push(value.name);
    }
  }

  const allowed = violatedRules.length === 0;

  let reason = '';
  if (!allowed) {
    reason = `Action violates your constitution: ${violatedRules.join('; ')}`;
  } else if (requiresApproval) {
    reason = `Action requires your approval per constitution`;
  } else if (matchedValues.length > 0) {
    reason = `Action aligns with your values: ${matchedValues.join(', ')}`;
  } else {
    reason = 'Action allowed';
  }

  return {
    allowed,
    reason,
    requiresApproval,
    violatedRules,
    matchedValues,
  };
}

function matchesRule(action: string, rule: string): boolean {
  // Simple keyword matching - could be enhanced with LLM
  const keywords = rule.split(/\s+/).filter(w => w.length > 3);
  if (keywords.length === 0) return false;

  let matches = 0;
  for (const kw of keywords) {
    if (action.includes(kw)) matches++;
  }

  return matches >= Math.ceil(keywords.length / 2);
}

function matchesValue(action: string, valueName: string): boolean {
  const valueKeywords: Record<string, string[]> = {
    'honesty': ['truth', 'honest', 'transparent', 'disclose'],
    'family-first': ['family', 'parents', 'children', 'home'],
    'speed': ['fast', 'quick', 'immediate', 'urgent'],
    'quality': ['quality', 'best', 'excellent', 'perfect'],
    'innovation': ['new', 'innovative', 'creative', 'different'],
    'safety': ['safe', 'secure', 'protected', 'risk-free'],
    'privacy': ['private', 'confidential', 'discreet'],
    'learning': ['learn', 'study', 'discover', 'explore'],
    'health': ['health', 'fitness', 'wellness', 'medical'],
    'wealth': ['invest', 'money', 'financial', 'profit'],
  };

  const keywords = valueKeywords[valueName] || [valueName];
  return keywords.some(kw => action.includes(kw));
}