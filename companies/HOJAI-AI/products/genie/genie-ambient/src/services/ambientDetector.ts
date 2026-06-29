/**
 * Ambient Detector — Collect signals from various sources
 * Spec Part 25: Ambient Intelligence
 */

import axios from 'axios';
import { AmbientSignals } from '../types/alert.js';

const GENIE_WELLNESS_URL = process.env.GENIE_WELLNESS_URL || 'http://localhost:4723';
const GENIE_CALENDAR_URL = process.env.GENIE_CALENDAR_URL || 'http://localhost:4709';
const GENIE_TWINOS_URL = process.env.GENIE_TWINOS_URL || 'http://localhost:4705';
const GENIE_MEMORY_URL = process.env.GENIE_MEMORY_URL || 'http://localhost:4710';

export async function collectAmbientSignals(userId: string): Promise<AmbientSignals> {
  const signals: AmbientSignals = { userId };

  // Collect in parallel
  const [sleep, calendar, relationships, work] = await Promise.all([
    fetchSleep(userId).catch(() => null),
    fetchCalendar(userId).catch(() => null),
    fetchRelationships(userId).catch(() => null),
    fetchWork(userId).catch(() => null),
  ]);

  if (sleep) signals.sleep = sleep;
  if (calendar) signals.calendar = calendar;
  if (relationships) signals.relationships = relationships;
  if (work) signals.work = work;

  return signals;
}

async function fetchSleep(userId: string): Promise<AmbientSignals['sleep'] | null> {
  try {
    const response = await axios.get(
      `${GENIE_WELLNESS_URL}/api/sleep/recent/${userId}`,
      { params: { days: 7 }, timeout: 5000 }
    );
    const data = response.data?.data || response.data;

    if (!data || !data.hours) return null;

    return {
      hours: data.hours,
      quality: data.quality || 'unknown',
      trend: data.trend || 'stable',
    };
  } catch {
    return null;
  }
}

async function fetchCalendar(userId: string): Promise<AmbientSignals['calendar'] | null> {
  try {
    const [todayRes, weekRes, overdueRes] = await Promise.all([
      axios.get(`${GENIE_CALENDAR_URL}/api/events/today`, { params: { userId }, timeout: 5000 }).catch(() => null),
      axios.get(`${GENIE_CALENDAR_URL}/api/events/week`, { params: { userId }, timeout: 5000 }).catch(() => null),
      axios.get(`${GENIE_CALENDAR_URL}/api/tasks/overdue`, { params: { userId }, timeout: 5000 }).catch(() => null),
    ]);

    const todayEvents = todayRes?.data?.data || todayRes?.data || [];
    const weekEvents = weekRes?.data?.data || weekRes?.data || [];
    const overdue = overdueRes?.data?.data || overdueRes?.data || [];

    return {
      meetingsToday: Array.isArray(todayEvents) ? todayEvents.length : 0,
      meetingsThisWeek: Array.isArray(weekEvents) ? weekEvents.length : 0,
      focusTime: 0, // Calculated separately
      overdueTasks: Array.isArray(overdue) ? overdue.length : 0,
    };
  } catch {
    return null;
  }
}

async function fetchRelationships(userId: string): Promise<AmbientSignals['relationships'] | null> {
  try {
    const response = await axios.get(
      `${GENIE_TWINOS_URL}/api/relationships/${userId}/stale`,
      { params: { minDays: 30 }, timeout: 5000 }
    );
    const stale = response.data?.data || response.data || [];

    return {
      longestContactGap: {
        personId: stale[0]?.personId || 'unknown',
        personName: stale[0]?.name || 'Someone',
        days: stale[0]?.daysSince || 0,
      },
      upcomingBirthdays: [], // Filled separately
    };
  } catch {
    return null;
  }
}

async function fetchWork(userId: string): Promise<AmbientSignals['work'] | null> {
  try {
    const [projectsRes, blockedRes] = await Promise.all([
      axios.get(`${GENIE_MEMORY_URL}/api/projects/active/${userId}`, { timeout: 5000 }).catch(() => null),
      axios.get(`${GENIE_MEMORY_URL}/api/projects/blocked/${userId}`, { timeout: 5000 }).catch(() => null),
    ]);

    return {
      activeProjects: projectsRes?.data?.data?.length || 0,
      blockedItems: blockedRes?.data?.data?.length || 0,
      lastBreakHours: 2, // Would need to track
    };
  } catch {
    return null;
  }
}