/**
 * Charity Reminder — Zakat, Sadaqah, Fitrah
 * Spec Part 30: SpiritualOS
 */

import { CharityReminder } from '../types/spiritual.js';

export function calculateZakat(
  totalSavings: number,
  goldValue: number = 0,
  silverValue: number = 0,
  businessAssets: number = 0,
  liabilities: number = 0
): number {
  // Nisab threshold (simplified — use 85g of gold as threshold)
  // For production, use live gold/silver prices
  const nisab = 50000; // Approximate INR value

  const totalAssets = totalSavings + goldValue + silverValue + businessAssets - liabilities;

  if (totalAssets < nisab) {
    return 0; // Below nisab, no zakat
  }

  // 2.5% zakat
  return Math.round(totalAssets * 0.025);
}

export function getCharityReminders(): CharityReminder[] {
  return [
    {
      type: 'zakat',
      amount: 0,            // Calculate based on assets
      currency: 'INR',
      description: 'Annual Zakat — 2.5% of wealth above Nisab',
      dueDate: undefined,  // Anytime during year
      recurring: true,
      completed: false,
    },
    {
      type: 'fitrah',
      amount: 100,
      currency: 'INR',
      description: 'Zakat al-Fitr — given before Eid prayer',
      dueDate: undefined,
      recurring: true,
      completed: false,
    },
    {
      type: 'sadaqah',
      amount: 0,
      currency: 'INR',
      description: 'Voluntary charity — recommended daily',
      dueDate: undefined,
      recurring: true,
      completed: false,
    },
  ];
}

export function getCharityRecommendations(): string[] {
  return [
    'Calculate Zakat annually on Zakat day',
    'Give Sadaqah daily, even small amounts',
    'Pay Zakat al-Fitr before Eid prayer',
    'Support local community initiatives',
    'Sponsor an orphan or family in need',
    'Feed someone today',
  ];
}