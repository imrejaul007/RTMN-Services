/**
 * Human Intelligence SDK - Complete
 * ==================================
 * Unified SDK for all Human Intelligence services.
 *
 * Usage:
 * import { HumanIntelligence } from '@hojai/human-intelligence-sdk';
 *
 * const hi = new HumanIntelligence();
 *
 * // Emotion Analysis
 * await hi.emotion.analyze({ text: 'I am happy!' });
 *
 * // Behavior Tracking
 * await hi.behavior.assessBurnout({ entityId: 'user_1', sleepHours: 5 });
 *
 * // Trust Passport
 * await hi.trust.createPassport({ entityId: 'merchant_1', entityType: 'merchant' });
 *
 * // Company Emotion
 * await hi.company.getMorale('company_1');
 *
 * // Simulation
 * await hi.simulation.simulatePricing({ currentPrice: 99, discount: 0.1 });
 *
 * // Agent Trust Economy
 * await hi.agentEconomy.transfer({ from: 'agent_1', to: 'agent_2', amount: 100 });
 */

import axios from 'axios';

// Default service URLs
const DEFAULTS = {
  // EmotionOS
  emotionGateway: process.env.EMOTION_GATEWAY_URL || 'http://localhost:4760',
  emotionalMemory: process.env.EMOTIONAL_MEMORY_URL || 'http://localhost:4761',
  empathyEngine: process.env.EMPATHY_URL || 'http://localhost:4762',
  emotionAnalytics: process.env.EMOTION_ANALYTICS_URL || 'http://localhost:4763',
  toneAnalysis: process.env.TONE_URL || 'http://localhost:4767',
  communicationDNA: process.env.COMM_DNA_URL || 'http://localhost:4722',

  // BehaviorOS
  habitEngine: process.env.HABIT_URL || 'http://localhost:4731',
  burnoutPrediction: process.env.BURNOUT_URL || 'http://localhost:4732',
  triggerIntelligence: process.env.TRIGGER_URL || 'http://localhost:4735',

  // Company Emotion
  companyEmotion: process.env.COMPANY_EMOTION_URL || 'http://localhost:4780',

  // TrustOS
  trustPassport: process.env.TRUST_PASSPORT_URL || 'http://localhost:4980',
  agentTrustEconomy: process.env.AGENT_ECONOMY_URL || 'http://localhost:4985',
  trustService: process.env.TRUST_SERVICE_URL || 'http://localhost:4190',

  // VoiceOS
  voiceGateway: process.env.VOICE_URL || 'http://localhost:4880',
  conversationPhysics: process.env.CONVERSATION_URL || 'http://localhost:4881',
  voiceDirector: process.env.VOICE_DIRECTOR_URL || 'http://localhost:4882',
  lifeTimeline: process.env.LIFETIME_URL || 'http://localhost:4883',
  humanPresence: process.env.PRESENCE_URL || 'http://localhost:4896',
  relationshipOS: process.env.RELATIONSHIP_URL || 'http://localhost:4897',

  // SimulationOS
  simulationOS: process.env.SIMULATION_URL || 'http://localhost:4874'
};

/**
 * Human Intelligence SDK - Main Client
 */
