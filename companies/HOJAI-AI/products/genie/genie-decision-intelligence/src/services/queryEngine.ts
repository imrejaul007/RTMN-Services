/**
 * Query Engine — "Why did we choose X?"
 * Spec Part 21: Decision Intelligence
 */

import { DecisionStorage } from './decisionStorage.js';
import { WhyQuery, WhyResponse, Decision } from '../types/decision.js';

/**
 * Answer "Why did we choose X?" by finding related decisions
 */
export async function answerWhyQuery(query: WhyQuery): Promise<WhyResponse> {
  // Get all decisions for user
  const allDecisions = await DecisionStorage.getForUser(query.userId);

  // Find decisions that match the topic
  const matchedDecisions = findMatchingDecisions(allDecisions, query.topic);

  // If direct match found
  if (matchedDecisions.length > 0) {
    const decision = matchedDecisions[0];

    return {
      decision,
      alternatives: decision.alternatives,
      similarDecisions: matchedDecisions.slice(1, 5),
      confidence: calculateMatchConfidence(decision, query.topic),
      reasoning: buildReasoning(decision, query.topic),
    };
  }

  // Try to find similar decisions based on context
  const similarDecisions = findSimilarByContext(allDecisions, query.topic, query.context);

  if (similarDecisions.length > 0) {
    return {
      decision: null,
      alternatives: [],
      similarDecisions,
      confidence: 0.3,
      reasoning: `No direct decision found about "${query.topic}". But here are ${similarDecisions.length} related decisions.`,
    };
  }

  return {
    decision: null,
    alternatives: [],
    similarDecisions: [],
    confidence: 0,
    reasoning: `No decision found about "${query.topic}". You may not have made this decision yet, or it's stored under a different term.`,
  };
}

function findMatchingDecisions(decisions: Decision[], topic: string): Decision[] {
  const topicLower = topic.toLowerCase();
  const topicWords = topicLower.split(/\s+/);

  return decisions
    .map(d => ({
      decision: d,
      score: calculateSimilarity(d, topicLower, topicWords),
    }))
    .filter(({ score }) => score > 0.3)
    .sort((a, b) => b.score - a.score)
    .map(({ decision }) => decision);
}

function calculateSimilarity(decision: Decision, topicLower: string, topicWords: string[]): number {
  let score = 0;
  const whatLower = decision.what.toLowerCase();
  const whyLower = decision.why.toLowerCase();
  const tagsLower = decision.tags.map(t => t.toLowerCase());

  // Exact topic in "what"
  if (whatLower.includes(topicLower)) score += 0.8;
  // Exact topic in "why"
  if (whyLower.includes(topicLower)) score += 0.5;
  // Topic words in "what"
  const whatMatches = topicWords.filter(w => whatLower.includes(w)).length;
  score += (whatMatches / topicWords.length) * 0.4;
  // Topic words in "why"
  const whyMatches = topicWords.filter(w => whyLower.includes(w)).length;
  score += (whyMatches / topicWords.length) * 0.3;
  // Topic in tags
  for (const tag of tagsLower) {
    if (topicWords.some(w => tag.includes(w))) score += 0.2;
  }

  return Math.min(1, score);
}

function findSimilarByContext(decisions: Decision[], topic: string, context?: string): Decision[] {
  if (!context) return [];

  const contextLower = context.toLowerCase();
  return decisions
    .filter(d => {
      const combined = (d.what + ' ' + d.why).toLowerCase();
      return combined.includes(contextLower);
    })
    .slice(0, 5);
}

function calculateMatchConfidence(decision: Decision, topic: string): number {
  const topicLower = topic.toLowerCase();
  if (decision.what.toLowerCase() === topicLower) return 1.0;
  if (decision.what.toLowerCase().includes(topicLower)) return 0.9;
  return 0.7;
}

function buildReasoning(decision: Decision, topic: string): string {
  const date = new Date(decision.when).toLocaleDateString();
  let reasoning = `On ${date}, you decided: "${decision.what}"\n\n`;
  reasoning += `Reason: ${decision.why}\n\n`;

  if (decision.who.length > 0) {
    reasoning += `Approved by: ${decision.who.join(', ')}\n\n`;
  }

  const rejected = decision.alternatives.filter(a => a.rejected);
  if (rejected.length > 0) {
    reasoning += `Alternatives considered:\n`;
    for (const alt of rejected) {
      reasoning += `  - ${alt.name}${alt.reason ? ` (${alt.reason})` : ''}\n`;
    }
    reasoning += '\n';
  }

  if (decision.revisitDate) {
    reasoning += `Scheduled for revisit: ${new Date(decision.revisitDate).toLocaleDateString()}\n`;
  }

  return reasoning.trim();
}

/**
 * Find decisions related to a topic
 */
export async function findRelated(userId: string, topic: string): Promise<Decision[]> {
  const decisions = await DecisionStorage.getForUser(userId);
  return findMatchingDecisions(decisions, topic);
}