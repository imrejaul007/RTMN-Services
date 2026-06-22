/**
 * Meeting Assistant - Expert Employee
 * Port: 4770
 */

const express = require('express');
const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = 4770;

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'meeting-assistant', port: PORT });
});

// Schedule Meeting
app.post('/api/meetings/schedule', (req, res) => {
  const { attendees, duration, topic } = req.body;
  res.json({
    meetingId: `mtg_${Date.now()}`,
    topic,
    duration: duration || '30 min',
    attendees,
    suggestedSlots: ['10:00 AM', '2:00 PM', '4:30 PM'],
    joinUrl: 'https://meet.example.com/mtg123'
  });
});

// Meeting Notes
app.post('/api/meetings/notes', (req, res) => {
  const { meetingId, transcript } = req.body;
  res.json({
    meetingId,
    summary: 'Discussed Q2 priorities and roadmap adjustments.',
    actionItems: [
      { task: 'Finalize budget', owner: 'John', due: 'Friday' },
      { task: 'Schedule follow-up', owner: 'Sarah', due: 'Next week' }
    ],
    decisions: [
      'Approved Q2 budget',
      'Postpone feature X to Q3'
    ],
    nextMeeting: '2026-06-05'
  });
});

// Meeting Summary
app.get('/api/meetings/:id/summary', (req, res) => {
  res.json({
    meetingId: req.params.id,
    duration: '45 minutes',
    attendees: 5,
    summary: 'Covered quarterly targets and team updates.',
    sentiment: 'positive',
    actionItems: 3,
    decisions: 2
  });
});

app.listen(PORT, () => {
  console.log(`Meeting Assistant running on port ${PORT}`);
});
