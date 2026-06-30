# CorpPerks + Human Intelligence Integration

> **Version:** 1.0.0
> **Last Updated:** June 30, 2026

---

## Overview

CorpPerks (PeopleOS / Workforce OS) now integrates with Human Intelligence for employee well-being, team morale tracking, and burnout prevention.

## Integration Architecture

```
CorpPerks / PeopleOS
    │
    ├── HR Dashboard ─────► Company Emotion
    │
    ├── Employee Profiles ──► Burnout Prediction
    │
    ├── Team Management ───► Trigger Intelligence
    │
    └── Performance ───────► Habit Tracking
```

---

## 1. Employee Well-being Dashboard

### Employee Health Score

```javascript
import { HumanIntelligence } from '@hojai/human-intelligence-sdk';

const hi = new HumanIntelligence();

async function getEmployeeHealthScore(employeeId, companyId) {
  // 1. Burnout risk
  const burnout = await hi.burnout.getProfile(employeeId);

  // 2. Habits consistency
  const habits = await hi.behavior.getConsistency(employeeId, { days: 30 });

  // 3. Work patterns
  const workPatterns = await hi.behavior.getTriggerAnalytics(employeeId);

  // 4. Communication style
  const commStyle = await hi.communication.getProfile(employeeId);

  // Calculate composite health score
  const healthScore = calculateHealthScore({
    burnoutRisk: burnout.riskScore,
    habitConsistency: habits.consistency,
    stressTriggers: workPatterns.stressTriggerCount,
    communicationBalance: commStyle.balance
  });

  return {
    employeeId,
    healthScore,
    burnoutRisk: burnout.riskLevel,
    recommendations: burnout.recommendations,
    alerts: burnout.riskLevel === 'high' ? ['Schedule check-in'] : []
  };
}
```

---

## 2. Team Morale Tracking

### Weekly Team Health Report

```javascript
async function weeklyTeamReport(companyId, departmentId) {
  // 1. Create/get company profile
  await hi.company.createCompany({
    companyId,
    name: company.name,
    industry: company.industry
  });

  // 2. Get department analytics
  const analytics = await hi.company.getDepartments(companyId);

  // 3. Get morale trends
  const trends = await hi.company.getTrends(companyId, { days: 7 });

  // 4. Take snapshot
  await hi.company.takeSnapshot(companyId, {
    metrics: analytics.emotionalProfile
  });

  // 5. Get team burnout risk
  const teamRisk = await hi.burnout.getTeamRisk(companyId);

  return {
    moraleLevel: analytics.moraleLevel,
    weeklyTrend: trends.trends,
    teamBurnoutRisk: teamRisk.avgRisk,
    atRiskEmployees: teamRisk.atRiskCount,
    recommendations: generateRecommendations(analytics)
  };
}
```

---

## 3. Burnout Prevention

### Proactive Burnout Detection

```javascript
async function detectBurnoutRisk(employeeId) {
  // 1. Check burnout prediction
  const burnout = await hi.burnout.assess({
    entityId: employeeId,
    sleepHours: employee.sleepHours,
    workHours: employee.workHours,
    stress: employee.stressScore,
    exerciseDays: employee.exerciseDays
  });

  // 2. Get work trigger patterns
  const triggers = await hi.behavior.predictBehavior({
    entityId: employeeId,
    trigger: 'high_workload'
  });

  // 3. Check recent emotional patterns
  const emotions = await hi.emotionalMemory.getTimeline(employeeId, { days: 14 });

  // Detect burnout pattern
  const burnoutPattern = detectBurnoutPattern(emotions);

  if (burnout.riskLevel === 'high' || burnoutPattern) {
    // Alert manager
    await alertManager(employeeId, burnout);

    // Suggest intervention
    const intervention = await getIntervention(burnout);
    return { alert: true, intervention, burnout };
  }

  return { alert: false, burnout };
}
```

---

## 4. Manager Coaching

### Team Communication Styles

```javascript
async function managerTeamInsights(managerId, teamIds) {
  const teamInsights = [];

  for (const employeeId of teamIds) {
    // 1. Get communication style
    const comm = await hi.communication.getProfile(employeeId);

    // 2. Get burnout status
    const burnout = await hi.burnout.getProfile(employeeId);

    // 3. Get work habits
    const habits = await hi.behavior.getConsistency(employeeId);

    teamInsights.push({
      employeeId,
      communication: {
        directness: comm.directness,
        detailLevel: comm.detailLevel,
        preferredStyle: inferPreferredStyle(comm)
      },
      wellbeing: {
        burnoutRisk: burnout.riskLevel,
        healthScore: burnout.healthScore
      },
      workPatterns: {
        consistency: habits.consistency,
        productiveHours: habits.productiveHours
      }
    });
  }

  return {
    managerId,
    teamSize: teamIds.length,
    teamInsights,
    recommendations: generateManagerRecommendations(teamInsights)
  };
}
```

