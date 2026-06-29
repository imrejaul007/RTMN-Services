/**
 * Scenario Builder — Build "what if" scenarios
 * Spec Part 34: Life Simulation
 */

import { v4 as uuidv4 } from 'uuid';
import { SimulationRequest, SimulationResult, TimelineEvent, Impact, Risk } from '../types/simulation.js';

export async function runSimulation(req: SimulationRequest): Promise<SimulationResult> {
  const scenario = req.scenario.toLowerCase();

  // Detect scenario type
  if (scenario.includes('move') || scenario.includes('relocate')) {
    return simulateMove(req);
  } else if (scenario.includes('hire') || scenario.includes('employee')) {
    return simulateHire(req);
  } else if (scenario.includes('work') || scenario.includes('hours')) {
    return simulateWorkHours(req);
  } else if (scenario.includes('exercise')) {
    return simulateExercise(req);
  } else if (scenario.includes('save') || scenario.includes('invest')) {
    return simulateSavings(req);
  } else {
    return simulateGeneric(req);
  }
}

function simulateMove(req: SimulationRequest): SimulationResult {
  const destination = req.parameters.destination || 'Unknown';
  const timeline: TimelineEvent[] = [
    { month: 1, event: 'Move preparation (packing, paperwork)', category: 'lifestyle', impact: 'neutral', magnitude: 30 },
    { month: 2, event: 'Actual move', category: 'lifestyle', impact: 'negative', magnitude: 50 },
    { month: 3, event: 'Settling in, finding housing', category: 'lifestyle', impact: 'negative', magnitude: 40 },
    { month: 6, event: 'Establishing new routine', category: 'lifestyle', impact: 'positive', magnitude: 60 },
    { month: 12, event: 'New network forming', category: 'relationships', impact: 'positive', magnitude: 70 },
  ];

  const impacts: Impact[] = [
    {
      area: 'Family',
      type: 'negative',
      description: 'Distance from parents/family increases',
      magnitude: 70,
      timeframe: 'Immediate',
    },
    {
      area: 'Career',
      type: 'positive',
      description: 'New opportunities in ' + destination,
      magnitude: 75,
      timeframe: '6-12 months',
    },
    {
      area: 'Cost of Living',
      type: 'neutral',
      description: 'Costs depend on destination',
      magnitude: 50,
      timeframe: 'Ongoing',
    },
    {
      area: 'Social Network',
      type: 'neutral',
      description: 'Need to rebuild local connections',
      magnitude: 60,
      timeframe: '6-18 months',
    },
  ];

  const risks: Risk[] = [
    {
      category: 'Homesickness',
      description: 'Adjustment period can be challenging',
      likelihood: 'medium',
      severity: 'medium',
      mitigation: 'Schedule regular visits home',
    },
    {
      category: 'Career Uncertainty',
      description: 'New market may take time to navigate',
      likelihood: 'medium',
      severity: 'high',
      mitigation: 'Secure income source before moving',
    },
  ];

  return {
    scenarioId: `sim_${uuidv4()}`,
    userId: req.userId,
    scenario: req.scenario,
    timeline,
    impacts,
    risks,
    recommendations: [
      'Secure housing before arrival',
      'Build emergency fund (3-6 months expenses)',
      'Visit destination before committing',
      'Maintain regular contact with family',
      'Join expat/local communities',
    ],
    confidence: 0.65,
    summary: `Moving to ${destination} has significant lifestyle impact. High upside in career, but family separation is the main trade-off.`,
  };
}

function simulateHire(req: SimulationRequest): SimulationResult {
  const headcount = req.parameters.headcount || 1;
  const timeline: TimelineEvent[] = [
    { month: 1, event: 'Job posting and sourcing', category: 'career', impact: 'neutral', magnitude: 30 },
    { month: 2, event: 'Interview process', category: 'career', impact: 'neutral', magnitude: 40 },
    { month: 3, event: 'Hiring and onboarding', category: 'career', impact: 'positive', magnitude: 50 },
    { month: 6, event: 'Employee productive', category: 'career', impact: 'positive', magnitude: 70 },
  ];

  return {
    scenarioId: `sim_${uuidv4()}`,
    userId: req.userId,
    scenario: req.scenario,
    timeline,
    impacts: [
      {
        area: 'Capacity',
        type: 'positive',
        description: `+${headcount} team member${headcount > 1 ? 's' : ''} increases output`,
        magnitude: 60 * headcount,
        timeframe: '6 months',
      },
      {
        area: 'Cost',
        type: 'negative',
        description: `Salary + overhead costs ~₹${headcount * 100}K/month`,
        magnitude: 40 * headcount,
        timeframe: 'Ongoing',
      },
      {
        area: 'Management',
        type: 'negative',
        description: 'More time on coordination and 1:1s',
        magnitude: 30,
        timeframe: 'Ongoing',
      },
    ],
    risks: [
      {
        category: 'Bad Hire',
        description: 'Wrong fit can cost 3-6 months',
        likelihood: 'medium',
        severity: 'high',
        mitigation: 'Use trial period, clear expectations',
      },
    ],
    recommendations: [
      'Define role and KPIs clearly',
      'Use structured interviews',
      'Plan onboarding in detail',
      'Set 30-60-90 day review',
    ],
    confidence: 0.70,
    summary: `Hiring ${headcount} person${headcount > 1 ? 's' : ''} adds capacity but increases management overhead and costs.`,
  };
}

