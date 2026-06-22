/**
 * Continuous Learning Connector
 * Hook into ALL services to learn from everything
 */

import axios from 'axios';

const LEARNING_URL = 'http://localhost:4891';

// ============================================
// CONNECTOR CLASS
// ============================================

export class ContinuousLearningConnector {

  // Learn from chat
  async fromChat(data: {
    intent: string;
    query: string;
    response: string;
    success: boolean;
    refinement?: string;
  }) {
    await axios.post(`${LEARNING_URL}/learn/chat`, data);
  }

  // Learn from signal
  async fromSignal(data: {
    signalType: string;
    userAction: string;
    outcome: string;
  }) {
    await axios.post(`${LEARNING_URL}/learn/signal`, data);
  }

  // Learn from event
  async fromEvent(data: {
    eventType: string;
    context: any;
    success: boolean;
    improvement?: string;
  }) {
    await axios.post(`${LEARNING_URL}/learn/event`, data);
  }

  // Learn from conversion
  async fromConversion(data: {
    trigger: string;
    action: string;
    result: string;
    revenue?: number;
  }) {
    await axios.post(`${LEARNING_URL}/learn/conversion`, data);
  }

  // Learn from correction
  async fromCorrection(data: {
    wrong: string;
    correct: string;
    context: string;
  }) {
    await axios.post(`${LEARNING_URL}/learn/correction`, data);
  }

  // Batch learn from everything
  async fromEverything(data: {
    chats?: any[];
    signals?: any[];
    events?: any[];
    conversions?: any[];
    corrections?: any[];
  }) {
    await axios.post(`${LEARNING_URL}/learn/batch`, data);
  }
}

export const continuousLearning = new ContinuousLearningConnector();

// ============================================
// AUTO-HOOK INTEGRATIONS
// ============================================

// HOOK INTO: REZ Signal Aggregator
export function hookREZSignals() {
  // Every REZ signal → Learn
  return `
    // In REZ Signal Aggregator (4142):
    // After processing signal:
    continuousLearning.fromSignal({
      signalType: signal.type,
      userAction: signal.action,
      outcome: signal.result
    });
  `;
}

// HOOK INTO: HOJAI Agents
export function hookHOJAIAgents() {
  // Every agent response → Learn
  return `
    // In HOJAI Agent (4550):
    // After agent responds:
    continuousLearning.fromChat({
      intent: detectedIntent,
      query: userQuery,
      response: agentResponse,
      success: userAccepted
    });
  `;
}

// HOOK INTO: HOJAI Memory
export function hookHOJAIMemory() {
  // Every memory update → Learn
  return `
    // In HOJAI Memory (4520):
    // After memory update:
    continuousLearning.fromEvent({
      eventType: 'memory_update',
      context: memory,
      success: true
    });
  `;
}

// HOOK INTO: HOJAI Workforce
export function hookHOJAIWorkforce() {
  // Every task completion → Learn
  return `
    // In HOJAI Workforce (4820):
    // After task completes:
    continuousLearning.fromConversion({
      trigger: 'task_completion',
      action: taskType,
      result: success ? 'converted' : 'failed',
      revenue: taskValue
    });
  `;
}

// HOOK INTO: All conversations
export function hookConversations() {
  // Every conversation → Learn
  return `
    // In any chat service:
    continuousLearning.fromChat({
      query: userMessage,
      response: botResponse,
      success: userCompletedGoal
    });
  `;
}
