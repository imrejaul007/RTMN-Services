// AI Care Manager - Port 4784
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4784;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'care-manager', port: PORT });
});

app.post('/api/care/patient', (req, res) => {
  const { patientId } = req.body;
  res.json({
    patientId,
    carePlan: 'Monthly checkup, daily vitals',
    adherenceScore: 0.85,
    riskLevel: 'low',
    nextAppointment: '2026-06-15'
  });
});

app.post('/api/care/adherence', (req, res) => {
  const { patientId } = req.body;
  res.json({
    patientId,
    medicationAdherence: '82%',
    missedDoses: 2,
    interventions: ['Reminder call', 'Caregiver notification']
  });
});

app.listen(PORT, () => {
  console.log(`AI Care Manager running on port ${PORT}`);
});
