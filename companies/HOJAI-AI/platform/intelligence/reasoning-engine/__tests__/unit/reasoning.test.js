import { describe, it, expect } from 'vitest';

// Reasoning strategies
const STRATEGIES = {
  deductive: 'general -> specific',
  inductive: 'specific -> general',
  abductive: 'best explanation'
};

// Deductive reasoning
function deductive(reasoning) {
  const { premise, rules, conclusion } = reasoning;
  const appliedRules = [];

  for (const rule of rules) {
    if (rule.condition(premise)) {
      appliedRules.push(rule);
    }
  }

  return {
    strategy: 'deductive',
    premise,
    appliedRules,
    conclusion: appliedRules.length > 0 ? conclusion || appliedRules[0].conclusion : null,
    confidence: appliedRules.length > 0 ? 0.9 : 0.3
  };
}

// Inductive reasoning
function inductive(reasoning) {
  const { observations } = reasoning;

  // Count frequency of each observation type
  const frequencies = {};
  for (const obs of observations) {
    frequencies[obs.type] = (frequencies[obs.type] || 0) + 1;
  }

  // Find most common
  const sorted = Object.entries(frequencies).sort((a, b) => b[1] - a[1]);
  const mostCommon = sorted[0];

  return {
    strategy: 'inductive',
    observations: observations.length,
    frequencies,
    generalization: mostCommon ? mostCommon[0] : 'unknown',
    confidence: observations.length > 5 ? 0.85 : 0.5
  };
}

// Abductive reasoning
function abductive(reasoning) {
  const { observation, hypotheses } = reasoning;

  // Score each hypothesis
  const scored = hypotheses.map(h => {
    let score = 0;

    // Check if hypothesis explains observation
    if (h.explains(observation)) score += 0.4;

    // Check simplicity (fewer assumptions = higher score)
    score += (1 - h.assumptions.length * 0.1);

    // Check prior probability
    score += h.prior || 0.5;

    return { hypothesis: h, score: Math.min(1, Math.max(0, score)) };
  });

  scored.sort((a, b) => b.score - a.score);

  return {
    strategy: 'abductive',
    observation,
    explanations: scored.slice(0, 3),
    bestExplanation: scored[0]?.hypothesis?.name || 'none',
    confidence: scored[0]?.score || 0
  };
}

// Chain of thought
function chainOfThought(query) {
  const steps = [];

  // Step 1: Understand query
  steps.push({
    step: 1,
    type: 'decomposition',
    description: `Decompose: ${query}`,
    subQueries: query.split(' and ').map(s => s.trim())
  });

  // Step 2: Gather evidence
  steps.push({
    step: 2,
    type: 'evidence',
    description: 'Gather supporting evidence'
  });

  // Step 3: Evaluate
  steps.push({
    step: 3,
    type: 'evaluation',
    description: 'Evaluate alternatives'
  });

  // Step 4: Conclude
  steps.push({
    step: 4,
    type: 'conclusion',
    description: 'Form conclusion'
  });

  return steps;
}

// Score reasoning
function scoreReasoning(reasoning) {
  let score = 0;

  // Logic consistency
  if (reasoning.logicallyConsistent !== false) score += 0.3;

  // Evidence support
  if (reasoning.evidenceCount > 2) score += 0.3;

  // Confidence
  if (reasoning.confidence > 0.7) score += 0.2;

  // Alternative consideration
  if (reasoning.alternativesConsidered) score += 0.2;

  return Math.min(1, score);
}

describe('Reasoning Engine - Deductive', () => {
  it('should apply rules to premise', () => {
    const result = deductive({
      premise: { type: 'mammal' },
      rules: [
        { condition: p => p.type === 'mammal', conclusion: 'has heart' }
      ]
    });
    expect(result.appliedRules.length).toBe(1);
  });

  it('should return null when no rules apply', () => {
    const result = deductive({
      premise: { type: 'unknown' },
      rules: [
        { condition: p => p.type === 'mammal', conclusion: 'has heart' }
      ]
    });
    expect(result.conclusion).toBeNull();
  });

  it('should calculate confidence based on rules applied', () => {
    const result = deductive({
      premise: { type: 'mammal' },
      rules: [
        { condition: p => p.type === 'mammal', conclusion: 'has heart' }
      ]
    });
    expect(result.confidence).toBe(0.9);
  });
});

