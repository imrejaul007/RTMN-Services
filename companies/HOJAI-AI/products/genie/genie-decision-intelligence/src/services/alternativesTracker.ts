/**
 * Alternatives Tracker — Track why alternatives were rejected
 * Spec Part 21: Decision Intelligence
 */

import { Decision, Alternative } from '../types/decision.js';
import { DecisionStorage } from './decisionStorage.js';

/**
 * Add an alternative to an existing decision
 */
export async function addAlternative(
  decisionId: string,
  alternative: Alternative
): Promise<Decision | null> {
  const decision = await DecisionStorage.get(decisionId);
  if (!decision) return null;

  // Check if already exists
  if (decision.alternatives.some(a => a.name === alternative.name)) {
    return decision;
  }

  return DecisionStorage.update(decisionId, {
    alternatives: [...decision.alternatives, alternative],
  });
}

/**
 * Update an alternative's status (e.g., mark as reconsidered)
 */
export async function updateAlternative(
  decisionId: string,
  alternativeName: string,
  updates: Partial<Alternative>
): Promise<Decision | null> {
  const decision = await DecisionStorage.get(decisionId);
  if (!decision) return null;

  const alternatives = decision.alternatives.map(a =>
    a.name === alternativeName ? { ...a, ...updates } : a
  );

  return DecisionStorage.update(decisionId, { alternatives });
}

/**
 * Get all alternatives for a decision
 */
export async function getAlternatives(decisionId: string): Promise<Alternative[]> {
  const decision = await DecisionStorage.get(decisionId);
  return decision?.alternatives || [];
}

/**
 * Find decisions where a specific alternative was rejected
 */
export async function findRejectedAlternative(
  userId: string,
  alternativeName: string
): Promise<Decision[]> {
  const decisions = await DecisionStorage.getForUser(userId);
  return decisions.filter(d =>
    d.alternatives.some(a =>
      a.name.toLowerCase() === alternativeName.toLowerCase() && a.rejected
    )
  );
}

/**
 * Find decisions that rejected a specific category of alternatives
 */
export async function findByCategory(
  userId: string,
  category: string
): Promise<Decision[]> {
  const decisions = await DecisionStorage.getForUser(userId);
  return decisions.filter(d =>
    d.alternatives.some(a =>
      a.name.toLowerCase().includes(category.toLowerCase())
    )
  );
}