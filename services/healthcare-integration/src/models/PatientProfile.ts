export interface PatientProfile {
  id: string;
  corpid?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  dateOfBirth: string;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  address?: Address;
  emergencyContact?: EmergencyContact;
  insuranceInfo?: InsuranceInfo;
  medicalHistory?: MedicalHistory;
  preferences?: PatientPreferences;
  customerTwinId?: string;
  journeyStage?: string;
  lifetimeValue?: number;
  riskScore?: number;
  lastVisit?: string;
  nextAppointment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  groupNumber?: string;
  memberId: string;
  expirationDate?: string;
}

export interface MedicalHistory {
  conditions: string[];
  allergies: string[];
  medications: Medication[];
  surgeries: Surgery[];
  familyHistory: string[];
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  prescribedBy?: string;
  startDate: string;
  endDate?: string;
}

export interface Surgery {
  procedure: string;
  date: string;
  hospital?: string;
  notes?: string;
}

export interface PatientPreferences {
  preferredLanguage: string;
  communicationMethod: 'email' | 'sms' | 'call' | 'app';
  reminderPreferences: {
    appointments: boolean;
    medications: boolean;
    followUps: boolean;
  };
  privacyConsent: boolean;
  marketingConsent: boolean;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName?: string;
  providerId: string;
  providerName?: string;
  appointmentType: AppointmentType;
  status: AppointmentStatus;
  scheduledAt: string;
  duration: number;
  location?: string;
  notes?: string;
  telehealhLink?: string;
  journeyTwinId?: string;
  reminderSent?: boolean;
  checkedIn?: boolean;
  checkedInAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentType =
  | 'consultation'
  | 'follow-up'
  | 'routine-checkup'
  | 'emergency'
  | 'telehealth'
  | 'specialist'
  | 'lab-work'
  | 'vaccination'
  | 'therapy'
  | 'mental-health';

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'checked-in'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'no-show'
  | 'rescheduled';

export interface MedicalRecord {
  id: string;
  patientId: string;
  recordType: RecordType;
  title: string;
  description: string;
  diagnosis?: string[];
  treatment?: string;
  providerId: string;
  providerName?: string;
  facility?: string;
  attachments?: Attachment[];
  industryTwinId?: string;
  createdAt: string;
  updatedAt: string;
}

export type RecordType =
  | 'consultation'
  | 'lab-result'
  | 'imaging'
  | 'prescription'
  | 'diagnosis'
  | 'treatment-plan'
  | 'surgery-report'
  | 'discharge-summary'
  | 'referral'
  | 'immunization';

export interface Attachment {
  type: string;
  url: string;
  filename: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  refills: number;
  refillsRemaining: number;
  prescribedBy: string;
  prescribedAt: string;
  pharmacy?: Pharmacy;
  status: 'active' | 'completed' | 'cancelled' | 'expired';
  subscriptionTwinId?: string;
}

export interface Pharmacy {
  name: string;
  address: string;
  phone: string;
  fax?: string;
}

export interface TelehealthSession {
  id: string;
  patientId: string;
  providerId: string;
  appointmentId?: string;
  sessionType: 'video' | 'audio' | 'chat';
  status: 'scheduled' | 'waiting' | 'in-progress' | 'completed' | 'cancelled';
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  voiceAIConversationId?: string;
  notes?: string;
  recordingUrl?: string;
  prescriptionIds?: string[];
  followUpScheduled?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Response types for API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
}
