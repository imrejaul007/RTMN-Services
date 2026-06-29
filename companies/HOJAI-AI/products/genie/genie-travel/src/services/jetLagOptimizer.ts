/**
 * Jet Lag Optimizer — Plan sleep adjustment
 * Spec Part 29: TravelOS
 */

import { JetLagPlan } from '../types/travel.js';

const TIMEZONE_OFFSETS: Record<string, number> = {
  // Simplified — in production use full timezone database
  'Dubai': 4,
  'London': 0,
  'New York': -5,
  'San Francisco': -8,
  'Singapore': 8,
  'Tokyo': 9,
  'Sydney': 10,
  'Berlin': 1,
  'Paris': 1,
  'Bangalore': 5.5,
  'Mumbai': 5.5,
  'Singapore': 8,
};

export function createJetLagPlan(destination: string, departureDate: Date): JetLagPlan {
  const timezoneDiff = getTimezoneOffset(destination);
  const plan = generateAdjustmentSchedule(timezoneDiff);

  return {
    destination,
    timezoneDiff,
    plan,
  };
}

function getTimezoneOffset(destination: string): number {
  for (const [city, offset] of Object.entries(TIMEZONE_OFFSETS)) {
    if (destination.toLowerCase().includes(city.toLowerCase())) {
      return offset;
    }
  }
  return 0;
}

function generateAdjustmentSchedule(timezoneDiff: number): JetLagPlan['plan'] {
  const plan: JetLagPlan['plan'] = [];
  const absDiff = Math.abs(timezoneDiff);
  const direction = timezoneDiff > 0 ? 'east' : 'west';
  const daysToAdjust = Math.ceil(absDiff);

  for (let day = -Math.floor(daysToAdjust / 2); day <= daysToAdjust; day++) {
    const adjustmentHours = Math.min(absDiff, Math.abs(day)) * (direction === 'east' ? 1 : -1);
    const baseBedtime = '22:00';
    const baseWake = '06:30';

    const planItem: JetLagPlan['plan'][0] = {
      day,
      bedtime: shiftTime(baseBedtime, adjustmentHours),
      wakeTime: shiftTime(baseWake, adjustmentHours),
      activities: [],
    };

    if (day < 0) {
      planItem.activities.push('Pre-travel: start adjusting sleep schedule');
    } else if (day === 0) {
      planItem.activities.push('Travel day', 'Stay hydrated', 'Avoid alcohol');
    } else if (day <= daysToAdjust / 2) {
      planItem.activities.push('Get sunlight at destination time', 'Avoid napping');
    } else {
      planItem.activities.push('Resume normal schedule', 'Stay active outdoors');
    }

    plan.push(planItem);
  }

  return plan;
}

function shiftTime(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + (hours * 60);
  const normalizedMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const newH = Math.floor(normalizedMinutes / 60);
  const newM = normalizedMinutes % 60;
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
}