# Genie + Human Intelligence Integration

> **Version:** 1.0.0
> **Last Updated:** June 30, 2026

---

## Overview

Genie (Personal AI Brain) now has emotional intelligence, behavior awareness, and life context understanding.

## Integration Architecture

```
Genie AI
    │
    ├── Personal Memory ────► Emotional Memory
    │
    ├── Decision Engine ────► SimulationOS
    │
    ├── Communication ─────► VoiceOS
    │
    └── User Model ────────► BehaviorOS
```

---

## 1. Emotion-Aware Responses

### Before Generating Response

```javascript
import { HumanIntelligence } from '@hojai/human-intelligence-sdk';

const hi = new HumanIntelligence();

async function genieResponse(userId, query) {
  // 1. Detect user emotion
  const emotion = await hi.emotion.analyze({
    text: query,
    context: 'genie_interaction'
  });

  // 2. Get emotional context from memory
  const emotionalJourney = await hi.emotionalMemory.getTimeline(userId, { days: 7 });
  const recentMood = emotionalJourney.slice(-3).map(e => e.emotion);

  // 3. Get user presence state
  const presence = await hi.presence.detectPresence({ userId });

  // 4. Check burnout risk (if stressed, be supportive)
  const burnout = await hi.burnout.getProfile(userId);

  // Generate context-aware response
  let response = await genieBrain.generate(query, {
    emotionalContext: emotion,
    recentMood,
    presenceState: presence.state,
    burnoutRisk: burnout.riskLevel
  });

  // If user is stressed, add empathy
  if (emotion.frustration > 0.5 || burnout.riskLevel === 'high') {
    response = await hi.empathy.generateResponse({
      emotion: emotion.primary,
      tone: 'supportive',
      severity: 'medium'
    }) + response;
  }

  // Track emotional response
  await hi.emotionalMemory.addMemory({
    entityId: userId,
    emotion: emotion.primary,
    intensity: emotion.intensity,
    context: 'genie_interaction'
  });

  return response;
}
```

---

## 2. Life Timeline Integration

### Genie Knows Your Life Story

```javascript
async function genieLifeContext(userId) {
  // Get life timeline
  const timeline = await hi.conversation.getLifeTimeline(userId);

  // Get emotional journey
  const emotions = await hi.emotionalMemory.getTimeline(userId, { days: 365 });

  // Get communication style
  const comm = await hi.communication.getProfile(userId);

  return {
    lifeChapters: timeline.chapters,
    recentMilestones: timeline.milestones.slice(-5),
    emotionalPattern: analyzePattern(emotions),
    communicationStyle: {
      directness: comm.directness,
      detailLevel: comm.detailLevel,
      preferred: inferPreference(comm)
    },
    keyRelationships: timeline.relationships
  };
}

// Example: Genie says something contextual
async function contextualReminder(userId) {
  const context = await genieLifeContext(userId);

  // "Last Ramadan you said you wanted to surprise your mother"
  if (isRamadanSeason() && context.milestones.some(m => m.name.includes('Ramadan'))) {
    const ramadanMemory = await hi.emotionalMemory.getMemory(userId, 'ramadan_goals');
    if (ramadanMemory) {
      return `You mentioned wanting to ${ramadanMemory.description}. Want me to help plan?`;
    }
  }

  // "Your energy has been low this week"
  if (context.emotionalPattern === 'declining') {
    return `I've noticed you've seemed a bit tired lately. Take it easy this weekend?`;
  }

  return null;
}
```

---

## 3. Behavior-Based Suggestions

### Habit-Aware Recommendations

```javascript
async function genieSuggestion(userId) {
  // 1. Get habit patterns
  const habitPatterns = await hi.behavior.getTriggerAnalytics(userId);

  // 2. Check burnout
  const burnout = await hi.burnout.getProfile(userId);

  // 3. Get emotional state
  const emotion = await hi.emotion.analyze({ text: 'check-in', context: 'genie' });

  // Priority-based suggestions
  const suggestions = [];

  // Critical: Burnout risk
  if (burnout.riskLevel === 'high') {
    suggestions.push({
      priority: 'critical',
      type: 'wellbeing',
      message: 'You seem stressed. Want to talk about what\'s on your mind?',
      action: 'schedule_break'
    });
  }

  // High: Emotional decline
  if (emotion.sadness > 0.5) {
    suggestions.push({
      priority: 'high',
      type: 'emotional',
      message: 'I\'ve noticed you\'ve been feeling down. Remember when you achieved X last month?',
      action: 'positive_memory'
    });
  }

  // Medium: Habit trigger
  if (habitPatterns.stressTrigger) {
    suggestions.push({
      priority: 'medium',
      type: 'habit',
      message: 'You usually feel stressed on Wednesdays. Want to block some focus time?',
      action: 'calendar_block'
    });
  }

  return suggestions.sort((a, b) => getPriority(a) - getPriority(b))[0];
}
```

---

## 4. Voice Conversation

### Emotion-Aware Voice

```javascript
async function voiceGenie(audioData, userId) {
  // 1. Detect voice emotion
  const voiceEmotion = await hi.voice.detectEmotion({ audioData });

  // 2. Detect presence
  const presence = await hi.presence.detectPresence({
    userId,
    deviceType: 'smart_speaker'
  });

  // 3. Get conversation physics
  const physics = await hi.conversation.analyzePhysics({
    sessionId: activeSession,
    segments: audioData.segments
  });

  // 4. Generate voice blueprint
  const blueprint = await hi.conversation.getVoiceBlueprint({
    emotion: voiceEmotion.primary,
    context: { presence: presence.state }
  });

  // 5. Track emotional journey
  await hi.emotionalMemory.addMemory({
    entityId: userId,
    emotion: voiceEmotion.primary,
    intensity: voiceEmotion.intensity,
    context: 'voice_interaction'
  });

  return {
    emotion: voiceEmotion,
    presence: presence.state,
    blueprint,
    canSpeak: physics.canSpeak,
    responseDelay: physics.recommendedDelay
  };
}
```

