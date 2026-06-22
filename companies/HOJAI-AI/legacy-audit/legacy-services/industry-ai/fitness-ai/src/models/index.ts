/**
 * Fitness AI - Data Models
 *
 * Complete data models for gym/fitness management
 */

import mongoose, { Schema, Document } from 'mongoose';

// ============================================
// ENUMS
// ============================================

export enum MembershipTier {
  BASIC = 'basic',
  PREMIUM = 'premium',
  VIP = 'vip',
}

export enum MemberStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
}

export enum ClassType {
  YOGA = 'yoga',
  HIIT = 'hiit',
  CARDIO = 'cardio',
  STRENGTH = 'strength',
  SPINNING = 'spinning',
  PILATES = 'pilates',
  CROSSFIT = 'crossfit',
  ZUMBA = 'zumba',
}

export enum ClassStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum WorkoutDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum AttendanceStatus {
  CHECKED_IN = 'checked_in',
  CHECKED_OUT = 'checked_out',
  NO_SHOW = 'no_show',
}

// ============================================
// MEMBER MODEL
// ============================================

export interface IMember extends Document {
  // Basic Info
  memberId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: Date;

  // Membership
  membershipTier: MembershipTier;
  membershipStart: Date;
  membershipEnd: Date;
  status: MemberStatus;

  // Physical Info
  height?: number; // cm
  weight?: number; // kg
  fitnessGoal?: string;

  // Emergency Contact
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };

  // Metadata
  source: 'website' | 'referral' | 'social' | 'event' | 'partner' | 'walk_in';
  tags: string[];
  notes?: string;

  // Analytics
  totalVisits: number;
  lastVisit?: Date;
  joinDate: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const MemberSchema = new Schema<IMember>({
  memberId: { type: String, required: true, unique: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true },
  phone: { type: String, required: true },
  dateOfBirth: { type: Date },

  membershipTier: {
    type: String,
    enum: Object.values(MembershipTier),
    default: MembershipTier.BASIC
  },
  membershipStart: { type: Date, required: true },
  membershipEnd: { type: Date, required: true },
  status: {
    type: String,
    enum: Object.values(MemberStatus),
    default: MemberStatus.ACTIVE
  },

  height: Number,
  weight: Number,
  fitnessGoal: String,

  emergencyContact: {
    name: String,
    phone: String,
    relationship: String,
  },

  source: {
    type: String,
    enum: ['website', 'referral', 'social', 'event', 'partner', 'walk_in'],
    default: 'walk_in',
  },
  tags: [{ type: String }],
  notes: String,

  totalVisits: { type: Number, default: 0 },
  lastVisit: Date,
  joinDate: { type: Date, default: Date.now },
}, { timestamps: true });

// Indexes
MemberSchema.index({ email: 1 });
MemberSchema.index({ phone: 1 });
MemberSchema.index({ status: 1, membershipEnd: 1 });
MemberSchema.index({ 'membershipTier': 1, 'status': 1 });

// Virtual for full name
MemberSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

export const Member = mongoose.model<IMember>('Member', MemberSchema);

// ============================================
// CLASS SCHEMA
// ============================================

export interface IFitnessClass extends Document {
  classId: string;
  name: string;
  type: ClassType;
  description?: string;

  // Schedule
  scheduledDate: Date;
  startTime: string; // HH:mm
  endTime: string;
  duration: number; // minutes

  // Instructor
  instructorId?: string;
  instructorName: string;

  // Capacity
  capacity: number;
  enrolled: number;
  waitlist: number;

  // Status
  status: ClassStatus;

  // Room/Equipment
  room?: string;
  equipment?: string[];

  // Difficulty
  difficulty: WorkoutDifficulty;
  intensity: 1 | 2 | 3 | 4 | 5;

  // Tags
  tags: string[];

  createdAt: Date;
  updatedAt: Date;
}

const FitnessClassSchema = new Schema<IFitnessClass>({
  classId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, enum: Object.values(ClassType), required: true },
  description: String,

  scheduledDate: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  duration: { type: Number, required: true },

  instructorId: String,
  instructorName: { type: String, required: true },

  capacity: { type: Number, required: true, min: 1 },
  enrolled: { type: Number, default: 0 },
  waitlist: { type: Number, default: 0 },

  status: {
    type: String,
    enum: Object.values(ClassStatus),
    default: ClassStatus.SCHEDULED
  },

  room: String,
  equipment: [String],

  difficulty: {
    type: String,
    enum: Object.values(WorkoutDifficulty),
    default: WorkoutDifficulty.BEGINNER
  },
  intensity: { type: Number, min: 1, max: 5, default: 3 },

  tags: [{ type: String }],
}, { timestamps: true });

