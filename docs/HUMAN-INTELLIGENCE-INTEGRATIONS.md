# Human Intelligence OS - Integration Guide

> **Version:** 1.0.0
> **Last Updated:** June 30, 2026

---

## Quick Integration Examples

### 1. Customer Support Integration

```javascript
import { HumanIntelligence } from '@hojai/human-intelligence-sdk';

const hi = new HumanIntelligence();

// When customer starts chat
async function handleCustomerMessage(message, voiceData) {
  // 1. Detect emotion
  const emotion = await hi.emotion.analyze({
    text: message.text,
    voice: voiceData,
    context: 'customer_support'
  });

  // 2. If frustrated, generate empathetic response
  if (emotion.emotions.frustration > 0.7) {
    const empathy = await hi.empathy.generateResponse({
      emotion: 'frustrated',
      tone: 'empathetic',
      severity: 'high'
    });
    return { type: 'empathy', response: empathy.response };
  }

  // 3. Track behavior for patterns
  await hi.behavior.recordBehavior({
    entityId: message.customerId,
    trigger: 'support_interaction',
    emotion: emotion.primary,
    outcome: 'in_progress'
  });

  return { type: 'normal', emotion };
}
```

### 2. Founder Dashboard Integration

```javascript
// Daily founder health check
async function founderDailyCheck(founderId) {
  // 1. Burnout assessment
  const burnout = await hi.burnout.assess({
    entityId: founderId,
    sleepHours: founder.sleepHours,
    workHours: founder.workHours,
    stress: founder.stressLevel,
    exerciseDays: founder.exerciseDays
  });

  // 2. Get communication preferences
  const commStyle = await hi.communication.getProfile(founderId);

  // 3. Check trust passport
  const passport = await hi.trustPassport.getPassport(`hojai:${founderId}`);

  // 4. Get team morale
  const teamRisk = await hi.burnout.getTeamRisk(founder.companyId);

  return {
    founderHealth: burnout,
    communication: commStyle,
    trustLevel: passport.trustLevel,
    teamRisk: teamRisk.avgRisk
  };
}
```

### 3. SUTAR Agent Negotiation

```javascript
// Before agent negotiation
async function prepareNegotiation(agentId, counterpartId, negotiationType) {
  // 1. Get emotional context
  const emotionalContext = await getAgentEmotionalContext({
    agentId,
    counterpartId,
    negotiationType
  });

  // 2. Get trust passport of counterpart
  const counterpartTrust = await hi.trustPassport.verify({
    passportId: `hojai:${counterpartId}`
  });

  // 3. Get agent's economy account
  const economy = await hi.agentEconomy.getAccount(agentId);

  // 4. Get simulation for negotiation outcome
  const simulation = await hi.simulation.simulatePricing({
    currentPrice: negotiation.currentPrice,
    currentDemand: negotiation.expectedVolume,
    discount: negotiation.offeredDiscount
  });

  return {
    strategy: emotionalContext.strategy,
    trustLevel: counterpartTrust.trustLevel,
    agentCredits: economy.credits,
    projectedOutcome: simulation.recommendation
  };
}
```

### 4. Company Morale Dashboard

```javascript
// Weekly company health report
async function weeklyCompanyReport(companyId) {
  // 1. Create company profile if not exists
  await hi.company.createCompany({
    companyId,
    name: company.name,
    industry: company.industry
  });

  // 2. Get company analytics
  const analytics = await hi.company.getAnalytics(companyId);

  // 3. Get department breakdown
  const departments = await hi.company.getDepartments(companyId);

  // 4. Get morale trends
  const trends = await hi.company.getTrends(companyId, { days: 7 });

  // 5. Take snapshot
  await hi.company.takeSnapshot(companyId, {
    metrics: analytics.emotionalProfile
  });

  return {
    overallMorale: analytics.overallMorale,
    moraleLevel: analytics.moraleLevel,
    departmentBreakdown: departments,
    weeklyTrend: trends.trends
  };
}
```

### 5. Voice Assistant Integration

