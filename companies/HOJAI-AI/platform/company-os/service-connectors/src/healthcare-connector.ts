/**
 * Healthcare Service Connector
 *
 * Connects to healthcare services for medical practices.
 */

import { BaseConnector, ServiceResponse } from './base-connector';
import { TenantContext } from './shared/types';

// ============================================
// Service URLs
// ============================================

const HEALTHCARE_SERVICES = {
  emr: process.env.HEALTHCARE_EMR_URL || 'http://localhost:3060',
  appointment: process.env.HEALTHCARE_APPOINTMENT_URL || 'http://localhost:3061',
  pharmacy: process.env.HEALTHCARE_PHARMACY_URL || 'http://localhost:3062',
  lab: process.env.HEALTHCARE_LAB_URL || 'http://localhost:3063',
  billing: process.env.HEALTHCARE_BILLING_URL || 'http://localhost:3064',
};

// ============================================
// Types
// ============================================

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  bloodGroup?: string;
  allergies?: string[];
  medicalHistory?: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  qualifications: string[];
  experience: number;
  availableDays: string[];
  consultationFee: number;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  duration: number;
  type: 'consultation' | 'followup' | 'procedure';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  symptoms?: string;
  notes?: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  medicines: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }[];
  advice?: string;
  createdAt: string;
}

export interface LabTest {
  id: string;
  patientId: string;
  doctorId?: string;
  testName: string;
  status: 'ordered' | 'sample_collected' | 'processing' | 'completed' | 'cancelled';
  results?: Record<string, any>;
  reportUrl?: string;
  orderedAt: string;
  completedAt?: string;
}

export interface Invoice {
  id: string;
  patientId: string;
  appointmentId?: string;
  items: {
    description: string;
    amount: number;
    type: 'consultation' | 'procedure' | 'medicine' | 'lab' | 'other';
  }[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'paid' | 'refunded';
  paidAt?: string;
}

// ============================================
// Healthcare Connector
// ============================================

export class HealthcareConnector {
  private emrService: BaseConnector;
  private appointmentService: BaseConnector;
  private pharmacyService: BaseConnector;
  private labService: BaseConnector;
  private billingService: BaseConnector;
  private tenant?: TenantContext;

  constructor(tenant?: TenantContext) {
    this.emrService = new BaseConnector({ baseUrl: HEALTHCARE_SERVICES.emr });
    this.appointmentService = new BaseConnector({ baseUrl: HEALTHCARE_SERVICES.appointment });
    this.pharmacyService = new BaseConnector({ baseUrl: HEALTHCARE_SERVICES.pharmacy });
    this.labService = new BaseConnector({ baseUrl: HEALTHCARE_SERVICES.lab });
    this.billingService = new BaseConnector({ baseUrl: HEALTHCARE_SERVICES.billing });

    if (tenant) this.setTenant(tenant);
  }

  setTenant(tenant: TenantContext): void {
    this.tenant = tenant;
    this.emrService.setTenant(tenant);
    this.appointmentService.setTenant(tenant);
    this.pharmacyService.setTenant(tenant);
    this.labService.setTenant(tenant);
    this.billingService.setTenant(tenant);
  }

  // ========================================
  // PATIENT OPERATIONS
  // ========================================

  async createPatient(patient: Omit<Patient, 'id'>): Promise<ServiceResponse<Patient>> {
    return this.emrService.post<Patient>('/api/patients', patient);
  }

  async getPatient(id: string): Promise<ServiceResponse<Patient>> {
    return this.emrService.get<Patient>(`/api/patients/${id}`);
  }

  async listPatients(): Promise<ServiceResponse<Patient[]>> {
    return this.emrService.get<Patient[]>('/api/patients');
  }

  async updatePatient(id: string, updates: Partial<Patient>): Promise<ServiceResponse<Patient>> {
    return this.emrService.put<Patient>(`/api/patients/${id}`, updates);
  }

  // ========================================
  // DOCTOR OPERATIONS
  // ========================================

  async createDoctor(doctor: Omit<Doctor, 'id'>): Promise<ServiceResponse<Doctor>> {
    return this.emrService.post<Doctor>('/api/doctors', doctor);
  }

  async getDoctor(id: string): Promise<ServiceResponse<Doctor>> {
    return this.emrService.get<Doctor>(`/api/doctors/${id}`);
  }

  async listDoctors(filters?: { specialization?: string }): Promise<ServiceResponse<Doctor[]>> {
    const query = filters?.specialization ? `?specialization=${filters.specialization}` : '';
    return this.emrService.get<Doctor[]>(`/api/doctors${query}`);
  }