---

## 5. Employee Onboarding

### New Employee Integration

```javascript
async function onboardEmployee(employee) {
  // 1. Create company employee record
  await hi.company.recordEmployeeEmotion({
    employeeId: employee.id,
    companyId: employee.companyId,
    departmentId: employee.departmentId,
    emotion: 'excited',
    intensity: 0.8,
    context: 'onboarding'
  });

  // 2. Set up habit tracking
  const goodHabits = employee.role === 'founder'
    ? ['Morning planning', 'Exercise daily', 'Reading']
    : ['Code review', 'Team standup', 'Learning'];

  for (const habitName of goodHabits) {
    await hi.habits.create({
      entityId: employee.id,
      name: habitName,
      frequency: 'daily',
      target: 1,
      impact: 'positive'
    });
  }

  // 3. Record initial emotion
  await hi.emotionalMemory.addMemory({
    entityId: employee.id,
    emotion: 'excited',
    intensity: 0.8,
    context: 'onboarding_day'
  });

  return { success: true, employeeId: employee.id };
}
```

---

## 6. Performance Reviews

### Emotion-Aware Performance

```javascript
async function performanceReview(employeeId, period) {
  // 1. Get work consistency
  const workPatterns = await hi.behavior.getTriggerAnalytics(employeeId);

  // 2. Get emotional journey
  const emotions = await hi.emotionalMemory.getTimeline(employeeId, { days: period });

  // 3. Get burnout trend
  const burnoutTrend = await hi.burnout.getProfile(employeeId);

  // 4. Get communication growth
  const comm = await hi.communication.getProfile(employeeId);

  // Calculate performance score
  const performanceScore = calculatePerformance({
    workConsistency: workPatterns.consistency,
    emotionalStability: emotions.stability,
    burnoutTrend: burnoutTrend.trend,
    communicationGrowth: comm.growth
  });

  return {
    employeeId,
    period,
    performanceScore,
    insights: {
      mostProductive: workPatterns.productiveHours,
      stressTriggers: workPatterns.topTriggers,
      emotionalState: emotions.dominant,
      burnoutRisk: burnoutTrend.riskLevel
    },
    recommendations: generateReviewRecommendations(performanceScore)
  };
}
```

---

## 7. Team Building Events

### Event Impact Tracking

```javascript
async function trackEventImpact(companyId, eventId, eventType) {
  // 1. Get pre-event morale
  const preMorale = await hi.company.getAnalytics(companyId);

  // 2. Record event
  await hi.company.takeSnapshot(companyId, {
    metrics: { event: eventType }
  });

  // 3. After event, get post-event morale
  setTimeout(async () => {
    const postMorale = await hi.company.getAnalytics(companyId);

    // Calculate impact
    const impact = postMorale.overallMorale - preMorale.overallMorale;

    // Record emotion for attendees
    for (const employeeId of event.attendees) {
      await hi.emotionalMemory.addMemory({
        entityId: employeeId,
        emotion: impact > 0 ? 'happy' : 'neutral',
        intensity: Math.abs(impact) / 10,
        context: `team_event:${eventId}`
      });
    }

    return { eventId, moraleImpact: impact };
  }, 7 * 24 * 60 * 60 * 1000); // Check after 7 days
}
```

---

## Quick Dashboard Widget

```javascript
// React component
function TeamHealthWidget({ companyId }) {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    weeklyTeamReport(companyId).then(setHealth);
  }, [companyId]);

  if (!health) return <Loading />;

  return (
    <div className="team-health">
      <h3>Team Morale: {health.moraleLevel.emoji} {health.moraleLevel.level}</h3>
      <p>Burnout Risk: {health.teamBurnoutRisk}</p>
      <ProgressBar value={health.moraleLevel.score} />
      {health.atRiskEmployees > 0 && (
        <Alert type="warning">
          {health.atRiskEmployees} employees at risk
        </Alert>
      )}
    </div>
  );
}
```

---

## Files to Update

| File | Update |
|------|--------|
| `CorpPerks/people-os/src/dashboard.js` | Add morale widget |
| `CorpPerks/workforce-os/src/employee.js` | Add health score |
| `CorpPerks/hr-os/src/reviews.js` | Add emotion-aware reviews |
| `CorpPerks/onboarding-os/src/welcome.js` | Add emotion tracking |

---

## Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Burnout Risk | > 0.6 | > 0.8 |
| Morale Score | < 60 | < 40 |
| Stress Triggers | > 10/day | > 20/day |
| Habit Consistency | < 0.5 | < 0.3 |
