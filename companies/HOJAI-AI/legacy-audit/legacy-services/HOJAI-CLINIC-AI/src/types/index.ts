import { Document, Types } from 'mongoose';

// ==================== PATIENT ====================
export interface IPatient {
  _id: Types.ObjectId;
  clinicId: Types.ObjectId;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    landmark?: string;
  };
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  allergies: string[];
  medicalHistory: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  abhaId?: string;
  abhaNumber?: string;
  documents: {
    type: string;
    url: string;
    uploadedAt: Date;
  }[];
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPatientCreate {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  dateOfBirth: string;
  gender: IPatient['gender'];
  address?: IPatient['address'];
  bloodType?: IPatient['bloodType'];
  allergies?: string[];
  medicalHistory?: string[];
  emergencyContact?: IPatient['emergencyContact'];
  abhaId?: string;
  abhaNumber?: string;
  tags?: string[];
}

export interface IPatientUpdate {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  dateOfBirth?: string;
  gender?: IPatient['gender'];
  address?: IPatient['address'];
  bloodType?: IPatient['bloodType'];
  allergies?: string[];
  medicalHistory?: string[];
  emergencyContact?: IPatient['emergencyContact'];
  abhaId?: string;
  abhaNumber?: string;
  tags?: string[];
  isActive?: boolean;
}

// ==================== APPOINTMENT ====================
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type AppointmentType = 'consultation' | 'follow_up' | 'procedure' | 'teleconsult' | 'emergency';