```javascript
// Voice conversation with emotion awareness
async function voiceConversationHandler(audioData, userId) {
  // 1. Detect emotion from voice
  const emotion = await hi.voice.detectEmotion({ audioData });

  // 2. Detect presence state
  const presence = await hi.presence.detectPresence({
    userId,
    deviceType: 'smart_speaker',
    activity: 'idle'
  });

  // 3. Get conversation physics
  const physics = await hi.conversation.analyzePhysics({
    sessionId: activeSession,
    segments: audioData.segments
  });

  // 4. Get voice blueprint for response
  const blueprint = await hi.conversation.getVoiceBlueprint({
    emotion: emotion.primary,
    context: { presence: presence.state }
  });

  // 5. Track emotional journey
  await hi.emotionalMemory.addMemory({
    entityId: userId,
    emotion: emotion.primary,
    intensity: emotion.intensity,
    context: 'voice_interaction'
  });

  return {
    emotion,
    presence,
    responseBlueprint: blueprint,
    shouldSpeak: physics.canSpeak
  };
}
```

---

## Port Configuration

### Environment Variables

```bash
# EmotionOS
EMOTION_GATEWAY_URL=http://localhost:4760
EMOTIONAL_MEMORY_URL=http://localhost:4761
EMPATHY_URL=http://localhost:4762
EMOTION_ANALYTICS_URL=http://localhost:4763
TONE_URL=http://localhost:4767
COMM_DNA_URL=http://localhost:4722

# BehaviorOS
HABIT_URL=http://localhost:4731
BURNOUT_URL=http://localhost:4732
TRIGGER_URL=http://localhost:4735

# Company Emotion
COMPANY_EMOTION_URL=http://localhost:4780

# TrustOS
TRUST_PASSPORT_URL=http://localhost:4980
AGENT_ECONOMY_URL=http://localhost:4985
TRUST_SERVICE_URL=http://localhost:4190

# VoiceOS
VOICE_URL=http://localhost:4880
CONVERSATION_URL=http://localhost:4881
VOICE_DIRECTOR_URL=http://localhost:4882
LIFETIME_URL=http://localhost:4883
PRESENCE_URL=http://localhost:4896
RELATIONSHIP_URL=http://localhost:4897

# SimulationOS
SIMULATION_URL=http://localhost:4874
```

---

## Service Dependencies

### Required Services by Use Case

| Use Case | Required Services |
|---------|-----------------|
| Customer Support | EmotionOS, BehaviorOS, TrustOS |
| Founder Dashboard | EmotionOS, BehaviorOS, Company Emotion, TrustOS |
| Agent Negotiation | EmotionOS, TrustOS, Agent Economy, SimulationOS |
| Voice Assistant | EmotionOS, VoiceOS, Emotional Memory |
| Company Analytics | Company Emotion, BehaviorOS |

---

## Error Handling

```javascript
async function safeEmotionAnalysis(message) {
  try {
    const emotion = await hi.emotion.analyze(message);
    return emotion;
  } catch (error) {
    if (error.response?.status === 404) {
      // Service not found - use fallback
      return { emotions: { neutral: 0.5 }, fallback: true };
    }
    if (error.code === 'ECONNREFUSED') {
      // Service down - queue for retry
      await queueEmotionAnalysis(message);
      return { queued: true };
    }
    throw error;
  }
}
```

---

## Testing Integrations

```bash
# Test EmotionOS
npm --prefix platform/emotion/emotion-os-gateway test

# Test BehaviorOS
npm --prefix platform/behavior/habit-engine test
npm --prefix platform/behavior/burnout-prediction test

# Test TrustOS
npm --prefix platform/trust/trust-passport test
npm --prefix platform/trust/agent-trust-economy test

# Test SimulationOS
npm --prefix platform/simulation-os/simulation-os-gateway test

# Test SDK
npm --prefix sdk/hojai-human-intelligence-sdk test
```

---

## Next: Connecting to External Systems

See integration docs for:
- [SUTAR Integration](SUTAR-INTEGRATION.md)
- [CorpPerks Integration](CORPPERKS-INTEGRATION.md)
- [Genie Integration](GENIE-INTEGRATION.md)