// Indexes
FitnessClassSchema.index({ scheduledDate: 1, type: 1 });
FitnessClassSchema.index({ 'instructorId': 1, 'scheduledDate': 1 });
FitnessClassSchema.index({ status: 1, scheduledDate: 1 });

export const FitnessClass = mongoose.model<IFitnessClass>('FitnessClass', FitnessClassSchema);

// ============================================
// CLASS ENROLLMENT
// ============================================

export interface IClassEnrollment extends Document {
  enrollmentId: string;
  classId: string;
  memberId: string;

  // Status
  status: 'enrolled' | 'waitlisted' | 'cancelled' | 'attended' | 'no_show';
  enrolledAt: Date;
  cancelledAt?: Date;

  // Check-in
  checkedInAt?: Date;
  checkedOutAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const ClassEnrollmentSchema = new Schema<IClassEnrollment>({
  enrollmentId: { type: String, required: true, unique: true },
  classId: { type: String, required: true },
  memberId: { type: String, required: true },

  status: {
    type: String,
    enum: ['enrolled', 'waitlisted', 'cancelled', 'attended', 'no_show'],
    default: 'enrolled',
  },
  enrolledAt: { type: Date, default: Date.now },
  cancelledAt: Date,

  checkedInAt: Date,
  checkedOutAt: Date,
}, { timestamps: true });

ClassEnrollmentSchema.index({ classId: 1, memberId: 1 });
ClassEnrollmentSchema.index({ memberId: 1, status: 1 });

export const ClassEnrollment = mongoose.model<IClassEnrollment>('ClassEnrollment', ClassEnrollmentSchema);

// ============================================
// WORKOUT PLAN
// ============================================

export interface IExercise {
  name: string;
  sets: number;
  reps?: number;
  duration?: number; // seconds
  restTime: number; // seconds
  weight?: number;
  notes?: string;
}

export interface IWorkoutDay {
  day: number; // 1-7
  name: string;
  exercises: IExercise[];
  duration: number; // total minutes
  notes?: string;
}

export interface IWorkoutPlan extends Document {
  planId: string;
  memberId: string;

  name: string;
  description?: string;

  // Plan Details
  difficulty: WorkoutDifficulty;
  duration: number; // weeks
  sessionsPerWeek: number;

  // Workout Days
  workouts: IWorkoutDay[];

  // Goals
  targetAreas: string[]; // 'chest', 'back', 'legs', etc.

  // Status
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;

  // Progress
  completedSessions: number;

  createdAt: Date;
  updatedAt: Date;
}

const ExerciseSchema = new Schema({
  name: { type: String, required: true },
  sets: { type: Number, required: true, min: 1 },
  reps: Number,
  duration: Number,
  restTime: { type: Number, default: 60 },
  weight: Number,
  notes: String,
}, { _id: false });

const WorkoutDaySchema = new Schema({
  day: { type: Number, required: true, min: 1, max: 7 },
  name: { type: String, required: true },
  exercises: [ExerciseSchema],
  duration: { type: Number, required: true },
  notes: String,
}, { _id: false });

const WorkoutPlanSchema = new Schema<IWorkoutPlan>({
  planId: { type: String, required: true, unique: true },
  memberId: { type: String, required: true },

  name: { type: String, required: true },
  description: String,

  difficulty: {
    type: String,
    enum: Object.values(WorkoutDifficulty),
    default: WorkoutDifficulty.BEGINNER
  },
  duration: { type: Number, required: true, min: 1 },
  sessionsPerWeek: { type: Number, required: true, min: 1, max: 7 },

  workouts: [WorkoutDaySchema],

  targetAreas: [String],

  isActive: { type: Boolean, default: false },
  startDate: Date,
  endDate: Date,

  completedSessions: { type: Number, default: 0 },
}, { timestamps: true });

WorkoutPlanSchema.index({ memberId: 1, isActive: 1 });

export const WorkoutPlan = mongoose.model<IWorkoutPlan>('WorkoutPlan', WorkoutPlanSchema);

// ============================================
// PROGRESS TRACKING
// ============================================

export interface IMeasurement {
  type: string; // 'weight', 'chest', 'waist', 'hips', etc.
  value: number;
  unit: string; // 'kg', 'cm', 'inches'
}

export interface IProgressEntry extends Document {
  progressId: string;
  memberId: string;