export interface IAppointment {
  _id: Types.ObjectId;
  clinicId: Types.ObjectId;
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  date: Date;
  startTime: string;
  endTime: string;
  type: AppointmentType;
  status: AppointmentStatus;
  reason: string;
  notes?: string;
  vitals?: {
    temperature?: number;
    bloodPressure?: { systolic: number; diastolic: number };
    pulse?: number;
    weight?: number;
    height?: number;
    spo2?: number;
  };
  chiefComplaint?: string;
  followUpDate?: Date;
  teleconsultLink?: string;
  reminders: {
    sentAt?: Date;
    type: 'sms' | 'whatsapp' | 'email' | 'call';
    status: 'pending' | 'sent' | 'failed';
  }[];
  cancellation?: {
    reason: string;
    cancelledBy: 'patient' | 'clinic' | 'doctor';
    cancelledAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IAppointmentCreate {
  patientId: string;
  doctorId: string;
  date: string;
  startTime: string;
  type: AppointmentType;
  reason: string;
  notes?: string;
}

export interface IAppointmentUpdate {
  date?: string;
  startTime?: string;
  endTime?: string;
  type?: AppointmentType;
  status?: AppointmentStatus;
  reason?: string;
  notes?: string;
  vitals?: IAppointment['vitals'];
  chiefComplaint?: string;
  followUpDate?: string;
  teleconsultLink?: string;
}

// ==================== PRESCRIPTION ====================
export interface IPrescriptionItem {
  medicine: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity?: number;
  takeWithFood?: boolean;
  sideEffects?: string[];
}

export interface IPrescription {
  _id: Types.ObjectId;
  clinicId: Types.ObjectId;
  appointmentId: Types.ObjectId;
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  medications: IPrescriptionItem[];
  diagnosis?: string;
  chiefComplaint?: string;
  advice?: string[];
  tests?: string[];
  followUpDate?: Date;
  nextVisitNotes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPrescriptionCreate {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  medications: IPrescriptionItem[];
  diagnosis?: string;
  chiefComplaint?: string;
  advice?: string[];
  tests?: string[];
  followUpDate?: string;
  nextVisitNotes?: string;
}

export interface IPrescriptionUpdate {
  medications?: IPrescriptionItem[];
  diagnosis?: string;
  chiefComplaint?: string;
  advice?: string[];
  tests?: string[];
  followUpDate?: string;
  nextVisitNotes?: string;
  isActive?: boolean;
}

// ==================== CLINIC ====================
export type IndustryVertical = 'single_doctor' | 'multi_specialty' | 'dental' | 'veterinary' | 'diagnostic' | 'ayurvedic' | 'homeopathic';

export interface IClinic {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  ownerId: Types.ObjectId;
  phone: string;
  email: string;
  logo?: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    landmark?: string;
    coordinates?: { lat: number; lng: number };
  };
  industryVertical: IndustryVertical;
  specialty: string[];
  workingHours: {
    day: number;
    start: string;
    end: string;
    isOpen: boolean;
  }[];
  slotDurationMinutes: number;
  maxDailyAppointments: number;
  appointmentBufferMinutes: number;
  settings: {
    allowTeleconsult: boolean;
    allowOnlinePayment: boolean;
    autoConfirmAppointments: boolean;
    sendReminders: boolean;
    reminderHoursBefore: number;
    requireAbha: boolean;
    defaultConsultationFee: number;
    cancellationPolicyHours: number;
  };
  integrations: {
    whatsappEnabled: boolean;
    whatsappPhoneNumber?: string;
    twilioEnabled: boolean;
    twilioPhoneNumber?: string;
    abhaEnabled: boolean;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== DOCTOR ====================
export interface IDoctor {
  _id: Types.ObjectId;
  clinicId: Types.ObjectId;
  userId?: Types.ObjectId;
  name: string;
  phone: string;
  email: string;
  specialization: string;
  qualifications: string[];
  experienceYears: number;
  licenseNumber?: string;
  bio?: string;
  photo?: string;
  availableDays: number[];
  workingHours: { start: string; end: string };
  consultationFee: number;
  teleconsultFee?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== VOICE CALL ====================
export type VoiceCallStatus = 'initiated' | 'ringing' | 'in_progress' | 'completed' | 'failed' | 'missed' | 'busy' | 'no_answer';
export type VoiceCallDirection = 'inbound' | 'outbound';

export interface IVoiceCall {
  _id: Types.ObjectId;
  clinicId: Types.ObjectId;
  callSid?: string;
  direction: VoiceCallDirection;
  from: string;
  to: string;
  patientId?: Types.ObjectId;
  appointmentId?: Types.ObjectId;
  agent: 'receptionist' | 'nurse' | 'care_manager' | 'custom';
  status: VoiceCallStatus;
  duration?: number;
  recordingUrl?: string;
  transcript?: string;
  summary?: string;
  intent?: string;
  entities?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== AI AGENTS ====================
export type AgentType =
  | 'receptionist'
  | 'doctor_assistant'
  | 'care_manager'
  | 'pharmacist'
  | 'nurse_assistant'
  | 'dietitian'
  | 'therapist_assistant'
  | 'growth_consultant';

export interface IAgentConfig {
  _id: Types.ObjectId;
  clinicId: Types.ObjectId;
  type: AgentType;
  name: string;
  greeting: string;
  language: string;
  instructions: string;
  isActive: boolean;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAgentConversation {
  _id: Types.ObjectId;
  clinicId: Types.ObjectId;
  agentType: AgentType;
  patientId?: Types.ObjectId;
  sessionId: string;
  channel: 'whatsapp' | 'voice' | 'chat' | 'api';
  messages: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
  }[];
  context: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== CARE PLAN ====================
export interface ICarePlan {
  _id: Types.ObjectId;
  clinicId: Types.ObjectId;
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  title: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  tasks: {
    title: string;
    description?: string;
    dueDate?: Date;
    completedAt?: Date;
    status: 'pending' | 'completed' | 'skipped';
    reminderDays?: number;
  }[];
  milestones: {
    title: string;
    targetDate: Date;
    completedAt?: Date;
    status: 'pending' | 'achieved' | 'missed';
  }[];
  followUps: {
    date: Date;
    notes?: string;
    completed: boolean;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

// ==================== ANALYTICS ====================
export interface IDashboardMetrics {
  todayAppointments: number;
  weekAppointments: number;
  monthAppointments: number;
  todayPatients: number;
  totalPatients: number;
  newPatientsThisMonth: number;
  revenueToday: number;
  revenueThisMonth: number;
  teleconsultCount: number;
  cancelledCount: number;
  noShowCount: number;
  averageConsultationTime: number;
  topSpecialties: { specialty: string; count: number }[];
  upcomingAppointments: IAppointment[];
}

export interface IAppointmentStats {
  total: number;
  byStatus: Record<AppointmentStatus, number>;
  byType: Record<AppointmentType, number>;
  byDoctor: { doctorId: string; name: string; count: number }[];
  hourlyDistribution: { hour: number; count: number }[];
  dailyTrend: { date: string; count: number }[];
}

export interface IPatientStats {
  total: number;
  active: number;
  inactive: number;
  byGender: Record<string, number>;
  byAgeGroup: Record<string, number>;
  registrationTrend: { month: string; count: number }[];
  returningRate: number;
  averageVisitsPerPatient: number;
}

// ==================== API RESPONSE ====================
export interface IApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface IQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  doctorId?: string;
}

// ==================== WHATSAPP ====================
export interface IWhatsAppMessage {
  from: string;
  to: string;
  body: string;
  timestamp: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location';
  mediaUrl?: string;
  messageId: string;
}

export interface IWhatsAppWebhookPayload {
  object: string;
  entry: {
    id: string;
    changes: {
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        messages?: IWhatsAppMessage[];
        statuses?: {
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
          error?: { code: number; title: string };
        }[];
      };
      field: string;
    }[];
  }[];
}

// ==================== NOTIFICATION ====================
export interface INotification {
  patientId: Types.ObjectId;
  type: 'appointment_reminder' | 'prescription_ready' | 'lab_results' | 'follow_up' | 'payment' | 'general';
  channel: 'sms' | 'whatsapp' | 'email' | 'push';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: Date;
  error?: string;
}

// ==================== USER ====================
export interface IUser {
  _id: Types.ObjectId;
  clinicId: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  role: 'owner' | 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'pharmacist';
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== ABHA ====================
export interface IAbhaVerification {
  patientId: Types.ObjectId;
  abhaId: string;
  verified: boolean;
  verifiedAt?: Date;
  error?: string;
}

export interface IAbhaHealthRecord {
  patientId: Types.ObjectId;
  abhaId: string;
  recordType: string;
  recordDate: Date;
  provider: string;
  summary: string;
  fileUrl?: string;
  createdAt: Date;
}
