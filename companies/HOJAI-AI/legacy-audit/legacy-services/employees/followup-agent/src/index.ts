/**
 * Follow-up Agent - Expert Employee
 * Port: 4773
 */

const express = require('express');
const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = 4773;

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'followup-agent', port: PORT });
});

// Schedule Follow-up
app.post('/api/followups/schedule', (req, res) => {
  const { leadId, type, delay } = req.body;
  const templates = {
    email: 'Just following up on our conversation.',
    call: 'Quick call to discuss further.',
    whatsapp: 'Hi! Wanted to check in. 😊'
  };
  res.json({
    followupId: `fu_${Date.now()}`,
    leadId,
    type,
    scheduledFor: delay || '24 hours',
    message: templates[type] || templates.email,
    status: 'scheduled'
  });
});

// Send Now
app.post('/api/followups/send', (req, res) => {
  const { leadId, channel, message } = req.body;
  res.json({
    followupId: `fu_${Date.now()}`,
    leadId,
    channel,
    message,
    sentAt: new Date().toISOString(),
    status: 'sent'
  });
});

// Track Responses
app.get('/api/followups/:id/response', (req, res) => {
  res.json({
    followupId: req.params.id,
    responded: true,
    response: 'Interested, schedule demo',
    sentiment: 'positive',
    nextAction: 'Schedule demo call'
  });
});

app.listen(PORT, () => {
  console.log(`Follow-up Agent running on port ${PORT}`);
});
