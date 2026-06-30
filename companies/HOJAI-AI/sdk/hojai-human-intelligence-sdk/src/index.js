/**
 * Human Intelligence SDK
 * ======================
 * Unified TypeScript/JavaScript SDK for EmotionOS, BehaviorOS, TrustOS, and VoiceOS.
 *
 * Usage:
 * import { HumanIntelligence } from '@hojai/human-intelligence-sdk';
 *
 * const hi = new HumanIntelligence({
 *   emotionGateway: 'http://localhost:4760',
 *   behaviorService: 'http://localhost:4731',
 *   trustService: 'http://localhost:4190',
 *   voiceService: 'http://localhost:4880',
 *   presenceService: 'http://localhost:4896',
 *   socialService: 'http://localhost:4897',
 *   simulationService: 'http://localhost:4874',
 *   agentService: 'http://localhost:4850'
 * });
 *
 * await hi.emotion.analyze({ text: 'I am happy!' });
 * await hi.presence.detect({ userId: 'user_123' });
 * await hi.simulation.simulate({ scenario: 'pricing_change' });
 */

import axios from 'axios';

// Default service URLs
const DEFAULTS = {
  emotionGateway: process.env.EMOTION_GATEWAY_URL || 'http://localhost:4760',
  behaviorService: process.env.BEHAVIOR_SERVICE_URL || 'http://localhost:4731',
  trustService: process.env.TRUST_SERVICE_URL || 'http://localhost:4190',
  voiceService: process.env.VOICE_SERVICE_URL || 'http://localhost:4880',
  presenceService: process.env.PRESENCE_SERVICE_URL || 'http://localhost:4896',
  socialService: process.env.SOCIAL_SERVICE_URL || 'http://localhost:4897',
  simulationService: process.env.SIMULATION_SERVICE_URL || 'http://localhost:4874',
  agentService: process.env.AGENT_SERVICE_URL || 'http://localhost:4850'
};

/**
 * Human Intelligence SDK Client
 */
