/**
 * HOJAI Healthcare AI - REZ-Merchant Connector
 */

export interface HealthcareConnectorConfig {
  useREZServices: boolean;
  rezApiKey?: string;
  rezBaseUrl?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  type: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  dob: string;
  bloodGroup?: string;
}

export class HealthcareConnector {
  private config: HealthcareConnectorConfig;

  constructor(config: HealthcareConnectorConfig) {
    this.config = config;
  }

  /**
   * Get doctors
   */
  async getDoctors(clinicId: string): Promise<any[]> {
    if (this.config.useREZServices) {
      const response = await fetch(`${this.config.rezBaseUrl}/healthcare/${clinicId}/doctors`, {
        headers: { 'Authorization': `Bearer ${this.config.rezApiKey}` },
      });
      return response.json();
    }
    return this.getLocalDoctors(clinicId);
  }

  /**
   * Book appointment
   */
  async bookAppointment(clinicId: string, data: {
    patientId?: string;
    patientName: string;
    patientPhone: string;
    doctorId: string;
    date: string;
    time: string;
    type: string;
  }): Promise<Appointment> {
    if (this.config.useREZServices) {
      const response = await fetch(`${this.config.rezBaseUrl}/healthcare/${clinicId}/appointments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.rezApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.json();
    }
    return this.createLocalAppointment(clinicId, data);
  }

  /**
   * Get patient records
   */
  async getPatientRecords(patientId: string): Promise<any> {
    if (this.config.useREZServices) {
      const response = await fetch(`${this.config.rezBaseUrl}/healthcare/patients/${patientId}/records`, {
        headers: { 'Authorization': `Bearer ${this.config.rezApiKey}` },
      });
      return response.json();
    }
    return { records: [] };
  }

  /**
   * Send prescription
   */
  async sendPrescription(appointmentId: string, prescription: any): Promise<{ success: boolean }> {
    if (this.config.useREZServices) {
      const response = await fetch(`${this.config.rezBaseUrl}/healthcare/appointments/${appointmentId}/prescription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.rezApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prescription),
      });
      return response.json();
    }
    return { success: true };
  }

  // Local mock data
  private mockDoctors: { id: string; name: string; specialization: string; experience: number; availability: string[] }[] = [
    { id: 'doc-001', name: 'Dr. Ramesh Agarwal', specialization: 'General Physician', experience: 15, availability: ['Mon', 'Wed', 'Fri'] },
    { id: 'doc-002', name: 'Dr. Priya Menon', specialization: 'Dermatologist', experience: 10, availability: ['Tue', 'Thu', 'Sat'] },
    { id: 'doc-003', name: 'Dr. Sanjay Gupta', specialization: 'Orthopedic', experience: 20, availability: ['Mon', 'Tue', 'Thu'] },
    { id: 'doc-004', name: 'Dr. Anita Sharma', specialization: 'Pediatrician', experience: 12, availability: ['Wed', 'Fri', 'Sat'] },
  ];

  private mockAppointments: Appointment[] = [
    { id: 'appt-001', patientId: 'pat-001', doctorId: 'doc-001', date: '2026-06-02', time: '10:00', type: 'Consultation', status: 'scheduled' },
    { id: 'appt-002', patientId: 'pat-002', doctorId: 'doc-002', date: '2026-06-02', time: '11:30', type: 'Follow-up', status: 'in-progress' },
  ];

  // Local methods
  private async getLocalDoctors(clinicId: string): Promise<{ id: string; name: string; specialization: string; experience: number; availability: string[] }[]> {
    return this.mockDoctors;
  }

  private async createLocalAppointment(clinicId: string, data: {
    patientId?: string;
    patientName: string;
    patientPhone: string;
    doctorId: string;
    date: string;
    time: string;
    type: string;
  }): Promise<Appointment> {
    const appointment: Appointment = {
      id: `local-appt-${Date.now()}`,
      patientId: data.patientId || `temp-${Date.now()}`,
      doctorId: data.doctorId,
      date: data.date,
      time: data.time,
      type: data.type,
      status: 'scheduled',
    };
    this.mockAppointments.push(appointment);
    return appointment;
  }
}
