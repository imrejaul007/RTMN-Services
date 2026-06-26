/**
 * ElderCare OS - Comprehensive Senior Care Management Platform
 * Port: 5263
 *
 * AI-Powered Elder Care: Health monitoring, medication management,
 * emergency response, family coordination, and personalized care planning.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5263;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// In-memory storage (would be MongoDB in production)
const storage = {
  residents: new Map(),
  carePlans: new Map(),
  medications: new Map(),
  healthMetrics: new Map(),
  activities: new Map(),
  families: new Map(),
  emergencyAlerts: new Map(),
  staff: new Map(),
  dailyReports: new Map()
};

// Unique ID generator
const generateId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ============================================
// HEALTH METRICS
// ============================================

// AI Agent: Health Monitoring Agent
const healthMonitoringAgent = {
  name: 'Health Monitoring Agent',
  analyzeVitals: (vitals) => {
    const alerts = [];
    const score = 100;

    if (vitals.heartRate < 60 || vitals.heartRate > 100) {
      alerts.push({ type: 'heart_rate', severity: 'high', message: 'Abnormal heart rate detected' });
    }
    if (vitals.bloodPressure?.systolic > 140 || vitals.bloodPressure?.diastolic > 90) {
      alerts.push({ type: 'blood_pressure', severity: 'high', message: 'High blood pressure detected' });
    }
    if (vitals.temperature > 99.5 || vitals.temperature < 97) {
      alerts.push({ type: 'temperature', severity: 'medium', message: 'Abnormal temperature' });
    }
    if (vitals.oxygenSaturation < 95) {
      alerts.push({ type: 'oxygen', severity: 'high', message: 'Low oxygen saturation' });
    }
    if (vitals.bloodGlucose > 180 || vitals.bloodGlucose < 70) {
      alerts.push({ type: 'glucose', severity: 'medium', message: 'Abnormal glucose level' });
    }

    return {
      overallScore: Math.max(0, score - (alerts.length * 15)),
      alerts,
      trend: vitals.previous ? 'stable' : 'improving',
      recommendations: generateHealthRecommendations(alerts)
    };
  },

  predictRisk: (residentId, healthHistory) => {
    const fallRisk = calculateFallRisk(healthHistory);
    const cognitiveDecline = calculateCognitiveDecline(healthHistory);
    const chronicConditionRisk = calculateChronicRisk(healthHistory);

    return {
      fallRisk: { score: fallRisk, level: getRiskLevel(fallRisk) },
      cognitiveDecline: { score: cognitiveDecline, level: getRiskLevel(cognitiveDecline) },
      chronicConditionRisk: { score: chronicConditionRisk, level: getRiskLevel(chronicConditionRisk) },
      recommendedActions: getRecommendedActions(fallRisk, cognitiveDecline, chronicConditionRisk)
    };
  }
};

// ============================================
// MEDICATION MANAGEMENT
// ============================================

// AI Agent: Medication Reminder Agent
const medicationReminderAgent = {
  manageSchedule: (residentId, medications) => {
    const schedule = [];
    const now = new Date();

    medications.forEach(med => {
      med.schedule.forEach(time => {
        const [hours, minutes] = time.split(':');
        const doseTime = new Date();
        doseTime.setHours(parseInt(hours), parseInt(minutes), 0);

        schedule.push({
          medicationId: med.id,
          medicationName: med.name,
          dosage: med.dosage,
          scheduledTime: doseTime.toISOString(),
          status: getMedicationStatus(doseTime, now),
          instructions: med.instructions,
          interactions: checkInteractions(med, medications)
        });
      });
    });

    return schedule.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
  },

  checkAdherence: (residentId, adherenceData) => {
    const totalDoses = adherenceData.length;
    const takenDoses = adherenceData.filter(d => d.status === 'taken').length;
    const missedDoses = adherenceData.filter(d => d.status === 'missed').length;
    const delayedDoses = adherenceData.filter(d => d.status === 'delayed').length;

    const adherenceRate = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 0;

    return {
      adherenceRate: Math.round(adherenceRate),
      totalDoses,
      takenDoses,
      missedDoses,
      delayedDoses,
      trend: adherenceRate > 90 ? 'excellent' : adherenceRate > 80 ? 'good' : 'needs_improvement',
      factors: analyzeAdherenceFactors(adherenceData)
    };
  },

  detectInteraction: (newMed, currentMedications) => {
    const interactions = [];
    const interactionDB = getInteractionDatabase();

    currentMedications.forEach(current => {
      const key = `${newMed.category}-${current.category}`;
      if (interactionDB[key]) {
        interactions.push({
          medication: current.name,
          severity: interactionDB[key].severity,
          description: interactionDB[key].description,
          recommendation: interactionDB[key].recommendation
        });
      }
    });

    return interactions;
  }
};

// ============================================
// EMERGENCY RESPONSE
// ============================================

// AI Agent: Emergency Response Agent
const emergencyResponseAgent = {
  detectEmergency: (alertData) => {
    const emergencyTypes = [];

    if (alertData.type === 'fall_detected' || alertData.severity >= 8) {
      emergencyTypes.push('fall');
    }
    if (alertData.vitals?.heartRate < 40 || alertData.vitals?.heartRate > 180) {
      emergencyTypes.push('cardiac');
    }
    if (alertData.vitals?.oxygenSaturation < 85) {
      emergencyTypes.push('respiratory');
    }
    if (alertData.behavior === 'prolonged_inactivity') {
      emergencyTypes.push('wellness');
    }
    if (alertData.location === 'bathroom' && alertData.duration > 30) {
      emergencyTypes.push('bathroom_fall');
    }

    return {
      isEmergency: emergencyTypes.length > 0,
      types: emergencyTypes,
      severity: calculateEmergencySeverity(emergencyTypes, alertData),
      responseProtocol: getEmergencyProtocol(emergencyTypes),
      escalationLevel: getEscalationLevel(emergencyTypes, alertData)
    };
  },

  orchestrateResponse: (emergency, resident) => {
    const response = {
      id: generateId('response'),
      emergencyId: emergency.id,
      residentId: resident.id,
      timestamp: new Date().toISOString(),
      steps: [],
      responders: [],
      estimatedArrival: null
    };

    // Step 1: Immediate check
    response.steps.push({
      order: 1,
      action: 'immediate_welfare_check',
      assignedTo: 'nearest_staff',
      status: 'pending'
    });

    // Step 2: Emergency services if needed
    if (emergency.escalationLevel >= 2) {
      response.steps.push({
        order: 2,
        action: 'call_emergency_services',
        assignedTo: 'system',
        status: 'pending'
      });
    }

    // Step 3: Family notification
    response.steps.push({
      order: 3,
      action: 'notify_family',
      contacts: resident.familyContacts,
      status: 'pending'
    });

    // Step 4: Medical history prep
    response.steps.push({
      order: 4,
      action: 'prepare_medical_history',
      status: 'pending'
    });

    return response;
  },

  createAlert: (residentId, type, severity, details) => {
    const alert = {
      id: generateId('alert'),
      residentId,
      type,
      severity,
      details,
      status: 'active',
      createdAt: new Date().toISOString(),
      acknowledgedAt: null,
      resolvedAt: null,
      responseTime: null
    };

    storage.emergencyAlerts.set(alert.id, alert);
    return alert;
  }
};

// ============================================
// FAMILY COORDINATION
// ============================================

// AI Agent: Family Coordinator Agent
const familyCoordinatorAgent = {
  managePortal: (residentId, familyMembers) => {
    const portal = {
      residentId,
      familyMembers: familyMembers.map(member => ({
        ...member,
        accessLevel: member.relationship === 'primary_contact' ? 'full' : 'limited',
        lastLogin: null,
        notificationsEnabled: true
      })),
      sharedAlbums: [],
      careLogAccess: true,
      medicationViewAccess: true,
      financialAccess: false
    };

    return portal;
  },

  coordinateUpdates: (residentId, updateType, data) => {
    const update = {
      id: generateId('update'),
      residentId,
      type: updateType,
      data,
      timestamp: new Date().toISOString(),
      notifiedTo: []
    };

    // Generate appropriate message based on update type
    update.message = generateUpdateMessage(updateType, data);
    update.priority = getUpdatePriority(updateType);

    return update;
  },

  scheduleVisits: (residentId, visitors, availability) => {
    const visits = [];

    visitors.forEach(visitor => {
      const preferredSlots = visitor.preferredTimes || ['10:00', '14:00', '16:00'];
      const compatibleSlots = findCompatibleSlots(preferredSlots, availability);

      visits.push({
        visitorId: visitor.id,
        visitorName: visitor.name,
        relationship: visitor.relationship,
        scheduledSlots: compatibleSlots,
        status: compatibleSlots.length > 0 ? 'scheduled' : 'pending'
      });
    });

    return visits;
  }
};

// ============================================
// CARE PLANNING
// ============================================

// AI Agent: Care Planner Agent
const carePlannerAgent = {
  createPlan: (residentId, assessment) => {
    const plan = {
      id: generateId('careplan'),
      residentId,
      createdAt: new Date().toISOString(),
      status: 'draft',
      goals: [],
      interventions: [],
      timelines: [],
      assessments: [assessment]
    };

    // Generate personalized goals based on assessment
    if (assessment.mobility < 70) {
      plan.goals.push({
        category: 'mobility',
        goal: 'Improve mobility and balance',
        target: 'Increase mobility score by 20% in 6 months',
        metrics: ['walking_distance', 'balance_score', 'fall_frequency']
      });
    }

    if (assessment.cognitive < 80) {
      plan.goals.push({
        category: 'cognitive',
        goal: 'Maintain cognitive function',
        target: 'Stabilize cognitive decline',
        metrics: ['moca_score', 'memory_tests', 'daily_task_completion']
      });
    }

    if (assessment.social < 60) {
      plan.goals.push({
        category: 'social',
        goal: 'Increase social engagement',
        target: 'Participate in 3+ social activities weekly',
        metrics: ['activity_participation', 'social_interactions', 'mood_score']
      });
    }

    // Add interventions for each goal
    plan.interventions = generateInterventions(plan.goals);
    plan.timelines = generateTimelines(plan.goals);

    return plan;
  },

  adjustPlan: (planId, progressData, newAssessments) => {
    const plan = storage.carePlans.get(planId);
    if (!plan) return null;

    plan.lastUpdated = new Date().toISOString();
    plan.assessments.push(...newAssessments);

    // Analyze progress and adjust goals
    progressData.forEach(progress => {
      const goal = plan.goals.find(g => g.category === progress.category);
      if (goal) {
        goal.progress = progress.currentValue;
        goal.progressPercent = Math.min(100, (progress.currentValue / goal.target) * 100);

        if (goal.progressPercent >= 100) {
          goal.status = 'achieved';
        } else if (goal.progressPercent >= 50) {
          goal.status = 'on_track';
        } else {
          goal.status = 'needs_attention';
        }
      }
    });

    return plan;
  },

  generateCareSummary: (planId) => {
    const plan = storage.carePlans.get(planId);
    if (!plan) return null;

    const summary = {
      planId,
      residentId: plan.residentId,
      period: `${plan.createdAt} - ${plan.lastUpdated || 'Present'}`,
      overallProgress: calculateOverallProgress(plan.goals),
      goalsSummary: plan.goals.map(g => ({
        category: g.category,
        status: g.status,
        progress: g.progressPercent
      })),
      recommendations: generateCareRecommendations(plan),
      nextSteps: getNextSteps(plan),
      familyInvolvement: plan.familyMeetings?.length || 0
    };

    return summary;
  }
};

// ============================================
// ROUTES
// ============================================

// Health Check
app.get('/health', (req, res) => {
  res.json({
    service: 'ElderCare OS',
    status: 'healthy',
    port: PORT,
    version: '1.0.0',
    capabilities: [
      'health_monitoring',
      'medication_management',
      'emergency_response',
      'family_coordination',
      'care_planning'
    ],
    agents: 5
  });
});

// ---- Residents ----

app.post('/api/residents', (req, res) => {
  const { name, age, gender, roomNumber, admissionDate, medicalHistory, familyContacts } = req.body;

  const resident = {
    id: generateId('resident'),
    name,
    age,
    gender,
    roomNumber,
    admissionDate: admissionDate || new Date().toISOString(),
    medicalHistory: medicalHistory || [],
    familyContacts: familyContacts || [],
    status: 'active',
    careLevel: 'standard',
    createdAt: new Date().toISOString()
  };

  storage.residents.set(resident.id, resident);
  res.status(201).json(resident);
});

app.get('/api/residents', (req, res) => {
  const residents = Array.from(storage.residents.values());
  res.json({ residents, count: residents.length });
});

app.get('/api/residents/:id', (req, res) => {
  const resident = storage.residents.get(req.params.id);
  if (!resident) return res.status(404).json({ error: 'Resident not found' });
  res.json(resident);
});

app.patch('/api/residents/:id', (req, res) => {
  const resident = storage.residents.get(req.params.id);
  if (!resident) return res.status(404).json({ error: 'Resident not found' });

  const updated = { ...resident, ...req.body, updatedAt: new Date().toISOString() };
  storage.residents.set(req.params.id, updated);
  res.json(updated);
});

// ---- Health Monitoring ----

app.post('/api/health/vitals', (req, res) => {
  const { residentId, vitals, timestamp } = req.body;

  const healthRecord = {
    id: generateId('health'),
    residentId,
    vitals,
    timestamp: timestamp || new Date().toISOString(),
    analysis: healthMonitoringAgent.analyzeVitals(vitals)
  };

  storage.healthMetrics.set(healthRecord.id, healthRecord);

  // Create alert if needed
  if (healthRecord.analysis.alerts.length > 0) {
    healthRecord.alerts = healthRecord.analysis.alerts.map(a =>
      emergencyResponseAgent.createAlert(residentId, a.type, a.severity, a)
    );
  }

  res.status(201).json(healthRecord);
});

app.get('/api/health/:residentId/trends', (req, res) => {
  const records = Array.from(storage.healthMetrics.values())
    .filter(m => m.residentId === req.params.residentId)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  res.json({
    residentId: req.params.residentId,
    records,
    count: records.length
  });
});

app.get('/api/health/:residentId/risk-assessment', (req, res) => {
  const history = Array.from(storage.healthMetrics.values())
    .filter(m => m.residentId === req.params.residentId);

  const assessment = healthMonitoringAgent.predictRisk(req.params.residentId, history);
  res.json(assessment);
});

// ---- Medications ----

app.post('/api/medications', (req, res) => {
  const { residentId, name, dosage, frequency, schedule, instructions, category, startDate } = req.body;

  const medication = {
    id: generateId('med'),
    residentId,
    name,
    dosage,
    frequency,
    schedule,
    instructions,
    category,
    startDate: startDate || new Date().toISOString(),
    status: 'active',
    refillsRemaining: 3
  };

  storage.medications.set(medication.id, medication);
  res.status(201).json(medication);
});

app.get('/api/medications/:residentId/schedule', (req, res) => {
  const medications = Array.from(storage.medications.values())
    .filter(m => m.residentId === req.params.residentId && m.status === 'active');

  const schedule = medicationReminderAgent.manageSchedule(req.params.residentId, medications);
  res.json({ schedule, count: schedule.length });
});

app.post('/api/medications/:id/adherence', (req, res) => {
  const { status, timestamp, notes } = req.body;

  const adherenceRecord = {
    id: generateId('adherence'),
    medicationId: req.params.id,
    status,
    timestamp: timestamp || new Date().toISOString(),
    notes
  };

  res.json({
    record: adherenceRecord,
    updatedSchedule: medicationReminderAgent.checkAdherence(
      storage.medications.get(req.params.id)?.residentId,
      [adherenceRecord]
    )
  });
});

app.get('/api/medications/:residentId/adherence', (req, res) => {
  const medications = Array.from(storage.medications.values())
    .filter(m => m.residentId === req.params.residentId);

  const allAdherence = medications.map(m => ({
    medicationId: m.id,
    medicationName: m.name,
    adherenceRate: 85 + Math.random() * 15 // Simulated
  }));

  res.json({
    residentId: req.params.residentId,
    medications: allAdherence,
    overallAdherence: allAdherence.reduce((a, b) => a + b.adherenceRate, 0) / allAdherence.length
  });
});

// ---- Emergency Response ----

app.post('/api/emergency/detect', (req, res) => {
  const { residentId, type, severity, vitals, behavior, location, duration } = req.body;

  const detection = emergencyResponseAgent.detectEmergency({ residentId, type, severity, vitals, behavior, location, duration });

  if (detection.isEmergency) {
    const resident = storage.residents.get(residentId);
    const alert = emergencyResponseAgent.createAlert(residentId, detection.types[0], detection.severity, detection);
    const response = emergencyResponseAgent.orchestrateResponse(detection, resident);

    res.json({ detection, alert, response });
  } else {
    res.json({ detection, alert: null });
  }
});

app.get('/api/emergency/alerts', (req, res) => {
  const { status } = req.query;
  let alerts = Array.from(storage.emergencyAlerts.values());

  if (status) {
    alerts = alerts.filter(a => a.status === status);
  }

  res.json({ alerts, count: alerts.length });
});

app.patch('/api/emergency/alerts/:id/acknowledge', (req, res) => {
  const alert = storage.emergencyAlerts.get(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });

  alert.acknowledgedAt = new Date().toISOString();
  alert.acknowledgedBy = req.body.acknowledgedBy || 'system';
  alert.status = 'acknowledged';

  storage.emergencyAlerts.set(req.params.id, alert);
  res.json(alert);
});

app.patch('/api/emergency/alerts/:id/resolve', (req, res) => {
  const alert = storage.emergencyAlerts.get(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });

  alert.resolvedAt = new Date().toISOString();
  alert.resolvedBy = req.body.resolvedBy || 'system';
  alert.status = 'resolved';
  alert.resolution = req.body.resolution;
  alert.responseTime = new Date() - new Date(alert.createdAt);

  storage.emergencyAlerts.set(req.params.id, alert);
  res.json(alert);
});

// ---- Family Coordination ----

app.post('/api/family/portal', (req, res) => {
  const { residentId, familyMembers } = req.body;

  const portal = familyCoordinatorAgent.managePortal(residentId, familyMembers);
  storage.families.set(residentId, portal);

  res.status(201).json(portal);
});

app.get('/api/family/:residentId/updates', (req, res) => {
  const updates = Array.from(storage.dailyReports.values())
    .filter(r => r.residentId === req.params.residentId)
    .slice(-7);

  res.json({ updates, count: updates.length });
});

app.post('/api/family/:residentId/notify', (req, res) => {
  const { updateType, data } = req.body;

  const update = familyCoordinatorAgent.coordinateUpdates(req.params.residentId, updateType, data);

  res.status(201).json(update);
});

// ---- Care Planning ----

app.post('/api/care/plans', (req, res) => {
  const { residentId, assessment } = req.body;

  const plan = carePlannerAgent.createPlan(residentId, assessment);
  storage.carePlans.set(plan.id, plan);

  res.status(201).json(plan);
});

app.get('/api/care/plans/:id', (req, res) => {
  const plan = storage.carePlans.get(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Care plan not found' });
  res.json(plan);
});

app.patch('/api/care/plans/:id', (req, res) => {
  const { progressData, newAssessments } = req.body;

  const updated = carePlannerAgent.adjustPlan(req.params.id, progressData, newAssessments);
  if (!updated) return res.status(404).json({ error: 'Care plan not found' });

  storage.carePlans.set(req.params.id, updated);
  res.json(updated);
});

app.get('/api/care/plans/:id/summary', (req, res) => {
  const summary = carePlannerAgent.generateCareSummary(req.params.id);
  if (!summary) return res.status(404).json({ error: 'Care plan not found' });
  res.json(summary);
});

// ---- Daily Reports ----

app.post('/api/reports/daily', (req, res) => {
  const { residentId, date, activities, meals, sleep, notes } = req.body;

  const report = {
    id: generateId('report'),
    residentId,
    date: date || new Date().toISOString().split('T')[0],
    activities: activities || [],
    meals: meals || { breakfast: 'taken', lunch: 'taken', dinner: 'taken' },
    sleep: sleep || { hours: 7, quality: 'good' },
    notes: notes || '',
    createdAt: new Date().toISOString()
  };

  storage.dailyReports.set(report.id, report);
  res.status(201).json(report);
});

app.get('/api/reports/:residentId', (req, res) => {
  const { startDate, endDate } = req.query;
  let reports = Array.from(storage.dailyReports.values())
    .filter(r => r.residentId === req.params.residentId);

  if (startDate) {
    reports = reports.filter(r => r.date >= startDate);
  }
  if (endDate) {
    reports = reports.filter(r => r.date <= endDate);
  }

  res.json({ reports: reports.reverse(), count: reports.length });
});

// ---- Activities ----

app.post('/api/activities', (req, res) => {
  const { residentId, activityType, duration, notes } = req.body;

  const activity = {
    id: generateId('activity'),
    residentId,
    activityType,
    duration,
    notes,
    scheduledAt: new Date().toISOString(),
    status: 'completed'
  };

  storage.activities.set(activity.id, activity);
  res.status(201).json(activity);
});

app.get('/api/activities/:residentId', (req, res) => {
  const activities = Array.from(storage.activities.values())
    .filter(a => a.residentId === req.params.residentId)
    .slice(-30);

  res.json({ activities, count: activities.length });
});

// ---- Staff Management ----

app.post('/api/staff', (req, res) => {
  const { name, role, certifications, shiftPreferences } = req.body;

  const staff = {
    id: generateId('staff'),
    name,
    role,
    certifications: certifications || [],
    shiftPreferences: shiftPreferences || [],
    status: 'active',
    assignedResidents: [],
    createdAt: new Date().toISOString()
  };

  storage.staff.set(staff.id, staff);
  res.status(201).json(staff);
});

app.get('/api/staff', (req, res) => {
  const staff = Array.from(storage.staff.values());
  res.json({ staff, count: staff.length });
});

app.patch('/api/staff/:id/assign', (req, res) => {
  const staff = storage.staff.get(req.params.id);
  if (!staff) return res.status(404).json({ error: 'Staff not found' });

  staff.assignedResidents = req.body.residentIds || [];
  staff.lastAssigned = new Date().toISOString();

  storage.staff.set(req.params.id, staff);
  res.json(staff);
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateHealthRecommendations(alerts) {
  const recommendations = [];

  if (alerts.some(a => a.type === 'heart_rate')) {
    recommendations.push('Schedule cardiac evaluation');
    recommendations.push('Monitor heart rate patterns');
  }
  if (alerts.some(a => a.type === 'blood_pressure')) {
    recommendations.push('Review medication for blood pressure');
    recommendations.push('Reduce sodium intake');
  }
  if (alerts.some(a => a.type === 'oxygen')) {
    recommendations.push('Schedule pulmonary check-up');
    recommendations.push('Ensure proper oxygen equipment availability');
  }

  return recommendations;
}

function calculateFallRisk(healthHistory) {
  // Simplified fall risk calculation
  let risk = 30;

  healthHistory.forEach(record => {
    if (record.vitals?.dizziness) risk += 10;
    if (record.vitals?.mobilityAid) risk += 15;
    if (record.vitals?.balanceIssues) risk += 20;
  });

  return Math.min(100, risk);
}

function calculateCognitiveDecline(healthHistory) {
  // Simplified cognitive decline calculation
  let risk = 20;

  healthHistory.forEach(record => {
    if (record.vitals?.confusion) risk += 15;
    if (record.vitals?.memoryIssues) risk += 10;
  });

  return Math.min(100, risk);
}

function calculateChronicRisk(healthHistory) {
  return 40 + Math.random() * 30; // Simplified
}

function getRiskLevel(score) {
  if (score >= 70) return 'high';
  if (score >= 40) return 'moderate';
  return 'low';
}

function getRecommendedActions(fallRisk, cognitiveRisk, chronicRisk) {
  const actions = [];

  if (fallRisk >= 40) {
    actions.push('Implement fall prevention measures');
    actions.push('Physical therapy consultation');
  }
  if (cognitiveRisk >= 40) {
    actions.push('Cognitive stimulation activities');
    actions.push('Safety assessment for wandering');
  }
  if (chronicRisk >= 50) {
    actions.push('Chronic disease management review');
    actions.push('Specialist consultation');
  }

  return actions;
}

function getMedicationStatus(scheduledTime, now) {
  const diff = now - scheduledTime;
  const minutes = diff / (1000 * 60);

  if (minutes < 0) return 'upcoming';
  if (minutes <= 30) return 'due';
  if (minutes <= 60) return 'delayed';
  return 'missed';
}

function checkInteractions(med, allMeds) {
  return []; // Simplified
}

function analyzeAdherenceFactors(adherenceData) {
  return {
    commonMissedTimes: [],
    reasons: ['forgetfulness', 'refusal', 'side_effects'],
    improvementSuggestions: ['Use pill organizer', 'Set reminders', 'Family involvement']
  };
}

function getInteractionDatabase() {
  return {
    'anticoagulant-nsaid': {
      severity: 'high',
      description: 'Increased bleeding risk',
      recommendation: 'Avoid NSAIDs while on blood thinners'
    }
  };
}

function calculateEmergencySeverity(types, alert) {
  let severity = 5;

  if (types.includes('fall')) severity += 2;
  if (types.includes('cardiac')) severity += 3;
  if (types.includes('respiratory')) severity += 3;

  return Math.min(10, severity);
}

function getEmergencyProtocol(types) {
  return {
    steps: [
      'Check resident welfare immediately',
      'Assess vital signs',
      'Contact emergency services if needed',
      'Notify family and primary physician',
      'Document incident and response'
    ],
    equipment: types.includes('cardiac') ? ['defibrillator', 'oxygen'] : ['first_aid_kit'],
    estimatedResponseTime: types.length > 1 ? '5 minutes' : '15 minutes'
  };
}

function getEscalationLevel(types, alert) {
  if (types.includes('cardiac') || types.includes('respiratory')) return 3;
  if (types.includes('fall')) return 2;
  return 1;
}

function generateUpdateMessage(type, data) {
  const messages = {
    health_change: `Health update for ${data.residentName}: ${data.description}`,
    medication_change: `Medication change: ${data.medicationName} - ${data.change}`,
    activity_participation: `${data.residentName} participated in ${data.activityName}`,
    milestone: `${data.residentName} achieved: ${data.milestone}`
  };
  return messages[type] || 'General update';
}

function getUpdatePriority(type) {
  const priorities = {
    health_change: 'high',
    medication_change: 'medium',
    activity_participation: 'low',
    milestone: 'low'
  };
  return priorities[type] || 'normal';
}

function findCompatibleSlots(preferred, availability) {
  return preferred.filter(slot => availability.includes(slot));
}

function generateInterventions(goals) {
  return goals.map(goal => ({
    goalCategory: goal.category,
    interventions: [
      { type: 'activity', frequency: 'daily', description: `Daily ${goal.category} exercises` },
      { type: 'monitoring', frequency: 'weekly', description: `${goal.category} assessment` },
      { type: 'support', frequency: 'as_needed', description: `Assistive devices for ${goal.category}` }
    ]
  }));
}

function generateTimelines(goals) {
  return goals.map(goal => ({
    category: goal.category,
    startDate: new Date().toISOString(),
    reviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    targetCompletion: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
  }));
}

function calculateOverallProgress(goals) {
  if (goals.length === 0) return 0;

  const total = goals.reduce((sum, goal) => sum + (goal.progressPercent || 0), 0);
  return Math.round(total / goals.length);
}

function generateCareRecommendations(plan) {
  return plan.goals
    .filter(g => g.status === 'needs_attention')
    .map(g => `Increase focus on ${g.category} interventions`);
}

function getNextSteps(plan) {
  return [
    'Review progress with care team',
    'Update family on care plan',
    'Adjust interventions as needed',
    'Schedule next assessment'
  ];
}

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`🏥 ElderCare OS running on port ${PORT}`);
  console.log('Capabilities:');
  console.log('  - Health Monitoring Agent');
  console.log('  - Medication Reminder Agent');
  console.log('  - Emergency Response Agent');
  console.log('  - Family Coordinator Agent');
  console.log('  - Care Planner Agent');
});

module.exports = app;
