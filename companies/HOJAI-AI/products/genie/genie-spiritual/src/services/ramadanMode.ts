/**
 * Ramadan Mode — Special schedule for Ramadan
 * Spec Part 30: SpiritualOS
 */

import { RamadanStatus } from '../types/spiritual.js';

export function getRamadanStatus(): RamadanStatus {
  // Hijri year 1447 AH begins approximately June 26, 2026
  const ramadanStart2026 = new Date('2026-02-18'); // Approximate
  const ramadanEnd2026 = new Date('2026-03-19');

  const now = new Date();

  if (now >= ramadanStart2026 && now <= ramadanEnd2026) {
    // We're in Ramadan
    const daysPassed = Math.floor((now.getTime() - ramadanStart2026.getTime()) / (1000 * 60 * 60 * 24));
    return {
      isRamadan: true,
      daysUntil: 0,
      currentDay: daysPassed + 1,
      hijriDate: getHijriDate(now),
      schedule: generateRamadanSchedule(ramadanStart2026),
    };
  }

  // Calculate days until next Ramadan
  const daysUntil = Math.floor((ramadanStart2026.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    isRamadan: false,
    daysUntil: daysUntil > 0 ? daysUntil : 365 + daysUntil, // Next year if past
  };
}

function generateRamadanSchedule(startDate: Date): RamadanStatus['schedule'] {
  const schedule: NonNullable<RamadanStatus['schedule']> = [];

  for (let day = 0; day < 30; day++) {
    const currentDate = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
    schedule.push({
      day: day + 1,
      // Simplified — production use Aladhan API
      sehri: '05:00',
      iftar: '18:30',
    });
  }

  return schedule;
}

function getHijriDate(gregorianDate: Date): string {
  // Simplified Hijri conversion — production use a proper library
  const hijriYear = 1447;
  const hijriMonth = 9; // Ramadan is 9th month
  return `${hijriMonth}/${hijriYear}`;
}

export function getRamadanRecommendations(): string[] {
  return [
    'Adjust sleep schedule to accommodate Suhoor and Taraweeh',
    'Plan lighter meals for Iftar',
    'Schedule Quran reading time after Fajr',
    'Increase charity activities (Zakat al-Fitr)',
    'Limit non-essential meetings during first 10 days',
    'Focus on spiritual reflection in last 10 days',
  ];
}