export class HumanIntelligence {
  constructor(options = {}) {
    this.config = {
      ...DEFAULTS,
      ...options
    };

    this.emotion = new EmotionClient(this.config);
    this.behavior = new BehaviorClient(this.config);
    this.trust = new TrustClient(this.config);
    this.voice = new VoiceClient(this.config);
    this.presence = new PresenceClient(this.config);
    this.social = new SocialClient(this.config);
    this.simulation = new SimulationClient(this.config);
    this.agent = new AgentClient(this.config);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Emotion Client - EmotionOS Gateway
// ─────────────────────────────────────────────────────────────────────────────

export class EmotionClient {
  constructor(config) {
    this.baseUrl = config.emotionGateway;
  }

  async analyze({ text, voice, context, entityId }) {
    const response = await axios.post(`${this.baseUrl}/analyze`, { text, voice, context, entityId });
    return response.data;
  }

  async getTimeline(entityId, { days } = {}) {
    const response = await axios.get(`${this.baseUrl}/timeline/${entityId}`, { params: { days } });
    return response.data;
  }

  async generateEmpathyResponse(emotion, { tone, severity } = {}) {
    const response = await axios.post(`${this.baseUrl}/empathy`, { emotion, tone: tone || 'professional', severity: severity || 'medium' });
    return response.data;
  }

  async calculateTrust({ sourceId, targetId, trustHistory }) {
    const response = await axios.post(`${this.baseUrl}/trust`, { sourceId, targetId, trustHistory });
    return response.data;
  }

  async analyzeTone(text) {
    const response = await axios.post(`${this.baseUrl}/tone`, { text });
    return response.data;
  }

  async getAnalytics(entityId) {
    const response = await axios.get(`${this.baseUrl}/analytics/${entityId}`);
    return response.data;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Behavior Client - Habit Engine, Trigger Intelligence, Burnout Prediction
// ─────────────────────────────────────────────────────────────────────────────

export class BehaviorClient {
  constructor(config) {
    this.habitUrl = config.behaviorService;
    this.triggerUrl = config.behaviorService.replace(':4731', ':4735');
    this.burnoutUrl = config.behaviorService.replace(':4731', ':4732');
  }

  // Habit tracking
  async createHabit({ entityId, name, frequency, target, impact }) {
    const response = await axios.post(this.habitUrl, { entityId, name, frequency, target, impact });
    return response.data;
  }

  async trackHabit(habitId, { action, metadata } = {}) {
    const response = await axios.post(`${this.habitUrl}/${habitId}/log`, { action, metadata });
    return response.data;
  }

  async getHabitConsistency(habitId, { days } = {}) {
    const response = await axios.get(`${this.habitUrl}/${habitId}/consistency`, { params: { days } });
    return response.data;
  }

  // Trigger tracking
  async recordBehavior({ entityId, trigger, emotion, action, outcome }) {
    const response = await axios.post(`${this.triggerUrl}/behavior`, { entityId, trigger, emotion, action, outcome });
    return response.data;
  }

  async predictBehavior({ entityId, trigger }) {
    const response = await axios.post(`${this.triggerUrl}/predict`, { entityId, trigger });
    return response.data;
  }

  async getTriggerAnalytics(entityId) {
    const response = await axios.get(`${this.triggerUrl}/analytics/${entityId}`);
    return response.data;
  }

  // Burnout prediction
  async assessBurnout({ entityId, sleepHours, workHours, stress, exerciseDays }) {
    const response = await axios.post(`${this.burnoutUrl}/assess`, { entityId, sleepHours, workHours, stress, exerciseDays });
    return response.data;
  }

  async getBurnoutProfile(entityId) {
    const response = await axios.get(`${this.burnoutUrl}/profile/${entityId}`);
    return response.data;
  }

  async quickBurnoutCheck({ sleepHours, workHours, stress, exerciseDays }) {
    const response = await axios.post(`${this.burnoutUrl}/quick-check`, { sleepHours, workHours, stress, exerciseDays });
    return response.data;
  }

  async getTeamBurnout(companyId) {
    const response = await axios.get(`${this.burnoutUrl}/team/${companyId}`);
    return response.data;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Trust Client - Trust scores and relationships
// ─────────────────────────────────────────────────────────────────────────────

export class TrustClient {
  constructor(config) {
    this.baseUrl = config.trustService;
  }

  async getTrustScore(entityId) {
    const response = await axios.get(`${this.baseUrl}/trust/${entityId}`);
    return response.data;
  }

  async getRelationshipTrust({ sourceId, targetId }) {
    const response = await axios.get(`${this.baseUrl}/trust/relationship/${sourceId}/${targetId}`);
    return response.data;
  }

  async recordInteraction({ sourceId, targetId, type, outcome }) {
    const response = await axios.post(`${this.baseUrl}/trust/interaction`, { sourceId, targetId, type, outcome });
    return response.data;
  }

  async getTrustHistory(entityId) {
    const response = await axios.get(`${this.baseUrl}/trust/history/${entityId}`);
    return response.data;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Voice Client - Voice emotion detection and synthesis
// ─────────────────────────────────────────────────────────────────────────────

export class VoiceClient {
  constructor(config) {
    this.baseUrl = config.voiceService;
  }

  async detectEmotion({ audioData, transcription }) {
    const response = await axios.post(`${this.baseUrl}/analyze`, { audioData, transcription });
    return response.data;
  }

  async streamEmotion({ segments }) {
    const response = await axios.post(`${this.baseUrl}/analyze/stream`, { segments });
    return response.data;
  }

  async getVoicePresets() {
    const response = await axios.get(`${this.baseUrl}/presets`);
    return response.data;
  }

  async getConversationPhysics(sessionId) {
    const response = await axios.get(`${this.baseUrl}/physics/${sessionId}`);
    return response.data;
  }

  async getLifeTimeline(userId) {
    const response = await axios.get(`${this.baseUrl}/timeline/${userId}`);
    return response.data;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Presence Client - Human Presence Engine
// ─────────────────────────────────────────────────────────────────────────────

export class PresenceClient {
  constructor(config) {
    this.baseUrl = config.presenceService;
  }

  async detectPresence({ userId, deviceType, activity }) {
    const response = await axios.post(`${this.baseUrl}/presence/detect`, { userId, deviceType, activity });
    return response.data;
  }

  async getPresenceState(userId) {
    const response = await axios.get(`${this.baseUrl}/presence/${userId}`);
    return response.data;
  }

  async analyzeEnergy({ userId, voiceData }) {
    const response = await axios.post(`${this.baseUrl}/energy/analyze`, { userId, voiceData });
    return response.data;
  }

  async trackAttention({ userId, task, duration }) {
    const response = await axios.post(`${this.baseUrl}/attention/track`, { userId, task, duration });
    return response.data;
  }

  async getContextAdaptation({ userId, context }) {
    const response = await axios.post(`${this.baseUrl}/adaptation/context`, { userId, context });
    return response.data;
  }

  async detectMultiPerson({ sessionId, participants }) {
    const response = await axios.post(`${this.baseUrl}/multiperson/detect`, { sessionId, participants });
    return response.data;
  }

  async getGroupDynamics(sessionId) {
    const response = await axios.get(`${this.baseUrl}/multiperson/${sessionId}/dynamics`);
    return response.data;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Social Client - Social Intelligence
// ─────────────────────────────────────────────────────────────────────────────

export class SocialClient {
  constructor(config) {
    this.baseUrl = config.socialService;
  }

  async getRelationshipProfile({ personA, personB }) {
    const response = await axios.get(`${this.baseUrl}/relationship/${personA}/${personB}`);
    return response.data;
  }

  async classifyRelationship(conversationHistory) {
    const response = await axios.post(`${this.baseUrl}/relationship/classify`, { conversationHistory });
    return response.data;
  }

  async getCommunicationStyle(relationshipType) {
    const response = await axios.get(`${this.baseUrl}/style/${relationshipType}`);
    return response.data;
  }

  async adaptCommunication({ sourceType, targetType, message }) {
    const response = await axios.post(`${this.baseUrl}/adapt`, { sourceType, targetType, message });
    return response.data;
  }

  async getSharedMemories({ personA, personB }) {
    const response = await axios.get(`${this.baseUrl}/shared/${personA}/${personB}`);
    return response.data;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulation Client - What-if scenarios, market/company simulation
// ─────────────────────────────────────────────────────────────────────────────

export class SimulationClient {
  constructor(config) {
    this.baseUrl = config.simulationService;
  }

  async createScenario({ type, parameters }) {
    const response = await axios.post(`${this.baseUrl}/scenario`, { type, parameters });
    return response.data;
  }

  async runSimulation({ scenarioId, iterations }) {
    const response = await axios.post(`${this.baseUrl}/simulate/${scenarioId}`, { iterations });
    return response.data;
  }

  async simulatePricing({ productId, discount, iterations }) {
    const response = await axios.post(`${this.baseUrl}/pricing`, { productId, discount, iterations });
    return response.data;
  }

  async simulateMarket({ marketParams, scenarios }) {
    const response = await axios.post(`${this.baseUrl}/market`, { marketParams, scenarios });
    return response.data;
  }

  async simulateCompany({ companyId, decisions }) {
    const response = await axios.post(`${this.baseUrl}/company`, { companyId, decisions });
    return response.data;
  }

  async compareScenarios({ scenarioIds }) {
    const response = await axios.post(`${this.baseUrl}/compare`, { scenarioIds });
    return response.data;
  }

  async getMonteCarloResults(scenarioId) {
    const response = await axios.get(`${this.baseUrl}/results/${scenarioId}/monte-carlo`);
    return response.data;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent Client - Agent emotional context for SUTAR negotiations
// ─────────────────────────────────────────────────────────────────────────────

export class AgentClient {
  constructor(config) {
    this.baseUrl = config.agentService;
  }

  async analyzeAgentState({ agentId, conversationContext }) {
    const response = await axios.post(`${this.baseUrl}/agent/state`, { agentId, conversationContext });
    return response.data;
  }

  async getAgentEmotionalContext({ agentId, negotiationType }) {
    const response = await axios.post(`${this.baseUrl}/agent/emotional-context`, { agentId, negotiationType });
    return response.data;
  }

  async recordAgentInteraction({ agentId, interaction, outcome, trustImpact }) {
    const response = await axios.post(`${this.baseUrl}/agent/interaction`, { agentId, interaction, outcome, trustImpact });
    return response.data;
  }

  async getAgentTrustHistory(agentId) {
    const response = await axios.get(`${this.baseUrl}/agent/trust/${agentId}`);
    return response.data;
  }

  async predictAgentBehavior({ agentId, situation }) {
    const response = await axios.post(`${this.baseUrl}/agent/predict`, { agentId, situation });
    return response.data;
  }

  async getNegotiationStrategy({ agentId, counterpartId, negotiationType }) {
    const response = await axios.post(`${this.baseUrl}/agent/strategy`, { agentId, counterpartId, negotiationType });
    return response.data;
  }
}

// Named exports for convenience
export {
  EmotionClient,
  BehaviorClient,
  TrustClient,
  VoiceClient,
  PresenceClient,
  SocialClient,
  SimulationClient,
  AgentClient
};

export default HumanIntelligence;
