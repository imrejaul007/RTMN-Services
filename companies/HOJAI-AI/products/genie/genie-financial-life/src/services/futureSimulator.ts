/**
 * Future Simulator — "If I save X/month for Y years..."
 * Spec Part 27: Financial LifeOS
 */

import { FutureSimulation } from '../types/financial.js';

export async function simulate(
  userId: string,
  monthlySaving: number,
  years: number,
  expectedReturn: number = 0.08 // 8% default
): Promise<FutureSimulation> {
  const months = years * 12;
  const monthlyRate = expectedReturn / 12;

  // Future value of annuity formula: FV = PMT × [((1 + r)^n - 1) / r]
  const projectedValue = monthlyRate > 0
    ? monthlySaving * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
    : monthlySaving * months;

  // Calculate milestones
  const milestones = [];
  for (let year = 1; year <= years; year++) {
    const yearMonths = year * 12;
    const yearValue = monthlyRate > 0
      ? monthlySaving * ((Math.pow(1 + monthlyRate, yearMonths) - 1) / monthlyRate)
      : monthlySaving * yearMonths;
    milestones.push({
      year,
      value: Math.round(yearValue),
    });
  }

  return {
    userId,
    monthlySaving,
    years,
    expectedReturn,
    projectedValue: Math.round(projectedValue),
    milestones,
  };
}