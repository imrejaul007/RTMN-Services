/**
 * Context Aggregator — Pull context from Calendar, Memory, TwinOS
 * Spec Part 36: Anticipation Engine
 */

import axios from 'axios';
import { PredictionContext } from '../types/prediction.js';

const GENIE_CALENDAR_URL = process.env.GENIE_CALENDAR_URL || 'http://localhost:4709';
const GENIE_MEMORY_URL = process.env.GENIE_MEMORY_URL || 'http://localhost:4710';
const GENIE_TWINOS_URL = process.env.GENIE_TWINOS_URL || 'http://localhost:4705';

export async function aggregateContext(userId: string): Promise<PredictionContext> {
  const context: PredictionContext = { userId };

  // Fetch in parallel
  const [events, relationships, importantDates, tasks] = await Promise.all([
    fetchEvents(userId).catch(() => []),
    fetchRelationships(userId).catch(() => []),
    fetchImportantDates(userId).catch(() => []),
    fetchTasks(userId).catch(() => []),
  ]);

  context.upcomingEvents = events;
  context.recentInteractions = relationships;
  context.importantDates = importantDates;
  context.pendingTasks = tasks;

  return context;
}

async function fetchEvents(userId: string): Promise<PredictionContext['upcomingEvents']> {
  try {
    const response = await axios.get(
      `${GENIE_CALENDAR_URL}/api/events/upcoming`,
      { params: { userId, days: 7 }, timeout: 5000 }
    );
    return response.data?.data || response.data || [];
  } catch {
    return [];
  }
}

async function fetchRelationships(userId: string): Promise<PredictionContext['recentInteractions']> {
  try {
    const response = await axios.get(
      `${GENIE_TWINOS_URL}/api/twins/relationship/${userId}/recent`,
      { timeout: 5000 }
    );
    return response.data?.data || response.data || [];
  } catch {
    return [];
  }
}

async function fetchImportantDates(userId: string): Promise<PredictionContext['importantDates']> {
  try {
    const response = await axios.get(
      `${GENIE_TWINOS_URL}/api/twins/relationship/${userId}/important-dates`,
      { params: { days: 30 }, timeout: 5000 }
    );
    return response.data?.data || response.data || [];
  } catch {
    return [];
  }
}

async function fetchTasks(userId: string): Promise<PredictionContext['pendingTasks']> {
  try {
    const response = await axios.get(
      `${GENIE_MEMORY_URL}/api/memory/tasks/${userId}`,
      { timeout: 5000 }
    );
    return response.data?.data || response.data || [];
  } catch {
    return [];
  }
}