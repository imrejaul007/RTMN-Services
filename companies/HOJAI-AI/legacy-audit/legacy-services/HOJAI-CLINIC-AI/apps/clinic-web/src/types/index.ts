export interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  bloodType?: string;
  allergies: string[];
  medicalHistory: string[];
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  isActive: boolean;
  createdAt: string;
}

export interface Appointment {
  _id: string;
  patientId: string | Patient;
  doctorId: string | Doctor;
  date: string;
  startTime: string;
  endTime: string;
  type: 'consultation' | 'follow_up' | 'procedure' | 'teleconsult' | 'emergency';
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
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
}

export interface Doctor {
  _id: string;
  name: string;
  specialization: string;
  consultationFee: number;
  isActive: boolean;
}

export interface Prescription {
  _id: string;
  patientId: string | Patient;
  doctorId: string | Doctor;
  medications: Medication[];
  diagnosis?: string;
  advice?: string[];
  tests?: string[];
  createdAt: string;
}

export interface Medication {
  medicine: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface DashboardMetrics {
  todayAppointments: number;
  weekAppointments: number;
  monthAppointments: number;
  todayPatients: number;
  totalPatients: number;
  newPatientsThisMonth: number;
  revenueToday: number;
  revenueThisMonth: number;
  todayCalls: number;
  upcomingAppointments: Appointment[];
  topSpecialties: { specialty: string; count: number }[];
  appointmentStatus: Record<string, number>;
}

export interface ApiResponse<T> {
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