export class HumanIntelligence {
  constructor(options = {}) {
    this.config = { ...DEFAULTS, ...options };

    // EmotionOS
    this.emotion = new EmotionClient(this.config);
    this.emotionalMemory = new EmotionalMemoryClient(this.config);
    this.empathy = new EmpathyClient(this.config);
    this.tone = new ToneClient(this.config);
    this.communication = new CommunicationClient(this.config);

    // BehaviorOS
    this.behavior = new BehaviorClient(this.config);
    this.habits = new HabitClient(this.config);
    this.burnout = new BurnoutClient(this.config);

    // Company Emotion
    this.company = new CompanyEmotionClient(this.config);

    // TrustOS
    this.trust = new TrustClient(this.config);
    this.trustPassport = new TrustPassportClient(this.config);
    this.agentEconomy = new AgentEconomyClient(this.config);

    // VoiceOS
    this.voice = new VoiceClient(this.config);
    this.presence = new PresenceClient(this.config);
    this.conversation = new ConversationClient(this.config);

    // SimulationOS
    this.simulation = new SimulationClient(this.config);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EMOTIONOS CLIENTS
// ─────────────────────────────────────────────────────────────────────────────

export class EmotionClient {
  constructor(config) { this.baseUrl = config.emotionGateway; }

  async analyze({ text, voice, context, entityId }) {
    return (await axios.post(`${this.baseUrl}/analyze`, { text, voice, context, entityId })).data;
  }

  async getTimeline(entityId, { days } = {}) {
    return (await axios.get(`${this.baseUrl}/timeline/${entityId}`, { params: { days } })).data;
  }

  async generateEmpathyResponse(emotion, { tone, severity } = {}) {
    return (await axios.post(`${this.baseUrl}/empathy`, { emotion, tone: tone || 'professional', severity: severity || 'medium' })).data;
  }

  async analyzeTone(text) {
    return (await axios.post(`${this.baseUrl}/tone`, { text })).data;
  }

  async getAnalytics(entityId) {
    return (await axios.get(`${this.baseUrl}/analytics/${entityId}`)).data;
  }
}

export class EmotionalMemoryClient {
  constructor(config) { this.baseUrl = config.emotionalMemory; }

  async addMemory({ entityId, emotion, intensity, context }) {
    return (await axios.post(`${this.baseUrl}/memory`, { entityId, emotion, intensity, context })).data;
  }

  async getTimeline(entityId, { days } = {}) {
    return (await axios.get(`${this.baseUrl}/timeline/${entityId}`, { params: { days } })).data;
  }

  async getPatterns(entityId) {
    return (await axios.get(`${this.baseUrl}/patterns/${entityId}`)).data;
  }

  async detectEmotionalShift(entityId) {
    return (await axios.get(`${this.baseUrl}/shift/${entityId}`)).data;
  }
}

export class EmpathyClient {
  constructor(config) { this.baseUrl = config.empathyEngine; }

  async generateResponse({ emotion, tone, severity }) {
    return (await axios.post(`${this.baseUrl}/generate`, { emotion, tone, severity })).data;
  }

  async getSuggestions({ context }) {
    return (await axios.post(`${this.baseUrl}/suggestions`, { context })).data;
  }
}

export class ToneClient {
  constructor(config) { this.baseUrl = config.toneAnalysis; }

  async analyze(conversation) {
    return (await axios.post(`${this.baseUrl}/analyze`, { conversation })).data;
  }

  async getSalesTone(conversation) {
    return (await axios.post(`${this.baseUrl}/sales`, { conversation })).data;
  }

  async getCoachingTips(speakerId) {
    return (await axios.get(`${this.baseUrl}/coaching/${speakerId}`)).data;
  }
}

export class CommunicationClient {
  constructor(config) { this.baseUrl = config.communicationDNA; }

  async analyze({ personId, text }) {
    return (await axios.post(`${this.baseUrl}/profile`, { personId, text })).data;
  }

  async getProfile(personId) {
    return (await axios.get(`${this.baseUrl}/profile/${personId}`)).data;
  }

  async adapt({ sourceId, targetId }) {
    return (await axios.post(`${this.baseUrl}/adapt`, { sourceId, targetId })).data;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BEHAVIOROS CLIENTS
// ─────────────────────────────────────────────────────────────────────────────

export class BehaviorClient {
  constructor(config) {
    this.habitUrl = config.habitEngine;
    this.triggerUrl = config.triggerIntelligence;
    this.burnoutUrl = config.burnoutPrediction;
  }

  // Habit methods
  async createHabit({ entityId, name, frequency, target, impact }) {
    return (await axios.post(this.habitUrl, { entityId, name, frequency, target, impact })).data;
  }

  async trackHabit(habitId, { action, metadata } = {}) {
    return (await axios.post(`${this.habitUrl}/${habitId}/log`, { action, metadata })).data;
  }

  async getConsistency(habitId, { days } = {}) {
    return (await axios.get(`${this.habitUrl}/${habitId}/consistency`, { params: { days } })).data;
  }

  // Trigger methods
  async recordBehavior({ entityId, trigger, emotion, action, outcome }) {
    return (await axios.post(`${this.triggerUrl}/behavior`, { entityId, trigger, emotion, action, outcome })).data;
  }

  async predictBehavior({ entityId, trigger }) {
    return (await axios.post(`${this.triggerUrl}/predict`, { entityId, trigger })).data;
  }

  async getTriggerAnalytics(entityId) {
    return (await axios.get(`${this.triggerUrl}/analytics/${entityId}`)).data;
  }
}

export class HabitClient {
  constructor(config) { this.baseUrl = config.habitEngine; }

  async create({ entityId, name, frequency, target, impact }) {
    return (await axios.post(this.baseUrl, { entityId, name, frequency, target, impact })).data;
  }

  async log(habitId, { action, metadata } = {}) {
    return (await axios.post(`${this.baseUrl}/${habitId}/log`, { action, metadata })).data;
  }

  async getConsistency(habitId, { days } = {}) {
    return (await axios.get(`${this.baseUrl}/${habitId}/consistency`, { params: { days } })).data;
  }

  async getStreak(habitId) {
    return (await axios.get(`${this.baseUrl}/${habitId}/streak`)).data;
  }
}

export class BurnoutClient {
  constructor(config) { this.baseUrl = config.burnoutPrediction; }

  async assess({ entityId, sleepHours, workHours, stress, exerciseDays }) {
    return (await axios.post(`${this.baseUrl}/assess`, { entityId, sleepHours, workHours, stress, exerciseDays })).data;
  }

  async getProfile(entityId) {
    return (await axios.get(`${this.baseUrl}/profile/${entityId}`)).data;
  }

  async quickCheck({ sleepHours, workHours, stress, exerciseDays }) {
    return (await axios.post(`${this.baseUrl}/quick-check`, { sleepHours, workHours, stress, exerciseDays })).data;
  }

  async getTeamRisk(companyId) {
    return (await axios.get(`${this.baseUrl}/team/${companyId}`)).data;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPANY EMOTION CLIENT
// ─────────────────────────────────────────────────────────────────────────────

export class CompanyEmotionClient {
  constructor(config) { this.baseUrl = config.companyEmotion; }

  async createCompany({ companyId, name, industry, size }) {
    return (await axios.post(`${this.baseUrl}/company`, { companyId, name, industry, size })).data;
  }

  async getCompany(companyId) {
    return (await axios.get(`${this.baseUrl}/company/${companyId}`)).data;
  }

  async getAnalytics(companyId) {
    return (await axios.get(`${this.baseUrl}/company/${companyId}/analytics`)).data;
  }

  async getTrends(companyId, { days } = {}) {
    return (await axios.get(`${this.baseUrl}/company/${companyId}/trends`, { params: { days } })).data;
  }

  async recordEmployeeEmotion({ employeeId, companyId, departmentId, emotion, intensity }) {
    return (await axios.post(`${this.baseUrl}/employee/emotion`, { employeeId, companyId, departmentId, emotion, intensity })).data;
  }

  async createDepartment({ companyId, departmentId, name, managerId }) {
    return (await axios.post(`${this.baseUrl}/department`, { companyId, departmentId, name, managerId })).data;
  }

  async getDepartments(companyId) {
    return (await axios.get(`${this.baseUrl}/company/${companyId}/departments`)).data;
  }

  async takeSnapshot(companyId, { metrics } = {}) {
    return (await axios.post(`${this.baseUrl}/snapshot`, { companyId, metrics })).data;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TRUSTOS CLIENTS
// ─────────────────────────────────────────────────────────────────────────────

export class TrustClient {
  constructor(config) { this.baseUrl = config.trustService; }

  async getTrustScore(entityId) {
    return (await axios.get(`${this.baseUrl}/trust/${entityId}`)).data;
  }

  async getRelationshipTrust({ sourceId, targetId }) {
    return (await axios.get(`${this.baseUrl}/trust/relationship/${sourceId}/${targetId}`)).data;
  }

  async recordInteraction({ sourceId, targetId, type, outcome }) {
    return (await axios.post(`${this.baseUrl}/trust/interaction`, { sourceId, targetId, type, outcome })).data;
  }
}

export class TrustPassportClient {
  constructor(config) { this.baseUrl = config.trustPassport; }

  async createPassport({ entityId, entityType, network, dimensions }) {
    return (await axios.post(`${this.baseUrl}/passport`, { entityId, entityType, network, dimensions })).data;
  }

  async getPassport(passportId) {
    return (await axios.get(`${this.baseUrl}/passport/${passportId}`)).data;
  }

  async updatePassport(passportId, { dimensions }) {
    return (await axios.put(`${this.baseUrl}/passport/${passportId}`, { dimensions })).data;
  }

  async awardBadge({ passportId, badgeType, issuer, reason }) {
    return (await axios.post(`${this.baseUrl}/badge`, { passportId, badgeType, issuer, reason })).data;
  }

  async verifyPassport({ passportId, verifierId, purpose }) {
    return (await axios.post(`${this.baseUrl}/verify`, { passportId, verifierId, purpose })).data;
  }

  async getBenefits(passportId) {
    return (await axios.get(`${this.baseUrl}/passport/${passportId}/benefits`)).data;
  }

  async transferToNetwork({ passportId, targetNetwork }) {
    return (await axios.post(`${this.baseUrl}/transfer`, { passportId, targetNetwork })).data;
  }
}

export class AgentEconomyClient {
  constructor(config) { this.baseUrl = config.agentTrustEconomy; }

  async createAccount(agentId) {
    return (await axios.post(`${this.baseUrl}/account`, { agentId })).data;
  }

  async getAccount(agentId) {
    return (await axios.get(`${this.baseUrl}/account/${agentId}`)).data;
  }

  async transfer({ fromAgentId, toAgentId, amount, reason }) {
    return (await axios.post(`${this.baseUrl}/transfer`, { fromAgentId, toAgentId, amount, reason })).data;
  }

  async stake({ agentId, amount, duration, purpose }) {
    return (await axios.post(`${this.baseUrl}/stake`, { agentId, amount, duration, purpose })).data;
  }

  async unstake({ agentId, stakeId }) {
    return (await axios.post(`${this.baseUrl}/unstake`, { agentId, stakeId })).data;
  }

  async claimIncentive({ agentId, incentiveId }) {
    return (await axios.post(`${this.baseUrl}/claim`, { agentId, incentiveId })).data;
  }

  async getIncentives(agentId) {
    return (await axios.get(`${this.baseUrl}/incentives`, { params: { agentId } })).data;
  }

  async getLeaderboard({ limit, sortBy } = {}) {
    return (await axios.get(`${this.baseUrl}/leaderboard`, { params: { limit, sortBy } })).data;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VOICEOS CLIENTS
// ─────────────────────────────────────────────────────────────────────────────

export class VoiceClient {
  constructor(config) { this.baseUrl = config.voiceGateway; }

  async detectEmotion({ audioData, transcription }) {
    return (await axios.post(`${this.baseUrl}/analyze`, { audioData, transcription })).data;
  }

  async streamEmotion({ segments }) {
    return (await axios.post(`${this.baseUrl}/analyze/stream`, { segments })).data;
  }

  async getPresets() {
    return (await axios.get(`${this.baseUrl}/presets`)).data;
  }
}

export class PresenceClient {
  constructor(config) { this.baseUrl = config.humanPresence; }

  async detectPresence({ userId, deviceType, activity }) {
    return (await axios.post(`${this.baseUrl}/presence/detect`, { userId, deviceType, activity })).data;
  }

  async getPresenceState(userId) {
    return (await axios.get(`${this.baseUrl}/presence/${userId}`)).data;
  }

  async analyzeEnergy({ userId, voiceData }) {
    return (await axios.post(`${this.baseUrl}/energy/analyze`, { userId, voiceData })).data;
  }

  async detectMultiPerson({ sessionId, participants }) {
    return (await axios.post(`${this.baseUrl}/multiperson/detect`, { sessionId, participants })).data;
  }

  async getGroupDynamics(sessionId) {
    return (await axios.get(`${this.baseUrl}/multiperson/${sessionId}/dynamics`)).data;
  }
}

export class ConversationClient {
  constructor(config) { this.baseUrl = config.conversationPhysics; }

  async analyzePhysics({ sessionId, segments }) {
    return (await axios.post(`${this.baseUrl}/physics/analyze`, { sessionId, segments })).data;
  }

  async handleInterruption({ sessionId, speaker }) {
    return (await axios.post(`${this.baseUrl}/physics/interruption`, { sessionId, speaker })).data;
  }

  async handleSilence({ sessionId, duration }) {
    return (await axios.post(`${this.baseUrl}/physics/silence`, { sessionId, duration })).data;
  }

  async generateBackchannel({ context }) {
    return (await axios.post(`${this.baseUrl}/physics/backchannel`, { context })).data;
  }

  async getVoiceBlueprint({ emotion, context }) {
    return (await axios.post(`${this.baseUrl}/director/blueprint`, { emotion, context })).data;
  }

  async getLifeTimeline(userId) {
    return (await axios.get(`${this.baseUrl}/timeline/${userId}`)).data;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATIONOS CLIENT
// ─────────────────────────────────────────────────────────────────────────────

export class SimulationClient {
  constructor(config) { this.baseUrl = config.simulationOS; }

  async createScenario({ name, type, model }) {
    return (await axios.post(`${this.baseUrl}/scenario`, { name, type, model })).data;
  }

  async runSimulation({ scenarioId, iterations }) {
    return (await axios.post(`${this.baseUrl}/simulate/${scenarioId}`, { iterations })).data;
  }

  async simulatePricing({ currentPrice, currentDemand, elasticity, discount }) {
    return (await axios.post(`${this.baseUrl}/pricing`, { currentPrice, currentDemand, elasticity, discount })).data;
  }

  async simulateMarket({ marketSize, yourMarketShare, scenarios }) {
    return (await axios.post(`${this.baseUrl}/market`, { marketSize, yourMarketShare, scenarios })).data;
  }

  async simulateCompany({ companyId, currentRevenue, currentCosts, decisions }) {
    return (await axios.post(`${this.baseUrl}/company`, { companyId, currentRevenue, currentCosts, decisions })).data;
  }

  async compareScenarios({ scenarioIds }) {
    return (await axios.post(`${this.baseUrl}/compare`, { scenarioIds })).data;
  }

  async whatIf({ question, context }) {
    return (await axios.post(`${this.baseUrl}/whatif`, { question, context })).data;
  }
}

// Named exports
export {
  EmotionClient,
  EmotionalMemoryClient,
  EmpathyClient,
  ToneClient,
  CommunicationClient,
  BehaviorClient,
  HabitClient,
  BurnoutClient,
  CompanyEmotionClient,
  TrustClient,
  TrustPassportClient,
  AgentEconomyClient,
  VoiceClient,
  PresenceClient,
  ConversationClient,
  SimulationClient
};

export default HumanIntelligence;
