import mongoose, { Document, Schema } from 'mongoose';

// Healthcare-specific entity types
export type HealthcareFacilityType = 'hospital' | 'clinic' | 'urgent_care' | 'pharmacy' | 'dental' | 'optometry' | 'mental_health' | 'rehabilitation';
export type Specialty = 'general' | 'cardiology' | 'dermatology' | 'neurology' | 'orthopedics' | 'pediatrics' | 'oncology' | 'psychiatry' | 'radiology' | 'surgery' | 'emergency';

// Patient information
export interface Patient {
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  insurance?: {
    provider: string;
    policyNumber: string;
    groupNumber: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  allergies: string[];
  conditions: string[];
  medications: {
    name: string;
    dosage: string;
    frequency: string;
  }[];
  primaryPhysician?: string;
  vip: boolean;
}

// Healthcare provider
export interface HealthcareProvider {
  providerId: string;
  firstName: string;
  lastName: string;
  credentials: string[];
  specialty: Specialty;
  licenseNumber: string;
  npi: string;
  email: string;
  phone: string;
  availability: {
    day: string;
    startTime: string;
    endTime: string;
    available: boolean;
  }[];
  appointmentsToday: number;
  rating: number;
  status: 'available' | 'busy' | 'off_duty' | 'on_leave';
}

// Appointment
export interface HealthcareAppointment {
  appointmentId: string;
  patientId: string;
  providerId: string;
  dateTime: Date;
  duration: number;
  type: 'initial' | 'follow_up' | 'routine' | 'urgent' | 'procedure';
  specialty: Specialty;
  status: 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  reason: string;
  notes?: string;
  vitals?: {
    temperature?: number;
    bloodPressure?: string;
    heartRate?: number;
    weight?: number;
    height?: number;
  };
  prescriptions?: {
    medication: string;
    dosage: string;
    frequency: string;
    quantity: number;
    refills: number;
  }[];
  followUp?: Date;
}

// Medical record entry
export interface MedicalRecordEntry {
  entryId: string;
  patientId: string;
  providerId: string;
  date: Date;
  type: 'visit' | 'lab' | 'imaging' | 'procedure' | 'note' | 'prescription';
  specialty: Specialty;
  diagnosis: string[];
  treatment: string[];
  notes: string;
  attachments?: string[];
}

// Billing record
export interface BillingRecord {
  billingId: string;
  patientId: string;
  appointmentId?: string;
  serviceDate: Date;
  services: {
    cptCode: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  diagnosisCodes: string[];
  totalAmount: number;
  amountPaid: number;
  insurancePaid: number;
  patientResponsibility: number;
  status: 'pending' | 'submitted' | 'paid' | 'overdue' | 'disputed';
  dueDate: Date;
}

// Inventory item (medical supplies)
export interface MedicalSupply {
  itemId: string;
  name: string;
  category: 'medication' | 'equipment' | 'supplies' | 'ppe' | 'lab' | 'surgical';
  sku: string;
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  unit: string;
  cost: number;
  expirationDate?: Date;
  supplier: string;
  reorderLevel: number;
  autoReorder: boolean;
}

// Healthcare profile
export interface IHealthcareProfile extends Document {
  tenantId: string;
  facilityId: string;
  name: string;
  type: HealthcareFacilityType;
  specialties: Specialty[];
  locations: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates: { lat: number; lng: number };
    hours: {
      day: string;
      open: string;
      close: string;
      open24Hours: boolean;
    }[];
  }[];
  contact: {
    phone: string;
    fax?: string;
    email: string;
    website?: string;
    emergencyPhone: string;
  };
  licenses: {
    licenseNumber: string;
    type: string;
    state: string;
    expiryDate: Date;
    status: 'active' | 'expired' | 'pending';
  }[];
  patients: Patient[];
  providers: HealthcareProvider[];
  appointments: HealthcareAppointment[];
  medicalRecords: MedicalRecordEntry[];
  billingRecords: BillingRecord[];
  inventory: MedicalSupply[];
  metrics: {
    patientsToday: number;
    averageWaitTime: number;
    averageAppointmentDuration: number;
    occupancyRate: number;
    patientSatisfactionScore: number;
    readmissionRate: number;
    bedOccupancy?: number;
  };
  integrations: {
    ehr: string;
    billing: string;
    lab: string;
    imaging: string;
    pharmacy: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Subdocument schemas
const MedicalSupplySchema = new Schema<MedicalSupply>({
  itemId: { type: String, required: true },
  name: { type: String, required: true },
  category: {
    type: String,
    enum: ['medication', 'equipment', 'supplies', 'ppe', 'lab', 'surgical'],
    required: true
  },
  sku: { type: String, required: true },
  currentStock: { type: Number, default: 0 },
  minimumStock: { type: Number, default: 0 },
  maximumStock: { type: Number, default: 0 },
  unit: { type: String, required: true },
  cost: { type: Number, default: 0 },
  expirationDate: { type: Date },
  supplier: { type: String },
  reorderLevel: { type: Number, default: 0 },
  autoReorder: { type: Boolean, default: false }
}, { _id: false });

const HealthcareProfileSchema = new Schema<IHealthcareProfile>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true
    },
    facilityId: {
      type: String,
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['hospital', 'clinic', 'urgent_care', 'pharmacy', 'dental', 'optometry', 'mental_health', 'rehabilitation'],
      required: true
    },
    specialties: [{
      type: String,
      enum: ['general', 'cardiology', 'dermatology', 'neurology', 'orthopedics', 'pediatrics', 'oncology', 'psychiatry', 'radiology', 'surgery', 'emergency']
    }],
    locations: [{
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number }
      },
      hours: [{
        day: { type: String, required: true },
        open: { type: String, required: true },
        close: { type: String, required: true },
        open24Hours: { type: Boolean, default: false }
      }]
    }],
    contact: {
      phone: { type: String, required: true },
      fax: { type: String },
      email: { type: String, required: true },
      website: { type: String },
      emergencyPhone: { type: String, required: true }
    },
    licenses: [{
      licenseNumber: { type: String, required: true },
      type: { type: String, required: true },
      state: { type: String, required: true },
      expiryDate: { type: Date, required: true },
      status: {
        type: String,
        enum: ['active', 'expired', 'pending'],
        default: 'active'
      }
    }],
    patients: [Schema.Types.Mixed],
    providers: [Schema.Types.Mixed],
    appointments: [Schema.Types.Mixed],
    medicalRecords: [Schema.Types.Mixed],
    billingRecords: [Schema.Types.Mixed],
    inventory: [MedicalSupplySchema],
    metrics: {
      patientsToday: { type: Number, default: 0 },
      averageWaitTime: { type: Number, default: 0 },
      averageAppointmentDuration: { type: Number, default: 0 },
      occupancyRate: { type: Number, default: 0 },
      patientSatisfactionScore: { type: Number, default: 0 },
      readmissionRate: { type: Number, default: 0 },
      bedOccupancy: { type: Number }
    },
    integrations: {
      ehr: { type: String },
      billing: { type: String },
      lab: { type: String },
      imaging: { type: String },
      pharmacy: { type: String }
    }
  },
  {
    timestamps: true,
    collection: 'healthcare_profiles'
  }
);

// Indexes
HealthcareProfileSchema.index({ tenantId: 1 });
HealthcareProfileSchema.index({ type: 1, specialties: 1 });

export const HealthcareProfile = mongoose.model<IHealthcareProfile>('HealthcareProfile', HealthcareProfileSchema);

export default HealthcareProfile;
