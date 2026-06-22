/**
 * Interview Agent - Expert Employee
 * Port: 4778
 */

const express = require('express');
const app = express();
app.use(express.json({ limit: "10kb" }));
const PORT = 4778;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'interview-agent', port: PORT });
});

app.post('/api/interviews/questions', (req, res) => {
  const { role, level } = req.body;
  res.json({
    role,
    level,
    questions: [
      { q: 'Tell me about yourself', type: 'behavioral' },
      { q: 'Why this role?', type: 'motivation' },
      { q: 'Scenario: conflict with manager', type: 'situational' },
      { q: 'Technical challenge', type: 'technical' }
    ],
    duration: '45 minutes'
  });
});

app.post('/api/interviews/schedule', (req, res) => {
  const { candidateId, interviewer, time } = req.body;
  res.json({
    interviewId: `int_${Date.now()}`,
    candidateId,
    interviewer,
    scheduledFor: time || 'Tomorrow 10 AM',
    meetingLink: 'https://meet.example.com/int123'
  });
});

app.post('/api/interviews/feedback', (req, res) => {
  const { interviewId, ratings } = req.body;
  res.json({
    interviewId,
    overallScore: ratings.technical + ratings.culture + ratings.communication / 3,
    recommendation: 'proceed',
    strengths: ['Strong technical skills', 'Good communication'],
    concerns: ['Limited experience with X']
  });
});

app.listen(PORT, () => {
  console.log(`Interview Agent running on port ${PORT}`);
});