describe('Reasoning Engine - Inductive', () => {
  it('should count observations', () => {
    const result = inductive({
      observations: [
        { type: 'swan', color: 'white' },
        { type: 'swan', color: 'white' },
        { type: 'swan', color: 'white' }
      ]
    });
    expect(result.observations).toBe(3);
  });

  it('should find most common pattern', () => {
    const result = inductive({
      observations: [
        { type: 'swan', color: 'white' },
        { type: 'swan', color: 'white' },
        { type: 'bird', color: 'blue' }
      ]
    });
    expect(result.generalization).toBe('swan');
  });

  it('should increase confidence with more observations', () => {
    const few = inductive({ observations: Array(3).fill({ type: 'a' }) });
    const many = inductive({ observations: Array(10).fill({ type: 'a' }) });
    expect(many.confidence).toBeGreaterThan(few.confidence);
  });
});

describe('Reasoning Engine - Abductive', () => {
  it('should rank hypotheses by score', () => {
    const result = abductive({
      observation: 'grass is wet',
      hypotheses: [
        { name: 'rained', explains: o => o === 'grass is wet', assumptions: ['water'], prior: 0.8 },
        { name: 'sprinkler', explains: o => o === 'grass is wet', assumptions: ['water', 'device'], prior: 0.5 }
      ]
    });
    expect(result.explanations[0].hypothesis.name).toBe('rained');
  });

  it('should return best explanation', () => {
    const result = abductive({
      observation: 'ground is muddy',
      hypotheses: [
        { name: 'rained', explains: () => true, assumptions: [], prior: 0.9 }
      ]
    });
    expect(result.bestExplanation).toBe('rained');
  });
});

describe('Reasoning Engine - Chain of Thought', () => {
  it('should decompose query into steps', () => {
    const steps = chainOfThought('What is AI and how does it work');
    expect(steps.length).toBe(4);
  });

  it('should include decomposition step', () => {
    const steps = chainOfThought('analyze and decide');
    const decomp = steps.find(s => s.type === 'decomposition');
    expect(decomp).toBeDefined();
  });

  it('should include conclusion step', () => {
    const steps = chainOfThought('solve this');
    const conc = steps.find(s => s.type === 'conclusion');
    expect(conc).toBeDefined();
  });

  it('should generate sub-queries for complex questions', () => {
    const steps = chainOfThought('X and Y and Z');
    expect(steps[0].subQueries.length).toBe(3);
  });
});

describe('Reasoning Engine - Scoring', () => {
  it('should score high-quality reasoning', () => {
    const reasoning = {
      logicallyConsistent: true,
      evidenceCount: 5,
      confidence: 0.9,
      alternativesConsidered: true
    };
    expect(scoreReasoning(reasoning)).toBe(1);
  });

  it('should penalize missing elements', () => {
    const reasoning = {
      logicallyConsistent: true,
      evidenceCount: 1,
      confidence: 0.5,
      alternativesConsidered: false
    };
    expect(scoreReasoning(reasoning)).toBeLessThan(0.7);
  });

  it('should handle incomplete reasoning', () => {
    const reasoning = {};
    expect(scoreReasoning(reasoning)).toBeGreaterThanOrEqual(0);
  });
});

describe('Reasoning Engine - Integration', () => {
  it('should solve basic deduction', () => {
    const rules = [
      { condition: () => true, conclusion: 'applies' }
    ];

    const result = deductive({
      premise: { test: true },
      rules,
      conclusion: 'test conclusion'
    });

    expect(result.appliedRules.length).toBe(1);
    expect(result.strategy).toBe('deductive');
  });

  it('should solve pattern recognition', () => {
    const observations = [
      { type: 'event', result: 'positive' },
      { type: 'event', result: 'positive' },
      { type: 'event', result: 'positive' }
    ];

    const result = inductive({ observations });
    expect(result.observations).toBe(3);
    expect(result.generalization).toBe('event');
  });

  it('should support multi-strategy reasoning', () => {
    const deductiveResult = deductive({
      premise: { rule: 'invest' },
      rules: [{ condition: () => true, conclusion: 'growth expected' }]
    });

    const inductiveResult = inductive({
      observations: [{ type: 'investment', outcome: 'profit' }]
    });

    const abductiveResult = abductive({
      observation: 'high returns',
      hypotheses: [{ name: 'good strategy', explains: () => true, assumptions: [], prior: 0.8 }]
    });

    expect(deductiveResult.strategy).toBe('deductive');
    expect(inductiveResult.strategy).toBe('inductive');
    expect(abductiveResult.strategy).toBe('abductive');
  });
});