function simulateWorkHours(req: SimulationRequest): SimulationResult {
  const newHours = req.parameters.hours || 8;
  const oldHours = req.parameters.currentHours || 12;

  return {
    scenarioId: `sim_${uuidv4()}`,
    userId: req.userId,
    scenario: req.scenario,
    timeline: [
      { month: 1, event: 'Adjusting to new schedule', category: 'health', impact: 'neutral', magnitude: 40 },
      { month: 3, event: 'Health improvement visible', category: 'health', impact: 'positive', magnitude: 70 },
      { month: 6, event: 'Better work-life balance', category: 'lifestyle', impact: 'positive', magnitude: 80 },
    ],
    impacts: [
      {
        area: 'Health',
        type: 'positive',
        description: 'Less burnout, more energy',
        magnitude: 70,
        timeframe: '3-6 months',
      },
      {
        area: 'Productivity',
        type: 'negative',
        description: 'Fewer hours may reduce output',
        magnitude: 30,
        timeframe: 'Immediate',
      },
      {
        area: 'Relationships',
        type: 'positive',
        description: 'More time for family and friends',
        magnitude: 60,
        timeframe: 'Ongoing',
      },
    ],
    risks: [
      {
        category: 'Reduced Output',
        description: 'Projects may slow down',
        likelihood: 'high',
        severity: 'medium',
        mitigation: 'Improve efficiency, delegate more',
      },
    ],
    recommendations: [
      `Reduce from ${oldHours}h to ${newHours}h/day gradually`,
      'Use productivity techniques',
      'Delegate or automate repetitive tasks',
      'Maintain sleep quality',
    ],
    confidence: 0.75,
    summary: `Reducing work hours from ${oldHours} to ${newHours} improves health and relationships but may reduce output.`,
  };
}

function simulateExercise(req: SimulationRequest): SimulationResult {
  const frequency = req.parameters.frequency || 3;

  return {
    scenarioId: `sim_${uuidv4()}`,
    userId: req.userId,
    scenario: req.scenario,
    timeline: [
      { month: 1, event: 'Initial fatigue', category: 'health', impact: 'negative', magnitude: 30 },
      { month: 2, event: 'Energy starts improving', category: 'health', impact: 'positive', magnitude: 50 },
      { month: 3, event: 'Visible fitness improvements', category: 'health', impact: 'positive', magnitude: 70 },
      { month: 6, event: 'Habit established', category: 'lifestyle', impact: 'positive', magnitude: 80 },
    ],
    impacts: [
      {
        area: 'Physical Health',
        type: 'positive',
        description: 'Cardiovascular, strength, endurance improve',
        magnitude: 75,
        timeframe: '3-6 months',
      },
      {
        area: 'Mental Health',
        type: 'positive',
        description: 'Reduced stress, better mood',
        magnitude: 70,
        timeframe: '2-4 weeks',
      },
      {
        area: 'Sleep',
        type: 'positive',
        description: 'Better sleep quality',
        magnitude: 60,
        timeframe: '1 month',
      },
    ],
    risks: [
      {
        category: 'Injury',
        description: 'Overtraining risk',
        likelihood: 'low',
        severity: 'medium',
        mitigation: 'Start slow, rest days',
      },
    ],
    recommendations: [
      `Start with ${Math.max(1, frequency - 2)} times/week`,
      'Mix cardio and strength',
      'Include rest days',
      'Track progress',
    ],
    confidence: 0.85,
    summary: `Exercising ${frequency} times/week has significant health benefits with low risk.`,
  };
}

function simulateSavings(req: SimulationRequest): SimulationResult {
  const monthlyAmount = req.parameters.monthlyAmount || 50000;
  const months = req.parameters.months || 60;

  const projectedSavings = monthlyAmount * months;
  const withInterest = projectedSavings * 1.5; // ~8% annual return

  return {
    scenarioId: `sim_${uuidv4()}`,
    userId: req.userId,
    scenario: req.scenario,
    timeline: [
      { month: 12, event: `Saved ₹${(monthlyAmount * 12).toLocaleString()}`, category: 'financial', impact: 'positive', magnitude: 50 },
      { month: months, event: `Total saved: ₹${projectedSavings.toLocaleString()}`, category: 'financial', impact: 'positive', magnitude: 90 },
    ],
    impacts: [
      {
        area: 'Net Worth',
        type: 'positive',
        description: `+₹${projectedSavings.toLocaleString()} in ${months} months`,
        magnitude: 80,
        timeframe: `${months} months`,
      },
      {
        area: 'Financial Security',
        type: 'positive',
        description: 'Emergency fund grows',
        magnitude: 70,
        timeframe: '6 months',
      },
    ],
    risks: [],
    recommendations: [
      `Automate monthly transfer of ₹${monthlyAmount.toLocaleString()}`,
      'Invest in index funds for long-term',
      'Track progress monthly',
    ],
    confidence: 0.95,
    summary: `Saving ₹${monthlyAmount.toLocaleString()}/month for ${months} months = ₹${projectedSavings.toLocaleString()} (₹${Math.round(withInterest).toLocaleString()} with returns).`,
  };
}

function simulateGeneric(req: SimulationRequest): SimulationResult {
  return {
    scenarioId: `sim_${uuidv4()}`,
    userId: req.userId,
    scenario: req.scenario,
    timeline: [],
    impacts: [],
    risks: [],
    recommendations: ['Provide more specific scenario details'],
    confidence: 0,
    summary: 'Please provide more details for accurate simulation.',
  };
}