// Collections Agent - Port 4782
const express = require('express');
const app = express();
app.use(express.json());
const PORT = 4782;

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'collections-agent', port: PORT });
});

app.post('/api/collections/schedule', (req, res) => {
  const { customerId, amount } = req.body;
  res.json({
    reminderId: `rem_${Date.now()}`,
    customerId,
    amount,
    scheduledFor: 'Tomorrow 10 AM',
    channel: 'WhatsApp'
  });
});

app.post('/api/emi/reminder', (req, res) => {
  const { customerId, emiDue } = req.body;
  res.json({
    customerId,
    emiDue,
    message: 'EMI payment due. Please pay on time.',
    channels: ['WhatsApp', 'SMS', 'Call']
  });
});

app.listen(PORT, () => {
  console.log(`Collections Agent running on port ${PORT}`);
});