---

## 5. Personalized Communication

### Genie Speaks Your Language

```javascript
async function personalizedResponse(userId, query) {
  // 1. Get communication style
  const comm = await hi.communication.getProfile(userId);

  // 2. Adapt response to user style
  const adaptedQuery = await hi.communication.adapt({
    sourceId: 'genie',
    targetId: userId
  });

  // 3. Generate response
  let response = await genieBrain.generate(adaptedQuery);

  // 4. Post-process for communication style
  if (comm.directness > 80) {
    response = makeConcise(response); // Short, direct
  } else if (comm.detailLevel > 80) {
    response = makeDetailed(response); // Long, thorough
  }

  // 5. Generate voice (if voice mode)
  const voiceBlueprint = await hi.conversation.getVoiceBlueprint({
    emotion: getEmotion(query),
    context: { communicationStyle: comm }
  });

  return {
    text: response,
    voice: voiceBlueprint,
    communicationStyle: comm
  };
}
```

---

## 6. Life Milestones

### Genie Tracks Your Journey

```javascript
async function trackMilestone(userId, milestone) {
  // 1. Add to life timeline
  await hi.conversation.addMilestone({
    userId,
    name: milestone.name,
    date: milestone.date,
    emotion: milestone.emotion,
    category: milestone.category
  });

  // 2. Add to emotional memory
  await hi.emotionalMemory.addMemory({
    entityId: userId,
    emotion: milestone.emotion,
    intensity: 0.9,
    context: `milestone:${milestone.name}`
  });

  // 3. Check for patterns
  const patterns = await hi.emotionalMemory.getPatterns(userId);

  return {
    milestone,
    patterns,
    context: generateMilestoneContext(patterns)
  };
}

// Example: "Remember when you started this company 2 years ago?"
async function reminisce(userId) {
  const timeline = await hi.conversation.getLifeTimeline(userId);
  const emotion = await hi.emotionalMemory.getTimeline(userId, { days: 730 }); // 2 years

  const startupMilestone = timeline.milestones.find(m => m.category === 'career');

  if (startupMilestone) {
    return `You started ${startupMilestone.name} in ${startupMilestone.year}. 
            Your energy then was ${emotion[0]?.emotion || 'optimistic'}. 
            Look how far you've come!`;
  }
}
```

---

## 7. Proactive Well-being

### Genie Looks Out For You

```javascript
async function genieWellbeingCheck(userId) {
  // 1. Daily burnout check
  const burnout = await hi.burnout.quickCheck({
    sleepHours: await getSleepData(userId),
    workHours: await getWorkHours(userId),
    stress: await getStressData(userId),
    exerciseDays: await getExerciseDays(userId)
  });

  // 2. Get emotional patterns
  const patterns = await hi.emotionalMemory.getPatterns(userId);

  // 3. Get recent interactions
  const recent = await hi.emotionalMemory.getTimeline(userId, { days: 7 });

  // Generate wellbeing report
  const report = {
    burnoutRisk: burnout.riskLevel,
    emotionalState: patterns.dominant,
    stressTrend: patterns.trend,
    recentHighlights: recent.filter(e => e.emotion === 'happy'),
    wellbeingScore: calculateWellbeingScore(burnout, patterns)
  };

  // Proactive messages
  const messages = [];

  if (burnout.riskLevel === 'high') {
    messages.push('I\'m a bit worried about you. You\'ve been working long hours.');
  }

  if (patterns.trend === 'declining') {
    messages.push('Your mood seems lower than usual this week.');
  }

  if (report.wellbeingScore < 50) {
    messages.push('Let\'s take a moment to reflect on what\'s going well.');
  }

  return { report, messages };
}
```

---

## Genie Personality Modes

```javascript
const GENIE_MODES = {
  professional: {
    tone: 'formal',
    detailLevel: 'high',
    empathy: 'moderate'
  },
  friend: {
    tone: 'casual',
    detailLevel: 'medium',
    empathy: 'high'
  },
  coach: {
    tone: 'motivating',
    detailLevel: 'medium',
    empathy: 'high',
    directness: 'high'
  },
  therapist: {
    tone: 'warm',
    detailLevel: 'high',
    empathy: 'very_high'
  }
};
```

---

## Files to Update

| File | Update |
|------|--------|
| `genie/core/response-engine.js` | Add emotion detection |
| `genie/core/memory-engine.js` | Add emotional memory |
| `genie/core/voice-handler.js` | Add voice emotion |
| `genie/core/suggestion-engine.js` | Add behavior patterns |
| `genie/core/personality.js` | Add Genie modes |

---

## Environment Variables

```bash
GENIE_EMOTION_URL=http://localhost:4760
GENIE_EMOTIONAL_MEMORY_URL=http://localhost:4761
GENIE_VOICE_URL=http://localhost:4880
GENIE_BEHAVIOR_URL=http://localhost:4731
GENIE_BURNOUT_URL=http://localhost:4732
GENIE_PRESENCE_URL=http://localhost:4896
GENIE_SIMULATION_URL=http://localhost:4874
```