  date: Date;

  // Weight & Measurements
  weight?: number;
  bodyFat?: number;
  measurements: IMeasurement[];

  // Fitness Metrics
  benchPress?: number;
  squat?: number;
  deadlift?: number;
  runTime?: number; // minutes for 5km

  // Notes
  notes?: string;
  photos?: string[]; // URLs

  // Goals
  goalsAchieved?: string[];

  createdAt: Date;
}

const MeasurementSchema = new Schema({
  type: { type: String, required: true },
  value: { type: Number, required: true },
  unit: { type: String, required: true },
}, { _id: false });

const ProgressEntrySchema = new Schema<IProgressEntry>({
  progressId: { type: String, required: true, unique: true },
  memberId: { type: String, required: true },

  date: { type: Date, required: true, default: Date.now },

  weight: Number,
  bodyFat: Number,
  measurements: [MeasurementSchema],

  benchPress: Number,
  squat: Number,
  deadlift: Number,
  runTime: Number,

  notes: String,
  photos: [String],

  goalsAchieved: [String],
}, { timestamps: true });

ProgressEntrySchema.index({ memberId: 1, date: -1 });

export const ProgressEntry = mongoose.model<IProgressEntry>('ProgressEntry', ProgressEntrySchema);

// ============================================
// ATTENDANCE RECORD
// ============================================

export interface IAttendance extends Document {
  attendanceId: string;
  memberId: string;

  date: Date;
  checkInTime: Date;
  checkOutTime?: Date;

  // Duration in minutes
  duration?: number;

  // Source
  source: 'manual' | 'qr_code' | 'face_recognition' | 'rfid';

  // Status
  status: AttendanceStatus;

  createdAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>({
  attendanceId: { type: String, required: true, unique: true },
  memberId: { type: String, required: true },

  date: { type: Date, required: true, default: Date.now },
  checkInTime: { type: Date, required: true, default: Date.now },
  checkOutTime: Date,

  duration: Number,

  source: {
    type: String,
    enum: ['manual', 'qr_code', 'face_recognition', 'rfid'],
    default: 'manual',
  },

  status: {
    type: String,
    enum: Object.values(AttendanceStatus),
    default: AttendanceStatus.CHECKED_IN,
  },
}, { timestamps: true });

AttendanceSchema.index({ memberId: 1, date: -1 });
AttendanceSchema.index({ date: 1, status: 1 });

// Calculate duration on save
AttendanceSchema.pre('save', function(next) {
  if (this.checkOutTime) {
    this.duration = Math.round(
      (this.checkOutTime.getTime() - this.checkInTime.getTime()) / 60000
    );
  }
  next();
});

export const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);

// ============================================
// MEMBERSHIP PRICING
// ============================================

export const MEMBERSHIP_PRICING = {
  [MembershipTier.BASIC]: {
    monthly: 999,
    quarterly: 2699,
    yearly: 9999,
    features: [
      'Gym access during operating hours',
      'Basic locker',
      'Free WiFi',
      'Mobile app access',
    ],
  },
  [MembershipTier.PREMIUM]: {
    monthly: 2499,
    quarterly: 6499,
    yearly: 22999,
    features: [
      '24/7 gym access',
      'Premium locker with laundry',
      'Group fitness classes',
      'Sauna & steam room',
      'Nutrition consultation (1/month)',
      'Guest passes (2/month)',
    ],
  },
  [MembershipTier.VIP]: {
    monthly: 4999,
    quarterly: 12999,
    yearly: 45999,
    features: [
      'Everything in Premium',
      'Personal trainer (2 sessions/week)',
      'Unlimited guest passes',
      'Priority booking for classes',
      'Custom meal plans',
      'Monthly body composition analysis',
      'Exclusive VIP lounge access',
    ],
  },
} as const;

// ============================================
// EXPORTS
// ============================================

export default {
  Member,
  FitnessClass,
  ClassEnrollment,
  WorkoutPlan,
  ProgressEntry,
  Attendance,
  MEMBERSHIP_PRICING,

  // Enums
  MembershipTier,
  MemberStatus,
  ClassType,
  ClassStatus,
  WorkoutDifficulty,
  AttendanceStatus,
};
