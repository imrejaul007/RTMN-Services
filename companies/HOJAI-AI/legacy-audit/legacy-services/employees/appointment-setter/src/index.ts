/**
 * Appointment Setter - Expert Employee
 * Port: 4771
 */

const express = require('express');
const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = 4771;

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'appointment-setter', port: PORT });
});

// Find Slots
app.post('/api/appointments/slots', (req, res) => {
  const { service, date, duration } = req.body;
  res.json({
    service,
    date,
    availableSlots: [
      { time: '10:00 AM', provider: 'Dr. Smith' },
      { time: '11:30 AM', provider: 'Dr. Jones' },
      { time: '2:00 PM', provider: 'Dr. Smith' },
      { time: '4:30 PM', provider: 'Dr. Patel' }
    ]
  });
});

// Book Appointment
app.post('/api/appointments/book', (req, res) => {
  const { customerId, service, slot, date } = req.body;
  res.json({
    appointmentId: `apt_${Date.now()}`,
    customerId,
    service,
    date,
    slot,
    status: 'confirmed',
    reminder: 'Sent 24h before'
  });
});

// Reschedule
app.post('/api/appointments/reschedule', (req, res) => {
  const { appointmentId, newSlot } = req.body;
  res.json({
    appointmentId,
    oldSlot: '10:00 AM',
    newSlot,
    status: 'rescheduled',
    confirmationSent: true
  });
});

app.listen(PORT, () => {
  console.log(`Appointment Setter running on port ${PORT}`);
});
