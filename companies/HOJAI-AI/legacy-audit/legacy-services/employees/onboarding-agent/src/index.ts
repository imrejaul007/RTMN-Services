/**
 * Onboarding Agent - Expert Employee
 * Port: 4779
 */

const express = require('express');
const app = express();
app.use(express.json({ limit: "10kb" }));
const PORT = 4779;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'onboarding-agent', port: PORT });
});

app.post('/api/onboarding/start', (req, res) => {
  const { employeeId, role } = req.body;
  res.json({
    onboardingId: `onb_${Date.now()}`,
    employeeId,
    role,
    day1Tasks: [
      'Setup laptop and accounts',
      'Meet team lead',
      'Review handbook',
      'Complete HR forms'
    ],
    week1Tasks: [
      'Complete training modules',
      'Shadow team member',
      'First project assignment'
    ],
    checklist: [
      { task: 'Laptop setup', status: 'pending' },
      { task: 'Email setup', status: 'pending' },
      { task: 'Slack join', status: 'pending' }
    ]
  });
});

app.post('/api/onboarding/progress', (req, res) => {
  const { onboardingId, task } = req.body;
  res.json({ onboardingId, task, status: 'completed', completedAt: new Date() });
});

app.listen(PORT, () => {
  console.log(`Onboarding Agent running on port ${PORT}`);
});
