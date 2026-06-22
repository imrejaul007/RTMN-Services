/**
 * Genie Dental Health Service
 *
 * Dental health context for Genie AI:
 * - Track last dental visit
 * - Calculate gum inflammation risk
 * - Generate personalized reminders
 * - Store dental memories
 *
 * Port: 4708
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 4708;

app.use(express.json());

// Services
const RISA_CARE = process.env.RISA_CARE_URL || 'http://localhost:4700';
const DENTAL_TWIN = process.env.DENTAL_TWIN_URL || 'http://localhost:4751';
const GENIE_BRIEFING = process.env.GENIE_BRIEFING || 'http://localhost:4706';

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'genie-dental-health', timestamp: new Date().toISOString() });
});

// In-memory storage
const dentalMemories = new Map();
const reminders = new Map();

/**
 * Store dental memory
 * POST /api/memory
 */
app.post('/api/memory', async (req, res) => {
  try {
    const { corpId, type, content, entities, timestamp } = req.body;

    const memory = {
      id: uuidv4(),
      corpId,
      type: type || 'episodic',
      category: 'dental',
      content,
      entities: entities || [],
      timestamp: timestamp || new Date(),
      createdAt: new Date()
    };

    dentalMemories.set(`${corpId}_${memory.id}`, memory);

    res.json({ success: true, memory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get dental memories for user
 * GET /api/memory/:corpId
 */
app.get('/api/memory/:corpId', (req, res) => {
  const { corpId } = req.params;
  const { limit = 10 } = req.query;

  const memories = Array.from(dentalMemories.values())
    .filter(m => m.corpId === corpId && m.category === 'dental')
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, parseInt(limit));

  res.json({ success: true, count: memories.length, memories });
});

/**
 * Get last dental visit
 * GET /api/memory/:corpId/last-visit
 */
app.get('/api/memory/:corpId/last-visit', async (req, res) => {
  const { corpId } = req.params;

  const memories = Array.from(dentalMemories.values())
    .filter(m => m.corpId === corpId && m.content.includes('visit'))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const lastVisit = memories[0] || null;

  res.json({
    success: true,
    lastVisit: lastVisit ? {
      date: lastVisit.timestamp,
      content: lastVisit.content
    } : null
  });
});

/**
 * Calculate dental risk
 * GET /api/risk/:corpId
 */
app.get('/api/risk/:corpId', async (req, res) => {
  const { corpId } = req.params;

  // Get memories
  const memories = Array.from(dentalMemories.values())
    .filter(m => m.corpId === corpId && m.category === 'dental');

  const lastVisit = memories
    .filter(m => m.content.includes('visit'))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

  // Calculate months since last visit
  let monthsSinceVisit = null;
  if (lastVisit) {
    const lastDate = new Date(lastVisit.timestamp);
    const now = new Date();
    monthsSinceVisit = (now - lastDate) / (1000 * 60 * 60 * 24 * 30);
  }

  // Calculate risk factors
  const riskFactors = {
    monthsSinceVisit,
    overdue: monthsSinceVisit !== null && monthsSinceVisit > 12,
    hasSensitivity: memories.some(m => m.content.includes('sensitivity')),
    hasGumIssues: memories.some(m => m.content.includes('gum')),
    hasCavityHistory: memories.some(m => m.content.includes('cavity'))
  };

  // Determine risk level
  let riskLevel = 'low';
  if (riskFactors.overdue && monthsSinceVisit > 18) riskLevel = 'high';
  else if (riskFactors.overdue || riskFactors.hasSensitivity) riskLevel = 'medium';
  if (riskFactors.hasGumIssues) riskLevel = 'high';

  const risk = {
    level: riskLevel,
    factors: riskFactors,
    message: generateRiskMessage(riskLevel, monthsSinceVisit),
    recommendations: generateRecommendations(riskLevel, riskFactors)
  };

  res.json({ success: true, risk });
});

/**
 * Generate dental reminder
 * POST /api/reminder
 */
app.post('/api/reminder', async (req, res) => {
  try {
    const { corpId, patientName, lastVisitMonths, riskLevel, clinicId, appointmentSlot } = req.body;

    const reminder = {
      id: uuidv4(),
      corpId,
      type: 'dental_checkup',
      title: 'Dental Checkup Due',
      priority: riskLevel === 'high' ? 'urgent' : 'normal',
      message: generateReminderMessage(patientName, lastVisitMonths),
      action: {
        type: 'book_appointment',
        service: 'dental',
        clinicId: clinicId || null,
        suggestedSlot: appointmentSlot || null
      },
      createdAt: new Date()
    };

    reminders.set(reminder.id, reminder);

    // Forward to Genie Briefing
    try {
      await axios.post(`${GENIE_BRIEFING}/api/reminders`, {
        corpId,
        type: 'health_reminder',
        category: 'dental',
        ...reminder
      });
    } catch (e) {
      console.log('Genie Briefing not available, reminder stored locally');
    }

    res.json({ success: true, reminder });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get reminders for user
 * GET /api/reminder/:corpId
 */
app.get('/api/reminder/:corpId', (req, res) => {
  const { corpId } = req.params;
  const { status } = req.query;

  let userReminders = Array.from(reminders.values())
    .filter(r => r.corpId === corpId);

  if (status) {
    userReminders = userReminders.filter(r => r.status === status);
  }

  res.json({ success: true, count: userReminders.length, reminders: userReminders });
});

/**
 * Mark reminder as actioned
 * PUT /api/reminder/:reminderId/actioned
 */
app.put('/api/reminder/:reminderId/actioned', (req, res) => {
  const { reminderId } = req.params;
  const reminder = reminders.get(reminderId);

  if (!reminder) {
    return res.status(404).json({ error: 'Reminder not found' });
  }

  reminder.status = 'actioned';
  reminder.actionedAt = new Date();

  res.json({ success: true, reminder });
});

/**
 * Get dental context for consultation
 * GET /api/context/:corpId
 */
app.get('/api/context/:corpId', async (req, res) => {
  const { corpId } = req.params;

  const memories = Array.from(dentalMemories.values())
    .filter(m => m.corpId === corpId && m.category === 'dental')
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const lastVisit = memories.find(m => m.content.includes('visit'));
  const treatments = memories.filter(m => m.content.includes('treatment'));
  const conditions = memories.filter(m =>
    m.content.includes('cavity') ||
    m.content.includes('gum') ||
    m.content.includes('sensitivity')
  );

  const context = {
    lastVisit: lastVisit ? {
      date: lastVisit.timestamp,
      description: lastVisit.content
    } : null,
    treatmentHistory: treatments.map(t => t.content),
    activeConditions: conditions.map(c => c.content),
    totalVisits: memories.filter(m => m.content.includes('visit')).length,
    riskLevel: 'medium' // Simplified
  };

  res.json({ success: true, context });
});

// Helper functions
function generateRiskMessage(riskLevel, monthsSinceVisit) {
  if (riskLevel === 'high') {
    if (monthsSinceVisit && monthsSinceVisit > 24) {
      return `It's been ${Math.round(monthsSinceVisit)} months since your last dental visit. Gum inflammation risk is increasing.`;
    }
    return 'Based on your history, gum inflammation risk is elevated. A dental checkup is recommended.';
  }
  if (riskLevel === 'medium') {
    return `You skipped your last dental checkup. Regular visits help prevent issues.`;
  }
  return 'Your dental health looks good. Keep up with regular checkups.';
}

function generateRecommendations(riskLevel, riskFactors) {
  const recommendations = [];

  if (riskFactors.overdue) {
    recommendations.push('Schedule a dental checkup within the next 2 weeks');
  }
  if (riskFactors.hasGumIssues) {
    recommendations.push('Request a gum health assessment');
    recommendations.push('Consider deep cleaning (scaling)');
  }
  if (riskFactors.hasSensitivity) {
    recommendations.push('Mention tooth sensitivity during your visit');
  }
  if (riskFactors.hasCavityHistory) {
    recommendations.push('Request cavity risk assessment');
  }

  recommendations.push('Brush twice daily with fluoride toothpaste');
  recommendations.push('Floss daily');

  return recommendations;
}

function generateReminderMessage(patientName, lastVisitMonths) {
  if (lastVisitMonths && lastVisitMonths > 24) {
    return `${patientName || 'You'} skipped your last dental checkup. It's been ${Math.round(lastVisitMonths)} months. Gum inflammation risk is increasing.`;
  }
  if (lastVisitMonths) {
    return `${patientName || 'You'} skipped your last dental checkup. It's been ${Math.round(lastVisitMonths)} months.`;
  }
  return `${patientName || 'You'} may have missed your regular dental checkup.`;
}

// Simple axios for internal calls
const axios = require('axios');

app.listen(PORT, () => {
  console.log(`Genie Dental Health Service running on port ${PORT}`);
  console.log(`Dental reminders and health context for Genie AI`);
});

module.exports = app;
