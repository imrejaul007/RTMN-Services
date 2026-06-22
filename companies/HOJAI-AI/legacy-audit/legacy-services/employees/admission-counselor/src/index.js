// Admission Counselor AI - Port 4799
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4799;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'admission-counselor', port: PORT });
});

app.post('/api/admission/eligibility', (req, res) => {
  const { studentId, program } = req.body;
  res.json({ studentId, program, eligible: true, scholarships: ['Merit 50%'] });
});

app.listen(PORT, () => {
  console.log(`Admission Counselor running on port ${PORT}`);
});
