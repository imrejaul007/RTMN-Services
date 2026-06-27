/**
 * Healthcare Vertical Template
 * Industry: Clinics, Hospitals, Pharmacies, Telemedicine
 */
module.exports = {
  name: 'healthcare',
  displayName: 'Healthcare',
  icon: '🏥',
  description: 'For clinics, hospitals, pharmacies, and telemedicine platforms',
  intents: [
    { id: 'appointment_book', patterns: ['book appointment', 'schedule', 'doctor visit', 'appointment'], action: 'bookAppointment' },
    { id: 'doctor_search', patterns: ['find doctor', 'specialist', 'doctor', 'consult'], action: 'searchDoctors' },
    { id: 'symptom_check', patterns: ['symptoms', 'feeling sick', 'not well', 'health concern'], action: 'symptomCheck' },
    { id: 'prescription_refill', patterns: ['prescription', 'medicine', 'refill', 'repeat'], action: 'refillPrescription' },
    { id: 'lab_results', patterns: ['lab results', 'test results', 'reports', 'blood test'], action: 'getLabResults' },
    { id: 'medical_records', patterns: ['records', 'history', 'medical history', 'documents'], action: 'getRecords' },
    { id: 'emergency', patterns: ['emergency', 'urgent', 'ambulance', 'critical'], action: 'handleEmergency' },
    { id: 'insurance', patterns: ['insurance', 'coverage', 'claim', ' TPA'], action: 'checkInsurance' },
    { id: 'follow_up', patterns: ['follow up', 'next visit', 'reminder', 'checkup'], action: 'scheduleFollowUp' },
    { id: 'health_tips', patterns: ['health tips', 'advice', 'prevention', 'wellness'], action: 'provideHealthTips' }
  ],
  richContentTypes: [
    { type: 'doctor_card', description: 'Doctor profile with photo, specialization, rating' },
    { type: 'appointment_slot', description: 'Time slot picker for booking' },
    { type: 'prescription_request', description: 'Medicine refill request form' },
    { type: 'health_tip', description: 'Health advice card' },
    { type: 'lab_report', description: 'Lab result summary' },
    { type: 'insurance_verification', description: 'Insurance coverage details' }
  ],
  industryMetrics: [
    'appointment_show_rate', 'avg_wait_time', 'patient_satisfaction',
    'doctor_utilization', 'revenue_per_patient', 'follow_up_rate',
    'prescription_refill_rate', 'patient_retention'
  ],
  connectedServices: [
    { name: 'Healthcare OS', port: 5020, purpose: 'Appointments, records, prescriptions' },
    { name: 'Customer Twin', port: 4895, purpose: 'Patient profiles' },
    { name: 'REZ Wallet', port: 4004, purpose: 'Payments' }
  ],
  agentPrompt: `You are an expert healthcare assistant. Help patients book appointments, find doctors, refill prescriptions, and access health information. Be caring, professional, and always recommend seeing a doctor for medical concerns.`,
  actionMappings: {
    bookAppointment: { service: 'Healthcare OS', endpoint: '/api/appointments' },
    searchDoctors: { service: 'Healthcare OS', endpoint: '/api/doctors/search' },
    refillPrescription: { service: 'Healthcare OS', endpoint: '/api/prescriptions/refill' }
  }
};