  async getDoctorAvailability(doctorId: string, date: string): Promise<ServiceResponse<string[]>> {
    return this.appointmentService.get<string[]>(`/api/doctors/${doctorId}/availability?date=${date}`);
  }

  // ========================================
  // APPOINTMENT OPERATIONS
  // ========================================

  async createAppointment(appointment: {
    patientId: string;
    doctorId: string;
    date: string;
    time: string;
    type: Appointment['type'];
    symptoms?: string;
  }): Promise<ServiceResponse<Appointment>> {
    return this.appointmentService.post<Appointment>('/api/appointments', appointment);
  }

  async getAppointment(id: string): Promise<ServiceResponse<Appointment>> {
    return this.appointmentService.get<Appointment>(`/api/appointments/${id}`);
  }

  async listAppointments(filters?: { date?: string; doctorId?: string; status?: string }): Promise<ServiceResponse<Appointment[]>> {
    const query = new URLSearchParams(filters as any).toString();
    return this.appointmentService.get<Appointment[]>(`/api/appointments${query ? `?${query}` : ''}`);
  }

  async updateAppointmentStatus(id: string, status: Appointment['status']): Promise<ServiceResponse<Appointment>> {
    return this.appointmentService.patch<Appointment>(`/api/appointments/${id}/status`, { status });
  }

  // ========================================
  // PRESCRIPTION OPERATIONS
  // ========================================

  async createPrescription(prescription: {
    patientId: string;
    doctorId: string;
    appointmentId?: string;
    medicines: Prescription['medicines'];
    advice?: string;
  }): Promise<ServiceResponse<Prescription>> {
    return this.pharmacyService.post<Prescription>('/api/prescriptions', prescription);
  }

  async getPrescription(id: string): Promise<ServiceResponse<Prescription>> {
    return this.pharmacyService.get<Prescription>(`/api/prescriptions/${id}`);
  }

  async getPatientPrescriptions(patientId: string): Promise<ServiceResponse<Prescription[]>> {
    return this.pharmacyService.get<Prescription[]>(`/api/patients/${patientId}/prescriptions`);
  }

  // ========================================
  // LAB OPERATIONS
  // ========================================

  async orderLabTest(test: {
    patientId: string;
    doctorId?: string;
    testName: string;
  }): Promise<ServiceResponse<LabTest>> {
    return this.labService.post<LabTest>('/api/tests', test);
  }

  async getLabTest(id: string): Promise<ServiceResponse<LabTest>> {
    return this.labService.get<LabTest>(`/api/tests/${id}`);
  }

  async listLabTests(patientId?: string): Promise<ServiceResponse<LabTest[]>> {
    const query = patientId ? `?patientId=${patientId}` : '';
    return this.labService.get<LabTest[]>(`/api/tests${query}`);
  }

  async updateLabTestStatus(id: string, status: LabTest['status']): Promise<ServiceResponse<LabTest>> {
    return this.labService.patch<LabTest>(`/api/tests/${id}/status`, { status });
  }

  // ========================================
  // BILLING OPERATIONS
  // ========================================

  async createInvoice(invoice: {
    patientId: string;
    appointmentId?: string;
    items: Invoice['items'];
  }): Promise<ServiceResponse<Invoice>> {
    return this.billingService.post<Invoice>('/api/invoices', invoice);
  }

  async getInvoice(id: string): Promise<ServiceResponse<Invoice>> {
    return this.billingService.get<Invoice>(`/api/invoices/${id}`);
  }

  async listInvoices(patientId?: string): Promise<ServiceResponse<Invoice[]>> {
    const query = patientId ? `?patientId=${patientId}` : '';
    return this.billingService.get<Invoice[]>(`/api/invoices${query}`);
  }

  async processPayment(invoiceId: string, method: 'cash' | 'card' | 'upi' | 'insurance'): Promise<ServiceResponse<Invoice>> {
    return this.billingService.post<Invoice>(`/api/invoices/${invoiceId}/pay`, { method });
  }

  // ========================================
  // HEALTH CHECK
  // ========================================

  async healthCheck(): Promise<Record<string, string>> {
    const checks = await Promise.all([
      this.emrService.healthCheck(),
      this.appointmentService.healthCheck(),
      this.pharmacyService.healthCheck(),
      this.labService.healthCheck(),
      this.billingService.healthCheck(),
    ]);

    return {
      emr: checks[0].status,
      appointments: checks[1].status,
      pharmacy: checks[2].status,
      lab: checks[3].status,
      billing: checks[4].status,
    };
  }
}

export function createHealthcareConnector(tenant?: TenantContext): HealthcareConnector {
  return new HealthcareConnector(tenant);
}
