/**
 * Predictive Engine — Generate predictions from context
 * Spec Part 36: Anticipation Engine
 */

import { v4 as uuidv4 } from 'uuid';
import { Prediction, PredictionContext, PredictionType } from '../types/prediction.js';

export async function generatePredictions(context: PredictionContext): Promise<Prediction[]> {
  const predictions: Prediction[] = [];

  // Travel predictions
  predictions.push(...predictTravel(context));

  // Follow-up predictions
  predictions.push(...predictFollowUps(context));

  // Relationship predictions
  predictions.push(...predictRelationships(context));

  // Work predictions
  predictions.push(...predictWork(context));

  // Health predictions
  predictions.push(...predictHealth(context));

  // Sort by urgency
  return predictions.sort((a, b) => {
    const urgencyOrder = { high: 3, medium: 2, low: 1 };
    return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
  });
}

function predictTravel(context: PredictionContext): Prediction[] {
  const predictions: Prediction[] = [];
  if (!context.upcomingEvents) return predictions;

  for (const event of context.upcomingEvents) {
    // Flight or travel event
    if (event.type === 'flight' || event.type === 'travel' || /flight|airport|travel/i.test(event.title)) {
      const eventDate = new Date(event.start);
      const hoursUntil = (eventDate.getTime() - Date.now()) / (1000 * 60 * 60);

      if (hoursUntil > 0 && hoursUntil < 36) {
        // Flight tomorrow or today
        predictions.push({
          id: `pred_${uuidv4()}`,
          userId: context.userId,
          type: 'travel',
          trigger: `Flight at ${eventDate.toLocaleString()}`,
          title: `${event.title}`,
          suggestion: hoursUntil < 12
            ? 'Pack your bags now — flight in a few hours'
            : 'Pack tonight — flight tomorrow',
          urgency: hoursUntil < 12 ? 'high' : 'medium',
          confidence: 0.9,
          actionType: 'reminder',
          relatedEventId: event.id,
          expiresAt: eventDate,
          dismissed: false,
          actedOn: false,
          createdAt: new Date(),
        });
      }

      // Documents reminder
      if (hoursUntil < 48 && hoursUntil > 24) {
        predictions.push({
          id: `pred_${uuidv4()}`,
          userId: context.userId,
          type: 'travel',
          trigger: 'Flight in 24-48 hours',
          title: 'Check travel documents',
          suggestion: 'Verify passport, visa, and tickets',
          urgency: 'medium',
          confidence: 0.85,
          actionType: 'task',
          expiresAt: eventDate,
          dismissed: false,
          actedOn: false,
          createdAt: new Date(),
        });
      }
    }
  }

  return predictions;
}

function predictFollowUps(context: PredictionContext): Prediction[] {
  const predictions: Prediction[] = [];
  if (!context.recentInteractions) return predictions;

  for (const interaction of context.recentInteractions) {
    const daysSince = (Date.now() - new Date(interaction.lastContact).getTime()) / (1000 * 60 * 60 * 24);

    // Investors and customers — follow up after 7 days
    if (interaction.type === 'meeting' && daysSince > 7 && daysSince < 21) {
      predictions.push({
        id: `pred_${uuidv4()}`,
        userId: context.userId,
        type: 'follow_up',
        trigger: `Meeting with ${interaction.personName} ${Math.floor(daysSince)} days ago`,
        title: `Follow up with ${interaction.personName}`,
        suggestion: `Draft thank-you email or status update`,
        urgency: daysSince > 14 ? 'high' : 'medium',
        confidence: 0.85,
        actionType: 'communication',
        dismissed: false,
        actedOn: false,
        createdAt: new Date(),
      });
    }
  }

  return predictions;
}

function predictRelationships(context: PredictionContext): Prediction[] {
  const predictions: Prediction[] = [];
  if (!context.importantDates) return predictions;

  for (const date of context.importantDates) {
    const daysUntil = (new Date(date.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);

    if (daysUntil > 0 && daysUntil < 7) {
      predictions.push({
        id: `pred_${uuidv4()}`,
        userId: context.userId,
        type: 'relationship',
        trigger: `${date.type} in ${Math.floor(daysUntil)} days`,
        title: `${date.personName}'s ${date.type}`,
        suggestion: `Send gift or plan celebration`,
        urgency: daysUntil < 2 ? 'high' : 'medium',
        confidence: 0.9,
        actionType: 'reminder',
        dismissed: false,
        actedOn: false,
        createdAt: new Date(),
      });
    }
  }

  return predictions;
}

function predictWork(context: PredictionContext): Prediction[] {
  const predictions: Prediction[] = [];
  if (!context.pendingTasks) return predictions;

  for (const task of context.pendingTasks) {
    if (!task.dueDate) continue;

    const daysUntil = (new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);

    if (daysUntil > 0 && daysUntil < 3) {
      predictions.push({
        id: `pred_${uuidv4()}`,
        userId: context.userId,
        type: 'work',
        trigger: `Task due in ${Math.floor(daysUntil)} days`,
        title: task.title,
        suggestion: daysUntil < 1 ? 'Complete today' : 'Schedule time tomorrow',
        urgency: daysUntil < 1 ? 'high' : 'medium',
        confidence: 0.85,
        actionType: 'reminder',
        dismissed: false,
        actedOn: false,
        createdAt: new Date(),
      });
    }
  }

  return predictions;
}

function predictHealth(context: PredictionContext): Prediction[] {
  const predictions: Prediction[] = [];
  if (!context.upcomingEvents) return predictions;

  for (const event of context.upcomingEvents) {
    if (/doctor|appointment|medical|hospital|clinic/i.test(event.title)) {
      const hoursUntil = (new Date(event.start).getTime() - Date.now()) / (1000 * 60 * 60);

      if (hoursUntil > 0 && hoursUntil < 24) {
        predictions.push({
          id: `pred_${uuidv4()}`,
          userId: context.userId,
          type: 'health',
          trigger: `Medical appointment in ${Math.floor(hoursUntil)} hours`,
          title: event.title,
          suggestion: 'Prepare questions and insurance card',
          urgency: hoursUntil < 4 ? 'high' : 'medium',
          confidence: 0.9,
          actionType: 'reminder',
          expiresAt: new Date(event.start),
          dismissed: false,
          actedOn: false,
          createdAt: new Date(),
        });
      }
    }
  }

  return predictions;
}